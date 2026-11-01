import { DisclaimerBox, PageShell } from "@/components/site";
import { WitnessForm } from "@/components/witness-form";

export const metadata = { title: "Submit information" };

export default function InformationPage() {
  return (
    <PageShell narrow>
      <h1 className="section-title">Submit information</h1>
      <p className="prose-plain mt-3">
        Submit text, photos, videos, documents or links relevant to the case. No account is needed. Anonymous submission is available.
      </p>
      <div className="mt-6"><WitnessForm /></div>
      <DisclaimerBox className="mt-8" />
    </PageShell>
  );
}
