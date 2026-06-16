import { NextResponse } from "next/server";

/** Proxy a browser push subscription to the backend (scoped to a city). */
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const res = await fetch(`${BACKEND}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}
