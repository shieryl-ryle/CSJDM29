import Link from "next/link";
import { ImportForm } from "@/components/import-form";
import { requireReviewer } from "@/lib/auth";

export const metadata = { title: "Import recovered-animal records" };

const COLUMNS: [string, string][] = [
  ["label_name", "Name shown on the source label or stated in the source"],
  ["label_weight_kg", "Weight in kg as shown or stated, number only"],
  ["species", "dog, cat or other"],
  ["possible_sex", "male, female or unknown"],
  ["primary_color", "Main color, for example white"],
  ["secondary_colors", "Other colors, separated by commas inside quotes"],
  ["estimated_size", "small, medium or large"],
  ["visible_markings", "Markings visible or described in the source"],
  ["collar_description", "Collar, if shown or described"],
  ["distinctive_features", "Other distinctive features"],
  ["source", "Name of the source, for example the page or channel"],
  ["source_url", "Link to the source post or video (must start with https://)"],
  ["source_video_identifier", "Video or post identifier"],
  ["video_start", "Timestamp such as 34:18 (optional)"],
  ["video_end", "Timestamp such as 36:02 (optional)"],
  ["documented_on", "Date of the source, YYYY-MM-DD (optional)"],
  ["condition_notes", "Reviewer-only notes. Never public (optional)"],
  ["source_transcript", "Reviewer-only text from the source (optional)"],
];

export default async function ImportPage() {
  await requireReviewer();
  return (
    <div className="space-y-6">
      <h1 className="section-title">Import recovered-animal records</h1>
      <div className="prose-plain space-y-2 text-sm">
        <p>Adds many records from a CSV file. Every row becomes an unpublished candidate with a provenance entry (source-documented, with the source and link from the row). Nothing is public until a reviewer approves and publishes it.</p>
        <p>Use only information the source shows or states. Do not enter owner names, phone numbers or addresses.</p>
        <p>Uploading the same file again does not create duplicates.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a href="/recovered-pets-template.csv" download className="btn-secondary btn-sm">Download CSV template</a>
        <Link href="/admin/pets?record_status=candidate" className="btn-secondary btn-sm">Review candidates</Link>
      </div>

      <ImportForm />

      <section className="card">
        <h2 className="font-bold">Columns</h2>
        <p className="mt-1 text-sm text-ink-700">The first row is the header. Column names must match. Empty cells are allowed. A row needs at least a name, weight, species, color or markings.</p>
        <dl className="mt-3 space-y-1 text-sm">
          {COLUMNS.map(([k, d]) => (
            <div key={k} className="grid gap-1 sm:grid-cols-[14rem_1fr]">
              <dt className="font-mono text-xs">{k}</dt>
              <dd className="text-ink-700">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card">
        <h2 className="font-bold">After importing</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-700">
          <li>Open <Link className="underline" href="/admin/pets?record_status=candidate">Recovered pets, candidates</Link>.</li>
          <li>Compare each record with its source. Open a record to correct it. Corrections are stored beside the earlier value.</li>
          <li>Tick the checked records and select <strong>Approve and publish selected</strong>. Published records appear in the public registry and are used for matching.</li>
        </ol>
      </section>
    </div>
  );
}
