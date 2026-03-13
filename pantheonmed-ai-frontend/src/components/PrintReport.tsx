"use client";
import { ClinicalConsultation, DifferentialItem, ChatMessage } from "@/services/api";
import { Printer, Download } from "lucide-react";

/* ── Parse a chat message into ClinicalConsultation (if JSON) ─────────────── */
function parseClinical(content: string): ClinicalConsultation | null {
  const t = content.trim();
  if (!t.startsWith("{")) return null;
  try {
    const p = JSON.parse(t);
    if (p.doctor_assessment || p.differential_diagnosis) return p as ClinicalConsultation;
  } catch {}
  return null;
}

/* ── Build HTML for one consultation ─────────────────────────────────────── */
function buildConsultationHTML(
  userMsg: string,
  aiMsg: string,
  index: number,
  timestamp: string,
): string {
  const c = parseClinical(aiMsg);
  const time = new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const riskColor: Record<string, string> = {
    emergency: "#dc2626",
    high:      "#ea580c",
    medium:    "#d97706",
    low:       "#059669",
  };
  const risk = c?.risk_level ?? "low";

  if (!c) {
    return `
      <div class="consultation">
        <div class="q-header">
          <span class="q-number">Q${index}</span>
          <span class="q-text">${escHtml(userMsg)}</span>
          <span class="q-time">${time}</span>
        </div>
        <div class="a-plain">${escHtml(aiMsg)}</div>
      </div>`;
  }

  const diffRows = (c.differential_diagnosis ?? [])
    .map((d: DifferentialItem) =>
      `<tr>
        <td class="rank">${d.rank}</td>
        <td class="condition">${escHtml(d.condition)}</td>
        <td class="explanation">${escHtml(d.explanation ?? "")}</td>
      </tr>`
    ).join("");

  const listItems = (items: string[]) =>
    items.map(i => `<li>${escHtml(i)}</li>`).join("");

  const followUp = (c.follow_up_questions ?? []).length > 0
    ? `<div class="section fu-section">
        <div class="section-header fu-header">To Assess You Better</div>
        <ol class="fu-list">${(c.follow_up_questions ?? []).map((q, i) => `<li><span class="fu-num">${i + 1}</span>${escHtml(q)}</li>`).join("")}</ol>
      </div>` : "";

  return `
    <div class="consultation">
      <div class="q-header">
        <span class="q-number">Q${index}</span>
        <span class="q-text">${escHtml(userMsg)}</span>
        <span class="q-time">${time}</span>
      </div>

      <div class="section assessment-section">
        <div class="section-header assessment-header">Doctor Assessment</div>
        <p>${escHtml(c.doctor_assessment ?? "")}</p>
        <div class="risk-badge" style="background:${riskColor[risk]}20;border:1px solid ${riskColor[risk]}40;color:${riskColor[risk]}">
          Risk Level: ${risk.toUpperCase()}
        </div>
      </div>

      ${followUp}

      ${diffRows ? `
      <div class="section">
        <div class="section-header diff-header">Differential Diagnosis (Ranked)</div>
        <table class="diff-table">
          <thead><tr><th>#</th><th>Condition</th><th>Clinical Reason</th></tr></thead>
          <tbody>${diffRows}</tbody>
        </table>
      </div>` : ""}

      ${(c.key_symptoms_to_check ?? []).length ? `
      <div class="section">
        <div class="section-header symptoms-header">Key Symptoms to Monitor</div>
        <ul class="bullet-list">${listItems(c.key_symptoms_to_check ?? [])}</ul>
      </div>` : ""}

      ${(c.recommended_next_steps ?? []).length ? `
      <div class="section">
        <div class="section-header actions-header">Recommended Next Steps</div>
        <ul class="bullet-list">${listItems(c.recommended_next_steps ?? [])}</ul>
      </div>` : ""}

      ${(c.emergency_warning_signs ?? []).length ? `
      <div class="section warning-section">
        <div class="section-header warning-header">⚠ Emergency Warning Signs — Seek Immediate Care If:</div>
        <ul class="bullet-list">${listItems(c.emergency_warning_signs ?? [])}</ul>
      </div>` : ""}

      <div class="disclaimer">${escHtml(c.medical_disclaimer ?? "This AI provides informational guidance only. Always consult a qualified doctor.")}</div>
    </div>`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Generate and print the full report ──────────────────────────────────── */
function generateReportHTML(messages: ChatMessage[]): string {
  const pairs: Array<{ user: ChatMessage; ai: ChatMessage }> = [];
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].role === "user" && messages[i + 1].role === "assistant") {
      pairs.push({ user: messages[i], ai: messages[i + 1] });
      i++; // skip ai message in outer loop
    }
  }

  const consultationsHTML = pairs
    .map((p, i) => buildConsultationHTML(p.user.content, p.ai.content, i + 1, p.user.created_at))
    .join("\n");

  const generatedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PantheonMed AI — Clinical Consultation Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 11pt;
      color: #1f2937;
      background: #fff;
      line-height: 1.6;
    }
    /* ── Page layout ── */
    @page { margin: 20mm 18mm; size: A4; }
    .page { max-width: 760px; margin: 0 auto; padding: 0 0 40px; }

    /* ── Report header ── */
    .report-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 0 14px; border-bottom: 2px solid #1e3a8a; margin-bottom: 20px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 38px; height: 38px; background: #0f1e4a;
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 18px; font-weight: 700;
    }
    .brand-name { font-size: 18px; font-weight: 800; color: #0f1e4a; letter-spacing: -0.3px; }
    .brand-sub { font-size: 9px; color: #6b7280; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; }
    .report-meta { text-align: right; font-size: 9px; color: #9ca3af; line-height: 1.8; }
    .report-title {
      font-size: 13px; font-weight: 700; color: #1e3a8a;
      letter-spacing: -0.2px;
    }

    /* ── Disclaimer strip ── */
    .top-disclaimer {
      background: #fefce8; border: 1px solid #fde68a; border-radius: 6px;
      padding: 8px 12px; margin-bottom: 20px; font-size: 9.5px; color: #92400e; line-height: 1.5;
    }

    /* ── Consultation block ── */
    .consultation {
      border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;
      margin-bottom: 20px; page-break-inside: avoid;
    }

    /* ── Question header ── */
    .q-header {
      display: flex; align-items: flex-start; gap: 10px;
      background: #1e3a8a; padding: 10px 14px;
    }
    .q-number {
      background: #2563eb; color: #fff; font-size: 9px; font-weight: 800;
      padding: 2px 6px; border-radius: 4px; white-space: nowrap; margin-top: 1px;
    }
    .q-text { flex: 1; font-size: 11px; font-weight: 600; color: #fff; line-height: 1.5; }
    .q-time { font-size: 9px; color: #93c5fd; white-space: nowrap; margin-top: 2px; }

    /* ── Plain AI answer (legacy) ── */
    .a-plain { padding: 12px 14px; font-size: 10.5px; color: #374151; }

    /* ── Sections ── */
    .section { padding: 10px 14px; border-top: 1px solid #f3f4f6; }
    .section-header {
      font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em;
      text-transform: uppercase; margin-bottom: 6px; padding: 3px 6px;
      border-radius: 3px; display: inline-block;
    }
    .assessment-section { background: #eff6ff; }
    .assessment-header { background: #dbeafe; color: #1e40af; }
    .assessment-section p { font-size: 11px; color: #1e3a8a; font-weight: 500; line-height: 1.6; }
    .risk-badge {
      display: inline-block; margin-top: 8px; font-size: 9px; font-weight: 700;
      padding: 2px 8px; border-radius: 20px; letter-spacing: 0.04em;
    }
    .fu-section { background: #eef2ff; }
    .fu-header { background: #e0e7ff; color: #4338ca; }
    .fu-list { list-style: none; padding: 0; }
    .fu-list li { display: flex; align-items: flex-start; gap: 6px; font-size: 10.5px; color: #3730a3; margin-bottom: 4px; }
    .fu-num { width: 16px; height: 16px; background: #4f46e5; color: #fff; border-radius: 50%; font-size: 8px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .diff-header { background: #f3e8ff; color: #6d28d9; }
    .symptoms-header { background: #e0f2fe; color: #0369a1; }
    .actions-header { background: #dcfce7; color: #166534; }
    .warning-section { background: #fff7ed; }
    .warning-header { background: #fed7aa; color: #c2410c; }

    /* ── Differential table ── */
    .diff-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
    .diff-table th { background: #f5f3ff; padding: 5px 8px; text-align: left; font-size: 8.5px; font-weight: 700; color: #5b21b6; }
    .diff-table td { padding: 5px 8px; border-top: 1px solid #f3f4f6; vertical-align: top; }
    .diff-table td.rank { font-size: 9px; font-weight: 800; color: #7c3aed; text-align: center; width: 28px; }
    .diff-table td.condition { font-weight: 600; color: #374151; }
    .diff-table td.explanation { color: #6b7280; }

    /* ── Bullet list ── */
    .bullet-list { padding-left: 16px; }
    .bullet-list li { font-size: 10.5px; color: #374151; margin-bottom: 3px; line-height: 1.5; }

    /* ── Disclaimer ── */
    .disclaimer {
      background: #fffbeb; border-top: 1px solid #fde68a;
      padding: 8px 14px; font-size: 9px; color: #92400e; line-height: 1.6;
    }

    /* ── Report footer ── */
    .report-footer {
      margin-top: 28px; padding-top: 14px; border-top: 1px solid #e5e7eb;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 8.5px; color: #9ca3af;
    }
    .footer-brand { font-weight: 700; color: #0f1e4a; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .consultation { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="report-header">
    <div class="brand">
      <div class="brand-icon">⚕</div>
      <div>
        <div class="brand-name">PantheonMed AI</div>
        <div class="brand-sub">AI Doctor Clinical Consultation Report</div>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-title">Clinical Consultation Summary</div>
      <div>Generated: ${generatedAt}</div>
      <div>Consultations: ${pairs.length}</div>
    </div>
  </div>

  <div class="top-disclaimer">
    ⚠ <strong>Important Medical Disclaimer:</strong> This report is generated by PantheonMed AI Doctor
    and is for <strong>informational purposes only</strong>. It does not constitute a medical diagnosis or replace
    professional medical consultation. Always consult a qualified, licensed physician for medical decisions.
    In an emergency, call <strong>112</strong> immediately.
  </div>

  ${consultationsHTML}

  <div class="report-footer">
    <span><span class="footer-brand">PantheonMed AI</span> — India's Clinical AI Platform</span>
    <span>Powered by WHO/ICMR/CDC guidelines · Generated ${generatedAt}</span>
  </div>

</div>
</body>
</html>`;
}

/* ── Component ────────────────────────────────────────────────────────────── */
interface PrintReportProps {
  messages: ChatMessage[];
  className?: string;
  compact?: boolean;
}

export default function PrintReport({ messages, className, compact }: PrintReportProps) {
  const hasContent = messages.some(m => m.role === "user");

  function handlePrint() {
    if (!hasContent) return;
    const html = generateReportHTML(messages);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert("Allow pop-ups to export the report."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  }

  if (compact) {
    return (
      <button
        onClick={handlePrint}
        disabled={!hasContent}
        title="Export consultation report"
        className={`flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className ?? ""}`}
      >
        <Download size={12} />
        Export
      </button>
    );
  }

  return (
    <button
      onClick={handlePrint}
      disabled={!hasContent}
      className={`flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 hover:text-blue-700 text-sm font-medium px-3.5 py-2 rounded-xl transition-all duration-150 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${className ?? ""}`}
    >
      <Printer size={14} />
      Export Report
    </button>
  );
}
