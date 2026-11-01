import Link from "next/link";
import { Badge } from "@/components/site";
import { addTimelineEvent, deleteTimelineEvent } from "@/app/cases/actions";
import { MATCH_NOTICE, MATCH_REVIEW_LABEL, SERVICE_TYPE_LABEL, SEX_LABEL, SPECIES_LABEL, TIER_LABEL, YNU_LABEL } from "@/lib/constants";
import { evidenceLabelMap, formatDate, formatKg } from "@/lib/format";
import type { Comparison } from "@/lib/matching";
import type { TimelineItem } from "@/lib/timeline";
import type { CaseRow, EvidenceRow, PublicPet } from "@/lib/types";
import { EVIDENCE_TYPE_LABEL } from "@/lib/constants";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === false) return null;
  return (
    <div className="grid gap-0.5 border-b border-sand-100 py-2 text-sm last:border-0 sm:grid-cols-[13rem_1fr]">
      <dt className="font-semibold text-ink-700">{label}</dt>
      <dd className="break-words text-ink-900">{value}</dd>
    </div>
  );
}

export function CaseSummary({ kase: c, includeContact = true }: { kase: CaseRow; includeContact?: boolean }) {
  const colors = [c.primary_color, ...(c.secondary_colors ?? [])].filter(Boolean).join(" / ");
  return (
    <div className="space-y-5">
      <section className="card">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Pet information · owner-submitted</h3>
        <dl className="mt-2">
          <Row label="Name" value={c.pet_name} />
          <Row label="Species" value={c.species && SPECIES_LABEL[c.species]} />
          <Row label="Breed" value={c.breed} />
          <Row label="Sex" value={c.sex && SEX_LABEL[c.sex]} />
          <Row label="Age" value={c.age_text} />
          <Row label="Colors" value={colors} />
          <Row label="Distinctive markings" value={c.distinctive_markings} />
          <Row label="Other distinguishing details" value={c.distinguishing_description} />
          <Row label="Approximate weight" value={formatKg(c.approx_weight_kg)} />
          <Row label="Last verified weight" value={formatKg(c.verified_weight_kg)} />
          <Row label="Date weight recorded" value={formatDate(c.weight_recorded_on)} />
          <Row label="Date passed away" value={formatDate(c.death_date)} />
          <Row label="Date surrendered for aftercare" value={formatDate(c.surrendered_on)} />
          <Row label="Location" value={c.location} />
          <Row label="Veterinary clinic" value={c.vet_clinic} />
        </dl>
      </section>

      {(c.provider_name || c.service_type || c.collected_on || c.amount_paid != null || c.cremains_received_on || c.urn_received) && (
        <section className="card">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Aftercare information · owner-submitted · private</h3>
          <dl className="mt-2">
            <Row label="Aftercare provider" value={c.provider_name} />
            <Row label="Service purchased" value={c.service_type && (SERVICE_TYPE_LABEL[c.service_type] + (c.service_other ? `, ${c.service_other}` : ""))} />
            <Row label="Date collected / surrendered" value={formatDate(c.collected_on)} />
            <Row label="Collection method" value={c.collection_method} />
            <Row label="Amount paid" value={c.amount_paid != null && `${c.amount_currency} ${Number(c.amount_paid).toLocaleString("en-PH")}`} />
            <Row label="Cremains / urn received on" value={formatDate(c.cremains_received_on)} />
            <Row label="Urn received" value={c.urn_received && YNU_LABEL[c.urn_received]} />
            <Row label="Hair / fur returned" value={c.fur_returned && YNU_LABEL[c.fur_returned]} />
            <Row label="Paw print returned" value={c.paw_print_returned && YNU_LABEL[c.paw_print_returned]} />
            <Row label="Certificate received" value={c.certificate_received && YNU_LABEL[c.certificate_received]} />
            <Row label="Other items returned" value={c.other_items_returned} />
          </dl>
        </section>
      )}

      {c.case_kind === "historical" && (
        <section className="card">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Previous incident · owner-submitted report</h3>
          <dl className="mt-2">
            <Row label="Year" value={c.incident_year} />
            <Row label="What happened" value={<span className="whitespace-pre-wrap">{c.narrative}</span>} />
            <Row label="Evidence available" value={c.evidence_available_note} />
            <Row label="Ashes received" value={c.urn_received && YNU_LABEL[c.urn_received]} />
            <Row label="Refund offered" value={c.refund_offered && YNU_LABEL[c.refund_offered]} />
            <Row label="Other details" value={<span className="whitespace-pre-wrap">{c.other_details}</span>} />
          </dl>
        </section>
      )}

      {includeContact && (
        <section className="card">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Contact · private</h3>
          <dl className="mt-2">
            <Row label="Name" value={c.contact_name} />
            <Row label="Phone" value={c.contact_phone} />
            <Row label="Email" value={c.contact_email} />
            <Row label="Area" value={c.contact_address} />
          </dl>
        </section>
      )}
    </div>
  );
}

const ORIGIN_TEXT: Record<string, string> = {
  owner_submitted: "Owner-submitted",
  owner_added: "Added by owner",
  reviewer_added: "Added by reviewer",
  system: "Recorded by platform",
};

export function TimelineView({ items, caseId, evidence, canAdd = true }: { items: TimelineItem[]; caseId: string; evidence: EvidenceRow[]; canAdd?: boolean }) {
  const labels = evidenceLabelMap(evidence);
  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm text-ink-500">The timeline is built from entered dates and uploaded evidence.</p>
      ) : (
        <ol className="relative space-y-4 border-l-2 border-brand-200 pl-5">
          {items.map((it) => (
            <li key={it.key} className="relative">
              <span className="absolute -left-[1.6rem] top-1.5 size-3 rounded-full border-2 border-brand-600 bg-white" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{it.date ? formatDate(it.date) : "Date unknown"}</p>
              <p className="font-medium text-ink-900">{it.title}</p>
              {it.detail && <p className="text-sm text-ink-700">{it.detail}</p>}
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
                <Badge>{ORIGIN_TEXT[it.origin]}</Badge>
                {it.evidence.length > 0 && (
                  <span>
                    {it.evidence.some((e) => e.explicit) ? "Evidence:" : "Possibly related uploads:"} {it.evidence.map((e) => e.label).join(", ")}
                  </span>
                )}
                {it.manualEventId && canAdd && (
                  <form action={deleteTimelineEvent} className="inline">
                    <input type="hidden" name="id" value={it.manualEventId} />
                    <input type="hidden" name="caseId" value={caseId} />
                    <button className="underline">Remove</button>
                  </form>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
      {canAdd && (
        <details className="mt-5 rounded-xl border border-sand-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold text-brand-700">+ Add an event</summary>
          <form action={addTimelineEvent} className="mt-3 space-y-3">
            <input type="hidden" name="caseId" value={caseId} />
            <div>
              <label className="label" htmlFor="event_date">Date</label>
              <input id="event_date" name="event_date" type="date" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="ev_title">What happened</label>
              <input id="ev_title" name="title" required maxLength={300} className="input" placeholder="e.g. Provider replied by Messenger" />
            </div>
            <div>
              <label className="label" htmlFor="ev_desc">Details (optional)</label>
              <textarea id="ev_desc" name="description" maxLength={2000} className="input" rows={2} />
            </div>
            {evidence.length > 0 && (
              <div>
                <label className="label" htmlFor="ev_ev">Supporting evidence (optional)</label>
                <select id="ev_ev" name="evidence_id" className="input" defaultValue="">
                  <option value="">None</option>
                  {[...evidence]
                    .sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at))
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {labels.get(e.id)}: {EVIDENCE_TYPE_LABEL[e.evidence_type] ?? e.evidence_type}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <button className="btn-primary btn-sm">Add to timeline</button>
          </form>
        </details>
      )}
    </div>
  );
}

const ICON: Record<string, string> = { match: "✓", close: "✓", differs: "✗", unavailable: "?", review: "?" };
const ICON_TONE: Record<string, string> = {
  match: "text-brand-700",
  close: "text-brand-700",
  differs: "text-soft-800",
  unavailable: "text-ink-500",
  review: "text-note-800",
};
const ORDER = ["name", "weight", "species", "sex", "primary_color", "secondary_colors", "markings", "timeline"];

export function ComparisonList({ comparisons }: { comparisons: Comparison[] }) {
  const sorted = [...comparisons].sort((a, b) => ORDER.indexOf(a.field) - ORDER.indexOf(b.field));
  return (
    <ul className="space-y-1 text-sm">
      {sorted.map((c) => (
        <li key={c.field} className="flex gap-2">
          <span className={`w-4 shrink-0 text-center font-bold ${ICON_TONE[c.status]}`} aria-label={c.status}>{ICON[c.status]}</span>
          <span>
            <strong>{c.label}:</strong> {c.detail}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MatchCard({
  tier,
  pet,
  reviewStatus,
  comparisons,
  reviewerNote,
  children,
}: {
  tier: string;
  pet: Pick<PublicPet, "public_case_number" | "label_name">;
  reviewStatus: string;
  comparisons: Comparison[];
  reviewerNote?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <li className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Potential match</p>
          <p className="font-serif text-xl font-semibold text-brand-800">{pet.public_case_number}</p>
        </div>
        <Badge tone={tier === "strong" ? "good" : tier === "moderate" ? "info" : "neutral"}>{TIER_LABEL[tier]}</Badge>
      </div>
      <div className="mt-3"><ComparisonList comparisons={comparisons} /></div>
      <p className="mt-3 rounded-lg bg-note-50 p-2 text-xs text-note-800">{MATCH_NOTICE}</p>
      <p className="mt-2 text-xs text-ink-500">Status: {MATCH_REVIEW_LABEL[reviewStatus]}{reviewerNote ? `. ${reviewerNote}` : ""}</p>
      <p className="mt-3 flex flex-wrap gap-2">
        <Link href={`/registry/${pet.public_case_number}`} className="btn-secondary btn-sm">Review record</Link>
      </p>
      {children}
    </li>
  );
}
