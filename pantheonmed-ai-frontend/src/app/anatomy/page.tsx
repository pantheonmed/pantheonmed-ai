"use client";
import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { aiAPI, OrganInfoResponse } from "@/services/api";
import { ORGAN_DEFS_3D } from "@/components/AnatomyViewer3D";
import {
  Activity, AlertTriangle, Stethoscope, BookOpen,
  ChevronRight, X, Cpu, RotateCcw, Loader2,
} from "lucide-react";
import clsx from "clsx";

// Dynamic import — Three.js requires browser APIs, disable SSR
const AnatomyViewer3D = dynamic(() => import("@/components/AnatomyViewer3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#F0F4F8]">
      <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center animate-pulse">
        <Cpu size={22} className="text-blue-600" />
      </div>
      <p className="text-sm text-gray-400 font-medium">Loading 3D viewer…</p>
    </div>
  ),
});

// Deduplicated organ list for the sidebar
const UNIQUE_ORGANS = ORGAN_DEFS_3D.filter(
  (d, i, arr) => arr.findIndex(x => x.organId === d.organId) === i
);

// Color map for organ chips
const ORGAN_CHIP_COLORS: Record<string, string> = {
  brain:   "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  heart:   "bg-red-50   text-red-700   border-red-200   hover:bg-red-100",
  lungs:   "bg-pink-50  text-pink-700  border-pink-200  hover:bg-pink-100",
  liver:   "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
  stomach: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
  kidneys: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  bones:   "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
};

const ORGAN_ACTIVE_COLORS: Record<string, string> = {
  brain:   "bg-purple-600 text-white border-purple-600",
  heart:   "bg-red-500    text-white border-red-500",
  lungs:   "bg-pink-500   text-white border-pink-500",
  liver:   "bg-amber-700  text-white border-amber-700",
  stomach: "bg-green-600  text-white border-green-600",
  kidneys: "bg-orange-500 text-white border-orange-500",
  bones:   "bg-yellow-600 text-white border-yellow-600",
};

const SECTION_ICONS = {
  function:   { icon: BookOpen,      label: "Function",              bg: "bg-blue-50",   text: "text-blue-700",  border: "border-blue-100" },
  conditions: { icon: Stethoscope,   label: "Common Conditions",     bg: "bg-red-50",    text: "text-red-700",   border: "border-red-100"  },
  actions:    { icon: Activity,      label: "Recommended Actions",   bg: "bg-green-50",  text: "text-green-700", border: "border-green-100"},
  warnings:   { icon: AlertTriangle, label: "When to See a Doctor",  bg: "bg-amber-50",  text: "text-amber-700", border: "border-amber-100"},
};

// ── Info Panel ────────────────────────────────────────────────────────────────
function OrganInfoPanel({
  organId, label, emoji, info, loading, error, onClose,
}: {
  organId: string; label: string; emoji: string;
  info: OrganInfoResponse | null; loading: boolean; error: string; onClose: () => void;
}) {
  const chipActive = ORGAN_ACTIVE_COLORS[organId] ?? "bg-blue-600 text-white";
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panel header */}
      <div className="shrink-0 px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-white">
        <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border", chipActive)}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 text-lg leading-tight">{label}</h2>
          <p className="text-xs text-gray-400 mt-0.5">AI-generated medical overview</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X size={15} className="text-gray-500" />
        </button>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 size={28} className="text-blue-500 animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Generating medical overview…</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {info && !loading && (
          <>
            {/* Function / Answer */}
            {renderSection("function", info.answer ?? "", false)}

            {/* Possible Conditions */}
            {(info.possible_conditions?.length ?? 0) > 0 &&
              renderSection("conditions", info.possible_conditions ?? [], true)}

            {/* Recommended Actions */}
            {(info.recommended_actions?.length ?? 0) > 0 &&
              renderSection("actions", info.recommended_actions ?? [], true)}

            {/* Warning signs extracted from actions */}
            {renderWarningSection(info.recommended_actions ?? [])}

            {/* Disclaimer */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <p className="text-[11px] text-blue-600 leading-relaxed">
                📄 <strong>Disclaimer:</strong> {info.medical_disclaimer}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function renderSection(
  key: keyof typeof SECTION_ICONS,
  content: string | string[],
  isList: boolean
) {
  const { icon: Icon, label, bg, text, border } = SECTION_ICONS[key];
  return (
    <div key={key} className={clsx("rounded-2xl border p-4", bg, border)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className={text} />
        <span className={clsx("text-xs font-bold uppercase tracking-wide", text)}>{label}</span>
      </div>
      {isList ? (
        <ul className="space-y-1">
          {(content as string[]).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className={clsx("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", text.replace("text-", "bg-"))} />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-700 leading-relaxed">{content as string}</p>
      )}
    </div>
  );
}

function renderWarningSection(actions: string[]) {
  const warnings = actions.filter(a =>
    /urgent|emergency|immedi|call\s*112|911|severe|sudden|chest pain|breathe|bleed/i.test(a)
  );
  if (warnings.length === 0) return null;
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={15} className="text-amber-600" />
        <span className="text-xs font-bold uppercase tracking-wide text-amber-700">Warning Signs</span>
      </div>
      <ul className="space-y-1">
        {warnings.map((w, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500" />
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Page (inner component uses useSearchParams) ────────────────────────────
function AnatomyPageContent() {
  const searchParams = useSearchParams();
  const [selectedOrganId, setSelectedOrganId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel]     = useState("");
  const [selectedEmoji, setSelectedEmoji]     = useState("");
  const [organInfo, setOrganInfo]             = useState<OrganInfoResponse | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");

  const handleOrganSelect = useCallback(async (organId: string, label: string, emoji: string) => {
    if (loading) return;
    setSelectedOrganId(organId);
    setSelectedLabel(label);
    setSelectedEmoji(emoji);
    setOrganInfo(null);
    setError("");
    setLoading(true);
    try {
      const info = await aiAPI.askOrgan(label);
      setOrganInfo(info);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Failed to fetch organ info. Please check your authentication.");
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleClose = useCallback(() => {
    setSelectedOrganId(null);
    setOrganInfo(null);
    setError("");
  }, []);

  // Auto-select organ from ?organ= URL parameter (deep-link from chat)
  useEffect(() => {
    const organParam = searchParams?.get("organ");
    if (!organParam || selectedOrganId) return;
    const match = UNIQUE_ORGANS.find(o => o.organId === organParam.toLowerCase());
    if (match) {
      handleOrganSelect(match.organId, match.label, match.emoji ?? "🫀");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 px-5 py-3 bg-white border-b border-gray-100 flex items-center gap-3 z-10">
        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Cpu size={18} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[#1E3A8A] text-base leading-tight">
            3D Anatomy Explorer
          </h1>
          <p className="text-xs text-gray-400">
            Interactive human body · Click any organ for AI-powered information
          </p>
        </div>
        {selectedOrganId && (
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        )}
      </header>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

        {/* Left: Organ selector sidebar (desktop) */}
        <div className="hidden lg:flex flex-col w-52 shrink-0 bg-white border-r border-gray-100 overflow-y-auto">
          <div className="px-3 py-4 border-b border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">Organs</p>
          </div>
          <div className="p-3 space-y-1">
            {UNIQUE_ORGANS.map(def => {
              const isActive = selectedOrganId === def.organId;
              return (
                <button
                  key={def.organId}
                  onClick={() => handleOrganSelect(def.organId, def.label, def.emoji)}
                  className={clsx(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left border",
                    isActive
                      ? ORGAN_ACTIVE_COLORS[def.organId] ?? "bg-blue-600 text-white border-blue-600"
                      : "text-gray-600 border-transparent hover:bg-gray-50 hover:border-gray-200"
                  )}
                >
                  <span className="text-base shrink-0">{def.emoji}</span>
                  <span>{def.label}</span>
                  {isActive && <ChevronRight size={13} className="ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile organ chip strip */}
        <div className="lg:hidden shrink-0 flex gap-2 overflow-x-auto px-4 py-3 bg-white border-b border-gray-100 no-scrollbar">
          {UNIQUE_ORGANS.map(def => {
            const isActive = selectedOrganId === def.organId;
            return (
              <button
                key={def.organId}
                onClick={() => handleOrganSelect(def.organId, def.label, def.emoji)}
                className={clsx(
                  "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-150",
                  isActive
                    ? ORGAN_ACTIVE_COLORS[def.organId]
                    : ORGAN_CHIP_COLORS[def.organId]
                )}
              >
                {def.emoji} {def.label}
              </button>
            );
          })}
        </div>

        {/* Center: 3D Viewer */}
        <div className={clsx(
          "flex-1 relative overflow-hidden transition-all duration-300",
          selectedOrganId ? "lg:flex-[0_0_55%]" : "flex-1"
        )}>
          <AnatomyViewer3D
            selectedOrganId={selectedOrganId}
            onOrganSelect={handleOrganSelect}
          />

          {/* Empty-state overlay */}
          {!selectedOrganId && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none text-center">
              <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl px-6 py-3 shadow-lg">
                <p className="text-sm font-semibold text-gray-700">Click on an organ to learn more</p>
                <p className="text-xs text-gray-400 mt-0.5">Or select from the list on the left</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Info panel (slides in when organ is selected) */}
        <div className={clsx(
          "bg-white border-l border-gray-100 overflow-hidden transition-all duration-300 flex flex-col",
          selectedOrganId
            ? "lg:flex-[0_0_45%] h-64 lg:h-auto"
            : "lg:w-0 h-0 lg:h-auto"
        )}>
          {selectedOrganId && (
            <OrganInfoPanel
              organId={selectedOrganId}
              label={selectedLabel}
              emoji={selectedEmoji}
              info={organInfo}
              loading={loading}
              error={error}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnatomyPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center animate-pulse">
          <Cpu size={22} className="text-blue-600" />
        </div>
      </div>
    }>
      <AnatomyPageContent />
    </Suspense>
  );
}
