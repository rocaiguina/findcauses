// Removes all imported (unclaimed) listings and their IRS figures. Run before going to production.
// Usage: npm run imports:clear
import { loadEnvConfig } from "@next/env";
import { closeDb, getDb } from "../src/db";
import { importedOrgs, irsFilings } from "../src/db/schema";

loadEnvConfig(process.cwd());

async function main() {
  const db = getDb();
  const orgs = await db.delete(importedOrgs).returning({ id: importedOrgs.id });
  const filings = await db.delete(irsFilings).returning({ ein: irsFilings.ein });
  console.log(`Removed ${orgs.length} imported listings and ${filings.length} IRS filing rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
