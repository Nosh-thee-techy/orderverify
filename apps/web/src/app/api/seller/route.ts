/**
 * apps/web/src/app/api/seller/route.ts
 * Read and update the seller's language, weekly cap, and pause switch.
 */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isBypassEnabled } from "@/server/agent/x402Client";
import { sellerOrLimit, readJson } from "@/server/api";
import { getDb } from "@/server/db/client";
import { sellers } from "@/server/db/schema";

const policySchema = z.object({
  weeklyCapKes: z.number().int().min(0).max(100000).optional(),
  agentPaused: z.boolean().optional(),
  language: z.enum(["en", "sw"]).optional(),
});

/** Return the seller policy and whether this server is in the loud bypass mode. */
export async function GET() {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const seller = gate.seller;
  return NextResponse.json({
    id: seller.id,
    displayName: seller.displayName,
    language: seller.language,
    weeklyCapKes: seller.weeklyCapKes,
    agentPaused: seller.agentPaused,
    walletBalanceUsd: Number(seller.walletBalanceUsd),
    bypass: isBypassEnabled(),
    priceUsd: Number(process.env.PRICE_USD ?? "0.01"),
    kesPerUsd: Number(process.env.KES_PER_USD ?? "129"),
  });
}

/** Update cap, pause, or language. The cap is enforced again on the server at pay time. */
export async function PUT(request: Request) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const body = await readJson(request, 20_000);
  if ("response" in body) return body.response;
  const parsed = policySchema.safeParse(body.json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const db = getDb();
  const [updated] = await db
    .update(sellers)
    .set({
      weeklyCapKes: parsed.data.weeklyCapKes ?? gate.seller.weeklyCapKes,
      agentPaused: parsed.data.agentPaused ?? gate.seller.agentPaused,
      language: parsed.data.language ?? gate.seller.language,
    })
    .where(eq(sellers.id, gate.seller.id))
    .returning();
  return NextResponse.json({
    weeklyCapKes: updated?.weeklyCapKes,
    agentPaused: updated?.agentPaused,
    language: updated?.language,
  });
}
