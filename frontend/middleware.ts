import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/roles";

// Only attach Clerk's middleware when configured; otherwise pass through so
// the app runs without any Clerk setup (open demo mode).
const enabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Strictly protected surfaces.
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isErRoute = createRouteMatcher(["/er-dashboard(.*)"]);
// Standard signed-in user surface — privileged roles get routed to their console.
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

/** Redirect to our custom sign-in page, preserving where the user was going. */
function toSignIn(req: Request) {
  const url = new URL("/signin", req.url);
  url.searchParams.set("redirect_url", req.url);
  return NextResponse.redirect(url);
}

const handler = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // 1) Strictly protect /admin and /er-dashboard behind the sign-in wall.
  if (isAdminRoute(req) || isErRoute(req)) {
    if (!userId) return toSignIn(req);

    const role = await getUserRole(userId);
    // /admin -> admins only.
    if (isAdminRoute(req) && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // /er-dashboard -> ER responders (admins allowed too).
    if (isErRoute(req) && role !== "er" && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 2) Role-based redirect: send privileged users from the standard user
  //    dashboard to their dedicated console.
  if (isDashboardRoute(req) && userId) {
    const role = await getUserRole(userId);
    if (role === "admin") return NextResponse.redirect(new URL("/admin", req.url));
    if (role === "er") return NextResponse.redirect(new URL("/er-dashboard", req.url));
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
