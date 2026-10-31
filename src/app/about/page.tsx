import { DISCLAIMER_FULL, HASH_EXPLAINER, MATCH_NOTICE } from "@/lib/constants";
import { PageShell } from "@/components/site";

export const metadata = { title: "About, privacy & how matching works" };

export default function About() {
  return (
    <PageShell narrow>
      <h1 className="section-title">About this platform</h1>
      <div className="prose-calm mt-4 space-y-4">
        <p>
          This is an independent community platform. Its job is to help affected pet owners keep their evidence safe and organized, and to make it possible to compare owner information with documented recovered animals — carefully, and with people reviewing every step.
        </p>
        <p className="rounded-2xl border border-note-200 bg-note-50 p-4 text-note-800">{DISCLAIMER_FULL}</p>

        <h2 className="font-serif text-xl font-semibold text-ink-900">Terminology</h2>
        <p>
          We say “potential match”, “characteristics in common”, “owner-submitted”, “source-documented” and “pending verification”. We never say a pet has been identified, and we never describe any person or business as having done anything wrong.
        </p>

        <h2 className="font-serif text-xl font-semibold text-ink-900">How potential matches work</h2>
        <p>
          Matching is simple and explainable: we compare name (exact or similar spelling), weight (exact, within ±0.5 kg, within ±1 kg), species, sex, colours and dates, and show side by side what is and isn’t in common. Distinctive markings are always left to human review. There is no facial recognition and no probability score. {MATCH_NOTICE}
        </p>

        <h2 className="font-serif text-xl font-semibold text-ink-900">Your evidence</h2>
        <p>
          Everything you upload is private by default. Original files are never altered. When a file is stored, the platform records a SHA-256 “digital fingerprint”. {HASH_EXPLAINER} Evidence can only be seen by you and by authorized reviewers, and every access by a reviewer is recorded in an audit log.
        </p>

        <h2 className="font-serif text-xl font-semibold text-ink-900">What is never public</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Owner names, addresses, phone numbers and emails</li>
          <li>Government IDs and payment account information</li>
          <li>Private Messenger conversations and veterinary documents</li>
          <li>Unredacted receipts</li>
          <li>The name of any aftercare provider you mention (reviewers can see it to correlate cases)</li>
          <li>Reviewer notes</li>
        </ul>

        <h2 className="font-serif text-xl font-semibold text-ink-900">Graphic content</h2>
        <p>Some recovered-animal records include images of deceased animals. Images are hidden until you choose to reveal them.</p>

        <h2 className="font-serif text-xl font-semibold text-ink-900">Please don’t</h2>
        <p>Fabricate, alter or misrepresent evidence. Submit only information you personally have or can identify the source of.</p>
      </div>
    </PageShell>
  );
}
