"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  UserRound, Send, Plus, AlertCircle, Loader2,
  FileText, Pill, Languages, Compass, Stethoscope,
  Lock, Copy, CheckCheck, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  chatAPI, aiAPI, MedicalToolResponse, doctorAPI,
  ClinicalSummaryRequest, PrescriptionDraftRequest,
  TranslatorRequest, TreatmentNavigatorRequest,
} from "@/services/api";
import { isGuest, getGuestSessionId, saveGuestChatBuffer } from "@/lib/auth";
import MedicalToolResult from "@/components/MedicalToolResult";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured?: MedicalToolResponse;
}

type Tab = "consultation" | "summary" | "prescription" | "translator" | "navigator";

// ── Helpers ───────────────────────────────────────────────────────────────────
let _idCounter = 0;
function newId() { return `msg-${Date.now()}-${_idCounter++}`; }

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);
  return { copied, copy };
}

function extractQuestions(text: string): string[] {
  if (!text) return [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences
    .map(s => s.trim())
    .filter(s => s.endsWith("?") && s.length > 20 && s.length < 130)
    .slice(0, 3);
}

// ── Tab configuration ─────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType; doctorOnly?: boolean; description: string }[] = [
  { id: "consultation", label: "Consultation",     icon: Stethoscope, description: "Interactive clinical Q&A with differential diagnosis" },
  { id: "summary",      label: "Clinical Summary", icon: FileText,    doctorOnly: true, description: "Generate structured patient summary from clinical notes" },
  { id: "prescription", label: "Prescription",     icon: Pill,        doctorOnly: true, description: "AI-assisted prescription draft from diagnosis" },
  { id: "translator",   label: "Translator",       icon: Languages,   description: "Medical ↔ plain language translation" },
  { id: "navigator",    label: "Treatment Guide",  icon: Compass,     description: "Evidence-based treatment pathway navigator" },
];

const CONSULTATION_PROMPTS = [
  "I have chest pain and shortness of breath",
  "High fever for 3 days with chills and body ache",
  "Persistent headache and dizziness for 1 week",
  "Abdominal pain after eating, with nausea",
];

const FOLLOW_UP_SUGGESTIONS = [
  "The pain is sharp and gets worse with movement",
  "I also have nausea and vomiting",
  "Symptoms started 2 days ago",
  "I'm 45 years old with no major medical history",
  "I take metformin for diabetes",
  "Generate differential diagnosis",
];

// ── Shared UI Components ──────────────────────────────────────────────────────
function ResultBox({ title, content }: { title: string; content: string }) {
  const { copied, copy } = useCopy();
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => copy(content)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-all">
            {copied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 transition-colors">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-5 py-4">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{content}</pre>
        </div>
      )}
    </div>
  );
}

function DoctorOnlyMessage({ toolName }: { toolName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-5">
        <Lock size={28} className="text-amber-500" />
      </div>
      <h3 className="font-bold text-gray-800 text-lg mb-2">{toolName} — Doctor Access</h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
        This tool requires a verified <strong>Doctor</strong> or <strong>Admin</strong> account.
        Your current role does not have access.
      </p>
      <p className="text-xs text-gray-400 mt-4 max-w-xs">
        Switch to the <strong>Consultation</strong> or <strong>Translator</strong> tab — available to all users.
      </p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, rows = 2, required, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; required?: boolean; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 -mt-0.5">{hint}</p>}
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder-gray-400 transition-all leading-relaxed"
      />
    </div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm"
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
      {loading ? "Generating…" : label}
    </button>
  );
}

// ── CLINICAL SUMMARY TAB ─────────────────────────────────────────────────────
function ClinicalSummaryTab() {
  const [form, setForm] = useState<ClinicalSummaryRequest>({ chief_complaint: "", history: "", vitals: "", lab_findings: "" });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.chief_complaint.trim() || !form.history.trim()) return;
    setError(""); setLoading(true);
    try {
      const res = await doctorAPI.clinicalSummary(form);
      setResult(res.summary);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Failed to generate summary. Check your role permissions.");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col gap-5 overflow-y-auto px-1 pb-4">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">Clinical Note Generator</p>
        <p className="text-xs text-blue-600 leading-relaxed">Generate a structured SOAP-style clinical summary for documentation, referrals, and discharge notes.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Chief Complaint" required value={form.chief_complaint} onChange={v => setForm(f => ({ ...f, chief_complaint: v }))} placeholder="e.g., 45F presenting with 3 days of high fever, headache, and generalised myalgia" rows={2} />
        <Field label="History & Presentation" required value={form.history} onChange={v => setForm(f => ({ ...f, history: v }))} placeholder="Past medical history, current symptoms, onset, duration, associated symptoms, medications, allergies…" rows={4} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Vitals" value={form.vitals ?? ""} onChange={v => setForm(f => ({ ...f, vitals: v }))} placeholder="BP 120/80, HR 88, Temp 38.5°C, SpO2 98%" rows={2} />
          <Field label="Lab / Investigation Findings" value={form.lab_findings ?? ""} onChange={v => setForm(f => ({ ...f, lab_findings: v }))} placeholder="WBC 12,000, Platelets 90K, CRP elevated, Dengue NS1 positive" rows={2} />
        </div>
        {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"><AlertCircle size={15} className="mt-0.5 shrink-0" />{error}</div>}
        <SubmitBtn loading={loading} label="Generate Clinical Summary" />
      </form>
      {result && <ResultBox title="Clinical Summary" content={result} />}
    </div>
  );
}

// ── PRESCRIPTION DRAFT TAB ───────────────────────────────────────────────────
function PrescriptionDraftTab() {
  const [form, setForm] = useState<PrescriptionDraftRequest>({ diagnosis: "", allergies: "", existing_medications: "" });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.diagnosis.trim()) return;
    setError(""); setLoading(true);
    try {
      const res = await doctorAPI.prescriptionDraft(form);
      setResult(res.draft);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Failed to generate prescription draft.");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col gap-5 overflow-y-auto px-1 pb-4">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Draft Only — Clinical Review Required</p>
        <p className="text-xs text-amber-700 leading-relaxed">AI-generated prescription suggestions are for clinical decision support only. Always verify dosing and apply clinical judgement before prescribing.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Diagnosis / Clinical Indication" required value={form.diagnosis} onChange={v => setForm(f => ({ ...f, diagnosis: v }))} placeholder="e.g., Viral fever with dengue suspicion; Acute uncomplicated UTI in adult female" rows={2} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Known Allergies" value={form.allergies ?? ""} onChange={v => setForm(f => ({ ...f, allergies: v }))} placeholder="e.g., Penicillin, NSAIDs" rows={2} />
          <Field label="Current Medications" value={form.existing_medications ?? ""} onChange={v => setForm(f => ({ ...f, existing_medications: v }))} placeholder="e.g., Metformin 500mg BD, Amlodipine 5mg OD" rows={2} />
        </div>
        {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"><AlertCircle size={15} className="mt-0.5 shrink-0" />{error}</div>}
        <SubmitBtn loading={loading} label="Generate Prescription Draft" />
      </form>
      {result && <ResultBox title="Prescription Draft" content={result} />}
    </div>
  );
}

// ── TRANSLATOR TAB ────────────────────────────────────────────────────────────
function TranslatorTab() {
  const [form, setForm] = useState<TranslatorRequest>({ text: "", direction: "to_plain" });
  const [result, setResult] = useState<{ original: string; translated: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { copied, copy } = useCopy();

  const EXAMPLES_TO_PLAIN = [
    "Patient presents with dyspnea on exertion, bilateral pitting oedema, and elevated BNP.",
    "ECG shows sinus tachycardia with ST-segment depression in leads V4-V6.",
    "MRI brain reveals T2 hyperintense lesions in the periventricular white matter.",
  ];
  const EXAMPLES_TO_MEDICAL = [
    "I have trouble breathing when I walk and my legs are swollen.",
    "My heart test shows an irregular fast heartbeat.",
    "The brain scan showed some white spots near the middle of the brain.",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.text.trim()) return;
    setError(""); setLoading(true);
    try {
      const res = await doctorAPI.translate(form);
      setResult(res);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Translation failed. Please try again.");
    } finally { setLoading(false); }
  }

  const examples = form.direction === "to_plain" ? EXAMPLES_TO_PLAIN : EXAMPLES_TO_MEDICAL;

  return (
    <div className="flex flex-col gap-5 overflow-y-auto px-1 pb-4">
      <div className="bg-purple-50 border border-purple-100 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-purple-800 mb-1">Medical Language Translator</p>
        <p className="text-xs text-purple-600 leading-relaxed">Convert complex medical jargon into plain language for patients, or translate patient descriptions into clinical terminology for documentation.</p>
      </div>
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl self-start">
        {(["to_plain", "to_medical"] as const).map(dir => (
          <button key={dir} onClick={() => { setForm(f => ({ ...f, direction: dir })); setResult(null); }}
            className={clsx("text-xs font-semibold px-4 py-2 rounded-lg transition-all", form.direction === dir ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {dir === "to_plain" ? "Medical → Plain" : "Plain → Medical"}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label={form.direction === "to_plain" ? "Medical Text" : "Plain Language Description"} required rows={4}
          value={form.text} onChange={v => setForm(f => ({ ...f, text: v }))}
          placeholder={form.direction === "to_plain" ? "Paste medical text, report, or clinical note here…" : "Describe symptoms or condition in everyday language…"} />
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Try an example:</span>
          <div className="flex flex-wrap gap-1.5">
            {examples.map(ex => (
              <button key={ex} type="button" onClick={() => setForm(f => ({ ...f, text: ex }))}
                className="text-[11px] bg-gray-50 border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-600 hover:text-purple-700 px-2.5 py-1.5 rounded-lg transition-all text-left">
                {ex.length > 60 ? ex.slice(0, 60) + "…" : ex}
              </button>
            ))}
          </div>
        </div>
        {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"><AlertCircle size={15} className="mt-0.5 shrink-0" />{error}</div>}
        <SubmitBtn loading={loading} label="Translate" />
      </form>
      {result && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
            <span className="font-semibold text-gray-800 text-sm">Translation Result</span>
            <button onClick={() => copy(result.translated)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-all">
              {copied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Original</p>
              <p className="text-sm text-gray-500 leading-relaxed bg-gray-50 rounded-xl px-4 py-3">{result.original}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-1.5">Translation</p>
              <p className="text-sm text-gray-800 leading-relaxed bg-purple-50 rounded-xl px-4 py-3">{result.translated}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TREATMENT NAVIGATOR TAB ───────────────────────────────────────────────────
function TreatmentNavigatorTab() {
  const [form, setForm] = useState<TreatmentNavigatorRequest>({ condition: "", stage: "", preferences: "" });
  const [result, setResult] = useState<{ condition: string; guidance: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const QUICK_CONDITIONS = [
    "Type 2 Diabetes", "Hypertension", "Acute Appendicitis",
    "Iron Deficiency Anaemia", "Hypothyroidism", "Dengue Fever",
    "GERD / Acid Reflux", "Community-acquired Pneumonia",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.condition.trim()) return;
    setError(""); setLoading(true);
    try {
      const res = await doctorAPI.treatmentNavigator(form);
      setResult(res);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Failed to generate treatment guidance.");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col gap-5 overflow-y-auto px-1 pb-4">
      <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-green-800 mb-1">Evidence-Based Treatment Pathways</p>
        <p className="text-xs text-green-700 leading-relaxed">Structured treatment guidance including first-line therapy, monitoring, and escalation criteria — aligned with WHO and ICMR guidelines.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Condition / Diagnosis" required value={form.condition} onChange={v => setForm(f => ({ ...f, condition: v }))} placeholder="e.g., Type 2 Diabetes Mellitus, Hypertension, Dengue Fever" rows={1} />
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CONDITIONS.map(c => (
            <button key={c} type="button" onClick={() => setForm(f => ({ ...f, condition: c }))}
              className={clsx("text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                form.condition === c ? "bg-green-700 border-green-700 text-white" : "bg-gray-50 border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-600 hover:text-green-700")}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Stage / Severity" value={form.stage ?? ""} onChange={v => setForm(f => ({ ...f, stage: v }))} placeholder="e.g., Mild, Stage 2, Early" rows={1} />
          <Field label="Patient Preferences / Constraints" value={form.preferences ?? ""} onChange={v => setForm(f => ({ ...f, preferences: v }))} placeholder="e.g., Prefers oral medications, elderly patient" rows={1} />
        </div>
        {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"><AlertCircle size={15} className="mt-0.5 shrink-0" />{error}</div>}
        <SubmitBtn loading={loading} label="Get Treatment Pathway" />
      </form>
      {result && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-green-50">
            <p className="font-semibold text-green-800 text-sm">Treatment Pathway: {result.condition}</p>
          </div>
          <div className="px-5 py-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{result.guidance}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CONSULTATION TAB ──────────────────────────────────────────────────────────
function ConsultationTab() {
  const [msgs, setMsgs]         = useState<Msg[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [guestMode]             = useState(isGuest);
  const [guestSid]              = useState(() => guestMode ? getGuestSessionId() : undefined);
  const [diagRequested, setDiagRequested] = useState(false);
  const [followUpChips, setFollowUpChips] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  function scrollBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    setError("");
    setFollowUpChips([]);

    const userMsg: Msg = { id: newId(), role: "user", content };
    setMsgs(prev => [...prev, userMsg]);
    scrollBottom();
    setLoading(true);

    try {
      const isDiag = content.toLowerCase().includes("differential") ||
                     content.toLowerCase().includes("diagnosis") ||
                     content.toLowerCase().includes("generate");

      if (isDiag && msgs.length >= 2) {
        const history = [...msgs, userMsg]
          .map(m => `${m.role === "user" ? "Patient" : "Doctor AI"}: ${m.content}`)
          .join("\n");

        const diagPrompt = [
          `DOCTOR MODE — DIFFERENTIAL DIAGNOSIS`,
          `Based on the following clinical consultation, generate a complete differential diagnosis:`,
          ``, history, ``,
          `Provide: 1) Primary diagnosis 2) Differential list by likelihood 3) Discriminating features 4) Recommended investigations 5) Management 6) Red flags for immediate referral`,
        ].join("\n");

        const structured = await aiAPI.analyze(diagPrompt);
        setDiagRequested(true);
        const aiMsg: Msg = { id: newId(), role: "assistant", content: structured.answer ?? "", structured };
        setMsgs(prev => [...prev, aiMsg]);
        if (guestMode) saveGuestChatBuffer([...msgs, userMsg, aiMsg].map(m => ({ role: m.role, content: m.content })));
      } else {
        const DOCTOR_PREFIX = msgs.length === 0 ? `DOCTOR MODE — Clinical Consultation:\n${content}` : content;
        const res = await chatAPI.send(DOCTOR_PREFIX, guestMode ? undefined : sessionId, guestMode ? guestSid : undefined);
        if (!sessionId && !guestMode) setSessionId(res.session_id);

        const aiMsg: Msg = { id: newId(), role: "assistant", content: res.ai_response.content };
        setMsgs(prev => [...prev, aiMsg]);

        const chips = extractQuestions(res.ai_response.content);
        if (chips.length > 0) setFollowUpChips(chips);

        if (guestMode) {
          saveGuestChatBuffer([...msgs, userMsg, aiMsg].map(m => ({ role: m.role, content: m.content })));
        }
      }
      scrollBottom();
    } catch (e: unknown) {
      setMsgs(prev => prev.filter(m => m.id !== userMsg.id));
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, msgs, sessionId, guestMode, guestSid]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); send(input); setInput(""); };
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); setInput(""); }
  };

  useEffect(() => { scrollBottom(); }, [msgs]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
        {msgs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1E3A8A] flex items-center justify-center mb-4 shadow-lg">
              <span className="text-2xl">🩻</span>
            </div>
            <h3 className="font-bold text-blue-900 text-lg mb-2">Start Clinical Consultation</h3>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-5">
              Describe symptoms. The AI asks follow-up questions like a clinician, then generates a structured differential diagnosis on request.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full">
              {CONSULTATION_PROMPTS.map(p => (
                <button key={p} onClick={() => send(p)}
                  className="text-sm text-left bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-4 py-3 rounded-xl transition-all shadow-sm">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map(msg => (
          <div key={msg.id} className={clsx("flex gap-3 max-w-3xl", msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto")}>
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold shadow-sm mt-1",
              msg.role === "user" ? "bg-blue-600 text-white" : "bg-[#1E3A8A] text-white")}>
              {msg.role === "user" ? "P" : "Dr"}
            </div>
            <div className={clsx("rounded-2xl px-4 py-3 max-w-[85%]",
              msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border border-gray-100 shadow-sm rounded-tl-sm")}>
              {msg.structured ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[#1E3A8A] mb-2">Differential Diagnosis</p>
                  <MedicalToolResult result={msg.structured} />
                </div>
              ) : (
                <p className={clsx("text-sm leading-relaxed whitespace-pre-line",
                  msg.role === "user" ? "text-white" : "text-gray-800")}>
                  {msg.content}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-xl bg-[#1E3A8A] flex items-center justify-center shrink-0 text-white text-xs font-bold mt-1 shadow-sm">Dr</div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs font-medium animate-pulse">Analyzing clinical presentation…</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm max-w-lg">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Dynamic follow-up chips from AI questions */}
      {followUpChips.length > 0 && !loading && (
        <div className="shrink-0 bg-blue-50 border-t border-blue-100 px-2 py-2">
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-[10px] text-blue-500 font-semibold uppercase tracking-wider pt-2 pr-1">Answer:</span>
            <div className="flex flex-wrap gap-1.5">
              {followUpChips.map(q => (
                <button key={q} onClick={() => { send(q); setFollowUpChips([]); }}
                  className="text-[12px] bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full transition-all font-medium text-left">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Static follow-up suggestions after ≥2 messages */}
      {msgs.length >= 2 && !diagRequested && !loading && followUpChips.length === 0 && (
        <div className="shrink-0 bg-white border-t border-gray-100 px-2 py-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            <span className="shrink-0 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Suggest:</span>
            {FOLLOW_UP_SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className={clsx("shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all whitespace-nowrap",
                  s.includes("differential") || s.includes("diagnosis")
                    ? "bg-blue-900 border-blue-900 text-white hover:bg-blue-800"
                    : "bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-700")}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 pt-2.5 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex items-end gap-2.5">
          <div className="flex-1">
            <textarea
              ref={inputRef} rows={1} value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKey}
              placeholder={msgs.length === 0 ? "Describe symptoms or clinical presentation…" : "Reply or type 'generate differential diagnosis'…"}
              disabled={loading}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder-gray-400 transition-all disabled:opacity-60"
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
          </div>
          <button type="submit" disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-2xl bg-[#1E3A8A] hover:bg-blue-800 disabled:opacity-40 flex items-center justify-center text-white shadow-md transition-all shrink-0">
            <Send size={16} />
          </button>
        </form>
        {msgs.length > 0 && (
          <button onClick={() => { setMsgs([]); setSessionId(undefined); setError(""); setDiagRequested(false); setFollowUpChips([]); }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-2 mx-auto transition-colors">
            <Plus size={11} /> New consultation
          </button>
        )}
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function DoctorModePage() {
  const [activeTab, setActiveTab] = useState<Tab>("consultation");
  const [userRole, setUserRole]   = useState<string>("patient");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserRole(localStorage.getItem("user_role") ?? "patient");
    }
  }, []);

  const isDoctor = userRole === "doctor" || userRole === "admin";
  const activeTabDef = TABS.find(t => t.id === activeTab)!;

  function renderTabContent() {
    if (activeTabDef.doctorOnly && !isDoctor) return <DoctorOnlyMessage toolName={activeTabDef.label} />;
    switch (activeTab) {
      case "consultation": return <ConsultationTab />;
      case "summary":      return <ClinicalSummaryTab />;
      case "prescription": return <PrescriptionDraftTab />;
      case "translator":   return <TranslatorTab />;
      case "navigator":    return <TreatmentNavigatorTab />;
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-200 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] flex items-center justify-center shadow-md">
              <UserRound size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">Doctor Mode</h1>
              <p className="text-xs text-gray-500">{activeTabDef.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDoctor ? (
              <span className="hidden sm:flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Doctor Mode
              </span>
            ) : (
              <span className="hidden sm:flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full">
                Clinical Tools
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-5">
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const locked = tab.doctorOnly && !isDoctor;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={clsx("flex items-center gap-1.5 text-xs font-semibold px-3.5 py-3 border-b-2 whitespace-nowrap transition-all",
                  activeTab === tab.id ? "border-[#1E3A8A] text-[#1E3A8A]" : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300")}>
                <Icon size={13} className={locked ? "text-amber-400" : undefined} />
                {tab.label}
                {locked && <Lock size={10} className="text-amber-400 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className={clsx("flex-1 overflow-hidden", activeTab === "consultation" ? "flex flex-col" : "overflow-y-auto")}>
        <div className={clsx("h-full",
          activeTab === "consultation"
            ? "flex flex-col px-4 md:px-6 pt-4 pb-0"
            : "max-w-2xl mx-auto w-full px-5 md:px-6 py-5")}>
          {renderTabContent()}
        </div>
      </div>

      {/* Footer disclaimer (non-consultation tabs) */}
      {activeTab !== "consultation" && (
        <div className="shrink-0 bg-white border-t border-gray-100 px-5 py-2">
          <p className="text-[10px] text-gray-400 text-center">
            AI provides informational guidance only · Not a substitute for professional medical advice · Emergency: call <strong>112</strong>
          </p>
        </div>
      )}
    </div>
  );
}
