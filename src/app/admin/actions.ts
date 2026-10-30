"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isAdminSession, sessionToken } from "@/lib/adminAuth";
import { fetchRulingDate } from "@/lib/irs";
import { getById, setStatus } from "@/lib/store";
import type { OrgStatus } from "@/lib/types";

export async function login(_prev: string | null, fd: FormData): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return "Admin is disabled: set ADMIN_PASSWORD in the environment.";
  if (fd.get("password") !== password) return "Incorrect password.";
  (await cookies()).set(ADMIN_COOKIE, (await sessionToken())!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function review(id: string, status: Extract<OrgStatus, "approved" | "rejected">) {
  // Server actions can be posted to any route, so don't rely on the /admin middleware alone.
  if (!(await isAdminSession((await cookies()).get(ADMIN_COOKIE)?.value))) throw new Error("Unauthorized");
  if (status !== "approved" && status !== "rejected") throw new Error("Invalid status");
  // Best effort: record how long the IRS has recognized the organization.
  const org = status === "approved" ? await getById(id) : undefined;
  const rulingDate = org && !org.irsRulingDate ? await fetchRulingDate(org.ein) : undefined;
  await setStatus(id, status, rulingDate ?? undefined);
  revalidatePath("/", "layout");
  redirect("/admin");
}
