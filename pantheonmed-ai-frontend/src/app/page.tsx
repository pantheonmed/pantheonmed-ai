"use client";
import Link from "next/link";
import {
  MessageSquare, Stethoscope, FlaskConical, Zap,
  TrendingUp, FileText, Bone, UserRound,
  ArrowRight, Shield, Activity, Heart, BarChart3,
  Sparkles, ChevronRight,
} from "lucide-react";

/* ── Tool cards ─────────────────────────────────────────────────────────────── */
const TOOLS = [
  {
    href: "/chat",
    icon: MessageSquare,
    label: "AI Medical Chat",
    desc: "Ask any health question in plain language. Supports Hindi & English.",
    iconBg: "bg-blue-600",
    cardBg: "from-blue-50 to-white",
    border: "border-blue-100/80",
    chip: "bg-blue-100 text-blue-700",
    chipLabel: "Most Used",
  },
  {
    href: "/symptom-checker",
    icon: Stethoscope,
    label: "Symptom Checker",
    desc: "Enter symptoms for AI-powered clinical triage and follow-up questions.",
    iconBg: "bg-violet-600",
    cardBg: "from-violet-50 to-white",
    border: "border-violet-100/80",
    chip: "bg-violet-100 text-violet-700",
    chipLabel: "Triage",
  },
  {
    href: "/reports",
    icon: FlaskConical,
    label: "Lab Analyzer",
    desc: "Paste lab values and get plain-language explanations of your results.",
    iconBg: "bg-teal-600",
    cardBg: "from-teal-50 to-white",
    border: "border-teal-100/80",
    chip: "bg-teal-100 text-teal-700",
    chipLabel: "Reports",
  },
  {
    href: "/drug-interaction",
    icon: Zap,
    label: "Drug Interaction",
    desc: "Check for dangerous combinations between two medicines instantly.",
    iconBg: "bg-orange-500",
    cardBg: "from-orange-50 to-white",
    border: "border-orange-100/80",
    chip: "bg-orange-100 text-orange-700",
    chipLabel: "Safety",
  },
  {
    href: "/risk-prediction",
    icon: TrendingUp,
    label: "Risk Predictor",
    desc: "Estimate your risk for diabetes, heart disease, and hypertension.",
    iconBg: "bg-emerald-600",
    cardBg: "from-emerald-50 to-white",
    border: "border-emerald-100/80",
    chip: "bg-emerald-100 text-emerald-700",
    chipLabel: "Prevention",
  },
  {
    href: "/report-explainer",
    icon: FileText,
    label: "Report Simplifier",
    desc: "Convert complex medical documents into easy-to-understand language.",
    iconBg: "bg-indigo-600",
    cardBg: "from-indigo-50 to-white",
    border: "border-indigo-100/80",
    chip: "bg-indigo-100 text-indigo-700",
    chipLabel: "Explain",
  },
  {
    href: "/anatomy",
    icon: Bone,
    label: "3D Anatomy",
    desc: "Click any organ on an interactive body model to learn about diseases.",
    iconBg: "bg-pink-600",
    cardBg: "from-pink-50 to-white",
    border: "border-pink-100/80",
    chip: "bg-pink-100 text-pink-700",
    chipLabel: "Explore",
  },
  {
    href: "/doctor-mode",
    icon: UserRound,
    label: "Doctor Mode",
    desc: "Clinical consultation AI that asks follow-ups and generates differential diagnosis.",
    iconBg: "bg-[#1E3A8A]",
    cardBg: "from-slate-50 to-white",
    border: "border-slate-100/80",
    chip: "bg-slate-100 text-slate-700",
    chipLabel: "Clinical",
  },
];

const STATS = [
  { icon: Activity,  label: "AI Consultations",  value: "2.4M+",  color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-100" },
  { icon: Heart,     label: "Patients Helped",    value: "840K+",  color: "text-rose-500",    bg: "bg-rose-50",    border: "border-rose-100" },
  { icon: BarChart3, label: "Clinical Accuracy",  value: "94.2%",  color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen overflow-y-auto bg-[#F8FAFC]">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white/80 backdrop-blur border-b border-gray-200/80 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1E3A8A] flex items-center justify-center">
              <Activity size={14} className="text-white" />
            </div>
            <span className="font-bold text-[#1E3A8A] text-sm tracking-tight">PantheonMed AI</span>
            <span className="hidden sm:inline text-gray-300">·</span>
            <span className="hidden sm:inline text-gray-500 text-xs font-medium">Clinical Decision Support</span>
          </div>
          <Link href="/chat"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)]">
            Start Consultation <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-12 pb-10">
        {/* Subtle grid background */}
        <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-blue-600/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200/80 px-4 py-1.5 text-[11px] text-blue-700 font-bold mb-6 tracking-wider uppercase shadow-sm">
            <Sparkles size={11} className="text-blue-500" />
            India&apos;s Medical AI Platform · ICMR-Aligned
          </div>

          <h1 className="font-extrabold text-4xl md:text-[2.75rem] text-[#0F1E4A] leading-[1.1] mb-4 tracking-tight animate-fade-up">
            Your Intelligent<br />
            <span className="text-blue-600">Healthcare Command&nbsp;Centre</span>
          </h1>

          <p className="text-[15px] text-gray-500 max-w-xl mx-auto mb-8 leading-relaxed animate-fade-up" style={{ animationDelay: "80ms" }}>
            8 AI-powered medical tools — from symptom analysis to drug interactions —
            all aligned with ICMR clinical guidelines and designed for India.
          </p>

          <div className="flex flex-wrap justify-center gap-3 animate-fade-up" style={{ animationDelay: "140ms" }}>
            <Link href="/chat"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3 rounded-xl transition-all shadow-[0_4px_20px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_28px_rgba(37,99,235,0.45)] hover:-translate-y-0.5">
              Start AI Consultation <ArrowRight size={16} />
            </Link>
            <Link href="/symptom-checker"
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold px-7 py-3 rounded-xl transition-all hover:-translate-y-0.5 shadow-sm">
              Check Symptoms
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section className="px-6 pb-8">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-3 sm:gap-4">
          {STATS.map(({ icon: Icon, label, value, color, bg, border }) => (
            <div key={label}
              className={`bg-white rounded-2xl border ${border} p-4 text-center shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}>
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2.5`}>
                <Icon size={16} className={color} />
              </div>
              <div className={`font-extrabold text-[1.5rem] ${color} leading-none tracking-tight`}>{value}</div>
              <div className="text-[11px] text-gray-400 mt-1 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tool grid ───────────────────────────────────────────────────────── */}
      <section className="px-6 pb-14">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-extrabold text-[1.3rem] text-[#0F1E4A] tracking-tight">Medical AI Tools</h2>
              <p className="text-xs text-gray-400 mt-0.5">All tools available without login · Premium features with account</p>
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
              8 Tools Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {TOOLS.map(({ href, icon: Icon, label, desc, iconBg, cardBg, border, chip, chipLabel }, i) => (
              <Link key={href} href={href}
                className={`group relative bg-gradient-to-b ${cardBg} border ${border} rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-200 animate-fade-up`}
                style={{ animationDelay: `${i * 50 + 150}ms` }}>

                {/* Header */}
                <div className="flex items-start justify-between mb-3.5">
                  <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${chip}`}>
                    {chipLabel}
                  </span>
                </div>

                {/* Content */}
                <h3 className="font-bold text-[#0F1E4A] text-[14px] leading-tight mb-1.5 tracking-tight">{label}</h3>
                <p className="text-[12.5px] text-gray-500 leading-relaxed line-clamp-2">{desc}</p>

                {/* CTA */}
                <div className="mt-4 flex items-center gap-1 text-[12px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                  Open Tool <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Disclaimer footer ───────────────────────────────────────────────── */}
      <footer className="px-6 pb-10 mt-auto">
        <div className="max-w-5xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex gap-3 items-start">
            <Shield size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <p className="text-[12px] text-amber-800 leading-relaxed">
              <strong className="font-semibold">Medical Disclaimer:</strong> PantheonMed AI provides
              informational guidance only and is not a substitute for professional medical advice.
              Always consult a qualified doctor for diagnosis or treatment.
              In an emergency, call&nbsp;<strong>112</strong>&nbsp;immediately.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
