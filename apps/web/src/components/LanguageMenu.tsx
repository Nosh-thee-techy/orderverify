/**
 * apps/web/src/components/LanguageMenu.tsx
 * Shared EN/SW control. Writes the same localStorage key and seller PUT as the
 * previous toggle — only the presentation changes.
 */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";

/**
 * Professional "Language" dropdown used on the landing navbar and dashboard sidebar.
 *
 * @param props.variant - Compact navbar chip, or full-width sidebar control
 */
export function LanguageMenu({ variant = "nav" }: { variant?: "nav" | "sidebar" }) {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = lang === "sw" ? t.kiswahili : t.english;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", variant === "sidebar" && "px-3 pb-2")}>
      <button
        type="button"
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-brand-control text-sm font-medium text-brand-ink transition-colors duration-150",
          variant === "nav" && "border border-[#F0E2C8] bg-white px-3 hover:border-brand-orange/40",
          variant === "sidebar" && "w-full justify-between border border-[#F0E2C8] bg-brand-bg px-3 hover:bg-[#FFF6E0]",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="inline-flex items-center gap-2">
          <Globe className="h-4 w-4 shrink-0 text-brand-orange" aria-hidden />
          <span className="text-brand-muted">{t.language}</span>
          <span className="text-brand-ink">{current}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-brand-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <ul
          id={menuId}
          role="listbox"
          aria-label={t.language}
          className={cn(
            "absolute z-50 overflow-hidden rounded-brand-control border border-[#F0E2C8] bg-white py-1 shadow-brand",
            variant === "nav" ? "right-0 mt-1 min-w-[12rem]" : "inset-x-3 bottom-full mb-1",
          )}
        >
          <LangOption
            active={lang === "en"}
            label={t.english}
            onSelect={() => {
              setLang("en");
              setOpen(false);
            }}
          />
          <LangOption
            active={lang === "sw"}
            label={t.kiswahili}
            onSelect={() => {
              setLang("sw");
              setOpen(false);
            }}
          />
        </ul>
      ) : null}
    </div>
  );
}

function LangOption({
  active,
  label,
  onSelect,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <li role="option" aria-selected={active}>
      <button
        type="button"
        className={cn(
          "flex min-h-11 w-full items-center justify-between px-3 text-sm",
          active ? "bg-[#FFF6E0] font-medium text-brand-ink" : "text-brand-ink hover:bg-brand-bg",
        )}
        onClick={onSelect}
      >
        {label}
        {active ? <Check className="h-4 w-4 text-brand-orange" aria-hidden /> : null}
      </button>
    </li>
  );
}
