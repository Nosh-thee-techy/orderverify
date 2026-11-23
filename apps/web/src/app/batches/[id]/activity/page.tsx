/**
 * apps/web/src/app/batches/[id]/activity/page.tsx
 * The demo moment: payment required, paid, report delivered, with the live timeline.
 */
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentStages, AgentTimeline, ErrorState } from "@/components/bits";
import { useI18n } from "@/i18n";

interface AgentEvent {
  id: number;
  at: string;
  kind: string;
  message: string;
  data?: { txHash?: string; amountUsd?: string; network?: string } | null;
}

/** Full-screen activity. Starts the run, then follows events until the batch finishes. */
export default function ActivityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState("paying");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let stopped = false;
    let after = 0;
    async function start() {
      const run = await fetch(`/api/batches/${params.id}/run`, { method: "POST" });
      const body = await run.json();
      if (!run.ok && body.error) {
        setStatus(body.status ?? "error");
        setErrorCode(body.error);
        setMessage(body.message ?? "");
      }
    }
    void start();
    const timer = setInterval(async () => {
      if (stopped) return;
      const response = await fetch(`/api/batches/${params.id}/events?poll=1&after=${after}`);
      if (!response.ok) return;
      const body = await response.json();
      if (body.events?.length) {
        setEvents((current) => {
          const known = new Set(current.map((event) => event.id));
          return [...current, ...body.events.filter((event: AgentEvent) => !known.has(event.id))];
        });
        after = body.events[body.events.length - 1].id;
      }
      setStatus(body.status);
      setErrorCode(body.errorCode);
      if (["done", "error", "blocked_cap"].includes(body.status)) stopped = true;
    }, 1000);
    return () => clearInterval(timer);
  }, [params.id]);

  const stage: 0 | 1 | 2 | 3 = events.some((event) => event.kind === "report_received" || event.kind === "held")
    ? 3
    : events.some((event) => event.kind === "settled" || event.kind === "signed")
      ? 2
      : events.some((event) => event.kind === "payment_required")
        ? 1
        : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t.agentTitle}</h1>
      <AgentStages stage={stage} />
      {errorCode === "cap_reached" ? <ErrorState title={t.capReached} detail={message} action={<Link className="font-medium underline" href="/wallet">{t.raiseCap}</Link>} /> : null}
      {errorCode === "verify_failed" ? <ErrorState title={t.serviceDown} detail={`${message} ${t.notCharged}`} /> : null}
      {status === "error" && !errorCode ? <ErrorState title={t.serviceDown} detail={message} /> : null}
      <AgentTimeline events={events} />
      <div className="flex gap-2">
        {status !== "done" ? (
          <Link href="/check" className="flex min-h-12 flex-1 items-center justify-center rounded-control border border-line bg-surface">{t.cancel}</Link>
        ) : (
          <button type="button" className="min-h-12 flex-1 rounded-control bg-primary font-semibold text-white shadow-sm transition-colors hover:bg-[#0c5a42]" onClick={() => router.push(`/batches/${params.id}`)}>{t.done}</button>
        )}
      </div>
    </div>
  );
}
