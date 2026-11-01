import { Badge } from "@/components/site";
import { EvidenceList } from "@/components/evidence";
import { requireReviewer } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import type { EvidenceRow } from "@/lib/types";
import { updateWitness } from "@/app/admin/actions";

export const metadata = { title: "Information received" };
export const dynamic = "force-dynamic";

export default async function AdminWitness() {
  const { supabase } = await requireReviewer();
  const { data } = await supabase.from("witness_submissions").select("*").order("created_at", { ascending: false }).limit(200);
  const ids = (data ?? []).map((w) => w.id);
  const { data: files } = ids.length ? await supabase.from("evidence").select("*").in("witness_submission_id", ids) : { data: [] };

  return (
    <div>
      <h1 className="section-title">Information received</h1>
      <p className="prose-plain mt-2">Submitted by community members. Treat as unverified until supported.</p>
      <ul className="mt-5 space-y-4">
        {(data ?? []).map((w) => (
          <li key={w.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-500">{formatDateTime(w.created_at)} · {w.is_anonymous ? "Anonymous" : w.submitted_by ? "Signed-in user" : "Not signed in"}</p>
              <Badge tone={w.status === "new" ? "note" : "neutral"}>{w.status}</Badge>
            </div>
            <p className="mt-2 whitespace-pre-wrap">{w.info_text}</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div><dt className="inline font-semibold">How obtained: </dt><dd className="inline">{w.how_obtained}</dd></div>
              {w.approx_date && <div><dt className="inline font-semibold">Date: </dt><dd className="inline">{w.approx_date}</dd></div>}
              {w.location && <div><dt className="inline font-semibold">Location: </dt><dd className="inline">{w.location}</dd></div>}
              {w.contact && <div><dt className="inline font-semibold">Contact (private): </dt><dd className="inline">{w.contact}</dd></div>}
              {(w.links ?? []).length > 0 && (
                <div><dt className="font-semibold">Links (unverified):</dt>
                  <dd><ul className="list-disc pl-5">{w.links.map((l: string) => <li key={l} className="break-all">{l}</li>)}</ul></dd></div>
              )}
            </dl>
            {(files ?? []).some((f) => f.witness_submission_id === w.id) && (
              <div className="mt-3"><EvidenceList evidence={(files ?? []).filter((f) => f.witness_submission_id === w.id) as EvidenceRow[]} canEdit={false} /></div>
            )}
            <form action={updateWitness} className="mt-4 flex flex-col gap-2 rounded-xl bg-sand-50 p-3 sm:flex-row">
              <input type="hidden" name="id" value={w.id} />
              <select key={w.status} name="status" defaultValue={w.status} className="input sm:max-w-44">
                {["new", "reviewing", "actioned", "dismissed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input name="note" defaultValue={w.reviewer_note ?? ""} placeholder="Reviewer note" className="input" maxLength={3000} />
              <button className="btn-secondary btn-sm">Save</button>
            </form>
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="card text-ink-500">Nothing received yet.</li>}
      </ul>
    </div>
  );
}
