import { NextResponse } from "next/server";

/**
 * Server-side proxy for admin ER-team management. The ADMIN_API_KEY stays on
 * the server and is never exposed to the browser. (The /admin layout already
 * enforces that only System Admins reach the pages calling this.)
 */
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "clearaid_admin_dev_key";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/er-teams`, {
      headers: { "X-Admin-Key": ADMIN_KEY },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const res = await fetch(`${BACKEND}/api/er-teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}
