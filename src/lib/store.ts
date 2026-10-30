import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { activeEin, insertOrganization, loadOrganizations, type Form990Upload, type NewOrganization } from "@/db/organizations";
import { form990Files, importedOrgs, irsFilings, organizations } from "@/db/schema";
import { searchWords } from "./format";
import { toEnglish } from "./imports";
import type { DirectoryEntry, ImportedListing, IrsFiling, Organization, OrgStatus } from "./types";

export async function listApproved(): Promise<Organization[]> {
  const orgs = await loadOrganizations(getDb(), eq(organizations.status, "approved"));
  return orgs.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listByStatus(status: OrgStatus): Promise<Organization[]> {
  const orgs = await loadOrganizations(getDb(), eq(organizations.status, status));
  return orgs.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function getApprovedBySlug(slug: string): Promise<Organization | undefined> {
  const [org] = await loadOrganizations(
    getDb(),
    and(eq(organizations.slug, slug), eq(organizations.status, "approved")),
  );
  return org;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getById(id: string): Promise<Organization | undefined> {
  if (!UUID.test(id)) return undefined; // avoid a Postgres cast error on malformed URLs
  const [org] = await loadOrganizations(getDb(), eq(organizations.id, id));
  return org;
}

export async function insert(org: NewOrganization, file: Form990Upload): Promise<string> {
  return insertOrganization(getDb(), org, file);
}

export async function setStatus(id: string, status: OrgStatus, irsRulingDate?: string | null): Promise<void> {
  const updated = await getDb()
    .update(organizations)
    .set({ status, reviewedAt: new Date(), ...(irsRulingDate !== undefined && { irsRulingDate }) })
    .where(eq(organizations.id, id))
    .returning({ id: organizations.id });
  if (!updated.length) throw new Error(`Organization ${id} not found`);
}

export async function einExists(ein: string): Promise<boolean> {
  const rows = await getDb().select({ id: organizations.id }).from(organizations).where(activeEin(ein)).limit(1);
  return rows.length > 0;
}

export async function get990(orgId: string) {
  const [file] = await getDb().select().from(form990Files).where(eq(form990Files.orgId, orgId));
  return file;
}

// --- Imported (unclaimed) listings --------------------------------------------------------

async function filingsByEin(eins: string[]): Promise<Map<string, IrsFiling[]>> {
  const byEin = new Map<string, IrsFiling[]>();
  if (!eins.length) return byEin;
  const rows = await getDb()
    .select()
    .from(irsFilings)
    .where(inArray(irsFilings.ein, eins))
    .orderBy(desc(irsFilings.taxYear));
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

export async function listImported(): Promise<ImportedListing[]> {
  const rows = await getDb().select().from(importedOrgs);
  const filings = await filingsByEin([...new Set(rows.flatMap((r) => (r.ein ? [r.ein] : [])))]);
  return rows.map((r) => toListing(r, r.ein ? (filings.get(r.ein) ?? []) : []));
}

export async function getImportedBySlug(slug: string): Promise<ImportedListing | undefined> {
  const [row] = await getDb().select().from(importedOrgs).where(eq(importedOrgs.slug, slug));
  if (!row) return undefined;
  const filings = row.ein ? ((await filingsByEin([row.ein])).get(row.ein) ?? []) : [];
  return toListing(row, filings);
}

export function profileEntry(o: Organization): DirectoryEntry {
  const f = o.financials;
  return {
    kind: "profile",
    id: o.id,
    href: `/organizations/${o.slug}`,
    name: o.name,
    summary: o.tagline,
    city: o.city,
    state: o.state,
    cause: o.cause,
    tags: o.focusAreas,
    yearFounded: o.yearFounded,
    budget: f.totalExpenses,
    budgetYear: f.fiscalYear,
    revenue: f.totalRevenue,
    netAssets: f.netAssets,
    programShare: f.totalExpenses ? f.programExpenses / f.totalExpenses : undefined,
    staff: f.employees,
    audited: o.stewardship.independentAudit,
    needs: o.fundingNeeds,
    example: o.example,
    irsSince: o.irsRulingDate,
    searchText: searchWords(
      [o.name, o.tagline, o.mission, o.city, ...o.focusAreas, ...o.networks.map((n) => n.name)].join(" "),
    ).join(" "),
  };
}

export function importedEntry(l: ImportedListing): DirectoryEntry {
  const latest = l.filings.find((f) => f.totalExpenses != null);
  return {
    kind: "imported",
    id: l.id,
    href: `/listings/${l.slug}`,
    name: l.name,
    summary: l.mission ?? (l.tags.length ? l.tags.join(" · ") : "Unclaimed listing imported from a public directory."),
    city: l.city ?? undefined,
    state: l.state,
    cause: l.cause,
    tags: l.tags,
    budget: latest?.totalExpenses ?? undefined,
    budgetYear: latest ? String(latest.taxYear) : undefined,
    revenue: latest?.totalRevenue ?? undefined,
    netAssets: latest?.netAssets ?? undefined,
    irsSince: l.irsRulingDate ?? undefined,
    needs: [],
    // The IRS name and an English rendering let funders search "Center for a New Economy" for a Spanish name.
    searchText: searchWords(
      [l.name, toEnglish(l.name), l.irsName, l.mission, l.city, ...l.tags].filter(Boolean).join(" "),
    ).join(" "),
  };
}

/** Everything the directory shows: full profiles first-class, unclaimed listings alongside. */
export async function listDirectory(): Promise<DirectoryEntry[]> {
  const [profiles, imported] = await Promise.all([listApproved(), listImported()]);
  return [...profiles.map(profileEntry), ...imported.map(importedEntry)];
}
