/**
 * apps/web/src/components/Providers.tsx
 * Client providers. The red bypass banner appears only after the server confirms bypass mode.
 * Public marketing routes skip the dashboard shell so the landing page has its own chrome.
 */
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { I18nProvider } from "@/i18n";
import { AppShell } from "./Shell";

/**
 * True for the public landing page and the design-system gallery.
 * @param path - Current pathname
 * @returns Whether the dashboard AppShell should stay off
 */
function isMarketingPath(path: string): boolean {
  return path === "/" || path.startsWith("/dev/brand");
}

/**
 * Wrap the app in language and, on product routes, the dashboard shell.
 * @param props.children - The active page
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const marketing = isMarketingPath(path);
  const [bypass, setBypass] = useState(false);
  useEffect(() => {
    if (marketing) return;
    void fetch("/api/seller")
      .then((response) => response.json())
      .then((body: { bypass?: boolean }) => setBypass(Boolean(body.bypass)))
      .catch(() => setBypass(false));
  }, [marketing]);
  return (
    <I18nProvider>
      {marketing ? children : <AppShell bypass={bypass}>{children}</AppShell>}
    </I18nProvider>
  );
}
