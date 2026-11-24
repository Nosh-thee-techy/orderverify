/**
 * apps/web/src/app/layout.tsx
 * Root frame: fonts, language, and the shell. Bypass state is loaded on the client.
 *
 * Poppins is the product UI face. Fraunces stays the display face for headings.
 */
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Fraunces, JetBrains_Mono, Poppins } from "next/font/google";
import { Providers } from "@/components/Providers";
import { clerkAppearance } from "@/lib/clerkAppearance";
import "./globals.css";

const sans = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "OrderVerify",
  description: "Verify M-Pesa payments against your orders before you dispatch.",
};

/** The document shell. Pages render inside Providers. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} ${mono.variable} font-sans antialiased`}>
        <ClerkProvider appearance={clerkAppearance} dynamic afterSignOutUrl="/">
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
