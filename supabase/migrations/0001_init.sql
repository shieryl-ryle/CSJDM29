-- =====================================================================
-- Justice for CSJDM29 — initial schema
-- Evidence preservation + pet identification registry
--
-- Design rules enforced here (not just in app code):
--   * Owner evidence is PRIVATE. No anon access to any base table.
--   * Public sees recovered-pet data ONLY through the public_* views,
--     which expose a fixed allow-list of columns for approved+published records.
--   * Evidence originals are immutable and cannot be deleted by ordinary roles.
--   * Every factual claim about a recovered pet is an append-only row in
--     recovered_pet_claims with an explicit origin (source / system / reviewer).
--   * audit_logs is append-only.
-- Run in the Supabase SQL editor (or `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Profiles + roles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'owner' check (role in ('owner', 'reviewer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), 'owner')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SECURITY DEFINER so RLS policies can read roles without recursion.
create or replace function public.is_reviewer() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('reviewer', 'admin') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------------
-- Cases (owner-submitted). Also used for historical reports (case_kind).
-- EVERYTHING in this table is OWNER-SUBMITTED / unverified.
-- ---------------------------------------------------------------------
create sequence public.case_number_seq start 1;

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  case_number text unique not null,
  owner_id uuid not null references auth.users (id) on delete restrict,
  case_kind text not null default 'current' check (case_kind in ('current', 'historical')),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'under_review', 'needs_info', 'closed', 'duplicate')),

  -- Pet
  pet_name text,
  species text check (species in ('dog', 'cat', 'other')),
  breed text,
  sex text check (sex in ('male', 'female', 'unknown')),
  age_text text,
  primary_color text,
  secondary_colors text[] not null default '{}',
  distinctive_markings text,
  distinguishing_description text,
  approx_weight_kg numeric(6, 2) check (approx_weight_kg is null or approx_weight_kg between 0 and 200),
  verified_weight_kg numeric(6, 2) check (verified_weight_kg is null or verified_weight_kg between 0 and 200),
  weight_recorded_on date,
  death_date date,
  surrendered_on date,
  location text,
  vet_clinic text,

  -- Aftercare (provider name is NEVER exposed publicly; no public access to this table at all)
  provider_name text,
  service_type text check (service_type in ('individual', 'partitioned', 'communal', 'burial', 'unknown', 'other')),
  service_other text,
  collected_on date,
  collection_method text,
  amount_paid numeric(12, 2) check (amount_paid is null or amount_paid >= 0),
  amount_currency text not null default 'PHP',
  cremains_received_on date,
  urn_received text check (urn_received in ('yes', 'no', 'unknown')),
  fur_returned text check (fur_returned in ('yes', 'no', 'unknown')),
  paw_print_returned text check (paw_print_returned in ('yes', 'no', 'unknown')),
  certificate_received text check (certificate_received in ('yes', 'no', 'unknown')),
  other_items_returned text,

  -- Historical report fields
  incident_year int check (incident_year is null or incident_year between 1990 and 2100),
  narrative text check (narrative is null or char_length(narrative) <= 8000),
  refund_offered text check (refund_offered in ('yes', 'no', 'unknown')),
  evidence_available_note text,
  other_details text,

  -- Private contact details (never public)
  contact_name text,
  contact_phone text,
  contact_email text,
  contact_address text,

  consent_acknowledged boolean not null default false,
  public_consent boolean not null default false, -- reserved: explicit consent before ANY public display of owner data
  duplicate_of uuid references public.cases (id),

  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cases_owner_idx on public.cases (owner_id);
create index cases_status_idx on public.cases (status);

create or replace function public.cases_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.case_number := case when new.case_kind = 'historical' then 'HR-' else 'OC-' end
    || lpad(nextval('public.case_number_seq')::text, 5, '0');
  return new;
end $$;
create trigger cases_before_insert before insert on public.cases
  for each row execute function public.cases_before_insert();

-- Owners may edit their own case info but cannot reassign ownership,
-- renumber, or jump status. Reviewers/service role are unrestricted.
create or replace function public.cases_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'submitted' and old.status is distinct from 'submitted' and new.submitted_at is null then
    new.submitted_at := now();
  end if;
  if auth.uid() is null or public.is_reviewer() then
    return new;
  end if;
  if new.owner_id <> old.owner_id or new.case_number <> old.case_number
     or new.case_kind <> old.case_kind or new.duplicate_of is distinct from old.duplicate_of then
    raise exception 'Protected case fields cannot be changed';
  end if;
  if new.status <> old.status and not (old.status in ('draft', 'needs_info') and new.status = 'submitted') then
    raise exception 'Invalid status change';
  end if;
  return new;
end $$;
create trigger cases_guard before update on public.cases
  for each row execute function public.cases_guard();
create trigger cases_updated_at before update on public.cases
  for each row execute function public.set_updated_at();

-- Reviewer-only internal notes (owners can never read these)
create table public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  author_id uuid not null references auth.users (id),
  note text not null check (char_length(note) <= 5000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Witness / "I have information" submissions
-- ---------------------------------------------------------------------
create table public.witness_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users (id), -- NULL when anonymous
  is_anonymous boolean not null default false,
  info_text text not null check (char_length(info_text) <= 8000),
  links text[] not null default '{}',
  approx_date text,
  location text,
  how_obtained text,
  contact text, -- optional, private
  ip_hash text, -- salted hash, for rate limiting only
  upload_key text not null default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'new' check (status in ('new', 'reviewing', 'actioned', 'dismissed')),
  reviewer_note text,
  created_at timestamptz not null default now()
);
create index witness_ip_idx on public.witness_submissions (ip_hash, created_at);

-- ---------------------------------------------------------------------
-- Evidence vault
-- ---------------------------------------------------------------------
create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases (id) on delete restrict,
  witness_submission_id uuid references public.witness_submissions (id) on delete restrict,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users (id),
  evidence_type text not null check (evidence_type in (
    'receipt', 'invoice', 'cremation_certificate', 'messenger_screenshot', 'sms', 'email',
    'pet_photo', 'veterinary_record', 'weight_record', 'urn_photo', 'ashes_photo',
    'fur_photo', 'paw_print', 'refund_offer', 'provider_statement',
    'pickup_delivery_document', 'witness_material', 'other')),
  description text check (description is null or char_length(description) <= 2000),
  storage_bucket text not null default 'evidence',
  storage_path text not null unique,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),   -- computed SERVER-SIDE from the stored bytes
  client_sha256 text,                                          -- computed in the browser before upload (if available)
  hash_matches_client boolean,
  visibility text not null default 'private' check (visibility in ('private', 'public_approved')),
  source_type text not null default 'owner_submitted'
    check (source_type in ('owner_submitted', 'provider_provided', 'third_party', 'official_record', 'witness_submitted', 'other')),
  thumbnail_path text,  -- derived copies are stored separately; originals are never rewritten
  redacted_path text,
  check (case_id is not null or witness_submission_id is not null)
);
create index evidence_case_idx on public.evidence (case_id, uploaded_at);

create or replace function public.evidence_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Evidence originals cannot be deleted. Removal requires a documented administrator procedure.';
  end if;
  if new.id <> old.id or new.case_id is distinct from old.case_id
     or new.witness_submission_id is distinct from old.witness_submission_id
     or new.original_filename <> old.original_filename or new.mime_type <> old.mime_type
     or new.size_bytes <> old.size_bytes or new.uploaded_at <> old.uploaded_at
     or new.uploaded_by is distinct from old.uploaded_by or new.storage_bucket <> old.storage_bucket
     or new.storage_path <> old.storage_path or new.sha256 <> old.sha256
     or new.client_sha256 is distinct from old.client_sha256 then
    raise exception 'Evidence file metadata and hashes are immutable';
  end if;
  return new;
end $$;
create trigger evidence_guard before update or delete on public.evidence
  for each row execute function public.evidence_guard();

-- ---------------------------------------------------------------------
-- Timeline (manual events; automatic events are derived from case + evidence at read time)
-- ---------------------------------------------------------------------
create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  event_date date not null,
  title text not null check (char_length(title) <= 300),
  description text check (description is null or char_length(description) <= 2000),
  evidence_id uuid references public.evidence (id) on delete restrict,
  added_by uuid references auth.users (id),
  added_by_role text not null default 'owner',
  created_at timestamptz not null default now()
);
create index timeline_case_idx on public.timeline_events (case_id, event_date);

-- ---------------------------------------------------------------------
-- Source videos (authorized uploads; originals preserved + hashed)
-- ---------------------------------------------------------------------
create table public.source_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_name text,            -- e.g. the page / channel that published it
  source_url text,
  platform text,
  authorization_note text,     -- who authorised us to use this file
  storage_bucket text not null default 'source-videos',
  storage_path text unique,    -- null if only an external reference is kept
  original_filename text,
  mime_type text,
  size_bytes bigint,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  transcript text,
  pipeline jsonb not null default '{}'::jsonb, -- stage -> {status, provider, at}
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'in_review', 'completed')),
  notes text,
  uploaded_by uuid references auth.users (id),
  uploaded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Recovered-pet registry
-- Current values live in columns; origin of each value in field_origins;
-- full append-only history in recovered_pet_claims.
-- ---------------------------------------------------------------------
create sequence public.recovered_pet_seq start 1;

create table public.recovered_pets (
  id uuid primary key default gen_random_uuid(),
  public_case_number text unique not null,
  source text,
  source_url text,
  source_video_id uuid references public.source_videos (id),
  source_video_identifier text,
  video_start_seconds int check (video_start_seconds is null or video_start_seconds >= 0),
  video_end_seconds int check (video_end_seconds is null or video_end_seconds >= 0),
  documented_on date,

  -- SOURCE-DOCUMENTED label
  label_name text,
  label_weight_kg numeric(6, 2) check (label_weight_kg is null or label_weight_kg between 0 and 200),

  -- Observed characteristics
  species text not null default 'unknown' check (species in ('dog', 'cat', 'other', 'unknown')),
  possible_sex text not null default 'unknown' check (possible_sex in ('male', 'female', 'unknown')),
  primary_color text,
  secondary_colors text[] not null default '{}',
  estimated_size text not null default 'unknown' check (estimated_size in ('small', 'medium', 'large', 'unknown')),
  visible_markings text,
  collar_description text,
  distinctive_features text,
  condition_notes text,     -- reviewer-only; may be graphic. Never in public views.
  source_transcript text,   -- reviewer-only

  verification_status text not null default 'pending_verification'
    check (verification_status in ('pending_verification', 'source_documented', 'reviewer_verified')),
  record_status text not null default 'candidate'
    check (record_status in ('candidate', 'approved', 'rejected', 'merged')),
  merged_into uuid references public.recovered_pets (id),
  published boolean not null default false,
  field_origins jsonb not null default '{}'::jsonb, -- field -> source_documented|system_extracted|reviewer_verified
  extracted_by text not null default 'manual',      -- 'manual' | 'system:<provider>'

  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recovered_pets_public_idx on public.recovered_pets (record_status, published);

create or replace function public.recovered_pets_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.public_case_number is null or new.public_case_number = '' then
    new.public_case_number := 'CSJDM-' || lpad(nextval('public.recovered_pet_seq')::text, 3, '0');
  end if;
  return new;
end $$;
-- NOT NULL is checked after BEFORE triggers, so the trigger fills the number first
create trigger recovered_pets_before_insert before insert on public.recovered_pets
  for each row execute function public.recovered_pets_before_insert();
create trigger recovered_pets_updated_at before update on public.recovered_pets
  for each row execute function public.set_updated_at();

-- Provenance: append-only claims. "Where did this information come from?"
create table public.recovered_pet_claims (
  id uuid primary key default gen_random_uuid(),
  recovered_pet_id uuid not null references public.recovered_pets (id) on delete restrict, -- provenance is never cascaded away
  field_name text not null,
  value text,
  origin text not null check (origin in ('source_documented', 'system_extracted', 'reviewer_verified')),
  source_label text,                -- e.g. page / channel name
  source_type text check (source_type in ('video', 'image', 'document', 'web_page', 'manual_entry', 'other')),
  source_timestamp_seconds int,
  source_url text,
  verification text not null default 'unreviewed' check (verification in ('unreviewed', 'reviewed', 'verified', 'disputed')),
  extractor text not null default 'manual', -- 'manual' | model/provider name for system extraction
  recorded_by uuid references auth.users (id),
  recorded_at timestamptz not null default now()
);
create index claims_pet_idx on public.recovered_pet_claims (recovered_pet_id, field_name, recorded_at);

create or replace function public.append_only() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name;
end $$;
create trigger claims_append_only before update or delete on public.recovered_pet_claims
  for each row execute function public.append_only();

-- Frames / screenshots for a recovered pet. Served ONLY via server routes that check authorization.
create table public.pet_media (
  id uuid primary key default gen_random_uuid(),
  recovered_pet_id uuid not null references public.recovered_pets (id) on delete cascade,
  storage_bucket text not null default 'recovered-media',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  kind text not null default 'frame' check (kind in ('frame', 'screenshot', 'photo')),
  source_timestamp_seconds int,
  is_graphic boolean not null default true,
  caption text,
  show_publicly boolean not null default false, -- a reviewer must explicitly approve public display
  uploaded_by uuid references auth.users (id),
  uploaded_at timestamptz not null default now()
);
create index pet_media_pet_idx on public.pet_media (recovered_pet_id);

-- ---------------------------------------------------------------------
-- Potential matches (deterministic, explainable; NO identity percentages)
-- ---------------------------------------------------------------------
create table public.potential_matches (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  recovered_pet_id uuid not null references public.recovered_pets (id) on delete cascade,
  tier text not null check (tier in ('strong', 'moderate', 'limited')),
  comparisons jsonb not null default '[]'::jsonb,
  algorithm_version text not null,
  review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed', 'reviewer_noted_plausible', 'needs_more_info', 'reviewer_dismissed')),
  reviewer_id uuid references auth.users (id),
  reviewer_note text,
  reviewed_at timestamptz,
  computed_at timestamptz not null default now(),
  unique (case_id, recovered_pet_id)
);

-- ---------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  previous_value jsonb,
  new_value jsonb,
  timestamp timestamptz not null default now()
);
create index audit_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_time_idx on public.audit_logs (timestamp desc);
create trigger audit_append_only before update or delete on public.audit_logs
  for each row execute function public.append_only();

-- DB-level audit for writes made under a user's own JWT (RLS path).
-- Writes made by the service role (uploads, hashing, anonymous submissions) have no
-- auth.uid(); those are audited explicitly by the application (src/lib/audit.ts).
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_prev jsonb;
  v_new jsonb;
  v_id text;
begin
  if v_actor is null then
    return coalesce(new, old);
  end if;
  -- draft autosaves are not individually audited; submission and later edits are
  if tg_table_name = 'cases' and tg_op = 'UPDATE' then
    if to_jsonb(old) ->> 'status' = 'draft' and to_jsonb(new) ->> 'status' = 'draft' then
      return new;
    end if;
  end if;

  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_id := v_new ->> 'id';
  elsif tg_op = 'DELETE' then
    v_prev := to_jsonb(old);
    v_id := v_prev ->> 'id';
  else
    select coalesce(jsonb_object_agg(n.key, o.value), '{}'::jsonb),
           coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb)
      into v_prev, v_new
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o on o.key = n.key
     where o.value is distinct from n.value and n.key <> 'updated_at';
    v_id := to_jsonb(new) ->> 'id';
    if v_new = '{}'::jsonb then
      return new;
    end if;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, previous_value, new_value)
  values (v_actor, (select role from public.profiles where id = v_actor),
          tg_table_name || '.' || lower(tg_op), tg_table_name, v_id, v_prev, v_new);
  return coalesce(new, old);
end $$;

create trigger audit_cases after insert or update or delete on public.cases
  for each row execute function public.audit_row();
create trigger audit_recovered_pets after insert or update or delete on public.recovered_pets
  for each row execute function public.audit_row();
create trigger audit_matches after update on public.potential_matches
  for each row execute function public.audit_row();
create trigger audit_case_notes after insert on public.case_notes
  for each row execute function public.audit_row();
create trigger audit_timeline after insert or update or delete on public.timeline_events
  for each row execute function public.audit_row();
create trigger audit_witness after update on public.witness_submissions
  for each row execute function public.audit_row();
create trigger audit_pet_media after update on public.pet_media
  for each row execute function public.audit_row();
create trigger audit_claims after insert on public.recovered_pet_claims
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.case_notes enable row level security;
alter table public.witness_submissions enable row level security;
alter table public.evidence enable row level security;
alter table public.timeline_events enable row level security;
alter table public.source_videos enable row level security;
alter table public.recovered_pets enable row level security;
alter table public.recovered_pet_claims enable row level security;
alter table public.pet_media enable row level security;
alter table public.potential_matches enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: read own (or any if reviewer); update own display_name only (column grant below)
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_reviewer());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- cases
create policy cases_select on public.cases for select to authenticated
  using (owner_id = auth.uid() or public.is_reviewer());
create policy cases_insert on public.cases for insert to authenticated
  with check (owner_id = auth.uid() and status = 'draft');
create policy cases_update on public.cases for update to authenticated
  using (owner_id = auth.uid() or public.is_reviewer())
  with check (owner_id = auth.uid() or public.is_reviewer());

-- internal notes: reviewers only
create policy case_notes_select on public.case_notes for select to authenticated using (public.is_reviewer());
create policy case_notes_insert on public.case_notes for insert to authenticated
  with check (public.is_reviewer() and author_id = auth.uid());

-- witness submissions: reviewers only (inserts happen server-side with the service role)
create policy witness_select on public.witness_submissions for select to authenticated using (public.is_reviewer());
create policy witness_update on public.witness_submissions for update to authenticated
  using (public.is_reviewer()) with check (public.is_reviewer());

-- evidence: owner of the case or reviewer may READ. No client-side writes at all:
-- uploads are registered by the server after it hashes the stored bytes.
create policy evidence_select on public.evidence for select to authenticated
  using (
    public.is_reviewer()
    or exists (select 1 from public.cases c where c.id = evidence.case_id and c.owner_id = auth.uid())
  );

-- timeline
create policy timeline_select on public.timeline_events for select to authenticated
  using (public.is_reviewer() or exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));
create policy timeline_insert on public.timeline_events for insert to authenticated
  with check (
    added_by = auth.uid()
    and (public.is_reviewer() or exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
  );
create policy timeline_update on public.timeline_events for update to authenticated
  using (public.is_reviewer() or (added_by = auth.uid()))
  with check (public.is_reviewer() or (added_by = auth.uid()));
create policy timeline_delete on public.timeline_events for delete to authenticated
  using (public.is_reviewer() or (added_by = auth.uid()));

-- reviewer-only registry tables
create policy source_videos_all on public.source_videos for all to authenticated
  using (public.is_reviewer()) with check (public.is_reviewer());
create policy pets_select on public.recovered_pets for select to authenticated using (public.is_reviewer());
create policy pets_insert on public.recovered_pets for insert to authenticated with check (public.is_reviewer());
create policy pets_update on public.recovered_pets for update to authenticated
  using (public.is_reviewer()) with check (public.is_reviewer());
-- No delete policy: registry records are rejected/merged, never hard-deleted (provenance must survive).
create policy claims_select on public.recovered_pet_claims for select to authenticated using (public.is_reviewer());
create policy claims_insert on public.recovered_pet_claims for insert to authenticated
  with check (public.is_reviewer() and recorded_by = auth.uid());
create policy pet_media_select on public.pet_media for select to authenticated using (public.is_reviewer());
create policy pet_media_update on public.pet_media for update to authenticated
  using (public.is_reviewer()) with check (public.is_reviewer());

-- matches: owners see matches for THEIR case; reviewers see/update all. Inserts: service role only.
create policy matches_select on public.potential_matches for select to authenticated
  using (public.is_reviewer() or exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));
create policy matches_update on public.potential_matches for update to authenticated
  using (public.is_reviewer()) with check (public.is_reviewer());

-- audit: reviewers read; nobody writes through the API
create policy audit_select on public.audit_logs for select to authenticated using (public.is_reviewer());

-- ---------------------------------------------------------------------
-- Table privileges (defence in depth on top of RLS)
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert, update on public.cases to authenticated;
grant select, insert on public.case_notes to authenticated;
grant select, update on public.witness_submissions to authenticated;
grant select on public.evidence to authenticated;
grant select, insert, update, delete on public.timeline_events to authenticated;
grant select, insert, update on public.source_videos to authenticated;
grant select, insert, update on public.recovered_pets to authenticated;
grant select, insert on public.recovered_pet_claims to authenticated;
grant select, update on public.pet_media to authenticated;
grant select, update on public.potential_matches to authenticated;
grant select on public.audit_logs to authenticated;
-- service_role keeps full access (bypasses RLS); it is used only in server code.

-- ---------------------------------------------------------------------
-- PUBLIC read surface: fixed allow-list of columns, approved + published records only.
-- (Views run with owner rights on purpose; Supabase's linter will flag this — it is intentional.)
-- NOT exposed: source_transcript, condition_notes, reviewer ids, merged records, candidates.
-- ---------------------------------------------------------------------
create view public.public_recovered_pets as
  select id, public_case_number, source, source_url, source_video_identifier,
         video_start_seconds, video_end_seconds, documented_on,
         label_name, label_weight_kg,
         species, possible_sex, primary_color, secondary_colors, estimated_size,
         visible_markings, collar_description, distinctive_features,
         verification_status, field_origins, created_at, updated_at
    from public.recovered_pets
   where record_status = 'approved' and published;

create view public.public_field_provenance as
  select c.recovered_pet_id, c.field_name, c.value, c.origin, c.source_label, c.source_type,
         c.source_timestamp_seconds, c.source_url, c.verification, c.extractor, c.recorded_at
    from public.recovered_pet_claims c
    join public.recovered_pets p on p.id = c.recovered_pet_id
   where p.record_status = 'approved' and p.published;

create view public.public_pet_media as
  select m.id, m.recovered_pet_id, m.kind, m.is_graphic, m.caption, m.source_timestamp_seconds
    from public.pet_media m
    join public.recovered_pets p on p.id = m.recovered_pet_id
   where m.show_publicly and p.record_status = 'approved' and p.published;

grant select on public.public_recovered_pets, public.public_field_provenance, public.public_pet_media
  to anon, authenticated;

-- Aggregate counters only (no row data)
create or replace function public.public_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'recovered_documented', (select count(*) from public.recovered_pets where record_status = 'approved'),
    'owner_cases_submitted', (select count(*) from public.cases where status <> 'draft' and case_kind = 'current'),
    'matches_needing_review', (select count(*) from public.potential_matches
                                where review_status = 'unreviewed' and tier in ('strong', 'moderate')),
    'evidence_files', (select count(*) from public.evidence)
  )
$$;
grant execute on function public.public_stats() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage: private buckets. No storage.objects policies are created for
-- anon/authenticated on purpose: all reads/writes go through server-issued
-- short-lived signed URLs (service role) after an authorization check.
-- Adjust file_size_limit to your Supabase plan (free plan max is 50 MB).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('evidence', 'evidence', false, 52428800, array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
    'application/pdf', 'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav',
    'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('source-videos', 'source-videos', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm']),
  ('recovered-media', 'recovered-media', false, 20971520, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
