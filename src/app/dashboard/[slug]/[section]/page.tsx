import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionForm } from "@/components/SectionForm";
import { PROFILE_SECTIONS } from "@/lib/profileSections";
import { getProfileForm } from "@/lib/store";

export const dynamic = "force-dynamic";

const find = (key: string) => PROFILE_SECTIONS.find((s) => s.key === key);

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  return { title: find((await params).section)?.title ?? "Your profile", robots: { index: false } };
}

export default async function ManageSectionPage({ params }: { params: Promise<{ slug: string; section: string }> }) {
  const { slug, section } = await params;
  const meta = find(section);
  const form = await getProfileForm(slug);
  if (!meta || !form) notFound();
  return (
    <>
      <h2 className="text-2xl font-semibold">{meta.title}</h2>
      <p className="mt-1 text-muted">{meta.blurb}</p>
      <div className="mt-6">
        <SectionForm key={meta.key} form={form} section={meta.key} />
      </div>
    </>
  );
}
