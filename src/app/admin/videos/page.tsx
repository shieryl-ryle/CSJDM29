import Link from "next/link";
import { Badge } from "@/components/site";
import { VideoUploadPanel } from "@/components/admin-client";
import { requireReviewer } from "@/lib/auth";
import { formatBytes, formatDateTime } from "@/lib/format";
import { createExternalVideo } from "@/app/admin/actions";

export const metadata = { title: "Source videos" };
export const dynamic = "force-dynamic";

export default async function Videos() {
  const { supabase } = await requireReviewer();
  const { data } = await supabase.from("source_videos").select("id, title, source_name, size_bytes, sha256, storage_path, status, uploaded_at").order("uploaded_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="section-title">Source videos</h1>
        <p className="prose-plain mt-2">
          Upload only videos you are authorized to use. The original is stored unmodified with a SHA-256 hash. A reviewer then reviews each candidate animal. Nothing is collected from social media automatically.
        </p>
      </div>

      <section className="card">
        <h2 className="font-semibold">Upload an authorized source video</h2>
        <div className="mt-3"><VideoUploadPanel /></div>
      </section>

      <section className="card">
        <details>
          <summary className="cursor-pointer font-semibold">Or register an external reference (no file)</summary>
          <form action={createExternalVideo} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><label className="label">Title</label><input name="title" required className="input" /></div>
            <div><label className="label">Source (page / channel)</label><input name="source_name" className="input" /></div>
            <div><label className="label">URL</label><input name="source_url" className="input" placeholder="https://…" /></div>
            <div><label className="label">Note</label><input name="authorization_note" className="input" /></div>
            <div className="sm:col-span-2"><button className="btn-secondary btn-sm">Register</button></div>
          </form>
          <p className="hint">Without an uploaded original, no SHA-256 can be recorded. Upload the file when you have it.</p>
        </details>
      </section>

      <ul className="space-y-2">
        {(data ?? []).map((v) => (
          <li key={v.id} className="card flex flex-wrap items-center justify-between gap-2">
            <div>
              <Link href={`/admin/videos/${v.id}`} className="font-semibold text-brand-800 hover:underline">{v.title}</Link>
              <p className="text-xs text-ink-500">{v.source_name ?? "source n/a"} · {v.storage_path ? `original preserved · ${formatBytes(v.size_bytes)}` : "external reference only"} · {formatDateTime(v.uploaded_at)}</p>
            </div>
            <Badge>{v.status}</Badge>
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="card text-ink-500">No source videos yet.</li>}
      </ul>
    </div>
  );
}
