import { NextResponse } from "next/server";
import { getSession, isReviewerRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Recovered-pet images. Never embedded in HTML until a person explicitly clicks "Reveal".
 *  - Public: only media a reviewer explicitly approved (public_pet_media view) for a published record.
 *  - Reviewers: any media.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const admin = createAdminClient();

  let allowed = false;
  const session = await getSession();
  if (session && isReviewerRole(session.profile.role)) {
    allowed = true;
  } else {
    const { data } = await admin.from("public_pet_media").select("id").eq("id", id).maybeSingle();
    allowed = !!data;
  }
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: m } = await admin.from("pet_media").select("storage_bucket, storage_path").eq("id", id).maybeSingle();
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data, error } = await admin.storage.from(m.storage_bucket).createSignedUrl(m.storage_path, 120);
  if (error || !data) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const res = NextResponse.redirect(data.signedUrl, 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
