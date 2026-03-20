"use client";
import { useState } from "react";
import { labAPI, LabAnalyzeResponse, LabPattern } from "@/services/api";
import { FileText, AlertTriangle, CheckCircle, AlertCircle, Loader2, Sparkles, ClipboardPaste, FlaskConical, Activity } from "lucide-react";
import clsx from "clsx";

// ── Lab Patterns Card ─────────────────────────────────────────────────────────
function LabPatternsCard({ patterns }: { patterns: LabPattern[] }) {
  if (!patterns || patterns.length === 0) return null;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return { bar: "bg-red-500", bg: "bg-red-50 border-red-200", text: "text-red-800", badge: "bg-red-100 text-red-700" };
    if (confidence >= 0.7) return { bar: "bg-amber-500", bg: "bg-amber-50 border-amber-200", text: "text-amber-900", badge: "bg-amber-100 text-amber-700" };
    return { bar: "bg-blue-400", bg: "bg-blue-50 border-blue-200", text: "text-blue-900", badge: "bg-blue-100 text-blue-700" };
  };

  return (
    <div className="border-t border-[var(--c-border)] px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={15} className="text-purple-600" />
        <span className="font-body text-xs font-semibold text-purple-800">Clinical Pattern Analysis</span>
        <span className="text-[10px] bg-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-full">
          {patterns.length} pattern{patterns.length > 1 ? "s" : ""} detected
        </span>
      </div>
      <div className="space-y-3">
        {patterns.map((p, i) => {
          const colors = getConfidenceColor(p.confidence);
          return (
            <div key={i} className={clsx("rounded-xl border px-4 py-3", colors.bg)}>
              <div className="flex items-center justify-between mb-1.5">
                <p className={clsx("font-body text-sm font-semibold", colors.text)}>{p.name}</p>
                <span className={clsx("text-[10px] font-bold rounded-full px-2 py-0.5", colors.badge)}>
                  {Math.round(p.confidence * 100)}% confidence
                </span>
              </div>
              {/* Confidence bar */}
              <div className="h-1 bg-white/60 rounded-full overflow-hidden mb-2">
                <div
                  className={clsx("h-full rounded-full transition-all", colors.bar)}
                  style={{ width: `${Math.min(p.confidence * 100, 100)}%` }}
                />
              </div>
              <p className={clsx("font-body text-xs leading-relaxed", colors.text)}>{p.message}</p>
              {p.suggested_tests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[10px] text-gray-500 mr-1 flex items-center gap-0.5">
                    <FlaskConical size={9} /> Suggested:
                  </span>
                  {p.suggested_tests.slice(0, 4).map((t, j) => (
                    <span key={j} className="text-[10px] bg-white/80 text-gray-700 border border-gray-200 rounded-full px-2 py-0.5 font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SAMPLE_REPORT = `Hemoglobin: 8.5 g/dL (Reference: 13.0-17.0)
WBC: 12,500 cells/µL (Reference: 4000-11000)
Platelets: 85,000 /µL (Reference: 150000-400000)
HbA1c: 8.4% (Reference: <5.7%)
Fasting Glucose: 182 mg/dL (Reference: 70-100)
Total Cholesterol: 240 mg/dL (Reference: <200)
LDL: 155 mg/dL (Reference: <100)
Creatinine: 1.6 mg/dL (Reference: 0.7-1.3)
TSH: 8.2 mIU/L (Reference: 0.4-4.0)
SGPT (ALT): 68 U/L (Reference: 7-56)`;

/** Simple markdown → HTML renderer */
function renderMD(text: string) {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="font-display font-600 text-teal-800 text-base mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="font-display font-700 text-teal-900 text-lg mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 class="font-display font-700 text-teal-950 text-xl mt-5 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-800 font-600">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/^---$/gm, '<hr class="border-teal-100 my-3">')
    .replace(/^[-•*]\s+(.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, m => `<ul class="space-y-1 my-2">${m}</ul>`)
    .replace(/⚠️/g, '<span class="text-amber-500">⚠️</span>')
    .replace(/🚨/g, '<span class="text-red-500">🚨</span>')
    .replace(/✅/g, '<span class="text-emerald-500">✅</span>')
    .replace(/\n{2,}/g, '</p><p class="my-2">')
    .replace(/^([^<\n].*)$/gm, (m) => m.trim() ? `<p class="text-sm text-slate-700 leading-relaxed">${m}</p>` : '');
}

export default function ReportsPage() {
  const [text, setText]       = useState("");
  const [context, setContext] = useState("");
  const [result, setResult]   = useState<LabAnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [tab, setTab]         = useState<"full" | "flags" | "patterns" | "summary">("full");

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await labAPI.analyzeText(text.trim(), { patientContext: context || undefined });
      setResult(res);
    } catch {
      setError("Server not connected. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-y-auto">
      {/* Header */}
      <header className="shrink-0 px-5 py-4 bg-white border-b border-[var(--c-border)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <FileText size={18} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="font-display font-600 text-[var(--c-accent)] text-lg leading-tight">Lab Report Explainer</h1>
          <p className="font-body text-xs text-[var(--c-muted)]">Paste any lab report — AI explains every value</p>
        </div>
      </header>

      <div className="flex-1 px-4 py-5 pb-24 md:pb-8 max-w-2xl mx-auto w-full space-y-4">

        {/* Input card */}
        <div className="bg-white rounded-2xl border border-[var(--c-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-display font-600 text-sm text-[var(--c-accent)]">Lab Report Text</h2>
            <button
              onClick={() => setText(SAMPLE_REPORT)}
              className="flex items-center gap-1.5 text-xs font-body text-teal-600 hover:text-teal-800 transition-colors">
              <ClipboardPaste size={13} /> Load sample
            </button>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={10}
            placeholder={`Paste your lab report here…\n\nExample:\nHemoglobin: 8.5 g/dL (Ref: 13-17)\nHbA1c: 8.4% (Ref: <5.7%)\nCreatinine: 1.6 mg/dL (Ref: 0.7-1.3)`}
            className="w-full font-mono text-xs bg-slate-50 border-t border-[var(--c-border)] px-4 py-3 resize-none focus:outline-none focus:bg-white transition-colors placeholder-slate-400"
            style={{ minHeight: "220px" }}
          />
        </div>

        {/* Patient context */}
        <div className="bg-white rounded-2xl border border-[var(--c-border)] shadow-[var(--shadow-sm)] px-4 py-3">
          <label className="font-body text-xs font-medium text-[var(--c-muted)] block mb-2">
            Patient Context <span className="text-slate-400 font-normal">(optional — helps AI give better advice)</span>
          </label>
          <input
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="e.g. 55 year old diabetic male, on Metformin"
            className="w-full font-body text-sm border border-[var(--c-border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {/* Button */}
        <button
          onClick={analyze}
          disabled={loading || !text.trim()}
          className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-200 text-white font-body font-medium py-3.5 rounded-xl shadow-[var(--shadow-teal)] transition-all duration-200 disabled:shadow-none"
        >
          {loading ? (
            <><Loader2 size={17} className="animate-spin" /> Analyzing…</>
          ) : (
            <><Sparkles size={17} /> Explain This Report</>
          )}
        </button>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-body">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-white rounded-2xl border border-[var(--c-border)] shadow-[var(--shadow-md)] overflow-hidden animate-fade-up">

            {/* Summary banner */}
            <div className="bg-teal-50 border-b border-teal-100 px-5 py-4">
              <div className="flex items-start gap-2.5">
                <CheckCircle size={18} className="text-teal-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-body text-xs text-teal-600 font-medium">AI Summary</p>
                    {result.parsed_tests_count != null && result.parsed_tests_count > 0 && (
                      <span className="text-[10px] bg-teal-100 text-teal-700 rounded-full px-2 py-0.5 font-medium">
                        {result.parsed_tests_count} tests analysed
                      </span>
                    )}
                  </div>
                  <p className="font-body text-sm text-teal-900">{result.summary}</p>
                </div>
              </div>
            </div>

            {/* Urgent flags */}
            {result.urgent_flags.length > 0 && (
              <div className="border-b border-red-100 bg-red-50 px-5 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={15} className="text-red-600" />
                  <span className="font-body text-xs font-semibold text-red-700">URGENT — Consult Doctor Immediately</span>
                </div>
                <ul className="space-y-1">
                  {result.urgent_flags.map((f, i) => (
                    <li key={i} className="font-body text-xs text-red-700 flex items-start gap-1.5">
                      <span className="mt-0.5">🚨</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-[var(--c-border)] overflow-x-auto">
              {([
                { id: "full",     label: "Full Analysis" },
                { id: "flags",    label: `Flags (${result.abnormal_flags.length})` },
                { id: "patterns", label: `Patterns${result.patterns && result.patterns.length > 0 ? ` (${result.patterns.length})` : ""}` },
                { id: "summary",  label: "Summary" },
              ] as const).map(t => (
                <button key={t.id}
                  onClick={() => setTab(t.id)}
                  className={clsx(
                    "shrink-0 font-body text-xs font-medium py-3 px-3 transition-colors duration-150",
                    tab === t.id
                      ? "text-teal-700 border-b-2 border-teal-600 bg-teal-50/60"
                      : "text-[var(--c-muted)] hover:text-[var(--c-text)]"
                  )}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="px-5 py-4">
              {tab === "full" && (
                <div
                  className="font-body text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMD(result.analysis) }}
                />
              )}
              {tab === "flags" && (
                <div className="space-y-2">
                  {result.abnormal_flags.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-600 font-body text-sm py-2">
                      <CheckCircle size={16} /> No abnormal flags detected
                    </div>
                  ) : (
                    result.abnormal_flags.map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                        <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                        <span className="font-body text-xs text-amber-900">{f}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
              {tab === "summary" && (
                <p className="font-body text-sm text-[var(--c-text)] leading-relaxed">{result.summary}</p>
              )}
            </div>

            {/* Patterns section — shown when patterns tab is selected */}
            {tab === "patterns" && result.patterns && (
              <LabPatternsCard patterns={result.patterns} />
            )}

            {/* Always show patterns card inline below full analysis if any exist */}
            {tab === "full" && result.patterns && result.patterns.length > 0 && (
              <LabPatternsCard patterns={result.patterns} />
            )}

            <div className="px-5 pb-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs font-body text-amber-800">
                ⚠️ This AI analysis is for informational purposes only. Always consult a qualified doctor before making medical decisions.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
