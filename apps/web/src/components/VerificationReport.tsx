/**
 * apps/web/src/components/VerificationReport.tsx
 * On-screen payment verification report. Same underlying document as the
 * email and the PDF. Verdicts are displayed, never recalculated here.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Mail, X } from "lucide-react";
import type { BatchReport, Verdict } from "@orderverify/engine";
import { CheckRow, LimitsPanel, ReplyDrafts } from "@/components/bits";
import { VerdictBadge } from "@/components/VerdictBadge";
import { useI18n } from "@/i18n";
import { formatKes, formatWhen } from "@/lib/format";
import { cn } from "@/lib/cn";
import { buildReportDocument, groupReportOrders, pdfFilename, type ReportOrderLine } from "@/lib/reportDocument";

export interface ReportPayload {
  batch: { id: string; status: string; evidenceTier: string; errorCode: string | null; createdAt?: string };
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
  report: BatchReport;
  drafts: Record<string, { en: string; sw: string }>;
}

/**
 * Full-page report viewer with Download, Send to Email, and Close.
 *
 * @param props.payload - Stored batch + engine report
 * @param props.onDecide - Optional existing release/hold decision handler
 */
export function VerificationReport({
  payload,
  onDecide,
}: {
  payload: ReportPayload;
  onDecide?: (orderId: string, decision: "released" | "held" | "more_info") => Promise<void>;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const doc = useMemo(
    () =>
      buildReportDocument(
        payload.report,
        payload.orders.map((order) => ({ id: order.id, customerName: order.customerName, claimedCode: order.claimedCode })),
        lang,
      ),
    [payload.report, payload.orders, lang],
  );
  const grouped = groupReportOrders(doc.orders);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailOk, setEmailOk] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("ov_report_email");
    if (stored) setEmail(stored);
    void fetch("/api/reports/email?last=1")
      .then((response) => response.json())
      .then((body: { lastEmail?: string | null }) => {
        if (body.lastEmail) {
          setEmail((current) => current || body.lastEmail || "");
        }
      })
      .catch(() => undefined);
  }, []);

  async function download() {
    setDownloading(true);
    setDownloadError("");
    try {
      const response = await fetch(`/api/reports/pdf?batchId=${encodeURIComponent(payload.batch.id)}&lang=${lang}`);
      if (!response.ok) throw new Error("pdf_failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFilename(payload.batch.id);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(t.downloadFailed);
    } finally {
      setDownloading(false);
    }
  }

  async function sendEmail(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailOk(false);
      setEmailMessage(t.emailInvalid);
      return;
    }
    setSending(true);
    setEmailMessage("");
    setEmailOk(false);
    try {
      window.localStorage.setItem("ov_report_email", trimmed);
      const response = await fetch("/api/reports/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ batchId: payload.batch.id, email: trimmed }),
      });
      const body = (await response.json()) as { error?: string; history?: { batchId: string; emailed: boolean }[] };
      const prior = body.history?.some((entry) => entry.batchId === payload.batch.id && entry.emailed);
      setAlreadySent(Boolean(prior));
      if (!response.ok) {
        setEmailMessage(body.error === "email_unconfigured" ? t.emailUnconfigured : t.reportSendFailed);
        return;
      }
      setEmailOk(true);
      setEmailMessage(t.reportSent);
    } catch {
      setEmailMessage(t.reportSendFailed);
    } finally {
      setSending(false);
    }
  }

  const evidence = doc.tier === "STATEMENT_VERIFIED" ? t.statementEvidence : t.textOnlyEvidence;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ActionButton onClick={() => void download()} disabled={downloading}>
          <Download className="h-4 w-4" aria-hidden />
          {downloading ? t.downloading : t.downloadReport}
        </ActionButton>
        <ActionButton onClick={() => setEmailOpen((open) => !open)} aria-expanded={emailOpen}>
          <Mail className="h-4 w-4" aria-hidden />
          {t.sendToEmail}
        </ActionButton>
        <ActionButton variant="quiet" onClick={() => router.push("/today")}>
          <X className="h-4 w-4" aria-hidden />
          {t.closeReport}
        </ActionButton>
      </div>

      {downloadError ? (
        <p className="text-sm text-brand-hold" role="alert">
          {downloadError}
        </p>
      ) : null}

      {emailOpen ? (
        <form className="rounded-brand-card border border-[#F0E2C8] bg-white p-4 shadow-brand-sm" onSubmit={(event) => void sendEmail(event)}>
          <label htmlFor="report-email" className="text-sm font-medium text-brand-ink">
            {t.emailAddress}
          </label>
          <p className="mt-1 text-sm text-brand-muted">{t.emailReportHint}</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="report-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.emailPlaceholder}
              className="min-h-12 flex-1 rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-3"
            />
            <button
              type="submit"
              disabled={sending}
              className="min-h-12 rounded-brand-control bg-brand-orange px-5 font-semibold text-white shadow-brand-orange transition-colors hover:bg-brand-orange-deep disabled:opacity-50"
            >
              {sending ? t.sendingEmail : t.sendToEmail}
            </button>
          </div>
          {alreadySent && !emailMessage ? <p className="mt-2 text-sm text-brand-muted">{t.alreadySent}</p> : null}
          {emailMessage ? (
            <p className={`mt-2 text-sm ${emailOk ? "text-[#0E9F5B]" : "text-brand-hold"}`} role="status">
              {emailMessage}
            </p>
          ) : null}
        </form>
      ) : null}

      <article id="verification-report" className="overflow-hidden rounded-[1.5rem] border border-[#F0E2C8] bg-white shadow-brand-lg">
        <header className="border-b border-[#F0E2C8] bg-[#FFF8E4] px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[0.7rem] bg-brand-sunset text-white shadow-brand-sm" aria-hidden>
                <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
                  <path d="M8.5 16.6 13.4 21.5 23.5 10.8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brand-tangerine">OrderVerify</p>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-brand-ink sm:text-3xl">{t.reportViewTitle}</h1>
              </div>
            </div>
            <span className="rounded-brand-pill bg-[#E3F8EC] px-3 py-1 text-sm font-semibold text-[#0E9F5B]">{t.completed}</span>
          </div>
          <p className="mt-4 text-sm text-brand-muted">
            {t.batchRef} {doc.batchRef}
            {payload.batch.createdAt ? ` · ${formatWhen(payload.batch.createdAt, lang)}` : ""}
            {` · ${evidence}`}
          </p>
        </header>

        <div className="space-y-8 px-5 py-7 sm:px-8 sm:py-9">
          <section>
            <h2 className="font-display text-xl font-semibold text-brand-ink">{t.reportIntroTitle}</h2>
            <p className="mt-2 max-w-2xl leading-relaxed text-brand-muted">{t.reportIntroBody}</p>
          </section>

          <section aria-label={t.results} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label={t.totalOrders} value={doc.counts.total} />
            <SummaryCard label={t.findingsRelease} value={doc.counts.release} tone="release" />
            <SummaryCard label={t.findingsReview} value={doc.counts.review} tone="review" />
            <SummaryCard label={t.findingsHold} value={doc.counts.hold} tone="hold" />
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-brand-ink">{t.results}</h2>
            <ul className="mt-4 divide-y divide-[#F0E2C8] overflow-hidden rounded-brand-card border border-[#F0E2C8]">
              {doc.orders.map((order) => (
                <OrderBlock
                  key={order.orderId}
                  order={order}
                  source={payload.orders.find((item) => item.id === order.orderId)}
                  draft={payload.drafts?.[order.orderId]}
                  onDecide={onDecide}
                />
              ))}
            </ul>
          </section>

          <Findings grouped={grouped} />

          {onDecide ? (
            <div>
              <button
                type="button"
                className="min-h-12 w-full rounded-brand-control border border-brand-orange text-brand-orange"
                onClick={() => setConfirmBulk(true)}
                disabled={!doc.orders.some((order) => order.verdict === "RELEASE")}
              >
                {t.releaseConsistent}
              </button>
              {confirmBulk ? (
                <div className="mt-3 rounded-brand-card border border-[#F0E2C8] bg-brand-bg p-4" role="dialog" aria-modal="true">
                  <p>{t.releaseConfirm}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="min-h-12 flex-1 rounded-brand-control bg-brand-orange text-white"
                      onClick={() => {
                        void Promise.all(
                          doc.orders.filter((order) => order.verdict === "RELEASE").map((order) => onDecide(order.orderId, "released")),
                        ).then(() => setConfirmBulk(false));
                      }}
                    >
                      {t.confirm}
                    </button>
                    <button type="button" className="min-h-12 flex-1 rounded-control border border-line" onClick={() => setConfirmBulk(false)}>
                      {t.cancel}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {doc.unmatchedPayments.length > 0 ? (
            <section>
              <h2 className="font-display text-lg font-semibold text-brand-ink">{t.unmatchedPayments}</h2>
              <ul className="mt-3 space-y-2 text-sm text-brand-muted">
                {doc.unmatchedPayments.map((item) => (
                  <li key={item.paymentId} className="rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-3 py-2">
                    {item.code ?? item.paymentId}
                    {item.amountKes != null ? ` · ${formatKes(item.amountKes)}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <footer className="border-t border-[#F0E2C8] bg-[#FFFBF0] px-5 py-5 sm:px-8">
          <p className="text-sm leading-relaxed text-brand-muted">{t.reportDisclaimer}</p>
          <p className="mt-2 text-sm font-medium text-brand-ink">
            {t.generatedBy} · {t.reportViewTitle}
          </p>
        </footer>
      </article>

      <LimitsPanel />
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "release" | "review" | "hold" }) {
  const styles =
    tone === "release"
      ? "bg-[#E3F8EC] text-[#0E9F5B]"
      : tone === "review"
        ? "bg-[#E3EBFF] text-[#2457D6]"
        : tone === "hold"
          ? "bg-[#FBE0E4] text-[#B3122B]"
          : "bg-[#FFF8E4] text-brand-ink";
  return (
    <div className={cn("rounded-brand-card px-4 py-4", styles)}>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-medium">{label}</p>
    </div>
  );
}

function OrderBlock({
  order,
  source,
  draft,
  onDecide,
}: {
  order: ReportOrderLine;
  source?: ReportPayload["orders"][number];
  draft?: { en: string; sw: string };
  onDecide?: (orderId: string, decision: "released" | "held" | "more_info") => Promise<void>;
}) {
  const { t, lang } = useI18n();
  return (
    <li className="bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-brand-ink">{order.customerName}</p>
          <p className="text-sm text-brand-muted">
            {t.orderRef} {order.orderRef}
            {order.paymentRef ? ` · ${t.paymentRef} ${order.paymentRef}` : ""}
          </p>
        </div>
        <VerdictBadge verdict={order.verdict} tier={order.tier} lang={lang} />
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-brand-muted">{t.expectedAmount}</dt>
          <dd className="tabular-nums">{order.expectedAmountKes == null ? "—" : formatKes(order.expectedAmountKes)}</dd>
        </div>
        <div>
          <dt className="text-brand-muted">{t.receivedAmount}</dt>
          <dd className="tabular-nums">{order.receivedAmountKes == null ? "—" : formatKes(order.receivedAmountKes)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-brand-ink">{order.explanation}</p>
      <div className="mt-3 space-y-2">
        {order.checks.map((check) => (
          <CheckRow key={`${check.title}-${check.status}`} title={check.title} plain={check.plain} status={check.status} evidence={check.evidence} />
        ))}
      </div>
      {onDecide ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="min-h-12 rounded-brand-control bg-brand-orange px-3 text-sm font-medium text-white" onClick={() => void onDecide(order.orderId, "released")}>
            {t.release}
          </button>
          <button type="button" className="min-h-12 rounded-control border border-line px-3 text-sm" onClick={() => void onDecide(order.orderId, "held")}>
            {t.keepHold}
          </button>
        </div>
      ) : null}
      {draft ? <div className="mt-3"><ReplyDrafts en={draft.en} swahili={draft.sw} /></div> : null}
      {source?.sellerDecision ? <p className="mt-2 text-xs uppercase text-muted">{source.sellerDecision}</p> : null}
    </li>
  );
}

function Findings({ grouped }: { grouped: Record<Verdict, ReportOrderLine[]> }) {
  const { t } = useI18n();
  const sections: { key: Verdict; title: string; className: string }[] = [
    { key: "RELEASE", title: t.findingsRelease, className: "border-[#E3F8EC] bg-[#F4FBF6]" },
    { key: "REVIEW", title: t.findingsReview, className: "border-[#E3EBFF] bg-[#F5F8FF]" },
    { key: "HOLD", title: t.findingsHold, className: "border-[#FBE0E4] bg-[#FDF5F6]" },
  ];
  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-brand-ink">{t.findingsTitle}</h2>
      {sections.map((section) => {
        const items = grouped[section.key];
        if (items.length === 0) return null;
        return (
          <div key={section.key} className={cn("rounded-brand-card border px-4 py-4", section.className)}>
            <h3 className="font-semibold">{section.title}</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {items.map((item) => (
                <li key={item.orderId}>
                  <span className="font-medium">{item.customerName}</span>
                  {" — "}
                  {item.explanation}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "quiet";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-brand-control px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:opacity-50",
        variant === "primary"
          ? "bg-brand-orange text-white shadow-brand-orange hover:bg-brand-orange-deep"
          : "border border-[#F0E2C8] bg-white text-brand-ink hover:border-brand-tangerine",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
