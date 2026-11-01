import { NewPasswordForm } from "@/components/password-forms";
import { PageShell } from "@/components/site";
import { updatePassword } from "@/app/auth/actions";

export const metadata = { title: "Set a new password" };

export default function ResetPassword() {
  return (
    <PageShell narrow>
      <h1 className="section-title mb-2">Set a new password</h1>
      <NewPasswordForm action={updatePassword} />
    </PageShell>
  );
}
