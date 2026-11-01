import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { Zip, ZipPassThrough } from "fflate";
import { getSession, isReviewerRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { caseSummaryHtml, type HtmlEvidence } from "@/lib/case-html";
import { caseSummaryText } from "@/lib/case-text";
import { EVIDENCE_TYPE_LABEL } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeFilename } from "@/lib/uploads";
import type { CaseRow, EvidenceRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const enc = new TextEncoder();
const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_CASES = 500;

/**
 * Streams a ZIP of original evidence files, per case, with a manifest and SHA256SUMS.
 * Authorization is RLS: owners get only their own cases; reviewers get any case, plus witness files.
 * Files are streamed one at a time (store only, no compression) so memory stays flat.
 * Each file is hashed while streaming and compared with the hash recorded at upload.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const reviewer = isReviewerRole(session.profile.role);
  const isAdmin = session.profile.role === "admin";

  const form = await req.formData();
  const scope = String(form.get("scope") ?? "selected");
  const includeContact = form.get("contact") === "1";
  const includeWitness = reviewer && form.get("witness") === "1";
  let caseIds = form.getAll("caseId").map(String).filter((s) => /^[0-9a-f-]{36}$/i.test(s));

  // user-scoped client: RLS decides what is visible
  const sb = session.supabase;
  let cases: CaseRow[] = [];
  if (reviewer && scope === "all") {
    const { data } = await sb.from("cases").select("*").neq("status", "draft").order("case_number").limit(MAX_CASES);
    cases = (data ?? []) as CaseRow[];
  } else {
    if (caseIds.length === 0) return NextResponse.json({ error: "No case selected" }, { status: 400 });
    caseIds = caseIds.slice(0, MAX_CASES);
    const { data } = await sb.from("cases").select("*").in("id", caseIds).order("case_number");
    cases = (data ?? []) as CaseRow[];
  }
  // Bulk export of many cases or information submissions is limited to administrators
  if (reviewer && !isAdmin && (scope === "all" || cases.length > 1 || form.get("witness") === "1")) {
    return NextResponse.json({ error: "Administrator access required for bulk export" }, { status: 403 });
  }
  if (cases.length === 0 && !includeWitness) return NextResponse.json({ error: "Nothing to export" }, { status: 404 });

  const evidenceByCase = new Map<string, EvidenceRow[]>();
  for (let i = 0; i < cases.length; i += 100) {
    const ids = cases.slice(i, i + 100).map((c) => c.id);
    const { data } = await sb.from("evidence").select("*").in("case_id", ids).order("uploaded_at");
    for (const e of (data ?? []) as EvidenceRow[]) evidenceByCase.set(e.case_id!, [...(evidenceByCase.get(e.case_id!) ?? []), e]);
  }
  let witnessFiles: EvidenceRow[] = [];
  if (includeWitness) {
    const { data } = await sb.from("evidence").select("*").not("witness_submission_id", "is", null).order("uploaded_at");
    witnessFiles = (data ?? []) as EvidenceRow[];
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const single = cases.length === 1 && !includeWitness;
  const root = single ? `${cases[0].case_number}-evidence` : `CSJDM29-evidence-${stamp}`;
  const totalFiles = [...evidenceByCase.values()].reduce((n, l) => n + l.length, 0) + witnessFiles.length;

  await logAudit({
    actorId: session.user.id,
    actorRole: session.profile.role,
    action: "export.zip",
    entityType: "cases",
    entityId: single ? cases[0].id : "bulk",
    next: { cases: cases.length, files: totalFiles, witness_files: witnessFiles.length, include_contact: includeContact, case_ids: cases.slice(0, 200).map((c) => c.id) },
  });

  const admin = createAdminClient();
  const stream = new ReadableStream<Uint8Array>(
    {
      async start(controller) {
        let closed = false;
        const zip = new Zip((err, chunk, final) => {
          if (closed) return;
          if (err) {
            closed = true;
            controller.error(err);
            return;
          }
          controller.enqueue(chunk);
          if (final) {
            closed = true;
            controller.close();
          }
        });
        const drain = async () => {
          while (!closed && controller.desiredSize !== null && controller.desiredSize <= 0) await sleep(15);
        };
        const addText = (name: string, text: string) => {
          const f = new ZipPassThrough(`${root}/${name}`);
          zip.add(f);
          f.push(enc.encode(text), true);
        };

        const manifest: string[][] = [["case_id", "evidence_ref", "path_in_zip", "original_filename", "evidence_type", "source_type", "uploaded_at", "size_bytes", "sha256_at_upload", "sha256_at_export", "result"]];
        const sums: string[] = [];
        const problems: string[] = [];

        addText(
          "README.txt",
          [
            "CSJDM29 evidence export",
            `Exported: ${new Date().toISOString()}`,
            `Exported by: ${session.profile.role} (${session.user.id})`,
            `Cases: ${cases.length}   Files: ${totalFiles}`,
            "",
            "Contents",
            "  <case id>/case-summary.html  Readable case record with the images. Open in a browser, print or save as PDF.",
            "  <case id>/case-summary.txt   The same case record as plain text (unverified, owner-submitted).",
            "  <case id>/files/             Original uploaded files, unmodified.",
            "  MANIFEST.csv                 One row per file with both SHA-256 values.",
            "  SHA256SUMS.txt               SHA-256 recorded at upload. Verify with: sha256sum -c SHA256SUMS.txt",
            "",
            "Information in case-summary.txt is owner-submitted and has not been independently verified.",
            includeContact ? "This export contains private contact details. Handle accordingly." : "Contact details are not included.",
            "This export does not contain legal conclusions.",
          ].join("\n") + "\n",
        );

        const addFile = async (folder: string, ref: string, ownerKey: string, e: EvidenceRow) => {
          const safe = `${ref}_${sanitizeFilename(e.original_filename)}`;
          const path = `${folder}/files/${safe}`;
          const row = [ownerKey, ref, `${root}/${path}`, e.original_filename, EVIDENCE_TYPE_LABEL[e.evidence_type] ?? e.evidence_type, e.source_type, e.uploaded_at, String(e.size_bytes), e.sha256];
          try {
            const { data } = await admin.storage.from(e.storage_bucket).createSignedUrl(e.storage_path, 900);
            if (!data) throw new Error("no url");
            const res = await fetch(data.signedUrl);
            if (!res.ok || !res.body) throw new Error(`status ${res.status}`);
            const entry = new ZipPassThrough(`${root}/${path}`);
            zip.add(entry);
            const hash = createHash("sha256");
            const reader = res.body.getReader();
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              hash.update(value);
              await drain();
              entry.push(value, false);
            }
            entry.push(new Uint8Array(0), true);
            const got = hash.digest("hex");
            const ok = got === e.sha256;
            if (!ok) problems.push(`${path}: hash differs from the value recorded at upload`);
            manifest.push([...row, got, ok ? "OK" : "HASH MISMATCH"]);
          } catch (err) {
            problems.push(`${path}: could not be read (${err instanceof Error ? err.message : "error"})`);
            manifest.push([...row, "", "NOT EXPORTED"]);
          }
          sums.push(`${e.sha256}  ${path}`);
        };

        try {
          for (const c of cases) {
            const list = evidenceByCase.get(c.id) ?? [];
            const summaryText = caseSummaryText(c, includeContact);
            const htmlRows: HtmlEvidence[] = list.map((e, i) => {
              const ref = `E${String(i + 1).padStart(2, "0")}`;
              return {
                ref,
                pathInZip: `files/${ref}_${sanitizeFilename(e.original_filename)}`,
                filename: e.original_filename,
                type: e.evidence_type,
                source: e.source_type,
                uploadedAt: e.uploaded_at,
                size: e.size_bytes,
                sha256: e.sha256,
                description: e.description,
                isImage: ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(e.mime_type),
              };
            });
            addText(`${c.case_number}/case-summary.txt`, summaryText);
            addText(`${c.case_number}/case-summary.html`, caseSummaryHtml({ caseNumber: c.case_number, summaryText, evidence: htmlRows, generatedAt: new Date().toISOString() }));
            for (let i = 0; i < list.length; i++) await addFile(c.case_number, `E${String(i + 1).padStart(2, "0")}`, c.case_number, list[i]);
          }
          if (witnessFiles.length) {
            const idx = new Map<string, number>();
            for (const e of witnessFiles) {
              const k = e.witness_submission_id!;
              const n = (idx.get(k) ?? 0) + 1;
              idx.set(k, n);
              await addFile(`INFORMATION-${k.slice(0, 8)}`, `W${String(n).padStart(2, "0")}`, `information:${k}`, e);
            }
          }
          addText("MANIFEST.csv", manifest.map((r) => r.map(csv).join(",")).join("\r\n") + "\r\n");
          addText("SHA256SUMS.txt", sums.join("\n") + (sums.length ? "\n" : ""));
          if (problems.length) addText("PROBLEMS.txt", problems.join("\n") + "\n");
          zip.end();
        } catch (err) {
          if (!closed) {
            closed = true;
            controller.error(err);
          }
        }
      },
    },
    new ByteLengthQueuingStrategy({ highWaterMark: 4 * 1024 * 1024 }),
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${root}.zip"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
