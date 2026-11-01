import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site";
import { EvidencePackage } from "@/components/evidence-package";
import { PrintButton } from "@/components/print-button";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { loadCase } from "@/lib/case-data";
import { signEvidenceImages } from "@/lib/evidence-images";

export const metadata = { title: "Evidence package" };
export const dynamic = "force-dynamic";

/** Print-ready evidence package. Contact details are excluded unless ?contact=1. */
export default async function ExportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ contact?: string; images?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, profile } = await requireUser(`/cases/${id}/export`);
  const data = await loadCase(supabase, id);
  if (!data) notFound();
  const withContact = sp.contact === "1";
  const withImages = sp.images !== "0";
  const signed = withImages ? await signEvidenceImages(data.evidence) : null;

  await logAudit({ actorId: user.id, actorRole: profile.role, action: "case.export", entityType: "cases", entityId: id, next: { format: "print", include_contact: withContact, include_images: withImages } });

  return (
    <PageShell>
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Link href={profile.role === "owner" ? `/cases/${id}` : `/admin/cases/${id}`} className="underline">Back to case</Link>
        <PrintButton />
        <form action="/api/export/zip" method="post">
          <input type="hidden" name="caseId" value={id} />
          {withContact && <input type="hidden" name="contact" value="1" />}
          <button className="btn-secondary">Download all files (ZIP)</button>
        </form>
        <Link href={`/cases/${id}/export?contact=${withContact ? "1" : "0"}&images=${withImages ? "0" : "1"}`} className="btn-ghost btn-sm">
          {withImages ? "Hide images" : "Show images"}
        </Link>
        <Link href={`/cases/${id}/export?contact=${withContact ? "0" : "1"}&images=${withImages ? "1" : "0"}`} className="btn-ghost btn-sm">
          {withContact ? "Remove contact details" : "Include contact details"}
        </Link>
      </div>
      <EvidencePackage data={data} withContact={withContact} generatedAt={new Date().toISOString()} imageUrls={signed?.urls} omittedImages={signed?.omitted} />
    </PageShell>
  );
}
