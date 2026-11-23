/**
 * apps/web/src/components/marketing/Navbar.tsx
 * Sticky public navigation. In-page links scroll to landing sections.
 * Start Verifying enters the product. There is no Sign In control here.
 */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { LanguageMenu } from "@/components/LanguageMenu";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { Container } from "./Container";
import { Logo } from "./Logo";

const linkHrefs = [
  { href: "#about", key: "about" as const },
  { href: "#how-it-works", key: "howItWorks" as const },
  { href: "#why-orderverify", key: "why" as const },
  { href: "#faq-eval", key: "faq" as const },
] as const;

/**
 * Landing-page header with desktop links and an accessible mobile drawer.
 *
 * @returns The public site navigation
 */
export function Navbar() {
  const { t } = useI18n();
  const links = linkHrefs.map((link) => ({ href: link.href, label: t.landing.nav[link.key] }));
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      // Keep Tab inside the drawer so keyboard users cannot reach the page behind it.
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")].filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header
      id="top"
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-200 ease-brand",
        scrolled
          ? "border-b border-[#F0E2C8] bg-brand-bg/92 shadow-brand-sm backdrop-blur-md"
          : "border-b border-transparent bg-brand-bg/80",
      )}
    >
      <Container width="wide" className="flex h-[4.25rem] items-center justify-between gap-4 sm:h-[4.5rem]">
        <Logo href="/#top" />

        <nav className="hidden lg:block" aria-label={t.appName}>
          <ul className="flex items-center gap-8">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-[0.95rem] font-medium text-brand-ink/70 transition-colors duration-150 hover:text-brand-orange"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <LanguageMenu variant="nav" />
          <Button href="/check">
            {t.landing.nav.startVerifying}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <button
          ref={triggerRef}
          type="button"
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-brand-control text-brand-ink lg:hidden",
            open && "pointer-events-none opacity-0",
          )}
          aria-expanded={open}
          aria-controls={menuId}
            aria-label={t.landing.openMenu}
          onClick={() => setOpen(true)}
        >
          <Menu className="h-6 w-6" aria-hidden />
        </button>
      </Container>

      {open ? (
        <div ref={drawerRef} className="lg:hidden" id={menuId}>
          <button
            type="button"
            tabIndex={-1}
            className="fixed inset-0 z-[60] bg-brand-ink/40"
            aria-label={t.landing.closeMenu}
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${menuId}-title`}
            className="fixed inset-y-0 right-0 z-[70] flex w-[min(22rem,100%)] flex-col bg-brand-bg shadow-brand-lg"
          >
            <div className="flex h-[4.25rem] items-center justify-between px-5">
              <p id={`${menuId}-title`} className="font-semibold tracking-tight">
                {t.landing.menu}
              </p>
              <button
                ref={closeRef}
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-brand-control text-brand-ink"
                aria-label={t.landing.closeMenu}
                onClick={close}
              >
                <X className="h-6 w-6" aria-hidden />
              </button>
            </div>
            <nav className="flex flex-1 flex-col px-5 pb-6" aria-label={t.appName}>
              <ul className="flex flex-col gap-1">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="flex min-h-12 items-center text-lg font-medium text-brand-ink"
                      onClick={close}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <LanguageMenu variant="nav" />
              </div>
              <div className="mt-auto pt-6">
                <Button href="/check" className="w-full">
                  {t.landing.nav.startVerifying}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
