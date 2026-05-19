"use client";

// src/components/layout/course/CourseRepositoriesTab.tsx
//
// Unified view of all assignments + forms the Head has published in this course.
// UI/UX ported from AdminCourseRepositoriesPage for consistency.

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import {
  Search, RefreshCw, Folder, ChevronRight,
  FileText, CheckCircle, BookOpen, Filter,
  Users, TrendingUp, X, Download,
  Eye, PackageOpen, Check,
  ChevronDown, Music,
  Archive, Image as ImageIcon, Film, ArrowUpRight,
  SlidersHorizontal, Plus,
} from "lucide-react";
import { FONT, MAROON } from "./helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RepoFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
  submission?: {
    id: string; status: string; grade: number | null;
    feedback: string | null; submittedAt: string | null;
  } | null;
}

interface AssignmentRepo {
  id: string; name: string; hasRepo: boolean; createdAt: string;
  assignmentId: string;
  assignment: {
    id: string; title: string; dueDate: string | null; points: number;
    status: string; submissionCount: number; enrollmentCount: number;
  };
  files: RepoFile[];
  _count: { files: number; logs: number };
}

interface FormItem {
  id: string; title: string; formType: string; points: number;
  published: boolean; dueDate: string | null; createdAt: string;
  _count?: { formSubmissions: number };
  _formRole?: string;
  isCreator?: boolean;
}

interface FormSubmission {
  id: string; createdAt: string; score: number | null; totalPoints: number;
  user: { name: string | null; email: string; courseRole: string; section: string | null };
  answers: {
    questionId: string; question: string; type: string;
    points: number; answer: string | null;
  }[];
}

interface Row {
  kind: "assignment" | "form";
  id: string;
  repoId: string | null;
  assignmentId: string | null;
  hasRepo: boolean;
  name: string;
  subtitle: string;
  dueDate: string | null;
  status: string;
  submitted: number;
  enrolled: number;
  fileCount: number;
  logCount: number;
  createdAt: string;
  files: RepoFile[];
  points: number;
}

type TabType  = "all" | "assignments" | "forms";
type SortType = "newest" | "oldest" | "name" | "submissions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate  = (iso: string | null) =>
  !iso ? "—" : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
  " " +
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();

const fmtSize = (b: number | null) =>
  !b ? "—" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

const isImage = (u: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(u.split("?")[0]);
const isPdf   = (u: string) => /\.pdf$/i.test(u.split("?")[0]);
const isVideo = (u: string) => /\.(mp4|webm|mov|avi|mkv)$/i.test(u.split("?")[0]);
const isAudio = (u: string) => /\.(mp3|wav|ogg|m4a|aac)$/i.test(u.split("?")[0]);
const isDoc   = (u: string) => /\.(doc|docx)$/i.test(u.split("?")[0]);
const isSheet = (u: string) => /\.(xls|xlsx)$/i.test(u.split("?")[0]);
const isZip   = (u: string) => /\.(zip|rar|7z)$/i.test(u.split("?")[0]);

function fmtDue(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso), now = Date.now(), diff = d.getTime() - now, days = diff / 86400000;
  if (diff < 0)  return { label: "Overdue",                    color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
  if (days <= 1) return { label: "Due today",                  color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
  if (days <= 3) return { label: `Due in ${Math.ceil(days)}d`, color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
  if (days <= 7) return { label: `Due in ${Math.ceil(days)}d`, color: "#ca8a04", bg: "#fefce8", border: "#fef08a" };
  return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
}

function formTypeLabel(t: string) {
  const m: Record<string, string> = {
    SURVEY_FEEDBACK: "Survey", EVALUATION: "Evaluation",
    REGISTRATION_FORM: "Registration", GRADED_ASSESSMENT: "Assessment",
    "Survey / Feedback": "Survey", "Evaluation": "Evaluation",
    "Registration Form": "Registration", "Graded Assessment": "Assessment",
  };
  return m[t] ?? t;
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function FTIcon({ url, size = 14 }: { url: string; size?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = { size, style: { flexShrink: 0 } };
  if (isImage(url))  return <ImageIcon {...p} style={{ ...p.style, color: "#0891b2" }} />;
  if (isPdf(url))    return <FileText  {...p} style={{ ...p.style, color: "#dc2626" }} />;
  if (isVideo(url))  return <Film      {...p} style={{ ...p.style, color: "#7c3aed" }} />;
  if (isAudio(url))  return <Music     {...p} style={{ ...p.style, color: "#2563eb" }} />;
  if (isDoc(url))    return <FileText  {...p} style={{ ...p.style, color: "#1d4ed8" }} />;
  if (isSheet(url))  return <FileText  {...p} style={{ ...p.style, color: "#16a34a" }} />;
  if (isZip(url))    return <Archive   {...p} style={{ ...p.style, color: "#92400e" }} />;
  return <FileText {...p} style={{ ...p.style, color: "#6b7280" }} />;
}

function UAv({ name, image, size = 28 }: { name: string | null; image: string | null; size?: number }) {
  const pal = [MAROON, "#1d4ed8", "#16a34a", "#ea580c", "#7c3aed", "#0891b2"];
  const idx = (name?.charCodeAt(0) ?? 0) % pal.length;
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name ?? ""} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, outline: "2px solid #fff", outlineOffset: "-1px" }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: pal[idx], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.38, flexShrink: 0, outline: "2px solid #fff", outlineOffset: "-1px" }}>
      {(name ?? "?")[0].toUpperCase()}
    </div>
  );
}

function DuePill({ dueDate }: { dueDate: string | null }) {
  const m = fmtDue(dueDate);
  if (!m) return <span style={{ fontSize: 11, color: "#d1d5db", fontWeight: 500 }}>No due date</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: m.bg, color: m.color, border: `1px solid ${m.border}`, whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
}

function ProgressBar({ submitted, enrolled }: { submitted: number; enrolled: number }) {
  const pct = enrolled > 0 ? Math.min(100, Math.round((submitted / enrolled) * 100)) : submitted > 0 ? 100 : 0;
  const color = pct === 100 ? "#16a34a" : pct >= 60 ? "#d97706" : MAROON;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <div style={{ flex: 1, height: 5, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 900, color, minWidth: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
    </div>
  );
}

function TypeBadge({ kind, subtitle }: { kind: "assignment" | "form"; subtitle: string }) {
  return kind === "form"
    ? <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "#eff6ff", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{subtitle}</span>
    : <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "#fef2f2", color: MAROON, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>Assignment</span>;
}

function StatusDot({ status }: { status: string }) {
  const ok = status === "PUBLISHED" || status === "published";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ok ? "#f0fdf4" : "#f9fafb", color: ok ? "#15803d" : "#9ca3af", border: `1px solid ${ok ? "#bbf7d0" : "#e5e7eb"}`, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: ok ? "#22c55e" : "#d1d5db", flexShrink: 0 }} />
      {ok ? "Live" : "Draft"}
    </span>
  );
}

function StatCard({ label, value, icon, accent, sub }: {
  label: string; value: number; icon: React.ReactNode; accent: string; sub?: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ borderRadius: 8, padding: 8, background: "#f9fafb", color: accent, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 20, fontWeight: 900, color: "#111827", lineHeight: 1, margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
        {sub && <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────

function RepoCard({ row, selected, onClick }: { row: Row; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? "#fdf2f2" : "#fff",
        border: `1px solid ${selected ? "rgba(123,17,19,0.25)" : "#e5e7eb"}`,
        borderLeft: `3px solid ${selected ? MAROON : "transparent"}`,
        borderRadius: 12, padding: "12px 14px", cursor: "pointer",
        transition: "all 0.15s",
        boxShadow: selected ? "0 2px 8px rgba(123,17,19,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
          background: row.kind === "assignment" ? "#fef2f2" : "#eff6ff",
          border: `1px solid ${row.kind === "assignment" ? "rgba(123,17,19,0.1)" : "rgba(29,78,216,0.1)"}`,
        }}>
          {row.kind === "assignment"
            ? <Folder size={14} style={{ color: MAROON }} />
            : <FileText size={14} style={{ color: "#1d4ed8" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: selected ? MAROON : "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "calc(100% - 80px)" }}>
              {row.name}
            </span>
            <TypeBadge kind={row.kind} subtitle={row.subtitle} />
          </div>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{row.submitted} submitted</span>
        </div>
        <StatusDot status={row.status} />
      </div>
      {row.kind === "assignment" && row.enrolled > 0 && (
        <div style={{ marginBottom: 8 }}>
          <ProgressBar submitted={row.submitted} enrolled={row.enrolled} />
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <DuePill dueDate={row.dueDate} />
        <ChevronRight size={13} style={{ color: selected ? MAROON : "#d1d5db" }} />
      </div>
    </div>
  );
}

// ─── Desktop List Row ─────────────────────────────────────────────────────────

function RepoRow({ row, selected, onClick }: { row: Row; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "13px 20px", borderBottom: "1px solid #f3f4f6",
        cursor: "pointer", transition: "background 0.1s",
        background: selected ? "#fdf2f2" : "transparent",
        borderLeft: `3px solid ${selected ? MAROON : "transparent"}`,
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#fafafa"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0,
        background: row.kind === "assignment" ? "#fef2f2" : "#eff6ff",
      }}>
        {row.kind === "assignment"
          ? <Folder size={15} style={{ color: MAROON }} />
          : <FileText size={15} style={{ color: "#1d4ed8" }} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: selected ? MAROON : "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.name}
          </span>
          <TypeBadge kind={row.kind} subtitle={row.subtitle} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#9ca3af" }}>
          {row.kind === "assignment" && (
            <><span>{row.fileCount} file{row.fileCount !== 1 ? "s" : ""}</span><span style={{ color: "#e5e7eb" }}>·</span></>
          )}
          <span>{row.submitted} submitted</span>
        </div>
      </div>

      <div style={{ width: 140, flexShrink: 0 }}>
        {row.kind === "assignment" && row.enrolled > 0 ? (
          <div>
            <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>{row.submitted}/{row.enrolled}</p>
            <ProgressBar submitted={row.submitted} enrolled={row.enrolled} />
          </div>
        ) : row.kind === "form" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
            <Users size={11} /><span style={{ fontWeight: 600 }}>{row.submitted} response{row.submitted !== 1 ? "s" : ""}</span>
          </div>
        ) : <span style={{ fontSize: 11, color: "#e5e7eb" }}>—</span>}
      </div>

      <div style={{ width: 110, flexShrink: 0 }}><DuePill dueDate={row.dueDate} /></div>
      <div style={{ width: 80, flexShrink: 0, display: "flex", justifyContent: "center" }}><StatusDot status={row.status} /></div>
      <ChevronRight size={13} style={{ color: selected ? MAROON : "#d1d5db", flexShrink: 0 }} />
    </div>
  );
}

// ─── Bulk Download ────────────────────────────────────────────────────────────

function BulkDownloadButton({ files, assignmentTitle }: { files: RepoFile[]; assignmentTitle: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleDownload = async () => {
    if (files.length === 0) return;
    setState("loading");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const byStudent: Record<string, RepoFile[]> = {};
      for (const f of files) { if (!byStudent[f.user.id]) byStudent[f.user.id] = []; byStudent[f.user.id].push(f); }
      for (const [, studentFiles] of Object.entries(byStudent)) {
        const sName = (studentFiles[0].user.name ?? studentFiles[0].user.email).replace(/[^a-z0-9\s]/gi, "").trim().replace(/\s+/g, "_");
        const folder = zip.folder(sName);
        if (!folder) continue;
        for (let i = 0; i < studentFiles.length; i++) {
          const sf = studentFiles[i];
          try {
            const res = await fetch(sf.fileUrl);
            const blob = await res.blob();
            folder.file(studentFiles.length > 1 ? `${i + 1}_${sf.fileName}` : sf.fileName, blob);
          } catch { /* skip */ }
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${assignmentTitle.replace(/[^a-z0-9]/gi, "_")}_all_submissions.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      setState("done"); setTimeout(() => setState("idle"), 3000);
    } catch { setState("error"); setTimeout(() => setState("idle"), 3000); }
  };

  const styles: Record<string, React.CSSProperties> = {
    idle:    { borderColor: "#e5e7eb", color: "#374151", background: "#fff" },
    loading: { borderColor: "#e5e7eb", color: "#9ca3af", background: "#f9fafb" },
    done:    { borderColor: "#bbf7d0", color: "#15803d", background: "#f0fdf4" },
    error:   { borderColor: "#fecaca", color: "#dc2626", background: "#fef2f2" },
  };

  return (
    <button
      onClick={handleDownload}
      disabled={state === "loading" || files.length === 0}
      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, padding: "6px 10px", border: "1px solid", borderRadius: 8, cursor: files.length === 0 ? "default" : "pointer", opacity: files.length === 0 ? 0.5 : 1, transition: "all 0.15s", whiteSpace: "nowrap", ...styles[state] }}
    >
      {state === "loading" ? <><RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> Preparing...</>
        : state === "done"  ? <><Check size={12} /> Done!</>
        : state === "error" ? "Failed"
        : <><PackageOpen size={12} /> Download All ({files.length})</>}
    </button>
  );
}

// ─── Student Section ──────────────────────────────────────────────────────────

function StudentSection({ user, files, points, onPreview }: {
  user: { id: string; name: string | null; email: string; image: string | null };
  files: RepoFile[]; points: number; onPreview: (f: RepoFile) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderBottom: "1px solid #f9fafb" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}
      >
        {open ? <ChevronDown size={12} style={{ color: "#9ca3af", flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: "#9ca3af", flexShrink: 0 }} />}
        <UAv name={user.name} image={user.image} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name ?? user.email}</p>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
        </div>
        <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{files.length} file{files.length !== 1 ? "s" : ""}</span>
      </button>
      {open && (
        <div style={{ margin: "0 16px 10px 52px", border: "1px solid #f3f4f6", borderRadius: 10, overflow: "hidden" }}>
          {files.map((f, i) => (
            <div
              key={f.id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: i < files.length - 1 ? "1px solid #f9fafb" : "none", flexWrap: "wrap" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fef9f9")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <FTIcon url={f.fileUrl} size={13} />
              <button
                onClick={() => onPreview(f)}
                style={{ flex: 1, fontSize: 12, fontWeight: 600, color: MAROON, textAlign: "left", background: "none", border: "none", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: 0, minWidth: 80 }}
              >
                {f.fileName}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmtShort(f.uploadedAt)}</span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmtSize(f.fileSize)}</span>
                {points > 0 && (f.submission?.grade != null
                  ? <span style={{ fontSize: 12, fontWeight: 900, color: MAROON }}>{f.submission.grade}<span style={{ color: "#9ca3af", fontWeight: 400 }}>/{points}</span></span>
                  : <span style={{ fontSize: 12, color: "#d1d5db" }}>—/{points}</span>
                )}
                <button
                  onClick={() => onPreview(f)} title="Preview"
                  style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, border: "none", background: "none", cursor: "pointer", color: "#9ca3af" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  <Eye size={11} />
                </button>
                <a
                  href={f.fileUrl} download={f.fileName} target="_blank" rel="noopener noreferrer"
                  style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, color: "#9ca3af", textDecoration: "none" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#f3f4f6")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                >
                  <Download size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Form Response Card ───────────────────────────────────────────────────────

function FormResponseCard({ sub }: { sub: FormSubmission }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #f9fafb" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}
      >
        {open ? <ChevronDown size={12} style={{ color: "#9ca3af", flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: "#9ca3af", flexShrink: 0 }} />}
        <UAv name={sub.user.name} image={null} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.user.name ?? sub.user.email}</p>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{sub.user.email}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {sub.totalPoints > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: sub.score != null ? MAROON : "#9ca3af" }}>
              {sub.score != null ? `${sub.score}/${sub.totalPoints}` : `—/${sub.totalPoints}`}
            </span>
          )}
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmtDate(sub.createdAt)}</span>
        </div>
      </button>
      {open && (
        <div style={{ margin: "0 16px 12px 52px", display: "flex", flexDirection: "column", gap: 8 }}>
          {sub.answers.length === 0
            ? <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>No answers recorded</p>
            : sub.answers.map((a, i) => (
              <div key={i} style={{ border: "1px solid #f3f4f6", borderRadius: 8, padding: "10px 12px", background: "#fafafa" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", margin: "0 0 4px" }}>{a.question}</p>
                <p style={{ fontSize: 13, color: "#1f2937", margin: 0, wordBreak: "break-word" }}>
                  {a.answer ?? <span style={{ color: "#9ca3af", fontStyle: "italic" }}>No answer</span>}
                </p>
                {a.points > 0 && <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>{a.points} pt{a.points !== 1 ? "s" : ""}</p>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Mobile Filter Sheet ──────────────────────────────────────────────────────

function MobileFilterSheet({ tab, setTab, sort, setSort, onClose, tabItems }: {
  tab: TabType; setTab: (t: TabType) => void;
  sort: SortType; setSort: (s: SortType) => void;
  onClose: () => void;
  tabItems: { key: TabType; label: string; count: number }[];
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 61, background: "#fff", borderRadius: "16px 16px 0 0", padding: "0 0 env(safe-area-inset-bottom)", fontFamily: FONT, boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}>
        <div style={{ width: 36, height: 4, borderRadius: 99, background: "#e5e7eb", margin: "12px auto 0" }} />
        <div style={{ padding: "12px 20px 20px" }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Filter by type</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            {tabItems.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); onClose(); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, border: `1px solid ${tab === t.key ? MAROON : "#e5e7eb"}`, background: tab === t.key ? "#fef2f2" : "#fff", cursor: "pointer" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: tab === t.key ? MAROON : "#374151" }}>{t.label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: tab === t.key ? MAROON : "#f3f4f6", color: tab === t.key ? "#fff" : "#6b7280" }}>{t.count}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Sort by</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {([
              { value: "newest" as SortType,      label: "Newest first"  },
              { value: "oldest" as SortType,      label: "Oldest first"  },
              { value: "name" as SortType,        label: "Name A–Z"      },
              { value: "submissions" as SortType, label: "Most submitted" },
            ]).map(s => (
              <button key={s.value} onClick={() => { setSort(s.value); onClose(); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, border: `1px solid ${sort === s.value ? MAROON : "#e5e7eb"}`, background: sort === s.value ? "#fef2f2" : "#fff", cursor: "pointer" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: sort === s.value ? MAROON : "#374151" }}>{s.label}</span>
                {sort === s.value && <Check size={14} style={{ color: MAROON }} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Quick Create Button ──────────────────────────────────────────────────────

function QuickCreateButton({ onCreateAssignment, onCreateForm }: {
  onCreateAssignment: () => void;
  onCreateForm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#fff", background: MAROON, border: "none", padding: "7px 14px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}
      >
        <Plus size={13} /> Create
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: 180 }}>
          <button
            onClick={() => { onCreateAssignment(); setOpen(false); }}
            style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, fontWeight: 600, color: MAROON, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, minHeight: 40 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <Folder size={13} /> New Assignment
          </button>
          <div style={{ borderTop: "1px solid #f3f4f6" }} />
          <button
            onClick={() => { onCreateForm(); setOpen(false); }}
            style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#1d4ed8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, minHeight: 40 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <FileText size={13} /> New Form
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Repository Drawer ────────────────────────────────────────────────────────

function RepositoryDrawer({ row, courseId, onClose, onNavigate }: {
  row: Row; courseId: string; onClose: () => void;
  onNavigate: (kind: "assignment" | "form", id: string) => void;
}) {
  const [formSubs,    setFormSubs]    = useState<FormSubmission[]>([]);
  const [loadingForm, setLoadingForm] = useState(false);
  const [previewFile, setPreviewFile] = useState<RepoFile | null>(null);
  const [isMobile,    setIsMobile]    = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fetch form submissions
  useEffect(() => {
    if (row.kind !== "form") return;
    const ctrl = new AbortController();
    const load = async () => {
      setLoadingForm(true);
      try {
        const res  = await fetch(`/api/courses/${courseId}/forms/${row.id}/submissions`, { signal: ctrl.signal });
        const json = await res.json();
        setFormSubs(json.submissions ?? []);
      } catch {
        if (!ctrl.signal.aborted) setFormSubs([]);
      } finally {
        if (!ctrl.signal.aborted) setLoadingForm(false);
      }
    };
    load();
    return () => ctrl.abort();
  }, [row.id, row.kind, courseId]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !previewFile) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, previewFile]);

  const files = row.files ?? [];
  const filesByUser: Record<string, RepoFile[]> = {};
  files.forEach(f => { if (!filesByUser[f.user.id]) filesByUser[f.user.id] = []; filesByUser[f.user.id].push(f); });
  const submittedCount = Object.keys(filesByUser).length;

  const drawerStyle: React.CSSProperties = isMobile
    ? { position: "fixed", left: 0, right: 0, bottom: 0, top: "10vh", zIndex: 50, background: "#fff", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", fontFamily: FONT, borderRadius: "16px 16px 0 0", overflow: "hidden" }
    : { position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50, width: "min(580px, 100vw)", background: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column", fontFamily: FONT };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.28)", backdropFilter: "blur(2px)" }} />
      <div style={drawerStyle}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {isMobile && <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(0,0,0,0.15)", margin: "10px auto 0", flexShrink: 0 }} />}

        {/* Header */}
        <div style={{ background: MAROON, padding: isMobile ? "10px 16px 14px" : "14px 20px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.18em", margin: "0 0 4px" }}>
                {row.kind === "assignment" ? "Assignment Repository" : row.subtitle}
              </p>
              <h2 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.name}
              </h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => onNavigate(row.kind, row.kind === "assignment" ? (row.assignmentId ?? row.id) : row.id)}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 7, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <ArrowUpRight size={12} />
                {!isMobile && " Full view"}
              </button>
              <button
                onClick={onClose}
                style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #f3f4f6", background: "#fdf8f8", flexShrink: 0, overflowX: "auto" }}>
          {row.kind === "assignment" ? (
            <>
              <div style={{ padding: isMobile ? "8px 14px" : "10px 16px", borderRight: "1px solid #f3f4f6", flexShrink: 0 }}>
                <p style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900, color: "#111827", margin: 0, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{submittedCount}</p>
                <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, margin: "3px 0 0", whiteSpace: "nowrap" }}>Submitted</p>
              </div>
              <div style={{ padding: isMobile ? "8px 14px" : "10px 16px", borderRight: "1px solid #f3f4f6", flexShrink: 0 }}>
                <p style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900, color: "#111827", margin: 0, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{files.length}</p>
                <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, margin: "3px 0 0", whiteSpace: "nowrap" }}>Files</p>
              </div>
              {row.enrolled > 0 && (
                <div style={{ flex: 1, minWidth: 100, padding: isMobile ? "8px 14px" : "10px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>Submission rate</span>
                    <span style={{ fontSize: 10, fontWeight: 900, color: MAROON }}>{Math.round((submittedCount / row.enrolled) * 100)}%</span>
                  </div>
                  <ProgressBar submitted={submittedCount} enrolled={row.enrolled} />
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: isMobile ? "8px 14px" : "10px 16px", flexShrink: 0 }}>
              <p style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900, color: "#111827", margin: 0, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{formSubs.length}</p>
              <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, margin: "3px 0 0", whiteSpace: "nowrap" }}>Responses</p>
            </div>
          )}
          <div style={{ padding: isMobile ? "8px 12px" : "10px 14px", flexShrink: 0, marginLeft: "auto" }}>
            <DuePill dueDate={row.dueDate} />
          </div>
        </div>

        {/* Assignment info + bulk download */}
        {row.kind === "assignment" && files.length > 0 && (
          <div style={{ padding: "8px 16px", background: "#fafafa", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6b7280", minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
              {row.points > 0 && <><span style={{ color: "#e5e7eb" }}>·</span><span style={{ fontWeight: 600, color: MAROON, flexShrink: 0 }}>{row.points} pts</span></>}
            </div>
            <BulkDownloadButton files={files} assignmentTitle={row.name} />
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingForm ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 12, color: "#9ca3af" }}>
              <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 12 }}>Loading...</span>
            </div>
          ) : row.kind === "assignment" ? (
            submittedCount === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Folder size={24} style={{ color: MAROON }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#4b5563", margin: "0 0 4px" }}>No submissions yet</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Files will appear when students submit</p>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", background: "#fef9f9", borderBottom: "1px solid #fce8e8" }}>
                  <div style={{ flex: 1, fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em" }}>Student</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em" }}>Files</div>
                </div>
                {Object.entries(filesByUser).map(([uid, uFiles]) => (
                  <StudentSection key={uid} user={uFiles[0].user} files={uFiles} points={row.points} onPreview={setPreviewFile} />
                ))}
              </>
            )
          ) : (
            formSubs.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={24} style={{ color: "#3b82f6" }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#4b5563", margin: 0, textAlign: "center" }}>No responses yet</p>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, textAlign: "center" }}>Responses will appear when staff submit</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", background: "#eff6ff", borderBottom: "1px solid #dbeafe" }}>
                  <div style={{ flex: 1, fontSize: 10, fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {formSubs.length} response{formSubs.length !== 1 ? "s" : ""}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Submitted</div>
                </div>
                {formSubs.map(s => <FormResponseCard key={s.id} sub={s} />)}
              </>
            )
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 12 : 24, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setPreviewFile(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: isMobile ? 12 : 16, overflow: "hidden", display: "flex", flexDirection: isMobile ? "column" : "row", boxShadow: "0 32px 80px rgba(0,0,0,0.3)", width: "100%", maxWidth: 800, maxHeight: isMobile ? "90dvh" : "90vh" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ flex: 1, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, minHeight: isMobile ? 200 : 0, overflow: "auto" }}>
              {isImage(previewFile.fileUrl)
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={previewFile.fileUrl} alt={previewFile.fileName} style={{ maxWidth: "100%", maxHeight: isMobile ? 260 : "80vh", objectFit: "contain", borderRadius: 8 }} />
                : isVideo(previewFile.fileUrl)
                ? <video src={previewFile.fileUrl} controls style={{ maxWidth: "100%", maxHeight: isMobile ? 260 : "80vh", borderRadius: 8 }} />
                : isPdf(previewFile.fileUrl)
                ? <iframe src={previewFile.fileUrl} title={previewFile.fileName} style={{ width: "100%", height: isMobile ? 260 : "80vh", borderRadius: 8, border: "none" }} />
                : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: "#6b7280" }}>
                    <FTIcon url={previewFile.fileUrl} size={48} />
                    <p style={{ fontSize: 13, margin: 0 }}>Preview not available</p>
                    <a href={previewFile.fileUrl} download target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: MAROON }}>↓ Download to view</a>
                  </div>
                )}
            </div>
            <div style={{ width: isMobile ? "100%" : 200, flexShrink: 0, background: "#fff", borderLeft: isMobile ? "none" : "1px solid #f3f4f6", borderTop: isMobile ? "1px solid #f3f4f6" : "none", display: "flex", flexDirection: "column", maxHeight: isMobile ? 220 : undefined }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: MAROON, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewFile.fileName}</span>
                <button onClick={() => setPreviewFile(null)} style={{ color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", display: "flex", marginLeft: 6 }}>
                  <X size={13} />
                </button>
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: isMobile ? "row" : "column", gap: isMobile ? 20 : 16, fontSize: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <UAv name={previewFile.user.name} image={previewFile.user.image} size={26} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#1f2937", margin: 0 }}>{previewFile.user.name ?? "—"}</p>
                    <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>{fmtSize(previewFile.fileSize)}</p>
                  </div>
                </div>
                <a
                  href={previewFile.fileUrl} download={previewFile.fileName} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280", textDecoration: "none" }}
                >
                  <Download size={12} /> Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  courseId: string;
  isHead: boolean;
  onNavigateToAssignments: () => void;
  onNavigateToForms: () => void;
}

export default function CourseRepositoriesTab({
  courseId,
  isHead,
  onNavigateToAssignments,
  onNavigateToForms,
}: Props) {
  const [repos,      setRepos]      = useState<AssignmentRepo[]>([]);
  const [forms,      setForms]      = useState<FormItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [tab,        setTab]        = useState<TabType>("all");
  const [sort,       setSort]       = useState<SortType>("newest");
  const [drawerRow,  setDrawerRow]  = useState<Row | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);
  const [, startTransition]         = useTransition();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/courses/${courseId}/repositories`).then(r => r.ok ? r.json() : { repositories: [] }),
      fetch(`/api/courses/${courseId}/forms`).then(r => r.ok ? r.json() : { forms: [] }),
    ]).then(([repoData, formData]) => {
      startTransition(() => {
        setRepos(repoData.repositories ?? []);
        const headForms = (formData.forms ?? []).filter(
          (f: FormItem) => f._formRole === "manager" || f.isCreator === true
        );
        setForms(headForms);
        setLoading(false);
      });
    }).catch(() => startTransition(() => setLoading(false)));
  }, [courseId]);

  const fetchRef = useRef(fetchData);
  useEffect(() => { fetchRef.current = fetchData; }, [fetchData]);
  useEffect(() => { fetchRef.current(); }, []);

  // Build unified rows
  const allRows: Row[] = [
    ...repos.map((r): Row => ({
      kind:         "assignment",
      id:           r.assignment.id,
      repoId:       r.hasRepo ? r.id : null,
      assignmentId: r.assignment.id,
      hasRepo:      r.hasRepo,
      name:         r.name,
      subtitle:     "Assignment",
      dueDate:      r.assignment.dueDate,
      status:       r.assignment.status,
      submitted:    r.assignment.submissionCount,
      enrolled:     r.assignment.enrollmentCount,
      fileCount:    r._count.files,
      logCount:     r._count.logs,
      createdAt:    r.createdAt,
      files:        r.files ?? [],
      points:       r.assignment.points,
    })),
    ...forms.map((f): Row => ({
      kind:         "form",
      id:           f.id,
      repoId:       null,
      assignmentId: null,
      hasRepo:      false,
      name:         f.title,
      subtitle:     formTypeLabel(f.formType),
      dueDate:      f.dueDate,
      status:       f.published ? "PUBLISHED" : "UNPUBLISHED",
      submitted:    f._count?.formSubmissions ?? 0,
      enrolled:     0,
      fileCount:    0,
      logCount:     0,
      createdAt:    f.createdAt,
      files:        [],
      points:       f.points,
    })),
  ];

  const q = search.trim().toLowerCase();
  const filtered = allRows
    .filter(r => tab === "all" || (tab === "assignments" ? r.kind === "assignment" : r.kind === "form"))
    .filter(r => !q || r.name.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sort === "newest")      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "oldest")      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "name")        return a.name.localeCompare(b.name);
      if (sort === "submissions") return b.submitted - a.submitted;
      return 0;
    });

  const totalSubmissions = repos.reduce((s, r) => s + r.assignment.submissionCount, 0);
  const published        = allRows.filter(r => r.status === "PUBLISHED" || r.status === "published").length;
  const formResponses    = forms.reduce((s, f) => s + (f._count?.formSubmissions ?? 0), 0);

  const tabItems: { key: TabType; label: string; count: number }[] = [
    { key: "all",         label: "All",        count: allRows.length },
    { key: "assignments", label: "Assignments", count: repos.length  },
    { key: "forms",       label: "Forms",       count: forms.length  },
  ];

  const activeFilterCount = (tab !== "all" ? 1 : 0) + (sort !== "newest" ? 1 : 0);

  const handleNavigate = (kind: "assignment" | "form") => {
    setDrawerRow(null);
    if (kind === "assignment") onNavigateToAssignments();
    else onNavigateToForms();
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f8f8f7", fontFamily: FONT }}>

        {/* ── Page header ── */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: isMobile ? "12px 16px" : "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.2em", margin: "0 0 2px" }}>Overview</p>
            <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 900, color: "#111827", margin: 0, lineHeight: 1 }}>Repositories</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isHead && (
              <QuickCreateButton
                onCreateAssignment={onNavigateToAssignments}
                onCreateForm={onNavigateToForms}
              />
            )}
            <button
              onClick={fetchData}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#6b7280", border: "1px solid #e5e7eb", padding: "6px 12px", borderRadius: 8, background: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              {!isMobile && "Refresh"}
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px" : "20px 24px", display: "flex", flexDirection: "column", gap: isMobile ? 12 : 16 }}>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 8 : 12 }}>
            <StatCard label="Assignments"     value={repos.length}     icon={<Folder size={14} />}      accent={MAROON}   sub={`${repos.length} with repo`} />
            <StatCard label="Forms"           value={forms.length}     icon={<FileText size={14} />}    accent="#1d4ed8"  sub={`${formResponses} responses`} />
            <StatCard label="Total Submitted" value={totalSubmissions} icon={<TrendingUp size={14} />}  accent="#16a34a" />
            <StatCard label="Published"       value={published}        icon={<CheckCircle size={14} />} accent="#0891b2"  sub={`of ${allRows.length} total`} />
          </div>

          {/* Main table card */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", flex: 1, minHeight: 300 }}>

            {/* Toolbar */}
            <div style={{ padding: isMobile ? "10px 12px" : "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8, background: "#fff", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", flex: 1, minWidth: 120, maxWidth: isMobile ? "none" : 240, background: "#fafafa" }}>
                <Search size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  style={{ flex: 1, fontSize: 12, color: "#374151", border: "none", outline: "none", background: "transparent", minWidth: 0 }}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ color: "#9ca3af", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
                    <X size={12} />
                  </button>
                )}
              </div>

              {isMobile ? (
                <button
                  onClick={() => setFilterOpen(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, padding: "6px 12px", border: `1px solid ${activeFilterCount > 0 ? MAROON : "#e5e7eb"}`, borderRadius: 8, background: activeFilterCount > 0 ? "#fef2f2" : "#fff", color: activeFilterCount > 0 ? MAROON : "#374151", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  <SlidersHorizontal size={13} />
                  Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </button>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, background: "#f3f4f6", borderRadius: 8, padding: 3, flexShrink: 0 }}>
                    {tabItems.map(t => (
                      <button key={t.key} onClick={() => setTab(t.key)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 12, fontWeight: 700, borderRadius: 6, border: "none", cursor: "pointer", background: tab === t.key ? "#fff" : "transparent", color: tab === t.key ? "#1f2937" : "#6b7280", boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none", whiteSpace: "nowrap" }}>
                        {t.label}
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 5px", borderRadius: 20, background: tab === t.key ? "#f3f4f6" : "#e5e7eb", color: tab === t.key ? "#4b5563" : "#6b7280" }}>{t.count}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
                    <Filter size={12} style={{ color: "#9ca3af" }} />
                    <select value={sort} onChange={e => setSort(e.target.value as SortType)}
                      style={{ fontSize: 12, color: "#374151", border: "1px solid #e5e7eb", borderRadius: 7, padding: "5px 10px", background: "#fff", outline: "none", cursor: "pointer" }}>
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                      <option value="name">Name A–Z</option>
                      <option value="submissions">Most submitted</option>
                    </select>
                  </div>
                </>
              )}

              <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, whiteSpace: "nowrap", marginLeft: isMobile ? "auto" : 0 }}>
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Desktop column headers */}
            {!loading && filtered.length > 0 && !isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 20px", background: "#fef9f9", borderBottom: "1px solid #fce8e8" }}>
                {[
                  { label: "Name",     style: { flex: 1 } as React.CSSProperties },
                  { label: "Progress", style: { width: 140 } as React.CSSProperties },
                  { label: "Due",      style: { width: 110 } as React.CSSProperties },
                  { label: "Status",   style: { width: 80, textAlign: "center" } as React.CSSProperties },
                  { label: "",         style: { width: 13 } as React.CSSProperties },
                ].map(h => (
                  <div key={h.label} style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em", ...h.style }}>{h.label}</div>
                ))}
              </div>
            )}

            {/* Content */}
            {loading ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#9ca3af", padding: 60 }}>
                <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 12 }}>Loading repositories…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 14 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={26} style={{ color: MAROON }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#4b5563", margin: "0 0 4px" }}>
                    {search ? "No results found" : `No ${tab === "all" ? "items" : tab} yet`}
                  </p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                    {search ? "Try a different keyword" : "Create assignments or forms to see them here."}
                  </p>

                </div>
              </div>
            ) : isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, overflowY: "auto" }}>
                {filtered.map(row => (
                  <RepoCard
                    key={`${row.kind}-${row.id}`} row={row}
                    selected={drawerRow?.id === row.id && drawerRow?.kind === row.kind}
                    onClick={() => setDrawerRow(prev => prev?.id === row.id && prev?.kind === row.kind ? null : row)}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
                {filtered.map(row => (
                  <RepoRow
                    key={`${row.kind}-${row.id}`} row={row}
                    selected={drawerRow?.id === row.id && drawerRow?.kind === row.kind}
                    onClick={() => setDrawerRow(prev => prev?.id === row.id && prev?.kind === row.kind ? null : row)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {filterOpen && (
        <MobileFilterSheet
          tab={tab} setTab={setTab} sort={sort} setSort={setSort}
          onClose={() => setFilterOpen(false)} tabItems={tabItems}
        />
      )}

      {drawerRow && (
        <RepositoryDrawer
          row={drawerRow} courseId={courseId}
          onClose={() => setDrawerRow(null)}
          onNavigate={handleNavigate}
        />
      )}
    </>
  );
}