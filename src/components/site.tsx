import Link from "next/link";
import { getSession, isReviewerRole } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import { DISCLAIMER_FULL, DISCLAIMER_SHORT, GRAPHIC_NOTICE, SITE_NAME } from "@/lib/constants";

export async function SiteHeader() {
  let session = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }
  return (
    <header className="no-print border-b-4 border-brand-600 bg-ink-900 text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          {SITE_NAME}
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
          <Link href="/registry" className="py-2 hover:underline">Recovered pets</Link>
          <Link href="/report" className="py-2 hover:underline">Report a pet</Link>
          <Link href="/information" className="py-2 hover:underline">Submit information</Link>
          <Link href="/guide" className="py-2 hover:underline">Guide</Link>
          <Link href="/about" className="py-2 hover:underline">About</Link>
          {session ? (
            <>
              <Link href="/cases" className="py-2 hover:underline">My cases</Link>
              {isReviewerRole(session.profile.role) && (
                <Link href="/admin" className="py-2 font-bold underline decoration-brand-500 decoration-2 underline-offset-4">Review</Link>
              )}
              <form action={signOut}>
                <button className="py-2 text-white/70 hover:text-white" type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="py-2 hover:underline">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-16 border-t border-sand-300 bg-sand-100">
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-8 text-sm text-ink-700">
        <p>{DISCLAIMER_FULL}</p>
        <p className="text-ink-500">
          Uploaded files are private by default. Owner contact details, addresses, payment details and private conversations are not published.{" "}
          <Link href="/about" className="underline">Method and privacy</Link>
        </p>
      </div>
    </footer>
  );
}

export function DisclaimerBox({ className = "" }: { className?: string }) {
  return (
    <aside role="note" className={`border-l-4 border-brand-600 bg-sand-100 p-4 text-sm text-ink-900 ${className}`}>
      <strong className="font-bold">Notice. </strong>
      {DISCLAIMER_SHORT}
    </aside>
  );
}

export function GraphicNotice({ className = "" }: { className?: string }) {
  return (
    <p className={`border-l-4 border-soft-800 bg-soft-50 p-3 text-sm text-soft-800 ${className}`}>
      {GRAPHIC_NOTICE} Images stay hidden until Reveal is selected.
    </p>
  );
}

export function PageShell({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return <main className={`mx-auto w-full px-4 py-8 ${narrow ? "max-w-2xl" : "max-w-5xl"}`}>{children}</main>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "note" | "soft" | "info" }) {
  const tones = {
    neutral: "border-sand-300 bg-sand-100 text-ink-700",
    good: "border-ink-900 bg-ink-900 text-white",
    note: "border-sand-300 bg-white text-ink-900",
    soft: "border-soft-200 bg-soft-50 text-soft-800",
    info: "border-ink-900 bg-white text-ink-900",
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function OriginBadge({ origin }: { origin: string | undefined }) {
  if (!origin) return null;
  const map: Record<string, { label: string; tone: "good" | "note" | "info" | "neutral" }> = {
    source_documented: { label: "Source-documented", tone: "info" },
    system_extracted: { label: "System-extracted, pending review", tone: "note" },
    reviewer_verified: { label: "Reviewer-verified", tone: "good" },
    owner_submitted: { label: "Owner-submitted", tone: "neutral" },
  };
  const m = map[origin] ?? { label: origin, tone: "neutral" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
