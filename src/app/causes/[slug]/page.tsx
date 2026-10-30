import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectoryBrowser } from "@/components/DirectoryBrowser";
import { getCause } from "@/lib/causes";
import { listDirectory } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cause = getCause((await params).slug);
  return { title: cause?.label ?? "Cause" };
}

export default async function CausePage({ params }: Props) {
  const cause = getCause((await params).slug);
  if (!cause) notFound();
  const entries = await listDirectory();
  const count = entries.filter((o) => o.cause === cause.slug).length;

  return (
    <div className="container-page py-6">
      <div className="card overflow-hidden">
        <div className="h-20" style={{ background: `linear-gradient(135deg, ${cause.color}, ${cause.color}99)` }} />
        <div className="px-6 pb-5 pt-4">
          <Link href="/causes" className="text-sm font-semibold text-muted hover:text-brand hover:underline">
            ← All causes
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{cause.label}</h1>
          <p className="mt-1 max-w-2xl text-muted">{cause.blurb}</p>
          <p className="mt-2 text-sm text-muted">
            {count.toLocaleString("en-US")} {count === 1 ? "organization" : "organizations"}
          </p>
        </div>
      </div>
      {count ? (
        <div className="mt-4">
          <DirectoryBrowser entries={entries} initialCause={cause.slug} />
        </div>
      ) : (
        <div className="card mt-4 p-10 text-center">
          <p className="text-lg font-semibold">No organizations listed in this cause yet.</p>
          <Link href="/apply" className="btn-primary mt-4">
            List your nonprofit
          </Link>
        </div>
      )}
    </div>
  );
}
