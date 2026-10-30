"use client";

import { useCallback, useSyncExternalStore } from "react";

// The funder's own shortlist, kept in this browser (no account). Entries are directory keys ("kind-id").
// The /shortlist page carries the same keys in its URL, so a list can be shared with colleagues.

const KEY = "jc_shortlist";
const QUERY_KEY = "jc_last_answers";
const EVENT = "jc-shortlist";
export const MAX_SAVED = 25;

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, MAX_SAVED) : [];
  } catch {
    return [];
  }
}

let snapshot: string[] | null = null;
const getSnapshot = () => (snapshot ??= read());
const EMPTY: string[] = [];

function subscribe(onChange: () => void) {
  const handler = () => {
    snapshot = read();
    onChange();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function writeSaved(keys: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...new Set(keys)].slice(0, MAX_SAVED)));
  } catch {
    // Private mode or blocked storage: the shortlist just won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useSaved() {
  const keys = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const toggle = useCallback(
    (key: string) => writeSaved(keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]),
    [keys],
  );
  return { keys, has: (key: string) => keys.includes(key), toggle };
}

/** Remembers the latest finder answers so the shortlist can explain why each pick fits. */
export function rememberAnswers(query: string) {
  try {
    if (query) localStorage.setItem(QUERY_KEY, query);
  } catch {}
}

export function lastAnswers(): string {
  try {
    return localStorage.getItem(QUERY_KEY) ?? "";
  } catch {
    return "";
  }
}
