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
} from "@/components/marketing";

/**
 * Public homepage: sticky marketing nav through How it works and the report
 * preview. Remaining section bodies are empty until later tasks.
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
        <section id="why-orderverify" className="scroll-mt-24 min-h-[70vh]" aria-labelledby="why-orderverify-heading">
          <h2 id="why-orderverify-heading" className="sr-only">
            Why Choose OrderVerify
          </h2>
        </section>
      </main>
    </MarketingPage>
  );
}
