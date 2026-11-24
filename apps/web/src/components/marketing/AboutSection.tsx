/**
 * apps/web/src/components/marketing/AboutSection.tsx
 * Two-column About band: copy on the left, an editorial photo collage on the right.
 *
 * Photo credits (Pexels, free commercial licence):
 * - clothing: Alpha Paul
 * - beauty: Monstera Production
 * - orders: Alexander Suhorucov
 */
"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/cn";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

const collage = [
  {
    src: "/images/about/clothing.webp",
    altKey: "clothing" as const,
    className: "left-[2%] top-[8%] z-20 w-[64%] -rotate-[6deg]",
    imageClassName: "aspect-[3/4] object-[center_38%]",
    width: 1200,
    height: 1800,
  },
  {
    src: "/images/about/beauty.webp",
    altKey: "beauty" as const,
    className: "right-[1%] top-[2%] z-30 w-[50%] rotate-[9deg]",
    imageClassName: "aspect-[4/5] object-center",
    width: 1000,
    height: 1500,
  },
  {
    src: "/images/about/orders.webp",
    altKey: "orders" as const,
    className: "left-[22%] top-[48%] z-40 w-[56%] -rotate-[5deg]",
    imageClassName: "aspect-[5/4] object-[68%_center]",
    width: 1100,
    height: 734,
  },
] as const;

/**
 * Polaroid-style frame used inside the overlapping collage.
 *
 * @param props.src - Local WebP path
 * @param props.alt - Accessible description of the photo
 * @param props.className - Absolute position, size, and rotation
 * @param props.imageClassName - Aspect ratio and crop
 * @param props.width - Intrinsic pixel width for layout
 * @param props.height - Intrinsic pixel height for layout
 */
function CollagePhoto({
  src,
  alt,
  className,
  imageClassName,
  width,
  height,
}: {
  src: string;
  alt: string;
  className: string;
  imageClassName: string;
  width: number;
  height: number;
}) {
  return (
    <div
      className={cn(
        "absolute overflow-hidden rounded-[1.35rem] border-[3px] border-white bg-white p-1 shadow-brand-lg",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className={cn("h-full w-full rounded-[1.1rem] object-cover", imageClassName)}
      />
    </div>
  );
}

/**
 * Layered imagery with decorative brand shapes behind three overlapping photos.
 *
 * @returns The collage figure
 */
function AboutCollage() {
  const { t } = useI18n();
  return (
    <figure
      className="marketing-stagger relative mx-auto aspect-[4/5] w-full max-w-[28rem] overflow-hidden sm:max-w-[32rem] lg:max-w-none lg:overflow-visible"
      aria-label={t.landing.about.collageLabel}
    >
      {/* Decorative shapes sit behind the photos so the collage feels editorial, not a card grid. */}
      <span
        className="marketing-float absolute left-[-6%] top-[8%] h-36 w-36 rounded-full bg-brand-yellow/80 sm:h-44 sm:w-44"
        aria-hidden
      />
      <span
        className="marketing-float-slow absolute bottom-[10%] left-[18%] h-24 w-24 rounded-[1.75rem] bg-brand-tangerine/55 sm:h-28 sm:w-28"
        aria-hidden
      />
      <span
        className="marketing-float absolute right-[-4%] top-[-2%] h-32 w-32 rotate-12 rounded-[42%] bg-brand-raspberry/40 sm:h-40 sm:w-40"
        aria-hidden
      />
      <span
        className="marketing-float-slow absolute bottom-[22%] right-[28%] h-16 w-16 rounded-full bg-brand-yellow/50"
        aria-hidden
      />

      {collage.map((photo) => (
        <CollagePhoto
          key={photo.src}
          src={photo.src}
          alt={t.landing.about.alts[photo.altKey]}
          className={photo.className}
          imageClassName={photo.imageClassName}
          width={photo.width}
          height={photo.height}
        />
      ))}
    </figure>
  );
}

/**
 * About OrderVerify: why the product exists, with a layered photo collage.
 *
 * @returns The About landing section
 */
export function AboutSection() {
  const { t } = useI18n();
  const about = t.landing.about;
  return (
    <Section id="about" width="wide" className="scroll-mt-24">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <div>
          <SectionHeading eyebrow={about.eyebrow} title={about.title} description={about.description} />
          <ul className="marketing-stagger mt-8 space-y-3.5">
            {about.points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-yellow/60 text-brand-orange">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
                </span>
                <p className="font-medium leading-relaxed text-brand-ink">{point}</p>
              </li>
            ))}
          </ul>
        </div>
        <AboutCollage />
      </div>
    </Section>
  );
}
