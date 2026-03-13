"use client";

/**
 * SymptomIntake — 5-step clinical assessment question flow
 * Step 1: Chief complaint (chips + free text)
 * Step 2: Associated symptoms by category
 * Step 3: Duration, severity, modifiers
 * Step 4: Health profile (age, sex, risk factors)
 * Step 5: Review & Submit
 */

import React, { useState, useCallback } from "react";
import clsx from "clsx";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Gauge,
  HeartPulse,
  Loader2,
  Search,
  User,
  X,
} from "lucide-react";
import { SymptomIntakeRequest } from "@/services/api";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CHIEF_COMPLAINT_CHIPS = [
  "Chest pain", "Headache", "Shortness of breath", "Fever", "Abdominal pain",
  "Dizziness", "Nausea / Vomiting", "Cough", "Back pain", "Fatigue",
  "Palpitations", "Leg swelling", "Skin rash", "Burning urination",
  "High blood sugar", "Blurred vision",
];

const SYMPTOM_GROUPS: Record<string, string[]> = {
  "Chest & Heart": [
    "Chest pain", "Chest tightness", "Chest pressure", "Palpitations",
    "Left arm pain", "Jaw pain", "Shortness of breath",
  ],
  "Head & Neuro": [
    "Headache", "Throbbing headache", "Dizziness", "Confusion",
    "Neck stiffness", "Facial drooping", "Arm weakness", "Speech difficulty",
    "Seizure", "Blurred vision",
  ],
  "Respiratory": [
    "Cough", "Dry cough", "Productive cough", "Wheezing",
    "Shortness of breath", "Haemoptysis",
  ],
  "Stomach & Gut": [
    "Abdominal pain", "Epigastric pain", "Nausea", "Vomiting",
    "Diarrhoea", "Constipation", "Bloating", "Heartburn",
    "Black stools", "Blood in vomit", "Loss of appetite",
  ],
  "Fever & Infection": [
    "Fever", "Chills", "Rigors", "Night sweats", "Sweating",
    "Fatigue", "Weight loss",
  ],
  "Urinary": [
    "Burning urination", "Frequent urination", "Painful urination",
    "Blood in urine", "Flank pain",
  ],
  "Skin": [
    "Skin rash", "Petechiae", "Pallor", "Jaundice", "Cyanosis",
  ],
  "Endocrine": [
    "Excessive thirst", "Frequent urination", "Fruity breath",
    "Weight gain", "Cold intolerance", "Hair loss",
  ],
  "Mental Health": [
    "Persistent low mood", "Anxiety / persistent worry",
    "Sleep disturbance", "Poor concentration", "Loss of interest",
  ],
  "Limbs & Joints": [
    "Leg swelling", "Leg pain", "Calf pain", "Joint pain", "Muscle pain",
    "Back pain", "Leg weakness",
  ],
};

const RISK_FACTOR_OPTIONS = [
  "Hypertension", "Diabetes", "High cholesterol", "Smoking / ex-smoker",
  "Obesity", "Heart disease", "Family history of heart disease",
  "Cancer", "HIV / Immunocompromised", "Chronic kidney disease",
  "Asthma / COPD", "Alcohol use", "Recent surgery", "Recent travel",
  "Pregnancy", "PCOS", "Hypothyroidism",
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ChipProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  variant?: "blue" | "red" | "green" | "gray";
}
function Chip({ label, active, onClick, variant = "blue" }: ChipProps) {
  const base = "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-all select-none";
  const styles = {
    blue:  active ? "bg-blue-600 border-blue-600 text-white" : "border-blue-200 text-blue-700 hover:bg-blue-50",
    red:   active ? "bg-red-600  border-red-600  text-white" : "border-red-200  text-red-700  hover:bg-red-50",
    green: active ? "bg-emerald-600 border-emerald-600 text-white" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
    gray:  active ? "bg-gray-700 border-gray-700 text-white" : "border-gray-300 text-gray-600 hover:bg-gray-50",
  };
  return (
    <button type="button" className={clsx(base, styles[variant])} onClick={onClick}>
      {label}
    </button>
  );
}

interface StepIndicatorProps { current: number; total: number; }
function StepIndicator({ current, total }: StepIndicatorProps) {
  const labels = ["Complaint", "Symptoms", "Details", "Profile", "Review"];
  return (
    <div className="flex items-center gap-1 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div
              className={clsx(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                i < current   ? "bg-blue-600 border-blue-600 text-white"
                : i === current ? "bg-white border-blue-600 text-blue-600"
                              : "bg-white border-gray-200 text-gray-400",
              )}
            >
              {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={clsx(
              "mt-1 text-[10px] font-medium hidden sm:block",
              i === current ? "text-blue-600" : i < current ? "text-blue-400" : "text-gray-400",
            )}>
              {labels[i]}
            </span>
          </div>
          {i < total - 1 && (
            <div className={clsx(
              "flex-1 h-0.5 mt-[-12px]",
              i < current ? "bg-blue-600" : "bg-gray-200",
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Patient state
// ---------------------------------------------------------------------------

export interface PatientState {
  chief_complaint: string;
  symptoms: string[];
  duration_days: number | null;
  severity: number;
  age: number | null;
  sex: string;
  risk_factors: string[];
}

const INITIAL_STATE: PatientState = {
  chief_complaint: "",
  symptoms: [],
  duration_days: null,
  severity: 5,
  age: null,
  sex: "",
  risk_factors: [],
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SymptomIntakeProps {
  onSubmit: (req: SymptomIntakeRequest) => void;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SymptomIntake({ onSubmit, isLoading = false }: SymptomIntakeProps) {
  const [step, setStep] = useState(0);
  const [patient, setPatient] = useState<PatientState>(INITIAL_STATE);
  const [searchTerm, setSearchTerm] = useState("");

  const toggleSymptom = useCallback((sym: string) => {
    const canonical = sym.toLowerCase();
    setPatient((p) => ({
      ...p,
      symptoms: p.symptoms.includes(canonical)
        ? p.symptoms.filter((s) => s !== canonical)
        : [...p.symptoms, canonical],
    }));
  }, []);

  const toggleRisk = useCallback((rf: string) => {
    setPatient((p) => ({
      ...p,
      risk_factors: p.risk_factors.includes(rf)
        ? p.risk_factors.filter((r) => r !== rf)
        : [...p.risk_factors, rf],
    }));
  }, []);

  const handleSubmit = () => {
    const req: SymptomIntakeRequest = {
      chief_complaint: patient.chief_complaint,
      symptoms: patient.symptoms,
      duration_days: patient.duration_days,
      severity: patient.severity,
      age: patient.age,
      sex: patient.sex || null,
      risk_factors: patient.risk_factors,
    };
    onSubmit(req);
  };

  const canProceed = () => {
    if (step === 0) return patient.chief_complaint.trim().length > 2;
    return true;
  };

  const filteredSymptoms = searchTerm
    ? Object.entries(SYMPTOM_GROUPS).flatMap(([, syms]) =>
        syms.filter((s) => s.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    : null;

  // --------------------------------------------------------------------------
  // Render steps
  // --------------------------------------------------------------------------

  const renderStep = () => {
    switch (step) {
      // ── Step 0: Chief Complaint ────────────────────────────────────────────
      case 0:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <HeartPulse className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">What is your main concern today?</h2>
            </div>
            <p className="text-sm text-gray-500">Select a common complaint or describe it in your own words.</p>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-2">
              {CHIEF_COMPLAINT_CHIPS.map((chip) => (
                <Chip
                  key={chip}
                  label={chip}
                  active={patient.chief_complaint === chip}
                  onClick={() => setPatient((p) => ({ ...p, chief_complaint: chip }))}
                />
              ))}
            </div>

            {/* Free text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Or describe in your own words
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none transition"
                placeholder='e.g. "I have been having chest pain and dizziness since this morning"'
                value={patient.chief_complaint}
                onChange={(e) =>
                  setPatient((p) => ({ ...p, chief_complaint: e.target.value }))
                }
              />
            </div>
          </div>
        );

      // ── Step 1: Associated Symptoms ────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <ClipboardList className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Select all symptoms you are experiencing</h2>
            </div>
            <p className="text-sm text-gray-500">
              Tick every symptom that applies. This helps narrow the diagnosis.
            </p>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search symptoms..."
                className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {patient.symptoms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-xs font-semibold text-blue-600 w-full mb-1">Selected ({patient.symptoms.length}):</span>
                {patient.symptoms.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 bg-blue-600 text-white text-xs rounded-full px-3 py-1"
                  >
                    {s}
                    <button onClick={() => toggleSymptom(s)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Filtered search results */}
            {filteredSymptoms ? (
              <div className="flex flex-wrap gap-2">
                {filteredSymptoms.map((sym) => (
                  <Chip
                    key={sym}
                    label={sym}
                    active={patient.symptoms.includes(sym.toLowerCase())}
                    onClick={() => toggleSymptom(sym)}
                  />
                ))}
                {filteredSymptoms.length === 0 && (
                  <p className="text-sm text-gray-400 py-2">No symptoms found for "{searchTerm}"</p>
                )}
              </div>
            ) : (
              /* Grouped symptom categories */
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {Object.entries(SYMPTOM_GROUPS).map(([group, syms]) => (
                  <div key={group}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {syms.map((sym) => (
                        <Chip
                          key={sym}
                          label={sym}
                          active={patient.symptoms.includes(sym.toLowerCase())}
                          onClick={() => toggleSymptom(sym)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      // ── Step 2: Duration & Severity ────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Tell us more about your symptoms</h2>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                How long have you had these symptoms?
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "< 1 day", value: 0 },
                  { label: "1–2 days", value: 1 },
                  { label: "3–7 days", value: 5 },
                  { label: "1–2 weeks", value: 10 },
                  { label: "> 2 weeks", value: 21 },
                ].map(({ label, value }) => (
                  <Chip
                    key={label}
                    label={label}
                    active={patient.duration_days === value}
                    onClick={() => setPatient((p) => ({ ...p, duration_days: value }))}
                    variant="gray"
                  />
                ))}
              </div>
              <div className="mt-3">
                <input
                  type="number"
                  min={0}
                  max={365}
                  placeholder="Or enter exact days..."
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm w-full outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={patient.duration_days ?? ""}
                  onChange={(e) =>
                    setPatient((p) => ({
                      ...p,
                      duration_days: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                />
              </div>
            </div>

            {/* Severity slider */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                How severe are your symptoms?
                <span className={clsx(
                  "ml-2 text-base font-bold",
                  patient.severity <= 3 ? "text-emerald-600"
                    : patient.severity <= 6 ? "text-amber-500"
                    : "text-red-600",
                )}>
                  {patient.severity}/10
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={patient.severity}
                onChange={(e) => setPatient((p) => ({ ...p, severity: parseInt(e.target.value) }))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Mild (1)</span>
                <span>Moderate (5)</span>
                <span>Severe (10)</span>
              </div>
              <div className={clsx(
                "mt-3 rounded-xl px-4 py-3 text-sm font-medium border",
                patient.severity <= 3 ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : patient.severity <= 6 ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-red-50 border-red-200 text-red-700",
              )}>
                {patient.severity <= 3
                  ? "Mild — symptoms are manageable and not significantly disrupting daily activities."
                  : patient.severity <= 6
                  ? "Moderate — symptoms are noticeable and affecting daily activities."
                  : "Severe — symptoms are significantly limiting daily activities and may require urgent care."}
              </div>
            </div>
          </div>
        );

      // ── Step 3: Health Profile ─────────────────────────────────────────────
      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Your health profile</h2>
            </div>
            <p className="text-sm text-gray-500">
              This helps the clinical engine calculate accurate risk probabilities.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  placeholder="e.g. 42"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={patient.age ?? ""}
                  onChange={(e) =>
                    setPatient((p) => ({
                      ...p,
                      age: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Biological Sex</label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={patient.sex}
                  onChange={(e) => setPatient((p) => ({ ...p, sex: e.target.value }))}
                >
                  <option value="">Select...</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other / Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Known medical conditions / risk factors
              </label>
              <div className="flex flex-wrap gap-2">
                {RISK_FACTOR_OPTIONS.map((rf) => (
                  <Chip
                    key={rf}
                    label={rf}
                    active={patient.risk_factors.includes(rf)}
                    onClick={() => toggleRisk(rf)}
                    variant="gray"
                  />
                ))}
              </div>
            </div>
          </div>
        );

      // ── Step 4: Review & Submit ────────────────────────────────────────────
      case 4:
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <Gauge className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Review your assessment</h2>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4">
              <ReviewRow
                icon={<HeartPulse className="h-4 w-4 text-blue-600" />}
                label="Main concern"
                value={patient.chief_complaint || "—"}
              />
              <ReviewRow
                icon={<Activity className="h-4 w-4 text-blue-600" />}
                label="Symptoms reported"
                value={
                  patient.symptoms.length
                    ? patient.symptoms.join(", ")
                    : "None selected"
                }
              />
              <ReviewRow
                icon={<Clock className="h-4 w-4 text-blue-600" />}
                label="Duration"
                value={
                  patient.duration_days != null
                    ? `${patient.duration_days} day(s)`
                    : "Not specified"
                }
              />
              <ReviewRow
                icon={<Gauge className="h-4 w-4 text-blue-600" />}
                label="Severity"
                value={`${patient.severity}/10`}
              />
              <ReviewRow
                icon={<User className="h-4 w-4 text-blue-600" />}
                label="Age / Sex"
                value={`${patient.age ?? "—"} / ${patient.sex || "—"}`}
              />
              <ReviewRow
                icon={<AlertTriangle className="h-4 w-4 text-blue-600" />}
                label="Risk factors"
                value={
                  patient.risk_factors.length
                    ? patient.risk_factors.join(", ")
                    : "None selected"
                }
              />
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <strong>Medical Disclaimer:</strong> This clinical assessment tool provides
              informational guidance only. It does not replace a consultation with a licensed
              healthcare professional. Always seek qualified medical advice for diagnosis and treatment.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <StepIndicator current={step} total={5} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 md:p-8 min-h-[380px]">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-5">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className={clsx(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all",
            step === 0
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-gray-100",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className={clsx(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all",
              canProceed()
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !patient.chief_complaint}
            className={clsx(
              "flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm transition-all shadow",
              isLoading || !patient.chief_complaint
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md",
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysing...
              </>
            ) : (
              <>
                <ChevronRight className="h-4 w-4" />
                Run Clinical Assessment
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review row helper
// ---------------------------------------------------------------------------

function ReviewRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5">{icon}</span>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
