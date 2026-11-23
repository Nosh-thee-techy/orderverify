/**
 * apps/web/src/components/marketing/FinalCta.tsx
 * Full-width sunset CTA. Uses the exact brand gradient, not a substitute.
 */
import { ArrowRight } from "lucide-react";
import { Button } from "./Button";
import { Container } from "./Container";

/**
 * Closing call-to-action band for the public landing page.
 *
 * @returns The gradient CTA section
 */
export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-brand-sunset" aria-labelledby="final-cta-heading">
      {/* Soft plum wash keeps white type readable without hiding yellow → orange → pink. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(42,16,32,0.22)_0%,rgba(42,16,32,0.1)_48%,rgba(42,16,32,0.18)_100%)]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -left-16 top-[-4rem] h-56 w-56 rounded-full bg-brand-yellow/45"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -right-10 bottom-[-5rem] h-64 w-64 rounded-full bg-brand-raspberry/35"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-[18%] top-[-3rem] h-28 w-28 rounded-full bg-white/20"
        aria-hidden
      />

      <Container width="wide" className="relative py-section sm:py-section-lg">
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="marketing-rise max-w-2xl">
            <h2
              id="final-cta-heading"
              className="font-display text-[2.15rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-display-lg"
            >
              Protect your next batch before it leaves your hands.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
              Give every order a second check. Verify payments, review suspicious orders and dispatch with greater
              confidence.
            </p>
          </div>
          <Button href="/check" variant="dark" size="lg" className="marketing-rise w-full shadow-brand-lg sm:w-auto [animation-delay:120ms]">
            Start Verifying
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </Container>
    </section>
  );
}
