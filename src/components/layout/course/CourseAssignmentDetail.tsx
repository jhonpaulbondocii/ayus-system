"use client";

// src/components/layout/course/CourseAssignmentDetail.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap, CheckCircle, Circle, Pencil,
  Upload, Users, X, Trash2, FileText,
  ChevronDown, Check, RefreshCw, Search,
  AlertCircle, Clock, Star, PackageOpen,
  Eye, ExternalLink, MoreVertical, Download,
} from "lucide-react";
import {
  MAROON, FONT,
  fmtDue, fmtDate,
  isoToDate, isoToTime,
} from "./helpers";
import type { Assignment, Section, Staff } from "./types";

// ── Types ──────────────────────────────────────────────────────────────────────
type AssignmentWithRole = Assignment & {
  _assignmentRole?: "manager" | "submitter";
  _publisherName?: string | null;
  _publisherImage?: string | null;
  _publisherRole?: string | null;
  _publisherId?: string | null;
  assignees?: string[];
  allowedAttempts?: number | null;
};

interface EnrolledUser {
  id: string;
  name: string;
  email?: string;
  courseRole?: string;
}

interface Submission {
  id?: string;
  fileUrl: string | null;
  fileName?: string | null;
  userName: string | null;
  userEmail: string;
  userId: string;
  submittedAt: string | null;
  points?: number | null;
  grade?: string | null;
  textEntry?: string | null;
  onlineUrl?: string | null;
  feedback?: string | null;
  status?: string | null;
  daysLate?: number | null;
  isLate?: boolean;
  isMissing?: boolean;
}

interface AssignRow {
  id: number;
  assignees: { id: string; label: string }[];
  dueDate: string;
  dueTime: string;
  availableFrom: string;
  availableFromTime: string;
  until: string;
  untilTime: string;
}

type ActiveTab = "overview" | "submissions";
type FilterStatus = "all" | "submitted" | "graded" | "missing" | "late" | "excused";
type SortType = "name" | "newest" | "oldest" | "grade";

interface RawStaffUser {
  id: string;
  name?: string;
  userName?: string;
  email?: string;
  courseRole?: string;
}

interface AssignmentPatchResponse {
  assignment?: {
    dueDate?: string | null;
    availableFrom?: string | null;
    availableUntil?: string | null;
    status?: string;
  };
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

const DEFAULT_RATINGS: RubricRating[] = [
  { points: 4, name: "Exceeds",     description: "", order: 0 },
  { points: 3, name: "Mastery",     description: "", order: 1 },
  { points: 2, name: "Near",        description: "", order: 2 },
  { points: 1, name: "Below",       description: "", order: 3 },
  { points: 0, name: "No Evidence", description: "", order: 4 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
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

function fmtLocalCourse(date: string, time: string) {
  if (!date) return null;
  const t = time || "11:59 PM";
  const d = new Date(`${date} ${t}`);
  if (isNaN(d.getTime())) return null;
  return `Local: ${d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function resolveAssigneesLabel(assignees: string[], users: EnrolledUser[]): string {
  if (!assignees || assignees.length === 0) return "Everyone";
  const names = assignees.map(id => users.find(u => u.id === id)?.name ?? id);
  if (names.length === 1) return names[0];
  return `${names.length} staff`;
}

function getAvailabilityStatus(assignment: AssignmentWithRole): {
  canSubmit: boolean;
  statusLabel: string;
  statusColor: string;
} {
  const now = new Date();
  const isPublished = assignment.status === "PUBLISHED";
  if (!isPublished)
    return { canSubmit: false, statusLabel: "Not Published", statusColor: "#9ca3af" };
  const availableFrom = assignment.availableFrom ? new Date(assignment.availableFrom) : null;
  const availableUntil = assignment.availableUntil ? new Date(assignment.availableUntil) : null;
  if (availableFrom && now < availableFrom)
    return {
      canSubmit: false,
      statusLabel: `Available from ${fmtDate(assignment.availableFrom)}`,
      statusColor: "#f59e0b",
    };
  if (availableUntil && now > availableUntil)
    return { canSubmit: false, statusLabel: "Closed", statusColor: "#ef4444" };
  return { canSubmit: true, statusLabel: "Open for submissions", statusColor: "#22c55e" };
}

function isLateCheck(submittedAt: string | null, dueDate: string | null): boolean {
  if (!submittedAt || !dueDate) return false;
  return new Date(submittedAt) > new Date(dueDate);
}

function getGradeColor(points: number, maxPoints: number): string {
  if (maxPoints === 0) return "#6b7280";
  const pct = points / maxPoints;
  if (pct >= 0.9) return "#16a34a";
  if (pct >= 0.75) return "#65a30d";
  if (pct >= 0.6) return "#d97706";
  return "#dc2626";
}

function isImage(url: string) { return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.split("?")[0]); }
function isPdf(url: string) { return /\.pdf$/i.test(url.split("?")[0]); }

function computeStats(submissions: Submission[], dueDate: string | null) {
  const submitted = submissions.filter(s => s.submittedAt != null);
  const missing   = submissions.filter(s => !s.submittedAt);
  const graded    = submissions.filter(s => (s.points != null || s.grade != null) && s.status !== "EXCUSED");
  const late      = submitted.filter(s =>
    s.status === "LATE" || s.isLate ||
    (s.submittedAt && dueDate && new Date(s.submittedAt) > new Date(dueDate))
  );
  const scored = graded.filter(s => s.points != null);
  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((a, s) => a + (s.points ?? 0), 0) / scored.length * 10) / 10
    : null;
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
    <span style={{ ...style, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>
      {normalized}
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ["#0e7490", "#1d4ed8", "#16a34a", "#ea580c", "#7c3aed", MAROON];
  const color = colors[(name.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-black shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: color }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ sub, dueDate }: { sub: Submission; dueDate: string | null }) {
  const isExcused = sub.status === "EXCUSED";
  const late = sub.status === "LATE" || sub.isLate ||
    isLateCheck(sub.submittedAt, dueDate);
  const graded = (sub.points != null || sub.grade != null) && !isExcused;

  if (!sub.submittedAt)
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" }}><AlertCircle size={9} /> Missing</span>;
  if (isExcused)
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}>Excused</span>;
  if (graded && !late)
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}><Check size={9} /> Graded</span>;
  if (late)
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>Late</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}><Check size={9} /> Submitted</span>;
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function DeleteConfirmModal({ title, onConfirm, onCancel, deleting }: {
  title: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100" style={{ background: "#fef2f2" }}>
          <div className="flex items-center gap-2">
            <Trash2 size={15} style={{ color: MAROON }} />
            <span className="text-sm font-black" style={{ color: MAROON }}>Delete Assignment</span>
          </div>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-gray-700 leading-relaxed">
            Are you sure you want to delete <span className="font-bold">&ldquo;{title}&rdquo;</span>? This action cannot be undone and all associated submissions will be permanently removed.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onCancel} disabled={deleting} className="h-9 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="h-9 px-4 rounded-xl text-sm font-black text-white disabled:opacity-60" style={{ background: MAROON }}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Grade Modal ────────────────────────────────────────────────────────────────
function GradeModal({ sub, assignment, onClose, onSave }: {
  sub: Submission;
  assignment: AssignmentWithRole;
  onClose: () => void;
  onSave: (userId: string, points: number | null, feedback: string, status: string) => Promise<void>;
}) {
  const existing = sub.points ?? (sub.grade != null ? parseFloat(sub.grade) : null);
  const [score, setScore] = useState<string>(existing != null ? String(existing) : "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [status, setStatus] = useState(sub.status ?? "SUBMITTED");
  const [saving, setSaving] = useState(false);
  const maxPts = assignment.points;

  const pct = score !== "" && !isNaN(parseFloat(score))
    ? Math.round((parseFloat(score) / maxPts) * 100) : null;

  const handleSave = async () => {
    setSaving(true);
    const gradeValue = score !== "" ? parseFloat(score) : null;
    await onSave(sub.userId, gradeValue, feedback, status);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} style={{ fontFamily: FONT }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: MAROON }}>
          <Avatar name={sub.userName ?? sub.userEmail} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Grading</p>
            <p className="text-sm font-black text-white truncate">{sub.userName ?? sub.userEmail}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={16} /></button>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-600">{assignment.title}</p>
          <p className="text-xs font-black" style={{ color: MAROON }}>Max: {maxPts} pts</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {sub.submittedAt && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
              <Clock size={12} className="text-gray-400" />
              <p className="text-xs text-gray-500">Submitted: {fmtDateTime(sub.submittedAt)}</p>
              {(sub.isLate || sub.status === "LATE") && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>Late</span>
              )}
            </div>
          )}
          {sub.isMissing && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: "#fef2f2", borderColor: "#f0c0c0" }}>
              <AlertCircle size={12} style={{ color: MAROON }} />
              <p className="text-xs font-semibold" style={{ color: MAROON }}>No submission received</p>
            </div>
          )}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Score</label>
            <div className="flex items-center gap-3">
              <input
                type="number" min={0} max={maxPts}
                value={score} onChange={e => setScore(e.target.value)}
                placeholder="—"
                className="flex-1 h-11 text-center text-lg font-black border-2 rounded-xl outline-none transition-colors"
                style={{ borderColor: score !== "" ? MAROON : "#e5e7eb", color: MAROON }}
              />
              <span className="text-sm font-bold text-gray-400">/ {maxPts}</span>
              {pct !== null && (
                <span className="text-sm font-black shrink-0" style={{ color: getGradeColor(parseFloat(score), maxPts) }}>{pct}%</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[100, 90, 80, 70, 60, 0].map(p => {
                const val = Math.round((p / 100) * maxPts);
                const isActive = parseFloat(score) === val;
                return (
                  <button key={p} type="button" onClick={() => setScore(String(val))}
                    className="px-2.5 py-1 text-[11px] font-bold border rounded-lg transition-all"
                    style={isActive
                      ? { background: MAROON, color: "#fff", borderColor: MAROON }
                      : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
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
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3}
              placeholder="Write feedback for this student..."
              className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-gray-400 resize-none bg-white" />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: MAROON }}>
            <Star size={13} />
            {saving ? "Saving..." : "Save Grade"}
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
    <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: MAROON }}>
          <div className="flex items-center gap-2">
            <FileText size={13} className="text-white/70" />
            <span className="text-sm font-bold text-white truncate">{fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <>
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-white/70 hover:text-white transition-colors">
                  <ExternalLink size={11} /> Open
                </a>
                <a href={url} download={fileName} className="flex items-center gap-1 text-[10px] font-bold text-white/70 hover:text-white transition-colors">
                  <Download size={11} /> Download
                </a>
              </>
            )}
            <button onClick={onClose} className="text-white/60 hover:text-white ml-1"><X size={15} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-gray-100 min-h-80">
          {!url ? (
            <div className="h-full overflow-y-auto px-8 py-6">
              {sub.textEntry
                ? <div className="prose prose-sm max-w-none text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: sub.textEntry }} />
                : <p className="text-sm text-gray-400 italic">No content to preview.</p>}
            </div>
          ) : isImg ? (
            <div className="h-full flex items-center justify-center p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
            </div>
          ) : isPdf(url) ? (
            <iframe src={url} title={fileName} className="w-full h-full border-0" style={{ minHeight: 460 }} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
              <FileText size={48} />
              <p className="text-sm">Preview not available for this file type.</p>
              <a href={url} download={fileName} className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg text-white" style={{ background: MAROON }}>
                <Download size={13} /> Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────────
function StatsBar({ submissions, dueDate, maxPoints }: {
  submissions: Submission[];
  dueDate: string | null;
  maxPoints: number;
}) {
  const { submitted, graded, missing, late, avgScore } = computeStats(submissions, dueDate);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
      {[
        { label: "Submitted", value: submitted.length, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
        { label: "Graded",    value: graded.length,    color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
        { label: "Missing",   value: missing.length,   color: MAROON,   bg: "#fef2f2", border: "#f0c0c0" },
        { label: "Late",      value: late.length,      color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
        { label: "Avg Score", value: avgScore != null ? `${avgScore}/${maxPoints}` : "—", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
      ].map(stat => (
        <div key={stat.label} className="rounded-xl border px-4 py-3 text-center" style={{ background: stat.bg, borderColor: stat.border }}>
          <p className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: stat.color }}>{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Criterion Modal ────────────────────────────────────────────────────────────
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
    const sorted = [...ratings].sort((a, b) => b.points - a.points).map((r, i) => ({ ...r, order: i }));
    onSave({ id: initial?.id, name: name.trim(), description: desc, points: maxPts, enableRange, order: initial?.order ?? 0, ratings: sorted });
  };

  const sortedForDisplay = [...ratings].sort((a, b) => b.points - a.points);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-black text-gray-900">{initial ? "Edit Criterion" : "Create New Criterion"}</h3>
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
              <input type="checkbox" checked={enableRange} onChange={e => setEnableRange(e.target.checked)} className="w-4 h-4" style={{ accentColor: MAROON }} />
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
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg text-white text-sm font-black shrink-0" style={{ background: MAROON }}>{r.points}</div>
                    <input type="number" min={0} value={r.points} onChange={e => updateRating(realIdx, "points", parseFloat(e.target.value) || 0)} className="h-9 border border-gray-200 rounded-lg px-2 text-sm text-center outline-none focus:border-gray-400" />
                    <input value={r.name} onChange={e => updateRating(realIdx, "name", e.target.value)} placeholder="Rating Name" className="h-9 border border-gray-200 rounded-lg px-3 text-sm outline-none focus:border-gray-400" />
                    <input value={r.description} onChange={e => updateRating(realIdx, "description", e.target.value)} placeholder="Description (optional)" className="h-9 border border-gray-200 rounded-lg px-3 text-sm outline-none focus:border-gray-400" />
                    <button onClick={() => removeRating(realIdx)} className="text-gray-300 hover:text-red-400 flex items-center justify-center"><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
            <button onClick={addRating} className="mt-3 flex items-center gap-1.5 text-xs font-bold hover:underline" style={{ color: MAROON }}>+ Add Rating</button>
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={handleSave} className="flex-1 h-10 rounded-xl text-sm font-black text-white" style={{ background: MAROON }}>Save Criterion</button>
        </div>
      </div>
    </div>
  );
}

// ── Rubric Section ─────────────────────────────────────────────────────────────
function RubricSection({ courseId, assignmentId }: { courseId: string; assignmentId: string }) {
  const [rubric, setRubric]       = useState<Rubric | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [form, setForm] = useState<Omit<Rubric, "pointsPossible" | "criteria">>({
    title: "", type: "scale", ratingDisplay: "level", ratingOrder: "high_low", scoring: "scored",
    doNotPostToGradebook: false, useForGrading: false, hideScoreTotal: false,
  });
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [criterionModal, setCriterionModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });

  useEffect(() => {
    fetch(`/api/courses/${courseId}/assignments/${assignmentId}/rubric`)
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
      const res = await fetch(`/api/courses/${courseId}/assignments/${assignmentId}/rubric`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, criteria }),
      });
      const d = await res.json();
      if (!res.ok) { alert(`Error: ${(d as { error?: string }).error ?? "Failed to save rubric"}`); setSaving(false); return; }
      setRubric((d as { rubric: Rubric }).rubric);
      setShowModal(false);
      fetch(`/api/courses/${courseId}/assignments/${assignmentId}/rubric`)
        .then(r => r.json())
        .then(d => setRubric((d as { rubric?: Rubric }).rubric ?? null))
        .catch(() => {});
    } catch (err) { console.error(err); alert("Network error. Check console."); }
    setSaving(false);
  };

  const handleDeleteRubric = async () => {
    if (!confirm("Delete this rubric? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/courses/${courseId}/assignments/${assignmentId}/rubric`, { method: "DELETE" });
      setRubric(null);
    } catch { alert("Failed to delete rubric."); }
    setDeleting(false);
  };

  const totalPts = criteria.reduce((s, c) => s + c.points, 0);
  if (loading) return null;

  return (
    <div className="mt-5">
      {rubric ? (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/>
              </svg>
              <p className="text-xs font-black" style={{ color: MAROON }}>Rubric</p>
              <span className="text-xs text-gray-500">— {rubric.title}</span>
              {rubric.useForGrading && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>Used for grading</span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-black" style={{ color: MAROON }}>{rubric.pointsPossible} pts</span>
              <button onClick={openCreate} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>Edit</button>
              <button onClick={handleDeleteRubric} disabled={deleting} className="text-xs font-bold text-red-400 hover:text-red-600 hover:underline disabled:opacity-50">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 500 }}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 font-black uppercase tracking-widest text-gray-400 text-[10px] w-40">Criteria</th>
                  {(rubric.criteria[0]?.ratings ?? []).slice().sort((a, b) => rubric.ratingOrder === "high_low" ? b.points - a.points : a.points - b.points).map((r, i) => (
                    <th key={i} className="text-center px-3 py-2 font-black uppercase tracking-widest text-gray-400 text-[10px]">
                      {r.name}
                      {rubric.ratingDisplay === "points" && <span className="block font-black text-xs" style={{ color: MAROON }}>{r.points} pts</span>}
                    </th>
                  ))}
                  <th className="text-center px-3 py-2 font-black uppercase tracking-widest text-gray-400 text-[10px]">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rubric.criteria.map((c, ci) => {
                  const sorted = c.ratings.slice().sort((a, b) => rubric.ratingOrder === "high_low" ? b.points - a.points : a.points - b.points);
                  return (
                    <tr key={ci} className={ci % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-4 py-3 font-bold text-gray-800 text-xs align-top">
                        {c.name}
                        {c.description && <p className="text-[10px] text-gray-400 font-normal mt-0.5 leading-relaxed">{c.description}</p>}
                      </td>
                      {sorted.map((r, ri) => (
                        <td key={ri} className="px-3 py-3 text-center align-top border-l border-gray-100">
                          <span className="text-[11px] font-semibold text-gray-600">{r.name}</span>
                          {r.description && <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{r.description}</p>}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-black text-sm border-l border-gray-100" style={{ color: MAROON }}>{c.points}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={99} className="px-4 py-2 text-right text-xs font-black" style={{ color: MAROON }}>Total: {rubric.pointsPossible} pts</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-xs font-black border-2 rounded-xl hover:bg-red-50 transition-all" style={{ color: MAROON, borderColor: MAROON }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Rubric
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Find Rubric
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-black text-gray-900">{rubric ? "Edit Rubric" : "Create Rubric"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Rubric Name *</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Rubric name"
                    className="w-full h-9 border-2 border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-gray-400" />
                </div>
                {([
                  { label: "Type", key: "type", opts: [["scale","Scale"],["written_feedback","Written Feedback"]] },
                  { label: "Rating Display", key: "ratingDisplay", opts: [["level","Level"],["points","Points"]] },
                  { label: "Rating Order", key: "ratingOrder", opts: [["high_low","High < Low"],["low_high","Low < High"]] },
                  { label: "Scoring", key: "scoring", opts: [["scored","Scored"],["unscored","Unscored"]] },
                ] as { label: string; key: keyof typeof form; opts: [string, string][] }[]).map(({ label, key, opts }) => (
                  <div key={key}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">{label}</label>
                    <select value={form[key] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full h-9 border border-gray-200 rounded-xl px-2 text-xs bg-white outline-none focus:border-gray-400">
                      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-5">
                {([
                  ["doNotPostToGradebook", "Don't post to Learning Mastery Gradebook"],
                  ["useForGrading", "Use this rubric for assignment grading"],
                  ["hideScoreTotal", "Hide rubric score total from students"],
                ] as [keyof typeof form, string][]).map(([key, lbl]) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                    <input type="checkbox" checked={form[key] as boolean} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4" style={{ accentColor: MAROON }} />
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
                      <div key={i} className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 hover:border-gray-300 transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800">{c.name}</p>
                          {c.description && <p className="text-[11px] text-gray-400 truncate">{c.description}</p>}
                          <p className="text-[10px] text-gray-400 mt-0.5">{c.ratings.length} rating{c.ratings.length !== 1 ? "s" : ""} · {c.points} pts</p>
                        </div>
                        <button onClick={() => setCriterionModal({ open: true, index: i })} className="text-xs font-bold hover:underline shrink-0" style={{ color: MAROON }}>Edit</button>
                        <button onClick={() => setCriteria(p => p.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-400 shrink-0"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-gray-400">{criteria.length + 1}.</span>
                  <button onClick={() => setCriterionModal({ open: true, index: null })}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-black border-2 rounded-xl hover:bg-red-50 transition-all"
                    style={{ color: MAROON, borderColor: MAROON }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Draft New Criterion
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowModal(false)} className="h-10 px-5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{criteria.length} criteri{criteria.length !== 1 ? "a" : "on"} · {totalPts} pts</span>
                <button onClick={handleSaveRubric} disabled={saving} className="h-10 px-6 rounded-xl text-sm font-black text-white disabled:opacity-60" style={{ background: MAROON }}>
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

// ── Props ──────────────────────────────────────────────────────────────────────
interface CourseAssignmentDetailProps {
  assignment: AssignmentWithRole;
  courseId: string;
  sections: Section[];
  staff: Staff[];
  currentUserId?: string | null;
  onBack: () => void;
  onEditFull: (a: AssignmentWithRole) => void;
  setAssignments: React.Dispatch<React.SetStateAction<AssignmentWithRole[]>>;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function CourseAssignmentDetail({
  assignment, courseId, sections: _sections, staff: _staff,
  currentUserId: _currentUserId, onBack, onEditFull, setAssignments,
}: CourseAssignmentDetailProps) {
  const [current, setCurrent] = useState<AssignmentWithRole>(assignment);
  const [publishing, setPublishing] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  const [gradingTarget, setGradingTarget] = useState<Submission | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortType>("newest");
  const [assignRows, setAssignRows] = useState<AssignRow[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [dropSearch, setDropSearch] = useState<Record<number, string>>({});
  const [openDrop, setOpenDrop] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const dotMenuRef = useRef<HTMLDivElement>(null);

  void _sections; void _staff; void _currentUserId;

  useEffect(() => {
    if (!showDotMenu) return;
    const h = (e: MouseEvent) => { if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node)) setShowDotMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDotMenu]);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const [sRes, uRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/assignments/${assignment.id}/submissions`, { signal }),
        fetch(`/api/courses/${courseId}/sections`, { signal }),
      ]);
      if (signal?.aborted) return;
      const [sData, uData] = await Promise.all([sRes.json(), uRes.json()]) as [
        { submissions?: Submission[] },
        { staff?: RawStaffUser[]; users?: RawStaffUser[]; members?: RawStaffUser[] },
      ];
      if (signal?.aborted) return;
      setSubmissions(sData.submissions ?? []);
      const raw: RawStaffUser[] = uData.staff ?? uData.users ?? uData.members ?? [];
      setEnrolledUsers(raw.map(u => ({ id: u.id, name: u.name ?? u.userName ?? u.email ?? u.id, courseRole: u.courseRole ?? "Staff" })));
    } catch { /* silent */ }
  }, [courseId, assignment.id]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => {
      setRefreshing(false);
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 3000);
    });
  };

  const togglePublish = async () => {
    setPublishing(true);
    const newStatus = current.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    const res = await fetch(`/api/courses/${courseId}/assignments/${current.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = (await res.json()) as AssignmentPatchResponse;
    if (data.assignment) {
      setCurrent(p => ({ ...p, status: newStatus }));
      setAssignments(prev => prev.map(a => a.id === current.id ? { ...a, status: newStatus } : a));
    }
    setPublishing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments/${current.id}`, { method: "DELETE" });
      if (res.ok) { setAssignments(prev => prev.filter(a => a.id !== current.id)); onBack(); }
      else { alert("Failed to delete assignment."); setDeleting(false); setShowDeleteModal(false); }
    } catch { alert("Network error."); setDeleting(false); setShowDeleteModal(false); }
  };

  const handleSaveGrade = async (userId: string, points: number | null, feedback: string, status: string) => {
    const sub = submissions.find(s => s.userId === userId);
    if (!sub?.id) {
      setSubmissions(prev => prev.map(s => s.userId === userId ? { ...s, points: points ?? undefined, grade: points != null ? String(points) : null, feedback, status } : s));
      return;
    }
    const res = await fetch(`/api/courses/${courseId}/assignments/${current.id}/submissions`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: sub.id, grade: points, feedback, status }),
    });
    if (res.ok) {
      setSubmissions(prev => prev.map(s => s.userId === userId ? { ...s, points: points ?? undefined, grade: points != null ? String(points) : null, feedback, status } : s));
    }
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
          zip.file(`${safeName}/grade_info.txt`, [
            `Student: ${s.userName ?? s.userEmail}`,
            `Email: ${s.userEmail}`,
            `Submitted: ${s.submittedAt ? fmtDateTime(s.submittedAt) : "—"}`,
            `Score: ${s.points != null ? `${s.points}/${current.points}` : "Not graded"}`,
            `Feedback: ${s.feedback ?? "—"}`,
          ].join("\n"));
        } catch { /* skip */ }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${current.title.replace(/[^a-zA-Z0-9_\- ]/g, "_")}_submissions.zip`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch { alert("Failed to download."); }
    setDownloading(false);
  };

  const openAssignPanel = () => {
    const existingAssignees = current.assignees ?? [];
    setAssignRows([{
      id: 1,
      assignees: existingAssignees.length > 0
        ? existingAssignees.map(id => { const found = enrolledUsers.find(u => u.id === id); return { id, label: found?.name ?? id }; })
        : [{ id: "everyone", label: "Everyone" }],
      dueDate: isoToDate(current.dueDate), dueTime: isoToTime(current.dueDate),
      availableFrom: isoToDate(current.availableFrom), availableFromTime: isoToTime(current.availableFrom),
      until: isoToDate(current.availableUntil), untilTime: isoToTime(current.availableUntil),
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
    setSavingAssign(true);
    const allEveryone = assignRows.every(r => r.assignees.length === 0 || r.assignees.some(a => a.id === "everyone"));
    const resolvedIds = allEveryone ? [] : assignRows.flatMap(r => r.assignees.filter(a => a.id !== "everyone").map(a => a.id));
    const row = assignRows[0];
    const res = await fetch(`/api/courses/${courseId}/assignments/${current.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignees: resolvedIds, dueDate: row.dueDate || null, dueTime: row.dueTime || null, availableFrom: row.availableFrom || null, availableFromTime: row.availableFromTime || null, availableUntil: row.until || null, untilTime: row.untilTime || null }),
    });
    const data = (await res.json()) as AssignmentPatchResponse;
    if (data.assignment) {
      setCurrent(p => ({ ...p, assignees: resolvedIds, dueDate: data.assignment?.dueDate ?? p.dueDate, availableFrom: data.assignment?.availableFrom ?? p.availableFrom, availableUntil: data.assignment?.availableUntil ?? p.availableUntil }));
      setAssignments(prev => prev.map(a => a.id === current.id ? { ...a, assignees: resolvedIds, dueDate: data.assignment?.dueDate ?? a.dueDate, availableFrom: data.assignment?.availableFrom ?? a.availableFrom, availableUntil: data.assignment?.availableUntil ?? a.availableUntil } : a));
    }
    setSavingAssign(false); setShowAssignPanel(false);
  };

  const openSpeedGrader = (staffId?: string) => {
    const base = `/courses/${courseId}/assignments/${current.id}/speedgrader`;
    window.open(staffId ? `${base}?staffId=${staffId}` : base, "_blank");
  };

  const isPublished = current.status === "PUBLISHED";
  const opts = (current.onlineEntryOptions ?? []).map(normalizeOpt);
  const submittingLabel = opts.length > 0 ? opts.map(o => OPT_LABELS[o] ?? o).join(", ") : (current.submissionType ?? "—");
  const forLabel = resolveAssigneesLabel(current.assignees ?? [], enrolledUsers);
  const availability = getAvailabilityStatus(current);
  const isManager = current._assignmentRole === "manager";

  const { submitted } = computeStats(submissions, current.dueDate ?? null);

  // ── Filtered & sorted submissions ──
  const filteredSubmissions = submissions
    .filter(s => {
      const q = search.trim().toLowerCase();
      if (q && !(s.userName ?? s.userEmail).toLowerCase().includes(q) && !s.userEmail.toLowerCase().includes(q)) return false;
      const late = s.status === "LATE" || s.isLate || isLateCheck(s.submittedAt, current.dueDate ?? null);
      if (filterStatus === "submitted") return !!s.submittedAt;
      if (filterStatus === "graded")    return (s.points != null || s.grade != null) && s.status !== "EXCUSED";
      if (filterStatus === "missing")   return !s.submittedAt;
      if (filterStatus === "late")      return !!late;
      if (filterStatus === "excused")   return s.status === "EXCUSED";
      return true;
    })
    .sort((a, b) => {
      if (sort === "name")   return (a.userName ?? a.userEmail).localeCompare(b.userName ?? b.userEmail);
      if (sort === "grade")  return ((b.points ?? -1) - (a.points ?? -1));
      if (sort === "oldest") { if (!a.submittedAt) return 1; if (!b.submittedAt) return -1; return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(); }
      if (!a.submittedAt) return 1; if (!b.submittedAt) return -1;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>

      {/* Modals */}
      {showDeleteModal && <DeleteConfirmModal title={current.title} onConfirm={handleDelete} onCancel={() => { setShowDeleteModal(false); setShowDotMenu(false); }} deleting={deleting} />}
      {gradingTarget && <GradeModal sub={gradingTarget} assignment={current} onClose={() => setGradingTarget(null)} onSave={handleSaveGrade} />}
      {previewTarget && <FilePreviewModal sub={previewTarget} onClose={() => setPreviewTarget(null)} />}

      {/* ── Status banner ── */}
      {!isPublished && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" /></svg>
          <p className="text-xs text-amber-800 font-medium">This assignment is <strong>unpublished</strong>. Staff cannot see it until you publish it.</p>
        </div>
      )}

      {/* ── Tab bar + actions ── */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 sm:px-5 bg-white shrink-0 overflow-x-auto">
        <div className="flex items-end">
          {(["overview", "submissions"] as ActiveTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-3 sm:px-4 py-2 text-xs -mb-px mr-0.5 rounded-t capitalize whitespace-nowrap flex items-center gap-1 transition-colors"
              style={activeTab === tab
                ? { border: "1px solid #e5e7eb", borderBottom: "1px solid white", background: "white", color: "#111827", fontWeight: 600 }
                : { border: "1px solid transparent", color: "#6b7280" }}>
              {tab === "submissions" ? "Submissions" : "Overview"}
              {tab === "submissions" && submitted.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] text-white" style={{ background: MAROON }}>{submitted.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 py-1.5 flex-wrap justify-end">
          {isManager && (
            <button onClick={togglePublish} disabled={publishing}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-60"
              style={isPublished
                ? { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }
                : { background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb" }}>
              {isPublished ? <CheckCircle size={13} style={{ color: "#15803d" }} /> : <Circle size={13} />}
              <span className="hidden sm:inline">{isPublished ? "Published" : "Unpublished"}</span>
            </button>
          )}
          {isManager && (
            <button onClick={openAssignPanel}
              className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 transition-all">
              <Users size={12} /><span className="hidden sm:inline">Assign To</span>
            </button>
          )}
          {isManager && (
            <button onClick={() => onEditFull(current)}
              className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 transition-all">
              <Pencil size={12} /><span className="hidden sm:inline">Edit</span>
            </button>
          )}
          <button onClick={() => openSpeedGrader()}
            className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg text-white transition-all"
            style={{ background: MAROON }}>
            <Zap size={12} /><span className="hidden sm:inline">SpeedGrader™</span>
          </button>
          {isManager && (
            <div className="relative" ref={dotMenuRef}>
              <button onClick={() => setShowDotMenu(p => !p)}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-all">
                <MoreVertical size={15} />
              </button>
              {showDotMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 shadow-xl rounded-xl z-100 overflow-hidden py-1">
                  <button onClick={() => { setShowDotMenu(false); setShowDeleteModal(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left">
                    <Trash2 size={13} /> Delete Assignment
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ TAB CONTENT ══ */}
      {activeTab === "overview" ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">

            {/* Title block */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                <FileText size={18} style={{ color: MAROON }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">{current.title}</h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium shrink-0" style={{ background: MAROON }}>{current.assignmentGroup || "Assignment"}</span>
                </div>
                {current._publisherName && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-gray-100 flex items-center justify-center">
                      {current._publisherImage
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={current._publisherImage} alt={current._publisherName} className="w-full h-full object-cover" />
                        : <span className="text-[9px] font-black text-white w-full h-full flex items-center justify-center" style={{ background: MAROON }}>{current._publisherName.charAt(0).toUpperCase()}</span>}
                    </div>
                    <span className="text-xs font-bold text-gray-700">{current._publisherName}</span>
                    {current._publisherRole && <RoleBadge role={current._publisherRole} />}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {current.description ? (
              <div className="mb-6 text-sm text-gray-700 leading-relaxed border-l-4 pl-4" style={{ borderColor: MAROON }}>
                <style>{`.assign-desc{font-size:13px;color:#374151;line-height:1.65}.assign-desc p{margin:0 0 6px}.assign-desc strong,.assign-desc b{font-weight:700;color:#111827}.assign-desc ul,.assign-desc ol{padding-left:20px;margin:0 0 6px}.assign-desc li{margin-bottom:3px}.assign-desc a{color:#7b1113;text-decoration:underline}`}</style>
                <div className="assign-desc" dangerouslySetInnerHTML={{ __html: current.description }} />
              </div>
            ) : (
              <p className="mb-6 text-sm italic text-gray-400">No description provided.</p>
            )}

            {/* Details */}
            <div className="bg-white border border-gray-100 rounded-lg mb-4 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Details</p>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {([
                  ["Points", `${current.points}`],
                  ["Submission Type", submittingLabel],
                  ["Group", current.assignmentGroup || "—"],
                  ["Attempts Allowed", current.allowedAttempts != null ? `${current.allowedAttempts}` : "Unlimited"],
                  ["Status", isPublished ? "Published" : "Unpublished"],
                  ["Can Submit", availability.canSubmit ? "Yes" : "No"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{k}</p>
                    <p className="text-sm font-bold text-gray-800">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white border border-gray-100 rounded-lg mb-4 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Schedule</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 400 }}>
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Due", "For", "Available From", "Until"].map(h => (
                        <th key={h} className="text-left px-5 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-700">{fmtDue(current.dueDate) || "No due date"}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-700">{forLabel}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{current.availableFrom ? fmtDate(current.availableFrom) : "—"}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{current.availableUntil ? fmtDate(current.availableUntil) : "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rubric */}
            {isManager && <RubricSection courseId={courseId} assignmentId={current.id} />}

            {/* Go to submissions */}
            {submitted.length > 0 && (
              <button onClick={() => setActiveTab("submissions")}
                className="mt-5 w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all hover:shadow-sm group"
                style={{ background: "#fdf2f2", borderColor: "#f0c0c0" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: MAROON }}>
                    <FileText size={15} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black" style={{ color: MAROON }}>{submitted.length} Submission{submitted.length !== 1 ? "s" : ""}</p>
                    <p className="text-xs text-gray-500">Click to view, grade, and download</p>
                  </div>
                </div>
                <ChevronDown size={16} className="-rotate-90 group-hover:translate-x-0.5 transition-transform" style={{ color: MAROON }} />
              </button>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="hidden sm:flex w-56 border-l border-gray-200 bg-white shrink-0 flex-col overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Related Items</p>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              <button onClick={() => openSpeedGrader()} className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left" style={{ color: MAROON }}><Zap size={13} /> SpeedGrader™</button>
              <button onClick={() => setActiveTab("submissions")} className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left" style={{ color: MAROON }}><FileText size={13} /> View Submissions</button>
              <button className="w-full flex items-center gap-2 text-xs font-bold text-left opacity-50 cursor-not-allowed" style={{ color: MAROON }} disabled><Upload size={13} /> Re-Upload Submissions</button>
            </div>
            {submissions.length > 0 && (() => {
              const { submitted: s, graded: g, missing: m, late: l, avgScore: a } = computeStats(submissions, current.dueDate ?? null);
              return (
                <div className="px-4 pb-4 space-y-1 text-[11px] text-gray-500 border-t border-gray-100 pt-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Quick Stats</p>
                  <div className="flex justify-between"><span>Submitted</span><span className="font-bold" style={{ color: MAROON }}>{s.length}</span></div>
                  <div className="flex justify-between"><span>Graded</span><span className="font-bold text-green-600">{g.length}</span></div>
                  <div className="flex justify-between"><span>Missing</span><span className="font-bold" style={{ color: MAROON }}>{m.length}</span></div>
                  <div className="flex justify-between"><span>Late</span><span className="font-bold text-red-500">{l.length}</span></div>
                  {a != null && <div className="flex justify-between"><span>Avg Score</span><span className="font-bold text-gray-700">{a}/{current.points}</span></div>}
                </div>
              );
            })()}
            <div className="mx-4 mb-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Quick Info</p>
              <div className="space-y-1.5">
                {[["Points", current.points], ["Attempts", current.allowedAttempts != null ? current.allowedAttempts : "∞"], ["Status", isPublished ? "Published" : "Draft"]].map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-500">{label}</span>
                    <span className="text-[11px] font-bold" style={{ color: label === "Status" ? availability.statusColor : "#374151" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ══ SUBMISSIONS TAB ══ */
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5" style={{ background: "#f8f8f7" }}>

          {/* Action bar */}
          <div className="flex items-center justify-end gap-2 mb-4 flex-wrap">
            {justRefreshed && (
              <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                <Check size={11} /> Updated
              </span>
            )}
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 bg-white disabled:opacity-50">
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={() => openSpeedGrader()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white rounded-lg hover:opacity-90"
              style={{ background: MAROON }}>
              <Zap size={12} /> SpeedGrader™
            </button>
          </div>

          <StatsBar submissions={submissions} dueDate={current.dueDate ?? null} maxPoints={current.points} />

          {/* Filter + search */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
                className="w-full h-9 pl-8 pr-3 text-xs border border-gray-200 rounded-xl outline-none focus:border-gray-400 bg-white" />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {(["all", "submitted", "graded", "missing", "late", "excused"] as FilterStatus[]).map(f => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className="px-2.5 py-1.5 text-[10px] font-bold border rounded-lg transition-all capitalize whitespace-nowrap"
                  style={filterStatus === f
                    ? { background: MAROON, color: "#fff", borderColor: MAROON }
                    : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <select value={sort} onChange={e => setSort(e.target.value as SortType)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none cursor-pointer text-gray-600 h-9">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name A–Z</option>
                <option value="grade">Grade (high)</option>
              </select>
              <span className="text-xs text-gray-400 whitespace-nowrap">{filteredSubmissions.length} shown</span>
            </div>
          </div>

          {/* Download bar */}
          {submitted.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3 shadow-sm flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                  <PackageOpen size={14} style={{ color: MAROON }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Download Submissions</p>
                  <p className="text-xs text-gray-400">{submitted.filter(s => s.fileUrl).length} file{submitted.filter(s => s.fileUrl).length !== 1 ? "s" : ""} · Includes grade info + status</p>
                </div>
              </div>
              <button onClick={handleDownloadAll} disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-red-50 disabled:opacity-50 whitespace-nowrap transition-all"
                style={{ color: MAROON, borderColor: "#f0c0c0" }}>
                {downloading ? "Preparing…" : "Download All (.zip)"}
              </button>
            </div>
          )}

          {/* Submissions list */}
          {filteredSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#fef2f2" }}>
                <FileText size={28} style={{ color: MAROON }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-600 mb-1">{search || filterStatus !== "all" ? "No results found" : "No submissions yet"}</p>
                <p className="text-xs text-gray-400">{search || filterStatus !== "all" ? "Try adjusting your filters" : "Submissions will appear here once students submit"}</p>
              </div>
              {(search || filterStatus !== "all") && (
                <button onClick={() => { setSearch(""); setFilterStatus("all"); }} className="text-xs font-bold hover:underline transition-colors" style={{ color: MAROON }}>Clear filters</button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((sub, i) => {
                const score = sub.points ?? (sub.grade != null ? parseFloat(sub.grade) : null);
                const hasFile = !!(sub.fileUrl || sub.onlineUrl || sub.textEntry);
                const late = sub.status === "LATE" || sub.isLate || isLateCheck(sub.submittedAt, current.dueDate ?? null);

                return (
                  <div key={`${sub.userId}-${i}`}
                    className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all"
                    style={{ borderColor: late && sub.submittedAt ? "#fecaca" : "#e5e7eb" }}>

                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                      <Avatar name={sub.userName ?? sub.userEmail} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-800 truncate">{sub.userName ?? sub.userEmail}</span>
                          <StatusBadge sub={sub} dueDate={current.dueDate ?? null} />
                        </div>
                        <p className="text-xs text-gray-400 truncate">{sub.userEmail}</p>
                      </div>
                      {score != null && sub.status !== "EXCUSED" ? (
                        <div className="text-right shrink-0">
                          <span className="text-lg font-black" style={{ color: MAROON }}>{score}</span>
                          <span className="text-sm text-gray-400 font-semibold">/{current.points}</span>
                        </div>
                      ) : sub.status === "EXCUSED" ? (
                        <span className="text-xs font-bold text-gray-400 shrink-0">Excused</span>
                      ) : sub.submittedAt ? (
                        <span className="text-sm text-gray-300 shrink-0">—/{current.points}</span>
                      ) : null}
                    </div>

                    <div className="px-4 py-3 space-y-2">
                      {sub.submittedAt ? (
                        <>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock size={10} className="shrink-0" />
                            <span>{fmtDateTime(sub.submittedAt)}</span>
                            {late && <span className="font-bold text-red-500">· Late</span>}
                            {sub.daysLate && sub.daysLate > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>{sub.daysLate}d late</span>
                            )}
                          </div>
                          {sub.fileUrl && sub.fileName && (
                            <div className="flex items-center gap-2">
                              <FileText size={11} style={{ color: MAROON }} className="shrink-0" />
                              <button onClick={() => setPreviewTarget(sub)} className="text-xs font-semibold truncate hover:underline text-left" style={{ color: MAROON }}>{sub.fileName}</button>
                              <a href={sub.fileUrl} download={sub.fileName} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 text-gray-400 hover:text-gray-600"><Download size={11} /></a>
                            </div>
                          )}
                          {sub.onlineUrl && (
                            <div className="flex items-center gap-2">
                              <ExternalLink size={11} className="shrink-0 text-gray-400" />
                              <a href={sub.onlineUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold truncate hover:underline" style={{ color: MAROON }}>{sub.onlineUrl}</a>
                            </div>
                          )}
                          {sub.textEntry && (
                            <p className="text-xs text-gray-600 italic leading-relaxed line-clamp-2 pl-1 border-l-2" style={{ borderColor: "#e5e7eb" }}>&ldquo;{sub.textEntry}&rdquo;</p>
                          )}
                          {sub.feedback && (
                            <div className="rounded-lg p-2.5 text-xs text-gray-600 leading-relaxed" style={{ background: "#fdf8f8", borderLeft: `3px solid ${MAROON}` }}>
                              <span className="text-[10px] font-black uppercase tracking-widest block mb-1" style={{ color: MAROON }}>Feedback</span>
                              {sub.feedback}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-400 italic"><AlertCircle size={11} />No submission received</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex-wrap">
                      {hasFile && sub.submittedAt && (
                        <button onClick={() => setPreviewTarget(sub)}
                          className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all hover:border-gray-400"
                          style={{ color: "#6b7280", borderColor: "#e5e7eb" }}>
                          <Eye size={10} /> Preview
                        </button>
                      )}
                      <button onClick={() => setGradingTarget(sub)}
                        className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ml-auto"
                        style={{ color: MAROON, borderColor: "#f0c0c0", background: "#fef2f2" }}>
                        <Star size={10} /> {score != null ? "Edit Grade" : "Grade"}
                      </button>
                      {sub.submittedAt && (
                        <button onClick={() => openSpeedGrader(sub.userId)}
                          className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all hover:border-gray-400"
                          style={{ color: "#6b7280", borderColor: "#e5e7eb" }}>
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
            <div className="mt-6 flex items-center justify-center pb-4">
              <button onClick={() => openSpeedGrader()} className="flex items-center gap-2 text-xs font-bold hover:underline transition-colors" style={{ color: MAROON }}>
                <Zap size={13} /> Open SpeedGrader™ for all submissions
              </button>
            </div>
          )}
        </div>
      )}

      {/* Assign To Side Panel */}
      {showAssignPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowAssignPanel(false)} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-85 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col" style={{ fontFamily: FONT }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100" style={{ background: MAROON }}>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Assign To</p>
                <p className="text-sm font-bold text-white truncate mt-0.5">{current.title}</p>
              </div>
              <button onClick={() => setShowAssignPanel(false)} className="text-white/60 hover:text-white transition-colors ml-2"><X size={16} /></button>
            </div>
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
              <p className="text-[10px] font-semibold text-gray-500">Assignment · {current.points} pts</p>
            </div>
            <div className="mx-4 mt-3 mb-1 flex gap-2.5 rounded-xl px-3 py-2 border" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
              <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
              <p className="text-xs text-blue-700 leading-relaxed font-medium">Select who should be assigned and set due dates.</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
              {assignRows.map((row, idx) => (
                <div key={row.id} className="space-y-3">
                  {idx > 0 && (
                    <div className="flex justify-between items-center pt-1">
                      <div className="h-px flex-1 bg-gray-100" />
                      <button onClick={() => removeAssignRow(row.id)} className="mx-3 text-xs font-bold text-red-400 hover:text-red-600">Remove</button>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Assign To</label>
                    <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenDrop(null); }}>
                      <div className="min-h-9 border-2 rounded-xl px-2 py-1.5 flex flex-wrap gap-1 items-center cursor-text bg-white"
                        style={{ borderColor: openDrop === row.id ? MAROON : "#e5e7eb" }}
                        onClick={() => setOpenDrop(row.id)}>
                        {row.assignees.map(a => (
                          <span key={a.id} className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: MAROON }}>
                            {a.label}
                            <button type="button" tabIndex={-1} onClick={e => { e.stopPropagation(); if (a.id === "everyone") return; toggleAssignee(row.id, a); }} className="opacity-70 hover:opacity-100 leading-none font-black">×</button>
                          </span>
                        ))}
                        <input value={dropSearch[row.id] ?? ""} onChange={e => { setDropSearch(p => ({ ...p, [row.id]: e.target.value })); setOpenDrop(row.id); }}
                          onFocus={() => setOpenDrop(row.id)} placeholder={row.assignees.length ? "" : "Search..."}
                          className="flex-1 min-w-20 text-xs outline-none bg-transparent py-0.5 text-gray-700 placeholder:text-gray-400" />
                        <ChevronDown size={13} className="text-gray-400 shrink-0" />
                      </div>
                      {openDrop === row.id && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded-xl z-200 max-h-48 overflow-y-auto">
                          {("everyone".includes((dropSearch[row.id] ?? "").toLowerCase()) || !(dropSearch[row.id] ?? "")) && (
                            <button type="button" tabIndex={0}
                              onMouseDown={e => { e.preventDefault(); selectEveryone(row.id); setDropSearch(p => ({ ...p, [row.id]: "" })); }}
                              className="w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-red-50 transition-colors"
                              style={row.assignees.some(a => a.id === "everyone") ? { color: MAROON } : { color: "#374151" }}>
                              Everyone
                              {row.assignees.some(a => a.id === "everyone") && <Check size={12} style={{ color: MAROON }} />}
                            </button>
                          )}
                          {enrolledUsers.filter(u => u.name.toLowerCase().includes((dropSearch[row.id] ?? "").toLowerCase())).map(u => (
                            <button type="button" key={u.id} tabIndex={0}
                              onMouseDown={e => { e.preventDefault(); toggleAssignee(row.id, { id: u.id, label: u.name }); setDropSearch(p => ({ ...p, [row.id]: "" })); }}
                              className="w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-red-50 transition-colors"
                              style={row.assignees.some(a => a.id === u.id) ? { color: MAROON } : { color: "#374151" }}>
                              <span>{u.name}{u.courseRole && <span className="ml-1 text-gray-400 font-normal">({u.courseRole})</span>}</span>
                              {row.assignees.some(a => a.id === u.id) && <Check size={12} style={{ color: MAROON }} />}
                            </button>
                          ))}
                          {enrolledUsers.filter(u => u.name.toLowerCase().includes((dropSearch[row.id] ?? "").toLowerCase())).length === 0 && !("everyone".includes((dropSearch[row.id] ?? "").toLowerCase())) && (
                            <div className="px-3 py-3 text-xs text-gray-400 text-center">No results</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {([ ["Due Date", "dueDate", "dueTime"], ["Available From", "availableFrom", "availableFromTime"], ["Until", "until", "untilTime"] ] as const).map(([label, dateField, timeField]) => (
                    <div key={label}>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">{label}</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input type="date" value={row[dateField]} onChange={e => updateAssignRow(row.id, dateField, e.target.value)}
                          className="flex-1 h-8 border border-gray-200 rounded-lg px-2 text-xs outline-none focus:border-gray-400 bg-white" />
                        <div className="flex items-center gap-1">
                          <select value={row[timeField]} onChange={e => updateAssignRow(row.id, timeField, e.target.value)}
                            className="h-8 border border-gray-200 rounded-lg px-1.5 text-xs bg-white outline-none focus:border-gray-400 w-full sm:w-28">
                            {ASSIGN_TIMES.map(t => <option key={t}>{t}</option>)}
                          </select>
                          <button onClick={() => updateAssignRow(row.id, dateField, "")} className="text-[10px] font-bold hover:underline shrink-0 transition-colors" style={{ color: MAROON }}>Clear</button>
                        </div>
                      </div>
                      {row[dateField] && <p className="text-[10px] text-gray-400 mt-1">{fmtLocalCourse(row[dateField], row[timeField])}</p>}
                    </div>
                  ))}
                </div>
              ))}
              <button onClick={addAssignRow} className="flex items-center gap-1.5 text-xs font-bold hover:underline transition-colors" style={{ color: MAROON }}>
                <span className="text-base leading-none">+</span> Add Row
              </button>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowAssignPanel(false)} className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
              <button onClick={saveAssignTo} disabled={savingAssign} className="flex-1 h-9 rounded-xl text-sm font-black text-white disabled:opacity-60 transition-all" style={{ background: MAROON }}>
                {savingAssign ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}