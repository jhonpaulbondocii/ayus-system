"use client";
// src/components/admin/CourseGradesPage.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Download, Upload, Settings, Search, Filter,
  ChevronDown, BookOpen, FileText, RotateCcw, CheckCircle2,
  Clock, AlertCircle, Minus, TrendingUp,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ── Types ──────────────────────────────────────────────────────────────────

interface GradeColumn {
  id: string;
  title: string;
  points: number;
  dueDate: string | null;
  assignmentGroup: string;
  type: "assignment" | "quiz";
}

interface AssignmentGrade {
  assignmentId: string;
  grade: number | null;
  status: string;
  submittedAt: string | null;
  feedback: string | null;
  submissionId: string | null;
}

interface QuizGrade {
  quizId: string;
  score: number | null;
  submittedAt: string | null;
}

interface StudentRow {
  id: string;
  name: string;
  email: string;
  image: string | null;
  assignmentGrades: AssignmentGrade[];
  quizGrades: QuizGrade[];
  totalEarned: number;
  totalPossible: number;
  percentage: number | null;
}

interface GradesData {
  students: StudentRow[];
  assignments: GradeColumn[];
  quizzes: GradeColumn[];
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getLetterGrade(pct: number | null): string {
  if (pct === null) return "—";
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 67) return "D+";
  if (pct >= 60) return "D";
  return "F";
}

function getScoreColor(score: number | null, max: number): string {
  if (score === null) return "#9ca3af";
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.9) return "#15803d";
  if (pct >= 0.7) return "#b45309";
  if (pct >= 0.5) return "#c2410c";
  return "#b91c1c";
}

function getScoreBg(score: number | null, max: number): string {
  if (score === null) return "transparent";
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.9) return "#f0fdf4";
  if (pct >= 0.7) return "#fffbeb";
  if (pct >= 0.5) return "#fff7ed";
  return "#fef2f2";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Recalculate student totals after an optimistic grade update ───────────

function recalcStudent(
  student: StudentRow,
  updatedAssignmentGrades: AssignmentGrade[],
  assignments: GradeColumn[],
  quizzes: GradeColumn[]
): StudentRow {
  // Sum only assignment grades (not quizzes) from the updated list
  const earnedFromAssignments = updatedAssignmentGrades.reduce(
    (sum, g) => sum + (g.grade ?? 0),
    0
  );

  // Sum quiz scores (unchanged)
  const earnedFromQuizzes = student.quizGrades.reduce(
    (sum, g) => sum + (g.score ?? 0),
    0
  );

  const totalEarned = earnedFromAssignments + earnedFromQuizzes;

  const totalPossible =
    assignments.reduce((sum, a) => sum + a.points, 0) +
    quizzes.reduce((sum, q) => sum + q.points, 0);

  const percentage =
    totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;

  return {
    ...student,
    assignmentGrades: updatedAssignmentGrades,
    totalEarned,
    totalPossible,
    percentage,
  };
}

// ── Cell Editor ──────────────────────────────────────────────────────────

interface CellEditorProps {
  value: number | null;
  maxPoints: number;
  onSave: (val: number | null) => Promise<void>;
  onClose: () => void;
  isQuiz?: boolean;
}

function CellEditor({ value, maxPoints, onSave, onClose, isQuiz }: CellEditorProps) {
  const [input, setInput] = useState(value !== null ? String(value) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const handleSave = async () => {
    setError(null);
    const trimmed = input.trim();
    const parsed = trimmed === "" ? null : parseFloat(trimmed);

    if (parsed !== null) {
      if (isNaN(parsed) || parsed < 0) {
        setError("Enter a valid score ≥ 0.");
        return;
      }
      if (parsed > maxPoints) {
        setError(`Score cannot exceed ${maxPoints}.`);
        return;
      }
    }

    setSaving(true);
    try {
      await onSave(parsed);
      onClose(); // only close after the save promise resolves
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="absolute z-50 bg-white border-2 rounded-xl shadow-2xl p-3 min-w-[180px]"
      style={{
        borderColor: MAROON,
        fontFamily: FONT,
        top: "calc(100% + 4px)",
        left: "50%",
        transform: "translateX(-50%)",
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") onClose();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <p
        className="text-[10px] font-black uppercase tracking-widest mb-2"
        style={{ color: MAROON }}
      >
        {isQuiz ? "Quiz Score" : "Grade"} / {maxPoints} pts
      </p>

      <input
        ref={ref}
        type="number"
        min={0}
        max={maxPoints}
        step={0.5}
        value={input}
        onChange={(e) => { setInput(e.target.value); setError(null); }}
        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-bold outline-none focus:border-gray-400 text-gray-800"
        placeholder="–"
        disabled={isQuiz || saving}
      />

      {error && (
        <p className="text-[10px] text-red-500 mt-1 font-semibold">{error}</p>
      )}

      {isQuiz && (
        <p className="text-[10px] text-gray-400 mt-1">Quiz scores are auto-graded.</p>
      )}

      {!isQuiz && (
        <div className="flex gap-1.5 mt-2.5">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-7 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-7 text-xs font-black rounded-lg text-white disabled:opacity-60"
            style={{ background: MAROON }}
          >
            {saving ? "…" : "Save"}
          </button>
        </div>
      )}

      {isQuiz && (
        <button
          onClick={onClose}
          className="w-full mt-2 h-7 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Close
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function CourseGradesPage({ courseId }: { courseId: string }) {
  const [data, setData] = useState<GradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [assignSearch, setAssignSearch] = useState("");
  const [activeCell, setActiveCell] = useState<{ studentId: string; colId: string } | null>(null);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState<string>("All");

  // ── Fetch grades ──────────────────────────────────────────────────────

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    setActiveCell(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/grades`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: GradesData = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to fetch grades:", e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  // ── Close cell editor on outside click ───────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("[data-cell-editor]") &&
        !target.closest("[data-grade-cell]")
      ) {
        setActiveCell(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Save assignment grade (PATCH) ─────────────────────────────────────
  // Only called for assignments — quiz scores are read-only.

  const saveGrade = async (
    studentId: string,
    assignmentId: string,
    grade: number | null
  ) => {
    const key = `${studentId}_${assignmentId}`;
    setSavingCells((p) => new Set(p).add(key));

    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/grades/${studentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId, grade }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Optimistic update — recalculate totals correctly
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map((s) => {
            if (s.id !== studentId) return s;

            const updatedAssignmentGrades = s.assignmentGrades.map((g) =>
              g.assignmentId === assignmentId
                ? {
                    ...g,
                    grade,
                    status: grade !== null ? "GRADED" : "PENDING",
                  }
                : g
            );

            return recalcStudent(
              s,
              updatedAssignmentGrades,
              prev.assignments,
              prev.quizzes
            );
          }),
        };
      });
    } finally {
      setSavingCells((p) => {
        const n = new Set(p);
        n.delete(key);
        return n;
      });
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-64 gap-3 text-gray-400"
        style={{ fontFamily: FONT }}
      >
        <RotateCcw size={16} className="animate-spin" />
        <span className="text-sm font-semibold">Loading gradebook…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="flex items-center justify-center h-64 text-gray-400"
        style={{ fontFamily: FONT }}
      >
        <div className="flex flex-col items-center gap-3">
          <AlertCircle size={28} className="opacity-40" />
          <p className="text-sm font-semibold">Failed to load grades.</p>
          <button
            onClick={fetchGrades}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: MAROON }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const allColumns: GradeColumn[] = [...data.assignments, ...data.quizzes];

  // Build group list, filtering out any undefined/empty groups
  const groups = [
    "All",
    ...Array.from(
      new Set(
        allColumns
          .map((c) => c.assignmentGroup)
          .filter((g): g is string => Boolean(g))
      )
    ),
  ];

  const filteredColumns = allColumns.filter((c) => {
    const matchGroup =
      groupFilter === "All" || c.assignmentGroup === groupFilter;
    const matchSearch = c.title
      .toLowerCase()
      .includes(assignSearch.toLowerCase());
    return matchGroup && matchSearch;
  });

  const filteredStudents = data.students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const COL_W = 110;
  const STUDENT_W = 220;
  const TOTAL_W = 130;

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>

      {/* ── Header Bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={15} style={{ color: MAROON }} />
            <span className="text-sm font-black text-gray-800">Gradebook</span>
          </div>
          <span className="text-gray-300">|</span>
          <span className="text-xs text-gray-500 font-medium">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchGrades}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            title="Refresh"
          >
            <RotateCcw size={13} />
          </button>
          <button className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 transition-all">
            <Upload size={12} /> Import
          </button>
          <button className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 transition-all">
            <Download size={12} /> Export
            <ChevronDown size={11} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
            <Settings size={13} />
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center gap-3 shrink-0 flex-wrap">

        {/* Student search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search students…"
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-1 w-48"
            style={{ "--tw-ring-color": MAROON } as React.CSSProperties}
          />
        </div>

        {/* Assignment search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={assignSearch}
            onChange={(e) => setAssignSearch(e.target.value)}
            placeholder="Search assignments…"
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-1 w-48"
            style={{ "--tw-ring-color": MAROON } as React.CSSProperties}
          />
        </div>

        {/* Group filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={11} className="text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">Group:</span>
          <div className="flex gap-1 flex-wrap">
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setGroupFilter(g)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                style={
                  groupFilter === g
                    ? { background: MAROON, color: "white" }
                    : { background: "white", color: "#6b7280", border: "1px solid #e5e7eb" }
                }
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3">
          {[
            { color: "#f0fdf4", border: "#bbf7d0", text: "#15803d", label: "≥90%" },
            { color: "#fffbeb", border: "#fde68a", text: "#b45309", label: "70–89%" },
            { color: "#fff7ed", border: "#fed7aa", text: "#c2410c", label: "50–69%" },
            { color: "#fef2f2", border: "#fecaca", text: "#b91c1c", label: "<50%" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded"
                style={{ background: l.color, border: `1px solid ${l.border}` }}
              />
              <span className="text-[10px] font-semibold" style={{ color: l.text }}>
                {l.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Gradebook Table ── */}
      <div className="flex-1 overflow-auto">
        {filteredStudents.length === 0 || filteredColumns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <BookOpen size={32} className="opacity-30" />
            <p className="text-sm font-semibold">
              {filteredStudents.length === 0
                ? "No students found."
                : "No assignments or quizzes found."}
            </p>
          </div>
        ) : (
          <table
            className="border-collapse"
            style={{ width: STUDENT_W + filteredColumns.length * COL_W + TOTAL_W }}
          >
            {/* ── Column Headers ── */}
            <thead>
              <tr>
                {/* Student header */}
                <th
                  className="sticky left-0 z-20 bg-white border-b-2 border-r border-gray-200 text-left px-4 py-3"
                  style={{
                    width: STUDENT_W,
                    minWidth: STUDENT_W,
                    borderBottomColor: MAROON,
                  }}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Student
                  </span>
                </th>

                {/* Column headers */}
                {filteredColumns.map((col) => (
                  <th
                    key={col.id}
                    className="border-b-2 border-r border-gray-100 px-2 py-2 text-center align-bottom"
                    style={{
                      width: COL_W,
                      minWidth: COL_W,
                      borderBottomColor: col.type === "quiz" ? "#1d4ed8" : MAROON,
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        {col.type === "quiz" ? (
                          <FileText size={9} style={{ color: "#1d4ed8" }} />
                        ) : (
                          <BookOpen size={9} style={{ color: MAROON }} />
                        )}
                        <span
                          className="text-[9px] font-black uppercase tracking-wide truncate max-w-[80px]"
                          style={{ color: col.type === "quiz" ? "#1d4ed8" : MAROON }}
                          title={col.title}
                        >
                          {col.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-semibold text-gray-400">
                        {col.points} pts
                      </span>
                      {col.dueDate && (
                        <span className="text-[8px] text-gray-300">
                          Due{" "}
                          {new Date(col.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </th>
                ))}

                {/* Total header */}
                <th
                  className="sticky right-0 z-20 border-b-2 border-l-2 border-gray-200 px-4 py-3 text-center bg-gray-50"
                  style={{
                    width: TOTAL_W,
                    minWidth: TOTAL_W,
                    borderBottomColor: "#374151",
                  }}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                    Total
                  </span>
                </th>
              </tr>
            </thead>

            {/* ── Student Rows ── */}
            <tbody>
              {filteredStudents.map((student, si) => (
                <tr
                  key={student.id}
                  className="group hover:bg-gray-50/80 transition-colors"
                  style={{ borderBottom: "1px solid #f3f4f6" }}
                >
                  {/* Student name cell */}
                  <td
                    className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/80 border-r border-gray-100 px-4 py-2.5 transition-colors"
                    style={{ width: STUDENT_W }}
                  >
                    <div className="flex items-center gap-2.5">
                      {student.image ? (
                        <img
                          src={student.image}
                          alt={student.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0"
                          style={{
                            background: MAROON,
                            opacity: 0.7 + (si % 3) * 0.1,
                          }}
                        >
                          {getInitials(student.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">
                          {student.name}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Grade cells */}
                  {filteredColumns.map((col) => {
                    const isQuiz = col.type === "quiz";

                    const score: number | null = isQuiz
                      ? (student.quizGrades.find((g) => g.quizId === col.id)?.score ?? null)
                      : (student.assignmentGrades.find((g) => g.assignmentId === col.id)?.grade ?? null);

                    const status: string | null = isQuiz
                      ? null
                      : (student.assignmentGrades.find((g) => g.assignmentId === col.id)?.status ?? "PENDING");

                    const cellKey = `${student.id}_${col.id}`;
                    const isActive =
                      activeCell?.studentId === student.id &&
                      activeCell?.colId === col.id;
                    const isSaving = savingCells.has(cellKey);

                    return (
                      <td
                        key={col.id}
                        data-grade-cell
                        className="border-r border-gray-100 px-1 py-1 text-center relative cursor-pointer"
                        style={{ width: COL_W }}
                        onClick={() => {
                          setActiveCell(
                            isActive
                              ? null
                              : { studentId: student.id, colId: col.id }
                          );
                        }}
                      >
                        <div
                          className="mx-auto w-full max-w-[88px] h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all relative"
                          style={{
                            background: isActive
                              ? isQuiz ? "#eff6ff" : "#fdf2f2"
                              : getScoreBg(score, col.points),
                            color: isActive
                              ? isQuiz ? "#1d4ed8" : MAROON
                              : getScoreColor(score, col.points),
                            border: isActive
                              ? `2px solid ${isQuiz ? "#1d4ed8" : MAROON}`
                              : "2px solid transparent",
                          }}
                        >
                          {isSaving ? (
                            <RotateCcw size={10} className="animate-spin" />
                          ) : score !== null ? (
                            <span>
                              {score}
                              <span className="font-normal text-[9px] opacity-60">
                                /{col.points}
                              </span>
                            </span>
                          ) : status === "GRADED" ? (
                            <div className="flex items-center gap-1" title="Graded">
                              <CheckCircle2 size={10} className="text-green-600" />
                              <span className="text-[9px] font-bold text-green-600">
                                Done
                              </span>
                            </div>
                          ) : status === "SUBMITTED" ? (
                            <div
                              className="flex items-center gap-1"
                              title="Submitted, not graded"
                            >
                              <Clock size={10} style={{ color: "#1d4ed8" }} />
                              <span className="text-[9px] font-bold text-blue-600">
                                Sub
                              </span>
                            </div>
                          ) : status === "OVERDUE" ? (
                            <div className="flex items-center gap-1" title="Overdue">
                              <AlertCircle size={10} style={{ color: "#b91c1c" }} />
                              <span className="text-[9px] font-bold text-red-600">
                                Late
                              </span>
                            </div>
                          ) : (
                            <Minus size={12} className="text-gray-300" />
                          )}
                        </div>

                        {/* Cell editor popup */}
                        {isActive && (
                          <div data-cell-editor>
                            <CellEditor
                              value={score}
                              maxPoints={col.points}
                              isQuiz={isQuiz}
                              onSave={
                                isQuiz
                                  ? async () => {} // quiz scores are read-only
                                  : (val) => saveGrade(student.id, col.id, val)
                              }
                              onClose={() => setActiveCell(null)}
                            />
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Total cell */}
                  <td
                    className="sticky right-0 z-10 bg-gray-50 group-hover:bg-gray-100/80 border-l-2 border-gray-200 px-4 py-2.5 text-center transition-colors"
                    style={{ width: TOTAL_W }}
                  >
                    {student.percentage !== null ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-sm font-black"
                            style={{
                              color: getScoreColor(
                                student.totalEarned,
                                student.totalPossible
                              ),
                            }}
                          >
                            {student.percentage}%
                          </span>
                          <span
                            className="text-xs font-black px-1.5 py-0.5 rounded-md"
                            style={{
                              background: getScoreBg(
                                student.totalEarned,
                                student.totalPossible
                              ),
                              color: getScoreColor(
                                student.totalEarned,
                                student.totalPossible
                              ),
                            }}
                          >
                            {getLetterGrade(student.percentage)}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {student.totalEarned}/{student.totalPossible}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm font-black text-gray-300">—</span>
                        <span className="text-[10px] text-gray-300">No grades</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* ── Summary Footer ── */}
            <tfoot>
              <tr style={{ borderTop: "2px solid #e5e7eb" }}>
                <td
                  className="sticky left-0 z-10 bg-gray-100 border-r border-gray-200 px-4 py-2.5"
                  style={{ width: STUDENT_W }}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Class Avg
                  </span>
                </td>

                {filteredColumns.map((col) => {
                  const isQuiz = col.type === "quiz";
                  const scores = isQuiz
                    ? filteredStudents
                        .map(
                          (s) =>
                            s.quizGrades.find((g) => g.quizId === col.id)?.score ??
                            null
                        )
                        .filter((v): v is number => v !== null)
                    : filteredStudents
                        .map(
                          (s) =>
                            s.assignmentGrades.find(
                              (g) => g.assignmentId === col.id
                            )?.grade ?? null
                        )
                        .filter((v): v is number => v !== null);

                  const avg =
                    scores.length > 0
                      ? scores.reduce((a, b) => a + b, 0) / scores.length
                      : null;

                  return (
                    <td
                      key={col.id}
                      className="border-r border-gray-200 px-1 py-2.5 text-center bg-gray-100"
                    >
                      {avg !== null ? (
                        <span
                          className="text-xs font-black"
                          style={{ color: getScoreColor(avg, col.points) }}
                        >
                          {avg.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}

                <td
                  className="sticky right-0 z-10 bg-gray-100 border-l-2 border-gray-200 px-4 py-2.5 text-center"
                  style={{ width: TOTAL_W }}
                >
                  {(() => {
                    const validPcts = filteredStudents
                      .map((s) => s.percentage)
                      .filter((v): v is number => v !== null);
                    const avgPct =
                      validPcts.length > 0
                        ? Math.round(
                            validPcts.reduce((a, b) => a + b, 0) / validPcts.length
                          )
                        : null;
                    return avgPct !== null ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className="text-sm font-black"
                          style={{ color: getScoreColor(avgPct, 100) }}
                        >
                          {avgPct}%
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {getLetterGrade(avgPct)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    );
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── Status Bar ── */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-2 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <BookOpen size={10} style={{ color: MAROON }} />
          <span className="text-[10px] font-semibold text-gray-500">
            {data.assignments.length} assignment
            {data.assignments.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText size={10} style={{ color: "#1d4ed8" }} />
          <span className="text-[10px] font-semibold text-gray-500">
            {data.quizzes.length} quiz{data.quizzes.length !== 1 ? "zes" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={10} className="text-green-600" />
          <span className="text-[10px] font-semibold text-gray-500">
            Click any cell to grade
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <BookOpen size={9} style={{ color: MAROON }} />
            <span className="text-[10px] text-gray-400">= Assignment</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText size={9} style={{ color: "#1d4ed8" }} />
            <span className="text-[10px] text-gray-400">= Quiz (auto-graded)</span>
          </div>
        </div>
      </div>
    </div>
  );
}