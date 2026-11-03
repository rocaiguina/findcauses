import "server-only";
import { cookies } from "next/headers";
import { inferApproaches } from "./approach";
import { searchWords } from "./format";
import { toEnglish } from "./imports";
import type { DirectoryEntry, ImportedListing, Me, Organization, ProfileForm } from "./types";

// Data comes from the Django backend (backend/). Server code calls it directly at BACKEND_URL; the browser
// reaches the same API through this site's /api/* rewrite (next.config.ts), so session cookies stay first-party.

export const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function api<T>(path: string, { auth = false }: { auth?: boolean } = {}): Promise<T | undefined> {
  const headers: HeadersInit = { Accept: "application/json" };
  // Forward the visitor's session so the backend knows who is signed in.
  if (auth) headers.Cookie = (await cookies()).toString();
  const res = await fetch(`${BACKEND_URL}/api/${path}`, { headers, cache: "no-store" });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`Backend ${res.status} for /api/${path}`);
  return res.json() as Promise<T>;
}

type DirectoryPayload = { organizations: Organization[]; listings: ImportedListing[] };

/** Everything the directory shows: published profiles, and IRS-based pages for organizations without one. */
export async function listDirectory(): Promise<DirectoryEntry[]> {
  const data = await api<DirectoryPayload>("directory");
  if (!data) return [];
  return [...data.organizations.map(profileEntry), ...data.listings.map(importedEntry)];
}

export async function getApprovedBySlug(slug: string): Promise<Organization | undefined> {
  return api<Organization>(`organizations/${encodeURIComponent(slug)}`);
}

export async function getImportedBySlug(slug: string): Promise<ImportedListing | undefined> {
  return api<ImportedListing>(`listings/${encodeURIComponent(slug)}`);
}

/** The signed-in person and the organizations they manage. */
export async function getMe(): Promise<Me> {
  return (await api<Me>("me", { auth: true })) ?? { user: null, claims: [] };
}

/** The profile form's values for an organization the signed-in person manages, or undefined if they don't. */
export async function getProfileForm(slug: string): Promise<ProfileForm | undefined> {
  const headers = { Accept: "application/json", Cookie: (await cookies()).toString() };
  const res = await fetch(`${BACKEND_URL}/api/me/organizations/${encodeURIComponent(slug)}/profile`, {
    headers,
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403 || res.status === 404) return undefined;
  if (!res.ok) throw new Error(`Backend ${res.status} for profile form`);
  return res.json();
}

export async function addSubscription(email: string, query: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, query }),
  });
  if (!res.ok) throw new Error(`Backend ${res.status} saving a subscription`);
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
    irsSince: o.irsRulingDate,
    claimed: o.claimed,
    certified: o.certified,
    searchText: searchWords(
      [
        o.name,
        o.ein.replace(/\D/g, ""),
        o.tagline,
        o.mission,
        o.city,
        ...o.focusAreas,
        ...o.networks.map((n) => n.name),
      ].join(" "),
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
    summary: l.mission ?? (l.tags.length ? l.tags.join(" · ") : "IRS-registered nonprofit."),
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
    claimed: l.claimed,
    certified: false,
    // The IRS name and an English rendering let funders search "Center for a New Economy" for a Spanish name.
    searchText: searchWords(
      [l.name, l.ein, toEnglish(l.name), l.irsName, l.mission, l.city, ...l.tags].filter(Boolean).join(" "),
    ).join(" "),
  };
}
