/**
 * apps/web/src/app/api/batches/[id]/events/route.ts
 * Live timeline. EventSource uses the stream; everyone else can poll with ?poll=1.
 */
import { and, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sellerOrLimit } from "@/server/api";
import { getDb } from "@/server/db/client";
import { agentEvents, batches } from "@/server/db/schema";

/** Stream new timeline rows until the batch reaches a terminal status. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const { id } = await context.params;
  const db = getDb();
  const [batch] = await db.select().from(batches).where(and(eq(batches.id, id), eq(batches.sellerId, gate.seller.id))).limit(1);
  if (!batch) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = new URL(request.url);
  const after = Number(url.searchParams.get("after") ?? 0);
  if (url.searchParams.get("poll") === "1" || !request.headers.get("accept")?.includes("text/event-stream")) {
    const rows = await db.select().from(agentEvents).where(and(eq(agentEvents.batchId, id), gt(agentEvents.id, after))).orderBy(agentEvents.id);
    const [fresh] = await db.select().from(batches).where(eq(batches.id, id)).limit(1);
    return NextResponse.json({
      status: fresh?.status,
      errorCode: fresh?.errorCode ?? null,
      events: rows.map(serialize),
    });
  }

  const encoder = new TextEncoder();
  let cursor = after;
  const stream = new ReadableStream({
    async start(controller) {
      const timer = setInterval(async () => {
        try {
          const rows = await db
            .select()
            .from(agentEvents)
            .where(and(eq(agentEvents.batchId, id), gt(agentEvents.id, cursor)))
            .orderBy(agentEvents.id);
          for (const row of rows) {
            cursor = Number(row.id);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(serialize(row))}\n\n`));
          }
          const [fresh] = await db.select().from(batches).where(eq(batches.id, id)).limit(1);
          if (fresh && ["done", "error", "blocked_cap"].includes(fresh.status)) {
            controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ status: fresh.status, errorCode: fresh.errorCode })}\n\n`));
            clearInterval(timer);
            controller.close();
          }
        } catch {
          clearInterval(timer);
          controller.close();
        }
      }, 700);
      request.signal.addEventListener("abort", () => {
        clearInterval(timer);
        controller.close();
      });
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function serialize(row: typeof agentEvents.$inferSelect) {
  return {
    id: Number(row.id),
    at: row.at.toISOString(),
    kind: row.kind,
    message: row.message,
    data: row.data,
  };
}
