import { NextResponse } from "next/server";

/**
 * Same-origin proxy for text-to-speech. Forwards { text } to the backend's
 * Azure Cognitive Services TTS endpoint and streams the MP3 audio back to the
 * browser. Keeps the Azure key on the server and avoids CORS.
 *
 * On 503 (Azure not configured) the client falls back to the browser's Web
 * Speech synthesis, so read-aloud always works.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BACKEND = (process.env.SERVICE_URL_BACKEND || process.env.BACKEND_INTERNAL_URL || "http://backend:8000").replace(/\/$/, "");

export async function POST(request: Request) {
  let body: { text?: string };
  try {
    body = await request.json();
  } catch (error) {
    console.error("[JSON Parsing Error]:", error);
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ detail: "No text to synthesize." }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 6000) }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json({ detail: detail || "TTS failed" }, { status: res.status });
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[Backend Connection Error]:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
