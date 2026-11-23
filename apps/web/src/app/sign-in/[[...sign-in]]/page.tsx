/**
 * apps/web/src/app/sign-in/[[...sign-in]]/page.tsx
 * Clerk sign-in. Left brand panel; the form is the only thing on the right.
 */
import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { clerkAppearance } from "@/lib/clerkAppearance";

/** Sign-in catch-all. Wrapped in Suspense so auth UI can read the request. */
export default function SignInPage() {
  return (
    <AuthSplitLayout>
      <Suspense>
        <SignIn
          appearance={clerkAppearance}
          fallbackRedirectUrl="/dashboard"
          forceRedirectUrl="/dashboard"
        />
      </Suspense>
    </AuthSplitLayout>
  );
}
