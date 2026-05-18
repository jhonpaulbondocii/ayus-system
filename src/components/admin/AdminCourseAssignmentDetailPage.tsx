"use client";

// AdminCourseAssignmentDetailPage.tsx
// Route: /admin/courses/[id]/assignments/[assignmentId]
// Fixed: Full desktop width utilization + fully responsive

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, CheckCircle, Circle, Pencil,
  Users, X, Trash2, FileText,
  ChevronDown, Check, RefreshCw, Search,
  AlertCircle, Clock, Star, PackageOpen,
  Eye, ExternalLink, MoreVertical, Download,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  points: number;
  status: "PUBLISHED" | "UNPUBLISHED";
  dueDate: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  assignmentGroup: string;
  submissionType?: string | null;
  onlineEntryOptions?: string[];
  allowedAttempts?: number | null;
  assignees?: string[];
  publisherName?: string | null;
  publisherImage?: string | null;
  publisherRole?: string | null;
  createdBy?: string | null;
  createdById?: string | null;
}

interface EnrolledUser { id: string; name: string; email?: string; courseRole?: string; }
interface Submission {
  id?: string; fileUrl: string | null; fileName?: string | null;
  userName: string | null; userEmail: string; userId: string;
  submittedAt: string | null; points?: number | null; grade?: string | null;
  textEntry?: string | null; onlineUrl?: string | null; feedback?: string | null;
  status?: string | null; isLate?: boolean;
}
interface AssignRow {
  id: number; assignees: { id: string; label: string }[];
  dueDate: string; dueTime: string;
  availableFrom: string; availableFromTime: string;
  until: string; untilTime: string;
}

// ── Rubric Types ───────────────────────────────────────────────────────────────
interface RubricRating { id?: string; points: number; name: string; description: string; order: number; }
interface RubricCriterion {
  id?: string; name: string; description: string; points: number;
  enableRange: boolean; order: number; ratings: RubricRating[];
}
interface Rubric {
  id?: string; title: string; type: string; ratingDisplay: string; ratingOrder: string; scoring: string;
  doNotPostToGradebook: boolean; useForGrading: boolean; hideScoreTotal: boolean;
  pointsPossible: number; criteria: RubricCriterion[];
}

const DEFAULT_RATINGS: RubricRating[] = [
  { points: 4, name: "Exceeds", description: "", order: 0 },
  { points: 3, name: "Mastery", description: "", order: 1 },
  { points: 2, name: "Near", description: "", order: 2 },
  { points: 1, name: "Below", description: "", order: 3 },
  { points: 0, name: "No Evidence", description: "", order: 4 },
];

type ActiveTab = "overview" | "submissions";
type FilterStatus = "all" | "submitted" | "graded" | "missing" | "late" | "excused";
type SortType = "name" | "newest" | "oldest" | "grade";

// ── Helpers ────────────────────────────────────────────────────────────────────
function buildTimes() {
  const list: string[] = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 30) {
      const hh = ((h + 11) % 12) + 1;
      list.push(`${hh}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`);
    }
  return list;
}
const ASSIGN_TIMES = buildTimes();

function isoToDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().split("T")[0];
}
function isoToTime(iso: string | null) {
  if (!iso) return "11:59 PM";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDue(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtLocalCourse(date: string, time: string) {
  if (!date) return null;
  const d = new Date(`${date} ${time || "11:59 PM"}`);
  if (isNaN(d.getTime())) return null;
  return `Local: ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}
function isLateCheck(submittedAt: string | null, dueDate: string | null) {
  if (!submittedAt || !dueDate) return false;
  return new Date(submittedAt) > new Date(dueDate);
}
function getGradeColor(points: number, maxPoints: number) {
  if (maxPoints === 0) return "#6b7280";
  const pct = points / maxPoints;
  if (pct >= 0.9) return "#16a34a";
  if (pct >= 0.75) return "#65a30d";
  if (pct >= 0.6) return "#d97706";
  return "#dc2626";
}
function isImage(url: string) { return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.split("?")[0]); }
function isPdf(url: string) { return /\.pdf$/i.test(url.split("?")[0]); }

function normalizeOpt(opt: string): string {
  const o = opt.toLowerCase().replace(/\s+/g, "_");
  if (o.includes("text")) return "online_text_entry";
  if (o.includes("file")) return "file_upload";
  if (o.includes("url") || o.includes("website")) return "online_url";
  if (o.includes("media")) return "media_recording";
  if (o.includes("annotation")) return "student_annotation";
  return o;
}
const OPT_LABELS: Record<string, string> = {
  online_text_entry: "Text Entry",
  file_upload: "File Upload",
  online_url: "Website URL",
  media_recording: "Media Recording",
  student_annotation: "Student Annotation",
};

function resolveAssigneesLabel(assignees: string[], users: EnrolledUser[]) {
  if (!assignees || assignees.length === 0) return "Everyone";
  const names = assignees.map(id => users.find(u => u.id === id)?.name ?? id);
  return names.length === 1 ? names[0] : `${names.length} people`;
}

function getAvailabilityStatus(a: Assignment) {
  const now = new Date();
  if (a.status !== "PUBLISHED") return { canSubmit: false, statusLabel: "Not Published", statusColor: "#9ca3af" };
  const from = a.availableFrom ? new Date(a.availableFrom) : null;
  const until = a.availableUntil ? new Date(a.availableUntil) : null;
  if (from && now < from) return { canSubmit: false, statusLabel: `Opens ${fmtDate(a.availableFrom)}`, statusColor: "#f59e0b" };
  if (until && now > until) return { canSubmit: false, statusLabel: "Closed", statusColor: "#ef4444" };
  return { canSubmit: true, statusLabel: "Open for submissions", statusColor: "#22c55e" };
}

function computeStats(submissions: Submission[], dueDate: string | null) {
  const submitted = submissions.filter(s => s.submittedAt != null);
  const missing   = submissions.filter(s => !s.submittedAt);
  const graded    = submissions.filter(s => (s.points != null || s.grade != null) && s.status !== "EXCUSED");
  const late      = submitted.filter(s => s.status === "LATE" || s.isLate || isLateCheck(s.submittedAt, dueDate));
  const scored    = graded.filter(s => s.points != null);
  const avgScore  = scored.length > 0 ? Math.round(scored.reduce((a, s) => a + (s.points ?? 0), 0) / scored.length * 10) / 10 : null;
  return { submitted, missing, graded, late, avgScore };
}

// ── Role Badge ─────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string | null | undefined }) {
  if (!role) return null;
  const normalized = role.toUpperCase();
  const styles: Record<string, React.CSSProperties> = {
    ADMIN:   { background: "#fef2f2", color: MAROON,   border: "1px solid #fecaca" },
    HEAD:    { background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" },
    STAFF:   { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    TEACHER: { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" },
  };
  const style = styles[normalized] ?? { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" };
  return (
    <span style={{ ...style, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {normalized}
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ["#0e7490", "#1d4ed8", "#16a34a", "#ea580c", "#7c3aed", MAROON];
  const color = colors[(name.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", fontWeight: 900, fontSize: size * 0.38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ sub, dueDate }: { sub: Submission; dueDate: string | null }) {
  const isExcused = sub.status === "EXCUSED";
  const late = sub.status === "LATE" || sub.isLate || isLateCheck(sub.submittedAt, dueDate);
  const graded = (sub.points != null || sub.grade != null) && !isExcused;
  if (!sub.submittedAt)
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0", whiteSpace: "nowrap" }}><AlertCircle size={9} /> Missing</span>;
  if (isExcused)
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>Excused</span>;
  if (graded && !late)
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", whiteSpace: "nowrap" }}><Check size={9} /> Graded</span>;
  if (late)
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", whiteSpace: "nowrap" }}>Late</span>;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}><Check size={9} /> Submitted</span>;
}

// ── Delete Modal ───────────────────────────────────────────────────────────────
function DeleteConfirmModal({ title, onConfirm, onCancel, deleting }: {
  title: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.4)", padding: "0 16px" }} onClick={onCancel}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 20px 40px rgba(0,0,0,.2)", width: "100%", maxWidth: 400, overflow: "hidden", fontFamily: FONT }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #fce8e8", background: "#fef2f2", display: "flex", alignItems: "center", gap: 8 }}>
          <Trash2 size={15} style={{ color: MAROON }} />
          <span style={{ fontSize: 14, fontWeight: 900, color: MAROON }}>Delete Assignment</span>
        </div>
        <div style={{ padding: "20px" }}>
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: 0 }}>
            Are you sure you want to delete <strong>&ldquo;{title}&rdquo;</strong>? This cannot be undone.
          </p>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onCancel} disabled={deleting} style={{ height: 36, padding: "0 16px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", background: "#fff" }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{ height: 36, padding: "0 16px", borderRadius: 10, fontSize: 13, fontWeight: 900, color: "#fff", cursor: "pointer", background: MAROON, border: "none", opacity: deleting ? 0.6 : 1 }}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Grade Modal ────────────────────────────────────────────────────────────────
function GradeModal({ sub, assignment, onClose, onSave }: {
  sub: Submission; assignment: Assignment; onClose: () => void;
  onSave: (userId: string, points: number | null, feedback: string, status: string) => Promise<void>;
}) {
  const existing = sub.points ?? (sub.grade != null ? parseFloat(sub.grade) : null);
  const [score, setScore] = useState<string>(existing != null ? String(existing) : "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [status, setStatus] = useState(sub.status ?? "SUBMITTED");
  const [saving, setSaving] = useState(false);
  const maxPts = assignment.points;
  const pct = score !== "" && !isNaN(parseFloat(score)) ? Math.round((parseFloat(score) / maxPts) * 100) : null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(sub.userId, score !== "" ? parseFloat(score) : null, feedback, status);
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,.4)" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 32px rgba(0,0,0,.2)", width: "100%", maxWidth: 480, overflow: "hidden", fontFamily: FONT, maxHeight: "95dvh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: MAROON, flexShrink: 0 }}>
          <Avatar name={sub.userName ?? sub.userEmail} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Grading</p>
            <p style={{ fontSize: 14, fontWeight: 900, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.userName ?? sub.userEmail}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.6)" }}><X size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "10px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", margin: 0 }}>{assignment.title}</p>
            <p style={{ fontSize: 12, fontWeight: 900, color: MAROON, margin: 0 }}>Max: {maxPts} pts</p>
          </div>
          {sub.submittedAt && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6", marginBottom: 16 }}>
              <Clock size={12} style={{ color: "#9ca3af" }} />
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Submitted: {fmtDateTime(sub.submittedAt)}</p>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", display: "block", marginBottom: 8 }}>Score</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <input type="number" min={0} max={maxPts} value={score} onChange={e => setScore(e.target.value)} placeholder="—"
                style={{ flex: 1, height: 48, textAlign: "center", fontSize: 20, fontWeight: 900, border: `2px solid ${score !== "" ? MAROON : "#e5e7eb"}`, borderRadius: 12, outline: "none", color: MAROON, fontFamily: FONT }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#9ca3af" }}>/ {maxPts}</span>
              {pct !== null && <span style={{ fontSize: 14, fontWeight: 900, color: getGradeColor(parseFloat(score), maxPts) }}>{pct}%</span>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[100, 90, 80, 70, 60, 0].map(p => {
                const val = Math.round((p / 100) * maxPts);
                const isActive = parseFloat(score) === val;
                return (
                  <button key={p} type="button" onClick={() => setScore(String(val))}
                    style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, border: "1px solid", borderRadius: 8, cursor: "pointer", borderColor: isActive ? MAROON : "#e5e7eb", background: isActive ? MAROON : "#fff", color: isActive ? "#fff" : "#6b7280" }}>
                    {p}% ({val})
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", display: "block", marginBottom: 6 }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ width: "100%", height: 38, border: "1px solid #e5e7eb", borderRadius: 10, padding: "0 12px", fontSize: 13, background: "#fff", outline: "none", fontFamily: FONT }}>
              <option value="SUBMITTED">Submitted</option>
              <option value="GRADED">Graded</option>
              <option value="LATE">Late</option>
              <option value="MISSING">Missing</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", display: "block", marginBottom: 6 }}>Feedback (Optional)</label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} placeholder="Write feedback..."
              style={{ width: "100%", padding: "10px 12px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 10, outline: "none", resize: "none", fontFamily: FONT, boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, height: 40, border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer", background: "#fff" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, height: 40, borderRadius: 12, fontSize: 14, fontWeight: 900, color: "#fff", cursor: "pointer", background: MAROON, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: saving ? 0.6 : 1 }}>
            <Star size={13} />{saving ? "Saving..." : "Save Grade"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── File Preview Modal ─────────────────────────────────────────────────────────
function FilePreviewModal({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  const url = sub.fileUrl ?? sub.onlineUrl ?? null;
  if (!url && !sub.textEntry) return null;
  const fileName = sub.fileName ?? "File";
  const isImg = url ? isImage(url) : false;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.6)", padding: "16px" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 860, maxHeight: "90dvh", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: MAROON, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <FileText size={13} style={{ color: "rgba(255,255,255,.7)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {url && (
              <>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", gap: 4 }}><ExternalLink size={11} /> Open</a>
                <a href={url} download={fileName} style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", gap: 4 }}><Download size={11} /> Download</a>
              </>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.6)" }}><X size={15} /></button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden", background: "#f3f4f6", minHeight: 300 }}>
          {!url ? (
            <div style={{ height: "100%", overflowY: "auto", padding: "24px 32px" }}>
              {sub.textEntry
                ? <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: sub.textEntry }} />
                : <p style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>No content to preview.</p>}
            </div>
          ) : isImg ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={fileName} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
            </div>
          ) : isPdf(url) ? (
            <iframe src={url} title={fileName} style={{ width: "100%", height: "100%", border: "none", minHeight: 400 }} />
          ) : (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#9ca3af" }}>
              <FileText size={48} />
              <p style={{ fontSize: 13 }}>Preview not available.</p>
              <a href={url} download={fileName} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 10, color: "#fff", background: MAROON, textDecoration: "none" }}>
                <Download size={13} /> Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Criterion Modal ────────────────────────────────────────────────────────────
function CriterionModal({ initial, onSave, onClose }: {
  initial?: RubricCriterion; onSave: (c: RubricCriterion) => void; onClose: () => void;
}) {
  const [name, setName]               = useState(initial?.name ?? "");
  const [desc, setDesc]               = useState(initial?.description ?? "");
  const [enableRange, setEnableRange] = useState(initial?.enableRange ?? false);
  const [ratings, setRatings]         = useState<RubricRating[]>(
    initial?.ratings?.length ? initial.ratings : [...DEFAULT_RATINGS.map(r => ({ ...r }))]
  );
  const maxPts = Math.max(...ratings.map(r => r.points), 0);

  const updateRating = (i: number, field: keyof RubricRating, val: string | number) =>
    setRatings(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const addRating = () => setRatings(p => [...p, { points: 0, name: "", description: "", order: p.length }]);
  const removeRating = (i: number) => setRatings(p => p.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!name.trim()) { alert("Criterion name is required."); return; }
    const sorted = [...ratings].sort((a, b) => b.points - a.points).map((r, i) => ({ ...r, order: i }));
    onSave({ id: initial?.id, name: name.trim(), description: desc, points: maxPts, enableRange, order: initial?.order ?? 0, ratings: sorted });
  };

  const sortedForDisplay = [...ratings].sort((a, b) => b.points - a.points);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,.5)", padding: 0 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 32px rgba(0,0,0,.2)", width: "100%", maxWidth: 640, maxHeight: "90dvh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: "#111827", margin: 0 }}>{initial ? "Edit Criterion" : "Create Criterion"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", display: "block", marginBottom: 6 }}>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Criterion name"
                style={{ width: "100%", height: 38, border: "1px solid #e5e7eb", borderRadius: 10, padding: "0 12px", fontSize: 13, outline: "none", fontFamily: FONT, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", display: "block", marginBottom: 6 }}>Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Optional"
                style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 12px", fontSize: 12, outline: "none", resize: "none", fontFamily: FONT, boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" }}>
              <input type="checkbox" checked={enableRange} onChange={e => setEnableRange(e.target.checked)} style={{ accentColor: MAROON }} />
              Enable Range
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: MAROON }}>{maxPts}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Points</span>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "48px 70px 1fr 1fr 28px", gap: 6, minWidth: 380 }}>
              {["Disp", "Points", "Rating Name", "Description", ""].map(h => (
                <p key={h} style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 6px" }}>{h}</p>
              ))}
              {sortedForDisplay.map((r, i) => {
                const realIdx = ratings.indexOf(r);
                return (
                  <>
                    <div key={`d${i}`} style={{ width: 36, height: 36, borderRadius: 8, background: MAROON, color: "#fff", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.points}</div>
                    <input key={`p${i}`} type="number" min={0} value={r.points} onChange={e => updateRating(realIdx, "points", parseFloat(e.target.value) || 0)}
                      style={{ height: 36, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 8px", fontSize: 12, textAlign: "center", outline: "none" }} />
                    <input key={`n${i}`} value={r.name} onChange={e => updateRating(realIdx, "name", e.target.value)} placeholder="Rating Name"
                      style={{ height: 36, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 10px", fontSize: 12, outline: "none" }} />
                    <input key={`desc${i}`} value={r.description} onChange={e => updateRating(realIdx, "description", e.target.value)} placeholder="Description"
                      style={{ height: 36, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 10px", fontSize: 12, outline: "none" }} />
                    <button key={`rm${i}`} onClick={() => removeRating(realIdx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={13} /></button>
                  </>
                );
              })}
            </div>
            <button onClick={addRating} style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer" }}>+ Add Rating</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, height: 40, border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer", background: "#fff" }}>Cancel</button>
          <button onClick={handleSave} style={{ flex: 1, height: 40, borderRadius: 12, fontSize: 14, fontWeight: 900, color: "#fff", cursor: "pointer", background: MAROON, border: "none" }}>Save Criterion</button>
        </div>
      </div>
    </div>
  );
}

// ── Rubric Section ─────────────────────────────────────────────────────────────
function RubricSection({ courseId, assignmentId }: { courseId: string; assignmentId: string }) {
  const [rubric, setRubric]     = useState<Rubric | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<Omit<Rubric, "pointsPossible" | "criteria">>({
    title: "", type: "scale", ratingDisplay: "level", ratingOrder: "high_low", scoring: "scored",
    doNotPostToGradebook: false, useForGrading: false, hideScoreTotal: false,
  });
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [criterionModal, setCriterionModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });

  useEffect(() => {
    fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/rubric`)
      .then(r => r.json())
      .then(d => { setRubric((d as { rubric?: Rubric }).rubric ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [courseId, assignmentId]);

  const openCreate = () => {
    if (rubric) {
      setForm({ title: rubric.title, type: rubric.type, ratingDisplay: rubric.ratingDisplay, ratingOrder: rubric.ratingOrder, scoring: rubric.scoring, doNotPostToGradebook: rubric.doNotPostToGradebook, useForGrading: rubric.useForGrading, hideScoreTotal: rubric.hideScoreTotal });
      setCriteria(rubric.criteria.map(c => ({ ...c, ratings: [...c.ratings] })));
    } else {
      setForm({ title: "", type: "scale", ratingDisplay: "level", ratingOrder: "high_low", scoring: "scored", doNotPostToGradebook: false, useForGrading: false, hideScoreTotal: false });
      setCriteria([]);
    }
    setShowModal(true);
  };

  const handleSaveCriterion = (c: RubricCriterion) => {
    if (criterionModal.index !== null) setCriteria(p => p.map((item, i) => i === criterionModal.index ? { ...c, order: i } : item));
    else setCriteria(p => [...p, { ...c, order: p.length }]);
    setCriterionModal({ open: false, index: null });
  };

  const handleSaveRubric = async () => {
    if (!form.title.trim()) { alert("Rubric name is required."); return; }
    if (criteria.length === 0) { alert("Add at least one criterion."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/rubric`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, criteria }),
      });
      const d = await res.json();
      if (!res.ok) { alert(`Error: ${(d as { error?: string }).error ?? "Failed"}`); setSaving(false); return; }
      setRubric((d as { rubric: Rubric }).rubric);
      setShowModal(false);
      fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/rubric`)
        .then(r => r.json()).then(d => setRubric((d as { rubric?: Rubric }).rubric ?? null)).catch(() => {});
    } catch { alert("Network error."); }
    setSaving(false);
  };

  const handleDeleteRubric = async () => {
    if (!confirm("Delete this rubric?")) return;
    setDeleting(true);
    try { await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/rubric`, { method: "DELETE" }); setRubric(null); }
    catch { alert("Failed to delete rubric."); }
    setDeleting(false);
  };

  const totalPts = criteria.reduce((s, c) => s + c.points, 0);
  if (loading) return null;

  return (
    <div style={{ marginTop: 4 }}>
      {rubric ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #fce8e8", background: "#fdf2f2", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
              <p style={{ fontSize: 12, fontWeight: 900, color: MAROON, margin: 0 }}>Rubric — {rubric.title}</p>
              {rubric.useForGrading && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>Used for grading</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: MAROON }}>{rubric.pointsPossible} pts</span>
              <button onClick={openCreate} style={{ fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Edit</button>
              <button onClick={handleDeleteRubric} disabled={deleting} style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", minWidth: 400 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f3f4f6", background: "#f9fafb" }}>
                  <th style={{ textAlign: "left", padding: "8px 14px", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", width: 140 }}>Criteria</th>
                  {(rubric.criteria[0]?.ratings ?? []).slice().sort((a, b) => rubric.ratingOrder === "high_low" ? b.points - a.points : a.points - b.points).map((r, i) => (
                    <th key={i} style={{ textAlign: "center", padding: "8px 10px", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af" }}>
                      {r.name}{rubric.ratingDisplay === "points" && <span style={{ display: "block", fontWeight: 900, fontSize: 12, color: MAROON }}>{r.points} pts</span>}
                    </th>
                  ))}
                  <th style={{ textAlign: "center", padding: "8px 10px", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af" }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {rubric.criteria.map((c, ci) => {
                  const sorted = c.ratings.slice().sort((a, b) => rubric.ratingOrder === "high_low" ? b.points - a.points : a.points - b.points);
                  return (
                    <tr key={ci} style={{ background: ci % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1f2937", fontSize: 12, verticalAlign: "top" }}>
                        {c.name}
                        {c.description && <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400, margin: "3px 0 0" }}>{c.description}</p>}
                      </td>
                      {sorted.map((r, ri) => (
                        <td key={ri} style={{ padding: "10px", textAlign: "center", verticalAlign: "top", borderLeft: "1px solid #f3f4f6" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{r.name}</span>
                          {r.description && <p style={{ fontSize: 10, color: "#9ca3af", margin: "3px 0 0" }}>{r.description}</p>}
                        </td>
                      ))}
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: 900, fontSize: 13, color: MAROON, borderLeft: "1px solid #f3f4f6" }}>{c.points}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  <td colSpan={99} style={{ padding: "8px 14px", textAlign: "right", fontSize: 12, fontWeight: 900, color: MAROON }}>Total: {rubric.pointsPossible} pts</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, fontWeight: 900, color: MAROON, border: `2px solid ${MAROON}`, borderRadius: 10, cursor: "pointer", background: "#fef2f2" }}>+ Create Rubric</button>
          <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "#374151", border: "1px solid #e5e7eb", borderRadius: 10, cursor: "pointer", background: "#fff" }}>Find Rubric</button>
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,.4)" }} onClick={() => setShowModal(false)}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 640, maxHeight: "90dvh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
              <h2 style={{ fontSize: 15, fontWeight: 900, color: "#111827", margin: 0 }}>{rubric ? "Edit Rubric" : "Create Rubric"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", display: "block", marginBottom: 5 }}>Rubric Name *</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Rubric name"
                    style={{ width: "100%", height: 38, border: "1px solid #e5e7eb", borderRadius: 10, padding: "0 12px", fontSize: 13, outline: "none", fontFamily: FONT, boxSizing: "border-box" }} />
                </div>
                {([
                  { label: "Type", key: "type", opts: [["scale","Scale"],["written_feedback","Written Feedback"]] },
                  { label: "Rating Display", key: "ratingDisplay", opts: [["level","Level"],["points","Points"]] },
                  { label: "Rating Order", key: "ratingOrder", opts: [["high_low","High–Low"],["low_high","Low–High"]] },
                  { label: "Scoring", key: "scoring", opts: [["scored","Scored"],["unscored","Unscored"]] },
                ] as { label: string; key: keyof typeof form; opts: [string, string][] }[]).map(({ label, key, opts }) => (
                  <div key={key}>
                    <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", display: "block", marginBottom: 5 }}>{label}</label>
                    <select value={form[key] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: "100%", height: 36, border: "1px solid #e5e7eb", borderRadius: 10, padding: "0 10px", fontSize: 12, background: "#fff", outline: "none" }}>
                      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                {([
                  ["doNotPostToGradebook", "Don't post to Gradebook"],
                  ["useForGrading", "Use for assignment grading"],
                  ["hideScoreTotal", "Hide score total"],
                ] as [keyof typeof form, string][]).map(([key, lbl]) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
                    <input type="checkbox" checked={form[key] as boolean} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} style={{ accentColor: MAROON }} />
                    {lbl}
                  </label>
                ))}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 900, color: "#111827", margin: 0 }}>Criteria</p>
                  <p style={{ fontSize: 13, fontWeight: 900, color: MAROON, margin: 0 }}>{totalPts} pts possible</p>
                </div>
                {criteria.length === 0 && <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>No criteria yet.</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  {criteria.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 12, background: "#f9fafb" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                        <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>{c.ratings.length} ratings · {c.points} pts</p>
                      </div>
                      <button onClick={() => setCriterionModal({ open: true, index: i })} style={{ fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}>Edit</button>
                      <button onClick={() => setCriteria(p => p.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db" }}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setCriterionModal({ open: true, index: null })}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, fontWeight: 900, color: MAROON, border: `2px solid ${MAROON}`, borderRadius: 10, cursor: "pointer", background: "#fef2f2" }}>+ Draft Criterion</button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", flexShrink: 0 }}>
              <button onClick={() => setShowModal(false)} style={{ height: 38, padding: "0 16px", border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", background: "#fff" }}>Cancel</button>
              <button onClick={handleSaveRubric} disabled={saving} style={{ height: 38, padding: "0 20px", borderRadius: 12, fontSize: 13, fontWeight: 900, color: "#fff", cursor: "pointer", background: MAROON, border: "none", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : rubric ? "Update Rubric" : "Create Rubric"}
              </button>
            </div>
          </div>
        </div>
      )}
      {criterionModal.open && (
        <CriterionModal
          initial={criterionModal.index !== null ? criteria[criterionModal.index] : undefined}
          onSave={handleSaveCriterion}
          onClose={() => setCriterionModal({ open: false, index: null })}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminCourseAssignmentDetailPage({
  courseId, assignmentId,
}: {
  courseId: string;
  assignmentId: string;
}) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  const [gradingTarget, setGradingTarget] = useState<Submission | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortType>("newest");
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [assignRows, setAssignRows] = useState<AssignRow[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [dropSearch, setDropSearch] = useState<Record<number, string>>({});
  const [openDrop, setOpenDrop] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const dotMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDotMenu) return;
    const h = (e: MouseEvent) => { if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node)) setShowDotMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDotMenu]);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const [aRes, sRes, uRes] = await Promise.all([
        fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`, { signal }),
        fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/submissions`, { signal }),
        fetch(`/api/admin/courses/${courseId}/sections`, { signal }),
      ]);
      if (signal?.aborted) return;
      const [aData, sData, uData] = await Promise.all([aRes.json(), sRes.json(), uRes.json()]);
      if (signal?.aborted) return;
      setAssignment(aData.assignment ?? aData ?? null);
      setSubmissions(sData.submissions ?? []);
      const raw = uData.staff ?? uData.users ?? uData.members ?? [];
      setEnrolledUsers(raw.map((u: { id: string; name?: string; userName?: string; email?: string; courseRole?: string }) => ({
        id: u.id, name: u.name ?? u.userName ?? u.email ?? u.id, courseRole: u.courseRole ?? "Staff",
      })));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [courseId, assignmentId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => { setRefreshing(false); setJustRefreshed(true); setTimeout(() => setJustRefreshed(false), 3000); });
  };

  const togglePublish = async () => {
    if (!assignment) return;
    setPublishing(true);
    const newStatus = assignment.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setAssignment(prev => prev ? { ...prev, status: newStatus } : null);
    setPublishing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`, { method: "DELETE" });
      if (res.ok) router.push(`/admin/courses/${courseId}/assignments`);
      else { alert("Failed to delete."); setDeleting(false); setShowDeleteModal(false); }
    } catch { alert("Network error."); setDeleting(false); setShowDeleteModal(false); }
  };

  const handleSaveGrade = async (userId: string, points: number | null, feedback: string, status: string) => {
    const sub = submissions.find(s => s.userId === userId);
    if (!sub?.id) {
      setSubmissions(prev => prev.map(s => s.userId === userId ? { ...s, points: points ?? undefined, grade: points != null ? String(points) : null, feedback, status } : s));
      return;
    }
    const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/submissions/${sub.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: points, feedback, status }),
    });
    if (res.ok) setSubmissions(prev => prev.map(s => s.userId === userId ? { ...s, points: points ?? undefined, grade: points != null ? String(points) : null, feedback, status } : s));
  };

  const openAssignPanel = () => {
    if (!assignment) return;
    setAssignRows([{
      id: 1,
      assignees: (assignment.assignees ?? []).length > 0
        ? (assignment.assignees ?? []).map(id => { const found = enrolledUsers.find(u => u.id === id); return { id, label: found?.name ?? id }; })
        : [{ id: "everyone", label: "Everyone" }],
      dueDate: isoToDate(assignment.dueDate), dueTime: isoToTime(assignment.dueDate),
      availableFrom: isoToDate(assignment.availableFrom), availableFromTime: isoToTime(assignment.availableFrom),
      until: isoToDate(assignment.availableUntil), untilTime: isoToTime(assignment.availableUntil),
    }]);
    setDropSearch({}); setOpenDrop(null); setShowAssignPanel(true);
  };

  const updateAssignRow = (id: number, field: keyof AssignRow, value: string) =>
    setAssignRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const toggleAssignee = (rowId: number, user: { id: string; label: string }) =>
    setAssignRows(p => p.map(r => {
      if (r.id !== rowId) return r;
      const has = r.assignees.find(a => a.id === user.id);
      const withoutEveryone = r.assignees.filter(a => a.id !== "everyone");
      const next = has ? withoutEveryone.filter(a => a.id !== user.id) : [...withoutEveryone, user];
      return { ...r, assignees: next.length ? next : [{ id: "everyone", label: "Everyone" }] };
    }));

  const selectEveryone = (rowId: number) =>
    setAssignRows(p => p.map(r => r.id === rowId ? { ...r, assignees: [{ id: "everyone", label: "Everyone" }] } : r));

  const addAssignRow = () =>
    setAssignRows(p => [...p, { id: Date.now(), assignees: [], dueDate: "", dueTime: "11:59 PM", availableFrom: "", availableFromTime: "12:00 AM", until: "", untilTime: "11:59 PM" }]);

  const removeAssignRow = (id: number) => setAssignRows(p => p.filter(r => r.id !== id));

  const saveAssignTo = async () => {
    if (!assignment) return;
    setSavingAssign(true);
    const allEveryone = assignRows.every(r => r.assignees.length === 0 || r.assignees.some(a => a.id === "everyone"));
    const resolvedIds = allEveryone ? [] : assignRows.flatMap(r => r.assignees.filter(a => a.id !== "everyone").map(a => a.id));
    const row = assignRows[0];
    const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignees: resolvedIds, dueDate: row.dueDate || null, dueTime: row.dueTime, availableFrom: row.availableFrom || null, availableFromTime: row.availableFromTime, availableUntil: row.until || null, untilTime: row.untilTime }),
    });
    const data = await res.json();
    if (data.assignment) {
      setAssignment(prev => prev ? { ...prev, assignees: resolvedIds, dueDate: data.assignment.dueDate ?? prev.dueDate, availableFrom: data.assignment.availableFrom ?? prev.availableFrom, availableUntil: data.assignment.availableUntil ?? prev.availableUntil } : null);
    }
    setSavingAssign(false); setShowAssignPanel(false);
  };

  const handleDownloadAll = async () => {
    const downloadable = submissions.filter(s => s.fileUrl && s.submittedAt);
    if (!downloadable.length) return;
    setDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const s of downloadable) {
        if (!s.fileUrl) continue;
        const safeName = (s.userName ?? s.userEmail).replace(/[^a-zA-Z0-9_\- ]/g, "_");
        const ext = s.fileUrl.split("?")[0].split(".").pop() ?? "bin";
        try {
          const res = await fetch(s.fileUrl);
          const blob = await res.blob();
          zip.file(`${safeName}/${safeName}.${ext}`, blob);
          zip.file(`${safeName}/grade_info.txt`, [`Student: ${s.userName ?? s.userEmail}`, `Email: ${s.userEmail}`, `Score: ${s.points != null ? `${s.points}/${assignment?.points}` : "Not graded"}`, `Feedback: ${s.feedback ?? "—"}`].join("\n"));
        } catch { /* skip */ }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(assignment?.title ?? "assignment").replace(/[^a-zA-Z0-9_\- ]/g, "_")}_submissions.zip`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch { alert("Failed to download."); }
    setDownloading(false);
  };

  const handleSpeedGrader = (userId?: string) => {
    const base = `/admin/courses/${courseId}/assignments/${assignmentId}/speedgrader`;
    const url = userId ? `${base}?userId=${userId}` : base;
    const isMobileOrTablet = /Mobi|Android|iPad|Tablet/i.test(navigator.userAgent) || window.innerWidth < 1024;
    if (isMobileOrTablet) window.location.href = url;
    else window.open(url, "_blank");
  };

  // ── Loading / Not found ─────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, gap: 10, color: "#9ca3af", fontSize: 13, fontFamily: FONT }}>
      <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!assignment) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 240, gap: 12, fontFamily: FONT }}>
      <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Assignment not found.</p>
      <button onClick={() => router.push(`/admin/courses/${courseId}/assignments`)} style={{ fontSize: 13, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>← Go back</button>
    </div>
  );

  const isPublished = assignment.status === "PUBLISHED";
  const opts = (assignment.onlineEntryOptions ?? []).map(normalizeOpt);
  const submittingLabel = opts.length > 0 ? opts.map(o => OPT_LABELS[o] ?? o).join(", ") : (assignment.submissionType ?? "—");
  const forLabel = resolveAssigneesLabel(assignment.assignees ?? [], enrolledUsers);
  const availability = getAvailabilityStatus(assignment);
  const { submitted } = computeStats(submissions, assignment.dueDate);

  const filteredSubmissions = submissions
    .filter(s => {
      const q = search.trim().toLowerCase();
      if (q && !(s.userName ?? s.userEmail).toLowerCase().includes(q) && !s.userEmail.toLowerCase().includes(q)) return false;
      const late = s.status === "LATE" || s.isLate || isLateCheck(s.submittedAt, assignment.dueDate);
      if (filterStatus === "submitted") return !!s.submittedAt;
      if (filterStatus === "graded")    return (s.points != null || s.grade != null) && s.status !== "EXCUSED";
      if (filterStatus === "missing")   return !s.submittedAt;
      if (filterStatus === "late")      return !!late;
      if (filterStatus === "excused")   return s.status === "EXCUSED";
      return true;
    })
    .sort((a, b) => {
      if (sort === "name")   return (a.userName ?? a.userEmail).localeCompare(b.userName ?? b.userEmail);
      if (sort === "grade")  return (b.points ?? -1) - (a.points ?? -1);
      if (sort === "oldest") { if (!a.submittedAt) return 1; if (!b.submittedAt) return -1; return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(); }
      if (!a.submittedAt) return 1; if (!b.submittedAt) return -1;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff", fontFamily: FONT }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .assign-desc { font-size: 13px; color: #374151; line-height: 1.75; }
        .assign-desc p { margin: 0 0 8px; }
        .assign-desc strong, .assign-desc b { font-weight: 700; color: #111827; }
        .assign-desc ul, .assign-desc ol { padding-left: 20px; margin: 0 0 6px; }
        .assign-desc li { margin-bottom: 3px; }
        .assign-desc a { color: #7b1113; text-decoration: underline; }

        /* ── Desktop sidebar always visible ── */
        .detail-sidebar { display: flex !important; }

        /* ── Overview: side-by-side on desktop ── */
        .overview-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .overview-main {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          min-width: 0;
        }
        .overview-sidebar {
          width: 220px;
          flex-shrink: 0;
          border-left: 1px solid #e5e7eb;
          background: #fff;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        /* Details+Schedule: 2-col grid on desktop */
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        /* Stats: 5-col on desktop */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        }

        /* Tab action labels always visible on desktop */
        .action-label { display: inline !important; }

        /* Submissions: 2-col card grid on larger screens */
        .submissions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        /* ── Tablet (768–1023px) ── */
        @media (max-width: 1023px) {
          .overview-sidebar { display: none !important; }
          .overview-main { padding: 16px; }
          .submissions-grid { grid-template-columns: 1fr; }
        }

        /* ── Mobile (≤767px) ── */
        @media (max-width: 767px) {
          .overview-main { padding: 12px 10px; }
          .details-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .stats-grid .stat-hide-mobile { display: none; }
          .action-label { display: none !important; }
          .submissions-grid { grid-template-columns: 1fr; }
        }

        /* ── Small mobile (≤480px) ── */
        @media (max-width: 480px) {
          .tab-actions-wrap { padding: 4px 0 !important; }
          .assign-hero { padding: 14px !important; }
        }
      `}</style>

      {/* Modals */}
      {showDeleteModal && <DeleteConfirmModal title={assignment.title} onConfirm={handleDelete} onCancel={() => { setShowDeleteModal(false); setShowDotMenu(false); }} deleting={deleting} />}
      {gradingTarget && <GradeModal sub={gradingTarget} assignment={assignment} onClose={() => setGradingTarget(null)} onSave={handleSaveGrade} />}
      {previewTarget && <FilePreviewModal sub={previewTarget} onClose={() => setPreviewTarget(null)} />}

      {/* ── Unpublished banner ── */}
      {!isPublished && (
        <div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" style={{ flexShrink: 0 }}><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" /></svg>
          <p style={{ fontSize: 12, color: "#92400e", fontWeight: 500, margin: 0 }}>This assignment is <strong>unpublished</strong>. Staff cannot see it until published.</p>
        </div>
      )}

      {/* ── Top action bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb", padding: "0 8px 0 12px", background: "#fff", flexShrink: 0, flexWrap: "wrap", gap: 0, minHeight: 48 }}>
        {/* Tabs */}
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          {(["overview", "submissions"] as ActiveTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: "10px 12px", fontSize: 13, marginBottom: -1, marginRight: 2, borderRadius: "6px 6px 0 0", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", textTransform: "capitalize", transition: "all 0.15s",
                border: activeTab === tab ? "1px solid #e5e7eb" : "1px solid transparent",
                borderBottom: activeTab === tab ? "1px solid #fff" : "1px solid transparent",
                background: activeTab === tab ? "#fff" : "transparent",
                color: activeTab === tab ? "#111827" : "#6b7280",
                fontWeight: activeTab === tab ? 600 : 400 }}>
              {tab === "submissions" ? "Submissions" : "Overview"}
              {tab === "submissions" && submitted.length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", fontSize: 10, fontWeight: 900, color: "#fff", background: MAROON }}>{submitted.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="tab-actions-wrap" style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", padding: "6px 0" }}>
          <button onClick={togglePublish} disabled={publishing}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", opacity: publishing ? 0.6 : 1, border: "1px solid",
              background: isPublished ? "#f0fdf4" : "#f9fafb",
              color: isPublished ? "#15803d" : "#6b7280",
              borderColor: isPublished ? "#bbf7d0" : "#e5e7eb" }}>
            {isPublished ? <CheckCircle size={13} style={{ color: "#15803d" }} /> : <Circle size={13} />}
            <span className="action-label">{isPublished ? "Published" : "Unpublished"}</span>
          </button>
          <button onClick={openAssignPanel}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", border: "1px solid #e5e7eb", background: "#fff", color: "#374151" }}>
            <Users size={13} /><span className="action-label">Assign</span>
          </button>
          <button onClick={() => router.push(`/admin/courses/${courseId}/assignments/${assignmentId}/edit`)}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", border: "1px solid #e5e7eb", background: "#fff", color: "#374151" }}>
            <Pencil size={13} /><span className="action-label">Edit</span>
          </button>
          <button onClick={() => handleSpeedGrader()}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", fontSize: 12, fontWeight: 900, borderRadius: 8, cursor: "pointer", border: "none", background: MAROON, color: "#fff" }}>
            <Zap size={13} /><span>SpeedGrader™</span>
          </button>
          <div style={{ position: "relative" }} ref={dotMenuRef}>
            <button onClick={() => setShowDotMenu(p => !p)}
              style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", background: "#fff", color: "#6b7280" }}>
              <MoreVertical size={15} />
            </button>
            {showDotMenu && (
              <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, width: 180, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 100, overflow: "hidden", padding: "4px 0" }}>
                <button onClick={() => { setShowDotMenu(false); setShowDeleteModal(true); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#ef4444", cursor: "pointer", background: "none", border: "none", textAlign: "left" }}>
                  <Trash2 size={13} /> Delete Assignment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {activeTab === "overview" && (
        <div className="overview-layout">
          {/* Main content — fills all available space */}
          <div className="overview-main">
            <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>

              {/* Hero */}
              <div className="assign-hero" style={{ background: `linear-gradient(135deg, ${MAROON} 0%, #5a0d0f 100%)`, borderRadius: 14, padding: "20px 20px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
                <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.03)" }} />
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, position: "relative", flexWrap: "wrap" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText size={20} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <h1 style={{ fontSize: "clamp(16px, 2.5vw, 22px)", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2, wordBreak: "break-word" }}>{assignment.title}</h1>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.9)", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {assignment.assignmentGroup || "Assignment"}
                      </span>
                    </div>
                    {assignment.publisherName && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#fff", flexShrink: 0, overflow: "hidden" }}>
                          {assignment.publisherImage
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={assignment.publisherImage} alt={assignment.publisherName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                            : assignment.publisherName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.9)" }}>{assignment.publisherName}</span>
                        {assignment.publisherRole && <RoleBadge role={assignment.publisherRole} />}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.12)", borderRadius: 20, padding: "5px 12px", flexShrink: 0, alignSelf: "flex-start" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: availability.statusColor }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>{availability.statusLabel}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {assignment.description ? (
                <div style={{ background: "#fff", border: "1px solid #f0e4e4", borderLeft: `4px solid ${MAROON}`, borderRadius: "0 12px 12px 0", padding: "14px 16px" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Description</p>
                  <div className="assign-desc" dangerouslySetInnerHTML={{ __html: assignment.description }} />
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic", margin: 0 }}>No description provided.</p>
              )}

              {/* Stats */}
              {submissions.length > 0 && (() => {
                const { submitted: s, graded: g, missing: m, late: l, avgScore: a } = computeStats(submissions, assignment.dueDate);
                return (
                  <div className="stats-grid">
                    {[
                      { label: "Submitted", value: s.length, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", cls: "" },
                      { label: "Graded",    value: g.length, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", cls: "" },
                      { label: "Missing",   value: m.length, color: MAROON,   bg: "#fef2f2", border: "#f0c0c0", cls: "" },
                      { label: "Late",      value: l.length, color: "#dc2626", bg: "#fef2f2", border: "#fecaca", cls: "stat-hide-mobile" },
                      { label: "Avg",       value: a != null ? `${a}/${assignment.points}` : "—", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", cls: "stat-hide-mobile" },
                    ].map(stat => (
                      <div key={stat.label} className={stat.cls} style={{ background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: 10, padding: "12px 4px", textAlign: "center" }}>
                        <p style={{ fontSize: "clamp(14px, 2.5vw, 22px)", fontWeight: 900, color: stat.color, margin: 0, lineHeight: 1 }}>{stat.value}</p>
                        <p style={{ fontSize: "clamp(8px, 1.2vw, 11px)", fontWeight: 800, color: stat.color, textTransform: "uppercase", letterSpacing: "0.06em", margin: "4px 0 0" }}>{stat.label}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Details + Schedule — 2-col on desktop */}
              <div className="details-grid">
                <div style={{ background: "#fff", border: "1px solid #f0e4e4", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", background: "linear-gradient(90deg,#fef2f2,#fff)", borderBottom: "1px solid #fce8e8", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: MAROON, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Details</p>
                  </div>
                  <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                    {([
                      ["Points", `${assignment.points} pts`],
                      ["Submission", submittingLabel],
                      ["Group", assignment.assignmentGroup || "—"],
                      ["Attempts", assignment.allowedAttempts != null ? String(assignment.allowedAttempts) : "Unlimited"],
                      ["Status", isPublished ? "Published" : "Unpublished"],
                      ["Can Submit", availability.canSubmit ? "Yes" : "No"],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k}>
                        <p style={{ fontSize: 9, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>{k}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: "#fff", border: "1px solid #f0e4e4", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", background: "linear-gradient(90deg,#fef2f2,#fff)", borderBottom: "1px solid #fce8e8", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: MAROON, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Schedule</p>
                  </div>
                  <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                    {([
                      ["Due Date", fmtDue(assignment.dueDate) || "No due date"],
                      ["Assigned To", forLabel],
                      ["Available From", assignment.availableFrom ? fmtDate(assignment.availableFrom) : "—"],
                      ["Until", assignment.availableUntil ? fmtDate(assignment.availableUntil) : "—"],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k}>
                        <p style={{ fontSize: 9, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>{k}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rubric Section */}
              <div style={{ background: "#fff", border: "1px solid #f0e4e4", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", background: "linear-gradient(90deg,#fef2f2,#fff)", borderBottom: "1px solid #fce8e8", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: MAROON, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
                  </div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Rubric</p>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <RubricSection courseId={courseId} assignmentId={assignmentId} />
                </div>
              </div>

              {/* Submissions CTA */}
              {submitted.length > 0 && (
                <button onClick={() => setActiveTab("submissions")}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderRadius: 14, border: "1px solid #f0c0c0", background: "linear-gradient(90deg,#fef2f2,#fff)", cursor: "pointer", fontFamily: FONT, boxSizing: "border-box" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: MAROON, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FileText size={18} color="#fff" />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: 15, fontWeight: 900, color: MAROON, margin: 0 }}>{submitted.length} Submission{submitted.length !== 1 ? "s" : ""}</p>
                      <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>Click to view, grade, and download</p>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Right Sidebar — always visible on desktop */}
          <div className="overview-sidebar detail-sidebar">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", background: "#fdf2f2" }}>
              <p style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: MAROON, margin: 0 }}>Related Items</p>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => handleSpeedGrader()} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}><Zap size={13} /> SpeedGrader™</button>
              <button onClick={() => setActiveTab("submissions")} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}><FileText size={13} /> View Submissions</button>
              <button onClick={() => router.push(`/admin/courses/${courseId}/assignments/${assignmentId}/edit`)} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}><Pencil size={13} /> Edit Assignment</button>
            </div>
            {/* Quick stats in sidebar */}
            {submissions.length > 0 && (() => {
              const { submitted: s, graded: g, missing: m } = computeStats(submissions, assignment.dueDate);
              return (
                <div style={{ padding: "14px 16px", borderTop: "1px solid #f3f4f6" }}>
                  <p style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", margin: "0 0 10px" }}>Quick Stats</p>
                  {[
                    { label: "Submitted", value: s.length, color: "#1d4ed8" },
                    { label: "Graded",    value: g.length, color: "#15803d" },
                    { label: "Missing",   value: m.length, color: MAROON },
                  ].map(stat => (
                    <div key={stat.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{stat.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: stat.color }}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══ SUBMISSIONS TAB ══ */}
      {activeTab === "submissions" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#f8f8f7" }}>

          {/* Action bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {justRefreshed && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                <Check size={11} /> Updated
              </span>
            )}
            <button onClick={handleRefresh} disabled={refreshing}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12, fontWeight: 600, border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", color: "#374151", background: "#fff", opacity: refreshing ? 0.6 : 1 }}>
              <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
            <button onClick={() => handleSpeedGrader()}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12, fontWeight: 900, borderRadius: 8, cursor: "pointer", border: "none", background: MAROON, color: "#fff" }}>
              <Zap size={12} /> SpeedGrader™
            </button>
          </div>

          {/* Stats bar */}
          {(() => {
            const { submitted: s, graded: g, missing: m, late: l, avgScore: a } = computeStats(submissions, assignment.dueDate);
            return (
              <div className="stats-grid" style={{ marginBottom: 14 }}>
                {[
                  { label: "Submitted", value: s.length, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", cls: "" },
                  { label: "Graded",    value: g.length, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", cls: "" },
                  { label: "Missing",   value: m.length, color: MAROON,    bg: "#fef2f2", border: "#f0c0c0", cls: "" },
                  { label: "Late",      value: l.length, color: "#dc2626", bg: "#fef2f2", border: "#fecaca", cls: "stat-hide-mobile" },
                  { label: "Avg",       value: a != null ? `${a}/${assignment.points}` : "—", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", cls: "stat-hide-mobile" },
                ].map(stat => (
                  <div key={stat.label} className={stat.cls} style={{ borderRadius: 10, border: `1px solid ${stat.border}`, background: stat.bg, padding: "12px 4px", textAlign: "center" }}>
                    <p style={{ fontSize: "clamp(14px, 2.5vw, 22px)", fontWeight: 900, color: stat.color, margin: 0, lineHeight: 1 }}>{stat.value}</p>
                    <p style={{ fontSize: "clamp(8px, 1.2vw, 11px)", fontWeight: 800, color: stat.color, textTransform: "uppercase", letterSpacing: "0.08em", margin: "4px 0 0" }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Filter + search */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "12px 14px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 150 }}>
                <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
                  style={{ width: "100%", height: 36, paddingLeft: 30, paddingRight: 12, fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 10, outline: "none", fontFamily: FONT, boxSizing: "border-box" }} />
              </div>
              <select value={sort} onChange={e => setSort(e.target.value as SortType)}
                style={{ height: 36, border: "1px solid #e5e7eb", borderRadius: 10, padding: "0 10px", fontSize: 12, background: "#fff", outline: "none", fontFamily: FONT, cursor: "pointer", flexShrink: 0 }}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name</option>
                <option value="grade">Grade</option>
              </select>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
              {(["all", "submitted", "graded", "missing", "late", "excused"] as FilterStatus[]).map(f => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, border: "1px solid", borderRadius: 8, cursor: "pointer", textTransform: "capitalize", whiteSpace: "nowrap",
                    background: filterStatus === f ? MAROON : "#fff",
                    color: filterStatus === f ? "#fff" : "#6b7280",
                    borderColor: filterStatus === f ? MAROON : "#e5e7eb" }}>
                  {f}
                </button>
              ))}
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{filteredSubmissions.length} shown</span>
            </div>
          </div>

          {/* Download bar */}
          {submitted.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <PackageOpen size={15} style={{ color: MAROON }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>Download Submissions</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>{submitted.filter(s => s.fileUrl).length} files · includes grade info</p>
                </div>
              </div>
              <button onClick={handleDownloadAll} disabled={downloading}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", fontSize: 12, fontWeight: 700, border: `1px solid #f0c0c0`, borderRadius: 8, cursor: "pointer", color: MAROON, background: "#fef2f2", whiteSpace: "nowrap", opacity: downloading ? 0.6 : 1 }}>
                {downloading ? "Preparing…" : "Download All (.zip)"}
              </button>
            </div>
          )}

          {/* Submissions list — 2-col on desktop */}
          {filteredSubmissions.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={24} style={{ color: MAROON }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: 0 }}>{search || filterStatus !== "all" ? "No results found" : "No submissions yet"}</p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, textAlign: "center" }}>{search || filterStatus !== "all" ? "Try adjusting your filters" : "Submissions will appear here once submitted"}</p>
              {(search || filterStatus !== "all") && (
                <button onClick={() => { setSearch(""); setFilterStatus("all"); }} style={{ fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear filters</button>
              )}
            </div>
          ) : (
            <div className="submissions-grid">
              {filteredSubmissions.map((sub, i) => {
                const score = sub.points ?? (sub.grade != null ? parseFloat(sub.grade) : null);
                const hasFile = !!(sub.fileUrl || sub.onlineUrl || sub.textEntry);
                const late = sub.status === "LATE" || sub.isLate || isLateCheck(sub.submittedAt, assignment.dueDate);
                return (
                  <div key={`${sub.userId}-${i}`} style={{ background: "#fff", border: `1px solid ${late && sub.submittedAt ? "#fecaca" : "#e5e7eb"}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)", display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid #f3f4f6" }}>
                      <Avatar name={sub.userName ?? sub.userEmail} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "calc(100% - 80px)" }}>{sub.userName ?? sub.userEmail}</span>
                          <StatusBadge sub={sub} dueDate={assignment.dueDate} />
                        </div>
                        <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.userEmail}</p>
                      </div>
                      {score != null && sub.status !== "EXCUSED" ? (
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <span style={{ fontSize: "clamp(16px, 2.5vw, 20px)", fontWeight: 900, color: MAROON }}>{score}</span>
                          <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>/{assignment.points}</span>
                        </div>
                      ) : sub.status === "EXCUSED" ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", flexShrink: 0 }}>Excused</span>
                      ) : sub.submittedAt ? (
                        <span style={{ fontSize: 12, color: "#d1d5db", flexShrink: 0 }}>—/{assignment.points}</span>
                      ) : null}
                    </div>
                    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                      {sub.submittedAt ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <Clock size={10} style={{ color: "#9ca3af", flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: "#6b7280" }}>{fmtDateTime(sub.submittedAt)}</span>
                            {late && <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>· Late</span>}
                          </div>
                          {sub.fileUrl && sub.fileName && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <FileText size={11} style={{ color: MAROON, flexShrink: 0 }} />
                              <button onClick={() => setPreviewTarget(sub)} style={{ fontSize: 11, fontWeight: 600, color: MAROON, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left", maxWidth: "calc(100% - 40px)" }}>{sub.fileName}</button>
                              <a href={sub.fileUrl} download={sub.fileName} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", flexShrink: 0, color: "#9ca3af" }}><Download size={11} /></a>
                            </div>
                          )}
                          {sub.onlineUrl && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <ExternalLink size={11} style={{ flexShrink: 0, color: "#9ca3af" }} />
                              <a href={sub.onlineUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: MAROON, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.onlineUrl}</a>
                            </div>
                          )}
                          {sub.feedback && (
                            <div style={{ borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#374151", lineHeight: 1.6, background: "#fdf8f8", borderLeft: `3px solid ${MAROON}` }}>
                              <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 3, color: MAROON }}>Feedback</span>
                              {sub.feedback}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}><AlertCircle size={11} />No submission received</div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", flexWrap: "wrap", marginTop: "auto" }}>
                      {hasFile && sub.submittedAt && (
                        <button onClick={() => setPreviewTarget(sub)}
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, border: "1px solid #e5e7eb", cursor: "pointer", color: "#6b7280", background: "#fff" }}>
                          <Eye size={10} /> Preview
                        </button>
                      )}
                      <button onClick={() => setGradingTarget(sub)}
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, border: `1px solid #f0c0c0`, cursor: "pointer", color: MAROON, background: "#fef2f2", marginLeft: "auto" }}>
                        <Star size={10} /> {score != null ? "Edit Grade" : "Grade"}
                      </button>
                      {sub.submittedAt && (
                        <button onClick={() => handleSpeedGrader(sub.userId)}
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, border: "1px solid #e5e7eb", cursor: "pointer", color: "#6b7280", background: "#fff" }}>
                          <Zap size={10} /> SpeedGrader
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {submitted.length > 0 && (
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center", paddingBottom: 16 }}>
              <button onClick={() => handleSpeedGrader()} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                <Zap size={13} /> Open SpeedGrader™ for all submissions
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Assign To Side Panel ── */}
      {showAssignPanel && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,.2)" }} onClick={() => setShowAssignPanel(false)} />
          <div style={{ position: "fixed", right: 0, top: 0, height: "100%", width: "min(100vw, 380px)", background: "#fff", borderLeft: "1px solid #e5e7eb", boxShadow: "0 0 32px rgba(0,0,0,.15)", zIndex: 50, display: "flex", flexDirection: "column", fontFamily: FONT }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: MAROON, flexShrink: 0 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,.7)", margin: 0 }}>Assign To</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assignment.title}</p>
              </div>
              <button onClick={() => setShowAssignPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.7)" }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
              {assignRows.map((row, idx) => (
                <div key={row.id} style={{ marginBottom: 16 }}>
                  {idx > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
                      <button onClick={() => removeAssignRow(row.id)} style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                      <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
                    </div>
                  )}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", display: "block", marginBottom: 6 }}>Assign To</label>
                    <div style={{ position: "relative" }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenDrop(null); }}>
                      <div style={{ minHeight: 36, border: `2px solid ${openDrop === row.id ? MAROON : "#e5e7eb"}`, borderRadius: 10, padding: "6px 8px", display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", cursor: "text", background: "#fff" }}
                        onClick={() => setOpenDrop(row.id)}>
                        {row.assignees.map(a => (
                          <span key={a.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: "#fff", background: MAROON }}>
                            {a.label}
                            <button type="button" tabIndex={-1} onClick={e => { e.stopPropagation(); if (a.id === "everyone") return; toggleAssignee(row.id, a); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.7)", fontWeight: 900, lineHeight: 1, fontSize: 14 }}>×</button>
                          </span>
                        ))}
                        <input value={dropSearch[row.id] ?? ""} onChange={e => { setDropSearch(p => ({ ...p, [row.id]: e.target.value })); setOpenDrop(row.id); }}
                          onFocus={() => setOpenDrop(row.id)} placeholder={row.assignees.length ? "" : "Search..."}
                          style={{ flex: 1, minWidth: 80, fontSize: 12, outline: "none", background: "transparent", border: "none", fontFamily: FONT }} />
                        <ChevronDown size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
                      </div>
                      {openDrop === row.id && (
                        <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: 4, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 200, maxHeight: 200, overflowY: "auto" }}>
                          {("everyone".includes((dropSearch[row.id] ?? "").toLowerCase()) || !(dropSearch[row.id] ?? "")) && (
                            <button type="button" onMouseDown={e => { e.preventDefault(); selectEveryone(row.id); setDropSearch(p => ({ ...p, [row.id]: "" })); }}
                              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: "none", border: "none", textAlign: "left", color: row.assignees.some(a => a.id === "everyone") ? MAROON : "#374151" }}>
                              Everyone {row.assignees.some(a => a.id === "everyone") && <Check size={12} style={{ color: MAROON }} />}
                            </button>
                          )}
                          {enrolledUsers.filter(u => u.name.toLowerCase().includes((dropSearch[row.id] ?? "").toLowerCase())).map(u => (
                            <button type="button" key={u.id} onMouseDown={e => { e.preventDefault(); toggleAssignee(row.id, { id: u.id, label: u.name }); setDropSearch(p => ({ ...p, [row.id]: "" })); }}
                              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: "none", border: "none", textAlign: "left", color: row.assignees.some(a => a.id === u.id) ? MAROON : "#374151" }}>
                              <span>{u.name}{u.courseRole && <span style={{ color: "#9ca3af", fontWeight: 400 }}> ({u.courseRole})</span>}</span>
                              {row.assignees.some(a => a.id === u.id) && <Check size={12} style={{ color: MAROON }} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {([ ["Due Date", "dueDate", "dueTime"], ["Available From", "availableFrom", "availableFromTime"], ["Until", "until", "untilTime"] ] as const).map(([label, dateField, timeField]) => (
                    <div key={label} style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", display: "block", marginBottom: 5 }}>{label}</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <input type="date" value={row[dateField]} onChange={e => updateAssignRow(row.id, dateField, e.target.value)}
                          style={{ flex: 1, minWidth: 110, height: 34, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 8px", fontSize: 12, outline: "none" }} />
                        <select value={row[timeField]} onChange={e => updateAssignRow(row.id, timeField, e.target.value)}
                          style={{ height: 34, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 8px", fontSize: 12, background: "#fff", outline: "none", minWidth: 90 }}>
                          {ASSIGN_TIMES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <button onClick={() => updateAssignRow(row.id, dateField, "")} style={{ fontSize: 11, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer" }}>Clear</button>
                      </div>
                      {row[dateField] && <p style={{ fontSize: 10, color: "#9ca3af", margin: "3px 0 0" }}>{fmtLocalCourse(row[dateField], row[timeField])}</p>}
                    </div>
                  ))}
                </div>
              ))}
              <button onClick={addAssignRow} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer" }}>+ Add Row</button>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", flexShrink: 0 }}>
              <button onClick={() => setShowAssignPanel(false)} style={{ flex: 1, height: 40, border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer", background: "#fff" }}>Cancel</button>
              <button onClick={saveAssignTo} disabled={savingAssign} style={{ flex: 1, height: 40, borderRadius: 12, fontSize: 14, fontWeight: 900, color: "#fff", cursor: "pointer", background: MAROON, border: "none", opacity: savingAssign ? 0.6 : 1 }}>
                {savingAssign ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}