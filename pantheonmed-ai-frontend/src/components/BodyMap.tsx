"use client";
import clsx from "clsx";

export interface OrganDef {
  id: string;
  label: string;
  emoji: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  shape?: "pill" | "heart" | "lungs-l" | "lungs-r" | "circle";
}

export const ORGANS: OrganDef[] = [
  { id: "brain",   label: "Brain",   emoji: "🧠", cx: 140, cy: 68,  rx: 32, ry: 24, shape: "circle" },
  { id: "heart",   label: "Heart",   emoji: "❤️", cx: 128, cy: 160, rx: 22, ry: 22, shape: "heart"  },
  { id: "lungs",   label: "Lungs",   emoji: "🫁", cx: 140, cy: 162, rx: 52, ry: 28, shape: "lungs-l" },
  { id: "liver",   label: "Liver",   emoji: "🫀", cx: 155, cy: 208, rx: 28, ry: 18, shape: "pill" },
  { id: "stomach", label: "Stomach", emoji: "🍽️", cx: 128, cy: 222, rx: 20, ry: 16, shape: "circle" },
  { id: "kidneys", label: "Kidneys", emoji: "🫘", cx: 140, cy: 258, rx: 40, ry: 14, shape: "pill"   },
];

interface Props {
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function BodyMap({ selected, onSelect }: Props) {
  return (
    <div className="relative w-full flex justify-center select-none">
      <svg
        viewBox="0 0 280 420"
        className="w-full max-w-[240px] drop-shadow-sm"
        style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.07))" }}
      >
        {/* Body silhouette */}
        <defs>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#e8f4f6" />
            <stop offset="100%" stopColor="#d0eaef" />
          </linearGradient>
          <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#38b8c5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1d9caa" stopOpacity="0.15" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Torso + limbs (simplified) ─────────────────────────────────── */}
        {/* Head */}
        <ellipse cx="140" cy="50" rx="34" ry="40" fill="url(#bodyGrad)" stroke="#b8d8e0" strokeWidth="1.5" />
        {/* Neck */}
        <rect x="126" y="84" width="28" height="20" rx="8" fill="url(#bodyGrad)" stroke="#b8d8e0" strokeWidth="1.5" />
        {/* Torso */}
        <path d="M90 100 Q80 130 80 200 Q80 260 90 300 L190 300 Q200 260 200 200 Q200 130 190 100 Z"
          fill="url(#bodyGrad)" stroke="#b8d8e0" strokeWidth="1.5" />
        {/* Shoulders */}
        <ellipse cx="76" cy="112" rx="20" ry="12" fill="url(#bodyGrad)" stroke="#b8d8e0" strokeWidth="1.5" />
        <ellipse cx="204" cy="112" rx="20" ry="12" fill="url(#bodyGrad)" stroke="#b8d8e0" strokeWidth="1.5" />
        {/* Arms */}
        <path d="M62 120 Q52 170 56 220 L70 220 Q72 172 80 124 Z" fill="url(#bodyGrad)" stroke="#b8d8e0" strokeWidth="1.2" />
        <path d="M218 120 Q228 170 224 220 L210 220 Q208 172 200 124 Z" fill="url(#bodyGrad)" stroke="#b8d8e0" strokeWidth="1.2" />
        {/* Pelvis */}
        <ellipse cx="140" cy="305" rx="56" ry="18" fill="url(#bodyGrad)" stroke="#b8d8e0" strokeWidth="1.5" />
        {/* Legs */}
        <path d="M100 314 Q96 360 98 410 L116 410 Q118 362 118 314 Z" fill="url(#bodyGrad)" stroke="#b8d8e0" strokeWidth="1.2" />
        <path d="M180 314 Q184 360 182 410 L164 410 Q162 362 162 314 Z" fill="url(#bodyGrad)" stroke="#b8d8e0" strokeWidth="1.2" />

        {/* ── Spine line ─────────────────────────────────────────────────── */}
        <line x1="140" y1="104" x2="140" y2="296" stroke="#b8d8e0" strokeWidth="1" strokeDasharray="3,4" />

        {/* ── Rib guides ─────────────────────────────────────────────────── */}
        {[140, 156, 172, 188].map((y, i) => (
          <path key={i} d={`M140 ${y} Q115 ${y + 6} 96 ${y + 4}`}
            stroke="#c8e0e8" strokeWidth="1" fill="none" opacity="0.6" />
        ))}
        {[140, 156, 172, 188].map((y, i) => (
          <path key={`r${i}`} d={`M140 ${y} Q165 ${y + 6} 184 ${y + 4}`}
            stroke="#c8e0e8" strokeWidth="1" fill="none" opacity="0.6" />
        ))}

        {/* ── Organs ─────────────────────────────────────────────────────── */}
        {ORGANS.map((organ) => {
          const isActive = selected === organ.id;
          return (
            <g key={organ.id}
              className={clsx("organ-hover", isActive && "active")}
              onClick={() => onSelect(organ.id)}
              role="button"
              aria-label={organ.label}
            >
              {/* Glow ring when active */}
              {isActive && (
                <ellipse
                  cx={organ.id === "kidneys" ? organ.cx - 16 : organ.cx}
                  cy={organ.cy}
                  rx={organ.rx + 8}
                  ry={organ.ry + 8}
                  fill="rgba(29,156,170,0.12)"
                  stroke="rgba(29,156,170,0.4)"
                  strokeWidth="1.5"
                />
              )}

              {/* Organ shape */}
              {organ.id === "lungs" ? (
                <>
                  {/* Left lung */}
                  <ellipse cx={organ.cx - 24} cy={organ.cy} rx={20} ry={organ.ry}
                    fill={isActive ? "#19c2d1" : "#7de0e8"}
                    stroke={isActive ? "#0d8a96" : "#3ab8c5"}
                    strokeWidth="1.5"
                    opacity={isActive ? 1 : 0.85}
                  />
                  {/* Right lung */}
                  <ellipse cx={organ.cx + 24} cy={organ.cy} rx={20} ry={organ.ry}
                    fill={isActive ? "#19c2d1" : "#7de0e8"}
                    stroke={isActive ? "#0d8a96" : "#3ab8c5"}
                    strokeWidth="1.5"
                    opacity={isActive ? 1 : 0.85}
                  />
                </>
              ) : organ.id === "heart" ? (
                // Heart shape via path
                <path
                  d={`M${organ.cx} ${organ.cy + 14}
                    C${organ.cx} ${organ.cy + 14}, ${organ.cx - 26} ${organ.cy + 2},
                    ${organ.cx - 26} ${organ.cy - 8}
                    A${13} ${13} 0 0 1 ${organ.cx} ${organ.cy - 3}
                    A${13} ${13} 0 0 1 ${organ.cx + 26} ${organ.cy - 8}
                    C${organ.cx + 26} ${organ.cy + 2}, ${organ.cx} ${organ.cy + 14}, ${organ.cx} ${organ.cy + 14} Z`}
                  fill={isActive ? "#e05060" : "#f08090"}
                  stroke={isActive ? "#c03040" : "#d06070"}
                  strokeWidth="1.5"
                />
              ) : organ.id === "kidneys" ? (
                <>
                  {/* Left kidney */}
                  <ellipse cx={organ.cx - 20} cy={organ.cy} rx={14} ry={organ.ry}
                    fill={isActive ? "#d06b3a" : "#e8956a"}
                    stroke={isActive ? "#a04020" : "#c07050"}
                    strokeWidth="1.5"
                  />
                  {/* Right kidney */}
                  <ellipse cx={organ.cx + 20} cy={organ.cy} rx={14} ry={organ.ry}
                    fill={isActive ? "#d06b3a" : "#e8956a"}
                    stroke={isActive ? "#a04020" : "#c07050"}
                    strokeWidth="1.5"
                  />
                </>
              ) : organ.id === "brain" ? (
                <ellipse cx={organ.cx} cy={organ.cy}
                  rx={organ.rx} ry={organ.ry}
                  fill={isActive ? "#b87ecf" : "#d4a8e8"}
                  stroke={isActive ? "#8050a0" : "#a870c0"}
                  strokeWidth="1.5"
                />
              ) : organ.id === "liver" ? (
                <ellipse cx={organ.cx} cy={organ.cy}
                  rx={organ.rx} ry={organ.ry}
                  fill={isActive ? "#8b4513" : "#b87044"}
                  stroke={isActive ? "#6a3010" : "#9a5830"}
                  strokeWidth="1.5"
                  opacity="0.9"
                />
              ) : (
                <ellipse cx={organ.cx} cy={organ.cy}
                  rx={organ.rx} ry={organ.ry}
                  fill={isActive ? "#4a9060" : "#70b888"}
                  stroke={isActive ? "#306840" : "#509060"}
                  strokeWidth="1.5"
                />
              )}

              {/* Label */}
              <text
                x={organ.cx}
                y={organ.id === "kidneys" ? organ.cy + 28 : organ.cy + organ.ry + 12}
                textAnchor="middle"
                fontSize="9"
                fontFamily="DM Sans, sans-serif"
                fontWeight="600"
                fill={isActive ? "#1a6473" : "#5a8090"}
              >
                {organ.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
