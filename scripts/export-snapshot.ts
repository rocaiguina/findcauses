// Exports the published directory (approved organizations and imported listings) to data/snapshot.json.
// The deployed site reads this file while there is no hosted database. Run it before each deploy:
//   npm run snapshot:export
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { loadImported } from "../src/db/imported";
import { loadOrganizations } from "../src/db/organizations";
import { organizations } from "../src/db/schema";

loadEnvConfig(process.cwd());

async function main() {
  const db = getDb();
  const [orgs, imported] = await Promise.all([
    loadOrganizations(db, eq(organizations.status, "approved")),
    loadImported(db),
  ]);
  const file = path.join(process.cwd(), "data", "snapshot.json");
  mkdirSync(path.dirname(file), { recursive: true });
  // Contact details of approved profiles stay; 990 PDFs are not included (the site links to them only with a DB).
  writeFileSync(
    file,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      organizations: orgs.map((o) => ({ ...o, form990: undefined })),
      imported,
    }),
  );
  console.log(`Wrote ${orgs.length} organizations and ${imported.length} imported listings to data/snapshot.json`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
