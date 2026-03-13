"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChatMessage, ClinicalConsultation, DifferentialItem } from "@/services/api";
import {
  Activity, User, Stethoscope, CheckCircle2, FileText,
  ShieldAlert, Brain, Salad, Dumbbell, Heart, Leaf,
  Thermometer, ClipboardList,
} from "lucide-react";
import clsx from "clsx";
import ExternalDataCards from "@/components/ExternalDataCards";
import ClinicalReasoningCard from "@/components/ClinicalReasoningCard";

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Dispatch a question as if the user typed it. ChatWindow listens for this. */
function sendQuestion(q: string) {
  window.dispatchEvent(new CustomEvent("pm:quick-prompt", { detail: q }));
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON extraction — strips markdown fences, handles preamble text
// ─────────────────────────────────────────────────────────────────────────────
function extractJsonText(content: string): string | null {
  let text = content.trim();
  // Strip ```json ... ``` or ``` ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  // Find first { if AI prepended prose
  if (!text.startsWith("{")) {
    const idx = text.indexOf("{");
    if (idx === -1) return null;
    text = text.slice(idx);
  }
  const lastBrace = text.lastIndexOf("}");
  if (lastBrace === -1) return null;
  return text.slice(0, lastBrace + 1);
}

function parseClinical(content: string): ClinicalConsultation | null {
  const json = extractJsonText(content);
  if (!json) return null;
  try {
    const p = JSON.parse(json);
    if (p.doctor_assessment || p.differential_diagnosis || p.consultation_type) {
      return p as ClinicalConsultation;
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown renderer (legacy plain-text fallback only)
// ─────────────────────────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^[-•*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*?<\/li>\n?)+/gs, m => `<ul class="space-y-1 ml-1">${m}</ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

// ─────────────────────────────────────────────────────────────────────────────
// Anatomy cross-reference links
// ─────────────────────────────────────────────────────────────────────────────
const ORGAN_PATTERNS: { id: string; label: string; emoji: string; re: RegExp }[] = [
  { id: "brain",   label: "Brain",   emoji: "🧠", re: /\b(brain|cerebr|neuro|headache|migraine|stroke|meningitis|encephalit)\w*/i },
  { id: "heart",   label: "Heart",   emoji: "❤️", re: /\b(heart|cardiac|coronary|myocard|angina|arrhythmia|atrial|ventricular|palpitation)\w*/i },
  { id: "lungs",   label: "Lungs",   emoji: "🫁", re: /\b(lung|pulmonary|bronch|pneumo|asthma|COPD|respir|breath|dyspnea)\w*/i },
  { id: "liver",   label: "Liver",   emoji: "🟤", re: /\b(liver|hepat|jaundice|biliary|cirrhosis|hepatitis|bilirubin)\w*/i },
  { id: "stomach", label: "Stomach", emoji: "🫀", re: /\b(stomach|gastric|duoden|peptic|gastritis|GERD|reflux|nausea|vomit)\w*/i },
  { id: "kidneys", label: "Kidneys", emoji: "🫘", re: /\b(kidney|renal|nephro|urinary|creatinine|eGFR|UTI|dialysis)\w*/i },
  { id: "bones",   label: "Bones",   emoji: "🦴", re: /\b(bone|skeletal|joint|arthritis|fracture|osteo|spine|vertebr)\w*/i },
];

function AnatomyLinks({ text }: { text: string }) {
  const organs = ORGAN_PATTERNS.filter(o => o.re.test(text));
  if (organs.length === 0) return null;
  return (
    <div className="mt-2.5 pt-2.5 border-t border-blue-100 flex items-center gap-1.5 flex-wrap">
      <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-blue-400 shrink-0 flex items-center gap-0.5">
        <Brain size={9} /> Anatomy:
      </span>
      {organs.map(o => (
        <Link key={o.id} href={`/anatomy?organ=${o.id}`}
          className="inline-flex items-center gap-1 text-[10.5px] font-medium bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-400 text-blue-700 px-2 py-0.5 rounded-full transition-all">
          <span>{o.emoji}</span>{o.label}
        </Link>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Tappable question chip — clicking auto-sends the question into chat. */
function QuestionChip({ q }: { q: string }) {
  return (
    <button
      onClick={() => sendQuestion(q)}
      className="text-left text-[12px] bg-white border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full transition-all font-medium leading-snug shadow-sm active:scale-95"
    >
      {q}
    </button>
  );
}

/** Row of clickable follow-up chips. */
function FollowUpChips({ questions, accentColor = "indigo" }: { questions: string[]; accentColor?: string }) {
  if (questions.length === 0) return null;
  const borderCls = accentColor === "teal"
    ? "border-teal-200 hover:border-teal-400 hover:bg-teal-50 text-teal-700"
    : "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700";
  return (
    <div className="pt-3 pb-1">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-gray-400 mb-2">
        Tap to answer:
      </p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => sendQuestion(q)}
            className={clsx(
              "text-left text-[12px] bg-white border px-3 py-1.5 rounded-full transition-all font-medium leading-snug shadow-sm active:scale-95",
              borderCls,
            )}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Bullet list item. */
function Bullet({ text, color }: { text: string; color: string }) {
  return (
    <li className="flex items-start gap-2 text-[12.5px] text-gray-700 leading-relaxed">
      <span className={clsx("mt-[7px] w-1.5 h-1.5 rounded-full shrink-0", color)} />
      {text}
    </li>
  );
}

/** Labelled section card inside a consultation. */
function SectionCard({
  icon, label, accent, bg, labelColor, children,
}: {
  icon: React.ReactNode; label: string; accent: string;
  bg: string; labelColor: string; children: React.ReactNode;
}) {
  return (
    <div className={clsx("rounded-xl border overflow-hidden", bg)}>
      <div className={clsx("flex items-center gap-2 px-4 py-2.5 border-b", accent)}>
        <span className={clsx("shrink-0", labelColor)}>{icon}</span>
        <span className={clsx("text-[10.5px] font-bold uppercase tracking-[0.07em]", labelColor)}>
          {label}
        </span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

/** Compact risk badge. */
function RiskBadge({ level }: { level?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    emergency: { label: "⚠ EMERGENCY",  cls: "bg-red-600 text-white" },
    high:      { label: "High Risk",     cls: "bg-orange-500 text-white" },
    medium:    { label: "Moderate Risk", cls: "bg-amber-400 text-amber-900" },
    low:       { label: "Low Risk",      cls: "bg-emerald-100 text-emerald-800" },
  };
  const entry = map[level ?? "low"] ?? map.low;
  return (
    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", entry.cls)}>
      {entry.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WELLNESS CARD  (HEALTH_GOAL / FITNESS / DIET / WELLNESS / MENTAL_HEALTH …)
// ─────────────────────────────────────────────────────────────────────────────
const WELLNESS_INTENTS = new Set([
  "HEALTH_GOAL", "FITNESS", "DIET", "WELLNESS",
  "MENTAL_HEALTH", "PREVENTION", "GENERAL_HEALTH",
]);

function WellnessCard({ data, timestamp }: { data: ClinicalConsultation; timestamp: string }) {
  const META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    FITNESS:       { icon: <Dumbbell size={11} className="text-white" />, label: "Fitness Guidance",  color: "bg-emerald-600" },
    DIET:          { icon: <Salad    size={11} className="text-white" />, label: "Nutrition & Diet",  color: "bg-emerald-600" },
    MENTAL_HEALTH: { icon: <Heart    size={11} className="text-white" />, label: "Mental Wellness",   color: "bg-teal-600" },
    WELLNESS:      { icon: <Leaf     size={11} className="text-white" />, label: "Wellness Advice",   color: "bg-teal-600" },
    HEALTH_GOAL:   { icon: <CheckCircle2 size={11} className="text-white" />, label: "Health Coaching", color: "bg-emerald-600" },
    PREVENTION:    { icon: <ShieldAlert  size={11} className="text-white" />, label: "Prevention Tips", color: "bg-teal-700" },
    GENERAL_HEALTH:{ icon: <Activity    size={11} className="text-white" />, label: "Health Guidance",  color: "bg-emerald-600" },
  };

  const meta = META[data.intent ?? ""] ?? META.GENERAL_HEALTH;
  const followUps = data.follow_up_questions ?? [];
  const steps     = data.recommended_next_steps ?? [];
  const keyItems  = data.key_symptoms_to_check ?? [];

  return (
    <div className="space-y-1.5 max-w-[90%] animate-slide-up">
      <div className="bg-white border border-emerald-100 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/30">
          <div className="flex items-center gap-2">
            <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center", meta.color)}>
              {meta.icon}
            </div>
            <div>
              <p className="text-[11px] font-bold text-emerald-800 leading-none">PantheonMed AI</p>
              <p className="text-[9.5px] text-emerald-500 leading-none mt-0.5">{meta.label}</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            Wellness
          </span>
        </div>

        {/* ── Main conversational text ── */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-[13.5px] text-gray-800 leading-relaxed">{data.doctor_assessment}</p>
        </div>

        {/* ── Recommended steps ── */}
        {steps.length > 0 && (
          <div className="mx-4 mb-3 rounded-xl bg-emerald-50 border border-emerald-100 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-100">
              <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-emerald-700">
                What to do
              </span>
            </div>
            <ul className="px-3 py-2.5 space-y-1">
              {steps.map((s, i) => <Bullet key={i} text={s} color="bg-emerald-400" />)}
            </ul>
          </div>
        )}

        {/* ── Key monitoring items ── */}
        {keyItems.length > 0 && (
          <div className="mx-4 mb-3 rounded-xl bg-sky-50 border border-sky-100 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-sky-100">
              <Thermometer size={11} className="text-sky-600 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-sky-700">
                Things to track
              </span>
            </div>
            <ul className="px-3 py-2.5 space-y-1">
              {keyItems.map((s, i) => <Bullet key={i} text={s} color="bg-sky-400" />)}
            </ul>
          </div>
        )}

        {/* ── Clickable follow-up chips ── */}
        {followUps.length > 0 && (
          <div className="px-4 pb-4">
            <FollowUpChips questions={followUps} accentColor="teal" />
          </div>
        )}

        {/* Disclaimer — compact */}
        {data.medical_disclaimer && (
          <div className="mx-4 mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-[10.5px] text-amber-700 leading-relaxed">{data.medical_disclaimer}</p>
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-400 pl-1">{fmtTime(timestamp)}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL CONSULTATION CARD  (symptoms / medication / lab / general clinical)
// ─────────────────────────────────────────────────────────────────────────────
function ConsultationCard({ data, timestamp }: { data: ClinicalConsultation; timestamp: string }) {
  // Wellness intents → friendlier card
  if (WELLNESS_INTENTS.has(data.intent ?? "")) {
    return <WellnessCard data={data} timestamp={timestamp} />;
  }

  const isEmergency =
    data.risk_level === "emergency" ||
    data.consultation_type === "emergency" ||
    /call\s*112|seek\s*immediate\s*care/i.test(data.doctor_assessment ?? "");

  const diff       = data.differential_diagnosis ?? [];
  const followUps  = data.follow_up_questions ?? [];
  const steps      = data.recommended_next_steps ?? [];
  const keySyms    = data.key_symptoms_to_check ?? [];
  const warnings   = data.emergency_warning_signs ?? [];
  const brainTests = data.brain_recommended_tests ?? [];
  const extracted  = data.extracted_symptoms ?? [];

  const hasClinicalReason = data.clinical_reasoning != null
    && (data.clinical_reasoning.possible_conditions?.length > 0
        || data.clinical_reasoning.red_flags?.length > 0);

  // Anatomy scan text
  const anatomyText = [
    data.doctor_assessment ?? "",
    diff.map((d: DifferentialItem) => `${d.condition} ${d.explanation}`).join(" "),
  ].join(" ");

  return (
    <div className="space-y-1.5 max-w-[90%] animate-slide-up">

      {/* ── Emergency banner ── */}
      {isEmergency && (
        <div className="flex items-start gap-3 bg-red-600 text-white rounded-xl px-4 py-3 shadow-lg">
          <span className="text-lg shrink-0 mt-0.5">🚨</span>
          <div>
            <p className="font-bold text-[13px] leading-tight">Medical Emergency Detected</p>
            <p className="text-red-100 text-[11.5px] mt-0.5">
              These symptoms may be life-threatening.{" "}
              <button
                onClick={() => alert("Please call 112 for emergency medical services.")}
                className="underline font-bold"
              >
                Call 112 immediately
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── Clinical reasoning engine panel ── */}
      {hasClinicalReason && (
        <ClinicalReasoningCard reasoning={data.clinical_reasoning!} compact />
      )}

      {/* ── Main card ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-gray-100 bg-gradient-to-r from-[#0F1E4A]/[0.03] to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#0F1E4A] flex items-center justify-center">
              <Stethoscope size={11} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#0F1E4A] leading-none">PantheonMed AI Doctor</p>
              <p className="text-[9.5px] text-gray-400 leading-none mt-0.5">Clinical Decision Support</p>
            </div>
          </div>
          <RiskBadge level={data.risk_level} />
        </div>

        {/* Detected symptom pills */}
        {extracted.length > 0 && (
          <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-gray-400 shrink-0">
                Detected:
              </span>
              {extracted.slice(0, 6).map((s, i) => (
                <span key={i}
                  className="inline-flex items-center px-2 py-px rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  {s}
                </span>
              ))}
              {extracted.length > 6 && (
                <span className="text-[10px] text-gray-400">+{extracted.length - 6} more</span>
              )}
            </div>
          </div>
        )}

        {/* ── PRIMARY: conversational assessment text ── */}
        <div className="px-4 pt-4 pb-3.5">
          <p className="text-[13.5px] text-gray-800 leading-relaxed">{data.doctor_assessment}</p>
          <AnatomyLinks text={anatomyText} />
        </div>

        {/* ── Possible conditions (differential diagnosis) ── */}
        {diff.length > 0 && (
          <div className="mx-4 mb-3 rounded-xl bg-violet-50 border border-violet-100 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-violet-100">
              <Stethoscope size={11} className="text-violet-600 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-violet-700">
                Possible conditions
              </span>
            </div>
            <ol className="px-3 py-2.5 space-y-2.5">
              {diff.map((item: DifferentialItem, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {item.rank ?? i + 1}
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-gray-800 leading-tight">{item.condition}</p>
                    {item.explanation && (
                      <p className="text-[11.5px] text-gray-500 mt-0.5 leading-snug">{item.explanation}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── What to do next ── */}
        {steps.length > 0 && (
          <div className="mx-4 mb-3 rounded-xl bg-emerald-50 border border-emerald-100 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-100">
              <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-emerald-700">
                What to do next
              </span>
            </div>
            <ul className="px-3 py-2.5 space-y-1">
              {steps.map((s, i) => <Bullet key={i} text={s} color="bg-emerald-400" />)}
            </ul>
          </div>
        )}

        {/* ── Key symptoms to monitor ── */}
        {keySyms.length > 0 && (
          <div className="mx-4 mb-3 rounded-xl bg-sky-50 border border-sky-100 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-sky-100">
              <Thermometer size={11} className="text-sky-600 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-sky-700">
                Symptoms to monitor
              </span>
            </div>
            <ul className="px-3 py-2.5 space-y-1">
              {keySyms.map((s, i) => <Bullet key={i} text={s} color="bg-sky-400" />)}
            </ul>
          </div>
        )}

        {/* ── Recommended investigations (Medical Brain) ── */}
        {brainTests.length > 0 && (
          <div className="mx-4 mb-3 rounded-xl bg-teal-50 border border-teal-100 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-teal-100">
              <ClipboardList size={11} className="text-teal-600 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-teal-700">
                Recommended investigations
              </span>
            </div>
            <div className="px-3 py-2.5 flex flex-wrap gap-1.5">
              {brainTests.map((t, i) => (
                <span key={i}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-teal-100 text-teal-800 border border-teal-200">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Emergency warning signs ── */}
        {(warnings.length > 0 || isEmergency) && (
          <div className="mx-4 mb-3 rounded-xl bg-red-50 border border-red-100 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-red-100">
              <ShieldAlert size={11} className="text-red-600 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-red-700">
                Seek immediate care if you notice:
              </span>
            </div>
            <ul className="px-3 py-2.5 space-y-1">
              {warnings.length > 0
                ? warnings.map((w, i) => <Bullet key={i} text={w} color="bg-red-400" />)
                : (
                  <li className="text-[12.5px] text-red-700 leading-relaxed">
                    Severe chest pain, difficulty breathing, sudden loss of consciousness,
                    heavy bleeding — <strong>call 112 immediately</strong>.
                  </li>
                )}
            </ul>
          </div>
        )}

        {/* ── Follow-up questions as clickable chips ── */}
        {followUps.length > 0 && (
          <div className="px-4 pb-4">
            <FollowUpChips questions={followUps} accentColor="indigo" />
          </div>
        )}

        {/* Disclaimer — compact, at bottom */}
        {data.medical_disclaimer && (
          <div className="mx-4 mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-[10.5px] text-amber-700 leading-relaxed">{data.medical_disclaimer}</p>
          </div>
        )}

        {/* ── External evidence data (drugs, ICD, research, trials) ── */}
        {(data.drug_info != null
          || data.icd_info != null
          || (data.research_evidence ?? []).length > 0
          || data.medical_concepts != null
          || (data.clinical_trials ?? []).some((t: { nct_id?: string; error?: string }) => !t.error && t.nct_id)
          || data.drug_interactions != null
        ) && (
          <div className="px-4 pb-4 pt-1 border-t border-gray-50">
            <ExternalDataCards
              drug_info={data.drug_info}
              icd_info={data.icd_info}
              research_evidence={data.research_evidence}
              medical_concepts={data.medical_concepts}
              clinical_trials={data.clinical_trials}
              drug_interactions={data.drug_interactions}
              data_sources={data.data_sources}
              compact
            />
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400 pl-1">{fmtTime(timestamp)}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY CARD  (plain-text / markdown fallback — should rarely trigger now)
// ─────────────────────────────────────────────────────────────────────────────
function LegacyResponseCard({ content, timestamp }: { content: string; timestamp: string }) {
  const isEmergency = /call\s*112|seek\s*immediate|breathing\s*difficulty/i.test(content);
  return (
    <div className="space-y-1.5 max-w-[88%] animate-slide-up">
      {isEmergency && (
        <div className="flex items-start gap-2.5 bg-red-600 text-white rounded-xl px-4 py-3">
          <span className="text-base shrink-0">🚨</span>
          <p className="font-bold text-[13px]">Emergency — Call 112 NOW</p>
        </div>
      )}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-5 h-5 rounded-md bg-[#0F1E4A] flex items-center justify-center">
            <Activity size={11} className="text-white" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#0F1E4A]">
            PantheonMed AI
          </span>
        </div>
        <div
          className="text-[13px] text-gray-700 leading-relaxed prose-medical"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
        <AnatomyLinks text={content} />
      </div>
      <p className="text-[10px] text-gray-400 pl-1">{fmtTime(timestamp)}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT EXPORT — MessageBubble
// ─────────────────────────────────────────────────────────────────────────────
export default function MessageBubble({ message, isNew }: { message: ChatMessage; isNew?: boolean }) {
  const isUser = message.role === "user";

  if (!isUser) {
    const clinical = parseClinical(message.content);
    return (
      <div className={clsx("flex gap-3 mr-auto", isNew && "animate-slide-right")}>
        <div className="w-9 h-9 rounded-full bg-[#0F1E4A] flex flex-col items-center justify-center shrink-0 mt-1 shadow-md gap-0.5">
          <Stethoscope size={12} className="text-white" />
          <span className="text-[7px] text-blue-200 font-bold leading-none tracking-wide">AI Dr</span>
        </div>
        {clinical
          ? <ConsultationCard data={clinical} timestamp={message.created_at} />
          : <LegacyResponseCard content={message.content} timestamp={message.created_at} />
        }
      </div>
    );
  }

  return (
    <div className={clsx("flex gap-3 ml-auto flex-row-reverse max-w-[72%]", isNew && "animate-slide-left")}>
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1 shadow-md">
        <User size={14} className="text-white" />
      </div>
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-[0_4px_14px_rgba(37,99,235,0.3)]">
        <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
        <p className="text-[10px] text-blue-200/80 mt-1.5 text-right">{fmtTime(message.created_at)}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Thinking indicator
// ─────────────────────────────────────────────────────────────────────────────
const THINKING = [
  "Analyzing your symptoms…",
  "Reviewing clinical knowledge…",
  "Building differential diagnosis…",
  "Checking ICMR guidelines…",
  "Generating clinical guidance…",
];

export function TypingIndicator() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % THINKING.length), 1600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex gap-3 mr-auto animate-fade-in">
      <div className="w-9 h-9 rounded-full bg-[#0F1E4A] flex flex-col items-center justify-center shrink-0 mt-1 shadow-md gap-0.5">
        <Stethoscope size={12} className="text-white" />
        <span className="text-[7px] text-blue-200 font-bold leading-none tracking-wide">AI Dr</span>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.05)] min-w-[240px]">
        <p className="text-blue-700 text-[12px] font-semibold mb-2.5">{THINKING[idx]}</p>
        <div className="flex gap-1.5 items-center">
          <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

// Re-export for ChatWindow
export { extractJsonText };
