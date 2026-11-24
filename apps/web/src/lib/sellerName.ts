/**
 * apps/web/src/lib/sellerName.ts
 * The name shown in the Today greeting and beside the profile photo.
 * Prefers Clerk's full name so a missing API payload cannot blank the banner.
 */

type NameSource = {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: { emailAddress?: string | null }[];
};

/**
 * Build the seller's display name from Clerk fields.
 *
 * @param user - Clerk user, or a similar shape from the server
 * @returns Full name, first+last, email prefix, or empty string
 */
export function clerkDisplayName(user: NameSource | null | undefined): string {
  const full = user?.fullName?.trim();
  if (full) return full;
  const assembled = [user?.firstName, user?.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
  if (assembled) return assembled;
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "";
  return email.split("@")[0]?.trim() ?? "";
}
