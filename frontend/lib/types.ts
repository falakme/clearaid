/** Shared domain types for ClearAid. */

/**
 * Locally-stored profile. Derived from the device's geolocation (reverse
 * geocoded in the browser) — the user is never asked to type a ZIP or city.
 * Lives ONLY in localStorage; never transmitted to the backend.
 */
export interface UserProfile {
  /** Administrative city, used to match area alerts. */
  city: string;
  /** State / province / emirate. */
  region: string;
  /** Country (display form), e.g. "USA". */
  country: string;
  /** Pretty area label, e.g. "Cupertino, California, USA". */
  label: string;
  /** Optional ZIP/postcode (legacy; not used for matching). */
  zipCode?: string;
  /** Whether an active emergency was detected for this area at onboarding. */
  emergency: boolean;
  notificationsEnabled?: boolean;
  onboardedAt: string;
}

export interface Alert {
  id: number;
  city: string;
  region: string;
  country: string;
  zip_code: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "success";
  programs_open: number;
  is_active: boolean;
  /** Lifecycle: "active" (emergency) | "resolved" (recovery phase). */
  status: "active" | "resolved";
  created_at: string;
}

/** An emergency-response team record (admin-managed). */
export interface ErTeam {
  id: number;
  clerk_user_id: string | null;
  org_name: string;
  assigned_city: string;
  region: string;
  country: string;
  is_active: boolean;
  created_at: string;
}

/** A single official relief/recovery link from Brave Search. */
export interface Recommendation {
  title: string;
  url: string;
  description: string;
}

export interface RecommendationsOut {
  mode: "relief" | "recovery";
  query: string;
  results: Recommendation[];
}

/** Document type that selects the backend AI prompt. */
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

/** Structured, multi-component output returned by POST /api/translate-form. */
export interface TranslateResult {
  plain_language_explanation_markdown: string;
  task_list: TaskItem[];
  table_data: TableData;
  diagram_steps: DiagramStep[];
  /** Model's self-reported confidence: High | Medium | Low. */
  ai_confidence_score: "High" | "Medium" | "Low";
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
  database_connected: boolean;
}
