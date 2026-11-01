import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site";
import { EvidencePackage } from "@/components/evidence-package";
import { PrintButton } from "@/components/print-button";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { loadCase } from "@/lib/case-data";

export const metadata = { title: "Evidence package" };
export const dynamic = "force-dynamic";

/** Print-ready evidence package. Contact details are excluded unless ?contact=1. */
export default async function ExportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ contact?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, profile } = await requireUser(`/cases/${id}/export`);
  const data = await loadCase(supabase, id);
  if (!data) notFound();
  const withContact = sp.contact === "1";

  await logAudit({ actorId: user.id, actorRole: profile.role, action: "case.export", entityType: "cases", entityId: id, next: { format: "print", include_contact: withContact } });

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
        <Link href={`/cases/${id}/export${withContact ? "" : "?contact=1"}`} className="btn-ghost btn-sm">
          {withContact ? "Remove contact details" : "Include contact details"}
        </Link>
      </div>
      <EvidencePackage data={data} withContact={withContact} generatedAt={new Date().toISOString()} />
    </PageShell>
  );
}
