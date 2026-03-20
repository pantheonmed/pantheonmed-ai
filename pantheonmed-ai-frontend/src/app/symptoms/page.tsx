"use client";
import { useState } from "react";
import { analyzeSymptoms } from "@/api/client";
import { ChatMessage } from "@/services/api";
import MessageBubble, { TypingIndicator } from "@/components/MessageBubble";
import { Stethoscope, X, AlertCircle, Thermometer, Search, ChevronRight } from "lucide-react";
import clsx from "clsx";

// ── Symptom data ────────────────────────────────────────────────────────────
const SYMPTOM_GROUPS = [
  {
    group: "General",
    icon: "🌡️",
    items: ["Fever", "Fatigue", "Weakness", "Night sweats", "Chills", "Weight loss", "Loss of appetite"],
  },
  {
    group: "Head & Neuro",
    icon: "🧠",
    items: ["Headache", "Dizziness", "Confusion", "Blurred vision", "Neck stiffness", "Seizure", "Memory loss"],
  },
  {
    group: "Respiratory",
    icon: "🫁",
    items: ["Cough", "Shortness of breath", "Chest pain", "Wheezing", "Blood in sputum", "Sore throat"],
  },
  {
    group: "Digestive",
    icon: "🍽️",
    items: ["Nausea", "Vomiting", "Diarrhea", "Constipation", "Abdominal pain", "Bloating", "Heartburn"],
  },
  {
    group: "Skin & Musculo",
    icon: "💪",
    items: ["Rash", "Joint pain", "Muscle aches", "Swelling", "Skin yellowing", "Itching"],
  },
  {
    group: "Urinary",
    icon: "💧",
    items: ["Frequent urination", "Painful urination", "Blood in urine", "Dark urine", "Reduced urine"],
  },
];

export default function SymptomsPage() {
  const [selected, setSelected]   = useState<string[]>([]);
  const [duration, setDuration]   = useState("1-3 days");
  const [severity, setSeverity]   = useState("Moderate");
  const [search, setSearch]       = useState("");
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [step, setStep]           = useState<"select" | "result">("select");

  const toggle = (s: string) =>
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const allSymptoms = SYMPTOM_GROUPS.flatMap(g => g.items);
  const filtered = search
    ? allSymptoms.filter(s => s.toLowerCase().includes(search.toLowerCase()))
    : null;

  const analyze = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setError("");
    setStep("result");
    try {
      const result = await analyzeSymptoms({
        symptoms: selected,
        context: `Duration: ${duration}. Severity: ${severity}. What could be the possible causes? Please explain each in simple language and advise what I should do next.`,
      });
      const data = result?.data;
      if (data?.ai_response) {
        const userMsg: ChatMessage = {
          id: data.session_id,
          session_id: data.session_id,
          role: "user",
          content: `Symptoms: ${selected.join(", ")}`,
          has_disclaimer: false,
          created_at: new Date().toISOString(),
        };
        const aiMsg: ChatMessage = {
          ...data.ai_response,
          id: data.ai_response.id || crypto.randomUUID(),
          session_id: data.session_id,
          role: "assistant",
          content: data.ai_response.content,
          has_disclaimer: data.ai_response.has_disclaimer ?? true,
          created_at: data.ai_response.created_at || new Date().toISOString(),
        };
        setMessages([userMsg, aiMsg]);
      }
    } catch {
      setError("Server not connected. Please try again.");
      setStep("select");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelected([]);
    setMessages([]);
    setError("");
    setStep("select");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-5 py-4 bg-white border-b border-[var(--c-border)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
          <Stethoscope size={18} className="text-sky-600" />
        </div>
        <div className="flex-1">
          <h1 className="font-display font-600 text-[var(--c-accent)] text-lg leading-tight">Symptom Checker</h1>
          <p className="font-body text-xs text-[var(--c-muted)]">Select your symptoms to get AI analysis</p>
        </div>
        {step === "result" && (
          <button onClick={reset}
            className="font-body text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl transition-all duration-150">
            ← Start Over
          </button>
        )}
      </header>

      {step === "select" ? (
        <div className="flex-1 overflow-y-auto px-4 py-5 pb-24 md:pb-5">
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search symptom…"
                className="w-full font-body text-sm bg-white border border-[var(--c-border)] rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* Search results */}
            {filtered && (
              <div className="bg-white rounded-2xl border border-[var(--c-border)] p-4 shadow-[var(--shadow-sm)]">
                <p className="font-body text-xs text-[var(--c-muted)] mb-3">
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {filtered.map(s => (
                    <Chip key={s} label={s} active={selected.includes(s)} onClick={() => toggle(s)} />
                  ))}
                </div>
              </div>
            )}

            {/* Groups */}
            {!filtered && SYMPTOM_GROUPS.map((g) => (
              <div key={g.group} className="bg-white rounded-2xl border border-[var(--c-border)] p-4 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{g.icon}</span>
                  <h3 className="font-display font-600 text-[var(--c-accent)] text-sm">{g.group}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.items.map(s => (
                    <Chip key={s} label={s} active={selected.includes(s)} onClick={() => toggle(s)} />
                  ))}
                </div>
              </div>
            ))}

            {/* Duration + Severity */}
            <div className="bg-white rounded-2xl border border-[var(--c-border)] p-4 shadow-[var(--shadow-sm)] grid grid-cols-2 gap-4">
              <div>
                <label className="font-body text-xs font-medium text-[var(--c-muted)] mb-2 block">Duration</label>
                <select
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="w-full font-body text-sm border border-[var(--c-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-400 bg-white"
                >
                  {["<24 hours", "1-3 days", "4-7 days", "1-2 weeks", ">2 weeks"].map(d => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-body text-xs font-medium text-[var(--c-muted)] mb-2 block">Severity</label>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value)}
                  className="w-full font-body text-sm border border-[var(--c-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-400 bg-white"
                >
                  {["Mild", "Moderate", "Severe"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Results */
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-24 md:pb-5">
          {/* Selected symptoms badge */}
          <div className="max-w-2xl mx-auto bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3">
            <p className="font-body text-xs text-teal-600 font-medium mb-2">Analyzing symptoms:</p>
            <div className="flex flex-wrap gap-1.5">
              {selected.map(s => (
                <span key={s} className="bg-teal-600 text-white text-[11px] font-body font-medium px-2.5 py-1 rounded-lg">{s}</span>
              ))}
            </div>
          </div>

          {messages.map((m, i) => (
            <div key={m.id} className="max-w-2xl mx-auto">
              <MessageBubble message={m} isNew={i === messages.length - 1} />
            </div>
          ))}
          {loading && (
            <div className="max-w-2xl mx-auto">
              <TypingIndicator />
            </div>
          )}
          {error && (
            <div className="max-w-2xl mx-auto flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Sticky CTA */}
      {step === "select" && (
        <div className="shrink-0 border-t border-[var(--c-border)] bg-white px-4 py-3 md:py-4">
          <div className="max-w-2xl mx-auto">
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selected.map(s => (
                  <span key={s}
                    onClick={() => toggle(s)}
                    className="cursor-pointer flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-body px-2.5 py-1 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors duration-150">
                    {s} <X size={10} />
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={analyze}
              disabled={selected.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-200 text-white font-body font-medium py-3.5 rounded-xl shadow-[var(--shadow-teal)] transition-all duration-200 disabled:shadow-none"
            >
              <Thermometer size={16} />
              Analyze {selected.length > 0 ? `${selected.length} Symptom${selected.length > 1 ? "s" : ""}` : "Symptoms"}
              {selected.length > 0 && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "font-body text-xs font-medium px-3 py-1.5 rounded-xl border transition-all duration-150",
        active
          ? "bg-teal-600 text-white border-teal-600 shadow-[var(--shadow-teal)]"
          : "bg-slate-50 text-[var(--c-muted)] border-[var(--c-border)] hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50"
      )}>
      {active ? "✓ " : ""}{label}
    </button>
  );
}
