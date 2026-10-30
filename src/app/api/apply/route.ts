import { NextResponse } from "next/server";
import { parseApplication } from "@/lib/application";
import { slugify } from "@/lib/format";
import { einExists, insert } from "@/lib/store";

const DUPLICATE_EIN = { errors: { ein: "An organization with this EIN is already listed or under review." } };

export async function POST(req: Request) {
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ errors: { form: "Could not read the submission." } }, { status: 400 });
  }

  const { data, file, errors } = parseApplication(fd);
  if (!data || !file) return NextResponse.json({ errors }, { status: 422 });

  if (await einExists(data.ein)) return NextResponse.json(DUPLICATE_EIN, { status: 409 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (Buffer.from(bytes.subarray(0, 5)).toString("latin1") !== "%PDF-")
    return NextResponse.json({ errors: { form990: "That file doesn't look like a valid PDF." } }, { status: 422 });

  try {
    const id = await insert({ ...data, slug: slugify(data.name) || "organization" }, { fileName: file.name, data: bytes });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    // Two submissions with the same EIN can race past einExists; the partial unique index catches the second.
    if ((err as { cause?: { code?: string } }).cause?.code === "23505" || (err as { code?: string }).code === "23505")
      return NextResponse.json(DUPLICATE_EIN, { status: 409 });
    throw err;
  }
}
