"use client";
/**
 * ClinicalReasoningCard
 * =====================
 * Renders the structured output of the Clinical Reasoning Engine — the
 * diagnostic pre-processing layer that runs before the AI response.
 *
 * Sections:
 *   • Detected Symptoms
 *   • Differential Diagnosis (probability bar chart)
 *   • Recommended Investigations
 *   • Red Flags (emergency / high-risk alerts)
 */

import { ClinicalReasoningOutput, ClinicalCondition, ClinicalRedFlag } from "@/services/api";
import { Activity, FlaskConical, AlertTriangle, Stethoscope, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

// ── Helpers ──────────────────────────────────────────────────────────────────

function riskStyle(level?: string): string {
  switch ((level ?? "").toUpperCase()) {
    case "EMERGENCY": return "bg-red-100   text-red-700   border-red-200";
    case "HIGH":      return "bg-orange-100 text-orange-700 border-orange-200";
    case "MODERATE":  return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default:          return "bg-green-100  text-green-700  border-green-200";
  }
}

function probabilityBarColor(prob: number): string {
  if (prob >= 0.5) return "bg-blue-500";
  if (prob >= 0.3) return "bg-blue-400";
  if (prob >= 0.15) return "bg-blue-300";
  return "bg-blue-200";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  icon, title, accent, children, defaultOpen = true,
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={clsx("rounded-xl border overflow-hidden", accent)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[11.5px] font-bold text-gray-700">{title}</span>
        </div>
        {open
          ? <ChevronUp   size={13} className="text-gray-400 shrink-0" />
          : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
      </button>
      {open && <div className="px-3.5 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

function ConditionRow({ item, rank }: { item: ClinicalCondition; rank: number }) {
  const pct = Math.round(item.probability * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
            {rank}
          </span>
          <span className="text-[12px] font-semibold text-gray-800 truncate">{item.condition}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-blue-700">{pct}%</span>
          {item.risk_level && item.risk_level !== "LOW" && (
            <span className={clsx(
              "text-[9.5px] font-bold px-1.5 py-px rounded border",
              riskStyle(item.risk_level),
            )}>
              {item.risk_level}
            </span>
          )}
        </div>
      </div>
      {/* Probability bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all", probabilityBarColor(item.probability))}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
      {/* Matched symptoms */}
      {item.matched_symptoms?.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {item.matched_symptoms.slice(0, 4).map((s, i) => (
            <span key={i} className="text-[10px] px-1.5 py-px rounded bg-blue-50 text-blue-600 border border-blue-100">
              {s}
            </span>
          ))}
          {item.matched_symptoms.length > 4 && (
            <span className="text-[10px] text-gray-400">+{item.matched_symptoms.length - 4} more</span>
          )}
        </div>
      )}
    </div>
  );
}

function RedFlagBanner({ flags }: { flags: ClinicalRedFlag[] }) {
  if (!flags.length) return null;
  const isEmergency = flags.some(f => f.severity === "EMERGENCY");

  return (
    <div className={clsx(
      "rounded-xl border p-3 space-y-2",
      isEmergency
        ? "bg-red-50 border-red-200"
        : "bg-orange-50 border-orange-200",
    )}>
      <div className="flex items-center gap-2">
        <AlertTriangle
          size={14}
          className={isEmergency ? "text-red-600" : "text-orange-600"}
        />
        <span className={clsx(
          "text-[11.5px] font-bold",
          isEmergency ? "text-red-700" : "text-orange-700",
        )}>
          {isEmergency ? "⚠ Emergency Red Flags Detected" : "⚠ Clinical Red Flags"}
        </span>
      </div>
      {flags.map((f, i) => (
        <div key={i} className="space-y-0.5 pl-1 border-l-2 border-red-300">
          <p className={clsx(
            "text-[12px] font-semibold",
            f.severity === "EMERGENCY" ? "text-red-800" : "text-orange-800",
          )}>
            {f.flag}
          </p>
          <p className="text-[11px] text-gray-600">{f.action}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  reasoning:  ClinicalReasoningOutput;
  compact?:   boolean;
}

export default function ClinicalReasoningCard({ reasoning, compact = false }: Props) {
  const hasSymptoms    = reasoning.symptoms.length > 0;
  const hasConditions  = reasoning.possible_conditions.length > 0;
  const hasTests       = reasoning.recommended_tests.length > 0;
  const hasRedFlags    = reasoning.red_flags.length > 0;

  return (
    <div className={clsx(
      "rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/40 to-white overflow-hidden",
      compact ? "text-xs" : "",
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600/5 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
            <Stethoscope size={13} className="text-blue-700" />
          </div>
          <span className="text-[12px] font-bold text-blue-800 uppercase tracking-wide">
            Clinical Reasoning Engine
          </span>
        </div>
        <span className={clsx(
          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
          riskStyle(reasoning.risk_level?.toUpperCase()),
        )}>
          {reasoning.risk_level?.toUpperCase()}
        </span>
      </div>

      <div className="p-3 space-y-2">
        {/* Red flags — always first if present */}
        {hasRedFlags && <RedFlagBanner flags={reasoning.red_flags} />}

        {/* Detected symptoms */}
        {hasSymptoms && (
          <Section
            icon={<Activity size={13} className="text-teal-600" />}
            title="Detected Symptoms"
            accent="bg-teal-50 border-teal-100"
          >
            <div className="flex flex-wrap gap-1.5">
              {reasoning.symptoms.map((s, i) => (
                <span
                  key={i}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200"
                >
                  {s}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Differential diagnosis */}
        {hasConditions && (
          <Section
            icon={<Stethoscope size={13} className="text-blue-600" />}
            title={`Differential Diagnosis (${reasoning.possible_conditions.length} conditions)`}
            accent="bg-blue-50 border-blue-100"
          >
            <div className="space-y-3">
              {reasoning.possible_conditions.map((cond, i) => (
                <ConditionRow key={i} item={cond} rank={i + 1} />
              ))}
            </div>
          </Section>
        )}

        {/* Recommended investigations */}
        {hasTests && (
          <Section
            icon={<FlaskConical size={13} className="text-purple-600" />}
            title="Recommended Investigations"
            accent="bg-purple-50 border-purple-100"
            defaultOpen={!compact}
          >
            <div className="flex flex-wrap gap-1.5">
              {reasoning.recommended_tests.map((t, i) => (
                <span
                  key={i}
                  className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200"
                >
                  {t}
                </span>
              ))}
            </div>
          </Section>
        )}

        <p className="text-[9.5px] text-gray-400 px-0.5">
          Clinical Reasoning Engine v{reasoning.reasoning_version} · Pre-analysis before AI response
        </p>
      </div>
    </div>
  );
}
