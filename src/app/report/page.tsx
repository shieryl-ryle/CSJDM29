import Link from "next/link";
import { PageShell, DisclaimerBox } from "@/components/site";
import { getSession } from "@/lib/auth";
import { createCase } from "@/app/cases/actions";

export const metadata = { title: "Report / register my pet" };
export const dynamic = "force-dynamic";

export default async function Report() {
  const session = await getSession();
  const current = createCase.bind(null, "current");
  const historical = createCase.bind(null, "historical");

  return (
    <PageShell narrow>
      <h1 className="section-title">Report or register my pet</h1>
      <p className="prose-calm mt-3">
        We’re so sorry. Here you can safely record what you know and keep your evidence in one private place. It takes a few minutes, saves as you go, and you can stop and come back.
      </p>

      <div className="mt-6 space-y-4">
        {session ? (
          <>
            <form action={current} className="card">
              <h2 className="font-serif text-xl font-semibold">My pet may be affected</h2>
              <p className="mt-1 text-sm text-ink-700">Register your pet’s details, aftercare information and evidence. We’ll show documented recovered animals with characteristics in common.</p>
              <button className="btn-primary mt-4 w-full">Start my report</button>
            </form>
            <form action={historical} className="card">
              <h2 className="font-serif text-xl font-semibold">Report a previous experience</h2>
              <p className="mt-1 text-sm text-ink-700">Something happened in an earlier year? Record it here. It will be labelled as an owner-submitted report until independently supported.</p>
              <button className="btn-secondary mt-4 w-full">Report a previous experience</button>
            </form>
            <p className="text-center text-sm"><Link href="/cases" className="underline">See my existing reports</Link></p>
          </>
        ) : (
          <div className="card">
            <h2 className="font-serif text-xl font-semibold">First, a free account</h2>
            <p className="mt-1 text-sm text-ink-700">An account keeps your evidence private and lets you return to finish. Only you and authorized reviewers can see what you upload.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/signup?next=/report" className="btn-primary">Create an account</Link>
              <Link href="/login?next=/report" className="btn-secondary">I already have an account</Link>
            </div>
          </div>
        )}
      </div>
      <DisclaimerBox className="mt-8" />
    </PageShell>
  );
}
