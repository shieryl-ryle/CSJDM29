import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isReviewerRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { EVIDENCE_TYPES, EVIDENCE_SOURCE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { TARGET_BUCKET, TARGET_MIME, sha256Hex } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 60;

const evidenceTypes = EVIDENCE_TYPES.map(([k]) => k) as [string, ...string[]];
const sourceTypes = EVIDENCE_SOURCE_TYPES.map(([k]) => k) as [string, ...string[]];
const base = {
  path: z.string().min(5).max(500),
  filename: z.string().min(1).max(255),
  mime: z.string().min(1).max(100),
  clientSha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
};
const schema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("evidence"),
    caseId: z.string().uuid(),
    evidenceType: z.enum(evidenceTypes),
    description: z.string().max(2000).optional(),
    sourceType: z.enum(sourceTypes).optional(),
    ...base,
  }),
  z.object({ target: z.literal("witness"), submissionId: z.string().uuid(), key: z.string().min(10).max(100), description: z.string().max(2000).optional(), ...base }),
  z.object({
    target: z.literal("source_video"),
    title: z.string().min(1).max(200),
    sourceName: z.string().max(200).optional(),
    sourceUrl: z.string().url().max(1000).optional(),
    authorizationNote: z.string().max(1000).optional(),
    ...base,
  }),
  z.object({
    target: z.literal("pet_media"),
    petId: z.string().uuid(),
    kind: z.enum(["frame", "screenshot", "photo"]).default("frame"),
    timestampSeconds: z.number().int().min(0).optional(),
    caption: z.string().max(500).optional(),
    ...base,
  }),
]);

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Step 2 of upload: the file is already in private storage. The SERVER downloads the stored bytes,
 * computes SHA-256 itself, then records the evidence row. The original object is never rewritten.
 * Idempotent: re-finalising the same path returns the existing record.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");
  const b = parsed.data;
  const admin = createAdminClient();
  const session = await getSession();
  const bucket = TARGET_BUCKET[b.target];

  // --- authorise + path binding (the path must live under the target the caller is allowed to use)
  let prefix: string;
  let uploadedBy: string | null = session?.user.id ?? null;
  if (b.target === "evidence") {
    if (!session) return fail("Please sign in", 401);
    const { data: kase } = await session.supabase.from("cases").select("id").eq("id", b.caseId).maybeSingle();
    if (!kase) return fail("Case not found", 404);
    prefix = `cases/${b.caseId}/`;
  } else if (b.target === "witness") {
    const { data: sub } = await admin.from("witness_submissions").select("id, upload_key, submitted_by").eq("id", b.submissionId).maybeSingle();
    if (!sub || sub.upload_key !== b.key) return fail("Not allowed", 403);
    uploadedBy = sub.submitted_by; // stays null for anonymous submissions
    prefix = `witness/${b.submissionId}/`;
  } else {
    if (!session || !isReviewerRole(session.profile.role)) return fail("Not allowed", 403);
    prefix = b.target === "source_video" ? "videos/" : `pets/${b.petId}/`;
  }
  if (!b.path.startsWith(prefix) || b.path.includes("..")) return fail("Invalid path", 403);

  // --- idempotency
  const existing = await findExisting(admin, b.target, bucket, b.path);
  if (existing) return NextResponse.json({ ok: true, record: existing, duplicate: true });

  // --- read back stored bytes and hash them server-side
  const { data: blob, error: dlErr } = await admin.storage.from(bucket).download(b.path);
  if (dlErr || !blob) return fail("Upload did not complete. Please try again.", 409);
  if (blob.size > MAX_UPLOAD_BYTES) return fail("File is too large", 413);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const sha256 = sha256Hex(bytes);
  const mime = TARGET_MIME[b.target].includes(b.mime) ? b.mime : null;
  if (!mime) return fail("This file type is not accepted", 415);
  const hashMatchesClient = b.clientSha256 ? b.clientSha256 === sha256 : null;

  const common = {
    original_filename: b.filename.slice(0, 255),
    mime_type: mime,
    size_bytes: bytes.byteLength,
    storage_bucket: bucket,
    storage_path: b.path,
    sha256,
  };

  let table: string;
  let row: Record<string, unknown>;
  if (b.target === "evidence" || b.target === "witness") {
    table = "evidence";
    row =
      b.target === "evidence"
        ? {
            ...common,
            case_id: b.caseId,
            uploaded_by: uploadedBy,
            evidence_type: b.evidenceType,
            description: b.description?.trim() || null,
            source_type: b.sourceType ?? (isReviewerRole(session!.profile.role) ? "other" : "owner_submitted"),
            client_sha256: b.clientSha256 ?? null,
            hash_matches_client: hashMatchesClient,
            visibility: "private",
          }
        : {
            ...common,
            witness_submission_id: b.submissionId,
            uploaded_by: uploadedBy,
            evidence_type: "witness_material",
            description: b.description?.trim() || null,
            source_type: "witness_submitted",
            client_sha256: b.clientSha256 ?? null,
            hash_matches_client: hashMatchesClient,
            visibility: "private",
          };
  } else if (b.target === "source_video") {
    table = "source_videos";
    row = {
      title: b.title,
      source_name: b.sourceName?.trim() || null,
      source_url: b.sourceUrl ?? null,
      authorization_note: b.authorizationNote?.trim() || null,
      storage_bucket: bucket,
      storage_path: b.path,
      original_filename: common.original_filename,
      mime_type: common.mime_type,
      size_bytes: common.size_bytes,
      sha256,
      uploaded_by: uploadedBy,
      pipeline: {
        preserve_original: { status: "done", at: new Date().toISOString() },
        sha256: { status: "done", at: new Date().toISOString() },
      },
    };
  } else {
    table = "pet_media";
    row = {
      ...common,
      recovered_pet_id: b.petId,
      kind: b.kind,
      source_timestamp_seconds: b.timestampSeconds ?? null,
      caption: b.caption?.trim() || null,
      is_graphic: true, // conservative default; a reviewer can mark non-graphic
      show_publicly: false,
      uploaded_by: uploadedBy,
    };
  }

  const { data: record, error } = await admin.from(table).insert(row).select("*").single();
  if (error) {
    if (error.code === "23505") {
      const again = await findExisting(admin, b.target, bucket, b.path);
      if (again) return NextResponse.json({ ok: true, record: again, duplicate: true });
    }
    console.error("finalize insert failed", error.message);
    return fail("Could not record the file", 500);
  }

  await logAudit({
    actorId: uploadedBy,
    actorRole: session?.profile.role ?? (b.target === "witness" ? "anonymous" : null),
    action: `${table}.upload`,
    entityType: table,
    entityId: record.id,
    next: {
      filename: common.original_filename,
      mime_type: common.mime_type,
      size_bytes: common.size_bytes,
      sha256,
      client_sha256: b.clientSha256 ?? null,
      hash_matches_client: hashMatchesClient,
      case_id: b.target === "evidence" ? b.caseId : undefined,
    },
  });

  return NextResponse.json({ ok: true, record });
}

async function findExisting(admin: ReturnType<typeof createAdminClient>, target: string, bucket: string, path: string) {
  const table = target === "source_video" ? "source_videos" : target === "pet_media" ? "pet_media" : "evidence";
  const { data } = await admin.from(table).select("*").eq("storage_path", path).maybeSingle();
  return data;
}
