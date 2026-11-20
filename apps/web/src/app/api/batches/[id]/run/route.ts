/**
 * apps/web/src/app/api/batches/[id]/run/route.ts
 * Starts the agent. The browser cannot bypass the weekly cap: the check is server-side.
 */
import { NextResponse } from "next/server";
import { runBatch } from "@/server/agent/runBatch";
import { sellerOrLimit } from "@/server/api";

/** Run the batch. Returns a structured error when the cap or the pause switch stops it. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const { id } = await context.params;
  const result = await runBatch(id, gate.seller.id);
  const status = result.ok ? 200 : result.error === "not_found" ? 404 : 409;
  return NextResponse.json(result, { status });
}
