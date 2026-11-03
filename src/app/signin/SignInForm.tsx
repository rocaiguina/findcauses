"use client";

import { useState } from "react";
import { apiPost } from "@/lib/client";

export function SignInForm({ next }: { next: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    try {
      const res = await apiPost<{ sentTo?: string; error?: string }>("auth/link", { email, next });
      if (res.ok && res.data.sentTo) setSentTo(res.data.sentTo);
      else setError(res.data.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    }
    setPending(false);
  }

  if (sentTo)
    return (
      <div className="card mt-6 p-6">
        <p className="font-medium">Check your email</p>
        <p className="mt-1 text-sm text-muted">
          We sent a sign-in link to <span className="text-ink">{sentTo}</span>. It works once and expires in 30
          minutes.
        </p>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-6">
      <div>
        <label htmlFor="email" className="field-label">
          Work email
        </label>
        <input id="email" name="email" type="email" required autoFocus autoComplete="email" className="field" />
        <p className="mt-1 text-xs text-muted">
          Use an address on your organization&apos;s website domain to verify ownership instantly.
        </p>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={pending} className="btn-primary w-full disabled:opacity-60">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
