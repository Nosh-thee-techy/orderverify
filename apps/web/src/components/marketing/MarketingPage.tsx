/**
 * apps/web/src/components/marketing/MarketingPage.tsx
 * Root wrapper that switches a page onto the public OrderVerify theme.
 */
import { cn } from "@/lib/cn";

/**
 * Applies cream background, plum text, and marketing focus styles.
 * Use this around landing-page composition so dashboard routes stay green.
 *
 * @param props.children - Page sections
 * @returns The themed public-page shell
 */
export function MarketingPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("marketing-page min-h-screen bg-brand-bg text-brand-ink antialiased", className)}>{children}</div>;
}
