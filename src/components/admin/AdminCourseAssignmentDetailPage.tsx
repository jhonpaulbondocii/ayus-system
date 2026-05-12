"use client";

// src/components/admin/AdminCourseAssignmentDetailPage.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, CheckCircle, Circle, Pencil,
  Users, ChevronDown, RefreshCw, Check, X, Trash2, MoreVertical, FileText,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string; title: string; description: string | null;
  points: number; status: "PUBLISHED" | "UNPUBLISHED";
  submissionType: string; onlineEntryOptions: string[];
  allowedAttempts: number | null; submissionAttempts: string;
  dueDate: string | null; availableFrom: string | null; availableUntil: string | null;
  assignmentGroup: string;
  assignees: string[];
}

interface Creator {
  id: string; name: string; email: string;
  courseRole: string | null; createdAt: string;
}

interface Submission {
  id: string | null;
  fileUrl: string | null;
  fileName?: string | null;
  userName: string | null;
  userEmail: string;
  userId: string;
  courseRole?: string | null;
  submittedAt: string | null;
  points?: number | null;
  grade?: number | null;
  status?: string | null;
  textEntry?: string | null;
  onlineUrl?: string | null;
  feedback?: string | null;
  daysLate?: number | null;
  isLate?: boolean;
  isMissing?: boolean;
}

interface EnrolledUser { id: string; name: string; email?: string; courseRole?: string; }

interface AssignRow {
  id: number;
  assignees: { id: string; label: string }[];
  dueDate: string; dueTime: string;
  availableFrom: string; availableFromTime: string;
  until: string; untilTime: string;
}

// ── Rubric Types ───────────────────────────────────────────────────────────────
interface RubricRating {
  id?: string; points: number; name: string; description: string; order: number;
}
interface RubricCriterion {
  id?: string; name: string; description: string; points: number;
  enableRange: boolean; order: number; ratings: RubricRating[];
}
interface Rubric {
  id?: string; title: string; type: string; ratingDisplay: string;
  ratingOrder: string; scoring: string;
  doNotPostToGradebook: boolean; useForGrading: boolean; hideScoreTotal: boolean;
  pointsPossible: number;
  criteria: RubricCriterion[];
}

// ── Time builder ───────────────────────────────────────────────────────────────
function buildAssignTimes() {
  const list: string[] = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 30) {
      const hh = ((h + 11) % 12) + 1;
      list.push(`${hh}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`);
    }
  return list;
}
const ASSIGN_TIMES = buildAssignTimes();

const DEFAULT_RATINGS: RubricRating[] = [
  { points: 4, name: "Exceeds",     description: "", order: 0 },
  { points: 3, name: "Mastery",     description: "", order: 1 },
  { points: 2, name: "Near",        description: "", order: 2 },
  { points: 1, name: "Below",       description: "", order: 3 },
  { points: 0, name: "No Evidence", description: "", order: 4 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtLocalCourse(date: string, time: string) {
  if (!date) return null;
  const d = new Date(`${date} ${time || "11:59 PM"}`);
  if (isNaN(d.getTime())) return null;
  return `Local: ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

function fmtDue(iso: string | null) {
  if (!iso) return "No due date";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function normalizeOpt(opt: string): string {
  const o = opt.toLowerCase().replace(/\s+/g, "_");
  if (o.includes("text")) return "online_text_entry";
  if (o.includes("file")) return "file_upload";
  if (o.includes("url") || o.includes("website")) return "online_url";
  if (o.includes("media")) return "media_recording";
  return o;
}

const OPT_LABELS: Record<string, string> = {
  online_text_entry: "Text Entry", file_upload: "File Upload",
  online_url: "Website URL", media_recording: "Media Recording",
};

function resolveAssigneesLabel(assignees: string[], users: EnrolledUser[]): string {
  if (!assignees || assignees.length === 0) return "Everyone";
  const names = assignees.map(id => users.find(u => u.id === id)?.name ?? id);
  return names.length === 1 ? names[0] : `${names.length} staff`;
}

function getAvailabilityStatus(assignment: Assignment) {
  const now = new Date();
  if (assignment.status !== "PUBLISHED") return { canSubmit: false, statusLabel: "Not Published", statusColor: "#9ca3af" };
  const from = assignment.availableFrom ? new Date(assignment.availableFrom) : null;
  const until = assignment.availableUntil ? new Date(assignment.availableUntil) : null;
  if (from && now < from) return { canSubmit: false, statusLabel: `Available from ${fmtDate(assignment.availableFrom)}`, statusColor: "#f59e0b" };
  if (until && now > until) return { canSubmit: false, statusLabel: "Closed", statusColor: "#ef4444" };
  return { canSubmit: true, statusLabel: "Open for submissions", statusColor: "#22c55e" };
}

function computeStats(submissions: Submission[], assignment: Assignment) {
  const submitted = submissions.filter(s => s.submittedAt != null);
  const missing   = submissions.filter(s => !s.submittedAt);
  const graded = submissions.filter(s => {
    const score = s.points ?? s.grade;
    return score != null && s.status !== "EXCUSED";
  });
  const late = submitted.filter(s => {
    if (s.status === "LATE") return true;
    if (s.isLate) return true;
    if (s.submittedAt && assignment.dueDate)
      return new Date(s.submittedAt) > new Date(assignment.dueDate);
    return false;
  });
  const countable = submissions.filter(s => s.status !== "EXCUSED");
  const avgScore = (() => {
    if (countable.length === 0) return null;
    const sum = countable.reduce((acc, s) => {
      const score = s.points ?? s.grade;
      return acc + (score != null ? score : 0);
    }, 0);
    return Math.round((sum / (countable.length * assignment.points)) * 1000) / 10;
  })();
  return { submitted, missing, graded, late, avgScore };
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROLE BADGE
───────────────────────────────────────────────────────────────────────────── */
function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  const n = role.toUpperCase();
  const map: Record<string, React.CSSProperties> = {
    ADMIN:   { background: "#fef2f2", color: MAROON,   border: "1px solid #fecaca" },
    HEAD:    { background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" },
    STAFF:   { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    TEACHER: { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" },
  };
  const style = map[n] ?? { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" };
  return <span style={{ ...style, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>{n}</span>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteConfirmModal({ title, onConfirm, onCancel, deleting }: {
  title: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-95 border border-gray-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100" style={{ background: "#fef2f2" }}>
          <div className="flex items-center gap-2"><Trash2 size={15} style={{ color: MAROON }} /><span className="text-sm font-black" style={{ color: MAROON }}>Delete Assignment</span></div>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-gray-700 leading-relaxed">Are you sure you want to delete <span className="font-bold">&ldquo;{title}&rdquo;</span>? This action cannot be undone.</p>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onCancel} disabled={deleting} className="h-9 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="h-9 px-4 rounded-xl text-sm font-black text-white disabled:opacity-60" style={{ background: MAROON }}>{deleting ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GRADE MODAL
───────────────────────────────────────────────────────────────────────────── */
function GradeModal({ submission, assignment, courseId, assignmentId, onClose, onSaved }: {
  submission: Submission; assignment: Assignment;
  courseId: string; assignmentId: string;
  onClose: () => void;
  onSaved: (userId: string, points: number | null, feedback: string, status: string) => void;
}) {
  const existing = submission.points ?? submission.grade;
  const [score, setScore] = useState<string>(existing != null ? String(existing) : "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [status, setStatus] = useState(submission.status ?? "SUBMITTED");
  const [saving, setSaving] = useState(false);
  const maxPts = assignment.points;

  const pct = score !== "" && !isNaN(parseFloat(score))
    ? Math.round((parseFloat(score) / maxPts) * 100) : null;

  const getGradeColor = (p: number) => {
    const ratio = p / maxPts;
    if (ratio >= 0.9) return "#16a34a";
    if (ratio >= 0.75) return "#65a30d";
    if (ratio >= 0.6) return "#d97706";
    return "#dc2626";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const gradeValue = score !== "" ? parseFloat(score) : null;
      if (submission.id) {
        const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/submissions/${submission.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade: gradeValue, feedback, status }),
        });
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text) as { submission?: { grade: number | null; status: string; feedback: string | null } };
          const saved = data.submission;
          if (saved) {
            onSaved(submission.userId, saved.grade, saved.feedback ?? feedback, saved.status);
            setSaving(false);
            onClose();
            return;
          }
        }
      }
      onSaved(submission.userId, gradeValue, feedback, status);
    } catch { /* silent */ }
    setSaving(false);
    onClose();
  };

  const initials = (submission.userName ?? submission.userEmail).split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-105 overflow-hidden" onClick={e => e.stopPropagation()} style={{ fontFamily: FONT }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: MAROON }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0" style={{ background: "rgba(255,255,255,.2)" }}>{initials}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Grading</p>
            <p className="text-sm font-black text-white truncate">{submission.userName ?? submission.userEmail}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={16} /></button>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-600">{assignment.title}</p>
          <p className="text-xs font-black" style={{ color: MAROON }}>Max: {maxPts} pts</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {submission.submittedAt && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <p className="text-xs text-gray-500">Submitted: {fmtDateTime(submission.submittedAt)}</p>
              {(submission.isLate || submission.status === "LATE") && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>Late</span>
              )}
            </div>
          )}
          {submission.isMissing && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: "#fef2f2", borderColor: "#f0c0c0" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-xs font-semibold" style={{ color: MAROON }}>No submission received</p>
            </div>
          )}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Score</label>
            <div className="flex items-center gap-3">
              <input type="number" min={0} max={maxPts} value={score} onChange={e => setScore(e.target.value)}
                placeholder="—"
                className="flex-1 h-11 text-center text-lg font-black border-2 rounded-xl outline-none transition-colors"
                style={{ borderColor: score !== "" ? MAROON : "#e5e7eb", color: MAROON }} />
              <span className="text-sm font-bold text-gray-400">/ {maxPts}</span>
              {pct !== null && (
                <span className="text-sm font-black shrink-0" style={{ color: getGradeColor(parseFloat(score)) }}>{pct}%</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[100, 90, 80, 70, 60, 0].map(p => {
                const val = Math.round((p / 100) * maxPts);
                const isActive = parseFloat(score) === val;
                return (
                  <button key={p} type="button" onClick={() => setScore(String(val))}
                    className="px-2.5 py-1 text-[11px] font-bold border rounded-lg transition-all"
                    style={isActive ? { background: MAROON, color: "#fff", borderColor: MAROON } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
                    {p}% ({val})
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full h-9 border border-gray-200 rounded-xl px-3 text-xs bg-white outline-none focus:border-gray-400 text-gray-700">
              <option value="SUBMITTED">Submitted</option>
              <option value="GRADED">Graded</option>
              <option value="LATE">Late</option>
              <option value="MISSING">Missing</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Feedback <span className="font-normal normal-case">(Optional)</span></label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} placeholder="Write feedback for this student..."
              className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-gray-400 resize-none bg-white" />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: MAROON }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            {saving ? "Saving..." : "Save Grade"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PREVIEW MODAL
───────────────────────────────────────────────────────────────────────────── */
function PreviewModal({ submission, onClose }: { submission: Submission; onClose: () => void }) {
  const url = submission.fileUrl ?? submission.onlineUrl ?? null;
  const fileName = submission.fileName ?? "File";
  const isImg = url ? /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url) : false;

  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-180 max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: MAROON }}>
          <div className="flex items-center gap-2"><FileText size={14} className="text-white/80" /><p className="text-sm font-black text-white truncate max-w-75">{fileName}</p></div>
          <div className="flex items-center gap-2">
            {url && <><a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white/80 hover:text-white border border-white/20 rounded-lg">Open</a>
              <a href={url} download={fileName} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white/80 hover:text-white border border-white/20 rounded-lg">Download</a></>}
            <button onClick={onClose} className="text-white/60 hover:text-white ml-1"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-gray-100 min-h-100">
          {!url ? (
            <div className="h-full overflow-y-auto px-8 py-6">{submission.textEntry
              ? <div className="prose prose-sm max-w-none text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: submission.textEntry }} />
              : <p className="text-sm text-gray-400 italic">No content to preview.</p>}
            </div>
          ) : isImg ? (
            <div className="h-full flex items-center justify-center p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
            </div>
          ) : (
            <iframe src={url} title={fileName} className="w-full h-full border-0" style={{ minHeight: 460 }} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATS BAR
───────────────────────────────────────────────────────────────────────────── */
function StatsBar({ submissions, assignment }: { submissions: Submission[]; assignment: Assignment }) {
  const { submitted, missing, graded, late, avgScore } = computeStats(submissions, assignment);
  const stats = [
    { label: "Submitted", value: submitted.length, bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
    { label: "Graded",    value: graded.length,    bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
    { label: "Missing",   value: missing.length,   bg: "#fef2f2", border: "#f0c0c0", color: MAROON    },
    { label: "Late",      value: late.length,      bg: "#fef2f2", border: "#fecaca", color: "#dc2626" },
    { label: "Avg Score", value: avgScore != null ? `${avgScore}%` : "—", bg: "#f9fafb", border: "#e5e7eb", color: "#6b7280" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
      {stats.map(s => (
        <div key={s.label} className="rounded-xl border px-4 py-3 text-center" style={{ background: s.bg, borderColor: s.border }}>
          <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
          <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: s.color }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────────────────────────────────────── */
function StatusBadge({ sub, dueDate }: { sub: Submission; dueDate: string | null }) {
  const isExcused = sub.status === "EXCUSED";
  const isLate = sub.status === "LATE" || sub.isLate ||
    (sub.submittedAt && dueDate && new Date(sub.submittedAt) > new Date(dueDate));
  const isGraded = (sub.points ?? sub.grade) != null && !isExcused && !isLate;

  if (!sub.submittedAt)
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" }}>Missing</span>;
  if (isExcused)
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}>Excused</span>;
  if (isGraded)
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}><Check size={9} /> Graded</span>;
  if (isLate)
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>Late</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}><Check size={9} /> Submitted</span>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CRITERION MODAL
───────────────────────────────────────────────────────────────────────────── */
function CriterionModal({ initial, onSave, onClose }: {
  initial?: RubricCriterion;
  onSave: (c: RubricCriterion) => void;
  onClose: () => void;
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

  const addRating = () =>
    setRatings(p => [...p, { points: 0, name: "", description: "", order: p.length }]);

  const removeRating = (i: number) =>
    setRatings(p => p.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!name.trim()) { alert("Criterion name is required."); return; }
    const sorted = [...ratings]
      .sort((a, b) => b.points - a.points)
      .map((r, i) => ({ ...r, order: i }));
    onSave({
      id: initial?.id,
      name: name.trim(),
      description: desc,
      points: maxPts,
      enableRange,
      order: initial?.order ?? 0,
      ratings: sorted,
    });
  };

  const sortedForDisplay = [...ratings].sort((a, b) => b.points - a.points);

  return (
    <div className="fixed inset-0 z-400 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-170 max-h-[90vh] flex flex-col overflow-hidden"
        style={{ fontFamily: FONT }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-black text-gray-900">
            {initial ? "Edit Criterion" : "Create New Criterion"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Criterion Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter the name"
                className="w-full h-10 border-2 border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-gray-400" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Criterion Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Enter the description" rows={2}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 resize-none" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={enableRange} onChange={e => setEnableRange(e.target.checked)}
                className="w-4 h-4 accent-[#7b1113]" />
              Enable Range
            </label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black" style={{ color: MAROON }}>{maxPts}</span>
              <span className="text-sm font-semibold text-gray-500">Points Possible</span>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-[48px_80px_1fr_1fr_32px] gap-2 mb-2 px-1">
              {["Display", "Points", "Rating Name", "Rating Description", ""].map(h => (
                <p key={h} className="text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</p>
              ))}
            </div>
            <div className="space-y-2">
              {sortedForDisplay.map((r, i) => {
                const realIdx = ratings.indexOf(r);
                return (
                  <div key={i} className="grid grid-cols-[48px_80px_1fr_1fr_32px] gap-2 items-center">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg text-white text-sm font-black shrink-0"
                      style={{ background: MAROON }}>{r.points}</div>
                    <input type="text" inputMode="numeric"
                      value={r.points === 0 ? "" : String(r.points)}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9.]/g, "");
                        updateRating(realIdx, "points", val === "" ? 0 : parseFloat(val) || 0);
                      }}
                      onFocus={e => e.target.select()}
                      placeholder="0"
                      className="h-9 border border-gray-200 rounded-lg px-2 text-sm text-center outline-none focus:border-gray-400" />
                    <input value={r.name} onChange={e => updateRating(realIdx, "name", e.target.value)}
                      placeholder="Rating Name"
                      className="h-9 border border-gray-200 rounded-lg px-3 text-sm outline-none focus:border-gray-400" />
                    <input value={r.description} onChange={e => updateRating(realIdx, "description", e.target.value)}
                      placeholder="Description (optional)"
                      className="h-9 border border-gray-200 rounded-lg px-3 text-sm outline-none focus:border-gray-400" />
                    <button onClick={() => removeRating(realIdx)}
                      className="text-gray-300 hover:text-red-400 flex items-center justify-center">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button onClick={addRating}
              className="mt-3 flex items-center gap-1.5 text-xs font-bold hover:underline"
              style={{ color: MAROON }}>
              + Add Rating
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={handleSave}
            className="flex-1 h-10 rounded-xl text-sm font-black text-white"
            style={{ background: MAROON }}>
            Save Criterion
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RUBRIC SECTION
───────────────────────────────────────────────────────────────────────────── */
function RubricSection({ courseId, assignmentId }: { courseId: string; assignmentId: string }) {
  const [rubric, setRubric]       = useState<Rubric | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const [form, setForm] = useState<Omit<Rubric, "pointsPossible" | "criteria">>({
    title: "", type: "scale", ratingDisplay: "level",
    ratingOrder: "high_low", scoring: "scored",
    doNotPostToGradebook: false, useForGrading: false, hideScoreTotal: false,
  });
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [criterionModal, setCriterionModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });

  useEffect(() => {
    fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/rubric`)
      .then(r => r.json())
      .then(d => { setRubric(d.rubric ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [courseId, assignmentId]);

  const openCreate = () => {
    if (rubric) {
      setForm({
        title: rubric.title, type: rubric.type, ratingDisplay: rubric.ratingDisplay,
        ratingOrder: rubric.ratingOrder, scoring: rubric.scoring,
        doNotPostToGradebook: rubric.doNotPostToGradebook,
        useForGrading: rubric.useForGrading, hideScoreTotal: rubric.hideScoreTotal,
      });
      setCriteria(rubric.criteria.map(c => ({ ...c, ratings: [...c.ratings] })));
    } else {
      setForm({
        title: "", type: "scale", ratingDisplay: "level", ratingOrder: "high_low",
        scoring: "scored", doNotPostToGradebook: false, useForGrading: false, hideScoreTotal: false,
      });
      setCriteria([]);
    }
    setShowModal(true);
  };

  const handleSaveCriterion = (c: RubricCriterion) => {
    if (criterionModal.index !== null) {
      setCriteria(p => p.map((item, i) => i === criterionModal.index ? { ...c, order: i } : item));
    } else {
      setCriteria(p => [...p, { ...c, order: p.length }]);
    }
    setCriterionModal({ open: false, index: null });
  };

  const handleSaveRubric = async () => {
    if (!form.title.trim()) { alert("Rubric name is required."); return; }
    if (criteria.length === 0) { alert("Add at least one criterion."); return; }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/assignments/${assignmentId}/rubric`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, criteria }) }
      );
      const d = await res.json() as { rubric: Rubric };
      setRubric(d.rubric);
      setShowModal(false);
    } catch { alert("Failed to save rubric."); }
    setSaving(false);
  };

  const handleDeleteRubric = async () => {
    if (!confirm("Delete this rubric? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/rubric`, { method: "DELETE" });
      setRubric(null);
    } catch { alert("Failed to delete rubric."); }
    setDeleting(false);
  };

  const totalPts = criteria.reduce((s, c) => s + c.points, 0);

  if (loading) return null;

  return (
    <div className="mt-6">
      {rubric ? (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100"
            style={{ background: "#fdf2f2" }}>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="3" y1="15" x2="21" y2="15"/>
                <line x1="9" y1="9" x2="9" y2="21"/>
              </svg>
              <p className="text-xs font-black" style={{ color: MAROON }}>Rubric</p>
              <span className="text-xs text-gray-500">— {rubric.title}</span>
              {rubric.useForGrading && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                  Used for grading
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black" style={{ color: MAROON }}>{rubric.pointsPossible} pts</span>
              <button onClick={openCreate} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>Edit</button>
              <button onClick={handleDeleteRubric} disabled={deleting}
                className="text-xs font-bold text-red-400 hover:text-red-600 hover:underline disabled:opacity-50">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-125">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 font-black uppercase tracking-widest text-gray-400 text-[10px] w-40">Criteria</th>
                  {(rubric.criteria[0]?.ratings ?? [])
                    .slice()
                    .sort((a, b) => rubric.ratingOrder === "high_low" ? b.points - a.points : a.points - b.points)
                    .map((r, i) => (
                      <th key={i} className="text-center px-3 py-2 font-black uppercase tracking-widest text-gray-400 text-[10px]">
                        {r.name}
                        {rubric.ratingDisplay === "points" && (
                          <span className="block font-black text-xs" style={{ color: MAROON }}>{r.points} pts</span>
                        )}
                      </th>
                    ))}
                  <th className="text-center px-3 py-2 font-black uppercase tracking-widest text-gray-400 text-[10px]">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rubric.criteria.map((c, ci) => {
                  const sorted = c.ratings.slice().sort((a, b) =>
                    rubric.ratingOrder === "high_low" ? b.points - a.points : a.points - b.points
                  );
                  return (
                    <tr key={ci} className={ci % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-4 py-3 font-bold text-gray-800 text-xs align-top">
                        {c.name}
                        {c.description && (
                          <p className="text-[10px] text-gray-400 font-normal mt-0.5 leading-relaxed">{c.description}</p>
                        )}
                      </td>
                      {sorted.map((r, ri) => (
                        <td key={ri} className="px-3 py-3 text-center align-top border-l border-gray-100">
                          <span className="text-[11px] font-semibold text-gray-600">{r.name}</span>
                          {r.description && (
                            <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{r.description}</p>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-black text-sm border-l border-gray-100"
                        style={{ color: MAROON }}>{c.points}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={99} className="px-4 py-2 text-right text-xs font-black" style={{ color: MAROON }}>
                    Total: {rubric.pointsPossible} pts
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-xs font-black border-2 rounded-xl hover:bg-red-50 transition-all"
            style={{ color: MAROON, borderColor: MAROON }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Rubric
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-180 max-h-[92vh] flex flex-col overflow-hidden"
            style={{ fontFamily: FONT }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-black text-gray-900">{rubric ? "Edit Rubric" : "Create Rubric"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Rubric Name *</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Rubric name"
                    className="w-full h-9 border-2 border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-gray-400" />
                </div>
                {([
                  { label: "Type",           key: "type",          opts: [["scale","Scale"],["written_feedback","Written Feedback"]] },
                  { label: "Rating Display", key: "ratingDisplay", opts: [["level","Level"],["points","Points"]] },
                  { label: "Rating Order",   key: "ratingOrder",   opts: [["high_low","High < Low"],["low_high","Low < High"]] },
                  { label: "Scoring",        key: "scoring",       opts: [["scored","Scored"],["unscored","Unscored"]] },
                ] as { label: string; key: keyof typeof form; opts: [string, string][] }[]).map(({ label, key, opts }) => (
                  <div key={key}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">{label}</label>
                    <select value={form[key] as string}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full h-9 border border-gray-200 rounded-xl px-2 text-xs bg-white outline-none focus:border-gray-400">
                      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-5">
                {([
                  ["doNotPostToGradebook", "Don't post to Learning Mastery Gradebook"],
                  ["useForGrading",        "Use this rubric for assignment grading"],
                  ["hideScoreTotal",       "Hide rubric score total from students"],
                ] as [keyof typeof form, string][]).map(([key, lbl]) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                    <input type="checkbox" checked={form[key] as boolean}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))}
                      className="w-4 h-4 accent-[#7b1113]" />
                    {lbl}
                  </label>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-black text-gray-800">Criteria Builder</p>
                  <p className="text-sm font-black" style={{ color: MAROON }}>{totalPts} Points Possible</p>
                </div>
                {criteria.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No criteria yet. Draft one below.</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {criteria.map((c, i) => (
                      <div key={i}
                        className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 hover:border-gray-300 transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800">{c.name}</p>
                          {c.description && <p className="text-[11px] text-gray-400 truncate">{c.description}</p>}
                          <p className="text-[10px] text-gray-400 mt-0.5">{c.ratings.length} rating{c.ratings.length !== 1 ? "s" : ""} · {c.points} pts</p>
                        </div>
                        <button onClick={() => setCriterionModal({ open: true, index: i })}
                          className="text-xs font-bold hover:underline shrink-0" style={{ color: MAROON }}>Edit</button>
                        <button onClick={() => setCriteria(p => p.filter((_, idx) => idx !== i))}
                          className="text-gray-300 hover:text-red-400 shrink-0"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-gray-400">{criteria.length + 1}.</span>
                  <button onClick={() => setCriterionModal({ open: true, index: null })}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-black border-2 rounded-xl hover:bg-red-50 transition-all"
                    style={{ color: MAROON, borderColor: MAROON }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Draft New Criterion
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowModal(false)}
                className="h-10 px-5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{criteria.length} criteri{criteria.length !== 1 ? "a" : "on"} · {totalPts} pts</span>
                <button onClick={handleSaveRubric} disabled={saving}
                  className="h-10 px-6 rounded-xl text-sm font-black text-white disabled:opacity-60"
                  style={{ background: MAROON }}>
                  {saving ? "Saving…" : rubric ? "Update Rubric" : "Create Rubric"}
                </button>
              </div>
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

/* ─────────────────────────────────────────────────────────────────────────────
   SUBMISSIONS TAB CONTENT
───────────────────────────────────────────────────────────────────────────── */
function SubmissionsTabContent({ submissions: initialSubs, assignment, courseId, assignmentId, onRefresh }: {
  submissions: Submission[]; assignment: Assignment;
  courseId: string; assignmentId: string;
  onRefresh: () => Promise<void>;
}) {
  const [submissions, setSubmissions]     = useState<Submission[]>(initialSubs);
  const [search, setSearch]               = useState("");
  const [filter, setFilter]               = useState<"all"|"submitted"|"graded"|"missing"|"late"|"excused">("all");
  const [sort, setSort]                   = useState<"newest"|"oldest"|"name"|"grade">("newest");
  const [downloading, setDownloading]     = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [gradeTarget, setGradeTarget]     = useState<Submission | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Submission | null>(null);
  const [justUpdated, setJustUpdated]     = useState(false);

  useEffect(() => {
    setSubmissions(initialSubs);
  }, [initialSubs]);

  const { submitted } = computeStats(submissions, assignment);

  const filtered = submissions
    .filter(s => {
      const q = search.trim().toLowerCase();
      if (q && !(s.userName ?? "").toLowerCase().includes(q) && !s.userEmail.toLowerCase().includes(q)) return false;
      const isLate = s.isLate || s.status === "LATE" ||
        (s.submittedAt && assignment.dueDate && new Date(s.submittedAt) > new Date(assignment.dueDate));
      if (filter === "submitted") return !!s.submittedAt;
      if (filter === "graded")    return (s.points ?? s.grade) != null && s.status !== "EXCUSED";
      if (filter === "missing")   return !s.submittedAt;
      if (filter === "late")      return !!isLate;
      if (filter === "excused")   return s.status === "EXCUSED";
      return true;
    })
    .sort((a, b) => {
      if (sort === "name")  return (a.userName ?? a.userEmail).localeCompare(b.userName ?? b.userEmail);
      if (sort === "grade") return ((b.points ?? b.grade) ?? -1) - ((a.points ?? a.grade) ?? -1);
      if (sort === "oldest") {
        if (!a.submittedAt) return 1; if (!b.submittedAt) return -1;
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      }
      if (!a.submittedAt) return 1; if (!b.submittedAt) return -1;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

  const handleGradeSaved = (userId: string, points: number | null, feedback: string, status: string) => {
    setSubmissions(prev => prev.map(s =>
      s.userId === userId ? { ...s, points, grade: points, feedback, status } : s
    ));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 3000);
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      if (!(window as unknown as Record<string, unknown>).JSZip) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
          s.onload = () => resolve(); s.onerror = () => reject(new Error("JSZip load failed"));
          document.head.appendChild(s);
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const JSZip = (window as any).JSZip;
      const zip = new JSZip();
      for (const s of submitted) {
        if (!s.fileUrl) continue;
        const safeName = (s.userName ?? s.userEmail).replace(/[^a-zA-Z0-9_\- ]/g, "_");
        const ext = s.fileUrl.split("?")[0].split(".").pop() ?? "bin";
        try {
          const res = await fetch(s.fileUrl);
          const blob = await res.blob();
          zip.file(`${safeName}/${safeName}.${ext}`, blob);
          zip.file(`${safeName}/grade_info.txt`, [
            `Student: ${s.userName ?? s.userEmail}`,
            `Email: ${s.userEmail}`,
            `Submitted: ${s.submittedAt ? fmtDateTime(s.submittedAt) : "—"}`,
            `Score: ${(s.points ?? s.grade) != null ? `${s.points ?? s.grade}/${assignment.points}` : "Not graded"}`,
            `Status: ${s.status ?? "—"}`,
            `Feedback: ${s.feedback ?? "—"}`,
          ].join("\n"));
        } catch { /* skip */ }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${assignment.title.replace(/[^a-zA-Z0-9_\- ]/g, "_")}_submissions.zip`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert("Failed to download."); }
    setDownloading(false);
  };

  const openSpeedGrader = (userId?: string) => {
    const base = `/admin/courses/${courseId}/assignments/${assignmentId}/speedgrader`;
    window.open(userId ? `${base}?student=${userId}` : base, "_blank");
  };

  return (
    <div className="space-y-4">
      {gradeTarget && (
        <GradeModal submission={gradeTarget} assignment={assignment}
          courseId={courseId} assignmentId={assignmentId}
          onClose={() => setGradeTarget(null)} onSaved={handleGradeSaved} />
      )}
      {previewTarget && <PreviewModal submission={previewTarget} onClose={() => setPreviewTarget(null)} />}

      {/* Action bar */}
      <div className="flex items-center justify-end gap-2">
        {justUpdated && (
          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg"
            style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
            <Check size={11} /> Updated
          </span>
        )}
        <button onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
        <button onClick={() => openSpeedGrader()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white rounded-lg hover:opacity-90"
          style={{ background: MAROON }}>
          <Zap size={12} /> SpeedGrader™
        </button>
      </div>

      <StatsBar submissions={submissions} assignment={assignment} />

      {/* Filter + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
            className="w-full h-9 pl-8 pr-3 text-xs border border-gray-200 rounded-xl outline-none focus:border-gray-400 bg-white" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {(["all","submitted","graded","missing","late","excused"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all capitalize"
              style={filter === f
                ? { background: MAROON, color: "#fff", borderColor: MAROON }
                : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
            className="h-9 px-2 text-xs border border-gray-200 rounded-xl bg-white outline-none text-gray-600">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="grade">Grade (high)</option>
          </select>
          <span className="text-xs text-gray-400 font-semibold whitespace-nowrap">{filtered.length} shown</span>
        </div>
      </div>

      {submitted.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
              <FileText size={13} style={{ color: MAROON }} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">Download Submissions</p>
              <p className="text-[10px] text-gray-400">{submitted.length} file{submitted.length !== 1 ? "s" : ""} · Includes grade info + status</p>
            </div>
          </div>
          <button onClick={handleDownloadAll} disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
            style={{ color: MAROON, borderColor: "#f0c0c0" }}>
            {downloading ? "Preparing…" : "Download All (.zip)"}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FileText size={32} className="mb-3 opacity-30" />
          <p className="text-sm font-semibold">No submissions found</p>
          <p className="text-xs mt-1">{search ? "Try a different search." : "Submissions will appear here once students submit."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => {
            const score   = s.points ?? s.grade;
            const hasFile = !!(s.fileUrl || s.onlineUrl || s.textEntry);
            const initials = (s.userName ?? s.userEmail).split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={`${s.userId}-${i}`}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-all">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                    style={{ background: "#0e7490" }}>{initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-800">{s.userName ?? s.userEmail}</p>
                      <StatusBadge sub={s} dueDate={assignment.dueDate} />
                    </div>
                    <p className="text-xs text-gray-400 truncate">{s.userEmail}</p>
                  </div>
                  {score != null && s.status !== "EXCUSED" ? (
                    <div className="text-right shrink-0">
                      <span className="text-lg font-black" style={{ color: MAROON }}>{score}</span>
                      <span className="text-sm text-gray-400 font-semibold">/{assignment.points}</span>
                    </div>
                  ) : s.status === "EXCUSED" ? (
                    <span className="text-xs font-bold text-gray-400 shrink-0">Excused</span>
                  ) : s.submittedAt ? (
                    <div className="text-right shrink-0">
                      <span className="text-sm text-gray-400">—/{assignment.points}</span>
                    </div>
                  ) : null}
                </div>

                {s.submittedAt && (
                  <div className="px-4 pb-2 flex items-center gap-2">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                    </svg>
                    <p className="text-[11px] text-gray-400">{fmtDateTime(s.submittedAt)}</p>
                    {s.daysLate && s.daysLate > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                        {s.daysLate}d late
                      </span>
                    )}
                  </div>
                )}

                {s.feedback && (
                  <div className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs text-gray-600 leading-relaxed"
                    style={{ background: "#fdf8f8", borderLeft: `3px solid ${MAROON}` }}>
                    <span className="text-[10px] font-black uppercase tracking-wide block mb-0.5" style={{ color: MAROON }}>Feedback</span>
                    {s.feedback}
                  </div>
                )}

                <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                  {hasFile && s.submittedAt && (
                    <button onClick={() => setPreviewTarget(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                      </svg>
                      Preview
                    </button>
                  )}
                  <button onClick={() => setGradeTarget(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-red-50 ml-auto"
                    style={{ color: MAROON, borderColor: "#f0c0c0" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    {score != null ? "Edit Grade" : "Grade"}
                  </button>
                  {s.submittedAt && (
                    <button onClick={() => openSpeedGrader(s.userId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                      <Zap size={11} /> SpeedGrader
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {submitted.length > 0 && (
        <div className="flex justify-center pt-2 pb-4">
          <button onClick={() => openSpeedGrader()}
            className="flex items-center gap-2 text-xs font-bold hover:underline" style={{ color: MAROON }}>
            <Zap size={13} /> Open SpeedGrader™ for all submissions
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function AdminCourseAssignmentDetailPage({
  courseId, assignmentId,
}: { courseId: string; assignmentId: string }) {
  const router = useRouter();
  const [assignment, setAssignment]       = useState<Assignment | null>(null);
  const [creator, setCreator]             = useState<Creator | null>(null);
  const [loading, setLoading]             = useState(true);
  const [publishing, setPublishing]       = useState(false);
  const [submissions, setSubmissions]     = useState<Submission[]>([]);
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  const [activeTab, setActiveTab]         = useState<"overview" | "submissions">("overview");
  const [showDotMenu, setShowDotMenu]     = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [assignRows, setAssignRows]       = useState<AssignRow[]>([]);
  const [savingAssign, setSavingAssign]   = useState(false);
  const [dropSearch, setDropSearch]       = useState<Record<number, string>>({});
  const [openDrop, setOpenDrop]           = useState<number | null>(null);
  const [showSidebar, setShowSidebar]     = useState(false);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/submissions`);
      const d = await res.json() as { submissions?: Submission[] };
      if (d.submissions) setSubmissions(d.submissions);
    } catch { /* silent */ }
  }, [courseId, assignmentId]);

  useEffect(() => {
    const handleFocus = () => { fetchSubmissions(); };
    const handleVisibility = () => { if (document.visibilityState === "visible") fetchSubmissions(); };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchSubmissions]);


  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`);
        const d = await res.json();
        setAssignment(d.assignment ?? null);
        setCreator(d.creator ?? null);
        setLoading(false);
      } catch {
        setLoading(false);
      }

      await fetchSubmissions();

      try {
        const res = await fetch(`/api/admin/courses/${courseId}/sections`);
        const d = await res.json();
        const raw = d.staff ?? d.users ?? d.members ?? [];
        setEnrolledUsers(raw.map((u: { id: string; name?: string; userName?: string; email?: string; courseRole?: string }) => ({
          id: u.id, name: u.name ?? u.userName ?? u.email ?? u.id, courseRole: u.courseRole ?? "Staff",
        })));
      } catch {}
    };

    void init();
  }, [courseId, assignmentId, fetchSubmissions]);

  const togglePublish = async () => {
    if (!assignment) return;
    setPublishing(true);
    const newStatus = assignment.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json() as { assignment?: Assignment };
    if (data.assignment) setAssignment(prev => prev ? { ...prev, status: newStatus } : null);
    setPublishing(false);
  };

  const handleDelete = async () => {
    if (!assignment) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`, { method: "DELETE" });
      if (res.ok) { router.push(`/admin/courses/${courseId}/assignments`); }
      else { alert("Failed to delete assignment."); setDeleting(false); setShowDeleteModal(false); }
    } catch { alert("Network error."); setDeleting(false); setShowDeleteModal(false); }
  };

  const openAssignPanel = () => {
    if (!assignment) return;
    setAssignRows([{
      id: 1,
      assignees: assignment.assignees?.length
        ? assignment.assignees.map(id => { const u = enrolledUsers.find(u => u.id === id); return { id, label: u?.name ?? id }; })
        : [{ id: "everyone", label: "Everyone" }],
      dueDate:           assignment.dueDate        ? new Date(assignment.dueDate).toISOString().split("T")[0]        : "",
      dueTime:           assignment.dueDate        ? new Date(assignment.dueDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "11:59 PM",
      availableFrom:     assignment.availableFrom  ? new Date(assignment.availableFrom).toISOString().split("T")[0]  : "",
      availableFromTime: assignment.availableFrom  ? new Date(assignment.availableFrom).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "12:00 AM",
      until:             assignment.availableUntil ? new Date(assignment.availableUntil).toISOString().split("T")[0] : "",
      untilTime:         assignment.availableUntil ? new Date(assignment.availableUntil).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "11:59 PM",
    }]);
    setDropSearch({}); setOpenDrop(null); setShowAssignPanel(true);
  };

  const updateAssignRow  = (id: number, field: keyof AssignRow, value: string) =>
    setAssignRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const toggleAssignee = (rowId: number, user: { id: string; label: string }) =>
    setAssignRows(p => p.map(r => {
      if (r.id !== rowId) return r;
      const has  = r.assignees.find(a => a.id === user.id);
      const noEv = r.assignees.filter(a => a.id !== "everyone");
      const next = has ? noEv.filter(a => a.id !== user.id) : [...noEv, user];
      return { ...r, assignees: next.length ? next : [{ id: "everyone", label: "Everyone" }] };
    }));

  const selectEveryone = (rowId: number) =>
    setAssignRows(p => p.map(r => r.id === rowId ? { ...r, assignees: [{ id: "everyone", label: "Everyone" }] } : r));

  const addAssignRow    = () => setAssignRows(p => [...p, { id: Date.now(), assignees: [], dueDate: "", dueTime: "11:59 PM", availableFrom: "", availableFromTime: "12:00 AM", until: "", untilTime: "11:59 PM" }]);
  const removeAssignRow = (id: number) => setAssignRows(p => p.filter(r => r.id !== id));

  const saveAssignTo = async () => {
    if (!assignment) return;
    setSavingAssign(true);
    const allEv = assignRows.every(r => r.assignees.length === 0 || r.assignees.some(a => a.id === "everyone"));
    const ids   = allEv ? [] : assignRows.flatMap(r => r.assignees.filter(a => a.id !== "everyone").map(a => a.id));
    const row   = assignRows[0];
    const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignees: ids,
        dueDate: row.dueDate || null, dueTime: row.dueTime || null,
        availableFrom: row.availableFrom || null, availableFromTime: row.availableFromTime || null,
        availableUntil: row.until || null, untilTime: row.untilTime || null,
      }),
    });
    const data = await res.json() as { assignment?: Assignment };
    if (data.assignment)
      setAssignment(prev => prev ? {
        ...prev, assignees: ids,
        dueDate:        data.assignment!.dueDate        ?? prev.dueDate,
        availableFrom:  data.assignment!.availableFrom  ?? prev.availableFrom,
        availableUntil: data.assignment!.availableUntil ?? prev.availableUntil,
      } : null);
    setSavingAssign(false);
    setShowAssignPanel(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400" style={{ fontFamily: FONT }}>
      <RefreshCw size={16} className="animate-spin" /> Loading…
    </div>
  );
  if (!assignment) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ fontFamily: FONT }}>
      <p className="text-sm text-gray-500">Assignment not found.</p>
      <button onClick={() => router.back()} className="text-sm font-bold hover:underline" style={{ color: MAROON }}>← Go back</button>
    </div>
  );

  const isPublished     = assignment.status === "PUBLISHED";
  const opts            = (assignment.onlineEntryOptions ?? []).map(normalizeOpt);
  const submittingLabel = opts.length > 0 ? opts.map(o => OPT_LABELS[o] ?? o).join(", ") : assignment.submissionType.toLowerCase();
  const forLabel        = resolveAssigneesLabel(assignment.assignees ?? [], enrolledUsers);
  const availability    = getAvailabilityStatus(assignment);
  const { submitted }   = computeStats(submissions, assignment);

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>
      {showDeleteModal && (
        <DeleteConfirmModal title={assignment.title} onConfirm={handleDelete}
          onCancel={() => { setShowDeleteModal(false); setShowDotMenu(false); }} deleting={deleting} />
      )}

      {!isPublished && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
            <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
          </svg>
          <p className="text-xs text-amber-800 font-medium">This assignment is <strong>unpublished</strong>.</p>
        </div>
      )}

      {/* Tab bar + actions */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 sm:px-6 bg-white shrink-0 overflow-x-auto">
        <div className="flex items-end">
          <button onClick={() => setActiveTab("overview")}
            className={`px-3 sm:px-4 py-2 text-xs border border-b-0 -mb-px mr-0.5 transition-colors rounded-t whitespace-nowrap ${activeTab === "overview" ? "bg-white border-gray-200 text-gray-900 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Overview
          </button>
          <button onClick={() => setActiveTab("submissions")}
            className={`px-3 sm:px-4 py-2 text-xs border border-b-0 -mb-px mr-0.5 transition-colors rounded-t whitespace-nowrap flex items-center gap-1 ${activeTab === "submissions" ? "bg-white border-gray-200 text-gray-900 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Submissions
            {submitted.length > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] text-white"
                style={{ background: MAROON }}>{submitted.length}</span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 py-1.5">
          <button onClick={togglePublish} disabled={publishing}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-60"
            style={isPublished
              ? { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }
              : { background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb" }}>
            {isPublished ? <CheckCircle size={13} style={{ color: "#15803d" }} /> : <Circle size={13} />}
            <span className="hidden sm:inline">{isPublished ? "Published" : "Unpublished"}</span>
          </button>
          <button onClick={openAssignPanel}
            className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600">
            <Users size={12} /><span className="hidden sm:inline">Assign To</span>
          </button>
          <button onClick={() => router.push(`/admin/courses/${courseId}/assignments/${assignmentId}/edit`)}
            className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600">
            <Pencil size={12} /><span className="hidden sm:inline">Edit</span>
          </button>
          <button onClick={() => setShowSidebar(v => !v)}
            className="sm:hidden flex items-center gap-1 text-xs font-bold px-2 py-1.5 border border-gray-200 rounded-lg text-gray-600">
            <Zap size={12} />
          </button>
          <button onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2 sm:px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 text-red-600">
            <Trash2 size={12} />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">

          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* ── Hero Banner ── */}
              <div style={{
                background: `linear-gradient(135deg, ${MAROON} 0%, #5a0d0f 100%)`,
                borderRadius: 16, padding: "24px 28px", position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
                <div style={{ position: "absolute", bottom: -20, right: 60, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, position: "relative" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText size={22} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, marginBottom: 6 }}>
                      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                        {assignment.title}
                      </h1>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                        {assignment.assignmentGroup || "Assignment"}
                      </span>
                    </div>
                    {creator && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#fff" }}>
                          {creator.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{creator.name}</span>
                        {creator.courseRole && <RoleBadge role={creator.courseRole} />}
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>· Posted {fmtDateTime(creator.createdAt)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "6px 12px", flexShrink: 0 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: availability.statusColor }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{availability.statusLabel}</span>
                  </div>
                </div>
              </div>

              {/* ── Description ── */}
              {assignment.description ? (
                <div style={{ background: "#fff", border: "1px solid #f0e4e4", borderLeft: `4px solid ${MAROON}`, borderRadius: "0 12px 12px 0", padding: "16px 20px" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase" as const, letterSpacing: "0.1em", margin: "0 0 8px" }}>Description</p>
                  <style>{`.assignment-desc{font-size:13px;color:#374151;line-height:1.75;}.assignment-desc p{margin:0 0 8px;}.assignment-desc a{color:#7b1113;text-decoration:underline;}`}</style>
                  <div className="assignment-desc" dangerouslySetInnerHTML={{ __html: assignment.description }} />
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic", margin: 0 }}>No description provided.</p>
              )}

              {/* ── Stats Row ── */}
              {submissions.length > 0 && (() => {
                const { submitted: s, graded: g, missing: m, late: l, avgScore: a } = computeStats(submissions, assignment);
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                    {[
                      { label: "Submitted", value: s.length, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
                      { label: "Graded",    value: g.length, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
                      { label: "Missing",   value: m.length, color: MAROON,    bg: "#fef2f2", border: "#f0c0c0" },
                      { label: "Late",      value: l.length, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
                      { label: "Avg Score", value: a != null ? `${a}%` : "—", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: 12, padding: "14px 10px", textAlign: "center" as const }}>
                        <p style={{ fontSize: 22, fontWeight: 900, color: stat.color, margin: 0, lineHeight: 1 }}>{stat.value}</p>
                        <p style={{ fontSize: 9, fontWeight: 800, color: stat.color, textTransform: "uppercase" as const, letterSpacing: "0.1em", margin: "4px 0 0" }}>{stat.label}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── Details + Schedule ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "#fff", border: "1px solid #f0e4e4", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "10px 18px", background: "linear-gradient(90deg, #fef2f2, #fff)", borderBottom: "1px solid #fce8e8", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: MAROON, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase" as const, letterSpacing: "0.1em", margin: 0 }}>Details</p>
                  </div>
                  <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                    {[
                      ["Points",      `${assignment.points} pts`],
                      ["Submission",  submittingLabel],
                      ["Group",       assignment.assignmentGroup || "—"],
                      ["Attempts",    assignment.allowedAttempts != null ? `${assignment.allowedAttempts}` : "Unlimited"],
                      ["Status",      isPublished ? "Published" : "Unpublished"],
                      ["Can Submit",  availability.canSubmit ? "Yes" : "No"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p style={{ fontSize: 9, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.1em", margin: "0 0 3px" }}>{k}</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: "#fff", border: "1px solid #f0e4e4", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "10px 18px", background: "linear-gradient(90deg, #fef2f2, #fff)", borderBottom: "1px solid #fce8e8", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: MAROON, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase" as const, letterSpacing: "0.1em", margin: 0 }}>Schedule</p>
                  </div>
                  <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                    {[
                      ["Due Date",       fmtDue(assignment.dueDate)],
                      ["Assigned To",    forLabel],
                      ["Available From", fmtDate(assignment.availableFrom)],
                      ["Until",          fmtDate(assignment.availableUntil)],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p style={{ fontSize: 9, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.1em", margin: "0 0 3px" }}>{k}</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Rubric ── */}
              <RubricSection courseId={courseId} assignmentId={assignmentId} />

              {/* ── Submissions CTA ── */}
              {submitted.length > 0 && (
                <button
                  onClick={() => setActiveTab("submissions")}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 14, border: "1px solid #f0c0c0", background: "linear-gradient(90deg, #fef2f2, #fff)", cursor: "pointer", fontFamily: FONT }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(123,17,19,0.1)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: MAROON, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FileText size={18} color="#fff" />
                    </div>
                    <div style={{ textAlign: "left" as const }}>
                      <p style={{ fontSize: 14, fontWeight: 900, color: MAROON, margin: 0 }}>
                        {submitted.length} Submission{submitted.length !== 1 ? "s" : ""}
                      </p>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>Click to view, grade, and download</p>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          )}

          {activeTab === "submissions" && (
            <SubmissionsTabContent
              submissions={submissions}
              assignment={assignment}
              courseId={courseId}
              assignmentId={assignmentId}
              onRefresh={fetchSubmissions}
            />
          )}
        </div>

        {/* Desktop sidebar */}
        <div className="hidden sm:flex w-56 border-l border-gray-200 bg-white shrink-0 flex-col overflow-y-auto">
          <div className="px-4 py-4 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Related Items</p>
          </div>
          <div className="px-4 py-4 space-y-3">
            <button onClick={() => window.open(`/admin/courses/${courseId}/assignments/${assignmentId}/speedgrader`, "_blank")}
              className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left" style={{ color: MAROON }}>
              <Zap size={13} /> SpeedGrader™
            </button>
            <button onClick={() => setActiveTab("submissions")}
              className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left" style={{ color: MAROON }}>
              <FileText size={13} /> View Submissions
            </button>
          </div>
          {submissions.length > 0 && (() => {
            const { submitted: s, graded: g, missing: m, late: l, avgScore: a } = computeStats(submissions, assignment);
            return (
              <div className="px-4 pb-4 space-y-1 text-[11px] text-gray-500">
                <div className="flex justify-between"><span>Submitted</span><span className="font-bold text-gray-700">{s.length}</span></div>
                <div className="flex justify-between"><span>Graded</span><span className="font-bold text-gray-700">{g.length}</span></div>
                <div className="flex justify-between"><span>Missing</span><span className="font-bold" style={{ color: MAROON }}>{m.length}</span></div>
                <div className="flex justify-between"><span>Late</span><span className="font-bold text-red-500">{l.length}</span></div>
                {a != null && <div className="flex justify-between"><span>Avg Score</span><span className="font-bold text-gray-700">{a}%</span></div>}
              </div>
            );
          })()}
        </div>

        {/* Mobile sidebar */}
        {showSidebar && (
          <>
            <div className="fixed inset-0 z-40 bg-black/20 sm:hidden" onClick={() => setShowSidebar(false)} />
            <div className="fixed right-0 top-0 h-full w-64 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col sm:hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Related Items</p>
                <button onClick={() => setShowSidebar(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
              <div className="px-4 py-4 space-y-3">
                <button onClick={() => { window.open(`/admin/courses/${courseId}/assignments/${assignmentId}/speedgrader`, "_blank"); setShowSidebar(false); }}
                  className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left" style={{ color: MAROON }}>
                  <Zap size={13} /> SpeedGrader™
                </button>
                <button onClick={() => { setActiveTab("submissions"); setShowSidebar(false); }}
                  className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left" style={{ color: MAROON }}>
                  <FileText size={13} /> View Submissions
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Assign To Panel */}
      {showAssignPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowAssignPanel(false)} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-85 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
            style={{ fontFamily: FONT }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: MAROON }}>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Assign To</p>
                <p className="text-sm font-bold text-white truncate mt-0.5">{assignment.title}</p>
              </div>
              <button onClick={() => setShowAssignPanel(false)} className="text-white/60 hover:text-white ml-2"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
              {assignRows.map((row, idx) => (
                <div key={row.id} className="space-y-4">
                  {idx > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="h-px flex-1 bg-gray-100" />
                      <button onClick={() => removeAssignRow(row.id)}
                        className="mx-3 text-xs font-bold text-red-400 hover:text-red-600">Remove</button>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Assign To</label>
                    <div className="relative">
                      <div className="min-h-9 border-2 rounded-xl px-2 py-1.5 flex flex-wrap gap-1 items-center cursor-text bg-white"
                        style={{ borderColor: openDrop === row.id ? MAROON : "#e5e7eb" }}
                        onClick={() => setOpenDrop(row.id)}>
                        {row.assignees.map(a => (
                          <span key={a.id} className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ background: MAROON }}>
                            {a.label}
                            <button type="button"
                              onClick={e => { e.stopPropagation(); if (a.id !== "everyone") toggleAssignee(row.id, a); }}
                              className="opacity-70 hover:opacity-100">×</button>
                          </span>
                        ))}
                        <input value={dropSearch[row.id] ?? ""}
                          onChange={e => { setDropSearch(p => ({ ...p, [row.id]: e.target.value })); setOpenDrop(row.id); }}
                          onFocus={() => setOpenDrop(row.id)}
                          placeholder={row.assignees.length ? "" : "Search…"}
                          className="flex-1 min-w-20 text-xs outline-none bg-transparent py-0.5 text-gray-700 placeholder:text-gray-400" />
                        <ChevronDown size={13} className="text-gray-400 shrink-0" />
                      </div>
                      {openDrop === row.id && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded-xl z-200 max-h-48 overflow-y-auto">
                          <button type="button"
                            onMouseDown={e => { e.preventDefault(); selectEveryone(row.id); setDropSearch(p => ({ ...p, [row.id]: "" })); }}
                            className="w-full text-left px-3 py-2.5 text-xs font-semibold hover:bg-red-50"
                            style={row.assignees.some(a => a.id === "everyone") ? { color: MAROON } : { color: "#374151" }}>
                            Everyone {row.assignees.some(a => a.id === "everyone") && <Check size={12} style={{ color: MAROON }} />}
                          </button>
                          {enrolledUsers
                            .filter(u => u.name.toLowerCase().includes((dropSearch[row.id] ?? "").toLowerCase()))
                            .map(u => (
                              <button key={u.id} type="button"
                                onMouseDown={e => { e.preventDefault(); toggleAssignee(row.id, { id: u.id, label: u.name }); setDropSearch(p => ({ ...p, [row.id]: "" })); }}
                                className="w-full text-left px-3 py-2.5 text-xs font-semibold hover:bg-red-50"
                                style={row.assignees.some(a => a.id === u.id) ? { color: MAROON } : { color: "#374151" }}>
                                {u.name}
                                {u.courseRole && <span className="ml-1 text-gray-400 font-normal">({u.courseRole})</span>}
                                {row.assignees.some(a => a.id === u.id) && <Check size={12} style={{ color: MAROON }} />}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {(["Due Date", "availableFrom", "until"] as const).map((field, fi) => {
                    const labels     = ["Due Date", "Available From", "Until"];
                    const dateFields = ["dueDate", "availableFrom", "until"] as const;
                    const timeFields = ["dueTime", "availableFromTime", "untilTime"] as const;
                    const df = dateFields[fi]; const tf = timeFields[fi];
                    return (
                      <div key={field}>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">{labels[fi]}</label>
                        <div className="flex gap-2">
                          <input type="date" value={row[df]} onChange={e => updateAssignRow(row.id, df, e.target.value)}
                            className="flex-1 h-8 border border-gray-200 rounded-lg px-2 text-xs outline-none focus:border-gray-400 bg-white" />
                          <select value={row[tf]} onChange={e => updateAssignRow(row.id, tf, e.target.value)}
                            className="h-8 border border-gray-200 rounded-lg px-1.5 text-xs bg-white outline-none w-28">
                            {ASSIGN_TIMES.map(t => <option key={t}>{t}</option>)}
                          </select>
                          <button onClick={() => updateAssignRow(row.id, df, "")}
                            className="text-[10px] font-bold hover:underline" style={{ color: MAROON }}>Clear</button>
                        </div>
                        {row[df] && <p className="text-[10px] text-gray-400 mt-1">{fmtLocalCourse(row[df], row[tf])}</p>}
                      </div>
                    );
                  })}
                </div>
              ))}
              <button onClick={addAssignRow} className="flex items-center gap-1.5 text-xs font-bold hover:underline" style={{ color: MAROON }}>
                + Add Row
              </button>
            </div>
            <div className="flex gap-2 px-4 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowAssignPanel(false)}
                className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={saveAssignTo} disabled={savingAssign}
                className="flex-1 h-9 rounded-xl text-sm font-black text-white disabled:opacity-60"
                style={{ background: MAROON }}>
                {savingAssign ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}