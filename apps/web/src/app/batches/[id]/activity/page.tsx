/**
 * apps/web/src/app/batches/[id]/activity/page.tsx
 * Live verification: visual stage tracker driven by real agent events,
 * then the completed report on the same page.
 */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AgentTimeline, ErrorState } from "@/components/bits";
import { VerificationReport, type ReportPayload } from "@/components/VerificationReport";
import { VerificationTracker } from "@/components/VerificationTracker";
import { useI18n } from "@/i18n";
import { trackerFromEvents } from "@/lib/verificationProgress";

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
  const { t } = useI18n();
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState("paying");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [payload, setPayload] = useState<ReportPayload | null>(null);

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
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [params.id]);

  useEffect(() => {
    if (status !== "done") return;
    void fetch(`/api/batches/${params.id}`)
      .then((response) => response.json())
      .then((body: ReportPayload) => {
        if (body.report) {
          setPayload(body);
          window.requestAnimationFrame(() => {
            document.getElementById("verification-report")?.scrollIntoView({ block: "start" });
          });
        }
      })
      .catch(() => undefined);
  }, [params.id, status]);

  const snapshot = useMemo(() => trackerFromEvents(events, status), [events, status]);

  async function decide(orderId: string, decision: "released" | "held" | "more_info") {
    await fetch(`/api/orders/${orderId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const response = await fetch(`/api/batches/${params.id}`);
    if (response.ok) {
      const body = (await response.json()) as ReportPayload;
      if (body.report) setPayload(body);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {payload ? null : <VerificationTracker snapshot={snapshot} t={t} />}

      {errorCode === "cap_reached" ? (
        <ErrorState title={t.capReached} detail={message} action={<Link className="font-medium underline" href="/wallet">{t.raiseCap}</Link>} />
      ) : null}
      {errorCode === "verify_failed" ? <ErrorState title={t.serviceDown} detail={`${message} ${t.notCharged}`} /> : null}
      {status === "error" && !errorCode ? <ErrorState title={t.serviceDown} detail={message} /> : null}

      {snapshot.complete ? (
        <div className="rounded-brand-card border border-[#E3F8EC] bg-[#E3F8EC] px-4 py-3 text-[#0E9F5B]" role="status">
          <p className="font-semibold">{t.reportComplete}</p>
          {payload ? null : (
            <a className="mt-1 inline-block text-sm underline" href="#verification-report">
              {t.viewReport}
            </a>
          )}
        </div>
      ) : null}

      {events.length > 0 ? (
        <details className="rounded-brand-card border border-[#F0E2C8] bg-white px-4 py-3">
          <summary className="cursor-pointer font-medium text-brand-ink">{t.eventLog}</summary>
          <AgentTimeline events={events} />
        </details>
      ) : null}

      {payload ? <VerificationReport payload={payload} onDecide={decide} /> : null}

      {status !== "done" ? (
        <div className="flex gap-2">
          <Link href="/check" className="flex min-h-12 flex-1 items-center justify-center rounded-brand-control border border-[#F0E2C8] bg-white">
            {t.cancel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
