/**
 * apps/web/src/components/marketing/BenefitsStrip.tsx
 * Compact three-point band that sits immediately under the hero.
 * It is a separate section, not part of the carousel.
 */
"use client";

import { Smartphone, ShieldCheck, Wallet } from "lucide-react";
import { useI18n } from "@/i18n";
import { Container } from "./Container";

const icons = [Wallet, Smartphone, ShieldCheck];

/**
 * Warm, compact benefits row for the landing page.
 *
 * @returns The pay-per-batch strip
 */
export function BenefitsStrip() {
  const { t } = useI18n();
  const items = t.landing.benefits.items;
  return (
    <section className="relative bg-brand-bg py-6 sm:py-8" aria-labelledby="benefits-heading">
      <h2 id="benefits-heading" className="sr-only">
        {t.landing.benefits.heading}
      </h2>
      <Container width="wide">
        <ul className="grid divide-y divide-[#F0E2C8] overflow-hidden rounded-brand-card border border-[#F3E6D4] bg-[#FFF8E4] shadow-brand md:grid-cols-3 md:divide-x md:divide-y-0">
          {items.map((item, index) => {
            const Icon = icons[index] ?? Wallet;
            return (
              <li key={item.title} className="flex items-start gap-3.5 px-5 py-5 sm:px-6 sm:py-6">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-yellow/55 text-brand-orange">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold tracking-tight text-brand-ink">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-brand-muted">{item.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
