/**
 * apps/web/src/app/api/seller/topup/route.ts
 * Adds simulated wallet credit. This is not an on-chain USDC mint.
 */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sellerOrLimit, readJson } from "@/server/api";
import { getDb } from "@/server/db/client";
import { sellers } from "@/server/db/schema";

const bodySchema = z.object({ amountUsd: z.number().positive().max(100) });

/** Increase the simulated balance and say so in the response. */
export async function POST(request: Request) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const body = await readJson(request, 5_000);
  if ("response" in body) return body.response;
  const parsed = bodySchema.safeParse(body.json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const next = Number(gate.seller.walletBalanceUsd) + parsed.data.amountUsd;
  const [updated] = await getDb()
    .update(sellers)
    .set({ walletBalanceUsd: next.toFixed(7) })
    .where(eq(sellers.id, gate.seller.id))
    .returning();
  return NextResponse.json({
    simulated: true,
    walletBalanceUsd: Number(updated?.walletBalanceUsd ?? next),
    note: "Top-ups here are simulated. They are not a real M-Pesa to USDC conversion.",
  });
}
