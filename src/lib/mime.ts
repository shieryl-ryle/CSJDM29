/** Browser/server-safe MIME helper (no Node imports). Some phones report an empty File.type. */
const MAP: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif", gif: "image/gif",
  pdf: "application/pdf", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
  mp3: "audio/mpeg", m4a: "audio/x-m4a", ogg: "audio/ogg", wav: "audio/wav", txt: "text/plain",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
export function guessMime(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return (ext && MAP[ext]) || "application/octet-stream";
}
