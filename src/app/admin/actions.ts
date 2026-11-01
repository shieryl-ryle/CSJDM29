"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireReviewer } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseTimestamp } from "@/lib/format";
import { recomputeMatchesForPet } from "@/lib/match-service";

const str = (form: FormData, key: string, max = 500): string | null => {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  if (t.length > max) throw new Error(`${key} is too long`);
  return t;
};
const oneOf = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T => (v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback);
const uuid = (v: FormDataEntryValue | null) => z.string().uuid().parse(v);

// ---------------------------------------------------------------------------
// Recovered pets
// ---------------------------------------------------------------------------
/** Fields whose every change is recorded as an append-only provenance claim. */
const CLAIM_FIELDS = [
  "label_name",
  "label_weight_kg",
  "species",
  "possible_sex",
  "primary_color",
  "secondary_colors",
  "estimated_size",
  "visible_markings",
  "collar_description",
  "distinctive_features",
  "condition_notes",
] as const;

function readPetForm(form: FormData) {
  const weightRaw = str(form, "label_weight_kg", 12);
  const weight = weightRaw == null ? null : Number(weightRaw);
  if (weight != null && (!Number.isFinite(weight) || weight < 0 || weight > 200)) throw new Error("Weight must be between 0 and 200 kg");
  const secondary = (str(form, "secondary_colors", 200) ?? "").split(/[,/]+/).map((x) => x.trim()).filter(Boolean).slice(0, 8);
  const documented = str(form, "documented_on", 10);
  if (documented && !/^\d{4}-\d{2}-\d{2}$/.test(documented)) throw new Error("Invalid documented date");
  const sourceUrl = str(form, "source_url", 1000);
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) throw new Error("Source URL must start with http(s)://");
  const start = parseTimestamp(str(form, "video_start", 12));
  const end = parseTimestamp(str(form, "video_end", 12));
  return {
    values: {
      source: str(form, "source", 200),
      source_url: sourceUrl,
      source_video_id: form.get("source_video_id") ? uuid(form.get("source_video_id")) : null,
      source_video_identifier: str(form, "source_video_identifier", 200),
      video_start_seconds: start,
      video_end_seconds: end,
      documented_on: documented,
      label_name: str(form, "label_name", 100),
      label_weight_kg: weight,
      species: oneOf(str(form, "species"), ["dog", "cat", "other", "unknown"], "unknown"),
      possible_sex: oneOf(str(form, "possible_sex"), ["male", "female", "unknown"], "unknown"),
      primary_color: str(form, "primary_color", 60),
      secondary_colors: secondary,
      estimated_size: oneOf(str(form, "estimated_size"), ["small", "medium", "large", "unknown"], "unknown"),
      visible_markings: str(form, "visible_markings", 2000),
      collar_description: str(form, "collar_description", 1000),
      distinctive_features: str(form, "distinctive_features", 2000),
      condition_notes: str(form, "condition_notes", 3000),
      source_transcript: str(form, "source_transcript", 20000),
      verification_status: oneOf(str(form, "verification_status"), ["pending_verification", "source_documented", "reviewer_verified"], "pending_verification"),
    },
    origin: oneOf(str(form, "origin"), ["source_documented", "reviewer_verified"], "source_documented"),
    claimTimestamp: parseTimestamp(str(form, "claim_timestamp", 12)),
    note: str(form, "note", 2000),
    mergeInto: str(form, "merge_into", 20),
    publish: form.get("publish") === "on",
  };
}

const asText = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v == null ? null : String(v));

/**
 * One entry point for the registry form: save / approve / reject / merge / publish / unpublish.
 * - Writes run under the reviewer's own JWT (RLS + DB audit triggers record actor and diffs).
 * - Every changed factual field also appends a provenance claim (origin, source, timestamp, verification).
 */
export async function submitPet(form: FormData) {
  const { supabase, user, profile } = await requireReviewer();
  const intent = oneOf(str(form, "intent"), ["save", "approve", "reject", "merge", "publish", "unpublish"], "save");
  const id = form.get("id") ? uuid(form.get("id")) : null;
  const f = readPetForm(form);

  let prev: Record<string, unknown> | null = null;
  if (id) {
    const { data } = await supabase.from("recovered_pets").select("*").eq("id", id).maybeSingle();
    if (!data) throw new Error("Record not found");
    prev = data;
  }

  const changedClaims = CLAIM_FIELDS.filter((k) => {
    const next = (f.values as Record<string, unknown>)[k];
    const before = prev ? prev[k] : undefined;
    return prev ? asText(next) !== asText(before) : asText(next) != null && asText(next) !== "" && asText(next) !== "unknown";
  });

  const origins: Record<string, string> = { ...((prev?.field_origins as Record<string, string>) ?? {}) };
  for (const k of changedClaims) origins[k] = f.origin;

  const row: Record<string, unknown> = { ...f.values, field_origins: origins };
  if (intent === "approve") {
    row.record_status = "approved";
    row.reviewed_by = user.id;
    row.reviewed_at = new Date().toISOString();
    row.published = f.publish;
  } else if (intent === "reject") {
    Object.assign(row, { record_status: "rejected", published: false, reviewed_by: user.id, reviewed_at: new Date().toISOString() });
  } else if (intent === "publish") {
    if (prev?.record_status !== "approved") throw new Error("Only approved records can be published");
    row.published = true;
  } else if (intent === "unpublish") {
    row.published = false;
  } else if (intent === "merge") {
    if (!f.mergeInto) throw new Error("Enter the case number to merge into (e.g. CSJDM-004)");
    const { data: target } = await supabase.from("recovered_pets").select("id").eq("public_case_number", f.mergeInto.toUpperCase()).maybeSingle();
    if (!target || target.id === id) throw new Error("Merge target not found");
    Object.assign(row, { record_status: "merged", merged_into: target.id, published: false, reviewed_by: user.id, reviewed_at: new Date().toISOString() });
  }

  let petId = id;
  if (id) {
    const { error } = await supabase.from("recovered_pets").update(row).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("recovered_pets").insert({ ...row, created_by: user.id, extracted_by: "manual" }).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Could not create record");
    petId = data.id;
  }

  if (changedClaims.length) {
    const sourceLabel = f.values.source;
    const claims = changedClaims.map((k) => ({
      recovered_pet_id: petId,
      field_name: k,
      value: asText((f.values as Record<string, unknown>)[k]),
      origin: f.origin,
      source_label: sourceLabel,
      source_type: f.values.source_video_id ? "video" : f.values.source_url ? "web_page" : "manual_entry",
      source_timestamp_seconds: f.claimTimestamp ?? f.values.video_start_seconds,
      source_url: f.values.source_url,
      verification: f.origin === "reviewer_verified" ? "verified" : "reviewed",
      extractor: "manual",
      recorded_by: user.id,
    }));
    const { error } = await supabase.from("recovered_pet_claims").insert(claims);
    if (error) throw new Error(`Provenance could not be recorded: ${error.message}`);
  }

  // Decisions are explicit audit events (in addition to the row-diff trigger)
  if (["approve", "reject", "merge", "publish", "unpublish"].includes(intent)) {
    await logAudit({
      actorId: user.id,
      actorRole: profile.role,
      action: `recovered_pets.${intent}`,
      entityType: "recovered_pets",
      entityId: petId,
      previous: prev ? { record_status: prev.record_status, published: prev.published } : null,
      next: { record_status: row.record_status ?? prev?.record_status ?? "candidate", published: row.published ?? prev?.published ?? false, note: f.note },
    });
  }

  if (petId) await recomputeMatchesForPet(petId);
  revalidatePath("/admin/pets");
  revalidatePath("/registry");
  redirect(`/admin/pets/${petId}?saved=${intent}`);
}

export async function updateMedia(form: FormData) {
  const { supabase } = await requireReviewer();
  const id = uuid(form.get("id"));
  const petId = uuid(form.get("petId"));
  await supabase
    .from("pet_media")
    .update({ is_graphic: form.get("is_graphic") === "on", show_publicly: form.get("show_publicly") === "on", caption: str(form, "caption", 500) })
    .eq("id", id);
  revalidatePath(`/admin/pets/${petId}`);
}

// ---------------------------------------------------------------------------
// Owner cases (reviewer side)
// ---------------------------------------------------------------------------
export async function setCaseStatus(form: FormData) {
  const { supabase } = await requireReviewer();
  const id = uuid(form.get("id"));
  const status = oneOf(str(form, "status"), ["submitted", "under_review", "needs_info", "closed"], "under_review");
  await supabase.from("cases").update({ status }).eq("id", id);
  revalidatePath(`/admin/cases/${id}`);
}

export async function addCaseNote(form: FormData) {
  const { supabase, user } = await requireReviewer();
  const id = uuid(form.get("id"));
  const note = str(form, "note", 5000);
  if (!note) return;
  await supabase.from("case_notes").insert({ case_id: id, author_id: user.id, note });
  revalidatePath(`/admin/cases/${id}`);
}

export async function markDuplicate(form: FormData) {
  const { supabase } = await requireReviewer();
  const id = uuid(form.get("id"));
  const num = str(form, "duplicate_of", 20);
  if (!num) return;
  const { data: target } = await supabase.from("cases").select("id").eq("case_number", num.toUpperCase()).maybeSingle();
  if (!target || target.id === id) throw new Error("Original case not found");
  await supabase.from("cases").update({ duplicate_of: target.id, status: "duplicate" }).eq("id", id);
  revalidatePath(`/admin/cases/${id}`);
}

export async function reviewMatch(form: FormData) {
  const { supabase, user } = await requireReviewer();
  const id = uuid(form.get("id"));
  const status = oneOf(str(form, "review_status"), ["unreviewed", "reviewer_noted_plausible", "needs_more_info", "reviewer_dismissed"], "unreviewed");
  await supabase
    .from("potential_matches")
    .update({ review_status: status, reviewer_note: str(form, "note", 2000), reviewer_id: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/matches");
  revalidatePath("/admin");
}

export async function updateWitness(form: FormData) {
  const { supabase } = await requireReviewer();
  const id = uuid(form.get("id"));
  const status = oneOf(str(form, "status"), ["new", "reviewing", "actioned", "dismissed"], "reviewing");
  await supabase.from("witness_submissions").update({ status, reviewer_note: str(form, "note", 3000) }).eq("id", id);
  revalidatePath("/admin/witness");
}

// ---------------------------------------------------------------------------
// Source videos / ingestion
// ---------------------------------------------------------------------------
export async function createExternalVideo(form: FormData) {
  const { supabase, user } = await requireReviewer();
  const title = str(form, "title", 200);
  if (!title) throw new Error("Title is required");
  const url = str(form, "source_url", 1000);
  if (url && !/^https?:\/\//i.test(url)) throw new Error("URL must start with http(s)://");
  const { data, error } = await supabase
    .from("source_videos")
    .insert({ title, source_name: str(form, "source_name", 200), source_url: url, authorization_note: str(form, "authorization_note", 1000), uploaded_by: user.id, pipeline: {} })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create");
  await logAudit({ actorId: user.id, action: "source_videos.register_external", entityType: "source_videos", entityId: data.id, next: { title, url } });
  redirect(`/admin/videos/${data.id}`);
}

export async function saveVideoTranscript(form: FormData) {
  const { supabase, user } = await requireReviewer();
  const id = uuid(form.get("id"));
  const transcript = str(form, "transcript", 200000);
  const { data: v } = await supabase.from("source_videos").select("pipeline").eq("id", id).maybeSingle();
  const pipeline = { ...(v?.pipeline ?? {}), transcription: { status: transcript ? "manual" : "pending", provider: "manual", at: new Date().toISOString() } };
  await supabase.from("source_videos").update({ transcript, pipeline, status: "in_review" }).eq("id", id);
  await logAudit({ actorId: user.id, action: "source_videos.transcript_saved", entityType: "source_videos", entityId: id, next: { length: transcript?.length ?? 0 } });
  revalidatePath(`/admin/videos/${id}`);
}

/** Manual / semi-automatic candidate creation from a source video. Always lands as a CANDIDATE for human review. */
export async function createCandidateFromVideo(form: FormData) {
  const { supabase, user } = await requireReviewer();
  const videoId = uuid(form.get("videoId"));
  const { data: v } = await supabase.from("source_videos").select("id, source_name, source_url, title").eq("id", videoId).maybeSingle();
  if (!v) throw new Error("Video not found");
  const start = parseTimestamp(str(form, "start", 12));
  const end = parseTimestamp(str(form, "end", 12));
  const { data, error } = await supabase
    .from("recovered_pets")
    .insert({
      source: v.source_name,
      source_url: v.source_url,
      source_video_id: v.id,
      source_video_identifier: v.title,
      video_start_seconds: start,
      video_end_seconds: end,
      source_transcript: str(form, "snippet", 5000),
      record_status: "candidate",
      extracted_by: "manual",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create candidate");
  redirect(`/admin/pets/${data.id}`);
}

// ---------------------------------------------------------------------------
// Users and roles (administrators only)
// ---------------------------------------------------------------------------
export async function setUserRole(form: FormData) {
  const { user, profile } = await requireAdmin();
  const target = uuid(form.get("id"));
  const role = oneOf(str(form, "role"), ["owner", "reviewer", "admin"], "owner");
  const admin = createAdminClient();
  const { data: cur } = await admin.from("profiles").select("role").eq("id", target).maybeSingle();
  if (!cur || cur.role === role) return;
  if (cur.role === "admin" && role !== "admin") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) throw new Error("At least one administrator is required");
  }
  const { error } = await admin.from("profiles").update({ role }).eq("id", target);
  if (error) throw new Error(error.message);
  await logAudit({
    actorId: user.id,
    actorRole: profile.role,
    action: "profiles.role_change",
    entityType: "profiles",
    entityId: target,
    previous: { role: cur.role },
    next: { role },
  });
  revalidatePath("/admin/users");
}

// ---------------------------------------------------------------------------
// CSV import of recovered-animal records (lands as unpublished CANDIDATES)
// ---------------------------------------------------------------------------
export interface ImportResult {
  created: number;
  skipped: string[];
  errors: string[];
}

const IMPORT_MAX_ROWS = 300;
const IMPORT_MAX_BYTES = 1024 * 1024;
const IMPORT_FIELDS = [
  "label_name", "label_weight_kg", "species", "possible_sex", "primary_color", "secondary_colors", "estimated_size",
  "visible_markings", "collar_description", "distinctive_features", "condition_notes", "source", "source_url",
  "source_video_identifier", "video_start", "video_end", "documented_on", "source_transcript",
] as const;

/**
 * Each row becomes a CANDIDATE record, never public. Every filled factual field gets a provenance claim
 * (origin: source-documented, source and URL as given in the row). A reviewer must approve before publishing.
 * Re-uploading the same file does not create duplicates (same name + weight + source URL is skipped).
 */
export async function importPets(_prev: ImportResult | null, form: FormData): Promise<ImportResult> {
  const { supabase, user, profile } = await requireReviewer();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { created: 0, skipped: [], errors: ["Choose a CSV file."] };
  if (file.size > IMPORT_MAX_BYTES) return { created: 0, skipped: [], errors: ["File is larger than 1 MB."] };

  const { csvToObjects } = await import("@/lib/csv");
  const rows = csvToObjects(await file.text());
  if (rows.length === 0) return { created: 0, skipped: [], errors: ["The file has no data rows."] };
  if (rows.length > IMPORT_MAX_ROWS) return { created: 0, skipped: [], errors: [`Maximum ${IMPORT_MAX_ROWS} rows per file.`] };

  const { data: existing } = await supabase.from("recovered_pets").select("label_name, label_weight_kg, source_url").limit(5000);
  const keyOf = (name: string | null, w: unknown, url: string | null) => `${(name ?? "").toLowerCase()}|${w == null || w === "" ? "" : Number(w)}|${url ?? ""}`;
  const seen = new Set((existing ?? []).map((e) => keyOf(e.label_name, e.label_weight_kg, e.source_url)));

  const result: ImportResult = { created: 0, skipped: [], errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2; // header is line 1
    try {
      const fd = new FormData();
      for (const k of IMPORT_FIELDS) if (rows[i][k]) fd.set(k, rows[i][k]);
      const f = readPetForm(fd);
      const v = f.values as Record<string, unknown>;
      const hasContent = v.label_name || v.label_weight_kg != null || v.species !== "unknown" || v.primary_color || v.visible_markings;
      if (!hasContent) throw new Error("no name, weight, species, color or markings");

      const key = keyOf(v.label_name as string | null, v.label_weight_kg, v.source_url as string | null);
      if (seen.has(key)) {
        result.skipped.push(`Row ${line}: already exists (${v.label_name ?? "no name"})`);
        continue;
      }

      const origins: Record<string, string> = {};
      const claimFields = CLAIM_FIELDS.filter((k) => {
        const t = asText(v[k]);
        return t != null && t !== "" && t !== "unknown";
      });
      for (const k of claimFields) origins[k] = "source_documented";

      const { source_video_id: _unused, verification_status: _vs, ...rest } = v;
      void _unused;
      void _vs;
      const { data: pet, error } = await supabase
        .from("recovered_pets")
        .insert({ ...rest, record_status: "candidate", published: false, verification_status: "source_documented", field_origins: origins, extracted_by: "manual", created_by: user.id })
        .select("id")
        .single();
      if (error || !pet) throw new Error(error?.message ?? "insert failed");

      if (claimFields.length) {
        const { error: cErr } = await supabase.from("recovered_pet_claims").insert(
          claimFields.map((k) => ({
            recovered_pet_id: pet.id,
            field_name: k,
            value: asText(v[k]),
            origin: "source_documented",
            source_label: v.source,
            source_type: v.source_url ? "web_page" : "manual_entry",
            source_timestamp_seconds: v.video_start_seconds,
            source_url: v.source_url,
            verification: "reviewed",
            extractor: "csv-import",
            recorded_by: user.id,
          })),
        );
        if (cErr) throw new Error(`provenance: ${cErr.message}`);
      }
      seen.add(key);
      result.created++;
    } catch (e) {
      result.errors.push(`Row ${line}: ${e instanceof Error ? e.message : "invalid"}`);
    }
  }

  await logAudit({ actorId: user.id, actorRole: profile.role, action: "recovered_pets.csv_import", entityType: "recovered_pets", entityId: "bulk", next: { file: file.name, rows: rows.length, created: result.created, skipped: result.skipped.length, errors: result.errors.length } });
  revalidatePath("/admin/pets");
  return result;
}

/** Approve (and optionally publish) several candidate records at once, after a person has checked them. */
export async function bulkReviewPets(form: FormData) {
  const { supabase, user, profile } = await requireReviewer();
  const ids = form.getAll("id").map((v) => uuid(v));
  const publish = form.get("intent") === "publish";
  if (ids.length === 0) return;
  const { data: done, error } = await supabase
    .from("recovered_pets")
    .update({ record_status: "approved", published: publish, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .in("id", ids)
    .eq("record_status", "candidate")
    .select("id");
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, actorRole: profile.role, action: publish ? "recovered_pets.bulk_publish" : "recovered_pets.bulk_approve", entityType: "recovered_pets", entityId: "bulk", next: { ids: (done ?? []).map((d) => d.id) } });
  for (const d of done ?? []) await recomputeMatchesForPet(d.id);
  revalidatePath("/admin/pets");
  revalidatePath("/registry");
  redirect(`/admin/pets?bulk=${(done ?? []).length}`);
}
