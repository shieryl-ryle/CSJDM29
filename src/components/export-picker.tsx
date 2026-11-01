"use client";

import { useMemo, useState } from "react";
import { formatBytes } from "@/lib/format";

export interface ExportRow {
  id: string;
  number: string;
  pet: string;
  status: string;
  files: number;
  bytes: number;
}

/** Choose cases, then download one ZIP of original files (POST) or print the case packages (GET). */
export function ExportPicker({ rows, witnessFiles, witnessBytes }: { rows: ExportRow[]; witnessFiles: number; witnessBytes: number }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [witness, setWitness] = useState(false);
  const [contact, setContact] = useState(false);

  const totals = useMemo(() => {
    let files = witness ? witnessFiles : 0;
    let bytes = witness ? witnessBytes : 0;
    for (const r of rows) if (picked.has(r.id)) (files += r.files), (bytes += r.bytes);
    return { files, bytes };
  }, [picked, rows, witness, witnessFiles, witnessBytes]);

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const none = picked.size === 0 && !witness;

  return (
    <form action="/api/export/zip" method="post">
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={() => setPicked(new Set(rows.map((r) => r.id)))}>Select all</button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setPicked(new Set())}>Select none</button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setPicked(new Set(rows.filter((r) => r.files > 0).map((r) => r.id)))}>Only cases with files</button>
      </div>

      <ul className="max-h-[28rem] divide-y divide-sand-200 overflow-y-auto rounded-xl border border-sand-300 bg-white">
        {rows.map((r) => (
          <li key={r.id}>
            <label className="flex cursor-pointer items-center gap-3 p-3 hover:bg-sand-50">
              <input type="checkbox" name="caseId" value={r.id} checked={picked.has(r.id)} onChange={() => toggle(r.id)} className="size-5 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{r.number}</span> <span className="text-ink-700">{r.pet}</span>
                <span className="block text-xs text-ink-500">{r.status} | {r.files} file{r.files === 1 ? "" : "s"} | {formatBytes(r.bytes)}</span>
              </span>
            </label>
          </li>
        ))}
        {rows.length === 0 && <li className="p-3 text-sm text-ink-500">No submitted cases.</li>}
      </ul>

      <div className="mt-4 space-y-2 text-sm">
        <label className="flex items-center gap-3">
          <input type="checkbox" name="witness" value="1" checked={witness} onChange={(e) => setWitness(e.target.checked)} className="size-5" />
          Include files from information submissions ({witnessFiles} file{witnessFiles === 1 ? "" : "s"}, {formatBytes(witnessBytes)})
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="images" value="1" className="size-5" />
          Include evidence images in printed packages (loads many images; use for a few cases at a time)
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="contact" value="1" checked={contact} onChange={(e) => setContact(e.target.checked)} className="size-5" />
          Include private contact details in case summaries
        </label>
      </div>

      <p className="mt-4 text-sm">
        Selected: <strong>{picked.size}</strong> case{picked.size === 1 ? "" : "s"}, <strong>{totals.files}</strong> file{totals.files === 1 ? "" : "s"}, <strong>{formatBytes(totals.bytes)}</strong>
      </p>
      {totals.bytes > 500 * 1024 * 1024 && <p className="mt-1 text-sm text-soft-800">Large selection. If the download stops early, export in smaller groups.</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        <button className="btn-primary" disabled={none}>Download ZIP of original files</button>
        <button className="btn-secondary" disabled={picked.size === 0 || picked.size > 40} formAction="/admin/print" formMethod="get">Print selected packages</button>
      </div>
      {picked.size > 40 && <p className="mt-1 text-xs text-ink-500">Printing is limited to 40 cases at a time.</p>}
    </form>
  );
}
