"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveCase, submitCase } from "@/app/cases/actions";
import { SERVICE_TYPES, YES_NO_UNKNOWN } from "@/lib/constants";
import type { CaseRow } from "@/lib/types";

type Values = Record<string, string | boolean>;

const FIELDS = [
  "pet_name", "species", "breed", "sex", "age_text", "primary_color", "secondary_colors", "distinctive_markings", "distinguishing_description",
  "approx_weight_kg", "verified_weight_kg", "weight_recorded_on", "death_date", "surrendered_on", "location", "vet_clinic",
  "provider_name", "service_type", "service_other", "collected_on", "collection_method", "amount_paid", "cremains_received_on",
  "urn_received", "fur_returned", "paw_print_returned", "certificate_received", "other_items_returned",
  "incident_year", "narrative", "refund_offered", "evidence_available_note", "other_details",
  "contact_name", "contact_phone", "contact_email", "contact_address", "consent_acknowledged",
] as const;

function toValues(c: CaseRow): Values {
  const v: Values = {};
  for (const f of FIELDS) {
    const raw = (c as unknown as Record<string, unknown>)[f];
    v[f] = f === "consent_acknowledged" ? !!raw : Array.isArray(raw) ? raw.join(", ") : raw == null ? "" : String(raw);
  }
  return v;
}

const MARKING_EXAMPLES = ["scar", "missing tooth", "unusual coat marking", "collar", "surgery", "deformity", "distinctive ear", "tail characteristics"];

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function CaseWizard({
  initial,
  slots,
}: {
  initial: CaseRow;
  slots: { petPhotos: React.ReactNode; evidence: React.ReactNode };
}) {
  const historical = initial.case_kind === "historical";
  const steps = historical ? ["What happened", "Evidence", "Contact & submit"] : ["Your pet", "Aftercare", "Evidence", "Contact & submit"];
  const storageKey = `csjdm:draft:${initial.id}`;

  const [values, setValues] = useState<Values>(() => toValues(initial));
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // Restore any unsynced local backup (e.g. the page was closed while offline)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const { values: v, dirty: d } = JSON.parse(raw) as { values: Values; dirty: string[] };
      if (d?.length) {
        d.forEach((k) => dirty.current.add(k));
        setValues((cur) => ({ ...cur, ...Object.fromEntries(d.map((k) => [k, v[k]])) }));
        setSaveState("dirty");
        schedule(300);
      }
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const keys = [...dirty.current];
    if (keys.length === 0) return true;
    const payload = Object.fromEntries(keys.map((k) => [k, valuesRef.current[k]]));
    setSaveState("saving");
    try {
      const res = await saveCase(initial.id, payload);
      if (res.ok) {
        keys.forEach((k) => dirty.current.delete(k));
        setErrors({});
        setSaveState(dirty.current.size ? "dirty" : "saved");
        try {
          dirty.current.size === 0 ? localStorage.removeItem(storageKey) : null;
        } catch {}
        return true;
      }
      setErrors(res.errors);
      // fields that were rejected stay dirty; the valid ones were saved
      keys.filter((k) => !(k in res.errors)).forEach((k) => dirty.current.delete(k));
      setSaveState(res.message ? "error" : "saved");
      return !res.message;
    } catch {
      setSaveState("error");
      return false;
    }
  }, [initial.id, storageKey]);

  function schedule(ms = 1200) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), ms);
  }

  // Retry after a failed save (offline etc.)
  useEffect(() => {
    if (saveState !== "error") return;
    const t = setTimeout(() => void flush(), 8000);
    const online = () => void flush();
    window.addEventListener("online", online);
    return () => {
      clearTimeout(t);
      window.removeEventListener("online", online);
    };
  }, [saveState, flush]);

  function set(name: string, value: string | boolean) {
    setValues((v) => {
      const next = { ...v, [name]: value };
      try {
        dirty.current.add(name);
        localStorage.setItem(storageKey, JSON.stringify({ values: next, dirty: [...dirty.current] }));
      } catch {}
      return next;
    });
    dirty.current.add(name);
    setSaveState("dirty");
    schedule();
  }

  async function go(to: number) {
    await flush();
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit() {
    setSubmitMsg(null);
    startTransition(async () => {
      const res = await submitCase(initial.id, valuesRef.current);
      // on success the action redirects; if we are here, something needs attention
      if (res && !res.ok) {
        if (res.missing?.length) setSubmitMsg(`Please complete: ${res.missing.join(", ")}.`);
        else if (res.errors) {
          setErrors(res.errors);
          setSubmitMsg("Please check the highlighted fields.");
        } else setSubmitMsg(res.message ?? "Could not submit.");
      }
    });
  }

  // ---- field helpers
  const txt = (name: string, label: string, o: { hint?: string; placeholder?: string; type?: string; inputMode?: "decimal" | "numeric" | "tel" | "email"; autoComplete?: string; required?: boolean } = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}{o.required && <span className="text-soft-800"> *</span>}</label>
      <input id={name} name={name} type={o.type ?? "text"} inputMode={o.inputMode} autoComplete={o.autoComplete ?? "off"} className="input" placeholder={o.placeholder} value={String(values[name] ?? "")} onChange={(e) => set(name, e.target.value)} aria-invalid={!!errors[name]} />
      {o.hint && <p className="hint">{o.hint}</p>}
      {errors[name] && <p className="mt-1 text-sm text-soft-800" role="alert">{errors[name]}</p>}
    </div>
  );
  const area = (name: string, label: string, o: { hint?: string; placeholder?: string; required?: boolean; rows?: number } = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}{o.required && <span className="text-soft-800"> *</span>}</label>
      <textarea id={name} name={name} rows={o.rows ?? 4} className="input" placeholder={o.placeholder} value={String(values[name] ?? "")} onChange={(e) => set(name, e.target.value)} />
      {o.hint && <p className="hint">{o.hint}</p>}
      {errors[name] && <p className="mt-1 text-sm text-soft-800" role="alert">{errors[name]}</p>}
    </div>
  );
  const date = (name: string, label: string, hint?: string) => txt(name, label, { type: "date", hint });
  const choice = (name: string, label: string, options: readonly (readonly [string, string])[]) => (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {options.map(([v, l]) => {
          const on = values[name] === v;
          return (
            <button key={v} type="button" role="radio" aria-checked={on} onClick={() => set(name, on ? "" : v)} className={`min-h-12 rounded-xl border-2 px-4 py-2 text-base font-medium transition ${on ? "border-brand-600 bg-brand-600 text-white" : "border-sand-300 bg-white text-ink-700 hover:border-brand-500"}`}>
              {l}
            </button>
          );
        })}
      </div>
      {errors[name] && <p className="mt-1 text-sm text-soft-800" role="alert">{errors[name]}</p>}
    </fieldset>
  );
  const select = (name: string, label: string, options: readonly (readonly [string, string])[]) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select id={name} className="input" value={String(values[name] ?? "")} onChange={(e) => set(name, e.target.value)}>
        <option value="">Select…</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );

  const saveLabel = useMemo(
    () => ({ idle: "", dirty: "Unsaved changes…", saving: "Saving…", saved: "All changes saved ✓", error: "Offline — kept on this device, will retry" })[saveState],
    [saveState],
  );

  const stepName = steps[step];
  const last = step === steps.length - 1;

  return (
    <div>
      <div className="no-print sticky top-0 z-10 -mx-4 border-b border-sand-200 bg-sand-50/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <p className="font-semibold text-brand-800">Step {step + 1} of {steps.length}: {stepName}</p>
          <p role="status" className={saveState === "error" ? "text-note-800" : "text-ink-500"}>{saveLabel}</p>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-sand-200"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      </div>

      <div className="mt-6 space-y-6">
        {stepName === "Your pet" && (
          <>
            <p className="prose-calm">We’re so sorry you’re going through this. Share what you can — you can come back at any time. Everything saves automatically.</p>
            {txt("pet_name", "Pet’s name", { required: true, autoComplete: "off" })}
            {choice("species", "Species", [["dog", "Dog"], ["cat", "Cat"], ["other", "Other"]])}
            {txt("breed", "Breed (if known)")}
            {choice("sex", "Sex", [["male", "Male"], ["female", "Female"], ["unknown", "Not sure"]])}
            {txt("age_text", "Age", { placeholder: "e.g. 6 years, 8 months" })}
            <div className="grid gap-4 sm:grid-cols-2">
              {txt("primary_color", "Main colour", { placeholder: "e.g. white" })}
              {txt("secondary_colors", "Other colours", { placeholder: "e.g. brown, black", hint: "Separate with commas." })}
            </div>
            {area("distinctive_markings", "Distinctive markings", { placeholder: "e.g. brown patch over left eye", rows: 3 })}
            <div>
              {area("distinguishing_description", "Describe anything that could help distinguish your pet", {
                rows: 4,
                hint: "For example: a scar, a missing tooth, an unusual coat marking, a collar, surgery, a deformity, a distinctive ear, or tail characteristics.",
              })}
              <div className="mt-2 flex flex-wrap gap-2" aria-label="Quick add">
                {MARKING_EXAMPLES.map((m) => (
                  <button key={m} type="button" className="rounded-full border border-sand-300 bg-white px-3 py-1 text-sm text-ink-700 hover:border-brand-500" onClick={() => set("distinguishing_description", `${String(values.distinguishing_description ?? "").trim()}${values.distinguishing_description ? "; " : ""}${m}: `)}>
                    + {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {txt("approx_weight_kg", "Approximate weight (kg)", { inputMode: "decimal", placeholder: "e.g. 14" })}
              {txt("verified_weight_kg", "Last verified weight (kg)", { inputMode: "decimal", hint: "For example from a vet visit." })}
            </div>
            {date("weight_recorded_on", "Date that weight was recorded")}
            <div className="grid gap-4 sm:grid-cols-2">
              {date("death_date", "Date your pet passed away")}
              {date("surrendered_on", "Date surrendered for aftercare")}
            </div>
            {txt("location", "Location", { hint: "Town or barangay where your pet was handed over." })}
            {txt("vet_clinic", "Veterinary clinic (if any)")}
            <section className="card">
              <h2 className="font-serif text-lg font-semibold">Photos of your pet while alive</h2>
              <p className="hint mb-3">Several clear photos help most — face, full body, and any markings.</p>
              {slots.petPhotos}
            </section>
          </>
        )}

        {stepName === "Aftercare" && (
          <>
            <p className="prose-calm">About the cremation or burial service you arranged. Your answers here are private.</p>
            <div>
              {txt("provider_name", "Aftercare provider")}
              <p className="hint">Private. We never publish the provider’s name; authorized reviewers can use it to link related cases.</p>
            </div>
            {select("service_type", "Service you purchased", SERVICE_TYPES)}
            {values.service_type === "other" && txt("service_other", "Please describe the service")}
            {date("collected_on", "Date your pet was collected / handed over")}
            <div>
              {txt("collection_method", "How was your pet collected?", { placeholder: "e.g. picked up from my home" })}
            </div>
            {txt("amount_paid", "Amount paid (PHP)", { inputMode: "decimal" })}
            {date("cremains_received_on", "Date cremains / urn were received")}
            {choice("urn_received", "Did you receive an urn?", YES_NO_UNKNOWN)}
            {choice("fur_returned", "Was hair / fur returned?", YES_NO_UNKNOWN)}
            {choice("paw_print_returned", "Was a paw print returned?", YES_NO_UNKNOWN)}
            {choice("certificate_received", "Did you receive a certificate?", YES_NO_UNKNOWN)}
            {txt("other_items_returned", "Anything else returned?")}
          </>
        )}

        {stepName === "What happened" && (
          <>
            <p className="rounded-xl border border-note-200 bg-note-50 p-3 text-sm text-note-800">
              This will be recorded as an <strong>owner-submitted report</strong>. It is not treated as verified until independently supported.
            </p>
            {txt("incident_year", "Year", { inputMode: "numeric", required: true, placeholder: "e.g. 2023" })}
            {txt("pet_name", "Pet’s name", { required: true })}
            {choice("species", "Species", [["dog", "Dog"], ["cat", "Cat"], ["other", "Other"]])}
            <div>
              {txt("provider_name", "Provider")}
              <p className="hint">Private. Not shown publicly.</p>
            </div>
            {select("service_type", "Service", SERVICE_TYPES)}
            {area("narrative", "What happened", { required: true, rows: 6, hint: "In your own words. Stick to what you personally experienced or have records of." })}
            {area("evidence_available_note", "Evidence you have available", { rows: 3, placeholder: "e.g. receipt, Messenger chat, photos of the urn" })}
            {choice("urn_received", "Were ashes received?", YES_NO_UNKNOWN)}
            {choice("refund_offered", "Was a refund offered?", YES_NO_UNKNOWN)}
            {area("other_details", "Other relevant details", { rows: 4 })}
          </>
        )}

        {stepName === "Evidence" && (
          <section className="card">
            <h2 className="font-serif text-lg font-semibold">Evidence vault</h2>
            <p className="hint mb-4">
              Receipts, messages, certificates, photos of the urn or returned items, vet records, refund offers — anything you have. You can add more later.
            </p>
            {slots.evidence}
          </section>
        )}

        {stepName === "Contact & submit" && (
          <>
            <p className="prose-calm">So a reviewer can reach you. <strong>Never shown publicly.</strong></p>
            {txt("contact_name", "Your name", { autoComplete: "name" })}
            {txt("contact_phone", "Mobile number", { type: "tel", inputMode: "tel", autoComplete: "tel" })}
            {txt("contact_email", "Email", { type: "email", inputMode: "email", autoComplete: "email" })}
            {txt("contact_address", "Area (optional)", { hint: "Town or barangay is enough. Please don’t share your full address here.", autoComplete: "off" })}
            <label className="flex items-start gap-3 rounded-xl border border-sand-300 bg-white p-4">
              <input type="checkbox" className="mt-1 size-6 shrink-0" checked={!!values.consent_acknowledged} onChange={(e) => set("consent_acknowledged", e.target.checked)} />
              <span className="text-sm text-ink-700">
                I confirm what I’ve shared is true to the best of my knowledge. I understand it is owner-submitted, will be reviewed by people, and that any potential match is an investigative lead, not a confirmed identification.
              </span>
            </label>
            {submitMsg && <p role="alert" className="rounded-xl bg-soft-50 p-3 text-sm text-soft-800">{submitMsg}</p>}
            <button type="button" className="btn-primary w-full text-lg" onClick={submit} disabled={pending}>
              {pending ? "Submitting…" : "Submit my report"}
            </button>
            <p className="text-center text-sm text-ink-500">You can still add evidence and edit details after submitting.</p>
          </>
        )}
      </div>

      <div className="no-print mt-8 flex gap-3">
        {step > 0 && <button type="button" className="btn-secondary flex-1" onClick={() => go(step - 1)}>Back</button>}
        {!last && <button type="button" className="btn-primary flex-1" onClick={() => go(step + 1)}>Save & continue</button>}
      </div>
    </div>
  );
}
