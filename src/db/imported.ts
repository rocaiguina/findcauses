import { desc, eq, inArray } from "drizzle-orm";
import type { DB } from "./index";
import { importedOrgs, irsFilings, listingNeeds } from "./schema";
import type { FundingNeed, ImportedListing, IrsFiling } from "../lib/types";

// Imported (unclaimed) listings with their IRS filings. No "server-only" import so scripts can share it.

async function filingsByEin(db: DB, eins: string[]): Promise<Map<string, IrsFiling[]>> {
  const byEin = new Map<string, IrsFiling[]>();
  if (!eins.length) return byEin;
  const rows = await db.select().from(irsFilings).where(inArray(irsFilings.ein, eins)).orderBy(desc(irsFilings.taxYear));
  for (const { ein, ...f } of rows) byEin.set(ein, [...(byEin.get(ein) ?? []), f]);
  return byEin;
}

async function needsByOrg(db: DB, ids: string[]): Promise<Map<string, FundingNeed[]>> {
  const byOrg = new Map<string, FundingNeed[]>();
  if (!ids.length) return byOrg;
  const rows = await db.select().from(listingNeeds).where(inArray(listingNeeds.importedOrgId, ids)).orderBy(listingNeeds.position);
  for (const { importedOrgId, title, type, amount, timeframe, description, example } of rows)
    byOrg.set(importedOrgId, [...(byOrg.get(importedOrgId) ?? []), { title, type, amount, timeframe, description, example }]);
  return byOrg;
}

function toListing(row: typeof importedOrgs.$inferSelect, filings: IrsFiling[], needs: FundingNeed[] = []): ImportedListing {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sources: row.sources,
    city: row.city,
    state: row.state,
    cause: row.cause,
    tags: row.tags,
    mission: row.mission,
    website: row.website,
    email: row.email,
    phone: row.phone,
    ein: row.ein,
    irsName: row.irsName,
    irsMatchScore: row.irsMatchScore,
    nteeCode: row.nteeCode,
    irsRulingDate: row.irsRulingDate,
    needs,
    filings,
  };
}

export async function loadImported(db: DB): Promise<ImportedListing[]> {
  const rows = await db.select().from(importedOrgs);
  const [filings, needs] = await Promise.all([
    filingsByEin(db, [...new Set(rows.flatMap((r) => (r.ein ? [r.ein] : [])))]),
    needsByOrg(db, rows.map((r) => r.id)),
  ]);
  return rows.map((r) => toListing(r, r.ein ? (filings.get(r.ein) ?? []) : [], needs.get(r.id) ?? []));
}

export async function loadImportedBySlug(db: DB, slug: string): Promise<ImportedListing | undefined> {
  const [row] = await db.select().from(importedOrgs).where(eq(importedOrgs.slug, slug));
  if (!row) return undefined;
  const filings = row.ein ? ((await filingsByEin(db, [row.ein])).get(row.ein) ?? []) : [];
  return toListing(row, filings, (await needsByOrg(db, [row.id])).get(row.id) ?? []);
}
