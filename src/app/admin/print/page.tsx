import Link from "next/link";
import { EvidencePackage } from "@/components/evidence-package";
import { PrintButton } from "@/components/print-button";
import { PageShell } from "@/components/site";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { loadCase } from "@/lib/case-data";
import { signEvidenceImages } from "@/lib/evidence-images";

export const metadata = { title: "Print case packages" };
export const dynamic = "force-dynamic";

const MAX = 40;

export default async function AdminPrint({ searchParams }: { searchParams: Promise<{ caseId?: string | string[]; contact?: string; images?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireAdmin();
  const ids = (Array.isArray(sp.caseId) ? sp.caseId : sp.caseId ? [sp.caseId] : []).filter((s) => /^[0-9a-f-]{36}$/i.test(s)).slice(0, MAX);
  const withContact = sp.contact === "1";
  const withImages = sp.images === "1";
  const loaded = (await Promise.all(ids.map((id) => loadCase(supabase, id)))).filter((d): d is NonNullable<typeof d> => !!d);
  loaded.sort((a, b) => a.kase.case_number.localeCompare(b.kase.case_number));
  const signed = withImages ? await Promise.all(loaded.map((d) => signEvidenceImages(d.evidence))) : null;

  await logAudit({
    actorId: user.id,
    actorRole: profile.role,
    action: "case.export",
    entityType: "cases",
    entityId: "bulk",
    next: { format: "print", cases: loaded.length, include_contact: withContact, include_images: withImages, case_ids: loaded.map((d) => d.kase.id) },
  });
  const generatedAt = new Date().toISOString();

  return (
    <PageShell>
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin/export" className="underline">Back to export</Link>
        <PrintButton />
        <span className="text-sm text-ink-500">{loaded.length} case package{loaded.length === 1 ? "" : "s"}. Each starts on a new page.</span>
      </div>
      {loaded.length === 0 && <p className="card">No cases selected.</p>}
      {loaded.map((d, i) => (
        <section key={d.kase.id} className="page-break">
          <EvidencePackage data={d} withContact={withContact} generatedAt={generatedAt} imageUrls={signed?.[i].urls} omittedImages={signed?.[i].omitted} />
        </section>
      ))}
    </PageShell>
  );
}
