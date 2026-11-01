import { SERVICE_TYPE_LABEL, SEX_LABEL, SPECIES_LABEL, YNU_LABEL } from "./constants";
import type { CaseRow } from "./types";

/** Plain-text case record used inside the ZIP export. Owner-submitted data, unverified. */
export function caseSummaryText(c: CaseRow, includeContact: boolean): string {
  const rows: [string, string | number | null | undefined][] = [
    ["Case ID", c.case_number],
    ["Record type", c.case_kind === "historical" ? "Owner-submitted report of a previous incident" : "Owner-submitted case"],
    ["Status", c.status],
    ["Submitted at", c.submitted_at],
    ["", ""],
    ["#PET (owner-submitted)", ""],
    ["Name", c.pet_name],
    ["Species", c.species && SPECIES_LABEL[c.species]],
    ["Breed", c.breed],
    ["Sex", c.sex && SEX_LABEL[c.sex]],
    ["Age", c.age_text],
    ["Primary color", c.primary_color],
    ["Secondary colors", (c.secondary_colors ?? []).join(", ")],
    ["Distinctive markings", c.distinctive_markings],
    ["Other distinguishing details", c.distinguishing_description],
    ["Approximate weight (kg)", c.approx_weight_kg],
    ["Last verified weight (kg)", c.verified_weight_kg],
    ["Weight recorded on", c.weight_recorded_on],
    ["Date of death", c.death_date],
    ["Date surrendered", c.surrendered_on],
    ["Location", c.location],
    ["Veterinary clinic", c.vet_clinic],
    ["", ""],
    ["#AFTERCARE (owner-submitted)", ""],
    ["Provider", c.provider_name],
    ["Service", c.service_type && SERVICE_TYPE_LABEL[c.service_type]],
    ["Service (other)", c.service_other],
    ["Collected on", c.collected_on],
    ["Collection method", c.collection_method],
    ["Amount paid", c.amount_paid != null ? `${c.amount_currency} ${c.amount_paid}` : null],
    ["Cremains or urn received on", c.cremains_received_on],
    ["Urn received", c.urn_received && YNU_LABEL[c.urn_received]],
    ["Hair or fur returned", c.fur_returned && YNU_LABEL[c.fur_returned]],
    ["Paw print returned", c.paw_print_returned && YNU_LABEL[c.paw_print_returned]],
    ["Certificate received", c.certificate_received && YNU_LABEL[c.certificate_received]],
    ["Other items returned", c.other_items_returned],
  ];
  if (c.case_kind === "historical") {
    rows.push(
      ["", ""],
      ["#PREVIOUS INCIDENT (owner-submitted)", ""],
      ["Year", c.incident_year],
      ["Narrative", c.narrative],
      ["Evidence available", c.evidence_available_note],
      ["Refund offered", c.refund_offered && YNU_LABEL[c.refund_offered]],
      ["Other details", c.other_details],
    );
  }
  if (includeContact) {
    rows.push(
      ["", ""],
      ["#CONTACT (private)", ""],
      ["Name", c.contact_name],
      ["Phone", c.contact_phone],
      ["Email", c.contact_email],
      ["Area", c.contact_address],
    );
  }
  return (
    rows
      .filter(([k, v]) => k === "" || k.startsWith("#") || (v !== null && v !== undefined && v !== ""))
      .map(([k, v]) => (k === "" ? "" : k.startsWith("#") ? k.slice(1) : `${k}: ${v}`))
      .join("\n") + "\n"
  );
}
