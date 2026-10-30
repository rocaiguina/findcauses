import { desc, eq, inArray } from "drizzle-orm";
import type { DB } from "./index";
import { importedOrgs, irsFilings } from "./schema";
import type { ImportedListing, IrsFiling } from "../lib/types";

// Imported (unclaimed) listings with their IRS filings. No "server-only" import so scripts can share it.

async function filingsByEin(db: DB, eins: string[]): Promise<Map<string, IrsFiling[]>> {
  const byEin = new Map<string, IrsFiling[]>();
  if (!eins.length) return byEin;
  const rows = await db.select().from(irsFilings).where(inArray(irsFilings.ein, eins)).orderBy(desc(irsFilings.taxYear));
  for (const { ein, ...f } of rows) byEin.set(ein, [...(byEin.get(ein) ?? []), f]);
  return byEin;
}

function toListing(row: typeof importedOrgs.$inferSelect, filings: IrsFiling[]): ImportedListing {
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
    filings,
  };
}

export async function loadImported(db: DB): Promise<ImportedListing[]> {
  const rows = await db.select().from(importedOrgs);
  const filings = await filingsByEin(db, [...new Set(rows.flatMap((r) => (r.ein ? [r.ein] : [])))]);
  return rows.map((r) => toListing(r, r.ein ? (filings.get(r.ein) ?? []) : []));
}

export async function loadImportedBySlug(db: DB, slug: string): Promise<ImportedListing | undefined> {
  const [row] = await db.select().from(importedOrgs).where(eq(importedOrgs.slug, slug));
  if (!row) return undefined;
  const filings = row.ein ? ((await filingsByEin(db, [row.ein])).get(row.ein) ?? []) : [];
  return toListing(row, filings);
}
