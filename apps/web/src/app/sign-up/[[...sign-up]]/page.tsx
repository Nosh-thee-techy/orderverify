/**
 * apps/web/src/app/sign-up/[[...sign-up]]/page.tsx
 * Clerk sign-up. Left brand panel; the form is the only thing on the right.
 */
import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { clerkAppearance } from "@/lib/clerkAppearance";

/** Sign-up catch-all. Wrapped in Suspense so auth UI can read the request. */
export default function SignUpPage() {
  return (
    <AuthSplitLayout>
      <Suspense>
        <SignUp
          appearance={clerkAppearance}
          fallbackRedirectUrl="/dashboard"
          forceRedirectUrl="/dashboard"
        />
      </Suspense>
    </AuthSplitLayout>
  );
}
