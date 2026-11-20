/**
 * apps/web/src/app/api/sample/route.ts
 * The one-tap demo. Dates are computed from today so the sample stays current.
 */
import { NextResponse } from "next/server";
import { buildDemoScenario } from "@orderverify/fixtures";
import { sellerOrLimit } from "@/server/api";

/** Return Akinyi's 12-order story, the chat, the messages, and the statement CSV. */
export async function GET() {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const demo = buildDemoScenario(new Date());
  return NextResponse.json({
    sellerName: demo.sellerName,
    chatText: demo.chatText,
    paymentsText: demo.paymentsText,
    statementCsv: demo.statementCsv,
    orders: demo.orders.map((item) => ({
      id: item.id,
      title: item.title,
      customerName: item.order.customerName,
      items: item.order.items,
      expectedAmountKes: item.order.expectedAmountKes,
      orderedAt: item.order.orderedAt,
      claimedCode: item.order.claimedCode,
      chatExcerpt: `${item.order.customerName}: order`,
    })),
    payments: demo.orders.flatMap((item) =>
      item.payment ? [{ rawText: item.payment.rawText, senderLabel: item.payment.senderLabel }] : [],
    ),
  });
}
