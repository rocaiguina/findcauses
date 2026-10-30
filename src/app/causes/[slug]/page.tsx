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
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <Link href="/causes" className="text-link text-sm text-muted">
        All causes
      </Link>
      <h1 className="mt-4 flex items-center gap-3 text-4xl font-normal tracking-[-0.02em] sm:text-[44px]">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cause.color }} aria-hidden />
        {cause.label}
      </h1>
      <p className="mb-8 mt-3 max-w-xl text-lg text-muted">
        {cause.blurb} {count.toLocaleString("en-US")} {count === 1 ? "organization" : "organizations"}.
      </p>
      {count ? (
        <div>
          <DirectoryBrowser entries={entries} initialCause={cause.slug} />
        </div>
      ) : (
        <div className="border-t border-ink/80 py-16 text-center">
          <p className="text-lg font-semibold">No organizations listed in this cause yet.</p>
          <Link href="/apply" className="btn-primary mt-4">
            List your nonprofit
          </Link>
        </div>
      )}
    </div>
  );
}
