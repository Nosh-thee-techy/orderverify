/**
 * apps/web/src/middleware.ts
 * Clerk gate. Marketing and health stay public; the product and its APIs require a session.
 * authorizedParties keeps a refresh on localhost / 127.0.0.1 from dropping the JWT.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/api/health"]);

// Fly, Vercel, and local. NEXT_PUBLIC_APP_URL is the canonical public origin in production.
const authorizedParties = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://ov-ke-web.fly.dev",
  ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")] : []),
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
];

/**
 * Protect every non-public route. Unauthenticated document requests go to /sign-in.
 * A valid Clerk cookie is enough to stay signed in across reloads.
 */
export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublic(request)) {
      await auth.protect();
    }
  },
  { authorizedParties },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
