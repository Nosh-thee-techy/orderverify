/**
 * apps/web/src/server/api.ts
 * Shared helpers for the route handlers: seller lookup, rate limit, JSON errors.
 */
import "server-only";
import { NextResponse } from "next/server";
import { allow } from "./rateLimit.js";
import { requireSeller, type Seller } from "./seller.js";

/**
 * Resolve the signed-in Clerk seller or return 401 / 429.
 * @returns The seller, or a response the route should return immediately
 */
export async function sellerOrLimit(): Promise<{ seller: Seller } | { response: NextResponse }> {
  const seller = await requireSeller();
  if (!seller) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (!allow(seller.id)) {
    return { response: NextResponse.json({ error: "rate_limited" }, { status: 429 }) };
  }
  return { seller };
}

/**
 * Read a JSON body and reject anything over the byte cap.
 * @param request - Incoming request
 * @param maxBytes - Maximum body size
 * @returns The parsed value, or a 413 response
 */
export async function readJson(request: Request, maxBytes: number): Promise<{ json: unknown } | { response: NextResponse }> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) {
    return { response: NextResponse.json({ error: "too_large" }, { status: 413 }) };
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    return { response: NextResponse.json({ error: "too_large" }, { status: 413 }) };
  }
  try {
    return { json: text ? JSON.parse(text) : {} };
  } catch {
    return { response: NextResponse.json({ error: "invalid_json" }, { status: 400 }) };
  }
}
