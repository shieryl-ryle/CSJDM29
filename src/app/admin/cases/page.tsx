import Link from "next/link";
import { Badge } from "@/components/site";
import { requireReviewer } from "@/lib/auth";
import { CASE_STATUS_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Owner cases" };
export const dynamic = "force-dynamic";

export default async function AdminCases({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireReviewer();
  let q = supabase.from("cases").select("id, case_number, case_kind, status, pet_name, species, provider_name, submitted_at, created_at").neq("status", "draft").order("submitted_at", { ascending: false }).limit(300);
  if (sp.status && sp.status !== "all") q = q.eq("status", sp.status);
  const { data } = await q;
  const needle = sp.q?.trim().toLowerCase();
  const rows = (data ?? []).filter((c) => !needle || [c.case_number, c.pet_name, c.provider_name].some((v) => v?.toLowerCase().includes(needle)));

  return (
    <div>
      <h1 className="section-title">Owner cases</h1>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Case no., pet or provider" className="input max-w-xs" />
        <select name="status" defaultValue={sp.status ?? "all"} className="input max-w-xs">
          <option value="all">All statuses</option>
          {["submitted", "under_review", "needs_info", "closed", "duplicate"].map((s) => (
            <option key={s} value={s}>{CASE_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <button className="btn-secondary btn-sm">Filter</button>
      </form>
      <ul className="mt-5 space-y-2">
        {rows.map((c) => (
          <li key={c.id} className="card flex flex-wrap items-center justify-between gap-2">
            <div>
              <Link href={`/admin/cases/${c.id}`} className="font-semibold text-brand-800 hover:underline">{c.case_number} · {c.pet_name || "Unnamed"}</Link>
              <p className="text-xs text-ink-500">
                {c.case_kind === "historical" ? "Previous incident · " : ""}
                {c.species ?? "species n/a"} · provider (private): {c.provider_name ?? "n/a"} · submitted {formatDate(c.submitted_at)}
              </p>
            </div>
            <Badge tone={c.status === "submitted" ? "note" : "neutral"}>{CASE_STATUS_LABEL[c.status]}</Badge>
          </li>
        ))}
        {rows.length === 0 && <li className="card text-ink-500">No cases match.</li>}
      </ul>
    </div>
  );
}
