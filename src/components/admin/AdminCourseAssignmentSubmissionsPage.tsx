"use client";

// src/components/admin/AdminCourseAssignmentSubmissionsPage.tsx
// Route: /admin/courses/[id]/assignments/[assignmentId]/submissions

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Download, Zap, FileText, RefreshCw,
  Search, X, Check, AlertCircle,
  CheckCircle, Clock, Star, PackageOpen,
  Filter, Eye, ExternalLink,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string; title: string;
  points: number; status: "PUBLISHED" | "UNPUBLISHED";
  dueDate: string | null;
  assignmentGroup: string;
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
}

type FilterStatus = "all" | "submitted" | "graded" | "missing" | "late";
type SortType = "name" | "newest" | "oldest" | "grade";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isLate(submittedAt: string | null, dueDate: string | null): boolean {
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

// ── Grade Pill ─────────────────────────────────────────────────────────────────
function GradePill({ points, grade, maxPoints }: { points: number | null | undefined; grade?: string | null; maxPoints: number }) {
  const val = points != null ? points : (grade != null ? parseFloat(grade) : null);
  if (val == null || isNaN(val)) return (
    <span className="text-xs text-gray-400 italic">Not graded</span>
  );
  const color = getGradeColor(val, maxPoints);
  return (
    <span className="text-sm font-black" style={{ color }}>
      {val}<span className="text-xs font-normal text-gray-400">/{maxPoints}</span>
    </span>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ sub, dueDate }: { sub: Submission; dueDate: string | null }) {
  const late = isLate(sub.submittedAt, dueDate);
  const graded = sub.points != null || sub.grade != null;

  if (!sub.submittedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: "#fef2f2", color: MAROON, border: `1px solid #f0c0c0` }}>
        <Clock size={9} /> Missing
      </span>
    );
  }
  if (graded) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
        <CheckCircle size={9} /> Graded
      </span>
    );
  }
  if (late) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
        <AlertCircle size={9} /> Late
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
      <Check size={9} /> Submitted
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const colors = [MAROON, "#1d4ed8", "#16a34a", "#ea580c", "#7c3aed", "#0891b2"];
  const color = colors[(name.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div className="rounded-full flex items-center justify-center text-white font-black shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: color }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Grade Input Modal ──────────────────────────────────────────────────────────
function GradeModal({
  sub, assignment, onClose, onSave,
}: {
  sub: Submission;
  assignment: Assignment;
  onClose: () => void;
  onSave: (userId: string, points: number, feedback: string) => Promise<void>;
}) {
  const [points, setPoints] = useState<string>(sub.points != null ? String(sub.points) : "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    const p = parseFloat(points);
    if (isNaN(p) || p < 0 || p > assignment.points) return;
    setSaving(true);
    await onSave(sub.userId, p, feedback);
    setSaving(false);
    onClose();
  };

  const pct = points !== "" && !isNaN(parseFloat(points))
    ? Math.round((parseFloat(points) / assignment.points) * 100) : null;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-105 overflow-hidden border border-gray-100"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: MAROON }}>
          <div className="flex items-center gap-3">
            <Avatar name={sub.userName ?? sub.userEmail} size={34} />
            <div>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Grading</p>
              <p className="text-sm font-black text-white">{sub.userName ?? sub.userEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Assignment info */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold truncate">{assignment.title}</span>
            <span className="shrink-0 ml-2 font-bold" style={{ color: MAROON }}>Max: {assignment.points} pts</span>
          </div>

          {/* Submission info */}
          {sub.submittedAt && (
            <div className="rounded-lg p-3 text-xs text-gray-600 space-y-1" style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}>
              <p><span className="text-gray-400">Submitted:</span> {fmtDateTime(sub.submittedAt)}</p>
              {isLate(sub.submittedAt, assignment.dueDate) && (
                <p className="font-bold" style={{ color: "#dc2626" }}>⚠ Late submission</p>
              )}
              {sub.fileName && (
                <p className="flex items-center gap-1">
                  <FileText size={10} />
                  <a href={sub.fileUrl!} target="_blank" rel="noopener noreferrer"
                    className="hover:underline font-medium" style={{ color: MAROON }}>
                    {sub.fileName}
                  </a>
                </p>
              )}
              {sub.textEntry && (
                <p className="line-clamp-2 italic text-gray-500">&ldquo;{sub.textEntry}&rdquo;</p>
              )}
            </div>
          )}

          {/* Points input */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Score</label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="number"
                  min={0}
                  max={assignment.points}
                  step={0.5}
                  value={points}
                  onChange={e => setPoints(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
                  placeholder="0"
                  className="w-full h-11 border-2 rounded-xl px-3 text-xl font-black outline-none transition-colors text-center"
                  style={{ borderColor: points !== "" ? MAROON : "#e5e7eb", color: MAROON }}
                />
              </div>
              <span className="text-lg text-gray-400 font-bold">/ {assignment.points}</span>
              {pct !== null && (
                <span className="text-sm font-black shrink-0" style={{ color: getGradeColor(parseFloat(points), assignment.points) }}>
                  {pct}%
                </span>
              )}
            </div>

            {/* Quick grade buttons */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {[100, 90, 80, 70, 60, 0].map(pctVal => {
                const pts = Math.round((pctVal / 100) * assignment.points * 2) / 2;
                return (
                  <button key={pctVal} onClick={() => setPoints(String(pts))}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border transition-all hover:border-gray-400"
                    style={{
                      borderColor: parseFloat(points) === pts ? MAROON : "#e5e7eb",
                      color: parseFloat(points) === pts ? MAROON : "#6b7280",
                      background: parseFloat(points) === pts ? "#fef2f2" : "#f9fafb",
                    }}>
                    {pctVal}% ({pts})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Feedback (optional)</label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={3}
              placeholder="Write feedback for this student..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 outline-none focus:border-gray-400 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-2">
          <button onClick={onClose} className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || points === "" || isNaN(parseFloat(points)) || parseFloat(points) < 0 || parseFloat(points) > assignment.points}
            className="flex-1 h-9 rounded-xl text-sm font-black text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: MAROON }}
          >
            {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving...</> : <><Star size={13} /> Save Grade</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── File Preview Modal ─────────────────────────────────────────────────────────
function FilePreviewModal({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  if (!sub.fileUrl) return null;
  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: MAROON }}>
          <div className="flex items-center gap-2">
            <FileText size={13} className="text-white/70" />
            <span className="text-sm font-bold text-white truncate">{sub.fileName ?? "File"}</span>
          </div>
          <div className="flex items-center gap-2">
            <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-bold text-white/70 hover:text-white transition-colors">
              <ExternalLink size={11} /> Open
            </a>
            <a href={sub.fileUrl} download={sub.fileName ?? "file"}
              className="flex items-center gap-1 text-[10px] font-bold text-white/70 hover:text-white transition-colors">
              <Download size={11} /> Download
            </a>
            <button onClick={onClose} className="text-white/60 hover:text-white ml-1"><X size={15} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4" style={{ minHeight: 300 }}>
          {isImage(sub.fileUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sub.fileUrl} alt={sub.fileName ?? ""} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
          ) : isPdf(sub.fileUrl) ? (
            <iframe src={sub.fileUrl} title={sub.fileName ?? "PDF"} className="w-full rounded-lg border-0" style={{ height: "70vh" }} />
          ) : (
            <div className="flex flex-col items-center gap-4 text-gray-400">
              <FileText size={48} />
              <p className="text-sm">Preview not available for this file type.</p>
              <a href={sub.fileUrl} download={sub.fileName ?? "file"}
                className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg text-white"
                style={{ background: MAROON }}>
                <Download size={13} /> Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Submission Card ────────────────────────────────────────────────────────────
function SubmissionCard({
  sub, assignment, onGrade, onPreview,
}: {
  sub: Submission;
  assignment: Assignment;
  onGrade: (sub: Submission) => void;
  onPreview: (sub: Submission) => void;
}) {
  const late = isLate(sub.submittedAt, assignment.dueDate);
  const hasFile = !!sub.fileUrl;

  return (
    <div
      className="bg-white border rounded-xl overflow-hidden transition-all hover:shadow-md"
      style={{ borderColor: late && sub.submittedAt ? "#fecaca" : "#e5e7eb" }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <Avatar name={sub.userName ?? sub.userEmail} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-gray-900 truncate">{sub.userName ?? sub.userEmail}</span>
            <StatusBadge sub={sub} dueDate={assignment.dueDate} />
          </div>
          <p className="text-xs text-gray-400 truncate">{sub.userEmail}</p>
        </div>
        <GradePill points={sub.points} grade={sub.grade} maxPoints={assignment.points} />
      </div>

      {/* Submission details */}
      <div className="px-4 py-3 space-y-2">
        {sub.submittedAt ? (
          <>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock size={10} className="shrink-0" />
              <span>{fmtDateTime(sub.submittedAt)}</span>
              {late && <span className="font-bold text-red-500">· Late</span>}
            </div>

            {/* File */}
            {hasFile && sub.fileName && (
              <div className="flex items-center gap-2">
                <FileText size={11} style={{ color: MAROON }} className="shrink-0" />
                <button
                  onClick={() => onPreview(sub)}
                  className="text-xs font-semibold truncate hover:underline text-left"
                  style={{ color: MAROON }}
                >
                  {sub.fileName}
                </button>
                <a href={sub.fileUrl!} download={sub.fileName} target="_blank" rel="noopener noreferrer"
                  className="ml-auto shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                  <Download size={11} />
                </a>
              </div>
            )}

            {/* Online URL */}
            {sub.onlineUrl && (
              <div className="flex items-center gap-2">
                <ExternalLink size={11} className="shrink-0 text-gray-400" />
                <a href={sub.onlineUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold truncate hover:underline"
                  style={{ color: MAROON }}>
                  {sub.onlineUrl}
                </a>
              </div>
            )}

            {/* Text entry */}
            {sub.textEntry && (
              <p className="text-xs text-gray-600 italic leading-relaxed line-clamp-2 pl-1 border-l-2" style={{ borderColor: "#e5e7eb" }}>
                &ldquo;{sub.textEntry}&rdquo;
              </p>
            )}

            {/* Feedback */}
            {sub.feedback && (
              <div className="rounded-lg p-2.5 text-xs text-gray-600 leading-relaxed" style={{ background: "#f9fafb", borderLeft: `3px solid ${MAROON}` }}>
                <span className="text-[10px] font-black uppercase tracking-widest block mb-1" style={{ color: MAROON }}>Feedback</span>
                {sub.feedback}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-400 italic">
            <AlertCircle size={11} />
            No submission received
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50">
        {hasFile && (
          <button
            onClick={() => onPreview(sub)}
            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all hover:border-gray-400"
            style={{ color: "#6b7280", borderColor: "#e5e7eb" }}
          >
            <Eye size={10} /> Preview
          </button>
        )}
        <button
          onClick={() => onGrade(sub)}
          className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ml-auto"
          style={{
            color: MAROON, borderColor: "#f0c0c0", background: "#fef2f2",
          }}
        >
          <Star size={10} /> {sub.points != null ? "Edit Grade" : "Grade"}
        </button>
        <button
          onClick={() => window.open(`/admin/courses/${assignment.id}/assignments/${assignment.id}/speedgrader?student_id=${sub.userId}`, "_blank")}
          className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all hover:border-gray-400"
          style={{ color: "#6b7280", borderColor: "#e5e7eb" }}
        >
          <Zap size={10} /> SpeedGrader
        </button>
      </div>
    </div>
  );
}

// ── Summary Stats Bar ──────────────────────────────────────────────────────────
function StatsBar({ submissions, assignment }: { submissions: Submission[]; assignment: Assignment }) {
  const submitted = submissions.filter(s => s.submittedAt).length;
  const graded = submissions.filter(s => s.points != null || s.grade != null).length;
  const missing = submissions.filter(s => !s.submittedAt).length;
  const late = submissions.filter(s => isLate(s.submittedAt, assignment.dueDate)).length;

  const avgScore = (() => {
    const scored = submissions.filter(s => s.points != null);
    if (!scored.length) return null;
    const sum = scored.reduce((a, s) => a + (s.points ?? 0), 0);
    return Math.round((sum / scored.length) * 10) / 10;
  })();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      {[
        { label: "Submitted", value: submitted, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
        { label: "Graded", value: graded, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
        { label: "Missing", value: missing, color: MAROON, bg: "#fef2f2", border: "#f0c0c0" },
        { label: "Late", value: late, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
        {
          label: "Avg Score",
          value: avgScore != null ? `${avgScore}/${assignment.points}` : "—",
          color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb",
        },
      ].map(stat => (
        <div key={stat.label} className="rounded-xl border px-4 py-3 text-center"
          style={{ background: stat.bg, borderColor: stat.border }}>
          <p className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: stat.color }}>{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Zip Download Button ────────────────────────────────────────────────────────
function ZipDownloadButton({ submissions, assignmentTitle }: { submissions: Submission[]; assignmentTitle: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);

  const downloadable = submissions.filter(s => s.fileUrl && s.submittedAt);

  const handleDownload = useCallback(async () => {
    if (!downloadable.length) return;
    setState("loading");
    setProgress(0);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Group by student
      const byStudent: Record<string, Submission[]> = {};
      for (const sub of downloadable) {
        if (!byStudent[sub.userId]) byStudent[sub.userId] = [];
        byStudent[sub.userId].push(sub);
      }

      const total = downloadable.length;
      let done = 0;

      for (const [userId, subs] of Object.entries(byStudent)) {
        const studentName = (subs[0].userName ?? subs[0].userEmail)
          .replace(/[^a-z0-9\s]/gi, "").trim().replace(/\s+/g, "_");
        const folderName = `${studentName}_${userId.slice(-6)}`;
        const folder = zip.folder(folderName);
        if (!folder) continue;

        for (let i = 0; i < subs.length; i++) {
          const sub = subs[i];
          if (!sub.fileUrl) continue;
          const url = sub.fileUrl.startsWith("/") || sub.fileUrl.startsWith("http")
            ? sub.fileUrl : `/uploads/submissions/${sub.fileUrl}`;
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            let fileName = sub.fileName?.trim() || "";
            if (!fileName) {
              const urlPart = url.split("/").pop()?.split("?")[0] ?? "";
              const ext = urlPart.includes(".") ? urlPart.split(".").pop() : "bin";
              fileName = `submission_${i + 1}.${ext}`;
            }
            folder.file(fileName, blob);
          } catch { /* skip unreadable files */ }
          done++;
          setProgress(Math.round((done / total) * 100));
        }

        // Add grade info text file per student
        const sub = subs[0];
        const gradeLines = [
          `Student: ${sub.userName ?? sub.userEmail}`,
          `Email: ${sub.userEmail}`,
          `Submitted: ${sub.submittedAt ? fmtDateTime(sub.submittedAt) : "Not submitted"}`,
          `Score: ${sub.points != null ? sub.points : "Not graded"}`,
          `Feedback: ${sub.feedback ?? "—"}`,
        ].join("\n");
        folder.file("_grade_info.txt", gradeLines);
      }

      const blob = await zip.generateAsync({ type: "blob" }, (meta) => {
        setProgress(Math.round(meta.percent));
      });

      const safeName = assignmentTitle.replace(/[^a-z0-9]/gi, "_");
      const dateStr = new Date().toISOString().split("T")[0];
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${safeName}_submissions_${dateStr}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);

      setState("done");
      setTimeout(() => { setState("idle"); setProgress(0); }, 3000);
    } catch {
      setState("error");
      setTimeout(() => { setState("idle"); setProgress(0); }, 3000);
    }
  }, [downloadable, assignmentTitle]);

  const disabled = state === "loading" || !downloadable.length;

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleDownload}
        disabled={disabled}
        className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border transition-all disabled:opacity-50"
        style={state === "done"
          ? { background: "#f0fdf4", borderColor: "#bbf7d0", color: "#15803d" }
          : state === "error"
          ? { background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }
          : { background: "#fef2f2", borderColor: "#f0c0c0", color: MAROON }}
      >
        {state === "loading" ? (
          <><RefreshCw size={14} className="animate-spin" /> Preparing... {progress}%</>
        ) : state === "done" ? (
          <><Check size={14} /> Downloaded!</>
        ) : state === "error" ? (
          <>Failed — Try again</>
        ) : (
          <><PackageOpen size={14} /> Download All as .zip ({downloadable.length})</>
        )}
      </button>

      {state === "loading" && (
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: MAROON }}
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminCourseAssignmentSubmissionsPage({
  courseId, assignmentId,
}: { courseId: string; assignmentId: string }) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Grade modal
  const [gradingTarget, setGradingTarget] = useState<Submission | null>(null);

  // Preview modal
  const [previewTarget, setPreviewTarget] = useState<Submission | null>(null);

  // Filter / search / sort
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortType>("newest");

  const fetchData = useCallback(async () => {
    try {
      const [aRes, sRes] = await Promise.all([
        fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`),
        fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/submissions`),
      ]);
      const [aData, sData] = await Promise.all([aRes.json(), sRes.json()]);
      setAssignment(aData.assignment ?? null);
      setSubmissions(sData.submissions ?? []);
    } catch { /* silent */ }
    setLoading(false);
    setRefreshing(false);
  }, [courseId, assignmentId]);

  // Fixed: moved fetchData call outside the effect body into an async wrapper
  // to avoid calling setState synchronously inside an effect.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await fetchData();
      if (cancelled) return;
    };
    run();
    return () => { cancelled = true; };
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ── Grade save ─────────────────────────────────────────────────────────────
  const handleSaveGrade = async (userId: string, points: number, feedback: string) => {
    const sub = submissions.find(s => s.userId === userId);
    if (!sub?.id) return;

    const res = await fetch(
      `/api/admin/courses/${courseId}/assignments/${assignmentId}/submissions`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: sub.id, grade: points, feedback }),
      }
    );
    if (res.ok) {
      setSubmissions(prev =>
        prev.map(s =>
          s.userId === userId ? { ...s, points, grade: String(points), feedback } : s
        )
      );
    }
  };

  // ── Filter + sort logic ────────────────────────────────────────────────────
  const filtered = submissions
    .filter(s => {
      const q = search.trim().toLowerCase();
      if (q && !(s.userName ?? s.userEmail).toLowerCase().includes(q) && !s.userEmail.toLowerCase().includes(q)) return false;
      if (filterStatus === "submitted") return !!s.submittedAt;
      if (filterStatus === "graded") return s.points != null || s.grade != null;
      if (filterStatus === "missing") return !s.submittedAt;
      if (filterStatus === "late") return isLate(s.submittedAt, assignment?.dueDate ?? null);
      return true;
    })
    .sort((a, b) => {
      if (sort === "name") return (a.userName ?? a.userEmail).localeCompare(b.userName ?? b.userEmail);
      if (sort === "newest") return new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime();
      if (sort === "oldest") return new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime();
      if (sort === "grade") return (b.points ?? -1) - (a.points ?? -1);
      return 0;
    });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400" style={{ fontFamily: FONT }}>
      <RefreshCw size={16} className="animate-spin" /> Loading submissions...
    </div>
  );

  if (!assignment) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ fontFamily: FONT }}>
      <p className="text-sm text-gray-500">Assignment not found.</p>
      <button onClick={() => router.back()} className="text-sm font-bold hover:underline" style={{ color: MAROON }}>← Go back</button>
    </div>
  );

  const submitted = submissions.filter(s => s.submittedAt);

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT, background: "#f8f8f7" }}>

      {/* ── Grade Modal ── */}
      {gradingTarget && (
        <GradeModal
          sub={gradingTarget}
          assignment={assignment}
          onClose={() => setGradingTarget(null)}
          onSave={handleSaveGrade}
        />
      )}

      {/* ── Preview Modal ── */}
      {previewTarget && (
        <FilePreviewModal sub={previewTarget} onClose={() => setPreviewTarget(null)} />
      )}

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-start gap-3">
          {/* Back button */}
          <button
            onClick={() => router.push(`/admin/courses/${courseId}/assignments/${assignmentId}`)}
            className="mt-0.5 p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-800 transition-all shrink-0"
          >
            <ArrowLeft size={14} />
          </button>

          <div className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex-wrap">
              <span
                className="hover:underline cursor-pointer transition-colors"
                style={{ color: MAROON }}
                onClick={() => router.push(`/admin/courses/${courseId}/assignments`)}
              >
                Assignments
              </span>
              <span>/</span>
              <span
                className="hover:underline cursor-pointer transition-colors"
                style={{ color: MAROON }}
                onClick={() => router.push(`/admin/courses/${courseId}/assignments/${assignmentId}`)}
              >
                {assignment.title}
              </span>
              <span>/</span>
              <span className="text-gray-500">Submissions</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-gray-900">Submissions</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-bold" style={{ background: MAROON }}>
                {submitted.length}
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-sm font-semibold text-gray-600 truncate">{assignment.title}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-sm font-bold" style={{ color: MAROON }}>{assignment.points} pts</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => window.open(`/admin/courses/${courseId}/assignments/${assignmentId}/speedgrader`, "_blank")}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all text-white"
              style={{ background: MAROON }}
            >
              <Zap size={12} />
              <span className="hidden sm:inline">SpeedGrader™</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">

        {/* Stats */}
        <StatsBar submissions={submissions} assignment={assignment} />

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 flex items-center gap-3 flex-wrap shadow-sm">

          {/* Search */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 min-w-45 max-w-xs focus-within:border-gray-400 transition-colors">
            <Search size={12} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students..."
              className="flex-1 text-xs outline-none bg-transparent text-gray-700 placeholder:text-gray-400"
            />
            {search && <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600"><X size={11} /></button>}
          </div>

          {/* Filter status */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
            {(["all", "submitted", "graded", "missing", "late"] as FilterStatus[]).map(f => (
              <button key={f}
                onClick={() => setFilterStatus(f)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-md capitalize transition-all whitespace-nowrap"
                style={{
                  background: filterStatus === f ? "#fff" : "transparent",
                  color: filterStatus === f ? "#1f2937" : "#6b7280",
                  boxShadow: filterStatus === f ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 ml-auto">
            <Filter size={11} className="text-gray-400" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortType)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none cursor-pointer text-gray-600"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="grade">Grade (high)</option>
            </select>
          </div>

          <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} shown</span>
        </div>

        {/* Download bar */}
        {submitted.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-3 shadow-sm flex-wrap">
            <div className="flex items-center gap-2">
              <PackageOpen size={14} style={{ color: MAROON }} />
              <div>
                <p className="text-sm font-bold text-gray-800">Download Submissions</p>
                <p className="text-xs text-gray-400">
                  {submitted.filter(s => s.fileUrl).length} file{submitted.filter(s => s.fileUrl).length !== 1 ? "s" : ""} · Organized by student folder · Includes grade info
                </p>
              </div>
            </div>
            <ZipDownloadButton submissions={submissions} assignmentTitle={assignment.title} />
          </div>
        )}

        {/* Submissions grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#fef2f2" }}>
              <FileText size={28} style={{ color: MAROON }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-600 mb-1">
                {search || filterStatus !== "all" ? "No results found" : "No submissions yet"}
              </p>
              <p className="text-xs text-gray-400">
                {search || filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "Submissions will appear here once students submit"}
              </p>
            </div>
            {(search || filterStatus !== "all") && (
              <button
                onClick={() => { setSearch(""); setFilterStatus("all"); }}
                className="text-xs font-bold hover:underline transition-colors"
                style={{ color: MAROON }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((sub, i) => (
              <SubmissionCard
                key={`${sub.userId}-${i}`}
                sub={sub}
                assignment={assignment}
                onGrade={setGradingTarget}
                onPreview={setPreviewTarget}
              />
            ))}
          </div>
        )}

        {/* Bottom SpeedGrader link */}
        {filtered.length > 0 && (
          <div className="mt-6 flex items-center justify-center">
            <button
              onClick={() => window.open(`/admin/courses/${courseId}/assignments/${assignmentId}/speedgrader`, "_blank")}
              className="flex items-center gap-2 text-xs font-bold hover:underline transition-colors"
              style={{ color: MAROON }}
            >
              <Zap size={13} /> Open SpeedGrader™ for all submissions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}