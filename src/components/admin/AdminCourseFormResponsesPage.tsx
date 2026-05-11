"use client";

// AdminCourseFormResponsesPage.tsx
// Route: /admin/courses/[id]/forms/[formId]/responses

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw, ChevronLeft, Download, Search,
  Calendar, ChevronDown, ChevronUp, X, FileText,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Answer {
  questionId: string;
  question: string;
  type: string;
  answer: string | string[] | null;
  points?: number;
  earnedPoints?: number;
}

interface Submission {
  id: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
    courseRole?: string;
    section?: string | null;
  } | null;
  answers?: Answer[];
  score?: number | null;
  totalPoints?: number | null;
}

interface FormMeta {
  id: string;
  title: string;
  formType: string;
  questions: { id: string; question: string; type: string; points: number }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function fmtAnswerValue(val: string | string[] | null): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
  return val || "—";
}

function getInitial(name: string | null, email: string) {
  if (name) return name.charAt(0).toUpperCase();
  return email.charAt(0).toUpperCase();
}

function exportCSV(submissions: Submission[], formTitle: string) {
  if (!submissions.length) return;
  const defaultName = `${formTitle.replace(/\s+/g, "_")}_responses`;
  const inputName = window.prompt("Enter filename for the CSV export:", defaultName);
  if (inputName === null) return;
  const fileName = (inputName.trim() || defaultName).replace(/\.csv$/i, "") + ".csv";
  const allQuestions = submissions[0]?.answers?.map(a => a.question) ?? [];
  const header = ["Respondent", "Email", "Role", "Section", "Score", "Total Points", "Submitted At", ...allQuestions];
  const rows = submissions.map(s => [
    s.user?.name ?? "Anonymous",
    s.user?.email ?? "",
    s.user?.courseRole ?? "",
    s.user?.section ?? "",
    s.score ?? "",
    s.totalPoints ?? "",
    fmtDateTime(s.createdAt),
    ...(s.answers?.map(a => fmtAnswerValue(a.answer)) ?? []),
  ]);
  const csv = [header, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Score Editor ──────────────────────────────────────────────────────────────
function ScoreEditor({
  submissionId, score, totalPoints, courseId, formId, onSaved,
}: {
  submissionId: string;
  score: number;
  totalPoints: number;
  courseId: string;
  formId: string;
  onSaved: (score: number) => void;
}) {
  const [input, setInput] = useState(String(score));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const parsed = parseFloat(input);
    if (isNaN(parsed) || parsed < 0) { setError("Invalid score."); return; }
    if (totalPoints > 0 && parsed > totalPoints) { setError(`Max is ${totalPoints} pts.`); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/forms/${formId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, score: parsed }),
      });
      if (!res.ok) throw new Error();
      onSaved(parsed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Overall Score</p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="number"
          min={0}
          max={totalPoints || undefined}
          step={0.5}
          value={input}
          onChange={e => { setInput(e.target.value); setError(null); setSaved(false); }}
          className="w-20 h-8 border-2 rounded-lg px-2 text-sm font-black outline-none text-center"
          style={{ borderColor: MAROON, color: MAROON }}
        />
        <span className="text-sm font-bold text-gray-400">
          / {totalPoints > 0 ? `${totalPoints} pts` : "— pts"}
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-8 px-4 rounded-lg text-xs font-black text-white disabled:opacity-60 transition-colors"
          style={{ background: saved ? "#15803d" : MAROON }}
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Score"}
        </button>
      </div>
      {error && <p className="text-[10px] text-red-500 font-semibold mt-1">{error}</p>}
    </div>
  );
}

// ── Submission Detail Modal ───────────────────────────────────────────────────
function SubmissionModal({
  submission, formTitle, onClose, onGrade, courseId, formId, onScoreUpdate,
}: {
  submission: Submission;
  formTitle: string;
  onClose: () => void;
  onGrade: () => void;
  courseId: string;
  formId: string;
  onScoreUpdate: (id: string, score: number) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col border border-gray-100 overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ fontFamily: FONT }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0"
          style={{ background: MAROON }}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
              Response Detail
            </p>
            <p className="text-sm font-bold text-white truncate mt-0.5">{formTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors ml-3 shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* User info + score editor */}
        <div className="px-6 py-4 border-b border-gray-100 shrink-0 bg-gray-50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0"
              style={{ background: MAROON }}
            >
              {getInitial(submission.user?.name ?? null, submission.user?.email ?? "?")}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">
                {submission.user?.name ?? "Anonymous"}
              </p>
              <p className="text-xs text-gray-400 truncate">{submission.user?.email ?? "—"}</p>
              {submission.user?.courseRole && (
                <p className="text-xs font-semibold" style={{ color: MAROON }}>
                  {submission.user.courseRole}
                  {submission.user.section ? ` · ${submission.user.section}` : ""}
                </p>
              )}
            </div>
            <div className="ml-auto text-right shrink-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Submitted</p>
              <p className="text-xs text-gray-600 font-semibold">{fmtDateTime(submission.createdAt)}</p>
            </div>
          </div>

          {/* Score editor */}
          <ScoreEditor
            submissionId={submission.id}
            score={submission.score ?? 0}
            totalPoints={submission.totalPoints ?? 0}
            courseId={courseId}
            formId={formId}
            onSaved={(newScore) => onScoreUpdate(submission.id, newScore)}
          />
        </div>

        {/* Answers */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!submission.answers || submission.answers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No answers recorded.</p>
          ) : (
            submission.answers.map((ans, i) => (
              <div
                key={ans.questionId ?? i}
                className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-bold text-gray-700 flex-1">
                    <span className="text-gray-400 mr-1.5 font-mono">{i + 1}.</span>
                    {ans.question}
                  </p>
                </div>
                <p className="text-sm text-gray-800 pl-5">{fmtAnswerValue(ans.answer)}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-between items-center gap-2">
          <button
            onClick={onClose}
            className="h-8 px-4 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onGrade}
            className="h-8 px-4 rounded-lg text-xs font-black text-white transition-colors"
            style={{ background: MAROON }}
          >
            View in Gradebook →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Submission Row ────────────────────────────────────────────────────────────
function SubmissionRow({
  submission, index, onClick,
}: {
  submission: Submission;
  index: number;
  onClick: () => void;
}) {
  const answerCount = submission.answers?.length ?? 0;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0 group"
    >
      <span className="text-xs text-gray-300 font-mono w-5 shrink-0 text-right">{index + 1}</span>

      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
        style={{ background: MAROON }}
      >
        {getInitial(submission.user?.name ?? null, submission.user?.email ?? "?")}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate group-hover:underline">
          {submission.user?.name ?? "Anonymous"}
        </p>
        <p className="text-xs text-gray-400 truncate">{submission.user?.email ?? "—"}</p>
        {submission.user?.courseRole && (
          <p className="text-xs font-semibold" style={{ color: MAROON }}>
            {submission.user.courseRole}
            {submission.user.section ? ` · ${submission.user.section}` : ""}
          </p>
        )}
      </div>

      {answerCount > 0 && (
        <span className="hidden sm:inline text-xs text-gray-400 shrink-0">
          {answerCount} answer{answerCount !== 1 ? "s" : ""}
        </span>
      )}

      {submission.score !== null && submission.score !== undefined && (
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: "#fef2f2", color: MAROON }}
        >
          {submission.score}/{submission.totalPoints ?? "?"} pts
        </span>
      )}

      <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 shrink-0">
        <Calendar size={11} />
        {fmtDateTime(submission.createdAt)}
      </div>

      <ChevronDown size={13} className="text-gray-300 group-hover:text-gray-500 shrink-0 -rotate-90" />
    </div>
  );
}

// ── Data fetcher ──────────────────────────────────────────────────────────────
async function loadData(courseId: string, formId: string) {
  const [resData, formData] = await Promise.all([
    fetch(`/api/admin/courses/${courseId}/forms/${formId}/submissions`).then(r => r.json()),
    fetch(`/api/admin/courses/${courseId}/forms/${formId}`).then(r => r.json()),
  ]);
  return { submissions: resData.submissions ?? [], form: formData.form ?? formData ?? null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminCourseFormResponsesPage({
  courseId,
  formId,
}: {
  courseId: string;
  formId: string;
}) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [form, setForm] = useState<FormMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    let cancelled = false;
    loadData(courseId, formId)
      .then(({ submissions: subs, form: f }) => {
        if (cancelled) return;
        setSubmissions(subs);
        setForm(f);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [courseId, formId]);

  const handleRefresh = () => {
    setLoading(true);
    loadData(courseId, formId)
      .then(({ submissions: subs, form: f }) => {
        setSubmissions(subs);
        setForm(f);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleScoreUpdate = (submissionId: string, newScore: number) => {
    setSubmissions(prev =>
      prev.map(s => s.id === submissionId ? { ...s, score: newScore } : s)
    );
    setSelected(prev =>
      prev?.id === submissionId ? { ...prev, score: newScore } : prev
    );
  };

  const filtered = submissions
    .filter(s => {
      const q = search.toLowerCase();
      return (
        (s.user?.name ?? "").toLowerCase().includes(q) ||
        (s.user?.email ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "desc" ? -diff : diff;
    });

  const formTitle = form?.title ?? "Form";
  const isGraded = form?.formType === "Graded Assessment";

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0 bg-white">
        <button
          onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}`)}
          className="flex items-center gap-1 text-xs font-bold hover:underline shrink-0"
          style={{ color: MAROON }}
        >
          <ChevronLeft size={13} /> Back
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Responses</p>
          <p className="text-sm font-bold text-gray-800 truncate">{formTitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => exportCSV(filtered, formTitle)}
            disabled={!filtered.length}
            className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex items-center gap-6 px-4 sm:px-6 py-3 border-b border-gray-100 bg-gray-50 shrink-0 overflow-x-auto">
        <div className="shrink-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Responses</p>
          <p className="text-lg font-black" style={{ color: MAROON }}>{submissions.length}</p>
        </div>
        {isGraded && submissions.length > 0 && (
          <div className="shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avg Score</p>
            <p className="text-lg font-black" style={{ color: MAROON }}>
              {(submissions.reduce((s, sub) => s + (sub.score ?? 0), 0) / submissions.length).toFixed(1)}
            </p>
          </div>
        )}
      </div>

      {/* ── Search + sort ── */}
      <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-gray-100 shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-40 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-8 pr-3 h-8 border border-gray-200 rounded-lg text-xs outline-none focus:border-gray-400 bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => setSortDir(d => (d === "desc" ? "asc" : "desc"))}
          className="flex items-center gap-1 h-8 px-3 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
        >
          {sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          {sortDir === "desc" ? "Newest first" : "Oldest first"}
        </button>
        {search && (
          <span className="text-xs text-gray-400 shrink-0">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400 text-sm">
            <RefreshCw size={14} className="animate-spin" /> Loading responses...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "#fef2f2" }}
            >
              <FileText size={22} style={{ color: MAROON }} />
            </div>
            <p className="text-sm font-semibold text-gray-500">
              {search ? `No results for "${search}"` : "No responses yet"}
            </p>
            {!search && (
              <p className="text-xs text-gray-400">Responses will appear here once submitted.</p>
            )}
          </div>
        ) : (
          <div>
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
              <span className="w-5 shrink-0" />
              <span className="w-8 shrink-0" />
              <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Respondent
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 w-20 text-center">
                Answers
              </span>
              {isGraded && (
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 w-20 text-center">
                  Score
                </span>
              )}
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 w-40 text-right">
                Submitted
              </span>
              <span className="w-4 shrink-0" />
            </div>
            {filtered.map((s, i) => (
              <SubmissionRow
                key={s.id}
                submission={s}
                index={i}
                onClick={() => setSelected(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <SubmissionModal
          submission={selected}
          formTitle={formTitle}
          courseId={courseId}
          formId={formId}
          onClose={() => setSelected(null)}
          onGrade={() => router.push(`/admin/courses/${courseId}/grades`)}
          onScoreUpdate={handleScoreUpdate}
        />
      )}
    </div>
  );
}