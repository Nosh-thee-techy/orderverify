/**
 * apps/web/src/app/api/extract/route.ts
 * Turns a pasted WhatsApp export into editable orders. Chat text is untrusted.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { sellerOrLimit, readJson } from "@/server/api";
import { extractOrders } from "@/server/extract/extractOrders";

const bodySchema = z.object({ chatText: z.string().max(1_000_000) });

/** Extract orders. The response says whether this was the model or the basic extractor. */
export async function POST(request: Request) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const body = await readJson(request, 1_000_000);
  if ("response" in body) return body.response;
  const parsed = bodySchema.safeParse(body.json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const result = await extractOrders(parsed.data.chatText, gate.seller.displayName);
  return NextResponse.json(result);
}
