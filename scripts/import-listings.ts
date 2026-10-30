// Loads third-party directory snapshots from data/imports/ into `imported_orgs`.
// Development only: these listings are unclaimed and get removed with `npm run imports:clear`.
//
//   data/imports/pecunia.json       parsed from https://pecuniagroup.com/es/directorio-osfl/
//   data/imports/observatorio.json  from https://observatoriodedatos.org/api/v1/public/entities/search
//
// Usage: npm run imports:load
import { readFileSync } from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";
import { notInArray, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { importedOrgs } from "../src/db/schema";
import { slugify } from "../src/lib/format";
import { categorize, nameKey } from "../src/lib/imports";

loadEnvConfig(process.cwd());

type Source = "pecunia" | "observatorio";
type Listing = {
  name: string;
  source: Source;
  city?: string | null;
  tags: string[];
  mission?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
};

const dir = path.join(process.cwd(), "data", "imports");
const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(dir, file), "utf8")) as T;

const pecunia = read<{ name: string; city: string | null; tags: string[]; website: string | null; email: string | null; phone: string | null }[]>(
  "pecunia.json",
).map((p): Listing => ({
  name: p.name,
  source: "pecunia",
  city: p.city?.replace(/,\s*PR$/, "") ?? null,
  tags: p.tags.map((t) => t.replace("Heath", "Health")),
  website: p.website,
  email: p.email,
  phone: p.phone,
}));

const observatorio = read<{ data: { name: string; type: string; impactAreas?: string[]; mission?: string; contactEmail?: string }[] }>(
  "observatorio.json",
)
  // The directory is for nonprofits; skip grantmakers.
  .data.filter((o) => o.type !== "grantmaker")
  .map((o): Listing => ({
    name: o.name,
    source: "observatorio",
    tags: o.impactAreas ?? [],
    mission: o.mission ?? null,
    email: o.contactEmail ?? null,
  }));

// Merge duplicates (same normalized name) across and within sources, keeping the first non-empty value of each field.
const merged = new Map<string, Listing & { sources: Set<Source> }>();
for (const l of [...observatorio, ...pecunia]) {
  const key = nameKey(l.name);
  if (!key) continue;
  const prev = merged.get(key);
  if (!prev) {
    merged.set(key, { ...l, sources: new Set([l.source]) });
    continue;
  }
  prev.sources.add(l.source);
  prev.city ||= l.city;
  prev.mission ||= l.mission;
  prev.website ||= l.website;
  prev.email ||= l.email;
  prev.phone ||= l.phone;
  prev.tags = [...new Set([...prev.tags, ...l.tags])];
}

async function main() {
  const db = getDb();
  const usedSlugs = new Set<string>();
  const rows = [...merged.entries()].map(([key, l]) => {
    const base = slugify(l.name) || "organization";
    let slug = base;
    for (let i = 2; usedSlugs.has(slug); i++) slug = `${base}-${i}`;
    usedSlugs.add(slug);
    return {
      slug,
      name: l.name,
      nameKey: key,
      sources: [...l.sources],
      city: l.city || null,
      tags: l.tags,
      cause: categorize({ name: l.name, tags: l.tags }),
      mission: l.mission || null,
      website: l.website || null,
      email: l.email || null,
      phone: l.phone || null,
    };
  });

  // Drop listings whose normalized key no longer exists, e.g. after duplicate-merging rules improve.
  const stale = await db
    .delete(importedOrgs)
    .where(notInArray(importedOrgs.nameKey, rows.map((r) => r.nameKey)))
    .returning({ name: importedOrgs.name });
  if (stale.length) console.log(`Removed ${stale.length} superseded listings: ${stale.map((r) => r.name).join("; ")}`);

  for (let i = 0; i < rows.length; i += 200) {
    await db
      .insert(importedOrgs)
      .values(rows.slice(i, i + 200))
      .onConflictDoUpdate({
        target: importedOrgs.nameKey,
        // Refresh source fields but keep IRS matches and cause set by the enrichment step.
        set: {
          name: sql`excluded.name`,
          sources: sql`excluded.sources`,
          city: sql`excluded.city`,
          tags: sql`excluded.tags`,
          mission: sql`excluded.mission`,
          website: sql`excluded.website`,
          email: sql`excluded.email`,
          phone: sql`excluded.phone`,
        },
      });
  }
  console.log(
    `Imported ${rows.length} listings (${pecunia.length} Pecunia + ${observatorio.length} Observatorio rows, duplicates merged).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
