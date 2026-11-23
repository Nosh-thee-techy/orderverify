/**
 * apps/web/src/lib/clerkAppearance.ts
 * Shared Clerk component styling using OrderVerify brand tokens.
 * Safe to import from client components: no secret keys.
 */

/** Tangerine primary, ink type, cream paper — matches the rest of the product. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#E4701D",
    colorText: "#2A1020",
    colorBackground: "#FFFBF0",
    colorNeutral: "#2A1020",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#2A1020",
    borderRadius: "0.875rem",
    fontFamily: "var(--font-sans)",
    fontFamilyButtons: "var(--font-sans)",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-transparent shadow-none",
    headerTitle: "font-display text-brand-ink",
    headerSubtitle: "text-brand-muted",
    formButtonPrimary: "bg-[#E4701D] hover:bg-[#C85A0C] shadow-none",
    footerActionLink: "text-[#E4701D]",
  },
};
