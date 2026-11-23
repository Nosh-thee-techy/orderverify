/**
 * apps/web/src/components/marketing/FaqEvalSection.tsx
 * One section, two equal columns: FAQ on the left, evaluation on the right.
 * The Read more control reveals the synthetic matrices — it does not invent results.
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
 * FAQ answers plus the public evaluation numbers, each on half of the section.
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

      <div className="mt-10 grid grid-cols-12 items-start gap-8 sm:mt-12 lg:gap-10">
        <div className="col-span-12 space-y-8 lg:col-span-6">
          {faqs.map((item) => (
            <article key={item.q}>
              <h3 className="font-display text-xl font-semibold tracking-tight text-brand-ink">{item.q}</h3>
              <p className="mt-2 text-base leading-relaxed text-brand-muted">{item.a}</p>
            </article>
          ))}
        </div>

        <div className="col-span-12 lg:col-span-6">
          <p className="marketing-kicker">{t.evalsTitle}</p>
          <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-brand-ink">{t.evalBriefTitle}</h3>
          <p className="mt-3 text-base leading-relaxed text-brand-muted">{t.evalsNote}</p>
          <dl className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-brand-control bg-brand-ink p-4 text-white">
              <dt className="text-xs uppercase tracking-wide text-white/70">{t.textOnly}</dt>
              <dd className="tabular mt-1 text-3xl font-semibold">{Math.round(textOnly.catchRate * 100)}%</dd>
              <p className="mt-1 text-sm text-white/80">{t.catchRate}</p>
              <p className="tabular mt-2 text-sm text-white/80">
                {Math.round(textOnly.falseFlagRate * 100)}% {t.falseFlag}
              </p>
            </div>
            <div className="rounded-brand-control bg-brand-sunset p-4 text-white">
              <dt className="text-xs uppercase tracking-wide text-white/80">{t.withStatement}</dt>
              <dd className="tabular mt-1 text-3xl font-semibold">{Math.round(statement.catchRate * 100)}%</dd>
              <p className="mt-1 text-sm text-white/90">{t.catchRate}</p>
              <p className="tabular mt-2 text-sm text-white/90">
                {Math.round(statement.falseFlagRate * 100)}% {t.falseFlag}
              </p>
            </div>
          </dl>
          <div className="mt-6">
            <Button type="button" variant="secondary" onClick={() => setOpen((value) => !value)}>
              {open ? t.hideEval : t.readEval}
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
            </Button>
          </div>
          {open ? (
            <div className="mt-6 space-y-6">
              <ConfusionMatrix title={t.textOnly} matrix={textOnly.matrix} />
              <ConfusionMatrix title={t.withStatement} matrix={statement.matrix} />
              <p className="text-sm text-brand-muted">{results.note || t.evalsNote}</p>
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
