import { EVIDENCE_TYPE_LABEL, SOURCE_TYPE_LABEL, DISCLAIMER_FULL } from "./constants";
import { formatBytes } from "./format";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface HtmlEvidence {
  ref: string;
  pathInZip: string; // relative to the case folder, e.g. files/E01_receipt.jpg
  filename: string;
  type: string;
  source: string;
  uploadedAt: string;
  size: number;
  sha256: string;
  description: string | null;
  isImage: boolean;
}

/**
 * Self-contained, printable case record for the ZIP. Opens offline in any browser from the unzipped
 * folder; images load from the files/ folder next to it. No scripts, no external resources.
 */
export function caseSummaryHtml(input: { caseNumber: string; summaryText: string; evidence: HtmlEvidence[]; generatedAt: string }): string {
  const items = input.evidence
    .map(
      (e) => `<li>
  <p><strong>${esc(e.ref)}: ${esc(EVIDENCE_TYPE_LABEL[e.type] ?? e.type)}</strong></p>
  <p>File: ${esc(e.filename)}. Size: ${esc(formatBytes(e.size))}. Uploaded: ${esc(e.uploadedAt)}. Source: ${esc(SOURCE_TYPE_LABEL[e.source] ?? e.source)}.</p>
  ${e.description ? `<p>Note: ${esc(e.description)}</p>` : ""}
  <p class="hash">SHA-256 at upload: ${esc(e.sha256)}</p>
  <p class="path">${esc(e.pathInZip)}</p>
  ${e.isImage ? `<img src="${esc(e.pathInZip)}" alt="${esc(e.filename)}">` : ""}
</li>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(input.caseNumber)} case record</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;max-width:820px;margin:24px auto;padding:0 16px;line-height:1.5}
h1{border-left:6px solid #c1121f;padding-left:12px}
h2{margin-top:32px;border-bottom:2px solid #0a0a0a;padding-bottom:4px}
pre{white-space:pre-wrap;background:#f1f1f1;padding:12px;font-family:inherit;font-size:14px}
ul{list-style:none;padding:0}
li{margin:0 0 24px;break-inside:avoid;border-bottom:1px solid #ddd;padding-bottom:16px;font-size:14px}
li p{margin:2px 0}
img{max-width:100%;max-height:420px;border:1px solid #bbb;margin-top:8px;display:block}
.hash{font-family:Consolas,monospace;font-size:12px;word-break:break-all}
.path{color:#595959;font-size:12px}
.note{border-left:4px solid #c1121f;background:#f1f1f1;padding:8px 12px;font-size:13px}
footer{margin-top:32px;border-top:2px solid #0a0a0a;padding-top:8px;font-size:12px}
@media print{body{margin:0}}
</style></head><body>
<h1>${esc(input.caseNumber)}</h1>
<p class="note">Generated ${esc(input.generatedAt)}. Information in this record is owner-submitted and has not been independently verified. The original files are in the files folder, unmodified. Verify them against SHA256SUMS.txt in the top folder of the ZIP.</p>
<h2>Case information</h2>
<pre>${esc(input.summaryText)}</pre>
<h2>Evidence index</h2>
${items ? `<ul>\n${items}\n</ul>` : "<p>No files uploaded.</p>"}
<footer><strong>Disclaimer.</strong> ${esc(DISCLAIMER_FULL)}</footer>
</body></html>`;
}
