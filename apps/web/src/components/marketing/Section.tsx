/**
 * apps/web/src/components/marketing/Section.tsx
 * Vertical rhythm for landing sections. Content is supplied by later tasks.
 */
import { cn } from "@/lib/cn";
import { Container } from "./Container";
import { Reveal } from "./Reveal";

/**
 * A full-width landing band with consistent padding and an inner container.
 *
 * @param props.id - Optional fragment target for in-page navigation
 * @param props.tone - Surface colour for this band
 * @param props.width - Inner container width
 * @returns A semantic section with the marketing spacing scale
 */
export function Section({
  id,
  children,
  className,
  innerClassName,
  tone = "default",
  width = "default",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  tone?: "default" | "surface" | "warm";
  width?: "narrow" | "default" | "wide";
}) {
  const toneClass =
    tone === "surface" ? "bg-brand-surface" : tone === "warm" ? "bg-[#FFF6DD]" : "bg-transparent";

  return (
    <section id={id} className={cn("py-section-sm sm:py-section lg:py-section-lg", toneClass, className)}>
      <Container width={width} className={innerClassName}>
        <Reveal>{children}</Reveal>
      </Container>
    </section>
  );
}
