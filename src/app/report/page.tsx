import Link from "next/link";
import { PageShell, DisclaimerBox } from "@/components/site";
import { getSession } from "@/lib/auth";
import { createCase } from "@/app/cases/actions";

export const metadata = { title: "Report or register a pet" };
export const dynamic = "force-dynamic";

export default async function Report({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const session = await getSession();
  const current = createCase.bind(null, "current");
  const historical = createCase.bind(null, "historical");

  return (
    <PageShell narrow>
      <h1 className="section-title">Report or register a pet</h1>
      <p className="prose-plain mt-3">Record pet details, aftercare details and evidence. Entries save automatically and can be completed later. <Link className="underline" href="/guide">Step-by-step guide</Link></p>

      {sp.error === "draft" && <p role="alert" className="mt-4 border-l-4 border-soft-800 bg-soft-50 p-3 text-sm text-soft-800">Three unfinished reports already exist on this account. Finish or submit one before starting another.</p>}
      {sp.error === "limit" && <p role="alert" className="mt-4 border-l-4 border-soft-800 bg-soft-50 p-3 text-sm text-soft-800">This account has reached the limit of 10 reports. Contact a reviewer if more are needed.</p>}

      <div className="mt-6 space-y-4">
        {session ? (
          <>
            <form action={current} className="card">
              <h2 className="text-xl font-bold">Current case</h2>
              <p className="mt-1 text-sm text-ink-700">Pet details, aftercare information and evidence. Documented recovered animals with characteristics in common are listed after submission.</p>
              <button className="btn-primary mt-4 w-full">Start report</button>
            </form>
            <form action={historical} className="card">
              <h2 className="text-xl font-bold">Previous incident</h2>
              <p className="mt-1 text-sm text-ink-700">An incident from an earlier year. It is labelled owner-submitted until independently supported.</p>
              <button className="btn-secondary mt-4 w-full">Report a previous incident</button>
            </form>
            <p className="text-center text-sm"><Link href="/cases" className="underline">Existing reports</Link></p>
          </>
        ) : (
          <div className="card">
            <h2 className="text-xl font-bold">Account required</h2>
            <p className="mt-1 text-sm text-ink-700">An account keeps evidence private. Only the account holder and authorized reviewers can access uploaded files.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/signup?next=/report" className="btn-primary">Create account</Link>
              <Link href="/login?next=/report" className="btn-secondary">Sign in</Link>
            </div>
          </div>
        )}
      </div>
      <DisclaimerBox className="mt-8" />
    </PageShell>
  );
}
