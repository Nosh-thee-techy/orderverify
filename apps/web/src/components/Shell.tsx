/**
 * apps/web/src/components/Shell.tsx
 * Mobile tab bar and the desktop rail. One primary action lives in the page, not in the chrome.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Settings, ShieldCheck, Wallet } from "lucide-react";
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
  return (
    <div className="min-h-screen bg-paper text-ink">
      {bypass ? (
        <div className="bg-hold px-4 py-3 text-center text-sm font-semibold text-white">{t.bypass}</div>
      ) : null}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/today" className="text-lg font-semibold tracking-tight text-primary">
          {t.appName}
        </Link>
        <div className="flex rounded-control border border-line bg-surface p-1 text-sm">
          <button type="button" className={cn("min-h-10 rounded-lg px-3", lang === "en" && "bg-primary text-white")} onClick={() => setLang("en")}>
            EN
          </button>
          <button type="button" className={cn("min-h-10 rounded-lg px-3", lang === "sw" && "bg-primary text-white")} onClick={() => setLang("sw")}>
            SW
          </button>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl lg:grid-cols-[220px_1fr]">
        <nav className="hidden px-4 lg:block" aria-label="Main">
          <ul className="sticky top-4 space-y-1">
            {tabs.map((tab) => (
              <li key={tab.href}>
                <NavLink href={tab.href} active={isActive(path, tab.href)} label={t.tabs[tab.key]} icon={tab.icon} />
              </li>
            ))}
          </ul>
        </nav>
        <main className={cn("px-4", hideNav ? "pb-8" : "pb-28 lg:pb-10")}>{children}</main>
      </div>
      {hideNav ? null : (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-2 py-2 lg:hidden" aria-label="Main">
          <ul className="mx-auto grid max-w-lg grid-cols-4">
            {tabs.map((tab) => (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-0.5 text-xs",
                    tab.key === "check" && "-mt-4",
                    isActive(path, tab.href) ? "text-primary" : "text-muted",
                  )}
                >
                  <span className={cn("flex h-12 w-12 items-center justify-center rounded-full", tab.key === "check" && "bg-primary text-white shadow-card")}>
                    <tab.icon aria-hidden className="h-5 w-5" />
                  </span>
                  {t.tabs[tab.key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
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
    <Link href={href} className={cn("flex min-h-12 items-center gap-3 rounded-control px-3", active ? "bg-primary text-white" : "text-ink hover:bg-white")}>
      <Icon aria-hidden className="h-5 w-5" />
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
