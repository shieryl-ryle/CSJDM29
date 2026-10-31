import { submitPet } from "@/app/admin/actions";
import { formatSeconds } from "@/lib/format";
import type { RecoveredPetRow } from "@/lib/types";

const F = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {hint && <p className="hint">{hint}</p>}
  </div>
);

/**
 * Registry record form (create / correct / review). Every changed factual field is recorded
 * as a provenance claim with the origin chosen under “Recording as”.
 */
export function PetForm({ pet, videos }: { pet: RecoveredPetRow | null; videos: { id: string; title: string }[] }) {
  const v = <K extends keyof RecoveredPetRow>(k: K) => (pet?.[k] ?? "") as string;
  return (
    <form action={submitPet} className="space-y-8">
      {pet && <input type="hidden" name="id" value={pet.id} />}

      <fieldset className="card space-y-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-500">Source</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Source (page / channel)"><input name="source" defaultValue={v("source")} className="input" maxLength={200} /></F>
          <F label="Original source URL"><input name="source_url" defaultValue={v("source_url")} className="input" placeholder="https://…" /></F>
          <F label="Source video (uploaded / registered)">
            <select name="source_video_id" defaultValue={v("source_video_id")} className="input">
              <option value="">None</option>
              {videos.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </select>
          </F>
          <F label="Video identifier"><input name="source_video_identifier" defaultValue={v("source_video_identifier")} className="input" maxLength={200} /></F>
          <F label="Start (mm:ss)"><input name="video_start" defaultValue={formatSeconds(pet?.video_start_seconds)} className="input" placeholder="34:18" /></F>
          <F label="End (mm:ss)"><input name="video_end" defaultValue={formatSeconds(pet?.video_end_seconds)} className="input" placeholder="36:02" /></F>
          <F label="Date documented"><input type="date" name="documented_on" defaultValue={v("documented_on")} className="input" /></F>
        </div>
      </fieldset>

      <fieldset className="card space-y-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-500">Source-documented label</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Name on label"><input name="label_name" defaultValue={v("label_name")} className="input" maxLength={100} /></F>
          <F label="Weight on label (kg)"><input name="label_weight_kg" defaultValue={v("label_weight_kg")} inputMode="decimal" className="input" /></F>
        </div>
      </fieldset>

      <fieldset className="card space-y-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-500">Observed characteristics</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Species">
            <select name="species" defaultValue={pet?.species ?? "unknown"} className="input">
              <option value="unknown">Unknown</option><option value="dog">Dog</option><option value="cat">Cat</option><option value="other">Other</option>
            </select>
          </F>
          <F label="Possible sex">
            <select name="possible_sex" defaultValue={pet?.possible_sex ?? "unknown"} className="input">
              <option value="unknown">Unknown</option><option value="male">Male</option><option value="female">Female</option>
            </select>
          </F>
          <F label="Primary colour"><input name="primary_color" defaultValue={v("primary_color")} className="input" /></F>
          <F label="Secondary colours" hint="Comma-separated."><input name="secondary_colors" defaultValue={(pet?.secondary_colors ?? []).join(", ")} className="input" /></F>
          <F label="Estimated size">
            <select name="estimated_size" defaultValue={pet?.estimated_size ?? "unknown"} className="input">
              <option value="unknown">Unknown</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
            </select>
          </F>
        </div>
        <F label="Visible markings"><textarea name="visible_markings" defaultValue={v("visible_markings")} className="input" rows={2} /></F>
        <F label="Collar description"><textarea name="collar_description" defaultValue={v("collar_description")} className="input" rows={2} /></F>
        <F label="Other distinctive features"><textarea name="distinctive_features" defaultValue={v("distinctive_features")} className="input" rows={2} /></F>
        <F label="Condition notes (reviewer-only — never public)" hint="May be distressing. Keep factual and respectful."><textarea name="condition_notes" defaultValue={v("condition_notes")} className="input" rows={2} /></F>
      </fieldset>

      <fieldset className="card space-y-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-500">Transcript snippet (reviewer-only)</legend>
        <F label="What was said at this point in the source"><textarea name="source_transcript" defaultValue={v("source_transcript")} className="input" rows={3} placeholder="…pangalan po niya Ivy…" /></F>
      </fieldset>

      <fieldset className="card space-y-4 border-brand-200">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-brand-700">Review</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Recording changes as" hint="Applies to every field you changed in this save. Logged with source and timestamp.">
            <select name="origin" defaultValue={pet ? "reviewer_verified" : "source_documented"} className="input">
              <option value="source_documented">Source-documented — what the source states/shows</option>
              <option value="reviewer_verified">Reviewer-verified — I checked/corrected this against the source</option>
            </select>
          </F>
          <F label="Timestamp where this appears (mm:ss)"><input name="claim_timestamp" className="input" placeholder="34:26" /></F>
          <F label="Record verification status">
            <select name="verification_status" defaultValue={pet?.verification_status ?? "pending_verification"} className="input">
              <option value="pending_verification">Pending verification</option>
              <option value="source_documented">Source-documented</option>
              <option value="reviewer_verified">Reviewer-verified</option>
            </select>
          </F>
          <F label="Review note (optional)"><input name="note" className="input" maxLength={2000} /></F>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="publish" defaultChecked={pet?.published} className="size-5" /> Publish to the public registry when approved
        </label>
        <div className="flex flex-wrap gap-2">
          <button name="intent" value="approve" className="btn-primary">Approve</button>
          <button name="intent" value="save" className="btn-secondary">{pet ? "Save correction" : "Save as candidate"}</button>
          {pet && <button name="intent" value="reject" className="btn-danger">Reject</button>}
        </div>
        {pet && (
          <div className="flex flex-wrap items-end gap-2 border-t border-sand-200 pt-4">
            <F label="Merge into (case no.)"><input name="merge_into" className="input w-44" placeholder="CSJDM-004" /></F>
            <button name="intent" value="merge" className="btn-secondary">Merge</button>
            {pet.record_status === "approved" &&
              (pet.published ? <button name="intent" value="unpublish" className="btn-secondary">Unpublish</button> : <button name="intent" value="publish" className="btn-secondary">Publish</button>)}
          </div>
        )}
      </fieldset>
    </form>
  );
}
