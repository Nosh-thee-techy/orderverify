/**
 * apps/web/tailwind.config.ts
 * Design tokens from the product spec. Warm paper, deep green, status colours that are never the only signal.
 */
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
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
      },
      fontFamily: {
        sans: ["var(--font-sans)", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "14px",
        control: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(27, 31, 42, 0.04), 0 8px 24px rgba(27, 31, 42, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
