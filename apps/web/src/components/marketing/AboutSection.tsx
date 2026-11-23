/**
 * apps/web/src/components/marketing/AboutSection.tsx
 * Two-column About band: copy on the left, an editorial photo collage on the right.
 *
 * Photo credits (Pexels, free commercial licence):
 * - clothing: Alpha Paul
 * - beauty: Monstera Production
 * - orders: Alexander Suhorucov
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

const points = [
  "Stop forged payment confirmations.",
  "Avoid costly mistakes.",
  "Grow your business with confidence.",
] as const;

const collage = [
  {
    src: "/images/about/clothing.webp",
    alt: "A clothing boutique with colourful dresses on display.",
    className: "left-[2%] top-[8%] z-20 w-[64%] -rotate-[6deg]",
    imageClassName: "aspect-[3/4] object-[center_38%]",
  },
  {
    src: "/images/about/beauty.webp",
    alt: "Amber skincare bottles and spa products on a wooden tray.",
    className: "right-[1%] top-[2%] z-30 w-[50%] rotate-[9deg]",
    imageClassName: "aspect-[4/5] object-center",
  },
  {
    src: "/images/about/orders.webp",
    alt: "A seller checking an order on her phone while working on a laptop.",
    className: "left-[22%] top-[48%] z-40 w-[56%] -rotate-[5deg]",
    imageClassName: "aspect-[5/4] object-[68%_center]",
  },
] as const;

/**
 * Polaroid-style frame used inside the overlapping collage.
 *
 * @param props.src - Local WebP path
 * @param props.alt - Accessible description of the photo
 * @param props.className - Absolute position, size, and rotation
 * @param props.imageClassName - Aspect ratio and crop
 */
function CollagePhoto({
  src,
  alt,
  className,
  imageClassName,
}: {
  src: string;
  alt: string;
  className: string;
  imageClassName: string;
}) {
  return (
    <div
      className={cn(
        "absolute overflow-hidden rounded-[1.35rem] border-[3px] border-white bg-white p-1 shadow-brand-lg",
        className,
      )}
    >
      <img src={src} alt={alt} className={cn("w-full rounded-[1.1rem] object-cover", imageClassName)} />
    </div>
  );
}

/**
 * Layered imagery with decorative brand shapes behind three overlapping photos.
 *
 * @returns The collage figure
 */
function AboutCollage() {
  return (
    <figure
      className="relative mx-auto aspect-[4/5] w-full max-w-[28rem] overflow-hidden sm:max-w-[32rem] lg:max-w-none lg:overflow-visible"
      aria-label="Sellers in clothing, beauty, and social-commerce businesses"
    >
      {/* Decorative shapes sit behind the photos so the collage feels editorial, not a card grid. */}
      <span
        className="absolute left-[-6%] top-[8%] h-36 w-36 rounded-full bg-brand-yellow/80 sm:h-44 sm:w-44"
        aria-hidden
      />
      <span
        className="absolute bottom-[10%] left-[18%] h-24 w-24 rounded-[1.75rem] bg-brand-tangerine/55 sm:h-28 sm:w-28"
        aria-hidden
      />
      <span
        className="absolute right-[-4%] top-[-2%] h-32 w-32 rotate-12 rounded-[42%] bg-brand-raspberry/40 sm:h-40 sm:w-40"
        aria-hidden
      />
      <span
        className="absolute bottom-[22%] right-[28%] h-16 w-16 rounded-full bg-brand-yellow/50"
        aria-hidden
      />

      {collage.map((photo) => (
        <CollagePhoto key={photo.src} {...photo} />
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
  return (
    <Section id="about" width="wide" className="scroll-mt-24">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <div>
          <SectionHeading
            eyebrow="About OrderVerify"
            title="A smarter way to verify M-Pesa payments."
            description="OrderVerify makes it easier for online sellers to check whether customer payments match their orders before dispatch."
          />
          <ul className="mt-8 space-y-3.5">
            {points.map((point) => (
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
