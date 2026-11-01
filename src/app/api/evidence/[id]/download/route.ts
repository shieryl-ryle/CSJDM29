import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Authorised access to an ORIGINAL evidence file.
 * Authorisation = the user can SELECT the evidence row under RLS (case owner or reviewer).
 * Returns a 60-second signed URL; every access is audit-logged.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: ev } = await session.supabase
    .from("evidence")
    .select("id, case_id, storage_bucket, storage_path, original_filename, mime_type")
    .eq("id", id)
    .maybeSingle();
  if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inline = new URL(req.url).searchParams.get("inline") === "1";
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(ev.storage_bucket)
    .createSignedUrl(ev.storage_path, 60, inline ? undefined : { download: ev.original_filename });
  if (error || !data) return NextResponse.json({ error: "Could not access file" }, { status: 500 });

  await logAudit({
    actorId: session.user.id,
    actorRole: session.profile.role,
    action: inline ? "evidence.preview" : "evidence.download",
    entityType: "evidence",
    entityId: ev.id,
    next: { case_id: ev.case_id },
  });

  const res = NextResponse.redirect(data.signedUrl, 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
