# Handover guide

For the person transferring this platform and for the organizations receiving it (for example Luna and Furry Siblings, Animal Kingdom Foundation, PAWS). Read the whole document before starting.

This is operational guidance, not legal advice. Have counsel confirm the data protection sections.

## 1. What is being handed over

| Item | Where it lives | Contains |
|---|---|---|
| Source code | GitHub repository `shieryl-ryle/CSJDM29` | The web application, database migrations, tests, documentation |
| Website | Vercel project (`csjdm-29`) | The running site and its environment variables |
| Database, accounts, files | Supabase project (`CSJDM29`) | All reports, evidence files, audit log, user accounts |
| Domain (if one is added) | Registrar | The web address |
| Email delivery (if set up) | SMTP provider | Sign-up and password reset emails |

The data in Supabase is personal data (names, phone numbers, emails, payment amounts, pet records, private conversations and documents). Whoever controls the Supabase project controls that data.

## 2. Decisions for the receiving organizations (before transfer)

1. **Who operates it.** One organization or a group. Name at least two administrators.
2. **Data protection roles.** The receiving organization becomes the personal information controller under the Data Privacy Act of 2012 (RA 10173). Appoint a Data Protection Officer, publish a privacy notice on the site, and keep a record of who has access. If several organizations will use the same data, put a data sharing agreement in place.
3. **Retention.** How long reports and evidence are kept, and what happens when the case ends.
4. **Who may contact owners**, and by what channel. The platform has no message feature. Reviewers use the contact details on the case.
5. **Publication policy** for the recovered-animal registry: who approves records, who publishes, what is never shown.
6. **Correction and removal requests** from owners: who handles them and the procedure (section 7).
7. **Plan and billing.** Who pays for Supabase and Vercel (section 6).

## 3. Transfer steps

Do these in order. The new owner must already have an account on each service.

### 3.1 GitHub
1. Receiving organization creates a GitHub organization (or uses an existing one).
2. Current owner: repository **Settings > General > Danger Zone > Transfer ownership**, then enter the organization name.
3. In the organization, add at least two owners.
4. Reconnect Vercel to the repository under the new location if Vercel reports a lost connection (Vercel project **Settings > Git**).

### 3.2 Supabase
1. Receiving organization creates a Supabase organization and invites the current owner.
2. Current owner: **Project Settings > General > Transfer project**, choose the new organization.
3. In the new organization, add at least two members with the Owner role.
4. Choose the plan (section 6).

### 3.3 Vercel
1. Receiving organization creates a Vercel team. Vercel's Hobby plan is for personal, non-commercial use. Check Vercel's current terms and use a Pro team if the organization requires it.
2. Current owner: project **Settings > General > Transfer Project**, choose the team.
3. After the transfer, confirm the five environment variables are present (section 5) and trigger a **Redeploy**.

### 3.4 Domain and email (optional)
- Add a custom domain in Vercel **Settings > Domains**, then update the Supabase URLs (section 4).
- Configure custom SMTP in Supabase **Authentication > SMTP**. The built-in sender allows very few emails per hour. Sign-up confirmation and password reset emails fail once the limit is reached.

## 4. Supabase settings to confirm after transfer

**Authentication > URL Configuration**
- Site URL: the final site address.
- Redirect URLs: add `https://<site>/**`. The wildcard covers sign-up links and password reset links.

**Authentication > Providers > Email**: decide whether *Confirm email* is on. Off is easier for owners on phones. On verifies addresses but depends on SMTP.

**Authentication > Attack Protection**: enable CAPTCHA if junk sign-ups appear. The sign-up form needs a code change to pass the CAPTCHA token (listed in `TODO.md`).

**Storage**: three private buckets (`evidence`, `source-videos`, `recovered-media`). Do not make any bucket public.

**Database > Migrations**: both `0001_init.sql` and `0002_limits.sql` must have been run. To check, open **Table Editor**: the `cases` table should exist, and in **SQL Editor** run `select tgname from pg_trigger where tgname = 'cases_limits';` which should return one row.

## 5. Secrets to rotate on handover

The previous operator knew these. Replace them so only the new owners hold them.

| Secret | Where it is used | How to rotate |
|---|---|---|
| Supabase `service_role` / secret key | Vercel env `SUPABASE_SERVICE_ROLE_KEY` | Supabase **Project Settings > API Keys**: create a new secret key, update the Vercel variable, redeploy, then delete the old key |
| Supabase anon / publishable key | Vercel env `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public by design. Rotate together with the secret key if convenient |
| Database password | Supabase only (the app does not use it) | **Project Settings > Database > Reset database password** |
| `IP_HASH_SALT` | Vercel env | Set a new random value and redeploy |
| GitHub, Vercel, Supabase personal access | Each service | Remove the previous operator from each organization after handover is verified |

The five Vercel environment variables are: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `IP_HASH_SALT`. Store the secret ones in the organization's password manager, never in chat or email.

## 6. Plan and capacity

- **Supabase Free**: 1 GB file storage, 500 MB database, no automatic backups, and the project pauses after a week of inactivity. A public launch with photos will exceed this.
- **Supabase Pro**: more storage, daily backups, no pausing. Recommended before public sharing. Watch **Project Settings > Usage** monthly.
- Per-account limits in the app: 10 reports, 3 drafts, 100 files per report, 300 MB per account, 50 MB per file. Reviewers and administrators are exempt. Numbers are in `supabase/migrations/0002_limits.sql` and `src/lib/constants.ts`.
- Backups: on Pro, use the daily backups. On any plan, an administrator should periodically use **Review > Export and print** to download a ZIP of all evidence and keep it in organization storage.

## 7. Handover day checklist

- [ ] Receiving administrators have created accounts on the site (sign up as normal).
- [ ] Current admin sets their roles in **Review > Users** (Administrator for data handlers, Reviewer for volunteers).
- [ ] Each receiving administrator signs in and opens **Review**, **Users**, **Export and print**.
- [ ] GitHub, Supabase and Vercel transferred and each has at least two owners.
- [ ] Redeployed after transfer and the live site loads.
- [ ] Secrets rotated (section 5) and the site still works after the redeploy: sign in, open a case, preview a file.
- [ ] Test removal of test data is complete: no test cases, no demo records (`supabase/remove_demo_data.sql`, `supabase/remove_test_cases.sql`).
- [ ] Previous operator's site role changed to Owner or removed in **Review > Users**.
- [ ] Previous operator removed from GitHub, Supabase and Vercel.
- [ ] Privacy notice and contact for data requests published.
- [ ] Reviewers briefed on the **Reviewer guide** (Review > Guide) and the handling rules.

## 8. Roles

| Role | Can |
|---|---|
| Owner (default for every sign-up) | Create and edit their own reports, upload evidence, view their own matches, print or download their own case |
| Reviewer | Everything an owner can on any case; review cases, records, matches and information received; add notes; mark duplicates; create, approve and publish recovered-animal records; export one case at a time |
| Administrator | Reviewer rights plus bulk export, bulk print and user management |

Reviewers and administrators can see owner contact details, evidence and aftercare information. Grant these roles only to people covered by the organization's confidentiality and data protection arrangements. Role changes are in the audit log.

## 9. Day to day

**Daily:** open **Review**. Work the queue: new cases, cases waiting on owners, candidate records, matches, information received.

**Weekly:** check **Audit log** for unexpected activity (exports, role changes, many downloads by one person). Check Supabase **Usage**.

**Adding or removing a reviewer:** **Review > Users**. The person signs up first. Removing means setting the role back to Owner. To block an account entirely: Supabase **Authentication > Users**, ban the user.

**Handing evidence to authorities:** **Review > Export and print**, select cases, download the ZIP. Keep the ZIP as delivered. Give the recipient `MANIFEST.csv` and `SHA256SUMS.txt` with it. Recipients can verify with `sha256sum -c SHA256SUMS.txt`. Any `HASH MISMATCH` or an entry in `PROBLEMS.txt` means a file differs from, or could not be read against, the hash recorded at upload. Investigate before relying on it. Record who received the export, when, and in what form, outside the platform. The audit log records that an export happened and by whom.

**Stopping sign-ups temporarily:** Supabase **Authentication > Sign In / Providers**, turn off new user sign-ups.

**Taking the site offline in an emergency:** Vercel project **Settings > General**, pause the project, or remove the domain.

**Owner asks for correction:** the owner can edit their own report and notes. Evidence files cannot be changed; the owner can upload a corrected file and add a note.

**Owner asks for removal of their data:** an administrator decides under the organization's retention policy. If removal is approved, use `supabase/remove_test_cases.sql` as the template (it temporarily switches off evidence protection inside one transaction, removes the rows, writes an audit entry), then delete the stored files in **Storage > evidence > cases > <case id>**. Deleting rows alone does not delete files.

**Suspected exposure of personal data:** treat as an incident. Preserve the audit log, contain it (rotate keys, ban accounts, pause the site if needed), and follow the organization's breach procedure. Under Philippine rules a notifiable breach must be reported to the National Privacy Commission within 72 hours of knowledge. Confirm the current requirement with counsel.

## 10. What the platform does and does not assert

- It stores owner submissions, preserves evidence files unmodified with SHA-256 hashes, and records every reviewer access in an append-only audit log.
- It lists potential matches by comparing recorded characteristics. A match is an investigative lead. It is not an identification.
- It does not state or imply that any person or business is responsible for anything.
- Hashes and the audit log support a chain of custody. They are not a forensic certification. Formal examination belongs to the authorities.

## 11. Where to look in the code

See `README.md` section "What is where". Database rules and their tests: `supabase/migrations/` and `scripts/test-rls.mjs` (`npm run test:rls`). Known gaps and planned work: `TODO.md`.
