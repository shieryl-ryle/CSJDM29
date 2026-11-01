import Link from "next/link";
import { PageShell, Badge } from "@/components/site";
import { requireUser } from "@/lib/auth";
import { CASE_STATUS_LABEL } from "@/lib/constants";
import { formatBytes, formatDate } from "@/lib/format";

export const metadata = { title: "My cases" };
export const dynamic = "force-dynamic";

export default async function Cases() {
  const { supabase, user } = await requireUser("/cases");
  const { data: cases } = await supabase
    .from("cases")
    .select("id, case_number, case_kind, status, pet_name, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const list = cases ?? [];

  const { data: files } = list.length
    ? await supabase.from("evidence").select("case_id, size_bytes").in("case_id", list.map((c) => c.id))
    : { data: [] as { case_id: string; size_bytes: number }[] };
  const stats = new Map<string, { n: number; bytes: number }>();
  for (const f of files ?? []) {
    const cur = stats.get(f.case_id) ?? { n: 0, bytes: 0 };
    stats.set(f.case_id, { n: cur.n + 1, bytes: cur.bytes + Number(f.size_bytes) });
  }
  const totalFiles = [...stats.values()].reduce((n, s) => n + s.n, 0);

  return (
    <PageShell narrow>
      <div className="flex items-center justify-between gap-3">
        <h1 className="section-title">My cases</h1>
        <Link href="/report" className="btn-primary btn-sm">+ New</Link>
      </div>

      {list.length === 0 ? (
        <p className="card mt-5 text-ink-700">No reports yet. <Link className="underline" href="/report">Start a report</Link>.</p>
      ) : (
        <>
          <section className="card mt-5">
            <h2 className="font-bold">Download</h2>
            <p className="mt-1 text-sm text-ink-700">
              The ZIP contains, for each case: a readable case record with the images (<code>case-summary.html</code>), the same record as text, and the original uploaded files. It also contains a manifest of SHA-256 values for checking the files.
            </p>
            {list.length > 1 && (
              <form action="/api/export/zip" method="post" className="mt-3">
                {list.map((c) => <input key={c.id} type="hidden" name="caseId" value={c.id} />)}
                <input type="hidden" name="contact" value="1" />
                <button className="btn-primary btn-sm">Download all cases (ZIP), {totalFiles} file{totalFiles === 1 ? "" : "s"}</button>
              </form>
            )}
          </section>

          <ul className="mt-5 space-y-3">
            {list.map((c) => {
              const s = stats.get(c.id) ?? { n: 0, bytes: 0 };
              return (
                <li key={c.id} className="card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={c.status === "draft" ? `/cases/${c.id}/edit` : `/cases/${c.id}`} className="text-lg font-bold text-brand-800 hover:underline">
                      {c.pet_name || "Unnamed pet"} <span className="text-sm font-normal text-ink-500">· {c.case_number}</span>
                    </Link>
                    <Badge tone={c.status === "draft" ? "note" : "good"}>{CASE_STATUS_LABEL[c.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
                    {c.case_kind === "historical" ? "Previous incident · " : ""}Started {formatDate(c.created_at)} · {s.n} file{s.n === 1 ? "" : "s"}, {formatBytes(s.bytes)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link className="btn-secondary btn-sm" href={c.status === "draft" ? `/cases/${c.id}/edit` : `/cases/${c.id}`}>
                      {c.status === "draft" ? "Continue" : "Open"}
                    </Link>
                    <form action="/api/export/zip" method="post">
                      <input type="hidden" name="caseId" value={c.id} />
                      <input type="hidden" name="contact" value="1" />
                      <button className="btn-secondary btn-sm">Download (ZIP)</button>
                    </form>
                    <Link className="btn-secondary btn-sm" href={`/cases/${c.id}/export?contact=1`}>Print or save as PDF</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </PageShell>
  );
}
