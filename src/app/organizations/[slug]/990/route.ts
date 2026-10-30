import { serve990 } from "@/lib/form990";
import { getApprovedBySlug } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const org = await getApprovedBySlug((await params).slug);
  if (!org) return new Response("Not found", { status: 404 });
  return serve990(org);
}
