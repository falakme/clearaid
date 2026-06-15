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

/** Structured output returned by POST /api/translate-form. */
export interface TranslateResult {
  bottom_line_summary: string;
  deadline: string | null;
  required_attachments: string[];
  signature_locations: string[];
  critical_warnings: string[];
  source_text_reference: string;
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
