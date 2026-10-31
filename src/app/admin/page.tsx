import Link from "next/link";
import { requireReviewer } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Reviewer dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireReviewer();
  const count = async (table: string, f: (q: any) => any) => {
    const { count } = await f(supabase.from(table).select("id", { count: "exact", head: true }));
    return count ?? 0;
  };
  const [newCases, needsInfo, candidates, matches, witness, evidenceFiles, audit] = await Promise.all([
    count("cases", (q) => q.eq("status", "submitted")),
    count("cases", (q) => q.eq("status", "needs_info")),
    count("recovered_pets", (q) => q.eq("record_status", "candidate")),
    count("potential_matches", (q) => q.eq("review_status", "unreviewed").in("tier", ["strong", "moderate"])),
    count("witness_submissions", (q) => q.eq("status", "new")),
    count("evidence", (q) => q),
    supabase.from("audit_logs").select("id, actor_role, action, entity_type, entity_id, timestamp").order("timestamp", { ascending: false }).limit(10),
  ]);

  const cards = [
    ["/admin/cases?status=submitted", "New owner cases", newCases],
    ["/admin/cases?status=needs_info", "Waiting on owners", needsInfo],
    ["/admin/pets?record_status=candidate", "Candidate records to review", candidates],
    ["/admin/matches", "Potential matches to review", matches],
    ["/admin/witness", "New information received", witness],
  ] as const;

  return (
    <div>
      {sp.error && <p className="mb-4 rounded-xl bg-soft-50 p-3 text-sm text-soft-800">That area is restricted to administrators.</p>}
      <h1 className="section-title">Review queue</h1>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map(([href, label, n]) => (
          <li key={label}>
            <Link href={href} className="card block hover:border-brand-500">
              <p className="font-serif text-3xl font-semibold text-brand-800">{n}</p>
              <p className="text-sm text-ink-700">{label}</p>
            </Link>
          </li>
        ))}
        <li className="card">
          <p className="font-serif text-3xl font-semibold text-brand-800">{evidenceFiles}</p>
          <p className="text-sm text-ink-700">Evidence files preserved</p>
        </li>
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/pets/new" className="btn-primary btn-sm">+ New recovered-pet record</Link>
        <Link href="/admin/videos" className="btn-secondary btn-sm">Source videos</Link>
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold">Recent activity</h2>
        <ul className="mt-3 divide-y divide-sand-100 rounded-2xl border border-sand-200 bg-white text-sm">
          {(audit.data ?? []).map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-2 p-3">
              <span><strong>{a.action}</strong> <span className="text-ink-500">({a.actor_role ?? "system"})</span></span>
              <span className="text-ink-500">{formatDateTime(a.timestamp)}</span>
            </li>
          ))}
          {(audit.data ?? []).length === 0 && <li className="p-3 text-ink-500">No activity yet.</li>}
        </ul>
        <p className="mt-2 text-sm"><Link className="underline" href="/admin/audit">Full audit log</Link></p>
      </section>
    </div>
  );
}
