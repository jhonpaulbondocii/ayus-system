// src/components/layout/course/osaShared.tsx
import type React from "react";

export const MAROON = "#7b1113";
export const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

export const SEVERITIES = ["MINOR", "SERIOUS", "VERY_SERIOUS"] as const;
export const SEVERITY_LABEL: Record<string, string> = {
  MINOR: "Minor", SERIOUS: "Serious", VERY_SERIOUS: "Very Serious",
};
export const SEVERITY_COLOR: Record<string, { bg: string; fg: string }> = {
  MINOR: { bg: "#fef9c3", fg: "#854d0e" },
  SERIOUS: { bg: "#ffedd5", fg: "#9a3412" },
  VERY_SERIOUS: { bg: "#fee2e2", fg: "#991b1b" },
};

export const STATUSES = ["OPEN", "UNDER_REVIEW", "SANCTIONED", "RESOLVED", "DISMISSED"] as const;
export const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open", UNDER_REVIEW: "Under Review", SANCTIONED: "Sanctioned",
  RESOLVED: "Resolved", DISMISSED: "Dismissed",
};
export const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  OPEN: { bg: "#dbeafe", fg: "#1e40af" },
  UNDER_REVIEW: { bg: "#ede9fe", fg: "#5b21b6" },
  SANCTIONED: { bg: "#ffedd5", fg: "#9a3412" },
  RESOLVED: { bg: "#dcfce7", fg: "#166534" },
  DISMISSED: { bg: "#f3f4f6", fg: "#4b5563" },
};

export type StudentLite = {
  id: string; studentNumber: string; name: string;
  course: string | null; yearSection: string | null;
  guardianName?: string | null; guardianContact?: string | null;
};

export type ViolationRow = {
  id: string;
  caseNo: string;
  severity: string;
  status: string;
  incidentDate: string;
  location: string | null;
  description: string | null;
  student: StudentLite;
  violationType: { id: string; code: string; name: string; severity: string };
};
export type ParentContactRow = {
  id: string;
  contactedAt: string;
  method: string;
  contactPerson: string | null;
  relationship: string | null;
  attendance: string;
  attemptNo: number; remarks: string | null;
};
export type NoteRow = { id: string; body: string; confidential: boolean; createdAt: string };

export type ViolationDetail = ViolationRow & {
  reportedBy: string | null;
  reportedByRole: string | null;
  noticeToExplainAt: string | null;
  explanationReceivedAt: string | null;
  hearingDate: string | null;
  hearingResult: string | null;
  sanction: string | null;
  sanctionDays: number | null;
  sanctionStart: string | null;
  sanctionEnd: string | null;
  sanctionCompleted: boolean;
  decidedBy: string | null;
  decidedAt: string | null;
  appealed: boolean;
  appealResult: string | null;
  resolvedAt: string | null;
  parentContacts: ParentContactRow[];
  notes: NoteRow[];
};

export const input: React.CSSProperties = {
  width: "100%", height: 34, border: "1px solid #e5e7eb", borderRadius: 8,
  padding: "0 10px", fontSize: 13, fontFamily: FONT, boxSizing: "border-box", background: "#fff",
};
export const textarea: React.CSSProperties = {
  ...input, height: 72, padding: "8px 10px", resize: "vertical",
};
export const btn: React.CSSProperties = {
  height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #e5e7eb",
  background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
};
export const btnPrimary: React.CSSProperties = {
  ...btn, background: MAROON, color: "#fff", borderColor: MAROON,
};

export const dateOnly = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : "");
export const fmtDate = (v: string | null | undefined) => {
  if (!v) return "—";
  // kung date-only string, i-parse nang walang timezone conversion
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  }
  return new Date(s).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

export function Badge({ text, color }: { text: string; color: { bg: string; fg: string } }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11,
      fontWeight: 700, background: color.bg, color: color.fg, whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>
      {label}
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  );
}