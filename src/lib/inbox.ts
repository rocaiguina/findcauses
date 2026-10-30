import "server-only";
import { createHash, randomUUID } from "crypto";
import { getStore } from "@netlify/blobs";
import type { Form990Upload, NewOrganization } from "@/db/organizations";
import type { Organization } from "./types";

// Without a database, incoming applications and subscriptions are saved as JSON in Netlify Blobs
// (included on every Netlify plan) so nothing submitted is lost while the site runs on the snapshot.

const applications = () => getStore({ name: "applications", consistency: "strong" });
const subscriptions = () => getStore({ name: "subscriptions", consistency: "strong" });

export async function saveApplication(org: NewOrganization, file: Form990Upload): Promise<string> {
  const id = randomUUID();
  const record: Organization = {
    ...org,
    id,
    status: "pending",
    submittedAt: new Date().toISOString(),
    reviewedAt: undefined,
    form990: { fileName: file.fileName },
  };
  const store = applications();
  await store.set(`${id}.pdf`, new Blob([new Uint8Array(file.data)], { type: "application/pdf" }), {
    metadata: { fileName: file.fileName },
  });
  await store.setJSON(`${id}.json`, record);
  return id;
}

export async function listApplications(): Promise<Organization[]> {
  const store = applications();
  const { blobs } = await store.list();
  const records = await Promise.all(
    blobs.filter((b) => b.key.endsWith(".json")).map((b) => store.get(b.key, { type: "json" }) as Promise<Organization | null>),
  );
  return records.filter((r): r is Organization => r != null);
}

export async function getApplication(id: string): Promise<Organization | undefined> {
  return ((await applications().get(`${id}.json`, { type: "json" })) as Organization | null) ?? undefined;
}

export async function getApplicationPdf(id: string): Promise<{ fileName: string; data: Uint8Array } | undefined> {
  const res = await applications().getWithMetadata(`${id}.pdf`, { type: "arrayBuffer" });
  if (!res) return undefined;
  return { fileName: String(res.metadata.fileName ?? "form-990.pdf"), data: new Uint8Array(res.data) };
}

export async function saveSubscription(email: string, query: string): Promise<void> {
  const key = createHash("sha256").update(`${email}\n${query}`).digest("hex");
  await subscriptions().setJSON(key, { email, query, createdAt: new Date().toISOString() });
}
