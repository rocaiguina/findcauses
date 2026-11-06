export const CAUSES = [
  {
    slug: "climate-change",
    label: "Climate Change",
    blurb: "Mitigation, adaptation, climate justice and resilient communities.",
    color: "#2f6b4f",
  },
  {
    slug: "economy",
    label: "Economy",
    blurb: "Economic mobility, workforce, small business and community wealth.",
    color: "#b5702a",
  },
  {
    slug: "fiscal-policy",
    label: "Fiscal Policy",
    blurb: "Tax and budget research, public finance and government accountability.",
    color: "#3b5b8c",
  },
  {
    slug: "civil-rights",
    label: "Civil Rights",
    blurb: "Voting rights, equal protection, legal aid and democratic participation.",
    color: "#8c3b4a",
  },
  {
    slug: "energy-infrastructure",
    label: "Energy & Infrastructure",
    blurb: "Clean energy access, grids, water, transit and public works.",
    color: "#c29b1f",
  },
  {
    slug: "arts-culture",
    label: "Arts & Culture",
    blurb: "Artists, heritage, museums, performance and creative education.",
    color: "#6b4a8c",
  },
  {
    slug: "recreation-sports",
    label: "Recreation & Sports",
    blurb: "Youth sports, parks, outdoor access and healthy communities.",
    color: "#2a8a8a",
  },
  {
    slug: "public-health",
    label: "Public Health",
    blurb: "Community health, HIV/AIDS, mental health, chronic disease and access to care.",
    color: "#2e86c1",
  },
  {
    slug: "education",
    label: "Education",
    blurb: "Schools, early childhood, literacy, tutoring, scholarships and higher education access.",
    color: "#7b8f2a",
  },
  {
    slug: "housing",
    label: "Housing",
    blurb: "Affordable housing development, homeownership, homelessness and shelter.",
    color: "#8d6e4a",
  },
  {
    slug: "disaster-relief",
    label: "Disaster Relief",
    blurb: "Hurricane and earthquake recovery, emergency response and preparedness.",
    color: "#c0392b",
  },
  {
    slug: "social-services",
    label: "Social Services",
    blurb: "Children and family services, elder care, community aid and support for people in need.",
    color: "#b0517f",
  },
  {
    slug: "animal-welfare",
    label: "Animal Welfare",
    blurb: "Animal protection, rescue, shelters and humane care.",
    color: "#c2571a",
  },
  {
    slug: "other",
    label: "Other",
    blurb: "Missions that cross or sit outside the categories above.",
    color: "#5e6670",
  },
] as const;

export type Cause = (typeof CAUSES)[number];
export type CauseSlug = Cause["slug"];

export function getCause(slug: string): Cause | undefined {
  return CAUSES.find((c) => c.slug === slug);
}

export function isCauseSlug(slug: string): slug is CauseSlug {
  return CAUSES.some((c) => c.slug === slug);
}
