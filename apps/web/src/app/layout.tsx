/**
 * apps/web/src/app/layout.tsx
 * Root frame: fonts, language, and the shell. Bypass state is loaded on the client.
 *
 * DM Sans stays the product UI face. Fraunces is a display face used only by
 * landing-page headings so the marketing site feels warmer than the dashboard.
 */
import type { Metadata } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "OrderVerify",
  description: "Hold a risky M-Pesa order before you dispatch it.",
};

/** The document shell. Pages render inside Providers. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} ${mono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
