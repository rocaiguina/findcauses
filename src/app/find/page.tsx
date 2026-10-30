import type { Metadata } from "next";
import { Finder } from "./Finder";
import { parseCriteria } from "@/lib/criteria";

export const metadata: Metadata = { title: "Find impact opportunities" };

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Coming back from "Edit answers" pre-fills the previous answers.
  const initial = parseCriteria(await searchParams);
  return (
    <div className="container-page max-w-2xl py-8">
      <p className="mb-3 text-center text-sm text-muted">
        5 quick questions → a shortlist of 6 impact opportunities in Puerto Rico that fit, and who to contact. No account needed.
      </p>
      <Finder initial={initial} />
    </div>
  );
}
