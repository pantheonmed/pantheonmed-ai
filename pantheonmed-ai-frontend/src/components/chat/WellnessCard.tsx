"use client";

/**
 * WellnessCard
 * ============
 * Renders structured responses for HEALTH_GOAL and MEDICAL_KNOWLEDGE intents.
 * Used instead of ResponseCard when the AI is acting as a wellness coach
 * or medical educator (not a clinical diagnostician).
 */

import React, { useState } from "react";
import clsx from "clsx";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Heart,
  Info,
  Shield,
  Stethoscope,
} from "lucide-react";
import type { WellnessSection, WellnessResponse } from "./intentClassifier";

// Re-export for convenience
export type { WellnessSection, WellnessResponse };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Try to parse the AI response string as a WellnessResponse JSON. */
export function parseWellnessResponse(raw: unknown): WellnessResponse | null {
  try {
    if (raw && typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      if (
        (r.category === "HEALTH_GOAL" || r.category === "MEDICAL_KNOWLEDGE") &&
        typeof r.headline === "string" &&
        typeof r.overview === "string" &&
        Array.isArray(r.sections)
      ) {
        return raw as WellnessResponse;
      }
    }
    if (typeof raw === "string") {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return parseWellnessResponse(parsed);
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Section component (collapsible)
// ---------------------------------------------------------------------------

function WellnessSection({ sec, defaultOpen = true }: { sec: WellnessSection; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <span>{sec.emoji}</span>
          {sec.label}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && (
        <ul className="px-4 py-3 space-y-1.5 bg-white">
          {(sec.points ?? []).map((pt, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
              {pt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Intent badge
// ---------------------------------------------------------------------------

interface IntentBadgeProps {
  category: "HEALTH_GOAL" | "MEDICAL_KNOWLEDGE";
}

function IntentBadge({ category }: IntentBadgeProps) {
  if (category === "HEALTH_GOAL") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1">
        <Heart className="h-3 w-3" />
        Wellness Guide
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 rounded-full px-2.5 py-1">
      <BookOpen className="h-3 w-3" />
      Medical Knowledge
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface WellnessCardProps {
  data: WellnessResponse;
}

export default function WellnessCard({ data }: WellnessCardProps) {
  const isGoal = data.category === "HEALTH_GOAL";

  return (
    <div className="space-y-3 w-full">

      {/* Header */}
      <div className={clsx(
        "rounded-2xl px-5 py-4",
        isGoal
          ? "bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100"
          : "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100",
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <IntentBadge category={data.category} />
            <h3 className={clsx(
              "text-base font-bold mt-2",
              isGoal ? "text-emerald-900" : "text-blue-900",
            )}>
              {data.headline}
            </h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{data.overview}</p>
          </div>
          <div className={clsx(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
            isGoal ? "bg-emerald-500" : "bg-blue-500",
          )}>
            {isGoal ? (
              <Heart className="h-5 w-5 text-white" />
            ) : (
              <BookOpen className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {(data.sections ?? []).map((sec, i) => (
          <WellnessSection key={i} sec={sec} defaultOpen={i < 2} />
        ))}
      </div>

      {/* Caution */}
      {data.caution && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-0.5">Important Note</p>
            <p className="text-sm text-amber-700">{data.caution}</p>
          </div>
        </div>
      )}

      {/* Doctor advice */}
      {data.doctor_advice && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <Stethoscope className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-0.5">When to See a Doctor</p>
            <p className="text-sm text-blue-700">{data.doctor_advice}</p>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <Shield className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-500 leading-relaxed">{data.disclaimer}</p>
      </div>
    </div>
  );
}
