import { NextResponse } from "next/server";

/** Same-origin proxy to the backend health endpoint (used by the admin UI). */
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/health`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { status: "error", detail: "Backend unreachable" },
      { status: 502 },
    );
  }
}
