import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PublicStats {
  recovered_documented: number;
  owner_cases_submitted: number;
  matches_needing_review: number;
  evidence_files: number;
}

/** Aggregate counters only (public_stats() returns no row data). Returns null if the database is not configured yet. */
export async function getPublicStats(): Promise<PublicStats | null> {
  try {
    const { data, error } = await createAdminClient().rpc("public_stats");
    if (error || !data) return null;
    return data as PublicStats;
  } catch {
    return null;
  }
}
