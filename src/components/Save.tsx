"use client";

import { useEffect } from "react";
import { MAX_SAVED, rememberAnswers, useSaved, writeSaved } from "@/lib/saved";

/** ★ Save toggle for one organization ("kind-id" key). */
export function SaveButton({ entryKey, compact }: { entryKey: string; compact?: boolean }) {
  const { has, toggle, keys } = useSaved();
  const on = has(entryKey);
  const full = !on && keys.length >= MAX_SAVED;
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={full}
      title={full ? `Your shortlist is full (${MAX_SAVED})` : on ? "Remove from shortlist" : "Add to shortlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(entryKey);
      }}
      className={
        compact
          ? `flex h-8 w-8 items-center justify-center rounded-full text-lg transition-colors disabled:opacity-40 ${
              on ? "text-accent" : "text-muted hover:bg-black/5 hover:text-ink"
            }`
          : `btn ${on ? "border border-accent bg-accent/10 text-accent" : "btn-ghost"} disabled:opacity-40`
      }
    >
      <span aria-hidden>{on ? "★" : "☆"}</span>
      {compact ? <span className="sr-only">{on ? "Saved" : "Save"}</span> : on ? "Saved" : "Save"}
    </button>
  );
}

/** Saves several organizations at once, e.g. all six of a generated shortlist. */
export function SaveAllButton({ entryKeys }: { entryKeys: string[] }) {
  const { keys } = useSaved();
  const allSaved = entryKeys.every((k) => keys.includes(k));
  return (
    <button
      type="button"
      disabled={allSaved}
      onClick={() => writeSaved([...keys, ...entryKeys])}
      className="btn-ghost disabled:opacity-50"
    >
      {allSaved ? "★ All saved" : `☆ Save all ${entryKeys.length}`}
    </button>
  );
}

/** Remembers the finder answers on the results page, so the shortlist can say why each pick fits. */
export function RememberAnswers({ query }: { query: string }) {
  useEffect(() => rememberAnswers(query), [query]);
  return null;
}
