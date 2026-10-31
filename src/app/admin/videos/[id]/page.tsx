import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/site";
import { HASH_EXPLAINER } from "@/lib/constants";
import { requireReviewer } from "@/lib/auth";
import { STAGES } from "@/lib/ingestion/providers";
import { formatBytes, formatDateTime, formatTimeRange } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SourceVideoRow } from "@/lib/types";
import { createCandidateFromVideo, saveVideoTranscript } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireReviewer();
  const { data } = await supabase.from("source_videos").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const v = data as SourceVideoRow;
  const { data: candidates } = await supabase
    .from("recovered_pets")
    .select("id, public_case_number, label_name, label_weight_kg, record_status, video_start_seconds, video_end_seconds")
    .eq("source_video_id", id)
    .order("video_start_seconds");

  let url: string | null = null;
  if (v.storage_path) {
    const { data: s } = await createAdminClient().storage.from(v.storage_bucket).createSignedUrl(v.storage_path, 3600);
    url = s?.signedUrl ?? null;
  }
  const approved = (candidates ?? []).filter((c) => c.record_status === "approved").length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm"><Link href="/admin/videos" className="underline">← Source videos</Link></p>
        <h1 className="section-title mt-2">{v.title}</h1>
        <p className="text-sm text-ink-500">{v.source_name ?? "source n/a"} · uploaded {formatDateTime(v.uploaded_at)}</p>
        {v.source_url && <p className="text-sm"><a className="underline" href={v.source_url} target="_blank" rel="noopener noreferrer nofollow">Original link</a></p>}
      </div>

      <section className="card space-y-3">
        {url ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={url} controls preload="metadata" playsInline className="w-full rounded-xl bg-black" />
        ) : (
          <p className="text-sm text-ink-500">No file uploaded — external reference only.</p>
        )}
        {v.sha256 && (
          <div className="text-xs">
            <Badge tone="good">Original preserved</Badge>
            <p className="mt-1 break-all font-mono">SHA-256: {v.sha256}</p>
            <p className="text-ink-500">{v.original_filename} · {formatBytes(v.size_bytes)} · {v.mime_type}</p>
            <p className="text-ink-500">{HASH_EXPLAINER}</p>
          </div>
        )}
        {v.authorization_note && <p className="text-sm"><strong>Authorization:</strong> {v.authorization_note}</p>}
      </section>

      <section>
        <h2 className="section-title text-xl">Pipeline</h2>
        <ol className="mt-3 space-y-2">
          {STAGES.map((s) => {
            const rec = v.pipeline?.[s.key];
            const status = s.key === "human_review" ? `${approved} approved of ${(candidates ?? []).length} candidates` : rec ? `${rec.status}${rec.provider ? ` (${rec.provider})` : ""}` : s.mvp === "manual" ? "Manual entry (no automation configured)" : "Not started";
            return (
              <li key={s.key} className="card !p-3 text-sm">
                <p className="font-semibold">{s.label}</p>
                <p className="text-ink-700">{status}</p>
                <p className="text-xs text-ink-500">{s.help}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card">
        <h2 className="font-semibold">Transcript</h2>
        <form action={saveVideoTranscript} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={id} />
          <textarea name="transcript" rows={8} defaultValue={v.transcript ?? ""} className="input" placeholder="Paste or type the transcript. Include timestamps if possible." />
          <button className="btn-secondary btn-sm">Save transcript</button>
        </form>
      </section>

      <section className="card">
        <h2 className="font-semibold">Add a candidate animal from this video</h2>
        <form action={createCandidateFromVideo} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="videoId" value={id} />
          <div><label className="label">Start (mm:ss)</label><input name="start" className="input" placeholder="34:18" /></div>
          <div><label className="label">End (mm:ss)</label><input name="end" className="input" placeholder="36:02" /></div>
          <div className="sm:col-span-2"><label className="label">Transcript snippet</label><textarea name="snippet" rows={2} className="input" placeholder="…pangalan po niya Ivy…" /></div>
          <div className="sm:col-span-2"><button className="btn-primary btn-sm">Create candidate for review</button></div>
        </form>
      </section>

      <section>
        <h2 className="section-title text-xl">Candidates from this video</h2>
        <ul className="mt-3 space-y-2">
          {(candidates ?? []).map((c) => (
            <li key={c.id} className="card flex flex-wrap items-center justify-between gap-2 !p-3">
              <Link href={`/admin/pets/${c.id}`} className="font-semibold text-brand-800 hover:underline">{c.public_case_number}</Link>
              <span className="text-sm text-ink-700">{c.label_name ?? "no label yet"} · {formatTimeRange(c.video_start_seconds, c.video_end_seconds)}</span>
              <Badge>{c.record_status}</Badge>
            </li>
          ))}
          {(candidates ?? []).length === 0 && <li className="card text-sm text-ink-500">None yet.</li>}
        </ul>
      </section>
    </div>
  );
}
