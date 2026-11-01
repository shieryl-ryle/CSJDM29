import Link from "next/link";
import { Badge, OriginBadge } from "@/components/site";
import { CLAIM_VERIFICATION_LABEL, ORIGIN_LABEL, SEX_LABEL, SIZE_LABEL, SPECIES_LABEL, VERIFICATION_LABEL } from "@/lib/constants";
import { formatDateTime, formatSeconds } from "@/lib/format";
import type { ClaimRow, PublicPet } from "@/lib/types";

export function colorText(p: Pick<PublicPet, "primary_color" | "secondary_colors">) {
  return [p.primary_color, ...(p.secondary_colors ?? [])].filter(Boolean).join(" / ") || "Not recorded";
}

export function PetSummaryCard({ pet, notes }: { pet: PublicPet; notes?: string[] }) {
  return (
    <li className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link href={`/registry/${pet.public_case_number}`} className="font-serif text-xl font-semibold text-brand-800 hover:underline">
          {pet.public_case_number}
        </Link>
        <Badge tone={pet.verification_status === "reviewer_verified" ? "good" : "note"}>{VERIFICATION_LABEL[pet.verification_status]}</Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-ink-500">Source label</dt>
        <dd>
          {pet.label_name ? <strong>{pet.label_name}</strong> : "n/a"}
          {pet.label_weight_kg != null && <> · {Number(pet.label_weight_kg)} kg</>}
        </dd>
        <dt className="text-ink-500">Species</dt>
        <dd>{SPECIES_LABEL[pet.species]}</dd>
        <dt className="text-ink-500">Colors</dt>
        <dd>{colorText(pet)}</dd>
        <dt className="text-ink-500">Size</dt>
        <dd>{SIZE_LABEL[pet.estimated_size]}</dd>
      </dl>
      {notes && notes.length > 0 && <p className="mt-2 text-xs text-ink-500">Characteristics in common with your search: {notes.join("; ")}</p>}
      <p className="mt-3">
        <Link href={`/registry/${pet.public_case_number}`} className="btn-secondary btn-sm">Review record</Link>
      </p>
    </li>
  );
}

export function FieldRow({ label, value, origin }: { label: string; value: React.ReactNode; origin?: string }) {
  return (
    <div className="grid gap-1 border-b border-sand-100 py-3 last:border-0 sm:grid-cols-[11rem_1fr]">
      <dt className="text-sm font-semibold text-ink-700">{label}</dt>
      <dd>
        <div className="text-ink-900">{value || <span className="text-ink-500">Not recorded</span>}</div>
        {origin && <div className="mt-1"><OriginBadge origin={origin} /></div>}
      </dd>
    </div>
  );
}

const FIELD_LABEL: Record<string, string> = {
  label_name: "Label: name",
  label_weight_kg: "Label: weight (kg)",
  species: "Species",
  possible_sex: "Possible sex",
  primary_color: "Primary color",
  secondary_colors: "Secondary colors",
  estimated_size: "Estimated size",
  visible_markings: "Visible markings",
  collar_description: "Collar",
  distinctive_features: "Distinctive features",
  condition_notes: "Condition notes",
};

/** "Where did this information come from?": every claim, grouped by field, newest first. Nothing is merged. */
export function ProvenanceList({ claims }: { claims: Pick<ClaimRow, "field_name" | "value" | "origin" | "source_label" | "source_type" | "source_timestamp_seconds" | "source_url" | "verification" | "extractor" | "recorded_at">[] }) {
  if (claims.length === 0) return <p className="text-sm text-ink-500">No provenance entries recorded yet.</p>;
  const byField = new Map<string, typeof claims>();
  for (const c of [...claims].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))) {
    byField.set(c.field_name, [...(byField.get(c.field_name) ?? []), c]);
  }
  return (
    <div className="space-y-4">
      {[...byField.entries()].map(([field, list]) => (
        <div key={field}>
          <h4 className="text-sm font-semibold text-ink-700">{FIELD_LABEL[field] ?? field}</h4>
          <ul className="mt-1 space-y-2">
            {list.map((c, i) => (
              <li key={i} className={`rounded-xl border p-3 text-sm ${i === 0 ? "border-brand-200 bg-brand-50/40" : "border-sand-200 bg-white"}`}>
                <p>
                  <strong>“{c.value ?? "n/a"}”</strong> {i === 0 ? <span className="text-xs text-ink-500">(current)</span> : <span className="text-xs text-ink-500">(earlier entry)</span>}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  {ORIGIN_LABEL[c.origin]} · source: {c.source_label ?? "not stated"}
                  {c.source_type ? ` (${c.source_type.replace("_", " ")})` : ""}
                  {c.source_timestamp_seconds != null ? ` · at ${formatSeconds(c.source_timestamp_seconds)}` : ""}
                  {" · "}
                  {CLAIM_VERIFICATION_LABEL[c.verification]}
                  {c.extractor !== "manual" ? ` · extracted by ${c.extractor}` : ""} · recorded {formatDateTime(c.recorded_at)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function sexText(s: string) {
  return SEX_LABEL[s] ?? s;
}
