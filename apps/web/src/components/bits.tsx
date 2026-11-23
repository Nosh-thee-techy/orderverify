/**
 * apps/web/src/components/bits.tsx
 * Small interface pieces shared by Today, Check, Wallet, and Results.
 */
"use client";

import { useState } from "react";
import { AlertTriangle, Check, CheckCircle2, ClipboardList, Copy, ExternalLink, OctagonPause } from "lucide-react";
import { cn } from "@/lib/cn";
import { explorerUrl, shortHash } from "@/lib/format";
import { useI18n } from "@/i18n";

/** A labelled number, always with words so colour is not the only cue. */
export function StatChip({ label, value, tone }: { label: string; value: string | number; tone?: "hold" | "review" | "release" }) {
  const Icon = tone === "hold" ? AlertTriangle : tone === "release" ? CheckCircle2 : ClipboardList;
  const wrap =
    tone === "hold"
      ? "border-[#FBE0E4] bg-[#FDF2F5]"
      : tone === "review"
        ? "border-brand-review-bg bg-brand-review-bg"
        : tone === "release"
          ? "border-[#E3F8EC] bg-[#F2FBF6]"
          : "border-[#F8E9B8] bg-[#FFF8DE]";
  const iconWrap =
    tone === "hold"
      ? "bg-white text-brand-hold"
      : tone === "release"
        ? "bg-white text-brand-release"
        : "bg-[#FFE9A3] text-brand-orange";
  const blob =
    tone === "hold"
      ? "bg-brand-raspberry/25"
      : tone === "release"
        ? "bg-brand-release/20"
        : "bg-brand-yellow/70";
  const valueClass = tone === "hold" ? "text-brand-hold" : tone === "release" ? "text-brand-release" : "text-brand-ink";
  return (
    <div className={cn("relative flex h-full min-h-[8.5rem] flex-col justify-between overflow-hidden rounded-brand-card border px-5 py-5 shadow-brand-sm", wrap)}>
      <span className={cn("pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl", blob)} aria-hidden />
      <div className="relative flex items-center gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", iconWrap)} aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <div className="text-sm font-medium text-brand-muted">{label}</div>
      </div>
      <div className={cn("relative tabular text-4xl font-semibold tracking-tight", valueClass)}>{value}</div>
    </div>
  );
}

/** The home hero: money currently held, or a calm empty state. */
export function HeroHoldCard({ holdKes, holdCount }: { holdKes: number; holdCount: number }) {
  const { t } = useI18n();
  if (holdCount === 0) {
    return (
      <section className="flex items-start gap-4 rounded-brand-card border border-[#E3F8EC] bg-brand-release-bg px-5 py-5 sm:px-6">
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-release" aria-hidden>
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <p className="text-lg font-semibold leading-snug text-brand-release">{t.nothingOnHold}</p>
      </section>
    );
  }
  return (
    <section className="rounded-brand-card border border-[#FBE0E4] bg-brand-hold-bg px-5 py-5 text-brand-hold sm:px-6">
      <div className="flex items-start gap-4">
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-hold" aria-hidden>
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
    <div className="rounded-brand-card border border-dashed border-[#F0E2C8] bg-white px-5 py-10 text-center">
      <p className="text-brand-muted">{title}</p>
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
      <p className="text-sm text-brand-muted">{t.step} {step} {t.of} 3</p>
      <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden>
        {[1, 2, 3].map((item) => (
          <div key={item} className={cn("h-2 rounded-full", item <= step ? "bg-brand-orange" : "bg-[#F0E2C8]")} />
        ))}
      </div>
    </div>
  );
}

/** Large paste box. The caller owns the text. */
export function PasteArea({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block font-medium text-brand-ink">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={8} className="w-full rounded-brand-control border border-[#F0E2C8] bg-white p-3 text-base shadow-brand-sm outline-none transition-shadow focus:border-brand-orange/40 focus:shadow-[0_0_0_3px_rgba(200,90,12,0.15)]" />
      {hint ? <span className="mt-2 block text-sm text-brand-muted">{hint}</span> : null}
    </label>
  );
}

/**
 * File picker for any document. Text files are read locally; everything else
 * is sent to the server so PDF, Word, sheets, zips, and images can be read.
 *
 * @param props.okLabel - Success copy; defaults to the generic loaded message
 */
export function FileDrop({
  label,
  accept,
  onText,
  okLabel,
}: {
  label: string;
  accept?: string;
  onText: (text: string, name: string) => void;
  okLabel?: string;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<"idle" | "reading" | "ok" | "error">("idle");
  const [fileName, setFileName] = useState("");

  return (
    <div>
      <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-brand-control border border-dashed border-[#F0E2C8] bg-white px-4 py-3 text-sm font-medium shadow-brand-sm transition-colors hover:border-brand-orange/40 hover:bg-brand-bg">
        {status === "reading" ? t.readingDocument : label}
        <input
          type="file"
          accept={accept}
          disabled={status === "reading"}
          className="sr-only"
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            setStatus("reading");
            setFileName(file.name);
            try {
              const text = await readUploadedDocument(file);
              if (!text.trim()) {
                setStatus("error");
                return;
              }
              onText(text, file.name);
              setStatus("ok");
            } catch {
              setStatus("error");
            } finally {
              input.value = "";
            }
          }}
        />
      </label>
      {status === "ok" ? (
        <p className="mt-2 text-sm text-brand-muted">
          {okLabel ?? t.documentLoaded}
          {fileName ? ` · ${fileName}` : ""}
        </p>
      ) : null}
      {status === "error" ? (
        <p className="mt-2 text-sm text-brand-hold" role="alert">
          {t.documentFailed}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Read a document as text. Plain files stay on the device; binary formats go
 * through POST /api/documents/text.
 *
 * @param file - The file the seller picked
 * @returns Extracted text
 */
async function readUploadedDocument(file: File): Promise<string> {
  if (canReadLocally(file)) {
    return file.text();
  }
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/documents/text", { method: "POST", body });
  const payload = (await response.json()) as { text?: string; error?: string };
  if (!response.ok || !payload.text) {
    throw new Error(payload.error ?? "read_failed");
  }
  return payload.text;
}

function canReadLocally(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (type.startsWith("text/") || type === "application/json") return true;
  return /\.(txt|csv|tsv|json|md|log)$/.test(name);
}

/** Basic check versus a statement. The tooltip text is always visible underneath, not only on hover. */
export function TrustMeter({ strong }: { strong: boolean }) {
  const { t } = useI18n();
  return (
    <div className={cn("rounded-brand-card border p-4 text-sm", strong ? "border-brand-orange/25 bg-[#FFF4C2] text-brand-orange" : "border-[#F0E2C8] bg-white text-brand-ink")}>
      <p className="font-medium">{strong ? t.trustStrong : t.trustBasic}</p>
      <p className="mt-1">{t.trustHint}</p>
    </div>
  );
}

/** Cost and remaining cap, stuck above the primary button. */
export function CostBar({ orders, payments, costKes, leftKes, blocked }: { orders: number; payments: number; costKes: number; leftKes: number; blocked: boolean }) {
  const { t } = useI18n();
  return (
    <div className={cn("rounded-brand-card border px-4 py-3 text-sm", blocked ? "border-hold/20 bg-hold-bg text-hold" : "border-[#F0E2C8] bg-white text-brand-ink")}>
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
        className="inline-flex min-h-10 items-center gap-1 text-sm text-brand-orange"
        onClick={() => {
          void navigator.clipboard.writeText(hash);
          setCopied(true);
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? t.copied : t.copy}
      </button>
      {url ? (
        <a className="inline-flex min-h-10 items-center gap-1 text-sm text-brand-orange" href={url} target="_blank" rel="noreferrer">
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
        <div className="h-full bg-brand-orange" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

/** One row in the payment history. */
export function PaymentRow({ when, amountUsd, amountKes, status, hash }: { when: string; amountUsd: number; amountKes: number; status: string; hash: string | null }) {
  return (
    <div className="rounded-brand-card border border-[#F0E2C8] bg-white p-4 shadow-brand-sm">
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
          <li key={label} className={cn("rounded-brand-card border p-4 text-center text-sm", done ? "border-brand-orange/20 bg-[#FFF6E0] text-brand-orange" : "border-[#F0E2C8] bg-white text-brand-muted")}>
            <div className={cn("mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold", done ? "bg-brand-orange text-white" : "bg-brand-bg")}>{index + 1}</div>
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
        <li key={event.id} className="rounded-brand-card border border-[#F0E2C8] bg-white p-4 shadow-brand-sm">
          <p className="text-xs text-brand-muted">{new Date(event.at).toLocaleTimeString()}</p>
          <p className="text-brand-ink">{event.message}</p>
          {event.data?.amountUsd ? <p className="font-mono text-sm text-brand-muted">{event.data.amountUsd} USDC · {event.data.network}</p> : null}
          {event.data?.txHash ? <TxHashChip hash={event.data.txHash} /> : null}
        </li>
      ))}
    </ol>
  );
}

/** One rule, with an expandable evidence list. */
export function CheckRow({ title, plain, status, evidence }: { title: string; plain: string; status: string; evidence: Record<string, string | number | null> }) {
  const mark = status === "fail" ? "✕" : status === "warn" ? "!" : status === "pass" ? "✓" : "–";
  const markColor =
    status === "fail"
      ? "text-brand-hold"
      : status === "warn"
        ? "text-brand-tangerine"
        : status === "pass"
          ? "text-brand-orange"
          : "text-brand-muted";
  return (
    <details className="rounded-brand-control border border-[#F0E2C8] bg-white p-4">
      <summary className="flex cursor-pointer items-start gap-3">
        <span aria-hidden className={cn("mt-0.5 font-semibold", markColor)}>{mark}</span>
        <span>
          <span className="block font-medium text-brand-ink">{title}</span>
          <span className="block text-sm text-brand-muted">{plain}</span>
        </span>
      </summary>
      <dl className="mt-3 space-y-1 pl-7 text-sm">
        {Object.entries(evidence).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3">
            <dt className="text-brand-muted">{key}</dt>
            <dd className="font-mono text-brand-ink">{value === null ? "—" : String(value)}</dd>
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
        <button type="button" className="min-h-10 text-sm text-brand-orange" onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); }}>
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
    <details className="rounded-brand-card border border-[#F0E2C8] bg-white p-5 shadow-brand-sm">
      <summary className="cursor-pointer font-medium text-brand-ink">{t.limitsTitle}</summary>
      <p className="mt-3 text-sm text-brand-muted">{body}</p>
    </details>
  );
}

/** Two confusion matrices for the eval page. */
export function ConfusionMatrix({ title, matrix }: { title: string; matrix: { genuine: Record<string, number>; forged: Record<string, number> } }) {
  const { t } = useI18n();
  const cols = ["RELEASE", "REVIEW", "HOLD"];
  return (
    <div className="rounded-brand-card border border-[#F0E2C8] bg-white p-4">
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
