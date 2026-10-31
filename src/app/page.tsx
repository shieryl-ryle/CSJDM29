import Link from "next/link";
import { DisclaimerBox, GraphicNotice } from "@/components/site";
import { getPublicStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stats = await getPublicStats();
  const n = (v: number | undefined) => (v == null ? "—" : String(v));

  return (
    <main>
      <section className="bg-gradient-to-b from-brand-50 to-sand-50">
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-12 text-center sm:pt-16">
          <h1 className="font-serif text-4xl font-semibold leading-tight text-brand-800 sm:text-5xl">
            Help preserve the evidence.
            <br />
            Help bring every furbaby home.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-700">
            A community evidence and identification registry for pet owners affected by the San Jose del Monte animal remains discovery.
          </p>

          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
            <Link href="/report" className="btn-primary text-lg">Report / register my pet</Link>
            <Link href="/registry" className="btn-secondary text-lg">Search recovered pets</Link>
            <Link href="/information" className="btn-ghost">I have information</Link>
          </div>

          <DisclaimerBox className="mx-auto mt-8 max-w-xl text-left" />
          <GraphicNotice className="mx-auto mt-3 max-w-xl text-left" />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Recovered animals documented" value={n(stats?.recovered_documented)} />
          <Stat label="Owner cases submitted" value={n(stats?.owner_cases_submitted)} />
          <Stat label="Potential matches requiring review" value={n(stats?.matches_needing_review)} />
          <Stat label="Evidence files preserved" value={n(stats?.evidence_files)} />
        </dl>
        <p className="mt-3 text-xs text-ink-500">
          Counts reflect records on this platform only. They are not findings about any person or business.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-6">
        <h2 className="section-title">How this works</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-5">
          {[
            ["Preserve", "Upload receipts, messages and photos. Originals are kept untouched and fingerprinted."],
            ["Organize", "Your information becomes a clear timeline and evidence index."],
            ["Correlate", "Search documented recovered animals and see characteristics in common."],
            ["Verify", "People — not software — review every record and every potential match."],
            ["Export", "Download an organized package to give to investigators or authorities."],
          ].map(([t, d], i) => (
            <li key={t} className="card">
              <p className="text-sm font-semibold text-brand-700">{i + 1}. {t}</p>
              <p className="mt-1 text-sm text-ink-700">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="card">
          <h2 className="section-title">What we keep separate</h2>
          <p className="prose-calm mt-2">
            To keep this fair to everyone, the platform never treats these as the same thing:
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
            <li><strong>What an owner claimed</strong> — shown as “Owner-submitted”</li>
            <li><strong>What a source documented</strong> — shown as “Source-documented”</li>
            <li><strong>What the system extracted</strong> — shown as “System-extracted · pending review”</li>
            <li><strong>What a human reviewer verified</strong> — shown as “Reviewer-verified”</li>
            <li className="sm:col-span-2"><strong>What an authority or forensic professional confirmed</strong> — only they can provide this; this platform cannot.</li>
          </ul>
          <p className="mt-4 text-sm"><Link className="underline" href="/about">Read more about how matching and privacy work</Link></p>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <dd className="font-serif text-3xl font-semibold text-brand-800">{value}</dd>
      <dt className="mt-1 text-xs text-ink-500">{label}</dt>
    </div>
  );
}
