// Outbound LinkedIn search links, so funders can reach the right people on the network they already use.
// These are plain search URLs: nothing is fetched from LinkedIn.

/** Removes acronyms in parentheses and legal suffixes, which make LinkedIn searches miss. */
export function searchableName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/,?\s*\b(inc|corp|llc|ltd)\b\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function linkedinCompanySearch(orgName: string): string {
  return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(searchableName(orgName))}`;
}

/** People search: a named contact at the organization, or anyone who lists it as their employer. */
export function linkedinPeopleSearch(orgName: string, personName?: string): string {
  const keywords = [personName, searchableName(orgName)].filter(Boolean).join(" ");
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}
