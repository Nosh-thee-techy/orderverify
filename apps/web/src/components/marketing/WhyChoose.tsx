/**
 * apps/web/src/components/marketing/WhyChoose.tsx
 * Five-card reasons band. Nav target: #why-orderverify.
 */
import { Coins, ShieldCheck, ThumbsUp, UserCheck, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

const cards = [
  {
    title: "Affordable Verification.",
    description: "Pay per batch instead of maintaining expensive monthly subscriptions.",
    icon: Coins,
    iconClass: "bg-brand-yellow/70 text-brand-orange",
    accentClass: "bg-brand-yellow/40",
  },
  {
    title: "Less Manual Work.",
    description: "Reduce the time spent matching orders with payment messages.",
    icon: Zap,
    iconClass: "bg-[#FDE4C8] text-brand-tangerine",
    accentClass: "bg-brand-tangerine/20",
  },
  {
    title: "Detect Suspicious Payments.",
    description: "Identify duplicate codes, amount mismatches and inconsistent payment details.",
    icon: ShieldCheck,
    iconClass: "bg-[#FAD4E4] text-brand-raspberry",
    accentClass: "bg-brand-raspberry/15",
  },
  {
    title: "Better Dispatch Decisions.",
    description: "Review suspicious orders before releasing goods.",
    icon: ThumbsUp,
    iconClass: "bg-brand-yellow/55 text-brand-orange",
    accentClass: "bg-brand-yellow/35",
  },
  {
    title: "You Stay in Control.",
    description: "You decide what happens to orders that require further review.",
    icon: UserCheck,
    iconClass: "bg-[#FDE4C8] text-brand-tangerine",
    accentClass: "bg-brand-tangerine/20",
  },
] as const;

/**
 * Why Choose OrderVerify: five feature cards in a responsive grid.
 *
 * @returns The why-choose landing section
 */
export function WhyChoose() {
  return (
    <Section id="why-orderverify" width="wide" tone="surface" className="scroll-mt-24">
      <SectionHeading align="center" title="Why Choose OrderVerify" />

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <li
              key={card.title}
              className={cn(
                "group relative overflow-hidden rounded-brand-card border border-[#F3E6D4] bg-brand-bg p-6 shadow-brand-sm",
                "transition-[transform,box-shadow] duration-200 ease-brand",
                "hover:-translate-y-1 hover:shadow-brand",
                "lg:col-span-2",
                index === 3 && "lg:col-start-2",
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
              <h3 className="relative mt-5 text-[1.05rem] font-semibold tracking-tight text-brand-ink">{card.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-brand-muted">{card.description}</p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
