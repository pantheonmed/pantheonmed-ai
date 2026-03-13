"use client";

import React, { Suspense, useState } from "react";
import { Activity, Brain, ChevronRight, Clock, Shield, Stethoscope } from "lucide-react";
import SymptomIntake from "@/components/SymptomIntake";
import AssessmentResult from "@/components/AssessmentResult";
import { symptomAssessmentAPI, FullAssessmentResponse, SymptomIntakeRequest } from "@/services/api";

// ---------------------------------------------------------------------------
// Hero / info strip
// ---------------------------------------------------------------------------

const INFO_CARDS = [
  {
    icon: <Brain className="h-6 w-6 text-blue-600" />,
    title: "AI Clinical Reasoning",
    desc: "Structured differential diagnosis powered by a medical knowledge graph with 30+ ICD-10 coded diseases.",
  },
  {
    icon: <Shield className="h-6 w-6 text-red-500" />,
    title: "Red Flag Detection",
    desc: "Real-time emergency triage using clinical safety rules — FAST stroke criteria, heart attack, meningitis and more.",
  },
  {
    icon: <Clock className="h-6 w-6 text-emerald-600" />,
    title: "Weighted Probability",
    desc: "Symptom-weighted scoring with Softmax normalisation gives you calibrated condition probabilities.",
  },
  {
    icon: <Stethoscope className="h-6 w-6 text-purple-600" />,
    title: "Clinical Self-Care",
    desc: "Condition-specific self-care advice, investigation recommendations, and doctor escalation guidance.",
  },
];

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function AssessmentLoading() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-100 rounded-2xl h-28" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SymptomAssessmentPage() {
  const [result, setResult] = useState<FullAssessmentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (req: SymptomIntakeRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await symptomAssessmentAPI.assess(req);
      setResult(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Assessment failed. Please check your backend connection and try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clinical Symptom Assessment</h1>
              <p className="text-sm text-gray-500">
                AI-powered differential diagnosis · Triage engine · Red flag detection
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info strip ──────────────────────────────────────────────────── */}
      {!result && !isLoading && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {INFO_CARDS.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-3">{card.icon}</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{card.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">

        {/* Error state */}
        {error && !isLoading && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-5 flex items-start gap-3">
            <Shield className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 mb-1">Assessment Error</p>
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={handleReset}
                className="mt-3 text-sm text-red-600 underline hover:text-red-800"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center py-16 gap-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
              <Stethoscope className="absolute inset-0 m-auto h-7 w-7 text-blue-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">Analysing your symptoms...</p>
              <p className="text-sm text-gray-500 mt-1">
                Running clinical knowledge graph · Checking red flags · Building differential
              </p>
            </div>
            <Suspense fallback={null}>
              <AssessmentLoading />
            </Suspense>
          </div>
        )}

        {/* Result */}
        {result && !isLoading && (
          <Suspense fallback={<AssessmentLoading />}>
            <AssessmentResult result={result} onReset={handleReset} />
          </Suspense>
        )}

        {/* Intake form */}
        {!result && !isLoading && (
          <SymptomIntake onSubmit={handleSubmit} isLoading={isLoading} />
        )}

        {/* How it works (shown below form only) */}
        {!result && !isLoading && (
          <div className="mt-12 max-w-2xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
              How it works
            </h3>
            <div className="space-y-3">
              {[
                ["1. Symptom Input",  "You describe your chief complaint and select associated symptoms."],
                ["2. Red Flag Check", "Clinical safety rules fire instantly — FAST stroke, heart attack, meningitis, DKA and more."],
                ["3. Weighted Scoring", "Each symptom is matched against 30+ ICD-10 coded diseases using a weighted knowledge graph."],
                ["4. Probability Ranking", "Softmax normalisation produces calibrated differential diagnosis probabilities."],
                ["5. Clinical Guidance", "Investigation recommendations, self-care advice, and escalation guidance are generated."],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3 items-start text-sm">
                  <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-gray-700">{title}</span>
                    <span className="text-gray-500"> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
