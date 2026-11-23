/**
 * apps/web/src/app/page.tsx
 * Public landing page. Later tasks fill the sections under this navigation.
 */
import {
  AboutSection,
  BenefitsStrip,
  HeroCarousel,
  HowItWorks,
  MarketingPage,
  Navbar,
  ReportPreview,
  WhyChoose,
} from "@/components/marketing";

/**
 * Public homepage through Why Choose. Remaining section bodies are empty until later tasks.
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
      </main>
    </MarketingPage>
  );
}
