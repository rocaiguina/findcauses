"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/client";

export function ClaimForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await apiPost<{ status?: string; errors?: Record<string, string>; error?: string }>(
        `listings/${slug}/claim`,
        { name: fd.get("name"), role: fd.get("role") },
      );
      if (res.ok) {
        router.push(`/dashboard?claimed=${encodeURIComponent(slug)}`);
        router.refresh();
        return;
      }
      setError(res.data.error ?? Object.values(res.data.errors ?? {})[0] ?? "Something went wrong.");
    } catch {
      setError("Network error. Please try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-6">
      <div>
        <label htmlFor="name" className="field-label">
          Your name
        </label>
        <input id="name" name="name" required autoComplete="name" className="field" />
      </div>
      <div>
        <label htmlFor="role" className="field-label">
          Your role at the organization
        </label>
        <input id="role" name="role" required placeholder="Executive Director, Development Manager…" className="field" />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={pending} className="btn-primary w-full disabled:opacity-60">
        {pending ? "Claiming…" : "Claim this page"}
      </button>
    </form>
  );
}
