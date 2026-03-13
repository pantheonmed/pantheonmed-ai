"use client";
import { useState } from "react";
import { Stethoscope, Send, Plus, X, RotateCcw, ChevronRight } from "lucide-react";
import { aiAPI, MedicalToolResponse } from "@/services/api";
import MedicalToolResult, { ToolLoadingState } from "@/components/MedicalToolResult";
import clsx from "clsx";

const TRIAGE_FOLLOW_UPS = [
  "How long have you had these symptoms?",
  "Rate severity 1-10",
  "Any fever?",
  "Any relevant medical history?",
];

const QUICK_SYMPTOMS = [
  "Chest pain", "Headache", "Fever", "Cough", "Shortness of breath",
  "Nausea", "Dizziness", "Back pain", "Abdominal pain", "Fatigue",
];

type Step = "input" | "followup" | "result";

export default function SymptomCheckerPage() {
  const [symptoms, setSymptoms]       = useState<string[]>([]);
  const [input, setInput]             = useState("");
  const [followUps, setFollowUps]     = useState<Record<string, string>>({});
  const [step, setStep]               = useState<Step>("input");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<MedicalToolResponse | null>(null);
  const [error, setError]             = useState("");

  function addSymptom() {
    const s = input.trim();
    if (s && !symptoms.includes(s)) setSymptoms(p => [...p, s]);
    setInput("");
  }

  function removeSymptom(s: string) {
    setSymptoms(p => p.filter(x => x !== s));
  }

  function addQuick(s: string) {
    if (!symptoms.includes(s)) setSymptoms(p => [...p, s]);
  }

  function reset() {
    setSymptoms([]); setInput(""); setFollowUps({});
    setStep("input"); setResult(null); setError("");
  }

  async function analyze() {
    if (symptoms.length === 0) return;
    setLoading(true); setError("");
    try {
      const fuText = Object.entries(followUps)
        .filter(([, v]) => v.trim())
        .map(([q, a]) => `${q}: ${a}`)
        .join("\n");

      const prompt = [
        `SYMPTOM CHECKER — Clinical Triage Assessment`,
        ``,
        `Patient's symptoms: ${symptoms.join(", ")}`,
        fuText ? `\nAdditional context:\n${fuText}` : "",
        ``,
        `Please perform a clinical triage assessment. Identify the most likely conditions,`,
        `triage severity (emergency/urgent/semi-urgent/non-urgent), recommended next steps,`,
        `and red-flag warning signs that require immediate emergency care.`,
      ].join("\n");

      const res = await aiAPI.analyze(prompt);
      setResult(res);
      setStep("result");
    } catch {
      setError("Unable to analyze symptoms. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-200 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-md">
              <Stethoscope size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">Symptom Checker</h1>
              <p className="text-xs text-gray-500">AI-powered clinical triage · ICMR-aligned</p>
            </div>
          </div>
          {step !== "input" && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-all"
            >
              <RotateCcw size={13} /> Start Over
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            {(["input", "followup", "result"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={clsx(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                  step === s ? "bg-violet-600 text-white" :
                  (step === "result" && s !== "result") || (step === "followup" && s === "input")
                    ? "bg-violet-200 text-violet-700"
                    : "bg-gray-200 text-gray-500"
                )}>
                  {i + 1}
                </div>
                <span className={step === s ? "text-violet-700" : "text-gray-400"}>
                  {s === "input" ? "Symptoms" : s === "followup" ? "Details" : "Assessment"}
                </span>
                {i < 2 && <ChevronRight size={12} className="text-gray-300" />}
              </div>
            ))}
          </div>

          {/* ── Step 1: Enter Symptoms ──────────────────────────────────────── */}
          {step === "input" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-800 text-sm mb-3">What symptoms are you experiencing?</h2>

                {/* Tag input */}
                <div className="flex gap-2 mb-3">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSymptom(); } }}
                    placeholder="e.g. chest pain, high fever, headache…"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none text-sm bg-gray-50 focus:bg-white transition-all"
                  />
                  <button
                    onClick={addSymptom}
                    disabled={!input.trim()}
                    className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {/* Symptom tags */}
                {symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {symptoms.map(s => (
                      <span key={s} className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 text-violet-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                        {s}
                        <button onClick={() => removeSymptom(s)} className="text-violet-400 hover:text-violet-700">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick select */}
                <p className="text-[11px] text-gray-400 font-medium mb-2">Quick select:</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SYMPTOMS.map(s => (
                    <button
                      key={s}
                      onClick={() => addQuick(s)}
                      disabled={symptoms.includes(s)}
                      className="text-xs bg-gray-100 hover:bg-violet-100 hover:text-violet-700 disabled:opacity-40 disabled:cursor-default text-gray-600 px-3 py-1 rounded-full transition-all font-medium border border-transparent hover:border-violet-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { if (symptoms.length > 0) setStep("followup"); }}
                  disabled={symptoms.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all text-sm"
                >
                  Add Details <ChevronRight size={14} />
                </button>
                <button
                  onClick={analyze}
                  disabled={symptoms.length === 0 || loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all text-sm"
                >
                  <Send size={14} /> Quick Analysis
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Follow-up Questions ─────────────────────────────────── */}
          {step === "followup" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-800 text-sm mb-1">Tell us more (optional)</h2>
                <p className="text-xs text-gray-500 mb-4">More context = more accurate assessment</p>

                {/* Symptom summary */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {symptoms.map(s => (
                    <span key={s} className="bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full">{s}</span>
                  ))}
                </div>

                <div className="space-y-3">
                  {TRIAGE_FOLLOW_UPS.map(q => (
                    <div key={q} className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">{q}</label>
                      <input
                        value={followUps[q] ?? ""}
                        onChange={e => setFollowUps(p => ({ ...p, [q]: e.target.value }))}
                        placeholder="Your answer…"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none text-sm bg-gray-50 focus:bg-white transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("input")}
                  className="px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-all"
                >
                  Back
                </button>
                <button
                  onClick={analyze}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all text-sm"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Analyzing…
                    </span>
                  ) : (
                    <><Send size={14} /> Get Clinical Assessment</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Loading ─────────────────────────────────────────────────────── */}
          {loading && step !== "followup" && <ToolLoadingState />}

          {/* ── Step 3: Result ──────────────────────────────────────────────── */}
          {step === "result" && result && !loading && (
            <MedicalToolResult result={result} />
          )}
        </div>
      </div>
    </div>
  );
}
