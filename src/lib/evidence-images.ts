import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EvidenceRow } from "@/lib/types";

/** Image types every browser can display and print (HEIC/HEIF are not shown). */
export const PRINTABLE_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGES_PER_PACKAGE = 30;

/**
 * Short-lived signed URLs (15 minutes) for the evidence images that go into a printed package.
 * Callers must already have loaded the rows under the user's own RLS, so authorization is done.
 */
export async function signEvidenceImages(evidence: EvidenceRow[]): Promise<{ urls: Record<string, string>; omitted: number }> {
  const images = evidence.filter((e) => PRINTABLE_IMAGE_MIME.includes(e.mime_type)).sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at));
  const chosen = images.slice(0, MAX_IMAGES_PER_PACKAGE);
  const admin = createAdminClient();
  const urls: Record<string, string> = {};
  await Promise.all(
    chosen.map(async (e) => {
      const { data } = await admin.storage.from(e.storage_bucket).createSignedUrl(e.storage_path, 900);
      if (data?.signedUrl) urls[e.id] = data.signedUrl;
    }),
  );
  return { urls, omitted: images.length - chosen.length };
}
