"use client";
/* eslint-disable @next/next/no-img-element */

// src/components/admin/AdminCourseRepositoriesPage.tsx

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import {
  Search, RefreshCw, Folder, ChevronRight,
  FileText, CheckCircle, BookOpen, Filter,
  Users, TrendingUp, X, Download,
  Eye, PackageOpen, Check,
  Pencil, ChevronDown, Music,
  Archive, Image as ImageIcon, Film,
  SlidersHorizontal, Calendar, ExternalLink,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";

// ─── Types ────────────────────────────────────────────────────────────────────
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

interface Form {
  id: string; title: string; formType: string; points: number;
  published: boolean; dueDate: string | null; createdAt: string;
  _count?: { formSubmissions: number };
}

interface RepoFile {
  id: string; fileName: string; fileUrl: string;
  fileSize: number | null; mimeType: string | null; uploadedAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
  submission?: { id: string; status: string; grade: number | null; feedback: string | null; submittedAt: string | null } | null;
}

interface FormAnswer {
  questionId: string; question: string; type: string;
  points: number; answer: string | string[] | null;
}

interface FormSubmission {
  id: string; createdAt: string; score: number | null; totalPoints: number;
  user: { name: string | null; email: string; courseRole: string; section: string | null };
  answers: FormAnswer[];
}

type TabType   = "all" | "assignments" | "forms";
type SortType  = "newest" | "oldest" | "name" | "submissions";
type DrawerTab = "files" | "logs" | "responses";

interface ActivityLog {
  id: string; action: string; targetType: string | null; targetName: string | null;
  createdAt: string; metadata: Record<string, string> | null;
  user: { id: string; name: string | null; email: string; image: string | null };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
  " " +
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();

const fmtSize = (b: number | null) =>
  !b ? "—" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

const isImage  = (u: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(u.split("?")[0]);
const isPdf    = (u: string) => /\.pdf$/i.test(u.split("?")[0]);
const isVideo  = (u: string) => /\.(mp4|webm|mov|avi|mkv)$/i.test(u.split("?")[0]);
const isAudio  = (u: string) => /\.(mp3|wav|ogg|m4a|aac)$/i.test(u.split("?")[0]);
const isDoc    = (u: string) => /\.(doc|docx)$/i.test(u.split("?")[0]);
const isSheet  = (u: string) => /\.(xls|xlsx)$/i.test(u.split("?")[0]);
const isZip    = (u: string) => /\.(zip|rar|7z)$/i.test(u.split("?")[0]);

function fmtAnswerValue(val: string | string[] | null): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
  return val || "—";
}

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
  };
  return m[t] ?? t;
}

function getInitial(name: string | null, email: string) {
  if (name) return name.charAt(0).toUpperCase();
  return email.charAt(0).toUpperCase();
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Micro-components ─────────────────────────────────────────────────────────
function FTIcon({ url, size = 14 }: { url: string; size?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = { size, style: { flexShrink: 0 } };
  if (isImage(url))  return <ImageIcon {...p} style={{ ...p.style, color: "#0891b2" }}/>;
  if (isPdf(url))    return <FileText  {...p} style={{ ...p.style, color: "#dc2626" }}/>;
  if (isVideo(url))  return <Film      {...p} style={{ ...p.style, color: "#7c3aed" }}/>;
  if (isAudio(url))  return <Music     {...p} style={{ ...p.style, color: "#2563eb" }}/>;
  if (isDoc(url))    return <FileText  {...p} style={{ ...p.style, color: "#1d4ed8" }}/>;
  if (isSheet(url))  return <FileText  {...p} style={{ ...p.style, color: "#16a34a" }}/>;
  if (isZip(url))    return <Archive   {...p} style={{ ...p.style, color: "#92400e" }}/>;
  return <FileText {...p} style={{ ...p.style, color: "#6b7280" }}/>;
}

function UAv({ name, image, size = 28 }: { name: string | null; image: string | null; size?: number }) {
  const pal = [MAROON, "#1d4ed8", "#16a34a", "#ea580c", "#7c3aed", "#0891b2"];
  const idx = (name?.charCodeAt(0) ?? 0) % pal.length;
  if (image) return (
    <img src={image} alt={name ?? ""} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, outline: "2px solid #fff", outlineOffset: "-1px" }}/>
  );
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: pal[idx], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.38, flexShrink: 0, outline: "2px solid #fff", outlineOffset: "-1px" }}>
      {(name ?? "?")[0].toUpperCase()}
    </div>
  );
}

function DuePill({ dueDate }: { dueDate: string | null }) {
  const m = fmtDue(dueDate);
  if (!m) return <span style={{ fontSize: 10, color: "#d1d5db", fontWeight: 500 }}>No due date</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: m.color, background: m.bg, border: `1px solid ${m.border}`, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
}

function ProgressBar({ submitted, enrolled }: { submitted: number; enrolled: number }) {
  const pct = enrolled > 0 ? Math.min(100, Math.round((submitted / enrolled) * 100)) : submitted > 0 ? 100 : 0;
  const color = pct === 100 ? "#16a34a" : pct >= 60 ? "#d97706" : MAROON;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
      <div style={{ flex: 1, height: 4, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.5s ease" }}/>
      </div>
      <span style={{ fontSize: 10, fontWeight: 900, color, minWidth: 26, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
    </div>
  );
}

function TypeBadge({ kind, subtitle }: { kind: "assignment" | "form"; subtitle: string }) {
  if (kind === "form") return (
    <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "#eff6ff", color: "#1d4ed8", flexShrink: 0, letterSpacing: "0.03em", textTransform: "uppercase" }}>{subtitle}</span>
  );
  return (
    <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "#fef2f2", color: MAROON, flexShrink: 0, letterSpacing: "0.03em", textTransform: "uppercase" }}>Assign.</span>
  );
}

// ─── Row type ─────────────────────────────────────────────────────────────────
interface Row {
  kind: "assignment" | "form";
  id: string; repoId: string | null; assignmentId: string | null;
  hasRepo: boolean; name: string; subtitle: string;
  dueDate: string | null; status: string;
  submitted: number; enrolled: number;
  fileCount: number; logCount: number;
  createdAt: string; files: RepoFile[]; points: number;
}

// ─── Mobile Card (compact) ────────────────────────────────────────────────────
function RepoCard({ row, selected, onClick }: { row: Row; selected: boolean; onClick: () => void }) {
  const pct = row.enrolled > 0 ? Math.min(100, Math.round((row.submitted / row.enrolled) * 100)) : 0;
  const barColor = pct === 100 ? "#16a34a" : pct >= 60 ? "#d97706" : MAROON;

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? "#fdf2f2" : "#fff",
        border: `1px solid ${selected ? "rgba(123,17,19,0.18)" : "#ebebeb"}`,
        borderLeft: `3px solid ${selected ? MAROON : "transparent"}`,
        borderRadius: 12,
        padding: "11px 13px",
        cursor: "pointer",
        transition: "all 0.12s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: row.kind === "assignment" ? "#fef2f2" : "#eff6ff",
        }}>
          {row.kind === "assignment"
            ? <Folder size={14} style={{ color: MAROON }}/>
            : <FileText size={14} style={{ color: "#1d4ed8" }}/>}
        </div>

        {/* Title + badge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: selected ? MAROON : "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {row.name}
            </p>
            <TypeBadge kind={row.kind} subtitle={row.subtitle}/>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DuePill dueDate={row.dueDate}/>
            <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: "auto", whiteSpace: "nowrap" }}>
              {row.kind === "assignment"
                ? `${row.submitted}/${row.enrolled > 0 ? row.enrolled : "?"} submitted`
                : `${row.submitted} responses`}
            </span>
          </div>
        </div>

        <ChevronRight size={13} style={{ color: selected ? MAROON : "#d1d5db", flexShrink: 0 }}/>
      </div>

      {/* Progress bar — only for assignments with enrolled */}
      {row.kind === "assignment" && row.enrolled > 0 && (
        <div style={{ marginTop: 9, paddingLeft: 42 }}>
          <div style={{ height: 4, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 99 }}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Desktop List Row ─────────────────────────────────────────────────────────
function RepoRow({ row, selected, onClick }: { row: Row; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 18px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.1s", background: selected ? "#fdf2f2" : "transparent", borderLeft: `3px solid ${selected ? MAROON : "transparent"}` }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#fafafa"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: row.kind === "assignment" ? "#fef2f2" : "#eff6ff" }}>
        {row.kind === "assignment" ? <Folder size={14} style={{ color: MAROON }}/> : <FileText size={14} style={{ color: "#1d4ed8" }}/>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: selected ? MAROON : "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
          <TypeBadge kind={row.kind} subtitle={row.subtitle}/>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9ca3af" }}>
          {row.kind === "assignment" && <><span>{row.fileCount} files</span><span style={{ color: "#e5e7eb" }}>·</span></>}
          <span>{row.submitted} submitted</span>
        </div>
      </div>
      <div style={{ width: 130, flexShrink: 0 }}>
        {row.kind === "assignment" && row.enrolled > 0 ? (
          <div>
            <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>{row.submitted}/{row.enrolled}</p>
            <ProgressBar submitted={row.submitted} enrolled={row.enrolled}/>
          </div>
        ) : row.kind === "form" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
            <Users size={11}/><span style={{ fontWeight: 600 }}>{row.submitted} responses</span>
          </div>
        ) : <span style={{ fontSize: 11, color: "#e5e7eb" }}>—</span>}
      </div>
      <div style={{ width: 100, flexShrink: 0 }}><DuePill dueDate={row.dueDate}/></div>
      <ChevronRight size={13} style={{ color: selected ? MAROON : "#d1d5db", flexShrink: 0 }}/>
    </div>
  );
}

function StatCard({ label, value, icon, accent, sub }: { label: string; value: number; icon: React.ReactNode; accent: string; sub?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ borderRadius: 8, padding: 8, background: "#f9fafb", color: accent, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 20, fontWeight: 900, color: "#111827", lineHeight: 1, margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
        {sub && <p style={{ fontSize: 10, color: "#9ca3af", margin: "1px 0 0" }}>{sub}</p>}
      </div>
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
          try { const res = await fetch(sf.fileUrl); const blob = await res.blob(); folder.file(studentFiles.length > 1 ? `${i + 1}_${sf.fileName}` : sf.fileName, blob); } catch { /* skip */ }
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${assignmentTitle.replace(/[^a-z0-9]/gi, "_")}_all_submissions.zip`; a.click(); URL.revokeObjectURL(a.href);
      setState("done"); setTimeout(() => setState("idle"), 3000);
    } catch { setState("error"); setTimeout(() => setState("idle"), 3000); }
  };

  const btnStyles: Record<string, React.CSSProperties> = {
    idle:    { borderColor: "#e5e7eb", color: "#374151", background: "#fff" },
    loading: { borderColor: "#e5e7eb", color: "#9ca3af", background: "#f9fafb" },
    done:    { borderColor: "#bbf7d0", color: "#15803d", background: "#f0fdf4" },
    error:   { borderColor: "#fecaca", color: "#dc2626", background: "#fef2f2" },
  };

  return (
    <button onClick={handleDownload} disabled={state === "loading" || files.length === 0}
      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "6px 10px", border: "1px solid", borderRadius: 8, cursor: files.length === 0 ? "default" : "pointer", opacity: files.length === 0 ? 0.5 : 1, transition: "all 0.15s", whiteSpace: "nowrap", ...btnStyles[state] }}>
      {state === "loading" ? <><RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }}/> Preparing...</>
        : state === "done" ? <><Check size={11}/> Done!</>
        : state === "error" ? "Failed"
        : <><PackageOpen size={11}/> Download All ({files.length})</>}
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
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}>
        {open ? <ChevronDown size={11} style={{ color: "#9ca3af", flexShrink: 0 }}/> : <ChevronRight size={11} style={{ color: "#9ca3af", flexShrink: 0 }}/>}
        <UAv name={user.name} image={user.image} size={26}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#1f2937", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name ?? user.email}</p>
          <p style={{ fontSize: 10, color: "#9ca3af", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
        </div>
        <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{files.length} file{files.length !== 1 ? "s" : ""}</span>
      </button>

      {open && (
        <div style={{ margin: "0 16px 8px 48px", border: "1px solid #f3f4f6", borderRadius: 8, overflow: "hidden" }}>
          {files.map((f, i) => (
            <div key={`${f.id}-${i}`}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderBottom: i < files.length - 1 ? "1px solid #f9fafb" : "none", flexWrap: "wrap" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fef9f9")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              <FTIcon url={f.fileUrl} size={12}/>
              <button onClick={() => onPreview(f)}
                style={{ flex: 1, fontSize: 11, fontWeight: 600, color: MAROON, textAlign: "left", background: "none", border: "none", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: 0, minWidth: 80 }}>
                {f.fileName}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{fmtShort(f.uploadedAt)}</span>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{fmtSize(f.fileSize)}</span>
                {points > 0 && (f.submission?.grade != null
                  ? <span style={{ fontSize: 11, fontWeight: 900, color: MAROON }}>{f.submission.grade}<span style={{ color: "#9ca3af", fontWeight: 400 }}>/{points}</span></span>
                  : <span style={{ fontSize: 11, color: "#d1d5db" }}>—/{points}</span>
                )}
                <button onClick={() => onPreview(f)} title="Preview"
                  style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: "none", background: "none", cursor: "pointer", color: "#9ca3af" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <Eye size={10}/>
                </button>
                <a href={f.fileUrl} download={f.fileName} target="_blank" rel="noopener noreferrer"
                  style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, color: "#9ca3af", textDecoration: "none" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#f3f4f6")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}>
                  <Download size={10}/>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Form Submission Detail Modal ─────────────────────────────────────────────
function FormSubmissionModal({ submission, formTitle, onClose }: {
  submission: FormSubmission; formTitle: string; onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", h); };
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}/>
      <div onClick={e => e.stopPropagation()} style={{ position: "fixed", zIndex: 61, background: "#fff", display: "flex", flexDirection: "column", fontFamily: FONT, overflow: "hidden", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(540px, calc(100vw - 32px))", maxHeight: "85vh", borderRadius: 18, boxShadow: "0 32px 80px rgba(0,0,0,0.28)" }}>
        <div style={{ background: MAROON, padding: "13px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.18em", margin: "0 0 3px" }}>Response Detail</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formTitle}</p>
            </div>
            <button onClick={onClose} style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", flexShrink: 0 }}>
              <X size={12}/>
            </button>
          </div>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", background: "#f9fafb", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: MAROON, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
              {getInitial(submission.user.name, submission.user.email)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{submission.user.name ?? "Anonymous"}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{submission.user.email}</p>
              {submission.user.courseRole && (
                <p style={{ fontSize: 10, fontWeight: 700, color: MAROON, margin: 0 }}>{submission.user.courseRole}{submission.user.section ? ` · ${submission.user.section}` : ""}</p>
              )}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: 9, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>Submitted</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 1px" }}>{fmtDateShort(submission.createdAt)}</p>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {!submission.answers || submission.answers.length === 0 ? (
            <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "28px 0", margin: 0 }}>No answers recorded.</p>
          ) : submission.answers.map((ans, i) => (
            <div key={ans.questionId ?? i} style={{ border: "1px solid #f3f4f6", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", margin: "0 0 5px", lineHeight: 1.4 }}>
                <span style={{ color: "#d1d5db", fontFamily: "monospace", marginRight: 5 }}>{i + 1}.</span>
                {ans.question}
              </p>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#111827", margin: 0, paddingLeft: 14, wordBreak: "break-word", lineHeight: 1.5 }}>{fmtAnswerValue(ans.answer)}</p>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", background: "#fff", flexShrink: 0 }}>
          <button onClick={onClose} style={{ height: 34, padding: "0 18px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#6b7280", background: "#fff", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>Close</button>
        </div>
      </div>
    </>
  );
}

// ─── Form Response Card ───────────────────────────────────────────────────────
function FormResponseCard({ sub, onOpen }: { sub: FormSubmission; onOpen: () => void }) {
  return (
    <div onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #f9fafb", cursor: "pointer", transition: "background 0.1s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: MAROON, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
        {getInitial(sub.user.name, sub.user.email)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#1f2937", margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.user.name ?? "Anonymous"}</p>
        <p style={{ fontSize: 10, color: "#9ca3af", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.user.email}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#9ca3af" }}>
          <Calendar size={9}/>
          <span>{fmtDateShort(sub.createdAt)}</span>
        </div>
      </div>
      <ChevronRight size={11} style={{ color: "#d1d5db", flexShrink: 0 }}/>
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
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}/>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 61, background: "#fff", borderRadius: "18px 18px 0 0", padding: "0 0 env(safe-area-inset-bottom)", fontFamily: FONT, boxShadow: "0 -6px 32px rgba(0,0,0,0.12)" }}>
        <div style={{ width: 32, height: 3, borderRadius: 99, background: "#e5e7eb", margin: "12px auto 0" }}/>
        <div style={{ padding: "14px 18px 22px" }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: MAROON, marginBottom: 12, marginTop: 2 }}>Filter by type</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            {tabItems.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); onClose(); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${tab === t.key ? MAROON : "#e5e7eb"}`, background: tab === t.key ? "#fef2f2" : "#fff", cursor: "pointer" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: tab === t.key ? MAROON : "#374151" }}>{t.label}</span>
                <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: tab === t.key ? MAROON : "#f3f4f6", color: tab === t.key ? "#fff" : "#6b7280" }}>{t.count}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, fontWeight: 800, color: MAROON, marginBottom: 12 }}>Sort by</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { value: "newest",      label: "Newest first"  },
              { value: "oldest",      label: "Oldest first"  },
              { value: "name",        label: "Name A–Z"      },
              { value: "submissions", label: "Most submitted" },
            ].map(s => (
              <button key={s.value} onClick={() => { setSort(s.value as SortType); onClose(); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${sort === s.value ? MAROON : "#e5e7eb"}`, background: sort === s.value ? "#fef2f2" : "#fff", cursor: "pointer" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: sort === s.value ? MAROON : "#374151" }}>{s.label}</span>
                {sort === s.value && <Check size={13} style={{ color: MAROON }}/>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Slide-over Drawer ────────────────────────────────────────────────────────
function RepositoryDrawer({ row, courseId, onClose }: { row: Row; courseId: string; onClose: () => void }) {
  const [formSubs,      setFormSubs]      = useState<FormSubmission[]>([]);
  const [activityLogs,  setActivityLogs]  = useState<ActivityLog[]>([]);
  const [loadingForm,   setLoadingForm]   = useState(row.kind === "form");
  const [loadingLogs,   setLoadingLogs]   = useState(row.kind === "assignment" && Boolean(row.repoId));
  const [previewFile,   setPreviewFile]   = useState<RepoFile | null>(null);
  const [selectedSub,   setSelectedSub]   = useState<FormSubmission | null>(null);
  const [editingName,   setEditingName]   = useState(false);
  const [nameInput,     setNameInput]     = useState(row.name);
  const [savingName,    setSavingName]    = useState(false);
  const [isMobile,      setIsMobile]      = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  const [activeTab,     setActiveTab]     = useState<DrawerTab>(row.kind === "form" ? "responses" : "files");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (row.kind !== "form") return;
    const controller = new AbortController();
    fetch(`/api/admin/courses/${courseId}/forms/${row.id}/submissions`, { signal: controller.signal })
      .then(r => r.json()).then(j => { setFormSubs(j.submissions ?? []); })
      .catch(() => { if (!controller.signal.aborted) setFormSubs([]); })
      .finally(() => { if (!controller.signal.aborted) setLoadingForm(false); });
    return () => controller.abort();
  }, [row.id, row.kind, courseId]);

  useEffect(() => {
    if (row.kind !== "assignment" || !row.repoId) return;
    const controller = new AbortController();
    fetch(`/api/admin/repositories/${row.repoId}`, { signal: controller.signal })
      .then(r => r.json()).then(j => { setActivityLogs(j.repository?.activity_logs ?? []); })
      .catch(() => { if (!controller.signal.aborted) setActivityLogs([]); })
      .finally(() => { if (!controller.signal.aborted) setLoadingLogs(false); });
    return () => controller.abort();
  }, [row.id, row.repoId, row.kind]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !previewFile && !selectedSub) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, previewFile, selectedSub]);

  const saveName = async () => {
    if (!nameInput.trim() || !row.repoId) return;
    setSavingName(true);
    await fetch(`/api/admin/repositories/${row.repoId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput }),
    });
    setEditingName(false); setSavingName(false);
  };

  const files = row.files ?? [];
  const filesByUser: Record<string, RepoFile[]> = {};
  files.forEach(f => { if (!filesByUser[f.user.id]) filesByUser[f.user.id] = []; filesByUser[f.user.id].push(f); });
  const submittedCount = Object.keys(filesByUser).length;
  const isLoading = row.kind === "form" ? loadingForm : false;

  const drawerStyle: React.CSSProperties = isMobile
    ? { position: "fixed", left: 0, right: 0, bottom: 0, top: "8vh", zIndex: 50, background: "#fff", boxShadow: "0 -10px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", fontFamily: FONT, borderRadius: "18px 18px 0 0", overflow: "hidden" }
    : { position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50, width: "min(560px, 100vw)", background: "#fff", boxShadow: "-6px 0 36px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", fontFamily: FONT };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.24)", backdropFilter: "blur(2px)" }}/>
      <div style={drawerStyle}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {isMobile && (
          <div style={{ paddingTop: 10, paddingBottom: 2, display: "flex", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 36, height: 3, borderRadius: 99, background: "#e5e7eb" }}/>
          </div>
        )}

        {/* Header */}
        <div style={{ background: MAROON, padding: isMobile ? "10px 14px 14px" : "14px 18px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.18em", margin: "0 0 4px" }}>
                {row.kind === "assignment" ? "Assignment Repository" : row.subtitle}
              </p>
              {row.kind === "assignment" && editingName ? (
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
                    onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                    style={{ flex: 1, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 7, padding: "4px 9px", fontSize: 13, fontWeight: 700, background: "rgba(255,255,255,0.15)", color: "#fff", outline: "none" }}
                  />
                  <button onClick={saveName} disabled={savingName}
                    style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 7, background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", cursor: "pointer" }}>
                    {savingName ? "…" : "Save"}
                  </button>
                  <button onClick={() => setEditingName(false)} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <h2 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</h2>
                  {row.kind === "assignment" && row.repoId && (
                    <button onClick={() => { setNameInput(row.name); setEditingName(true); }}
                      style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", display: "flex", flexShrink: 0 }}>
                      <Pencil size={11}/>
                    </button>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose}
              style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", flexShrink: 0 }}>
              <X size={13}/>
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid #f3f4f6", background: "#fafafa", flexShrink: 0 }}>
          {row.kind === "assignment" ? (
            <>
              <div style={{ padding: "10px 14px", borderRight: "1px solid #f3f4f6", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <p style={{ fontSize: 17, fontWeight: 900, color: "#111827", margin: 0, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{submittedCount}</p>
                <p style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, margin: "3px 0 0", whiteSpace: "nowrap" }}>Submitted</p>
              </div>
              <div style={{ padding: "10px 14px", borderRight: "1px solid #f3f4f6", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <p style={{ fontSize: 17, fontWeight: 900, color: "#111827", margin: 0, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{files.length}</p>
                <p style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, margin: "3px 0 0", whiteSpace: "nowrap" }}>Files</p>
              </div>
              {row.enrolled > 0 && (
                <div style={{ flex: 1, minWidth: 80, padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600 }}>Rate</span>
                    <span style={{ fontSize: 9, fontWeight: 900, color: MAROON }}>{Math.round((submittedCount / row.enrolled) * 100)}%</span>
                  </div>
                  <ProgressBar submitted={submittedCount} enrolled={row.enrolled}/>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <p style={{ fontSize: 17, fontWeight: 900, color: "#111827", margin: 0, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{formSubs.length}</p>
              <p style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, margin: "3px 0 0", whiteSpace: "nowrap" }}>Responses</p>
            </div>
          )}
          <div style={{ padding: "10px 12px", flexShrink: 0, marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <DuePill dueDate={row.dueDate}/>
          </div>
        </div>

        {/* Tab bar */}
        {row.kind === "assignment" && (
          <div style={{ display: "flex", borderBottom: "1px solid #f3f4f6", flexShrink: 0, background: "#fff" }}>
            {(["files", "logs"] as DrawerTab[]).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{ padding: "9px 16px", fontSize: 11, fontWeight: 700, border: "none", background: "none", cursor: "pointer", borderBottom: `2px solid ${activeTab === t ? MAROON : "transparent"}`, color: activeTab === t ? MAROON : "#9ca3af" }}>
                {t === "files" ? `Files (${files.length})` : `Activity (${row.logCount})`}
              </button>
            ))}
          </div>
        )}

        {/* Assignment info + bulk download */}
        {row.kind === "assignment" && (
          <div style={{ padding: "8px 14px", background: "#fafafa", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b7280", minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
              {row.points > 0 && <><span style={{ color: "#e5e7eb" }}>·</span><span style={{ fontWeight: 600, color: MAROON, flexShrink: 0 }}>{row.points} pts</span></>}
            </div>
            <BulkDownloadButton files={files} assignmentTitle={row.name}/>
          </div>
        )}

        {/* Form responses header */}
        {row.kind === "form" && !isLoading && formSubs.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", padding: "8px 14px", background: "#eff6ff", borderBottom: "1px solid #dbeafe", flexShrink: 0 }}>
            <span style={{ flex: 1, fontSize: 10, fontWeight: 800, color: "#1d4ed8" }}>
              {formSubs.length} response{formSubs.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 180, gap: 10, color: "#9ca3af" }}>
              <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }}/>
              <span style={{ fontSize: 11 }}>Loading...</span>
            </div>

          ) : activeTab === "files" ? (
            submittedCount === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "50px 24px", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Folder size={22} style={{ color: MAROON }}/>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", margin: "0 0 3px" }}>No submissions yet</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Files will appear when staff submit</p>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", padding: "7px 14px", background: "#fef9f9", borderBottom: "1px solid #fce8e8" }}>
                  <div style={{ flex: 1, fontSize: 9, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em" }}>Staff</div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em" }}>Files</div>
                </div>
                {Object.entries(filesByUser).map(([userId, userFiles]) => (
                  <StudentSection key={userId} user={userFiles[0].user} files={userFiles} points={row.points} onPreview={setPreviewFile}/>
                ))}
              </>
            )

          ) : activeTab === "logs" ? (
            loadingLogs ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 180, gap: 10, color: "#9ca3af" }}>
                <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }}/>
                <span style={{ fontSize: 11 }}>Loading activity...</span>
              </div>
            ) : activityLogs.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "50px 24px", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={20} style={{ color: "#d1d5db" }}/>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", margin: 0 }}>No activity yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {activityLogs.map(log => {
                  const cfgMap: Record<string, { bg: string; color: string; border: string }> = {
                    UPLOAD: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
                    DELETE: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
                    GRADE:  { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
                    CREATE: { bg: "#faf5ff", color: "#7c3aed", border: "#e9d5ff" },
                    UPDATE: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
                    SUBMIT: { bg: "#ecfeff", color: "#0891b2", border: "#a5f3fc" },
                  };
                  const lc = cfgMap[log.action] ?? { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" };
                  return (
                    <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", borderBottom: "1px solid #f9fafb" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <UAv name={log.user.name} image={log.user.image} size={28}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.user.name ?? log.user.email}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 20, background: lc.bg, color: lc.color, border: `1px solid ${lc.border}` }}>{log.action}</span>
                        </div>
                        {log.targetName && <p style={{ fontSize: 10, color: "#9ca3af", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.targetName}</p>}
                      </div>
                      <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                        {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )

          ) : (
            formSubs.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "50px 24px", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={22} style={{ color: "#3b82f6" }}/>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", margin: "0 0 3px" }}>No responses yet</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Responses will appear when students submit</p>
                </div>
              </div>
            ) : formSubs.map(s => <FormResponseCard key={s.id} sub={s} onOpen={() => setSelectedSub(s)}/>)
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setPreviewFile(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: "95vw", height: "90dvh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: MAROON, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <UAv name={previewFile.user.name} image={previewFile.user.image} size={28}/>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewFile.fileName}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", margin: 0 }}>{previewFile.user.name ?? previewFile.user.email} · {fmtSize(previewFile.fileSize)}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <a href={previewFile.fileUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                  <ExternalLink size={11}/> Open
                </a>
                <a href={previewFile.fileUrl} download={previewFile.fileName}
                  style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                  <Download size={11}/> Download
                </a>
                <button onClick={() => setPreviewFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", display: "flex" }}><X size={15}/></button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: "hidden", background: "#f3f4f6" }}>
              {isImage(previewFile.fileUrl) ? (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                  <img src={previewFile.fileUrl} alt={previewFile.fileName} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }}/>
                </div>
              ) : isVideo(previewFile.fileUrl) ? (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                  <video src={previewFile.fileUrl} controls style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }}/>
                </div>
              ) : isPdf(previewFile.fileUrl) ? (
                <iframe src={previewFile.fileUrl} title={previewFile.fileName} style={{ width: "100%", height: "100%", border: "none", display: "block" }}/>
              ) : (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#9ca3af" }}>
                  <FTIcon url={previewFile.fileUrl} size={48}/>
                  <p style={{ fontSize: 13, margin: 0 }}>Preview not available for this file type.</p>
                  <a href={previewFile.fileUrl} download={previewFile.fileName}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 10, color: "#fff", background: MAROON, textDecoration: "none" }}>
                    <Download size={13}/> Download to view
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedSub && <FormSubmissionModal submission={selectedSub} formTitle={row.name} onClose={() => setSelectedSub(null)}/>}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminCourseRepositoriesPage({ courseId }: { courseId: string }) {
  const [repos,      setRepos]      = useState<AssignmentRepo[]>([]);
  const [forms,      setForms]      = useState<Form[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [tab,        setTab]        = useState<TabType>("all");
  const [sort,       setSort]       = useState<SortType>("newest");
  const [drawerRow,  setDrawerRow]  = useState<Row | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [, startTransition]         = useTransition();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/courses/${courseId}/repositories`).then(r => r.ok ? r.json() : { repositories: [] }),
      fetch(`/api/admin/courses/${courseId}/forms`).then(r => r.ok ? r.json() : { forms: [] }),
    ]).then(([repoData, formData]) => {
      startTransition(() => {
        setRepos(repoData.repositories ?? []);
        setForms(formData.forms ?? []);
        setLoading(false);
      });
    }).catch(() => startTransition(() => setLoading(false)));
  }, [courseId]);

  const fetchRef = useRef(fetchData);
  useEffect(() => { fetchRef.current = fetchData; }, [fetchData]);
  useEffect(() => { fetchRef.current(); }, []);

  const allRows: Row[] = [
    ...repos.map((r): Row => ({
      kind: "assignment", id: r.assignment.id, repoId: r.hasRepo ? r.id : null,
      assignmentId: r.assignment.id, hasRepo: r.hasRepo, name: r.name, subtitle: "Assignment",
      dueDate: r.assignment.dueDate, status: r.assignment.status,
      submitted: r.assignment.submissionCount, enrolled: r.assignment.enrollmentCount,
      fileCount: r._count.files, logCount: r._count.logs, createdAt: r.createdAt,
      files: r.files ?? [], points: r.assignment.points,
    })),
    ...forms.map((f): Row => ({
      kind: "form", id: f.id, repoId: null, assignmentId: null, hasRepo: false,
      name: f.title, subtitle: formTypeLabel(f.formType), dueDate: f.dueDate,
      status: f.published ? "PUBLISHED" : "UNPUBLISHED",
      submitted: f._count?.formSubmissions ?? 0, enrolled: 0,
      fileCount: 0, logCount: 0, createdAt: f.createdAt, files: [], points: f.points,
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
  const published        = allRows.filter(r => r.status === "PUBLISHED").length;
  const formResponses    = forms.reduce((s, f) => s + (f._count?.formSubmissions ?? 0), 0);

  const tabItems: { key: TabType; label: string; count: number }[] = [
    { key: "all",         label: "All",        count: allRows.length },
    { key: "assignments", label: "Assignments", count: repos.length  },
    { key: "forms",       label: "Forms",       count: forms.length  },
  ];

  const activeFilterCount = (tab !== "all" ? 1 : 0) + (sort !== "newest" ? 1 : 0);

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f7f7f6", fontFamily: FONT }}>

        {/* Page header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: isMobile ? "12px 14px" : "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.2em", margin: "0 0 2px" }}>Course</p>
            <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 900, color: "#111827", margin: 0, lineHeight: 1 }}>Repositories</h1>
          </div>
          <button onClick={fetchData}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#6b7280", border: "1px solid #e5e7eb", padding: "6px 12px", borderRadius: 8, background: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }}/>
            {!isMobile && "Refresh"}
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 10px" : "18px 22px", display: "flex", flexDirection: "column", gap: isMobile ? 10 : 14 }}>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 8 : 10 }}>
            <StatCard label="Assignments"     value={repos.length}     icon={<Folder size={14}/>}      accent={MAROON}   sub={`${repos.filter(r => r.hasRepo).length} with repo`}/>
            <StatCard label="Forms"           value={forms.length}     icon={<FileText size={14}/>}    accent="#1d4ed8"  sub={`${formResponses} responses`}/>
            <StatCard label="Total Submitted" value={totalSubmissions} icon={<TrendingUp size={14}/>}  accent="#16a34a"/>
            <StatCard label="Published"       value={published}        icon={<CheckCircle size={14}/>} accent="#0891b2"  sub={`of ${allRows.length} total`}/>
          </div>

          {/* Main card */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", flex: 1, minHeight: 260 }}>

            {/* Toolbar */}
            <div style={{ padding: isMobile ? "10px 12px" : "10px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 7, background: "#fff", flexWrap: "wrap" }}>
              {/* Search */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, border: "1px solid #e5e7eb", borderRadius: 9, padding: "6px 10px", flex: 1, minWidth: 120, maxWidth: isMobile ? "none" : 240, background: "#fafafa" }}>
                <Search size={12} style={{ color: "#9ca3af", flexShrink: 0 }}/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  style={{ flex: 1, fontSize: 12, color: "#374151", border: "none", outline: "none", background: "transparent", minWidth: 0 }}/>
                {search && <button onClick={() => setSearch("")} style={{ color: "#9ca3af", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}><X size={11}/></button>}
              </div>

              {isMobile ? (
                <button onClick={() => setFilterOpen(true)}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "6px 12px", border: `1.5px solid ${activeFilterCount > 0 ? MAROON : "#e5e7eb"}`, borderRadius: 9, background: activeFilterCount > 0 ? "#fef2f2" : "#fff", color: activeFilterCount > 0 ? MAROON : "#374151", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                  <SlidersHorizontal size={12}/>
                  Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </button>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, background: "#f3f4f6", borderRadius: 9, padding: 3, flexShrink: 0 }}>
                    {tabItems.map(t => (
                      <button key={t.key} onClick={() => setTab(t.key)}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 11, fontWeight: 700, borderRadius: 6, border: "none", cursor: "pointer", background: tab === t.key ? "#fff" : "transparent", color: tab === t.key ? "#1f2937" : "#6b7280", boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none", whiteSpace: "nowrap" }}>
                        {t.label}
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 20, background: tab === t.key ? "#f3f4f6" : "#e5e7eb", color: tab === t.key ? "#4b5563" : "#6b7280" }}>{t.count}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto", flexShrink: 0 }}>
                    <Filter size={11} style={{ color: "#9ca3af" }}/>
                    <select value={sort} onChange={e => setSort(e.target.value as SortType)}
                      style={{ fontSize: 11, color: "#374151", border: "1px solid #e5e7eb", borderRadius: 7, padding: "4px 8px", background: "#fff", outline: "none", cursor: "pointer" }}>
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                      <option value="name">Name A–Z</option>
                      <option value="submissions">Most submitted</option>
                    </select>
                  </div>
                </>
              )}

              <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500, whiteSpace: "nowrap", marginLeft: isMobile ? "auto" : 0 }}>
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Desktop column headers */}
            {!loading && filtered.length > 0 && !isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "7px 18px", background: "#fef9f9", borderBottom: "1px solid #fce8e8" }}>
                {[
                  { label: "Name",     style: { flex: 1 } as React.CSSProperties },
                  { label: "Progress", style: { width: 130 } as React.CSSProperties },
                  { label: "Due",      style: { width: 100 } as React.CSSProperties },
                  { label: "",         style: { width: 13 } as React.CSSProperties },
                ].map(h => (
                  <div key={h.label} style={{ fontSize: 9, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em", ...h.style }}>{h.label}</div>
                ))}
              </div>
            )}

            {/* Rows / Cards */}
            {loading ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, color: "#9ca3af", padding: 50 }}>
                <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }}/>
                <span style={{ fontSize: 11 }}>Loading repositories…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 50, gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={24} style={{ color: MAROON }}/>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", margin: "0 0 3px" }}>{search ? "No results found" : `No ${tab === "all" ? "items" : tab} yet`}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{search ? "Try a different keyword" : "Create assignments or forms to see them here."}</p>
                </div>
              </div>
            ) : isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "10px 10px 14px" }}>
                {filtered.map(row => (
                  <RepoCard
                    key={`${row.kind}-${row.id}`}
                    row={row}
                    selected={drawerRow?.id === row.id && drawerRow?.kind === row.kind}
                    onClick={() => setDrawerRow(prev => prev?.id === row.id && prev?.kind === row.kind ? null : row)}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
                {filtered.map(row => (
                  <RepoRow
                    key={`${row.kind}-${row.id}`}
                    row={row}
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
        <RepositoryDrawer key={`${drawerRow.kind}-${drawerRow.id}`} row={drawerRow} courseId={courseId} onClose={() => setDrawerRow(null)}/>
      )}
    </>
  );
}