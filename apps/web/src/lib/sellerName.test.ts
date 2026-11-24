/**
 * apps/web/src/lib/sellerName.test.ts
 * The Today banner and header must keep showing a name when Clerk omits fullName
 * on a later request. Empty Clerk payloads must not look like a real name.
 */
import { describe, expect, it } from "vitest";
import { clerkDisplayName } from "./sellerName";

describe("clerkDisplayName", () => {
  it("prefers the full name", () => {
    expect(clerkDisplayName({ fullName: "Jane Wanjiku", firstName: "Jane", lastName: "Wanjiku" })).toBe("Jane Wanjiku");
  });

  it("joins first and last when fullName is missing", () => {
    expect(clerkDisplayName({ fullName: null, firstName: "Jane", lastName: "Wanjiku" })).toBe("Jane Wanjiku");
  });

  it("falls back to the email prefix", () => {
    expect(
      clerkDisplayName({
        fullName: "  ",
        firstName: null,
        lastName: null,
        primaryEmailAddress: { emailAddress: "jane@shop.ke" },
      }),
    ).toBe("jane");
  });

  it("reads emailAddresses when primaryEmailAddress is absent (server currentUser shape)", () => {
    expect(clerkDisplayName({ emailAddresses: [{ emailAddress: "akinyi@shop.ke" }] })).toBe("akinyi");
  });

  it("returns empty when Clerk sent nothing, so upsert can keep the stored name", () => {
    expect(clerkDisplayName(null)).toBe("");
    expect(clerkDisplayName(undefined)).toBe("");
    expect(clerkDisplayName({})).toBe("");
  });
});
