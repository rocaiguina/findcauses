import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { activeEin, insertOrganization, loadOrganizations, type Form990Upload, type NewOrganization } from "@/db/organizations";
import { form990Files, organizations } from "@/db/schema";
import type { Organization, OrgStatus } from "./types";

export async function listApproved(): Promise<Organization[]> {
  const orgs = await loadOrganizations(getDb(), eq(organizations.status, "approved"));
  return orgs.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listByStatus(status: OrgStatus): Promise<Organization[]> {
  const orgs = await loadOrganizations(getDb(), eq(organizations.status, status));
  return orgs.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function getApprovedBySlug(slug: string): Promise<Organization | undefined> {
  const [org] = await loadOrganizations(
    getDb(),
    and(eq(organizations.slug, slug), eq(organizations.status, "approved")),
  );
  return org;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getById(id: string): Promise<Organization | undefined> {
  if (!UUID.test(id)) return undefined; // avoid a Postgres cast error on malformed URLs
  const [org] = await loadOrganizations(getDb(), eq(organizations.id, id));
  return org;
}

export async function insert(org: NewOrganization, file: Form990Upload): Promise<string> {
  return insertOrganization(getDb(), org, file);
}

export async function setStatus(id: string, status: OrgStatus): Promise<void> {
  const updated = await getDb()
    .update(organizations)
    .set({ status, reviewedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning({ id: organizations.id });
  if (!updated.length) throw new Error(`Organization ${id} not found`);
}

export async function einExists(ein: string): Promise<boolean> {
  const rows = await getDb().select({ id: organizations.id }).from(organizations).where(activeEin(ein)).limit(1);
  return rows.length > 0;
}

export async function get990(orgId: string) {
  const [file] = await getDb().select().from(form990Files).where(eq(form990Files.orgId, orgId));
  return file;
}
