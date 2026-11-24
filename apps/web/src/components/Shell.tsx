/**
 * apps/web/src/components/Shell.tsx
 * Authenticated product chrome: cream canvas, sunset sidebar, language menu
 * in the sidebar. Routes, language switching, and the bypass banner are unchanged.
 */
"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CalendarCheck, History, Home, Menu, Rocket, Settings, ShieldCheck, Wallet, X } from "lucide-react";
import { LanguageMenu } from "@/components/LanguageMenu";
import { Logo } from "@/components/marketing/Logo";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { cn } from "@/lib/cn";
import { clerkDisplayName } from "@/lib/sellerName";
import { useI18n } from "@/i18n";

const tabs = [
  { href: "/dashboard", key: "today" as const, icon: CalendarCheck },
  { href: "/check", key: "check" as const, icon: ShieldCheck },
  { href: "/history", key: "history" as const, icon: History },
  { href: "/wallet", key: "wallet" as const, icon: Wallet },
  { href: "/settings", key: "settings" as const, icon: Settings },
];

/**
 * Frame every screen with the wordmark, language toggle, and navigation.
 * @param props.children - The page
 * @param props.bypass - When true, a full-width red banner says this is not a real payment
 */
export function AppShell({ children, bypass }: { children: React.ReactNode; bypass: boolean }) {
  const path = usePathname();
  const hideNav = path.includes("/activity") || path.startsWith("/dev");
  const { t } = useI18n();
  const { user } = useUser();
  const displayName = clerkDisplayName(user);
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [path]);

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

  return (
    <div className="dashboard-page min-h-screen bg-brand-bg text-brand-ink">
      {bypass ? (
        <div className="bg-hold px-4 py-3 text-center text-sm font-semibold text-white">{t.bypass}</div>
      ) : null}

      <div className="lg:flex">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-[#F0E2C8] bg-white xl:w-64 lg:flex">
          <div className="relative flex h-full w-full flex-col overflow-hidden">
            <div className="flex h-16 items-center px-5">
              <Logo href="/dashboard" />
            </div>
            <nav className="flex-1 px-3 py-4" aria-label="Main">
              <SidebarLinks path={path} />
            </nav>
            <LanguageMenu variant="sidebar" />
            {hideNav ? null : <SidebarPromo />}
            <SidebarGlow />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-[#F0E2C8] bg-white/90 px-4 py-2 backdrop-blur-md sm:px-6 lg:px-8">
            {hideNav ? null : (
              <button
                ref={triggerRef}
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-brand-control text-brand-ink lg:hidden"
                aria-expanded={open}
                aria-controls={drawerId}
                aria-label="Open menu"
                onClick={() => setOpen(true)}
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
            )}
            <Logo href="/dashboard" className="lg:hidden" />
            <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
              {displayName ? (
                <span className="min-w-0 break-words text-right text-sm font-medium leading-tight text-brand-ink">
                  {displayName}
                </span>
              ) : null}
              <div className="shrink-0">
                <UserButton
                  appearance={{
                    ...clerkAppearance,
                    elements: {
                      ...clerkAppearance.elements,
                      avatarBox: "h-9 w-9",
                    },
                  }}
                />
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>

      {open && !hideNav ? (
        <div ref={drawerRef} className="lg:hidden" id={drawerId}>
          <button
            type="button"
            tabIndex={-1}
            className="fixed inset-0 z-40 bg-brand-ink/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.appName}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,100%)] flex-col overflow-hidden bg-white shadow-brand-lg"
          >
            <div className="flex h-16 items-center justify-between px-4">
              <Logo href="/dashboard" />
              <button
                ref={closeRef}
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-brand-control text-brand-ink"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4" aria-label="Main">
              <SidebarLinks path={path} />
            </nav>
            <LanguageMenu variant="sidebar" />
            <div className="relative">
              <SidebarPromo />
              <SidebarGlow />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Home (public landing) plus Today / Check / Wallet / Settings.
 *
 * @param props.path - Current pathname for the active state
 */
function SidebarLinks({ path }: { path: string }) {
  const { t } = useI18n();
  return (
    <ul className="space-y-1.5">
      <li>
        <NavLink href="/" active={false} label={t.homePage} icon={Home} />
      </li>
      {tabs.map((tab) => (
        <li key={tab.href}>
          <NavLink href={tab.href} active={isActive(path, tab.href)} label={t.tabs[tab.key]} icon={tab.icon} />
        </li>
      ))}
    </ul>
  );
}

function NavLink({
  href,
  active,
  label,
  icon: Icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: typeof Wallet;
}) {
  const className = cn(
    "flex min-h-12 items-center gap-3 rounded-brand-control px-3 text-[0.95rem] font-medium transition-colors duration-200 ease-brand",
    active ? "bg-brand-sunset text-white shadow-brand-sm" : "text-brand-ink/80 hover:bg-[#FFF6E0] hover:text-brand-ink",
  );
  // The public landing page is a full document, not a dashboard route.
  if (href === "/") {
    return (
      <a href="/" className={className}>
        <Icon aria-hidden className="h-5 w-5 shrink-0" />
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      <Icon aria-hidden className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}

/**
 * Sidebar promo. Start Verifying goes to the existing /check flow.
 */
function SidebarPromo() {
  const { t } = useI18n();
  return (
    <div className="relative z-10 mx-3 mb-4 overflow-hidden rounded-2xl border border-[#F8E9B8] bg-gradient-to-br from-[#FFF6C8] via-[#FFE4C2] to-[#FBC9DA] p-4">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-brand-orange" aria-hidden>
        <Rocket className="h-5 w-5" />
      </span>
      <p className="font-display text-base font-semibold leading-snug text-brand-ink">{t.verifyMore}</p>
      <p className="mt-1 text-sm text-brand-muted">{t.keepSafe}</p>
      <Link
        href="/check"
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-brand-control border border-brand-orange px-3 text-sm font-semibold text-brand-orange transition-colors duration-200 hover:bg-white"
      >
        {t.startVerifying}
      </Link>
    </div>
  );
}

/** Soft yellow-to-pink wash behind the promo card. Purely decorative. */
function SidebarGlow() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40" aria-hidden>
      <span className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-brand-yellow/50 blur-2xl" />
      <span className="absolute -bottom-8 -right-6 h-28 w-28 rounded-full bg-brand-raspberry/30 blur-2xl" />
    </div>
  );
}

function isActive(path: string, href: string): boolean {
  if (href === "/dashboard") return path === "/dashboard" || path === "/today";
  return path.startsWith(href);
}

/**
 * Four-item mobile tab bar, exported so the component gallery can show it alone.
 */
export function BottomTabs() {
  return null;
}
