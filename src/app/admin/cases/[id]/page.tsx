import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/site";
import { CaseSummary, MatchCard, TimelineView } from "@/components/case-view";
import { EvidenceList } from "@/components/evidence";
import { requireReviewer } from "@/lib/auth";
import { loadCase } from "@/lib/case-data";
import { CASE_STATUS_LABEL, MATCH_REVIEW_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { buildTimeline } from "@/lib/timeline";
import { addCaseNote, markDuplicate, reviewMatch, setCaseStatus } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type DupRow = { id: string; case_number: string; pet_name: string | null; species: string | null; status: string; contact_name: string | null };

export default async function AdminCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireReviewer();
  const data = await loadCase(supabase, id);
  if (!data) notFound();
  const { kase, evidence, events, matches } = data;
  const [{ data: notes }, { data: same }] = await Promise.all([
    supabase.from("case_notes").select("id, note, created_at, author_id").eq("case_id", id).order("created_at", { ascending: false }),
    kase.provider_name
      ? supabase.from("cases").select("id, case_number, pet_name").ilike("provider_name", kase.provider_name).neq("id", id).neq("status", "draft").limit(20)
      : Promise.resolve({ data: [] as { id: string; case_number: string; pet_name: string | null }[] }),
  ]);
  // Possible duplicates across all accounts: same pet name, same phone, or same email (identical values only)
  const esc = (v: string) => v.replace(/[\\%_]/g, (m) => "\\" + m);
  const cols = "id, case_number, pet_name, species, status, contact_name";
  const checks: { why: string; run: PromiseLike<{ data: DupRow[] | null }> }[] = [];
  if (kase.pet_name) checks.push({ why: "same pet name", run: supabase.from("cases").select(cols).ilike("pet_name", esc(kase.pet_name)).neq("id", id).neq("status", "draft").limit(20) });
  if (kase.contact_phone) checks.push({ why: "same phone", run: supabase.from("cases").select(cols).eq("contact_phone", kase.contact_phone).neq("id", id).neq("status", "draft").limit(20) });
  if (kase.contact_email) checks.push({ why: "same email", run: supabase.from("cases").select(cols).ilike("contact_email", esc(kase.contact_email)).neq("id", id).neq("status", "draft").limit(20) });
  const dupRows = new Map<string, DupRow & { why: string[] }>();
  const dupResults = await Promise.all(checks.map((c) => c.run));
  dupResults.forEach((r, i) => {
    for (const row of r.data ?? []) {
      const cur = dupRows.get(row.id);
      if (cur) cur.why.push(checks[i].why);
      else dupRows.set(row.id, { ...row, why: [checks[i].why] });
    }
  });
  const duplicates = [...dupRows.values()];
  const timeline = buildTimeline({ kase, evidence, events, matches: matches.map((m) => ({ pet_number: m.pet.public_case_number, documented_on: m.pet.documented_on, tier: m.match.tier })) });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm"><Link href="/admin/cases" className="underline">← Owner cases</Link></p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="section-title">{kase.case_number} · {kase.pet_name || "Unnamed"}</h1>
          <Badge tone="note">{CASE_STATUS_LABEL[kase.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-500">Everything below is owner-submitted unless labelled otherwise. {kase.duplicate_of && "Marked as duplicate of another case."}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={`/cases/${id}/export?contact=1`} className="btn-secondary btn-sm">Print case package</Link>
          <form action="/api/export/zip" method="post"><input type="hidden" name="caseId" value={id} /><input type="hidden" name="contact" value="1" /><button className="btn-secondary btn-sm">Download files (ZIP)</button></form>
        </div>
      </div>

      <section className="card">
        <h2 className="font-semibold">Review status</h2>
        <form action={setCaseStatus} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={id} />
          <select name="status" defaultValue={kase.status === "draft" ? "submitted" : kase.status} className="input max-w-xs">
            {["submitted", "under_review", "needs_info", "closed"].map((s) => <option key={s} value={s}>{CASE_STATUS_LABEL[s]}</option>)}
          </select>
          <button className="btn-primary btn-sm">Update</button>
        </form>
      </section>

      <section>
        <h2 className="section-title text-xl">Potential matches</h2>
        {matches.length === 0 ? <p className="mt-2 text-sm text-ink-500">None at present.</p> : (
          <ul className="mt-3 space-y-4">
            {matches.map(({ match, pet }) => (
              <MatchCard key={match.id} tier={match.tier} pet={pet} reviewStatus={match.review_status} comparisons={match.comparisons} reviewerNote={match.reviewer_note}>
                <form action={reviewMatch} className="mt-3 space-y-2 rounded-xl bg-sand-50 p-3">
                  <input type="hidden" name="id" value={match.id} />
                  <select name="review_status" defaultValue={match.review_status} className="input">
                    {Object.entries(MATCH_REVIEW_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input name="note" defaultValue={match.reviewer_note ?? ""} placeholder="Reviewer note (optional)" className="input" maxLength={2000} />
                  <button className="btn-secondary btn-sm">Save review</button>
                </form>
              </MatchCard>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title text-xl">Timeline</h2>
        <div className="mt-3"><TimelineView items={timeline} caseId={id} evidence={evidence} /></div>
      </section>

      <section>
        <h2 className="section-title text-xl">Evidence</h2>
        <div className="mt-3"><EvidenceList evidence={evidence} canEdit={false} /></div>
        <p className="mt-2 text-xs text-ink-500">Previews and downloads of originals are recorded in the audit log.</p>
      </section>

      <section>
        <h2 className="section-title text-xl">Case information</h2>
        <div className="mt-3"><CaseSummary kase={kase} /></div>
      </section>

      {(same ?? []).length > 0 && (
        <section className="card">
          <h2 className="font-semibold">Other cases naming the same provider (private correlation)</h2>
          <ul className="mt-2 text-sm">
            {same!.map((s) => <li key={s.id}><Link className="underline" href={`/admin/cases/${s.id}`}>{s.case_number}</Link> · {s.pet_name ?? "Unnamed"}</li>)}
          </ul>
          <p className="hint">Matched on identical wording only. Used to organize related reports. Not a finding.</p>
        </section>
      )}

      {duplicates.length > 0 && (
        <section className="card border-l-4 border-l-brand-600">
          <h2 className="font-semibold">Possible duplicates ({duplicates.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link className="underline" href={`/admin/cases/${d.id}`}>{d.case_number}</Link> {d.pet_name ?? "Unnamed"} ({d.species ?? "species n/a"}), {d.contact_name ?? "contact n/a"}, matched on {d.why.join(" and ")}
              </li>
            ))}
          </ul>
          <p className="hint">Matched on identical values only. A match is not proof of a duplicate. Open both and compare before marking.</p>
        </section>
      )}

      <section className="card">
        <h2 className="font-semibold">Duplicate management</h2>
        <form action={markDuplicate} className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="id" value={id} />
          <input name="duplicate_of" placeholder="Original case no., e.g. OC-00012" className="input max-w-xs" />
          <button className="btn-secondary btn-sm">Mark as duplicate</button>
        </form>
      </section>

      <section>
        <h2 className="section-title text-xl">Internal notes</h2>
        <p className="hint">Reviewer-only. Never visible to the owner.</p>
        <form action={addCaseNote} className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="id" value={id} />
          <textarea name="note" rows={3} className="input" maxLength={5000} />
          <button className="btn-secondary btn-sm self-start">Add note</button>
        </form>
        <ul className="mt-3 space-y-2 text-sm">
          {(notes ?? []).map((n) => <li key={n.id} className="rounded-xl border border-sand-200 bg-white p-3"><p className="whitespace-pre-wrap">{n.note}</p><p className="mt-1 text-xs text-ink-500">{formatDateTime(n.created_at)}</p></li>)}
        </ul>
      </section>
    </div>
  );
}
