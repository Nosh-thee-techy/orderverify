/**
 * apps/web/src/i18n/index.tsx
 * Language provider. The choice is kept in localStorage and sent to the seller row.
 */
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { en, type Dictionary } from "./en";
import { sw } from "./sw";

type Lang = "en" | "sw";

const I18nContext = createContext<{ lang: Lang; t: Dictionary; setLang: (lang: Lang) => void }>({
  lang: "en",
  t: en,
  setLang: () => undefined,
});

/**
 * Provide English or Kiswahili to the tree.
 * @param props.children - The app
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem("ov_lang");
    if (saved === "sw" || saved === "en") setLangState(saved);
  }, []);
  const value = useMemo(
    () => ({
      lang,
      t: lang === "sw" ? sw : en,
      setLang: (next: Lang) => {
        setLangState(next);
        window.localStorage.setItem("ov_lang", next);
        void fetch("/api/seller", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ language: next }),
        });
      },
    }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Read the current dictionary.
 * @returns The language, the strings, and a setter
 */
export function useI18n() {
  return useContext(I18nContext);
}
