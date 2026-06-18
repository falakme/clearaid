import { NextResponse } from "next/server";

/**
 * Same-origin proxy for document translation. Streams the multipart form
 * (typed context + optional uploaded PDF/image) to the backend over the
 * internal network. Keeps the browser on a single origin (no CORS / no
 * mixed-content) and avoids any build-time public backend URL.
 */
export const dynamic = "force-dynamic";
// The NVIDIA call can take a while; don't cut it short.
export const maxDuration = 120;

const BACKEND = (process.env.SERVICE_URL_BACKEND || process.env.BACKEND_INTERNAL_URL || "http://backend:8000").replace(/\/$/, "");

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    console.error("[Form Parsing Error]:", error);
    return NextResponse.json({ detail: "Invalid form data." }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND}/api/translate-form`, {
      method: "POST",
      body: form,
    });
    const data = await res.json().catch(() => ({
      detail: "The translator returned an unexpected response.",
    }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[Backend Connection Error]:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
