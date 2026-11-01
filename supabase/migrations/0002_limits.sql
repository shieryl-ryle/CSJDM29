-- Abuse and duplicate protection. Enforced in the database so it cannot be bypassed from the client.
-- Run in the Supabase SQL editor after 0001_init.sql.
--
-- Per account (owners only; reviewers, admins and the service role are exempt):
--   * at most 10 cases in total
--   * at most 3 unsubmitted drafts at one time
-- Adjust the two numbers below if needed.

create or replace function public.cases_limits() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_drafts int;
begin
  if auth.uid() is null or public.is_reviewer() then
    return new;
  end if;
  select count(*), count(*) filter (where status = 'draft')
    into v_total, v_drafts
    from public.cases where owner_id = new.owner_id;
  if v_total >= 10 then
    raise exception 'case limit reached: an account can hold at most 10 reports';
  end if;
  if v_drafts >= 3 then
    raise exception 'draft limit reached: finish or submit existing drafts first';
  end if;
  return new;
end $$;

drop trigger if exists cases_limits on public.cases;
create trigger cases_limits before insert on public.cases
  for each row execute function public.cases_limits();

-- Helps duplicate lookups by reviewers
create index if not exists cases_pet_name_idx on public.cases (lower(pet_name));
create index if not exists cases_contact_phone_idx on public.cases (contact_phone) where contact_phone is not null;
create index if not exists cases_contact_email_idx on public.cases (lower(contact_email)) where contact_email is not null;
