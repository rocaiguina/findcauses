"use client";

import { useActionState, useState } from "react";
import { subscribe } from "./actions";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-muted"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy this link", window.location.href);
        }
      }}
    >
      {copied ? "Link copied ✓" : "Share link"}
    </button>
  );
}

export function SubscribeCard({ query }: { query: string }) {
  const [state, action, pending] = useActionState(subscribe, null);
  return (
    <div className="card p-4">
      <p className="font-semibold">Get new matching opportunities by email</p>
      <p className="mt-1 text-sm text-muted">Optional. Just your email, no account. Unsubscribe anytime.</p>
      {state?.ok ? (
        <p className="mt-3 text-sm font-semibold text-success">✓ You&apos;re subscribed to this search.</p>
      ) : (
        <form action={action} className="mt-3 flex gap-2">
          <input type="hidden" name="query" value={query} />
          <input
            name="email"
            type="email"
            required
            placeholder="you@foundation.org"
            aria-label="Email"
            className="field min-w-0 flex-1"
          />
          <button disabled={pending} className="btn-primary shrink-0 disabled:opacity-60">
            {pending ? "…" : "Subscribe"}
          </button>
        </form>
      )}
      {state?.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
    </div>
  );
}
