"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { chatAPI, ChatMessage } from "@/services/api";
import { saveGuestChatBuffer } from "@/lib/auth";
import MessageBubble, { TypingIndicator, extractJsonText } from "./MessageBubble";
import { Send, AlertCircle, Phone } from "lucide-react";
import clsx from "clsx";

/* ── Regex-based follow-up extraction (fallback for plain text) ─────────── */
function extractFollowUpQuestions(text: string): string[] {
  if (!text) return [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences
    .map(s => s.trim())
    .filter(s => s.endsWith("?") && s.length > 20 && s.length < 120)
    .slice(0, 3);
}

/* ── Smart chip extraction — prefers structured JSON follow_up_questions ─── */
function extractFollowUpChips(content: string): string[] {
  // 1. Try to parse structured JSON from the content
  try {
    const jsonText = extractJsonText(content);
    if (jsonText) {
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      // Use structured follow_up_questions if available
      if (Array.isArray(parsed.follow_up_questions) && (parsed.follow_up_questions as string[]).length > 0) {
        return (parsed.follow_up_questions as string[])
          .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          .slice(0, 3);
      }
      // Fall back to extracting questions from doctor_assessment text
      if (typeof parsed.doctor_assessment === "string") {
        const chips = extractFollowUpQuestions(parsed.doctor_assessment);
        if (chips.length > 0) return chips;
      }
    }
  } catch { /* ignore parse errors, fall through to regex */ }

  // 2. Regex fallback on raw content (for legacy plain-text responses)
  return extractFollowUpQuestions(content);
}

/* ── Quick symptom chips ─────────────────────────────────────────────────── */
const QUICK_CHIPS = [
  { label: "Chest Pain",      emoji: "💓" },
  { label: "Headache",        emoji: "🧠" },
  { label: "High Fever",      emoji: "🌡️" },
  { label: "High Blood Pressure", emoji: "📊" },
  { label: "Diabetes",        emoji: "🩸" },
  { label: "Stomach Pain",    emoji: "🫁" },
  { label: "Breathlessness",  emoji: "🫁" },
  { label: "Pregnancy Query", emoji: "🤰" },
];

/* ── Emergency keywords (trigger red banner) ─────────────────────────────── */
const EMERGENCY_RE = /call\s*112\s*now|seek\s*immediate\s*(medical|attention|care)|emergency\s*(care|room)|severe\s*(bleeding|chest\s*pain|stroke)/i;

/* ── Props ────────────────────────────────────────────────────────────────── */
interface Props {
  initialMessage?: string;
  initialMessages?: ChatMessage[];
  initialSessionId?: string;
  guestSessionId?: string;
  placeholder?: string;
  className?: string;
  onSessionCreated?: (id: string) => void;
  /** Called whenever the messages array changes — lets parents access messages for export */
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

export default function ChatWindow({
  initialMessage,
  initialMessages,
  initialSessionId,
  guestSessionId,
  placeholder,
  className,
  onSessionCreated,
  onMessagesChange,
}: Props) {
  const [messages, setMessages]       = useState<ChatMessage[]>(initialMessages ?? []);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [sessionId, setSessionId]     = useState<string | undefined>(initialSessionId);
  const [newIds, setNewIds]           = useState<Set<string>>(new Set());
  const [showEmergency, setShowEmergency] = useState(false);
  const [followUpChips, setFollowUpChips] = useState<string[]>([]);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const sentInitial = useRef(false);

  const scrollBottom = useCallback((instant = false) => {
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth" }),
      60,
    );
  }, []);

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) scrollBottom(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;
    setError("");
    setShowEmergency(false);
    setFollowUpChips([]);  // clear previous suggestions on new message

    const tempUser: ChatMessage = {
      id: `tmp-${Date.now()}`,
      session_id: sessionId ?? "",
      role: "user",
      content: content.trim(),
      has_disclaimer: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUser]);
    setNewIds(s => new Set(s).add(tempUser.id));
    scrollBottom();
    setLoading(true);

    try {
      const res = await chatAPI.send(
        content.trim(),
        guestSessionId ? undefined : sessionId,
        guestSessionId,
      );
      if (!sessionId && !guestSessionId) {
        setSessionId(res.session_id);
        onSessionCreated?.(res.session_id);
      }
      setMessages(prev => {
        const next = [
          ...prev.filter(m => m.id !== tempUser.id),
          res.message,
          res.ai_response,
        ];
        if (guestSessionId) {
          saveGuestChatBuffer(next.map(m => ({ role: m.role, content: m.content })));
        }
        // Check for emergency in AI response
        if (EMERGENCY_RE.test(res.ai_response.content)) setShowEmergency(true);
        // Extract follow-up question chips — prefers structured JSON data
        const chips = extractFollowUpChips(res.ai_response.content);
        if (chips.length > 0) setFollowUpChips(chips);
        // Notify parent of message changes (for export)
        onMessagesChange?.(next);
        return next;
      });
      setNewIds(s => {
        const n = new Set(s);
        n.delete(tempUser.id);
        n.add(res.message.id);
        n.add(res.ai_response.id);
        return n;
      });
      scrollBottom();
    } catch (e: unknown) {
      setMessages(prev => prev.filter(m => m.id !== tempUser.id));
      const err = e as { response?: { data?: { detail?: string }; status?: number }; code?: string; message?: string };
      const detail = err?.response?.data?.detail;
      const isNetwork = err?.code === "ERR_NETWORK" || err?.message === "Network Error";
      const isTimeout = err?.code === "ECONNABORTED";
      let errorMsg: string;
      if (detail) {
        errorMsg = typeof detail === "string" ? detail : "An error occurred. Please try again.";
      } else if (isTimeout) {
        errorMsg = "The request timed out — the AI is taking longer than usual. Please try again.";
      } else if (isNetwork) {
        errorMsg = "Server temporarily unavailable. Please try again in a moment.";
      } else {
        errorMsg = "Something went wrong. Please try again.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, guestSessionId, onSessionCreated, scrollBottom]);

  useEffect(() => {
    if (initialMessage && !sentInitial.current) { sentInitial.current = true; send(initialMessage); }
  }, [initialMessage, send]);

  useEffect(() => {
    const handler = (e: Event) => { const d = (e as CustomEvent<string>).detail; if (d) send(d); };
    window.addEventListener("pm:quick-prompt", handler);
    return () => window.removeEventListener("pm:quick-prompt", handler);
  }, [send]);

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); send(input); setInput(""); }
  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); setInput(""); }
  }
  function handleChip(label: string) {
    setInput(label);
    inputRef.current?.focus();
  }

  return (
    <div className={clsx("flex flex-col bg-[#F8FAFC]", className)}>

      {/* ── Emergency Alert Banner ──────────────────────────────────────── */}
      {showEmergency && (
        <div className="shrink-0 bg-red-600 text-white px-4 py-3 flex items-center gap-3 alert-slide-down emergency-pulse">
          <span className="text-xl shrink-0">🚨</span>
          <div className="flex-1">
            <p className="font-bold text-sm leading-tight">Possible medical emergency detected</p>
            <p className="text-red-100 text-xs mt-0.5">Seek medical attention immediately or call emergency services.</p>
          </div>
          <a href="tel:112" className="flex items-center gap-1.5 bg-white text-red-600 font-bold text-xs px-3 py-1.5 rounded-xl shrink-0 hover:bg-red-50 transition-colors">
            <Phone size={12} /> Call 112
          </a>
          <button onClick={() => setShowEmergency(false)} className="text-red-200 hover:text-white transition-colors text-lg leading-none shrink-0">×</button>
        </div>
      )}

      {/* ── Messages area ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-5">

        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center animate-fade-in">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-[0_8px_24px_rgba(37,99,235,0.35)]">
                <span className="text-3xl">🩺</span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">AI</span>
              </div>
            </div>
            <h3 className="font-bold text-[#0F1E4A] text-xl mb-2 tracking-tight">
              How can I assist you today?
            </h3>
            <p className="text-[13px] text-gray-400 max-w-xs leading-relaxed mb-6">
              Describe symptoms, ask about medications, or request a lab report explanation.
              I respond in your language — Hindi or English.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {["Chest pain and sweating", "Fever for 3 days", "My HbA1c is 8.2%", "Drug interaction check", "Interpret my blood report"].map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-[12px] bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-700 px-3 py-1.5 rounded-full transition-all duration-150 shadow-sm font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} isNew={newIds.has(msg.id)} />
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm animate-fade-in max-w-lg">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Follow-up question chips (dynamic, appears after AI asks questions) ── */}
      {followUpChips.length > 0 && !loading && (
        <div className="shrink-0 bg-blue-50 border-t border-blue-100 px-4 py-2">
          <div className="flex items-start gap-2 overflow-x-auto no-scrollbar pb-0.5">
            <span className="shrink-0 text-[10px] text-blue-500 font-semibold uppercase tracking-wider pt-1.5 pr-1 whitespace-nowrap">
              Answer:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {followUpChips.map((q) => (
                <button
                  key={q}
                  onClick={() => { send(q); setInput(""); }}
                  className="text-[12px] bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full transition-all font-medium text-left leading-tight"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Symptom chips ───────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <span className="shrink-0 text-[10px] text-gray-400 font-semibold uppercase tracking-wider pr-0.5 whitespace-nowrap">
            Quick:
          </span>
          {QUICK_CHIPS.map(({ label, emoji }) => (
            <button
              key={label}
              onClick={() => handleChip(label)}
              className="symptom-chip shrink-0"
            >
              <span className="text-[11px]">{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input bar ───────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 md:px-5 pb-4 pt-2.5 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex items-end gap-2.5">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
              }}
              onKeyDown={handleKey}
              placeholder={placeholder ?? "Describe symptoms or ask a medical question… (Hindi or English)"}
              disabled={loading}
              className="w-full text-[14px] bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 placeholder-gray-400 transition-all duration-200 disabled:opacity-60 leading-relaxed"
              style={{ minHeight: "48px", maxHeight: "140px" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:bg-blue-200 text-white flex items-center justify-center shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] transition-all duration-200 hover:-translate-y-0.5 disabled:shadow-none disabled:translate-y-0 shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-[10px] text-gray-400 text-center mt-2 leading-relaxed">
          AI provides informational guidance only · Not a substitute for professional medical advice · Emergency: call <strong>112</strong>
        </p>
      </div>
    </div>
  );
}
