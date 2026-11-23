/**
 * apps/web/src/components/marketing/FaqEvalSection.tsx
 * Landing FAQ beside a short eval brief. Read more reveals the existing
 * synthetic eval numbers — it does not invent new results.
 */
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import results from "@/data/eval-results.json";
import { ConfusionMatrix } from "@/components/bits";
import { useI18n } from "@/i18n";
import { Button } from "./Button";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

interface Mode {
  catchRate: number;
  falseFlagRate: number;
  matrix: { genuine: Record<string, number>; forged: Record<string, number> };
}

/**
 * Two-column FAQ + evaluation band that sits above the footer.
 *
 * @returns The public FAQ and eval section
 */
export function FaqEvalSection() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const textOnly = results.textOnly as Mode;
  const statement = results.statement as Mode;
  const faqs = [
    { q: t.faqQ1, a: t.faqA1 },
    { q: t.faqQ2, a: t.faqA2 },
    { q: t.faqQ3, a: t.faqA3 },
  ];

  return (
    <Section id="faq-eval" width="wide" tone="warm" className="scroll-mt-24">
      <SectionHeading
        eyebrow={t.landing.faqEval.eyebrow}
        title={t.faqEvalTitle}
        description={t.faqEvalLead}
      />
      <div className="mt-10 grid items-stretch gap-8 lg:mt-12 lg:grid-cols-2 lg:gap-10">
        <article className="relative overflow-hidden rounded-brand-card bg-white shadow-brand">
          <img
            src="/images/hero/clothing.webp"
            alt=""
            className="h-48 w-full object-cover sm:h-56"
          />
          <div className="space-y-2 p-5 sm:p-6">
            {faqs.map((item) => (
              <details key={item.q} className="rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-4 py-3">
                <summary className="cursor-pointer font-medium text-brand-ink">{item.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </article>

        <article className="flex flex-col rounded-brand-card border border-[#F0E2C8] bg-white p-5 shadow-brand-sm sm:p-8">
          <p className="marketing-kicker">{t.evalsTitle}</p>
          <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-brand-ink">{t.evalBriefTitle}</h3>
          <p className="mt-3 text-base leading-relaxed text-brand-muted">{t.evalsNote}</p>
          <dl className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-brand-control bg-brand-ink p-4 text-white">
              <dt className="text-xs uppercase tracking-wide text-white/70">{t.textOnly}</dt>
              <dd className="tabular mt-1 text-3xl font-semibold">{Math.round(textOnly.catchRate * 100)}%</dd>
              <p className="mt-1 text-sm text-white/80">{t.catchRate}</p>
            </div>
            <div className="rounded-brand-control bg-brand-sunset p-4 text-white">
              <dt className="text-xs uppercase tracking-wide text-white/80">{t.withStatement}</dt>
              <dd className="tabular mt-1 text-3xl font-semibold">{Math.round(statement.catchRate * 100)}%</dd>
              <p className="mt-1 text-sm text-white/90">{t.catchRate}</p>
            </div>
          </dl>
          <div className="mt-6">
            <Button type="button" variant="secondary" onClick={() => setOpen((value) => !value)}>
              {open ? t.hideEval : t.readEval}
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
            </Button>
          </div>
        </article>
      </div>

      {open ? (
        <div className="mt-8 space-y-6 rounded-brand-card border border-[#F0E2C8] bg-white p-5 shadow-brand-sm sm:p-8">
          <ConfusionMatrix title={t.textOnly} matrix={textOnly.matrix} />
          <ConfusionMatrix title={t.withStatement} matrix={statement.matrix} />
          <p className="text-sm text-brand-muted">{results.note || t.evalsNote}</p>
        </div>
      ) : null}
    </Section>
  );
}
