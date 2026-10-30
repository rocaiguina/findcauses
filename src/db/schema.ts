import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { CAUSES, type CauseSlug } from "../lib/causes";

export const orgStatus = pgEnum("org_status", ["pending", "approved", "rejected"]);
export const cause = pgEnum("cause", CAUSES.map((c) => c.slug) as [CauseSlug, ...CauseSlug[]]);

const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => "bytea",
  toDriver: (v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength),
});
const money = (name: string) => bigint(name, { mode: "number" }).notNull();

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    status: orgStatus("status").notNull().default("pending"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    sample: boolean("sample").notNull().default(false),

    name: text("name").notNull(),
    tagline: text("tagline").notNull(),
    ein: text("ein").notNull(),
    website: text("website").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    yearFounded: integer("year_founded").notNull(),
    geographicScope: text("geographic_scope").notNull(),
    contactName: text("contact_name").notNull(),
    contactTitle: text("contact_title").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),

    cause: cause("cause").notNull(),
    focusAreas: text("focus_areas").array().notNull().default(sql`'{}'::text[]`),
    mission: text("mission").notNull(),

    independentAudit: boolean("independent_audit").notNull(),
    auditor: text("auditor").notNull(),
    conflictOfInterestPolicy: boolean("conflict_of_interest_policy").notNull(),
    whistleblowerPolicy: boolean("whistleblower_policy").notNull(),
    documentRetentionPolicy: boolean("document_retention_policy").notNull(),
    funderReporting: text("funder_reporting").notNull(),
    impactMeasurement: text("impact_measurement").notNull(),
    restrictedFunds: text("restricted_funds").notNull(),
  },
  (t) => [
    // An EIN can only be listed or under review once; rejected orgs may reapply.
    uniqueIndex("organizations_ein_active_idx").on(t.ein).where(sql`${t.status} <> 'rejected'`),
    index("organizations_status_cause_idx").on(t.status, t.cause),
  ],
);

/** One row per Form 990 filing year. The profile shows the most recent. */
export const financials = pgTable(
  "financials",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fiscalYear: text("fiscal_year").notNull(),
    totalRevenue: money("total_revenue"),
    contributions: money("contributions"),
    programRevenue: money("program_revenue"),
    totalExpenses: money("total_expenses"),
    programExpenses: money("program_expenses"),
    managementExpenses: money("management_expenses"),
    fundraisingExpenses: money("fundraising_expenses"),
    totalAssets: money("total_assets"),
    netAssets: money("net_assets"),
    employees: integer("employees").notNull(),
    volunteers: integer("volunteers").notNull(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.fiscalYear] })],
);

/** The uploaded 990 PDF, kept out of `organizations` so list queries never load file bytes. */
export const form990Files = pgTable("form990_files", {
  orgId: uuid("org_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  data: bytea("data").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

// Repeatable profile sections. `position` preserves the order the organization entered them in.
const child = <T extends Record<string, ReturnType<typeof text>>>(name: string, cols: T) =>
  pgTable(
    name,
    {
      id: serial("id").primaryKey(),
      orgId: uuid("org_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
      position: integer("position").notNull(),
      ...cols,
    },
    (t) => [index(`${name}_org_idx`).on(t.orgId, t.position)],
  );

export const boardMembers = child("board_members", {
  name: text("name").notNull(),
  role: text("role").notNull(),
  affiliation: text("affiliation").notNull(),
});

export const milestones = child("milestones", {
  year: text("year").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
});

export const impactMetrics = child("impact_metrics", {
  label: text("label").notNull(),
  value: text("value").notNull(),
});

export const networkTies = child("network_ties", {
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
});

export const roadmapItems = child("roadmap_items", {
  timeframe: text("timeframe").notNull(),
  goal: text("goal").notNull(),
  description: text("description").notNull(),
});
