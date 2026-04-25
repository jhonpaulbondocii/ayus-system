"use client";

// src/components/admin/AdminCourseRepositoriesPage.tsx

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, RefreshCw, Folder, ChevronRight,
  Activity, ClipboardList, FileText, BookOpen,
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

interface Quiz {
  id: string;
  title: string;
  quizType: string;
  points: number;
  published: boolean;
  dueDate: string | null;
  attemptCount: number;
  questionCount: number;
  createdAt: string;
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

type ItemKind = "assignment" | "quiz" | "form";
type TabType  = "all" | "assignments" | "quizzes" | "forms";

interface UnifiedRow {
  kind: ItemKind;
  id: string;
  name: string;
  subtitle: string;
  dueDate: string | null;
  status: string;
  primary: number;
  secondary: number;
  submitted: number;
  enrolled: number;
  createdAt: string;
  hasRepo?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDueMeta(dueDate: string | null) {
  if (!dueDate) return null;
  const now  = Date.now();
  const due  = new Date(dueDate).getTime();
  const diff = due - now;
  const days = diff / (1000 * 60 * 60 * 24);
  if (diff < 0)  return { label: "Overdue",                        color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "🔴" };
  if (days <= 1) return { label: "Due in < 1 day",                 color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "🔴" };
  if (days <= 2) return { label: `Due in ${Math.ceil(days)} days`, color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "🟡" };
  if (days <= 7) return { label: `Due in ${Math.ceil(days)} days`, color: "#ca8a04", bg: "#fefce8", border: "#fef08a", icon: "🟡" };
  return {
    label: new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: "🟢",
  };
}

function quizTypeLabel(t: string) {
  const m: Record<string, string> = {
    GRADED_QUIZ: "Graded Quiz", PRACTICE_QUIZ: "Practice Quiz",
    GRADED_SURVEY: "Graded Survey", UNGRADED_SURVEY: "Ungraded Survey",
  };
  return m[t] ?? t;
}

function formTypeLabel(t: string) {
  const m: Record<string, string> = {
    SURVEY_FEEDBACK: "Survey / Feedback", EVALUATION: "Evaluation",
    REGISTRATION_FORM: "Registration Form", GRADED_ASSESSMENT: "Graded Assessment",
  };
  return m[t] ?? t;
}

// ─── UI atoms ────────────────────────────────────────────────────────────────
function DueBadge({ dueDate }: { dueDate: string | null }) {
  const m = getDueMeta(dueDate);
  if (!m) return <span className="text-xs text-gray-400 font-medium">No due date</span>;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}
    >
      {m.icon} {m.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === "PUBLISHED";
  return (
    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest whitespace-nowrap
      ${ok ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
      {status.toLowerCase()}
    </span>
  );
}

function KindBadge({ kind }: { kind: ItemKind }) {
  const cfg = {
    assignment: { label: "Assignment", cls: "bg-red-50 text-red-700" },
    quiz:       { label: "Quiz",       cls: "bg-purple-50 text-purple-700" },
    form:       { label: "Form",       cls: "bg-blue-50 text-blue-700" },
  }[kind];
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function RowIcon({ kind }: { kind: ItemKind }) {
  const cfg = {
    assignment: { Icon: Folder,        color: MAROON,    bg: "#fdf2f2", border: "rgba(123,17,19,0.15)"    },
    quiz:       { Icon: ClipboardList, color: "#6d28d9", bg: "#f5f3ff", border: "rgba(109,40,217,0.15)"  },
    form:       { Icon: FileText,      color: "#1d4ed8", bg: "#eff6ff", border: "rgba(29,78,216,0.15)"   },
  }[kind];
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <cfg.Icon size={18} style={{ color: cfg.color }} />
    </div>
  );
}

// ─── Desktop row ──────────────────────────────────────────────────────────────
function DesktopRow({ row, onClick }: { row: UnifiedRow; onClick: () => void }) {
  const pct = row.enrolled > 0
    ? Math.min(100, Math.round((row.submitted / row.enrolled) * 100))
    : row.submitted > 0 ? 100 : 0;

  const hoverMap: Record<ItemKind, string> = {
    assignment: "hover:bg-red-50/40",
    quiz:       "hover:bg-purple-50/40",
    form:       "hover:bg-blue-50/40",
  };

  const primaryLabel   = { assignment: "files",     quiz: "attempts",  form: "responses" }[row.kind];
  const secondaryLabel = { assignment: "logs",       quiz: "questions", form: "questions" }[row.kind];
  const progressLabel  = { assignment: "submitted",  quiz: "attempts",  form: "responses" }[row.kind];

  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 transition-all cursor-pointer group border-b border-gray-50 last:border-0 ${hoverMap[row.kind]}`}
      onClick={onClick}
    >
      {/* Icon + name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <RowIcon kind={row.kind} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-sm font-bold truncate text-gray-800 group-hover:underline underline-offset-2"
              style={{ textDecorationColor: MAROON }}
            >
              {row.name}
            </p>
            <KindBadge kind={row.kind} />
            {row.kind === "assignment" && !row.hasRepo && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-bold border border-amber-200">
                no repo
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">{row.subtitle}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="w-44 shrink-0 hidden lg:block">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-gray-500">
            {row.submitted}{row.enrolled > 0 ? `/${row.enrolled}` : ""} {progressLabel}
          </span>
          <span className="text-[10px] font-black tabular-nums" style={{ color: MAROON }}>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct === 100 ? "#16a34a" : MAROON }}
          />
        </div>
      </div>

      {/* Due date */}
      <div className="w-36 shrink-0 hidden md:flex">
        <DueBadge dueDate={row.dueDate} />
      </div>

      {/* Primary / Secondary */}
      <div className="hidden lg:flex items-center gap-3 w-28 shrink-0">
        <div className="text-center">
          <span className="text-sm font-black text-gray-700">{row.primary}</span>
          <p className="text-[10px] text-gray-400">{primaryLabel}</p>
        </div>
        <div className="w-px h-6 bg-gray-100" />
        <div className="text-center">
          <span className="text-sm font-black text-gray-700">{row.secondary}</span>
          <p className="text-[10px] text-gray-400">{secondaryLabel}</p>
        </div>
      </div>

      {/* Status */}
      <div className="w-20 shrink-0 justify-center hidden sm:flex">
        <StatusBadge status={row.status} />
      </div>

      <ChevronRight size={14} className="text-gray-200 group-hover:text-gray-500 transition-colors shrink-0" />
    </div>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────
function MobileCard({ row, onClick }: { row: UnifiedRow; onClick: () => void }) {
  const pct = row.enrolled > 0
    ? Math.min(100, Math.round((row.submitted / row.enrolled) * 100))
    : row.submitted > 0 ? 100 : 0;

  const primaryLabel   = { assignment: "files",     quiz: "attempts",  form: "responses" }[row.kind];
  const secondaryLabel = { assignment: "logs",       quiz: "questions", form: "questions" }[row.kind];
  const progressLabel  = { assignment: "submitted",  quiz: "attempts",  form: "responses" }[row.kind];

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 cursor-pointer active:bg-gray-50 shadow-sm"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <RowIcon kind={row.kind} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-800 truncate">{row.name}</p>
            <KindBadge kind={row.kind} />
            {row.kind === "assignment" && !row.hasRepo && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-bold border border-amber-200">
                no repo
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{row.subtitle}</p>
        </div>
        <StatusBadge status={row.status} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-gray-500">
            {row.submitted}{row.enrolled > 0 ? `/${row.enrolled}` : ""} {progressLabel}
          </span>
          <span className="text-[10px] font-black tabular-nums" style={{ color: MAROON }}>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct === 100 ? "#16a34a" : MAROON }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <DueBadge dueDate={row.dueDate} />
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="font-bold">{row.primary} {primaryLabel}</span>
          <span className="text-gray-300">·</span>
          <span className="font-bold">{row.secondary} {secondaryLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminCourseRepositoriesPage({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [assignmentRepos, setAssignmentRepos] = useState<AssignmentRepo[]>([]);
  const [quizzes,         setQuizzes]         = useState<Quiz[]>([]);
  const [forms,           setForms]           = useState<Form[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [, startTransition]                   = useTransition();
  const [search,          setSearch]          = useState("");
  const [tab,             setTab]             = useState<TabType>("all");

  // Use a ref-based fetch so useEffect never directly calls setState
  const fetchData = useCallback(() => {
    Promise.all([
      fetch(`/api/admin/courses/${courseId}/repositories`).then(r => r.ok ? r.json() : { repositories: [] }),
      fetch(`/api/admin/courses/${courseId}/quizzes`).then(r => r.ok ? r.json() : { quizzes: [] }),
      fetch(`/api/admin/courses/${courseId}/forms`).then(r => r.ok ? r.json() : { forms: [] }),
    ]).then(([repoData, quizData, formData]) => {
      startTransition(() => {
        setAssignmentRepos(repoData.repositories ?? []);
        setQuizzes(quizData.quizzes ?? []);
        setForms(formData.forms ?? []);
        setLoading(false);
      });
    }).catch(() => {
      startTransition(() => setLoading(false));
    });
  }, [courseId, startTransition]);

  // Keep a stable ref to fetchData so the effect dependency is stable
  const fetchRef = useRef(fetchData);
  useEffect(() => { fetchRef.current = fetchData; }, [fetchData]);

  // Run once on mount — reads from ref, never directly calls setState
  useEffect(() => {
    fetchRef.current();
  }, []);

  // Manual refresh button handler — called from click, not from effect
  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // ── Normalise ────────────────────────────────────────────────────────────────
  const allRows: UnifiedRow[] = [
    ...assignmentRepos.map((r): UnifiedRow => ({
      kind:      "assignment",
      id:        r.id,
      name:      r.name,
      subtitle:  r.assignment.title,
      dueDate:   r.assignment.dueDate,
      status:    r.assignment.status,
      primary:   r._count.files,
      secondary: r._count.logs,
      submitted: r.assignment.submissionCount,
      enrolled:  r.assignment.enrollmentCount,
      createdAt: r.createdAt,
      hasRepo:   r.hasRepo,
    })),
    ...quizzes.map((q): UnifiedRow => ({
      kind:      "quiz",
      id:        q.id,
      name:      q.title,
      subtitle:  quizTypeLabel(q.quizType),
      dueDate:   q.dueDate,
      status:    q.published ? "PUBLISHED" : "UNPUBLISHED",
      primary:   q.attemptCount,
      secondary: q.questionCount,
      submitted: q.attemptCount,
      enrolled:  0,
      createdAt: q.createdAt,
    })),
    ...forms.map((f): UnifiedRow => ({
      kind:      "form",
      id:        f.id,
      name:      f.title,
      subtitle:  formTypeLabel(f.formType),
      dueDate:   f.dueDate,
      status:    f.published ? "PUBLISHED" : "UNPUBLISHED",
      primary:   f._count?.formSubmissions ?? 0,
      secondary: 0,
      submitted: f._count?.formSubmissions ?? 0,
      enrolled:  0,
      createdAt: f.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // ── Filter ───────────────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const byTab = tab === "all"         ? allRows
    : tab === "assignments"           ? allRows.filter(r => r.kind === "assignment")
    : tab === "quizzes"               ? allRows.filter(r => r.kind === "quiz")
    : allRows.filter(r => r.kind === "form");

  const filtered = byTab.filter(r =>
    !q || r.name.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)
  );

  // ── Stats ────────────────────────────────────────────────────────────────────
  const publishedCnt = allRows.filter(r => r.status === "PUBLISHED").length;

  // ── Navigate ─────────────────────────────────────────────────────────────────
  function navigate(row: UnifiedRow) {
    if (row.kind === "assignment") {
      if (row.hasRepo) router.push(`/admin/courses/${courseId}/repositories/${row.id}`);
      else router.push(`/admin/courses/${courseId}/assignments/${row.id.replace("assignment-", "")}`);
    } else if (row.kind === "quiz") {
      router.push(`/admin/courses/${courseId}/quizzes/${row.id}`);
    } else {
      router.push(`/admin/courses/${courseId}/forms/${row.id}`);
    }
  }

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all",         label: "All",        count: allRows.length         },
    { key: "assignments", label: "Assignments", count: assignmentRepos.length },
    { key: "quizzes",     label: "Quizzes",     count: quizzes.length         },
    { key: "forms",       label: "Forms",       count: forms.length           },
  ];

  return (
    <div className="h-full flex flex-col bg-[#f8f8f7]" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 shrink-0">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: MAROON }}>Course</p>
          <h1 className="text-lg sm:text-xl font-black text-gray-900 leading-none">Repositories</h1>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400 font-medium hidden sm:block">Assignments · Quizzes · Forms</p>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg transition-all"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Assignments", value: assignmentRepos.length, icon: <Folder size={14} />,        accent: MAROON    },
            { label: "Quizzes",     value: quizzes.length,         icon: <ClipboardList size={14} />, accent: "#6d28d9" },
            { label: "Forms",       value: forms.length,           icon: <FileText size={14} />,      accent: "#1d4ed8" },
            { label: "Published",   value: publishedCnt,           icon: <Activity size={14} />,      accent: "#15803d" },
          ].map(s => (
            <div key={s.label} className="border border-gray-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3 bg-white shadow-sm">
              <div className="rounded-lg p-2 sm:p-2.5 shrink-0" style={{ background: "#f3f4f6", color: s.accent }}>
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-black tabular-nums leading-none text-gray-900">{s.value}</p>
                <p className="text-xs sm:text-sm font-semibold mt-0.5 text-gray-500 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main card ── */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">

          {/* Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2 bg-white">
            {/* Search */}
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 w-full sm:w-64 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
              <Search size={13} className="text-gray-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 text-xs">✕</button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-full sm:w-auto overflow-x-auto">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                    tab === t.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    tab === t.key ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-500"
                  }`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            <span className="ml-auto text-xs text-gray-400 font-medium hidden sm:block whitespace-nowrap">
              {filtered.length} of {byTab.length}
            </span>
          </div>

          {/* Desktop column headers */}
          {!loading && filtered.length > 0 && (
            <div className="hidden lg:flex items-center gap-4 px-5 py-2.5 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
              {[
                { label: "Name",            cls: "flex-1"           },
                { label: "Progress",        cls: "w-44"             },
                { label: "Due Date",        cls: "w-36"             },
                { label: "Primary / Extra", cls: "w-28"             },
                { label: "Status",          cls: "w-20 text-center" },
                { label: "",                cls: "w-4"              },
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
              <RefreshCw size={18} className="animate-spin" />
              <span className="text-xs font-medium">Loading...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 px-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "#fdf2f2" }}>
                <BookOpen size={32} style={{ color: MAROON }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-700">
                  {search ? "No results match your search" : `No ${tab === "all" ? "items" : tab} yet`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {search ? "Try a different keyword" : "Create assignments, quizzes, or forms to see them here."}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop list */}
              <div className="hidden sm:flex flex-1 overflow-y-auto flex-col divide-y divide-gray-50">
                {filtered.map(row => (
                  <DesktopRow key={`${row.kind}-${row.id}`} row={row} onClick={() => navigate(row)} />
                ))}
              </div>
              {/* Mobile cards */}
              <div className="flex sm:hidden flex-1 overflow-y-auto flex-col gap-3 p-4">
                {filtered.map(row => (
                  <MobileCard key={`${row.kind}-${row.id}`} row={row} onClick={() => navigate(row)} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}