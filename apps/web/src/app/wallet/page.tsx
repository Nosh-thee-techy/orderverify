/**
 * apps/web/src/app/wallet/page.tsx
 * Simulated balance, the real weekly cap, and the payment audit trail.
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CapMeter, PaymentRow } from "@/components/bits";
import { useI18n } from "@/i18n";
import { formatWhen } from "@/lib/format";

interface Home {
  walletBalanceUsd: number;
  weeklyCapKes: number;
  agentPaused: boolean;
  spentUsd: number;
  kesPerUsd: number;
  priceUsd: number;
  payments: { id: string; batchId: string; amountUsd: number; status: string; txHash: string | null; createdAt: string }[];
}

/** Wallet screen. Top-ups are labelled as simulated. */
export default function WalletPage() {
  const { t, lang } = useI18n();
  const [home, setHome] = useState<Home | null>(null);
  const [health, setHealth] = useState<{ verify: boolean } | null>(null);
  const [cap, setCap] = useState(50);

  async function load() {
    const response = await fetch("/api/home");
    if (!response.ok) return;
    const body = (await response.json()) as Home;
    setHome(body);
    setCap(body.weeklyCapKes);
  }
  useEffect(() => {
    void load();
    void fetch("/api/health").then((response) => response.json()).then(setHealth).catch(() => setHealth({ verify: false }));
  }, []);

  const kes = (home?.walletBalanceUsd ?? 0) * (home?.kesPerUsd ?? 129);
  const spentKes = (home?.spentUsd ?? 0) * (home?.kesPerUsd ?? 129);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#FFD416] via-[#E4701D] to-[#E72369] p-4 text-white shadow-brand sm:p-6">
        <span className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-brand-yellow/70" aria-hidden />
        <span className="pointer-events-none absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-white/25" aria-hidden />
        <span className="pointer-events-none absolute bottom-[-2rem] left-40 h-24 w-24 rounded-full bg-brand-raspberry/40" aria-hidden />
        <div className="relative">
          <p className="text-sm font-medium text-white/85">{t.walletTitle}</p>
          <p className="mt-1 font-display tabular text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            KES {Math.round(kes).toLocaleString("en-KE")}
          </p>
          <p className="tabular text-sm text-white/90">{(home?.walletBalanceUsd ?? 0).toFixed(2)} USDC</p>
          <p className="mt-2 max-w-md text-sm text-white/90 sm:text-base">{t.simulatedNote}</p>
        </div>
      </section>
      <p className="text-sm">{health?.verify ? t.serviceOnline : t.serviceOffline}</p>
        <button
          type="button"
          className="min-h-12 w-full rounded-brand-control border border-brand-orange bg-white font-semibold text-brand-orange shadow-brand-sm transition-colors hover:bg-brand-bg"
          onClick={async () => {
            await fetch("/api/seller/topup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amountUsd: 1 }) });
            await load();
          }}
        >
          {t.topUp} · $1
        </button>
        <section className="rounded-brand-card border border-[#F0E2C8] bg-white p-5 shadow-brand-sm">
          <h2 className="font-medium">{t.weeklyCap}</h2>
          <label className="mt-3 block text-sm">
            KES
            <input className="mt-1 w-full min-h-12 rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-3 tabular" type="number" min={0} value={cap} onChange={(event) => setCap(Number(event.target.value))} />
          </label>
          <input className="mt-3 w-full" type="range" min={0} max={500} value={cap} onChange={(event) => setCap(Number(event.target.value))} aria-label={t.weeklyCap} />
          <div className="mt-3">
            <CapMeter spentKes={spentKes} capKes={cap} />
          </div>
          <button
            type="button"
            className="mt-3 min-h-12 w-full rounded-brand-control bg-brand-orange font-semibold text-white shadow-brand-orange transition-colors hover:bg-brand-orange-deep"
            onClick={async () => {
              await fetch("/api/seller", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ weeklyCapKes: cap }) });
              await load();
            }}
          >
            {t.weeklyCap}
          </button>
          <label className="mt-4 flex min-h-12 items-center justify-between gap-3">
            <span>{t.pause}</span>
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={home?.agentPaused ?? false}
              onChange={async (event) => {
                await fetch("/api/seller", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ agentPaused: event.target.checked }) });
                await load();
              }}
            />
          </label>
        </section>
        <section>
          <h2 className="mb-2 font-medium">{t.history}</h2>
          <div className="space-y-2">
            {home?.payments.map((payment) => (
              <div key={payment.id}>
                <PaymentRow when={formatWhen(payment.createdAt, lang)} amountUsd={payment.amountUsd} amountKes={Math.round(payment.amountUsd * (home.kesPerUsd ?? 129) * 10) / 10} status={payment.status} hash={payment.txHash} />
                <Link className="text-sm text-brand-orange" href={`/batches/${payment.batchId}`}>
                  {t.results}
                </Link>
              </div>
            ))}
          </div>
        </section>
       
        <details className="rounded-brand-card border border-[#F0E2C8] bg-white p-5 shadow-brand-sm">
          <summary className="cursor-pointer font-medium">{t.howTitle}</summary>
          <p className="mt-2 text-sm text-muted">{t.howBody}</p>
        </details>
        
      <p className="text-sm text-muted">{t.costLine}</p>
    </div>
  );
}
