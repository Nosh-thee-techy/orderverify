/**
 * apps/web/src/components/marketing/StatusBadge.tsx
 * Release / Review / Hold chips for marketing previews.
 * Dashboard verdicts keep using VerdictBadge so product copy and colours stay intact.
 */
import { Eye, OctagonPause, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

const statusStyles = {
  release: {
    className: "bg-brand-release-bg text-brand-release",
    icon: ShieldCheck,
    label: "Release",
  },
  review: {
    className: "bg-brand-review-bg text-brand-review",
    icon: Eye,
    label: "Review",
  },
  hold: {
    className: "bg-brand-hold-bg text-brand-hold",
    icon: OctagonPause,
    label: "Hold",
  },
} as const;

export type MarketingStatus = keyof typeof statusStyles;

/**
 * Compact status chip for the landing-page report preview.
 *
 * @param props.status - Release, review, or hold
 * @param props.label - Optional override; defaults to the status name
 * @returns A coloured badge that always includes an icon and a word
 */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: MarketingStatus;
  label?: string;
  className?: string;
}) {
  const style = statusStyles[status];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-brand-pill px-2.5 py-1 text-xs font-semibold",
        style.className,
        className,
      )}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {label ?? style.label}
    </span>
  );
}
