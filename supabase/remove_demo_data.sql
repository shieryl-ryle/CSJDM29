-- Removes ONLY the fictional DEMO-xxx records created by seed.sql.
-- Provenance claims are append-only by design, so this one-off cleanup (run by an administrator in the
-- SQL editor) deliberately switches that protection off for the duration of the delete, then back on.
begin;
alter table public.recovered_pet_claims disable trigger claims_append_only;
delete from public.recovered_pet_claims
 where recovered_pet_id in (select id from public.recovered_pets where public_case_number like 'DEMO-%');
alter table public.recovered_pet_claims enable trigger claims_append_only;
delete from public.recovered_pets where public_case_number like 'DEMO-%';
commit;
