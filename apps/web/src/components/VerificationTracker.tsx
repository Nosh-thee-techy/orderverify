/**
 * apps/web/src/components/VerificationTracker.tsx
 * Stage-by-stage visual progress for a live batch run.
 * Tones come from real agent events via trackerFromEvents — never from timers.
 */
"use client";

import { Check, ClipboardList, FileText, Inbox, LoaderCircle, Search, WalletCards, X } from "lucide-react";
import type { Dictionary } from "@/i18n/en";
import { cn } from "@/lib/cn";
import {
  TRACKER_STAGES,
  type TrackerSnapshot,
  type TrackerStageId,
  type TrackerTone,
} from "@/lib/verificationProgress";

const ICONS: Record<TrackerStageId, typeof Inbox> = {
  received: Inbox,
  reading: Search,
  matching: ClipboardList,
  paying: WalletCards,
  report: FileText,
};

/**
 * Horizontal on desktop, vertical on small screens.
 *
 * @param props.snapshot - Stage tones derived from actual events
 * @param props.t - Current dictionary
 */
export function VerificationTracker({ snapshot, t }: { snapshot: TrackerSnapshot; t: Dictionary }) {
  const copy: Record<TrackerStageId, { title: string; body: string }> = {
    received: { title: t.trackerReceivedTitle, body: t.trackerReceivedBody },
    reading: { title: t.trackerReadingTitle, body: t.trackerReadingBody },
    matching: { title: t.trackerQueuedTitle, body: t.trackerQueuedBody },
    paying: { title: t.trackerPayingTitle, body: t.trackerPayingBody },
    report: { title: t.trackerReportTitle, body: t.trackerReportBody },
  };
  const active = snapshot.stages.find((stage) => stage.tone === "active");
  const failed = snapshot.stages.find((stage) => stage.tone === "failed");
  const live = failed
    ? `${t.trackerFailed}: ${copy[failed.id].title}`
    : snapshot.complete
      ? t.reportComplete
      : active
        ? `${t.trackerActive}: ${copy[active.id].title}. ${copy[active.id].body}`
        : t.trackerPending;

  return (
    <section className="rounded-brand-card border border-[#F0E2C8] bg-white p-5 shadow-brand-sm sm:p-6" aria-labelledby="tracker-heading">
      <h2 id="tracker-heading" className="font-display text-xl font-semibold tracking-tight text-brand-ink">
        {t.agentTitle}
      </h2>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>

      <ol className="mt-6 flex flex-col gap-0 md:flex-row md:items-stretch">
        {snapshot.stages.map((stage, index) => {
          const Icon = ICONS[stage.id];
          const last = index === TRACKER_STAGES.length - 1;
          const connectorFilled = index < snapshot.filledConnectors;
          const connectorActive = !last && snapshot.stages[index + 1]?.tone === "active" && stage.tone === "complete";
          return (
            <li key={stage.id} className="flex flex-1 md:min-w-0">
              <div className="flex flex-1 gap-4 md:flex-col md:items-center md:gap-3 md:text-center">
                <StageMark tone={stage.tone} number={index + 1} Icon={Icon} label={toneLabel(stage.tone, t)} />
                <div className="min-w-0 pb-6 md:pb-0">
                  <p className={cn("font-semibold tracking-tight", titleClass(stage.tone))}>{copy[stage.id].title}</p>
                  <p className={cn("mt-1 text-sm leading-relaxed", stage.tone === "pending" ? "text-brand-muted/70" : "text-brand-muted")}>
                    {copy[stage.id].body}
                  </p>
                </div>
              </div>
              {last ? null : (
                <Connector filled={connectorFilled} active={connectorActive} />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function toneLabel(tone: TrackerTone, t: Dictionary): string {
  if (tone === "complete") return t.trackerDone;
  if (tone === "active") return t.trackerActive;
  if (tone === "failed") return t.trackerFailed;
  return t.trackerPending;
}

function titleClass(tone: TrackerTone): string {
  if (tone === "complete") return "text-brand-orange";
  if (tone === "failed") return "text-brand-hold";
  if (tone === "active") return "text-brand-ink";
  return "text-brand-muted";
}

function StageMark({
  tone,
  number,
  Icon,
  label,
}: {
  tone: TrackerTone;
  number: number;
  Icon: typeof Inbox;
  label: string;
}) {
  return (
    <span
      className={cn(
        "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
        tone === "complete" && "border-brand-orange bg-[#FFF4C2] text-brand-orange",
        tone === "active" && "ov-tracker-pulse border-brand-tangerine bg-[#FFF4C2] text-brand-orange",
        tone === "failed" && "border-brand-hold bg-[#FBE0E4] text-brand-hold",
        tone === "pending" && "border-[#F0E2C8] bg-brand-bg text-brand-muted",
      )}
      aria-label={`${number}. ${label}`}
    >
      {tone === "complete" ? (
        <Check className="h-5 w-5" aria-hidden />
      ) : tone === "failed" ? (
        <X className="h-5 w-5" aria-hidden />
      ) : tone === "active" ? (
        <LoaderCircle className="h-5 w-5 motion-safe:animate-spin" aria-hidden />
      ) : (
        <Icon className="h-5 w-5" aria-hidden />
      )}
    </span>
  );
}

function Connector({ filled, active }: { filled: boolean; active: boolean }) {
  return (
    <div
      className="flex w-8 shrink-0 justify-center md:w-auto md:flex-1 md:items-start md:pt-6"
      aria-hidden
    >
      <span className="relative h-full w-0.5 overflow-hidden bg-[#F0E2C8] md:h-0.5 md:w-full md:min-w-6">
        <span
          className={cn(
            "absolute inset-0 origin-top bg-brand-orange transition-transform duration-700 ease-out md:origin-left",
            filled ? "scale-y-100 md:scale-x-100" : active ? "scale-y-50 md:scale-x-50" : "scale-y-0 md:scale-x-0",
            !filled && "md:scale-y-100",
            filled && "md:scale-y-100",
          )}
        />
      </span>
    </div>
  );
}
