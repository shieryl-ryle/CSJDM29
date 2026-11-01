import { describe, expect, it } from "vitest";
import { caseSummaryHtml } from "./case-html";

const base = { ref: "E01", pathInZip: "files/E01_photo.jpg", filename: "photo.jpg", type: "pet_photo", source: "owner_submitted", uploadedAt: "2026-11-01T03:56:00Z", size: 2_800_000, sha256: "a".repeat(64), description: null, isImage: true };

describe("caseSummaryHtml", () => {
  it("shows images by relative path and omits them for non-images", () => {
    const html = caseSummaryHtml({ caseNumber: "OC-1", summaryText: "Name: Test", evidence: [base, { ...base, ref: "E02", pathInZip: "files/E02_r.pdf", filename: "r.pdf", isImage: false }], generatedAt: "now" });
    expect(html).toContain('<img src="files/E01_photo.jpg"');
    expect(html).not.toContain('<img src="files/E02_r.pdf"');
    expect(html).toContain("a".repeat(64));
  });
  it("escapes owner-supplied text so it cannot inject markup", () => {
    const html = caseSummaryHtml({ caseNumber: "OC-1", summaryText: "Name: <script>alert(1)</script>", evidence: [{ ...base, description: '"><img src=x onerror=alert(1)>', filename: "<b>x</b>.jpg" }], generatedAt: "now" });
    expect(html).not.toMatch(/<script>alert/);
    expect(html).not.toContain("<img src=x onerror");
    expect(html).toContain("&lt;script&gt;");
  });
  it("handles a case with no files", () => {
    expect(caseSummaryHtml({ caseNumber: "OC-1", summaryText: "x", evidence: [], generatedAt: "now" })).toContain("No files uploaded.");
  });
});
