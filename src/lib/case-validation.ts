/**
 * Server-side sanitising/validation for owner case input.
 * Only whitelisted keys survive, so a client can never set owner_id, status, case_number, etc.
 * Empty strings become NULL. Returns per-field errors instead of throwing.
 */
type Spec =
  | { t: "str"; max: number }
  | { t: "num"; min: number; max: number }
  | { t: "int"; min: number; max: number }
  | { t: "date" }
  | { t: "enum"; values: readonly string[] }
  | { t: "arr"; max: number; item: number }
  | { t: "bool" }
  | { t: "email" };

const YNU = ["yes", "no", "unknown"] as const;

export const CASE_SPEC: Record<string, Spec> = {
  pet_name: { t: "str", max: 100 },
  species: { t: "enum", values: ["dog", "cat", "other"] },
  breed: { t: "str", max: 100 },
  sex: { t: "enum", values: ["male", "female", "unknown"] },
  age_text: { t: "str", max: 60 },
  primary_color: { t: "str", max: 60 },
  secondary_colors: { t: "arr", max: 8, item: 40 },
  distinctive_markings: { t: "str", max: 1500 },
  distinguishing_description: { t: "str", max: 2000 },
  approx_weight_kg: { t: "num", min: 0, max: 200 },
  verified_weight_kg: { t: "num", min: 0, max: 200 },
  weight_recorded_on: { t: "date" },
  death_date: { t: "date" },
  surrendered_on: { t: "date" },
  location: { t: "str", max: 300 },
  vet_clinic: { t: "str", max: 200 },

  provider_name: { t: "str", max: 200 },
  service_type: { t: "enum", values: ["individual", "partitioned", "communal", "burial", "unknown", "other"] },
  service_other: { t: "str", max: 200 },
  collected_on: { t: "date" },
  collection_method: { t: "str", max: 200 },
  amount_paid: { t: "num", min: 0, max: 1_000_000_000 },
  cremains_received_on: { t: "date" },
  urn_received: { t: "enum", values: YNU },
  fur_returned: { t: "enum", values: YNU },
  paw_print_returned: { t: "enum", values: YNU },
  certificate_received: { t: "enum", values: YNU },
  other_items_returned: { t: "str", max: 500 },

  incident_year: { t: "int", min: 1990, max: 2100 },
  narrative: { t: "str", max: 8000 },
  refund_offered: { t: "enum", values: YNU },
  evidence_available_note: { t: "str", max: 1000 },
  other_details: { t: "str", max: 3000 },

  contact_name: { t: "str", max: 120 },
  contact_phone: { t: "str", max: 40 },
  contact_email: { t: "email" },
  contact_address: { t: "str", max: 300 },
  consent_acknowledged: { t: "bool" },
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeCasePatch(input: Record<string, unknown>): { patch: Record<string, unknown>; errors: Record<string, string> } {
  const patch: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const maxDate = today.toISOString().slice(0, 10);

  for (const [key, spec] of Object.entries(CASE_SPEC)) {
    if (!(key in input)) continue;
    const raw = input[key];
    const blank = raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "");

    if (spec.t === "bool") {
      patch[key] = raw === true || raw === "true";
      continue;
    }
    if (spec.t === "arr") {
      const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[,/]+/) : [];
      const cleaned = list.map((x) => String(x).trim()).filter(Boolean);
      if (cleaned.length > spec.max || cleaned.some((x) => x.length > spec.item)) errors[key] = "Too many or too long";
      else patch[key] = cleaned;
      continue;
    }
    if (blank) {
      patch[key] = null;
      continue;
    }
    const s = String(raw).trim();
    switch (spec.t) {
      case "str":
        if (s.length > spec.max) errors[key] = `Maximum ${spec.max} characters`;
        else patch[key] = s;
        break;
      case "email":
        if (s.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) errors[key] = "Enter a valid email address";
        else patch[key] = s;
        break;
      case "enum":
        if (!spec.values.includes(s)) errors[key] = "Invalid choice";
        else patch[key] = s;
        break;
      case "num": {
        const n = Number(s);
        if (!Number.isFinite(n) || n < spec.min || n > spec.max) errors[key] = `Enter a number between ${spec.min} and ${spec.max}`;
        else patch[key] = n;
        break;
      }
      case "int": {
        const n = Number(s);
        if (!Number.isInteger(n) || n < spec.min || n > spec.max) errors[key] = `Enter a year between ${spec.min} and ${spec.max}`;
        else patch[key] = n;
        break;
      }
      case "date":
        if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s)) || s > maxDate) errors[key] = "Enter a valid date (not in the future)";
        else patch[key] = s;
        break;
    }
  }
  return { patch, errors };
}

/** Required fields to SUBMIT (drafts can be saved incomplete). */
export function missingForSubmit(c: Record<string, unknown>): string[] {
  const missing: string[] = [];
  if (!c.pet_name) missing.push("Pet name");
  if (c.case_kind === "historical") {
    if (!c.narrative) missing.push("What happened");
    if (!c.incident_year) missing.push("Year");
  } else if (!c.species) {
    missing.push("Species");
  }
  if (!c.consent_acknowledged) missing.push("Acknowledgement");
  return missing;
}
