import { guessMime } from "./mime";

export type Stage = "fingerprinting" | "uploading" | "saving";

export interface UploadOptions {
  /** extra fields for /api/upload/prepare, e.g. { target: "evidence", caseId } */
  prepare: Record<string, unknown>;
  /** extra fields for /api/upload/finalize, e.g. { target: "evidence", caseId, evidenceType, description } */
  finalize: Record<string, unknown>;
  onStage: (stage: Stage, progress?: number) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sha256OfFile(file: File): Promise<string | null> {
  try {
    if (!globalThis.crypto?.subtle) return null;
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null; // low-memory device: the server still hashes the stored bytes
  }
}

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function putSigned(signedUrl: string, file: File, onProgress: (p: number) => void): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anon) {
      xhr.setRequestHeader("apikey", anon);
      xhr.setRequestHeader("authorization", `Bearer ${anon}`);
    }
    xhr.setRequestHeader("x-upsert", "false"); // never overwrite an existing original
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject(new Error("network"));
    xhr.ontimeout = () => reject(new Error("network"));
    // Same multipart shape as supabase-js uploadToSignedUrl()
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.send(body);
  });
}

/**
 * Browser -> private storage (signed URL), then the server hashes the stored bytes and records the file.
 * Retries transient network failures; safe to re-run (the server is idempotent per storage path).
 */
export async function uploadOne(original: File, o: UploadOptions): Promise<Record<string, unknown>> {
  const mime = original.type || guessMime(original.name);
  const file = original.type ? original : new File([original], original.name, { type: mime });

  o.onStage("fingerprinting");
  const clientSha256 = await sha256OfFile(file);

  const prep = await postJson<{ signedUrl: string; path: string }>("/api/upload/prepare", { ...o.prepare, filename: file.name, mime, size: file.size });
  if (!prep.ok) throw new Error(prep.data.error ?? "Could not start upload");
  const { signedUrl, path } = prep.data;

  o.onStage("uploading", 0);
  let uploaded = false;
  let lastErr = "";
  for (let attempt = 0; attempt < 4 && !uploaded; attempt++) {
    try {
      if (attempt > 0) await sleep(1000 * 2 ** attempt);
      const r = await putSigned(signedUrl, file, (p) => o.onStage("uploading", p));
      if (r.status >= 200 && r.status < 300) uploaded = true;
      else if (r.status === 409 || /already exists|Duplicate/i.test(r.text)) uploaded = true; // an earlier attempt actually landed
      else if (r.status >= 400 && r.status < 500) throw new Error(`upload-rejected:${r.text.slice(0, 120)}`);
      else lastErr = "server";
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "network";
      if (lastErr.startsWith("upload-rejected")) throw new Error("This file was not accepted (type or size).");
    }
  }
  if (!uploaded) throw new Error("Upload interrupted. Check the connection and try again.");

  o.onStage("saving");
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      if (attempt > 0) await sleep(1000 * 2 ** attempt);
      const fin = await postJson<{ record: Record<string, unknown> }>("/api/upload/finalize", {
        ...o.finalize,
        path,
        filename: file.name,
        mime,
        clientSha256: clientSha256 ?? undefined,
      });
      if (fin.ok) return fin.data.record;
      if (fin.status >= 400 && fin.status < 500 && fin.status !== 409) throw new Error(fin.data.error ?? "Could not save the file");
    } catch (e) {
      if (e instanceof Error && e.message !== "Failed to fetch" && !/network/i.test(e.message)) throw e;
    }
  }
  throw new Error("Could not confirm the upload. Try again.");
}
