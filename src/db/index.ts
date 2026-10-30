import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

// Reuse one pool across dev hot reloads instead of leaking a new one on every edit.
const globalForDb = globalThis as unknown as { justcausePool?: Pool };

function createPool(): Pool {
  // DATABASE_URL locally; on Netlify, Netlify Database provides NETLIFY_DB_URL.
  const connectionString = process.env.DATABASE_URL ?? process.env.NETLIFY_DB_URL;
  if (!connectionString) throw new Error("DATABASE_URL (or NETLIFY_DB_URL on Netlify) is not set. See README.md.");
  // Serverless functions each hold their own pool, so keep it small by default.
  return new Pool({ connectionString, max: Number(process.env.DATABASE_POOL_MAX ?? 5) });
}

let instance: DB | undefined;

export function getDb(): DB {
  if (!instance) {
    globalForDb.justcausePool ??= createPool();
    instance = drizzle(globalForDb.justcausePool, { schema });
  }
  return instance;
}

export async function closeDb(): Promise<void> {
  await globalForDb.justcausePool?.end();
  globalForDb.justcausePool = undefined;
  instance = undefined;
}
