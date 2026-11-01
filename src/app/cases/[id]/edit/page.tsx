import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site";
import { CaseWizard } from "@/components/case-wizard";
import { EvidenceList } from "@/components/evidence";
import { EvidenceUploadPanel } from "@/components/evidence-client";
import { requireUser } from "@/lib/auth";
import { loadCase } from "@/lib/case-data";

export const metadata = { title: "My report" };
export const dynamic = "force-dynamic";

export default async function EditCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser(`/cases/${id}/edit`);
  const data = await loadCase(supabase, id);
  if (!data) notFound();
  const { kase, evidence } = data;
  const photos = evidence.filter((e) => e.evidence_type === "pet_photo");
  const others = evidence.filter((e) => e.evidence_type !== "pet_photo");

  return (
    <PageShell narrow>
      <p className="text-sm"><Link href="/cases" className="underline">← My cases</Link> · {kase.case_number}</p>
      <h1 className="section-title mt-2">{kase.case_kind === "historical" ? "Report a previous incident" : "Report or register a pet"}</h1>
      <div className="mt-4">
        <CaseWizard
          initial={kase}
          slots={{
            petPhotos: (
              <div className="space-y-4">
                <EvidenceUploadPanel caseId={id} petPhotosOnly />
                <EvidenceList evidence={photos} />
              </div>
            ),
            evidence: (
              <div className="space-y-5">
                <EvidenceList evidence={others} />
                <div className="rounded-xl border border-sand-200 bg-sand-50 p-4">
                  <EvidenceUploadPanel caseId={id} />
                </div>
              </div>
            ),
          }}
        />
      </div>
    </PageShell>
  );
}
