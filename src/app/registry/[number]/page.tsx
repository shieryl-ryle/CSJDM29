import Link from "next/link";
import { notFound } from "next/navigation";
import { DisclaimerBox, PageShell, Badge } from "@/components/site";
import { FieldRow, ProvenanceList, colorText, sexText } from "@/components/registry";
import { RevealMedia } from "@/components/reveal-media";
import { SIZE_LABEL, SPECIES_LABEL, VERIFICATION_LABEL } from "@/lib/constants";
import { formatDate, formatTimeRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { PublicPet } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  return { title: (await params).number };
}

export default async function PetPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("public_recovered_pets").select("*").eq("public_case_number", number.toUpperCase()).maybeSingle();
  if (!data) notFound();
  const pet = data as PublicPet;
  const o = pet.field_origins ?? {};

  const [{ data: claims }, { data: media }] = await Promise.all([
    supabase.from("public_field_provenance").select("*").eq("recovered_pet_id", pet.id),
    supabase.from("public_pet_media").select("*").eq("recovered_pet_id", pet.id).order("source_timestamp_seconds"),
  ]);

  const range = formatTimeRange(pet.video_start_seconds, pet.video_end_seconds);

  return (
    <PageShell narrow>
      <p className="text-sm"><Link href="/registry" className="underline">← Back to search</Link></p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title">{pet.public_case_number}</h1>
        <Badge tone={pet.verification_status === "reviewer_verified" ? "good" : "note"}>{VERIFICATION_LABEL[pet.verification_status]}</Badge>
      </div>

      <section className="card mt-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">Source-documented label</h2>
        <dl className="mt-2">
          <FieldRow label="Name" value={pet.label_name && <strong className="text-xl">{pet.label_name}</strong>} origin={o.label_name ?? "source_documented"} />
          <FieldRow label="Weight" value={pet.label_weight_kg != null && <strong className="text-xl">{Number(pet.label_weight_kg)} kg</strong>} origin={o.label_weight_kg ?? (pet.label_weight_kg != null ? "source_documented" : undefined)} />
        </dl>
        <p className="mt-2 text-xs text-ink-500">This is what the source showed or stated. It has not been confirmed by an authority.</p>
      </section>

      <section className="card mt-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">Observed characteristics</h2>
        <dl className="mt-2">
          <FieldRow label="Species" value={pet.species !== "unknown" && SPECIES_LABEL[pet.species]} origin={o.species} />
          <FieldRow label="Colour" value={colorText(pet) !== "Not recorded" && colorText(pet)} origin={o.primary_color ?? o.secondary_colors} />
          <FieldRow label="Size" value={pet.estimated_size !== "unknown" && SIZE_LABEL[pet.estimated_size]} origin={o.estimated_size} />
          <FieldRow label="Possible sex" value={pet.possible_sex !== "unknown" && sexText(pet.possible_sex)} origin={o.possible_sex} />
          <FieldRow label="Distinctive markings" value={pet.visible_markings} origin={o.visible_markings} />
          <FieldRow label="Collar" value={pet.collar_description} origin={o.collar_description} />
          <FieldRow label="Other distinctive features" value={pet.distinctive_features} origin={o.distinctive_features} />
        </dl>
      </section>

      <section className="card mt-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">Source</h2>
        <dl className="mt-2">
          <FieldRow label="Source" value={pet.source} />
          {pet.source_video_identifier && <FieldRow label="Video" value={pet.source_video_identifier} />}
          {range && <FieldRow label="Timestamp" value={range} />}
          {pet.documented_on && <FieldRow label="Documented on" value={formatDate(pet.documented_on)} />}
        </dl>
        {pet.source_url && (
          <p className="mt-3">
            <a href={pet.source_url} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary">View original source</a>
          </p>
        )}
      </section>

      <section className="card mt-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">Media</h2>
        <div className="mt-2">
          <RevealMedia items={media ?? []} />
        </div>
      </section>

      <section className="card mt-5">
        <details>
          <summary className="cursor-pointer font-semibold text-brand-800">Where did this information come from?</summary>
          <div className="mt-4">
            <ProvenanceList claims={(claims ?? []) as never} />
          </div>
        </details>
      </section>

      <section className="card mt-5 border-brand-200 bg-brand-50/50">
        <h2 className="font-serif text-lg font-semibold">Think this might be your pet?</h2>
        <p className="mt-1 text-sm text-ink-700">
          Please don’t rely on this page alone. Register your pet’s details and evidence, and a reviewer can compare characteristics in common. This is not a confirmed identification.
        </p>
        <p className="mt-3"><Link href="/report" className="btn-primary">Report / register my pet</Link></p>
      </section>

      <DisclaimerBox className="mt-6" />
    </PageShell>
  );
}
