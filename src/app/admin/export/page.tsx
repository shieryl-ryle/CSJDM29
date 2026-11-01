import { ExportPicker, type ExportRow } from "@/components/export-picker";
import { requireReviewer } from "@/lib/auth";
import { CASE_STATUS_LABEL } from "@/lib/constants";

export const metadata = { title: "Export and print" };
export const dynamic = "force-dynamic";

export default async function AdminExport() {
  const { supabase } = await requireReviewer();
  const [{ data: cases }, { data: files }] = await Promise.all([
    supabase.from("cases").select("id, case_number, pet_name, status").neq("status", "draft").order("case_number").limit(500),
    supabase.from("evidence").select("case_id, witness_submission_id, size_bytes").limit(20000),
  ]);

  const byCase = new Map<string, { files: number; bytes: number }>();
  let witnessFiles = 0;
  let witnessBytes = 0;
  for (const f of files ?? []) {
    if (f.witness_submission_id) {
      witnessFiles++;
      witnessBytes += Number(f.size_bytes);
    } else if (f.case_id) {
      const cur = byCase.get(f.case_id) ?? { files: 0, bytes: 0 };
      byCase.set(f.case_id, { files: cur.files + 1, bytes: cur.bytes + Number(f.size_bytes) });
    }
  }
  const rows: ExportRow[] = (cases ?? []).map((c) => ({
    id: c.id,
    number: c.case_number,
    pet: c.pet_name ?? "Unnamed",
    status: CASE_STATUS_LABEL[c.status] ?? c.status,
    files: byCase.get(c.id)?.files ?? 0,
    bytes: byCase.get(c.id)?.bytes ?? 0,
  }));

  return (
    <div>
      <h1 className="section-title">Export and print</h1>
      <div className="prose-plain mt-2 space-y-1 text-sm">
        <p>Download original evidence files as one ZIP, or print case packages.</p>
        <p>The ZIP contains one folder per case with a case summary and the original files, plus MANIFEST.csv (SHA-256 at upload and at export) and SHA256SUMS.txt for verification. Each export is recorded in the audit log.</p>
      </div>
      <div className="mt-6">
        <ExportPicker rows={rows} witnessFiles={witnessFiles} witnessBytes={witnessBytes} />
      </div>
    </div>
  );
}
