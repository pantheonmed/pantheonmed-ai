"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, MessageSquare, FlaskConical, ScanLine,
  Zap, TrendingUp, FileText, Stethoscope, Bone, UserRound,
  Activity, ChevronRight, LogOut, User, LogIn, FolderOpen,
  Moon, Sun, Pill,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { logout, isGuest } from "@/lib/auth";
import { authAPI, UserProfile } from "@/services/api";
import { useTheme } from "./ThemeProvider";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface NavItem {
  href: string | null;
  icon: LucideIcon;
  label: string;
  soon?: boolean;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

/* ── Navigation groups ─────────────────────────────────────────────────────── */
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Core Tools",
    items: [
      { href: "/",                   icon: LayoutDashboard, label: "Dashboard" },
      { href: "/clinic",             icon: Stethoscope,     label: "AI Clinic" },
      { href: "/chat",               icon: MessageSquare,   label: "Medical Chat" },
      { href: "/symptom-assessment", icon: Activity,        label: "Clinical Assessment" },
      { href: "/reports",            icon: FlaskConical,    label: "Lab Analyzer" },
    ],
  },
  {
    label: "Medical Intelligence",
    items: [
      { href: "/drug-interaction", icon: Zap,         label: "Drug Interaction" },
      { href: "/medicine-info",    icon: Pill,        label: "Medicine Info" },
      { href: "/risk-prediction",  icon: TrendingUp,  label: "Risk Predictor" },
      { href: "/report-explainer", icon: FileText,    label: "Report Simplifier" },
    ],
  },
  {
    label: "Clinical Tools",
    items: [
      { href: "/anatomy",     icon: Bone,      label: "3D Anatomy" },
      { href: "/doctor-mode", icon: UserRound, label: "Doctor Mode" },
    ],
  },
  {
    label: "System",
    items: [
      { href: null, icon: FolderOpen, label: "Health Records", soon: true },
      { href: null, icon: ScanLine,   label: "Radiology AI",   soon: true },
    ],
  },
];

/* Flat list used by mobile bottom nav */
const MOBILE_NAV = [
  { href: "/",                icon: LayoutDashboard, label: "Home" },
  { href: "/clinic",          icon: Stethoscope,     label: "Clinic" },
  { href: "/chat",            icon: MessageSquare,   label: "Chat" },
  { href: "/reports",         icon: FlaskConical,    label: "Lab" },
  { href: "/anatomy",         icon: Bone,            label: "Anatomy" },
];

/* ── NavItem component ─────────────────────────────────────────────────────── */
function NavItemRow({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const { href, icon: Icon, label, soon } = item;

  const inner = (
    <div className={clsx(
      "group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 cursor-pointer",
      active
        ? "bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        : "hover:bg-white/[0.06]",
      soon && "cursor-default opacity-55",
    )}>
      {/* Active bar */}
      <div className={clsx(
        "w-0.5 h-5 rounded-full transition-all duration-200 shrink-0",
        active ? "bg-blue-400" : "bg-transparent group-hover:bg-white/20",
      )} />

      {/* Icon */}
      <div className={clsx(
        "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150",
        active ? "text-white" : "text-blue-300 group-hover:text-white",
      )}>
        <Icon size={15} />
      </div>

      {/* Label */}
      <span className={clsx(
        "flex-1 text-[13px] font-medium leading-none transition-colors duration-150 truncate",
        active ? "text-white" : "text-blue-200/90 group-hover:text-white",
      )}>
        {label}
      </span>

      {/* Badges */}
      {soon ? (
        <span className="text-[9px] font-bold bg-white/10 text-blue-300 px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
          Soon
        </span>
      ) : active ? (
        <ChevronRight size={12} className="text-white/50 shrink-0" />
      ) : null}
    </div>
  );

  return href && !soon
    ? <Link href={href}>{inner}</Link>
    : <div>{inner}</div>;
}

/* ── Sidebar ───────────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const path  = usePathname();
  const [user, setUser]   = useState<UserProfile | null>(null);
  const [guest, setGuest] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (isGuest()) { setGuest(true); return; }
    authAPI.me().then(setUser).catch(() => setGuest(true));
  }, []);

  function isActive(href: string | null): boolean {
    if (!href) return false;
    return href === "/" ? path === "/" : path.startsWith(href);
  }

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-[220px] min-h-screen bg-[#0F1E4A] shrink-0 border-r border-white/[0.06]">

        {/* Branding */}
        <div className="px-4 pt-5 pb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shrink-0">
              <Activity size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold text-[13px] leading-tight tracking-tight truncate">
                PantheonMed AI
              </div>
              <div className="text-blue-400 text-[10px] font-medium tracking-wider uppercase mt-0.5">
                Clinical DSS
              </div>
            </div>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto space-y-5">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              {/* Section label */}
              <p className="px-3 mb-1.5 text-[9px] font-bold text-blue-500/70 uppercase tracking-[0.1em]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavItemRow
                    key={item.label}
                    item={item}
                    active={isActive(item.href)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User / Guest section */}
        <div className="px-2.5 py-3 border-t border-white/[0.07] space-y-1.5">
          {guest ? (
            /* Guest */
            <>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                  <User size={13} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-amber-300 text-[12px] font-semibold leading-tight">Guest Mode</p>
                  <p className="text-blue-400/70 text-[10px] truncate">Chats not saved</p>
                </div>
                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded-md shrink-0">Free</span>
              </div>
              <Link
                href="/login"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-colors group"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-600/40 group-hover:bg-blue-600 flex items-center justify-center shrink-0 transition-colors">
                  <LogIn size={12} className="text-white" />
                </div>
                <span className="text-blue-200 group-hover:text-white text-[13px] font-semibold transition-colors">Sign in</span>
              </Link>
            </>
          ) : (
            /* Authenticated */
            <>
              {user && (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.05]">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <User size={12} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[12px] font-semibold truncate leading-tight">{user.full_name || user.email}</p>
                    <p className="text-blue-400/80 text-[10px] capitalize truncate">{user.role}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => logout("/login")}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-blue-300 hover:bg-red-500/10 hover:text-red-300 transition-all group"
              >
                <div className="w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-red-500/20 flex items-center justify-center shrink-0 transition-colors">
                  <LogOut size={12} />
                </div>
                <span className="text-[13px] font-medium">Sign out</span>
              </button>
            </>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-blue-300 hover:bg-white/[0.06] transition-all group"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <div className="w-6 h-6 rounded-lg bg-white/[0.05] group-hover:bg-white/[0.10] flex items-center justify-center shrink-0 transition-colors">
              {theme === "dark" ? <Sun size={12} className="text-yellow-300" /> : <Moon size={12} className="text-blue-300" />}
            </div>
            <span className="text-[13px] font-medium">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          <p className="px-3 text-[10px] text-blue-500/50 leading-relaxed">
            ⚠️ Informational only. Not medical advice.
          </p>
        </div>
      </aside>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F1E4A] border-t border-white/[0.08] flex items-center justify-around px-1 py-1.5">
        {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href}
              className={clsx(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150",
                active ? "text-white" : "text-blue-400 hover:text-white",
              )}
            >
              <Icon size={19} />
              <span className="text-[9px] font-semibold tracking-wide">{label}</span>
            </Link>
          );
        })}
        {guest ? (
          <Link href="/login" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-amber-400">
            <LogIn size={19} />
            <span className="text-[9px] font-semibold">Sign in</span>
          </Link>
        ) : (
          <button onClick={() => logout("/login")} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-blue-400 hover:text-red-300 transition-colors">
            <LogOut size={19} />
            <span className="text-[9px] font-semibold">Logout</span>
          </button>
        )}
      </nav>
    </>
  );
}
