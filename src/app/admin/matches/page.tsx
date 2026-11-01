import Link from "next/link";
import { MatchCard } from "@/components/case-view";
import { requireReviewer } from "@/lib/auth";
import { MATCH_REVIEW_LABEL } from "@/lib/constants";
import { TIER_ORDER } from "@/lib/matching";
import type { MatchRow, PublicPet } from "@/lib/types";
import { reviewMatch } from "@/app/admin/actions";

export const metadata = { title: "Potential matches" };
export const dynamic = "force-dynamic";

export default async function AdminMatches({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireReviewer();
  let q = supabase.from("potential_matches").select("*").limit(300);
  if (sp.show !== "all") q = q.eq("review_status", "unreviewed");
  const { data } = await q;
  const matches = (data ?? []) as MatchRow[];
  const caseIds = [...new Set(matches.map((m) => m.case_id))];
  const petIds = [...new Set(matches.map((m) => m.recovered_pet_id))];
  const [{ data: cases }, { data: pets }] = await Promise.all([
    caseIds.length ? supabase.from("cases").select("id, case_number, pet_name").in("id", caseIds) : Promise.resolve({ data: [] }),
    petIds.length ? supabase.from("public_recovered_pets").select("*").in("id", petIds) : Promise.resolve({ data: [] }),
  ]);
  const caseBy = new Map((cases ?? []).map((c) => [c.id, c]));
  const petBy = new Map((pets ?? []).map((p) => [p.id, p as PublicPet]));
  const rows = matches.filter((m) => petBy.has(m.recovered_pet_id)).sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);

  return (
    <div>
      <h1 className="section-title">Potential matches</h1>
      <p className="prose-plain mt-2">Deterministic leads that need human review. Distinctive markings must be compared by a person.</p>
      <p className="mt-3 text-sm">
        <Link className="underline" href={sp.show === "all" ? "/admin/matches" : "/admin/matches?show=all"}>{sp.show === "all" ? "Show only awaiting review" : "Show all, including reviewed"}</Link>
      </p>
      <ul className="mt-5 space-y-4">
        {rows.map((m) => {
          const c = caseBy.get(m.case_id);
          return (
            <MatchCard key={m.id} tier={m.tier} pet={petBy.get(m.recovered_pet_id)!} reviewStatus={m.review_status} comparisons={m.comparisons} reviewerNote={m.reviewer_note}>
              <p className="mt-3 text-sm">Owner case: <Link className="underline" href={`/admin/cases/${m.case_id}`}>{c?.case_number} · {c?.pet_name ?? "Unnamed"}</Link></p>
              <form action={reviewMatch} className="mt-3 space-y-2 rounded-xl bg-sand-50 p-3">
                <input type="hidden" name="id" value={m.id} />
                <select name="review_status" defaultValue={m.review_status} className="input">
                  {Object.entries(MATCH_REVIEW_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input name="note" defaultValue={m.reviewer_note ?? ""} placeholder="Reviewer note (optional)" className="input" maxLength={2000} />
                <button className="btn-secondary btn-sm">Save review</button>
              </form>
            </MatchCard>
          );
        })}
        {rows.length === 0 && <li className="card text-ink-500">Nothing waiting for review.</li>}
      </ul>
    </div>
  );
}
