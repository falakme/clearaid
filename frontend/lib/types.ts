/** Shared domain types for ClearAid. */

/** Document type that selects the backend AI domain hint. */
export type DocType = "emergency" | "general";

/** A single actionable step in the interactive task list. */
export interface TaskItem {
  id: number;
  task: string;
}

/** Tabular allocations (fee breakdowns, eligibility brackets, etc.). */
export interface TableData {
  headers: string[];
  rows: string[][];
}

/** A node in the process visualizer / step-by-step flowchart. */
export interface DiagramStep {
  step_number: number;
  title: string;
  description: string;
}

/** Classification: how time-critical the document is. */
export type UrgencyTier =
  | "Urgent Action Required"
  | "Time Sensitive"
  | "Informational Only";

/**
 * Structured, multi-capability output returned by POST /api/translate-form.
 * Showcases classification, summarization, extraction, and an agentic
 * resource recommendation.
 */
export interface TranslateResult {
  /** Classification — how urgent the document is. */
  urgency_tier: UrgencyTier;
  /** Short machine label, e.g. "eviction", "medical", "food_assistance". */
  document_category: string;
  /** Summarization — a 1-2 sentence plain-language summary. */
  plain_language_brief: string;
  /** Extraction — the full plain-language explanation (Markdown). */
  plain_language_explanation_markdown: string;
  task_list: TaskItem[];
  table_data: TableData;
  diagram_steps: DiagramStep[];
  /** Model's self-reported confidence: High | Medium | Low. */
  ai_confidence_score: "High" | "Medium" | "Low";
  /** Confidence as a percentage, for the Responsible AI indicator. */
  confidence_percent: number;
  /** Agentic recommendation — the single verified support resource. */
  recommended_resource_name: string;
  recommended_resource_url: string;
  ai_reasoning_for_recommendation: string;
  /** Location the model detected in the document. */
  detected_location: string;
  /** Backend-attached provenance (exact extracted/source text). */
  source_text: string;
}

/** Backend health/status payload (GET /api/health). */
export interface Health {
  status: string;
  service: string;
  version: string;
  nvidia_configured: boolean;
  nvidia_model: string;
  brave_configured: boolean;
}
