/**
 * apps/web/src/components/marketing/FinalCta.tsx
 * Full-width sunset CTA. Uses the exact brand gradient, not a substitute.
 */
"use client";

import { useI18n } from "@/i18n";
import { Container } from "./Container";
import { Reveal } from "./Reveal";
import { StartVerifyingButton } from "./StartVerifyingButton";

/**
 * Closing call-to-action band for the public landing page.
 *
 * @returns The gradient CTA section
 */
export function FinalCta() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden bg-brand-sunset" aria-labelledby="final-cta-heading">
      {/* Soft plum wash keeps white type readable without hiding yellow → orange → pink. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(42,16,32,0.22)_0%,rgba(42,16,32,0.1)_48%,rgba(42,16,32,0.18)_100%)]"
        aria-hidden
      />
      <span
        className="marketing-float pointer-events-none absolute -left-16 top-[-4rem] h-56 w-56 rounded-full bg-brand-yellow/45"
        aria-hidden
      />
      <span
        className="marketing-float-slow pointer-events-none absolute -right-10 bottom-[-5rem] h-64 w-64 rounded-full bg-brand-raspberry/35"
        aria-hidden
      />
      <span
        className="marketing-float pointer-events-none absolute right-[18%] top-[-3rem] h-28 w-28 rounded-full bg-white/20"
        aria-hidden
      />

      <Container width="wide" className="relative py-section sm:py-section-lg">
        <Reveal>
          <div className="marketing-stagger flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
            <div className="max-w-2xl">
              <h2
                id="final-cta-heading"
                className="font-display text-[2.15rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-display-lg"
              >
                {t.landing.cta.title}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">{t.landing.cta.body}</p>
            </div>
            <StartVerifyingButton variant="dark" className="w-full shadow-brand-lg sm:w-auto" />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
