"use client";

/**
 * AssessmentResult — displays the full clinical assessment output
 * from the /symptom-assessment/symptom-intake endpoint.
 */

import React, { useState } from "react";
import clsx from "clsx";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  HelpCircle,
  Info,
  RefreshCcw,
  Shield,
  Stethoscope,
} from "lucide-react";
import { FullAssessmentResponse, AssessmentDiagnosisItem } from "@/services/api";

// ---------------------------------------------------------------------------
// Triage badge
// ---------------------------------------------------------------------------

function TriageBadge({ level }: { level: string }) {
  const upper = level.toUpperCase();
  const styles: Record<string, string> = {
    EMERGENCY: "bg-red-600 text-white",
    URGENT:    "bg-amber-500 text-white",
    ROUTINE:   "bg-blue-600 text-white",
    "SELF-CARE": "bg-emerald-600 text-white",
  };
  const icons: Record<string, React.ReactNode> = {
    EMERGENCY: <AlertOctagon className="h-4 w-4" />,
    URGENT:    <AlertTriangle className="h-4 w-4" />,
    ROUTINE:   <Stethoscope className="h-4 w-4" />,
    "SELF-CARE": <Shield className="h-4 w-4" />,
  };
  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold",
      styles[upper] ?? "bg-gray-600 text-white",
    )}>
      {icons[upper]}
      {upper}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Emergency banner
// ---------------------------------------------------------------------------

function EmergencyBanner({ flags }: { flags: FullAssessmentResponse["red_flags"] }) {
  if (!flags.length) return null;
  const emergencyFlags = flags.filter((f) => f.triage_level === "EMERGENCY");
  if (!emergencyFlags.length) return null;

  return (
    <div className="rounded-2xl bg-red-50 border-2 border-red-400 p-5 flex gap-4 animate-pulse-once">
      <div className="shrink-0 mt-0.5">
        <AlertOctagon className="h-8 w-8 text-red-600" />
      </div>
      <div>
        <h3 className="text-red-700 font-bold text-base mb-1">
          🚨 Possible Medical Emergency Detected
        </h3>
        <p className="text-red-600 text-sm font-medium mb-3">
          {emergencyFlags[0].action}
        </p>
        <div className="flex flex-wrap gap-2">
          {emergencyFlags.map((f) => (
            <span
              key={f.flag_name}
              className="text-xs bg-red-100 border border-red-300 text-red-700 rounded-full px-3 py-1 font-semibold"
            >
              {f.flag_name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Urgent warning row
// ---------------------------------------------------------------------------

function UrgentWarnings({ flags }: { flags: FullAssessmentResponse["red_flags"] }) {
  const urgentFlags = flags.filter((f) => f.triage_level === "URGENT");
  if (!urgentFlags.length) return null;
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 flex gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-amber-800 font-semibold text-sm mb-2">⚠️ Urgent Clinical Alerts</p>
        <ul className="text-sm text-amber-700 space-y-1">
          {urgentFlags.map((f) => (
            <li key={f.flag_name} className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">•</span>
              <span><strong>{f.flag_name}</strong> — {f.action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Probability bar
// ---------------------------------------------------------------------------

function ProbabilityBar({ probability, escalation }: { probability: number; escalation: string }) {
  const color =
    escalation === "EMERGENCY" ? "bg-red-500"
    : escalation === "URGENT"  ? "bg-amber-500"
    : escalation === "ROUTINE" ? "bg-blue-500"
    : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={clsx("h-1.5 rounded-full transition-all duration-700", color)}
          style={{ width: `${Math.min(probability, 100)}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-700 w-10 text-right">
        {probability.toFixed(0)}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diagnosis card (collapsible)
// ---------------------------------------------------------------------------

function DiagnosisCard({ item, rank }: { item: AssessmentDiagnosisItem; rank: number }) {
  const [open, setOpen] = useState(rank === 0);

  const escalationColor =
    item.escalation === "EMERGENCY" ? "border-red-200 bg-red-50"
    : item.escalation === "URGENT"  ? "border-amber-200 bg-amber-50"
    : "border-gray-100 bg-white";

  return (
    <div className={clsx("rounded-xl border p-4 transition-all", escalationColor)}>
      <button
        className="w-full flex items-center gap-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Rank bubble */}
        <div className={clsx(
          "h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold",
          rank === 0 ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600",
        )}>
          {rank + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
            <span className="text-xs text-gray-400 font-mono">{item.icd10}</span>
            {rank === 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 font-semibold rounded-full px-2 py-0.5">
                Most Likely
              </span>
            )}
          </div>
          <ProbabilityBar probability={item.probability} escalation={item.escalation} />
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {/* Matched symptoms */}
          {item.matched_symptoms.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Matched Symptoms
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.matched_symptoms.map((s) => (
                  <span
                    key={s}
                    className="text-xs bg-blue-100 text-blue-700 rounded-full px-2.5 py-1 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tests */}
          {item.recommended_tests.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Recommended Investigations
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.recommended_tests.slice(0, 5).map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-purple-100 text-purple-700 rounded-full px-2.5 py-1 font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Self care */}
          {item.self_care.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Self-Care
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                {item.self_care.slice(0, 4).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* When to see doctor */}
          <div className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs text-gray-600">
            <strong>When to see a doctor:</strong> {item.when_to_see_doctor}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------

function SectionCard({
  icon,
  title,
  colorClass = "text-blue-600",
  borderClass = "border-blue-100",
  bgClass = "bg-blue-50",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  colorClass?: string;
  borderClass?: string;
  bgClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("rounded-2xl border p-5", borderClass, bgClass)}>
      <div className={clsx("flex items-center gap-2 mb-4 font-semibold", colorClass)}>
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AssessmentResultProps {
  result: FullAssessmentResponse;
  onReset: () => void;
}

export default function AssessmentResult({ result, onReset }: AssessmentResultProps) {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clinical Assessment</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Powered by PantheonMed Clinical Engine
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TriageBadge level={result.triage_level} />
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            <RefreshCcw className="h-4 w-4" />
            New Assessment
          </button>
        </div>
      </div>

      {/* ── Emergency banner ──────────────────────────────────────────── */}
      <EmergencyBanner flags={result.red_flags} />
      <UrgentWarnings flags={result.red_flags} />

      {/* ── Clinical note ─────────────────────────────────────────────── */}
      <SectionCard
        icon={<Stethoscope className="h-5 w-5" />}
        title="Clinical Summary"
        borderClass="border-blue-100"
        bgClass="bg-white"
        colorClass="text-blue-700"
      >
        <p className="text-sm text-gray-700 leading-relaxed">{result.clinical_note}</p>

        {result.detected_symptoms.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.detected_symptoms.map((s) => (
              <span
                key={s}
                className="text-xs bg-blue-100 text-blue-700 rounded-full px-2.5 py-1 font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Differential diagnosis list ───────────────────────────────── */}
      {result.diagnoses.length > 0 && (
        <SectionCard
          icon={<Activity className="h-5 w-5" />}
          title="Differential Diagnosis"
          borderClass="border-gray-100"
          bgClass="bg-white"
          colorClass="text-gray-800"
        >
          <p className="text-xs text-gray-400 mb-3">
            Conditions ranked by symptom-weighted probability. Click each card to expand.
          </p>
          <div className="space-y-3">
            {result.diagnoses.map((d, i) => (
              <DiagnosisCard key={d.disease_id} item={d} rank={i} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Recommended tests ─────────────────────────────────────────── */}
      {result.recommended_tests.length > 0 && (
        <SectionCard
          icon={<FlaskConical className="h-5 w-5" />}
          title="Recommended Investigations"
          borderClass="border-purple-100"
          bgClass="bg-purple-50"
          colorClass="text-purple-700"
        >
          <div className="flex flex-wrap gap-2">
            {result.recommended_tests.map((t) => (
              <span
                key={t}
                className="text-sm bg-purple-100 text-purple-800 rounded-lg px-3 py-1.5 font-medium border border-purple-200"
              >
                {t}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Self-care advice ──────────────────────────────────────────── */}
      {result.self_care_advice.length > 0 && (
        <SectionCard
          icon={<Shield className="h-5 w-5" />}
          title="Self-Care Advice"
          borderClass="border-emerald-100"
          bgClass="bg-emerald-50"
          colorClass="text-emerald-700"
        >
          <ul className="space-y-2">
            {result.self_care_advice.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Follow-up questions ───────────────────────────────────────── */}
      {result.follow_up_questions.length > 0 && (
        <SectionCard
          icon={<HelpCircle className="h-5 w-5" />}
          title="Questions to Discuss with Your Doctor"
          borderClass="border-sky-100"
          bgClass="bg-sky-50"
          colorClass="text-sky-700"
        >
          <ul className="space-y-2">
            {result.follow_up_questions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-sky-900">
                <Info className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Escalation recommendation ─────────────────────────────────── */}
      <SectionCard
        icon={<ClipboardList className="h-5 w-5" />}
        title="Doctor Escalation Recommendation"
        borderClass={
          result.triage_level === "EMERGENCY" ? "border-red-200"
          : result.triage_level === "URGENT"   ? "border-amber-200"
          : "border-blue-100"
        }
        bgClass={
          result.triage_level === "EMERGENCY" ? "bg-red-50"
          : result.triage_level === "URGENT"   ? "bg-amber-50"
          : "bg-white"
        }
        colorClass={
          result.triage_level === "EMERGENCY" ? "text-red-700"
          : result.triage_level === "URGENT"   ? "text-amber-700"
          : "text-blue-700"
        }
      >
        <p className={clsx(
          "text-sm font-semibold",
          result.triage_level === "EMERGENCY" ? "text-red-700"
          : result.triage_level === "URGENT"   ? "text-amber-700"
          : "text-gray-700",
        )}>
          {result.escalation_recommendation}
        </p>
      </SectionCard>

      {/* ── Medical disclaimer ────────────────────────────────────────── */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
        <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
            Medical Disclaimer
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            This assessment is generated by an AI clinical decision support engine and is intended
            for informational purposes only. It does not constitute a medical diagnosis or replace
            the professional judgement of a qualified healthcare provider. Always consult a licensed
            physician before making any medical decisions.
          </p>
        </div>
      </div>

      {/* ── Reset button ──────────────────────────────────────────────── */}
      <div className="flex justify-center pb-4">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow hover:shadow-md"
        >
          <RefreshCcw className="h-4 w-4" />
          Start New Assessment
        </button>
      </div>
    </div>
  );
}
