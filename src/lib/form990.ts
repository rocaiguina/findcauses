import "server-only";
import { get990 } from "./store";
import type { Organization } from "./types";

export async function serve990(org: Organization): Promise<Response> {
  const file = await get990(org.id);
  if (!file) return new Response("No Form 990 on file", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(file.sizeBytes),
      "Content-Disposition": `inline; filename="${org.slug}-form-990.pdf"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
