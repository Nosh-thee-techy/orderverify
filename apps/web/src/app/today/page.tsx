/**
 * apps/web/src/app/today/page.tsx
 * Today: what is on hold, three counts, and a way into the next check.
 * Lives at /today so the public landing page can occupy /.
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, HeroHoldCard, StatChip } from "@/components/bits";
import { useI18n } from "@/i18n";
import { formatKes, formatWhen } from "@/lib/format";

interface Home {
  displayName: string;
  holdKes: number;
  holdCount: number;
  toCheck: number;
  releasedToday: number;
  batches: { id: string; createdAt: string; status: string; counts: { hold: number; review: number; release: number }; moneyHeldKes: number; evidenceTier: string }[];
}

/** The home screen. */
export default function TodayPage() {
  const { t, lang } = useI18n();
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/home")
      .then(async (response) => {
        if (!response.ok) throw new Error("home");
        setHome((await response.json()) as Home);
      })
      .catch(() => setError("The demo database is not ready yet."));
  }, []);
  const date = new Intl.DateTimeFormat(lang === "sw" ? "sw-KE" : "en-KE", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-sm font-medium text-muted">{date}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {t.greeting}, {home?.displayName ?? "Akinyi"}
        </h1>
        <p className="mt-2 text-muted">{t.tagline}</p>
      </div>
      {error ? <EmptyState title={error} /> : null}
      <HeroHoldCard holdKes={home?.holdKes ?? 0} holdCount={home?.holdCount ?? 0} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatChip label={t.toCheck} value={home?.toCheck ?? 0} />
        <StatChip label={t.onHold} value={home?.holdCount ?? 0} tone="hold" />
        <StatChip label={t.releasedToday} value={home?.releasedToday ?? 0} tone="release" />
      </div>
      <Link
        href="/check"
        className="flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#0c5a42]"
      >
        {t.checkMyOrders}
      </Link>
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">{t.recent}</h2>
        {home && home.batches.length === 0 ? (
          <EmptyState title={t.emptyToday} action={<Link className="font-medium text-primary" href="/check">{t.trySample}</Link>} />
        ) : (
          <ul className="space-y-3">
            {home?.batches.map((batch) => (
              <li key={batch.id}>
                <Link
                  href={batch.status === "done" ? `/batches/${batch.id}` : `/batches/${batch.id}/activity`}
                  className="block rounded-card border border-line bg-surface p-4 shadow-sm transition-shadow hover:shadow-card"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted">{formatWhen(batch.createdAt, lang)}</span>
                    <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted">
                      {batch.evidenceTier === "STATEMENT_VERIFIED" ? "Statement" : "Text"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">
                    {batch.counts.hold} hold · {batch.counts.review} check · {batch.counts.release} release
                  </p>
                  <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-line">
                    <span className="bg-hold" style={{ width: `${share(batch.counts.hold, batch.counts)}%` }} />
                    <span className="bg-review" style={{ width: `${share(batch.counts.review, batch.counts)}%` }} />
                    <span className="bg-release" style={{ width: `${share(batch.counts.release, batch.counts)}%` }} />
                  </div>
                  {batch.counts.hold ? <p className="mt-3 text-sm font-medium text-hold">{formatKes(batch.moneyHeldKes)} held</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function share(part: number, counts: { hold: number; review: number; release: number }): number {
  const total = counts.hold + counts.review + counts.release;
  if (!total) return 0;
  return (part / total) * 100;
}
