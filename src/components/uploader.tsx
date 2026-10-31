"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { uploadOne, type Stage } from "@/lib/upload-client";
import { formatBytes } from "@/lib/format";

interface Job {
  id: number;
  file: File;
  status: "queued" | Stage | "done" | "error";
  progress: number;
  error?: string;
}

export interface UploaderProps {
  /** Called per file at upload time so the latest form values are used. */
  buildOptions: () => { prepare: Record<string, unknown>; finalize: Record<string, unknown> };
  accept?: string;
  camera?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onUploaded?: (record: Record<string, unknown>) => void;
}

const STATUS_TEXT: Record<string, string> = {
  queued: "Waiting…",
  fingerprinting: "Preparing…",
  uploading: "Uploading",
  saving: "Securing…",
  done: "Saved ✓",
};

/** Mobile-first file picker with camera + gallery, per-file progress, retries and a leave-page warning. */
export function Uploader({ buildOptions, accept = "image/*,application/pdf,video/*,audio/*,.doc,.docx,.xlsx,.txt", camera = true, multiple = true, disabled, disabledReason, onUploaded }: UploaderProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const nextId = useRef(1);
  const running = useRef(false);
  const queue = useRef<Job[]>([]);
  const busy = jobs.some((j) => !["done", "error"].includes(j.status));

  useEffect(() => {
    if (!busy) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [busy]);

  const patch = useCallback((id: number, p: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...p } : j))), []);

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) {
      const job = queue.current.shift()!;
      try {
        const opts = buildOptions();
        const rec = await uploadOne(job.file, {
          ...opts,
          onStage: (stage, p) => patch(job.id, { status: stage, progress: p ?? 0 }),
        });
        patch(job.id, { status: "done", progress: 1 });
        onUploaded?.(rec);
      } catch (e) {
        patch(job.id, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
      }
    }
    running.current = false;
    router.refresh();
  }, [buildOptions, onUploaded, patch, router]);

  function add(files: FileList | null) {
    if (!files?.length) return;
    const added: Job[] = [];
    for (const file of Array.from(files)) {
      const tooBig = file.size > MAX_UPLOAD_BYTES;
      const job: Job = { id: nextId.current++, file, status: tooBig ? "error" : "queued", progress: 0, error: tooBig ? `Too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)` : undefined };
      added.push(job);
      if (!tooBig) queue.current.push(job);
    }
    setJobs((js) => [...js, ...added]);
    void pump();
  }

  function retry(job: Job) {
    patch(job.id, { status: "queued", progress: 0, error: undefined });
    queue.current.push(job);
    void pump();
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {camera && (
          <label className={`btn-secondary cursor-pointer ${disabled ? "pointer-events-none opacity-60" : ""}`}>
            📷 Take a photo
            <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={disabled} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          </label>
        )}
        <label className={`btn-primary cursor-pointer ${disabled ? "pointer-events-none opacity-60" : ""}`}>
          📁 Choose from gallery / files
          <input type="file" accept={accept} multiple={multiple} className="sr-only" disabled={disabled} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      {disabled && disabledReason && <p className="hint">{disabledReason}</p>}

      {jobs.length > 0 && (
        <ul className="mt-4 space-y-2" aria-live="polite">
          {jobs.map((j) => (
            <li key={j.id} className="rounded-xl border border-sand-200 bg-white p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{j.file.name}</span>
                <span className="shrink-0 text-ink-500">{formatBytes(j.file.size)}</span>
              </div>
              {j.status === "error" ? (
                <p className="mt-1 text-soft-800">
                  {j.error}{" "}
                  {!j.error?.startsWith("Too large") && !j.error?.includes("not accepted") && (
                    <button type="button" className="underline" onClick={() => retry(j)}>Try again</button>
                  )}
                </p>
              ) : (
                <>
                  <p className="mt-1 text-ink-500">
                    {STATUS_TEXT[j.status]}
                    {j.status === "uploading" && ` ${Math.round(j.progress * 100)}%`}
                  </p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand-100" role="progressbar" aria-valuenow={Math.round((j.status === "done" ? 1 : j.progress) * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-brand-600 transition-all" style={{ width: `${(j.status === "done" ? 1 : j.status === "uploading" ? j.progress : 0.05) * 100}%` }} />
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
