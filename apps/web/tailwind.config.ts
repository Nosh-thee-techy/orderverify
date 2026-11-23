/**
 * apps/web/tailwind.config.ts
 * Design tokens from the product spec.
 *
 * Dashboard tokens (paper, primary green, hold/review/release) stay as they are so
 * the authenticated product keeps its working identity.
 *
 * Brand tokens (`brand.*`) are the public landing-page palette. Landing components
 * must use these names so the two surfaces can coexist without leaking colours.
 */
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F4",
        surface: "#FFFFFF",
        ink: "#1B1F2A",
        muted: "#5B6475",
        line: "#E6E2DA",
        primary: "#0F6B4F",
        hold: "#B42318",
        "hold-bg": "#FEF3F2",
        review: "#B45309",
        "review-bg": "#FFFAEB",
        release: "#067647",
        "release-bg": "#ECFDF3",
        info: "#3538CD",
        "info-bg": "#EEF4FF",
        brand: {
          yellow: "#FFD416",
          tangerine: "#E4701D",
          raspberry: "#E72369",
          bg: "#FFFBF0",
          surface: "#FFFFFF",
          ink: "#2A1020",
          muted: "#7A6670",
          orange: "#C85A0C",
          "orange-deep": "#9E4709",
          release: "#0E9F5B",
          "release-bg": "#E3F8EC",
          review: "#2457D6",
          "review-bg": "#E3EBFF",
          hold: "#B3122B",
          "hold-bg": "#FBE0E4",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["3.25rem", { lineHeight: "1.08", letterSpacing: "-0.03em" }],
        "display-lg": ["2.5rem", { lineHeight: "1.12", letterSpacing: "-0.025em" }],
        "display-md": ["2rem", { lineHeight: "1.18", letterSpacing: "-0.02em" }],
      },
      spacing: {
        "section-sm": "3.5rem",
        "section": "5.5rem",
        "section-lg": "7rem",
      },
      maxWidth: {
        "marketing": "72rem",
        "marketing-wide": "80rem",
        "marketing-narrow": "40rem",
      },
      borderRadius: {
        card: "14px",
        control: "10px",
        "brand-card": "1.25rem",
        "brand-control": "0.875rem",
        "brand-pill": "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(27, 31, 42, 0.04), 0 8px 24px rgba(27, 31, 42, 0.04)",
        "brand-sm": "0 1px 2px rgba(42, 16, 32, 0.05)",
        "brand": "0 10px 30px rgba(42, 16, 32, 0.08)",
        "brand-lg": "0 24px 48px rgba(42, 16, 32, 0.12)",
        "brand-orange": "0 6px 16px rgba(200, 90, 12, 0.18)",
      },
      backgroundImage: {
        "brand-sunset": "linear-gradient(135deg, #FFD416, #E4701D 50%, #E72369)",
      },
      transitionTimingFunction: {
        "brand": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
