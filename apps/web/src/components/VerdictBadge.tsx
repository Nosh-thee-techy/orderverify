/**
 * apps/web/src/components/VerdictBadge.tsx
 * The trust badge. A text-only release is never a solid “verified” mark.
 */
import { Eye, OctagonPause, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { EvidenceTier, Verdict } from "@orderverify/engine";
import { cn } from "@/lib/cn";

const copy = {
  en: {
    HOLD: "Hold: don't dispatch yet",
    REVIEW: "Check first",
    RELEASE_STATEMENT: "Verified against your M-Pesa statement",
    RELEASE_TEXT: "Looks consistent (not checked against M-Pesa records)",
  },
  sw: {
    HOLD: "Subiri: usitume bado",
    REVIEW: "Angalia kwanza",
    RELEASE_STATEMENT: "Imethibitishwa na taarifa yako ya M-Pesa",
    RELEASE_TEXT: "Inaonekana sawa (haijathibitishwa na rekodi za M-Pesa)",
  },
} as const;

/**
 * Show a verdict together with how strong the evidence was.
 * @param props.verdict - RELEASE, REVIEW, or HOLD
 * @param props.tier - TEXT_ONLY or STATEMENT_VERIFIED
 * @param props.lang - en or sw
 */
export function VerdictBadge({
  verdict,
  tier,
  lang,
}: {
  verdict: Verdict;
  tier: EvidenceTier;
  lang: "en" | "sw";
}) {
  const text = copy[lang];
  if (verdict === "HOLD") {
    return (
      <Badge className="bg-brand-hold-bg text-brand-hold">
        <OctagonPause aria-hidden className="h-4 w-4" />
        {text.HOLD}
      </Badge>
    );
  }
  if (verdict === "REVIEW") {
    return (
      <Badge className="bg-brand-review-bg text-brand-review">
        <Eye aria-hidden className="h-4 w-4" />
        {text.REVIEW}
      </Badge>
    );
  }
  if (tier === "STATEMENT_VERIFIED") {
    return (
      <Badge className="bg-[#FFF4C2] text-brand-orange">
        <ShieldCheck aria-hidden className="h-4 w-4" />
        {text.RELEASE_STATEMENT}
      </Badge>
    );
  }
  return (
    <Badge className="border border-brand-orange bg-transparent text-brand-orange">
      <ShieldQuestion aria-hidden className="h-4 w-4" />
      {text.RELEASE_TEXT}
    </Badge>
  );
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium leading-snug", className)}>
      {children}
    </span>
  );
}
