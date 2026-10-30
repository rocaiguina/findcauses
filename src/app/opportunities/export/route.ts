import { shortlistCsv } from "@/lib/csv";
import { isAnswered, parseCriteria } from "@/lib/criteria";
import { buildShortlist, SHORTLIST_SIZE } from "@/lib/shortlist";
import { listDirectory } from "@/lib/store";

/** The generated matches as a CSV. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const criteria = parseCriteria(url.searchParams);
  if (!isAnswered(criteria)) return new Response("Answer the questions first", { status: 400 });
  const size = url.searchParams.get("more") === "1" ? SHORTLIST_SIZE * 2 : SHORTLIST_SIZE;
  const { items } = buildShortlist(await listDirectory(), criteria, size);
  return shortlistCsv(items, url.origin);
}
