import { NextResponse } from "next/server";

/** Same-origin proxy to the backend Brave-Search recommendation endpoint. */
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  try {
    const res = await fetch(`${BACKEND}/api/recommendations${search}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { mode: "relief", query: "", results: [] },
      { status: 502 },
    );
  }
}
