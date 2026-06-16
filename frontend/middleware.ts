import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/roles";

// Only attach Clerk's middleware when configured; otherwise pass through so
// the app runs without any Clerk setup (open demo mode).
const enabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Strictly protected surfaces.
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isErRoute = createRouteMatcher(["/er-dashboard(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

/** Redirect to our custom sign-in page, preserving where the user was going. */
function toSignIn(req: Request) {
  const url = new URL("/signin", req.url);
  url.searchParams.set("redirect_url", req.url);
  return NextResponse.redirect(url);
}

const handler = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // 1) Require a signed-in user for /admin and /er-dashboard.
  if (isAdminRoute(req) || isErRoute(req)) {
    if (!userId) return toSignIn(req);

    // /admin -> System Admins only (privateMetadata.admin). ER membership
    // (a DB concept) is enforced in the /er-dashboard server layout.
    if (isAdminRoute(req) && !(await isAdminUser(userId))) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 2) Admins landing on the standard dashboard are routed to the console.
  if (isDashboardRoute(req) && userId && (await isAdminUser(userId))) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export default enabled ? handler : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next internals and static files; run on everything else + API.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|ttf)).*)",
    "/(api|trpc)(.*)",
  ],
};
