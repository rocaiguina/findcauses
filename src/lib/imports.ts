import type { CauseSlug } from "./causes";

// Helpers for imported (unclaimed) listings: name matching and cause mapping.

const SUFFIXES = new Set([
  "inc", "incorporated", "corp", "corporation", "co", "llc", "ltd", "the", "of", "de", "del", "la", "el",
  "los", "las", "y", "and", "en", "para", "por", "un", "una", "uno", "a", "an", "for",
]);

/** Normalizes an organization name for comparison: no accents, punctuation, parentheticals or legal suffixes. */
export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t && !SUFFIXES.has(t))
    .join(" ");
}

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// Same word despite a plural or a one-letter typo ("Impedimento"/"Impedimentos", "Communidades").
const sameToken = (a: string, b: string) =>
  a === b || a.replace(/s$/, "") === b.replace(/s$/, "") || (Math.min(a.length, b.length) >= 6 && withinOneEdit(a, b));

/** 0–100 similarity between two names, based on token overlap after normalization. */
export function nameSimilarity(a: string, b: string): number {
  const ta = [...new Set(nameKey(a).split(" ").filter(Boolean))];
  const tb = [...new Set(nameKey(b).split(" ").filter(Boolean))];
  if (!ta.length || !tb.length) return 0;
  const unused = [...tb];
  let shared = 0;
  for (const t of ta) {
    const k = unused.findIndex((u) => sameToken(t, u));
    if (k >= 0) {
      shared++;
      unused.splice(k, 1);
    }
  }
  // Dice coefficient: penalizes extra words on either side equally.
  return Math.round((200 * shared) / (ta.length + tb.length));
}

// Words too common in Puerto Rico nonprofit names to narrow a search.
const GENERIC = new Set([
  "asociacion", "corporacion", "fundacion", "centro", "hogar", "instituto", "sociedad", "servicios", "programa",
  "proyecto", "comite", "organizacion", "grupo", "puerto", "rico", "pr", "puertorriquena", "puertorriqueno",
  "foundation", "center", "association", "inc", "corp", "para", "con", "sin", "san", "santa", "for", "with",
  "society", "institute", "services", "program", "project", "committee", "organization", "group", "home",
  "corporation", "puerto", "rican",
]);

// Common words in Puerto Rico nonprofit names. Many organizations file with the IRS under an English name,
// e.g. "Centro para una Nueva Economía" is "Center For A New Economy Inc".
const ES_EN: Record<string, string> = {
  centro: "center", centros: "centers", para: "for", nueva: "new", nuevo: "new", economia: "economy",
  economico: "economic", fundacion: "foundation", asociacion: "association", sociedad: "society",
  instituto: "institute", desarrollo: "development", comunitario: "community", comunitaria: "community",
  comunidad: "community", comunidades: "communities", salud: "health", educacion: "education",
  educativo: "educational", vivienda: "housing", viviendas: "housing", servicios: "services",
  corporacion: "corporation", ninos: "children", nino: "child", mujer: "women", mujeres: "women",
  puertorriquena: "puerto rican", puertorriqueno: "puerto rican", consejo: "council", coalicion: "coalition",
  alianza: "alliance", federacion: "federation", liga: "league", programa: "program", proyecto: "project",
  hogar: "home", hogares: "homes", iglesia: "church", americana: "american", americano: "american",
  nacional: "national", internacional: "international", familia: "family", familias: "families",
  juventud: "youth", jovenes: "youth", ciegos: "blind", sordos: "deaf", banco: "bank", alimentos: "food",
  ayuda: "aid", arte: "art", artes: "arts", musica: "music", museo: "museum", conservacion: "conservation",
  fideicomiso: "trust", legales: "legal", ciudadanos: "citizens", amigos: "friends", escuela: "school",
  universidad: "university", hospital: "hospital", cancer: "cancer", diabetes: "diabetes",
  investigacion: "research", justicia: "justice", derechos: "rights", ambiente: "environment",
  cuidado: "care", ancianos: "elderly", envejecientes: "elderly", personas: "people", impedimentos: "disabilities",
  orquesta: "orchestra", sinfonica: "symphony", teatro: "theater", cultura: "culture", cultural: "cultural",
};

/** English rendering of a Spanish name, word by word; undefined when nothing translates. */
export function toEnglish(name: string): string | undefined {
  const words = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ");
  let changed = false;
  const out = words.map((w) => {
    if (ES_EN[w]) {
      changed = true;
      return ES_EN[w];
    }
    return w;
  });
  return changed ? out.join(" ") : undefined;
}

/**
 * Shorter searches built from the distinctive words, for when the full name finds nothing.
 * ProPublica requires every word to match, so each step drops one: the first three, then the first two.
 */
export function fallbackQueries(name: string): string[] {
  const tokens = nameKey(name)
    .split(" ")
    .filter((t) => t.length > 2 && !GENERIC.has(t));
  const queries = [tokens.slice(0, 3).join(" "), tokens.slice(0, 2).join(" ")];
  return [...new Set(queries)].filter((q) => q && q !== nameKey(name));
}

/** Matches below this score are left unmatched rather than risk attaching another organization's 990. */
export const IRS_MATCH_THRESHOLD = 90;

// Keyword rules over the accent-stripped, lowercased name (Spanish and English). First match wins,
// so narrower causes come before broad ones like economy.
const NAME_RULES: [RegExp, CauseSlug][] = [
  // Cooperatives (mostly employee credit unions) are economic institutions whatever agency they serve,
  // e.g. "Cooperativa Empleados de la Autoridad de Energía Eléctrica".
  [/\b(cooperativa|coop)\b|-coop\b/, "economy"],
  [/\b(fiscal|presupuest|contributiv|impuesto|politica publica|finanzas publicas|tax|budget)/, "fiscal-policy"],
  [/\b(energia|solar|electric|acueducto|agua potable|infraestructura|transporte|telecomunic|energy|water)/, "energy-infrastructure"],
  [/\b(ambient|conservacion|reciclaje|ecolog|bosque|cuenca|reserva natural|area protegida|sostenib|clima|environment|climate|conservation|karso|coral|marino)/, "climate-change"],
  [/\b(derechos|legal|justicia|igualdad|abogac|lgbt|pro bono|democra|voto|inmigra|rights|civil liberties)/, "civil-rights"],
  [/\b(desastre|emergencia|huracan|terremoto|sismo|resilien|cruz roja|red cross|defensa civil|bomberos|disaster|relief|preparedness|preparacion)/, "disaster-relief"],
  [/\b(museo|teatro|musica|arte|artes|artist|cultur|danza|ballet|orquesta|coro|folklor|artesan|cine|literatur|poesia|humanidades|museum|theat|music|arts)\b/, "arts-culture"],
  [/\b(deport|atletic|beisbol|baseball|baloncesto|futbol|soccer|voleibol|boxeo|natacion|recreativ|scouts?|sports?|athletic)/, "recreation-sports"],
  [/\b(salud|health|sida|vih|hiv|cancer|diabetes|medic|hospital|clinic|enfermeria|pacientes|mental|psiquiatr|psicolog|adiccion|adictos|drogas|alcoholicos|pulmon|cardio|renal|alzheimer|autismo|lupus|hemofilia|epilepsia|esclerosis|diagnostico|tratamiento|rehabilitacion|terapia|prevencion|dental|dentistas|nutricion)/, "public-health"],
  // "Colegio de Médicos/Abogados…" are professional associations, not schools.
  [/\b(educac|educativ|escuela|academia|universidad|montessori|preescolar|alfabetiz|lectura|tutor|maestros|estudiant|becas|aprendizaje|education|educational|school|university|literacy|scholarship|head start)|\bcolegio\b(?! de (medicos|abogados|cirujanos|trabajadores|contadores|ingenieros|tecnicos|profesionales|optometras|farmaceuticos|enfermer|agronomos|arquitectos|quimicos|psicologos))/, "education"],
  // "Albergue" alone is a homeless shelter; "Hogar Albergue…" and children's shelters are residential care.
  [/\b(vivienda|viviendas|housing|homeless|deambulante|sin hogar|habitat)|^(?!hogar).*\balbergue\b(?!.*\bnin)/, "housing"],
  [/\b(desarrollo (economico|comunitario|empresarial)|economic|economia|empresa|empresarial|empresas|empleo|empleados|trabajadores(?! sociales)|obrero|microempres|comercio|vocacional|workforce|employment)/, "economy"],
];

// Observatorio impact areas (English) when the name gives no signal.
const TAG_RULES: [RegExp, CauseSlug][] = [
  [/human rights|civil rights|legal/i, "civil-rights"],
  [/cultur|humanities|\barts?\b|museum|music/i, "arts-culture"],
  [/environment(?!al education)|climate/i, "climate-change"],
  // Disability and health groups are often tagged both Health and Education; health is the better fit.
  [/health/i, "public-health"],
  [/educat|school|student|literacy|reading|learning/i, "education"],
  [/public policy|economic|employment|community development|vocational/i, "economy"],
  [/sport|recreation|athletic/i, "recreation-sports"],
];

const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Best-effort cause for an imported listing: keywords in the name, then the IRS NTEE code when it
 * maps to a cause, then source tags; everything else is "other".
 */
export function categorize({ name, tags, ntee }: { name: string; tags: string[]; ntee?: string | null }): CauseSlug {
  // Parentheticals are acronyms or sister names and caused false hits, e.g. "(Instituto Pre Vocacional…)".
  const n = plain(name).replace(/\([^)]*\)/g, " ");
  // Food banks are human services, not banking.
  if (/banco de alimentos|food bank/.test(n)) return "other";
  // A specific word in the name beats the self-reported NTEE code, which is often a catch-all
  // (e.g. "Centro para una Nueva Economía" files as B90, educational services).
  for (const [re, slug] of NAME_RULES) if (re.test(n)) return slug;
  const fromNtee = causeFromNtee(ntee);
  if (fromNtee) return fromNtee;
  for (const [re, slug] of TAG_RULES) if (tags.some((t) => re.test(t))) return slug;
  return "other";
}

/** Maps an IRS NTEE code (e.g. "A20", "W22") to a JustCause cause. */
export function causeFromNtee(code: string | null | undefined): CauseSlug | undefined {
  if (!code) return undefined;
  const major = code[0]?.toUpperCase();
  if (code.toUpperCase().startsWith("C35")) return "energy-infrastructure";
  if (code.toUpperCase().startsWith("W22") || code.toUpperCase().startsWith("W24")) return "fiscal-policy";
  switch (major) {
    case "A":
      return "arts-culture";
    case "B":
      return "education";
    case "C":
      return "climate-change";
    case "E": // health care
    case "F": // mental health and crisis intervention
    case "G": // diseases and disorders
    case "H": // medical research
      return "public-health";
    case "J":
    case "S":
      return "economy";
    case "L": // housing development, ownership and shelter
      return "housing";
    case "M":
      // M20–M2x: disaster preparedness, relief and search & rescue. Other M codes are general public safety.
      return /^M2/i.test(code) ? "disaster-relief" : undefined;
    case "I":
      // I80–I83: legal services and advocacy; the rest of I is crime prevention and victim services.
      return /^I8/i.test(code) ? "civil-rights" : undefined;
    case "N":
      return "recreation-sports";
    case "R":
      return "civil-rights";
    default:
      return undefined;
  }
}
