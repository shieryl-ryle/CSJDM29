// Runs the real migration against an in-process Postgres (PGlite) with Supabase-style stubs
// (auth.users, auth.uid(), storage.buckets, anon/authenticated/service_role roles) and asserts
// the privacy / RLS / immutability rules. Usage: npm run test:rls
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`);
await db.exec(readFileSync(new URL("../supabase/migrations/0001_init.sql", import.meta.url), "utf8"));
await db.exec(readFileSync(new URL("../supabase/migrations/0002_limits.sql", import.meta.url), "utf8"));

let pass = 0, fail = 0;
const results = [];
function ok(name, cond, extra = "") { (cond ? pass++ : fail++); results.push(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  " + extra}`); }

async function as(role, uid, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); set role ${role};`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
async function run(sql, params) { try { return { rows: (await db.query(sql, params)).rows }; } catch (e) { return { error: e.message }; } }
const denied = (r) => !!r.error && /permission denied|row-level security|violates|cannot|immutable|append-only|Invalid|Protected/i.test(r.error);

const A = "11111111-1111-1111-1111-111111111111", B = "22222222-2222-2222-2222-222222222222", R = "33333333-3333-3333-3333-333333333333";
for (const [id, e] of [[A, "a@x.test"], [B, "b@x.test"], [R, "r@x.test"]]) await db.query("insert into auth.users (id,email) values ($1,$2)", [id, e]);
await db.query("update profiles set role='reviewer' where id=$1", [R]);
ok("profile auto-created with role owner", (await db.query("select role from profiles where id=$1", [A])).rows[0].role === "owner");

// ---- anon sees nothing sensitive
for (const t of ["cases", "evidence", "recovered_pets", "recovered_pet_claims", "pet_media", "audit_logs", "profiles", "witness_submissions", "potential_matches", "source_videos", "case_notes", "timeline_events"]) {
  const r = await as("anon", null, () => run(`select * from ${t}`));
  ok(`anon cannot read ${t}`, denied(r), r.error ?? JSON.stringify(r.rows));
}
ok("anon cannot insert witness_submissions directly", denied(await as("anon", null, () => run(`insert into witness_submissions(info_text) values ('x')`))));

// ---- owner flow
let caseA;
{
  const r = await as("authenticated", A, () => run(`insert into cases(owner_id, case_kind, status) values ($1,'current','draft') returning id, case_number`, [A]));
  caseA = r.rows?.[0];
  ok("owner can create own draft case (case_number assigned)", !!caseA && /^OC-\d{5}$/.test(caseA.case_number), r.error);
}
ok("owner cannot create case for someone else", denied(await as("authenticated", A, () => run(`insert into cases(owner_id) values ($1)`, [B]))));
ok("owner cannot create a case already 'submitted'", denied(await as("authenticated", A, () => run(`insert into cases(owner_id, status) values ($1,'submitted')`, [A]))));
ok("owner can autosave own draft", !(await as("authenticated", A, () => run(`update cases set pet_name='Ivy', species='dog', provider_name='Provider X' where id=$1`, [caseA.id]))).error);
ok("owner cannot change owner_id", denied(await as("authenticated", A, () => run(`update cases set owner_id=$2 where id=$1`, [caseA.id, B]))));
ok("owner cannot renumber case", denied(await as("authenticated", A, () => run(`update cases set case_number='OC-99999' where id=$1`, [caseA.id]))));
ok("owner cannot jump to closed", denied(await as("authenticated", A, () => run(`update cases set status='closed' where id=$1`, [caseA.id]))));
ok("owner can submit", !(await as("authenticated", A, () => run(`update cases set status='submitted' where id=$1`, [caseA.id]))).error);
ok("submitted_at stamped on submit", (await db.query(`select submitted_at from cases where id=$1`, [caseA.id])).rows[0].submitted_at != null);
ok("other owner cannot see the case", (await as("authenticated", B, () => run(`select id from cases`))).rows.length === 0);
ok("other owner cannot update the case", (await as("authenticated", B, () => run(`update cases set pet_name='hack' where id=$1 returning id`, [caseA.id]))).rows?.length === 0);
ok("reviewer can see the case incl. provider", (await as("authenticated", R, () => run(`select provider_name from cases`))).rows[0]?.provider_name === "Provider X");
ok("owner cannot read case_notes", (await as("authenticated", A, () => run(`select * from case_notes`))).rows.length === 0);
ok("reviewer can add case note", !(await as("authenticated", R, () => run(`insert into case_notes(case_id, author_id, note) values ($1,$2,'n')`, [caseA.id, R]))).error);
ok("owner cannot add case note", denied(await as("authenticated", A, () => run(`insert into case_notes(case_id, author_id, note) values ($1,$2,'n')`, [caseA.id, A]))));
ok("owner cannot escalate role", denied(await as("authenticated", A, () => run(`update profiles set role='admin' where id=$1`, [A]))));
ok("owner can update display_name", !(await as("authenticated", A, () => run(`update profiles set display_name='A' where id=$1`, [A]))).error);

// ---- evidence (registered by service role only)
let ev;
{
  const r = await as("service_role", null, () => run(
    `insert into evidence(case_id, original_filename, mime_type, size_bytes, uploaded_by, evidence_type, storage_path, sha256)
     values ($1,'receipt.jpg','image/jpeg',10,$2,'receipt','cases/x/receipt.jpg',$3) returning id`, [caseA.id, A, "a".repeat(64)]));
  ev = r.rows?.[0]; ok("service role can register evidence", !!ev, r.error);
}
ok("evidence rejects malformed hash", denied(await as("service_role", null, () => run(`insert into evidence(case_id, original_filename, mime_type, size_bytes, evidence_type, storage_path, sha256) values ($1,'f','image/jpeg',1,'receipt','p2','nothex')`, [caseA.id]))));
ok("evidence defaults to private", (await db.query(`select visibility from evidence where id=$1`, [ev.id])).rows[0].visibility === "private");
ok("owner can read own evidence", (await as("authenticated", A, () => run(`select id from evidence`))).rows.length === 1);
ok("other owner cannot read it", (await as("authenticated", B, () => run(`select id from evidence`))).rows.length === 0);
ok("reviewer can read it", (await as("authenticated", R, () => run(`select id from evidence`))).rows.length === 1);
ok("owner cannot insert evidence directly (client-supplied hash)", denied(await as("authenticated", A, () => run(`insert into evidence(case_id, original_filename, mime_type, size_bytes, evidence_type, storage_path, sha256) values ($1,'f','image/jpeg',1,'receipt','p3',$2)`, [caseA.id, "b".repeat(64)]))));
ok("owner cannot update evidence (hash tamper)", denied(await as("authenticated", A, () => run(`update evidence set sha256=$2 where id=$1`, [ev.id, "c".repeat(64)]))));
ok("reviewer cannot update evidence", denied(await as("authenticated", R, () => run(`update evidence set description='x' where id=$1`, [ev.id]))));
ok("even service role cannot rewrite hash", denied(await as("service_role", null, () => run(`update evidence set sha256=$2 where id=$1`, [ev.id, "c".repeat(64)]))));
ok("even service role cannot rewrite storage_path", denied(await as("service_role", null, () => run(`update evidence set storage_path='other' where id=$1`, [ev.id]))));
ok("service role may edit description only", !(await as("service_role", null, () => run(`update evidence set description='note' where id=$1`, [ev.id]))).error);
ok("evidence cannot be deleted (service role)", denied(await as("service_role", null, () => run(`delete from evidence where id=$1`, [ev.id]))));
ok("evidence cannot be deleted (reviewer)", denied(await as("authenticated", R, () => run(`delete from evidence where id=$1`, [ev.id]))));

// ---- recovered pets + public views
let pet;
{
  const r = await as("authenticated", R, () => run(`insert into recovered_pets(label_name,label_weight_kg,species,primary_color,source_transcript,condition_notes,created_by) values ('IVY',14.6,'dog','white','…pangalan po niya Ivy…','private graphic note',$1) returning id, public_case_number`, [R]));
  pet = r.rows?.[0];
  if (!pet) {
    console.log(results.join("\n"));
    console.log("PET INSERT ERROR:", r.error);
    process.exit(1);
  }
  ok("reviewer can create candidate (CSJDM number auto)", !!pet && /^CSJDM-\d{3}$/.test(pet.public_case_number), r.error);
}
ok("owner cannot create recovered pet", denied(await as("authenticated", A, () => run(`insert into recovered_pets(label_name) values ('x')`))));
ok("owner cannot read recovered_pets base table", (await as("authenticated", A, () => run(`select id from recovered_pets`))).rows.length === 0);
ok("candidate NOT in public view", (await as("anon", null, () => run(`select * from public_recovered_pets`))).rows.length === 0);
await as("authenticated", R, () => run(`update recovered_pets set record_status='approved' where id=$1`, [pet.id]));
ok("approved-but-unpublished NOT public", (await as("anon", null, () => run(`select * from public_recovered_pets`))).rows.length === 0);
await as("authenticated", R, () => run(`update recovered_pets set published=true where id=$1`, [pet.id]));
{
  const r = await as("anon", null, () => run(`select * from public_recovered_pets`));
  ok("approved+published IS public via view", r.rows?.length === 1);
  const cols = Object.keys(r.rows?.[0] ?? {});
  ok("public view hides source_transcript / condition_notes / reviewer ids", !["source_transcript", "condition_notes", "reviewed_by", "created_by", "record_status", "published"].some((c) => cols.includes(c)), cols.join(","));
}
ok("anon still cannot read base table", denied(await as("anon", null, () => run(`select * from recovered_pets`))));
ok("reviewer cannot hard-delete a record", denied(await as("authenticated", R, () => run(`delete from recovered_pets where id=$1`, [pet.id]))));

// ---- provenance claims
await as("authenticated", R, () => run(`insert into recovered_pet_claims(recovered_pet_id, field_name, value, origin, source_label, source_type, source_timestamp_seconds, verification, recorded_by) values ($1,'label_name','IVY','source_documented','Demo source','video',2066,'reviewed',$2)`, [pet.id, R]));
ok("claim visible publicly via provenance view", (await as("anon", null, () => run(`select * from public_field_provenance`))).rows.length === 1);
ok("claims are append-only (update blocked)", denied(await as("authenticated", R, () => run(`update recovered_pet_claims set value='X'`))));
ok("claims are append-only (delete blocked)", denied(await as("service_role", null, () => run(`delete from recovered_pet_claims`))));
ok("claim recorded_by must be the actor", denied(await as("authenticated", R, () => run(`insert into recovered_pet_claims(recovered_pet_id, field_name, value, origin, recorded_by) values ($1,'x','y','source_documented',$2)`, [pet.id, A]))));

// ---- pet media never public unless approved
await as("service_role", null, () => run(`insert into pet_media(recovered_pet_id, storage_path, original_filename, mime_type, size_bytes, sha256) values ($1,'pets/x/f.jpg','f.jpg','image/jpeg',1,$2)`, [pet.id, "d".repeat(64)]));
ok("pet media hidden by default", (await as("anon", null, () => run(`select * from public_pet_media`))).rows.length === 0);
await as("authenticated", R, () => run(`update pet_media set show_publicly=true`));
ok("pet media visible only after explicit approval", (await as("anon", null, () => run(`select * from public_pet_media`))).rows.length === 1);

// ---- matches
await as("service_role", null, () => run(`insert into potential_matches(case_id, recovered_pet_id, tier, algorithm_version) values ($1,$2,'strong','t')`, [caseA.id, pet.id]));
ok("owner sees own match", (await as("authenticated", A, () => run(`select id from potential_matches`))).rows.length === 1);
ok("other owner does not", (await as("authenticated", B, () => run(`select id from potential_matches`))).rows.length === 0);
{
  const r = await as("authenticated", A, () => run(`update potential_matches set review_status='reviewer_dismissed' returning id`));
  const status = (await db.query(`select review_status from potential_matches`)).rows[0].review_status;
  ok("owner cannot alter review status", (denied(r) || r.rows?.length === 0) && status === "unreviewed", r.error ?? status);
}
ok("reviewer can review match", !(await as("authenticated", R, () => run(`update potential_matches set review_status='needs_more_info', reviewer_id=$1`, [R]))).error);

// ---- audit
{
  const rows = (await db.query(`select action, actor_id, previous_value, new_value from audit_logs order by id`)).rows;
  const acts = rows.map((x) => x.action);
  ok("audit: case insert/update captured with actor", acts.includes("cases.insert") && acts.includes("cases.update"));
  ok("audit: recovered_pets changes captured", acts.includes("recovered_pets.insert") && acts.includes("recovered_pets.update"));
  ok("audit: claim insert captured", acts.includes("recovered_pet_claims.insert"));
  ok("audit: match review captured", acts.includes("potential_matches.update"));
  const upd = rows.find((x) => x.action === "recovered_pets.update");
  ok("audit: update records previous+new values", upd?.previous_value?.record_status === "candidate" && upd?.new_value?.record_status === "approved", JSON.stringify(upd));
  ok("audit: draft autosaves are not logged individually", !rows.some((x) => x.action === "cases.update" && x.new_value?.pet_name === "Ivy"));
}
ok("owner cannot read audit_logs", (await as("authenticated", A, () => run(`select * from audit_logs`))).rows.length === 0);
ok("reviewer can read audit_logs", (await as("authenticated", R, () => run(`select * from audit_logs`))).rows.length > 0);
ok("audit_logs not writable via API", denied(await as("authenticated", R, () => run(`insert into audit_logs(action, entity_type) values ('x','y')`))));
ok("audit_logs update blocked (even service role)", denied(await as("service_role", null, () => run(`update audit_logs set action='x'`))));
ok("audit_logs delete blocked (even service role)", denied(await as("service_role", null, () => run(`delete from audit_logs`))));

// ---- aggregate stats
{
  const r = await as("anon", null, () => run(`select public_stats() as s`));
  const s = r.rows?.[0]?.s;
  ok("anon can read aggregate counters only", s && s.recovered_documented === 1 && s.owner_cases_submitted === 1 && s.evidence_files === 1 && s.matches_needing_review === 0, JSON.stringify(s ?? r.error));
}

// ---- storage buckets private
{
  const b = (await db.query(`select id, public from storage.buckets order by id`)).rows;
  ok("all three storage buckets exist and are private", b.length === 3 && b.every((x) => x.public === false), JSON.stringify(b));
}

// ---- abuse limits (0002): 3 drafts, 10 cases per account; reviewers exempt
{
  const D = "44444444-4444-4444-4444-444444444444";
  await db.query("insert into auth.users (id,email) values ($1,$2)", [D, "d@x.test"]);
  const mk = () => as("authenticated", D, () => run(`insert into cases(owner_id) values ($1) returning id`, [D]));
  const ids = [];
  for (let i = 0; i < 3; i++) { const r = await mk(); if (r.rows?.[0]) ids.push(r.rows[0].id); }
  ok("limits: 3 drafts allowed", ids.length === 3);
  const fourth = await mk();
  ok("limits: 4th simultaneous draft refused", !!fourth.error && /draft limit/.test(fourth.error), fourth.error);
  for (const id of ids) await as("authenticated", D, () => run(`update cases set status='submitted' where id=$1`, [id]));
  let made = 3;
  for (let i = 0; i < 7; i++) { const r = await mk(); if (r.rows?.[0]) { made++; await as("authenticated", D, () => run(`update cases set status='submitted' where id=$1`, [r.rows[0].id])); } }
  ok("limits: up to 10 cases per account", made === 10, String(made));
  const eleventh = await mk();
  ok("limits: 11th case refused", !!eleventh.error && /case limit/.test(eleventh.error), eleventh.error);
  let revOk = 0;
  for (let i = 0; i < 12; i++) { const r = await as("authenticated", R, () => run(`insert into cases(owner_id) values ($1) returning id`, [R])); if (r.rows?.[0]) revOk++; }
  ok("limits: reviewers exempt", revOk === 12, String(revOk));
}

// ---- test-case cleanup script
{
  const E = "55555555-5555-5555-5555-555555555555";
  await db.query("insert into auth.users (id,email) values ($1,$2)", [E, "e@x.test"]);
  const c = (await db.query(`insert into cases(owner_id, status, pet_name) values ($1,'submitted','Cleanup') returning id, case_number`, [E])).rows[0];
  const keep = (await db.query(`insert into cases(owner_id, status, pet_name) values ($1,'submitted','Keep') returning id, case_number`, [E])).rows[0];
  const ev = async (cid, p) => (await db.query(`insert into evidence(case_id, original_filename, mime_type, size_bytes, evidence_type, storage_path, sha256) values ($1,'f.jpg','image/jpeg',1,'receipt',$2,$3) returning id`, [cid, p, "e".repeat(64)])).rows[0].id;
  const e1 = await ev(c.id, "cases/cleanup/f.jpg");
  await ev(keep.id, "cases/keep/f.jpg");
  await db.query(`insert into timeline_events(case_id, event_date, title, evidence_id, added_by) values ($1, current_date, 'x', $2, $3)`, [c.id, e1, E]);
  const sql = readFileSync(new URL("../supabase/remove_test_cases.sql", import.meta.url), "utf8").replaceAll("('OC-00007')", `('${c.case_number}')`);
  await db.exec(sql);
  const gone = (await db.query(`select (select count(*) from cases where id=$1)::int c, (select count(*) from evidence where case_id=$1)::int e, (select count(*) from timeline_events where case_id=$1)::int t`, [c.id])).rows[0];
  ok("cleanup script removes the chosen case, its evidence and timeline", gone.c === 0 && gone.e === 0 && gone.t === 0, JSON.stringify(gone));
  const kept = (await db.query(`select (select count(*) from cases where id=$1)::int c, (select count(*) from evidence where case_id=$1)::int e`, [keep.id])).rows[0];
  ok("cleanup script leaves other cases and their evidence alone", kept.c === 1 && kept.e === 1, JSON.stringify(kept));
  ok("cleanup script re-arms the evidence delete protection", denied(await run(`delete from evidence where case_id=$1`, [keep.id])));
  ok("cleanup script writes an audit entry", (await db.query(`select count(*)::int n from audit_logs where action='cases.test_data_removed' and entity_id=$1`, [c.case_number])).rows[0].n === 1);
}

// ---- seed file loads cleanly (twice = idempotent); only approved+published demo rows are public
{
  const seed = readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8");
  await db.exec(seed);
  await db.exec(seed);
  const pub = (await as("anon", null, () => run(`select public_case_number from public_recovered_pets where public_case_number like 'DEMO-%' order by 1`))).rows;
  ok("seed: 4 approved demo records public, candidate DEMO-005 not", pub.length === 4 && !pub.some((r) => r.public_case_number === "DEMO-005"), JSON.stringify(pub));
  const claims = (await db.query(`select count(*)::int n from recovered_pet_claims c join recovered_pets p on p.id=c.recovered_pet_id where p.public_case_number like 'DEMO-%'`)).rows[0].n;
  ok("seed: provenance claims inserted once", claims === 8, String(claims));
  await db.exec(readFileSync(new URL("../supabase/remove_demo_data.sql", import.meta.url), "utf8"));
  const left = (await db.query(`select count(*)::int n from recovered_pets where public_case_number like 'DEMO-%'`)).rows[0].n;
  ok("remove_demo_data.sql removes demo rows", left === 0, String(left));
  const realClaims = (await db.query(`select count(*)::int n from recovered_pet_claims`)).rows[0].n;
  ok("remove_demo_data.sql leaves real claims alone and re-arms append-only", realClaims === 1 && denied(await run(`delete from recovered_pet_claims`)), String(realClaims));
}

console.log(results.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
