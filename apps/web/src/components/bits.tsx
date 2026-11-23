/**
 * apps/web/src/components/bits.tsx
 * Small interface pieces shared by Today, Check, Wallet, and Results.
 */
"use client";

import { useState } from "react";
import { Check, CheckCircle2, Copy, ExternalLink, OctagonPause } from "lucide-react";
import { cn } from "@/lib/cn";
import { explorerUrl, shortHash } from "@/lib/format";
import { useI18n } from "@/i18n";

/** A labelled number, always with words so colour is not the only cue. */
export function StatChip({ label, value, tone }: { label: string; value: string | number; tone?: "hold" | "review" | "release" }) {
  const toneClass =
    tone === "hold"
      ? "border-hold/15 bg-hold-bg"
      : tone === "review"
        ? "border-review/15 bg-review-bg"
        : tone === "release"
          ? "border-release/15 bg-release-bg"
          : "border-line bg-surface";
  const valueClass = tone === "hold" ? "text-hold" : tone === "review" ? "text-review" : tone === "release" ? "text-release" : "text-ink";
  return (
    <div className={cn("flex h-full min-h-[7.25rem] flex-col justify-between rounded-card border px-5 py-4 shadow-sm", toneClass)}>
      <div className="text-sm text-muted">{label}</div>
      <div className={cn("tabular text-3xl font-semibold tracking-tight", valueClass)}>{value}</div>
    </div>
  );
}

/** The home hero: money currently held, or a calm empty state. */
export function HeroHoldCard({ holdKes, holdCount }: { holdKes: number; holdCount: number }) {
  const { t } = useI18n();
  if (holdCount === 0) {
    return (
      <section className="flex items-start gap-4 rounded-card border border-release/15 bg-release-bg px-5 py-5 sm:px-6">
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-release" aria-hidden>
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <p className="text-lg font-semibold leading-snug text-release">{t.nothingOnHold}</p>
      </section>
    );
  }
  return (
    <section className="rounded-card border border-hold/15 bg-hold-bg px-5 py-5 text-hold sm:px-6">
      <div className="flex items-start gap-4">
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-hold" aria-hidden>
          <OctagonPause className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-medium">{t.onHold}</p>
          <p className="mt-1 tabular text-3xl font-semibold tracking-tight">KES {holdKes.toLocaleString("en-KE")}</p>
          <p className="mt-1">
            {t.onHoldFrom} {holdCount} {t.ordersWord}
          </p>
        </div>
      </div>
    </section>
  );
}

/** Friendly empty panel with one action. */
export function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface px-5 py-10 text-center">
      <p className="text-muted">{title}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Error panel that says what happened and offers one next step. */
export function ErrorState({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-hold/20 bg-hold-bg px-5 py-4 text-hold" role="alert">
      <p className="font-semibold">{title}</p>
      {detail ? <p className="mt-1 text-sm">{detail}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** "Step 1 of 3" progress. */
export function Stepper({ step }: { step: number }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="text-sm text-muted">{t.step} {step} {t.of} 3</p>
      <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden>
        {[1, 2, 3].map((item) => (
          <div key={item} className={cn("h-2 rounded-full", item <= step ? "bg-primary" : "bg-line")} />
        ))}
      </div>
    </div>
  );
}

/** Large paste box. The caller owns the text. */
export function PasteArea({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block font-medium">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={8} className="w-full rounded-control border border-line bg-surface p-3 text-base shadow-sm outline-none transition-shadow focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(15,107,79,0.15)]" />
      {hint ? <span className="mt-2 block text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

/** File picker that reads text on the device before anything is uploaded. */
export function FileDrop({ label, accept, onText }: { label: string; accept: string; onText: (text: string, name: string) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-control border border-dashed border-line bg-surface px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:border-primary/40 hover:bg-paper">
      {label}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          onText(await file.text(), file.name);
        }}
      />
    </label>
  );
}

/** Basic check versus a statement. The tooltip text is always visible underneath, not only on hover. */
export function TrustMeter({ strong }: { strong: boolean }) {
  const { t } = useI18n();
  return (
    <div className={cn("rounded-card border p-4 text-sm", strong ? "border-info/15 bg-info-bg text-info" : "border-review/15 bg-review-bg text-review")}>
      <p className="font-medium">{strong ? t.trustStrong : t.trustBasic}</p>
      <p className="mt-1">{t.trustHint}</p>
    </div>
  );
}

/** Cost and remaining cap, stuck above the primary button. */
export function CostBar({ orders, payments, costKes, leftKes, blocked }: { orders: number; payments: number; costKes: number; leftKes: number; blocked: boolean }) {
  const { t } = useI18n();
  return (
    <div className={cn("rounded-card border px-4 py-3 text-sm", blocked ? "border-hold/20 bg-hold-bg text-hold" : "border-line bg-surface text-ink")}>
      <p className="tabular">{orders} {t.ordersWord} · {payments} {t.messagesFound}</p>
      <p>KES {costKes} (0.01 USDC) · KES {leftKes} {t.leftThisWeek}</p>
      {blocked ? <p className="mt-1 font-medium">{t.capBlocked}</p> : null}
    </div>
  );
}

/** Copyable transaction hash plus an explorer link. */
export function TxHashChip({ hash }: { hash: string | null }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  if (!hash) return <span className="text-sm text-muted">—</span>;
  const url = explorerUrl(hash);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <code className="font-mono text-sm">{shortHash(hash)}</code>
      <button
        type="button"
        className="inline-flex min-h-10 items-center gap-1 text-sm text-primary"
        onClick={() => {
          void navigator.clipboard.writeText(hash);
          setCopied(true);
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? t.copied : t.copy}
      </button>
      {url ? (
        <a className="inline-flex min-h-10 items-center gap-1 text-sm text-primary" href={url} target="_blank" rel="noreferrer">
          <ExternalLink className="h-4 w-4" />
          Explorer
        </a>
      ) : null}
    </span>
  );
}

/** Weekly spend against the cap the seller set. */
export function CapMeter({ spentKes, capKes }: { spentKes: number; capKes: number }) {
  const { t } = useI18n();
  const ratio = capKes <= 0 ? 1 : Math.min(1, spentKes / capKes);
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="tabular">KES {Math.round(spentKes)} / {capKes}</span>
        <span className="text-muted">{t.usedThisWeek}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-line" role="meter" aria-valuenow={Math.round(spentKes)} aria-valuemax={capKes}>
        <div className="h-full bg-primary" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

/** One row in the payment history. */
export function PaymentRow({ when, amountUsd, amountKes, status, hash }: { when: string; amountUsd: number; amountKes: number; status: string; hash: string | null }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{when}</p>
          <p className="tabular font-medium">KES {amountKes} · {amountUsd.toFixed(2)} USDC</p>
        </div>
        <span className="rounded-full bg-paper px-2 py-1 text-xs uppercase">{status}</span>
      </div>
      <div className="mt-2">
        <TxHashChip hash={hash} />
      </div>
    </div>
  );
}

/** The three moments of a paid check. Filled in as events arrive. */
export function AgentStages({ stage }: { stage: 0 | 1 | 2 | 3 }) {
  const { t } = useI18n();
  const items = [t.stageRequired, t.stagePaid, t.stageReport];
  return (
    <ol className="grid grid-cols-3 gap-2">
      {items.map((label, index) => {
        const done = stage > index;
        return (
          <li key={label} className={cn("rounded-card border p-4 text-center text-sm", done ? "border-primary/20 bg-release-bg text-primary" : "border-line bg-surface text-muted")}>
            <div className={cn("mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold", done ? "bg-primary text-white" : "bg-paper")}>{index + 1}</div>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

/** Vertical list of agent events. */
export function AgentTimeline({
  events,
}: {
  events: { id: number; at: string; message: string; data?: { txHash?: string; amountUsd?: string; network?: string } | null }[];
}) {
  return (
    <ol className="mt-4 space-y-3">
      {events.map((event) => (
        <li key={event.id} className="rounded-card border border-line bg-surface p-4 shadow-sm">
          <p className="text-xs text-muted">{new Date(event.at).toLocaleTimeString()}</p>
          <p>{event.message}</p>
          {event.data?.amountUsd ? <p className="font-mono text-sm text-muted">{event.data.amountUsd} USDC · {event.data.network}</p> : null}
          {event.data?.txHash ? <TxHashChip hash={event.data.txHash} /> : null}
        </li>
      ))}
    </ol>
  );
}

/** One rule, with an expandable evidence list. */
export function CheckRow({ title, plain, status, evidence }: { title: string; plain: string; status: string; evidence: Record<string, string | number | null> }) {
  const mark = status === "fail" ? "✕" : status === "warn" ? "!" : status === "pass" ? "✓" : "–";
  return (
    <details className="rounded-control border border-line bg-surface p-4">
      <summary className="flex cursor-pointer items-start gap-3">
        <span aria-hidden className="mt-0.5 font-semibold">{mark}</span>
        <span>
          <span className="block font-medium">{title}</span>
          <span className="block text-sm text-muted">{plain}</span>
        </span>
      </summary>
      <dl className="mt-3 space-y-1 pl-7 text-sm">
        {Object.entries(evidence).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3">
            <dt className="text-muted">{key}</dt>
            <dd className="font-mono">{value === null ? "—" : String(value)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** Side-by-side excerpt. Mismatched values get a red underline and an icon, not colour alone. */
export function EvidenceDiff({ chat, message, mismatches }: { chat: string; message: string; mismatches: string[] }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-card border border-line bg-paper p-4">
        <h3 className="text-sm font-medium">{t.inChat}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm">{chat || "—"}</p>
      </article>
      <article className="rounded-card border border-line bg-paper p-4">
        <h3 className="text-sm font-medium">{t.inMpesa}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm">{message || "—"}</p>
        {mismatches.length ? (
          <ul className="mt-2 space-y-1 text-sm text-hold">
            {mismatches.map((item) => (
              <li key={item} className="underline decoration-hold">✕ {item}</li>
            ))}
          </ul>
        ) : null}
      </article>
    </div>
  );
}

/** English and Kiswahili drafts with copy. */
export function ReplyDrafts({ en, swahili }: { en: string; swahili: string }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <Draft label="EN" text={en} copyLabel={t.copy} copiedLabel={t.copied} />
      <Draft label="SW" text={swahili} copyLabel={t.copy} copiedLabel={t.copied} />
    </div>
  );
}

function Draft({ label, text, copyLabel, copiedLabel }: { label: string; text: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-control border border-line bg-paper p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <button type="button" className="min-h-10 text-sm text-primary" onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); }}>
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

/** Collapsible plain-language limits. Content mirrors docs/LIMITS.md. */
export function LimitsPanel() {
  const { t, lang } = useI18n();
  const body = lang === "sw"
    ? "Ujumbe ulioandikwa vizuri na kodi inayoonekana halali hauwezi kukamatwa kwa maandishi pekee. Pakia taarifa ya M-Pesa ili tukague kama pesa iliingia kweli. Hatupigi simu Safaricom, na hatuwezi kuona salio lako moja kwa moja."
    : "A well-made message with a believable code cannot be caught from the text alone. Upload your M-Pesa statement for a stronger check. We do not call Safaricom, and we cannot see your balance ourselves.";
  return (
    <details className="rounded-card border border-line bg-surface p-5 shadow-sm">
      <summary className="cursor-pointer font-medium">{t.limitsTitle}</summary>
      <p className="mt-3 text-sm text-muted">{body}</p>
    </details>
  );
}

/** Two confusion matrices for the eval page. */
export function ConfusionMatrix({ title, matrix }: { title: string; matrix: { genuine: Record<string, number>; forged: Record<string, number> } }) {
  const { t } = useI18n();
  const cols = ["RELEASE", "REVIEW", "HOLD"];
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <h3 className="font-medium">{title}</h3>
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="text-muted">
            <th className="py-2" />
            {cols.map((col) => <th key={col} className="py-2">{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {(["genuine", "forged"] as const).map((row) => (
            <tr key={row}>
              <th className="py-2 font-medium">{row === "genuine" ? t.genuine : t.forged}</th>
              {cols.map((col) => <td key={col} className="tabular py-2">{matrix[row][col] ?? 0}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
