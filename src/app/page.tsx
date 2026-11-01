import Link from "next/link";
import { DeveloperNote } from "@/components/developer-note";
import { DisclaimerBox, GraphicNotice } from "@/components/site";
import { getPublicStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stats = await getPublicStats();
  const n = (v: number | undefined) => (v == null ? "n/a" : String(v));

  return (
    <main>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-12 sm:pt-16">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Evidence preservation and pet identification registry</h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">
            For pet owners affected by the San Jose del Monte animal remains discovery. Upload evidence, search documented recovered animals, and review potential matches.
          </p>

          <div className="mt-8 flex max-w-md flex-col gap-3">
            <Link href="/report" className="btn-primary text-lg">Report or register a pet</Link>
            <Link href="/registry" className="btn btn-secondary text-lg">Search recovered pets</Link>
            <Link href="/information" className="btn border-2 border-white/40 text-white hover:bg-white/10">Submit information</Link>
          </div>

          <DisclaimerBox className="mt-8 max-w-xl" />
          <GraphicNotice className="mt-3 max-w-xl" />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Recovered animals documented" value={n(stats?.recovered_documented)} />
          <Stat label="Owner cases submitted" value={n(stats?.owner_cases_submitted)} />
          <Stat label="Potential matches requiring review" value={n(stats?.matches_needing_review)} />
          <Stat label="Evidence files preserved" value={n(stats?.evidence_files)} />
        </dl>
        <p className="mt-3 text-xs text-ink-500">Counts reflect records on this platform only. They are not findings about any person or business.</p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-6">
        <h2 className="section-title">Process</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-5">
          {[
            ["Preserve", "Receipts, messages and photos are stored unmodified with a SHA-256 hash."],
            ["Organize", "Case details form a timeline and an evidence index."],
            ["Correlate", "Documented recovered animals are compared with owner-submitted details."],
            ["Verify", "A human reviewer checks every record and every potential match."],
            ["Export", "Print case packages or download original files as a ZIP."],
          ].map(([t, d], i) => (
            <li key={t} className="card">
              <p className="text-sm font-bold text-brand-700">{i + 1}. {t}</p>
              <p className="mt-1 text-sm text-ink-700">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="card">
          <h2 className="section-title">Categories of information</h2>
          <p className="prose-plain mt-3">The platform keeps these categories separate and labels each one.</p>
          <ul className="mt-4 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
            <li><strong>Owner claim:</strong> labelled Owner-submitted</li>
            <li><strong>Source documentation:</strong> labelled Source-documented</li>
            <li><strong>System extraction:</strong> labelled System-extracted, pending review</li>
            <li><strong>Human review:</strong> labelled Reviewer-verified</li>
            <li className="sm:col-span-2"><strong>Authority or forensic confirmation:</strong> not provided by this platform</li>
          </ul>
          <p className="mt-4 text-sm"><Link className="underline" href="/about">Method and privacy</Link></p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-6">
        <DeveloperNote />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card border-t-4 border-t-brand-600">
      <dd className="text-3xl font-bold text-ink-900">{value}</dd>
      <dt className="mt-1 text-xs text-ink-500">{label}</dt>
    </div>
  );
}
