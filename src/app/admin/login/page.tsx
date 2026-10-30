import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container-page max-w-sm py-20">
      <h1 className="font-serif text-3xl font-semibold">Admin sign in</h1>
      <p className="mt-2 text-sm text-muted">Review and publish nonprofit applications.</p>
      <LoginForm next={next ?? "/admin"} />
    </div>
  );
}
