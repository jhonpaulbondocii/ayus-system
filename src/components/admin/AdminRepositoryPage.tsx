"use client";

// src/components/admin/AdminCourseRepositoriesPage.tsx

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, RefreshCw, Folder, ChevronRight,
  FileText, CheckCircle, BookOpen, Filter,
  Users, TrendingUp, ExternalLink, X, Download,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssignmentRepo {
  id: string;
  name: string;
  hasRepo: boolean;
  createdAt: string;
  assignment: {
    id: string;
    title: string;
    dueDate: string | null;
    points: number;
    status: string;
    submissionCount: number;
    enrollmentCount: number;
  };
  _count: { files: number; logs: number };
}

interface Form {
  id: string;
  title: string;
  formType: string;
  points: number;
  published: boolean;
  dueDate: string | null;
  createdAt: string;
  _count?: { formSubmissions: number };
}

interface RepoFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
  submission: {
    id: string;
    status: string;
    grade: number | null;
    feedback: string | null;
    submittedAt: string | null;
  } | null;
}

interface ActivityLog {
  id: string;
  action: string;
  targetType: string | null;
  targetName: string | null;
  createdAt: string;
  metadata: Record<string, string> | null;
  user: { id: string; name: string | null; email: string; image: string | null };
}

interface FormSubmission {
  id: string;
  submittedAt: string | null;
  user?: { name: string | null; email: string; image: string | null };
}

interface DrawerData {
  files: RepoFile[];
  logs: ActivityLog[];
  submissions: FormSubmission[];
}

type TabType  = "all" | "assignments" | "forms";
type SortType = "newest" | "oldest" | "name" | "submissions";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate  = (iso: string | null) => !iso ? "—" : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const fmtSize  = (b: number | null) => !b ? "—" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();

const isImage = (u: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(u.split("?")[0]);
const isPdf   = (u: string) => /\.pdf$/i.test(u.split("?")[0]);
const isVideo = (u: string) => /\.(mp4|webm|mov|avi|mkv)$/i.test(u.split("?")[0]);
const isAudio = (u: string) => /\.(mp3|wav|ogg|m4a|aac)$/i.test(u.split("?")[0]);
const isDoc   = (u: string) => /\.(doc|docx)$/i.test(u.split("?")[0]);
const isSheet = (u: string) => /\.(xls|xlsx)$/i.test(u.split("?")[0]);
const isZip   = (u: string) => /\.(zip|rar|7z)$/i.test(u.split("?")[0]);

const LOG_CFG: Record<string, { bg: string; text: string; border: string }> = {
  UPLOAD: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  DELETE: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  GRADE:  { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  CREATE: { bg: "#faf5ff", text: "#7c3aed", border: "#e9d5ff" },
  UPDATE: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  SUBMIT: { bg: "#ecfeff", text: "#0891b2", border: "#a5f3fc" },
};

// ─── File Type Icon ───────────────────────────────────────────────────────────
function FTIcon({ url, size = 14 }: { url: string; size?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = { size, className: "shrink-0" };
  if (isImage(url))  return <FileText {...p} style={{ color: "#0891b2" }}/>;
  if (isPdf(url))    return <FileText {...p} style={{ color: "#dc2626" }}/>;
  if (isVideo(url))  return <FileText {...p} style={{ color: "#7c3aed" }}/>;
  if (isAudio(url))  return <FileText {...p} style={{ color: "#2563eb" }}/>;
  if (isDoc(url))    return <FileText {...p} style={{ color: "#1d4ed8" }}/>;
  if (isSheet(url))  return <FileText {...p} style={{ color: "#16a34a" }}/>;
  if (isZip(url))    return <FileText {...p} style={{ color: "#92400e" }}/>;
  return <FileText {...p} style={{ color: "#6b7280" }}/>;
}

// ─── User Avatar ──────────────────────────────────────────────────────────────
function UAv({ name, image, size = 28 }: { name: string | null; image: string | null; size?: number }) {
  const pal = ["#7b1113", "#1d4ed8", "#16a34a", "#ea580c", "#7c3aed", "#0891b2"];
  const idx = (name?.charCodeAt(0) ?? 0) % pal.length;
  if (image) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={name ?? ""} className="rounded-full object-cover shrink-0 ring-2 ring-white" style={{ width: size, height: size }}/>
  );
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center font-black ring-2 ring-white text-white"
      style={{ width: size, height: size, background: pal[idx], fontSize: size * 0.38 }}>
      {(name ?? "?")[0].toUpperCase()}
    </div>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────────
function SPill({ status }: { status: string }) {
  const cfg: Record<string, [string, string, string, string]> = {
    GRADED:    ["#f0fdf4", "#15803d", "#bbf7d0", "#22c55e"],
    SUBMITTED: ["#eff6ff", "#1d4ed8", "#bfdbfe", "#3b82f6"],
    PENDING:   ["#f9fafb", "#6b7280", "#e5e7eb", "#9ca3af"],
    OVERDUE:   ["#fef2f2", "#dc2626", "#fecaca", "#ef4444"],
  };
  const [bg, text, border, dot] = cfg[status] ?? cfg.PENDING;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{ background: bg, color: text, border: `1px solid ${border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }}/>
      {status.toLowerCase()}
    </span>
  );
}

// ─── Unified row type ─────────────────────────────────────────────────────────
interface Row {
  kind: "assignment" | "form";
  id: string;
  repoId: string | null;
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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDue(iso: string | null) {
  if (!iso) return null;
  const d    = new Date(iso);
  const now  = Date.now();
  const diff = d.getTime() - now;
  const days = diff / 86400000;

  if (diff < 0)  return { label: "Overdue",                    color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
  if (days <= 1) return { label: "Due today",                  color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
  if (days <= 3) return { label: `Due in ${Math.ceil(days)}d`, color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
  if (days <= 7) return { label: `Due in ${Math.ceil(days)}d`, color: "#ca8a04", bg: "#fefce8", border: "#fef08a" };
  return {
    label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0",
  };
}

function formTypeLabel(t: string) {
  const m: Record<string, string> = {
    SURVEY_FEEDBACK:   "Survey",
    EVALUATION:        "Evaluation",
    REGISTRATION_FORM: "Registration",
    GRADED_ASSESSMENT: "Assessment",
  };
  return m[t] ?? t;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function DuePill({ dueDate }: { dueDate: string | null }) {
  const m = fmtDue(dueDate);
  if (!m) return <span className="text-xs text-gray-300 font-medium">No due date</span>;
  return (
    <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      {m.label}
    </span>
  );
}

function ProgressBar({ submitted, enrolled }: { submitted: number; enrolled: number }) {
  const pct   = enrolled > 0 ? Math.min(100, Math.round((submitted / enrolled) * 100)) : submitted > 0 ? 100 : 0;
  const color = pct === 100 ? "#16a34a" : pct >= 60 ? "#d97706" : MAROON;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }}/>
      </div>
      <span className="text-[10px] font-black tabular-nums shrink-0 w-8 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function TypeBadge({ kind, subtitle }: { kind: "assignment" | "form"; subtitle: string }) {
  if (kind === "form") {
    return (
      <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-blue-50 text-blue-700 shrink-0">
        {subtitle}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0"
      style={{ background: "#fef2f2", color: MAROON }}>
      Assignment
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const ok = status === "PUBLISHED";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest whitespace-nowrap
      ${ok ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-500" : "bg-gray-300"}`}/>
      {ok ? "Live" : "Draft"}
    </span>
  );
}

// ─── Repo Row (desktop) ───────────────────────────────────────────────────────
function RepoRow({ row, onClick }: { row: Row; onClick: () => void }) {
  return (
    <div
      className="group flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 cursor-pointer transition-all hover:bg-rose-50/30"
      onClick={onClick}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors group-hover:scale-105"
        style={{ background: row.kind === "assignment" ? "#fef2f2" : "#eff6ff", border: `1px solid ${row.kind === "assignment" ? "rgba(123,17,19,0.12)" : "rgba(29,78,216,0.12)"}` }}>
        {row.kind === "assignment"
          ? <Folder size={16} style={{ color: MAROON }}/>
          : <FileText size={16} style={{ color: "#1d4ed8" }}/>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-sm font-bold text-gray-800 truncate group-hover:text-[#7b1113] transition-colors">
            {row.name}
          </p>
          <TypeBadge kind={row.kind} subtitle={row.subtitle}/>
          {row.kind === "assignment" && !row.hasRepo && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-bold border border-amber-200">
              no repo
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          {row.kind === "assignment" && (
            <>
              <span>{row.fileCount} file{row.fileCount !== 1 ? "s" : ""}</span>
              <span className="text-gray-200">·</span>
              <span>{row.logCount} log{row.logCount !== 1 ? "s" : ""}</span>
              <span className="text-gray-200">·</span>
            </>
          )}
          <span>{row.submitted} submitted</span>
        </div>
      </div>

      <div className="w-36 shrink-0 hidden lg:block">
        {row.kind === "assignment" && row.enrolled > 0 ? (
          <div>
            <p className="text-[10px] text-gray-400 font-semibold mb-1">
              {row.submitted}/{row.enrolled} submitted
            </p>
            <ProgressBar submitted={row.submitted} enrolled={row.enrolled}/>
          </div>
        ) : row.kind === "form" ? (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Users size={11}/>
            <span className="font-semibold">{row.submitted} response{row.submitted !== 1 ? "s" : ""}</span>
          </div>
        ) : (
          <span className="text-[11px] text-gray-300">—</span>
        )}
      </div>

      <div className="w-28 shrink-0 hidden md:flex">
        <DuePill dueDate={row.dueDate}/>
      </div>

      <div className="w-20 shrink-0 hidden sm:flex justify-center">
        <StatusDot status={row.status}/>
      </div>

      <ChevronRight size={14} className="text-gray-200 group-hover:text-gray-400 transition-colors shrink-0"/>
    </div>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────
function RepoCard({ row, onClick }: { row: Row; onClick: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer active:bg-gray-50 shadow-sm" onClick={onClick}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: row.kind === "assignment" ? "#fef2f2" : "#eff6ff" }}>
          {row.kind === "assignment"
            ? <Folder size={16} style={{ color: MAROON }}/>
            : <FileText size={16} style={{ color: "#1d4ed8" }}/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-gray-800 truncate">{row.name}</p>
            <TypeBadge kind={row.kind} subtitle={row.subtitle}/>
          </div>
          <p className="text-[11px] text-gray-400">{row.submitted} submitted</p>
        </div>
        <StatusDot status={row.status}/>
      </div>
      {row.kind === "assignment" && row.enrolled > 0 && (
        <ProgressBar submitted={row.submitted} enrolled={row.enrolled}/>
      )}
      <div className="flex items-center justify-between mt-2">
        <DuePill dueDate={row.dueDate}/>
        {row.kind === "assignment" && (
          <span className="text-[10px] text-gray-400">{row.fileCount} files · {row.logCount} logs</span>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent, sub }: {
  label: string; value: number; icon: React.ReactNode; accent: string; sub?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
      <div className="rounded-lg p-2 shrink-0" style={{ background: "#f3f4f6", color: accent }}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xl font-black tabular-nums leading-none text-gray-900">{value}</p>
        <p className="text-xs font-semibold mt-0.5 text-gray-500 truncate">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Slide-over Drawer ────────────────────────────────────────────────────────
function RepositoryDrawer({
  row, courseId, onClose, onFullView,
}: {
  row: Row;
  courseId: string;
  onClose: () => void;
  onFullView: () => void;
}) {
  const [data,    setData]    = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<"files" | "logs" | "responses">("files");

  useEffect(() => {
    setData(null);
    setLoading(true);
    setTab(row.kind === "form" ? "responses" : "files");

    const load = async () => {
      try {
        if (row.kind === "assignment" && row.repoId) {
          const res  = await fetch(`/api/admin/repositories/${row.repoId}`);
          const json = await res.json();
          setData({
            files:       json.repository?.files       ?? [],
            logs:        json.repository?.logs        ?? [],
            submissions: [],
          });
        } else if (row.kind === "assignment" && !row.repoId) {
          // Assignment without a repo — nothing to show
          setData({ files: [], logs: [], submissions: [] });
        } else {
          // Form submissions
          const res  = await fetch(`/api/admin/courses/${courseId}/forms/${row.id}/submissions`);
          const json = await res.json();
          setData({ files: [], logs: [], submissions: json.submissions ?? [] });
        }
      } catch {
        setData({ files: [], logs: [], submissions: [] });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [row.id, row.repoId, row.kind, courseId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const tabs = row.kind === "assignment"
    ? [
        { key: "files" as const,   label: `Files (${data?.files.length ?? 0})` },
        { key: "logs"  as const,   label: `Activity (${data?.logs.length ?? 0})` },
      ]
    : [
        { key: "responses" as const, label: `Responses (${data?.submissions.length ?? 0})` },
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right"
        style={{ width: "min(540px, 96vw)", fontFamily: FONT }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0"
          style={{ background: MAROON }}>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5"
              style={{ color: "rgba(255,255,255,0.55)" }}>
              {row.kind === "assignment" ? "Assignment repository" : row.subtitle}
            </p>
            <h2 className="text-sm font-black text-white truncate leading-snug">{row.name}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={onFullView}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all"
              style={{ color: "rgba(255,255,255,0.75)", borderColor: "rgba(255,255,255,0.25)" }}
              title="Open full detail page"
            >
              <ExternalLink size={11}/> Full view
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              <X size={15}/>
            </button>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="flex items-center gap-5 px-5 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
          <div>
            <p className="text-base font-black tabular-nums text-gray-800 leading-none">{row.submitted}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Submitted</p>
          </div>
          {row.kind === "assignment" && (
            <>
              <div className="w-px h-8 bg-gray-200"/>
              <div>
                <p className="text-base font-black tabular-nums text-gray-800 leading-none">{row.fileCount}</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Files</p>
              </div>
              <div className="w-px h-8 bg-gray-200"/>
              <div>
                <p className="text-base font-black tabular-nums text-gray-800 leading-none">{row.logCount}</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Logs</p>
              </div>
              {row.enrolled > 0 && (
                <>
                  <div className="w-px h-8 bg-gray-200"/>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <p className="text-[10px] text-gray-400 font-semibold">Submission rate</p>
                      <p className="text-[10px] font-black" style={{ color: MAROON }}>
                        {Math.round((row.submitted / row.enrolled) * 100)}%
                      </p>
                    </div>
                    <ProgressBar submitted={row.submitted} enrolled={row.enrolled}/>
                  </div>
                </>
              )}
            </>
          )}
          <div className="ml-auto shrink-0">
            <DuePill dueDate={row.dueDate}/>
          </div>
        </div>

        {/* ── Tab bar ── */}
        {tabs.length > 1 && (
          <div className="flex border-b border-gray-100 shrink-0 px-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-4 py-2.5 text-xs font-bold border-b-2 transition-all"
                style={tab === t.key
                  ? { borderColor: MAROON, color: MAROON }
                  : { borderColor: "transparent", color: "#9ca3af" }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
              <RefreshCw size={16} className="animate-spin"/>
              <span className="text-xs font-medium">Loading...</span>
            </div>
          ) : !data ? null : (

            /* ─── FILES tab ─── */
            tab === "files" ? (
              data.files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#fdf2f2" }}>
                    <Folder size={24} style={{ color: MAROON }}/>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-600">No files submitted yet</p>
                    <p className="text-xs text-gray-400 mt-0.5">Files will appear when students submit</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {/* Group by student */}
                  {(() => {
                    const byUser: Record<string, RepoFile[]> = {};
                    data.files.forEach(f => {
                      if (!byUser[f.user.id]) byUser[f.user.id] = [];
                      byUser[f.user.id].push(f);
                    });
                    return Object.entries(byUser).map(([uid, files]) => (
                      <div key={uid}>
                        {/* Student header */}
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50/60">
                          <UAv name={files[0].user.name} image={files[0].user.image} size={26}/>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-700 truncate">
                              {files[0].user.name ?? files[0].user.email}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">{files[0].user.email}</p>
                          </div>
                          <SPill status={files[0].submission?.status ?? "PENDING"}/>
                        </div>
                        {/* Files for this student */}
                        {files.map(f => {
                          const late = f.submission?.submittedAt
                            && new Date(f.uploadedAt) > new Date(f.submission.submittedAt);
                          return (
                            <div key={f.id}
                              className="flex items-center gap-3 px-5 py-2.5 pl-14 hover:bg-gray-50 transition-colors group border-t border-gray-50">
                              <FTIcon url={f.fileUrl} size={13}/>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-700 truncate">{f.fileName}</p>
                                <p className="text-[10px] text-gray-400">
                                  {fmtShort(f.uploadedAt)}
                                  {late && <span className="ml-1.5 text-[9px] font-black bg-red-50 text-red-500 border border-red-200 px-1 py-0.5 rounded">LATE</span>}
                                  <span className="ml-1.5">{fmtSize(f.fileSize)}</span>
                                </p>
                              </div>
                              {f.submission?.grade != null
                                ? <span className="text-xs font-black shrink-0" style={{ color: MAROON }}>{f.submission.grade}pts</span>
                                : <span className="text-xs text-gray-300 shrink-0">—</span>}
                              <a href={f.fileUrl} download={f.fileName} target="_blank" rel="noopener noreferrer"
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-all shrink-0">
                                <Download size={12}/>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              )

            /* ─── LOGS tab ─── */
            ) : tab === "logs" ? (
              data.logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-100">
                    <FileText size={22} className="text-gray-300"/>
                  </div>
                  <p className="text-sm font-semibold text-gray-400">No activity yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.logs.map(log => {
                    const lc = LOG_CFG[log.action] ?? { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" };
                    return (
                      <div key={log.id}
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        <UAv name={log.user.name} image={log.user.image} size={32}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-800">
                              {log.user.name ?? log.user.email}
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full border"
                              style={{ background: lc.bg, color: lc.text, borderColor: lc.border }}>
                              {log.action}
                            </span>
                          </div>
                          {log.targetName && (
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{log.targetName}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium tabular-nums shrink-0">
                          {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )

            /* ─── RESPONSES tab (forms) ─── */
            ) : (
              data.submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-50">
                    <FileText size={22} className="text-blue-300"/>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-600">No responses yet</p>
                    <p className="text-xs text-gray-400 mt-0.5">Responses will appear when students submit the form</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.submissions.map(s => (
                    <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <UAv name={s.user?.name ?? null} image={s.user?.image ?? null} size={30}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-700 truncate">
                          {s.user?.name ?? s.user?.email ?? "Anonymous"}
                        </p>
                        {s.user?.email && s.user?.name && (
                          <p className="text-[10px] text-gray-400 truncate">{s.user.email}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium shrink-0">
                        {fmtDate(s.submittedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminCourseRepositoriesPage({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [repos,      setRepos]      = useState<AssignmentRepo[]>([]);
  const [forms,      setForms]      = useState<Form[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [tab,        setTab]        = useState<TabType>("all");
  const [sort,       setSort]       = useState<SortType>("newest");
  const [drawerRow,  setDrawerRow]  = useState<Row | null>(null);
  const [, startTransition]         = useTransition();

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

  // ── Build unified rows ────────────────────────────────────────────────────
  const allRows: Row[] = [
    ...repos.map((r): Row => ({
      kind:      "assignment",
      id:        r.assignment.id,
      repoId:    r.hasRepo ? r.id : null,
      hasRepo:   r.hasRepo,
      name:      r.name,
      subtitle:  "Assignment",
      dueDate:   r.assignment.dueDate,
      status:    r.assignment.status,
      submitted: r.assignment.submissionCount,
      enrolled:  r.assignment.enrollmentCount,
      fileCount: r._count.files,
      logCount:  r._count.logs,
      createdAt: r.createdAt,
    })),
    ...forms.map((f): Row => ({
      kind:      "form",
      id:        f.id,
      repoId:    null,
      hasRepo:   false,
      name:      f.title,
      subtitle:  formTypeLabel(f.formType),
      dueDate:   f.dueDate,
      status:    f.published ? "PUBLISHED" : "UNPUBLISHED",
      submitted: f._count?.formSubmissions ?? 0,
      enrolled:  0,
      fileCount: 0,
      logCount:  0,
      createdAt: f.createdAt,
    })),
  ];

  // ── Filter & Sort ─────────────────────────────────────────────────────────
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

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalSubmissions = repos.reduce((s, r) => s + r.assignment.submissionCount, 0);
  const published        = allRows.filter(r => r.status === "PUBLISHED").length;
  const formResponses    = forms.reduce((s, f) => s + (f._count?.formSubmissions ?? 0), 0);

  // ── Full-view navigation (from drawer) ────────────────────────────────────
  function goFullView(row: Row) {
    if (row.kind === "assignment") {
      if (row.repoId) {
        router.push(`/admin/courses/${courseId}/repositories/${row.repoId}`);
      } else {
        router.push(`/admin/courses/${courseId}/assignments/${row.id}`);
      }
    } else {
      router.push(`/admin/courses/${courseId}/forms/${row.id}`);
    }
  }

  const tabItems: { key: TabType; label: string; count: number }[] = [
    { key: "all",         label: "All",        count: allRows.length },
    { key: "assignments", label: "Assignments", count: repos.length  },
    { key: "forms",       label: "Forms",       count: forms.length  },
  ];

  return (
    <div className="h-full flex flex-col bg-[#f8f8f7]" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 shrink-0">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: MAROON }}>Course</p>
          <h1 className="text-lg sm:text-xl font-black text-gray-900 leading-none">Repositories</h1>
        </div>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Assignments"     value={repos.length}     icon={<Folder size={14}/>}      accent={MAROON}    sub={`${repos.filter(r => r.hasRepo).length} with repo`}/>
          <StatCard label="Forms"           value={forms.length}     icon={<FileText size={14}/>}    accent="#1d4ed8"   sub={`${formResponses} responses`}/>
          <StatCard label="Total Submitted" value={totalSubmissions} icon={<TrendingUp size={14}/>}  accent="#16a34a"/>
          <StatCard label="Published"       value={published}        icon={<CheckCircle size={14}/>} accent="#0891b2"   sub={`of ${allRows.length} total`}/>
        </div>

        {/* ── Main card ── */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">

          {/* Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2 bg-white">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 w-full sm:w-60 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
              <Search size={13} className="text-gray-400 shrink-0"/>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500">✕</button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {tabItems.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md transition-all whitespace-nowrap
                      ${tab === t.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {t.label}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black
                      ${tab === t.key ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-500"}`}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <Filter size={12} className="text-gray-400 shrink-0"/>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortType)}
                  className="text-xs text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-gray-400 cursor-pointer"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name A–Z</option>
                  <option value="submissions">Most submitted</option>
                </select>
              </div>
            </div>

            <span className="ml-auto text-xs text-gray-400 font-medium hidden sm:block whitespace-nowrap">
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Column headers (desktop) */}
          {!loading && filtered.length > 0 && (
            <div className="hidden lg:flex items-center gap-4 px-5 py-2.5 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
              {[
                { label: "Name",     cls: "flex-1"           },
                { label: "Progress", cls: "w-36"             },
                { label: "Due",      cls: "w-28"             },
                { label: "Status",   cls: "w-20 text-center" },
                { label: "",         cls: "w-4"              },
              ].map(h => (
                <div key={h.label} className={`text-[10px] font-black uppercase tracking-widest ${h.cls}`} style={{ color: MAROON }}>
                  {h.label}
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 py-20">
              <RefreshCw size={18} className="animate-spin"/>
              <span className="text-xs font-medium">Loading repositories...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 px-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "#fdf2f2" }}>
                <BookOpen size={32} style={{ color: MAROON }}/>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-700">
                  {search ? "No results found" : `No ${tab === "all" ? "items" : tab} yet`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {search ? "Try a different keyword" : "Create assignments or forms to see them here."}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop list */}
              <div className="hidden sm:flex flex-1 overflow-y-auto flex-col divide-y divide-gray-50">
                {filtered.map(row => (
                  <RepoRow
                    key={`${row.kind}-${row.id}`}
                    row={row}
                    onClick={() => setDrawerRow(row)}
                  />
                ))}
              </div>
              {/* Mobile cards */}
              <div className="flex sm:hidden flex-1 overflow-y-auto flex-col gap-3 p-4">
                {filtered.map(row => (
                  <RepoCard
                    key={`${row.kind}-${row.id}`}
                    row={row}
                    onClick={() => setDrawerRow(row)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Slide-over Drawer ── */}
      {drawerRow && (
        <RepositoryDrawer
          row={drawerRow}
          courseId={courseId}
          onClose={() => setDrawerRow(null)}
          onFullView={() => goFullView(drawerRow)}
        />
      )}
    </div>
  );
}