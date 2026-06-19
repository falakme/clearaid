import type { ChatMessage, Health, TranslateResult } from "./types";

/**
 * Base URL the browser uses to reach the API.
 *
 * Defaults to "" (EMPTY) so calls go to the frontend's OWN origin
 * (`/api/...`), where Next.js route handlers proxy to the backend over the
 * internal network. This is the recommended setup for Coolify / any reverse
 * proxy: no CORS, no HTTPS->HTTP mixed content, and no public backend URL
 * baked into the bundle.
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

/** Fetch backend health/status. */
export async function fetchHealth(): Promise<Health> {
  const res = await fetch(`${API_BASE_URL}/api/health`, { cache: "no-store" });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

/** Input for a translation request: typed context and/or an uploaded file. */
export interface TranslateInput {
  /** What the user typed — their custom context / situation / pasted text. */
  text?: string;
  /** Uploaded PDFs or images (OCR'd server-side). */
  files?: File[];
  docType?: string;
  /** Translate the output values into this language (e.g. "Spanish"). */
  language?: string;
}

/**
 * Core call. Sends the user's typed context AND/OR an uploaded document
 * (PDF/image) as multipart form data; receives a structured, multi-capability
 * result (classification, summary, extraction). The "Verified Local Support"
 * recommendation is fetched separately via `recommend()` so this call stays
 * well under gateway timeouts. Never submits anything on the user's behalf.
 */
export async function translateForm(input: TranslateInput): Promise<TranslateResult> {
  const form = new FormData();
  if (input.text && input.text.trim()) form.append("text", input.text.trim());
  form.append("doc_type", input.docType ?? "general");
  if (input.language && input.language.trim()) form.append("language", input.language.trim());
  if (input.files && input.files.length > 0) {
    for (const file of input.files) {
      form.append("files", file);
    }
  }

  // Note: do NOT set Content-Type — the browser sets the multipart boundary.
  const res = await fetch(`${API_BASE_URL}/api/translate-form`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

export interface ChatInput {
  question: string;
  documentBrief?: string;
  documentExplanation?: string;
  sourceText?: string;
  history?: ChatMessage[];
  language?: string;
  detectedLocation?: string;
}

/**
 * Ask a follow-up question about the analyzed document. Stateless: we send the
 * document context and the prior turns each time. Returns the assistant's
 * Markdown answer. Never submits anything on the user's behalf.
 */
export async function chat(input: ChatInput): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: input.question,
      document_brief: input.documentBrief ?? "",
      document_explanation: input.documentExplanation ?? "",
      source_text: input.sourceText ?? "",
      history: input.history ?? [],
      language: input.language ?? "",
      detected_location: input.detectedLocation ?? "",
    }),
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  const data = await res.json();
  return (data?.answer ?? "") as string;
}
export interface Recommendation {
  recommended_resource_name: string;
  recommended_resource_url: string;
  ai_reasoning_for_recommendation: string;
}

export interface RecommendInput {
  document_category: string;
  plain_language_brief: string;
  location?: string;
  detected_location?: string;
}

/**
 * Agentic "Verified Local Support" recommendation: Brave retrieval + an AI
 * evaluation that picks one trustworthy resource. Best-effort — returns empty
 * fields when nothing suitable is found, so callers just omit the card.
 */
export async function recommend(input: RecommendInput): Promise<Recommendation> {
  const res = await fetch(`${API_BASE_URL}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_category: input.document_category || "general",
      plain_language_brief: input.plain_language_brief || "",
      location: input.location || "",
      detected_location: input.detected_location || "",
    }),
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}
