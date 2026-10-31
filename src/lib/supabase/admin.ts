import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * SERVICE-ROLE client. Bypasses RLS. Server-only.
 * Use ONLY after an explicit authorization check, and only for:
 *  - signed upload/download URLs and hashing stored files
 *  - registering evidence rows (so hashes are computed by the server, not the client)
 *  - public aggregate counters
 *  - anonymous witness submissions
 *  - writing audit-log rows for service-role operations
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
