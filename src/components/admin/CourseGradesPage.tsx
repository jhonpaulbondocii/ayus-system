"use client";
// src/components/admin/CourseGradesPage.tsx  — assignments only, no forms

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  ChevronDown, BookOpen, FileText, RotateCcw, CheckCircle2,
  Clock, AlertCircle, Minus, X, ExternalLink,
  Eye, ChevronRight, ChevronLeft,
  GraduationCap,
  Calendar, Settings2, SlidersHorizontal,
} from "lucide-react";
import {
  getGradeColor,
  getGradeBg,
  getLetterGradeFromDisplay,
  type DisplayGradeAs,
} from "@/lib/gradeDisplay";

const MAROON       = "#7b1113";
const MAROON_LIGHT = "#fef2f2";
const MAROON_DARK  = "#5a0d0f";
const FONT         = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface GradeColumn {
  id: string;
  title: string;
  points: number;
  dueDate: string | null;
  assignmentGroup: string;
  doNotCount?: boolean;
  type: "assignment";
  displayGradeAs: DisplayGradeAs;
}
interface AssignmentGrade {
  assignmentId: string;
  grade: number | null;
  status: string;
  submittedAt: string | null;
  feedback: string | null;
  submissionId: string | null;
  hasSubmission: boolean;
  fileUrl: string | null;
  textEntry: string | null;
  websiteUrl: string | null;
  daysLate?: number | null;
}
interface StaffRow {
  id: string;
  name: string;
  email: string;
  image: string | null;
  position: string | null;
  courseRole: string;
  assignmentGrades: AssignmentGrade[];
  totalEarned: number;
  totalPossible: number;
  percentage: number | null;
}
interface GradesData {
  staff: StaffRow[];
  assignments: GradeColumn[];
}
const EMPTY_GRADES_DATA: GradesData = { staff: [], assignments: [] };

interface GradePanelData {
  staffId: string;
  staffName: string;
  staffEmail: string;
  staffImage: string | null;
  assignmentId: string;
  assignmentTitle: string;
  maxPoints: number;
  displayGradeAs: DisplayGradeAs;
  grade: AssignmentGrade;
}
type SubmissionStatus = "None" | "Late" | "Missing" | "Excused";

/* ─────────────────────────────────────────────────────────────────────────────
   FILTER TYPES
───────────────────────────────────────────────────────────────────────────── */
type FilterSection = "root" | "assignmentGroups" | "studentGroups" | "status" | "submissions" | "startEndDate";
interface ActiveFilter {
  type: "assignmentGroup" | "status" | "submissions" | "studentGroup" | "dateRange";
  label: string;
  value: string;
  startDate?: string;
  endDate?: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
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
function getPctColor(pct: number | null): string {
  if (pct === null) return "#9ca3af";
  if (pct >= 90) return "#15803d";
  if (pct >= 70) return "#b45309";
  if (pct >= 50) return "#c2410c";
  return "#b91c1c";
}
function getPctBg(pct: number | null): string {
  if (pct === null) return "#f3f4f6";
  if (pct >= 90) return "#f0fdf4";
  if (pct >= 70) return "#fffbeb";
  if (pct >= 50) return "#fff7ed";
  return "#fef2f2";
}
function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function dbStatusToUiStatus(dbStatus: string): SubmissionStatus {
  switch (dbStatus?.toUpperCase()) {
    case "LATE":    return "Late";
    case "MISSING": return "Missing";
    case "EXCUSED": return "Excused";
    default:        return "None";
  }
}
function uiStatusToDb(uiStatus: SubmissionStatus): string {
  switch (uiStatus) {
    case "Late":    return "LATE";
    case "Missing": return "MISSING";
    case "Excused": return "EXCUSED";
    default:        return "SUBMITTED";
  }
}
function recalcStaff(
  staff: StaffRow,
  updatedAssignmentGrades: AssignmentGrade[],
  assignments: GradeColumn[],
): StaffRow {
  const safeAssignments = assignments ?? [];
  const safeGrades      = updatedAssignmentGrades ?? [];

  const totalEarned = safeGrades.reduce((sum, g) => {
    const col = safeAssignments.find((a) => a.id === g.assignmentId);
    if (col?.doNotCount || col?.displayGradeAs === "Not Graded") return sum;
    return sum + (g.grade ?? 0);
  }, 0);

  const totalPossible = safeAssignments
    .filter((a) => !a.doNotCount && a.displayGradeAs !== "Not Graded")
    .reduce((sum, a) => sum + a.points, 0);

  const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;

  return { ...staff, assignmentGrades: safeGrades, totalEarned, totalPossible, percentage };
}

/* ─────────────────────────────────────────────────────────────────────────────
   BACK BUTTON
───────────────────────────────────────────────────────────────────────────── */
function BackButton({ to, onNavigate }: { to: FilterSection; onNavigate: (s: FilterSection) => void }) {
  return (
    <button
      onClick={() => onNavigate(to)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 16px",
        width: "100%", background: "none", border: "none",
        borderBottom: "1px solid #f3f4f6",
        cursor: "pointer", fontFamily: FONT,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
    >
      <ChevronLeft size={13} style={{ color: "#9ca3af" }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>Back</span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ARROW BUTTON
───────────────────────────────────────────────────────────────────────────── */
function ArrowBtn({ onOpenPanel }: { onOpenPanel: () => void }) {
  return (
    <button
      data-arrow-btn
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onClick={(e) => { e.stopPropagation(); onOpenPanel(); }}
      style={{
        width: 22, height: 36,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: MAROON, color: "white",
        fontSize: 11, fontWeight: 900,
        border: "none", cursor: "pointer", flexShrink: 0,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      title="Open grade panel"
    >→</button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FILTER PANEL
───────────────────────────────────────────────────────────────────────────── */
interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  assignmentGroups: string[];
  staffGroups: string[];
  activeFilters: ActiveFilter[];
  onAddFilter: (filter: ActiveFilter) => void;
  onRemoveFilter: (idx: number) => void;
  onClearAll: () => void;
  onManagePresets: () => void;
  isMobile: boolean;
}

function FilterPanel({
  open, onClose, assignmentGroups, staffGroups,
  activeFilters, onAddFilter, onRemoveFilter, onClearAll, onManagePresets, isMobile,
}: FilterPanelProps) {
  const [section,   setSection]   = useState<FilterSection>("root");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [dateError, setDateError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setTimeout(() => { setSection("root"); setStartDate(""); setEndDate(""); setDateError(""); }, 0);
    }
  }, [open]);

  useEffect(() => {
    if (isMobile) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, isMobile]);

  if (!open) return null;

  const statusOptions = ["Late", "Missing", "Excused"];
  const submissionOptions = ["Has Ungraded Submissions", "Has Submissions", "Has No Submissions", "Has Unposted Grades"];

  const isActive = (type: ActiveFilter["type"], value: string) =>
    activeFilters.some(f => f.type === type && f.value === value);

  const toggleFilter = (type: ActiveFilter["type"], value: string) => {
    const idx = activeFilters.findIndex(f => f.type === type && f.value === value);
    if (idx >= 0) onRemoveFilter(idx);
    else onAddFilter({ type, label: value, value });
  };

  const applyDateFilter = () => {
    if (!startDate && !endDate) { setDateError("Please enter at least one date."); return; }
    const existingIdx = activeFilters.findIndex(f => f.type === "dateRange");
    if (existingIdx >= 0) onRemoveFilter(existingIdx);
    const label = startDate && endDate ? `${startDate} – ${endDate}` : startDate ? `From ${startDate}` : `Until ${endDate}`;
    onAddFilter({ type: "dateRange", label, value: label, startDate, endDate });
    onClose();
  };

  const OptionButton = ({ type, value, label }: { type: ActiveFilter["type"]; value: string; label?: string }) => {
    const active = isActive(type, value);
    return (
      <button
        onClick={() => toggleFilter(type, value)}
        style={{
          width: "100%", textAlign: "left",
          padding: "10px 16px",
          fontSize: 13, fontFamily: FONT, fontWeight: active ? 700 : 500,
          background: active ? MAROON : "none",
          color: active ? "white" : "#374151",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "background 0.1s",
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f9fafb"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "none"; }}
      >
        <span>{label ?? value}</span>
        {active && <CheckCircle2 size={13} />}
      </button>
    );
  };

  const inner = (
    <div style={{ fontFamily: FONT }}>
      {section === "root" && (
        <div>
          <button
            onClick={onManagePresets}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "12px 16px", borderBottom: "1px solid #e5e7eb",
              background: "none", border: "none",
              cursor: "pointer", fontFamily: FONT,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <Settings2 size={13} style={{ color: "#9ca3af" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Manage Filter Presets</span>
          </button>

          <div style={{ padding: "8px 16px 6px", background: "#f9fafb", borderBottom: "1px solid #f0f0f0" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
              Filters
            </p>
          </div>

          {[
            { id: "assignmentGroups" as FilterSection, label: "Assignment Groups", count: activeFilters.filter(f => f.type === "assignmentGroup").length },
            { id: "studentGroups"   as FilterSection, label: "Staff Groups",       count: activeFilters.filter(f => f.type === "studentGroup").length },
            { id: "status"          as FilterSection, label: "Status",             count: activeFilters.filter(f => f.type === "status").length },
            { id: "submissions"     as FilterSection, label: "Submissions",        count: activeFilters.filter(f => f.type === "submissions").length },
            { id: "startEndDate"    as FilterSection, label: "Start & End Date",   count: activeFilters.filter(f => f.type === "dateRange").length },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "11px 16px", background: "none", border: "none",
                borderBottom: "1px solid #f9fafb", cursor: "pointer", fontFamily: FONT,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{item.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {item.count > 0 && (
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%",
                    fontSize: 9, fontWeight: 900, color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: MAROON,
                  }}>{item.count}</span>
                )}
                <ChevronRight size={13} style={{ color: "#d1d5db" }} />
              </div>
            </button>
          ))}

          {activeFilters.length > 0 && (
            <div style={{ borderTop: "1px solid #f3f4f6", padding: "10px 16px" }}>
              <button
                onClick={() => { onClearAll(); onClose(); }}
                style={{ fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {section === "assignmentGroups" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div style={{ padding: "8px 16px 6px", borderBottom: "1px solid #f0f0f0" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#374151", margin: 0 }}>Assignment Groups</p>
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto", paddingTop: 4 }}>
            {assignmentGroups.length === 0
              ? <p style={{ padding: "12px 16px", fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>No assignment groups available</p>
              : assignmentGroups.map(g => <OptionButton key={g} type="assignmentGroup" value={g} />)}
          </div>
        </div>
      )}

      {section === "studentGroups" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div style={{ padding: "8px 16px 6px", borderBottom: "1px solid #f0f0f0" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#374151", margin: 0 }}>Staff Groups</p>
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto", paddingTop: 4 }}>
            {staffGroups.length === 0
              ? <p style={{ padding: "12px 16px", fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>No groups available</p>
              : staffGroups.map(g => <OptionButton key={g} type="studentGroup" value={g} />)}
          </div>
        </div>
      )}

      {section === "status" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div style={{ padding: "8px 16px 6px", borderBottom: "1px solid #f0f0f0" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#374151", margin: 0 }}>Status</p>
          </div>
          <div style={{ paddingTop: 4 }}>
            {statusOptions.map(s => <OptionButton key={s} type="status" value={s} />)}
          </div>
        </div>
      )}

      {section === "submissions" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div style={{ padding: "8px 16px 6px", borderBottom: "1px solid #f0f0f0" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#374151", margin: 0 }}>Submissions</p>
          </div>
          <div style={{ paddingTop: 4 }}>
            {submissionOptions.map(s => <OptionButton key={s} type="submissions" value={s} />)}
          </div>
        </div>
      )}

      {section === "startEndDate" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div style={{ padding: "8px 16px 6px", borderBottom: "1px solid #f0f0f0" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#374151", margin: 0 }}>Start & End Dates</p>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Start Date</label>
              <div style={{ position: "relative" }}>
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setDateError(""); }}
                  style={{
                    width: "100%", border: "1px solid #e5e7eb", borderRadius: 8,
                    padding: "9px 36px 9px 12px", fontSize: 13, outline: "none",
                    boxSizing: "border-box", fontFamily: FONT,
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                  onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
                />
                <Calendar size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>End Date</label>
              <div style={{ position: "relative" }}>
                <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setDateError(""); }}
                  style={{
                    width: "100%", border: "1px solid #e5e7eb", borderRadius: 8,
                    padding: "9px 36px 9px 12px", fontSize: 13, outline: "none",
                    boxSizing: "border-box", fontFamily: FONT,
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                  onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
                />
                <Calendar size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
              </div>
            </div>
            {dateError && <p style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>{dateError}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setSection("root")}
                style={{
                  flex: 1, height: 40, border: "1px solid #e5e7eb", borderRadius: 8,
                  fontSize: 12, fontWeight: 700, color: "#6b7280", background: "#fff",
                  cursor: "pointer", fontFamily: FONT,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
              >Cancel</button>
              <button onClick={applyDateFilter}
                style={{
                  flex: 1, height: 40, borderRadius: 8,
                  fontSize: 12, fontWeight: 800, color: "white", background: MAROON,
                  border: "none", cursor: "pointer", fontFamily: FONT,
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: "white", borderRadius: "18px 18px 0 0",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.15)",
          maxHeight: "85vh", display: "flex", flexDirection: "column",
          fontFamily: FONT,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 16px 14px", borderBottom: "1px solid #f3f4f6",
          }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#111827", margin: 0 }}>Filter</p>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: "50%", background: "#f3f4f6",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={13} style={{ color: "#6b7280" }} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>{inner}</div>
        </div>
      </>
    );
  }

  return (
    <div ref={ref} style={{
      position: "absolute", left: 0, top: "calc(100% + 4px)", zIndex: 50,
      background: "white", border: "1px solid #e5e7eb",
      borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      overflow: "hidden", minWidth: 260, fontFamily: FONT,
    }}>
      {inner}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FILTER PRESETS MODAL
───────────────────────────────────────────────────────────────────────────── */
interface FilterPreset { id: string; name: string; filters: ActiveFilter[]; }

function FilterPresetsModal({
  open, onClose, presets, activeFilters,
  onSavePreset, onLoadPreset, onDeletePreset,
}: {
  open: boolean; onClose: () => void; presets: FilterPreset[];
  activeFilters: ActiveFilter[];
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: FilterPreset) => void;
  onDeletePreset: (id: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "flex-end",
      justifyContent: "center",
      background: "rgba(0,0,0,0.3)",
      padding: "0 0 0 0",
    }}>
      <div ref={ref} style={{
        background: "white",
        borderRadius: "18px 18px 0 0",
        boxShadow: "0 -4px 40px rgba(0,0,0,0.15)",
        border: "1px solid #e5e7eb",
        width: "100%",
        maxWidth: 480,
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
      }}
        className="sm:rounded-2xl sm:mb-8"
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid #f3f4f6",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Settings2 size={14} style={{ color: MAROON }} />
            <p style={{ fontSize: 14, fontWeight: 800, color: "#111827", margin: 0 }}>Filter Presets</p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: "50%", background: "#f3f4f6",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={13} style={{ color: "#6b7280" }} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Save Current Filters as Preset
            </p>
            {activeFilters.length === 0
              ? <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>No active filters to save.</p>
              : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Preset name…"
                    style={{
                      flex: 1, height: 38, border: "1px solid #e5e7eb", borderRadius: 8,
                      padding: "0 12px", fontSize: 13, outline: "none", fontFamily: FONT,
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
                    onKeyDown={e => { if (e.key === "Enter" && newName.trim()) { onSavePreset(newName.trim()); setNewName(""); } }}
                  />
                  <button
                    onClick={() => { if (newName.trim()) { onSavePreset(newName.trim()); setNewName(""); } }}
                    disabled={!newName.trim()}
                    style={{
                      height: 38, padding: "0 14px", borderRadius: 8,
                      fontSize: 12, fontWeight: 800, color: "white",
                      background: !newName.trim() ? "#d1d5db" : MAROON,
                      border: "none", cursor: !newName.trim() ? "default" : "pointer",
                      fontFamily: FONT,
                    }}
                  >Save</button>
                </div>
              )}
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Saved Presets
            </p>
            {presets.length === 0
              ? <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>No presets saved yet.</p>
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {presets.map(p => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", border: "1px solid #e5e7eb",
                      borderRadius: 10,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                        <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>{p.filters.length} filter{p.filters.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => { onLoadPreset(p); onClose(); }}
                          style={{
                            height: 30, padding: "0 12px", borderRadius: 8,
                            fontSize: 11, fontWeight: 800, color: "white", background: MAROON,
                            border: "none", cursor: "pointer", fontFamily: FONT,
                          }}
                        >Apply</button>
                        <button
                          onClick={() => onDeletePreset(p.id)}
                          style={{
                            width: 30, height: 30, borderRadius: 8, background: "none",
                            border: "1px solid #f3f4f6", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#ef4444"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#9ca3af"; }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ACTIVE FILTER CHIP
───────────────────────────────────────────────────────────────────────────── */
interface FilterChipProps {
  filter: ActiveFilter; onRemove: () => void;
  onChangeStatus?: (value: string) => void; statusOptions?: string[];
}
function FilterChip({ filter, onRemove, onChangeStatus, statusOptions }: FilterChipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const canChange = filter.type === "status" && statusOptions && onChangeStatus;
  const chipStyle = (() => {
    switch (filter.type) {
      case "assignmentGroup": return { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" };
      case "studentGroup":    return { bg: "#fef9c3", border: "#fde68a", color: "#92400e" };
      case "status":          return { bg: "#f0f4ff", border: "#c7d2fe", color: "#4338ca" };
      case "submissions":     return { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c" };
      case "dateRange":       return { bg: "#f0fdfa", border: "#99f6e4", color: "#0f766e" };
      default:                return { bg: "#f0f4ff", border: "#c7d2fe", color: "#4338ca" };
    }
  })();
  const typeLabel = (() => {
    switch (filter.type) {
      case "assignmentGroup": return "Group";
      case "studentGroup":    return "Staff";
      case "status":          return "Status";
      case "submissions":     return "Sub";
      case "dateRange":       return "Date";
      default: return "";
    }
  })();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => canChange ? setOpen(o => !o) : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          height: 26, padding: "0 8px",
          borderRadius: 20, border: `1px solid ${chipStyle.border}`,
          background: chipStyle.bg, color: chipStyle.color,
          fontSize: 11, fontWeight: 600, fontFamily: FONT, cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", display: "none" }}>{typeLabel}:</span>
        <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{filter.label}</span>
        {canChange && <ChevronDown size={9} />}
        <span
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{
            width: 14, height: 14, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", marginLeft: 2,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.1)")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}
        >
          <X size={8} />
        </span>
      </button>
      {open && canChange && statusOptions && (
        <div style={{
          position: "absolute", left: 0, top: "calc(100% + 4px)", zIndex: 50,
          background: "white", border: "1px solid #e5e7eb",
          borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          overflow: "hidden", minWidth: 160, fontFamily: FONT,
        }}>
          <button
            onClick={() => { onRemove(); setOpen(false); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "10px 12px", fontSize: 12, color: "#6b7280",
              background: "none", border: "none", borderBottom: "1px solid #f3f4f6",
              cursor: "pointer", fontFamily: FONT,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <X size={10} /> Remove Filter
          </button>
          {statusOptions.map(s => (
            <button
              key={s}
              onClick={() => { onChangeStatus!(s); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                padding: "10px 12px", fontSize: 13, color: "#374151",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: FONT, fontWeight: filter.value === s ? 700 : 400,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              {filter.value === s && <span style={{ color: "#4338ca", marginRight: 6 }}>✓</span>}
              <span style={{ color: filter.value === s ? "#4338ca" : "#374151" }}>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GRADE PANEL
───────────────────────────────────────────────────────────────────────────── */
function GradePanel({
  panel, onClose, onSave, onOpenSpeedgrader, isMobile,
}: {
  panel: GradePanelData;
  onClose: () => void;
  onSave: (grade: number | null, feedback: string, status: string, daysLate: number | null) => Promise<void>;
  onOpenSpeedgrader: (staffId: string, assignmentId: string, submissionId: string) => void;
  isMobile: boolean;
}) {
  const dga = panel.displayGradeAs;
  const isCI  = dga === "Complete/Incomplete";
  const isNG  = dga === "Not Graded";
  const isPct = dga === "Percentage";

  const initCiValue = (): "complete" | "incomplete" | "ungraded" => {
    if (panel.grade.status === "EXCUSED")       return "ungraded";
    if (panel.grade.grade === panel.maxPoints)  return "complete";
    if (panel.grade.grade === 0)                return "incomplete";
    return "ungraded";
  };

  const [pointsInput, setPointsInput] = useState(panel.grade.grade !== null ? String(panel.grade.grade) : "");
  const [pctInput,    setPctInput]    = useState(
    panel.grade.grade !== null && panel.maxPoints > 0
      ? String(Math.round((panel.grade.grade / panel.maxPoints) * 100)) : ""
  );
  const [ciValue,     setCiValue]     = useState<"complete" | "incomplete" | "ungraded">(initCiValue);
  const [statusInput, setStatusInput] = useState<SubmissionStatus>(dbStatusToUiStatus(panel.grade.status));
  const [daysLate,    setDaysLate]    = useState(panel.grade.daysLate != null ? String(panel.grade.daysLate) : "");
  const [feedback,    setFeedback]    = useState(panel.grade.feedback ?? "");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [saved,       setSaved]       = useState(false);

  const getRawGrade = (): number | null => {
    if (isCI) {
      if (ciValue === "complete")   return panel.maxPoints;
      if (ciValue === "incomplete") return 0;
      return null;
    }
    if (isPct) {
      const pct = parseFloat(pctInput);
      return isNaN(pct) || pctInput.trim() === "" ? null : Math.round((pct / 100) * panel.maxPoints * 10) / 10;
    }
    const v = parseFloat(pointsInput);
    return isNaN(v) || pointsInput.trim() === "" ? null : v;
  };

  const handleSave = async () => {
    if (isNG) { onClose(); return; }
    setError(null);
    const grade = getRawGrade();
    if (!isCI && grade !== null) {
      if (grade < 0 || grade > panel.maxPoints) {
        setError(`Score must be between 0 and ${panel.maxPoints}.`); return;
      }
    }
    setSaving(true);
    try {
      const dbStatus = statusInput === "None" && grade !== null ? "GRADED" : uiStatusToDb(statusInput);
      await onSave(grade, feedback, dbStatus, statusInput === "Late" && daysLate !== "" ? parseInt(daysLate) : null);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { setError("Failed to save. Try again."); }
    finally { setSaving(false); }
  };

  const currentGrade = getRawGrade();
  const pctValue     = currentGrade !== null && panel.maxPoints > 0
    ? Math.round((currentGrade / panel.maxPoints) * 100) : null;
  const gradeColor   = getGradeColor(currentGrade, panel.maxPoints, dga);
  const gradeBg      = getGradeBg(currentGrade, panel.maxPoints, dga);
  const letterGrade  = getLetterGradeFromDisplay(currentGrade, panel.maxPoints, dga);

  const gradeLabelForHeader = (() => {
    if (isNG)  return "Not Graded";
    if (isCI)  return "Grade";
    if (isPct) return "Grade out of 100%";
    return `Grade out of ${panel.maxPoints}`;
  })();

  const statusColors: Record<SubmissionStatus, { bg: string; color: string; border: string }> = {
    None:    { bg: "white",   color: "#374151", border: "#e5e7eb" },
    Late:    { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    Missing: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
    Excused: { bg: "#fefce8", color: "#92400e", border: "#fde68a" },
  };

  const panelContent = (
    <>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: MAROON, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {panel.staffImage
            ? <Image src={panel.staffImage} alt={panel.staffName} width={34} height={34}
                style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.25)" }} />
            : <div style={{
                width: 34, height: 34, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: MAROON_DARK, color: "white", fontSize: 11, fontWeight: 800,
                flexShrink: 0, border: "2px solid rgba(255,255,255,0.2)",
              }}>{getInitials(panel.staffName)}</div>}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {panel.staffName}
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {panel.staffEmail}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {panel.grade.submissionId && (
            <button
              onClick={() => onOpenSpeedgrader(panel.staffId, panel.assignmentId, panel.grade.submissionId!)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                height: 28, padding: "0 8px", borderRadius: 8,
                fontSize: 10, fontWeight: 800, color: "white",
                background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
            >
              <Eye size={10} />
              <span>Speedgrader</span>
            </button>
          )}
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.15)",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Assignment title bar */}
      <div style={{
        padding: "10px 16px", borderBottom: "1px solid #f3f4f6",
        background: "#fafafa", flexShrink: 0,
      }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, textAlign: "center" }}>{panel.assignmentTitle}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{panel.maxPoints} pts max</span>
          {panel.grade.submittedAt && (
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              · Submitted {new Date(panel.grade.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Grade input */}
        <div style={{ padding: "16px", borderBottom: "1px solid #f3f4f6" }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
            {gradeLabelForHeader}
          </p>

          {isNG && (
            <div style={{
              background: "#f9fafb", border: "1px solid #e5e7eb",
              borderRadius: 10, padding: "12px 16px", textAlign: "center",
            }}>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                This assignment is set to <strong>Not Graded</strong> and does not appear in the gradebook.
              </p>
            </div>
          )}

          {isCI && (
            <div style={{ position: "relative" }}>
              <select value={ciValue} onChange={e => setCiValue(e.target.value as "complete" | "incomplete" | "ungraded")}
                style={{
                  width: "100%", height: 42, border: `2px solid ${MAROON}`,
                  borderRadius: 10, padding: "0 36px 0 12px", fontSize: 13,
                  fontWeight: 700, color: "#374151", background: "white",
                  outline: "none", appearance: "none", cursor: "pointer", fontFamily: FONT,
                }}>
                <option value="ungraded">Ungraded</option>
                <option value="complete">Complete</option>
                <option value="incomplete">Incomplete</option>
              </select>
              <ChevronDown size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
            </div>
          )}

          {isPct && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input type="number" min={0} max={100} step={1} value={pctInput}
                    onChange={e => { setPctInput(e.target.value); setError(null); }}
                    placeholder="—"
                    style={{
                      width: "100%", height: 42,
                      border: `2px solid ${pctInput ? MAROON : "#e5e7eb"}`,
                      borderRadius: 10, padding: "0 36px 0 12px",
                      fontSize: 14, fontWeight: 700, color: "#111827",
                      outline: "none", boxSizing: "border-box", fontFamily: FONT,
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                    onBlur={e => (e.currentTarget.style.borderColor = pctInput ? MAROON : "#e5e7eb")}
                  />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: "#9ca3af" }}>%</span>
                </div>
                {pctInput !== "" && !isNaN(parseFloat(pctInput)) && (
                  <div style={{
                    height: 42, padding: "0 12px", borderRadius: 10,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: gradeBg, border: `1px solid ${gradeColor}30`, flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1, color: gradeColor }}>{currentGrade} pts</span>
                    {letterGrade !== "—" && <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1, marginTop: 2, color: gradeColor }}>{letterGrade}</span>}
                  </div>
                )}
              </div>
              <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 6 }}>Calculated from {panel.maxPoints} pts</p>
            </div>
          )}

          {!isNG && !isCI && !isPct && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" min={0} max={panel.maxPoints} step={0.5} value={pointsInput}
                onChange={e => { setPointsInput(e.target.value); setError(null); }}
                placeholder="—"
                style={{
                  flex: 1, height: 42,
                  border: `2px solid ${pointsInput ? MAROON : "#e5e7eb"}`,
                  borderRadius: 10, padding: "0 12px",
                  fontSize: 14, fontWeight: 700, color: "#111827",
                  outline: "none", fontFamily: FONT,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                onBlur={e => (e.currentTarget.style.borderColor = pointsInput ? MAROON : "#e5e7eb")}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", flexShrink: 0 }}>/ {panel.maxPoints}</span>
              {pointsInput !== "" && !isNaN(parseFloat(pointsInput)) && (
                <div style={{
                  height: 42, padding: "0 10px", borderRadius: 10,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: gradeBg, border: `1px solid ${gradeColor}30`, flexShrink: 0,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1, color: gradeColor }}>{pctValue}%</span>
                  {letterGrade !== "—" && <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1, marginTop: 2, color: gradeColor }}>{letterGrade}</span>}
                </div>
              )}
            </div>
          )}

          {error && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 8, fontWeight: 600 }}>{error}</p>}
        </div>

        {/* Status */}
        {!isNG && (
          <div style={{ padding: "16px", borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Status</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(["None", "Late", "Missing", "Excused"] as SubmissionStatus[]).map(s => {
                const sc = statusColors[s];
                const isSelected = statusInput === s;
                return (
                  <label key={s} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    border: `1px solid ${isSelected ? sc.border : "#e5e7eb"}`,
                    background: isSelected ? sc.bg : "white",
                    color: isSelected ? sc.color : "#6b7280",
                    transition: "all 0.1s",
                  }}>
                    <input type="radio" name="status" value={s} checked={isSelected}
                      onChange={() => { setStatusInput(s); if (s !== "Late") setDaysLate(""); }}
                      style={{ display: "none" }} />
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: `2px solid ${isSelected ? sc.color : "#d1d5db"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.color }} />}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{s}</span>
                    {s === "Late" && isSelected && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                        <input type="number" min={0} value={daysLate} onChange={e => setDaysLate(e.target.value)}
                          placeholder="0"
                          style={{
                            width: 52, height: 28, border: "1px solid #bfdbfe",
                            borderRadius: 6, padding: "0 8px",
                            fontSize: 12, fontWeight: 700, color: "#1d4ed8",
                            outline: "none", background: "white", fontFamily: FONT,
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#3b82f6" }}>days</span>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Submission */}
        {(panel.grade.fileUrl || panel.grade.textEntry || panel.grade.websiteUrl) && (
          <div style={{ padding: "16px", borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Submission</p>
            {panel.grade.fileUrl && (
              <button
                onClick={() => panel.grade.submissionId && onOpenSpeedgrader(panel.staffId, panel.assignmentId, panel.grade.submissionId!)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8,
                  border: "1px solid #e5e7eb", background: "white",
                  cursor: "pointer", width: "100%", textAlign: "left", fontFamily: FONT,
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#9ca3af")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: MAROON_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <FileText size={13} style={{ color: MAROON }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {panel.grade.fileUrl.split("/").pop() ?? "View File"}
                  </p>
                  <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>Click to open SpeedGrader</p>
                </div>
              </button>
            )}
            {panel.grade.textEntry && (
              <div style={{
                marginTop: 8, background: "#f9fafb", border: "1px solid #e5e7eb",
                borderRadius: 8, padding: "10px 12px",
                fontSize: 12, color: "#374151", maxHeight: 96, overflowY: "auto",
              }}
                dangerouslySetInnerHTML={{ __html: panel.grade.textEntry }}
              />
            )}
            {panel.grade.websiteUrl && (
              <a href={panel.grade.websiteUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 5, marginTop: 8,
                  fontSize: 12, color: "#2563eb", textDecoration: "none", fontWeight: 500,
                }}>
                <ExternalLink size={10} />{panel.grade.websiteUrl}
              </a>
            )}
          </div>
        )}

        {/* Comments */}
        <div style={{ padding: "16px" }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Comments</p>
          <textarea
            value={feedback} onChange={e => setFeedback(e.target.value)}
            placeholder="Add comments or feedback…"
            rows={3}
            style={{
              width: "100%", border: "1px solid #e5e7eb", borderRadius: 10,
              padding: "10px 12px", fontSize: 12, color: "#374151",
              outline: "none", resize: "none", lineHeight: 1.6,
              boxSizing: "border-box", fontFamily: FONT,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
            onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0, borderTop: "1px solid #f3f4f6",
        padding: "12px 16px", background: "#fafafa",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      }}>
        <button onClick={onClose} style={{
          height: 40, padding: "0 16px",
          border: "1px solid #e5e7eb", borderRadius: 8,
          fontSize: 13, fontWeight: 600, color: "#6b7280",
          background: "white", cursor: "pointer", fontFamily: FONT,
        }}
          onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
          onMouseLeave={e => (e.currentTarget.style.background = "white")}
        >Cancel</button>
        {!isNG && (
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, height: 40, borderRadius: 8,
            fontSize: 13, fontWeight: 800, color: "white",
            background: saved ? "#15803d" : MAROON,
            border: "none", cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: FONT, transition: "background 0.2s",
          }}>
            {saving
              ? <><RotateCcw size={12} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
              : saved
                ? <><CheckCircle2 size={12} /> Saved!</>
                : "Update Grade"}
          </button>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.3)" }} onClick={onClose} />
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: "white", borderRadius: "18px 18px 0 0",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.15)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          maxHeight: "calc(100dvh - 100px)", fontFamily: FONT,
        }}>
          {panelContent}
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.15)" }} onClick={onClose} />
      <div style={{
        position: "fixed", right: 0, top: 0, height: "100%", zIndex: 50,
        background: "white", boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
        borderLeft: "1px solid #e5e7eb",
        display: "flex", flexDirection: "column", overflow: "hidden",
        width: "min(400px, 95vw)", fontFamily: FONT,
      }}>
        {panelContent}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   INLINE CELL DISPLAY
───────────────────────────────────────────────────────────────────────────── */
function CellDisplay({ col, score, status, hasSubmission, isSaving }: {
  col: GradeColumn; score: number | null; status: string | null; hasSubmission: boolean; isSaving: boolean;
}) {
  const dga   = col.displayGradeAs ?? "Points";
  const isNG  = dga === "Not Graded";
  const isCI  = dga === "Complete/Incomplete";
  const isPct = dga === "Percentage";

  if (isSaving)             return <RotateCcw size={10} style={{ color: "#9ca3af", animation: "spin 1s linear infinite" }} />;
  if (isNG)                 return <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>;
  if (status === "EXCUSED") return <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309" }}>EX</span>;
  if (status === "MISSING") return <AlertCircle size={13} style={{ color: "#f87171" }} />;

  if (isCI) {
    if (score === col.points) return <span style={{ fontSize: 15, fontWeight: 700, color: "#16a34a" }}>✓</span>;
    if (score === 0)          return <span style={{ fontSize: 15, fontWeight: 700, color: "#ef4444" }}>✗</span>;
    return <Minus size={13} style={{ color: "#d1d5db" }} />;
  }

  if (score !== null) {
    const color = getScoreColor(score, col.points);
    if (isPct) {
      const pct = col.points > 0 ? Math.round((score / col.points) * 100) : 0;
      return <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct}%</span>;
    }
    return <span style={{ fontSize: 12, fontWeight: 700, color }}>{score}</span>;
  }

  if (status === "LATE") return <span style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6" }}>Late</span>;

  if (hasSubmission) return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Eye size={10} style={{ color: "#1d4ed8" }} />
      <span style={{ fontSize: 9, fontWeight: 700, color: "#1d4ed8" }}>Sub</span>
    </div>
  );

  return <span style={{ fontSize: 11, color: "#e5e7eb" }}>—</span>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   INLINE CELL EDITOR
───────────────────────────────────────────────────────────────────────────── */
function CellEditor({ col, score, onSave, onOpenPanel, onDismiss }: {
  col: GradeColumn; score: number | null;
  onSave: (grade: number | null) => Promise<void>;
  onOpenPanel: () => void; onDismiss: () => void;
}) {
  const dga   = col.displayGradeAs ?? "Points";
  const isCI  = dga === "Complete/Incomplete";
  const isPct = dga === "Percentage";
  const inputRef     = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);
  useEffect(() => { committedRef.current = false; }, []);
  const [ciVal, setCiVal] = useState<string>(
    score === col.points ? "complete" : score === 0 ? "incomplete" : ""
  );

  const commitPct = useCallback(async () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const val   = inputRef.current?.value.trim() ?? "";
    const pct   = parseFloat(val);
    const grade = !val || isNaN(pct) ? null : Math.round((pct / 100) * col.points * 10) / 10;
    await onSave(grade); onDismiss();
  }, [col.points, onSave, onDismiss]);

  const commitPts = useCallback(async () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const val = inputRef.current?.value.trim() ?? "";
    const v   = parseFloat(val);
    await onSave(!val || isNaN(v) ? null : v); onDismiss();
  }, [onSave, onDismiss]);

  const commitCI = useCallback(async (val: string) => {
    if (committedRef.current) return;
    committedRef.current = true;
    const grade = val === "complete" ? col.points : val === "incomplete" ? 0 : null;
    await onSave(grade); onDismiss();
  }, [col.points, onSave, onDismiss]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-cell-editor]") || target.closest("[data-arrow-btn]")) return;
      if (isCI)       void commitCI(ciVal);
      else if (isPct) void commitPct();
      else            void commitPts();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isCI, isPct, ciVal, commitCI, commitPct, commitPts]);

  if (isCI) {
    return (
      <div data-cell-editor style={{ display: "flex", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "stretch", width: "100%", border: "2px solid #2563eb", borderRadius: 4 }}>
          <select autoFocus value={ciVal} onChange={e => setCiVal(e.target.value)}
            style={{
              flex: 1, height: 36, fontSize: 11, fontWeight: 700,
              background: "white", outline: "none", padding: "0 4px", cursor: "pointer",
              border: "none", fontFamily: FONT,
            }}
            onClick={e => e.stopPropagation()}>
            <option value="" disabled>Select…</option>
            <option value="complete">✓ Complete</option>
            <option value="incomplete">✗ Incomplete</option>
            <option value="ungraded">— Ungraded</option>
          </select>
          <ArrowBtn onOpenPanel={onOpenPanel} />
        </div>
      </div>
    );
  }

  if (isPct) {
    const initPct = score !== null && col.points > 0 ? String(Math.round((score / col.points) * 100)) : "";
    return (
      <div data-cell-editor style={{ display: "flex", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "stretch", width: "100%", border: "2px solid #2563eb", borderRadius: 4 }}>
          <input ref={inputRef} autoFocus type="number" min={0} max={100} step={1}
            defaultValue={initPct}
            style={{
              flex: 1, height: 36, fontSize: 12, fontWeight: 600, textAlign: "center",
              background: "white", outline: "none", width: 0, border: "none", fontFamily: FONT,
            }}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === "Escape") { onDismiss(); return; }
              if (e.key === "Enter")  { e.preventDefault(); void commitPct(); }
            }}
          />
          <span style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", alignSelf: "center", padding: "0 3px" }}>%</span>
          <ArrowBtn onOpenPanel={onOpenPanel} />
        </div>
      </div>
    );
  }

  return (
    <div data-cell-editor style={{ display: "flex", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "stretch", width: "100%", border: "2px solid #2563eb", borderRadius: 4 }}>
        <input ref={inputRef} autoFocus type="number" min={0} max={col.points} step={0.5}
          defaultValue={score ?? ""}
          style={{
            flex: 1, height: 36, fontSize: 12, fontWeight: 600, textAlign: "center",
            background: "white", outline: "none", width: 0, border: "none", fontFamily: FONT,
          }}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            if (e.key === "Escape") { onDismiss(); return; }
            if (e.key === "Enter")  { e.preventDefault(); void commitPts(); }
          }}
        />
        <span style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", alignSelf: "center", paddingRight: 3, flexShrink: 0 }}>/{col.points}</span>
        <ArrowBtn onOpenPanel={onOpenPanel} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOBILE STAFF GRADE CARD
───────────────────────────────────────────────────────────────────────────── */
function MobileStaffCard({
  staff, filteredColumns, onOpenGradePanel, savingCells,
}: {
  staff: StaffRow;
  filteredColumns: GradeColumn[];
  onOpenGradePanel: (staff: StaffRow, col: GradeColumn) => void;
  savingCells: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);

  const pctColor = getPctColor(staff.percentage);
  const pctBg    = getPctBg(staff.percentage);
  const letter   = getLetterGrade(staff.percentage);

  return (
    <div style={{
      border: "1px solid #e5e7eb", borderRadius: 14,
      overflow: "hidden", background: "white",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      fontFamily: FONT,
    }}>
      {/* Card header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "12px 14px", background: "none", border: "none",
          cursor: "pointer", textAlign: "left", fontFamily: FONT,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}
      >
        {staff.image
          ? <Image src={staff.image} alt={staff.name} width={40} height={40}
              style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #f3f4f6" }} />
          : <div style={{
              width: 40, height: 40, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: MAROON, color: "white", fontSize: 12, fontWeight: 800, flexShrink: 0,
            }}>{getInitials(staff.name)}</div>}

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {staff.name}
          </p>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {staff.position ?? staff.courseRole}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {staff.percentage !== null ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              minWidth: 52, height: 44, borderRadius: 10, padding: "0 8px",
              background: pctBg, border: `1.5px solid ${pctColor}20`,
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1, color: pctColor }}>{staff.percentage}%</span>
              <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1, marginTop: 2, color: pctColor }}>{letter}</span>
            </div>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: 52, height: 44, borderRadius: 10, padding: "0 8px",
              background: "#f9fafb", border: "1.5px solid #f0f0f0",
            }}>
              <span style={{ fontSize: 14, color: "#d1d5db", fontWeight: 700 }}>—</span>
            </div>
          )}
          <ChevronRight size={15} style={{
            color: "#d1d5db",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }} />
        </div>
      </button>

      {/* Progress bar */}
      {staff.totalPossible > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px 12px", marginTop: -4 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 3, background: "#f3f4f6", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: `${Math.min(staff.percentage ?? 0, 100)}%`,
              background: pctColor, transition: "width 0.3s",
            }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
            {staff.totalEarned}/{staff.totalPossible} pts
          </span>
        </div>
      )}

      {/* Expanded assignments */}
      {expanded && (
        <div style={{ borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
          {filteredColumns.length === 0 ? (
            <p style={{ padding: "12px 14px", fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>No assignments</p>
          ) : filteredColumns.map((col, idx) => {
            const gradeEntry    = staff.assignmentGrades?.find(g => g.assignmentId === col.id);
            const score: number | null = gradeEntry?.grade ?? null;
            const status        = gradeEntry?.status ?? null;
            const hasSubmission = gradeEntry?.hasSubmission ?? false;
            const cellKey       = `${staff.id}_${col.id}`;
            const isSaving      = savingCells.has(cellKey);
            const isNG          = col.displayGradeAs === "Not Graded";
            const isPct         = col.displayGradeAs === "Percentage";

            const displayScore = (() => {
              if (score === null) return null;
              if (isPct && col.points > 0) return Math.round((score / col.points) * 100);
              return score;
            })();

            return (
              <button
                key={col.id}
                onClick={() => { if (isNG || !gradeEntry) return; onOpenGradePanel(staff, col); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 14px", textAlign: "left",
                  background: "none", border: "none", borderBottom: idx < filteredColumns.length - 1 ? "1px solid #f3f4f6" : "none",
                  cursor: isNG ? "default" : "pointer", fontFamily: FONT,
                  opacity: isNG ? 0.4 : 1,
                }}
                onMouseEnter={e => { if (!isNG) e.currentTarget.style.background = "white"; }}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <BookOpen size={12} style={{ color: "#3b82f6" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {col.title}
                  </p>
                  <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>{col.assignmentGroup} · {col.points} pts</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {isSaving ? (
                    <RotateCcw size={12} style={{ color: "#9ca3af" }} />
                  ) : displayScore !== null ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: getScoreColor(score, col.points) }}>
                        {isPct ? `${displayScore}%` : displayScore}
                      </span>
                      {!isPct && col.points > 0 && (
                        <span style={{ fontSize: 9, color: "#9ca3af", lineHeight: 1 }}>/{col.points}</span>
                      )}
                    </div>
                  ) : status === "EXCUSED" ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309" }}>EX</span>
                  ) : status === "MISSING" ? (
                    <AlertCircle size={13} style={{ color: "#f87171" }} />
                  ) : hasSubmission ? (
                    <span style={{ fontSize: 10, fontWeight: 700, color: MAROON }}>Ungraded</span>
                  ) : (
                    <span style={{ fontSize: 12, color: "#d1d5db" }}>—</span>
                  )}
                  {!isNG && <ChevronRight size={12} style={{ color: "#d1d5db" }} />}
                </div>
              </button>
            );
          })}

          {/* Footer total */}
          {staff.totalPossible > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px", background: "white", borderTop: "1px solid #f3f4f6",
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Overall</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 11, color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>
                  {staff.totalEarned}/{staff.totalPossible} pts
                </span>
                {staff.percentage !== null && (
                  <span style={{
                    fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                    padding: "3px 8px", borderRadius: 8,
                    color: pctColor, background: pctBg,
                  }}>
                    {staff.percentage}% · {letter}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function CourseGradesPage({ courseId }: { courseId: string }) {
  const [data,      setData]      = useState<GradesData>(EMPTY_GRADES_DATA);
  const [loadError, setLoadError] = useState(false);
  const [loading,   setLoading]   = useState(true);

  const [staffSearch,  setStaffSearch]  = useState("");
  const [assignSearch, setAssignSearch] = useState("");
  const [activeCell,   setActiveCell]   = useState<{ staffId: string; colId: string } | null>(null);
  const [savingCells,  setSavingCells]  = useState<Set<string>>(new Set());
  const [gradePanel,   setGradePanel]   = useState<GradePanelData | null>(null);

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilters,   setActiveFilters]   = useState<ActiveFilter[]>([]);
  const [presetsOpen,     setPresetsOpen]     = useState(false);
  const [filterPresets,   setFilterPresets]   = useState<FilterPreset[]>([]);
  const filterBtnRef = useRef<HTMLDivElement>(null);

  const [isMobile,       setIsMobile]       = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchGrades = useCallback(async () => {
    setLoading(true); setLoadError(false);
    setActiveCell(null); setGradePanel(null);
    try {
      const res  = await fetch(`/api/admin/courses/${courseId}/grades`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData({
        staff:       Array.isArray(json.staff)       ? json.staff       : [],
        assignments: Array.isArray(json.assignments) ? json.assignments : [],
      });
    } catch { setLoadError(true); setData(EMPTY_GRADES_DATA); }
    finally  { setLoading(false); }
  }, [courseId]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const navigateToSpeedgrader = useCallback((staffId: string, assignmentId: string, submissionId: string) => {
    window.open(`/admin/courses/${courseId}/assignments/${assignmentId}/speedgrader?submissionId=${submissionId}&staffId=${staffId}`, "_blank");
  }, [courseId]);

  const saveGrade = async (
    staffId: string, assignmentId: string,
    grade: number | null, feedback?: string,
    status?: string, daysLate?: number | null
  ) => {
    const key = `${staffId}_${assignmentId}`;
    setSavingCells(p => new Set(p).add(key));
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/grades/${staffId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, grade, feedback, status, daysLate }),
      });
      if (!res.ok) throw new Error();
      const resolvedStatus = status ?? (grade !== null ? "GRADED" : "PENDING");
      setData(prev => ({
        ...prev,
        staff: prev.staff.map(s => {
          if (s.id !== staffId) return s;
          const updated = s.assignmentGrades.map(g =>
            g.assignmentId === assignmentId
              ? { ...g, grade, feedback: feedback ?? g.feedback, status: resolvedStatus, daysLate: daysLate ?? g.daysLate }
              : g
          );
          return recalcStaff(s, updated, prev.assignments);
        }),
      }));
      if (gradePanel?.staffId === staffId && gradePanel?.assignmentId === assignmentId) {
        setGradePanel(p => p ? {
          ...p, grade: { ...p.grade, grade, feedback: feedback ?? p.grade.feedback, status: resolvedStatus, daysLate: daysLate ?? p.grade.daysLate }
        } : p);
      }
    } finally { setSavingCells(p => { const n = new Set(p); n.delete(key); return n; }); }
  };

  /* ── Loading / Error ── */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256, gap: 10, color: "#9ca3af", fontFamily: FONT }}>
      <RotateCcw size={16} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13, fontWeight: 600 }}>Loading gradebook…</span>
    </div>
  );
  if (loadError) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256, fontFamily: FONT }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <AlertCircle size={28} style={{ color: "#d1d5db" }} />
        <p style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600, margin: 0 }}>Failed to load grades.</p>
        <button onClick={fetchGrades} style={{
          fontSize: 12, fontWeight: 800, padding: "8px 16px", borderRadius: 8,
          color: "white", background: MAROON, border: "none", cursor: "pointer", fontFamily: FONT,
        }}>Retry</button>
      </div>
    </div>
  );

  /* ── Derived data ── */
  const allColumns: GradeColumn[] = data.assignments ?? [];

  const assignmentGroups: string[] = Array.from(
    new Set(allColumns.map(c => c.assignmentGroup).filter(Boolean))
  );
  const staffGroups: string[] = Array.from(
    new Set((data.staff ?? []).flatMap(s => s.position ? [s.position] : []))
  );

  const filteredStaff = (data.staff ?? []).filter(s => {
    const matchSearch = s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(staffSearch.toLowerCase());
    if (!matchSearch) return false;
    for (const f of activeFilters) {
      if (f.type === "studentGroup") {
        if (s.position !== f.value && s.courseRole !== f.value) return false;
      }
      if (f.type === "status") {
        const hasStatus = (s.assignmentGrades ?? []).some(g => {
          const uiSt = dbStatusToUiStatus(g.status);
          return uiSt === f.value || g.status?.toUpperCase() === f.value.toUpperCase();
        });
        if (!hasStatus) return false;
      }
      if (f.type === "submissions") {
        if (f.value === "Has No Submissions") {
          const hasAny = (s.assignmentGrades ?? []).some(g => g.hasSubmission);
          if (hasAny) return false;
        } else if (f.value === "Has Submissions") {
          const hasAny = (s.assignmentGrades ?? []).some(g => g.hasSubmission);
          if (!hasAny) return false;
        } else if (f.value === "Has Ungraded Submissions") {
          const hasUngraded = (s.assignmentGrades ?? []).some(g => g.hasSubmission && g.status !== "GRADED");
          if (!hasUngraded) return false;
        } else if (f.value === "Has Unposted Grades") {
          const hasUnposted = (s.assignmentGrades ?? []).some(g => g.grade !== null && g.status !== "GRADED");
          if (!hasUnposted) return false;
        }
      }
      if (f.type === "dateRange") {
        const start = f.startDate ? new Date(f.startDate) : null;
        const end   = f.endDate   ? new Date(f.endDate + "T23:59:59") : null;
        const hasMatchingSubmission = (s.assignmentGrades ?? []).some(g => {
          if (!g.submittedAt) return false;
          const d = new Date(g.submittedAt);
          if (start && d < start) return false;
          if (end   && d > end)   return false;
          return true;
        });
        if (!hasMatchingSubmission) return false;
      }
    }
    return true;
  });

  const activeGroupFilters = activeFilters.filter(f => f.type === "assignmentGroup").map(f => f.value);
  const visibleGroups      = activeGroupFilters.length > 0
    ? assignmentGroups.filter(g => activeGroupFilters.includes(g)) : assignmentGroups;

  const filteredColumns = allColumns.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(assignSearch.toLowerCase());
    if (!matchSearch) return false;
    if (activeGroupFilters.length > 0 && !activeGroupFilters.includes(c.assignmentGroup)) return false;
    return true;
  });

  const totalPending = (data.staff ?? []).reduce((sum, s) =>
    sum + (s.assignmentGrades ?? []).filter(g => g.hasSubmission && g.status !== "GRADED").length, 0);

  const addFilter       = (f: ActiveFilter)  => setActiveFilters(p => [...p, f]);
  const removeFilter    = (idx: number)      => setActiveFilters(p => p.filter((_, i) => i !== idx));
  const clearAllFilters = ()                 => setActiveFilters([]);
  const changeFilterStatus = (idx: number, value: string) =>
    setActiveFilters(p => p.map((f, i) => i === idx ? { ...f, label: value, value } : f));

  const savePreset   = (name: string)         => {
    const preset: FilterPreset = { id: Date.now().toString(), name, filters: [...activeFilters] };
    setFilterPresets(p => [...p, preset]);
  };
  const loadPreset   = (preset: FilterPreset) => setActiveFilters([...preset.filters]);
  const deletePreset = (id: string)           => setFilterPresets(p => p.filter(pr => pr.id !== id));

  /* ── Column widths ── */
  const COL_W   = 88;
  const STAFF_W = 186;
  const TOTAL_W = 96;

  /* ── Mobile panel helper ── */
  const openGradePanelForStaff = (staff: StaffRow, col: GradeColumn) => {
    const gradeEntry = staff.assignmentGrades?.find(g => g.assignmentId === col.id);
    if (gradeEntry) {
      setGradePanel({
        staffId: staff.id, staffName: staff.name, staffEmail: staff.email, staffImage: staff.image,
        assignmentId: col.id, assignmentTitle: col.title, maxPoints: col.points,
        displayGradeAs: col.displayGradeAs, grade: gradeEntry,
      });
    }
  };

  /* ── RENDER ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "white", fontFamily: FONT }}>

      {/* ── TOP HEADER ── */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        padding: "10px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, gap: 8,
        background: MAROON,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <GraduationCap size={15} style={{ color: "rgba(255,255,255,0.85)" }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>Gradebook</span>
          </div>

          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.2)", flexShrink: 0, display: isMobile ? "none" : "block" }} />

          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", display: isMobile ? "none" : "block" }}>
            {filteredStaff.length} member{filteredStaff.length !== 1 ? "s" : ""}
          </span>

          {totalPending > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 20,
              background: "rgba(255,255,255,0.15)", flexShrink: 0,
            }}>
              <Clock size={9} style={{ color: "rgba(255,255,255,0.8)" }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: "white" }}>
                {totalPending}{!isMobile && " pending"}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {isMobile && (
            <button
              onClick={() => setSearchExpanded(e => !e)}
              style={{
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
                background: searchExpanded ? "rgba(255,255,255,0.2)" : "none",
                cursor: "pointer", color: "rgba(255,255,255,0.8)",
              }}
            >
              <Search size={14} />
            </button>
          )}
          <button onClick={fetchGrades} style={{
            width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
            background: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)",
          }}
            title="Refresh"
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* ── SEARCH + FILTER BAR ── */}
      <div style={{
        background: "white", borderBottom: "1px solid #f0f0f0",
        padding: "10px 14px", flexShrink: 0,
        display: isMobile && !searchExpanded ? "none" : "block",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Staff search */}
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
            <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder="Search staff…"
              style={{
                width: "100%", height: 36, paddingLeft: 30, paddingRight: 10,
                border: "1px solid #e5e7eb", borderRadius: 8,
                fontSize: 12, background: "white", outline: "none",
                color: "#374151", boxSizing: "border-box", fontFamily: FONT,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#9ca3af")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
            />
          </div>
          {/* Assignment search */}
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
            <input value={assignSearch} onChange={e => setAssignSearch(e.target.value)} placeholder="Search assignments…"
              style={{
                width: "100%", height: 36, paddingLeft: 30, paddingRight: 10,
                border: "1px solid #e5e7eb", borderRadius: 8,
                fontSize: 12, background: "white", outline: "none",
                color: "#374151", boxSizing: "border-box", fontFamily: FONT,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#9ca3af")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
            />
          </div>
        </div>

        {/* Filter row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <div ref={filterBtnRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setFilterPanelOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 30, padding: "0 10px",
                border: `1px solid ${activeFilters.length > 0 ? MAROON : "#e5e7eb"}`,
                borderRadius: 8, background: "white",
                fontSize: 12, fontWeight: 600,
                color: activeFilters.length > 0 ? MAROON : "#374151",
                cursor: "pointer", fontFamily: FONT,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={e => (e.currentTarget.style.background = "white")}
            >
              <SlidersHorizontal size={12} style={{ color: activeFilters.length > 0 ? MAROON : "#9ca3af" }} />
              <span>Filters</span>
              {activeFilters.length > 0 && (
                <span style={{
                  width: 16, height: 16, borderRadius: "50%",
                  fontSize: 9, fontWeight: 900, color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: MAROON, flexShrink: 0,
                }}>{activeFilters.length}</span>
              )}
            </button>
            {!isMobile && (
              <FilterPanel
                open={filterPanelOpen}
                onClose={() => setFilterPanelOpen(false)}
                assignmentGroups={assignmentGroups}
                staffGroups={staffGroups}
                activeFilters={activeFilters}
                onAddFilter={addFilter}
                onRemoveFilter={removeFilter}
                onClearAll={clearAllFilters}
                onManagePresets={() => { setFilterPanelOpen(false); setPresetsOpen(true); }}
                isMobile={false}
              />
            )}
          </div>

          {/* Active filter chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, overflowX: "auto", minWidth: 0, scrollbarWidth: "none" }}>
            {activeFilters.map((f, idx) => (
              <FilterChip key={idx} filter={f} onRemove={() => removeFilter(idx)}
                onChangeStatus={f.type === "status" ? (val) => changeFilterStatus(idx, val) : undefined}
                statusOptions={f.type === "status" ? ["Late", "Missing", "Excused"] : undefined}
              />
            ))}
          </div>

          {activeFilters.length > 0 && (
            <button onClick={clearAllFilters} style={{
              fontSize: 11, fontWeight: 700, color: MAROON,
              background: "none", border: "none", cursor: "pointer",
              fontFamily: FONT, flexShrink: 0,
            }}>Clear</button>
          )}
        </div>
      </div>

      {/* Mobile Filter Panel */}
      {isMobile && (
        <FilterPanel
          open={filterPanelOpen}
          onClose={() => setFilterPanelOpen(false)}
          assignmentGroups={assignmentGroups}
          staffGroups={staffGroups}
          activeFilters={activeFilters}
          onAddFilter={addFilter}
          onRemoveFilter={removeFilter}
          onClearAll={clearAllFilters}
          onManagePresets={() => { setFilterPanelOpen(false); setPresetsOpen(true); }}
          isMobile={true}
        />
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {filteredStaff.length === 0 || filteredColumns.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "#9ca3af", padding: 32 }}>
            <BookOpen size={32} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: 13, fontWeight: 600, textAlign: "center", margin: 0 }}>
              {filteredStaff.length === 0 ? "No staff members found." : "No assignments found."}
            </p>
            {activeFilters.length > 0 && (
              <button onClick={clearAllFilters} style={{
                fontSize: 12, fontWeight: 800, padding: "8px 16px", borderRadius: 8,
                color: "white", background: MAROON, border: "none", cursor: "pointer", fontFamily: FONT,
              }}>Clear Filters</button>
            )}
          </div>
        ) : isMobile ? (
          /* ─── MOBILE: Card list ─── */
          <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", padding: "4px 2px 0", margin: 0 }}>
              {filteredStaff.length} member{filteredStaff.length !== 1 ? "s" : ""} · {filteredColumns.length} assignment{filteredColumns.length !== 1 ? "s" : ""}
            </p>
            {filteredStaff.map(staff => (
              <MobileStaffCard
                key={staff.id}
                staff={staff}
                filteredColumns={filteredColumns}
                onOpenGradePanel={openGradePanelForStaff}
                savingCells={savingCells}
              />
            ))}
          </div>
        ) : (
          /* ─── DESKTOP: Scrollable table ─── */
          <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
            <table style={{
              borderCollapse: "collapse",
              width: STAFF_W + filteredColumns.length * COL_W + visibleGroups.length * TOTAL_W + TOTAL_W,
            }}>
              <thead>
                <tr>
                  {/* Staff name column header */}
                  <th style={{
                    position: "sticky", left: 0, zIndex: 20, background: "white",
                    borderBottom: "2px solid #e5e7eb", borderRight: "1px solid #e5e7eb",
                    textAlign: "left", padding: "10px 12px",
                    width: STAFF_W, minWidth: STAFF_W,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>Staff</span>
                  </th>

                  {/* Assignment column headers */}
                  {filteredColumns.map(col => {
                    const dga   = col.displayGradeAs ?? "Points";
                    const isNG  = dga === "Not Graded";
                    const isCI  = dga === "Complete/Incomplete";
                    const isPct = dga === "Percentage";
                    const subLabel   = isNG ? "—" : isPct ? "%" : isCI ? "✓/✗" : "pts";
                    const outOfLabel = isNG ? "—" : isPct ? "100%" : `/${col.points}`;
                    const needsGrading = (data.staff ?? []).filter(s => {
                      const g = (s.assignmentGrades ?? []).find(g => g.assignmentId === col.id);
                      return g?.hasSubmission && g.status !== "GRADED";
                    }).length;

                    return (
                      <th key={col.id} style={{
                        borderBottom: "2px solid #e5e7eb", borderRight: "1px solid #e5e7eb",
                        padding: "8px 4px", verticalAlign: "bottom", textAlign: "center",
                        width: COL_W, minWidth: COL_W, background: "white",
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 6, paddingTop: 6, gap: 3 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "center", width: "100%" }}>
                            <BookOpen size={8} style={{ color: "#9ca3af", flexShrink: 0 }} />
                            <span style={{
                              fontSize: 9, fontWeight: 600, color: "#6b7280",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 72,
                            }} title={col.title}>{col.title}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ fontSize: 8, color: "#9ca3af" }}>{subLabel}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#6b7280" }}>{outOfLabel}</span>
                          </div>
                          {needsGrading > 0 && (
                            <span style={{
                              fontSize: 7, fontWeight: 900, color: "white",
                              padding: "1px 5px", borderRadius: 10,
                              background: "#d97706", marginTop: 1,
                            }}>{needsGrading}</span>
                          )}
                          {col.doNotCount && <span style={{ fontSize: 7, color: "#d1d5db", fontStyle: "italic" }}>skip</span>}
                        </div>
                      </th>
                    );
                  })}

                  {/* Group total headers */}
                  {visibleGroups.map(group => (
                    <th key={`group-total-${group}`} style={{
                      borderBottom: "2px solid #e5e7eb", borderRight: "1px solid #e5e7eb", borderLeft: "1px solid #e5e7eb",
                      padding: "8px 8px", textAlign: "center", verticalAlign: "bottom",
                      width: TOTAL_W, minWidth: TOTAL_W, background: "#f9fafb",
                    }}>
                      <div style={{ paddingBottom: 6, paddingTop: 6 }}>
                        <p style={{ fontSize: 9, fontWeight: 800, color: "#6b7280", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }} title={group}>{group}</p>
                        <p style={{ fontSize: 8, color: "#9ca3af", margin: "2px 0 0" }}>0 if ungraded</p>
                      </div>
                    </th>
                  ))}

                  {/* Total header */}
                  <th style={{
                    position: "sticky", right: 0, zIndex: 20,
                    borderBottom: "2px solid #e5e7eb", borderLeft: "1px solid #e5e7eb",
                    padding: "8px 12px", textAlign: "center", verticalAlign: "bottom",
                    width: TOTAL_W, minWidth: TOTAL_W, background: "#f9fafb",
                  }}>
                    <div style={{ paddingBottom: 6, paddingTop: 6 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: "#374151", margin: 0 }}>Total</p>
                      <p style={{ fontSize: 8, color: "#9ca3af", margin: "2px 0 0" }}>0 if ungraded</p>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStaff.map((staff, si) => {
                  const pctColor = getPctColor(staff.percentage);
                  const pctBg    = getPctBg(staff.percentage);

                  return (
                    <tr key={staff.id} style={{ borderBottom: "1px solid #f3f4f6" }}
                      onMouseEnter={e => {
                        const tds = e.currentTarget.querySelectorAll("td");
                        tds.forEach(td => { if (!td.hasAttribute("data-grade-cell") || !td.querySelector("[data-cell-editor]")) td.style.background = "#f8faff"; });
                      }}
                      onMouseLeave={e => {
                        const tds = e.currentTarget.querySelectorAll("td");
                        tds.forEach(td => { if (!td.hasAttribute("data-grade-cell") || !td.querySelector("[data-cell-editor]")) td.style.background = ""; });
                      }}
                    >
                      {/* Staff name cell */}
                      <td style={{
                        position: "sticky", left: 0, zIndex: 10,
                        background: "white", borderRight: "1px solid #e5e7eb",
                        padding: "8px 12px",
                        width: STAFF_W,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {staff.image
                            ? <Image src={staff.image} alt={staff.name} width={26} height={26}
                                style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                            : <div style={{
                                width: 26, height: 26, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                background: MAROON, color: "white", fontSize: 8, fontWeight: 800, flexShrink: 0,
                                opacity: 0.7 + (si % 3) * 0.1,
                              }}>{getInitials(staff.name)}</div>}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: "#0770A3", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {staff.name}
                            </p>
                            <p style={{ fontSize: 9, color: "#9ca3af", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {staff.position ?? staff.courseRole}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Grade cells */}
                      {filteredColumns.map(col => {
                        const dga        = col.displayGradeAs ?? "Points";
                        const isNG       = dga === "Not Graded";
                        const gradeEntry = staff.assignmentGrades?.find(g => g.assignmentId === col.id);
                        const score: number | null = gradeEntry?.grade ?? null;
                        const status        = gradeEntry?.status ?? null;
                        const hasSubmission = gradeEntry?.hasSubmission ?? false;
                        const cellKey  = `${staff.id}_${col.id}`;
                        const isActive = activeCell?.staffId === staff.id && activeCell?.colId === col.id;
                        const isSaving = savingCells.has(cellKey);

                        const openPanel = () => {
                          if (gradeEntry) {
                            setGradePanel({
                              staffId: staff.id, staffName: staff.name, staffEmail: staff.email, staffImage: staff.image,
                              assignmentId: col.id, assignmentTitle: col.title, maxPoints: col.points,
                              displayGradeAs: dga, grade: gradeEntry,
                            });
                          }
                        };

                        const handleCellClick = () => {
                          if (isNG || !gradeEntry) return;
                          setActiveCell(isActive ? null : { staffId: staff.id, colId: col.id });
                        };

                        return (
                          <td key={col.id} data-grade-cell
                            style={{
                              borderRight: "1px solid #f3f4f6", padding: 0,
                              position: "relative",
                              width: COL_W, minWidth: COL_W,
                              background: isActive ? "#e0f2fe" : "transparent",
                            }}
                          >
                            {isActive ? (
                              <CellEditor col={col} score={score}
                                onSave={async (grade) => { await saveGrade(staff.id, col.id, grade); }}
                                onOpenPanel={openPanel}
                                onDismiss={() => setActiveCell(null)}
                              />
                            ) : (
                              <div
                                onClick={handleCellClick}
                                style={{
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  width: "100%", height: 36, cursor: isNG ? "default" : "pointer",
                                  position: "relative",
                                }}
                              >
                                <CellDisplay col={col} score={score} status={status} hasSubmission={hasSubmission} isSaving={isSaving} />
                                {!isNG && (
                                  <button
                                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                                    onClick={openPanel}
                                    style={{
                                      position: "absolute", right: 0, top: 0, bottom: 0, width: 18,
                                      display: "none", alignItems: "center", justifyContent: "center",
                                      background: MAROON, color: "white",
                                      fontSize: 9, fontWeight: 900, border: "none", cursor: "pointer",
                                    }}
                                    className="grade-panel-btn"
                                    title="Open grade panel"
                                  >→</button>
                                )}
                              </div>
                            )}
                            <style>{`.group:hover .grade-panel-btn, tr:hover td[data-grade-cell]:hover .grade-panel-btn { display: flex !important; }`}</style>
                          </td>
                        );
                      })}

                      {/* Group totals */}
                      {visibleGroups.map(group => {
                        const groupCols = allColumns.filter(c =>
                          (c.assignmentGroup || "Ungrouped") === group && !c.doNotCount && c.displayGradeAs !== "Not Graded"
                        );
                        const groupEarned = groupCols.reduce((sum, col) =>
                          sum + (staff.assignmentGrades?.find(g => g.assignmentId === col.id)?.grade ?? 0), 0);
                        const groupPossible = groupCols.reduce((sum, col) => sum + col.points, 0);
                        const groupPct      = groupPossible > 0 ? Math.round((groupEarned / groupPossible) * 100) : null;
                        return (
                          <td key={`group-total-${group}`} style={{
                            borderRight: "1px solid #e5e7eb", borderLeft: "1px solid #e5e7eb",
                            padding: "8px 12px", textAlign: "center",
                            width: TOTAL_W, background: "#f9fafb",
                          }}>
                            {groupPct !== null
                              ? <span style={{ fontSize: 12, fontWeight: 700, color: getPctColor(groupPct) }}>{groupPct}%</span>
                              : <span style={{ fontSize: 13, color: "#d1d5db" }}>—</span>}
                          </td>
                        );
                      })}

                      {/* Total cell */}
                      <td style={{
                        position: "sticky", right: 0, zIndex: 10,
                        borderLeft: "1px solid #e5e7eb", padding: "8px 12px", textAlign: "center",
                        width: TOTAL_W,
                        background: staff.percentage !== null ? pctBg : "#f9fafb",
                      }}>
                        {staff.percentage !== null ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <span style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: pctColor }}>
                              {staff.percentage}%
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1, color: pctColor }}>
                              {getLetterGrade(staff.percentage)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, color: "#d1d5db" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── STATUS BAR (desktop only) ── */}
      {!isMobile && (
        <div style={{
          borderTop: "1px solid #f0f0f0", padding: "7px 14px",
          display: "flex", alignItems: "center", gap: 16,
          flexShrink: 0, background: "#fafafa", flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Eye size={10} style={{ color: "#9ca3af" }} />
            <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500 }}>Click cell to edit · Enter or click away to save · Esc to cancel</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <BookOpen size={10} style={{ color: "#9ca3af" }} />
            <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500 }}>Hover cell then click → to open grade panel</span>
          </div>
        </div>
      )}

      {/* ── FILTER PRESETS MODAL ── */}
      <FilterPresetsModal
        open={presetsOpen}
        onClose={() => setPresetsOpen(false)}
        presets={filterPresets}
        activeFilters={activeFilters}
        onSavePreset={savePreset}
        onLoadPreset={loadPreset}
        onDeletePreset={deletePreset}
      />

      {/* ── GRADE PANEL ── */}
      {gradePanel && (
        <GradePanel
          panel={gradePanel}
          onClose={() => setGradePanel(null)}
          onSave={async (grade, feedback, status, daysLate) => {
            await saveGrade(gradePanel.staffId, gradePanel.assignmentId, grade, feedback, status, daysLate);
          }}
          onOpenSpeedgrader={navigateToSpeedgrader}
          isMobile={isMobile}
        />
      )}

      {/* Spin keyframe for loading icons */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}