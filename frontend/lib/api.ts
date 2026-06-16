import type { Alert, Health, RecommendationsOut, TranslateResult } from "./types";

/**
 * Base URL the browser uses to reach the API.
 *
 * Defaults to "" (EMPTY) so calls go to the frontend's OWN origin
 * (`/api/...`), where Next.js route handlers proxy to the backend over the
 * internal network. This is the recommended setup for Coolify / any reverse
 * proxy: no CORS, no HTTPS->HTTP mixed content, and no public backend URL
 * baked into the bundle.
 *
 * Set NEXT_PUBLIC_API_BASE_URL to a full absolute URL (e.g.
 * https://backend.example.com) ONLY if you intentionally want the browser to
 * call the backend directly (you must then also configure CORS).
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.detail ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

/** Fetch active disaster alerts, optionally scoped to a city or ZIP. */
export async function fetchAlerts(opts?: { city?: string; zipCode?: string }): Promise<Alert[]> {
  // Build the query string manually so this works with a relative
  // (same-origin) base URL as well as an absolute one.
  const params = new URLSearchParams();
  if (opts?.city) params.set("city", opts.city);
  if (opts?.zipCode) params.set("zip_code", opts.zipCode);
  const qs = params.toString();

  const res = await fetch(`${API_BASE_URL}/api/alerts${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

/** Fetch backend health/status (used by the admin console). */
export async function fetchHealth(): Promise<Health> {
  const res = await fetch(`${API_BASE_URL}/api/health`, { cache: "no-store" });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

/** Input for a translation request: typed context and/or an uploaded file. */
export interface TranslateInput {
  /** What the user typed — their custom context / situation / pasted text. */
  text?: string;
  /** Uploaded PDF or image (OCR'd server-side). */
  file?: File | null;
  docType?: string;
  /** Append an "explain like I'm 5" instruction to the AI prompt. */
  eli5?: boolean;
  /** Translate the output values into this language (e.g. "Spanish"). */
  language?: string;
}

/**
 * Core call. Sends the user's typed context AND/OR an uploaded document
 * (PDF/image) as multipart form data; receives a structured, plain-language
 * checklist. When a file is attached, the typed text is forwarded as extra
 * context alongside the document's extracted/OCR'd text. Never submits
 * anything on the user's behalf.
 */
export async function translateForm(input: TranslateInput): Promise<TranslateResult> {
  const form = new FormData();
  if (input.text && input.text.trim()) form.append("text", input.text.trim());
  form.append("doc_type", input.docType ?? "general");
  if (input.eli5) form.append("eli5", "true");
  if (input.language && input.language.trim()) form.append("language", input.language.trim());
  if (input.file) form.append("file", input.file);

  // Note: do NOT set Content-Type — the browser sets the multipart boundary.
  const res = await fetch(`${API_BASE_URL}/api/translate-form`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

/** Fetch official relief (active) / recovery (resolved) links via Brave Search. */
export async function fetchRecommendations(opts: {
  city: string;
  region?: string;
  disaster?: string;
  mode?: "relief" | "recovery";
}): Promise<RecommendationsOut> {
  const params = new URLSearchParams({ city: opts.city, mode: opts.mode ?? "relief" });
  if (opts.region) params.set("region", opts.region);
  if (opts.disaster) params.set("disaster", opts.disaster);

  const res = await fetch(`${API_BASE_URL}/api/recommendations?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}
