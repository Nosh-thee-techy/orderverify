/**
 * apps/web/src/app/evals/page.tsx
 * Public numbers for judges. The two made-up codes are the point of the page.
 */
"use client";

import results from "@/data/eval-results.json";
import { ConfusionMatrix } from "@/components/bits";
import { useI18n } from "@/i18n";

interface Mode {
  catchRate: number;
  falseFlagRate: number;
  matrix: { genuine: Record<string, number>; forged: Record<string, number> };
  byType: { type: string; total: number; caught: number; missed: number }[];
}

/** How the rules do on the synthetic set, text-only and with a statement. */
export default function EvalsPage() {
  const { t } = useI18n();
  const textOnly = results.textOnly as Mode;
  const statement = results.statement as Mode;
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t.evalsTitle}</h1>
        <p className="mt-2 max-w-xl text-muted">{results.note || t.evalsNote}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <RateCard title={t.textOnly} catchRate={textOnly.catchRate} falseFlag={textOnly.falseFlagRate} />
        <RateCard title={t.withStatement} catchRate={statement.catchRate} falseFlag={statement.falseFlagRate} />
      </div>
      <ConfusionMatrix title={t.textOnly} matrix={textOnly.matrix} />
      <ConfusionMatrix title={t.withStatement} matrix={statement.matrix} />
      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="p-3">Type</th>
              <th className="p-3">{t.textOnly}</th>
              <th className="p-3">{t.withStatement}</th>
            </tr>
          </thead>
          <tbody>
            {textOnly.byType.map((row) => {
              const other = statement.byType.find((item) => item.type === row.type);
              return (
                <tr key={row.type} className="border-t border-line">
                  <td className="p-3">{row.type.replaceAll("_", " ")}</td>
                  <td className="p-3 tabular">{row.caught}/{row.total} {t.caught} · {row.missed} {t.missed}</td>
                  <td className="p-3 tabular">{other ? `${other.caught}/${other.total}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted">{t.evalsNote}</p>
    </div>
  );
}

function RateCard({ title, catchRate, falseFlag }: { title: string; catchRate: number; falseFlag: number }) {
  const { t } = useI18n();
  return (
    <section className="rounded-card bg-ink p-5 text-white">
      <p className="text-sm text-white/70">{title}</p>
      <p className="tabular mt-2 text-4xl font-semibold">{Math.round(catchRate * 100)}%</p>
      <p className="text-sm">{t.catchRate}</p>
      <p className="tabular mt-3 text-lg">{Math.round(falseFlag * 100)}% {t.falseFlag}</p>
    </section>
  );
}
