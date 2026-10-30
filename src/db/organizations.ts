import { and, desc, eq, inArray, like, or, type SQL } from "drizzle-orm";
import type { DB } from "./index";
import {
  boardMembers,
  financials,
  form990Files,
  impactMetrics,
  milestones,
  networkTies,
  organizations,
  roadmapItems,
} from "./schema";
import type { Organization } from "../lib/types";

// Maps between the normalized tables and the `Organization` shape the UI renders.
// No "server-only" import here so scripts (seed) can share it.

export type NewOrganization = Omit<
  Organization,
  "id" | "slug" | "status" | "submittedAt" | "reviewedAt" | "form990"
> & {
  slug: string;
  status?: Organization["status"];
  submittedAt?: Date;
  reviewedAt?: Date;
};

export type Form990Upload = { fileName: string; data: Uint8Array };

type OrgRow = typeof organizations.$inferSelect;

const ordered = <T extends { orgId: string; position: number }>(rows: T[]) => {
  const byOrg = new Map<string, T[]>();
  for (const r of [...rows].sort((a, b) => a.position - b.position)) {
    byOrg.set(r.orgId, [...(byOrg.get(r.orgId) ?? []), r]);
  }
  return (orgId: string) => byOrg.get(orgId) ?? [];
};

/** Loads full profiles for the organizations matching `where`. */
export async function loadOrganizations(db: DB, where?: SQL): Promise<Organization[]> {
  const rows = await db
    .select({ org: organizations, form990FileName: form990Files.fileName })
    .from(organizations)
    .leftJoin(form990Files, eq(form990Files.orgId, organizations.id))
    .where(where);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.org.id);

  const [fin, board, track, metrics, networks, roadmap] = await Promise.all([
    db
      .selectDistinctOn([financials.orgId])
      .from(financials)
      .where(inArray(financials.orgId, ids))
      .orderBy(financials.orgId, desc(financials.fiscalYear)),
    db.select().from(boardMembers).where(inArray(boardMembers.orgId, ids)),
    db.select().from(milestones).where(inArray(milestones.orgId, ids)),
    db.select().from(impactMetrics).where(inArray(impactMetrics.orgId, ids)),
    db.select().from(networkTies).where(inArray(networkTies.orgId, ids)),
    db.select().from(roadmapItems).where(inArray(roadmapItems.orgId, ids)),
  ]);

  const finByOrg = new Map(fin.map((f) => [f.orgId, f]));
  const boardOf = ordered(board);
  const trackOf = ordered(track);
  const metricsOf = ordered(metrics);
  const networksOf = ordered(networks);
  const roadmapOf = ordered(roadmap);

  return rows.flatMap(({ org, form990FileName }) => {
    const f = finByOrg.get(org.id);
    // A profile without a filing year is incomplete; skip rather than render zeros.
    if (!f) return [];
    return [toOrganization(org, f, form990FileName, {
      board: boardOf(org.id).map(({ name, role, affiliation }) => ({ name, role, affiliation })),
      trackRecord: trackOf(org.id).map(({ year, title, description }) => ({ year, title, description })),
      impactMetrics: metricsOf(org.id).map(({ label, value }) => ({ label, value })),
      networks: networksOf(org.id).map(({ name, type, description }) => ({ name, type, description })),
      roadmap: roadmapOf(org.id).map(({ timeframe, goal, description }) => ({ timeframe, goal, description })),
    })];
  });
}

function toOrganization(
  org: OrgRow,
  f: typeof financials.$inferSelect,
  form990FileName: string | null,
  lists: Pick<Organization, "board" | "trackRecord" | "impactMetrics" | "networks" | "roadmap">,
): Organization {
  return {
    id: org.id,
    slug: org.slug,
    status: org.status,
    submittedAt: org.submittedAt.toISOString(),
    reviewedAt: org.reviewedAt?.toISOString(),
    sample: org.sample,
    name: org.name,
    tagline: org.tagline,
    ein: org.ein,
    website: org.website,
    city: org.city,
    state: org.state,
    yearFounded: org.yearFounded,
    geographicScope: org.geographicScope,
    contact: { name: org.contactName, title: org.contactTitle, email: org.contactEmail, phone: org.contactPhone },
    cause: org.cause,
    focusAreas: org.focusAreas,
    mission: org.mission,
    stewardship: {
      independentAudit: org.independentAudit,
      auditor: org.auditor,
      conflictOfInterestPolicy: org.conflictOfInterestPolicy,
      whistleblowerPolicy: org.whistleblowerPolicy,
      documentRetentionPolicy: org.documentRetentionPolicy,
      funderReporting: org.funderReporting,
      impactMeasurement: org.impactMeasurement,
      restrictedFunds: org.restrictedFunds,
    },
    financials: {
      fiscalYear: f.fiscalYear,
      totalRevenue: f.totalRevenue,
      contributions: f.contributions,
      programRevenue: f.programRevenue,
      totalExpenses: f.totalExpenses,
      programExpenses: f.programExpenses,
      managementExpenses: f.managementExpenses,
      fundraisingExpenses: f.fundraisingExpenses,
      totalAssets: f.totalAssets,
      netAssets: f.netAssets,
      employees: f.employees,
      volunteers: f.volunteers,
    },
    form990: form990FileName ? { fileName: form990FileName } : undefined,
    ...lists,
  };
}

/** Inserts a full profile in one transaction. Appends -2, -3… to the slug if it is taken. Returns the new id. */
export async function insertOrganization(db: DB, org: NewOrganization, file?: Form990Upload): Promise<string> {
  return db.transaction(async (tx) => {
    const taken = new Set(
      (
        await tx
          .select({ slug: organizations.slug })
          .from(organizations)
          .where(or(eq(organizations.slug, org.slug), like(organizations.slug, `${org.slug}-%`)))
      ).map((r) => r.slug),
    );
    let slug = org.slug;
    for (let i = 2; taken.has(slug); i++) slug = `${org.slug}-${i}`;

    const [{ id }] = await tx
      .insert(organizations)
      .values({
        slug,
        status: org.status ?? "pending",
        submittedAt: org.submittedAt,
        reviewedAt: org.reviewedAt,
        sample: org.sample ?? false,
        name: org.name,
        tagline: org.tagline,
        ein: org.ein,
        website: org.website,
        city: org.city,
        state: org.state,
        yearFounded: org.yearFounded,
        geographicScope: org.geographicScope,
        contactName: org.contact.name,
        contactTitle: org.contact.title,
        contactEmail: org.contact.email,
        contactPhone: org.contact.phone,
        cause: org.cause,
        focusAreas: org.focusAreas,
        mission: org.mission,
        ...org.stewardship,
      })
      .returning({ id: organizations.id });

    await tx.insert(financials).values({ orgId: id, ...org.financials });

    const withPos = <T extends object>(rows: T[]) => rows.map((r, position) => ({ ...r, orgId: id, position }));
    if (org.board.length) await tx.insert(boardMembers).values(withPos(org.board));
    if (org.trackRecord.length) await tx.insert(milestones).values(withPos(org.trackRecord));
    if (org.impactMetrics.length) await tx.insert(impactMetrics).values(withPos(org.impactMetrics));
    if (org.networks.length) await tx.insert(networkTies).values(withPos(org.networks));
    if (org.roadmap.length) await tx.insert(roadmapItems).values(withPos(org.roadmap));

    if (file) {
      await tx
        .insert(form990Files)
        .values({ orgId: id, fileName: file.fileName, sizeBytes: file.data.byteLength, data: file.data });
    }
    return id;
  });
}

export const activeEin = (ein: string) =>
  and(eq(organizations.ein, ein), inArray(organizations.status, ["pending", "approved"]));
