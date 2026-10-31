-- =====================================================================
-- DEMO SEED DATA — FICTIONAL. For testing search/matching/provenance only.
-- Every record is numbered DEMO-xxx and its source says it is fictional so it can never
-- be mistaken for a real recovered animal.
--
-- >>> DELETE BEFORE LAUNCH:  see "Remove demo data" in README.md <<<
-- Run in the Supabase SQL editor AFTER 0001_init.sql.
-- =====================================================================

insert into public.recovered_pets
  (public_case_number, source, label_name, label_weight_kg, species, possible_sex, primary_color, secondary_colors,
   estimated_size, visible_markings, collar_description, distinctive_features,
   verification_status, record_status, published, field_origins, extracted_by, documented_on)
values
  ('DEMO-001', 'DEMO DATA — fictional test record', 'Demo Ivy', 14.6, 'dog', 'unknown', 'white', '{brown}',
   'medium', 'small scar near the left ear', null, null,
   'source_documented', 'approved', true,
   '{"label_name":"source_documented","label_weight_kg":"source_documented","species":"source_documented","primary_color":"source_documented","secondary_colors":"source_documented","estimated_size":"source_documented","visible_markings":"reviewer_verified"}',
   'manual', current_date - 1),
  ('DEMO-002', 'DEMO DATA — fictional test record', 'Demo Mochi', 5.4, 'cat', 'female', 'white', '{brown}',
   'small', 'brown patch over one eye', 'pink collar', null,
   'pending_verification', 'approved', true,
   '{"label_name":"source_documented","label_weight_kg":"source_documented","species":"source_documented","primary_color":"source_documented"}',
   'manual', current_date - 1),
  ('DEMO-003', 'DEMO DATA — fictional test record', null, null, 'dog', 'male', 'black', '{}',
   'large', null, null, 'short tail',
   'pending_verification', 'approved', true,
   '{"species":"source_documented","primary_color":"source_documented","estimated_size":"source_documented"}',
   'manual', current_date - 1),
  ('DEMO-004', 'DEMO DATA — fictional test record', 'Demo Bruno', 21.0, 'dog', 'male', 'brown', '{tan}',
   'large', null, 'red collar with bell', null,
   'reviewer_verified', 'approved', true,
   '{"label_name":"source_documented","label_weight_kg":"source_documented","species":"reviewer_verified","primary_color":"reviewer_verified"}',
   'manual', current_date - 1),
  ('DEMO-005', 'DEMO DATA — fictional test record (candidate, not public)', 'Demo Kiko', 8.2, 'dog', 'unknown', 'tan', '{}',
   'small', null, null, null,
   'pending_verification', 'candidate', false,
   '{"label_name":"system_extracted","label_weight_kg":"system_extracted"}',
   'system:demo', null)
on conflict (public_case_number) do nothing;

-- Provenance claims for the demo records (what the source stated + one reviewer verification)
insert into public.recovered_pet_claims
  (recovered_pet_id, field_name, value, origin, source_label, source_type, source_timestamp_seconds, verification, extractor)
select p.id, c.field_name, c.value, c.origin, 'DEMO DATA — fictional test record', 'video', c.ts, c.verification, c.extractor
from public.recovered_pets p
join (values
  ('DEMO-001', 'label_name',       'Demo Ivy',                     'source_documented', 2066, 'reviewed',   'manual'),
  ('DEMO-001', 'label_weight_kg',  '14.6',                         'source_documented', 2066, 'reviewed',   'manual'),
  ('DEMO-001', 'visible_markings', 'small scar near the left ear', 'reviewer_verified', 2071, 'verified',   'manual'),
  ('DEMO-002', 'label_name',       'Demo Mochi',                   'source_documented', 1200, 'reviewed',   'manual'),
  ('DEMO-002', 'label_weight_kg',  '5.4',                          'source_documented', 1200, 'reviewed',   'manual'),
  ('DEMO-004', 'label_name',       'Demo Bruno',                   'source_documented',  900, 'reviewed',   'manual'),
  ('DEMO-005', 'label_name',       'Demo Kiko',                    'system_extracted',   300, 'unreviewed', 'system:demo'),
  ('DEMO-005', 'label_weight_kg',  '8.2',                          'system_extracted',   300, 'unreviewed', 'system:demo')
) as c(num, field_name, value, origin, ts, verification, extractor) on c.num = p.public_case_number
where not exists (
  select 1 from public.recovered_pet_claims x
  where x.recovered_pet_id = p.id and x.field_name = c.field_name and x.origin = c.origin
);
