"use client";

import { useActionState } from "react";
import { importPets, type ImportResult } from "@/app/admin/actions";

export function ImportForm() {
  const [result, action, pending] = useActionState<ImportResult | null, FormData>(importPets, null);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="file">CSV file</label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" required className="input" />
        <p className="hint">Up to 300 rows and 1 MB. Rows are added as unpublished candidates.</p>
      </div>
      <button className="btn-primary" disabled={pending}>{pending ? "Importing…" : "Import as candidates"}</button>

      {result && (
        <div role="status" className="space-y-2 text-sm">
          <p className="border-l-4 border-ink-900 bg-sand-100 p-3">
            <strong>{result.created}</strong> record{result.created === 1 ? "" : "s"} created. {result.skipped.length} skipped. {result.errors.length} with errors.
          </p>
          {result.skipped.length > 0 && (
            <details>
              <summary className="cursor-pointer font-semibold">Skipped ({result.skipped.length})</summary>
              <ul className="mt-1 list-disc pl-5">{result.skipped.map((s) => <li key={s}>{s}</li>)}</ul>
            </details>
          )}
          {result.errors.length > 0 && (
            <div className="border-l-4 border-soft-800 bg-soft-50 p-3 text-soft-800">
              <p className="font-semibold">Errors (these rows were not imported)</p>
              <ul className="mt-1 list-disc pl-5">{result.errors.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
