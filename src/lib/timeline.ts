import { EVIDENCE_TYPE_LABEL } from "./constants";
import { evidenceLabelMap, formatKg } from "./format";
import type { CaseRow, EvidenceRow, TimelineEventRow } from "./types";

export type TimelineOrigin = "owner_submitted" | "owner_added" | "reviewer_added" | "system";

export interface TimelineItem {
  key: string;
  date: string | null; // YYYY-MM-DD
  title: string;
  detail?: string;
  origin: TimelineOrigin;
  /** Evidence this event can be traced to (by explicit link, or by type for derived events) */
  evidence: { id: string; label: string; explicit: boolean }[];
  manualEventId?: string;
}

export interface TimelineMatchRef {
  pet_number: string;
  documented_on: string | null;
  tier: string;
}

const RELATED: Record<string, string[]> = {
  death: ["veterinary_record"],
  surrendered: ["pickup_delivery_document", "receipt", "invoice"],
  weight: ["weight_record", "veterinary_record"],
  cremains: ["urn_photo", "ashes_photo", "cremation_certificate", "fur_photo", "paw_print"],
};

/**
 * Chronological timeline built from owner-submitted case fields, evidence uploads, manual events
 * and (optionally) potential matches. Derived events are labelled with their origin so
 * "owner said" and "system derived" are never blurred.
 */
export function buildTimeline(input: {
  kase: CaseRow;
  evidence: EvidenceRow[];
  events: TimelineEventRow[];
  matches?: TimelineMatchRef[];
}): TimelineItem[] {
  const { kase: c, evidence, events, matches = [] } = input;
  const labels = evidenceLabelMap(evidence);
  const related = (kind: string) =>
    evidence
      .filter((e) => RELATED[kind].includes(e.evidence_type))
      .map((e) => ({ id: e.id, label: labels.get(e.id)!, explicit: false }));

  const items: TimelineItem[] = [];
  const add = (key: string, date: string | null, title: string, evidenceKind?: string, detail?: string) =>
    items.push({ key, date, title, detail, origin: "owner_submitted", evidence: evidenceKind ? related(evidenceKind) : [] });

  if (c.death_date) add("death", c.death_date, "Pet passed away", "death");
  if (c.surrendered_on) add("surrendered", c.surrendered_on, "Pet surrendered to aftercare provider", "surrendered");
  if (c.collected_on && c.collected_on !== c.surrendered_on)
    add("collected", c.collected_on, "Pet collected by provider", "surrendered", c.collection_method ? `Method: ${c.collection_method}` : undefined);
  if (c.weight_recorded_on)
    add(
      "weight",
      c.weight_recorded_on,
      `Weight recorded${c.verified_weight_kg != null ? `: ${formatKg(c.verified_weight_kg)}` : ""}`,
      "weight",
    );
  if (c.cremains_received_on) {
    const bits = [c.urn_received === "yes" ? "Urn received" : "Cremains/urn reported received"];
    add("cremains", c.cremains_received_on, bits[0], "cremains");
  }
  if (c.case_kind === "historical" && c.incident_year) add("incident", `${c.incident_year}-01-01`, `Reported incident (year ${c.incident_year})`, undefined, "Only the year was provided.");

  for (const e of evidence) {
    items.push({
      key: `ev-${e.id}`,
      date: e.uploaded_at.slice(0, 10),
      title: `Evidence file preserved: ${labels.get(e.id)}: ${EVIDENCE_TYPE_LABEL[e.evidence_type] ?? e.evidence_type}`,
      detail: `SHA-256 recorded at upload.`,
      origin: "system",
      evidence: [{ id: e.id, label: labels.get(e.id)!, explicit: true }],
    });
  }

  for (const m of matches) {
    if (!m.documented_on) continue;
    items.push({
      key: `match-${m.pet_number}`,
      date: m.documented_on,
      title: `Recovered animal ${m.pet_number} documented with potentially corresponding information`,
      detail: "Potential match. Requires human review. Not a confirmed identification.",
      origin: "system",
      evidence: [],
    });
  }

  for (const ev of events) {
    const linked = ev.evidence_id && labels.has(ev.evidence_id) ? [{ id: ev.evidence_id, label: labels.get(ev.evidence_id)!, explicit: true }] : [];
    items.push({
      key: `manual-${ev.id}`,
      date: ev.event_date,
      title: ev.title,
      detail: ev.description ?? undefined,
      origin: ev.added_by_role === "owner" ? "owner_added" : "reviewer_added",
      evidence: linked,
      manualEventId: ev.id,
    });
  }

  return items.sort((a, b) => {
    if (a.date === b.date) return a.key.localeCompare(b.key);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}
