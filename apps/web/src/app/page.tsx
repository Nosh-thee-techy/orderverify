/**
 * apps/web/src/app/page.tsx
 * Public landing page. Later tasks fill the sections under this navigation.
 */
import { AboutSection, BenefitsStrip, HeroCarousel, MarketingPage, Navbar } from "@/components/marketing";

/**
 * Public homepage: sticky marketing nav, photographic hero, benefits strip,
 * and About. Remaining section bodies are empty until later tasks.
 */
export default function LandingPage() {
  return (
    <MarketingPage>
      <Navbar />
      <main>
        <HeroCarousel />
        <BenefitsStrip />
        <AboutSection />
        <section id="how-it-works" className="scroll-mt-24 min-h-[70vh]" aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading" className="sr-only">
            How OrderVerify Works
          </h2>
        </section>
        <section id="why-orderverify" className="scroll-mt-24 min-h-[70vh]" aria-labelledby="why-orderverify-heading">
          <h2 id="why-orderverify-heading" className="sr-only">
            Why Choose OrderVerify
          </h2>
        </section>
      </main>
    </MarketingPage>
  );
}
