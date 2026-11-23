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
      <h1 className="text-3xl font-semibold tracking-tight">{t.walletTitle}</h1>
      <section className="rounded-card bg-primary p-6 text-white shadow-sm">
        <p className="text-sm text-white/80">KES</p>
        <p className="tabular text-3xl font-semibold tracking-tight">{Math.round(kes).toLocaleString("en-KE")}</p>
        <p className="tabular text-sm">{(home?.walletBalanceUsd ?? 0).toFixed(2)} USDC</p>
        <p className="mt-3 text-sm text-white/90">{t.simulatedNote}</p>
      </section>
      <p className="text-sm">{health?.verify ? t.serviceOnline : t.serviceOffline}</p>
      <button
        type="button"
        className="min-h-12 w-full rounded-control border border-primary bg-surface font-semibold text-primary shadow-sm transition-colors hover:bg-paper"
        onClick={async () => {
          await fetch("/api/seller/topup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amountUsd: 1 }) });
          await load();
        }}
      >
        {t.topUp} · $1
      </button>
      <section className="rounded-card border border-line bg-surface p-5 shadow-sm">
        <h2 className="font-medium">{t.weeklyCap}</h2>
        <label className="mt-3 block text-sm">
          KES
          <input className="mt-1 w-full min-h-12 rounded-control border border-line bg-paper px-3 tabular" type="number" min={0} value={cap} onChange={(event) => setCap(Number(event.target.value))} />
        </label>
        <input className="mt-3 w-full" type="range" min={0} max={500} value={cap} onChange={(event) => setCap(Number(event.target.value))} aria-label={t.weeklyCap} />
        <div className="mt-3"><CapMeter spentKes={spentKes} capKes={cap} /></div>
        <button
          type="button"
          className="mt-3 min-h-12 w-full rounded-control bg-primary font-semibold text-white shadow-sm transition-colors hover:bg-[#0c5a42]"
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
              <Link className="text-sm text-primary" href={`/batches/${payment.batchId}`}>{t.results}</Link>
            </div>
          ))}
        </div>
      </section>
      <details className="rounded-card border border-line bg-surface p-5 shadow-sm">
        <summary className="cursor-pointer font-medium">{t.howTitle}</summary>
        <p className="mt-2 text-sm text-muted">{t.howBody}</p>
      </details>
      <p className="text-sm text-muted">{t.costLine}</p>
    </div>
  );
}
