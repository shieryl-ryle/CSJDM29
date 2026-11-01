import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/site";
import { signIn } from "@/app/auth/actions";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/cases";
  return (
    <PageShell narrow>
      <h1 className="section-title mb-2">Sign in</h1>
      <p className="mb-5 text-ink-700">Accounts keep uploaded evidence private and allow a report to be completed later.</p>
      {sp.error === "link" && <p className="mb-4 rounded-xl bg-soft-50 p-3 text-sm text-soft-800">That link has expired. Sign in again.</p>}
      <AuthForm mode="login" action={signIn} next={next} />
    </PageShell>
  );
}
