-- Removes TEST cases (and their evidence rows, timeline events, notes and matches) by case number.
-- For use by an administrator in the Supabase SQL editor. Not for real reports.
--
-- STEP 0 (run alone): see what exists, then pick the test case numbers.
--   select case_number, pet_name, status, contact_email, created_at from public.cases order by case_number;
--
-- STEP 1 (run alone): list the stored files that belong to those cases. Write the paths down.
--   select e.storage_bucket, e.storage_path
--   from public.evidence e join public.cases c on c.id = e.case_id
--   where c.case_number in ('OC-00007') order by 2;
--
-- STEP 2: edit the case numbers in the list below, then run everything from "begin;" to "commit;".
-- STEP 3: delete the files from step 1 in Storage (Dashboard > Storage > evidence > open the folder > delete).
--         Deleting rows in SQL does not delete the files themselves.
--
-- Audit log entries are append-only and stay. This script adds one entry per removed case.

begin;

create temp table _remove on commit drop as
  select id, case_number from public.cases where case_number in ('OC-00007');

-- evidence rows are protected from deletion; switch that protection off only for this transaction
alter table public.evidence disable trigger evidence_guard;

delete from public.timeline_events where case_id in (select id from _remove);
delete from public.potential_matches where case_id in (select id from _remove);
delete from public.case_notes where case_id in (select id from _remove);
delete from public.evidence where case_id in (select id from _remove);

alter table public.evidence enable trigger evidence_guard;

update public.cases set duplicate_of = null where duplicate_of in (select id from _remove);

insert into public.audit_logs (actor_role, action, entity_type, entity_id, new_value)
  select 'admin', 'cases.test_data_removed', 'cases', case_number,
         jsonb_build_object('note', 'removed by administrator SQL script (test data)')
  from _remove;

delete from public.cases where id in (select id from _remove);

commit;
