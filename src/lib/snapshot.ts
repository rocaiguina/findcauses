import "server-only";
import { readFileSync } from "fs";
import path from "path";
import type { ImportedListing, Organization } from "./types";

// Read-only copy of the directory, exported from Postgres with `npm run snapshot:export`.
// The deployed site reads it while there is no hosted database (no DATABASE_URL).

export type Snapshot = { generatedAt: string; organizations: Organization[]; imported: ImportedListing[] };

export const SNAPSHOT_PATH = path.join(process.cwd(), "data", "snapshot.json");

let cached: Snapshot | undefined;

export function readSnapshot(): Snapshot {
  if (!cached) {
    try {
      cached = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as Snapshot;
    } catch {
      // A missing snapshot shows an empty directory rather than crashing every page.
      cached = { generatedAt: "", organizations: [], imported: [] };
    }
  }
  return cached;
}
