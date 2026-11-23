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
      <h1 className="text-3xl font-semibold tracking-tight">{t.settingsTitle}</h1>
      <fieldset className="rounded-card border border-line bg-surface p-5 shadow-sm">
        <legend className="font-medium">{t.language}</legend>
        <div className="mt-3 flex gap-2">
          <button type="button" className={`min-h-12 flex-1 rounded-control ${lang === "en" ? "bg-primary text-white" : "border border-line"}`} onClick={() => setLang("en")}>{t.english}</button>
          <button type="button" className={`min-h-12 flex-1 rounded-control ${lang === "sw" ? "bg-primary text-white" : "border border-line"}`} onClick={() => setLang("sw")}>{t.kiswahili}</button>
        </div>
      </fieldset>
      <p className="text-sm text-muted">{t.retention}</p>
      <LimitsPanel />
      <Link href="/evals" className="block rounded-card border border-line bg-surface p-5 font-medium shadow-sm transition-shadow hover:shadow-card">{t.evalsTitle}</Link>
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
            <button type="button" className="min-h-12 flex-1 rounded-control border border-line bg-surface text-ink" onClick={() => setConfirm(false)}>{t.cancel}</button>
          </div>
        </div>
      )}
      {done ? <p className="text-sm">{t.deleteData}</p> : null}
    </div>
  );
}
