/**
 * apps/web/src/app/dashboard/page.tsx
 * Seller home after sign-in: greeting banner, counts, and a way into the next check.
 * /today redirects here so older links keep working.
 */
"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, History, Search } from "lucide-react";
import { EmptyState, StatChip } from "@/components/bits";
import { useI18n } from "@/i18n";
import { formatKes, formatWhen } from "@/lib/format";
import { clerkDisplayName } from "@/lib/sellerName";

interface Home {
  displayName: string;
  holdKes: number;
  holdCount: number;
  toCheck: number;
  releasedToday: number;
  batchesChecked?: number;
  weeklyCapLeftKes?: number;
  batches: { id: string; createdAt: string; status: string; counts: { hold: number; review: number; release: number }; moneyHeldKes: number; evidenceTier: string }[];
}

/** The home screen. */
export default function DashboardPage() {
  const { t, lang } = useI18n();
  const { user } = useUser();
  const [home, setHome] = useState<Home | null>(null);
  useEffect(() => {
    void fetch("/api/home")
      .then(async (response) => {
        if (!response.ok) return;
        setHome((await response.json()) as Home);
      })
      .catch(() => undefined);
  }, []);
  const date = new Intl.DateTimeFormat(lang === "sw" ? "sw-KE" : "en-KE", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  // Clerk already loaded in the shell, so the name stays when /api/home is still in flight.
  const name = clerkDisplayName(user) || home?.displayName || "";
  return (
    <div className="space-y-8">
      <GreetingBanner date={date} name={name} tagline={t.tagline} greeting={t.greeting} />
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatChip label={t.batchesChecked} value={home?.batchesChecked ?? 0} />
          <StatChip label={t.onHold} value={home?.holdCount ?? 0} tone="hold" />
          <StatChip label={t.kesHeld} value={formatKes(home?.holdKes ?? 0)} tone="hold" />
          <StatChip label={t.weeklyCapLeft} value={formatKes(home?.weeklyCapLeftKes ?? 0)} />
        </div>
        <Link
          href="/check"
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-brand-control bg-brand-orange px-4 text-base font-semibold text-white shadow-brand-orange transition-colors duration-200 ease-brand hover:bg-brand-orange-deep"
        >
          <Search className="h-5 w-5" aria-hidden />
          {t.checkMyOrders}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
        <section className="overflow-hidden rounded-brand-card border border-[#F0E2C8] bg-white shadow-brand-sm">
          <div className="flex items-center gap-2 border-b border-[#F0E2C8] px-5 py-4">
            <History className="h-5 w-5 text-brand-orange" aria-hidden />
            <h2 className="font-display text-lg font-semibold text-brand-ink">{t.recent}</h2>
          </div>
          {home && home.batches.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t.emptyToday} action={<Link className="font-medium text-brand-orange" href="/check">{t.trySample}</Link>} />
            </div>
          ) : (
            <RecentChecks batches={home?.batches ?? []} lang={lang} />
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Greeting on a full-width banner. Colours match the sunset shapes that sat
 * beside the seller photo; the photo now lives on the left of the banner.
 */
function GreetingBanner({
  date,
  name,
  greeting,
  tagline,
}: {
  date: string;
  name: string;
  greeting: string;
  tagline: string;
}) {
  return (
    <div className="my-2 w-full">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#FFD416] via-[#E4701D] to-[#E72369] p-4 shadow-brand sm:p-6">
        <span className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-brand-yellow/70" aria-hidden />
        <span className="pointer-events-none absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-white/25" aria-hidden />
        <span className="pointer-events-none absolute bottom-[-2rem] left-40 h-24 w-24 rounded-full bg-brand-raspberry/40" aria-hidden />
        <div className="relative flex items-center gap-4 sm:gap-6">
          <img
            src="/images/about/orders.webp"
            alt=""
            className="h-28 w-28 shrink-0 rounded-[1.25rem] object-cover shadow-brand sm:h-36 sm:w-36"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/85">{date}</p>
            <h1 className="mt-1 break-words font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {name ? `${greeting}, ${name}` : greeting}
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/90 sm:text-base">{tagline}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Recent batches as a table on desktop and stacked rows on small screens.
 * Columns are only fields already returned by GET /api/home.
 */
function RecentChecks({
  batches,
  lang,
}: {
  batches: Home["batches"];
  lang: "en" | "sw";
}) {
  const { t } = useI18n();
  if (batches.length === 0) return null;
  return (
    <>
      <ul className="divide-y divide-[#F0E2C8] sm:hidden">
        {batches.map((batch) => (
          <li key={batch.id}>
            <Link href={batchHref(batch)} className="block px-5 py-4 transition-colors hover:bg-[#FFFBF0]">
              <p className="text-sm text-brand-muted">{formatWhen(batch.createdAt, lang)}</p>
              <p className="mt-1 text-sm font-medium text-brand-ink">
                {batch.evidenceTier === "STATEMENT_VERIFIED" ? t.withStatement : t.textOnly}
              </p>
              <div className="mt-2">
                <CountBadges counts={batch.counts} />
              </div>
              {batch.counts.hold ? (
                <p className="mt-2 text-sm font-medium text-brand-hold">{formatKes(batch.moneyHeldKes)}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="text-brand-muted">
              <th className="px-5 py-3 font-medium">{t.when}</th>
              <th className="px-5 py-3 font-medium">{t.evidence}</th>
              <th className="px-5 py-3 font-medium">{t.results}</th>
              <th className="px-5 py-3 font-medium">{t.held}</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id} className="border-t border-[#F0E2C8]">
                <td className="px-5 py-4">
                  <Link href={batchHref(batch)} className="font-medium text-brand-ink hover:text-brand-orange">
                    {formatWhen(batch.createdAt, lang)}
                  </Link>
                </td>
                <td className="px-5 py-4 text-brand-muted">
                  {batch.evidenceTier === "STATEMENT_VERIFIED" ? t.withStatement : t.textOnly}
                </td>
                <td className="px-5 py-4">
                  <CountBadges counts={batch.counts} />
                </td>
                <td className="tabular px-5 py-4 text-brand-ink">
                  {batch.counts.hold ? formatKes(batch.moneyHeldKes) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Past checks open the stored report. Only an in-progress batch continues on activity. */
function batchHref(batch: Home["batches"][number]): string {
  if (batch.status === "paying" || batch.status === "verifying" || batch.status === "ready") {
    return `/batches/${batch.id}/activity`;
  }
  return `/batches/${batch.id}`;
}

/** Hold / Review / Release counts as the spec's rounded badges. Skip zeros. */
function CountBadges({ counts }: { counts: { hold: number; review: number; release: number } }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5">
      {counts.hold > 0 ? (
        <span className="rounded-full bg-brand-hold-bg px-2.5 py-0.5 text-xs font-medium text-brand-hold">
          {counts.hold} {t.holdFilter}
        </span>
      ) : null}
      {counts.review > 0 ? (
        <span className="rounded-full bg-brand-review-bg px-2.5 py-0.5 text-xs font-medium text-brand-review">
          {counts.review} {t.reviewFilter}
        </span>
      ) : null}
      {counts.release > 0 ? (
        <span className="rounded-full bg-brand-release-bg px-2.5 py-0.5 text-xs font-medium text-brand-release">
          {counts.release} {t.releaseFilter}
        </span>
      ) : null}
    </div>
  );
}
