/**
 * apps/web/src/app/batches/[id]/page.tsx
 * Results. Hold first. Every card says how strongly it was checked.
 */
"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { BatchReport, OrderVerdict, Verdict } from "@orderverify/engine";
import { CheckRow, EvidenceDiff, LimitsPanel, ReplyDrafts } from "@/components/bits";
import { VerdictBadge } from "@/components/VerdictBadge";
import { useI18n } from "@/i18n";
import { formatKes } from "@/lib/format";

interface Payload {
  batch: { status: string; evidenceTier: string; errorCode: string | null };
  orders: {
    id: string;
    customerName: string;
    items: { name: string; qty: number }[];
    expectedAmountKes: number | null;
    chatExcerpt: string;
    phoneLast3: string | null;
    sellerDecision: string | null;
    claimedCode: string | null;
  }[];
  payments: { id: string; rawText: string }[];
  report: BatchReport | null;
  drafts: Record<string, { en: string; sw: string }>;
}

/** Results for one batch. */
export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const [data, setData] = useState<Payload | null>(null);
  const [filter, setFilter] = useState<"ALL" | Verdict>("ALL");
  const [open, setOpen] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);

  async function load() {
    const response = await fetch(`/api/batches/${params.id}`);
    if (response.ok) setData((await response.json()) as Payload);
  }
  useEffect(() => {
    void load();
  }, [params.id]);

  const verdicts = data?.report?.orders ?? [];
  const sorted = useMemo(() => {
    const rank: Record<Verdict, number> = { HOLD: 0, REVIEW: 1, RELEASE: 2 };
    return [...verdicts].filter((order) => filter === "ALL" || order.verdict === filter).sort((a, b) => rank[a.verdict] - rank[b.verdict]);
  }, [verdicts, filter]);

  async function decide(orderId: string, decision: "released" | "held" | "more_info") {
    await fetch(`/api/orders/${orderId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    await load();
  }

  async function releaseConsistent() {
    const releases = verdicts.filter((order) => order.verdict === "RELEASE");
    for (const order of releases) await decide(order.orderId, "released");
    setConfirmBulk(false);
  }

  const selected = sorted.find((order) => order.orderId === open) ?? null;
  const selectedOrder = data?.orders.find((order) => order.id === selected?.orderId);

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:space-y-0">
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">{t.results}</h1>
          {data?.report ? (
            <p className="tabular text-muted">
              {data.report.counts.hold} hold · {data.report.counts.review} check · {data.report.counts.release} release · {formatKes(data.report.moneyHeldKes)} {t.onHold}
            </p>
          ) : null}
        </header>
        <div className="flex flex-wrap gap-2" role="tablist">
          {(["ALL", "HOLD", "REVIEW", "RELEASE"] as const).map((item) => (
            <button key={item} type="button" aria-pressed={filter === item} className={`min-h-12 rounded-full px-4 text-sm ${filter === item ? "bg-primary text-white" : "bg-surface border border-line"}`} onClick={() => setFilter(item)}>
              {item === "ALL" ? t.all : item === "HOLD" ? t.holdFilter : item === "REVIEW" ? t.reviewFilter : t.releaseFilter}
            </button>
          ))}
        </div>
        <ul className="space-y-3">
          {sorted.map((verdict) => {
            const order = data?.orders.find((item) => item.id === verdict.orderId);
            return (
              <li key={verdict.orderId}>
                <article className="rounded-card border border-line bg-surface p-4 shadow-sm">
                  <button type="button" className="w-full text-left" onClick={() => setOpen(verdict.orderId)}>
                    <h2 className="font-semibold">{order?.customerName}</h2>
                    <p className="text-sm text-muted">{order?.items.map((item) => `${item.qty} ${item.name}`).join(", ")}</p>
                    <p className="tabular text-sm">{formatKes(verdict.amountExpectedKes ?? 0)} · paid {verdict.amountPaidKes === null ? "—" : formatKes(verdict.amountPaidKes)}</p>
                    <div className="mt-2"><VerdictBadge verdict={verdict.verdict} tier={verdict.tier} lang={lang} /></div>
                    <p className="mt-2 text-sm">{lang === "sw" ? verdict.headlineSw : verdict.headlineEn}</p>
                    {verdict.verdict === "RELEASE" && verdict.tier === "TEXT_ONLY" ? <p className="mt-2 text-sm text-muted">{t.looksConsistentHint}</p> : null}
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="min-h-12 rounded-control bg-primary px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0c5a42]" onClick={() => void decide(verdict.orderId, "released")}>{t.release}</button>
                    <button type="button" className="min-h-12 rounded-control border border-line px-3 text-sm" onClick={() => void decide(verdict.orderId, "held")}>{t.keepHold}</button>
                    <button type="button" className="min-h-12 rounded-control border border-line px-3 text-sm" onClick={() => setOpen(verdict.orderId)}>{t.reply}</button>
                  </div>
                  {order?.sellerDecision ? <p className="mt-2 text-xs uppercase text-muted">{order.sellerDecision}</p> : null}
                </article>
              </li>
            );
          })}
        </ul>
        <button type="button" className="min-h-12 w-full rounded-control border border-primary text-primary" onClick={() => setConfirmBulk(true)} disabled={!verdicts.some((order) => order.verdict === "RELEASE")}>
          {t.releaseConsistent}
        </button>
        {confirmBulk ? (
          <div className="rounded-card border border-line bg-surface p-4" role="dialog" aria-modal="true">
            <p>{t.releaseConfirm}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="min-h-12 flex-1 rounded-control bg-primary text-white" onClick={() => void releaseConsistent()}>{t.confirm}</button>
              <button type="button" className="min-h-12 flex-1 rounded-control border border-line" onClick={() => setConfirmBulk(false)}>{t.cancel}</button>
            </div>
          </div>
        ) : null}
        <LimitsPanel />
      </div>
      {selected && selectedOrder ? (
        <aside className="rounded-card border border-line bg-surface p-5 shadow-sm lg:sticky lg:top-20">
          <OrderDetail verdict={selected} order={selectedOrder} payment={data?.payments.find((item) => item.id === selected.matchedPaymentId)?.rawText ?? ""} draft={data?.drafts[selected.orderId]} lang={lang} />
        </aside>
      ) : null}
    </div>
  );
}

function OrderDetail({
  verdict,
  order,
  payment,
  draft,
  lang,
}: {
  verdict: OrderVerdict;
  order: Payload["orders"][number];
  payment: string;
  draft?: { en: string; sw: string };
  lang: "en" | "sw";
}) {
  const mismatches = verdict.checks
    .filter((check) => check.status === "fail" || check.status === "warn")
    .map((check) => (lang === "sw" ? check.plainSw : check.plainEn));
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{order.customerName}</h2>
      <EvidenceDiff chat={order.chatExcerpt || order.customerName} message={payment} mismatches={mismatches} />
      <div className="space-y-2">
        {verdict.checks.map((check) => (
          <CheckRow key={check.id} title={lang === "sw" ? check.titleSw : check.titleEn} plain={lang === "sw" ? check.plainSw : check.plainEn} status={check.status} evidence={check.evidence} />
        ))}
      </div>
      {draft ? <ReplyDrafts en={draft.en} swahili={draft.sw} /> : null}
    </div>
  );
}
