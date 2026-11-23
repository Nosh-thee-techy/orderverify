/**
 * apps/web/src/app/api/documents/text/route.ts
 * Accepts an uploaded document and returns the extracted text.
 * The text is still untrusted; callers must treat it as seller-supplied data.
 */
import { NextResponse } from "next/server";
import { sellerOrLimit } from "@/server/api";
import { extractDocumentText } from "@/server/extract/readDocument";

const MAX_BYTES = 8_000_000;

/**
 * POST multipart field `file`. Returns `{ text, fileName }`.
 */
export async function POST(request: Request) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const text = await extractDocumentText(bytes, file.name, file.type || "");
    if (!text) {
      return NextResponse.json({ error: "empty_text", fileName: file.name }, { status: 422 });
    }
    return NextResponse.json({ text, fileName: file.name });
  } catch {
    return NextResponse.json({ error: "read_failed", fileName: file.name }, { status: 422 });
  }
}
