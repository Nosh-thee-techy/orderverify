/**
 * apps/web/src/components/marketing/HeroCarousel.tsx
 * Full-width photographic hero. Images are CSS backgrounds, not a split layout.
 *
 * Photo credits (Pexels, free commercial licence):
 * - clothing: Taiye Salawu, Abuja
 * - beauty: Habib Musliu, Kaduna
 * - social: George Milton
 */
"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { Container } from "./Container";

const AUTO_MS = 6500;

const slides = [
  {
    id: "clothing",
    image: "/images/hero/clothing.webp",
    positionClass: "bg-[position:38%_28%] max-md:bg-[position:32%_22%]",
    headline: "Verify the payment. Then dispatch.",
    description: "Check M-Pesa payments against your orders before sending them out.",
    alt: "Clothing sellers with a rail of garments in their boutique.",
  },
  {
    id: "beauty",
    image: "/images/hero/beauty.webp",
    positionClass: "bg-[position:50%_18%] max-md:bg-[position:50%_12%]",
    headline: "Protect every order before it leaves.",
    description: "Spend less time matching payments manually and more time growing your business.",
    alt: "A beauty entrepreneur holding skincare products from her catalogue.",
  },
  {
    id: "social",
    image: "/images/hero/social.webp",
    positionClass: "bg-[position:50%_22%] max-md:bg-[position:50%_18%]",
    headline: "Your orders deserve a second check.",
    description: "Affordable payment verification for the way you sell online.",
    alt: "A social-commerce seller recording product content with a ring light.",
  },
] as const;

/**
 * Full-bleed hero carousel for the public landing page.
 *
 * @returns The hero section, including autoplay controls
 */
export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const regionId = useId();
  const pauseUntil = useRef(0);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(motion.matches);
    sync();
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, []);

  const goTo = useCallback((next: number, fromUser = false) => {
    setIndex((next + slides.length) % slides.length);
    if (fromUser) {
      pauseUntil.current = Date.now() + 10000;
      setPaused(true);
    }
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      if (document.hidden || pausedRef.current) return;
      if (Date.now() < pauseUntil.current) return;
      setIndex((current) => (current + 1) % slides.length);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1, true);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1, true);
    }
  };

  const active = slides[index] ?? slides[0];

  return (
    <section
      className="relative isolate w-full overflow-hidden"
      aria-roledescription="carousel"
      aria-labelledby={`${regionId}-title`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        if (Date.now() >= pauseUntil.current) setPaused(false);
      }}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          if (Date.now() >= pauseUntil.current) setPaused(false);
        }
      }}
    >
      <div className="relative w-full min-h-[max(32rem,calc(100svh-4.5rem))]">
        {slides.map((slide, slideIndex) => {
          const visible = slideIndex === index;
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} of ${slides.length}: ${slide.alt}`}
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

        <Container width="wide" className="relative flex min-h-[max(32rem,calc(100svh-4.5rem))] items-end pb-24 pt-12 md:items-center md:pb-24 md:pt-16">
          <div className="max-w-xl text-white md:max-w-2xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brand-yellow">OrderVerify</p>
            <h1
              id={`${regionId}-title`}
              className="mt-3 font-display text-[2.15rem] font-semibold leading-[1.08] tracking-tight sm:text-display-lg lg:text-display-xl"
            >
              {active.headline}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">{active.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="/check" size="lg" className="w-full sm:w-auto">
                Start Verifying
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button href="#how-it-works" variant="secondaryOnDark" size="lg" className="w-full sm:w-auto">
                See How It Works
              </Button>
            </div>
          </div>
        </Container>

        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 hidden -translate-y-1/2 justify-between px-5 sm:flex lg:px-8">
          <CarouselButton label="Previous slide" onClick={() => goTo(index - 1, true)}>
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </CarouselButton>
          <CarouselButton label="Next slide" onClick={() => goTo(index + 1, true)}>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </CarouselButton>
        </div>

        <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-between px-3 sm:hidden">
          <CarouselButton label="Previous slide" onClick={() => goTo(index - 1, true)}>
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </CarouselButton>
          <SlideDots index={index} onSelect={(slideIndex) => goTo(slideIndex, true)} />
          <CarouselButton label="Next slide" onClick={() => goTo(index + 1, true)}>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </CarouselButton>
        </div>

        <div className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 sm:block">
          <SlideDots index={index} onSelect={(slideIndex) => goTo(slideIndex, true)} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {slides.length}: {active.headline}
        {paused || reduceMotion ? "" : " Autoplaying."}
      </p>
    </section>
  );
}

function SlideDots({
  index,
  onSelect,
}: {
  index: number;
  onSelect: (slideIndex: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {slides.map((slide, slideIndex) => (
        <button
          key={slide.id}
          type="button"
          className={cn(
            "h-2.5 rounded-full transition-all duration-300",
            slideIndex === index ? "w-8 bg-brand-yellow" : "w-2.5 bg-white/55 hover:bg-white",
          )}
          aria-label={`Show slide ${slideIndex + 1}: ${slide.headline}`}
          aria-current={slideIndex === index ? "true" : undefined}
          onClick={() => onSelect(slideIndex)}
        />
      ))}
    </div>
  );
}

function CarouselButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-brand-ink/35 text-white backdrop-blur-sm transition-colors hover:bg-brand-ink/70"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
