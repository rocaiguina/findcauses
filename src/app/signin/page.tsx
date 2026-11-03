import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/store";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const safeNext = (next: string | undefined) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; e?: string }> }) {
  const { next: rawNext, e } = await searchParams;
  const next = safeNext(rawNext);
  if ((await getMe()).user) redirect(next);
  return (
    <div className="container-page max-w-md py-16">
      <p className="eyebrow">For nonprofits</p>
      <h1 className="mt-2 text-3xl font-semibold">Sign in to manage your organization</h1>
      <p className="mt-2 text-muted">No password: we&apos;ll email you a link.</p>
      {e === "expired" && (
        <p className="mt-4 text-sm text-red-700">That link has expired or was already used. Request a new one.</p>
      )}
      <SignInForm next={next} />
    </div>
  );
}
