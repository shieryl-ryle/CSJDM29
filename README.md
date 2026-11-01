# Justice for CSJDM29, evidence & pet-identification platform

An independent evidence-preservation, documentation and pet-identification registry for pet owners affected by the San Jose del Monte animal-remains discovery.

**This is not an accusation site.** It never states that a person or business committed a crime, and never states that a recovered animal *is* someone's pet. It records what an owner claimed, what a source documented, what the system extracted, and what a human reviewer verified, and keeps those apart.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Vercel.

---

## 1. Deploy tonight (≈20 minutes)

### 1.1 Create the Supabase project
1. <https://supabase.com> → **New project**. Note the **region** (pick one near the Philippines, e.g. Singapore) and save the database password.
2. **Project Settings → API**: copy
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**secret, server only**)

### 1.2 Create the database
1. **SQL Editor → New query**, paste the whole of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), **Run**.
   It creates the tables, row-level security, audit triggers, public views, the three **private** storage buckets and the `public_stats()` function.
2. Run [`supabase/migrations/0002_limits.sql`](supabase/migrations/0002_limits.sql) the same way (per-account limits, duplicate-lookup indexes).
3. *(Optional, for a smoke test)* run [`supabase/seed.sql`](supabase/seed.sql) to load 5 clearly fictional `DEMO-00x` records. **Remove them before launch** (§5).
4. *(CLI alternative)* `supabase link --project-ref <ref>` then `supabase db push`.

### 1.3 Auth settings (Authentication → …)
- **URL Configuration**
  - *Site URL*: your Vercel URL, e.g. `https://csjdm29.vercel.app`
  - *Redirect URLs*: add `https://csjdm29.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`
- **Providers → Email**: enabled. **Decision for launch:** turning *Confirm email* **off** is the lowest-friction option for owners arriving from Facebook on phones; turn it **on** if you want verified emails (then sign-up shows "check your email").
- Optional hardening: Authentication → Rate limits, and CAPTCHA (hCaptcha/Turnstile) if abuse appears.

### 1.4 Storage limits
The buckets are created with a 50 MB per-file cap (the Supabase **free plan maximum**). On a paid plan raise *Project Settings → Storage → Global file size limit* and the `file_size_limit` values in the migration, **and** `MAX_UPLOAD_BYTES` in [`src/lib/constants.ts`](src/lib/constants.ts). Files go browser → Supabase directly (signed URLs), so Vercel's 4.5 MB request limit does not apply.

### 1.5 Deploy to Vercel
1. Push this folder to a GitHub repo (`.env*` is git-ignored, never commit secrets).
2. <https://vercel.com/new> → import the repo (framework is auto-detected as Next.js).
3. **Environment Variables** (Production + Preview), see [`.env.example`](.env.example):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from 1.1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from 1.1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from 1.1 (secret) |
   | `NEXT_PUBLIC_SITE_URL` | your final URL |
   | `IP_HASH_SALT` | any long random string |
4. **Deploy.** If the final URL differs from what you put in `NEXT_PUBLIC_SITE_URL`/Supabase Site URL, fix both and redeploy.
5. The upload routes set `maxDuration` (30 s / 60 s). Server-side hashing of a 50 MB file fits comfortably; on Vercel Hobby the platform caps function duration, so keep large videos for admin uploads on a plan that allows it.

### 1.6 Create the first administrator
1. Open your site → **Sign in → Create an account** with your email.
2. In the Supabase SQL editor:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   Use `'reviewer'` for reviewers. (Today `reviewer` and `admin` have the same permissions; `admin` is reserved for future admin-only actions.) Roles can **only** be changed this way, the app (and the database) will not let a user change their own role.
3. Reload: a **Review** link appears in the header.

### 1.7 Run locally
```bash
cp .env.example .env.local     # fill it in
npm install
npm run dev                    # http://localhost:3000
```

---

## 2. Verify before announcing (10-minute checklist)

1. Home page shows the hero, both disclaimers, the graphic-content note and counters.
2. Sign up as a *second* test user → **Report my pet** → fill step 1, upload a photo, then step 3 upload a receipt. Confirm **Original preserved** + a 64-hex **SHA-256** appears under each file, and the file preview/download works.
3. Submit. As the admin: **Review → Owner cases → open it**; confirm you see provider/contact; confirm the *owner* cannot open `/admin`.
4. As admin: **Recovered pets → New record** (name + weight + species + colours), tick *Publish*, **Approve**. Check `/registry` (signed-out window) shows it, and that provider/contact/transcript are nowhere on the page.
5. Return to the owner's case → **Possible matches**: the record should appear with ✓/?/✗ lines, "characteristics in common", and the "not confirmation of identity" notice, **no percentages**.
6. Upload a frame on the record, tick *Show publicly*; on the public page confirm the image is **not loaded** until **Reveal images** is clicked.
7. **Review → Audit log** shows the uploads, the approval, and (after downloading evidence) the access entries.
8. `/cases/<id>/export` → **Print / save as PDF** produces the evidence package.

Automated checks you can run any time:
```bash
npm test            # matching engine unit tests (names, weights, colours, tiers, search)
npm run test:rls    # runs the real migration in an in-process Postgres and asserts privacy/RLS/immutability (90 checks)
npm run typecheck && npm run build
```

---

## 3. What is where

| Area | Location |
|---|---|
| Database, RLS, audit triggers, storage buckets | `supabase/migrations/0001_init.sql` |
| Demo data / test-case removal | `supabase/seed.sql`, `supabase/remove_demo_data.sql`, `supabase/remove_test_cases.sql` |
| Public site | `src/app/page.tsx`, `registry/`, `information/`, `about/`, `report/` |
| Owner area | `src/app/cases/**` (list, wizard, vault + timeline, matches, export), `src/components/case-wizard.tsx` |
| Reviewer area | `src/app/admin/**` (queue, cases, recovered pets, source videos, matches, witness, audit) |
| Upload pipeline | `src/app/api/upload/{prepare,finalize}`, `src/lib/upload-client.ts`, `src/components/uploader.tsx` |
| Authorized file access | `src/app/api/evidence/[id]/download`, `src/app/api/media/[id]` |
| Export and print | `src/app/api/export/zip/route.ts` (streaming ZIP), `src/app/admin/export`, `src/app/admin/print`, `src/components/evidence-package.tsx` |
| Matching engine | `src/lib/matching.ts` (+ tests), `src/lib/match-service.ts` |
| Provenance | `recovered_pet_claims` table, `submitPet` in `src/app/admin/actions.ts`, `ProvenanceList` |
| Video-ingestion provider interfaces | `src/lib/ingestion/providers.ts` |

---

## 4. Engineering decisions (and why)

**Evidence integrity**
- The browser uploads straight to a **private** bucket through a short-lived **signed upload URL** (`x-upsert: false`: an existing object can never be overwritten). Nothing is "evidence" until `/api/upload/finalize` has **downloaded the stored bytes and computed SHA-256 server-side**. The browser also computes a hash before upload; if the two differ the file is flagged (`hash_matches_client`).
- Database triggers make evidence rows **immutable** (hash, path, size, filename, uploader…) even for the service role, and **non-deletable**. Only `description`, `evidence_type`, `visibility` can change (app-audited). Provenance claims and audit logs are **append-only**.
- No storage policies exist for `anon`/`authenticated`: files are only reachable through server routes that first check authorization (RLS-scoped read of the evidence row) and then issue a **60-second** signed URL. Every preview/download is written to the audit log.

**Privacy**
- `anon` has **no** access to any base table. The public sees recovered pets only through `public_recovered_pets` / `public_field_provenance` / `public_pet_media` views: a fixed column allow-list, only `approved` + `published` records. Transcripts, condition notes, reviewer identities, candidates and merged/rejected records are never exposed.
- Owner cases (including provider, contact and amount) are readable only by the owner and reviewers. Reviewer notes live in a separate reviewer-only table. The evidence package **excludes contact details unless the owner opts in**.
- Graphic images: pet media is private, defaults to `is_graphic` + not public, and the `<img>` isn't even in the page until someone clicks **Reveal** (admin view too).

**Source vs system vs reviewer**
- Each recovered-pet field has a current value (column), an origin map (`field_origins`) and an **append-only claim history** (origin, source, source type, timestamp in the video, verification, extractor). The public page shows an origin badge per field and a "Where did this information come from?" panel. Nothing merges silently: a reviewer's correction is a *new* `reviewer_verified` claim beside the earlier `source_documented` one.

**Matching** (`deterministic-v1`)
- Name (exact / close spelling / shared token / phonetic), weight (exact, ±0.5 kg, ±1 kg, larger), species (different species excludes), sex (a difference downgrades *strong*), colours (EN + Filipino terms, colour families), date consistency. Distinctive markings are **never auto-matched**, shown as "requires human review", with shared terms listed.
- Output is a tier, *strong / moderate / limited characteristics in common*, plus a per-field ✓ ≈ ✗ ? breakdown. No percentage and no identity claim anywhere. Matches are recomputed when a case is submitted/edited and when a record is approved/published/edited; reviewer decisions are never overwritten.

**Other**
- **Accounts are required for owners** (email + password) so evidence stays private and recoverable across devices. The "I have information" form needs no account and supports true anonymity (the account is simply not stored).
- **Writes run under the user's own JWT** (so RLS and the DB audit triggers apply) wherever possible. The service role is used only for: signing/hashing files, registering evidence, anonymous witness submissions, public aggregate counters, match upserts, and app-level audit entries, each behind an explicit authorization check.
- **Registry records are never hard-deleted**; use *Reject* or *Merge* so provenance survives.
- **Evidence package = a print-optimized page** ("Print / save as PDF") with an evidence-index manifest SHA-256. No PDF library, no legal conclusions.
- Search runs in application code over the published registry (fine for hundreds of records; move to SQL/`pg_trgm` if it grows to thousands).
- Historical reports reuse the case/evidence machinery (`case_kind = 'historical'`), labelled **owner-submitted report** until independently supported.

---

## 5. Limits and capacity

| Limit | Value | Where |
|---|---|---|
| Cases per account | 10 | database trigger (`0002_limits.sql`) |
| Unsubmitted drafts per account | 3 | database trigger |
| Starting a report with an untouched draft already open | reuses that draft | `createCase` |
| Same pet name submitted twice by one account | blocked at submit | `submitCase` |
| File size | 50 MB | bucket + upload routes |
| Files per case | 100 | `MAX_FILES_PER_CASE` |
| Storage per owner account | 300 MB | `MAX_BYTES_PER_ACCOUNT` |
| Information form | 5 submissions per hour per connection, 10 files each | `submitWitness`, upload routes |

Reviewers and admins are exempt. Change the numbers in `0002_limits.sql` and `src/lib/constants.ts`.

**Duplicates across accounts** (for example a concerned citizen and the owner both reporting one pet) are not blocked, because that would reject legitimate reports. Reviewers see a **Possible duplicates** panel on each case (same pet name, same phone or same email) and mark confirmed duplicates.

**Supabase plan size.** Free plan: 1 GB file storage, 500 MB database. Phone photos are about 3 MB and originals cannot be compressed (evidence integrity), so roughly 300 photos fill the free tier. Move to the Pro plan before a public launch and watch **Project Settings > Usage**.

**Bot sign-ups.** With email confirmation off, sign-up is open. Enable CAPTCHA (Turnstile or hCaptcha) under Supabase Authentication > Attack Protection if abuse appears. The sign-up form then needs to pass the CAPTCHA token (not implemented yet, see TODO).

## 6. Export and print (replaces USB hand-offs)

- **Owners:** on a case page, **Download all files (ZIP)** and **Print case summary**.
- **Reviewers:** **Review > Export and print**. Select cases, then **Download ZIP of original files** or **Print selected packages** (up to 40 cases, one per page). Optional: include files from information submissions, include private contact details.
- **ZIP layout:** `<case id>/case-summary.txt`, `<case id>/files/E01_<name>`, `MANIFEST.csv` (SHA-256 at upload and SHA-256 at export, with OK or HASH MISMATCH per file), `SHA256SUMS.txt` (verify with `sha256sum -c SHA256SUMS.txt`), `README.txt`, and `PROBLEMS.txt` if any file could not be read.
- The ZIP is streamed one file at a time (no compression, flat memory). For very large selections export in groups; the route allows up to 300 seconds. Every export and print is written to the audit log.
- **Printing** uses the browser: **Print / save as PDF**.

## 7. Remove demo data before launch
Run [`supabase/remove_demo_data.sql`](supabase/remove_demo_data.sql) in the SQL editor (claims are append-only, so this one-off script toggles that protection off and back on inside a transaction).

---

## 8. Known limits

- **The Supabase-dependent flows have not been exercised against a live Supabase project from here** (sign-up/sign-in, storage signed-URL upload from a real browser, server-side hash download). What *was* verified: the SQL migration + seed + RLS/privacy/immutability/audit rules (81 assertions in an in-process Postgres with Supabase-style stubs), the matching engine (unit tests), type-check, production build, and a smoke run of the built app (public pages render, protected routes redirect, API routes reject unauthenticated calls). Please run the §2 checklist on your project before announcing, step 2 is the important one.
- No malware scanning on uploads, no resumable (TUS) uploads, no thumbnail/redacted-copy generation yet (columns exist; originals are never modified). See [`TODO.md`](TODO.md).
- Email delivery (confirmation links) uses Supabase's built-in mailer, which is heavily rate-limited; configure custom SMTP in Supabase for launch-day volume.
- Deleting an owner's own evidence on request is a manual administrator procedure (originals are protected by trigger by design).
