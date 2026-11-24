/**
 * apps/web/src/components/marketing/StartVerifyingButton.tsx
 * Landing CTA: signed-out visitors go to sign-up (which also links to sign-in).
 * Signed-in sellers go straight to the check wizard.
 */
"use client";

import { Show } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
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
  const label = (
    <>
      {t.landing.nav.startVerifying}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </>
  );
  return (
    <Suspense
      fallback={
        <Button href="/sign-up" variant={variant} size="lg" className={className}>
          {label}
        </Button>
      }
    >
      <Show when="signed-out">
        <Button href="/sign-up" variant={variant} size="lg" className={className}>
          {label}
        </Button>
      </Show>
      <Show when="signed-in">
        <Button href="/check" variant={variant} size="lg" className={className}>
          {label}
        </Button>
      </Show>
    </Suspense>
  );
}
