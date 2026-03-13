"use client";
import { useState } from "react";
import { TrendingUp, Send, RotateCcw } from "lucide-react";
import { aiAPI, MedicalToolResponse } from "@/services/api";
import MedicalToolResult, { ToolLoadingState } from "@/components/MedicalToolResult";

interface RiskForm {
  age: string;
  gender: string;
  weight: string;
  height: string;
  systolic: string;
  diastolic: string;
  fastingBloodSugar: string;
  hba1c: string;
  cholesterol: string;
  smokingStatus: string;
  familyHistory: string[];
  physicalActivity: string;
}

const EMPTY_FORM: RiskForm = {
  age: "", gender: "", weight: "", height: "",
  systolic: "", diastolic: "", fastingBloodSugar: "", hba1c: "",
  cholesterol: "", smokingStatus: "non-smoker",
  familyHistory: [], physicalActivity: "moderate",
};

const FAMILY_HISTORY_OPTIONS = ["Diabetes", "Heart disease", "Hypertension", "Stroke", "Obesity"];

export default function RiskPredictionPage() {
  const [form, setForm]       = useState<RiskForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<MedicalToolResponse | null>(null);
  const [error, setError]     = useState("");

  function set(key: keyof RiskForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));
  }

  function toggleFamily(val: string) {
    setForm(p => ({
      ...p,
      familyHistory: p.familyHistory.includes(val)
        ? p.familyHistory.filter(x => x !== val)
        : [...p.familyHistory, val],
    }));
  }

  function reset() { setForm(EMPTY_FORM); setResult(null); setError(""); }

  function bmi() {
    const w = parseFloat(form.weight), h = parseFloat(form.height) / 100;
    return w > 0 && h > 0 ? (w / (h * h)).toFixed(1) : null;
  }

  async function predict() {
    if (!form.age || !form.weight) { setError("Please fill in at least age and weight."); return; }
    setLoading(true); setError("");
    try {
      const bmiVal = bmi();
      const prompt = [
        `HEALTH RISK ASSESSMENT`,
        ``,
        `Patient Profile:`,
        `- Age: ${form.age} years`,
        form.gender ? `- Gender: ${form.gender}` : "",
        `- Weight: ${form.weight} kg, Height: ${form.height || "not provided"} cm${bmiVal ? `, BMI: ${bmiVal}` : ""}`,
        form.systolic ? `- Blood Pressure: ${form.systolic}/${form.diastolic || "??"} mmHg` : "",
        form.fastingBloodSugar ? `- Fasting Blood Sugar: ${form.fastingBloodSugar} mg/dL` : "",
        form.hba1c ? `- HbA1c: ${form.hba1c}%` : "",
        form.cholesterol ? `- Total Cholesterol: ${form.cholesterol} mg/dL` : "",
        `- Smoking: ${form.smokingStatus}`,
        `- Physical Activity: ${form.physicalActivity}`,
        form.familyHistory.length > 0 ? `- Family History of: ${form.familyHistory.join(", ")}` : "",
        ``,
        `Please estimate the patient's risk for:`,
        `1. Type 2 Diabetes (Low/Moderate/High/Very High)`,
        `2. Cardiovascular/Heart Disease`,
        `3. Hypertension`,
        `4. Metabolic Syndrome`,
        ``,
        `Provide specific risk factors driving each estimate, lifestyle modifications,`,
        `screening tests recommended, and target values for key biomarkers.`,
        `Use ICMR/Indian clinical guidelines where applicable.`,
      ].filter(Boolean).join("\n");

      const res = await aiAPI.analyze(prompt);
      setResult(res);
    } catch {
      setError("Unable to generate risk assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm bg-gray-50 focus:bg-white transition-all";
  const labelClass = "text-xs font-semibold text-gray-600 block mb-1";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-200 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-md">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">Health Risk Predictor</h1>
              <p className="text-xs text-gray-500">Estimate risk for diabetes, heart disease &amp; hypertension</p>
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
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 text-sm mb-4">Enter Your Health Data</h2>

            {/* Basic info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div><label className={labelClass}>Age (years)*</label>
                <input type="number" value={form.age} onChange={set("age")} placeholder="30" min="1" max="120" className={inputClass} /></div>
              <div><label className={labelClass}>Gender</label>
                <select value={form.gender} onChange={set("gender")} className={inputClass}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div><label className={labelClass}>Weight (kg)*</label>
                <input type="number" value={form.weight} onChange={set("weight")} placeholder="70" className={inputClass} /></div>
              <div>
                <label className={labelClass}>
                  Height (cm) {bmi() && <span className="text-teal-600 font-bold">BMI: {bmi()}</span>}
                </label>
                <input type="number" value={form.height} onChange={set("height")} placeholder="170" className={inputClass} />
              </div>
            </div>

            {/* Vitals */}
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-2 mt-1">Vitals &amp; Labs</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <div><label className={labelClass}>Systolic BP (mmHg)</label>
                <input type="number" value={form.systolic} onChange={set("systolic")} placeholder="120" className={inputClass} /></div>
              <div><label className={labelClass}>Diastolic BP (mmHg)</label>
                <input type="number" value={form.diastolic} onChange={set("diastolic")} placeholder="80" className={inputClass} /></div>
              <div><label className={labelClass}>Fasting Blood Sugar (mg/dL)</label>
                <input type="number" value={form.fastingBloodSugar} onChange={set("fastingBloodSugar")} placeholder="90" className={inputClass} /></div>
              <div><label className={labelClass}>HbA1c (%)</label>
                <input type="number" step="0.1" value={form.hba1c} onChange={set("hba1c")} placeholder="5.6" className={inputClass} /></div>
              <div><label className={labelClass}>Total Cholesterol (mg/dL)</label>
                <input type="number" value={form.cholesterol} onChange={set("cholesterol")} placeholder="180" className={inputClass} /></div>
            </div>

            {/* Lifestyle */}
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-2 mt-1">Lifestyle</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><label className={labelClass}>Smoking Status</label>
                <select value={form.smokingStatus} onChange={set("smokingStatus")} className={inputClass}>
                  <option value="non-smoker">Non-smoker</option>
                  <option value="ex-smoker">Ex-smoker</option>
                  <option value="smoker">Current smoker</option>
                </select>
              </div>
              <div><label className={labelClass}>Physical Activity</label>
                <select value={form.physicalActivity} onChange={set("physicalActivity")} className={inputClass}>
                  <option value="sedentary">Sedentary (desk job, no exercise)</option>
                  <option value="light">Light (walks occasionally)</option>
                  <option value="moderate">Moderate (exercise 3x/week)</option>
                  <option value="active">Active (daily exercise)</option>
                </select>
              </div>
            </div>

            {/* Family history */}
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-2">Family History</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {FAMILY_HISTORY_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleFamily(opt)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    form.familyHistory.includes(opt)
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "bg-gray-100 border-gray-200 text-gray-600 hover:border-teal-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">{error}</p>}

            <button
              onClick={predict}
              disabled={loading || !form.age || !form.weight}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Assessing Risk…
                </span>
              ) : (
                <><Send size={14} /> Predict Health Risks</>
              )}
            </button>
          </div>

          {loading && <ToolLoadingState />}
          {result && !loading && <MedicalToolResult result={result} />}
        </div>
      </div>
    </div>
  );
}
