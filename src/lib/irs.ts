// IRS data via ProPublica Nonprofit Explorer (https://projects.propublica.org/nonprofits/api).

export const PROPUBLICA_API = "https://projects.propublica.org/nonprofits/api/v2";

export const RULING_DATE_NOTE =
  "Time since the IRS ruling that granted tax-exempt status. It can be more recent than the founding date if the organization's status was reinstated or it reorganized.";

/** ProPublica uses placeholders like "0000-00-00" or "1990-00-00" for unknown dates. */
export function validRulingDate(d: string | null | undefined): string | null {
  return d && /^(19|20)\d\d-(0[1-9]|1[0-2])-\d\d$/.test(d) && !d.endsWith("-00") ? d : null;
}

/**
 * Looks up the IRS tax-exemption ruling date for an EIN ("12-3456789" or "123456789").
 * Returns null when the EIN is unknown or the lookup fails — callers treat it as best effort.
 */
export async function fetchRulingDate(ein: string): Promise<string | null> {
  const digits = ein.replace(/\D/g, "");
  if (digits.length !== 9) return null;
  try {
    const res = await fetch(`${PROPUBLICA_API}/organizations/${digits}.json`, {
      headers: { "User-Agent": "FindCauses directory" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { organization?: { ruling_date?: string | null } };
    return validRulingDate(body.organization?.ruling_date);
  } catch {
    return null;
  }
}
