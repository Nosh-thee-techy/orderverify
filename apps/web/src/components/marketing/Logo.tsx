/**
 * apps/web/src/components/marketing/Logo.tsx
 * Public and product mark. The file already includes the OrderVerify name,
 * so nothing is written beside it, and no colour plate is placed behind it.
 */
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * OrderVerify logo. Used wherever a brand mark belongs.
 *
 * @param props.href - Destination; defaults to the public homepage
 * @param props.className - Optional size/alignment overrides
 * @returns A linked logo image with an accessible name
 */
export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center rounded-brand-control bg-transparent", className)}
      aria-label="OrderVerify home"
    >
      <img
        src="/images/logo.png"
        alt="OrderVerify"
        className="h-12 w-auto bg-transparent object-contain sm:h-14"
      />
    </Link>
  );
}
