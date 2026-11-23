/**
 * apps/web/src/app/dev/brand/page.tsx
 * Dev-only gallery of the public design system. Production returns 404.
 * This is not a landing-page section; it exists so tokens and primitives can be reviewed.
 */
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button, MarketingPage, Section, SectionHeading, StatusBadge } from "@/components/marketing";

/** Visual review of landing tokens and primitives. Not linked from the product. */
export default function BrandGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <MarketingPage>
      <Section width="wide">
        <SectionHeading
          eyebrow="OrderVerify design system"
          title="Public brand tokens"
          description="Landing-page colour, type, buttons, and spacing. Dashboard screens keep the existing green product theme."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {swatches.map((swatch) => (
            <figure key={swatch.name} className="overflow-hidden rounded-brand-card bg-brand-surface shadow-brand">
              <div className={swatch.className} style={swatch.style} />
              <figcaption className="px-4 py-3">
                <p className="font-medium text-brand-ink">{swatch.name}</p>
                <p className="mt-0.5 font-mono text-xs text-brand-muted">{swatch.hex}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-6 h-28 overflow-hidden rounded-brand-card shadow-brand">
          <div className="flex h-full items-end bg-brand-sunset p-4">
            <p className="rounded-brand-pill bg-brand-ink/75 px-3 py-1 text-sm font-medium text-white">
              Brand gradient · 135deg yellow → tangerine → raspberry
            </p>
          </div>
        </div>
      </Section>

      <Section tone="surface" width="wide">
        <SectionHeading
          eyebrow="Typography"
          title="A smarter way to verify M-Pesa payments."
          description="Fraunces for headlines. Poppins for interface copy. Kickers stay small, tracked, and tangerine."
        />
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-brand-card border border-[#F3E6D4] bg-brand-bg p-6 shadow-brand-sm">
            <p className="font-display text-display-xl font-semibold text-brand-ink">Verify the payment.</p>
            <p className="marketing-body mt-4">
              Body copy sits at a comfortable reading size with plum ink for titles and a warmer muted tone for supporting lines.
            </p>
          </div>
          <div className="rounded-brand-card border border-[#F3E6D4] bg-brand-bg p-6 shadow-brand-sm">
            <SectionHeading align="center" eyebrow="How it works" title="Four simple steps" description="Centre alignment for process and feature bands." />
          </div>
        </div>
      </Section>

      <Section width="wide">
        <SectionHeading eyebrow="Buttons" title="Four actions, one family." />
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button>
            Start Verifying <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="secondary">See How It Works</Button>
          <Button variant="dark">Protect this batch</Button>
          <Button variant="text">Read the report</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="lg">
            Start Verifying <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="secondary" size="lg">
            See How It Works
          </Button>
        </div>
      </Section>

      <Section tone="warm" width="wide">
        <SectionHeading
          eyebrow="Status"
          title="Release, review, and hold stay distinct from the brand palette."
          description="These chips are for marketing previews. The live dashboard still uses VerdictBadge."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <StatusBadge status="release" />
          <StatusBadge status="review" />
          <StatusBadge status="hold" />
        </div>
      </Section>

      <Section width="narrow">
        <div className="rounded-brand-card bg-brand-surface p-8 shadow-brand">
          <p className="marketing-kicker">Spacing</p>
          <p className="marketing-title mt-3">Section padding scales from 3.5rem to 7rem.</p>
          <p className="marketing-lead mt-4">
            Cards use 20px corners and a warm plum-tinted shadow. Controls use 14px corners so buttons feel related without becoming pills.
          </p>
        </div>
      </Section>
    </MarketingPage>
  );
}

const swatches = [
  { name: "Sunshine Yellow", hex: "#FFD416", className: "h-20", style: { background: "#FFD416" } },
  { name: "Tangerine", hex: "#E4701D", className: "h-20", style: { background: "#E4701D" } },
  { name: "Raspberry Pink", hex: "#E72369", className: "h-20", style: { background: "#E72369" } },
  { name: "Strong Orange", hex: "#C85A0C", className: "h-20", style: { background: "#C85A0C" } },
  { name: "Background", hex: "#FFFBF0", className: "h-20 border-b border-[#F3E6D4]", style: { background: "#FFFBF0" } },
  { name: "Primary text", hex: "#2A1020", className: "h-20", style: { background: "#2A1020" } },
  { name: "Secondary text", hex: "#7A6670", className: "h-20", style: { background: "#7A6670" } },
  { name: "Surface", hex: "#FFFFFF", className: "h-20 border-b border-[#F3E6D4]", style: { background: "#FFFFFF" } },
];
