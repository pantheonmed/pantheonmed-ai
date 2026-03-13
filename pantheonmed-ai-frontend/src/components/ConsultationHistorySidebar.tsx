"use client";
import { useEffect, useState, useCallback } from "react";
import { chatAPI, ChatMessage } from "@/services/api";
import {
  X, Clock, MessageSquare, Loader2, AlertCircle, RefreshCw,
  ChevronRight, Stethoscope,
} from "lucide-react";
import clsx from "clsx";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Session {
  session_id: string | null;
  messages: ChatMessage[];
  total: number;
  /** Derived: preview text of first user message */
  preview: string;
  /** Derived: formatted time */
  timeLabel: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user clicks a session to restore it */
  onRestoreSession: (messages: ChatMessage[], sessionId?: string) => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────  */
function relativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function extractPreview(messages: ChatMessage[]): string {
  const first = messages.find(m => m.role === "user");
  if (!first) return "Empty session";
  const text = first.content.trim();
  return text.length > 60 ? text.slice(0, 60) + "…" : text;
}

function countExchanges(messages: ChatMessage[]): number {
  return messages.filter(m => m.role === "user").length;
}

/* ── Session card ─────────────────────────────────────────────────────────── */
function SessionCard({
  session,
  onClick,
}: {
  session: Session;
  onClick: () => void;
}) {
  const exchanges = countExchanges(session.messages);
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 bg-white hover:bg-blue-50/60 border border-gray-100 hover:border-blue-200 rounded-xl transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-blue-800">
            {session.preview}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Clock size={10} className="text-gray-400 shrink-0" />
            <span className="text-[10.5px] text-gray-400">{session.timeLabel}</span>
            <span className="text-gray-200">·</span>
            <MessageSquare size={10} className="text-gray-400 shrink-0" />
            <span className="text-[10.5px] text-gray-400">
              {exchanges} {exchanges === 1 ? "exchange" : "exchanges"}
            </span>
          </div>
        </div>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 shrink-0 mt-1 transition-colors" />
      </div>
    </button>
  );
}

/* ── Main sidebar ─────────────────────────────────────────────────────────── */
export default function ConsultationHistorySidebar({ isOpen, onClose, onRestoreSession }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchHistory = useCallback(async () => {
    setStatus("loading");
    try {
      const hist = await chatAPI.getHistory(100);
      if (hist.messages && hist.messages.length > 0) {
        // Group messages into a single "current" session for now
        // (Backend exposes the most recent session — extend here if multiple sessions are available)
        const session: Session = {
          session_id: hist.session_id,
          messages: hist.messages,
          total: hist.total,
          preview: extractPreview(hist.messages),
          timeLabel: relativeTime(hist.messages[0]?.created_at ?? new Date().toISOString()),
        };
        setSessions([session]);
        setStatus("loaded");
      } else {
        setSessions([]);
        setStatus("loaded");
      }
    } catch {
      setStatus("error");
    }
  }, []);

  // Fetch when sidebar opens
  useEffect(() => {
    if (isOpen && status === "idle") {
      fetchHistory();
    }
  }, [isOpen, status, fetchHistory]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          "fixed inset-0 bg-black/30 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <aside
        className={clsx(
          "fixed right-0 top-0 h-full w-80 bg-[#F8FAFC] border-l border-gray-200 z-50",
          "shadow-2xl flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0F1E4A] flex items-center justify-center">
              <Stethoscope size={13} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900 leading-tight">Consultation History</p>
              <p className="text-[10px] text-gray-400">Your past AI doctor consultations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X size={14} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 size={24} className="animate-spin text-blue-400" />
              <p className="text-[12px] font-medium">Loading consultations…</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle size={18} className="text-red-500" />
              </div>
              <p className="text-[12px] font-medium text-gray-600 text-center">
                Failed to load history
              </p>
              <button
                onClick={fetchHistory}
                className="flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold hover:underline"
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {status === "loaded" && sessions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageSquare size={20} className="text-gray-300" />
              </div>
              <p className="text-[12px] font-medium text-center">
                No past consultations yet.<br />Start a conversation to see history here.
              </p>
            </div>
          )}

          {status === "loaded" && sessions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-gray-400 px-1 mb-1">
                Recent Consultations
              </p>
              {sessions.map((session, i) => (
                <SessionCard
                  key={session.session_id ?? i}
                  session={session}
                  onClick={() => {
                    onRestoreSession(session.messages, session.session_id ?? undefined);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-white border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center leading-relaxed">
            Consultation history is encrypted and private. Only you can see your medical chats.
          </p>
        </div>
      </aside>
    </>
  );
}
