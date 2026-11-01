import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/site";
import { PetForm } from "@/components/pet-form";
import { ProvenanceList } from "@/components/registry";
import { FrameUploadPanel } from "@/components/admin-client";
import { RevealGate } from "@/components/reveal-media";
import { requireReviewer } from "@/lib/auth";
import { RECORD_STATUS_LABEL, VERIFICATION_LABEL } from "@/lib/constants";
import { formatBytes, formatSeconds } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClaimRow, PetMediaRow, RecoveredPetRow } from "@/lib/types";
import { updateMedia } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminPet({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireReviewer();
  const { data } = await supabase.from("recovered_pets").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const pet = data as RecoveredPetRow;

  const [{ data: videos }, { data: claims }, { data: media }, { data: video }] = await Promise.all([
    supabase.from("source_videos").select("id, title").order("uploaded_at", { ascending: false }),
    supabase.from("recovered_pet_claims").select("*").eq("recovered_pet_id", id),
    supabase.from("pet_media").select("*").eq("recovered_pet_id", id).order("source_timestamp_seconds"),
    pet.source_video_id ? supabase.from("source_videos").select("id, title, storage_bucket, storage_path, transcript").eq("id", pet.source_video_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  let videoUrl: string | null = null;
  if (video?.storage_path) {
    const { data: signed } = await createAdminClient().storage.from(video.storage_bucket).createSignedUrl(video.storage_path, 3600);
    if (signed) {
      const frag = pet.video_start_seconds != null ? `#t=${pet.video_start_seconds}${pet.video_end_seconds != null ? `,${pet.video_end_seconds}` : ""}` : "";
      videoUrl = signed.signedUrl + frag;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm"><Link href="/admin/pets" className="underline">← Recovered pets</Link></p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="section-title">{pet.record_status === "candidate" ? "Candidate " : ""}{pet.public_case_number}</h1>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={pet.record_status === "approved" ? "good" : "note"}>{RECORD_STATUS_LABEL[pet.record_status]}</Badge>
            <Badge>{VERIFICATION_LABEL[pet.verification_status]}</Badge>
            {pet.published ? <Badge tone="info">Public</Badge> : <Badge>Not public</Badge>}
            <Badge>extracted by {pet.extracted_by}</Badge>
          </div>
        </div>
        {sp.saved && <p role="status" className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">Saved ({sp.saved}). Changes and provenance were logged.</p>}
        {pet.record_status === "merged" && pet.merged_into && <p className="mt-2 text-sm">Merged into <Link className="underline" href={`/admin/pets/${pet.merged_into}`}>another record</Link>.</p>}
      </div>

      {(videoUrl || pet.source_transcript) && (
        <section className="card space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">Source video</h2>
          {videoUrl && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={videoUrl} controls preload="metadata" playsInline className="w-full rounded-xl bg-black" />
          )}
          {pet.video_start_seconds != null && <p className="text-sm">Timestamp: {formatSeconds(pet.video_start_seconds)}{pet.video_end_seconds != null && ` to ${formatSeconds(pet.video_end_seconds)}`}</p>}
          {pet.source_transcript && (
            <blockquote className="border-l-4 border-brand-200 pl-3 text-sm italic text-ink-700">“{pet.source_transcript}”</blockquote>
          )}
          {video && <p className="text-sm"><Link className="underline" href={`/admin/videos/${video.id}`}>Open source video record</Link></p>}
        </section>
      )}

      <PetForm pet={pet} videos={videos ?? []} />

      <section className="card">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">Best frames</h2>
        {(media ?? []).length === 0 ? <p className="mt-2 text-sm text-ink-500">No frames yet.</p> : (
          <div className="mt-3"><RevealGate label={`Reveal frames (${(media ?? []).length})`}>
          <ul className="grid gap-4 sm:grid-cols-2">
            {(media as PetMediaRow[]).map((m) => (
              <li key={m.id} className="rounded-xl border border-sand-200 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${m.id}`} alt={m.caption ?? "frame"} loading="lazy" className="aspect-video w-full rounded-lg object-cover" />
                <p className="mt-1 break-all text-xs text-ink-500">{m.original_filename} · {formatBytes(m.size_bytes)}{m.source_timestamp_seconds != null && ` · ${formatSeconds(m.source_timestamp_seconds)}`}</p>
                <p className="break-all font-mono text-[10px] text-ink-500">SHA-256: {m.sha256}</p>
                <form action={updateMedia} className="mt-2 space-y-2">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="petId" value={pet.id} />
                  <input name="caption" defaultValue={m.caption ?? ""} placeholder="Caption" className="input" />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_graphic" defaultChecked={m.is_graphic} className="size-5" /> Graphic (requires reveal)</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show_publicly" defaultChecked={m.show_publicly} className="size-5" /> Show publicly (behind reveal)</label>
                  <button className="btn-secondary btn-sm">Save</button>
                </form>
              </li>
            ))}
          </ul>
          </RevealGate></div>
        )}
        <div className="mt-5 border-t border-sand-200 pt-4"><FrameUploadPanel petId={pet.id} /></div>
      </section>

      <section className="card">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">Provenance: every claim, by field</h2>
        <div className="mt-3"><ProvenanceList claims={(claims ?? []) as ClaimRow[]} /></div>
      </section>

    </div>
  );
}
