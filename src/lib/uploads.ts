import { createHash } from "node:crypto";

export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"];
export const VIDEO_MIME = ["video/mp4", "video/quicktime", "video/webm"];
export const EVIDENCE_MIME = [
  ...IMAGE_MIME,
  "application/pdf",
  ...VIDEO_MIME,
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/ogg",
  "audio/wav",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
export const PET_MEDIA_MIME = ["image/jpeg", "image/png", "image/webp"];

export type UploadTarget = "evidence" | "witness" | "source_video" | "pet_media";

export const TARGET_BUCKET: Record<UploadTarget, string> = {
  evidence: "evidence",
  witness: "evidence",
  source_video: "source-videos",
  pet_media: "recovered-media",
};
export const TARGET_MIME: Record<UploadTarget, string[]> = {
  evidence: EVIDENCE_MIME,
  witness: EVIDENCE_MIME,
  source_video: VIDEO_MIME,
  pet_media: PET_MEDIA_MIME,
};

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[._]+/, "")
    .slice(-120);
  return cleaned || "file";
}

export function sha256Hex(bytes: ArrayBuffer | Uint8Array): string {
  return createHash("sha256").update(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).digest("hex");
}

export { guessMime } from "./mime";
