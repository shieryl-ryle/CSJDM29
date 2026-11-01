import { Badge } from "@/components/site";
import { CopyButton, ImagePreview } from "@/components/evidence-client";
import { updateEvidenceDescription } from "@/app/cases/actions";
import { EVIDENCE_TYPE_LABEL, HASH_EXPLAINER, SOURCE_TYPE_LABEL } from "@/lib/constants";
import { evidenceLabelMap, formatBytes, formatDateTime } from "@/lib/format";
import type { EvidenceRow } from "@/lib/types";

/** Evidence index with "Original preserved" + SHA-256 for every file. */
export function EvidenceList({ evidence, canEdit = true }: { evidence: EvidenceRow[]; canEdit?: boolean }) {
  const labels = evidenceLabelMap(evidence);
  const sorted = [...evidence].sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at));
  if (sorted.length === 0) return <p className="text-sm text-ink-500">No files uploaded yet.</p>;
  return (
    <div>
      <p className="mb-3 text-sm text-ink-500">{HASH_EXPLAINER}</p>
      <ul className="space-y-3">
        {sorted.map((e) => (
          <li key={e.id} className="rounded-2xl border border-sand-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                <span className="mr-2 rounded bg-sand-100 px-1.5 py-0.5 font-mono text-sm">{labels.get(e.id)}</span>
                {EVIDENCE_TYPE_LABEL[e.evidence_type] ?? e.evidence_type}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="good">Original preserved</Badge>
                <Badge>{e.visibility === "private" ? "Private" : "Approved for public display"}</Badge>
                <Badge tone="info">{SOURCE_TYPE_LABEL[e.source_type] ?? e.source_type}</Badge>
              </div>
            </div>
            <p className="mt-1 break-words text-sm text-ink-700">
              {e.original_filename} · {formatBytes(e.size_bytes)} · uploaded {formatDateTime(e.uploaded_at)}
            </p>
            {e.description && <p className="mt-1 text-sm">{e.description}</p>}
            <p className="mt-2 break-all font-mono text-xs text-ink-700">
              <span className="font-sans font-semibold">SHA-256:</span> {e.sha256}
            </p>
            {e.hash_matches_client === false && (
              <p className="mt-1 rounded-lg bg-note-50 p-2 text-xs text-note-800">
                The SHA-256 calculated on the uploader’s device differs from the stored file’s. Flagged for reviewers.
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {e.mime_type.startsWith("image/") && !e.mime_type.includes("heic") && !e.mime_type.includes("heif") && <ImagePreview id={e.id} alt={e.original_filename} />}
              <a className="btn-ghost btn-sm" href={`/api/evidence/${e.id}/download`}>Download original</a>
              <CopyButton text={e.sha256} label="Copy SHA-256" />
            </div>
            {canEdit && (
              <details className="mt-1">
                <summary className="cursor-pointer text-sm text-brand-700">Edit note</summary>
                <form action={updateEvidenceDescription} className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="id" value={e.id} />
                  <input name="description" defaultValue={e.description ?? ""} maxLength={2000} className="input" aria-label="Note" />
                  <button className="btn-secondary btn-sm">Save note</button>
                </form>
                <p className="hint">Only the note can be edited. The file and its SHA-256 hash cannot be changed.</p>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
