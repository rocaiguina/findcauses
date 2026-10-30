"use server";

import { isAnswered, parseCriteria, toQuery } from "@/lib/criteria";
import { addSubscription } from "@/lib/store";

export type SubscribeState = { ok?: boolean; error?: string } | null;

export async function subscribe(_prev: SubscribeState, fd: FormData): Promise<SubscribeState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  // Re-serialize so the stored search is always in canonical form.
  const criteria = parseCriteria(new URLSearchParams(String(fd.get("query") ?? "")));
  if (!isAnswered(criteria)) return { error: "Answer the questions first." };
  await addSubscription(email, toQuery(criteria));
  return { ok: true };
}
