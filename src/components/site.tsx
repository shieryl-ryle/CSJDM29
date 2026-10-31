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
    <header className="no-print border-b border-sand-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-serif text-lg font-semibold text-brand-800">
          {SITE_NAME}
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-ink-700">
          <Link href="/registry" className="py-2 hover:text-brand-700">Recovered pets</Link>
          <Link href="/report" className="py-2 hover:text-brand-700">Report my pet</Link>
          <Link href="/information" className="py-2 hover:text-brand-700">I have information</Link>
          <Link href="/about" className="py-2 hover:text-brand-700">About</Link>
          {session ? (
            <>
              <Link href="/cases" className="py-2 hover:text-brand-700">My cases</Link>
              {isReviewerRole(session.profile.role) && (
                <Link href="/admin" className="py-2 font-semibold text-brand-700">Review</Link>
              )}
              <form action={signOut}>
                <button className="py-2 text-ink-500 hover:text-ink-900" type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="py-2 hover:text-brand-700">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-16 border-t border-sand-200 bg-sand-100">
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-8 text-sm text-ink-700">
        <p>{DISCLAIMER_FULL}</p>
        <p className="text-ink-500">
          Uploaded files are private by default. We never publish owner contact details, addresses, payment details or private conversations.{" "}
          <Link href="/about" className="underline">How this works</Link>
        </p>
      </div>
    </footer>
  );
}

export function DisclaimerBox({ className = "" }: { className?: string }) {
  return (
    <aside role="note" className={`rounded-2xl border border-note-200 bg-note-50 p-4 text-sm text-note-800 ${className}`}>
      <strong className="font-semibold">Please note. </strong>
      {DISCLAIMER_SHORT}
    </aside>
  );
}

export function GraphicNotice({ className = "" }: { className?: string }) {
  return (
    <p className={`rounded-xl border border-soft-200 bg-soft-50 p-3 text-sm text-soft-800 ${className}`}>
      <span aria-hidden>🕊️ </span>
      {GRAPHIC_NOTICE} Images are never shown until you choose to reveal them.
    </p>
  );
}

export function PageShell({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return <main className={`mx-auto w-full px-4 py-8 ${narrow ? "max-w-2xl" : "max-w-5xl"}`}>{children}</main>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "note" | "soft" | "info" }) {
  const tones = {
    neutral: "border-sand-300 bg-sand-100 text-ink-700",
    good: "border-brand-200 bg-brand-50 text-brand-800",
    note: "border-note-200 bg-note-50 text-note-800",
    soft: "border-soft-200 bg-soft-50 text-soft-800",
    info: "border-sky-200 bg-sky-50 text-sky-900",
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function OriginBadge({ origin }: { origin: string | undefined }) {
  if (!origin) return null;
  const map: Record<string, { label: string; tone: "good" | "note" | "info" | "neutral" }> = {
    source_documented: { label: "Source-documented", tone: "info" },
    system_extracted: { label: "System-extracted · pending review", tone: "note" },
    reviewer_verified: { label: "Reviewer-verified", tone: "good" },
    owner_submitted: { label: "Owner-submitted", tone: "neutral" },
  };
  const m = map[origin] ?? { label: origin, tone: "neutral" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
