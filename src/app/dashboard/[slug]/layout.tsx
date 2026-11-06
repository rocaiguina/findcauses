import Link from "next/link";
import { redirect } from "next/navigation";
import { ManageNav } from "@/components/ManageNav";
import { SignOutButton } from "@/components/SignOutButton";
import { getMe, getProfileForm } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ManageLayout({ params, children }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const { slug } = await params;
  const me = await getMe();
  if (!me.user) redirect(`/signin?next=${encodeURIComponent(`/dashboard/${slug}`)}`);
  const form = await getProfileForm(slug);
  if (!form) redirect("/dashboard");
  const live = form.profileStatus === "published";

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div className="min-w-0">
          <p className="eyebrow">Manage your organization</p>
          <h1 className="mt-2 text-3xl font-semibold">{form.organization.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href={live ? `/organizations/${slug}` : `/listings/${slug}`} className="text-link">
            View public page
          </Link>
          <span className="text-muted">
            {me.user.email} · <SignOutButton />
          </span>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <ManageNav slug={slug} sections={form.sections} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
