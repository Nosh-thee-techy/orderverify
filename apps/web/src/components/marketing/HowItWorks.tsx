/**
 * apps/web/src/components/marketing/HowItWorks.tsx
 * Four-step journey for the landing page: upload, pay per batch, verify, review.
 */
"use client";

import { ChevronDown, ChevronRight, CloudUpload, CreditCard, FileText, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/cn";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

const stepMeta = [
  { number: "01", icon: CloudUpload, iconClass: "bg-brand-yellow/70 text-brand-orange" },
  { number: "02", icon: CreditCard, iconClass: "bg-[#FDE4C8] text-brand-tangerine" },
  { number: "03", icon: ShieldCheck, iconClass: "bg-[#FAD4E4] text-brand-raspberry" },
  { number: "04", icon: FileText, iconClass: "bg-brand-yellow/55 text-brand-orange" },
] as const;

/**
 * Numbered four-step process with connecting lines on desktop and chevrons on mobile.
 *
 * @returns The How It Works landing section
 */
export function HowItWorks() {
  const { t } = useI18n();
  const how = t.landing.how;
  return (
    <Section id="how-it-works" width="wide" tone="surface" className="scroll-mt-24">
      <SectionHeading align="center" eyebrow={how.eyebrow} title={how.title} description={how.description} />

      <ol className="marketing-stagger mt-12 grid gap-10 sm:mt-14 sm:gap-12 lg:grid-cols-2 lg:gap-10 xl:grid-cols-4 xl:gap-6">
        {stepMeta.map((step, index) => {
          const Icon = step.icon;
          const copy = how.steps[index];
          const last = index === stepMeta.length - 1;
          if (!copy) return null;

          return (
            <li key={step.number} className="group relative flex flex-col items-center text-center">
              {/* Desktop connector from this icon to the next. */}
              {last ? null : (
                <span
                  className="pointer-events-none absolute left-[calc(50%+2.35rem)] top-[3.35rem] hidden h-[2px] w-[calc(100%-2.2rem)] bg-gradient-to-r from-brand-tangerine to-brand-raspberry/80 xl:block"
                  aria-hidden
                >
                  <ChevronRight className="absolute -right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-raspberry" />
                </span>
              )}

              <p className="marketing-kicker">{step.number}</p>
              <span
                className={cn(
                  "mt-3 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full shadow-brand-sm transition-transform duration-200 ease-brand group-hover:scale-105",
                  step.iconClass,
                )}
              >
                <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-5 max-w-[16rem] text-[1.05rem] font-semibold leading-snug tracking-tight text-brand-ink">
                {copy.title}
              </h3>
              <p className="mt-2 max-w-[17rem] text-sm leading-relaxed text-brand-muted">{copy.description}</p>

              {last ? null : (
                <ChevronDown className="mt-6 h-5 w-5 text-brand-tangerine lg:hidden" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
