import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  date,
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
import { FUNDING_TYPES, ids } from "../lib/funding";

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

    /** IRS tax-exemption ruling date, looked up by EIN when the profile is approved. */
    irsRulingDate: date("irs_ruling_date"),

    /** Fictional organization used to demo the funder flow; labeled "Example" everywhere. */
    example: boolean("example").notNull().default(false),
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

// ---------------------------------------------------------------------------
// Imported listings: organizations pulled from third-party directories for development.
// They are unclaimed and unverified, live apart from `organizations`, and are wiped with
// `npm run imports:clear` before production.

export const importSource = pgEnum("import_source", ["pecunia", "observatorio"]);

export const importedOrgs = pgTable(
  "imported_orgs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** Lowercased, accent- and suffix-stripped name used to merge duplicates across sources. */
    nameKey: text("name_key").notNull().unique(),
    sources: importSource("sources").array().notNull(),
    city: text("city"),
    state: text("state").notNull().default("PR"),
    cause: cause("cause").notNull().default("other"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    mission: text("mission"),
    website: text("website"),
    email: text("email"),
    phone: text("phone"),
    /** Set when the IRS lookup matched this name to an EIN. */
    ein: text("ein"),
    irsName: text("irs_name"),
    irsMatchScore: integer("irs_match_score"),
    nteeCode: text("ntee_code"),
    /** Date the IRS recognized the organization as tax-exempt (its ruling date). */
    irsRulingDate: date("irs_ruling_date"),
    irsCheckedAt: timestamp("irs_checked_at", { withTimezone: true }),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("imported_orgs_ein_idx").on(t.ein)],
);

/** Form 990 summary figures from IRS data (via ProPublica Nonprofit Explorer), one row per EIN and tax year. */
export const irsFilings = pgTable(
  "irs_filings",
  {
    ein: text("ein").notNull(),
    taxYear: integer("tax_year").notNull(),
    formType: text("form_type").notNull(),
    totalRevenue: bigint("total_revenue", { mode: "number" }),
    totalExpenses: bigint("total_expenses", { mode: "number" }),
    contributions: bigint("contributions", { mode: "number" }),
    programRevenue: bigint("program_revenue", { mode: "number" }),
    totalAssets: bigint("total_assets", { mode: "number" }),
    totalLiabilities: bigint("total_liabilities", { mode: "number" }),
    netAssets: bigint("net_assets", { mode: "number" }),
    pdfUrl: text("pdf_url"),
  },
  (t) => [primaryKey({ columns: [t.ein, t.taxYear] })],
);

export const roadmapItems = child("roadmap_items", {
  timeframe: text("timeframe").notNull(),
  goal: text("goal").notNull(),
  description: text("description").notNull(),
});

// ---------------------------------------------------------------------------
// Marketplace: nonprofits post funding needs ("jobs"); funders keep a profile of what they fund.

export const fundingType = pgEnum("funding_type", ids(FUNDING_TYPES));

export const fundingNeeds = pgTable(
  "funding_needs",
  {
    id: serial("id").primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    type: fundingType("type").notNull(),
    /** Amount sought, in dollars. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    timeframe: text("timeframe").notNull(),
    description: text("description").notNull(),
  },
  (t) => [index("funding_needs_org_idx").on(t.orgId, t.position)],
);

/**
 * "Email me new opportunities that match": the only thing a funder ever saves. No profile or account;
 * `query` holds the finder answers exactly as they appear in the results URL.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    query: text("query").notNull(),
    /** Lets the recipient unsubscribe from a link without signing in. */
    unsubscribeToken: uuid("unsubscribe_token").notNull().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscriptions_email_query_idx").on(t.email, t.query)],
);

/**
 * Impact opportunities attached to imported (unclaimed) listings. Until an organization claims its listing,
 * these are added by FindCauses and flagged `example`, so they're labeled as not posted by the organization.
 */
export const listingNeeds = pgTable(
  "listing_needs",
  {
    id: serial("id").primaryKey(),
    importedOrgId: uuid("imported_org_id")
      .notNull()
      .references(() => importedOrgs.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    type: fundingType("type").notNull(),
    /** Unknown until the organization says; never invented. */
    amount: bigint("amount", { mode: "number" }),
    timeframe: text("timeframe"),
    description: text("description").notNull(),
    example: boolean("example").notNull().default(true),
  },
  (t) => [index("listing_needs_org_idx").on(t.importedOrgId, t.position)],
);
