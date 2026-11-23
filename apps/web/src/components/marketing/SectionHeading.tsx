/**
 * apps/web/src/components/marketing/SectionHeading.tsx
 * Eyebrow, title, and supporting copy for landing-page sections.
 */
import { cn } from "@/lib/cn";

/**
 * Standard section intro: small kicker, display title, optional lead paragraph.
 *
 * @param props.eyebrow - Short uppercase label, e.g. "ABOUT ORDERVERIFY"
 * @param props.title - Section headline
 * @param props.description - One or two sentences under the title
 * @param props.align - Left for two-column layouts, centre for process/feature bands
 * @param props.as - Heading level; defaults to h2 because the hero owns h1
 * @returns A heading block using the marketing type scale
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as: Heading = "h2",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("marketing-heading", align === "center" && "mx-auto max-w-3xl text-center", className)}>
      {eyebrow ? <p className="marketing-kicker">{eyebrow}</p> : null}
      <Heading className={cn("marketing-title", eyebrow && "mt-3")}>{title}</Heading>
      {description ? (
        <div className={cn("marketing-lead mt-4", align === "center" && "mx-auto")}>{description}</div>
      ) : null}
    </div>
  );
}
