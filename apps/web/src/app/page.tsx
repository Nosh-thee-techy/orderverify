/**
 * apps/web/src/app/page.tsx
 * Public landing page: navigation through branded footer.
 */
import { preload } from "react-dom";
import {
  AboutSection,
  BenefitsStrip,
  FinalCta,
  Footer,
  HeroCarousel,
  HowItWorks,
  MarketingPage,
  Navbar,
  ReportPreview,
  WhyChoose,
} from "@/components/marketing";

/**
 * Public landing page: nav through CTA, then the branded footer.
 */
export default function LandingPage() {
  preload("/images/hero/clothing.webp", { as: "image" });

  return (
    <MarketingPage>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-brand-control focus:bg-brand-ink focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="content" tabIndex={-1}>
        <HeroCarousel />
        <BenefitsStrip />
        <AboutSection />
        <HowItWorks />
        <ReportPreview />
        <WhyChoose />
        <FinalCta />
      </main>
      <Footer />
    </MarketingPage>
  );
}
