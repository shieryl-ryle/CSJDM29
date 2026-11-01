import Link from "next/link";
import { Badge } from "@/components/site";
import { BulkSelect } from "@/components/bulk-select";
import { requireReviewer } from "@/lib/auth";
import { RECORD_STATUS_LABEL, SPECIES_LABEL, VERIFICATION_LABEL } from "@/lib/constants";
import { bulkReviewPets } from "@/app/admin/actions";

export const metadata = { title: "Recovered pets (admin)" };
export const dynamic = "force-dynamic";

export default async function AdminPets({ searchParams }: { searchParams: Promise<{ record_status?: string; bulk?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireReviewer();
  let q = supabase.from("recovered_pets").select("id, public_case_number, label_name, label_weight_kg, species, record_status, verification_status, published, extracted_by, updated_at").order("public_case_number").limit(500);
  if (sp.record_status) q = q.eq("record_status", sp.record_status);
  const { data } = await q;
  const rows = data ?? [];
  const hasCandidates = rows.some((p) => p.record_status === "candidate");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title">Recovered pets</h1>
        <div className="flex gap-2">
          <Link href="/admin/import" className="btn-secondary btn-sm">Import CSV</Link>
          <Link href="/admin/pets/new" className="btn-primary btn-sm">+ New record</Link>
        </div>
      </div>
      {sp.bulk && <p role="status" className="mt-3 border-l-4 border-ink-900 bg-sand-100 p-3 text-sm">{sp.bulk} record(s) updated.</p>}
      <p className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link className="underline" href="/admin/pets">All</Link>
        {Object.keys(RECORD_STATUS_LABEL).map((k) => <Link key={k} className="underline" href={`/admin/pets?record_status=${k}`}>{k}</Link>)}
      </p>

      <form action={bulkReviewPets}>
        {hasCandidates && (
          <div className="mt-4 space-y-2 border-l-4 border-brand-600 bg-sand-100 p-3 text-sm">
            <p>Tick candidate records that have been checked against their source, then approve them. Publishing makes them visible in the public registry and used for matching.</p>
            <div className="flex flex-wrap gap-2">
              <BulkSelect />
              <button name="intent" value="publish" className="btn-primary btn-sm">Approve and publish selected</button>
              <button name="intent" value="approve" className="btn-secondary btn-sm">Approve only (not public)</button>
            </div>
          </div>
        )}
        <ul className="mt-4 space-y-2">
          {rows.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-start gap-3">
                {p.record_status === "candidate" && <input type="checkbox" name="id" value={p.id} className="mt-1 size-5" aria-label={`Select ${p.public_case_number}`} />}
                <div>
                  <Link href={`/admin/pets/${p.id}`} className="font-semibold text-brand-800 hover:underline">{p.public_case_number}</Link>
                  <span className="text-sm text-ink-700"> · {p.label_name ?? "no label"}{p.label_weight_kg != null ? ` · ${Number(p.label_weight_kg)} kg` : ""} · {SPECIES_LABEL[p.species]}</span>
                  <p className="text-xs text-ink-500">{VERIFICATION_LABEL[p.verification_status]} · extracted by {p.extracted_by}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Badge tone={p.record_status === "approved" ? "good" : p.record_status === "candidate" ? "note" : "neutral"}>{p.record_status}</Badge>
                {p.published && <Badge tone="info">public</Badge>}
              </div>
            </li>
          ))}
          {rows.length === 0 && <li className="card text-ink-500">No records.</li>}
        </ul>
      </form>
    </div>
  );
}
