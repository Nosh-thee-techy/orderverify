/**
 * apps/web/src/app/api/health/route.ts
 * Lets the wallet screen show whether the paid verification service is reachable.
 */
import { NextResponse } from "next/server";

/** Proxy the verification service health check so the browser never calls it directly. */
export async function GET() {
  const url = process.env.VERIFY_API_URL ?? "http://localhost:4021";
  try {
    const response = await fetch(`${url}/health`, { cache: "no-store" });
    const body = (await response.json()) as { ok?: boolean; priceUsd?: string; payment?: string };
    return NextResponse.json({ web: true, verify: response.ok && body.ok === true, priceUsd: body.priceUsd, payment: body.payment });
  } catch {
    return NextResponse.json({ web: true, verify: false });
  }
}
