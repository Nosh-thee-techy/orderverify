/**
 * apps/web/src/app/today/page.tsx
 * Older dashboard URL. The seller home now lives at /dashboard.
 */
import { redirect } from "next/navigation";

/** Send bookmarks and old nav links to /dashboard. */
export default function TodayRedirect() {
  redirect("/dashboard");
}
