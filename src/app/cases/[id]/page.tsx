import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, DisclaimerBox, PageShell } from "@/components/site";
import { CaseSummary, TimelineView } from "@/components/case-view";
import { EvidenceList } from "@/components/evidence";
import { EvidenceUploadPanel } from "@/components/evidence-client";
import { requireUser } from "@/lib/auth";
import { loadCase } from "@/lib/case-data";
import { CASE_STATUS_LABEL } from "@/lib/constants";
import { buildTimeline } from "@/lib/timeline";

export const dynamic = "force-dynamic";

export default async function CasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireUser(`/cases/${id}`);
  const data = await loadCase(supabase, id);
  if (!data) notFound();
  const { kase, evidence, events, matches } = data;

  const timeline = buildTimeline({
    kase,
    evidence,
    events,
    matches: matches.filter((m) => m.match.tier !== "limited").map((m) => ({ pet_number: m.pet.public_case_number, documented_on: m.pet.documented_on, tier: m.match.tier })),
  });

  return (
    <PageShell narrow>
      {sp.submitted && (
        <div role="status" className="mb-5 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-brand-800">
          <p className="font-semibold">Report submitted.</p>
          <p className="text-sm">A reviewer will review it. Evidence can be added below. <Link className="underline" href="/guide#after">What happens next</Link></p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title">{kase.pet_name || "Your pet"}</h1>
        <Badge tone={kase.status === "draft" ? "note" : "good"}>{CASE_STATUS_LABEL[kase.status]}</Badge>
      </div>
      <p className="mt-1 text-sm text-ink-500">
        Case ID {kase.case_number} · {kase.case_kind === "historical" ? "Owner-submitted report of a previous incident" : "Owner-submitted case"}
      </p>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Case actions">
        <Link href={`/cases/${id}/edit`} className="btn-secondary btn-sm">{kase.status === "draft" ? "Continue report" : "Edit details"}</Link>
        {kase.case_kind === "current" && <Link href={`/cases/${id}/matches`} className="btn-secondary btn-sm">Possible matches ({matches.length})</Link>}
        <Link href={`/cases/${id}/export`} className="btn-secondary btn-sm">Print or save as PDF</Link>
        <form action="/api/export/zip" method="post"><input type="hidden" name="caseId" value={id} /><button className="btn-secondary btn-sm">Download case (ZIP)</button></form>
      </nav>

      <section className="mt-8">
        <h2 className="section-title text-xl sm:text-2xl">Timeline</h2>
        <div className="mt-4"><TimelineView items={timeline} caseId={id} evidence={evidence} /></div>
      </section>

      <section className="mt-10">
        <h2 className="section-title text-xl sm:text-2xl">Evidence vault</h2>
        <p className="prose-plain mt-1 text-sm">Visible only to the account holder and authorized reviewers. Originals are never modified.</p>
        <div className="mt-4"><EvidenceList evidence={evidence} /></div>
        <div className="card mt-4">
          <h3 className="font-semibold">Add more evidence</h3>
          <div className="mt-3"><EvidenceUploadPanel caseId={id} /></div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="section-title text-xl sm:text-2xl">Submitted information</h2>
        <div className="mt-4"><CaseSummary kase={kase} /></div>
      </section>

      <DisclaimerBox className="mt-8" />
    </PageShell>
  );
}
