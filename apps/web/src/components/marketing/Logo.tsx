/**
 * apps/web/src/components/marketing/Logo.tsx
 * Public-site wordmark. The sunset mark is the brand, not a generic letter glyph.
 */
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * OrderVerify logo for the landing page and marketing chrome.
 *
 * @param props.href - Destination; defaults to the public homepage
 * @returns A linked mark plus wordmark
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
      className={cn("group inline-flex items-center gap-2.5 rounded-brand-control text-brand-ink", className)}
      aria-label="OrderVerify home"
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[0.7rem] bg-brand-sunset shadow-brand-sm transition-transform duration-200 ease-brand group-hover:scale-[1.04]" aria-hidden>
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
          <path
            d="M8.5 16.6 13.4 21.5 23.5 10.8"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[1.05rem] font-semibold tracking-tight">OrderVerify</span>
    </Link>
  );
}
