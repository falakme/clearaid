import { NextResponse } from "next/server";

/**
 * ER-team alert creation proxy. Injects the admin key (the ER dashboard is
 * already Clerk-gated to ER members/admins) and triggers with force=false so
 * the backend's one-active-alert-per-city grouping rule is ENFORCED: if an
 * active alert already exists for the city, the backend returns 409 and the
 * ER team must update the existing alert instead.
 */
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "clearaid_admin_dev_key";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const res = await fetch(`${BACKEND}/api/alerts?force=false`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}
