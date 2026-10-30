// Copies Drizzle's SQL migrations into netlify/database/migrations, where Netlify Database applies them
// (in filename order) right before each deploy is published. Run automatically by `npm run db:generate`.
import { copyFileSync, mkdirSync, readdirSync } from "fs";
import path from "path";

const from = path.join(process.cwd(), "drizzle");
const to = path.join(process.cwd(), "netlify", "database", "migrations");
mkdirSync(to, { recursive: true });

const files = readdirSync(from).filter((f) => /^\d{4}_[a-z0-9_-]+\.sql$/.test(f));
for (const f of files) copyFileSync(path.join(from, f), path.join(to, f));
console.log(`Synced ${files.length} migrations to netlify/database/migrations`);
