"use client";
/* eslint-disable @next/next/no-img-element */

// src/components/admin/AdminCourseRepositoriesPage.tsx

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, RefreshCw, Folder, ChevronRight,
  FileText, CheckCircle, BookOpen, Filter,
  Users, TrendingUp, X, Download, Trash2,
  Eye, PackageOpen, Check, Clock,
  Pencil, ChevronDown, Music,
  Archive, Image as ImageIcon, Film, ArrowUpRight,
  AlertCircle, BarChart2,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssignmentRepo {
  id: string; name: string; hasRepo: boolean; createdAt: string;
  assignment: {
    id: string; title: string; dueDate: string | null; points: number;
    status: string; submissionCount: number; enrollmentCount: number;
  };
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
  submission: { id: string; status: string; grade: number | null; feedback: string | null; submittedAt: string | null } | null;
}
interface ActivityLog {
  id: string; action: string; targetType: string | null; targetName: string | null; createdAt: string;
  metadata: Record<string, string> | null;
  user: { id: string; name: string | null; email: string; image: string | null };
}
interface EnrolledUser {
  id: string; name: string | null; email: string; image: string | null;
}
interface FormSubmission {
  id: string; submittedAt: string | null;
  user?: { name: string | null; email: string; image: string | null };
}
interface FullRepoData {
  id: string; name: string; createdAt: string;
  assignment: {
    id: string; title: string; dueDate: string | null; points: number;
    status: string; description: string | null; assignmentGroup: string;
  };
  files: RepoFile[];
  logs: ActivityLog[];
}

type TabType   = "all" | "assignments" | "forms";
type SortType  = "newest" | "oldest" | "name" | "submissions";
type DrawerTab = "files" | "pending" | "logs" | "responses";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate  = (iso: string | null) => !iso ? "—" : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
const fmtSize  = (b: number | null) => !b ? "—" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const isImage  = (u: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(u.split("?")[0]);
const isPdf    = (u: string) => /\.pdf$/i.test(u.split("?")[0]);
const isVideo  = (u: string) => /\.(mp4|webm|mov|avi|mkv)$/i.test(u.split("?")[0]);
const isAudio  = (u: string) => /\.(mp3|wav|ogg|m4a|aac)$/i.test(u.split("?")[0]);
const isDoc    = (u: string) => /\.(doc|docx)$/i.test(u.split("?")[0]);
const isSheet  = (u: string) => /\.(xls|xlsx)$/i.test(u.split("?")[0]);
const isZip    = (u: string) => /\.(zip|rar|7z)$/i.test(u.split("?")[0]);

const LOG_CFG: Record<string, { bg: string; text: string; border: string }> = {
  UPLOAD: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  DELETE: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  GRADE:  { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  CREATE: { bg: "#faf5ff", text: "#7c3aed", border: "#e9d5ff" },
  UPDATE: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  SUBMIT: { bg: "#ecfeff", text: "#0891b2", border: "#a5f3fc" },
};

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

// ─── Shared micro-components ──────────────────────────────────────────────────
function FTIcon({ url, size = 14 }: { url: string; size?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = { size, style: { flexShrink: 0 } };
  
  if (isImage(url))  return <ImageIcon {...p} style={{ ...p.style, color: "#0891b2" }}/>;
  if (isPdf(url))    return <FileText {...p} style={{ ...p.style, color: "#dc2626" }}/>;
  if (isVideo(url))  return <Film   {...p} style={{ ...p.style, color: "#7c3aed" }}/>;
  if (isAudio(url))  return <Music  {...p} style={{ ...p.style, color: "#2563eb" }}/>;
  if (isDoc(url))    return <FileText {...p} style={{ ...p.style, color: "#1d4ed8" }}/>;
  if (isSheet(url))  return <FileText {...p} style={{ ...p.style, color: "#16a34a" }}/>;
  if (isZip(url))    return <Archive {...p} style={{ ...p.style, color: "#92400e" }}/>;
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

function SPill({ status }: { status: string }) {
  const cfg: Record<string, [string, string, string, string]> = {
    GRADED:    ["#f0fdf4", "#15803d", "#bbf7d0", "#22c55e"],
    SUBMITTED: ["#eff6ff", "#1d4ed8", "#bfdbfe", "#3b82f6"],
    PENDING:   ["#f9fafb", "#6b7280", "#e5e7eb", "#9ca3af"],
    OVERDUE:   ["#fef2f2", "#dc2626", "#fecaca", "#ef4444"],
  };
  const [bg, text, border, dot] = cfg[status] ?? cfg.PENDING;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 20, background: bg, color: text, border: `1px solid ${border}`, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot, flexShrink: 0 }}/>
      {status.toLowerCase()}
    </span>
  );
}

function DuePill({ dueDate }: { dueDate: string | null }) {
  const m = fmtDue(dueDate);
  if (!m) return <span style={{ fontSize: 11, color: "#d1d5db", fontWeight: 500 }}>No due date</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: m.bg, color: m.color, border: `1px solid ${m.border}`, whiteSpace: "nowrap" }}>{m.label}</span>
  );
}

function ProgressBar({ submitted, enrolled }: { submitted: number; enrolled: number }) {
  const pct = enrolled > 0 ? Math.min(100, Math.round((submitted / enrolled) * 100)) : submitted > 0 ? 100 : 0;
  const color = pct === 100 ? "#16a34a" : pct >= 60 ? "#d97706" : MAROON;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <div style={{ flex: 1, height: 5, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.5s ease" }}/>
      </div>
      <span style={{ fontSize: 10, fontWeight: 900, color, minWidth: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
    </div>
  );
}

function TypeBadge({ kind, subtitle }: { kind: "assignment" | "form"; subtitle: string }) {
  if (kind === "form") return <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "#eff6ff", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{subtitle}</span>;
  return <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "#fef2f2", color: MAROON, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>Assignment</span>;
}

function StatusDot({ status }: { status: string }) {
  const ok = status === "PUBLISHED";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ok ? "#f0fdf4" : "#f9fafb", color: ok ? "#15803d" : "#9ca3af", border: `1px solid ${ok ? "#bbf7d0" : "#e5e7eb"}`, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: ok ? "#22c55e" : "#d1d5db", flexShrink: 0 }}/>
      {ok ? "Live" : "Draft"}
    </span>
  );
}

// ─── Row type ─────────────────────────────────────────────────────────────────
interface Row {
  kind: "assignment" | "form";
  id: string; repoId: string | null; hasRepo: boolean; name: string;
  subtitle: string; dueDate: string | null; status: string;
  submitted: number; enrolled: number; fileCount: number; logCount: number; createdAt: string;
}

// ─── List Row (desktop table row) ─────────────────────────────────────────────
function RepoRow({ row, selected, onClick }: { row: Row; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 16, padding: "13px 20px",
        borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.1s",
        background: selected ? "#fdf2f2" : "transparent",
        borderLeft: `3px solid ${selected ? MAROON : "transparent"}`,
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#fafafa"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: row.kind === "assignment" ? "#fef2f2" : "#eff6ff", border: `1px solid ${row.kind === "assignment" ? "rgba(123,17,19,0.1)" : "rgba(29,78,216,0.1)"}`, transition: "transform 0.1s" }}>
        {row.kind === "assignment" ? <Folder size={15} style={{ color: MAROON }}/> : <FileText size={15} style={{ color: "#1d4ed8" }}/>}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: selected ? MAROON : "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.1s" }}>{row.name}</span>
          <TypeBadge kind={row.kind} subtitle={row.subtitle}/>
          {row.kind === "assignment" && !row.hasRepo && (
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#fffbeb", color: "#d97706", fontWeight: 700, border: "1px solid #fde68a" }}>no repo</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#9ca3af" }}>
          {row.kind === "assignment" && <><span>{row.fileCount} file{row.fileCount !== 1 ? "s" : ""}</span><span style={{ color: "#e5e7eb" }}>·</span><span>{row.logCount} log{row.logCount !== 1 ? "s" : ""}</span><span style={{ color: "#e5e7eb" }}>·</span></>}
          <span>{row.submitted} submitted</span>
        </div>
      </div>

      <div style={{ width: 140, flexShrink: 0, display: "none" }} className="lg-show">
        {row.kind === "assignment" && row.enrolled > 0 ? (
          <div>
            <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>{row.submitted}/{row.enrolled}</p>
            <ProgressBar submitted={row.submitted} enrolled={row.enrolled}/>
          </div>
        ) : row.kind === "form" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
            <Users size={11}/><span style={{ fontWeight: 600 }}>{row.submitted} response{row.submitted !== 1 ? "s" : ""}</span>
          </div>
        ) : <span style={{ fontSize: 11, color: "#e5e7eb" }}>—</span>}
      </div>

      <div style={{ width: 110, flexShrink: 0 }}><DuePill dueDate={row.dueDate}/></div>
      <div style={{ width: 80, flexShrink: 0, display: "flex", justifyContent: "center" }}><StatusDot status={row.status}/></div>
      <ChevronRight size={13} style={{ color: selected ? MAROON : "#d1d5db", flexShrink: 0, transition: "color 0.1s" }}/>
    </div>
  );
}

function StatCard({ label, value, icon, accent, sub }: { label: string; value: number; icon: React.ReactNode; accent: string; sub?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ borderRadius: 8, padding: 8, background: "#f9fafb", color: accent, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 22, fontWeight: 900, color: "#111827", lineHeight: 1, margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
        {sub && <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Bulk Download ────────────────────────────────────────────────────────────
function BulkDownloadButton({ files, assignmentTitle }: { files: RepoFile[]; assignmentTitle: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const submittedFiles = files.filter(f => f.fileUrl && f.uploadedAt);

  const handleDownload = async () => {
    if (submittedFiles.length === 0) return;
    setState("loading");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const byStudent: Record<string, RepoFile[]> = {};
      for (const f of submittedFiles) { if (!byStudent[f.user.id]) byStudent[f.user.id] = []; byStudent[f.user.id].push(f); }
      for (const [, studentFiles] of Object.entries(byStudent)) {
        const sName = (studentFiles[0].user.name ?? studentFiles[0].user.email).replace(/[^a-z0-9\s]/gi, "").trim().replace(/\s+/g, "_");
        const folder = zip.folder(sName);
        if (!folder) continue;
        for (let i = 0; i < studentFiles.length; i++) {
          const sf = studentFiles[i];
          const url = sf.fileUrl.startsWith("/") || sf.fileUrl.startsWith("http") ? sf.fileUrl : `/uploads/submissions/${sf.fileUrl}`;
          try { const res = await fetch(url); const blob = await res.blob(); folder.file(studentFiles.length > 1 ? `${i + 1}_${sf.fileName}` : sf.fileName, blob); } catch { /* skip */ }
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${assignmentTitle.replace(/[^a-z0-9]/gi, "_")}_all_submissions.zip`; a.click(); URL.revokeObjectURL(a.href);
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
    <button onClick={handleDownload} disabled={state === "loading" || submittedFiles.length === 0}
      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, padding: "6px 12px", border: "1px solid", borderRadius: 8, cursor: submittedFiles.length === 0 ? "default" : "pointer", opacity: submittedFiles.length === 0 ? 0.5 : 1, transition: "all 0.15s", ...styles[state] }}>
      {state === "loading" ? <><RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }}/> Preparing...</>
        : state === "done" ? <><Check size={12}/> Downloaded!</>
        : state === "error" ? "Failed"
        : <><PackageOpen size={12}/> Download All ({submittedFiles.length})</>}
    </button>
  );
}

// ─── Student Section ──────────────────────────────────────────────────────────
function StudentSection({ user, files, points, onPreview, onDelete }: {
  user: { id: string; name: string | null; email: string; image: string | null };
  files: RepoFile[]; points: number;
  onPreview: (f: RepoFile) => void; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const graded = files.filter(f => f.submission?.grade != null).length;

  return (
    <div style={{ borderBottom: "1px solid #f9fafb" }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}
      >
        {open ? <ChevronDown size={12} style={{ color: "#9ca3af", flexShrink: 0 }}/> : <ChevronRight size={12} style={{ color: "#9ca3af", flexShrink: 0 }}/>}
        <UAv name={user.name} image={user.image} size={28}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name ?? user.email}</p>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <SPill status={files[0]?.submission?.status ?? "SUBMITTED"}/>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: graded === files.length ? "#f0fdf4" : "#f9fafb", color: graded === files.length ? "#15803d" : "#6b7280", border: `1px solid ${graded === files.length ? "#bbf7d0" : "#e5e7eb"}` }}>
            {graded}/{files.length} graded
          </span>
        </div>
      </button>

      {open && (
        <div style={{ margin: "0 16px 10px 52px", border: "1px solid #f3f4f6", borderRadius: 10, overflow: "hidden" }}>
          {files.map((f, i) => {
            const late = f.submission?.submittedAt && new Date(f.uploadedAt) > new Date(f.submission.submittedAt);
            return (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "none", borderBottom: i < files.length - 1 ? "1px solid #f9fafb" : "none", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fef9f9")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <FTIcon url={f.fileUrl} size={13}/>
                <button onClick={() => onPreview(f)} style={{ flex: 1, fontSize: 12, fontWeight: 600, color: MAROON, textAlign: "left", background: "none", border: "none", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: 0 }}>
                  {f.fileName}
                </button>
                <span style={{ fontSize: 11, color: late ? "#dc2626" : "#9ca3af", flexShrink: 0 }}>
                  {fmtShort(f.uploadedAt)}
                  {late && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "1px 4px", borderRadius: 3 }}>LATE</span>}
                </span>
                <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{fmtSize(f.fileSize)}</span>
                {f.submission?.grade != null
                  ? <span style={{ fontSize: 12, fontWeight: 900, color: MAROON, flexShrink: 0 }}>{f.submission.grade}<span style={{ color: "#9ca3af", fontWeight: 400 }}>/{points}</span></span>
                  : <span style={{ fontSize: 12, color: "#d1d5db", flexShrink: 0 }}>—/{points}</span>}
                <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                  <button onClick={() => onPreview(f)} title="Preview" style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, border: "none", background: "none", cursor: "pointer", color: "#9ca3af" }} onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")} onMouseLeave={e => (e.currentTarget.style.background = "none")}><Eye size={11}/></button>
                  <a href={f.fileUrl} download={f.fileName} target="_blank" rel="noopener noreferrer" style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, color: "#9ca3af", textDecoration: "none" }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#f3f4f6")} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}><Download size={11}/></a>
                  <button onClick={() => onDelete(f.id)} title="Delete" style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, border: "none", background: "none", cursor: "pointer", color: "#9ca3af" }} onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; }} onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#9ca3af"; }}><Trash2 size={11}/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NotSubmittedRow({ user }: { user: EnrolledUser }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid #f9fafb", transition: "background 0.1s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
    >
      <UAv name={user.name} image={user.image} size={28}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#4b5563", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name ?? user.email}</p>
        <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0", flexShrink: 0 }}>
        <Clock size={9}/> Not submitted
      </span>
    </div>
  );
}

// ─── Slide-over Drawer ────────────────────────────────────────────────────────
function RepositoryDrawer({ row, courseId, onClose }: { row: Row; courseId: string; onClose: () => void }) {
  const router = useRouter();
  const [repoData,    setRepoData]    = useState<FullRepoData | null>(null);
  const [enrolled,    setEnrolled]    = useState<EnrolledUser[]>([]);
  const [formSubs,    setFormSubs]    = useState<FormSubmission[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<DrawerTab>(row.kind === "form" ? "responses" : "files");
  const [previewFile, setPreviewFile] = useState<RepoFile | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState("");
  const [savingName,  setSavingName]  = useState(false);

  useEffect(() => {
    setLoading(true); setRepoData(null); setEnrolled([]); setFormSubs([]);
    setActiveTab(row.kind === "form" ? "responses" : "files");
    const load = async () => {
      try {
        if (row.kind === "assignment" && row.repoId) {
          const [repoRes, peopleRes] = await Promise.all([
            fetch(`/api/admin/repositories/${row.repoId}`),
            fetch(`/api/admin/courses/${courseId}/people`),
          ]);
          const [repoJson, peopleJson] = await Promise.all([repoRes.json(), peopleRes.json()]);
          setRepoData(repoJson.repository ?? null);
          setEnrolled((peopleJson.people ?? []).map((p: EnrolledUser) => ({ id: p.id, name: p.name, email: p.email, image: p.image })));
        } else if (row.kind === "form") {
          const res  = await fetch(`/api/admin/courses/${courseId}/forms/${row.id}/submissions`);
          const json = await res.json();
          setFormSubs(json.submissions ?? []);
        }
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, [row.id, row.repoId, row.kind, courseId]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !previewFile) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, previewFile]);

  const deleteFile = async (fileId: string) => {
    if (!confirm("Delete this file permanently?") || !row.repoId) return;
    await fetch(`/api/admin/repositories/${row.repoId}/files/${fileId}`, { method: "DELETE" });
    setRepoData(prev => prev ? { ...prev, files: prev.files.filter(f => f.id !== fileId) } : null);
    if (previewFile?.id === fileId) setPreviewFile(null);
  };

  const saveName = async () => {
    if (!nameInput.trim() || !repoData || !row.repoId) return;
    setSavingName(true);
    const res = await fetch(`/api/admin/repositories/${row.repoId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput }),
    });
    if ((await res.json()).repository) setRepoData(prev => prev ? { ...prev, name: nameInput } : null);
    setEditingName(false); setSavingName(false);
  };

  const goFullView = () => {
    if (row.kind === "assignment") {
      router.push(row.repoId ? `/admin/courses/${courseId}/repositories/${row.repoId}` : `/admin/courses/${courseId}/assignments/${row.id}`);
    } else {
      router.push(`/admin/courses/${courseId}/forms/${row.id}`);
    }
  };

  const files      = repoData?.files ?? [];
  const logs       = repoData?.logs  ?? [];
  const assignment = repoData?.assignment;

  const filesByUser: Record<string, RepoFile[]> = {};
  files.forEach(f => { if (!filesByUser[f.user.id]) filesByUser[f.user.id] = []; filesByUser[f.user.id].push(f); });

  const submittedUserIds = new Set(Object.keys(filesByUser));
  const notSubmitted     = enrolled.filter(u => !submittedUserIds.has(u.id));
  const graded           = files.filter(f => f.submission?.grade != null).length;
  const submitted        = Object.keys(filesByUser).length;
  const pct              = enrolled.length > 0 ? Math.round((submitted / enrolled.length) * 100) : 0;

  const logsByDate: Record<string, ActivityLog[]> = {};
  logs.forEach(log => {
    const d = new Date(log.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    (logsByDate[d] ??= []).push(log);
  });

  const drawerTabs: { key: DrawerTab; label: string; count: number; alert?: boolean }[] = row.kind === "assignment"
    ? [
        { key: "files",   label: "Submissions",   count: submitted            },
        { key: "pending", label: "Not Submitted",  count: notSubmitted.length, alert: notSubmitted.length > 0 },
        { key: "logs",    label: "Activity Log",   count: logs.length          },
      ]
    : [
        { key: "responses", label: "Responses", count: formSubs.length },
      ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.28)", backdropFilter: "blur(2px)" }}/>

      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50, width: "min(600px, 100vw)", background: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column", fontFamily: FONT, animation: "slideInRight 0.22s cubic-bezier(0.4,0,0.2,1)" }}>
        <style>{`
          @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>

        {/* Header */}
        <div style={{ background: MAROON, padding: "14px 20px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.18em", margin: "0 0 4px" }}>
                {row.kind === "assignment" ? "Assignment Repository" : row.subtitle}
              </p>
              {row.kind === "assignment" && editingName ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
                    onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                    style={{ flex: 1, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "4px 8px", fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,0.15)", color: "#fff", outline: "none" }}
                  />
                  <button onClick={saveName} disabled={savingName} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", cursor: "pointer" }}>{savingName ? "…" : "Save"}</button>
                  <button onClick={() => setEditingName(false)} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{repoData?.name ?? row.name}</h2>
                  {row.kind === "assignment" && repoData && (
                    <button onClick={() => { setNameInput(repoData.name); setEditingName(true); }} style={{ color: "rgba(255,255,255,0.45)", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                      <Pencil size={12}/>
                    </button>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button onClick={goFullView} title="Open full detail page"
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 7, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)", cursor: "pointer", transition: "all 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.25)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
              >
                <ArrowUpRight size={12}/> Full view
              </button>
              <button onClick={onClose} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", transition: "all 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
              >
                <X size={14}/>
              </button>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "1px solid #f3f4f6", background: "#fdf8f8", flexShrink: 0, flexWrap: "wrap" }}>
            {[
              { label: row.kind === "form" ? "Responses" : "Submitted", value: row.kind === "form" ? formSubs.length : submitted },
              ...(row.kind === "assignment" ? [
                { label: "Files",         value: files.length         },
                { label: "Graded",        value: graded               },
                { label: "Not Submitted", value: notSubmitted.length  },
              ] : []),
            ].map((s, i, arr) => (
              <div key={s.label} style={{ flex: 1, minWidth: 70, padding: "10px 14px", borderRight: i < arr.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                <p style={{ fontSize: 18, fontWeight: 900, color: "#111827", margin: 0, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
                <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, margin: "3px 0 0" }}>{s.label}</p>
              </div>
            ))}
            {row.kind === "assignment" && enrolled.length > 0 && (
              <div style={{ flex: 2, minWidth: 120, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>Submission rate</span>
                  <span style={{ fontSize: 10, fontWeight: 900, color: MAROON, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                </div>
                <ProgressBar submitted={submitted} enrolled={enrolled.length}/>
              </div>
            )}
            <div style={{ padding: "10px 14px", flexShrink: 0 }}><DuePill dueDate={row.dueDate}/></div>
          </div>
        )}

        {/* Assignment info strip */}
        {!loading && assignment && (
          <div style={{ padding: "10px 16px", background: "#fafafa", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: "#6b7280" }}>
              <span style={{ fontWeight: 700, color: "#1f2937" }}>{assignment.title}</span>
              <span style={{ color: "#e5e7eb" }}>·</span>
              <span style={{ fontWeight: 600, color: MAROON }}>{assignment.points} pts</span>
              {assignment.dueDate && <><span style={{ color: "#e5e7eb" }}>·</span><span>Due {fmtDate(assignment.dueDate)}</span></>}
            </div>
            <BulkDownloadButton files={files} assignmentTitle={assignment.title}/>
          </div>
        )}

        {/* Tab bar */}
        {drawerTabs.length > 1 && (
          <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #f3f4f6", flexShrink: 0, padding: "0 4px" }}>
            {drawerTabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", fontSize: 12, fontWeight: 700, border: "none", background: "none", cursor: "pointer", borderBottom: `2px solid ${activeTab === t.key ? MAROON : "transparent"}`, color: activeTab === t.key ? MAROON : "#9ca3af", transition: "all 0.12s", whiteSpace: "nowrap" }}
              >
                {t.label}
                <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 20, background: activeTab === t.key ? "#fef2f2" : "#f3f4f6", color: activeTab === t.key ? MAROON : "#9ca3af" }}>{t.count}</span>
                {t.alert && activeTab !== t.key && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }}/>}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 12, color: "#9ca3af" }}>
              <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }}/>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Loading...</span>
            </div>
          ) : activeTab === "files" ? (
            submitted === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Folder size={24} style={{ color: MAROON }}/>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#4b5563", margin: "0 0 4px" }}>No submissions yet</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Files will appear when students submit</p>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: "#fef9f9", borderBottom: "1px solid #fce8e8" }}>
                  <div style={{ flex: 1, fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em" }}>Student</div>
                  <div style={{ width: 100, fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em" }}>Submitted</div>
                  <div style={{ width: 60, fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em" }}>Status</div>
                  <div style={{ width: 50, fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "right" }}>Grade</div>
                  <div style={{ width: 72 }}/>
                </div>
                {Object.entries(filesByUser).map(([userId, userFiles]) => (
                  <StudentSection key={userId} user={userFiles[0].user} files={userFiles}
                    points={assignment?.points ?? 0} onPreview={setPreviewFile} onDelete={deleteFile}/>
                ))}
              </>
            )
          ) : activeTab === "pending" ? (
            notSubmitted.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle size={24} style={{ color: "#16a34a" }}/>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#4b5563", margin: "0 0 4px" }}>Everyone has submitted!</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>All {enrolled.length} enrolled members submitted.</p>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#fef2f2", borderBottom: "1px solid #fce8e8" }}>
                  <AlertCircle size={12} style={{ color: MAROON }}/>
                  <span style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {notSubmitted.length} member{notSubmitted.length !== 1 ? "s" : ""} have not submitted
                  </span>
                </div>
                {notSubmitted.map(u => <NotSubmittedRow key={u.id} user={u}/>)}
              </>
            )
          ) : activeTab === "logs" ? (
            logs.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BarChart2 size={24} style={{ color: "#9ca3af" }}/>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#9ca3af", margin: 0 }}>No activity yet</p>
              </div>
            ) : (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                {Object.entries(logsByDate).map(([day, dayLogs]) => (
                  <div key={day} style={{ background: "#fff", border: "1px solid #f3f4f6", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "#fef9f9", borderBottom: "1px solid #f3f4f6" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: MAROON }}>{day}</span>
                      <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>{dayLogs.length} event{dayLogs.length !== 1 ? "s" : ""}</span>
                    </div>
                    {dayLogs.map(log => {
                      const lc = LOG_CFG[log.action] ?? { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" };
                      return (
                        <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #f9fafb", transition: "background 0.1s" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        >
                          <UAv name={log.user.name} image={log.user.image} size={30}/>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#1f2937" }}>{log.user.name ?? log.user.email}</span>
                              <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 20, border: "1px solid", background: lc.bg, color: lc.text, borderColor: lc.border }}>{log.action}</span>
                            </div>
                            {log.targetName && <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.targetName}</p>}
                          </div>
                          <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                            {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )
          ) : (
            formSubs.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={24} style={{ color: "#3b82f6" }}/>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#4b5563", margin: "0 0 4px" }}>No responses yet</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Responses will appear when students submit the form</p>
                </div>
              </div>
            ) : (
              formSubs.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid #f9fafb", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  <UAv name={s.user?.name ?? null} image={s.user?.image ?? null} size={30}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.user?.name ?? s.user?.email ?? "Anonymous"}</p>
                    {s.user?.email && s.user?.name && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{s.user.email}</p>}
                  </div>
                  <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fmtDate(s.submittedAt)}</span>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setPreviewFile(null)}
        >
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", display: "flex", boxShadow: "0 32px 80px rgba(0,0,0,0.3)", width: "100%", maxWidth: 800, maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ flex: 1, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, minHeight: 0, overflow: "auto" }}>
              {isImage(previewFile.fileUrl)
                ? <img src={previewFile.fileUrl} alt={previewFile.fileName} style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 8 }}/>
                : isVideo(previewFile.fileUrl)
                ? <video src={previewFile.fileUrl} controls style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 8 }}/>
                : isPdf(previewFile.fileUrl)
                ? <iframe src={previewFile.fileUrl} title={previewFile.fileName} style={{ width: "100%", height: "80vh", borderRadius: 8, border: "none" }}/>
                : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: "#6b7280" }}>
                    <FTIcon url={previewFile.fileUrl} size={48}/>
                    <p style={{ fontSize: 13, margin: 0 }}>Preview not available</p>
                    <a href={previewFile.fileUrl} download target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: MAROON }}>↓ Download to view</a>
                  </div>
                )}
            </div>
            <div style={{ width: 200, flexShrink: 0, background: "#fff", borderLeft: "1px solid #f3f4f6", display: "flex", flexDirection: "column", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: MAROON, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewFile.fileName}</span>
                <button onClick={() => setPreviewFile(null)} style={{ color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", display: "flex", marginLeft: 6 }}><X size={13}/></button>
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 16, fontSize: 12 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Student</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <UAv name={previewFile.user.name} image={previewFile.user.image} size={26}/>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#1f2937", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewFile.user.name ?? "—"}</p>
                      <p style={{ fontSize: 10, color: "#9ca3af", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewFile.user.email}</p>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "Submitted", value: fmtShort(previewFile.uploadedAt) },
                    { label: "Size",      value: fmtSize(previewFile.fileSize)    },
                  ].map(i => (
                    <div key={i.label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: "#9ca3af" }}>{i.label}</span>
                      <span style={{ fontWeight: 700, color: "#374151", textAlign: "right" }}>{i.value}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#9ca3af" }}>Status</span>
                    <SPill status={previewFile.submission?.status ?? "PENDING"}/>
                  </div>
                </div>
                <div style={{ paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
                  <a href={previewFile.fileUrl} download={previewFile.fileName} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", textDecoration: "none" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#374151")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#6b7280")}
                  >
                    <Download size={12}/> Download file
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminCourseRepositoriesPage({ courseId }: { courseId: string }) {
  const [repos,     setRepos]     = useState<AssignmentRepo[]>([]);
  const [forms,     setForms]     = useState<Form[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [tab,       setTab]       = useState<TabType>("all");
  const [sort,      setSort]      = useState<SortType>("newest");
  const [drawerRow, setDrawerRow] = useState<Row | null>(null);
  const [, startTransition]       = useTransition();

  const fetchData = useCallback(() => {
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
      kind: "assignment", id: r.assignment.id, repoId: r.hasRepo ? r.id : null, hasRepo: r.hasRepo,
      name: r.name, subtitle: "Assignment", dueDate: r.assignment.dueDate, status: r.assignment.status,
      submitted: r.assignment.submissionCount, enrolled: r.assignment.enrollmentCount,
      fileCount: r._count.files, logCount: r._count.logs, createdAt: r.createdAt,
    })),
    ...forms.map((f): Row => ({
      kind: "form", id: f.id, repoId: null, hasRepo: false, name: f.title,
      subtitle: formTypeLabel(f.formType), dueDate: f.dueDate,
      status: f.published ? "PUBLISHED" : "UNPUBLISHED",
      submitted: f._count?.formSubmissions ?? 0, enrolled: 0, fileCount: 0, logCount: 0, createdAt: f.createdAt,
    })),
  ];

  const q        = search.trim().toLowerCase();
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

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 1024px) { .lg-show { display: block !important; } }
      `}</style>

      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f8f8f7", fontFamily: FONT }}>

        {/* Page header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.2em", margin: "0 0 2px" }}>Course</p>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "#111827", margin: 0, lineHeight: 1 }}>Repositories</h1>
          </div>
          <button onClick={() => { setLoading(true); fetchData(); }}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#6b7280", border: "1px solid #e5e7eb", padding: "6px 12px", borderRadius: 8, background: "#fff", cursor: "pointer", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#9ca3af"; e.currentTarget.style.color = "#374151"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; }}
          >
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }}/> Refresh
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <StatCard label="Assignments"     value={repos.length}     icon={<Folder size={14}/>}      accent={MAROON}   sub={`${repos.filter(r => r.hasRepo).length} with repo`}/>
            <StatCard label="Forms"           value={forms.length}     icon={<FileText size={14}/>}    accent="#1d4ed8"  sub={`${formResponses} responses`}/>
            <StatCard label="Total Submitted" value={totalSubmissions} icon={<TrendingUp size={14}/>}  accent="#16a34a"/>
            <StatCard label="Published"       value={published}        icon={<CheckCircle size={14}/>} accent="#0891b2"  sub={`of ${allRows.length} total`}/>
          </div>

          {/* Main table card */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", flex: 1 }}>

            {/* Toolbar */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", width: 220, background: "#fafafa", transition: "all 0.12s" }}
                onFocusCapture={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = MAROON; }}
                onBlurCapture={e => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
              >
                <Search size={13} style={{ color: "#9ca3af", flexShrink: 0 }}/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  style={{ flex: 1, fontSize: 12, color: "#374151", border: "none", outline: "none", background: "transparent" }}/>
                {search && <button onClick={() => setSearch("")} style={{ color: "#9ca3af", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}><X size={12}/></button>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 2, background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
                {tabItems.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 12, fontWeight: 700, borderRadius: 6, border: "none", cursor: "pointer", transition: "all 0.12s", background: tab === t.key ? "#fff" : "transparent", color: tab === t.key ? "#1f2937" : "#6b7280", boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}
                  >
                    {t.label}
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 5px", borderRadius: 20, background: tab === t.key ? "#f3f4f6" : "#e5e7eb", color: tab === t.key ? "#4b5563" : "#6b7280" }}>{t.count}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                <Filter size={12} style={{ color: "#9ca3af" }}/>
                <select value={sort} onChange={e => setSort(e.target.value as SortType)}
                  style={{ fontSize: 12, color: "#374151", border: "1px solid #e5e7eb", borderRadius: 7, padding: "5px 10px", background: "#fff", outline: "none", cursor: "pointer" }}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name A–Z</option>
                  <option value="submissions">Most submitted</option>
                </select>
              </div>

              <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, whiteSpace: "nowrap" }}>
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Column headers */}
            {!loading && filtered.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 20px", background: "#fef9f9", borderBottom: "1px solid #fce8e8" }}>
                {[
                  { label: "Name",     style: { flex: 1 } as React.CSSProperties },
                  { label: "Progress", style: { width: 140 } as React.CSSProperties },
                  { label: "Due",      style: { width: 110 } as React.CSSProperties },
                  { label: "Status",   style: { width: 80, textAlign: "center" } as React.CSSProperties },
                  { label: "",         style: { width: 13 } as React.CSSProperties },
                ].map(h => (
                  <div key={h.label} style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.1em", ...h.style }}>
                    {h.label}
                  </div>
                ))}
              </div>
            )}

            {/* Rows */}
            {loading ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#9ca3af", padding: 60 }}>
                <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }}/>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Loading repositories…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 14 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={26} style={{ color: MAROON }}/>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#4b5563", margin: "0 0 4px" }}>{search ? "No results found" : `No ${tab === "all" ? "items" : tab} yet`}</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{search ? "Try a different keyword" : "Create assignments or forms to see them here."}</p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
                <div style={{ display: "block" }}>
                  {filtered.map(row => (
                    <RepoRow
                      key={`${row.kind}-${row.id}`}
                      row={row}
                      selected={drawerRow?.id === row.id && drawerRow?.kind === row.kind}
                      onClick={() => setDrawerRow(prev =>
                        prev?.id === row.id && prev?.kind === row.kind ? null : row
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {drawerRow && (
        <RepositoryDrawer
          row={drawerRow}
          courseId={courseId}
          onClose={() => setDrawerRow(null)}
        />
      )}
    </>
  );
}