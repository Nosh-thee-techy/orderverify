/**
 * apps/web/src/components/marketing/Container.tsx
 * Horizontal page gutters and max-widths for the public landing page.
 */
import { cn } from "@/lib/cn";

const widths = {
  narrow: "max-w-marketing-narrow",
  default: "max-w-marketing",
  wide: "max-w-marketing-wide",
} as const;

/**
 * Centres content and applies responsive side padding.
 *
 * @param props.width - Reading width: narrow copy, default sections, or wide media
 * @param props.as - Semantic element to render
 * @returns A constrained layout wrapper
 */
export function Container({
  children,
  className,
  width = "default",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  width?: keyof typeof widths;
  as?: "div" | "section" | "header" | "footer" | "nav" | "main" | "article";
}) {
  return <Tag className={cn("mx-auto w-full px-5 sm:px-6 lg:px-8", widths[width], className)}>{children}</Tag>;
}
