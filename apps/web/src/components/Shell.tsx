/**
 * apps/web/src/components/Shell.tsx
 * Authenticated product chrome: a left sidebar, a top bar, and a mobile drawer.
 * Routes, language switching, and the bypass banner are unchanged.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CalendarCheck, Menu, Settings, ShieldCheck, Wallet, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";

const tabs = [
  { href: "/today", key: "today" as const, icon: CalendarCheck },
  { href: "/check", key: "check" as const, icon: ShieldCheck },
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
  const { t, lang, setLang } = useI18n();
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
    <div className="min-h-screen bg-paper text-ink">
      {bypass ? (
        <div className="bg-hold px-4 py-3 text-center text-sm font-semibold text-white">{t.bypass}</div>
      ) : null}

      <div className="lg:flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
          <div className="flex h-16 items-center px-5">
            <BrandMark href="/today" label={t.appName} />
          </div>
          <nav className="flex-1 px-3 py-4" aria-label="Main">
            <SidebarLinks path={path} />
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
            {hideNav ? null : (
              <button
                ref={triggerRef}
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-control text-ink lg:hidden"
                aria-expanded={open}
                aria-controls={drawerId}
                aria-label="Open menu"
                onClick={() => setOpen(true)}
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
            )}
            <BrandMark href="/today" label={t.appName} className="lg:hidden" />
            <div className="ml-auto">
              <LangToggle lang={lang} onChange={setLang} />
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
            className="fixed inset-0 z-40 bg-ink/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.appName}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,100%)] flex-col bg-surface shadow-card"
          >
            <div className="flex h-16 items-center justify-between px-4">
              <BrandMark href="/today" label={t.appName} />
              <button
                ref={closeRef}
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-control text-ink"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4" aria-label="Main">
              <SidebarLinks path={path} />
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * OrderVerify mark for the dashboard. Uses product green, not the public sunset logo.
 *
 * @param props.href - Destination
 * @param props.label - Visible wordmark
 * @param props.className - Optional extra classes
 */
function BrandMark({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 text-ink", className)} aria-label={`${label} home`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.7rem] bg-primary text-white" aria-hidden>
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
          <path
            d="M8.5 16.6 13.4 21.5 23.5 10.8"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[1.05rem] font-semibold tracking-tight">{label}</span>
    </Link>
  );
}

/**
 * Language toggle. Writes the same localStorage key and seller PUT as before.
 *
 * @param props.lang - Current language
 * @param props.onChange - Setter from I18nProvider
 */
function LangToggle({ lang, onChange }: { lang: "en" | "sw"; onChange: (lang: "en" | "sw") => void }) {
  return (
    <div className="flex rounded-control border border-line bg-paper p-1 text-sm">
      <button
        type="button"
        className={cn("min-h-10 rounded-lg px-3 font-medium", lang === "en" && "bg-primary text-white")}
        onClick={() => onChange("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={cn("min-h-10 rounded-lg px-3 font-medium", lang === "sw" && "bg-primary text-white")}
        onClick={() => onChange("sw")}
      >
        SW
      </button>
    </div>
  );
}

/**
 * Today / Check / Wallet / Settings. Destinations are unchanged.
 *
 * @param props.path - Current pathname for the active state
 */
function SidebarLinks({ path }: { path: string }) {
  const { t } = useI18n();
  return (
    <ul className="space-y-1">
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
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-control px-3 text-[0.95rem] font-medium transition-colors",
        active ? "bg-primary text-white shadow-sm" : "text-ink/80 hover:bg-paper hover:text-ink",
      )}
    >
      <Icon aria-hidden className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}

function isActive(path: string, href: string): boolean {
  if (href === "/today") return path === "/today";
  return path.startsWith(href);
}

/**
 * Four-item mobile tab bar, exported so the component gallery can show it alone.
 */
export function BottomTabs() {
  return null;
}
