import Link from "next/link";

export default async function SubmittedPage({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const { name } = await searchParams;
  return (
    <div className="container-page max-w-2xl py-20 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-2xl text-brand">
        ✓
      </span>
      <h1 className="mt-6 text-4xl font-semibold">Application received</h1>
      <p className="mt-4 text-muted">
        Thank you{name ? `, ${name}` : ""}. Our team will check your profile against your Form 990 and follow up by
        email. Most reviews take about 5 business days.
      </p>
      <Link href="/organizations" className="btn-ghost mt-8">
        Browse the directory
      </Link>
    </div>
  );
}
