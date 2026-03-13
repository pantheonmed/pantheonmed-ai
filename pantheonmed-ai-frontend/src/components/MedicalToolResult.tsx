"use client";
import { useState } from "react";
import { ClinicalConsultation, DifferentialItem } from "@/services/api";
import {
  Stethoscope, CheckCircle2, AlertTriangle, FileText,
  Loader2, ClipboardList, HelpCircle, Thermometer, ShieldAlert,
} from "lucide-react";
import clsx from "clsx";
import ExternalDataCards from "@/components/ExternalDataCards";
import ClinicalReasoningCard from "@/components/ClinicalReasoningCard";

/* ── Risk badge ────────────────────────────────────────────────────────────── */
function RiskBadge({ level }: { level?: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    emergency: { label: "Emergency Risk",  cls: "bg-red-100 text-red-700 border border-red-200",    dot: "bg-red-500" },
    high:      { label: "High Risk",       cls: "bg-orange-100 text-orange-700 border border-orange-200", dot: "bg-orange-500" },
    medium:    { label: "Moderate Risk",   cls: "bg-amber-100 text-amber-700 border border-amber-200",    dot: "bg-amber-500" },
    low:       { label: "Low Risk",        cls: "bg-emerald-100 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
  };
  const entry = map[level ?? "low"] ?? map.low;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full", entry.cls)}>
      <span className={clsx("w-1.5 h-1.5 rounded-full", entry.dot)} />
      {entry.label}
    </span>
  );
}

/* ── Section card ─────────────────────────────────────────────────────────── */
interface SectionProps {
  icon: React.ReactNode;
  label: string;
  accent: string;
  bg: string;
  labelColor: string;
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ icon, label, accent, bg, labelColor, children, className }: SectionProps) {
  return (
    <div className={clsx(
      "rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-slide-up",
      bg, className,
    )}>
      <div className={clsx("flex items-center gap-2 px-5 pt-3.5 pb-3 border-b", accent)}>
        <span className={clsx("shrink-0", labelColor)}>{icon}</span>
        <span className={clsx("text-[10.5px] font-bold uppercase tracking-[0.07em]", labelColor)}>
          {label}
        </span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function ListItem({ text, dotColor }: { text: string; dotColor: string }) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] text-gray-700 leading-relaxed py-0.5">
      <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0 mt-[7px]", dotColor)} />
      {text}
    </li>
  );
}

/* ── Main clinical consultation result ──────────────────────────────────────
   Used by all tool pages: Symptom Checker, Drug Interaction, Risk Predictor,
   Report Explainer, Doctor Mode, Anatomy Explorer.
─────────────────────────────────────────────────────────────────────────── */
interface Props {
  result: ClinicalConsultation;
  className?: string;
}

export default function MedicalToolResult({ result, className }: Props) {
  const isEmergency    = result.risk_level === "emergency" || result.consultation_type === "emergency";
  const hasFollowUp    = (result.follow_up_questions ?? []).length > 0;
  const hasDiff        = (result.differential_diagnosis ?? []).length > 0;
  const hasKeySymptoms = (result.key_symptoms_to_check ?? []).length > 0;
  const hasNextSteps   = (result.recommended_next_steps ?? []).length > 0;
  const hasWarnings    = (result.emergency_warning_signs ?? []).length > 0;
  const hasBrainTests     = (result.brain_recommended_tests ?? []).length > 0;
  const hasExtracted      = (result.extracted_symptoms ?? []).length > 0;
  const hasClinicalReason = result.clinical_reasoning != null
    && (result.clinical_reasoning.possible_conditions?.length > 0
        || result.clinical_reasoning.red_flags?.length > 0);

  // Fallback for legacy fields from older responses
  const legacyConditions = result.possible_conditions ?? [];
  const legacyActions    = result.recommended_actions ?? [];
  const legacyWarnings   = result.warning_signs ?? [];
  const summaryText      = result.doctor_assessment || result.answer || "";

  return (
    <div className={clsx("space-y-3", className)}>

      {/* ── Emergency banner ─────────────────────────────────────────────── */}
      {isEmergency && (
        <div className="flex items-start gap-3 bg-red-600 text-white rounded-2xl px-5 py-4 shadow-lg animate-slide-up">
          <span className="text-2xl shrink-0 mt-0.5">🚨</span>
          <div>
            <p className="font-bold text-[15px] leading-tight">Medical Emergency Detected</p>
            <p className="text-red-100 text-[12.5px] mt-1 leading-snug">
              Based on your symptoms, this may require immediate emergency care.
              Please call <strong>112</strong> or go to the nearest emergency room immediately.
            </p>
          </div>
        </div>
      )}

      {/* ── Clinical Reasoning Engine panel ──────────────────────────────── */}
      {hasClinicalReason && (
        <ClinicalReasoningCard reasoning={result.clinical_reasoning!} />
      )}

      {/* ── Card header ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-5 pt-4 pb-3.5 border-b border-gray-100 bg-gradient-to-r from-[#0F1E4A]/[0.03] to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0F1E4A] flex flex-col items-center justify-center gap-0">
              <Stethoscope size={13} className="text-white" />
              <span className="text-[6.5px] text-blue-200 font-bold leading-none mt-0.5">AI Dr</span>
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#0F1E4A]">PantheonMed AI Doctor</p>
              <p className="text-[10px] text-gray-400">Clinical Decision Support</p>
            </div>
          </div>
          <RiskBadge level={result.risk_level} />
        </div>

        {/* ── Doctor Assessment ── */}
        <div className="px-5 pt-4 pb-4 bg-gradient-to-b from-blue-50/50 to-white border-b border-blue-50/80">
          <div className="flex items-center gap-1.5 mb-2">
            <ClipboardList size={13} className="text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-blue-700">
              Doctor Assessment
            </span>
          </div>
          <p className="text-[14px] text-gray-800 leading-relaxed">{summaryText}</p>
        </div>
      </div>

      {/* ── Follow-up Questions ──────────────────────────────────────────── */}
      {hasFollowUp && (
        <SectionCard
          icon={<HelpCircle size={14} />}
          label="I Need More Information to Help You"
          accent="bg-indigo-50 border-indigo-100"
          bg="bg-white"
          labelColor="text-indigo-700"
        >
          <ol className="space-y-2.5">
            {result.follow_up_questions.map((q, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-[13px] text-gray-800 leading-snug">{q}</span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-indigo-500 mt-3 italic">
            Provide these details for a more accurate clinical assessment.
          </p>
        </SectionCard>
      )}

      {/* ── Differential Diagnosis ───────────────────────────────────────── */}
      {hasDiff ? (
        <SectionCard
          icon={<Stethoscope size={14} />}
          label="Possible Conditions (Differential Diagnosis)"
          accent="bg-violet-50 border-violet-100"
          bg="bg-white"
          labelColor="text-violet-700"
        >
          <ol className="space-y-3">
            {result.differential_diagnosis.map((item: DifferentialItem, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.rank ?? i + 1}
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800 leading-tight">{item.condition}</p>
                  {item.explanation && (
                    <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{item.explanation}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      ) : legacyConditions.length > 0 && (
        <SectionCard
          icon={<Stethoscope size={14} />}
          label="Possible Conditions"
          accent="bg-violet-50 border-violet-100"
          bg="bg-white"
          labelColor="text-violet-700"
        >
          <ul className="space-y-0.5">
            {legacyConditions.map((c, i) => (
              <ListItem key={i} text={c} dotColor="bg-violet-400" />
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Key Symptoms to Check ────────────────────────────────────────── */}
      {hasKeySymptoms && (
        <SectionCard
          icon={<Thermometer size={14} />}
          label="Key Symptoms to Monitor"
          accent="bg-sky-50 border-sky-100"
          bg="bg-white"
          labelColor="text-sky-700"
        >
          <ul className="space-y-0.5">
            {result.key_symptoms_to_check.map((s, i) => (
              <ListItem key={i} text={s} dotColor="bg-sky-400" />
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Brain: Extracted Symptoms ────────────────────────────────────── */}
      {hasExtracted && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
            Detected Symptoms:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {result.extracted_symptoms!.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-px rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Brain: Recommended Investigations ───────────────────────────── */}
      {hasBrainTests && (
        <SectionCard
          icon={<ClipboardList size={14} />}
          label="Recommended Investigations"
          accent="bg-teal-50 border-teal-100"
          bg="bg-white"
          labelColor="text-teal-700"
        >
          <div className="flex flex-wrap gap-2">
            {result.brain_recommended_tests!.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium bg-teal-100 text-teal-800 border border-teal-200"
              >
                {t}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Recommended Next Steps ───────────────────────────────────────── */}
      {(hasNextSteps || legacyActions.length > 0) && (
        <SectionCard
          icon={<CheckCircle2 size={14} />}
          label="Recommended Next Steps"
          accent="bg-emerald-50 border-emerald-100"
          bg="bg-white"
          labelColor="text-emerald-700"
        >
          <ul className="space-y-0.5">
            {(hasNextSteps ? result.recommended_next_steps : legacyActions).map((a, i) => (
              <ListItem key={i} text={a} dotColor="bg-emerald-400" />
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Emergency Warning Signs ──────────────────────────────────────── */}
      {(hasWarnings || legacyWarnings.length > 0) && (
        <SectionCard
          icon={<ShieldAlert size={14} />}
          label="Emergency Warning Signs — Seek Immediate Care If:"
          accent="bg-red-50 border-red-100"
          bg="bg-white"
          labelColor="text-red-700"
        >
          <ul className="space-y-0.5">
            {(hasWarnings ? result.emergency_warning_signs : legacyWarnings).map((w, i) => (
              <ListItem key={i} text={w} dotColor="bg-red-400" />
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      {result.medical_disclaimer && (
        <SectionCard
          icon={<FileText size={13} />}
          label="Medical Disclaimer"
          accent="bg-amber-50 border-amber-100"
          bg="bg-amber-50/30"
          labelColor="text-amber-700"
        >
          <p className="text-[12px] text-amber-800 leading-relaxed">{result.medical_disclaimer}</p>
        </SectionCard>
      )}

      {/* ── External API Evidence (all 6 APIs) ───────────────────────── */}
      {(
        result.drug_info != null
        || result.icd_info != null
        || (result.research_evidence ?? []).length > 0
        || result.medical_concepts != null
        || (result.clinical_trials ?? []).some((t: {nct_id?: string; error?: string}) => !t.error && t.nct_id)
        || result.drug_interactions != null
      ) && (
        <ExternalDataCards
          drug_info={result.drug_info}
          icd_info={result.icd_info}
          research_evidence={result.research_evidence}
          medical_concepts={result.medical_concepts}
          clinical_trials={result.clinical_trials}
          drug_interactions={result.drug_interactions}
          data_sources={result.data_sources}
        />
      )}
    </div>
  );
}

/* ── Loading state ───────────────────────────────────────────────────────── */
const LOADING_MESSAGES = [
  "Analyzing with clinical intelligence…",
  "Building differential diagnosis…",
  "Reviewing medical knowledge base…",
  "Cross-referencing ICMR guidelines…",
  "Generating clinical guidance…",
];

export function ToolLoadingState() {
  const [idx] = useState(() => Math.floor(Math.random() * LOADING_MESSAGES.length));
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 animate-fade-in">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-[3px] border-blue-100" />
        <div className="absolute inset-0 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin" />
        <div className="absolute inset-[5px] flex items-center justify-center">
          <Loader2 size={14} className="text-blue-500 animate-spin" style={{ animationDirection: "reverse" }} />
        </div>
      </div>
      <p className="text-[13px] font-semibold text-blue-600 animate-pulse">{LOADING_MESSAGES[idx]}</p>
      <p className="text-[11px] text-gray-400">AI Doctor is reviewing your information…</p>
    </div>
  );
}
