/**
 * apps/web/src/components/marketing/Footer.tsx
 * Closing chrome for the public site. Continues the sunset family from the CTA
 * with a deeper plum wash so links stay readable. No social accounts are listed
 * because none exist in project configuration.
 */
import Link from "next/link";
import { Container } from "./Container";
import { Logo } from "./Logo";

const quickLinks = [
  { href: "#about", label: "About" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#why-orderverify", label: "Why OrderVerify" },
] as const;

const startLinks = [
  { href: "/check", label: "Start Verifying" },
  { href: "/today", label: "Sign In" },
] as const;

/**
 * A footer link on the dark sunset surface.
 *
 * @param props.href - In-page hash or product route
 * @param props.label - Visible text
 */
function FooterLink({ href, label }: { href: string; label: string }) {
  const className =
    "inline-flex min-h-11 items-center text-[0.95rem] text-white/80 transition-colors duration-150 hover:text-white";

  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

/**
 * Three-column branded footer with copyright.
 *
 * @returns The public-site footer
 */
export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-brand-sunset">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(42,16,32,0.74)_0%,rgba(42,16,32,0.62)_48%,rgba(42,16,32,0.8)_100%)]"
        aria-hidden
      />
      <span className="pointer-events-none absolute -left-10 bottom-[-4rem] h-40 w-40 rounded-full bg-brand-yellow/25" aria-hidden />
      <span className="pointer-events-none absolute -right-8 top-[-3rem] h-48 w-48 rounded-full bg-brand-raspberry/25" aria-hidden />

      <Container width="wide" className="relative">
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12 lg:py-14">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo href="/#top" className="text-white" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">
              Simple. Affordable. Reliable. Verify payments. Grow your business.
            </p>
          </div>

          <nav aria-label="Quick links">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brand-yellow">Quick Links</p>
            <ul className="mt-3 flex flex-col">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Get started">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brand-yellow">Get Started</p>
            <ul className="mt-3 flex flex-col">
              {startLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="border-t border-white/15 py-5 text-sm text-white/70">© 2026 OrderVerify. All rights reserved.</p>
      </Container>
    </footer>
  );
}
