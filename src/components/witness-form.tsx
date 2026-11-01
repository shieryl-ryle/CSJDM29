"use client";

import { useCallback, useState, useTransition } from "react";
import { submitWitness } from "@/app/information/actions";
import { Uploader } from "@/components/uploader";

export function WitnessForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<{ id: string; key: string } | null>(null);
  const [anonymous, setAnonymous] = useState(false);

  const buildOptions = useCallback(
    () => ({
      prepare: { target: "witness", submissionId: sub!.id, key: sub!.key },
      finalize: { target: "witness", submissionId: sub!.id, key: sub!.key },
    }),
    [sub],
  );

  if (sub) {
    return (
      <div className="space-y-5">
        <div role="status" className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-brand-800">
          <p className="font-semibold">Information received.</p>
          <p className="text-sm">A reviewer will review it. Photos, videos and documents can be added below.</p>
        </div>
        <div className="card">
          <h2 className="font-semibold">Attach photos, videos or documents (optional)</h2>
          <p className="hint mb-3">Upload only files you personally have. Do not edit or crop evidence. Send the original.</p>
          <Uploader buildOptions={buildOptions} />
        </div>
        <p className="text-sm text-ink-500">This page can be closed when uploads are complete.</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      action={(fd) => {
        setError(null);
        start(async () => {
          const res = await submitWitness(fd);
          if (res.ok) setSub({ id: res.submissionId, key: res.uploadKey });
          else setError(res.error);
        });
      }}
    >
      <p className="rounded-xl border border-note-200 bg-note-50 p-3 text-sm text-note-800">
        Submit information you personally possess or can identify the source of. Do not fabricate, alter, or misrepresent evidence.
      </p>
      <div className="hidden" aria-hidden>
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div>
        <label className="label" htmlFor="info_text">What information do you have? <span className="text-soft-800">*</span></label>
        <textarea id="info_text" name="info_text" required minLength={10} maxLength={8000} rows={6} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="how_obtained">How did you obtain this information? <span className="text-soft-800">*</span></label>
        <textarea id="how_obtained" name="how_obtained" required minLength={3} maxLength={2000} rows={3} className="input" placeholder="e.g. I was present; I received this message; I saw this post…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="approx_date">Approximate date</label>
          <input id="approx_date" name="approx_date" className="input" placeholder="e.g. late October 2026" maxLength={100} />
        </div>
        <div>
          <label className="label" htmlFor="location">Location</label>
          <input id="location" name="location" className="input" maxLength={300} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="links">Links (optional)</label>
        <textarea id="links" name="links" rows={2} className="input" placeholder="One per line. Must start with https://" />
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-sand-300 bg-white p-4">
        <input type="checkbox" name="anonymous" className="mt-1 size-6 shrink-0" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
        <span className="text-sm text-ink-700">
          <strong>Submit anonymously.</strong> Your account is not stored with this submission.
        </span>
      </label>
      <div>
        <label className="label" htmlFor="contact">Contact (optional)</label>
        <input id="contact" name="contact" className="input" maxLength={300} placeholder={anonymous ? "Leave blank to stay fully anonymous" : "Email or mobile. Visible to reviewers only"} />
        <p className="hint">Visible to reviewers only. Never published.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-soft-50 p-3 text-sm text-soft-800">{error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send information"}</button>
    </form>
  );
}
