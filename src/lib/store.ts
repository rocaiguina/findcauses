import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { loadImported, loadImportedBySlug } from "@/db/imported";
import { activeEin, insertOrganization, loadOrganizations, type Form990Upload, type NewOrganization } from "@/db/organizations";
import { form990Files, organizations, subscriptions } from "@/db/schema";
import { inferApproaches } from "./approach";
import { searchWords } from "./format";
import { toEnglish } from "./imports";
import { getApplication, getApplicationPdf, listApplications, saveApplication, saveSubscription } from "./inbox";
import { readSnapshot } from "./snapshot";
import type { DirectoryEntry, ImportedListing, Organization, OrgStatus } from "./types";

// Two data sources: Postgres when a database URL is configured (local development), otherwise the
// read-only JSON snapshot plus a Netlify Blobs inbox for submissions (the deployed site, for now).
// DATA_SOURCE=snapshot forces the snapshot, so a stray local DATABASE_URL can't leak into a deploy.
export const usingSnapshot =
  process.env.DATA_SOURCE === "snapshot" || !(process.env.DATABASE_URL ?? process.env.NETLIFY_DB_URL);

const byName = (a: Organization, b: Organization) => a.name.localeCompare(b.name);
const newestFirst = (a: Organization, b: Organization) => b.submittedAt.localeCompare(a.submittedAt);

export async function listApproved(): Promise<Organization[]> {
  if (usingSnapshot) return [...readSnapshot().organizations].sort(byName);
  return (await loadOrganizations(getDb(), eq(organizations.status, "approved"))).sort(byName);
}

export async function listByStatus(status: OrgStatus): Promise<Organization[]> {
  if (usingSnapshot) {
    if (status === "approved") return [...readSnapshot().organizations].sort(newestFirst);
    return status === "pending" ? (await listApplications()).sort(newestFirst) : [];
  }
  return (await loadOrganizations(getDb(), eq(organizations.status, status))).sort(newestFirst);
}

export async function getApprovedBySlug(slug: string): Promise<Organization | undefined> {
  if (usingSnapshot) return readSnapshot().organizations.find((o) => o.slug === slug);
  const [org] = await loadOrganizations(getDb(), and(eq(organizations.slug, slug), eq(organizations.status, "approved")));
  return org;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getById(id: string): Promise<Organization | undefined> {
  if (!UUID.test(id)) return undefined; // avoid a Postgres cast error on malformed URLs
  if (usingSnapshot) return readSnapshot().organizations.find((o) => o.id === id) ?? (await getApplication(id));
  const [org] = await loadOrganizations(getDb(), eq(organizations.id, id));
  return org;
}

export async function insert(org: NewOrganization, file: Form990Upload): Promise<string> {
  if (usingSnapshot) return saveApplication(org, file);
  return insertOrganization(getDb(), org, file);
}

export async function setStatus(id: string, status: OrgStatus, irsRulingDate?: string | null): Promise<void> {
  if (usingSnapshot) throw new Error("Approving applications needs a database; the site is running on the snapshot.");
  const updated = await getDb()
    .update(organizations)
    .set({ status, reviewedAt: new Date(), ...(irsRulingDate !== undefined && { irsRulingDate }) })
    .where(eq(organizations.id, id))
    .returning({ id: organizations.id });
  if (!updated.length) throw new Error(`Organization ${id} not found`);
}

export async function einExists(ein: string): Promise<boolean> {
  if (usingSnapshot)
    return readSnapshot().organizations.some((o) => o.ein === ein) || (await listApplications()).some((o) => o.ein === ein);
  const rows = await getDb().select({ id: organizations.id }).from(organizations).where(activeEin(ein)).limit(1);
  return rows.length > 0;
}

export async function get990(orgId: string): Promise<{ fileName: string; data: Uint8Array } | undefined> {
  if (usingSnapshot) return getApplicationPdf(orgId);
  const [file] = await getDb().select().from(form990Files).where(eq(form990Files.orgId, orgId));
  return file && { fileName: file.fileName, data: file.data };
}

export async function addSubscription(email: string, query: string): Promise<void> {
  if (usingSnapshot) return saveSubscription(email, query);
  await getDb().insert(subscriptions).values({ email, query }).onConflictDoNothing();
}

export async function listImported(): Promise<ImportedListing[]> {
  return usingSnapshot ? readSnapshot().imported : loadImported(getDb());
}

export async function getImportedBySlug(slug: string): Promise<ImportedListing | undefined> {
  return usingSnapshot ? readSnapshot().imported.find((l) => l.slug === slug) : loadImportedBySlug(getDb(), slug);
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
    approaches: inferApproaches({
      name: o.name,
      text: [o.tagline, o.mission, ...o.focusAreas, ...o.fundingNeeds.map((n) => n.title)].join(" "),
    }),
    partners: o.networks.map((n) => n.name),
    example: o.example,
    irsSince: o.irsRulingDate,
    searchText: searchWords(
      [o.name, o.tagline, o.mission, o.city, ...o.focusAreas, ...o.networks.map((n) => n.name)].join(" "),
    ).join(" "),
  };
}

/** Revenue change from the earliest to the latest IRS filing, at least two years apart. */
function revenueGrowth(l: ImportedListing): DirectoryEntry["growth"] {
  const withRevenue = l.filings.filter((f) => f.totalRevenue != null && f.totalRevenue > 0);
  const latest = withRevenue[0];
  const earliest = withRevenue[withRevenue.length - 1];
  if (!latest || !earliest || latest.taxYear - earliest.taxYear < 2) return undefined;
  return {
    fromYear: earliest.taxYear,
    toYear: latest.taxYear,
    pct: Math.round(((latest.totalRevenue! - earliest.totalRevenue!) / earliest.totalRevenue!) * 100),
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
    needs: l.needs ?? [],
    approaches: inferApproaches({
      name: l.name,
      text: [l.mission, ...l.tags, ...(l.needs ?? []).map((n) => `${n.title} ${n.description}`)].join(" "),
      ntee: l.nteeCode,
    }),
    partners: [],
    growth: revenueGrowth(l),
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
