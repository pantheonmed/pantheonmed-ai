"use client";
import { useState } from "react";
import {
  Zap, Send, RotateCcw, AlertTriangle, Plus, X, ChevronDown,
  ChevronUp, Activity, Info, Shield, BookOpen,
} from "lucide-react";
import { medicineAPI, DrugInteractionDetail, DrugInteractionResponse } from "@/services/api";

// ─── Severity config ──────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, {
  label:   string;
  icon:    string;
  badge:   string;
  card:    string;
  border:  string;
  text:    string;
  dot:     string;
}> = {
  CONTRAINDICATED: {
    label:  "Contraindicated",
    icon:   "⛔",
    badge:  "bg-red-100 text-red-800 border-red-300",
    card:   "bg-red-50",
    border: "border-red-300",
    text:   "text-red-900",
    dot:    "bg-red-500",
  },
  SEVERE: {
    label:  "Severe",
    icon:   "🔴",
    badge:  "bg-red-100 text-red-700 border-red-200",
    card:   "bg-rose-50",
    border: "border-rose-300",
    text:   "text-rose-900",
    dot:    "bg-rose-500",
  },
  MODERATE: {
    label:  "Moderate",
    icon:   "🟡",
    badge:  "bg-amber-100 text-amber-800 border-amber-200",
    card:   "bg-amber-50",
    border: "border-amber-300",
    text:   "text-amber-900",
    dot:    "bg-amber-500",
  },
  MILD: {
    label:  "Mild",
    icon:   "🟢",
    badge:  "bg-green-100 text-green-700 border-green-200",
    card:   "bg-green-50",
    border: "border-green-300",
    text:   "text-green-900",
    dot:    "bg-green-500",
  },
};

const COMMON_DRUGS = [
  "Aspirin", "Paracetamol", "Ibuprofen", "Metformin", "Atorvastatin",
  "Amlodipine", "Omeprazole", "Amoxicillin", "Ciprofloxacin", "Warfarin",
  "Sildenafil", "Lisinopril", "Clopidogrel", "Losartan", "Pantoprazole",
];

// ─── Overall risk banner ──────────────────────────────────────────────────────
function OverallRiskBanner({ result }: { result: DrugInteractionResponse }) {
  const hasContraindicated = result.contraindicated;
  const severeCount   = result.severity_summary?.severe    ?? 0;
  const moderateCount = result.severity_summary?.moderate  ?? 0;
  const mildCount     = result.severity_summary?.mild      ?? 0;
  const totalFound    = result.interactions?.length ?? 0;

  let bg = "bg-emerald-50 border-emerald-200";
  let text = "text-emerald-800";
  let icon = "✅";

  if (hasContraindicated)       { bg = "bg-red-100 border-red-400";    text = "text-red-900";    icon = "⛔"; }
  else if (severeCount > 0)     { bg = "bg-rose-100 border-rose-300";  text = "text-rose-900";   icon = "🔴"; }
  else if (moderateCount > 0)   { bg = "bg-amber-50 border-amber-300"; text = "text-amber-900";  icon = "🟡"; }
  else if (mildCount > 0)       { bg = "bg-green-50 border-green-300"; text = "text-green-900";  icon = "🟢"; }

  return (
    <div className={`rounded-2xl border-2 px-5 py-4 mb-4 ${bg}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{icon}</span>
        <div className="flex-1">
          <p className={`font-bold text-base leading-snug ${text}`}>{result.overall_risk}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {hasContraindicated && (
              <span className="inline-flex items-center gap-1 text-xs bg-red-200 text-red-900 px-2.5 py-1 rounded-full font-semibold border border-red-300">
                ⛔ Contraindicated
              </span>
            )}
            {severeCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold border border-red-200">
                🔴 {severeCount} Severe
              </span>
            )}
            {moderateCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-semibold border border-amber-200">
                🟡 {moderateCount} Moderate
              </span>
            )}
            {mildCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold border border-green-200">
                🟢 {mildCount} Mild
              </span>
            )}
            {totalFound === 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
                No interactions found in database
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Individual interaction card ──────────────────────────────────────────────
function InteractionCard({ ix }: { ix: DrugInteractionDetail }) {
  const [expanded, setExpanded] = useState(true);
  const cfg = SEVERITY_CONFIG[ix.severity] ?? SEVERITY_CONFIG.MODERATE;

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.card} overflow-hidden mb-3`}>
      {/* Card header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{cfg.icon}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-bold text-sm ${cfg.text}`}>
                {ix.drug_a} <span className="font-normal opacity-60">+</span> {ix.drug_b}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                {cfg.label}
              </span>
              <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full border border-gray-200">
                Evidence {ix.evidence}
              </span>
            </div>
            {!expanded && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ix.effect}</p>
            )}
          </div>
        </div>
        <span className="text-gray-400 shrink-0 ml-2">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-black/5 pt-3">
          {/* Effect */}
          <div className="flex gap-2.5">
            <div className={`w-1.5 rounded-full shrink-0 mt-1 ${cfg.dot}`} style={{ minHeight: "1rem" }} />
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Clinical Effect</p>
              <p className="text-sm text-gray-800">{ix.effect}</p>
            </div>
          </div>

          {/* Mechanism */}
          {ix.mechanism && (
            <div className="flex gap-2.5">
              <div className="w-1.5 rounded-full shrink-0 mt-1 bg-gray-300" style={{ minHeight: "1rem" }} />
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Mechanism</p>
                <p className="text-sm text-gray-700">{ix.mechanism}</p>
              </div>
            </div>
          )}

          {/* Management */}
          {ix.management && (
            <div className={`rounded-xl px-3 py-2.5 mt-1 ${
              ix.severity === "CONTRAINDICATED" ? "bg-red-100 border border-red-200" :
              ix.severity === "SEVERE"           ? "bg-rose-100 border border-rose-200" :
              "bg-white border border-gray-200"
            }`}>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                <Shield size={11} className="inline mr-1" />Management
              </p>
              <p className="text-sm text-gray-800">{ix.management}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── No interactions found card ───────────────────────────────────────────────
function NoInteractionsCard({ drugs }: { drugs: string[] }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-center mb-4">
      <div className="text-3xl mb-2">✅</div>
      <p className="font-semibold text-emerald-800 text-sm">
        No significant interactions found between {drugs.join(" and ")}
      </p>
      <p className="text-xs text-emerald-700 mt-1 opacity-80">
        Based on our drug interaction database. Always verify with a pharmacist.
      </p>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Risk banner skeleton */}
      <div className="h-20 bg-gray-100 rounded-2xl" />
      {/* Card skeletons */}
      {[1, 2].map(i => (
        <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
      ))}
      <div className="h-32 bg-gray-100 rounded-2xl" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DrugInteractionPage() {
  const [drugs, setDrugs]         = useState<string[]>(["", ""]);
  const [condition, setCondition] = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<DrugInteractionResponse | null>(null);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState<"interactions" | "analysis">("interactions");

  function reset() {
    setDrugs(["", ""]); setCondition(""); setResult(null); setError(""); setActiveTab("interactions");
  }

  function updateDrug(i: number, val: string) {
    setDrugs(prev => prev.map((d, idx) => idx === i ? val : d));
  }

  function addDrug() {
    if (drugs.length < 5) setDrugs(prev => [...prev, ""]);
  }

  function removeDrug(i: number) {
    if (drugs.length > 2) setDrugs(prev => prev.filter((_, idx) => idx !== i));
  }

  async function check() {
    const filled = drugs.map(d => d.trim()).filter(Boolean);
    if (filled.length < 2) {
      setError("Please enter at least 2 medicine names."); return;
    }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await medicineAPI.checkInteractions(filled);
      setResult(res);
      setActiveTab("interactions");
    } catch {
      setError("Unable to check interaction. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const filledDrugs = drugs.filter(d => d.trim()).length;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-200 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-md">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">Drug Interaction Checker</h1>
              <p className="text-xs text-gray-500">Check for dangerous medicine combinations</p>
            </div>
          </div>
          {result && (
            <button onClick={reset} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-all">
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">

          {/* Safety notice */}
          <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 mb-5">
            <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800 leading-relaxed">
              <strong>Important:</strong> This tool provides AI-based informational guidance only.
              Always confirm drug interactions with your pharmacist or doctor before making any changes to your medication.
            </p>
          </div>

          {/* Input form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 text-sm">Enter Medicine Names</h2>
              {drugs.length < 5 && (
                <button
                  onClick={addDrug}
                  className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg border border-orange-100 transition-all font-medium"
                >
                  <Plus size={11} /> Add medicine
                </button>
              )}
            </div>

            {/* Drug inputs */}
            <div className="space-y-3 mb-4">
              {drugs.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-5 text-right shrink-0">
                    {i + 1}.
                  </span>
                  <div className="flex-1 relative">
                    <input
                      value={d}
                      onChange={e => updateDrug(i, e.target.value)}
                      onKeyDown={e => e.key === "Enter" && check()}
                      placeholder={`Medicine ${i + 1}${i < 2 ? " *" : " (optional)"}`}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm bg-gray-50 focus:bg-white transition-all"
                    />
                  </div>
                  {i >= 2 && (
                    <button
                      onClick={() => removeDrug(i)}
                      className="shrink-0 text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Quick-fill chips */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Quick fill</p>
              <div className="flex flex-wrap gap-1">
                {COMMON_DRUGS.map(drug => (
                  <button
                    key={drug}
                    onClick={() => {
                      const emptyIdx = drugs.findIndex(d => !d.trim());
                      if (emptyIdx >= 0) updateDrug(emptyIdx, drug);
                      else if (drugs.length < 5) setDrugs(prev => [...prev, drug]);
                    }}
                    className="text-[10px] bg-orange-50 hover:bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-100 transition-all font-medium"
                  >
                    {drug}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional context */}
            <div className="space-y-1.5 mb-5">
              <label className="text-xs font-semibold text-gray-600">
                Patient conditions / other medications (optional)
              </label>
              <input
                value={condition}
                onChange={e => setCondition(e.target.value)}
                placeholder="e.g. diabetes, kidney disease, taking blood thinners…"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm bg-gray-50 focus:bg-white transition-all"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                {error}
              </p>
            )}

            <button
              onClick={check}
              disabled={loading || filledDrugs < 2}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Checking Interactions…
                </span>
              ) : (
                <><Send size={14} /> Check Drug Interactions</>
              )}
            </button>
          </div>

          {/* Loading */}
          {loading && <LoadingSkeleton />}

          {/* Results */}
          {result && !loading && (
            <div>
              {/* Overall risk banner */}
              <OverallRiskBanner result={result} />

              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
                <button
                  onClick={() => setActiveTab("interactions")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${
                    activeTab === "interactions"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Activity size={12} />
                  Interactions
                  {(result.interactions?.length ?? 0) > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1 ${
                      result.contraindicated
                        ? "bg-red-100 text-red-700"
                        : result.severity_summary?.severe ?? 0 > 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                    }`}>
                      {result.interactions?.length ?? 0}
                    </span>
                  )}
                </button>
                {(result.ai_analysis ?? (result as { analysis?: string }).analysis) && (
                  <button
                    onClick={() => setActiveTab("analysis")}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${
                      activeTab === "analysis"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <BookOpen size={12} />
                    AI Analysis
                  </button>
                )}
              </div>

              {/* Interactions tab */}
              {activeTab === "interactions" && (
                <div>
                  {(result.interactions?.length ?? 0) === 0 ? (
                    <NoInteractionsCard drugs={result.drugs ?? []} />
                  ) : (
                    <div>
                      {/* Sort: CONTRAINDICATED > SEVERE > MODERATE > MILD */}
                      {(["CONTRAINDICATED", "SEVERE", "MODERATE", "MILD"] as const).map(sev => {
                        const filtered = (result.interactions ?? []).filter(ix => ix.severity === sev);
                        if (filtered.length === 0) return null;
                        return (
                          <div key={sev}>
                            {filtered.map((ix, i) => (
                              <InteractionCard key={`${sev}-${i}`} ix={ix} />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Drugs checked summary */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Info size={12} className="shrink-0" />
                    <span>Checked:</span>
                    {(result.drugs ?? []).map(d => (
                      <span key={d} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium border border-gray-200">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis tab */}
              {activeTab === "analysis" && (result.ai_analysis || (result as { analysis?: string }).analysis) && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center">
                      <Zap size={12} className="text-white" />
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">AI Clinical Analysis</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                    {result.ai_analysis ?? (result as { analysis?: string }).analysis}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              {result.disclaimer && (
                <p className="mt-4 text-[10px] text-gray-400 text-center px-4 leading-relaxed">
                  ⚕️ {result.disclaimer}
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
