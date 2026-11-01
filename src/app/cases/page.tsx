import Link from "next/link";
import { PageShell, Badge } from "@/components/site";
import { requireUser } from "@/lib/auth";
import { CASE_STATUS_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata = { title: "My cases" };
export const dynamic = "force-dynamic";

export default async function Cases() {
  const { supabase, user } = await requireUser("/cases");
  const { data: cases } = await supabase
    .from("cases")
    .select("id, case_number, case_kind, status, pet_name, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <PageShell narrow>
      <div className="flex items-center justify-between gap-3">
        <h1 className="section-title">My cases</h1>
        <Link href="/report" className="btn-primary btn-sm">+ New</Link>
      </div>
      {(cases ?? []).length === 0 ? (
        <p className="card mt-5 text-ink-700">No reports yet. <Link className="underline" href="/report">Start a report</Link>.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {cases!.map((c) => (
            <li key={c.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={c.status === "draft" ? `/cases/${c.id}/edit` : `/cases/${c.id}`} className="font-serif text-lg font-semibold text-brand-800 hover:underline">
                  {c.pet_name || "Unnamed pet"} <span className="font-sans text-sm text-ink-500">· {c.case_number}</span>
                </Link>
                <Badge tone={c.status === "draft" ? "note" : "good"}>{CASE_STATUS_LABEL[c.status]}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-500">
                {c.case_kind === "historical" ? "Previous incident · " : ""}Started {formatDate(c.created_at)}
              </p>
              <p className="mt-3">
                <Link className="btn-secondary btn-sm" href={c.status === "draft" ? `/cases/${c.id}/edit` : `/cases/${c.id}`}>
                  {c.status === "draft" ? "Continue" : "Open"}
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
