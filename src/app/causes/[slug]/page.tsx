import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrgCard } from "@/components/OrgCard";
import { getCause } from "@/lib/causes";
import { listApproved } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cause = getCause((await params).slug);
  return { title: cause?.label ?? "Cause" };
}

export default async function CausePage({ params }: Props) {
  const cause = getCause((await params).slug);
  if (!cause) notFound();
  const orgs = (await listApproved()).filter((o) => o.cause === cause.slug);

  return (
    <div className="container-page py-12">
      <Link href="/causes" className="text-sm text-muted hover:text-brand">
        ← All causes
      </Link>
      <div className="mt-4 border-l-4 pl-5" style={{ borderColor: cause.color }}>
        <h1 className="font-serif text-4xl font-semibold">{cause.label}</h1>
        <p className="mt-2 max-w-2xl text-muted">{cause.blurb}</p>
      </div>
      {orgs.length ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => (
            <OrgCard key={o.id} org={o} />
          ))}
        </div>
      ) : (
        <div className="card mt-10 p-10 text-center">
          <p className="font-serif text-xl">No organizations listed in this cause yet.</p>
          <Link href="/apply" className="btn-primary mt-4">
            List your nonprofit
          </Link>
        </div>
      )}
    </div>
  );
}
