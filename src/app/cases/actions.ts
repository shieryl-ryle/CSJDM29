"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { missingForSubmit, sanitizeCasePatch } from "@/lib/case-validation";
import { recomputeMatchesForCase } from "@/lib/match-service";

/** Start a draft (current case or historical report) and open its form. All writes use the user's RLS-bound client. */
export async function createCase(kind: "current" | "historical") {
  const { supabase, user } = await requireUser("/report");
  // Reuse an untouched draft instead of creating another (double taps, page refreshes, repeat visits)
  const { data: empty } = await supabase
    .from("cases")
    .select("id")
    .eq("owner_id", user.id)
    .eq("case_kind", kind)
    .eq("status", "draft")
    .is("pet_name", null)
    .is("narrative", null)
    .limit(1)
    .maybeSingle();
  if (empty) redirect(`/cases/${empty.id}/edit`);

  const { data, error } = await supabase
    .from("cases")
    .insert({ owner_id: user.id, case_kind: kind, status: "draft", contact_email: user.email ?? null })
    .select("id")
    .single();
  if (error?.message.includes("draft limit")) redirect("/report?error=draft");
  if (error?.message.includes("case limit")) redirect("/report?error=limit");
  if (error || !data) throw new Error("Could not start the report. Try again.");
  redirect(`/cases/${data.id}/edit`);
}

export type SaveResult = { ok: true; savedAt: string } | { ok: false; errors: Record<string, string>; message?: string };

/** Autosave. Partial patches only; unknown keys are dropped by the sanitiser. */
export async function saveCase(caseId: string, input: Record<string, unknown>): Promise<SaveResult> {
  z.string().uuid().parse(caseId);
  const { supabase } = await requireUser();
  const { patch, errors } = sanitizeCasePatch(input);
  // Autosave tolerates a bad field: save the valid ones, report the rest.
  if (Object.keys(patch).length === 0) return Object.keys(errors).length ? { ok: false, errors } : { ok: true, savedAt: new Date().toISOString() };
  const { data: row, error } = await supabase.from("cases").update(patch).eq("id", caseId).select("status").maybeSingle();
  if (error || !row) return { ok: false, errors, message: "Could not save. Your entries are kept on this device and we will retry." };
  if (row.status !== "draft") await recomputeMatchesForCase(caseId); // edits to a submitted case refresh its leads
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, savedAt: new Date().toISOString() };
}

export type SubmitResult = { ok: false; missing?: string[]; errors?: Record<string, string>; message?: string };

export async function submitCase(caseId: string, input: Record<string, unknown>): Promise<SubmitResult> {
  z.string().uuid().parse(caseId);
  const { supabase, user } = await requireUser();
  const { patch, errors } = sanitizeCasePatch(input);
  if (Object.keys(errors).length) return { ok: false, errors };

  const { data: current } = await supabase.from("cases").select("*").eq("id", caseId).maybeSingle();
  if (!current) return { ok: false, message: "Case not found." };
  const merged = { ...current, ...patch };
  const missing = missingForSubmit(merged);
  if (missing.length) return { ok: false, missing };

  // The same account submitting the same pet twice is almost always a mistake
  if (merged.pet_name) {
    const esc = String(merged.pet_name).replace(/[%_\\]/g, (m) => "\\" + m);
    const { data: dup } = await supabase
      .from("cases")
      .select("case_number")
      .eq("owner_id", user.id)
      .eq("case_kind", merged.case_kind)
      .neq("id", caseId)
      .neq("status", "draft")
      .ilike("pet_name", esc)
      .limit(1)
      .maybeSingle();
    if (dup) return { ok: false, message: `A report for this pet name already exists (${dup.case_number}). Open that report to add evidence instead. If this is a different pet, change the name to tell them apart.` };
  }

  const { error } = await supabase
    .from("cases")
    .update({ ...patch, status: "submitted", contact_email: merged.contact_email ?? user.email ?? null })
    .eq("id", caseId);
  if (error) return { ok: false, message: "Could not submit. Try again." };

  await recomputeMatchesForCase(caseId);
  revalidatePath("/cases");
  redirect(`/cases/${caseId}?submitted=1`);
}

const eventSchema = z.object({
  caseId: z.string().uuid(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).optional(),
  evidence_id: z.string().uuid().optional().or(z.literal("")),
});

export async function addTimelineEvent(form: FormData) {
  const { supabase, user, profile } = await requireUser();
  const parsed = eventSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const { caseId, evidence_id, description, ...rest } = parsed.data;
  await supabase.from("timeline_events").insert({
    case_id: caseId,
    ...rest,
    description: description || null,
    evidence_id: evidence_id || null,
    added_by: user.id,
    added_by_role: profile.role === "owner" ? "owner" : "reviewer",
  });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath(`/admin/cases/${caseId}`);
}

export async function deleteTimelineEvent(form: FormData) {
  const { supabase } = await requireUser();
  const id = z.string().uuid().parse(form.get("id"));
  const caseId = z.string().uuid().parse(form.get("caseId"));
  await supabase.from("timeline_events").delete().eq("id", id);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath(`/admin/cases/${caseId}`);
}

/** Owners may refine an evidence description. Hashes, paths and the file itself are immutable (DB trigger). */
export async function updateEvidenceDescription(form: FormData) {
  const { supabase, user, profile } = await requireUser();
  const id = z.string().uuid().parse(form.get("id"));
  const description = z.string().trim().max(2000).parse(form.get("description") ?? "");
  const { data: ev } = await supabase.from("evidence").select("id, case_id, description").eq("id", id).maybeSingle(); // RLS
  if (!ev) return;
  const admin = createAdminClient();
  await admin.from("evidence").update({ description: description || null }).eq("id", id);
  await logAudit({
    actorId: user.id,
    actorRole: profile.role,
    action: "evidence.update_description",
    entityType: "evidence",
    entityId: id,
    previous: { description: ev.description },
    next: { description: description || null },
  });
  revalidatePath(`/cases/${ev.case_id}`);
}

export async function refreshMatches(form: FormData) {
  const { supabase } = await requireUser();
  const caseId = z.string().uuid().parse(form.get("caseId"));
  const { data } = await supabase.from("cases").select("id").eq("id", caseId).maybeSingle(); // RLS ownership check
  if (!data) return;
  await recomputeMatchesForCase(caseId);
  revalidatePath(`/cases/${caseId}/matches`);
}
