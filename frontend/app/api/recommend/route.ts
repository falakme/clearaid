import { NextResponse } from "next/server";

/**
 * Same-origin proxy for the agentic "Verified Local Support" recommendation.
 * Kept separate from /api/translate-form so the (slower) Brave + AI-evaluation
 * step doesn't block the main translation and risk a gateway timeout.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BACKEND = (process.env.SERVICE_URL_BACKEND || process.env.BACKEND_INTERNAL_URL || "http://backend:8000").replace(/\/$/, "");

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.error("[JSON Parsing Error]:", error);
    return NextResponse.json({ detail: "Invalid JSON." }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[Backend Connection Error]:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
