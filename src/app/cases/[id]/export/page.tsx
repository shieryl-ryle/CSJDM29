import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site";
import { CaseSummary, ComparisonList } from "@/components/case-view";
import { PrintButton } from "@/components/print-button";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { loadCase } from "@/lib/case-data";
import { CASE_STATUS_LABEL, DISCLAIMER_FULL, EVIDENCE_TYPE_LABEL, MATCH_NOTICE, MATCH_REVIEW_LABEL, SOURCE_TYPE_LABEL, TIER_LABEL, VERIFICATION_LABEL } from "@/lib/constants";
import { evidenceLabelMap, formatBytes, formatDate, formatDateTime, formatTimeRange } from "@/lib/format";
import { buildTimeline } from "@/lib/timeline";

export const metadata = { title: "Evidence package" };
export const dynamic = "force-dynamic";

/**
 * Evidence package: print-optimised page ("Print / save as PDF"). Makes NO legal conclusions.
 * Contact details are excluded unless the owner/reviewer explicitly includes them (?contact=1).
 */
export default async function ExportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ contact?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, profile } = await requireUser(`/cases/${id}/export`);
  const data = await loadCase(supabase, id);
  if (!data) notFound();
  const { kase, evidence, events, matches } = data;
  const withContact = sp.contact === "1";

  const labels = evidenceLabelMap(evidence);
  const sorted = [...evidence].sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at));
  const timeline = buildTimeline({
    kase,
    evidence,
    events,
    matches: matches.filter((m) => m.match.tier !== "limited").map((m) => ({ pet_number: m.pet.public_case_number, documented_on: m.pet.documented_on, tier: m.match.tier })),
  });

  const manifest = JSON.stringify(sorted.map((e) => ({ id: labels.get(e.id), filename: e.original_filename, size: e.size_bytes, uploaded_at: e.uploaded_at, sha256: e.sha256 })));
  const manifestHash = createHash("sha256").update(manifest).digest("hex");
  const generatedAt = new Date().toISOString();

  await logAudit({ actorId: user.id, actorRole: profile.role, action: "case.export", entityType: "cases", entityId: id, next: { manifest_sha256: manifestHash, include_contact: withContact } });

  return (
    <PageShell>
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Link href={`/cases/${id}`} className="underline">← Back to case</Link>
        <PrintButton />
        <Link href={`/cases/${id}/export${withContact ? "" : "?contact=1"}`} className="btn-ghost btn-sm">
          {withContact ? "Hide my contact details" : "Include my contact details"}
        </Link>
      </div>

      <article className="space-y-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Case evidence package</p>
          <h1 className="font-serif text-3xl font-semibold">{kase.case_number}</h1>
          <p className="text-sm text-ink-700">
            Prepared {formatDateTime(generatedAt)} · Case status: {CASE_STATUS_LABEL[kase.status]} · {kase.case_kind === "historical" ? "Owner-submitted report of a previous experience" : "Owner-submitted case"}
          </p>
          <p className="mt-3 rounded-xl border border-note-200 bg-note-50 p-3 text-sm text-note-800">
            This document organizes information; it does not draw conclusions. Information is owner-submitted unless labelled otherwise.
          </p>
        </header>

        <section>
          <h2 className="font-serif text-xl font-semibold">1. Pet and aftercare information</h2>
          <div className="mt-3"><CaseSummary kase={kase} includeContact={withContact} /></div>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold">2. Timeline</h2>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead><tr className="border-b border-sand-300 text-left"><th className="py-1 pr-3">Date</th><th className="py-1 pr-3">Event</th><th className="py-1">Origin / evidence</th></tr></thead>
            <tbody>
              {timeline.map((t) => (
                <tr key={t.key} className="border-b border-sand-100 align-top">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{t.date ? formatDate(t.date) : "Unknown"}</td>
                  <td className="py-1.5 pr-3">{t.title}{t.detail ? ` — ${t.detail}` : ""}</td>
                  <td className="py-1.5 text-ink-500">{t.origin.replace("_", " ")}{t.evidence.length ? ` · ${t.evidence.map((e) => e.label).join(", ")}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold">3. Evidence index</h2>
          <p className="mt-1 text-sm text-ink-500">Originals are preserved unmodified. SHA-256 values were calculated by the platform from the stored files at upload.</p>
          {sorted.length === 0 ? <p className="mt-3 text-sm">No files uploaded.</p> : (
            <ul className="mt-3 space-y-3">
              {sorted.map((e) => (
                <li key={e.id} className="break-inside-avoid text-sm">
                  <p><strong>{labels.get(e.id)} — {EVIDENCE_TYPE_LABEL[e.evidence_type] ?? e.evidence_type}</strong></p>
                  <p>Uploaded: {formatDateTime(e.uploaded_at)} · {e.original_filename} · {formatBytes(e.size_bytes)} · {SOURCE_TYPE_LABEL[e.source_type] ?? e.source_type} · {e.visibility === "private" ? "private" : "public (approved)"}</p>
                  {e.description && <p>Note: {e.description}</p>}
                  <p className="break-all font-mono text-xs">SHA-256: {e.sha256}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 break-all text-xs"><strong>Evidence index manifest SHA-256</strong> (over the index above): <span className="font-mono">{manifestHash}</span></p>
        </section>

        {kase.case_kind === "current" && (
          <section>
            <h2 className="font-serif text-xl font-semibold">4. Potential recovered-pet matches</h2>
            <p className="mt-1 text-sm text-ink-500">{MATCH_NOTICE}</p>
            {matches.length === 0 ? <p className="mt-3 text-sm">No records with characteristics in common at the time of export.</p> : (
              <ul className="mt-3 space-y-4">
                {matches.map(({ match, pet }) => (
                  <li key={match.id} className="break-inside-avoid">
                    <p className="font-semibold">{pet.public_case_number} — {TIER_LABEL[match.tier]}</p>
                    <ComparisonList comparisons={match.comparisons} />
                    <p className="mt-1 text-xs text-ink-500">Review status: {MATCH_REVIEW_LABEL[match.review_status]}{match.reviewer_note ? ` — ${match.reviewer_note}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {matches.length > 0 && (
          <section>
            <h2 className="font-serif text-xl font-semibold">5. Source references</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {matches.map(({ pet }) => (
                <li key={pet.id}>
                  <strong>{pet.public_case_number}</strong> — source: {pet.source ?? "not stated"}
                  {pet.source_video_identifier ? ` · ${pet.source_video_identifier}` : ""}
                  {pet.video_start_seconds != null ? ` · timestamp ${formatTimeRange(pet.video_start_seconds, pet.video_end_seconds)}` : ""}
                  {pet.source_url ? ` · ${pet.source_url}` : ""} · record status: {VERIFICATION_LABEL[pet.verification_status]}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="font-serif text-xl font-semibold">6. Verification status</h2>
          <table className="mt-3 w-full border-collapse text-sm">
            <tbody>
              <tr className="border-b border-sand-100"><td className="py-1.5 pr-3 font-semibold">Owner claims</td><td>Owner-submitted; not independently verified by this platform</td></tr>
              <tr className="border-b border-sand-100"><td className="py-1.5 pr-3 font-semibold">Source-documented information</td><td>Recovered-animal labels and observations as documented by the cited sources</td></tr>
              <tr className="border-b border-sand-100"><td className="py-1.5 pr-3 font-semibold">Reviewer verification</td><td>Per-record status shown above; potential matches are leads requiring human review</td></tr>
              <tr><td className="py-1.5 pr-3 font-semibold">Authority / forensic confirmation</td><td>None recorded by this platform</td></tr>
            </tbody>
          </table>
        </section>

        <footer className="border-t border-sand-300 pt-4 text-xs text-ink-700">
          <p className="font-semibold">Disclaimer</p>
          <p>{DISCLAIMER_FULL}</p>
        </footer>
      </article>
    </PageShell>
  );
}
