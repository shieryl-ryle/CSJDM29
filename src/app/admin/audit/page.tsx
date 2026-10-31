import { requireReviewer } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entity?: string; type?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireReviewer();
  let q = supabase.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(200);
  if (sp.type) q = q.eq("entity_type", sp.type);
  if (sp.entity) q = q.eq("entity_id", sp.entity);
  const { data } = await q;

  return (
    <div>
      <h1 className="section-title">Audit log</h1>
      <p className="prose-calm mt-2">Append-only. Shows the 200 most recent entries.</p>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="type" defaultValue={sp.type} placeholder="Entity type (e.g. evidence)" className="input max-w-xs" />
        <input name="entity" defaultValue={sp.entity} placeholder="Entity id" className="input max-w-xs" />
        <button className="btn-secondary btn-sm">Filter</button>
      </form>
      <ul className="mt-5 space-y-2 text-sm">
        {(data ?? []).map((a) => (
          <li key={a.id} className="card !p-3">
            <p className="flex flex-wrap justify-between gap-2">
              <span><strong>{a.action}</strong> · {a.entity_type} <span className="break-all font-mono text-xs text-ink-500">{a.entity_id}</span></span>
              <span className="text-ink-500">{formatDateTime(a.timestamp)}</span>
            </p>
            <p className="text-xs text-ink-500">actor: <span className="font-mono">{a.actor_id ?? "system / anonymous"}</span> ({a.actor_role ?? "—"})</p>
            {(a.previous_value || a.new_value) && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-brand-700">Details</summary>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-sand-50 p-2 text-xs">{JSON.stringify({ previous: a.previous_value, new: a.new_value }, null, 2)}</pre>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
