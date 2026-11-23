/**
 * apps/web/src/components/marketing/SkipLink.tsx
 * Keyboard skip control for the public landing page. Copy follows the selected language.
 */
"use client";

import { useI18n } from "@/i18n";

/** Skip to the main landing content. */
export function SkipLink() {
  const { t } = useI18n();
  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-brand-control focus:bg-brand-ink focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
    >
      {t.landing.skip}
    </a>
  );
}
