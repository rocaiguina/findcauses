// Example data so the funder flow can be demoed before real nonprofits post their own:
// - fictional organizations with posted impact opportunities, flagged `example`;
// - example impact opportunities on real imported listings, flagged `example` and labeled
//   "added by FindCauses, not posted by the organization". Amounts and timeframes are left unknown.
//
// Usage: npm run examples:load   (replaces existing examples)
//        npm run examples:clear
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { insertOrganization, type NewOrganization } from "../src/db/organizations";
import { importedOrgs, listingNeeds, organizations } from "../src/db/schema";
import { slugify } from "../src/lib/format";
import { nameKey } from "../src/lib/imports";
import type { CauseSlug } from "../src/lib/causes";
import type { Financials, FundingNeed } from "../src/lib/types";

loadEnvConfig(process.cwd());

function fin(expenses: number, opts: { program?: number; employees: number; volunteers: number }): Financials {
  const programShare = opts.program ?? 0.8;
  const programExpenses = Math.round(expenses * programShare);
  const fundraisingExpenses = Math.round(expenses * 0.07);
  const totalRevenue = Math.round(expenses * 1.05);
  const contributions = Math.round(totalRevenue * 0.82);
  const totalAssets = Math.round(expenses * 1.3);
  return {
    fiscalYear: "2024",
    totalRevenue,
    contributions,
    programRevenue: Math.round((totalRevenue - contributions) * 0.6),
    totalExpenses: expenses,
    programExpenses,
    managementExpenses: expenses - programExpenses - fundraisingExpenses,
    fundraisingExpenses,
    totalAssets,
    netAssets: Math.round(totalAssets * 0.7),
    employees: opts.employees,
    volunteers: opts.volunteers,
  };
}

type Example = {
  name: string;
  tagline: string;
  city: string;
  cause: CauseSlug;
  founded: number;
  irsSince: string;
  focusAreas: string[];
  mission: string;
  expenses: number;
  employees: number;
  volunteers: number;
  audited: boolean;
  contact: { name: string; title: string };
  board: [string, string, string][];
  trackRecord: [string, string, string][];
  needs: FundingNeed[];
};

const EXAMPLES: Example[] = [
  {
    name: "Aula Abierta Bayamón",
    tagline: "After-school STEM tutoring for public school students.",
    city: "Bayamón",
    cause: "education",
    founded: 2009,
    irsSince: "2010-03-01",
    focusAreas: ["STEM", "Tutoring", "Public schools"],
    mission: "We close math and science gaps for public school students in Bayamón and Cataño through free, small-group tutoring led by trained college students.",
    expenses: 3_200_000,
    employees: 34,
    volunteers: 120,
    audited: true,
    contact: { name: "Marisol Ortega", title: "Executive Director" },
    board: [["Javier Colón", "Chair", "Engineer"], ["Ana Rivera", "Treasurer", "CPA"], ["Teresa Vélez", "Secretary", "Retired principal"]],
    trackRecord: [["2016", "Reached 10 schools", "Math scores rose 18 points in participating schools."], ["2023", "2,400 students a year", "Expanded to Cataño with a second learning hub."]],
    needs: [
      { title: "STEM tutoring in 7 more public schools", type: "program", amount: 150_000, timeframe: "2026–2027", description: "Hire and train 20 college tutors and buy lab kits to serve 700 more students in Bayamón and Cataño." },
      { title: "Teacher fellowship for math educators", type: "capacity", amount: 85_000, timeframe: "2026", description: "A one-year fellowship that coaches 40 public school math teachers in hands-on methods." },
    ],
  },
  {
    name: "Salud en Ruta",
    tagline: "Mobile health clinics for rural mountain communities.",
    city: "Utuado",
    cause: "public-health",
    founded: 2012,
    irsSince: "2013-06-01",
    focusAreas: ["Primary care", "Rural health", "Diabetes"],
    mission: "We bring primary care, diabetes screening and medicines to mountain communities in central Puerto Rico that are more than an hour from a clinic.",
    expenses: 4_800_000,
    employees: 41,
    volunteers: 60,
    audited: true,
    contact: { name: "Dr. Luis Matos", title: "Medical Director" },
    board: [["Carmen Ruiz", "Chair", "Physician"], ["Pedro Santiago", "Treasurer", "Bank officer"], ["Iris Feliciano", "Secretary", "Community leader"]],
    trackRecord: [["2018", "Three mobile units", "11,000 patient visits a year across 6 municipalities."], ["2022", "Diabetes program", "62% of enrolled patients brought blood sugar under control."]],
    needs: [
      { title: "Second diabetes care van for Utuado and Jayuya", type: "capital", amount: 220_000, timeframe: "2026", description: "Buy and equip a van so diabetes screening and follow-up reach 1,500 more people a year." },
      { title: "Community health workers program", type: "program", amount: 180_000, timeframe: "2026–2027", description: "Train and pay 8 community health workers to follow up with patients at home between clinic visits." },
    ],
  },
  {
    name: "Cooperativa Raíces Emprendedoras",
    tagline: "Small business loans and coaching for women entrepreneurs.",
    city: "Caguas",
    cause: "economy",
    founded: 2014,
    irsSince: "2015-01-01",
    focusAreas: ["Microloans", "Women entrepreneurs", "Coaching"],
    mission: "We help women in eastern Puerto Rico start and grow small businesses with patient loans, coaching and a peer network.",
    expenses: 2_100_000,
    employees: 18,
    volunteers: 45,
    audited: true,
    contact: { name: "Gloria Benítez", title: "Executive Director" },
    board: [["Rosa Medina", "Chair", "Business owner"], ["Héctor Ramos", "Treasurer", "Credit union manager"], ["Lucía Pagán", "Secretary", "Attorney"]],
    trackRecord: [["2019", "500th loan", "94% repayment rate across all loans."], ["2024", "Digital sales program", "120 businesses selling online for the first time."]],
    needs: [
      { title: "Loan capital for 60 new women-owned businesses", type: "program", amount: 300_000, timeframe: "2026", description: "Seed a revolving loan fund for first-time entrepreneurs in Caguas, Gurabo and Juncos." },
      { title: "General operating support", type: "general_operating", amount: 120_000, timeframe: "2026", description: "Unrestricted support for coaching staff and the peer mentoring network." },
    ],
  },
  {
    name: "Hogar Firme Loíza",
    tagline: "Hurricane-resistant home repairs for low-income families.",
    city: "Loíza",
    cause: "housing",
    founded: 2018,
    irsSince: "2018-11-01",
    focusAreas: ["Home repair", "Resilience", "Land titles"],
    mission: "We repair and harden homes for low-income families in Loíza and help them secure the property titles they need to qualify for aid.",
    expenses: 1_600_000,
    employees: 14,
    volunteers: 200,
    audited: false,
    contact: { name: "Ramón Carrasquillo", title: "Program Director" },
    board: [["Yolanda Parrilla", "Chair", "Community organizer"], ["Edwin Ayala", "Treasurer", "Contractor"], ["Sonia Cepeda", "Secretary", "Social worker"]],
    trackRecord: [["2020", "100 roofs replaced", "All withstood Hurricane Fiona in 2022."], ["2023", "Title clinics", "230 families received property titles."]],
    needs: [
      { title: "Roof replacements for 40 homes", type: "capital", amount: 400_000, timeframe: "2026", description: "Replace blue-tarp roofs with hurricane-rated concrete and metal roofs for 40 families." },
    ],
  },
  {
    name: "Red de Respuesta Comunitaria del Este",
    tagline: "Neighborhood emergency hubs with solar power and supplies.",
    city: "Humacao",
    cause: "disaster-relief",
    founded: 2017,
    irsSince: "2018-02-01",
    focusAreas: ["Emergency preparedness", "Solar hubs", "Community response"],
    mission: "We equip community centers in eastern Puerto Rico to become emergency hubs with solar power, water, supplies and trained volunteers.",
    expenses: 2_700_000,
    employees: 22,
    volunteers: 640,
    audited: true,
    contact: { name: "Natalia Rosado", title: "Executive Director" },
    board: [["Carlos Figueroa", "Chair", "Emergency manager"], ["Milagros Torres", "Treasurer", "Accountant"], ["Rafael Ortiz", "Secretary", "Pastor"]],
    trackRecord: [["2019", "First 5 hubs", "Served 9,000 residents after the 2020 earthquakes."], ["2022", "Fiona response", "Hubs delivered water and power within 24 hours."]],
    needs: [
      { title: "Solar and battery systems for 6 community hubs", type: "capital", amount: 360_000, timeframe: "2026", description: "Install solar panels and batteries so hubs keep refrigerated medicine and phones charged during outages." },
      { title: "Hurricane-season readiness training", type: "emergency", amount: 60_000, timeframe: "Before June 2026", description: "Train 300 volunteers in first aid, logistics and wellness checks for elderly neighbors." },
    ],
  },
  {
    name: "Taller de Arte y Memoria",
    tagline: "Arts education and cultural heritage for youth in Ponce.",
    city: "Ponce",
    cause: "arts-culture",
    founded: 2006,
    irsSince: "2007-04-01",
    focusAreas: ["Youth arts", "Bomba and plena", "Oral history"],
    mission: "We teach young people in Ponce traditional and contemporary arts while recording the stories of their elders.",
    expenses: 1_150_000,
    employees: 11,
    volunteers: 80,
    audited: false,
    contact: { name: "Iván Maldonado", title: "Artistic Director" },
    board: [["Elena Quiñones", "Chair", "Museum curator"], ["Gabriel Soto", "Treasurer", "Small business owner"], ["Daisy Nieves", "Secretary", "Teacher"]],
    trackRecord: [["2015", "Youth ensemble", "Performed at 40 festivals across the island."], ["2024", "Memory archive", "300 recorded oral histories made public."]],
    needs: [
      { title: "Bomba and plena program in 5 schools", type: "program", amount: 75_000, timeframe: "2026–2027", description: "Weekly classes and a year-end showcase for 250 students." },
    ],
  },
  {
    name: "Costa Viva",
    tagline: "Coastal restoration and climate adaptation in Vieques and Culebra.",
    city: "Vieques",
    cause: "climate-change",
    founded: 2011,
    irsSince: "2012-08-01",
    focusAreas: ["Mangroves", "Coral reefs", "Climate adaptation"],
    mission: "We restore mangroves and reefs that protect island communities from storm surge, and train local residents to lead the work.",
    expenses: 1_900_000,
    employees: 16,
    volunteers: 350,
    audited: true,
    contact: { name: "Sofía Encarnación", title: "Science Director" },
    board: [["Manuel Acevedo", "Chair", "Marine biologist"], ["Laura Bonilla", "Treasurer", "CPA"], ["José Cintrón", "Secretary", "Fisherman"]],
    trackRecord: [["2017", "40,000 mangroves planted", "72% survival rate after five years."], ["2023", "Reef nursery", "8,000 coral fragments outplanted."]],
    needs: [
      { title: "Mangrove buffer for Esperanza neighborhood", type: "program", amount: 140_000, timeframe: "2026–2028", description: "Plant and monitor 15,000 mangroves along the shoreline that floods during storms." },
    ],
  },
  {
    name: "Voces Jóvenes PR",
    tagline: "Civic leadership and voter education for young adults.",
    city: "San Juan",
    cause: "civil-rights",
    founded: 2015,
    irsSince: "2016-05-01",
    focusAreas: ["Civic education", "Youth leadership", "Voter access"],
    mission: "We train young Puerto Ricans to understand public decisions that affect them and take part in them.",
    expenses: 950_000,
    employees: 9,
    volunteers: 150,
    audited: false,
    contact: { name: "Andrea Lugo", title: "Executive Director" },
    board: [["Omar Vázquez", "Chair", "Law professor"], ["Patricia Marrero", "Treasurer", "Nonprofit CFO"], ["Kevin Rosa", "Secretary", "Alumnus"]],
    trackRecord: [["2020", "Youth voter guide", "Reached 60,000 first-time voters."], ["2024", "Leadership academy", "180 graduates in municipal advisory roles."]],
    needs: [
      { title: "Municipal youth councils in 10 towns", type: "program", amount: 95_000, timeframe: "2026", description: "Set up and support youth advisory councils that report to mayors twice a year." },
    ],
  },
];

/** Example impact opportunities for real imported listings, keyed by the listing's exact name. */
const LISTING_EXAMPLES: Record<string, Omit<FundingNeed, "example">[]> = {
  "Centro para una Nueva Economía": [
    {
      title: "Living wage calculator",
      type: "program",
      amount: null,
      timeframe: null,
      description:
        "A public, regularly updated calculator of what households of different sizes need to earn to cover basic costs in each Puerto Rico municipality, to inform wage policy, employers and public benefits.",
    },
    {
      title: "Research to lessen income inequality in Puerto Rico",
      type: "program",
      amount: null,
      timeframe: null,
      description:
        "Research on what drives income inequality in Puerto Rico and which tax, labor and public-benefit policies could reduce it, published as briefs for lawmakers and the public.",
    },
  ],
};

async function clear() {
  const db = getDb();
  const removed = await db.delete(organizations).where(eq(organizations.example, true)).returning({ id: organizations.id });
  await db.delete(listingNeeds).where(eq(listingNeeds.example, true));
  return removed.length;
}

async function loadListingExamples(): Promise<number> {
  const db = getDb();
  let count = 0;
  for (const [name, needs] of Object.entries(LISTING_EXAMPLES)) {
    const [listing] = await db.select({ id: importedOrgs.id }).from(importedOrgs).where(eq(importedOrgs.nameKey, nameKey(name)));
    if (!listing) {
      console.warn(`Skipped example opportunities for "${name}": listing not imported.`);
      continue;
    }
    await db
      .insert(listingNeeds)
      .values(needs.map((n, position) => ({ ...n, importedOrgId: listing.id, position, example: true })));
    count += needs.length;
  }
  return count;
}

async function main() {
  const removed = await clear();
  if (process.argv.includes("--clear")) {
    console.log(`Removed ${removed} example organizations and all example opportunities on real listings.`);
    return;
  }
  for (const [i, e] of EXAMPLES.entries()) {
    const org: NewOrganization = {
      slug: slugify(e.name),
      status: "approved",
      reviewedAt: new Date(),
      example: true,
      name: e.name,
      tagline: e.tagline,
      ein: `00-00001${String(i + 1).padStart(2, "0")}`,
      website: "https://example.org",
      city: e.city,
      state: "PR",
      yearFounded: e.founded,
      geographicScope: "Puerto Rico",
      contact: { ...e.contact, email: "contact@example.org", phone: "(787) 555-0100" },
      cause: e.cause,
      focusAreas: e.focusAreas,
      mission: e.mission,
      impactMetrics: [],
      trackRecord: e.trackRecord.map(([year, title, description]) => ({ year, title, description })),
      networks: [],
      roadmap: [],
      fundingNeeds: e.needs,
      financials: fin(e.expenses, { employees: e.employees, volunteers: e.volunteers }),
      board: e.board.map(([name, role, affiliation]) => ({ name, role, affiliation })),
      stewardship: {
        independentAudit: e.audited,
        auditor: e.audited ? "Example Audit Partners" : "Reviewed financial statements; audit planned",
        conflictOfInterestPolicy: true,
        whistleblowerPolicy: true,
        documentRetentionPolicy: true,
        funderReporting: "Semiannual narrative and financial reports.",
        impactMeasurement: "Program outcomes tracked against yearly targets.",
        restrictedFunds: "Restricted gifts tracked by project.",
      },
      irsRulingDate: e.irsSince,
    };
    await insertOrganization(getDb(), org);
  }
  const projects = EXAMPLES.reduce((n, e) => n + e.needs.length, 0);
  const listingProjects = await loadListingExamples();
  console.log(
    `Loaded ${EXAMPLES.length} example organizations with ${projects} opportunities, and ${listingProjects} example opportunities on real listings (replaced ${removed} organizations).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
