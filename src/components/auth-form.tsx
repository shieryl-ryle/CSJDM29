"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/app/auth/actions";

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "login" | "signup";
  action: (prev: AuthState, form: FormData) => Promise<AuthState>;
  next: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="card space-y-4">
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="display_name">Your first name (optional)</label>
          <input id="display_name" name="display_name" className="input" autoComplete="given-name" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" inputMode="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {mode === "signup" && <p className="hint">At least 8 characters.</p>}
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-soft-50 p-3 text-sm text-soft-800">{state.error}</p>}
      {state.message && <p role="status" className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">{state.message}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-ink-500">
        {mode === "login" ? (
          <>New here? <Link className="underline" href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></>
        ) : (
          <>Already have an account? <Link className="underline" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></>
        )}
      </p>
    </form>
  );
}
