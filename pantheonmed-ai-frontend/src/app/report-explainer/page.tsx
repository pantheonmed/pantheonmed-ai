"use client";
import { useState } from "react";
import { FileText, Send, RotateCcw, ClipboardPaste } from "lucide-react";
import { aiAPI, MedicalToolResponse } from "@/services/api";
import MedicalToolResult, { ToolLoadingState } from "@/components/MedicalToolResult";

const SAMPLE_REPORT = `DISCHARGE SUMMARY
Patient: Adult Male, 52 years
Diagnosis: Acute ST-elevation myocardial infarction (STEMI), Killip class I
Procedure: Primary percutaneous coronary intervention (PCI) with drug-eluting stent placement in LAD
Post-procedure: Patient hemodynamically stable. Ejection fraction 45%. Started on dual antiplatelet therapy (Aspirin + Clopidogrel), statin, ACE inhibitor, and beta-blocker. 
Follow-up: Cardiology OPD in 2 weeks. Repeat echocardiogram in 6 weeks. Cardiac rehab initiated.`;

export default function ReportExplainerPage() {
  const [text, setText]       = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<MedicalToolResponse | null>(null);
  const [error, setError]     = useState("");

  function reset() { setText(""); setResult(null); setError(""); }

  function pasteSample() { setText(SAMPLE_REPORT); }

  async function explain() {
    if (!text.trim()) { setError("Please paste your medical report text."); return; }
    setLoading(true); setError("");
    try {
      const prompt = [
        `MEDICAL REPORT SIMPLIFIER`,
        ``,
        `Please explain the following medical report in simple, easy-to-understand language`,
        `for a patient with no medical background. Use plain language, avoid jargon.`,
        `Explain:`,
        `1. What the report says in simple terms`,
        `2. What the diagnosis or findings mean for the patient's health`,
        `3. What treatments or next steps are mentioned and why they're important`,
        `4. Any warning signs the patient should watch out for`,
        `5. Questions the patient should ask their doctor`,
        ``,
        `REPORT TEXT:`,
        `---`,
        text.trim(),
        `---`,
      ].join("\n");

      const res = await aiAPI.analyze(prompt);
      setResult(res);
    } catch {
      setError("Unable to simplify report. Please try again.");
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
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">Medical Report Simplifier</h1>
              <p className="text-xs text-gray-500">Paste any medical report · AI explains in plain language</p>
            </div>
          </div>
          {(result || text) && (
            <button onClick={reset} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-all">
              <RotateCcw size={13} /> Clear
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

          {/* Input */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800 text-sm">Paste Medical Report</h2>
              <button
                onClick={pasteSample}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all font-medium border border-indigo-100"
              >
                <ClipboardPaste size={11} /> Try Sample Report
              </button>
            </div>

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Paste your medical report, discharge summary, lab results, radiology report, or doctor's notes here…\n\nExample:\n• Discharge summary\n• Pathology report\n• ECG / Echo report\n• Blood test report\n• Radiology (MRI/CT/X-ray) report`}
              rows={12}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-gray-50 focus:bg-white transition-all resize-none font-mono leading-relaxed"
            />

            <div className="flex items-center justify-between mt-2 mb-4">
              <span className="text-xs text-gray-400">{text.length.toLocaleString()} characters</span>
              <span className="text-xs text-gray-400">Supports: discharge summaries, lab reports, radiology, prescriptions</span>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">{error}</p>}

            <button
              onClick={explain}
              disabled={loading || !text.trim()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Simplifying Report…
                </span>
              ) : (
                <><Send size={14} /> Explain in Simple Language</>
              )}
            </button>
          </div>

          {/* How it works */}
          {!result && !loading && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">What you can simplify</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  "Discharge Summaries", "Blood Test Reports", "ECG / Echo Reports",
                  "CT / MRI / X-ray", "Pathology Reports", "Doctor Prescriptions",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-indigo-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && <ToolLoadingState />}
          {result && !loading && <MedicalToolResult result={result} />}
        </div>
      </div>
    </div>
  );
}
