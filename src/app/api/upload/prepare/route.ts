import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isReviewerRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_FILES_PER_CASE, MAX_UPLOAD_BYTES, MAX_WITNESS_FILES } from "@/lib/constants";
import { sanitizeFilename, TARGET_BUCKET, TARGET_MIME } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 30;

const base = { filename: z.string().min(1).max(255), mime: z.string().min(1).max(100), size: z.number().int().positive() };
const schema = z.discriminatedUnion("target", [
  z.object({ target: z.literal("evidence"), caseId: z.string().uuid(), ...base }),
  z.object({ target: z.literal("witness"), submissionId: z.string().uuid(), key: z.string().min(10).max(100), ...base }),
  z.object({ target: z.literal("source_video"), ...base }),
  z.object({ target: z.literal("pet_media"), petId: z.string().uuid(), ...base }),
]);

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Step 1 of upload: authorise, then hand back a short-lived signed upload URL.
 * The file goes browser -> Supabase Storage directly (Vercel request bodies are capped at ~4.5 MB).
 * Nothing is recorded as evidence until /finalize has hashed the stored bytes.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");
  const b = parsed.data;

  if (b.size > MAX_UPLOAD_BYTES) return fail(`File is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)`);
  if (!TARGET_MIME[b.target].includes(b.mime)) return fail("This file type is not accepted");

  const admin = createAdminClient();
  const session = await getSession();
  let prefix: string;

  if (b.target === "evidence") {
    if (!session) return fail("Sign in required", 401);
    const { data: kase } = await session.supabase.from("cases").select("id, owner_id, status").eq("id", b.caseId).maybeSingle(); // RLS: owner or reviewer
    if (!kase) return fail("Case not found", 404);
    if (kase.status === "closed" && !isReviewerRole(session.profile.role)) return fail("This case is closed", 403);
    const { count } = await admin.from("evidence").select("id", { count: "exact", head: true }).eq("case_id", b.caseId);
    if ((count ?? 0) >= MAX_FILES_PER_CASE) return fail("File limit reached for this case");
    prefix = `cases/${b.caseId}`;
  } else if (b.target === "witness") {
    const { data: sub } = await admin.from("witness_submissions").select("id, upload_key").eq("id", b.submissionId).maybeSingle();
    if (!sub || sub.upload_key !== b.key) return fail("Not allowed", 403);
    const { count } = await admin.from("evidence").select("id", { count: "exact", head: true }).eq("witness_submission_id", b.submissionId);
    if ((count ?? 0) >= MAX_WITNESS_FILES) return fail("File limit reached for this submission");
    prefix = `witness/${b.submissionId}`;
  } else {
    if (!session || !isReviewerRole(session.profile.role)) return fail("Not allowed", 403);
    prefix = b.target === "source_video" ? "videos" : `pets/${b.petId}`;
  }

  const path = `${prefix}/${randomUUID()}/${sanitizeFilename(b.filename)}`;
  const bucket = TARGET_BUCKET[b.target];
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return fail("Could not start upload", 500);
  return NextResponse.json({ bucket, path, signedUrl: data.signedUrl, token: data.token });
}
