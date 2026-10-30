"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { lastAnswers, useSaved, writeSaved } from "@/lib/saved";

const href = (ids: string[], q: string) =>
  `/shortlist?${new URLSearchParams({ ids: ids.join(","), ...(q ? { q } : {}) })}`;

/** Opening /shortlist without ids loads the saved list from this browser into the URL. */
export function LoadSaved() {
  const router = useRouter();
  const { keys } = useSaved();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (keys.length) router.replace(href(keys, lastAnswers()));
    else setChecked(true);
  }, [keys, router]);
  if (!checked) return <p className="py-10 text-center text-sm text-muted">Loading your shortlist…</p>;
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <p className="text-lg font-semibold">Your shortlist is empty</p>
      <p className="mt-1 text-sm text-muted">Tap ☆ Save on any organization to add it here.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Link href="/find" className="btn-primary">
          Find matches
        </Link>
        <Link href="/organizations" className="btn-ghost">
          Browse directory
        </Link>
      </div>
    </div>
  );
}

export function RemoveButton({ id, ids, q }: { id: string; ids: string[]; q: string }) {
  const router = useRouter();
  const { keys } = useSaved();
  return (
    <button
      type="button"
      className="no-print text-sm font-semibold text-muted hover:text-ink hover:underline"
      onClick={() => {
        writeSaved(keys.filter((k) => k !== id));
        const rest = ids.filter((k) => k !== id);
        router.replace(rest.length ? href(rest, q) : "/shortlist");
      }}
    >
      Remove
    </button>
  );
}

/** Print, copy link, and (for a list someone shared) save it to this browser. */
export function ShortlistActions({ ids, csvHref }: { ids: string[]; csvHref: string }) {
  const { keys } = useSaved();
  const [copied, setCopied] = useState(false);
  const isShared = ids.some((k) => !keys.includes(k));
  return (
    <div className="no-print flex flex-wrap gap-2">
      {isShared && (
        <button type="button" className="btn-primary" onClick={() => writeSaved([...keys, ...ids])}>
          ☆ Save this list
        </button>
      )}
      <button type="button" className="btn-primary" onClick={() => window.print()}>
        Print / Save as PDF
      </button>
      <a href={csvHref} className="btn-ghost">
        Download CSV
      </a>
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
        {copied ? "Link copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
