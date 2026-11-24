/**
 * apps/web/src/components/marketing/Footer.tsx
 * Light public footer. Decorative brand spheres sit at the upper right;
 * the copyright line is centred. No social accounts are listed because
 * none exist in project configuration.
 */
"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useI18n } from "@/i18n";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { Reveal } from "./Reveal";

/**
 * A footer link on the white surface.
 *
 * @param props.href - In-page hash or product route
 * @param props.label - Visible text
 */
function FooterLink({ href, label }: { href: string; label: string }) {
  const className =
    "inline-flex min-h-11 items-center text-[0.95rem] text-brand-muted transition-colors duration-150 hover:text-brand-orange";

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
 * White footer with brand spheres and a centred copyright line.
 *
 * @returns The public-site footer
 */
export function Footer() {
  const { t } = useI18n();
  const footer = t.landing.footer;
  const nav = t.landing.nav;
  const quickLinks = [
    { href: "#about", label: nav.about },
    { href: "#how-it-works", label: nav.howItWorks },
    { href: "#why-orderverify", label: nav.why },
    { href: "#faq-eval", label: nav.faq },
  ];
  const { isSignedIn } = useAuth();
  const startHref = isSignedIn ? "/dashboard" : "/sign-up";
  const startLabel = isSignedIn ? t.goToDashboard : nav.startVerifying;

  return (
    <footer className="relative overflow-hidden border-t border-[#F0E2C8] bg-white">
      <span className="marketing-float pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand-yellow" aria-hidden />
      <span className="marketing-float-slow pointer-events-none absolute right-16 -top-6 h-24 w-24 rounded-full bg-brand-tangerine" aria-hidden />
      <span className="marketing-float pointer-events-none absolute right-4 top-16 h-28 w-28 rounded-full bg-brand-raspberry/90" aria-hidden />

      <Container width="wide" className="relative">
        <Reveal>
        <div className="marketing-stagger grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12 lg:py-14">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo href="/#top" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-muted">{footer.blurb}</p>
          </div>

          <nav aria-label={footer.quick}>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brand-tangerine">{footer.quick}</p>
            <ul className="mt-3 flex flex-col">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={footer.start}>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brand-tangerine">{footer.start}</p>
            <ul className="mt-3 flex flex-col">
              <li>
                <FooterLink href={startHref} label={startLabel} />
              </li>
            </ul>
          </nav>
        </div>

        <p className="border-t border-[#F0E2C8] py-5 text-center text-sm text-brand-muted">{footer.copyright}</p>
        </Reveal>
      </Container>
    </footer>
  );
}
