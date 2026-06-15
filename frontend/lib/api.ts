import type { Alert, Health, TranslateResult } from "./types";

/**
 * Public base URL the browser uses to reach the FastAPI backend.
 * Baked in at build time via NEXT_PUBLIC_API_BASE_URL.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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

/** Fetch active disaster alerts, optionally scoped to a ZIP code. */
export async function fetchAlerts(zipCode?: string): Promise<Alert[]> {
  const url = new URL(`${API_BASE_URL}/api/alerts`);
  if (zipCode) url.searchParams.set("zip_code", zipCode);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

/** Fetch backend health/status (used by the admin console). */
export async function fetchHealth(): Promise<Health> {
  const res = await fetch(`${API_BASE_URL}/api/health`, { cache: "no-store" });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

/** Input for a translation request: pasted text and/or an uploaded file. */
export interface TranslateInput {
  text?: string;
  file?: File | null;
  docType?: string;
}

/**
 * Core call. Sends pasted text and/or an uploaded document (PDF/image) as
 * multipart form data; receives a structured, plain-language checklist.
 * Never submits anything on the user's behalf.
 */
export async function translateForm(input: TranslateInput): Promise<TranslateResult> {
  const form = new FormData();
  if (input.text) form.append("text", input.text);
  form.append("doc_type", input.docType ?? "general");
  if (input.file) form.append("file", input.file);

  // Note: do NOT set Content-Type — the browser sets the multipart boundary.
  const res = await fetch(`${API_BASE_URL}/api/translate-form`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}
