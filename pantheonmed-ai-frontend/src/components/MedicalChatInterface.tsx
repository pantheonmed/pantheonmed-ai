"use client";

/**
 * MedicalChatInterface — AI clinical consultation chat.
 *
 * Chat pipeline (Symptom Mode):
 *   User text → detectPrimarySymptom()
 *   → Clinical Interview Engine (3–5 adaptive questions)
 *   → buildDiagnosisContext()
 *   → aiAPI.analyze() → ResponseCard
 *
 * All other modes bypass the interview and call the AI directly.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertOctagon,
  Bot,
  ClipboardList,
  Loader2,
  RefreshCcw,
  Stethoscope,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { aiAPI, getApiErrorMessage } from "@/services/api";
import InputBar from "@/components/chat/InputBar";
import ResponseCard from "@/components/chat/ResponseCard";
import WellnessCard, { parseWellnessResponse } from "@/components/chat/WellnessCard";
import CameraModal from "@/components/chat/CameraModal";
import InterviewCard from "@/components/chat/InterviewCard";
import { CHAT_MODES, DEFAULT_MODE } from "@/components/chat/modes";
import type { Attachment, ChatMessage, ChatMode, ChatModeId } from "@/components/chat/types";
import {
  buildDiagnosisContext,
  buildInterviewIntro,
  buildTransitionMessage,
  checkEmergency,
  createInterviewSession,
  detectPrimarySymptom,
  getNextQuestion,
  isInterviewComplete,
  recordAnswer,
  type InterviewSession,
} from "@/components/chat/clinicalInterviewEngine";
import {
  classifyIntent,
  buildWellnessPrompt,
  buildEducationalPrompt,
  type MessageIntent,
} from "@/components/chat/intentClassifier";

// ---------------------------------------------------------------------------
// Typing dots
// ---------------------------------------------------------------------------

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2 w-2 rounded-full bg-blue-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User message bubble
// ---------------------------------------------------------------------------

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex items-end justify-end gap-3 group">
      <div className="max-w-[75%] space-y-2">
        {(message.attachments?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {message.attachments!.map((att) =>
              att.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={att.id} src={att.preview} alt={att.name}
                  className="h-24 w-24 rounded-xl object-cover border border-white/20 shadow-md" />
              ) : (
                <div key={att.id}
                  className="flex items-center gap-2 bg-blue-500 text-white rounded-xl px-3 py-2 text-xs font-medium shadow">
                  <span className="text-[10px] font-bold bg-white/20 rounded px-1.5 py-0.5">PDF</span>
                  <span className="truncate max-w-[100px]">{att.name}</span>
                </div>
              ),
            )}
          </div>
        )}

        {message.content && (
          <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed shadow-sm">
            {message.content}
          </div>
        )}

        <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          {message.modeId && (
            <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100",
              CHAT_MODES[message.modeId]?.textColor)}>
              {CHAT_MODES[message.modeId]?.label}
            </span>
          )}
          <span className="text-[10px] text-gray-400">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
        <User className="h-4 w-4 text-white" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI response bubble — handles both interview cards and clinical responses
// ---------------------------------------------------------------------------

interface AiBubbleProps {
  message: ChatMessage;
  onAnswerSelect?: (msgId: string, questionId: string, answers: string[]) => void;
}

function AiBubble({ message, onAnswerSelect }: AiBubbleProps) {
  const modeId = message.modeId ?? "symptom";
  const mode = CHAT_MODES[modeId] ?? CHAT_MODES.symptom;
  const ModeIcon = mode.icon;

  return (
    <div className="flex items-start gap-3 group">
      {/* Avatar */}
      <div className={clsx("h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1", mode.color)}>
        <ModeIcon className="h-4 w-4 text-white" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">

        {/* ── Loading state ───────────────────────────────────────────── */}
        {message.isLoading && (
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm inline-flex items-center gap-3">
            <Loader2 className={clsx("h-4 w-4 animate-spin", mode.textColor)} />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {message.content || `Analysing with ${mode.label}…`}
              </p>
              <TypingDots />
            </div>
          </div>
        )}

        {/* ── Error state ─────────────────────────────────────────────── */}
        {message.isError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertOctagon className="h-4 w-4 text-red-500" />
              <p className="text-sm font-semibold text-red-700">Analysis Error</p>
            </div>
            <p className="text-sm text-red-600">{message.content}</p>
          </div>
        )}

        {/* ── Interview question card ──────────────────────────────────── */}
        {!message.isLoading && !message.isError && message.interviewQuestion && (
          <div className="max-w-xl">
            {/* Intro text (shown only when the card has content) */}
            {message.content && (
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm mb-3">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            )}
            <InterviewCard
              question={message.interviewQuestion}
              progress={message.interviewProgress ?? { current: 1, total: 5 }}
              answered={message.interviewAnswered ?? false}
              selectedAnswers={message.interviewSelectedAnswers}
              emergencyAlert={message.interviewEmergencyAlert}
              onSelect={(qId, answers) => onAnswerSelect?.(message.id, qId, answers)}
            />
          </div>
        )}

        {/* ── Structured clinical response ────────────────────────────── */}
        {!message.isLoading && !message.isError && !message.interviewQuestion && message.clinical && (
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-5 shadow-sm">
            <ResponseCard clinical={message.clinical} modeId={modeId as ChatModeId} />
          </div>
        )}

        {/* ── Wellness / education response ───────────────────────────── */}
        {!message.isLoading && !message.isError && !message.interviewQuestion && !message.clinical && message.wellness && (
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-5 shadow-sm">
            <WellnessCard data={message.wellness} />
          </div>
        )}

        {/* ── Plain text ──────────────────────────────────────────────── */}
        {!message.isLoading && !message.isError && !message.interviewQuestion && !message.clinical && !message.wellness && message.content && (
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {/* Timestamp */}
        {!message.isLoading && (
          <p className="text-[10px] text-gray-400 pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interview progress banner (shown in header during interview)
// ---------------------------------------------------------------------------

function InterviewBanner({
  session,
  onSkip,
}: {
  session: InterviewSession;
  onSkip: () => void;
}) {
  const answered = Object.keys(session.answers).length;
  const total = session.questions.length;
  return (
    <div className="shrink-0 bg-blue-50 border-b border-blue-100 px-5 py-2.5 flex items-center gap-3">
      <ClipboardList className="h-4 w-4 text-blue-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-blue-800">
          Clinical Interview in Progress — {session.symptomDisplayName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex-1 h-1 bg-blue-200 rounded-full overflow-hidden max-w-[120px]">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-blue-600 font-medium">{answered}/{total} answered</span>
        </div>
      </div>
      <button
        onClick={onSkip}
        className="text-[10px] text-blue-500 hover:text-blue-700 font-medium underline underline-offset-2 shrink-0"
      >
        Skip → diagnose now
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

const QUICK_PROMPTS: Record<ChatModeId, string[]> = {
  symptom:     ["chest pain", "headache", "fever for 3 days", "stomach pain after eating"],
  report:      ["HbA1c 8.2, Cholesterol 240, Creatinine 1.4", "CBC: WBC 14,000, Hb 9.2, Platelets 80,000"],
  radiology:   ["CXR shows bilateral infiltrates and pleural effusion", "CT brain: hypodense lesion in right parietal lobe"],
  drug:        ["Interaction between metformin and lisinopril", "Aspirin vs clopidogrel for ACS — dosing?"],
  research:    ["Latest guidelines for hypertension management 2024", "Evidence for statin therapy in diabetes"],
  risk:        ["Age 52, BMI 29, BP 148/92, HbA1c 6.5, ex-smoker"],
  scan:        ["Analysing an uploaded prescription", "Scan a medical test result"],
  care_finder: ["I have Type 2 diabetes — which specialist do I need?", "Newly diagnosed with hypertension — next steps?"],
};

function EmptyState({ mode, onPrompt }: { mode: ChatMode; onPrompt: (text: string) => void }) {
  const ModeIcon = mode.icon;
  const prompts = QUICK_PROMPTS[mode.id] ?? [];
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className={clsx("h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg mb-5", mode.color)}>
        <ModeIcon className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">PantheonMed AI</h2>
      <p className={clsx("text-sm font-semibold mb-1", mode.textColor)}>{mode.label}</p>
      <p className="text-sm text-gray-500 max-w-sm mb-2">{mode.description}</p>
      {mode.id === "symptom" && (
        <p className="text-xs text-blue-600 font-medium bg-blue-50 rounded-full px-3 py-1 mb-6">
          🩺 Clinical interview will run before diagnosis
        </p>
      )}
      {prompts.length > 0 && (
        <div className="w-full max-w-md space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Try an example</p>
          {prompts.map((p) => (
            <button key={p} onClick={() => onPrompt(p)}
              className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50 transition-all text-sm text-gray-700 hover:text-blue-700 group">
              <span className="flex items-center gap-2">
                <span className="flex-1">{p}</span>
                <span className="text-gray-300 group-hover:text-blue-400 text-lg">→</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MedicalChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMode, setCurrentMode] = useState<ChatMode>(DEFAULT_MODE);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session ID for conversation memory (backend remembers prior messages)
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  // ── Interview session state (ref to avoid stale closures in callbacks) ──
  const interviewRef = useRef<InterviewSession | null>(null);
  const [interviewActive, setInterviewActive] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // ── Message helpers ─────────────────────────────────────────────────────
  const addMessage = useCallback((msg: Omit<ChatMessage, "id" | "timestamp">): string => {
    const full: ChatMessage = { ...msg, id: crypto.randomUUID(), timestamp: new Date() };
    setMessages((prev) => [...prev, full]);
    return full.id;
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  // ── Run diagnosis after interview completes ──────────────────────────────
  const runDiagnosis = useCallback(async (session: InterviewSession, modeId: ChatModeId) => {
    const transitionMsg = buildTransitionMessage(session);
    const loadingId = addMessage({
      role: "assistant",
      content: transitionMsg,
      modeId,
      isLoading: true,
    });

    const mode = CHAT_MODES[modeId] ?? CHAT_MODES.symptom;
    const clinicalContext = buildDiagnosisContext(session);
    const fullPrompt = `${mode.promptPrefix}${clinicalContext}`;

    try {
      const data = await aiAPI.analyze(fullPrompt, sessionIdRef.current);
      const isClinical = data && (data.doctor_assessment || data.differential_diagnosis?.length || data.clinical_reasoning || data.risk_level);
      updateMessage(loadingId, {
        isLoading: false,
        content: "",
        clinical: isClinical ? data : null,
      });
    } catch (err) {
      updateMessage(loadingId, { isLoading: false, isError: true, content: getApiErrorMessage(err) });
    }

    interviewRef.current = null;
    setInterviewActive(false);
  }, [addMessage, updateMessage]);

  // ── Handle answer selection from InterviewCard ──────────────────────────
  const handleAnswerSelect = useCallback((
    msgId: string,
    questionId: string,
    selectedAnswers: string[],
  ) => {
    const session = interviewRef.current;
    if (!session) return;

    // Lock the question card
    updateMessage(msgId, {
      interviewAnswered: true,
      interviewSelectedAnswers: selectedAnswers,
    });

    // Check for emergency
    const emergency = checkEmergency(session, questionId, selectedAnswers);
    if (emergency && !session.emergencyTriggered) {
      interviewRef.current = {
        ...session,
        emergencyTriggered: true,
        emergencyReason: emergency.message,
      };
    }

    // Record answer
    const updated = recordAnswer(
      interviewRef.current ?? session,
      questionId,
      selectedAnswers,
    );
    interviewRef.current = updated;

    // Add user "bubble" showing what they selected
    addMessage({
      role: "user",
      content: selectedAnswers.join(", "),
      modeId: currentMode.id,
    });

    // Check if interview is complete
    if (isInterviewComplete(updated)) {
      setInterviewActive(false);
      runDiagnosis(updated, currentMode.id);
      return;
    }

    // Show next question
    const nextQ = getNextQuestion(updated);
    if (!nextQ) {
      setInterviewActive(false);
      runDiagnosis(updated, currentMode.id);
      return;
    }

    const nextIndex = updated.questionIndex; // already incremented by recordAnswer
    const total = updated.questions.length;

    // Check if this answer triggers emergency — attach to next question card
    const nextEmergency = updated.emergencyTriggered && !session.emergencyTriggered
      ? { message: interviewRef.current?.emergencyReason ?? "", action: "Call 112 immediately." }
      : null;

    addMessage({
      role: "assistant",
      content: "",
      modeId: currentMode.id,
      interviewQuestion: nextQ,
      interviewProgress: { current: nextIndex + 1, total },
      interviewSessionId: updated.id,
      interviewEmergencyAlert: nextEmergency,
    });
  }, [addMessage, currentMode.id, runDiagnosis, updateMessage]);

  // ── Handle skip interview ────────────────────────────────────────────────
  const handleSkipInterview = useCallback(() => {
    const session = interviewRef.current;
    if (!session) return;
    // Must have at least 1 answer to skip
    if (Object.keys(session.answers).length === 0) {
      runDiagnosis({ ...session }, currentMode.id);
    } else {
      runDiagnosis(session, currentMode.id);
    }
  }, [currentMode.id, runDiagnosis]);

  // ── Main send handler ────────────────────────────────────────────────────
  const handleSend = useCallback(async (text: string, attachments: Attachment[]) => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    setPendingAttachments([]);

    // Add user message
    addMessage({
      role: "user",
      content: trimmed,
      attachments,
      modeId: currentMode.id,
    });

    // ── INTENT CLASSIFICATION (Symptom mode only) ───────────────────────
    //
    // Before touching the clinical engine, classify the user's intent so
    // health goals ("weight loss krna hai") and knowledge questions
    // ("what is diabetes") are routed to the correct response pipeline
    // instead of being misidentified as symptom complaints.
    //
    //   SYMPTOM_QUERY      → clinical interview engine
    //   HEALTH_GOAL        → wellness coach AI response
    //   MEDICAL_KNOWLEDGE  → medical educator AI response
    //   GENERAL            → generic AI response with mode prompt
    //
    if (currentMode.id === "symptom" && !interviewRef.current && attachments.length === 0) {
      const { intent } = classifyIntent(trimmed);

      // ── Wellness / lifestyle goal ──────────────────────────────────────
      if (intent === "HEALTH_GOAL") {
        const loadingId = addMessage({
          role: "assistant",
          content: "Building your personalised wellness plan…",
          modeId: currentMode.id,
          isLoading: true,
          intentType: "HEALTH_GOAL" as MessageIntent,
        });
        try {
          const data = await aiAPI.analyze(buildWellnessPrompt(trimmed), sessionIdRef.current);
          const wellness = parseWellnessResponse(data);
          updateMessage(loadingId, {
            isLoading: false,
            content: "",
            wellness,
            intentType: "HEALTH_GOAL" as MessageIntent,
          });
        } catch (err) {
          updateMessage(loadingId, {
            isLoading: false,
            isError: true,
            content: getApiErrorMessage(err),
          });
        }
        return;
      }

      // ── Medical knowledge / education question ─────────────────────────
      if (intent === "MEDICAL_KNOWLEDGE") {
        const loadingId = addMessage({
          role: "assistant",
          content: "Looking up medical information…",
          modeId: currentMode.id,
          isLoading: true,
          intentType: "MEDICAL_KNOWLEDGE" as MessageIntent,
        });
        try {
          const data = await aiAPI.analyze(buildEducationalPrompt(trimmed), sessionIdRef.current);
          const wellness = parseWellnessResponse(data);
          updateMessage(loadingId, {
            isLoading: false,
            content: "",
            wellness,
            intentType: "MEDICAL_KNOWLEDGE" as MessageIntent,
          });
        } catch (err) {
          updateMessage(loadingId, {
            isLoading: false,
            isError: true,
            content: getApiErrorMessage(err),
          });
        }
        return;
      }

      // ── Symptom complaint → clinical interview ─────────────────────────
      if (intent === "SYMPTOM_QUERY") {
        const detected = detectPrimarySymptom(trimmed);
        if (detected) {
          const session = createInterviewSession(trimmed, detected.key, detected.displayName);
          interviewRef.current = session;
          setInterviewActive(true);

          const firstQ = getNextQuestion(session);
          const intro = buildInterviewIntro(detected.displayName);
          const total = session.questions.length;

          addMessage({
            role: "assistant",
            content: intro,
            modeId: currentMode.id,
            interviewQuestion: firstQ ?? undefined,
            interviewProgress: { current: 1, total },
            interviewSessionId: session.id,
          });
          return;
        }
        // Symptom intent but no structured keyword — fall through to direct AI call
      }

      // ── GENERAL intent in symptom mode — no specific routing ──────────
      // Falls through to the direct AI call below.
    }

    // ── If interview is active and user types free text — treat as skip ─
    if (interviewRef.current && trimmed) {
      const session = interviewRef.current;
      const enriched = `${buildDiagnosisContext(session)}\nAdditional patient note: ${trimmed}`;
      interviewRef.current = null;
      setInterviewActive(false);
      const mode = CHAT_MODES[currentMode.id] ?? CHAT_MODES.symptom;
      const fullPrompt = `${mode.promptPrefix}${enriched}`;
      const loadingId = addMessage({ role: "assistant", content: "", modeId: currentMode.id, isLoading: true });
      try {
        const data = await aiAPI.analyze(fullPrompt, sessionIdRef.current);
        const isClinical = data && (data.doctor_assessment || data.differential_diagnosis?.length || data.clinical_reasoning || data.risk_level);
        updateMessage(loadingId, { isLoading: false, clinical: isClinical ? data : null, content: "" });
      } catch (err) {
        updateMessage(loadingId, { isLoading: false, isError: true, content: getApiErrorMessage(err) });
      }
      return;
    }

    // ── Direct AI call (non-symptom modes or GENERAL intent) ─────────────
    const loadingId = addMessage({
      role: "assistant",
      content: "",
      modeId: currentMode.id,
      isLoading: true,
    });

    const attachmentContext = attachments.length > 0
      ? `\n[Patient attached: ${attachments.map((a) => a.name).join(", ")}]`
      : "";
    const mode = CHAT_MODES[currentMode.id] ?? CHAT_MODES.symptom;
    const fullPrompt = `${mode.promptPrefix}${trimmed}${attachmentContext}`;

    try {
      const data = await aiAPI.analyze(fullPrompt, sessionIdRef.current);
      const isClinical = data && (data.doctor_assessment || data.differential_diagnosis?.length || data.clinical_reasoning || data.risk_level);
      updateMessage(loadingId, {
        isLoading: false,
        clinical: isClinical ? data : null,
        content: isClinical ? "" : (data as { answer?: string }).answer ?? JSON.stringify(data),
      });
    } catch (err) {
      updateMessage(loadingId, {
        isLoading: false,
        isError: true,
        content: getApiErrorMessage(err),
      });
    }
  }, [addMessage, updateMessage, currentMode]);

  const handleQuickPrompt = useCallback((text: string) => handleSend(text, []), [handleSend]);

  const handleCapture = useCallback((dataUrl: string, fileName: string) => {
    setPendingAttachments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: "capture", name: fileName, preview: dataUrl },
    ]);
  }, []);

  const handleClear = () => {
    if (messages.length === 0) return;
    if (confirm("Clear this conversation?")) {
      setMessages([]);
      interviewRef.current = null;
      setInterviewActive(false);
    }
  };

  const isLoading = messages.some((m) => m.isLoading);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
          <Stethoscope className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-gray-900 leading-none">PantheonMed AI</h1>
          <p className="text-xs text-gray-500 mt-0.5">Clinical Decision Support System</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx(
            "flex items-center gap-1 text-[10px] font-semibold rounded-full px-2.5 py-1",
            isOnline ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
          )}>
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? "Online" : "Offline"}
          </span>
          <span className={clsx(
            "text-[10px] font-semibold rounded-full px-2.5 py-1 hidden sm:flex items-center gap-1 bg-gray-100",
            currentMode.textColor,
          )}>
            {React.createElement(currentMode.icon, { className: "h-3 w-3" })}
            {currentMode.label}
          </span>
          {messages.length > 0 && (
            <button onClick={handleClear}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Clear conversation">
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Interview progress banner ─────────────────────────────────────── */}
      {interviewActive && interviewRef.current && (
        <InterviewBanner
          session={interviewRef.current}
          onSkip={handleSkipInterview}
        />
      )}

      {/* ── Message list ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
        {messages.length === 0 ? (
          <EmptyState mode={currentMode} onPrompt={handleQuickPrompt} />
        ) : (
          <>
            {messages.map((msg) =>
              msg.role === "user" ? (
                <UserBubble key={msg.id} message={msg} />
              ) : (
                <AiBubble key={msg.id} message={msg} onAnswerSelect={handleAnswerSelect} />
              ),
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-amber-50 border-t border-amber-100 px-5 py-2 text-center hidden sm:block">
        <p className="text-[10px] text-amber-700">
          <Bot className="h-3 w-3 inline mr-1 mb-0.5" />
          AI-generated assessments are informational only. Always consult a qualified healthcare professional.
        </p>
      </div>

      {/* ── Input area ───────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-4 sm:px-6 py-4">
        {interviewActive && (
          <p className="text-xs text-blue-600 font-medium text-center mb-2">
            🩺 Please select an option in the question card above to continue
          </p>
        )}
        <InputBar
          currentModeId={currentMode.id}
          onModeChange={(mode) => {
            setCurrentMode(mode);
            interviewRef.current = null;
            setInterviewActive(false);
          }}
          onSend={handleSend}
          onCameraOpen={() => setShowCamera(true)}
          disabled={isLoading || !isOnline}
          pendingAttachments={pendingAttachments}
          onAddAttachment={(att) => setPendingAttachments((p) => [...p, att])}
          onRemoveAttachment={(id) => setPendingAttachments((p) => p.filter((a) => a.id !== id))}
        />
      </div>

      {/* ── Camera modal ─────────────────────────────────────────────────── */}
      {showCamera && <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
}
