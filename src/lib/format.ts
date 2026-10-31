export function formatSeconds(total: number | null | undefined): string {
  if (total == null || Number.isNaN(total)) return "";
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** "34:18" or "1:02:03" or "2058" -> seconds. Returns null if unparseable/empty. */
export function parseTimestamp(input: string | null | undefined): number | null {
  if (!input) return null;
  const t = input.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const parts = t.split(":").map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  return nums[0] * 3600 + nums[1] * 60 + nums[2];
}

export function formatTimeRange(start: number | null, end: number | null): string {
  if (start == null && end == null) return "";
  if (end == null) return formatSeconds(start);
  if (start == null) return formatSeconds(end);
  return `${formatSeconds(start)}–${formatSeconds(end)}`;
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatBytes(n: number | null | undefined): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatKg(n: number | null | undefined): string {
  if (n == null) return "";
  return `${Number(n)} kg`;
}

/** E01, E02… by upload order. Originals are never deleted so labels stay stable. */
export function evidenceLabelMap(items: { id: string; uploaded_at: string }[]): Map<string, string> {
  const sorted = [...items].sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at));
  return new Map(sorted.map((e, i) => [e.id, `E${String(i + 1).padStart(2, "0")}`]));
}
