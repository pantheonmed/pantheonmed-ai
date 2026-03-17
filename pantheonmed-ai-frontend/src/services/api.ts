/**
 * PantheonMed AI — API Service Layer
 * All requests go to ${NEXT_PUBLIC_API_URL}/api/v1/*
 */
import axios, { AxiosInstance } from "axios";

/** baseURL = origin only. All paths must include /api/v1 prefix. */
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export function getApiBaseUrl(): string {
  return `${API_ORIGIN}/api/v1`;
}

export function getApiOrigin(): string {
  return API_ORIGIN.endsWith("/api/v1") ? API_ORIGIN.replace(/\/api\/v1$/, "") : API_ORIGIN;
}

const api: AxiosInstance = axios.create({
  baseURL: API_ORIGIN,
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

const API_V1 = "/api/v1";

export const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>(`${API_V1}/auth/login`, { email, password });
    // Token storage is handled by the caller via setToken() / setRefreshToken() from lib/auth
    return data;
  },
  register: async (email: string, password: string, fullName: string): Promise<UserProfile> => {
    const { data } = await api.post<UserProfile>(`${API_V1}/auth/register`, {
      email, password, full_name: fullName, role: "patient",
    });
    return data;
  },
  me: async (): Promise<UserProfile> => { const { data } = await api.get<UserProfile>(`${API_V1}/auth/me`); return data; },
};

export const chatAPI = {
  send: async (
    content: string,
    sessionId?: string,
    guestSessionId?: string,
  ): Promise<ChatResponse> => {
    const { data } = await api.post<ChatResponse>(`${API_V1}/chat`, {
      content,
      ...(sessionId      ? { session_id:       sessionId      } : {}),
      ...(guestSessionId ? { guest_session_id:  guestSessionId } : {}),
    });
    return data;
  },

  /** Fetch chat history — only call when the user is authenticated. */
  getHistory: async (limit = 50): Promise<ChatHistoryResponse> => {
    const { data } = await api.get<ChatHistoryResponse>(`${API_V1}/chat/history?limit=${limit}`);
    return data;
  },

  /** Import an in-browser guest conversation into the user's account after login. */
  mergeGuestSession: async (
    messages: Array<{ role: string; content: string }>,
    guestSessionId?: string,
  ): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>(`${API_V1}/chat/guest/merge`, {
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

/** Internal: call POST /chat and return AI response content. All AI features use this. */
async function chatPost(content: string, sessionId?: string): Promise<{ content: string; session_id: string }> {
  const { data } = await api.post<ChatResponse>(`${API_V1}/chat`, { content, session_id: sessionId ?? undefined });
  return { content: data.ai_response.content, session_id: data.session_id };
}

function toClinicalConsultation(content: string): ClinicalConsultation {
  return {
    consultation_type: "assessment",
    risk_level: "medium",
    doctor_assessment: content,
    follow_up_questions: [],
    differential_diagnosis: [],
    key_symptoms_to_check: [],
    recommended_next_steps: [],
    emergency_warning_signs: [],
    medical_disclaimer: "This information is for educational purposes only and does not constitute medical advice. Always consult a qualified healthcare provider.",
  };
}

export const aiAPI = {
  /** Send any medical query — uses POST /api/v1/chat */
  analyze: async (content: string, sessionId?: string): Promise<ClinicalConsultation> => {
    const { content: aiContent } = await chatPost(content, sessionId);
    return toClinicalConsultation(aiContent);
  },

  /** Get AI info about an organ — uses POST /api/v1/chat */
  askOrgan: async (organName: string): Promise<ClinicalConsultation> => {
    const question = `Act as a clinical anatomy specialist. Explain the ${organName}: its primary physiological function, the 4 most common diseases affecting it (ranked by prevalence), key warning symptoms patients must not ignore, and specific advice for when to see a doctor urgently. Include India-specific context.`;
    const { content } = await chatPost(question);
    return toClinicalConsultation(content);
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

function buildAssessmentPrompt(req: SymptomIntakeRequest): string {
  const parts = [
    "CLINICAL ASSESSMENT REQUEST",
    `Chief complaint: ${req.chief_complaint}`,
    `Symptoms: ${req.symptoms.join(", ")}`,
    req.duration_days ? `Duration: ${req.duration_days} days` : "",
    req.severity != null ? `Severity (1-10): ${req.severity}` : "",
    req.age != null ? `Age: ${req.age}` : "",
    req.sex ? `Sex: ${req.sex}` : "",
    req.risk_factors?.length ? `Risk factors: ${req.risk_factors.join(", ")}` : "",
  ].filter(Boolean);
  return `${parts.join("\n")}\n\nPlease provide a clinical assessment: triage level (EMERGENCY/URGENT/ROUTINE/SELF-CARE), possible conditions, red flags, recommended tests, self-care advice, and when to see a doctor. Format as clear clinical prose.`;
}

export const symptomAssessmentAPI = {
  /** Clinical Assessment — uses POST /api/v1/chat */
  assess: async (req: SymptomIntakeRequest): Promise<FullAssessmentResponse> => {
    const prompt = buildAssessmentPrompt(req);
    const { content } = await chatPost(prompt);
    return {
      session_id: null,
      detected_symptoms: req.symptoms,
      triage_level: "ROUTINE",
      diagnoses: [],
      red_flags: [],
      recommended_tests: [],
      self_care_advice: [],
      escalation_recommendation: "Consult a healthcare provider if symptoms persist or worsen.",
      clinical_note: content,
      follow_up_questions: [],
    };
  },
  triage: async (req: SymptomIntakeRequest): Promise<TriageOnlyResponse> => {
    const { content } = await chatPost(buildAssessmentPrompt(req));
    return {
      triage_level: "ROUTINE",
      detected_symptoms: req.symptoms,
      red_flags: [],
      action_summary: content.slice(0, 300),
    };
  },
  redFlagCheck: async (req: SymptomIntakeRequest) => {
    const { content } = await chatPost(`Red flag check for: ${req.chief_complaint}. Symptoms: ${req.symptoms.join(", ")}.`);
    return { content };
  },
  symptomList: async (): Promise<{ categories: Record<string, string[]> }> => {
    return { categories: {} };
  },
  getDiseaseProfile: async (diseaseId: string) => {
    const { content } = await chatPost(`Provide a brief profile for disease/condition: ${diseaseId}`);
    return { content };
  },
};

export const labAPI = {
  /** POST ${baseURL}/lab/analyze → /api/v1/lab/analyze */
  analyzeText: async (rawText: string, opts?: { labName?: string; patientContext?: string }): Promise<LabAnalyzeResponse> => {
    const { data } = await api.post<LabAnalyzeResponse>(`${API_V1}/lab/analyze`, {
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
  /** Drug interaction check — uses POST /api/v1/chat */
  checkInteractions: async (drugs: string[]): Promise<DrugInteractionResponse> => {
    const prompt = `Analyze potential drug interactions between: ${drugs.join(", ")}. List any interactions, severity, and management advice.`;
    const { content } = await chatPost(prompt);
    return normalizeDrugInteractionResponse({
      drugs,
      interactions: [],
      ai_analysis: content,
      overall_risk: "See AI analysis below",
      contraindicated: false,
    });
  },
  /** Drug info — uses POST /api/v1/chat */
  getInfo: async (drugName: string) => {
    const { content } = await chatPost(`Provide comprehensive information about the drug/medicine: ${drugName}. Include indications, dosage, side effects, contraindications.`);
    return { name: drugName, content, explanation: content, source: "ai_only" };
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
  /** Clinical summary — uses POST /api/v1/chat */
  clinicalSummary: async (req: ClinicalSummaryRequest): Promise<{ summary: string }> => {
    const prompt = `Generate a structured clinical summary. Chief complaint: ${req.chief_complaint}. History: ${req.history}. ${req.vitals ? `Vitals: ${req.vitals}` : ""} ${req.lab_findings ? `Lab findings: ${req.lab_findings}` : ""}`;
    const { content } = await chatPost(prompt);
    return { summary: content };
  },
  /** Prescription draft — uses POST /api/v1/chat */
  prescriptionDraft: async (req: PrescriptionDraftRequest): Promise<{ draft: string }> => {
    const prompt = `Draft a prescription for diagnosis: ${req.diagnosis}. ${req.allergies ? `Allergies: ${req.allergies}` : ""} ${req.existing_medications ? `Existing meds: ${req.existing_medications}` : ""}`;
    const { content } = await chatPost(prompt);
    return { draft: content };
  },
  /** Differential diagnosis — uses POST /api/v1/chat */
  differentialDx: async (req: DifferentialDxRequest): Promise<{ differentials: string }> => {
    const prompt = `Differential diagnosis for symptoms: ${req.symptoms}. ${req.age ? `Age: ${req.age}` : ""} ${req.gender ? `Gender: ${req.gender}` : ""} ${req.duration ? `Duration: ${req.duration}` : ""}`;
    const { content } = await chatPost(prompt);
    return { differentials: content };
  },
  /** Translate medical ↔ plain — uses POST /api/v1/chat */
  translate: async (req: TranslatorRequest): Promise<{ original: string; translated: string }> => {
    const dir = req.direction === "to_plain" ? "plain language" : "medical terminology";
    const { content } = await chatPost(`Translate to ${dir}: ${req.text}`);
    return { original: req.text, translated: content };
  },
  /** Treatment navigator — uses POST /api/v1/chat */
  treatmentNavigator: async (req: TreatmentNavigatorRequest): Promise<{ condition: string; guidance: string }> => {
    const prompt = `Treatment guidance for: ${req.condition}. ${req.stage ? `Stage: ${req.stage}` : ""} ${req.preferences ? `Preferences: ${req.preferences}` : ""}`;
    const { content } = await chatPost(prompt);
    return { condition: req.condition, guidance: content };
  },
};

export const apiClient = api;
export default api;
