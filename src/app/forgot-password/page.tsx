import Link from "next/link";
import { ResetRequestForm } from "@/components/password-forms";
import { PageShell } from "@/components/site";
import { requestPasswordReset } from "@/app/auth/actions";

export const metadata = { title: "Forgot password" };

export default function ForgotPassword() {
  return (
    <PageShell narrow>
      <h1 className="section-title mb-2">Forgot password</h1>
      <p className="mb-5 text-ink-700">Enter the email address used for the account. A link to set a new password is sent to it.</p>
      <ResetRequestForm action={requestPasswordReset} />
      <p className="mt-4 text-center text-sm"><Link className="underline" href="/login">Back to sign in</Link></p>
    </PageShell>
  );
}
