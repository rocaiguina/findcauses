// Recomputes the cause of every imported listing from its IRS NTEE code, name and tags.
// Run after changing the rules in src/lib/imports.ts. Usage: npm run imports:categorize
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { importedOrgs } from "../src/db/schema";
import { categorize } from "../src/lib/imports";

loadEnvConfig(process.cwd());

async function main() {
  const db = getDb();
  const rows = await db.select().from(importedOrgs);
  const counts: Record<string, number> = {};
  let changed = 0;
  for (const r of rows) {
    const cause = categorize({ name: r.name, tags: r.tags, ntee: r.nteeCode });
    counts[cause] = (counts[cause] ?? 0) + 1;
    if (cause !== r.cause) {
      await db.update(importedOrgs).set({ cause }).where(eq(importedOrgs.id, r.id));
      changed++;
    }
  }
  console.log(`Recategorized ${changed} of ${rows.length} listings.`);
  console.table(Object.entries(counts).sort((a, b) => b[1] - a[1]));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
