"use client";
import { useState } from "react";
import {
  Pill, Search, X, AlertTriangle, Info, ChevronDown, ChevronUp,
  Stethoscope, Heart, Baby, ShoppingCart, Zap,
} from "lucide-react";
import { medicineAPI } from "@/services/api";

// ─── Common drugs quick-access list ──────────────────────────────────────────
const QUICK_DRUGS = [
  "Paracetamol", "Ibuprofen", "Metformin", "Aspirin", "Atorvastatin",
  "Omeprazole", "Amoxicillin", "Ciprofloxacin", "Amlodipine", "Warfarin",
  "Metronidazole", "Azithromycin", "Losartan", "Pantoprazole", "Clopidogrel",
  "Levothyroxine", "Sildenafil", "Doxycycline", "Salbutamol", "Prednisolone",
];

// ─── Section toggle component ─────────────────────────────────────────────────
function Section({
  title, icon, children, defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-all"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <span className="text-gray-500">{icon}</span>
          {title}
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

// ─── Tag list ─────────────────────────────────────────────────────────────────
function TagList({ items, color = "blue" }: { items: string[]; color?: string }) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-700 border-blue-200",
    green:  "bg-green-50 text-green-700 border-green-200",
    red:    "bg-red-50 text-red-700 border-red-200",
    amber:  "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    gray:   "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {items.filter(Boolean).map((item, i) => (
        <span key={i} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${colors[color] ?? colors.gray}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

// ─── Drug info card ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DrugInfoCard({ data }: { data: any }) {
  const source = data.source === "local_db+ai" ? "Database + AI" : data.source === "ai_only" ? "AI Only" : "Database";
  const isLocalDb = data.source === "local_db+ai";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Pill size={20} className="text-white/80" />
              <h2 className="text-white font-bold text-xl">{data.name}</h2>
            </div>
            {data.generic_name && (
              <p className="text-blue-100 text-sm">Generic: {data.generic_name}</p>
            )}
            {data.drug_class && (
              <p className="text-blue-100 text-xs mt-0.5 opacity-80">{data.drug_class}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            {data.india_otc !== undefined && data.india_otc !== null && (
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                data.india_otc ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}>
                <ShoppingCart size={11} />
                {data.india_otc ? "OTC Available" : "Prescription Only"}
              </span>
            )}
            <p className="text-[10px] text-blue-200 mt-1 opacity-70">Source: {source}</p>
          </div>
        </div>

        {/* Brand names */}
        {data.brand_names?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.brand_names.slice(0, 6).map((b: string, i: number) => (
              <span key={i} className="text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-3">

        {/* Indications */}
        {data.indications?.length > 0 && (
          <Section title="What it's used for" icon={<Stethoscope size={14} />}>
            <TagList items={data.indications} color="blue" />
          </Section>
        )}

        {/* Dosage */}
        {(data.adult_dose || data.pediatric_dose) && (
          <Section title="Dosage" icon={<Info size={14} />}>
            {data.adult_dose && (
              <div className="mb-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Adult</p>
                <p className="text-sm text-gray-700 mt-0.5">{data.adult_dose}</p>
              </div>
            )}
            {data.pediatric_dose && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Paediatric</p>
                <p className="text-sm text-gray-700 mt-0.5">{data.pediatric_dose}</p>
              </div>
            )}
          </Section>
        )}

        {/* Side effects */}
        {data.side_effects?.length > 0 && (
          <Section title="Common side effects" icon={<AlertTriangle size={14} />} defaultOpen={false}>
            <TagList items={data.side_effects} color="amber" />
          </Section>
        )}

        {/* Warnings */}
        {data.warnings?.length > 0 && (
          <Section title="Warnings" icon={<AlertTriangle size={14} />} defaultOpen={false}>
            <div className="space-y-1.5">
              {data.warnings.map((w: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 text-xs mt-0.5">⚠️</span>
                  <p className="text-sm text-gray-700">{w}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Contraindications */}
        {data.contraindications?.length > 0 && (
          <Section title="Do not use if" icon={<X size={14} />} defaultOpen={false}>
            <div className="space-y-1.5">
              {data.contraindications.map((c: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-red-500 text-xs mt-0.5">🚫</span>
                  <p className="text-sm text-gray-700">{c}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Pregnancy */}
        {data.pregnancy && (
          <Section title="Pregnancy & Lactation" icon={<Baby size={14} />} defaultOpen={false}>
            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-pink-500 text-sm mt-0.5">🤰</span>
                <p className="text-sm text-gray-700"><strong>Pregnancy:</strong> {data.pregnancy}</p>
              </div>
              {data.lactation && (
                <div className="flex items-start gap-2">
                  <span className="text-pink-400 text-sm mt-0.5">🍼</span>
                  <p className="text-sm text-gray-700"><strong>Lactation:</strong> {data.lactation}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Key interactions */}
        {data.key_interactions?.length > 0 && (
          <Section title="Key Drug Interactions" icon={<Zap size={14} />} defaultOpen={false}>
            <TagList items={data.key_interactions} color="red" />
          </Section>
        )}

        {/* AI Explanation */}
        {data.explanation && (
          <Section title={isLocalDb ? "Clinical Summary" : "AI Analysis"} icon={<Heart size={14} />}>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {data.explanation}
            </p>
          </Section>
        )}
      </div>

      {/* Footer disclaimer */}
      <div className="px-5 pb-4">
        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
          ⚕️ This information is for reference only. Always follow your doctor's or pharmacist's instructions.
          Dosage and safety may vary by individual. Not a substitute for professional medical advice.
        </p>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      <div className="h-28 bg-blue-200" />
      <div className="p-5 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MedicineInfoPage() {
  const [query, setQuery]     = useState("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult]   = useState<any | null>(null);
  const [error, setError]     = useState("");

  async function lookup(drugName: string) {
    const name = drugName.trim();
    if (!name) return;
    setLoading(true); setError(""); setResult(null); setQuery(name);
    try {
      const data = await medicineAPI.getInfo(name);
      setResult(data);
    } catch {
      setError("Unable to retrieve drug information. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    lookup(query);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-200 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
            <Pill size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-base leading-tight">Medicine Information</h1>
            <p className="text-xs text-gray-500">Drug database with Indian brand names, dosage & safety</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">

          {/* Safety notice */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-5">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>Reference only:</strong> Drug information is for educational purposes. Always follow your
              doctor's prescription and consult a pharmacist for personalised advice.
            </p>
          </div>

          {/* Search form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">Search Drug / Medicine</h2>

            <form onSubmit={handleSubmit} className="relative mb-4">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Enter drug name (e.g. Metformin, Paracetamol, Warfarin…)"
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-gray-50 focus:bg-white transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setResult(null); setError(""); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {/* Quick access chips */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Quick access</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_DRUGS.map(drug => (
                  <button
                    key={drug}
                    onClick={() => lookup(drug)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all ${
                      query === drug
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100"
                    }`}
                  >
                    {drug}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-4">
                {error}
              </p>
            )}

            <button
              onClick={() => lookup(query)}
              disabled={loading || !query.trim()}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Looking up…
                </span>
              ) : (
                <><Search size={14} /> Look Up Medicine</>
              )}
            </button>
          </div>

          {/* Loading */}
          {loading && <LoadingSkeleton />}

          {/* Result */}
          {result && !loading && <DrugInfoCard data={result} />}

          {/* Empty state */}
          {!result && !loading && !error && (
            <div className="text-center py-16 text-gray-400">
              <Pill size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-sm">Search for a medicine above</p>
              <p className="text-xs mt-1 opacity-70">
                Database covers 79+ drugs with Indian brand names, dosage, and safety information
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
