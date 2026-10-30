"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card mt-6 space-y-4 p-6">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input id="password" name="password" type="password" required autoFocus className="field" />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={pending} className="btn-primary w-full disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
