/**
 * apps/web/src/app/page.tsx
 * Public landing page: navigation through branded footer.
 */
import { preload } from "react-dom";
import {
  AboutSection,
  BenefitsStrip,
  FaqEvalSection,
  FinalCta,
  Footer,
  HeroCarousel,
  HowItWorks,
  MarketingPage,
  Navbar,
  ReportPreview,
  SkipLink,
  WhyChoose,
} from "@/components/marketing";

/**
 * Public landing page: nav through CTA, then the branded footer.
 */
export default function LandingPage() {
 
  return (
    <MarketingPage>
      <SkipLink />
      <Navbar />
      <main id="content" tabIndex={-1}>
        <HeroCarousel />
        <BenefitsStrip />
        <AboutSection />
        <HowItWorks />
        <ReportPreview />
        <WhyChoose />
        <FinalCta />
        <FaqEvalSection />
      </main>
      <Footer />
    </MarketingPage>
  );
}
