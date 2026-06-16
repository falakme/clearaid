import { NextResponse } from "next/server";

/** Proxy the VAPID public key so the browser can subscribe to push. */
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/push/vapid-public-key`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ public_key: "", configured: false }, { status: 502 });
  }
}
