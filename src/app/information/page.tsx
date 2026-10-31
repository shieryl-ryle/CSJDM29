import { DisclaimerBox, PageShell } from "@/components/site";
import { WitnessForm } from "@/components/witness-form";

export const metadata = { title: "I have information" };

export default function InformationPage() {
  return (
    <PageShell narrow>
      <h1 className="section-title">I have information</h1>
      <p className="prose-calm mt-3">
        If you saw something, received a message, or have photos, videos, documents or links that may help, you can share them here. You don’t need an account, and you can stay anonymous.
      </p>
      <div className="mt-6"><WitnessForm /></div>
      <DisclaimerBox className="mt-8" />
    </PageShell>
  );
}
