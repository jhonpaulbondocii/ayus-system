// src/lib/gradeDisplay.ts

export type DisplayGradeAs = "Points" | "Percentage" | "Complete/Incomplete" | "Not Graded";

export interface FormatGradeOptions {
  grade: number | null;
  maxPoints: number;
  displayGradeAs: DisplayGradeAs | string;
  status?: string | null;
}

/**
 * Full format — used in panels and detail views
 * Points           → "18 / 20"  or "— / 20"
 * Percentage       → "90%"      or "—"
 * Complete/Incomplete → "Complete" or "Incomplete"
 * Not Graded       → "—"  (never shows a score)
 */
export function formatGrade({ grade, maxPoints, displayGradeAs, status }: FormatGradeOptions): string {
  switch (displayGradeAs) {
    case "Percentage": {
      if (grade === null) return "—";
      const pct = maxPoints > 0 ? Math.round((grade / maxPoints) * 100) : 0;
      return `${pct}%`;
    }
    case "Complete/Incomplete": {
      if (grade === null && status !== "GRADED") return "Incomplete";
      if (grade !== null || status === "GRADED") return "Complete";
      return "Incomplete";
    }
    case "Not Graded":
      return "—";
    case "Points":
    default: {
      if (grade === null) return `— / ${maxPoints}`;
      return `${grade} / ${maxPoints}`;
    }
  }
}

/**
 * Short/compact format — used in gradebook cells
 * Points           → "18/20"
 * Percentage       → "90%"
 * Complete/Incomplete → "✓" or "✗"
 * Not Graded       → "—"
 */
export function formatGradeShort({ grade, maxPoints, displayGradeAs, status }: FormatGradeOptions): string {
  switch (displayGradeAs) {
    case "Percentage": {
      if (grade === null) return "—";
      const pct = maxPoints > 0 ? Math.round((grade / maxPoints) * 100) : 0;
      return `${pct}%`;
    }
    case "Complete/Incomplete": {
      if (grade !== null || status === "GRADED") return "✓";
      return "✗";
    }
    case "Not Graded":
      return "—";
    case "Points":
    default: {
      if (grade === null) return `—/${maxPoints}`;
      return `${grade}/${maxPoints}`;
    }
  }
}

/**
 * Score color — for Complete/Incomplete and Not Graded,
 * always returns neutral gray (no color meaning).
 */
export function getGradeColor(
  grade: number | null,
  maxPoints: number,
  displayGradeAs: DisplayGradeAs | string
): string {
  if (displayGradeAs === "Not Graded") return "#9ca3af";
  if (displayGradeAs === "Complete/Incomplete") {
    return grade !== null ? "#15803d" : "#9ca3af";
  }
  if (grade === null) return "#9ca3af";
  const pct = maxPoints > 0 ? grade / maxPoints : 0;
  if (pct >= 0.9) return "#15803d";
  if (pct >= 0.7) return "#b45309";
  if (pct >= 0.5) return "#c2410c";
  return "#b91c1c";
}

/**
 * Score background — same logic as color.
 */
export function getGradeBg(
  grade: number | null,
  maxPoints: number,
  displayGradeAs: DisplayGradeAs | string
): string {
  if (displayGradeAs === "Not Graded") return "transparent";
  if (displayGradeAs === "Complete/Incomplete") {
    return grade !== null ? "#f0fdf4" : "transparent";
  }
  if (grade === null) return "transparent";
  const pct = maxPoints > 0 ? grade / maxPoints : 0;
  if (pct >= 0.9) return "#f0fdf4";
  if (pct >= 0.7) return "#fffbeb";
  if (pct >= 0.5) return "#fff7ed";
  return "#fef2f2";
}

/**
 * Letter grade — only meaningful for Points and Percentage.
 * Returns "—" for Complete/Incomplete and Not Graded.
 */
export function getLetterGradeFromDisplay(
  grade: number | null,
  maxPoints: number,
  displayGradeAs: DisplayGradeAs | string
): string {
  if (displayGradeAs === "Complete/Incomplete" || displayGradeAs === "Not Graded") return "—";
  if (grade === null) return "—";
  const pct = maxPoints > 0 ? Math.round((grade / maxPoints) * 100) : 0;
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