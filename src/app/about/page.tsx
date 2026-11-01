import { DISCLAIMER_FULL, HASH_EXPLAINER, MATCH_NOTICE } from "@/lib/constants";
import { PageShell } from "@/components/site";

export const metadata = { title: "Method and privacy" };

export default function About() {
  return (
    <PageShell narrow>
      <h1 className="section-title">Method and privacy</h1>
      <div className="prose-plain mt-4 space-y-4">
        <p>
          This is an independent community platform. It stores owner evidence, keeps a registry of documented recovered animals, and lists characteristics in common between the two. People review every record and every potential match.
        </p>
        <p className="border-l-4 border-brand-600 bg-sand-100 p-4 text-ink-900">{DISCLAIMER_FULL}</p>

        <h2 className="text-xl font-bold text-ink-900">Terminology</h2>
        <p>The platform uses: potential match, characteristics in common, owner-submitted, source-documented, pending verification. It does not state that an animal has been identified, and it makes no statement about any person or business.</p>

        <h2 className="text-xl font-bold text-ink-900">Potential matches</h2>
        <p>
          Matching is rule-based. It compares name (exact or similar spelling), weight (exact, within 0.5 kg, within 1 kg), species, sex, colors and dates, and lists each comparison. Distinctive markings are left to human review. There is no facial recognition and no probability score. {MATCH_NOTICE}
        </p>

        <h2 className="text-xl font-bold text-ink-900">Evidence handling</h2>
        <p>
          Uploads are private by default and originals are never altered. A SHA-256 hash is calculated from each stored file. {HASH_EXPLAINER} Only the uploader and authorized reviewers can access a file. Each reviewer access is recorded in an audit log.
        </p>

        <h2 className="text-xl font-bold text-ink-900">Not published</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Owner names, addresses, phone numbers and emails</li>
          <li>Government IDs and payment account information</li>
          <li>Private Messenger conversations and veterinary documents</li>
          <li>Unredacted receipts</li>
          <li>Aftercare provider names (visible to reviewers only)</li>
          <li>Reviewer notes</li>
        </ul>

        <h2 className="text-xl font-bold text-ink-900">Graphic content</h2>
        <p>Some records include images of deceased animals. Images stay hidden until Reveal is selected.</p>

        <h2 className="text-xl font-bold text-ink-900">Submission rules</h2>
        <p>Submit only information you possess or can identify the source of. Do not fabricate, alter or misrepresent evidence.</p>
      </div>
    </PageShell>
  );
}
