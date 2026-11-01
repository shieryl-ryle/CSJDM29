import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/site";
import { signUp } from "@/app/auth/actions";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/report";
  return (
    <PageShell narrow>
      <h1 className="section-title mb-2">Create account</h1>
      <p className="mb-5 text-ink-700">
        An account keeps evidence private. Only the account holder and authorized reviewers can see uploaded files. The email address is used only to contact you about your case.
      </p>
      <AuthForm mode="signup" action={signUp} next={next} />
    </PageShell>
  );
}
