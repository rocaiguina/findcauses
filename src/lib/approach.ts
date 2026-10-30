// How an organization drives change. Large funders often filter on this before cause: a policy-minded
// program officer wants research, advocacy or coalition work, not only direct services.

export const APPROACHES = [
  { id: "research-policy", label: "Research & policy", help: "Data, research and policy proposals" },
  { id: "advocacy", label: "Advocacy & rights", help: "Legal aid, rights and civic participation" },
  { id: "systems", label: "Coalitions & systems change", help: "Networks, alliances and public-sector partnerships" },
  { id: "direct-services", label: "Direct services", help: "Programs that serve people directly" },
] as const;

export type Approach = (typeof APPROACHES)[number]["id"];

export const approachLabel = (id: string) => APPROACHES.find((a) => a.id === id)?.label ?? id;

const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const RULES: [RegExp, Approach][] = [
  // "Económico" alone is not a signal: it shows up in many service and development names.
  [/\b(investigac|research|estudios|think tank|politica publica|public policy|policy|datos|data|observatorio|presupuest|fiscal)/, "research-policy"],
  [/\b(derechos|rights|defensa|advoca|abogac|legal|justicia|lgbt|voto|civic|civica|ciudadan|democra)/, "advocacy"],
  [/\b(coalici|alianza|alliance|red de|network|federaci|consorcio|coalition|filantrop|philanthrop|fundacion comunitaria|community foundation|concilio|consejo)/, "systems"],
];

// Hand-picked approaches, keyed by the same normalized name used for causes.
const OVERRIDES: Record<string, Approach[]> = {
  // Centro para una Nueva Economía: economic and fiscal policy think tank.
  "centro para una nueva economia": ["research-policy"],
  "centro para la nueva economia": ["research-policy"],
};

/**
 * Best-effort approaches from an organization's name, description and IRS code. Anything without a research,
 * advocacy or coalition signal is treated as direct services.
 */
export function inferApproaches({ name, text = "", ntee }: { name: string; text?: string; ntee?: string | null }): Approach[] {
  const override = OVERRIDES[plain(name).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()];
  if (override) return override;
  const haystack = plain(`${name} ${text}`);
  const found = new Set<Approach>();
  for (const [re, a] of RULES) if (re.test(haystack)) found.add(a);
  const code = ntee?.toUpperCase() ?? "";
  // NTEE xx05 is research; W0x/W2x are public-policy research and government (W6x is credit unions);
  // R and I8x are rights and legal services.
  if (/^[A-Z]05/.test(code) || /^W[02]/.test(code)) found.add("research-policy");
  if (code.startsWith("R") || code.startsWith("I8")) found.add("advocacy");
  if (!found.size) found.add("direct-services");
  return [...found];
}
