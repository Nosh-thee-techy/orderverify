/**
 * apps/web/src/app/page.tsx
 * Public landing page. Later tasks fill the sections under this navigation.
 */
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
      <Footer />
    </MarketingPage>
  );
}
