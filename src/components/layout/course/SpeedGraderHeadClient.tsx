"use client";

// src/components/admin/SpeedGrader.tsx
// Full implementation: rubric scoring (admin), rubric view (student/head),
// all missing logic, complete grade save, comment system, PDF pagination,
// zoom, multi-entry navigation, status management, and rubric persistence.
// FULLY RESPONSIVE & MOBILE-FRIENDLY

import {
  useState, useEffect, useRef, useCallback, useLayoutEffect,
} from "react";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type DisplayGradeAs =
  | "Points"
  | "Percentage"
  | "Complete/Incomplete"
  | "Not Graded";

type SubmissionStatus = "None" | "Graded" | "Excused" | "Missing" | "Late";

interface Assignment {
  id: string;
  title: string;
  points: number;
  dueDate: string | null;
  courseId: string;
  status: "PUBLISHED" | "UNPUBLISHED";
  displayGradeAs?: DisplayGradeAs;
  description?: string | null;
}

interface StoredEntry {
  entryId:    string;
  label:      string;
  type:       string;
  fileUrl:    string | null;
  fileName:   string | null;
  textEntry:  string | null;
  websiteUrl: string | null;
  required:   boolean;
}

interface Submission {
  id:           string;
  userId:       string;
  userName:     string | null;
  userEmail:    string;
  status:       string;
  grade:        number | null;
  fileUrl:      string | null;
  submittedAt:  string | null;
  feedback:     string | null;
  textEntry:    string | null;
  websiteUrl:   string | null;
  daysLate?:    number | null;
  isMulti?:     boolean;
  entries?:     StoredEntry[];
  allFileUrls?: { label: string; url: string }[];
}

// ── Rubric Types ──────────────────────────────────────────────────────────────
interface RubricRating {
  id?:         string;
  points:      number;
  name:        string;
  description: string;
  order:       number;
}

interface RubricCriterion {
  id?:          string;
  name:         string;
  description:  string;
  points:       number;
  enableRange:  boolean;
  order:        number;
  ratings:      RubricRating[];
}

interface Rubric {
  id?:                  string;
  title:                string;
  type:                 string;
  ratingDisplay:        string;
  ratingOrder:          string;
  scoring:              string;
  doNotPostToGradebook: boolean;
  useForGrading:        boolean;
  hideScoreTotal:       boolean;
  pointsPossible:       number;
  criteria:             RubricCriterion[];
}

// Per-criterion selection: criterionId → rating points chosen
type RubricSelections = Record<string, number>;

// Persisted rubric feedback per student
interface RubricFeedback {
  selections:  RubricSelections;
  totalScore:  number;
  completedAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grade display helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatGradeForDisplay(
  grade: number | null,
  maxPoints: number,
  displayAs: DisplayGradeAs,
): string {
  if (displayAs === "Not Graded") return "N/G";
  if (grade === null) return "—";
  if (displayAs === "Points") return `${grade}/${maxPoints}`;
  if (displayAs === "Percentage") {
    const pct = maxPoints > 0 ? Math.round((grade / maxPoints) * 100) : 0;
    return `${pct}%`;
  }
  if (displayAs === "Complete/Incomplete")
    return grade > 0 ? "Complete" : "Incomplete";
  return `${grade}/${maxPoints}`;
}

function formatGradeShortForDropdown(
  grade: number | null,
  maxPoints: number,
  displayAs: DisplayGradeAs,
  submissionStatus?: string,
): string {
  if (displayAs === "Not Graded") return "N/G";
  if (submissionStatus === "EXCUSED") return "Excused";
  if (grade === null) return "Not graded";
  if (displayAs === "Points") return `${grade} pts`;
  if (displayAs === "Percentage") {
    const pct = maxPoints > 0 ? Math.round((grade / maxPoints) * 100) : 0;
    return `${pct}%`;
  }
  if (displayAs === "Complete/Incomplete")
    return grade > 0 ? "✓ Complete" : "✗ Incomplete";
  return `${grade} pts`;
}

// ─────────────────────────────────────────────────────────────────────────────
// General helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " +
    d
      .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      .toLowerCase()
  );
}

function normalizeFileUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/") || url.startsWith("http")) return url;
  return `/uploads/submissions/${url}`;
}

function isPdf(url: string | null) {
  return !!url && /\.pdf$/i.test(url.split("?")[0]);
}
function isImage(url: string | null) {
  return (
    !!url &&
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.split("?")[0])
  );
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/[\s,]+/).filter(Boolean);
    return (
      ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"
    );
  }
  return email.slice(0, 2).toUpperCase();
}

function parseStoredFileUrl(raw: string | null): {
  isMulti: boolean;
  entries: StoredEntry[];
  fileUrl: string | null;
} {
  if (!raw) return { isMulti: false, entries: [], fileUrl: null };
  if (raw.trimStart().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as {
        version?: number;
        entries?: StoredEntry[];
      };
      if (parsed.version === 2 && Array.isArray(parsed.entries))
        return { isMulti: true, entries: parsed.entries, fileUrl: null };
    } catch { /* not JSON */ }
  }
  return { isMulti: false, entries: [], fileUrl: raw };
}

function dbStatusToUi(dbStatus: string): SubmissionStatus {
  switch (dbStatus?.toUpperCase()) {
    case "EXCUSED":   return "Excused";
    case "MISSING":   return "Missing";
    case "LATE":      return "Late";
    case "GRADED":    return "Graded";
    case "SUBMITTED": return "None";
    default:          return "None";
  }
}

function uiStatusToDb(uiStatus: SubmissionStatus): string {
  switch (uiStatus) {
    case "Excused": return "EXCUSED";
    case "Missing": return "MISSING";
    case "Late":    return "LATE";
    case "Graded":  return "GRADED";
    default:        return "SUBMITTED";
  }
}

function computeRubricTotal(
  rubric: Rubric,
  selections: RubricSelections,
): number {
  return rubric.criteria.reduce((sum, c) => {
    const key = c.id ?? c.name;
    return sum + (selections[key] ?? 0);
  }, 0);
}

function rubricIsComplete(
  rubric: Rubric,
  selections: RubricSelections,
): boolean {
  return rubric.criteria.every((c) => {
    const key = c.id ?? c.name;
    return key in selections;
  });
}

function letterGrade(points: number, max: number): string {
  if (max === 0) return "—";
  const pct = (points / max) * 100;
  if (pct >= 97) return "A+";
  if (pct >= 93) return "A";
  if (pct >= 90) return "A−";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B−";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C−";
  if (pct >= 67) return "D+";
  if (pct >= 63) return "D";
  if (pct >= 60) return "D−";
  return "F";
}

// ─────────────────────────────────────────────────────────────────────────────
// FileViewer
// ─────────────────────────────────────────────────────────────────────────────
function FileViewer({
  fileUrl,
  zoom,
  pdfPage,
  setPdfTotal,
}: {
  fileUrl:     string | null;
  zoom:        number;
  pdfPage:     number;
  setPdfTotal: (n: number) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const url = normalizeFileUrl(fileUrl);

  if (!url)
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3 mt-16 sm:mt-32"
        style={{ color: "rgba(255,255,255,.25)" }}
      >
        <svg className="w-14 h-14 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" />
        </svg>
        <p className="text-sm">No file submitted</p>
      </div>
    );

  if (isPdf(url))
    return (
      <div
        className="bg-white shadow-2xl transition-transform w-full"
        style={{
          transform:       `scale(${zoom})`,
          transformOrigin: "top center",
          maxWidth:        850,
          minHeight:       600,
        }}
      >
        <iframe
          ref={iframeRef}
          src={`${url}#page=${pdfPage}`}
          className="w-full"
          style={{ height: Math.round(1100 * zoom) + "px", border: "none" }}
          onLoad={() => {
            try {
              const doc = (
                iframeRef.current?.contentWindow as unknown as {
                  PDFViewerApplication?: { pdfDocument?: { numPages?: number } };
                }
              )?.PDFViewerApplication;
              if (doc?.pdfDocument?.numPages)
                setPdfTotal(doc.pdfDocument.numPages);
            } catch { /* cross-origin */ }
          }}
        />
      </div>
    );

  if (isImage(url))
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Submission"
        className="max-w-full shadow-2xl rounded transition-transform"
        style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
      />
    );

  return (
    <div className="flex flex-col items-center gap-4 mt-16 sm:mt-32">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,.08)" }}>
        <svg className="w-10 h-10" style={{ color: "rgba(255,255,255,.4)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm" style={{ color: "rgba(255,255,255,.4)" }}>{url.split("/").pop()}</p>
      <a
        href={url}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-lg"
        style={{ background: MAROON }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" />
        </svg>
        Download to view
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GradeInputSection
// ─────────────────────────────────────────────────────────────────────────────
function GradeInputSection({
  assignment,
  gradeInput,
  setGradeInput,
  ciStatus,
  setCiStatus,
  setStatusInput,
  onSave,
}: {
  assignment:    Assignment;
  gradeInput:    string;
  setGradeInput: (v: string) => void;
  ciStatus:      string;
  setCiStatus:   (v: string) => void;
  setStatusInput:(v: SubmissionStatus) => void;
  onSave:        (gradeOverride?: number | null) => void;
}) {
  const displayAs: DisplayGradeAs = assignment.displayGradeAs ?? "Points";
  const maxPoints = assignment.points;

  if (displayAs === "Not Graded")
    return (
      <div className="rounded-lg px-3 py-2.5 border border-dashed border-gray-200 bg-gray-50">
        <p className="text-[11px] font-bold text-gray-400 text-center">
          This assignment is set to <span className="font-black text-gray-500">Not Graded</span> — no score recorded.
        </p>
      </div>
    );

  if (displayAs === "Complete/Incomplete")
    return (
      <div>
        <label className="text-[10px] font-semibold text-gray-400 block mb-1">Grade ({maxPoints} pts max)</label>
        <select
          value={ciStatus}
          onChange={(e) => {
            const val = e.target.value;
            setCiStatus(val);
            if (val === "Complete") { setGradeInput(String(maxPoints)); onSave(maxPoints); }
            else if (val === "Incomplete") { setGradeInput("0"); onSave(0); }
            else if (val === "Excused") { setGradeInput(""); setStatusInput("Excused"); onSave(null); }
            else { setGradeInput(""); onSave(null); }
          }}
          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-[13px] font-bold text-gray-800 focus:outline-none bg-white appearance-none cursor-pointer"
          style={{ fontFamily: FONT }}
          onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
        >
          <option value="---">---</option>
          <option value="Complete">Complete</option>
          <option value="Incomplete">Incomplete</option>
          <option value="Excused">Excused</option>
        </select>
      </div>
    );

  if (displayAs === "Percentage") {
    const rawNum = gradeInput !== "" ? parseFloat(gradeInput) : null;
    const pctDisplay = rawNum !== null && !isNaN(rawNum) && maxPoints > 0
      ? Math.round((rawNum / maxPoints) * 100)
      : null;
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold text-gray-400">Grade (enter percentage)</label>
          <span className="text-[10px] text-gray-300">{maxPoints} pts max</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              max="100"
              value={pctDisplay ?? ""}
              onChange={(e) => {
                const pct = parseFloat(e.target.value);
                if (!isNaN(pct)) {
                  const raw = Math.round((pct / 100) * maxPoints * 10) / 10;
                  setGradeInput(String(raw));
                } else {
                  setGradeInput("");
                }
              }}
              placeholder="—"
              className="w-full border border-gray-200 rounded-lg px-2 py-2 text-[13px] font-bold text-gray-800 focus:outline-none bg-white pr-6"
              style={{ fontFamily: FONT }}
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; onSave(); }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-bold text-gray-400">%</span>
          </div>
          {pctDisplay !== null && !isNaN(pctDisplay) && (
            <div className="shrink-0 text-[11px] font-bold text-gray-500 bg-gray-100 rounded-lg px-2 py-1.5">
              {gradeInput} pts
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="text-[10px] font-semibold text-gray-400 block mb-1">Grade out of {maxPoints}</label>
      <input
        type="number"
        min="0"
        max={maxPoints}
        value={gradeInput}
        onChange={(e) => setGradeInput(e.target.value)}
        placeholder="—"
        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-[13px] font-bold text-gray-800 focus:outline-none bg-white"
        style={{ fontFamily: FONT }}
        onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; onSave(); }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusSection
// ─────────────────────────────────────────────────────────────────────────────
function StatusSection({
  statusInput,
  setStatusInput,
  daysLate,
  setDaysLate,
  onSave,
  onStatusChange,
}: {
  statusInput:     SubmissionStatus;
  setStatusInput:  (v: SubmissionStatus) => void;
  daysLate:        string;
  setDaysLate:     (v: string) => void;
  onSave:          () => void;
  onStatusChange?: () => void;
}) {
  return (
    <div className="mt-2 space-y-2">
      <div>
        <label className="text-[10px] font-semibold text-gray-400 block mb-1">Status</label>
        <select
          value={statusInput}
          onChange={(e) => {
            const val = e.target.value as SubmissionStatus;
            setStatusInput(val);
            onStatusChange?.();
            if (val !== "Late") setDaysLate("");
            if (val !== "Late") setTimeout(onSave, 0);
          }}
          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-[12px] text-gray-700 bg-white focus:outline-none appearance-none cursor-pointer"
          style={{ fontFamily: FONT }}
          onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
        >
          <option value="None">None</option>
          <option value="Graded">Graded</option>
          <option value="Excused">Excused</option>
          <option value="Missing">Missing</option>
          <option value="Late">Late</option>
        </select>
      </div>
      {statusInput === "Late" && (
        <div>
          <label className="text-[10px] font-semibold text-gray-400 block mb-1">Days Late</label>
          <input
            type="number"
            min="0"
            value={daysLate}
            onChange={(e) => setDaysLate(e.target.value)}
            placeholder="0"
            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-[12px] font-bold text-gray-700 focus:outline-none bg-white"
            style={{ fontFamily: FONT }}
            onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; onSave(); }}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RubricScoringSection
// ─────────────────────────────────────────────────────────────────────────────
function RubricScoringSection({
  rubric,
  selections,
  onSelect,
}: {
  rubric:     Rubric;
  selections: RubricSelections;
  onSelect:   (criterionId: string, points: number) => void;
}) {
  const totalSelected = computeRubricTotal(rubric, selections);
  const allSelected   = rubricIsComplete(rubric, selections);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>
          {rubric.title}
        </p>
        <div className="flex items-center gap-1.5">
          {allSelected && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
              Complete
            </span>
          )}
          <span className="text-[12px] font-black" style={{ color: MAROON }}>
            {totalSelected}
            <span className="text-[10px] font-semibold text-gray-400">/{rubric.pointsPossible} pts</span>
          </span>
        </div>
      </div>

      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: rubric.pointsPossible > 0 ? `${Math.min(100, (totalSelected / rubric.pointsPossible) * 100)}%` : "0%",
            background: MAROON,
          }}
        />
      </div>

      <div className="space-y-3">
        {rubric.criteria.map((criterion) => {
          const key         = criterion.id ?? criterion.name;
          const selectedPts = selections[key];
          const hasSelection = key in selections;

          const sortedRatings = [...criterion.ratings].sort((a, b) =>
            rubric.ratingOrder === "high_low" ? b.points - a.points : a.points - b.points,
          );

          return (
            <div key={key} className="border border-gray-100 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-3 py-2 border-b border-gray-100"
                style={{ background: hasSelection ? "#fdf8f8" : "#fafafa" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-gray-800 truncate">{criterion.name}</p>
                  {criterion.description && (
                    <p className="text-[10px] text-gray-400 leading-tight mt-0.5 truncate">{criterion.description}</p>
                  )}
                </div>
                <div className="shrink-0 ml-2 text-right">
                  {hasSelection ? (
                    <span className="text-[13px] font-black" style={{ color: MAROON }}>
                      {selectedPts}
                      <span className="text-[10px] font-semibold text-gray-400">/{criterion.points}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-300 font-semibold">—/{criterion.points}</span>
                  )}
                </div>
              </div>

              {/* Scrollable ratings on mobile */}
              <div className="p-2 flex flex-wrap gap-1.5">
                {sortedRatings.map((rating, ri) => {
                  const isSelected = hasSelection && selectedPts === rating.points;
                  return (
                    <button
                      key={ri}
                      type="button"
                      onClick={() => onSelect(key, rating.points)}
                      title={rating.description || rating.name}
                      className="flex flex-col items-center px-2.5 py-2 rounded-lg border text-left transition-all touch-manipulation"
                      style={
                        isSelected
                          ? { background: MAROON, borderColor: MAROON, color: "#fff" }
                          : { background: "#fff", borderColor: "#e5e7eb", color: "#374151" }
                      }
                    >
                      <span className="text-[11px] font-black leading-tight">
                        {rating.points}
                        <span className="text-[9px] font-semibold opacity-70"> pts</span>
                      </span>
                      <span
                        className="text-[9px] font-semibold leading-tight mt-0.5 max-w-[60px] text-center truncate"
                        style={{ color: isSelected ? "rgba(255,255,255,.8)" : "#6b7280" }}
                      >
                        {rating.name}
                      </span>
                    </button>
                  );
                })}
                {hasSelection && (
                  <button
                    type="button"
                    onClick={() => onSelect(key, -1)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-100 text-gray-300 hover:text-red-400 hover:border-red-200 transition-all self-center touch-manipulation"
                    title="Clear selection"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {allSelected && (
        <p className="text-[10px] text-gray-400 text-center">
          Score <span className="font-black" style={{ color: MAROON }}>{totalSelected} pts</span> will be applied to grade
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RubricStudentView
// ─────────────────────────────────────────────────────────────────────────────
function RubricStudentView({
  rubric,
  selections,
}: {
  rubric:     Rubric;
  selections: RubricSelections;
}) {
  const isGraded   = Object.keys(selections).length > 0;
  const totalScore = computeRubricTotal(rubric, selections);

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100" style={{ background: "#fff" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: MAROON }}>
        <div>
          <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">Rubric</p>
          <p className="text-[14px] font-black text-white leading-tight">{rubric.title}</p>
        </div>
        {isGraded ? (
          <div className="text-right">
            <p className="text-[22px] font-black text-white leading-none">
              {totalScore}
              <span className="text-[13px] font-semibold text-white/60">/{rubric.pointsPossible}</span>
            </p>
            {!rubric.hideScoreTotal && (
              <p className="text-[11px] font-semibold text-white/60 mt-0.5">
                {letterGrade(totalScore, rubric.pointsPossible)} · {rubric.pointsPossible > 0 ? Math.round((totalScore / rubric.pointsPossible) * 100) : 0}%
              </p>
            )}
          </div>
        ) : (
          <div className="px-2.5 py-1 rounded-full text-[10px] font-black" style={{ background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.7)" }}>
            Pending
          </div>
        )}
      </div>

      {isGraded && (
        <div className="w-full h-1.5" style={{ background: "rgba(123,17,19,.1)" }}>
          <div
            className="h-full transition-all duration-700"
            style={{
              width: rubric.pointsPossible > 0 ? `${Math.min(100, (totalScore / rubric.pointsPossible) * 100)}%` : "0%",
              background: MAROON,
            }}
          />
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {rubric.criteria.map((criterion, ci) => {
          const key         = criterion.id ?? criterion.name;
          const selectedPts = selections[key];
          const hasScore    = key in selections;

          const sortedRatings = [...criterion.ratings].sort((a, b) =>
            rubric.ratingOrder === "high_low" ? b.points - a.points : a.points - b.points,
          );

          const selectedRating = hasScore
            ? sortedRatings.find((r) => r.points === selectedPts) ?? null
            : null;

          return (
            <div key={key} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black text-gray-800">{ci + 1}. {criterion.name}</p>
                  {criterion.description && (
                    <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{criterion.description}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {hasScore ? (
                    <span className="text-[14px] font-black" style={{ color: MAROON }}>
                      {selectedPts}
                      <span className="text-[10px] font-semibold text-gray-400">/{criterion.points}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-300">—/{criterion.points}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {sortedRatings.map((rating, ri) => {
                  const isSelected = hasScore && selectedPts === rating.points;
                  return (
                    <div
                      key={ri}
                      title={rating.description}
                      className="flex flex-col items-center px-2.5 py-1.5 rounded-lg border transition-all cursor-default"
                      style={
                        isSelected
                          ? { background: MAROON, borderColor: MAROON, color: "#fff", boxShadow: `0 2px 8px ${MAROON}55` }
                          : { background: "#f9fafb", borderColor: "#e5e7eb", color: "#9ca3af", opacity: isGraded ? 0.5 : 1 }
                      }
                    >
                      <span className="text-[11px] font-black leading-tight">
                        {rating.points}
                        <span className="text-[9px] font-semibold" style={{ opacity: 0.7 }}> pts</span>
                      </span>
                      <span className="text-[9px] font-semibold leading-tight mt-0.5 max-w-[64px] text-center"
                        style={{ color: isSelected ? "rgba(255,255,255,.85)" : "#9ca3af" }}>
                        {rating.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectedRating?.description && (
                <div className="mt-2 px-2.5 py-1.5 rounded-lg text-[10px] leading-snug"
                  style={{ background: "#fdf8f8", color: "#7b1113", border: `1px solid rgba(123,17,19,.15)` }}>
                  <span className="font-black">{selectedRating.name}: </span>
                  {selectedRating.description}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!rubric.hideScoreTotal && isGraded && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100" style={{ background: "#fdf8f8" }}>
          <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Rubric Total</p>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-gray-400">
              {rubric.pointsPossible > 0 ? Math.round((totalScore / rubric.pointsPossible) * 100) : 0}%
            </span>
            <span className="text-[16px] font-black" style={{ color: MAROON }}>
              {totalScore}
              <span className="text-[11px] font-semibold text-gray-400">/{rubric.pointsPossible} pts</span>
            </span>
          </div>
        </div>
      )}

      {!isGraded && (
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 text-center">Rubric has not been scored yet.</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AssessmentPanel
// ─────────────────────────────────────────────────────────────────────────────
function AssessmentPanel({
  assignment,
  rubric,
  gradeInput,
  setGradeInput,
  ciStatus,
  setCiStatus,
  statusInput,
  setStatusInput,
  daysLate,
  setDaysLate,
  onSave,
  savedFlash,
  gradeSaving,
  onStatusChange,
  rubricSelections,
  onRubricSelect,
}: {
  assignment:       Assignment;
  rubric:           Rubric | null;
  gradeInput:       string;
  setGradeInput:    (v: string) => void;
  ciStatus:         string;
  setCiStatus:      (v: string) => void;
  statusInput:      SubmissionStatus;
  setStatusInput:   (v: SubmissionStatus) => void;
  daysLate:         string;
  setDaysLate:      (v: string) => void;
  onSave:           (gradeOverride?: number | null) => void;
  savedFlash:       boolean;
  gradeSaving:      boolean;
  onStatusChange:   () => void;
  rubricSelections: RubricSelections;
  onRubricSelect:   (criterionId: string, points: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<"manual" | "rubric">("manual");
  const displayAs: DisplayGradeAs = assignment.displayGradeAs ?? "Points";
  const hasRubric                 = !!rubric;

  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="flex items-center gap-0 mb-3 border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setActiveTab("manual")}
          className="flex-1 py-2 text-[11px] font-black transition-all touch-manipulation"
          style={activeTab === "manual" ? { background: MAROON, color: "#fff" } : { background: "#fff", color: "#9ca3af" }}
        >
          Manual
        </button>
        <button
          onClick={() => setActiveTab("rubric")}
          disabled={!hasRubric}
          className="flex-1 py-2 text-[11px] font-black transition-all flex items-center justify-center gap-1 disabled:cursor-not-allowed touch-manipulation"
          style={
            activeTab === "rubric"
              ? { background: MAROON, color: "#fff" }
              : hasRubric
              ? { background: "#fff", color: "#9ca3af" }
              : { background: "#f9fafb", color: "#d1d5db" }
          }
          title={!hasRubric ? "No rubric attached to this assignment" : undefined}
        >
          Rubric
          {!hasRubric && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Assessment</p>
        {gradeInput !== "" && displayAs !== "Not Graded" && statusInput !== "Excused" && (
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: MAROON }}>
            {formatGradeForDisplay(parseFloat(gradeInput), assignment.points, displayAs)}
          </span>
        )}
        {statusInput === "Excused" && (
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full" style={{ background: "#f3f4f6", color: "#6b7280" }}>
            Excused
          </span>
        )}
      </div>

      {activeTab === "manual" && (
        <>
          <GradeInputSection
            assignment={assignment}
            gradeInput={gradeInput}
            setGradeInput={setGradeInput}
            ciStatus={ciStatus}
            setCiStatus={setCiStatus}
            setStatusInput={setStatusInput}
            onSave={onSave}
          />
          <StatusSection
            statusInput={statusInput}
            setStatusInput={setStatusInput}
            daysLate={daysLate}
            setDaysLate={setDaysLate}
            onSave={onSave}
            onStatusChange={onStatusChange}
          />
        </>
      )}

      {activeTab === "rubric" && rubric && (
        <>
          <RubricScoringSection
            rubric={rubric}
            selections={rubricSelections}
            onSelect={onRubricSelect}
          />
          <div className="mt-3 pt-3 border-t border-gray-100">
            <StatusSection
              statusInput={statusInput}
              setStatusInput={setStatusInput}
              daysLate={daysLate}
              setDaysLate={setDaysLate}
              onSave={onSave}
              onStatusChange={onStatusChange}
            />
          </div>
        </>
      )}

      {(savedFlash || gradeSaving) && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold" style={{ color: gradeSaving ? "#9ca3af" : "#16a34a" }}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" />
          </svg>
          {gradeSaving ? "Saving..." : "Grade saved"}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StudentRubricModal
// ─────────────────────────────────────────────────────────────────────────────
function StudentRubricModal({
  rubric,
  selections,
  onClose,
}: {
  rubric:     Rubric;
  selections: RubricSelections;
  onClose:    () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl" style={{ background: "#fff" }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3" style={{ background: MAROON }}>
          <p className="text-[14px] font-black text-white">Rubric Breakdown</p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all touch-manipulation"
            style={{ color: "rgba(255,255,255,.7)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <RubricStudentView rubric={rubric} selections={selections} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MobileBottomSheet  – slides up from bottom on mobile for grading panel
// ─────────────────────────────────────────────────────────────────────────────
function MobileBottomSheet({
  isOpen,
  onClose,
  children,
  title,
}: {
  isOpen:   boolean;
  onClose:  () => void;
  children: React.ReactNode;
  title:    string;
}) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end"
      style={{ background: "rgba(0,0,0,.4)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: "#fff", maxHeight: "88vh" }}
      >
        {/* Handle + header */}
        <div className="flex flex-col items-center pt-3 pb-2 border-b border-gray-100 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 mb-3" />
          <div className="flex items-center justify-between w-full px-4">
            <p className="text-[13px] font-black text-gray-800">{title}</p>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 touch-manipulation">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StudentSubmissionView
// ─────────────────────────────────────────────────────────────────────────────
function StudentSubmissionView({
  submission,
  assignment,
  rubric,
  rubricSelections,
}: {
  submission:       Submission;
  assignment:       Assignment;
  rubric:           Rubric | null;
  rubricSelections: RubricSelections;
}) {
  const displayAs: DisplayGradeAs = assignment.displayGradeAs ?? "Points";
  const [showRubric,     setShowRubric]     = useState(false);
  const [showInfoSheet,  setShowInfoSheet]  = useState(false);
  const [zoom,           setZoom]           = useState(1);
  const [pdfPage,        setPdfPage]        = useState(1);
  const [pdfTotal,       setPdfTotal]       = useState(1);
  const [activeEntryIdx, setActiveEntryIdx] = useState(0);

  const parsedSubmission = (() => {
    if (submission.isMulti && submission.entries)
      return { isMulti: true, entries: submission.entries };
    return parseStoredFileUrl(submission.fileUrl);
  })();

  const activeEntry   = parsedSubmission?.isMulti ? (parsedSubmission.entries ?? [])[activeEntryIdx] ?? null : null;
  const activeFileUrl = activeEntry ? normalizeFileUrl(activeEntry.fileUrl) : normalizeFileUrl(submission.fileUrl ?? null);
  const uiStatus      = dbStatusToUi(submission.status);

  const statusColors: Record<string, { bg: string; text: string }> = {
    Graded:   { bg: "#f0fdf4", text: "#15803d" },
    Excused:  { bg: "#f3f4f6", text: "#6b7280" },
    Missing:  { bg: "#fef2f2", text: MAROON },
    Late:     { bg: "#fffbeb", text: "#b45309" },
    None:     { bg: "#f9fafb", text: "#6b7280" },
  };
  const sc             = statusColors[uiStatus] ?? statusColors["None"];
  const rubricHasData  = Object.keys(rubricSelections).length > 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: "#f4f4f3" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-12 sm:h-14 shrink-0 text-white gap-2" style={{ background: MAROON }}>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-black leading-tight truncate">{assignment.title}</p>
          <p className="text-[10px] leading-tight hidden sm:block" style={{ color: "rgba(255,255,255,.55)" }}>
            {assignment.dueDate ? `Due ${fmtDateTime(assignment.dueDate)}` : "No due date"}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,.15)" }}>
            {uiStatus !== "None" && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full hidden sm:inline" style={{ background: sc.bg, color: sc.text }}>
                {uiStatus}
              </span>
            )}
            <span className="text-[12px] sm:text-[13px] font-black text-white">
              {submission.status === "EXCUSED" ? "Excused" : submission.grade !== null
                ? formatGradeForDisplay(submission.grade, assignment.points, displayAs)
                : "Not graded"}
            </span>
          </div>
          {rubric && (
            <button
              onClick={() => setShowRubric(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[11px] font-black transition-all touch-manipulation"
              style={{ background: rubricHasData ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.2)", color: rubricHasData ? MAROON : "rgba(255,255,255,.8)" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12h6M9 16h4" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">{rubricHasData ? "View Rubric" : "Rubric Pending"}</span>
            </button>
          )}
          {/* Info button on mobile */}
          <button
            onClick={() => setShowInfoSheet(true)}
            className="sm:hidden w-8 h-8 flex items-center justify-center rounded-full touch-manipulation"
            style={{ background: "rgba(255,255,255,.2)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* File viewer */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#3a3a38" }}>
          {/* Viewer toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 shrink-0 border-b" style={{ background: "#2c2c2a", borderColor: "rgba(0,0,0,.3)" }}>
            {parsedSubmission?.isMulti && (parsedSubmission.entries?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mr-1">
                {(parsedSubmission.entries ?? []).map((entry, idx) => (
                  <button
                    key={entry.entryId ?? idx}
                    onClick={() => { setActiveEntryIdx(idx); setPdfPage(1); }}
                    className="px-2 py-1 rounded text-[11px] font-semibold transition-all shrink-0 touch-manipulation"
                    style={
                      activeEntryIdx === idx
                        ? { background: MAROON, color: "#fff" }
                        : { background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)" }
                    }
                  >
                    {entry.label || entry.type || `Entry ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}
            {isPdf(activeFileUrl) && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                  disabled={pdfPage <= 1}
                  className="w-6 h-6 flex items-center justify-center disabled:opacity-30 touch-manipulation"
                  style={{ color: "rgba(255,255,255,.5)" }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <span className="text-[11px] text-white/50">{pdfPage}/{pdfTotal}</span>
                <button
                  onClick={() => setPdfPage((p) => Math.min(pdfTotal, p + 1))}
                  disabled={pdfPage >= pdfTotal}
                  className="w-6 h-6 flex items-center justify-center disabled:opacity-30 touch-manipulation"
                  style={{ color: "rgba(255,255,255,.5)" }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="w-7 h-7 flex items-center justify-center rounded font-bold touch-manipulation"
                style={{ color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.05)" }}
              >−</button>
              <span className="text-[11px] w-9 text-center hidden sm:inline" style={{ color: "rgba(255,255,255,.5)" }}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                className="w-7 h-7 flex items-center justify-center rounded font-bold touch-manipulation"
                style={{ color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.05)" }}
              >+</button>
            </div>
            {activeFileUrl && (
              <a href={activeFileUrl} download target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,.5)" }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">Download</span>
              </a>
            )}
          </div>

          {/* File display */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-3 sm:p-6">
            {activeEntry?.textEntry ? (
              <div className="bg-white rounded-xl shadow-2xl p-5 sm:p-8 max-w-2xl w-full"
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: MAROON }}>
                  {activeEntry.label || "Text Entry"}
                </p>
                <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: activeEntry.textEntry }} />
              </div>
            ) : !parsedSubmission?.isMulti && submission.textEntry ? (
              <div className="bg-white rounded-xl shadow-2xl p-5 sm:p-8 max-w-2xl w-full"
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
                <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: submission.textEntry }} />
              </div>
            ) : activeFileUrl ? (
              <FileViewer fileUrl={activeFileUrl} zoom={zoom} pdfPage={pdfPage} setPdfTotal={setPdfTotal} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 mt-16 sm:mt-32" style={{ color: "rgba(255,255,255,.25)" }}>
                <svg className="w-14 h-14 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" />
                </svg>
                <p className="text-sm">No content submitted</p>
              </div>
            )}
          </div>
        </div>

        {/* Right info panel – desktop only */}
        <div className="hidden sm:flex w-72 shrink-0 bg-white border-l border-gray-200 flex-col overflow-y-auto" style={{ fontFamily: FONT }}>
          <div className="px-4 py-4 border-b border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: MAROON }}>Your Grade</p>
            {submission.status === "EXCUSED" ? (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#f3f4f6" }}>
                <p className="text-[22px] font-black text-gray-500">Excused</p>
                <p className="text-[11px] text-gray-400 mt-0.5">This submission has been excused</p>
              </div>
            ) : submission.grade !== null ? (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#fdf8f8", border: `1px solid rgba(123,17,19,.1)` }}>
                <p className="text-[28px] font-black leading-none" style={{ color: MAROON }}>
                  {formatGradeForDisplay(submission.grade, assignment.points, displayAs)}
                </p>
                {displayAs === "Points" && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    {assignment.points > 0 ? Math.round((submission.grade / assignment.points) * 100) : 0}% · {letterGrade(submission.grade, assignment.points)}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3 text-center border border-dashed border-gray-200">
                <p className="text-[18px] font-black text-gray-300">—</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Not yet graded</p>
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-b border-gray-100 space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>Submission Info</p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">Submitted</span>
              <span className="text-[11px] font-semibold text-gray-700">{fmtDateTime(submission.submittedAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">Status</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{uiStatus}</span>
            </div>
            {submission.daysLate && submission.daysLate > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Days Late</span>
                <span className="text-[11px] font-black text-amber-600">{submission.daysLate}d</span>
              </div>
            )}
          </div>

          {rubric && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Rubric</p>
                <button onClick={() => setShowRubric(true)} className="text-[10px] font-black hover:underline" style={{ color: MAROON }}>View full →</button>
              </div>
              {rubricHasData ? (
                <div className="space-y-1.5">
                  {rubric.criteria.map((c) => {
                    const key = c.id ?? c.name;
                    const pts = rubricSelections[key];
                    const has = key in rubricSelections;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 truncate max-w-[150px]" title={c.name}>{c.name}</span>
                        <span className="text-[10px] font-black shrink-0" style={{ color: has ? MAROON : "#d1d5db" }}>{has ? `${pts}/${c.points}` : "—"}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <span className="text-[10px] font-black text-gray-700">Total</span>
                    <span className="text-[11px] font-black" style={{ color: MAROON }}>
                      {computeRubricTotal(rubric, rubricSelections)}/{rubric.pointsPossible}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">Rubric not yet scored.</p>
              )}
            </div>
          )}

          {submission.feedback && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>Instructor Feedback</p>
              <div className="rounded-xl p-3 border border-gray-100" style={{ background: "#fdf8f8" }}>
                <p className="text-[12px] text-gray-600 leading-relaxed">{submission.feedback}</p>
              </div>
            </div>
          )}

          <div className="px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>Assignment</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Points</span>
                <span className="text-[11px] font-semibold text-gray-700">{assignment.points}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Due</span>
                <span className="text-[11px] font-semibold text-gray-700">{assignment.dueDate ? fmtDateTime(assignment.dueDate) : "No due date"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Graded as</span>
                <span className="text-[11px] font-semibold text-gray-700">{assignment.displayGradeAs ?? "Points"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile info bottom sheet */}
      <MobileBottomSheet isOpen={showInfoSheet} onClose={() => setShowInfoSheet(false)} title="Submission Details">
        <div className="px-4 py-4 space-y-4">
          {/* Grade */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>Your Grade</p>
            {submission.status === "EXCUSED" ? (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#f3f4f6" }}>
                <p className="text-[22px] font-black text-gray-500">Excused</p>
              </div>
            ) : submission.grade !== null ? (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#fdf8f8", border: `1px solid rgba(123,17,19,.1)` }}>
                <p className="text-[28px] font-black leading-none" style={{ color: MAROON }}>
                  {formatGradeForDisplay(submission.grade, assignment.points, displayAs)}
                </p>
                {displayAs === "Points" && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    {assignment.points > 0 ? Math.round((submission.grade / assignment.points) * 100) : 0}% · {letterGrade(submission.grade, assignment.points)}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3 text-center border border-dashed border-gray-200">
                <p className="text-[18px] font-black text-gray-300">—</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Not yet graded</p>
              </div>
            )}
          </div>
          {/* Status */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Submission Info</p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">Submitted</span>
              <span className="text-[11px] font-semibold text-gray-700">{fmtDateTime(submission.submittedAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">Status</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{uiStatus}</span>
            </div>
          </div>
          {/* Rubric quick view */}
          {rubric && rubricHasData && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Rubric</p>
                <button onClick={() => { setShowInfoSheet(false); setShowRubric(true); }} className="text-[10px] font-black" style={{ color: MAROON }}>View full →</button>
              </div>
              <div className="space-y-1.5">
                {rubric.criteria.map((c) => {
                  const key = c.id ?? c.name;
                  const pts = rubricSelections[key];
                  const has = key in rubricSelections;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 truncate max-w-[200px]">{c.name}</span>
                      <span className="text-[10px] font-black" style={{ color: has ? MAROON : "#d1d5db" }}>{has ? `${pts}/${c.points}` : "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Feedback */}
          {submission.feedback && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>Instructor Feedback</p>
              <div className="rounded-xl p-3 border border-gray-100" style={{ background: "#fdf8f8" }}>
                <p className="text-[12px] text-gray-600 leading-relaxed">{submission.feedback}</p>
              </div>
            </div>
          )}
        </div>
      </MobileBottomSheet>

      {showRubric && rubric && (
        <StudentRubricModal rubric={rubric} selections={rubricSelections} onClose={() => setShowRubric(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component  –  SpeedGraderClient
// ─────────────────────────────────────────────────────────────────────────────
export default function SpeedGraderClient({
  courseId,
  assignmentId,
  initialStudentId,
  viewMode = "admin",
  studentUserId,
}: {
  courseId:         string;
  assignmentId:     string;
  initialStudentId: string | null;
  viewMode?:        "admin" | "student" | "head";
  studentUserId?:   string;
}) {
  const [assignment,  setAssignment]  = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rubric,      setRubric]      = useState<Rubric | null>(null);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [loading,     setLoading]     = useState(true);

  const [gradeInput,  setGradeInput]  = useState("");
  const [ciStatus,    setCiStatus]    = useState("---");
  const [statusInput, setStatusInput] = useState<SubmissionStatus>("None");
  const [daysLate,    setDaysLate]    = useState("");
  const [comment,     setComment]     = useState("");

  const [saving,      setSaving]      = useState(false);
  const [gradeSaving, setGradeSaving] = useState(false);
  const [savedFlash,  setSavedFlash]  = useState(false);

  const [pdfPage,     setPdfPage]     = useState(1);
  const [pdfTotal,    setPdfTotal]    = useState(1);
  const [zoom,        setZoom]        = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeEntryIdx, setActiveEntryIdx] = useState(0);

  // Mobile-specific UI state
  const [mobileGradeOpen,   setMobileGradeOpen]   = useState(false);
  const [mobileStudentOpen, setMobileStudentOpen]  = useState(false);
  const [mobileCommentOpen, setMobileCommentOpen]  = useState(false);

  const [rubricSelectionsMap, setRubricSelectionsMap] = useState<Record<string, RubricSelections>>({});

  const displayAs: DisplayGradeAs = assignment?.displayGradeAs ?? "Points";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [aRes, sRes] = await Promise.all([
          fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`),
          fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/submissions`),
        ]);
        const [aData, sData] = await Promise.all([aRes.json(), sRes.json()]);
        if (cancelled) return;

        const subs: Submission[] = (sData.submissions ?? []).map((s: Submission) => {
          const parsed = parseStoredFileUrl(s.fileUrl);
          return { ...s, isMulti: parsed.isMulti, entries: parsed.isMulti ? parsed.entries : s.entries };
        });

        const jumpIdx = initialStudentId ? subs.findIndex((s) => s.userId === initialStudentId) : -1;

        setAssignment(aData.assignment ?? null);
        setSubmissions(subs);
        if (jumpIdx >= 0) setCurrentIdx(jumpIdx);

        try {
          const rRes  = await fetch(`/api/courses/${courseId}/assignments/${assignmentId}/rubric`);
          const rData = (await rRes.json()) as { rubric?: Rubric };
          setRubric(rData.rubric ?? null);
        } catch { /* no rubric */ }

        try {
          const rfRes = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/rubric-feedback`);
          if (rfRes.ok) {
            const rfData = (await rfRes.json()) as { feedbacks?: Record<string, RubricFeedback> };
            if (rfData.feedbacks) {
              const selMap: Record<string, RubricSelections> = {};
              for (const [uid, fb] of Object.entries(rfData.feedbacks)) selMap[uid] = fb.selections;
              setRubricSelectionsMap(selMap);
            }
          }
        } catch { /* no feedback */ }

        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [courseId, assignmentId, initialStudentId]);

  const current   = submissions[currentIdx] ?? null;
  const currentId = current?.id;

  const currentRubricSelections: RubricSelections = current ? (rubricSelectionsMap[current.userId] ?? {}) : {};

  const parsedSubmission = current
    ? (() => {
        if (current.isMulti && current.entries) return { isMulti: true, entries: current.entries };
        return parseStoredFileUrl(current.fileUrl);
      })()
    : null;

  const activeEntry   = parsedSubmission?.isMulti ? (parsedSubmission.entries ?? [])[activeEntryIdx] ?? null : null;
  const activeFileUrl = activeEntry ? normalizeFileUrl(activeEntry.fileUrl) : normalizeFileUrl(current?.fileUrl ?? null);

  useLayoutEffect(() => {
    if (!current) return;
    const g        = current.grade;
    const uiStatus = dbStatusToUi(current.status);

    setStatusInput(uiStatus);
    setGradeInput(g != null ? String(g) : "");
    setPdfPage(1);
    setActiveEntryIdx(0);
    setDaysLate(current.daysLate != null ? String(current.daysLate) : "");

    if (displayAs === "Complete/Incomplete") {
      if (current.status === "EXCUSED") { setCiStatus("Excused"); setStatusInput("Excused"); }
      else if (g != null && g > 0) setCiStatus("Complete");
      else if (g === 0) setCiStatus("Incomplete");
      else { setCiStatus("---"); setStatusInput("None"); }
    } else {
      setCiStatus("---");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const handleRubricSelect = useCallback(
    (criterionId: string, points: number) => {
      if (!current) return;
      const userId = current.userId;

      setRubricSelectionsMap((prev) => {
        const existing = prev[userId] ?? {};
        let next: RubricSelections;
        if (points === -1) { next = { ...existing }; delete next[criterionId]; }
        else next = { ...existing, [criterionId]: points };

        if (rubric && Object.keys(next).length > 0) {
          const total = computeRubricTotal(rubric, next);
          setGradeInput(String(total));
        }

        if (rubric) {
          const total    = computeRubricTotal(rubric, next);
          const complete = rubricIsComplete(rubric, next);
          void fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/rubric-feedback`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ userId, selections: next, totalScore: total, completedAt: complete ? new Date().toISOString() : null }),
          }).catch(() => { /* best-effort */ });
        }

        return { ...prev, [userId]: next };
      });
    },
    [current, rubric, courseId, assignmentId],
  );

  const applyRubricScore = useCallback(() => {
    if (!rubric || !current) return;
    const total = computeRubricTotal(rubric, currentRubricSelections);
    setGradeInput(String(total));
    void saveGrade(total);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rubric, current, currentRubricSelections]);

  const saveGrade = useCallback(
    async (gradeOverride?: number | null) => {
      if (!current || !assignment) return;
      if (displayAs === "Not Graded") return;
      if (!current.id) return;

      setGradeSaving(true);

      const isExcused = (displayAs === "Complete/Incomplete" && ciStatus === "Excused") || (displayAs !== "Complete/Incomplete" && statusInput === "Excused");
      const isCiClear = displayAs === "Complete/Incomplete" && ciStatus === "---";

      const gradeValue = gradeOverride !== undefined
        ? gradeOverride
        : isExcused || isCiClear ? null
        : gradeInput !== "" ? parseFloat(gradeInput) : null;

      const dbStatus = uiStatusToDb(isExcused ? "Excused" : gradeValue != null ? "Graded" : statusInput);

      setSubmissions((prev) =>
        prev.map((s) => s.id === current.id ? { ...s, grade: gradeValue, status: dbStatus } : s),
      );

      try {
        const res = await fetch(
          `/api/admin/courses/${courseId}/assignments/${assignmentId}/submissions/${current.id}`,
          {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              grade:    gradeValue,
              feedback: comment || null,
              status:   dbStatus,
              daysLate: statusInput === "Late" && daysLate !== "" ? parseInt(daysLate) : null,
            }),
          },
        );
        const text = await res.text();
        if (!text) return;
        const data = JSON.parse(text) as { submission?: Submission };
        if (data.submission) {
          setSubmissions((prev) =>
            prev.map((s) =>
              s.id === current.id
                ? { ...s, grade: data.submission!.grade, status: data.submission!.status, feedback: data.submission!.feedback ?? s.feedback, daysLate: data.submission!.daysLate }
                : s,
            ),
          );
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 2000);
        }
      } catch { /* optimistic update stands */ } finally {
        setGradeSaving(false);
      }
    },
    [current, assignment, gradeInput, comment, daysLate, courseId, assignmentId, displayAs, ciStatus, statusInput],
  );

  const submitComment = useCallback(async () => {
    if (!comment.trim() || !current) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/assignments/${assignmentId}/submissions/${current.id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: comment }) },
      );
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text) as { submission?: Submission };
      if (data.submission) {
        setSubmissions((prev) =>
          prev.map((s) => s.id === current.id ? { ...s, feedback: data.submission!.feedback } : s),
        );
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
      setComment("");
      setMobileCommentOpen(false);
    }
  }, [comment, current, courseId, assignmentId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") setCurrentIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setCurrentIdx((i) => Math.min(submissions.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [submissions.length]);

  const gradedCount = submissions.filter((s) => s.grade != null).length;

  const averageInfo = (() => {
    if (!assignment || displayAs === "Not Graded") return null;
    const graded = submissions.filter((s) => s.grade != null);
    if (graded.length === 0) return { label: "—" };
    const avg = graded.reduce((sum, s) => sum + (s.grade ?? 0), 0) / graded.length;
    const pct = assignment.points > 0 ? Math.round((avg / assignment.points) * 100) : 0;
    const avgDisplay = Number.isInteger(avg) ? avg : parseFloat(avg.toFixed(1));
    return { label: `${avgDisplay}/${assignment.points} (${pct}%)` };
  })();

  const rubricCompletedCount = Object.values(rubricSelectionsMap).filter(
    (sel) => rubric && rubricIsComplete(rubric, sel),
  ).length;

  // ── Student/Head mode ─────────────────────────────────────────────────────
  if (viewMode === "student" || viewMode === "head") {
    const targetSub = studentUserId ? submissions.find((s) => s.userId === studentUserId) ?? current : current;

    if (loading)
      return (
        <div className="h-screen flex items-center justify-center" style={{ background: "#1a0a0a", fontFamily: FONT }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-white/10 rounded-full animate-spin" style={{ borderTopColor: MAROON }} />
            <p className="text-sm text-white/40">Loading submission…</p>
          </div>
        </div>
      );

    if (!assignment || !targetSub)
      return (
        <div className="h-screen flex items-center justify-center" style={{ background: "#1a0a0a", fontFamily: FONT }}>
          <p className="text-sm text-white/40">Submission not found.</p>
        </div>
      );

    return (
      <StudentSubmissionView
        submission={targetSub}
        assignment={assignment}
        rubric={rubric}
        rubricSelections={rubricSelectionsMap[targetSub.userId] ?? {}}
      />
    );
  }

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading)
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#1a0a0a", fontFamily: FONT }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/10 rounded-full animate-spin" style={{ borderTopColor: MAROON }} />
          <p className="text-sm text-white/40">Loading SpeedGrader…</p>
        </div>
      </div>
    );

  if (!assignment)
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#1a0a0a", fontFamily: FONT }}>
        <p className="text-sm text-white/40">Assignment not found.</p>
      </div>
    );

  // ── Admin view ───────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden select-none" style={{ fontFamily: FONT, background: "#f4f4f3" }}>

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 sm:px-4 shrink-0 h-12 z-20 text-white gap-2" style={{ background: MAROON }}>
        {/* Title */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <p className="text-[12px] sm:text-[13px] font-bold leading-tight truncate">{assignment.title}</p>
          <p className="text-[10px] leading-tight hidden sm:block" style={{ color: "rgba(255,255,255,.55)" }}>
            {assignment.dueDate ? `Due ${fmtDateTime(assignment.dueDate)}` : "No due date"}
            {" · "}
            <span className="hover:underline cursor-pointer font-semibold" style={{ color: "rgba(255,255,255,.75)" }}
              onClick={() => window.open(`/admin/courses/${courseId}/assignments/${assignmentId}`, "_blank")}>
              {assignment.status === "PUBLISHED" ? "Published" : "Unpublished"}
            </span>
          </p>
        </div>

        {/* Student nav */}
        <div className="flex items-center gap-1.5 sm:gap-2 mx-1 sm:mx-6 shrink-0">
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="w-7 h-7 flex items-center justify-center rounded transition-all disabled:opacity-30 touch-manipulation"
            style={{ background: "rgba(255,255,255,.15)" }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="flex flex-col items-center">
            {current && (
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>
                  {getInitials(current.userName, current.userEmail)}
                </div>
                <span className="text-[11px] sm:text-[12px] font-semibold max-w-[80px] sm:max-w-[120px] truncate">
                  {current.userName ?? current.userEmail}
                </span>
              </div>
            )}
            <span className="text-[9px] sm:text-[10px]" style={{ color: "rgba(255,255,255,.45)" }}>
              {submissions.length === 0 ? "No submissions" : `${currentIdx + 1}/${submissions.length}`}
            </span>
          </div>
          <button
            onClick={() => setCurrentIdx((i) => Math.min(submissions.length - 1, i + 1))}
            disabled={currentIdx >= submissions.length - 1}
            className="w-7 h-7 flex items-center justify-center rounded transition-all disabled:opacity-30 touch-manipulation"
            style={{ background: "rgba(255,255,255,.15)" }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        {/* Stats + sidebar toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Stats – hidden on small mobile, shown sm+ */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-center">
              <p className="text-[13px] font-black leading-tight">{gradedCount}/{submissions.length}</p>
              <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,.45)" }}>Graded</p>
            </div>
            {rubric && (
              <>
                <div className="w-px h-6" style={{ background: "rgba(255,255,255,.15)" }} />
                <div className="text-center">
                  <p className="text-[13px] font-black leading-tight">{rubricCompletedCount}/{submissions.length}</p>
                  <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,.45)" }}>Rubric</p>
                </div>
              </>
            )}
            {averageInfo && (
              <>
                <div className="w-px h-6" style={{ background: "rgba(255,255,255,.15)" }} />
                <div className="text-center">
                  <p className="text-[12px] font-black leading-tight">{averageInfo.label}</p>
                  <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,.45)" }}>Avg</p>
                </div>
              </>
            )}
            <div className="w-px h-6" style={{ background: "rgba(255,255,255,.15)" }} />
          </div>

          {/* Desktop sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="hidden sm:flex w-7 h-7 items-center justify-center rounded transition-all touch-manipulation"
            style={{ color: "rgba(255,255,255,.6)" }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M15 3v18" />
            </svg>
          </button>

          {/* Mobile grade button */}
          <button
            onClick={() => setMobileGradeOpen(true)}
            className="sm:hidden flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black touch-manipulation"
            style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Grade
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── File Viewer ── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#3a3a38" }}>
          {/* Viewer toolbar */}
          <div className="flex items-center gap-2 px-3 py-1.5 sm:py-2 shrink-0 border-b overflow-x-auto no-scrollbar" style={{ background: "#2c2c2a", borderColor: "rgba(0,0,0,.3)" }}>
            {parsedSubmission?.isMulti && (parsedSubmission.entries?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1 mr-1 overflow-x-auto no-scrollbar">
                {(parsedSubmission.entries ?? []).map((entry, idx) => (
                  <button
                    key={entry.entryId ?? idx}
                    onClick={() => { setActiveEntryIdx(idx); setPdfPage(1); }}
                    className="px-2 py-1 rounded text-[11px] font-semibold transition-all shrink-0 touch-manipulation"
                    style={
                      activeEntryIdx === idx
                        ? { background: MAROON, color: "#fff" }
                        : { background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)" }
                    }
                  >
                    {entry.label || entry.type || `Entry ${idx + 1}`}
                    {entry.required && <span className="ml-1 opacity-70">*</span>}
                  </button>
                ))}
              </div>
            )}

            {isPdf(activeFileUrl) && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setPdfPage((p) => Math.max(1, p - 1))} disabled={pdfPage <= 1}
                  className="w-6 h-6 flex items-center justify-center disabled:opacity-30 touch-manipulation" style={{ color: "rgba(255,255,255,.5)" }}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span className="text-[11px] text-white/50 min-w-[36px] text-center">{pdfPage}/{pdfTotal}</span>
                <button onClick={() => setPdfPage((p) => Math.min(pdfTotal, p + 1))} disabled={pdfPage >= pdfTotal}
                  className="w-6 h-6 flex items-center justify-center disabled:opacity-30 touch-manipulation" style={{ color: "rgba(255,255,255,.5)" }}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            )}

            <div className="flex-1 min-w-0" />

            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="w-7 h-7 flex items-center justify-center rounded text-base font-bold touch-manipulation"
                style={{ color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.05)" }}>−</button>
              <span className="text-[11px] w-9 text-center hidden sm:inline" style={{ color: "rgba(255,255,255,.5)" }}>
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                className="w-7 h-7 flex items-center justify-center rounded text-base font-bold touch-manipulation"
                style={{ color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.05)" }}>+</button>
              <button onClick={() => setZoom(1)} className="hidden sm:inline ml-1 text-[11px] px-1 touch-manipulation" style={{ color: "rgba(255,255,255,.35)" }}>Reset</button>
            </div>

            {activeFileUrl && (
              <a href={activeFileUrl} download target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] shrink-0 touch-manipulation" style={{ color: "rgba(255,255,255,.5)" }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">Download</span>
              </a>
            )}
          </div>

          {/* File display area */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-3 sm:p-6">
            {!current ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 mt-16 sm:mt-32" style={{ color: "rgba(255,255,255,.2)" }}>
                <svg className="w-16 h-16 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <p className="text-sm">No submissions</p>
              </div>
            ) : (
              <>
                {activeEntry?.textEntry ? (
                  <div className="bg-white rounded-xl shadow-2xl p-5 sm:p-8 max-w-2xl w-full"
                    style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: MAROON }}>
                      {activeEntry.label || "Text Entry"}
                    </p>
                    <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: activeEntry.textEntry }} />
                  </div>
                ) : !parsedSubmission?.isMulti && current.textEntry ? (
                  <div className="bg-white rounded-xl shadow-2xl p-5 sm:p-8 max-w-2xl w-full"
                    style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
                    <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: current.textEntry }} />
                  </div>
                ) : null}

                {(() => {
                  const url = activeEntry?.websiteUrl ?? (!parsedSubmission?.isMulti ? current.websiteUrl : null);
                  if (url && !activeEntry?.fileUrl && !current.textEntry)
                    return (
                      <div className="flex flex-col items-center gap-3 mt-16 sm:mt-32">
                        <svg className="w-12 h-12" style={{ color: "rgba(255,255,255,.3)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" />
                        </svg>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold hover:underline break-all text-center" style={{ color: MAROON }}>{url}</a>
                      </div>
                    );
                  return null;
                })()}

                {activeFileUrl && <FileViewer fileUrl={activeFileUrl} zoom={zoom} pdfPage={pdfPage} setPdfTotal={setPdfTotal} />}

                {activeEntry && !activeEntry.fileUrl && !activeEntry.textEntry && !activeEntry.websiteUrl && (
                  <div className="flex flex-col items-center justify-center gap-3 mt-16 sm:mt-32" style={{ color: "rgba(255,255,255,.25)" }}>
                    <svg className="w-14 h-14 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" />
                    </svg>
                    <p className="text-sm">{activeEntry.required ? "No content submitted (required)" : "Nothing submitted for this entry"}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Desktop Right Sidebar ── */}
        {sidebarOpen && (
          <div className="hidden sm:flex w-72 shrink-0 bg-white border-l border-gray-200 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">

              {/* Student selector */}
              <div className="px-4 py-3 border-b border-gray-100">
                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: MAROON }}>Submission to view</label>
                <select
                  value={current?.id ?? ""}
                  onChange={(e) => { const idx = submissions.findIndex((s) => s.id === e.target.value); if (idx >= 0) setCurrentIdx(idx); }}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] text-gray-700 bg-white focus:outline-none appearance-none cursor-pointer"
                  style={{ fontFamily: FONT }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                >
                  {submissions.length === 0 ? (
                    <option value="">No submissions</option>
                  ) : (
                    submissions.map((s, idx) => (
                      <option key={s.id ?? `sub-${idx}`} value={s.id}>
                        {s.userName ?? s.userEmail}
                        {s.submittedAt
                          ? ` — ${new Date(s.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${new Date(s.submittedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()}`
                          : " — Not submitted"}
                        {s.status === "EXCUSED" ? " (Excused)" : s.grade != null
                          ? ` (${formatGradeShortForDropdown(s.grade, assignment.points, displayAs, s.status)})`
                          : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Submitted files summary */}
              {current && (
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>
                      {`Submitted Files` + (parsedSubmission?.isMulti ? ` (${(parsedSubmission.entries ?? []).length} entries)` : "")}
                    </p>
                    {current.submittedAt && (
                      <p className="text-[10px] text-gray-400 font-medium">{fmtDateTime(current.submittedAt)}</p>
                    )}
                  </div>
                  {parsedSubmission?.isMulti ? (
                    <div className="space-y-2">
                      {(parsedSubmission.entries ?? []).map((entry, idx) => (
                        <button
                          key={entry.entryId ?? idx}
                          onClick={() => { setActiveEntryIdx(idx); setPdfPage(1); }}
                          className="w-full text-left p-2 rounded-lg border transition-all"
                          style={{ borderColor: activeEntryIdx === idx ? MAROON : "#e5e7eb", background: activeEntryIdx === idx ? "#fdf8f8" : "#fff" }}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[11px] font-bold truncate" style={{ color: activeEntryIdx === idx ? MAROON : "#374151" }}>
                              {entry.label || entry.type || `Entry ${idx + 1}`}
                            </span>
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded-full text-white shrink-0" style={{ background: entry.required ? MAROON : "#9ca3af" }}>
                              {entry.required ? "REQ" : "OPT"}
                            </span>
                          </div>
                          {entry.fileUrl ? (
                            <p className="text-[10px] text-gray-500 truncate">📎 {entry.fileName ?? entry.fileUrl.split("/").pop() ?? "File"}</p>
                          ) : entry.textEntry ? (
                            <p className="text-[10px] text-gray-500 truncate">✏️ Text entry</p>
                          ) : entry.websiteUrl ? (
                            <p className="text-[10px] text-gray-500 truncate">🔗 {entry.websiteUrl}</p>
                          ) : (
                            <p className="text-[10px] text-gray-400 italic">Nothing submitted</p>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : current.fileUrl && !current.fileUrl.startsWith("{") ? (
                    <a href={normalizeFileUrl(current.fileUrl) ?? "#"} download target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[12px] font-semibold hover:underline" style={{ color: MAROON }}>
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" />
                      </svg>
                      {(normalizeFileUrl(current.fileUrl) ?? "").split("/").pop()}
                    </a>
                  ) : (
                    <p className="text-[11px] text-gray-400">No files submitted</p>
                  )}
                </div>
              )}

              {/* Apply rubric score button */}
              {rubric && current && Object.keys(currentRubricSelections).length > 0 && (
                <div className="px-4 py-2 border-b border-gray-100">
                  <button onClick={applyRubricScore}
                    className="w-full py-2 rounded-lg text-[11px] font-black text-white transition-all touch-manipulation" style={{ background: MAROON }}>
                    Apply Rubric Score ({computeRubricTotal(rubric, currentRubricSelections)} pts)
                  </button>
                </div>
              )}

              {/* Assessment panel */}
              <AssessmentPanel
                assignment={assignment}
                rubric={rubric}
                gradeInput={gradeInput}
                setGradeInput={setGradeInput}
                ciStatus={ciStatus}
                setCiStatus={setCiStatus}
                statusInput={statusInput}
                setStatusInput={setStatusInput}
                daysLate={daysLate}
                setDaysLate={setDaysLate}
                onSave={saveGrade}
                savedFlash={savedFlash}
                gradeSaving={gradeSaving}
                onStatusChange={() => {}}
                rubricSelections={currentRubricSelections}
                onRubricSelect={handleRubricSelect}
              />

              {/* Comments */}
              <div className="px-4 py-3 flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Comments</p>
                {current?.feedback && (
                  <div className="rounded-xl p-3 border border-gray-100" style={{ background: "#fdf8f8" }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0" style={{ background: MAROON }}>
                        {current && getInitials(current.userName, current.userEmail)}
                      </div>
                      <span className="text-[11px] font-bold text-gray-700">{current.userName ?? current.userEmail}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{fmtDateTime(current.submittedAt)}</span>
                    </div>
                    <p className="text-[12px] text-gray-600 leading-relaxed">{current.feedback}</p>
                  </div>
                )}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Leave a comment…"
                    rows={3}
                    className="w-full px-3 py-2 text-[12px] text-gray-700 resize-none focus:outline-none bg-white placeholder:text-gray-300"
                    style={{ fontFamily: FONT }}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void submitComment(); } }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-300">Ctrl+Enter to send</span>
                  <button onClick={submitComment} disabled={saving || !comment.trim()}
                    className="px-4 py-1.5 text-white text-[12px] font-black rounded-lg disabled:opacity-40 transition-all touch-manipulation" style={{ background: MAROON, fontFamily: FONT }}>
                    Submit
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom stats */}
            <div className="border-t border-gray-200 px-4 py-3 shrink-0" style={{ background: "#fdf8f8" }}>
              <p className="text-[11px] text-gray-400 font-medium">{gradedCount} of {submissions.length} Submissions Graded</p>
              {rubric && (
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">{rubricCompletedCount} of {submissions.length} Rubrics Scored</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile Bottom Action Bar ── */}
      <div className="sm:hidden flex items-center justify-around border-t border-gray-200 bg-white shrink-0 safe-area-bottom" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {/* Students */}
        <button
          onClick={() => setMobileStudentOpen(true)}
          className="flex-1 flex flex-col items-center py-2.5 gap-0.5 touch-manipulation"
          style={{ color: MAROON }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="text-[10px] font-bold">Students</span>
        </button>

        {/* Grade */}
        <button
          onClick={() => setMobileGradeOpen(true)}
          className="flex-1 flex flex-col items-center py-2.5 gap-0.5 touch-manipulation"
          style={{ color: MAROON }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <span className="text-[10px] font-bold">
            {gradeInput ? formatGradeForDisplay(parseFloat(gradeInput), assignment.points, displayAs) : "Grade"}
          </span>
        </button>

        {/* Comment */}
        <button
          onClick={() => setMobileCommentOpen(true)}
          className="flex-1 flex flex-col items-center py-2.5 gap-0.5 touch-manipulation relative"
          style={{ color: MAROON }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          {current?.feedback && (
            <span className="absolute top-2 right-6 w-2 h-2 rounded-full" style={{ background: MAROON }} />
          )}
          <span className="text-[10px] font-bold">Comment</span>
        </button>
      </div>

      {/* ── Mobile Bottom Sheet: Students ── */}
      <MobileBottomSheet isOpen={mobileStudentOpen} onClose={() => setMobileStudentOpen(false)} title="Students">
        <div className="px-4 py-3 space-y-2">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pb-3 border-b border-gray-100">
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-[15px] font-black" style={{ color: MAROON }}>{gradedCount}/{submissions.length}</p>
              <p className="text-[10px] text-gray-400">Graded</p>
            </div>
            {rubric && (
              <div className="text-center p-2 rounded-lg bg-gray-50">
                <p className="text-[15px] font-black" style={{ color: MAROON }}>{rubricCompletedCount}/{submissions.length}</p>
                <p className="text-[10px] text-gray-400">Rubric</p>
              </div>
            )}
            {averageInfo && (
              <div className="text-center p-2 rounded-lg bg-gray-50">
                <p className="text-[13px] font-black" style={{ color: MAROON }}>{averageInfo.label}</p>
                <p className="text-[10px] text-gray-400">Average</p>
              </div>
            )}
          </div>

          {/* Student list */}
          <div className="space-y-1.5 pb-4">
            {submissions.map((s, idx) => {
              const uiSt = dbStatusToUi(s.status);
              const sc2  = { Graded: "#15803d", Excused: "#6b7280", Missing: MAROON, Late: "#b45309", None: "#9ca3af" }[uiSt] ?? "#9ca3af";
              return (
                <button
                  key={s.id ?? `sub-${idx}`}
                  onClick={() => { setCurrentIdx(idx); setMobileStudentOpen(false); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left touch-manipulation"
                  style={{
                    borderColor: idx === currentIdx ? MAROON : "#e5e7eb",
                    background:  idx === currentIdx ? "#fdf8f8" : "#fff",
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0" style={{ background: idx === currentIdx ? MAROON : "#9ca3af" }}>
                    {getInitials(s.userName, s.userEmail)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold truncate" style={{ color: idx === currentIdx ? MAROON : "#374151" }}>
                      {s.userName ?? s.userEmail}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {s.submittedAt ? fmtDateTime(s.submittedAt) : "Not submitted"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {s.grade != null ? (
                      <span className="text-[11px] font-black" style={{ color: MAROON }}>
                        {formatGradeShortForDropdown(s.grade, assignment.points, displayAs, s.status)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold" style={{ color: sc2 }}>{uiSt !== "None" ? uiSt : "—"}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </MobileBottomSheet>

      {/* ── Mobile Bottom Sheet: Grade ── */}
      <MobileBottomSheet isOpen={mobileGradeOpen} onClose={() => setMobileGradeOpen(false)} title="Grade Submission">
        <div className="flex-1 overflow-y-auto">
          {/* File entry tabs (mobile) */}
          {current && parsedSubmission?.isMulti && (parsedSubmission.entries?.length ?? 0) > 0 && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>Entries</p>
              <div className="flex gap-2 flex-wrap">
                {(parsedSubmission.entries ?? []).map((entry, idx) => (
                  <button
                    key={entry.entryId ?? idx}
                    onClick={() => { setActiveEntryIdx(idx); setMobileGradeOpen(false); }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border touch-manipulation"
                    style={
                      activeEntryIdx === idx
                        ? { background: MAROON, borderColor: MAROON, color: "#fff" }
                        : { background: "#fff", borderColor: "#e5e7eb", color: "#6b7280" }
                    }
                  >
                    {entry.label || entry.type || `Entry ${idx + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Apply rubric score */}
          {rubric && current && Object.keys(currentRubricSelections).length > 0 && (
            <div className="px-4 pt-3">
              <button onClick={() => { applyRubricScore(); setMobileGradeOpen(false); }}
                className="w-full py-2.5 rounded-xl text-[12px] font-black text-white touch-manipulation" style={{ background: MAROON }}>
                Apply Rubric Score ({computeRubricTotal(rubric, currentRubricSelections)} pts)
              </button>
            </div>
          )}

          <AssessmentPanel
            assignment={assignment}
            rubric={rubric}
            gradeInput={gradeInput}
            setGradeInput={setGradeInput}
            ciStatus={ciStatus}
            setCiStatus={setCiStatus}
            statusInput={statusInput}
            setStatusInput={setStatusInput}
            daysLate={daysLate}
            setDaysLate={setDaysLate}
            onSave={saveGrade}
            savedFlash={savedFlash}
            gradeSaving={gradeSaving}
            onStatusChange={() => {}}
            rubricSelections={currentRubricSelections}
            onRubricSelect={handleRubricSelect}
          />

          {/* File info on mobile */}
          {current && (
            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>
                {parsedSubmission?.isMulti ? `Files (${(parsedSubmission.entries ?? []).length})` : "File"}
              </p>
              {current.submittedAt && (
                <p className="text-[11px] text-gray-400 mb-2">{fmtDateTime(current.submittedAt)}</p>
              )}
              {parsedSubmission?.isMulti ? (
                <div className="space-y-1.5">
                  {(parsedSubmission.entries ?? []).map((entry, idx) => (
                    <div key={entry.entryId ?? idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-600 truncate max-w-[200px]">{entry.label || `Entry ${idx + 1}`}</span>
                      <span className="text-gray-400 shrink-0 ml-2">{entry.fileUrl ? "📎 File" : entry.textEntry ? "✏️ Text" : entry.websiteUrl ? "🔗 Link" : "—"}</span>
                    </div>
                  ))}
                </div>
              ) : current.fileUrl && !current.fileUrl.startsWith("{") ? (
                <a href={normalizeFileUrl(current.fileUrl) ?? "#"} download target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: MAROON }}>
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" />
                  </svg>
                  {(normalizeFileUrl(current.fileUrl) ?? "").split("/").pop()}
                </a>
              ) : (
                <p className="text-[11px] text-gray-400">No files submitted</p>
              )}
            </div>
          )}

          <div className="h-4" />
        </div>
      </MobileBottomSheet>

      {/* ── Mobile Bottom Sheet: Comment ── */}
      <MobileBottomSheet isOpen={mobileCommentOpen} onClose={() => setMobileCommentOpen(false)} title="Add Comment">
        <div className="px-4 py-3 space-y-3">
          {current?.feedback && (
            <div className="rounded-xl p-3 border border-gray-100" style={{ background: "#fdf8f8" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0" style={{ background: MAROON }}>
                  {current && getInitials(current.userName, current.userEmail)}
                </div>
                <span className="text-[11px] font-bold text-gray-700">{current.userName ?? current.userEmail}</span>
              </div>
              <p className="text-[12px] text-gray-600 leading-relaxed">{current.feedback}</p>
            </div>
          )}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Leave a comment…"
            rows={5}
            autoFocus
            className="w-full px-3 py-3 text-[13px] text-gray-700 resize-none focus:outline-none bg-gray-50 rounded-xl border border-gray-200 placeholder:text-gray-300"
            style={{ fontFamily: FONT }}
          />
          <button
            onClick={submitComment}
            disabled={saving || !comment.trim()}
            className="w-full py-3 text-white text-[13px] font-black rounded-xl disabled:opacity-40 transition-all touch-manipulation"
            style={{ background: MAROON }}
          >
            {saving ? "Submitting…" : "Submit Comment"}
          </button>
          <div className="h-2" />
        </div>
      </MobileBottomSheet>
    </div>
  );
}