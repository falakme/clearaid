/** Shared domain types for ClearAid. */

export interface UserProfile {
  zipCode: string;
  city: string;
  familySize: number;
  notificationsEnabled: boolean;
  onboardedAt: string;
}

export interface Alert {
  id: number;
  zip_code: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "success";
  programs_open: number;
  is_active: boolean;
  created_at: string;
}

/** Document type that selects the backend AI prompt. */
export type DocType =
  | "emergency"
  | "eviction"
  | "medical_bill"
  | "school"
  | "housing"
  | "general";

/** A document-translation module shown on the dashboard. */
export interface ReliefProgram {
  id: string;
  title: string;
  agency: string;
  description: string;
  /** Pre-filled sample form text used to demo the translator. */
  sampleFormText: string;
  officialUrl: string;
  /** Selects the backend system prompt. */
  docType: DocType;
  /** Requires Clerk sign-in when there is NO active emergency. */
  gated: boolean;
  /** Grouping label shown on the dashboard. */
  category: "Emergency" | "Housing & Legal" | "Medical" | "School" | "Government";
}

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
