import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeMatch, MATCH_ALGORITHM_VERSION, type MatchCase, type MatchPet } from "@/lib/matching";

const CASE_COLS =
  "id, pet_name, species, sex, primary_color, secondary_colors, approx_weight_kg, verified_weight_kg, distinctive_markings, distinguishing_description, death_date, surrendered_on";
const ACTIVE_STATUSES = ["submitted", "under_review", "needs_info"];

type PetRow = MatchPet & { id: string };

/**
 * (Re)compute potential matches for one owner case against PUBLISHED registry records.
 * Reviewer decisions (review_status etc.) are never overwritten; only stale UNREVIEWED rows are removed.
 */
export async function recomputeMatchesForCase(caseId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: kase } = await admin.from("cases").select(`${CASE_COLS}, status, case_kind`).eq("id", caseId).maybeSingle();
  if (!kase || kase.status === "draft" || kase.status === "duplicate" || kase.case_kind !== "current") {
    await admin.from("potential_matches").delete().eq("case_id", caseId).eq("review_status", "unreviewed");
    return 0;
  }
  const { data: pets } = await admin.from("public_recovered_pets").select("*");
  const rows: Record<string, unknown>[] = [];
  for (const p of (pets ?? []) as PetRow[]) {
    const r = computeMatch(kase as MatchCase, p);
    if (r)
      rows.push({
        case_id: caseId,
        recovered_pet_id: p.id,
        tier: r.tier,
        comparisons: r.comparisons,
        algorithm_version: MATCH_ALGORITHM_VERSION,
        computed_at: new Date().toISOString(),
      });
  }
  await pruneAndUpsert(rows, { case_id: caseId });
  return rows.length;
}

/** Recompute matches for one registry record against all active owner cases. */
export async function recomputeMatchesForPet(petId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: pet } = await admin.from("public_recovered_pets").select("*").eq("id", petId).maybeSingle();
  if (!pet) {
    // not (or no longer) approved+published: drop unreviewed leads that pointed at it
    await admin.from("potential_matches").delete().eq("recovered_pet_id", petId).eq("review_status", "unreviewed");
    return 0;
  }
  const { data: cases } = await admin.from("cases").select(CASE_COLS).in("status", ACTIVE_STATUSES).eq("case_kind", "current");
  const rows: Record<string, unknown>[] = [];
  for (const c of cases ?? []) {
    const r = computeMatch(c as MatchCase, pet as PetRow);
    if (r)
      rows.push({
        case_id: (c as { id: string }).id,
        recovered_pet_id: petId,
        tier: r.tier,
        comparisons: r.comparisons,
        algorithm_version: MATCH_ALGORITHM_VERSION,
        computed_at: new Date().toISOString(),
      });
  }
  await pruneAndUpsert(rows, { recovered_pet_id: petId });
  return rows.length;
}

async function pruneAndUpsert(rows: Record<string, unknown>[], scope: { case_id?: string; recovered_pet_id?: string }) {
  const admin = createAdminClient();
  let q = admin.from("potential_matches").select("id, case_id, recovered_pet_id, review_status");
  if (scope.case_id) q = q.eq("case_id", scope.case_id);
  if (scope.recovered_pet_id) q = q.eq("recovered_pet_id", scope.recovered_pet_id);
  const { data: existing } = await q;
  const keep = new Set(rows.map((r) => `${r.case_id}:${r.recovered_pet_id}`));
  const stale = (existing ?? []).filter((e) => e.review_status === "unreviewed" && !keep.has(`${e.case_id}:${e.recovered_pet_id}`)).map((e) => e.id);
  if (stale.length) await admin.from("potential_matches").delete().in("id", stale);
  if (rows.length) {
    const { error } = await admin.from("potential_matches").upsert(rows, { onConflict: "case_id,recovered_pet_id" });
    if (error) console.error("match upsert failed", error.message);
  }
}
