/**
 * apps/web/src/components/auth/AuthSplitLayout.tsx
 * Full-height sign-in / sign-up frame: brand panel on the left, Clerk form only on the right.
 * Below md the left panel is hidden so the form sits on cream paper.
 */
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Truck } from "lucide-react";

const TRUST = [
  { icon: ShieldCheck, label: "Payment verification" },
  { icon: CheckCircle2, label: "Clear order insights" },
  { icon: Truck, label: "Confident fulfilment" },
] as const;

/**
 * Two-column auth chrome. The Clerk form is passed as children and is the only
 * content on the right-hand side.
 *
 * @param props.children - Clerk <SignIn /> or <SignUp />
 */
export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-12 bg-brand-bg">
      <aside className="relative col-span-6 hidden min-h-screen overflow-hidden md:block">
        {/* TODO: swap /images/auth-hero.jpg with the final brand photograph. */}
        <Image
          src="/images/auth-hero.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2A1020]/85 via-[#2A1020]/40 to-[#2A1020]/25" />
        <div
          className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-[#FFD416]/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-32 left-10 h-40 w-40 rounded-full bg-[#E72369]/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex h-full flex-col px-10 py-10 lg:px-14">
          <span
            className="mt-8 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10 text-[#FFD416]"
            aria-hidden
          >
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="mt-auto pb-6">
            <h1 className="max-w-md font-display text-4xl font-semibold leading-tight tracking-tight text-white lg:text-5xl">
              Every order deserves to be verified.
            </h1>
           
            <ul className="mt-6 flex flex-col gap-3">
              {TRUST.map((item) => (
                <li key={item.label} className="flex items-center gap-3 text-sm font-medium text-white/90">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[#FFD416]" aria-hidden>
                    <item.icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>

          </div>
        </div>
      </aside>
      <div className="col-span-12 flex min-h-screen items-center justify-center px-6 py-12 md:col-span-6">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-brand-control border border-[#F0E2C8] bg-white px-4 text-sm font-medium text-brand-ink transition-colors hover:border-brand-orange hover:text-brand-orange"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
