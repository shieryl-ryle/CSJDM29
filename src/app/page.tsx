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
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Evidence database for pet owners affected by the San Jose del Monte animal remains discovery</h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">
            Owners upload evidence files and record case details. A case can be printed or exported as a ZIP of the original files. Reviewers compare reports with documented recovered animals.
          </p>

          <div className="mt-8 flex max-w-md flex-col gap-3">
            <Link href="/report" className="btn-primary text-lg">Report or register a pet</Link>
            <Link href="/information" className="btn btn-secondary text-lg">Submit information</Link>
            <Link href="/registry" className="btn border-2 border-white/40 text-white hover:bg-white/10">Search recovered pets</Link>
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
        <p className="mt-3 text-xs text-ink-500">Counts cover records on this platform only. They are not findings about any person or business.</p>
        {stats?.recovered_documented === 0 && (
          <p className="mt-4 border-l-4 border-brand-600 bg-sand-100 p-3 text-sm text-ink-900">
            The recovered-animals registry has no records. Records are added by authorized reviewers from documented sources. Search and potential matches return results only after records are added.
          </p>
        )}
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-10">
        <h2 className="section-title">Procedure for owners</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-4">
          {[
            ["Create an account", "Required to store evidence privately."],
            ["Start a report", "Enter pet details and aftercare details. Entries are saved as they are typed."],
            ["Upload evidence files", "Receipts, messages, photos, certificates, records. Upload originals. Do not edit or crop."],
            ["Submit", "Evidence can be added after submission. The case can be printed or downloaded as a ZIP."],
          ].map(([t, d], i) => (
            <li key={t} className="card">
              <p className="text-sm font-bold text-brand-700">Step {i + 1}</p>
              <p className="font-bold">{t}</p>
              <p className="mt-1 text-sm text-ink-700">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4"><Link href="/guide" className="btn-secondary">Full instructions</Link></p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-6">
        <h2 className="section-title">Handling of information</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            ["Storage", "Files are stored unmodified. A SHA-256 hash is recorded for each file."],
            ["Case record", "Entered dates and uploaded files form a timeline and an evidence index."],
            ["Comparison", "Owner-submitted details are compared with documented recovered animals when records exist."],
            ["Review", "A reviewer checks every recovered-animal record and every potential match."],
            ["Export", "A case is exported as a print-ready package or as a ZIP with a hash manifest."],
            ["Access", "Uploaded files are visible only to the account holder and authorized reviewers. Each reviewer access is logged."],
          ].map(([t, d]) => (
            <li key={t} className="card">
              <p className="text-sm font-bold text-brand-700">{t}</p>
              <p className="mt-1 text-sm text-ink-700">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="card">
          <h2 className="section-title">Labels</h2>
          <p className="prose-plain mt-3">Each item is labelled with its origin. The categories are not combined.</p>
          <ul className="mt-4 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
            <li><strong>Owner claim:</strong> Owner-submitted</li>
            <li><strong>Source documentation:</strong> Source-documented</li>
            <li><strong>System extraction:</strong> System-extracted, pending review</li>
            <li><strong>Human review:</strong> Reviewer-verified</li>
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
