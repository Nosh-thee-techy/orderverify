/**
 * apps/web/src/components/marketing/WhyChoose.tsx
 * Five-card reasons band. Nav target: #why-orderverify.
 */
"use client";

import { Coins, ShieldCheck, ThumbsUp, UserCheck, Zap } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/cn";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

const cardMeta = [
  { icon: Coins, iconClass: "bg-brand-yellow/70 text-brand-orange", accentClass: "bg-brand-yellow/40" },
  { icon: Zap, iconClass: "bg-[#FDE4C8] text-brand-tangerine", accentClass: "bg-brand-tangerine/20" },
  { icon: ShieldCheck, iconClass: "bg-[#FAD4E4] text-brand-raspberry", accentClass: "bg-brand-raspberry/15" },
  { icon: ThumbsUp, iconClass: "bg-brand-yellow/55 text-brand-orange", accentClass: "bg-brand-yellow/35" },
  { icon: UserCheck, iconClass: "bg-[#FDE4C8] text-brand-tangerine", accentClass: "bg-brand-tangerine/20" },
] as const;

/**
 * Why Choose OrderVerify: five feature cards in a responsive grid.
 *
 * @returns The why-choose landing section
 */
export function WhyChoose() {
  const { t } = useI18n();
  const why = t.landing.why;
  return (
    <Section id="why-orderverify" width="wide" tone="surface" className="scroll-mt-24">
      <SectionHeading align="center" title={why.title} />

      <ul className="marketing-stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        {cardMeta.map((card, index) => {
          const Icon = card.icon;
          const copy = why.cards[index];
          if (!copy) return null;
          return (
            <li
              key={copy.title}
              className={cn(
                "group relative overflow-hidden rounded-brand-card border border-[#F3E6D4] bg-brand-bg p-6 shadow-brand-sm",
                "transition-[transform,box-shadow] duration-200 ease-brand",
                "hover:-translate-y-1 hover:shadow-brand",
                "lg:col-span-2",
                index === 3 && "lg:col-start-2",
                index === 4 && "sm:col-span-2 lg:col-span-2",
              )}
            >
              <span
                className={cn("pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full", card.accentClass)}
                aria-hidden
              />
              <span
                className={cn(
                  "relative flex h-12 w-12 items-center justify-center rounded-full shadow-brand-sm",
                  card.iconClass,
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.85} aria-hidden />
              </span>
              <h3 className="relative mt-5 text-[1.05rem] font-semibold tracking-tight text-brand-ink">{copy.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-brand-muted">{copy.description}</p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
