/**
 * apps/web/src/app/page.tsx
 * Public landing page. Later tasks fill the sections under this navigation.
 */
import {
  AboutSection,
  BenefitsStrip,
  FinalCta,
  HeroCarousel,
  HowItWorks,
  MarketingPage,
  Navbar,
  ReportPreview,
  WhyChoose,
} from "@/components/marketing";

/**
 * Public homepage through the closing CTA. Footer arrives in a later task.
 */
export default function LandingPage() {
  return (
    <MarketingPage>
      <Navbar />
      <main>
        <HeroCarousel />
        <BenefitsStrip />
        <AboutSection />
        <HowItWorks />
        <ReportPreview />
        <WhyChoose />
        <FinalCta />
      </main>
    </MarketingPage>
  );
}
