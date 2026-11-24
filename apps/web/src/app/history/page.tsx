/**
 * apps/web/src/app/history/page.tsx
 * The seller's batches and M-Pesa records over time. Search hashes the query
 * and also matches decrypted text for this seller only.
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { History, Search } from "lucide-react";
import { VerdictBadge } from "@/components/VerdictBadge";
import { useI18n } from "@/i18n";
import { formatKes, formatWhen } from "@/lib/format";
import type { Verdict } from "@orderverify/engine";

interface HistoryBatch {
  id: string;
  createdAt: string;
  status: string;
  source: string;
  counts: { hold: number; review: number; release: number; total: number };
  preview: { id: string; customerName: string; claimedCode: string | null; verdict: string | null; tier: string | null }[];
}

interface MpesaRow {
  id: string;
  batchId: string;
  code: string;
  amountKes: number | null;
  payerName: string;
  receivedAt: string | null;
  createdAt: string;
}

/** Seller history: batches tab and M-Pesa records tab. */
export default function HistoryPage() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<"orders" | "mpesa">("orders");
  const [q, setQ] = useState("");
  const [verdict, setVerdict] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [batches, setBatches] = useState<HistoryBatch[]>([]);
  const [records, setRecords] = useState<MpesaRow[]>([]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ tab, page: String(page) });
    if (q) params.set("q", q);
    if (verdict) params.set("verdict", verdict);
    if (source) params.set("source", source);
    const response = await fetch(`/api/history?${params.toString()}`);
    if (!response.ok) return;
    const body = (await response.json()) as {
      total: number;
      batches?: HistoryBatch[];
      records?: MpesaRow[];
    };
    setTotal(body.total);
    setBatches(body.batches ?? []);
    setRecords(body.records ?? []);
  }, [tab, q, verdict, source, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <History className="h-6 w-6 text-brand-orange" aria-hidden />
        <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-ink">{t.orderHistory}</h1>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className={`min-h-11 rounded-brand-control px-4 text-sm font-medium ${tab === "orders" ? "bg-brand-orange text-white" : "border border-[#F0E2C8] bg-white"}`}
          onClick={() => {
            setTab("orders");
            setPage(1);
          }}
        >
          {t.orderHistory}
        </button>
        <button
          type="button"
          className={`min-h-11 rounded-brand-control px-4 text-sm font-medium ${tab === "mpesa" ? "bg-brand-orange text-white" : "border border-[#F0E2C8] bg-white"}`}
          onClick={() => {
            setTab("mpesa");
            setPage(1);
          }}
        >
          {t.mpesaRecords}
        </button>
      </div>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          void load();
        }}
      >
        <label className="flex-1 text-sm">
          {t.searchHistory}
          <span className="mt-1 flex min-h-12 items-center gap-2 rounded-brand-control border border-[#F0E2C8] bg-white px-3">
            <Search className="h-4 w-4 text-brand-muted" aria-hidden />
            <input
              className="w-full bg-transparent outline-none"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={t.searchHistoryHint}
            />
          </span>
        </label>
        {tab === "orders" ? (
          <>
            <label className="text-sm">
              {t.results}
              <select
                className="mt-1 min-h-12 w-full rounded-brand-control border border-[#F0E2C8] bg-white px-3"
                value={verdict}
                onChange={(event) => {
                  setVerdict(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t.all}</option>
                <option value="RELEASE">{t.releaseFilter}</option>
                <option value="REVIEW">{t.reviewFilter}</option>
                <option value="HOLD">{t.holdFilter}</option>
              </select>
            </label>
            <label className="text-sm">
              {t.source}
              <select
                className="mt-1 min-h-12 w-full rounded-brand-control border border-[#F0E2C8] bg-white px-3"
                value={source}
                onChange={(event) => {
                  setSource(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t.all}</option>
                <option value="upload">{t.sourceUpload}</option>
                <option value="whatsapp">{t.sourceWhatsapp}</option>
                <option value="tiktok">{t.sourceTiktok}</option>
              </select>
            </label>
          </>
        ) : null}
      </form>

      {tab === "orders" ? (
        <ul className="divide-y divide-[#F0E2C8] overflow-hidden rounded-brand-card border border-[#F0E2C8] bg-white shadow-brand-sm">
          {batches.length === 0 ? (
            <li className="p-5 text-sm text-brand-muted">{t.emptyHistory}</li>
          ) : (
            batches.map((batch) => (
              <li key={batch.id}>
                <Link href={batch.status === "done" ? `/batches/${batch.id}` : `/batches/${batch.id}/activity`} className="block px-5 py-4 hover:bg-[#FFFBF0]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-brand-muted">{formatWhen(batch.createdAt, lang)}</p>
                    <p className="text-sm text-brand-ink">
                      {batch.counts.total} {t.ordersWord} · {batch.source}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {batch.counts.hold > 0 ? (
                      <span className="rounded-full bg-brand-hold-bg px-2.5 py-0.5 text-xs font-medium text-brand-hold">
                        {batch.counts.hold} {t.holdFilter}
                      </span>
                    ) : null}
                    {batch.counts.review > 0 ? (
                      <span className="rounded-full bg-brand-review-bg px-2.5 py-0.5 text-xs font-medium text-brand-review">
                        {batch.counts.review} {t.reviewFilter}
                      </span>
                    ) : null}
                    {batch.counts.release > 0 ? (
                      <span className="rounded-full bg-brand-release-bg px-2.5 py-0.5 text-xs font-medium text-brand-release">
                        {batch.counts.release} {t.releaseFilter}
                      </span>
                    ) : null}
                  </div>
                  <ul className="mt-3 space-y-1">
                    {batch.preview.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-brand-ink">{item.customerName}</span>
                        {item.claimedCode ? <span className="font-mono text-brand-muted">{item.claimedCode}</span> : null}
                        {item.verdict === "HOLD" || item.verdict === "REVIEW" || item.verdict === "RELEASE" ? (
                          <VerdictBadge
                            verdict={item.verdict as Verdict}
                            tier={item.tier === "STATEMENT_VERIFIED" ? "STATEMENT_VERIFIED" : "TEXT_ONLY"}
                            lang={lang}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : (
        <ul className="divide-y divide-[#F0E2C8] overflow-hidden rounded-brand-card border border-[#F0E2C8] bg-white shadow-brand-sm">
          {records.length === 0 ? (
            <li className="p-5 text-sm text-brand-muted">{t.emptyHistory}</li>
          ) : (
            records.map((row) => (
              <li key={row.id} className="px-5 py-4">
                <Link href={`/batches/${row.batchId}`} className="block">
                  <p className="font-mono text-sm font-medium text-brand-ink">{row.code}</p>
                  <p className="mt-1 text-sm text-brand-muted">
                    {row.payerName || "—"} · {row.amountKes == null ? "—" : formatKes(row.amountKes)} · {formatWhen(row.receivedAt ?? row.createdAt, lang)}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="min-h-11 rounded-brand-control border border-[#F0E2C8] bg-white px-4 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            {t.back}
          </button>
          <p className="text-brand-muted">
            {t.pageOf} {page} / {pages}
          </p>
          <button
            type="button"
            className="min-h-11 rounded-brand-control border border-[#F0E2C8] bg-white px-4 disabled:opacity-50"
            disabled={page >= pages}
            onClick={() => setPage((current) => current + 1)}
          >
            {t.next}
          </button>
        </div>
      ) : null}
    </div>
  );
}
