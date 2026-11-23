/**
 * apps/web/src/app/settings/page.tsx
 * Language, deletion, retention, and the way to the eval page.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { LimitsPanel } from "@/components/bits";
import { useI18n } from "@/i18n";

/** Settings. Deleting data removes the seller row and the session cookie. */
export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-ink">{t.settingsTitle}</h1>
      <fieldset className="rounded-brand-card border border-[#F0E2C8] bg-white p-5 shadow-brand-sm">
        <legend className="font-medium">{t.language}</legend>
        <div className="mt-3 flex gap-2">
          <button type="button" className={`min-h-12 flex-1 rounded-brand-control ${lang === "en" ? "bg-brand-orange text-white" : "border border-[#F0E2C8]"}`} onClick={() => setLang("en")}>{t.english}</button>
          <button type="button" className={`min-h-12 flex-1 rounded-brand-control ${lang === "sw" ? "bg-brand-orange text-white" : "border border-[#F0E2C8]"}`} onClick={() => setLang("sw")}>{t.kiswahili}</button>
        </div>
      </fieldset>
      <p className="text-sm text-brand-muted">{t.retention}</p>
      <LimitsPanel />
      <Link href="/evals" className="block rounded-brand-card border border-[#F0E2C8] bg-white p-5 font-medium shadow-brand-sm transition-shadow hover:shadow-brand">{t.evalsTitle}</Link>
      {!confirm ? (
        <button type="button" className="min-h-12 w-full rounded-control bg-hold text-white" onClick={() => setConfirm(true)}>{t.deleteData}</button>
      ) : (
        <div className="rounded-card border border-hold/20 bg-hold-bg p-5 text-hold" role="alert">
          <p>{t.deleteConfirm}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="min-h-12 flex-1 rounded-control bg-hold text-white"
              onClick={async () => {
                await fetch("/api/seller/data", { method: "DELETE" });
                setDone(true);
                setConfirm(false);
              }}
            >
              {t.deleteData}
            </button>
            <button type="button" className="min-h-12 flex-1 rounded-brand-control border border-[#F0E2C8] bg-white text-brand-ink" onClick={() => setConfirm(false)}>{t.cancel}</button>
          </div>
        </div>
      )}
      {done ? <p className="text-sm">{t.deleteData}</p> : null}
    </div>
  );
}
