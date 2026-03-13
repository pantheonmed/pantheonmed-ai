"use client";

/**
 * ResponseCard — renders a structured AI clinical response.
 * Handles ClinicalConsultation responses from /api/v1/ai/chat.
 * Supports collapsible sections with polished medical card UI.
 */

import React, { useState } from "react";
import clsx from "clsx";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  HelpCircle,
  Heart,
  Shield,
  Stethoscope,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ClinicalConsultation } from "@/services/api";
import type { ChatModeId } from "./types";
import { CHAT_MODES } from "./modes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ProbBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-0.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${Math.min(value * 100, 100)}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-600 w-9 text-right">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

interface SectionProps {
  icon: LucideIcon;
  title: string;
  badge?: string;
  badgeColor?: string;
  defaultOpen?: boolean;
  accentColor?: string;
  children: React.ReactNode;
}

function Section({
  icon: Icon,
  title,
  badge,
  badgeColor = "bg-blue-100 text-blue-700",
  defaultOpen = true,
  accentColor = "bg-blue-600",
  children,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className={clsx("h-6 w-6 rounded-lg flex items-center justify-center shrink-0", accentColor)}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="flex-1 text-sm font-semibold text-gray-800">{title}</span>
        {badge && (
          <span className={clsx("text-[10px] font-bold rounded-full px-2 py-0.5", badgeColor)}>
            {badge}
          </span>
        )}
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </button>
      {open && <div className="px-4 py-4">{children}</div>}
    </div>
  );
}

function Chip({ label, color = "bg-blue-100 text-blue-700" }: { label: string; color?: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", color)}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Triage badge
// ---------------------------------------------------------------------------

const RISK_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  emergency: { bg: "bg-red-600",    text: "text-white", label: "🚨 EMERGENCY" },
  high:      { bg: "bg-orange-500", text: "text-white", label: "⚠️ HIGH RISK" },
  medium:    { bg: "bg-amber-500",  text: "text-white", label: "⚠️ MODERATE"  },
  low:       { bg: "bg-emerald-500",text: "text-white", label: "✓ LOW RISK"   },
  urgent:    { bg: "bg-orange-500", text: "text-white", label: "⚠️ URGENT"    },
  routine:   { bg: "bg-blue-500",   text: "text-white", label: "🩺 ROUTINE"   },
  moderate:  { bg: "bg-amber-500",  text: "text-white", label: "⚠️ MODERATE"  },
};

function normaliseRisk(r: string): string {
  return r.toLowerCase();
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

interface ResponseCardProps {
  clinical: ClinicalConsultation;
  modeId?: ChatModeId;
}

export default function ResponseCard({ clinical, modeId = "symptom" }: ResponseCardProps) {
  const mode = CHAT_MODES[modeId] ?? CHAT_MODES.symptom;
  const ModeIcon = mode.icon;

  const riskLevel = normaliseRisk(clinical.risk_level ?? "low");
  const riskStyle = RISK_STYLES[riskLevel] ?? RISK_STYLES.low;
  const isEmergency = riskLevel === "emergency";

  // Extract symptoms from clinical reasoning or brain
  const symptoms: string[] = [
    ...(clinical.clinical_reasoning?.symptoms ?? []),
    ...(clinical.extracted_symptoms ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  // Possible conditions — prefer clinical_reasoning, fallback to differential
  const conditions = clinical.clinical_reasoning?.possible_conditions?.length
    ? clinical.clinical_reasoning.possible_conditions
    : clinical.differential_diagnosis?.map((d) => ({
        condition: d.condition,
        probability: 0.5 - d.rank * 0.08,
        matched_symptoms: [],
        risk_level: "low" as const,
        category: "",
      })) ?? [];

  // Tests
  const tests = [
    ...(clinical.clinical_reasoning?.recommended_tests ?? []),
    ...(clinical.brain_recommended_tests ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  // Red flags
  const redFlags = [
    ...(clinical.clinical_reasoning?.red_flags?.map((r) => r.flag) ?? []),
    ...(clinical.emergency_warning_signs ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);

  return (
    <div className="w-full space-y-3">

      {/* ── Card header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className={clsx("h-8 w-8 rounded-xl flex items-center justify-center", mode.color)}>
          <ModeIcon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">Clinical Assessment</p>
          <p className={clsx("text-xs font-medium", mode.textColor)}>{mode.label}</p>
        </div>
        <span className={clsx("text-xs font-bold px-3 py-1 rounded-full", riskStyle.bg, riskStyle.text)}>
          {riskStyle.label}
        </span>
      </div>

      {/* ── Emergency banner ─────────────────────────────────────────── */}
      {isEmergency && (
        <div className="rounded-xl bg-red-50 border-2 border-red-400 p-4 flex gap-3">
          <AlertOctagon className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-bold text-sm">Possible Medical Emergency Detected</p>
            <p className="text-red-600 text-xs mt-0.5">
              {clinical.emergency_warning_signs?.[0] ??
                "Seek immediate medical attention or call 112."}
            </p>
          </div>
        </div>
      )}

      {/* ── Doctor Assessment ─────────────────────────────────────────── */}
      {clinical.doctor_assessment && (
        <Section icon={Stethoscope} title="Doctor Assessment" accentColor={mode.color} defaultOpen>
          <p className="text-sm text-gray-700 leading-relaxed">{clinical.doctor_assessment}</p>
          {symptoms.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {symptoms.map((s) => (
                <Chip key={s} label={s} color="bg-blue-50 text-blue-700" />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── Detected Symptoms ─────────────────────────────────────────── */}
      {symptoms.length > 0 && !clinical.doctor_assessment && (
        <Section icon={Activity} title="Detected Symptoms" accentColor="bg-blue-600" defaultOpen>
          <div className="flex flex-wrap gap-1.5">
            {symptoms.map((s) => (
              <Chip key={s} label={s} color="bg-blue-50 text-blue-700" />
            ))}
          </div>
        </Section>
      )}

      {/* ── Possible Conditions ───────────────────────────────────────── */}
      {conditions.length > 0 && (
        <Section
          icon={TrendingUp}
          title="Possible Conditions"
          badge={`${conditions.length} found`}
          badgeColor="bg-purple-100 text-purple-700"
          accentColor="bg-purple-600"
          defaultOpen
        >
          <div className="space-y-3">
            {conditions.slice(0, 5).map((c, i) => {
                const rawLevel = typeof c === "object" && "risk_level" in c ? String(c.risk_level) : "low";
              const condLevel = normaliseRisk(rawLevel);
              const barColor =
                condLevel === "emergency" ? "bg-red-500"
                : condLevel === "high"    ? "bg-orange-500"
                : condLevel === "moderate"|| condLevel === "medium" ? "bg-amber-500"
                : "bg-blue-500";

              return (
                <div key={`${c.condition}-${i}`} className="flex items-start gap-3">
                  <div className={clsx(
                    "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white",
                    i === 0 ? "bg-purple-600" : "bg-gray-300",
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">{c.condition}</p>
                      {i === 0 && (
                        <span className="text-[9px] bg-purple-100 text-purple-700 font-bold rounded-full px-1.5 py-0.5">
                          Most likely
                        </span>
                      )}
                    </div>
                    {typeof c === "object" && "explanation" in c && (c as { explanation?: string }).explanation && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{(c as { explanation?: string }).explanation}</p>
                    )}
                    {typeof c === "object" && "probability" in c && typeof c.probability === "number" && (
                      <ProbBar value={c.probability} color={barColor} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Red Flag Warnings ─────────────────────────────────────────── */}
      {redFlags.length > 0 && (
        <Section
          icon={AlertTriangle}
          title="Red Flag Warnings"
          badge="Action required"
          badgeColor="bg-red-100 text-red-700"
          accentColor="bg-red-600"
          defaultOpen={isEmergency}
        >
          <ul className="space-y-2">
            {redFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-red-700">{flag}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Recommended Tests ─────────────────────────────────────────── */}
      {tests.length > 0 && (
        <Section
          icon={FlaskConical}
          title="Recommended Tests"
          badge={`${tests.length} tests`}
          badgeColor="bg-cyan-100 text-cyan-700"
          accentColor="bg-cyan-600"
          defaultOpen
        >
          <div className="flex flex-wrap gap-2">
            {tests.map((t) => (
              <Chip key={t} label={t} color="bg-cyan-50 text-cyan-800 border border-cyan-200" />
            ))}
          </div>
        </Section>
      )}

      {/* ── Recommended Next Steps / Treatments ──────────────────────── */}
      {(clinical.recommended_next_steps?.length ?? 0) > 0 && (
        <Section
          icon={ClipboardList}
          title="Treatment & Next Steps"
          accentColor="bg-emerald-600"
          defaultOpen
        >
          <ul className="space-y-2">
            {clinical.recommended_next_steps!.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-emerald-700">{i + 1}</span>
                </div>
                {step}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Key Symptoms to Monitor ───────────────────────────────────── */}
      {(clinical.key_symptoms_to_check?.length ?? 0) > 0 && (
        <Section icon={Heart} title="Key Symptoms to Monitor" accentColor="bg-rose-500" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {clinical.key_symptoms_to_check!.map((s) => (
              <Chip key={s} label={s} color="bg-rose-50 text-rose-700 border border-rose-200" />
            ))}
          </div>
        </Section>
      )}

      {/* ── Follow-up Questions ───────────────────────────────────────── */}
      {(clinical.follow_up_questions?.length ?? 0) > 0 && (
        <Section icon={HelpCircle} title="Follow-up Questions" accentColor="bg-sky-600" defaultOpen={false}>
          <ul className="space-y-2">
            {clinical.follow_up_questions!.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-sky-800">
                <div className="h-1.5 w-1.5 rounded-full bg-sky-400 mt-2 shrink-0" />
                {q}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Research Evidence ─────────────────────────────────────────── */}
      {(clinical.research_evidence?.length ?? 0) > 0 && (
        <Section icon={BookOpen} title="Research Evidence" accentColor="bg-amber-600" defaultOpen={false}>
          <div className="space-y-2">
            {clinical.research_evidence!.slice(0, 3).map((paper, i) => (
              <div key={i} className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-900 line-clamp-2">{paper.title}</p>
                {paper.year && (
                  <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {paper.year}
                    {paper.journal && ` · ${paper.journal}`}
                  </p>
                )}
                {paper.url && (
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 hover:underline mt-0.5 block"
                  >
                    Read on PubMed →
                  </a>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Medical Disclaimer ────────────────────────────────────────── */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex gap-2">
        <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-0.5">Medical Disclaimer</p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            {clinical.medical_disclaimer ||
              "This AI-generated assessment is for informational purposes only and does not constitute a medical diagnosis. Always consult a qualified healthcare professional."}
          </p>
        </div>
      </div>

      {/* ── Data sources ──────────────────────────────────────────────── */}
      {(clinical.data_sources?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <FileText className="h-3 w-3 text-gray-400" />
          <p className="text-[10px] text-gray-400">Sources: {clinical.data_sources!.join(" · ")}</p>
        </div>
      )}
    </div>
  );
}
