"use client";

import { useCallback, useState } from "react";
import { EVIDENCE_TYPES } from "@/lib/constants";
import { Uploader } from "@/components/uploader";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

export function ImagePreview({ id, alt }: { id: string; alt: string }) {
  const [show, setShow] = useState(false);
  return show ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/evidence/${id}/download?inline=1`} alt={alt} loading="lazy" className="mt-2 max-h-72 rounded-xl border border-sand-200 object-contain" />
  ) : (
    <button type="button" className="btn-ghost btn-sm" onClick={() => setShow(true)}>Preview</button>
  );
}

/** Evidence-type + note + uploader. Everything defaults to PRIVATE; originals are never modified. */
export function EvidenceUploadPanel({ caseId, defaultType = "receipt", petPhotosOnly = false }: { caseId: string; defaultType?: string; petPhotosOnly?: boolean }) {
  const [type, setType] = useState(petPhotosOnly ? "pet_photo" : defaultType);
  const [description, setDescription] = useState("");
  const buildOptions = useCallback(
    () => ({
      prepare: { target: "evidence", caseId },
      finalize: { target: "evidence", caseId, evidenceType: type, description: description || undefined },
    }),
    [caseId, type, description],
  );
  return (
    <div className="space-y-4">
      {!petPhotosOnly && (
        <div>
          <label className="label" htmlFor={`etype-${caseId}`}>File type</label>
          <select id={`etype-${caseId}`} className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {EVIDENCE_TYPES.map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label" htmlFor={`edesc-${caseId}`}>Note (optional)</label>
        <input id={`edesc-${caseId}`} className="input" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder={petPhotosOnly ? "e.g. Photo taken in 2024" : "e.g. Receipt issued on the day of handover"} />
      </div>
      <Uploader buildOptions={buildOptions} accept={petPhotosOnly ? "image/*" : undefined} />
      <p className="hint">
        Files are <strong>private</strong>. The original is never changed. For large files, upload a shorter clip or a screenshot.
      </p>
    </div>
  );
}
