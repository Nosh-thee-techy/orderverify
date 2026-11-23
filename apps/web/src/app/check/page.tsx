/**
 * apps/web/src/app/check/page.tsx
 * Three-step check: chat, payments, then an editable review before any money moves.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { parseStatement, splitMpesaMessages, statementRowToMpesaText } from "@orderverify/engine";
import { CostBar, FileDrop, PasteArea, Stepper, TrustMeter } from "@/components/bits";
import { useI18n } from "@/i18n";
import { priceKes, remainingCapKes } from "@orderverify/engine";

interface DraftOrder {
  customerName: string;
  items: { name: string; qty: number; unitPriceKes?: number | null }[];
  expectedAmountKes: number | null;
  orderedAt: string;
  claimedCode: string | null;
  chatExcerpt?: string;
}

interface SellerSnap {
  weeklyCapKes: number;
  spentUsd: number;
  priceUsd: number;
  kesPerUsd: number;
  walletBalanceUsd: number;
}

/** The check wizard. */
export default function CheckPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [chat, setChat] = useState("");
  const [payments, setPayments] = useState("");
  const [statement, setStatement] = useState("");
  const [availableStatement, setAvailableStatement] = useState("");
  const [includeStatement, setIncludeStatement] = useState(false);
  const [labelledPayments, setLabelledPayments] = useState<{ rawText: string; senderLabel: string | null }[] | null>(null);
  const [orders, setOrders] = useState<DraftOrder[]>([]);
  const [mode, setMode] = useState<"llm" | "basic" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seller, setSeller] = useState<SellerSnap | null>(null);

  useEffect(() => {
    void fetch("/api/home").then((response) => response.json()).then((body: SellerSnap) => setSeller(body)).catch(() => undefined);
  }, []);

  const messageCount = useMemo(() => (payments.trim() ? splitMpesaMessages(payments).length : 0), [payments]);
  const statementRowCount = useMemo(() => {
    const source = statement.trim() ? statement : availableStatement;
    return source.trim() ? parseStatement(source).length : 0;
  }, [statement, availableStatement]);
  const cost = seller ? priceKes(seller.priceUsd, seller.kesPerUsd) : 1.3;
  const left = seller ? remainingCapKes(seller.spentUsd, seller.weeklyCapKes, seller.kesPerUsd) : 50;
  const blocked = left < cost;

  async function useSample() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/sample");
    const body = await response.json();
    setChat(body.chatText);
    setPayments(body.paymentsText);
    setAvailableStatement(body.statementCsv);
    setStatement("");
    setIncludeStatement(false);
    setLabelledPayments(body.payments);
    setOrders(body.orders);
    setMode("basic");
    setStep(3);
    setBusy(false);
  }

  async function extract() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chatText: chat }),
    });
    if (!response.ok) {
      setError("Could not read that chat.");
      setBusy(false);
      return;
    }
    const body = await response.json();
    setOrders(body.orders ?? []);
    setMode(body.mode);
    setStep(2);
    setBusy(false);
  }

  async function run() {
    setBusy(true);
    setError("");
    const created = await fetch("/api/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orders,
        paymentsText: payments,
        payments: labelledPayments ?? undefined,
        statementCsv: includeStatement && (statement || availableStatement) ? statement || availableStatement : null,
      }),
    });
    if (!created.ok) {
      setError("Could not save this check.");
      setBusy(false);
      return;
    }
    const batch = (await created.json()) as { id: string };
    router.push(`/batches/${batch.id}/activity`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Stepper step={step} />
      <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-ink">{step === 1 ? t.yourOrders : step === 2 ? t.yourPayments : t.review}</h1>
      {step === 1 ? (
        <>
          <PasteArea label={t.pasteChat} value={chat} onChange={setChat} hint={t.howToExport} />
          <FileDrop label={t.uploadDocument} onText={(text) => setChat(text)} />
          <button type="button" className="text-sm font-medium text-brand-orange" onClick={() => void useSample()}>{t.useSample}</button>
        </>
      ) : null}
      {step === 2 ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <p className="text-sm font-medium text-brand-ink">{t.pasteMpesa}</p>
            <p className="text-right text-sm font-medium text-brand-ink">{t.uploadStatement}</p>
          </div>
          <PasteArea label={t.pasteMpesa} value={payments} onChange={setPayments} />
          <p className="tabular text-sm text-brand-ink">{messageCount} {t.messagesFound}</p>
          {statementRowCount > 0 ? (
            <p className="tabular text-sm text-brand-ink">{statementRowCount} {t.statementRowsFound}</p>
          ) : null}
          <FileDrop
            label={t.uploadStatement}
            okLabel={t.statementLoaded}
            onText={(text) => {
              const rows = parseStatement(text);
              setStatement(text);
              setIncludeStatement(true);
              setLabelledPayments(null);
              if (rows.length > 0 && !payments.trim()) {
                const paidIn = rows.filter((row) => (row.paidInKes ?? 0) > 0);
                const source = paidIn.length > 0 ? paidIn : rows;
                setPayments(source.map(statementRowToMpesaText).join("\n\n"));
              }
            }}
          />
          <TrustMeter strong={includeStatement && (statement.trim().length > 0 || availableStatement.length > 0)} />
          {statement || availableStatement ? (
            <label className="flex min-h-12 items-center gap-3 text-sm text-brand-ink">
              <input type="checkbox" checked={includeStatement} onChange={(event) => setIncludeStatement(event.target.checked)} />
              {t.includeStatement}
            </label>
          ) : null}
        </>
      ) : null}
      {step === 3 ? (
        <>
          {mode === "basic" ? <p className="text-sm text-brand-muted">{t.basicExtraction}</p> : null}
          <ul className="space-y-3">
            {orders.map((order, index) => (
              <li key={`${order.customerName}-${index}`} className="rounded-brand-card border border-[#F0E2C8] bg-white p-4 shadow-brand-sm">
                <label className="block text-sm">
                  {t.customer}
                      <input className="mt-1 w-full min-h-12 rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-3" value={order.customerName} onChange={(event) => update(index, { customerName: event.target.value })} />
                </label>
                <label className="mt-2 block text-sm">
                  {t.items}
                  <input className="mt-1 w-full min-h-12 rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-3" value={order.items.map((item) => item.name).join(", ")} onChange={(event) => update(index, { items: [{ name: event.target.value, qty: 1, unitPriceKes: order.expectedAmountKes }] })} />
                </label>
                <label className="mt-2 block text-sm">
                  {t.amount}
                  <input className="mt-1 w-full min-h-12 rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-3 tabular" inputMode="numeric" value={order.expectedAmountKes ?? ""} onChange={(event) => update(index, { expectedAmountKes: event.target.value === "" ? null : Number(event.target.value) })} />
                </label>
                {order.expectedAmountKes === null ? <p className="mt-2 text-sm text-brand-tangerine">{t.addAmount}</p> : null}
                <label className="mt-2 block text-sm">
                  {t.code}
                  <input className="mt-1 w-full min-h-12 rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-3 font-mono" value={order.claimedCode ?? ""} onChange={(event) => update(index, { claimedCode: event.target.value || null })} />
                </label>
              </li>
            ))}
          </ul>
          <CostBar orders={orders.length} payments={messageCount} costKes={cost} leftKes={left} blocked={blocked} />
        </>
      ) : null}
      {error ? <p className="text-sm text-brand-hold" role="alert">{error}</p> : null}
      <div className="flex gap-2">
        {step > 1 ? <button type="button" className="min-h-12 flex-1 rounded-brand-control border border-[#F0E2C8] bg-white text-brand-ink shadow-brand-sm" onClick={() => setStep(step - 1)}>{t.back}</button> : null}
        {step === 1 ? <button type="button" disabled={busy || chat.trim().length < 2} className="min-h-12 flex-1 rounded-brand-control bg-brand-orange font-semibold text-white shadow-brand-orange transition-colors hover:bg-brand-orange-deep disabled:opacity-50" onClick={() => void extract()}>{busy ? "…" : t.next}</button> : null}
        {step === 2 ? <button type="button" className="min-h-12 flex-1 rounded-brand-control bg-brand-orange font-semibold text-white shadow-brand-orange transition-colors hover:bg-brand-orange-deep" onClick={() => setStep(3)}>{t.next}</button> : null}
        {step === 3 ? (
          blocked ? (
            <Link href="/wallet" className="flex min-h-12 flex-1 items-center justify-center rounded-brand-control bg-hold font-semibold text-white">{t.raiseCap}</Link>
          ) : (
            <button type="button" disabled={busy || orders.length === 0} className="min-h-12 flex-1 rounded-brand-control bg-brand-orange font-semibold text-white shadow-brand-orange transition-colors hover:bg-brand-orange-deep disabled:opacity-50" onClick={() => void run()}>{busy ? "…" : t.runCheck}</button>
          )
        ) : null}
      </div>
    </div>
  );

  function update(index: number, patch: Partial<DraftOrder>) {
    setOrders((current) => current.map((order, item) => (item === index ? { ...order, ...patch } : order)));
  }
}
