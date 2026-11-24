/**
 * apps/web/src/components/marketing/StartVerifyingButton.tsx
 * Landing CTA. Always renders a button: sign-up when signed out, dashboard when signed in.
 * Uses useAuth so the control stays visible while Clerk hydrates (Show hid the signed-in state).
 */
"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { Button } from "./Button";

/**
 * Primary landing action. Auth happens here, not on the public homepage itself.
 *
 * @param props.variant - Button style for the surrounding section
 * @param props.className - Optional layout classes
 */
export function StartVerifyingButton({
  variant = "primary",
  className,
}: {
  variant?: "primary" | "dark";
  className?: string;
}) {
  const { t } = useI18n();
  const { isSignedIn } = useAuth();
  const href = isSignedIn ? "/dashboard" : "/sign-up";
  const label = isSignedIn ? t.goToDashboard : t.landing.nav.startVerifying;
  return (
    <Button href={href} variant={variant} size="lg" className={className}>
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Button>
  );
}
