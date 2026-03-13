"use client";

/**
 * InterviewCard — renders a single clinical interview question
 * with selectable option buttons.
 *
 * • Single-select:  clicking an option immediately fires onSelect
 * • Multi-select:   options toggle; a "Continue" button fires onSelect
 * • Once answered:  card locks and shows the selected answers in a summary state
 */

import React, { useState } from "react";
import clsx from "clsx";
import {
  AlertOctagon,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
} from "lucide-react";
import type { InterviewQuestion } from "./clinicalInterviewEngine";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InterviewCardProps {
  question: InterviewQuestion;
  progress: { current: number; total: number };
  answered?: boolean;
  selectedAnswers?: string[];
  emergencyAlert?: { message: string; action: string } | null;
  onSelect: (questionId: string, selectedOptions: string[]) => void;
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 font-medium shrink-0">
        {current} of {total}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Answered (locked) summary view
// ---------------------------------------------------------------------------

function AnsweredView({
  question,
  selectedAnswers,
  progress,
}: {
  question: InterviewQuestion;
  selectedAnswers: string[];
  progress: { current: number; total: number };
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm opacity-80">
      <ProgressBar current={progress.current} total={progress.total} />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Question {progress.current}
      </p>
      <p className="text-sm font-medium text-gray-700 mb-3">{question.question}</p>
      <div className="flex flex-wrap gap-2">
        {selectedAnswers.map((ans) => (
          <span
            key={ans}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 text-white rounded-full px-3 py-1.5"
          >
            <CheckCircle2 className="h-3 w-3" />
            {ans}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export default function InterviewCard({
  question,
  progress,
  answered = false,
  selectedAnswers = [],
  emergencyAlert,
  onSelect,
}: InterviewCardProps) {
  const [selected, setSelected] = useState<string[]>([]);

  // Show locked summary when already answered
  if (answered) {
    return (
      <AnsweredView
        question={question}
        selectedAnswers={selectedAnswers}
        progress={progress}
      />
    );
  }

  const isMulti = question.multiSelect ?? false;

  const toggleOption = (opt: string) => {
    if (!isMulti) {
      // Single select — immediately fire
      onSelect(question.id, [opt]);
      return;
    }
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
    );
  };

  const handleContinue = () => {
    if (selected.length === 0) return;
    onSelect(question.id, selected);
  };

  return (
    <div className="space-y-3">
      {/* Emergency banner — shown during interview if triggered */}
      {emergencyAlert && (
        <div className="rounded-xl bg-red-50 border-2 border-red-400 p-4 flex gap-3">
          <AlertOctagon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700 mb-1">{emergencyAlert.message}</p>
            <p className="text-xs text-red-600 font-medium">{emergencyAlert.action}</p>
          </div>
        </div>
      )}

      {/* Question card */}
      <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        {/* Progress */}
        <ProgressBar current={progress.current} total={progress.total} />

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <ClipboardList className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-0.5">
              Clinical Question {progress.current}
            </p>
            <p className="text-sm font-semibold text-gray-900 leading-snug">{question.question}</p>
            {question.clinicalHint && (
              <p className="text-xs text-gray-400 mt-1 italic">{question.clinicalHint}</p>
            )}
          </div>
        </div>

        {/* Multi-select hint */}
        {isMulti && (
          <div className="flex items-center gap-1.5 mb-3 text-xs text-blue-600 font-medium bg-blue-50 rounded-lg px-3 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Select all that apply
          </div>
        )}

        {/* Options */}
        <div className="flex flex-col gap-2">
          {question.options.map((opt) => {
            const isSelected = selected.includes(opt);
            const isEmergencyOpt = question.emergencyOptions?.includes(opt) ?? false;

            return (
              <button
                key={opt}
                onClick={() => toggleOption(opt)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm font-medium transition-all duration-150",
                  "hover:scale-[1.01] active:scale-[0.99]",
                  isSelected
                    ? isEmergencyOpt
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-blue-500 bg-blue-50 text-blue-700"
                    : isEmergencyOpt
                    ? "border-orange-100 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50"
                    : "border-gray-100 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
                )}
              >
                {/* Radio / Checkbox indicator */}
                <div
                  className={clsx(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    isSelected
                      ? isEmergencyOpt
                        ? "border-red-500 bg-red-500"
                        : "border-blue-500 bg-blue-500"
                      : "border-gray-300 bg-white",
                  )}
                >
                  {isSelected && (
                    isMulti ? (
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )
                  )}
                </div>

                <span className="flex-1">{opt}</span>

                {/* Emergency indicator */}
                {isEmergencyOpt && !isSelected && (
                  <span className="text-[9px] font-bold text-orange-500 border border-orange-200 rounded-full px-1.5 py-0.5 shrink-0">
                    ALERT
                  </span>
                )}
                {isEmergencyOpt && isSelected && (
                  <AlertOctagon className="h-4 w-4 text-red-500 shrink-0" />
                )}

                {/* Arrow for single select */}
                {!isMulti && !isSelected && (
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Continue button for multi-select */}
        {isMulti && (
          <div className="mt-4 flex items-center justify-between">
            {selected.length > 0 ? (
              <p className="text-xs text-blue-600 font-medium">
                {selected.length} option{selected.length > 1 ? "s" : ""} selected
              </p>
            ) : (
              <p className="text-xs text-gray-400">Select all that apply, then continue</p>
            )}
            <button
              onClick={handleContinue}
              disabled={selected.length === 0}
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                selected.length > 0
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
              )}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Clock className="h-3 w-3" />
            <span className="text-[10px]">Clinical interview · {progress.total - progress.current} question{progress.total - progress.current !== 1 ? "s" : ""} remaining</span>
          </div>
          <span className="text-[10px] text-gray-300">
            {isMulti ? "Multi-select" : "Single select"}
          </span>
        </div>
      </div>
    </div>
  );
}
