import { serve990 } from "@/lib/form990";
import { getById } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const org = await getById((await params).id);
  if (!org) return new Response("Not found", { status: 404 });
  return serve990(org);
}
