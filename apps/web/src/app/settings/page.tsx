/**
 * apps/web/src/app/settings/page.tsx
 * Language, Clerk profile photo, login password, retention, and data deletion.
 * Deleting data removes this seller's history. The Clerk account stays.
 */
"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useI18n } from "@/i18n";

/** Settings. Profile photo and password go through Clerk so the session stays the source of truth. */
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
          <button type="button" className={`min-h-12 flex-1 rounded-brand-control ${lang === "en" ? "bg-brand-orange text-white" : "border border-[#F0E2C8]"}`} onClick={() => setLang("en")}>
            {t.english}
          </button>
          <button type="button" className={`min-h-12 flex-1 rounded-brand-control ${lang === "sw" ? "bg-brand-orange text-white" : "border border-[#F0E2C8]"}`} onClick={() => setLang("sw")}>
            {t.kiswahili}
          </button>
        </div>
      </fieldset>
      <ProfilePhotoCard />
      <PasswordCard />
      <p className="text-sm text-brand-muted">{t.retention}</p>
      {!confirm ? (
        <button type="button" className="min-h-12 w-full rounded-control bg-hold text-white" onClick={() => setConfirm(true)}>
          {t.deleteData}
        </button>
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
            <button type="button" className="min-h-12 flex-1 rounded-brand-control border border-[#F0E2C8] bg-white text-brand-ink" onClick={() => setConfirm(false)}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}
      {done ? <p className="text-sm">{t.deleteData}</p> : null}
    </div>
  );
}

/**
 * Upload a profile photo into Clerk. That same image is the header avatar.
 */
function ProfilePhotoCard() {
  const { t } = useI18n();
  const { user, isLoaded } = useUser();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file || !user) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await user.setProfileImage({ file });
      await user.reload();
      setMessage(t.photoUpdated);
    } catch {
      setError(t.photoFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-brand-card border border-[#F0E2C8] bg-white p-5 shadow-brand-sm">
      <h2 className="font-medium text-brand-ink">{t.profilePhoto}</h2>
      <p className="mt-1 text-sm text-brand-muted">{t.photoHint}</p>
      <div className="mt-4 flex items-center gap-4">
        {isLoaded && user?.imageUrl ? (
          <img src={user.imageUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="h-16 w-16 rounded-full bg-[#FFF4C2]" aria-hidden />
        )}
        <label className="inline-flex min-h-12 cursor-pointer items-center rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-4 text-sm font-medium text-brand-ink">
          {busy ? "…" : t.changePhoto}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy || !user}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void onFile(file);
            }}
          />
        </label>
      </div>
      {message ? <p className="mt-3 text-sm text-brand-ink">{message}</p> : null}
      {error ? (
        <p className="mt-3 text-sm text-brand-hold" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Update the Clerk password used to sign in. Does not sign the seller out of this browser.
 */
function PasswordCard() {
  const { t } = useI18n();
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save() {
    if (!user) return;
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      await user.updatePassword({
        newPassword,
        ...(currentPassword ? { currentPassword } : {}),
        signOutOfOtherSessions: false,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(t.passwordUpdated);
    } catch {
      setError(t.passwordFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="rounded-brand-card border border-[#F0E2C8] bg-white p-5 shadow-brand-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h2 className="font-medium text-brand-ink">{t.passwordTitle}</h2>
      <p className="mt-1 text-sm text-brand-muted">{t.passwordHint}</p>
      <label className="mt-4 block text-sm">
        {t.currentPassword}
        <input
          type="password"
          autoComplete="current-password"
          className="mt-1 w-full min-h-12 rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-3"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm">
        {t.newPassword}
        <input
          type="password"
          autoComplete="new-password"
          className="mt-1 w-full min-h-12 rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-3"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
      </label>
      <label className="mt-3 block text-sm">
        {t.confirmPassword}
        <input
          type="password"
          autoComplete="new-password"
          className="mt-1 w-full min-h-12 rounded-brand-control border border-[#F0E2C8] bg-brand-bg px-3"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </label>
      <button
        type="submit"
        disabled={busy || !user}
        className="mt-4 min-h-12 w-full rounded-brand-control bg-brand-orange font-semibold text-white disabled:opacity-50"
      >
        {busy ? "…" : t.savePassword}
      </button>
      {message ? <p className="mt-3 text-sm text-brand-ink">{message}</p> : null}
      {error ? (
        <p className="mt-3 text-sm text-brand-hold" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
