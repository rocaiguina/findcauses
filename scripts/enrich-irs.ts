// Looks up each imported listing in IRS data via ProPublica Nonprofit Explorer
// (https://projects.propublica.org/nonprofits/api) and stores its Form 990 summary figures.
//
// Matching is deliberately conservative: a name must score >= IRS_MATCH_THRESHOLD and clearly beat
// any other candidate, otherwise the listing stays unmatched. API responses are cached in
// data/imports/propublica/ so re-runs are fast and polite.
//
// Usage: npm run imports:enrich [-- --recheck]
import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";
import { eq, isNull, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { importedOrgs, irsFilings } from "../src/db/schema";
import { PROPUBLICA_API, validRulingDate } from "../src/lib/irs";
import { categorize, fallbackQueries, IRS_MATCH_THRESHOLD, nameSimilarity, toEnglish } from "../src/lib/imports";

loadEnvConfig(process.cwd());

const API = PROPUBLICA_API;
const CACHE = path.join(process.cwd(), "data", "imports", "propublica");
const DELAY_MS = 400;
const FORM_TYPES: Record<number, string> = { 0: "990", 1: "990-EZ", 2: "990-PF" };

type SearchResult = { organizations?: { ein: number; name: string; state?: string; ntee_code?: string | null }[] };
type Filing = {
  tax_prd_yr: number;
  formtype: number;
  totrevenue?: number | null;
  totfuncexpns?: number | null;
  totcntrbgfts?: number | null;
  totprgmrevnue?: number | null;
  totassetsend?: number | null;
  totliabend?: number | null;
  totnetassetend?: number | null;
  pdf_url?: string | null;
};
type OrgResult = {
  organization?: { name: string; ntee_code?: string | null; ruling_date?: string | null };
  filings_with_data?: Filing[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cachedGet<T>(url: string, cacheName: string): Promise<T | null> {
  const file = path.join(CACHE, `${cacheName}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as T;
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(DELAY_MS * (attempt + 1) ** 2);
    const res = await fetch(url, { headers: { "User-Agent": "FindCauses directory (development import)" } });
    if (res.status === 404) {
      writeFileSync(file, "null");
      return null;
    }
    if (res.status === 429 || res.status >= 500) continue;
    if (!res.ok) throw new Error(`${res.status} for ${url}`);
    const body = (await res.json()) as T;
    writeFileSync(file, JSON.stringify(body));
    return body;
  }
  throw new Error(`Gave up on ${url} after retries`);
}

function search(q: string) {
  const hash = createHash("sha1").update(q).digest("hex").slice(0, 16);
  return cachedGet<SearchResult>(`${API}/search.json?q=${encodeURIComponent(q)}&state%5Bid%5D=PR`, `search-${hash}`);
}

function searchQuery(name: string): string {
  // Parentheticals are usually acronyms or translations that hurt full-text search.
  return name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  const db = getDb();
  const recheck = process.argv.includes("--recheck");
  const todo = await db
    .select()
    .from(importedOrgs)
    .where(recheck ? undefined : isNull(importedOrgs.irsCheckedAt))
    .orderBy(importedOrgs.name);
  console.log(`Checking ${todo.length} listings against IRS data…`);

  let matched = 0;
  let ambiguous = 0;
  for (const [i, org] of todo.entries()) {
    // ProPublica requires every word to appear, so long names often find nothing; retry with distinctive words.
    // Many Puerto Rico nonprofits file under an English name, so the English rendering is tried last.
    const english = toEnglish(org.name);
    const queries = [...fallbackQueries(org.name), ...(english ? fallbackQueries(english) : [])];
    let candidates = (await search(searchQuery(org.name)))?.organizations ?? [];
    for (const q of queries) {
      if (candidates.length) break;
      candidates = (await search(q))?.organizations ?? [];
    }

    const scored = candidates
      .map((c) => ({
        ...c,
        score: Math.max(nameSimilarity(org.name, c.name), english ? nameSimilarity(english, c.name) : 0),
      }))
      .sort((a, b) => b.score - a.score);
    const [best, runnerUp] = scored;
    const isAmbiguous = best && runnerUp && runnerUp.ein !== best.ein && best.score - runnerUp.score < 5;

    if (best && best.score >= IRS_MATCH_THRESHOLD && !isAmbiguous) {
      const ein = String(best.ein).padStart(9, "0");
      const detail = await cachedGet<OrgResult>(`${API}/organizations/${best.ein}.json`, `org-${ein}`);
      const filings = (detail?.filings_with_data ?? []).filter((f) => f.tax_prd_yr);
      // Keep the latest filing per tax year (amended returns repeat the year).
      const byYear = new Map(filings.map((f) => [f.tax_prd_yr, f]));
      if (byYear.size) {
        await db
          .insert(irsFilings)
          .values(
            [...byYear.values()].map((f) => ({
              ein,
              taxYear: f.tax_prd_yr,
              formType: FORM_TYPES[f.formtype] ?? String(f.formtype),
              totalRevenue: f.totrevenue ?? null,
              totalExpenses: f.totfuncexpns ?? null,
              contributions: f.totcntrbgfts ?? null,
              programRevenue: f.totprgmrevnue ?? null,
              totalAssets: f.totassetsend ?? null,
              totalLiabilities: f.totliabend ?? null,
              netAssets: f.totnetassetend ?? null,
              pdfUrl: f.pdf_url ?? null,
            })),
          )
          .onConflictDoUpdate({
            target: [irsFilings.ein, irsFilings.taxYear],
            set: {
              formType: sql`excluded.form_type`,
              totalRevenue: sql`excluded.total_revenue`,
              totalExpenses: sql`excluded.total_expenses`,
              contributions: sql`excluded.contributions`,
              programRevenue: sql`excluded.program_revenue`,
              totalAssets: sql`excluded.total_assets`,
              totalLiabilities: sql`excluded.total_liabilities`,
              netAssets: sql`excluded.net_assets`,
              pdfUrl: sql`excluded.pdf_url`,
            },
          });
      }
      const ntee = detail?.organization?.ntee_code ?? best.ntee_code ?? null;
      await db
        .update(importedOrgs)
        .set({
          ein,
          irsName: detail?.organization?.name ?? best.name,
          irsMatchScore: best.score,
          nteeCode: ntee,
          irsRulingDate: validRulingDate(detail?.organization?.ruling_date),
          cause: categorize({ name: org.name, tags: org.tags, ntee }),
          irsCheckedAt: new Date(),
        })
        .where(eq(importedOrgs.id, org.id));
      matched++;
    } else {
      if (isAmbiguous && best.score >= IRS_MATCH_THRESHOLD) ambiguous++;
      await db
        .update(importedOrgs)
        .set({ ein: null, irsName: null, irsMatchScore: null, irsRulingDate: null, irsCheckedAt: new Date() })
        .where(eq(importedOrgs.id, org.id));
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${todo.length} checked, ${matched} matched`);
  }
  console.log(`Done: ${matched} matched to IRS records, ${ambiguous} skipped as ambiguous, ${todo.length - matched - ambiguous} not found.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
