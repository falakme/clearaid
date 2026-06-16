import { NextResponse } from "next/server";

/**
 * Same-origin proxy to the FastAPI backend for public alert reads.
 *
 * The browser calls this route on the frontend's own origin, and the Next.js
 * server forwards to the backend over the internal Docker network
 * (BACKEND_INTERNAL_URL). This avoids CORS, mixed-content (HTTPS->HTTP), and
 * the need to bake a public backend URL into the browser bundle at build time.
 */
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  try {
    const res = await fetch(`${BACKEND}/api/alerts${search}`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}
