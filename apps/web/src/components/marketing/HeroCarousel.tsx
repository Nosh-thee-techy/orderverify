/**
 * apps/web/src/components/marketing/HeroCarousel.tsx
 * Full-width photographic hero. Images are CSS backgrounds, not a split layout.
 * The slideshow advances on its own. Dots show which slide is visible.
 */
"use client";

import { useEffect, useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { Container } from "./Container";
import { Logo } from "./Logo";

const AUTO_MS = 6500;

const slides = [
  {
    id: "clothing" as const,
    image: "/images/hero/image-3.jpg",
    positionClass: "bg-[position:38%_28%] max-md:bg-[position:32%_22%]",
  },
  {
    id: "beauty" as const,
    image: "/images/hero/image-1.jpg",
    positionClass: "bg-[position:50%_18%] max-md:bg-[position:50%_12%]",
  },
  {
    id: "social" as const,
    image: "/images/hero/image-2.jpg",
    positionClass: "bg-[position:50%_22%] max-md:bg-[position:50%_18%]",
  },
];

/**
 * Full-bleed hero carousel for the public landing page.
 *
 * @returns The hero section with automatic slides and dot indicators
 */
export function HeroCarousel() {
  const { t } = useI18n();
  const copy = t.landing.hero;
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const regionId = useId();

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(motion.matches);
    sync();
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((current) => (current + 1) % slides.length);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const active = slides[index] ?? slides[0];
  if (!active) return null;
  const activeCopy = copy.slides[active.id];

  return (
    <section
      className="relative isolate w-full overflow-hidden"
      aria-roledescription="carousel"
      aria-labelledby={`${regionId}-title`}
    >
      <div className="relative w-full min-h-[max(32rem,calc(100svh-4.5rem))]">
        {slides.map((slide, slideIndex) => {
          const visible = slideIndex === index;
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} ${copy.of} ${slides.length}: ${copy.slides[slide.id].alt}`}
              aria-hidden={!visible}
              className={cn(
                "absolute inset-0 bg-cover bg-no-repeat",
                slide.positionClass,
                reduceMotion ? "transition-none" : "transition-opacity duration-700 ease-brand",
                visible ? "opacity-100" : "opacity-0",
              )}
              style={{
                backgroundImage: `url(${slide.image})`,
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
              }}
            />
          );
        })}

        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(42,16,32,0.78)_0%,rgba(42,16,32,0.42)_48%,rgba(42,16,32,0.16)_100%)] max-md:bg-[linear-gradient(180deg,rgba(42,16,32,0.28)_0%,rgba(42,16,32,0.52)_42%,rgba(42,16,32,0.86)_100%)]"
          aria-hidden
        />

        <Container width="wide" className="relative flex min-h-[max(32rem,calc(100svh-4.5rem))] items-end pb-28 pt-12 md:items-center md:pb-28 md:pt-16 min-[1440px]:pb-24">
          <div className="max-w-xl text-white md:max-w-2xl">
            <Logo
              href="/#top"
              className="mb-5 [&_img]:[filter:drop-shadow(0_0_2px_#fff)_drop-shadow(0_1px_10px_rgba(255,255,255,0.85))]"
            />
            <h1
              id={`${regionId}-title`}
              className="mt-3 font-display text-[2.15rem] font-semibold leading-[1.08] tracking-tight sm:text-display-lg lg:text-display-xl"
            >
              {activeCopy.headline}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">{activeCopy.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="/check" size="lg" className="w-full sm:w-auto">
                {t.landing.nav.startVerifying}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button href="#how-it-works" variant="secondaryOnDark" size="lg" className="w-full sm:w-auto">
                {copy.seeHow}
              </Button>
            </div>
          </div>
        </Container>

        <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center px-3 sm:bottom-8">
          <SlideDots index={index} copy={copy} onSelect={setIndex} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {copy.slideOf} {index + 1} {copy.of} {slides.length}: {activeCopy.headline}
        {reduceMotion ? "" : ` ${copy.autoplaying}`}
      </p>
    </section>
  );
}

function SlideDots({
  index,
  copy,
  onSelect,
}: {
  index: number;
  copy: { showSlide: string; slides: Record<string, { headline: string }> };
  onSelect: (slideIndex: number) => void;
}) {
  return (
    <div className="flex items-center" role="tablist" aria-label={copy.slideOf}>
      {slides.map((slide, slideIndex) => (
        <button
          key={slide.id}
          type="button"
          className="group flex h-11 w-11 items-center justify-center"
          aria-label={`${copy.showSlide} ${slideIndex + 1}: ${copy.slides[slide.id]?.headline ?? ""}`}
          aria-current={slideIndex === index ? "true" : undefined}
          onClick={() => onSelect(slideIndex)}
        >
          <span
            className={cn(
              "rounded-full transition-all duration-300",
              slideIndex === index ? "h-2.5 w-8 bg-brand-yellow" : "h-2.5 w-2.5 bg-white/55 group-hover:bg-white",
            )}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}
