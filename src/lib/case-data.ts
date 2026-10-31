import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaseRow, EvidenceRow, MatchRow, PublicPet, TimelineEventRow } from "@/lib/types";
import { TIER_ORDER } from "@/lib/matching";

export interface MatchWithPet {
  match: MatchRow;
  pet: PublicPet;
}

/** Loads a case + evidence + events + matches under the CALLER's RLS (owner sees theirs, reviewers see all). */
export async function loadCase(supabase: SupabaseClient, id: string) {
  const { data: kase } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
  if (!kase) return null;
  const [{ data: evidence }, { data: events }, { data: matches }] = await Promise.all([
    supabase.from("evidence").select("*").eq("case_id", id).order("uploaded_at"),
    supabase.from("timeline_events").select("*").eq("case_id", id).order("event_date"),
    supabase.from("potential_matches").select("*").eq("case_id", id),
  ]);
  const ids = (matches ?? []).map((m) => m.recovered_pet_id);
  const { data: pets } = ids.length ? await supabase.from("public_recovered_pets").select("*").in("id", ids) : { data: [] as PublicPet[] };
  const petById = new Map((pets ?? []).map((p) => [p.id, p as PublicPet]));
  const matchesWithPets: MatchWithPet[] = (matches ?? [])
    .filter((m) => m.review_status !== "reviewer_dismissed" && petById.has(m.recovered_pet_id))
    .map((m) => ({ match: m as MatchRow, pet: petById.get(m.recovered_pet_id)! }))
    .sort((a, b) => TIER_ORDER[a.match.tier] - TIER_ORDER[b.match.tier]);
  return {
    kase: kase as CaseRow,
    evidence: (evidence ?? []) as EvidenceRow[],
    events: (events ?? []) as TimelineEventRow[],
    matches: matchesWithPets,
  };
}
