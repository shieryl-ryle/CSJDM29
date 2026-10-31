import Link from "next/link";
import { notFound } from "next/navigation";
import { DisclaimerBox, GraphicNotice, PageShell } from "@/components/site";
import { MatchCard } from "@/components/case-view";
import { requireUser } from "@/lib/auth";
import { loadCase } from "@/lib/case-data";
import { MATCH_NOTICE } from "@/lib/constants";
import { refreshMatches } from "@/app/cases/actions";

export const metadata = { title: "Possible matches" };
export const dynamic = "force-dynamic";

export default async function Matches({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser(`/cases/${id}/matches`);
  const data = await loadCase(supabase, id);
  if (!data) notFound();
  const { kase, matches } = data;

  return (
    <PageShell narrow>
      <p className="text-sm"><Link href={`/cases/${id}`} className="underline">← {kase.pet_name || "My case"}</Link></p>
      <h1 className="section-title mt-2">Possible matches</h1>
      <p className="prose-calm mt-2">
        These are documented recovered-animal records that share some characteristics with what you told us. {MATCH_NOTICE} A reviewer will also look at each one.
      </p>
      <GraphicNotice className="mt-4" />

      {kase.status === "draft" ? (
        <p className="card mt-6">Submit your report to see possible matches. <Link className="underline" href={`/cases/${id}/edit`}>Continue my report</Link></p>
      ) : matches.length === 0 ? (
        <div className="card mt-6">
          <p className="text-ink-700">No records share enough characteristics yet. More animals are still being documented — we’ll check again as new records are approved.</p>
          <form action={refreshMatches} className="mt-3">
            <input type="hidden" name="caseId" value={id} />
            <button className="btn-secondary btn-sm">Check again</button>
          </form>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-4">
            {matches.map(({ match, pet }) => (
              <MatchCard key={match.id} tier={match.tier} pet={pet} reviewStatus={match.review_status} comparisons={match.comparisons} reviewerNote={match.reviewer_note} />
            ))}
          </ul>
          <form action={refreshMatches} className="mt-4">
            <input type="hidden" name="caseId" value={id} />
            <button className="btn-ghost btn-sm">Refresh</button>
          </form>
        </>
      )}
      <DisclaimerBox className="mt-8" />
    </PageShell>
  );
}
