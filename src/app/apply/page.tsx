import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationForm } from "@/components/ApplicationForm";
import { getMe } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Apply to be listed" };

export default async function ApplyPage() {
  if (!(await getMe()).user) redirect("/signin?next=/apply");
  return (
    <div className="container-page max-w-4xl py-12">
      <p className="eyebrow">For nonprofits</p>
      <h1 className="mt-2 text-4xl font-semibold">Apply to be listed on FindCauses</h1>
      <p className="mt-3 max-w-2xl text-muted">
        FindCauses is built for funders doing due diligence. To be listed, answer every section below and upload your
        most recent IRS Form 990. Have the 990 open while you fill this in — most figures map to a specific line.
      </p>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        Already in the directory?{" "}
        <Link href="/for-nonprofits" className="text-link">
          Find and claim your page
        </Link>{" "}
        instead.
      </p>
      <ul className="mt-6 flex flex-wrap gap-2 text-xs">
        {[
          "501(c)(3) public charity",
          "$1M–$50M in annual expenses",
          "Filed Form 990 (not 990-N/EZ)",
          "~30 minutes",
        ].map((t) => (
          <li key={t} className="chip">
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <ApplicationForm />
      </div>
    </div>
  );
}
