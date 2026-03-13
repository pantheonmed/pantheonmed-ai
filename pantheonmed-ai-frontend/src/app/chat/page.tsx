"use client";
import { useEffect, useState } from "react";
import ChatWindow from "@/components/ChatWindow";
import ConsultationHistorySidebar from "@/components/ConsultationHistorySidebar";
import PrintReport from "@/components/PrintReport";
import { chatAPI, ChatMessage } from "@/services/api";
import { isGuest, getGuestSessionId } from "@/lib/auth";
import { Activity, Plus, Zap, History, Loader2, UserX, BookOpen } from "lucide-react";
import Link from "next/link";

const QUICK_PROMPTS = [
  "I have chest pain and shortness of breath",
  "Mera HbA1c 8.2% hai — kya yeh normal hai?",
  "My blood pressure is 140/90 — should I be worried?",
  "What are the symptoms of dengue fever?",
  "Can I take ibuprofen with paracetamol?",
  "My platelet count is 45,000 — is that critical?",
];

type HistoryStatus = "loading" | "loaded" | "empty" | "error" | "guest";

export default function ChatPage() {
  const [chatKey, setChatKey]               = useState(0);
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);
  const [historySessionId, setHistorySessionId] = useState<string | undefined>();
  const [historyStatus, setHistoryStatus]   = useState<HistoryStatus>("loading");
  const [historyCount, setHistoryCount]     = useState(0);
  const [isNewChat, setIsNewChat]           = useState(false);
  const [guestSessionId, setGuestSessionId] = useState<string | undefined>();
  // History sidebar + export
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [liveMessages, setLiveMessages]     = useState<ChatMessage[]>([]);

  // Load history (authenticated) or set up guest session
  useEffect(() => {
    if (isGuest()) {
      const gid = getGuestSessionId();
      setGuestSessionId(gid);
      setHistoryStatus("guest");
      return;
    }

    let cancelled = false;
    async function fetchHistory() {
      try {
        const hist = await chatAPI.getHistory(50);
        if (cancelled) return;
        if (hist.messages && hist.messages.length > 0) {
          setHistoryMessages(hist.messages);
          setHistorySessionId(hist.session_id ?? undefined);
          setHistoryCount(hist.total);
          setHistoryStatus("loaded");
        } else {
          setHistoryStatus("empty");
        }
      } catch {
        if (!cancelled) setHistoryStatus("error");
      }
    }
    fetchHistory();
    return () => { cancelled = true; };
  }, []);

  function startNewChat() {
    setIsNewChat(true);
    setHistoryMessages([]);
    setHistorySessionId(undefined);
    setLiveMessages([]);
    setChatKey(k => k + 1);
  }

  function restoreSession(messages: ChatMessage[], sessionId?: string) {
    setIsNewChat(false);
    setHistoryMessages(messages);
    setHistorySessionId(sessionId);
    setLiveMessages(messages);
    setChatKey(k => k + 1);
  }

  const showHistory = !isNewChat && historyStatus === "loaded";
  const isGuestMode = historyStatus === "guest";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b border-gray-200 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center shadow-md">
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-blue-900 text-base leading-tight tracking-tight">
                PantheonMed AI
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 font-medium">
                  Clinical Decision Support · ICMR-aligned
                </p>
                {historyStatus === "loaded" && !isNewChat && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                    <History size={9} />
                    {historyCount} previous {historyCount === 1 ? "exchange" : "exchanges"} restored
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Guest badge */}
            {isGuestMode && (
              <span className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">
                <UserX size={11} />
                Guest Mode
              </span>
            )}
            {/* Online status */}
            {!isGuestMode && (
              <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI Online
              </div>
            )}
            {/* Export button */}
            <PrintReport messages={liveMessages} compact />
            {/* History sidebar (authenticated only) */}
            {!isGuestMode && (
              <button
                onClick={() => setShowHistorySidebar(true)}
                title="Consultation history"
                className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-700 text-sm font-medium px-3 py-2 rounded-xl transition-all duration-150 shadow-sm"
              >
                <BookOpen size={14} />
                <span className="hidden sm:inline">History</span>
              </button>
            )}
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-xl transition-all duration-150 shadow-sm"
            >
              <Plus size={14} /> New Chat
            </button>
          </div>
        </div>
      </header>

      {/* ── Quick prompts ──────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          <span className="shrink-0 flex items-center gap-1 text-xs text-gray-400 font-medium pr-1">
            <Zap size={11} className="text-blue-400" />
            Quick:
          </span>
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => {
                startNewChat();
                // Wait for remount, then dispatch the prompt
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("pm:quick-prompt", { detail: p }));
                }, 80);
              }}
              className="shrink-0 bg-gray-50 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-700 text-xs px-3 py-1.5 rounded-full transition-all duration-150 whitespace-nowrap font-medium"
            >
              {p.length > 38 ? p.slice(0, 38) + "…" : p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Guest sign-in banner ───────────────────────────────────────────── */}
      {isGuestMode && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-medium">
            <UserX size={14} className="text-amber-600 shrink-0" />
            <span>You&apos;re chatting as a guest. Chats are <strong>not saved</strong> and will be lost on refresh.</span>
          </div>
          <Link
            href="/login"
            className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign in to save
          </Link>
        </div>
      )}

      {/* ── Loading skeleton while history fetches ─────────────────────────── */}
      {historyStatus === "loading" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 animate-fade-in">
          <Loader2 size={28} className="animate-spin text-blue-400" />
          <p className="text-sm font-medium">Loading your chat history…</p>
        </div>
      )}

      {/* ── Chat window ────────────────────────────────────────────────────── */}
      {historyStatus !== "loading" && (
        <ChatWindow
          key={chatKey}
          initialMessages={showHistory ? historyMessages : []}
          initialSessionId={showHistory ? historySessionId : undefined}
          guestSessionId={isGuestMode ? guestSessionId : undefined}
          placeholder="Describe symptoms or ask a medical question…"
          className="flex-1 overflow-hidden"
          onMessagesChange={msgs => setLiveMessages(msgs)}
        />
      )}

      {/* ── Consultation history sidebar ────────────────────────────────────── */}
      {!isGuestMode && (
        <ConsultationHistorySidebar
          isOpen={showHistorySidebar}
          onClose={() => setShowHistorySidebar(false)}
          onRestoreSession={restoreSession}
        />
      )}
    </div>
  );
}
