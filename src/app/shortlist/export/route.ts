import { shortlistCsv } from "@/lib/csv";
import { loadSaved, parseIds } from "@/lib/savedShortlist";

/** The funder's saved shortlist as a CSV. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const items = await loadSaved(parseIds(url.searchParams.get("ids") ?? ""), url.searchParams.get("q") ?? "");
  return shortlistCsv(items, url.origin);
}
