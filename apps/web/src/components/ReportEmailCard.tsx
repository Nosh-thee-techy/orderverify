/**
 * apps/web/src/components/ReportEmailCard.tsx
 * After a check finishes, ask for an email so the stored report can be sent.
 * History for that address is kept in process memory, not a database table.
 */
"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { useI18n } from "@/i18n";
import { formatKes } from "@/lib/format";

interface HistoryEntry {
  email: string;
  batchId: string;
  sentAt: string;
  emailed: boolean;
  counts: { hold: number; review: number; release: number };
  moneyHeldKes: number;
}

/**
 * Email-capture card for a finished batch.
 *
 * @param props.batchId - The batch whose stored report should be emailed
 */
export function ReportEmailCard({ batchId }: { batchId: string }) {
  const { t, lang } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setOk(false);
    try {
      const response = await fetch("/api/reports/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ batchId, email }),
      });
      const body = (await response.json()) as { error?: string; history?: HistoryEntry[] };
      if (body.history) setHistory(body.history);
      if (!response.ok) {
        setMessage(body.error === "email_unconfigured" ? t.emailUnconfigured : t.reportSendFailed);
        return;
      }
      setOk(true);
      setMessage(t.reportSent);
    } catch {
      setMessage(t.reportSendFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-brand-card border border-[#F0E2C8] bg-white p-5 shadow-brand-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF6E0] text-brand-orange" aria-hidden>
          <Mail className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold text-brand-ink">{t.emailReportTitle}</h2>
          <p className="mt-1 text-sm text-brand-muted">{t.emailReportHint}</p>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void submit(event)}>
            <label className="sr-only" htmlFor={`report-email-${batchId}`}>
              {t.emailPlaceholder}
            </label>
            <input
              id={`report-email-${batchId}`}
              type="email"
              required
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-12 flex-1 rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-3"
            />
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 rounded-brand-control bg-brand-orange px-5 font-semibold text-white shadow-brand-orange transition-colors hover:bg-brand-orange-deep disabled:opacity-50"
            >
              {busy ? "…" : t.sendReport}
            </button>
          </form>
          {message ? (
            <p className={`mt-3 text-sm ${ok ? "text-brand-release" : "text-brand-hold"}`} role="status">
              {message}
            </p>
          ) : null}
          {history.length > 0 ? (
            <ul className="mt-4 space-y-2 border-t border-[#F0E2C8] pt-4">
              <li className="text-xs font-medium uppercase tracking-wide text-brand-muted">{t.emailHistory}</li>
              {history.map((entry) => (
                <li key={`${entry.batchId}-${entry.sentAt}`} className="text-sm text-brand-ink">
                  {new Intl.DateTimeFormat(lang === "sw" ? "sw-KE" : "en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.sentAt))}
                  {" · "}
                  {entry.counts.hold} {t.holdFilter} · {entry.counts.review} {t.reviewFilter} · {entry.counts.release} {t.releaseFilter}
                  {entry.counts.hold ? ` · ${formatKes(entry.moneyHeldKes)}` : ""}
                  {entry.emailed ? "" : ` · ${t.reportCachedOnly}`}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
