/**
 * apps/web/src/i18n/landing-en.ts
 * English copy for the public landing page. Kiswahili lives in landing-sw.ts.
 */
export const landingEn = {
  skip: "Skip to content",
  menu: "Menu",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  nav: {
    about: "About",
    howItWorks: "How It Works",
    why: "Why OrderVerify",
    faq: "FAQ",
    startVerifying: "Start Verifying",
  },
  hero: {
    seeHow: "See How It Works",
    prev: "Previous slide",
    next: "Next slide",
    play: "Play slideshow",
    pause: "Pause slideshow",
    slideOf: "Slide",
    of: "of",
    autoplaying: "Autoplaying.",
    showSlide: "Show slide",
    slides: {
      clothing: {
        headline: "Verify the payment. Then dispatch.",
        description: "Check M-Pesa payments against your orders before sending them out.",
        alt: "Clothing sellers with a rail of garments in their boutique.",
      },
      beauty: {
        headline: "Protect every order before it leaves.",
        description: "Spend less time matching payments manually and more time growing your business.",
        alt: "A beauty entrepreneur holding skincare products from her catalogue.",
      },
      social: {
        headline: "Your orders deserve a second check.",
        description: "Affordable payment verification for the way you sell online.",
        alt: "A social-commerce seller recording product content with a ring light.",
      },
    },
  },
  benefits: {
    heading: "Pay per batch benefits",
    items: [
      { title: "Pay per batch.", description: "No expensive monthly subscription." },
      { title: "Built around M-Pesa workflows.", description: "Designed for the way online sellers receive payments." },
      { title: "Review before dispatch.", description: "Make better dispatch decisions." },
    ],
  },
  about: {
    eyebrow: "About OrderVerify",
    title: "A smarter way to verify M-Pesa payments.",
    description:
      "OrderVerify makes it easier for online sellers to check whether customer payments match their orders before dispatch.",
    points: [
      "Stop forged payment confirmations.",
      "Avoid costly mistakes.",
      "Grow your business with confidence.",
    ],
    collageLabel: "Sellers in clothing, beauty, and social-commerce businesses",
    alts: {
      clothing: "A clothing boutique with colourful dresses on display.",
      beauty: "Amber skincare bottles and spa products on a wooden tray.",
      orders: "A seller checking an order on her phone while working on a laptop.",
    },
  },
  how: {
    eyebrow: "How it works",
    title: "How OrderVerify Works",
    description: "Four simple steps to verify your payments before dispatch.",
    steps: [
      {
        title: "Upload Orders and Payment Evidence",
        description: "Upload your order information and available M-Pesa payment evidence.",
      },
      {
        title: "Pay Per Batch",
        description: "Pay 0.01 USDC per verification batch through Stellar x402.",
      },
      {
        title: "Verify Payment Details",
        description: "Available payment details are checked against the submitted orders.",
      },
      {
        title: "Review the Report",
        description: "See which orders are released, require review or should be held.",
      },
    ],
  },
  reportPreview: {
    eyebrow: "Order Reports",
    title: "Know exactly which orders to release, review or hold.",
    description:
      "Get a clear report showing which orders are verified, which need a closer look, and which to hold — so you can avoid scams and protect your stock and money.",
    hint: "A suspicious message alone may not always be conclusive. Stronger confirmation requires a statement or trusted payment source.",
    windowTitle: "Batch Verification Report",
    sample: "Sample · 3 orders",
    order: "Order",
    payment: "Payment",
    status: "Status",
    reason: "Reason",
    release: "Release",
    review: "Review",
    hold: "Hold",
    caption: "Sample orders with payment, status, and reason",
    rows: [
      { reason: "Payment match" },
      { reason: "Unusual sender" },
      { reason: "Possible duplicate" },
    ],
  },
  why: {
    title: "Why Choose OrderVerify",
    cards: [
      {
        title: "Affordable Verification.",
        description: "Pay per batch instead of maintaining expensive monthly subscriptions.",
      },
      {
        title: "Less Manual Work.",
        description: "Reduce the time spent matching orders with payment messages.",
      },
      {
        title: "Detect Suspicious Payments.",
        description: "Identify duplicate codes, amount mismatches and inconsistent payment details.",
      },
      {
        title: "Better Dispatch Decisions.",
        description: "Review suspicious orders before releasing goods.",
      },
      {
        title: "You Stay in Control.",
        description: "You decide what happens to orders that require further review.",
      },
    ],
  },
  cta: {
    title: "Protect your next batch before it leaves your hands.",
    body: "Give every order a second check. Verify payments, review suspicious orders and dispatch with greater confidence.",
  },
  footer: {
    blurb: "Simple. Affordable. Reliable. Verify payments. Grow your business.",
    quick: "Quick Links",
    start: "Get Started",
    copyright: "© 2026 OrderVerify. All rights reserved.",
  },
  faqEval: {
    eyebrow: "FAQ & evaluation",
  },
};
