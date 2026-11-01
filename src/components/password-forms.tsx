"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/auth/actions";

export function ResetRequestForm({ action }: { action: (prev: AuthState, form: FormData) => Promise<AuthState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="input" />
      </div>
      {state.error && <p role="alert" className="border-l-4 border-soft-800 bg-soft-50 p-3 text-sm text-soft-800">{state.error}</p>}
      {state.message && <p role="status" className="border-l-4 border-ink-900 bg-sand-100 p-3 text-sm">{state.message}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Working…" : "Send reset link"}</button>
    </form>
  );
}

export function NewPasswordForm({ action }: { action: (prev: AuthState, form: FormData) => Promise<AuthState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
        <p className="hint">At least 8 characters.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repeat new password</label>
        <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      {state.error && <p role="alert" className="border-l-4 border-soft-800 bg-soft-50 p-3 text-sm text-soft-800">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Working…" : "Save new password"}</button>
    </form>
  );
}
