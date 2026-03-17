/**
 * PantheonMed AI — API Service Layer
 * All requests go to ${NEXT_PUBLIC_API_URL}/api/v1/*
 */
import axios, { AxiosInstance } from "axios";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const API_BASE_URL = `${API_ORIGIN}/api/v1`;

/** baseURL for all API calls — do NOT include /api/v1 in NEXT_PUBLIC_API_URL */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/** Origin only (for /health etc) — do NOT include /api/v1 in env */
export function getApiOrigin(): string {
  return API_ORIGIN.endsWith("/api/v1") ? API_ORIGIN.replace(/\/api\/v1$/, "") : API_ORIGIN;
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45_000,
  headers: { "Content-Type": "application/json" },
});

// Only send Authorization header when user is logged in (guest mode = no token)
api.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// Attach guest session ID when the user is not authenticated
api.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined" && !localStorage.getItem("access_token")) {
    let guestId = localStorage.getItem("guest_session_id");
    if (!guestId) {
      guestId = crypto.randomUUID();
      localStorage.setItem("guest_session_id", guestId);
    }
    cfg.headers["X-Guest-Session-Id"] = guestId;
  }
  return cfg;
});

/** Extract a user-friendly error message from axios / API errors. */
export function getApiErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { response?: { data?: { detail?: string | string[] }; status?: number }; message?: string; code?: string };
    const detail = e.response?.data?.detail;
    if (detail) {
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail) && detail.length > 0) return (detail[0] as { msg?: string })?.msg ?? String(detail[0]);
    }
    const msg = e.message ?? "";
    if (msg === "Network Error" || e.code === "ERR_NETWORK") {
      return "Server temporarily unavailable. Please try again in a moment.";
    }
    if (e.code === "ECONNABORTED") {
      return "The request timed out. The AI is taking longer than usual — please try again.";
    }
    return msg || "Connection error. Please try again.";
  }
  return "Connection error. Please try again.";
}

// On 401/403 — only clear auth and redirect when the user actually had a token
// (expired session). Guests hitting 401 on protected endpoints just get an error.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== "undefined") {
      const status = err?.response?.status;
      const hadToken = !!localStorage.getItem("access_token");
      if ((status === 401 || status === 403) && hadToken) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("pm_refresh");
        document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);

export interface ChatMessage {
  id: string; session_id: string; role: "user" | "assistant";
  content: string; has_disclaimer: boolean; created_at: string;
}
export interface ChatResponse {
  session_id: string; message: ChatMessage; ai_response: ChatMessage;
}
export interface ChatHistoryItem {
  id: string; session_id: string; user_id: string;
  question: string; response: string; created_at: string;
}
export interface ChatHistoryResponse {
  session_id: string | null;
  messages: ChatMessage[];
  items: ChatHistoryItem[];
  total: number;
}
export interface LabPattern {
  name: string;
  confidence: number;
  message: string;
  suggested_tests: string[];
}

export interface LabAnalyzeResponse {
  report_id: string;
  analysis: string;
  abnormal_flags: string[];
  urgent_flags: string[];
  summary: string;
  patterns?: LabPattern[];
  parsed_tests_count?: number;
}
export interface AuthResponse {
  access_token: string; refresh_token: string; token_type: string; role: string;
}
export interface UserProfile {
  id: string; email: string; full_name: string; role: string;
}

export const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    // Token storage is handled by the caller via setToken() / setRefreshToken() from lib/auth
    return data;
  },
  register: async (email: string, password: string, fullName: string): Promise<UserProfile> => {
    const { data } = await api.post<UserProfile>("/auth/register", {
      email, password, full_name: fullName, role: "patient",
    });
    return data;
  },
  me: async (): Promise<UserProfile> => { const { data } = await api.get<UserProfile>("/auth/me"); return data; },
};

export const chatAPI = {
  send: async (
    content: string,
    sessionId?: string,
    guestSessionId?: string,
  ): Promise<ChatResponse> => {
    const { data } = await api.post<ChatResponse>("/chat", {
      content,
      ...(sessionId      ? { session_id:       sessionId      } : {}),
      ...(guestSessionId ? { guest_session_id:  guestSessionId } : {}),
    });
    return data;
  },

  /** Fetch chat history — only call when the user is authenticated. */
  getHistory: async (limit = 50): Promise<ChatHistoryResponse> => {
    const { data } = await api.get<ChatHistoryResponse>(`/chat/history?limit=${limit}`);
    return data;
  },

  /** Import an in-browser guest conversation into the user's account after login. */
  mergeGuestSession: async (
    messages: Array<{ role: string; content: string }>,
    guestSessionId?: string,
  ): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/chat/guest/merge", {
      messages,
      guest_session_id: guestSessionId,
    });
    return data;
  },
};

/** Single item in the ranked differential diagnosis list. */
export interface DifferentialItem {
  rank: number;
  condition: string;
  explanation: string;
}

/**
 * Clinical consultation response from /api/v1/ai/chat.
 * Used by all medical tool pages.
 */
export interface DrugInfo {
  drug_name?:         string;
  brand_names?:       string[];
  generic_names?:     string[];
  indications?:       string;
  adverse_reactions?: string;
  warnings?:          string;
  contraindications?: string;
  drug_interactions?: string;
  dosage?:            string;
  manufacturer?:      string;
  error?:             string;
}

export interface IcdInfo {
  disease_name?: string;
  code?:         string;
  title?:        string;
  chapter?:      string;
  definition?:   string;
  url?:          string;
  error?:        string;
}

export interface ResearchPaper {
  pmid?:             string;
  title?:            string;
  authors?:          string;
  journal?:          string;
  year?:             string;
  abstract_snippet?: string;
  url?:              string;
  error?:            string;
}

export interface UmlsConcept {
  cui?:            string;
  name?:           string;
  semantic_types?: string[];
  definition?:     string;
  synonyms?:       string[];
  mesh_id?:        string;
}

export interface UmlsResult {
  term?:     string;
  concepts?: UmlsConcept[];
  _source?:  string;
}

export interface ClinicalTrial {
  nct_id?:              string;
  title?:               string;
  status?:              string;
  phase?:               string;
  conditions?:          string[];
  interventions?:       string[];
  locations?:           string[];
  start_date?:          string;
  eligibility_summary?: string;
  contact?:             string;
  brief_summary?:       string;
  url?:                 string;
  error?:               string;
}

export interface RxNormInteraction {
  interacting_drugs?: string[];
  severity?:          string;
  description?:       string;
  source?:            string;
}

export interface RxNormResult {
  drug_name?:    string;
  generic_name?: string;
  rxcui?:        string;
  drug_class?:   string[];
  interactions?: RxNormInteraction[];
  error?:        string;
}

// ── Clinical Reasoning Engine types ──────────────────────────────────────────
export interface ClinicalCondition {
  condition:         string;
  probability:       number;   // 0.0 – 1.0
  matched_symptoms:  string[];
  risk_level:        "LOW" | "MODERATE" | "HIGH" | "EMERGENCY";
  category:          string;
}

export interface ClinicalRedFlag {
  flag:     string;
  category: string;
  action:   string;
  severity: "HIGH" | "EMERGENCY";
}

export interface ClinicalReasoningOutput {
  symptoms:            string[];
  possible_conditions: ClinicalCondition[];
  recommended_tests:   string[];
  risk_level:          string;
  red_flags:           ClinicalRedFlag[];
  emergency:           boolean;
  reasoning_version:   string;
}

export interface ClinicalConsultation {
  consultation_type: "assessment" | "follow_up" | "emergency";
  risk_level: "emergency" | "high" | "medium" | "low";
  doctor_assessment: string;
  follow_up_questions: string[];
  differential_diagnosis: DifferentialItem[];
  key_symptoms_to_check: string[];
  recommended_next_steps: string[];
  emergency_warning_signs: string[];
  medical_disclaimer: string;
  // Medical Brain enrichment
  extracted_symptoms?: string[];
  brain_recommended_tests?: string[];
  // External API data — Phase 1
  drug_info?: DrugInfo | null;
  icd_info?: IcdInfo | null;
  research_evidence?: ResearchPaper[];
  // External API data — Phase 2
  medical_concepts?: UmlsResult | null;
  clinical_trials?: ClinicalTrial[];
  drug_interactions?: RxNormResult | null;
  data_sources?: string[];
  // Clinical Reasoning Engine
  clinical_reasoning?: ClinicalReasoningOutput | null;
  // Intent and RAG metadata
  intent?: string;
  // Legacy compat aliases
  answer?: string;
  possible_conditions?: string[];
  recommended_actions?: string[];
  warning_signs?: string[];
}

/** @deprecated — use ClinicalConsultation */
export type MedicalToolResponse = ClinicalConsultation;
/** @deprecated — use ClinicalConsultation */
export type OrganInfoResponse = ClinicalConsultation;

export const aiAPI = {
  /** Send any medical query and receive a structured clinical response. Pass sessionId for conversation memory. */
  analyze: async (content: string, sessionId?: string): Promise<ClinicalConsultation> => {
    const { data } = await api.post<ClinicalConsultation>("/ai/chat", { content, session_id: sessionId ?? undefined });
    return data;
  },

  /** Get structured AI info about an organ (used by 3D Anatomy page). */
  askOrgan: async (organName: string): Promise<ClinicalConsultation> => {
    const question = `Act as a clinical anatomy specialist. Explain the ${organName}: its primary physiological function, the 4 most common diseases affecting it (ranked by prevalence), key warning symptoms patients must not ignore, and specific advice for when to see a doctor urgently. Include India-specific context (prevalence, common risk factors in Indian population).`;
    const { data } = await api.post<ClinicalConsultation>("/ai/chat", { content: question });
    return data;
  },
};

// ── Symptom Assessment Engine types ──────────────────────────────────────────
export interface SymptomIntakeRequest {
  chief_complaint: string;
  symptoms: string[];
  duration_days?: number | null;
  severity?: number | null;
  age?: number | null;
  sex?: string | null;
  risk_factors?: string[];
  vitals?: Record<string, unknown> | null;
}

export interface AssessmentDiagnosisItem {
  disease_id: string;
  name: string;
  icd10: string;
  category: string;
  probability: number;
  matched_symptoms: string[];
  escalation: string;
  recommended_tests: string[];
  self_care: string[];
  when_to_see_doctor: string;
}

export interface AssessmentRedFlag {
  flag_name: string;
  triage_level: string;
  action: string;
  matched_symptoms: string[];
}

export interface FullAssessmentResponse {
  session_id?: string | null;
  detected_symptoms: string[];
  triage_level: string;
  diagnoses: AssessmentDiagnosisItem[];
  red_flags: AssessmentRedFlag[];
  recommended_tests: string[];
  self_care_advice: string[];
  escalation_recommendation: string;
  clinical_note: string;
  follow_up_questions: string[];
}

export interface TriageOnlyResponse {
  triage_level: string;
  detected_symptoms: string[];
  red_flags: AssessmentRedFlag[];
  action_summary: string;
}

export const symptomAssessmentAPI = {
  assess: async (req: SymptomIntakeRequest): Promise<FullAssessmentResponse> => {
    const { data } = await api.post<FullAssessmentResponse>(
      "/symptom-assessment/symptom-intake",
      req,
    );
    return data;
  },
  triage: async (req: SymptomIntakeRequest): Promise<TriageOnlyResponse> => {
    const { data } = await api.post<TriageOnlyResponse>("/symptom-assessment/triage", req);
    return data;
  },
  redFlagCheck: async (req: SymptomIntakeRequest) => {
    const { data } = await api.post("/symptom-assessment/red-flag-check", req);
    return data;
  },
  symptomList: async (): Promise<{ categories: Record<string, string[]> }> => {
    const { data } = await api.get("/symptom-assessment/symptom-list");
    return data;
  },
  getDiseaseProfile: async (diseaseId: string) => {
    const { data } = await api.get(`/symptom-assessment/disease/${diseaseId}`);
    return data;
  },
};

export const labAPI = {
  /** POST ${baseURL}/lab/analyze → /api/v1/lab/analyze */
  analyzeText: async (rawText: string, opts?: { labName?: string; patientContext?: string }): Promise<LabAnalyzeResponse> => {
    const { data } = await api.post<LabAnalyzeResponse>("/lab/analyze", {
      raw_text: rawText, lab_name: opts?.labName, patient_context: opts?.patientContext,
    });
    return data;
  },
};

// ── Drug Interaction Engine types ─────────────────────────────────────────────
export interface DrugInteractionDetail {
  drug_a:     string;
  drug_b:     string;
  severity:   "CONTRAINDICATED" | "SEVERE" | "MODERATE" | "MILD";
  mechanism:  string;
  effect:     string;
  management: string;
  evidence:   string; // "A" | "B" | "C"
}

export interface DrugInteractionResponse {
  drugs:             string[];
  interactions:      DrugInteractionDetail[];
  severity_summary:  { severe?: number; moderate?: number; mild?: number; contraindicated?: number };
  overall_risk:      string;
  contraindicated:   boolean;
  ai_analysis?:      string;
  disclaimer?:       string;
}

/** Normalize medicine API response — backend may return structured (interactions) or AI-only (analysis). */
function normalizeDrugInteractionResponse(data: Record<string, unknown>): DrugInteractionResponse {
  const drugs = (data.drugs as string[]) ?? [];
  const interactions = (data.interactions as DrugInteractionDetail[]) ?? [];
  const aiAnalysis = (data.ai_analysis as string) ?? (data.analysis as string) ?? "";
  return {
    drugs,
    interactions,
    severity_summary: (data.severity_summary as DrugInteractionResponse["severity_summary"]) ?? {},
    overall_risk: (data.overall_risk as string) ?? (aiAnalysis ? "See AI analysis below" : "No data"),
    contraindicated: (data.contraindicated as boolean) ?? false,
    ai_analysis: aiAnalysis || undefined,
    disclaimer: (data.disclaimer as string) ?? undefined,
  };
}

export const medicineAPI = {
  /** Check interactions between a list of drugs using the structured engine. */
  checkInteractions: async (drugs: string[]): Promise<DrugInteractionResponse> => {
    const { data } = await api.post<Record<string, unknown>>("/medicine/interactions", { drugs });
    return normalizeDrugInteractionResponse(data);
  },
  /** Get comprehensive information about a drug. */
  getInfo: async (drugName: string) => {
    const { data } = await api.post("/medicine/info", { drug_name: drugName });
    return data;
  },
};

// ── Doctor Clinical Tools ─────────────────────────────────────────────────────
export interface ClinicalSummaryRequest {
  chief_complaint: string;
  history:         string;
  vitals?:         string;
  lab_findings?:   string;
}

export interface PrescriptionDraftRequest {
  diagnosis:             string;
  allergies?:            string;
  existing_medications?: string;
}

export interface DifferentialDxRequest {
  symptoms: string;
  age?:     number;
  gender?:  string;
  duration?: string;
}

export interface TranslatorRequest {
  text:      string;
  direction: "to_plain" | "to_medical";
}

export interface TreatmentNavigatorRequest {
  condition:   string;
  stage?:      string;
  preferences?: string;
}

export const doctorAPI = {
  /** Generate a structured clinical summary. Requires doctor/admin role. */
  clinicalSummary: async (req: ClinicalSummaryRequest): Promise<{ summary: string }> => {
    const { data } = await api.post<{ summary: string }>("/doctor/clinical-summary", req);
    return data;
  },
  /** Draft a prescription suggestion. Requires doctor/admin role. */
  prescriptionDraft: async (req: PrescriptionDraftRequest): Promise<{ draft: string }> => {
    const { data } = await api.post<{ draft: string }>("/doctor/prescription-draft", req);
    return data;
  },
  /** Generate a structured differential diagnosis. Requires doctor/admin role. */
  differentialDx: async (req: DifferentialDxRequest): Promise<{ differentials: string }> => {
    const { data } = await api.post<{ differentials: string }>("/doctor/differential-diagnosis", req);
    return data;
  },
  /** Translate medical text ↔ plain language. Available to all authenticated users. */
  translate: async (req: TranslatorRequest): Promise<{ original: string; translated: string }> => {
    const { data } = await api.post<{ original: string; translated: string }>("/doctor/translate", req);
    return data;
  },
  /** Get treatment guidance for a condition. Available to all authenticated users. */
  treatmentNavigator: async (req: TreatmentNavigatorRequest): Promise<{ condition: string; guidance: string }> => {
    const { data } = await api.post<{ condition: string; guidance: string }>("/doctor/treatment-navigator", req);
    return data;
  },
};

export const apiClient = api;
export default api;
