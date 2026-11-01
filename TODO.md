# TODO

Interfaces / schema exist for most of these; nothing below is faked in the UI.

## Before wide announcement
- [ ] Run the README §2 checklist against the real Supabase project (esp. a phone upload of a large photo/video).
- [ ] Configure custom SMTP in Supabase (built-in mailer is rate-limited).
- [ ] Add CAPTCHA (Turnstile/hCaptcha) to sign-up and the witness form if abuse appears.
- [ ] Decide retention + a documented procedure for removing an owner's evidence on request (originals are trigger-protected).
- [ ] Legal/privacy review of the wording on `/about` and the consent checkbox.

## P1 follow-ups
- [ ] Owner-facing "request removal / correction" flow.
- [ ] Reviewer user-management page (roles are currently set by SQL).
- [ ] Orphan cleanup job for objects uploaded but never finalized.
- [ ] Notify owners (email) when a reviewer marks "needs info" or flags a match worth follow-up.
- [ ] Nickname dictionary for name matching (currently: exact, shared token, edit distance, phonetic key).

## P2 (after launch), plug into `src/lib/ingestion/providers.ts`
- [ ] Speech-to-text (`Transcriber`), run as a background job, never inside a request.
- [ ] Candidate segmentation (`Segmenter`).
- [ ] Frame extraction (`FrameExtractor`) writing to `pet_media` (derived copies only).
- [ ] OCR of name/weight labels (`OcrReader`) → claims with `origin = system_extracted`.
- [ ] Vision extraction of coat/markings (`VisionExtractor`).
- [ ] Pet-image similarity (human review still mandatory; never display as a probability).
- [ ] Duplicate-case detection (today: reviewers mark duplicates manually; same-provider list is shown on the case page).
- [ ] Investigator portal with scoped, expiring access to a case package.
- [ ] Thumbnails / redacted copies (`evidence.thumbnail_path`, `redacted_path` columns exist) and redaction workflow for any public display.
- [ ] Resumable (TUS) uploads for very large videos.
- [ ] Malware scanning of uploads.
- [ ] Server-generated PDF with the manifest hash embedded (today: print-to-PDF page).
- [ ] Move registry search to SQL (`pg_trgm`) if records reach the thousands.
