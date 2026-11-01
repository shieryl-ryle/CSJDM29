import Link from "next/link";
import { requireReviewer } from "@/lib/auth";
import { MATCH_NOTICE } from "@/lib/constants";

export const metadata = { title: "Reviewer guide" };

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-ink-700">{children}</div>
    </section>
  );
}

export default async function ReviewerGuide() {
  const { profile } = await requireReviewer();
  const admin = profile.role === "admin";
  return (
    <div className="space-y-4">
      <h1 className="section-title">Reviewer guide</h1>
      <p className="prose-plain text-sm">Role: {profile.role}. Every action is recorded in the audit log with the actor and the previous and new values.</p>

      <Block title="1. Daily queue">
        <p>The <Link className="underline" href="/admin">dashboard</Link> shows new owner cases, cases waiting on owners, candidate records, matches awaiting review and new information received. Work through them in that order.</p>
      </Block>

      <Block title="2. Review an owner case">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Open it from <Link className="underline" href="/admin/cases">Owner cases</Link>. Everything shown is owner-submitted.</li>
          <li>Check the timeline against the evidence. Use Preview or Download original to open a file. Each access is logged.</li>
          <li>Set the status: Under review, More information requested, or Closed. There is no message channel in the platform. Contact the owner using the contact details on the case, outside the platform.</li>
          <li>Record observations under <strong>Internal notes</strong>. Owners never see them.</li>
          <li>Check <strong>Possible duplicates</strong> (same pet name, phone or email). Open both cases and compare. Use <strong>Mark as duplicate</strong> with the original case number only when confirmed. A duplicate is not deleted. Its evidence is kept.</li>
        </ol>
      </Block>

      <Block title="3. Potential matches">
        <p>Open <Link className="underline" href="/admin/matches">Potential matches</Link>. Each entry lists name, weight, species, sex, colors, markings and dates as compared. Distinctive markings are never matched automatically. Compare them yourself using the owner photos and the recovered record.</p>
        <p>Set one status: follow-up recommended, more information needed, or did not hold up. Add a note. Do not tell an owner that an animal is theirs. {MATCH_NOTICE}</p>
      </Block>

      <Block title="4. Recovered pet records">
        <ol className="list-decimal space-y-1 pl-5">
          <li><Link className="underline" href="/admin/pets/new">New record</Link>. Enter only what the source shows or states: label name and weight, species, colors, markings, timestamp, source. Images are optional. A record can be text only.</li>
          <li>Under <strong>Recording changes as</strong>, choose Source-documented for what the source states, or Reviewer-verified when you checked or corrected a value against the source. Each change is stored with its origin, timestamp and source. Earlier values are kept.</li>
          <li><strong>Approve</strong> after checking. Tick <strong>Publish</strong> to show it in the public registry. <strong>Reject</strong> or <strong>Merge</strong> instead of deleting. Records are never hard-deleted.</li>
          <li>Frames are stored as graphic by default and hidden from the public. Tick <strong>Show publicly</strong> only after review. They remain behind a Reveal button.</li>
          <li>Condition notes and transcripts are reviewer-only and never appear on the public page.</li>
        </ol>
      </Block>

      <Block title="5. Source videos">
        <p>Upload only videos you are authorized to use, and state the authorization. The original is stored unmodified with a SHA-256 hash. Add a transcript, then create one candidate per animal with start and end timestamps. Automatic transcription, frame extraction and text reading are not configured. All steps are manual.</p>
      </Block>

      <Block title="6. Information received">
        <p>Entries from the public form. Treat as unverified. Links are not checked. Open them with care. Set a status and add a note.</p>
      </Block>

      {admin ? (
        <>
          <Block title="7. Export and print (administrators)">
            <p><Link className="underline" href="/admin/export">Export and print</Link> builds a ZIP of original files per case with <code>case-summary.txt</code>, <code>MANIFEST.csv</code> (SHA-256 at upload and at export) and <code>SHA256SUMS.txt</code>. Verify on a computer with <code>sha256sum -c SHA256SUMS.txt</code>. Any HASH MISMATCH or entry in PROBLEMS.txt must be investigated before the file is relied on. Printing produces one package per case.</p>
            <p>Reviewers who are not administrators can export one case at a time from the case page.</p>
          </Block>
          <Block title="8. Users and roles (administrators)">
            <p><Link className="underline" href="/admin/users">Users</Link> lists accounts. Ask a new reviewer to create an account on the site first, then set their role here. Give Reviewer for review work and Administrator only to people responsible for data handling. The last administrator cannot be removed.</p>
          </Block>
        </>
      ) : (
        <Block title="Administrator functions">
          <p>Bulk export, bulk print and user management are limited to administrators.</p>
        </Block>
      )}

      <Block title="Handling rules">
        <ul className="list-disc space-y-1 pl-5">
          <li>Do not copy contact details, evidence or case content into chat groups or social media. Share with authorities only through the export.</li>
          <li>Do not edit, crop or rename evidence outside the platform before it is handed over.</li>
          <li>Record decisions in the platform (status, notes, match review) so the audit log is complete.</li>
          <li>Open graphic images only when required for the review.</li>
          <li>Report a suspected exposure of personal data to an administrator immediately.</li>
        </ul>
      </Block>
    </div>
  );
}
