// Inserts fictional sample organizations so the directory has content to show.
// Real submissions are never touched. Usage: npm run seed [-- --force]
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { insertOrganization, type NewOrganization } from "../src/db/organizations";
import { organizations } from "../src/db/schema";
import type { CauseSlug } from "../src/lib/causes";
import type { Financials, Stewardship } from "../src/lib/types";

loadEnvConfig(process.cwd());

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type FinOpts = {
  programShare?: number;
  fundShare?: number;
  contribShare?: number;
  revenueRatio?: number;
  assetsRatio?: number;
  employees: number;
  volunteers: number;
};

function fin(
  fy: string,
  expenses: number,
  { programShare = 0.8, fundShare = 0.07, contribShare = 0.75, revenueRatio = 1.06, assetsRatio = 1.4, employees, volunteers }: FinOpts,
): Financials {
  const programExpenses = Math.round(expenses * programShare);
  const fundraisingExpenses = Math.round(expenses * fundShare);
  const totalRevenue = Math.round(expenses * revenueRatio);
  const contributions = Math.round(totalRevenue * contribShare);
  const totalAssets = Math.round(expenses * assetsRatio);
  return {
    fiscalYear: fy,
    totalRevenue,
    contributions,
    programRevenue: Math.round((totalRevenue - contributions) * 0.7),
    totalExpenses: expenses,
    programExpenses,
    managementExpenses: expenses - programExpenses - fundraisingExpenses,
    fundraisingExpenses,
    totalAssets,
    netAssets: Math.round(totalAssets * 0.72),
    employees,
    volunteers,
  };
}

function stewardship(auditor: string, reporting: string, measurement: string, restricted: string): Stewardship {
  return {
    independentAudit: true,
    auditor,
    conflictOfInterestPolicy: true,
    whistleblowerPolicy: true,
    documentRetentionPolicy: true,
    funderReporting: reporting,
    impactMeasurement: measurement,
    restrictedFunds: restricted,
  };
}

type SampleOrg = Omit<NewOrganization, "slug" | "ein" | "website" | "contact" | "cause"> & { cause: CauseSlug };

const orgs: SampleOrg[] = [
  {
    name: "Coastal Resilience Alliance",
    tagline: "Helping Gulf and Atlantic towns adapt to rising seas.",
    city: "Charleston", state: "SC", yearFounded: 2009, geographicScope: "Regional — Southeast US coast",
    cause: "climate-change",
    focusAreas: ["Climate adaptation", "Flood mitigation", "Community planning"],
    mission: "We partner with small coastal municipalities to plan, fund and build climate adaptation projects, so that working communities can stay in the places they call home.",
    impactMetrics: [
      { label: "Towns with adopted adaptation plans", value: "41" },
      { label: "Public funding unlocked for local projects", value: "$212M" },
      { label: "Residents in protected flood zones", value: "380,000" },
    ],
    trackRecord: [
      { year: "2014", title: "First regional vulnerability atlas", description: "Mapped flood exposure for 60 towns; now used by three state agencies." },
      { year: "2019", title: "Resilience Fellows program", description: "Placed 28 planners inside under-resourced town halls." },
      { year: "2023", title: "$90M federal match secured", description: "Coordinated a joint application by nine municipalities for living shoreline projects." },
    ],
    networks: [
      { name: "Southeast Adaptation Network", type: "Coalition", description: "Founding member and co-chair of the policy committee." },
      { name: "State coastal universities", type: "Research partner", description: "Joint data program with two public university marine labs." },
    ],
    roadmap: [
      { timeframe: "2026", goal: "Expand to 15 new towns", description: "Prioritize communities under 20,000 residents with no planning staff." },
      { timeframe: "2027–2028", goal: "Open-source resilience toolkit", description: "Publish templates for grant applications and project scoping." },
    ],
    financials: fin("2025", 8_400_000, { employees: 46, volunteers: 120 }),
    board: [
      { name: "Marisa Delacroix", role: "Chair", affiliation: "Retired county emergency manager" },
      { name: "Thomas Okafor", role: "Treasurer", affiliation: "CPA, regional accounting firm" },
      { name: "Lena Hartwell", role: "Secretary", affiliation: "Coastal engineering professor" },
      { name: "Andre Fields", role: "Director", affiliation: "Mayor, small coastal town" },
    ],
    stewardship: stewardship("Hartley & Moss LLP", "Semiannual narrative and financial reports; funder briefing calls each spring.", "Tracks plans adopted, dollars leveraged and acres protected against a 2020 baseline.", "Restricted gifts held in segregated accounts and reported by grant line."),
  },
  {
    name: "Main Street Capital Collective",
    tagline: "Patient capital and coaching for small businesses in overlooked towns.",
    city: "Dayton", state: "OH", yearFounded: 2004, geographicScope: "Regional — Midwest",
    cause: "economy",
    focusAreas: ["Small business lending", "Community wealth", "Rural development"],
    mission: "We provide flexible loans and hands-on advisory services to entrepreneurs that banks overlook, building local ownership and jobs in post-industrial communities.",
    impactMetrics: [
      { label: "Loans made since founding", value: "2,350" },
      { label: "Jobs created or retained", value: "9,800" },
      { label: "Repayment rate", value: "94%" },
    ],
    trackRecord: [
      { year: "2010", title: "Certified CDFI", description: "Gained Treasury CDFI certification and opened a revolving loan fund." },
      { year: "2018", title: "Rural expansion", description: "Opened offices in four rural counties." },
      { year: "2024", title: "Employee ownership program", description: "Helped 12 retiring owners convert firms to employee ownership." },
    ],
    networks: [
      { name: "Regional CDFI Coalition", type: "Coalition", description: "Board seat; shares underwriting standards." },
      { name: "Community college system", type: "Program partner", description: "Co-delivers a 10-week business bootcamp." },
    ],
    roadmap: [
      { timeframe: "2026", goal: "$25M loan fund", description: "Grow the fund to meet demand from minority-owned firms." },
      { timeframe: "2027", goal: "Ownership succession desk", description: "Dedicated team for business succession planning." },
    ],
    financials: fin("2025", 12_900_000, { programShare: 0.84, contribShare: 0.45, assetsRatio: 3.2, employees: 71, volunteers: 60 }),
    board: [
      { name: "Gloria Benton", role: "Chair", affiliation: "Former regional bank executive" },
      { name: "Samuel Reyes", role: "Treasurer", affiliation: "Owner, manufacturing firm" },
      { name: "Priya Natarajan", role: "Secretary", affiliation: "Economics faculty, state university" },
      { name: "Darnell Brooks", role: "Director", affiliation: "Loan client and restaurant owner" },
    ],
    stewardship: stewardship("Kessler Ruiz CPAs", "Quarterly portfolio reports with loss rates; annual impact report.", "Third-party survey of borrowers at 12 and 36 months after loan close.", "Loan capital and operating grants tracked as separate funds."),
  },
  {
    name: "Center for Budget Clarity",
    tagline: "Nonpartisan analysis of state budgets and tax policy.",
    city: "Denver", state: "CO", yearFounded: 2001, geographicScope: "National — focus on 12 states",
    cause: "fiscal-policy",
    focusAreas: ["State budgets", "Tax policy", "Fiscal transparency"],
    mission: "We make public budgets understandable, publishing independent analysis so that lawmakers, journalists and residents can see who pays and who benefits.",
    impactMetrics: [
      { label: "Budget analyses published yearly", value: "140+" },
      { label: "Legislative testimonies (last 3 years)", value: "96" },
      { label: "Media citations (2025)", value: "1,200" },
    ],
    trackRecord: [
      { year: "2008", title: "Budget transparency index", description: "First multi-state scorecard on budget openness." },
      { year: "2016", title: "Tax incidence model", description: "Released an open-source model now used by eight state fiscal offices." },
      { year: "2024", title: "Public budget dashboards", description: "Interactive dashboards for 12 state budgets." },
    ],
    networks: [
      { name: "State Fiscal Analysts Network", type: "Coalition", description: "Member organization; shares methodology." },
      { name: "University public policy schools", type: "Research partner", description: "Joint fellowship for graduate analysts." },
    ],
    roadmap: [
      { timeframe: "2026", goal: "Local government coverage", description: "Expand dashboards to the 50 largest counties." },
      { timeframe: "2027", goal: "Training academy", description: "Budget literacy curriculum for reporters and legislative staff." },
    ],
    financials: fin("2025", 6_100_000, { programShare: 0.78, contribShare: 0.92, employees: 34, volunteers: 10 }),
    board: [
      { name: "Robert Liang", role: "Chair", affiliation: "Former state budget director" },
      { name: "Hannah Mercer", role: "Treasurer", affiliation: "Municipal finance advisor" },
      { name: "Yusuf Adeyemi", role: "Secretary", affiliation: "Public finance professor" },
    ],
    stewardship: stewardship("Blackwell Stone LLP", "Annual report and grant reports on funder schedule; methodology published openly.", "Tracks citations in legislation, testimony and media.", "Accepts no restricted gifts that would direct research conclusions."),
  },
  {
    name: "Equal Ballot Project",
    tagline: "Protecting every eligible voter's right to cast a ballot.",
    city: "Atlanta", state: "GA", yearFounded: 2012, geographicScope: "National",
    cause: "civil-rights",
    focusAreas: ["Voting rights", "Legal advocacy", "Civic participation"],
    mission: "We combine litigation, research and community organizing to remove barriers to voting and make sure election rules are applied fairly.",
    impactMetrics: [
      { label: "Voters helped by hotline (2024)", value: "64,000" },
      { label: "Successful legal actions", value: "27" },
      { label: "Poll monitors trained", value: "5,500" },
    ],
    trackRecord: [
      { year: "2016", title: "Election protection hotline", description: "Launched a multilingual voter hotline." },
      { year: "2020", title: "Precinct closure research", description: "Report cited in two federal court rulings." },
      { year: "2024", title: "Restoration of rights campaign", description: "Helped 18,000 returning citizens register." },
    ],
    networks: [
      { name: "National Voting Rights Coalition", type: "Coalition", description: "Steering committee member." },
      { name: "Law school clinics", type: "Program partner", description: "Six clinics provide pro bono research." },
    ],
    roadmap: [
      { timeframe: "2026", goal: "Midterm readiness", description: "Hotline capacity for 100,000 calls; 8,000 monitors." },
      { timeframe: "2027–2029", goal: "State litigation fund", description: "Build a reserve for rapid-response cases." },
    ],
    financials: fin("2025", 18_700_000, { programShare: 0.81, fundShare: 0.09, contribShare: 0.96, employees: 88, volunteers: 5_500 }),
    board: [
      { name: "Constance Whitaker", role: "Chair", affiliation: "Civil rights attorney" },
      { name: "Miguel Santos", role: "Treasurer", affiliation: "Nonprofit CFO" },
      { name: "Evelyn Park", role: "Secretary", affiliation: "Political science professor" },
      { name: "James Holloway", role: "Director", affiliation: "Former county election official" },
    ],
    stewardship: stewardship("Grant & Albright LLP", "Post-election reports; quarterly updates to major funders.", "Case outcomes, hotline resolution rate and registrations tracked per cycle.", "Litigation reserve held as board-designated fund."),
  },
  {
    name: "GridShare Communities",
    tagline: "Community solar and efficiency for renters and low-income households.",
    city: "Albuquerque", state: "NM", yearFounded: 2015, geographicScope: "Regional — Southwest",
    cause: "energy-infrastructure",
    focusAreas: ["Community solar", "Energy affordability", "Workforce training"],
    mission: "We build and operate community-owned solar projects and train local workers, cutting energy bills for households that rooftop solar never reaches.",
    impactMetrics: [
      { label: "Megawatts installed", value: "38 MW" },
      { label: "Households enrolled", value: "11,200" },
      { label: "Average bill savings", value: "22%" },
    ],
    trackRecord: [
      { year: "2017", title: "First tribal community solar array", description: "Co-developed a 2 MW array with a tribal utility." },
      { year: "2021", title: "Installer apprenticeship", description: "Graduated 300 apprentices, 70% placed in jobs." },
      { year: "2025", title: "Storage pilot", description: "Battery storage at three community centers used as cooling hubs." },
    ],
    networks: [
      { name: "Community Solar Access Coalition", type: "Coalition", description: "Policy partner on state program design." },
      { name: "Regional electric cooperatives", type: "Program partner", description: "Interconnection and billing partners." },
    ],
    roadmap: [
      { timeframe: "2026", goal: "Add 15 MW", description: "Five new arrays in rural counties." },
      { timeframe: "2028", goal: "Resilience hubs", description: "Storage at 20 public buildings." },
    ],
    financials: fin("2025", 9_800_000, { programShare: 0.83, contribShare: 0.58, assetsRatio: 4.1, employees: 52, volunteers: 90 }),
    board: [
      { name: "Teresa Chavez", role: "Chair", affiliation: "Electrical engineer, retired utility exec" },
      { name: "Kevin Arviso", role: "Treasurer", affiliation: "Tribal enterprise CFO" },
      { name: "Nadia Brennan", role: "Secretary", affiliation: "Energy policy attorney" },
    ],
    stewardship: stewardship("Mesa Partners CPAs", "Semiannual project dashboards with metered production data.", "Metered kWh, verified bill savings and job placement tracking.", "Project capital held in single-purpose subsidiaries."),
  },
  {
    name: "Riverbend Arts Foundry",
    tagline: "Studios, residencies and arts education in a converted mill.",
    city: "Providence", state: "RI", yearFounded: 1998, geographicScope: "Local — Rhode Island",
    cause: "arts-culture",
    focusAreas: ["Artist residencies", "Youth arts education", "Public art"],
    mission: "We give working artists affordable space and bring free arts education to young people across the city.",
    impactMetrics: [
      { label: "Artists in residence per year", value: "45" },
      { label: "Students in free programs", value: "3,100" },
      { label: "Public art works commissioned", value: "62" },
    ],
    trackRecord: [
      { year: "2005", title: "Mill renovation", description: "Converted a 60,000 sq ft mill into studios and galleries." },
      { year: "2015", title: "Teen apprenticeship", description: "Paid apprenticeships for 80 teens a year." },
      { year: "2023", title: "Neighborhood mural trail", description: "Two-mile public art trail with local artists." },
    ],
    networks: [
      { name: "State Arts Council", type: "Public funder", description: "Multi-year operating support grantee." },
      { name: "Public school district", type: "Program partner", description: "In-school arts in 14 schools." },
    ],
    roadmap: [
      { timeframe: "2026", goal: "Accessibility retrofit", description: "Elevators and accessible studios across the building." },
      { timeframe: "2027", goal: "Artist housing", description: "Feasibility study for 20 live-work units." },
    ],
    financials: fin("2025", 3_200_000, { programShare: 0.76, contribShare: 0.62, assetsRatio: 2.8, employees: 22, volunteers: 210 }),
    board: [
      { name: "Celia Monroe", role: "Chair", affiliation: "Gallery owner" },
      { name: "Patrick Doyle", role: "Treasurer", affiliation: "Bank vice president" },
      { name: "Ama Mensah", role: "Secretary", affiliation: "Resident artist alumna" },
    ],
    stewardship: stewardship("Northgate Accounting", "Annual report and site visits on request.", "Participation, student pre/post assessments and artist career outcomes.", "Capital campaign gifts tracked separately from operating funds."),
  },
  {
    name: "Open Field Youth Sports",
    tagline: "Free, coached sports leagues for kids in under-served neighborhoods.",
    city: "Milwaukee", state: "WI", yearFounded: 2007, geographicScope: "Local — Milwaukee metro",
    cause: "recreation-sports",
    focusAreas: ["Youth sports", "Coaching", "Parks access"],
    mission: "We run free year-round sports leagues with trained coaches, using sport to build health, confidence and belonging for young people.",
    impactMetrics: [
      { label: "Youth players per year", value: "6,800" },
      { label: "Certified volunteer coaches", value: "740" },
      { label: "Players returning next season", value: "81%" },
    ],
    trackRecord: [
      { year: "2011", title: "Girls' league launch", description: "Soccer and basketball leagues for girls." },
      { year: "2019", title: "Field restoration", description: "Restored 12 neglected park fields with the city." },
      { year: "2024", title: "Coach certification", description: "All coaches certified in trauma-informed practice." },
    ],
    networks: [
      { name: "City Parks Department", type: "Public partner", description: "Field use and maintenance agreement." },
      { name: "Children's hospital", type: "Health partner", description: "Free sports physicals for players." },
    ],
    roadmap: [
      { timeframe: "2026", goal: "Adaptive sports", description: "Leagues for players with disabilities." },
      { timeframe: "2027", goal: "Indoor facility", description: "Winter training center in partnership with a school." },
    ],
    financials: fin("2025", 2_400_000, { programShare: 0.82, contribShare: 0.88, employees: 18, volunteers: 740 }),
    board: [
      { name: "Derek Johnson", role: "Chair", affiliation: "Former pro athlete" },
      { name: "Maria Kowalski", role: "Treasurer", affiliation: "Credit union manager" },
      { name: "Lisa Tran", role: "Secretary", affiliation: "Pediatrician" },
    ],
    stewardship: stewardship("Lakeside CPAs", "Season-end reports with player data; annual funder breakfast.", "Retention, attendance and annual social-emotional survey.", "Equipment and field gifts tracked by restricted project."),
  },
  {
    name: "Second Chance Legal Aid",
    tagline: "Free civil legal help for people rebuilding after incarceration.",
    city: "Philadelphia", state: "PA", yearFounded: 2010, geographicScope: "State — Pennsylvania",
    cause: "civil-rights",
    focusAreas: ["Record clearance", "Housing rights", "Legal aid"],
    mission: "We clear criminal records and fight unlawful barriers to housing and employment so that people with records can fully participate in society.",
    impactMetrics: [
      { label: "Records sealed or expunged", value: "24,000" },
      { label: "Clients served (2025)", value: "4,300" },
      { label: "Pro bono attorney hours", value: "18,500" },
    ],
    trackRecord: [
      { year: "2015", title: "Clean slate clinics", description: "Monthly walk-in clinics in five neighborhoods." },
      { year: "2020", title: "Automatic sealing law", description: "Provided research and testimony for state legislation." },
    ],
    networks: [
      { name: "Statewide Legal Aid Network", type: "Coalition", description: "Member organization." },
      { name: "Law firm pro bono partners", type: "Program partner", description: "Eleven firms staff clinics." },
    ],
    roadmap: [
      { timeframe: "2026", goal: "Mobile clinic", description: "Van-based clinic for rural counties." },
      { timeframe: "2027", goal: "Employer pledge", description: "Fair-chance hiring commitments from 100 employers." },
    ],
    financials: fin("2025", 4_700_000, { programShare: 0.86, contribShare: 0.9, employees: 39, volunteers: 260 }),
    board: [
      { name: "Angela Ford", role: "Chair", affiliation: "Public defender" },
      { name: "Victor Huang", role: "Treasurer", affiliation: "Corporate controller" },
      { name: "Rev. Calvin Moore", role: "Secretary", affiliation: "Community pastor" },
    ],
    stewardship: stewardship("Penn Valley Audit Group", "Semiannual reports; client outcome data shared in aggregate.", "Case outcomes and 12-month follow-up on housing and employment.", "IOLTA and foundation funds tracked per grant."),
  },
  {
    name: "Watershed Commons",
    tagline: "Clean water infrastructure for small rural water systems.",
    city: "Bozeman", state: "MT", yearFounded: 2013, geographicScope: "Regional — Mountain West",
    cause: "energy-infrastructure",
    focusAreas: ["Water systems", "Rural infrastructure", "Technical assistance"],
    mission: "We give small rural water utilities the engineering, financing help and operator training they need to deliver safe, affordable drinking water.",
    impactMetrics: [
      { label: "Water systems assisted", value: "310" },
      { label: "Residents with improved water", value: "145,000" },
      { label: "Infrastructure funding secured", value: "$76M" },
    ],
    trackRecord: [
      { year: "2016", title: "Circuit rider program", description: "Traveling engineers serving 90 remote systems." },
      { year: "2022", title: "Lead line inventory", description: "Completed inventories for 120 small utilities." },
    ],
    networks: [
      { name: "Rural Water Association", type: "Coalition", description: "Training partner." },
      { name: "State revolving fund agencies", type: "Public partner", description: "Application support for loans." },
    ],
    roadmap: [
      { timeframe: "2026", goal: "Operator pipeline", description: "Train 150 new certified operators." },
      { timeframe: "2028", goal: "Regional consolidation support", description: "Help 20 systems share staff and equipment." },
    ],
    financials: fin("2025", 5_600_000, { programShare: 0.85, contribShare: 0.55, employees: 31, volunteers: 25 }),
    board: [
      { name: "Gary Lindqvist", role: "Chair", affiliation: "Retired civil engineer" },
      { name: "Rosa Whitehorse", role: "Treasurer", affiliation: "Tribal water utility manager" },
      { name: "Megan Cole", role: "Secretary", affiliation: "Public health researcher" },
    ],
    stewardship: stewardship("Big Sky Audit LLP", "Quarterly project updates; annual report.", "Compliance violations resolved, residents served and funds leveraged.", "Federal grants managed under Uniform Guidance single audit."),
  },
  {
    name: "Bridgeway Civic Lab",
    tagline: "Bringing residents and local governments together to solve problems.",
    city: "San Juan", state: "PR", yearFounded: 2017, geographicScope: "Local — Puerto Rico",
    cause: "other",
    focusAreas: ["Civic technology", "Open data", "Community engagement"],
    mission: "We build open data tools and participatory processes that help residents and municipalities make better public decisions together.",
    impactMetrics: [
      { label: "Municipalities partnered", value: "23" },
      { label: "Open datasets published", value: "410" },
      { label: "Residents in participatory budgeting", value: "12,000" },
    ],
    trackRecord: [
      { year: "2018", title: "Recovery data portal", description: "Tracked recovery funding after hurricanes for public review." },
      { year: "2023", title: "Participatory budgeting", description: "Ran first participatory budgets in three municipalities." },
    ],
    networks: [
      { name: "Civic Tech Network", type: "Coalition", description: "Regional chapter lead." },
      { name: "Local universities", type: "Research partner", description: "Student data fellows." },
    ],
    roadmap: [
      { timeframe: "2026", goal: "Island-wide open data standard", description: "Common data standard adopted by 40 municipalities." },
      { timeframe: "2027", goal: "Civic fellowship", description: "Place 30 technologists in local government." },
    ],
    financials: fin("2025", 1_900_000, { programShare: 0.79, contribShare: 0.85, employees: 15, volunteers: 140 }),
    board: [
      { name: "Isabel Rivera", role: "Chair", affiliation: "Urban planner" },
      { name: "Luis Ortega", role: "Treasurer", affiliation: "Accountant" },
      { name: "Carmen Velez", role: "Secretary", affiliation: "Community leader" },
    ],
    stewardship: stewardship("Caribe Audit Partners", "Semiannual reports in English and Spanish.", "Datasets used, participation rates and policy changes adopted.", "Restricted grants tracked by project code."),
  },
];

async function main() {
  const db = getDb();
  const existing = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.sample, true));
  if (existing.length && !process.argv.includes("--force")) {
    console.log(`${existing.length} sample organizations already exist; pass --force to replace them.`);
    return;
  }
  await db.delete(organizations).where(eq(organizations.sample, true));

  for (const [i, o] of orgs.entries()) {
    const n = String(i + 1).padStart(2, "0");
    await insertOrganization(db, {
      ...o,
      slug: slugify(o.name),
      status: "approved",
      sample: true,
      submittedAt: new Date("2026-01-15T00:00:00Z"),
      reviewedAt: new Date("2026-01-20T00:00:00Z"),
      ein: `00-00000${n}`,
      website: `https://example.org/${slugify(o.name)}`,
      contact: { name: "Sample Contact", title: "Executive Director", email: "contact@example.org", phone: "(555) 010-0000" },
    });
  }
  console.log(`Inserted ${orgs.length} sample organizations.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
