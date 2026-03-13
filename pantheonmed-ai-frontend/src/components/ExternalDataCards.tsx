"use client";
/**
 * ExternalDataCards
 * =================
 * Renders six optional enrichment panels from real medical APIs:
 *
 *   Phase 1 — Drug Info (OpenFDA) · ICD-11 (WHO) · Research (PubMed)
 *   Phase 2 — Medical Concepts (UMLS) · Clinical Trials (CT.gov) · Drug Interactions (RxNorm)
 */

import {
  DrugInfo, IcdInfo, ResearchPaper,
  UmlsResult, ClinicalTrial, RxNormResult,
} from "@/services/api";
import {
  Pill, FlaskConical, BookOpen, ExternalLink, AlertTriangle,
  ChevronDown, ChevronUp, Brain, TestTube2, Zap,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

/* ── Helpers ────────────────────────────────────────────────────────────── */
function DataRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-gray-400">{label}</span>
      <span className="text-[12px] text-gray-700 leading-snug">{value}</span>
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  accent,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent: string;
  icon: React.ReactNode;
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
          <span className="text-[11.5px] font-bold">{title}</span>
        </div>
        {open ? <ChevronUp size={13} className="text-gray-400 shrink-0" /> : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
      </button>
      {open && <div className="px-3.5 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
}

/* ── Drug Info Card ─────────────────────────────────────────────────────── */
function DrugInfoCard({ drug }: { drug: DrugInfo }) {
  if (drug.error || !drug.drug_name) return null;
  const brands = drug.brand_names?.slice(0, 3).join(", ");

  return (
    <CollapsibleSection
      title={`Drug Info — ${drug.drug_name}${brands ? ` (${brands})` : ""}`}
      accent="bg-blue-50 border-blue-100"
      icon={<Pill size={13} className="text-blue-600" />}
      defaultOpen
    >
      <DataRow label="Indications" value={drug.indications} />
      <DataRow label="Warnings" value={drug.warnings} />
      <DataRow label="Adverse reactions" value={drug.adverse_reactions} />
      <DataRow label="Contraindications" value={drug.contraindications} />
      <DataRow label="Drug interactions" value={drug.drug_interactions} />
      <DataRow label="Dosage" value={drug.dosage} />
      {drug.manufacturer && (
        <span className="text-[10px] text-gray-400">Source: FDA · {drug.manufacturer}</span>
      )}
    </CollapsibleSection>
  );
}

/* ── ICD Classification Card ────────────────────────────────────────────── */
function IcdInfoCard({ icd }: { icd: IcdInfo }) {
  if (icd.error || (!icd.code && !icd.title)) return null;
  return (
    <CollapsibleSection
      title={`ICD-11 — ${icd.title || icd.disease_name}`}
      accent="bg-violet-50 border-violet-100"
      icon={<FlaskConical size={13} className="text-violet-600" />}
      defaultOpen
    >
      <div className="flex items-center gap-2 flex-wrap">
        {icd.code && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
            ICD-11: {icd.code}
          </span>
        )}
        {icd.chapter && (
          <span className="text-[11px] text-gray-500">{icd.chapter}</span>
        )}
      </div>
      {icd.definition && (
        <p className="text-[12px] text-gray-700 leading-snug">{icd.definition}</p>
      )}
      {icd.url && icd.url !== "#" && (
        <a
          href={icd.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-violet-600 hover:underline"
        >
          <ExternalLink size={10} /> View on WHO ICD Portal
        </a>
      )}
    </CollapsibleSection>
  );
}

/* ── Research Papers Card ───────────────────────────────────────────────── */
function ResearchCard({ papers }: { papers: ResearchPaper[] }) {
  const valid = papers.filter(p => !p.error && p.title);
  if (!valid.length) return null;

  return (
    <CollapsibleSection
      title={`Evidence-Based Research (${valid.length} PubMed papers)`}
      accent="bg-emerald-50 border-emerald-100"
      icon={<BookOpen size={13} className="text-emerald-600" />}
      defaultOpen={valid.length <= 2}
    >
      <div className="space-y-3">
        {valid.map((p, i) => (
          <div key={p.pmid ?? i} className="border-l-2 border-emerald-300 pl-3 space-y-0.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] font-semibold text-gray-800 leading-snug">
                {p.title}
              </p>
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-emerald-600 hover:text-emerald-800"
                  title="Open in PubMed"
                >
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
            {p.authors && (
              <p className="text-[10.5px] text-gray-400">{p.authors}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {p.year && (
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-px rounded">
                  {p.year}
                </span>
              )}
              {p.journal && (
                <span className="text-[10.5px] text-gray-500 italic">{p.journal}</span>
              )}
            </div>
            {p.abstract_snippet && (
              <p className="text-[11.5px] text-gray-600 leading-relaxed mt-1">
                {p.abstract_snippet}
              </p>
            )}
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

/* ── UMLS Medical Concepts Card ─────────────────────────────────────────── */
function UmlsConceptCard({ umls }: { umls: UmlsResult }) {
  const hasConcepts = (umls.concepts?.length ?? 0) > 0;
  return (
    <CollapsibleSection
      title={`Medical Concepts — ${umls.term || "UMLS"}`}
      accent="bg-cyan-50 border-cyan-100"
      icon={<Brain size={13} className="text-cyan-600" />}
      defaultOpen
    >
      {hasConcepts ? (
        <>
          {umls.concepts!.map((c, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {c.cui && (
                  <span className="inline-flex items-center px-2 py-px rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                    CUI: {c.cui}
                  </span>
                )}
                <span className="text-[12.5px] font-semibold text-gray-800">{c.name}</span>
              </div>
              {c.semantic_types && c.semantic_types.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {c.semantic_types.slice(0, 3).map((st, j) => (
                    <span key={j} className="text-[10px] font-medium px-2 py-px rounded bg-gray-100 text-gray-600">
                      {st}
                    </span>
                  ))}
                </div>
              )}
              {c.definition && (
                <p className="text-[12px] text-gray-600 leading-snug">{c.definition}</p>
              )}
            </div>
          ))}
        </>
      ) : (
        <p className="text-[11.5px] text-gray-500 italic">
          No standardised UMLS concept found for &quot;{umls.term}&quot;.
        </p>
      )}
      <span className="text-[10px] text-gray-400">
        Source: NLM UMLS{umls._source === "umls_local" ? " (local dictionary)" : " (live API)"}
      </span>
    </CollapsibleSection>
  );
}

/* ── Clinical Trials Card ───────────────────────────────────────────────── */
function ClinicalTrialsCard({ trials }: { trials: ClinicalTrial[] }) {
  const valid = trials.filter(t => !t.error && t.nct_id);
  // Show card whenever we have at least one valid trial
  if (!valid.length) return null;  // no valid trials — don't clutter the UI

  const statusColor = (status?: string) => {
    const s = (status || "").toUpperCase();
    if (s === "RECRUITING") return "bg-green-100 text-green-700 border-green-200";
    if (s === "ACTIVE_NOT_RECRUITING") return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  return (
    <CollapsibleSection
      title={`Active Clinical Trials (${valid.length})`}
      accent="bg-purple-50 border-purple-100"
      icon={<TestTube2 size={13} className="text-purple-600" />}
      defaultOpen={valid.length === 1}
    >
      <div className="space-y-3">
        {valid.map((t, i) => (
          <div key={t.nct_id ?? i} className="border-l-2 border-purple-300 pl-3 space-y-1">
            <div className="flex items-start gap-2 justify-between">
              <p className="text-[12px] font-semibold text-gray-800 leading-snug flex-1">
                {t.title}
              </p>
              {t.url && (
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-purple-500 hover:text-purple-700"
                  title="View on ClinicalTrials.gov"
                >
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {t.nct_id && (
                <span className="text-[10px] font-mono text-purple-600">{t.nct_id}</span>
              )}
              {t.status && (
                <span className={clsx("text-[10px] font-medium px-1.5 py-px rounded-full border", statusColor(t.status))}>
                  {t.status.replace(/_/g, " ")}
                </span>
              )}
              {t.phase && t.phase !== "N/A" && (
                <span className="text-[10px] text-gray-500">{t.phase}</span>
              )}
            </div>
            {t.locations && t.locations.length > 0 && (
              <p className="text-[11px] text-gray-500">
                📍 {t.locations.slice(0, 2).join(" · ")}
              </p>
            )}
            {t.interventions && t.interventions.length > 0 && (
              <p className="text-[11px] text-gray-600">
                Interventions: {t.interventions.slice(0, 3).join(", ")}
              </p>
            )}
            {t.eligibility_summary && (
              <p className="text-[11px] text-gray-500 italic">{t.eligibility_summary}</p>
            )}
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

/* ── RxNorm Drug Interactions Card ──────────────────────────────────────── */
function RxNormCard({ rxnorm }: { rxnorm: RxNormResult }) {
  // Show if there's any response — even if we only have error or drug name
  if (!rxnorm.drug_name && !rxnorm.rxcui) return null;

  const severityStyle = (sev?: string) => {
    const s = (sev || "").toUpperCase();
    if (s === "HIGH") return "bg-red-100 text-red-700 border-red-200";
    if (s === "MODERATE") return "bg-orange-100 text-orange-700 border-orange-200";
    if (s === "LOW") return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  const interactions = rxnorm.interactions ?? [];

  return (
    <CollapsibleSection
      title={`Drug Interactions — ${rxnorm.drug_name || "RxNorm"}`}
      accent="bg-orange-50 border-orange-100"
      icon={<Zap size={13} className="text-orange-500" />}
      defaultOpen
    >
      {rxnorm.rxcui ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">RxNorm ID:</span>
          <span className="text-[11px] font-mono text-orange-700 bg-orange-50 px-1.5 py-px rounded border border-orange-200">
            {rxnorm.rxcui}
          </span>
          {rxnorm.generic_name && rxnorm.generic_name !== rxnorm.drug_name && (
            <span className="text-[11px] text-gray-500">({rxnorm.generic_name})</span>
          )}
        </div>
      ) : rxnorm.error ? (
        <p className="text-[11.5px] text-gray-500 italic">{rxnorm.error}</p>
      ) : null}
      {rxnorm.drug_class && rxnorm.drug_class.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide shrink-0">Class:</span>
          {rxnorm.drug_class.slice(0, 3).map((c, i) => (
            <span key={i} className="text-[11px] font-medium px-2 py-px rounded bg-orange-100 text-orange-800 border border-orange-200">
              {c}
            </span>
          ))}
        </div>
      )}
      {interactions.length > 0 ? (
        <div className="space-y-2 mt-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            Known interactions ({interactions.length}):
          </p>
          {interactions.slice(0, 5).map((inter, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={clsx(
                "shrink-0 text-[10px] font-bold px-1.5 py-px rounded border mt-0.5",
                severityStyle(inter.severity),
              )}>
                {inter.severity || "?"}
              </span>
              <div>
                {inter.interacting_drugs && inter.interacting_drugs.length > 0 && (
                  <p className="text-[11.5px] font-semibold text-gray-700">
                    With: {inter.interacting_drugs.join(" + ")}
                  </p>
                )}
                {inter.description && (
                  <p className="text-[11px] text-gray-600 leading-snug">{inter.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-green-700 flex items-center gap-1.5">
          <span className="text-green-500">✓</span>
          No high-severity interactions found in ONCHigh database.
        </p>
      )}
    </CollapsibleSection>
  );
}

/* ── Source badge strip ─────────────────────────────────────────────────── */
function SourceBadges({ sources }: { sources?: string[] }) {
  if (!sources?.length) return null;
  const LABELS: Record<string, string> = {
    drug:     "OpenFDA · RxNorm",
    disease:  "ICD-11 · ClinicalTrials",
    research: "PubMed",
    umls:     "UMLS",
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[9.5px] text-gray-400 font-medium uppercase tracking-wide">Sources:</span>
      {sources.map(s => (
        <span
          key={s}
          className="text-[9.5px] font-semibold px-2 py-px rounded-full bg-gray-100 text-gray-600 border border-gray-200"
        >
          {LABELS[s] ?? s}
        </span>
      ))}
    </div>
  );
}

/* ── Main Export ────────────────────────────────────────────────────────── */
interface Props {
  // Phase 1
  drug_info?:         DrugInfo | null;
  icd_info?:          IcdInfo | null;
  research_evidence?: ResearchPaper[];
  // Phase 2
  medical_concepts?:  UmlsResult | null;
  clinical_trials?:   ClinicalTrial[];
  drug_interactions?: RxNormResult | null;
  data_sources?:      string[];
  compact?:           boolean;
}

export default function ExternalDataCards({
  drug_info,
  icd_info,
  research_evidence = [],
  medical_concepts,
  clinical_trials = [],
  drug_interactions,
  data_sources,
  compact = false,
}: Props) {
  // Phase 1 guards
  const hasDrug     = drug_info     && !drug_info.error  && drug_info.drug_name;
  const hasIcd      = icd_info      && !icd_info.error   && (icd_info.code || icd_info.title);
  const hasResearch = research_evidence.some(p => !p.error && p.title);

  // Phase 2 guards — permissive: show card if the API returned ANY response object
  // (even if concepts list is empty or no interactions found — we show a graceful state)
  const hasUmls   = medical_concepts   != null && typeof medical_concepts   === "object";
  const hasRxNorm = drug_interactions  != null && typeof drug_interactions  === "object";
  const hasTrials = clinical_trials.length > 0 || false; // only show if trials were actually fetched

  if (!hasDrug && !hasIcd && !hasResearch && !hasUmls && !hasRxNorm && !hasTrials) return null;

  return (
    <div className={clsx("space-y-2", compact ? "mt-2" : "mt-3")}>
      {/* Source attribution */}
      <SourceBadges sources={data_sources} />

      {/* Phase 1 cards */}
      {hasDrug     && <DrugInfoCard drug={drug_info!} />}
      {hasIcd      && <IcdInfoCard  icd={icd_info!} />}
      {hasResearch && <ResearchCard papers={research_evidence} />}

      {/* Phase 2 cards */}
      {hasUmls   && <UmlsConceptCard umls={medical_concepts!} />}
      {hasTrials && <ClinicalTrialsCard trials={clinical_trials} />}
      {hasRxNorm && <RxNormCard rxnorm={drug_interactions!} />}
    </div>
  );
}
