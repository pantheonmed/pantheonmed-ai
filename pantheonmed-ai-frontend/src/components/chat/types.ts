import type { LucideIcon } from "lucide-react";
import type { ClinicalConsultation } from "@/services/api";
import type { InterviewQuestion, EmergencyAlert } from "./clinicalInterviewEngine";
import type { MessageIntent, WellnessResponse } from "./intentClassifier";

// ---------------------------------------------------------------------------
// Chat modes
// ---------------------------------------------------------------------------

export type ChatModeId =
  | "symptom"
  | "report"
  | "radiology"
  | "drug"
  | "research"
  | "risk"
  | "scan"
  | "care_finder";

export interface ChatMode {
  id: ChatModeId;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;         // Tailwind bg class
  textColor: string;     // Tailwind text class
  borderColor: string;   // Tailwind border class
  promptPrefix: string;  // Injected before user message
  placeholder: string;
  acceptsFile?: boolean;
  acceptsImage?: boolean;
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export type AttachmentType = "image" | "pdf" | "capture";

export interface Attachment {
  id: string;
  type: AttachmentType;
  name: string;
  preview?: string;  // data-URL for images
  size?: number;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  clinical?: ClinicalConsultation | null;
  /** Structured wellness / education response (HEALTH_GOAL or MEDICAL_KNOWLEDGE intent) */
  wellness?: WellnessResponse | null;
  /** Detected intent for this message — used to render the correct card variant */
  intentType?: MessageIntent;
  attachments?: Attachment[];
  modeId?: ChatModeId;
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
  // ── Clinical Interview Engine fields ──────────────────────────────────
  /** Set on assistant messages that are interview questions */
  interviewQuestion?: InterviewQuestion | null;
  /** Progress tracking for the question in this message */
  interviewProgress?: { current: number; total: number };
  /** Once the user answers, lock the card and store their choices */
  interviewAnswered?: boolean;
  interviewSelectedAnswers?: string[];
  /** Emergency alert to show above this question card */
  interviewEmergencyAlert?: EmergencyAlert | null;
  /** Session ID this question belongs to (used for routing callbacks) */
  interviewSessionId?: string;
}
