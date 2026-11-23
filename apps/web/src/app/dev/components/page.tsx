/**
 * apps/web/src/app/dev/components/page.tsx
 * Dev-only gallery of the interface states. Production returns 404.
 */
"use client";

import { notFound } from "next/navigation";
import { AgentStages, CapMeter, ConfusionMatrix, CostBar, EmptyState, ErrorState, HeroHoldCard, LimitsPanel, StatChip, TrustMeter } from "@/components/bits";
import { VerdictBadge } from "@/components/VerdictBadge";

/** Visual states for a quick review. Not linked from the product. */
export default function ComponentGallery() {
  if (process.env.NODE_ENV === "production") notFound();
  const matrix = { genuine: { RELEASE: 12, REVIEW: 3, HOLD: 0 }, forged: { RELEASE: 2, REVIEW: 0, HOLD: 13 } };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Components</h1>
      <HeroHoldCard holdKes={18400} holdCount={3} />
      <HeroHoldCard holdKes={0} holdCount={0} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatChip label="To check" value={4} />
        <StatChip label="On hold" value={3} tone="hold" />
        <StatChip label="Released" value={2} tone="release" />
      </div>
      <VerdictBadge verdict="HOLD" tier="TEXT_ONLY" lang="en" />
      <VerdictBadge verdict="REVIEW" tier="TEXT_ONLY" lang="en" />
      <VerdictBadge verdict="RELEASE" tier="TEXT_ONLY" lang="en" />
      <VerdictBadge verdict="RELEASE" tier="STATEMENT_VERIFIED" lang="en" />
      <TrustMeter strong={false} />
      <TrustMeter strong />
      <CostBar orders={12} payments={11} costKes={1.3} leftKes={38} blocked={false} />
      <AgentStages stage={2} />
      <CapMeter spentKes={14} capKes={50} />
      <EmptyState title="Nothing here yet" />
      <ErrorState title="Weekly budget used up" detail="Raise it, or wait until Monday." />
      <ConfusionMatrix title="Text only" matrix={matrix} />
      <LimitsPanel />
    </div>
  );
}
