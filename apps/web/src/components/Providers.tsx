/**
 * apps/web/src/components/Providers.tsx
 * Client providers. The red bypass banner appears only after the server confirms bypass mode.
 */
"use client";

import { useEffect, useState } from "react";
import { I18nProvider } from "@/i18n";
import { AppShell } from "./Shell";

/**
 * Wrap the app in language and the shell.
 * @param props.children - The active page
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [bypass, setBypass] = useState(false);
  useEffect(() => {
    void fetch("/api/seller")
      .then((response) => response.json())
      .then((body: { bypass?: boolean }) => setBypass(Boolean(body.bypass)))
      .catch(() => setBypass(false));
  }, []);
  return (
    <I18nProvider>
      <AppShell bypass={bypass}>{children}</AppShell>
    </I18nProvider>
  );
}
