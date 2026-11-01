import Link from "next/link";
import { DisclaimerBox, PageShell } from "@/components/site";
import { EVIDENCE_TYPES, HASH_EXPLAINER, MATCH_NOTICE } from "@/lib/constants";

export const metadata = { title: "How to use this site" };

const toc = [
  ["owners", "Register a pet and upload evidence"],
  ["previous", "Report a previous incident"],
  ["information", "Submit information without an account"],
  ["after", "After submitting"],
  ["terms", "What the labels mean"],
  ["privacy", "Privacy"],
  ["problems", "Problems"],
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white" aria-hidden>{n}</span>
      <div className="min-w-0 pb-2">
        <h3 className="font-bold text-ink-900">{title}</h3>
        <div className="mt-1 space-y-1 text-sm text-ink-700">{children}</div>
      </div>
    </li>
  );
}

export default function Guide() {
  return (
    <PageShell narrow>
      <h1 className="section-title">How to use this site</h1>
      <p className="prose-plain mt-3">Instructions for pet owners and for people submitting information. Entries are saved as they are typed.</p>

      <nav aria-label="Guide sections" className="card mt-5">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Contents</p>
        <ul className="mt-2 space-y-1 text-sm">
          {toc.map(([id, label]) => (
            <li key={id}><a className="underline" href={`#${id}`}>{label}</a></li>
          ))}
        </ul>
      </nav>

      <section id="owners" className="mt-10 scroll-mt-4">
        <h2 className="text-xl font-bold">Register a pet and upload evidence</h2>

        <div className="card mt-4">
          <h3 className="font-bold">Prepare before you start</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
            <li>Pet name, species, colors, markings, approximate weight</li>
            <li>Dates: death, handover to the aftercare provider, weight recorded, urn received</li>
            <li>Receipt or invoice, certificate, Messenger or SMS conversation (screenshots), veterinary records</li>
            <li>Clear photos of the pet, and photos of the urn, returned ashes, fur or paw print if received</li>
          </ul>
        </div>

        <ol className="mt-6 space-y-5">
          <Step n={1} title="Create an account">
            <p>Select <strong>Report a pet</strong>, then <strong>Create account</strong>. Use an email address you can access. Only the account holder and authorized reviewers can see uploaded files.</p>
          </Step>
          <Step n={2} title="Start the report">
            <p>Select <strong>Start report</strong>. A draft is created and saved after every change. The top bar shows <em>All changes saved</em>. If the connection drops, entries are kept on the device and sent when it returns.</p>
          </Step>
          <Step n={3} title="Pet details">
            <p>Enter the details available. Only the pet name and species are required to submit. Describe markings such as scars, a missing tooth, a collar, surgery, or tail and ear features. Enter the weight and the date it was recorded if known.</p>
            <p>Upload clear photos of the pet: face, full body, and any markings. Use <strong>Take a photo</strong> or <strong>Choose from gallery or files</strong>.</p>
          </Step>
          <Step n={4} title="Aftercare details">
            <p>Enter the provider, the service purchased, the collection date and method, the amount paid, and what was returned (urn, fur, paw print, certificate). This section is private.</p>
          </Step>
          <Step n={5} title="Upload evidence">
            <p>For each upload, pick the file type, add a short note if useful, then select the files. Each file shows progress, then <strong>Saved</strong>. Accepted types:</p>
            <ul className="list-disc pl-5">
              {EVIDENCE_TYPES.map(([k, v]) => <li key={k}>{v}</li>)}
            </ul>
            <p>Limits: 50 MB per file, 100 files per report, 300 MB per account. For a longer video, upload a shorter clip or a screenshot.</p>
            <p><strong>Do not edit, crop or compress files.</strong> Upload the original. For conversations, screenshot the full thread including dates and the contact name.</p>
          </Step>
          <Step n={6} title="Contact details and submit">
            <p>Enter a name and a mobile number or email so a reviewer can contact you. Contact details are never published. Tick the confirmation, then select <strong>Submit report</strong>.</p>
          </Step>
        </ol>
      </section>

      <section id="previous" className="mt-10 scroll-mt-4">
        <h2 className="text-xl font-bold">Report a previous incident</h2>
        <p className="prose-plain mt-2 text-sm">For an incident from an earlier year. Select <strong>Report a previous incident</strong> on the Report page. Enter the year, pet, service, what happened, whether ashes were received and whether a refund was offered. Upload any documents. The report is labelled <em>owner-submitted</em> until independently supported.</p>
      </section>

      <section id="information" className="mt-10 scroll-mt-4">
        <h2 className="text-xl font-bold">Submit information without an account</h2>
        <ol className="mt-3 space-y-5">
          <Step n={1} title="Open Submit information">
            <p>Describe what you know and how you obtained it. Add the approximate date, location and any links.</p>
          </Step>
          <Step n={2} title="Choose anonymous or not">
            <p>Tick <strong>Submit anonymously</strong> and your account is not stored with the submission. Contact details are optional and visible to reviewers only.</p>
          </Step>
          <Step n={3} title="Attach files">
            <p>After sending, attach photos, videos or documents you personally have. Send originals.</p>
          </Step>
        </ol>
        <p className="mt-3 text-sm text-ink-700">Submit only information you possess or can identify the source of. Do not fabricate, alter or misrepresent evidence.</p>
        <p className="mt-3"><Link href="/information" className="btn-secondary btn-sm">Submit information</Link></p>
      </section>

      <section id="after" className="mt-10 scroll-mt-4">
        <h2 className="text-xl font-bold">After submitting</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-700">
          <li><strong>My cases</strong> lists your reports. Open one to add evidence at any time. Dates and uploads form a timeline automatically. You can add timeline events.</li>
          <li><strong>Possible matches</strong> lists documented recovered animals with characteristics in common. It stays empty until reviewers add records to the registry. {MATCH_NOTICE}</li>
          <li><strong>Print case summary</strong> opens a print-ready package. Use the browser Print option to print or save as PDF.</li>
          <li><strong>Download all files (ZIP)</strong> downloads every original file with a manifest of SHA-256 values. Give this to investigators or authorities when asked.</li>
          <li>Reviewers see your report and evidence. Each reviewer preview or download of a file is recorded in an audit log.</li>
        </ul>
      </section>

      <section id="terms" className="mt-10 scroll-mt-4">
        <h2 className="text-xl font-bold">What the labels mean</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="font-bold">Original preserved</dt><dd className="text-ink-700">The file is stored exactly as uploaded and cannot be changed.</dd></div>
          <div><dt className="font-bold">SHA-256</dt><dd className="text-ink-700">{HASH_EXPLAINER} Copy it from the file entry if an investigator asks for it.</dd></div>
          <div><dt className="font-bold">Owner-submitted</dt><dd className="text-ink-700">Information provided by an owner. Not independently verified.</dd></div>
          <div><dt className="font-bold">Source-documented</dt><dd className="text-ink-700">Information as shown or stated by the cited source for a recovered animal.</dd></div>
          <div><dt className="font-bold">System-extracted, pending review</dt><dd className="text-ink-700">Read by software and not yet checked by a person.</dd></div>
          <div><dt className="font-bold">Reviewer-verified</dt><dd className="text-ink-700">Checked by a human reviewer against the source.</dd></div>
          <div><dt className="font-bold">Potential match</dt><dd className="text-ink-700">A record that shares characteristics with a report. It is an investigative lead only and not a confirmed identification.</dd></div>
        </dl>
      </section>

      <section id="privacy" className="mt-10 scroll-mt-4">
        <h2 className="text-xl font-bold">Privacy</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-700">
          <li>Uploads are private by default.</li>
          <li>Owner names, phone numbers, emails, addresses, payment details and private conversations are never published.</li>
          <li>The recovered-animal registry shows only reviewer-approved records. Images of deceased animals stay hidden until Reveal is selected.</li>
        </ul>
        <p className="mt-2 text-sm"><Link className="underline" href="/about">Method and privacy</Link></p>
      </section>

      <section id="problems" className="mt-10 scroll-mt-4">
        <h2 className="text-xl font-bold">Problems</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="font-bold">An upload fails or stops</dt><dd className="text-ink-700">Check the connection and select <em>Try again</em> on that file. Accepted: photos, PDF, video, audio, text, Word and Excel files up to 50 MB.</dd></div>
          <div><dt className="font-bold">A file type is not accepted</dt><dd className="text-ink-700">Take a screenshot or photo of the document and upload that.</dd></div>
          <div><dt className="font-bold">Forgot password</dt><dd className="text-ink-700">Use <Link className="underline" href="/forgot-password">Forgot password</Link> on the sign-in page.</dd></div>
          <div><dt className="font-bold">Reached a limit</dt><dd className="text-ink-700">Each account holds up to 10 reports, 3 unfinished drafts and 300 MB. Contact a reviewer if more is needed.</dd></div>
          <div><dt className="font-bold">The page closed before submitting</dt><dd className="text-ink-700">Open <Link className="underline" href="/cases">My cases</Link> and select Continue. Saved entries are kept.</dd></div>
        </dl>
      </section>

      <p className="mt-10"><Link href="/report" className="btn-primary">Report or register a pet</Link></p>
      <DisclaimerBox className="mt-8" />
    </PageShell>
  );
}
