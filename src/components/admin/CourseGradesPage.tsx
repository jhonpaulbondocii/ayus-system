"use client";
// src/components/admin/CourseGradesPage.tsx  — fully responsive / mobile-friendly

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search, Filter,
  ChevronDown, BookOpen, FileText, RotateCcw, CheckCircle2,
  Clock, AlertCircle, Minus, X, ExternalLink,
  Eye, ChevronRight, ChevronLeft,
  ClipboardList, GraduationCap, ArrowRight,
  Calendar, Settings2, SlidersHorizontal,
} from "lucide-react";
import {
  getGradeColor,
  getGradeBg,
  getLetterGradeFromDisplay,
  type DisplayGradeAs,
} from "@/lib/gradeDisplay";

const MAROON      = "#7b1113";
const MAROON_LIGHT= "#fef2f2";
const MAROON_DARK = "#5a0d0f";
const FONT        = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

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
  type: "assignment" | "form";
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
interface FormGrade {
  formId: string;
  score: number | null;
  submittedAt: string | null;
  submissionId: string | null;
  hasSubmission: boolean;
}
interface StaffRow {
  id: string;
  name: string;
  email: string;
  image: string | null;
  position: string | null;
  courseRole: string;
  assignmentGrades: AssignmentGrade[];
  formGrades: FormGrade[];
  totalEarned: number;
  totalPossible: number;
  percentage: number | null;
}
interface GradesData {
  staff: StaffRow[];
  assignments: GradeColumn[];
  forms: GradeColumn[];
}
const EMPTY_GRADES_DATA: GradesData = { staff: [], assignments: [], forms: [] };

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
interface FormResponsePanelData {
  staffId: string;
  staffName: string;
  staffImage: string | null;
  formId: string;
  formTitle: string;
  maxPoints: number;
  formGrade: FormGrade;
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
function getScoreBg(score: number | null, max: number): string {
  if (score === null) return "transparent";
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.9) return "#f0fdf4";
  if (pct >= 0.7) return "#fffbeb";
  if (pct >= 0.5) return "#fff7ed";
  return "#fef2f2";
}
function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
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
  forms: GradeColumn[] = [],
  updatedFormGrades?: FormGrade[]
): StaffRow {
  const safeAssignments  = assignments ?? [];
  const safeForms        = forms ?? [];
  const safeGrades       = updatedAssignmentGrades ?? [];
  const safeFormGrades   = updatedFormGrades ?? staff.formGrades ?? [];

  const earnedFromAssignments = safeGrades.reduce((sum, g) => {
    const col = safeAssignments.find((a) => a.id === g.assignmentId);
    if (col?.doNotCount || col?.displayGradeAs === "Not Graded") return sum;
    return sum + (g.grade ?? 0);
  }, 0);

  const earnedFromForms = safeFormGrades.reduce((sum, g) => sum + (g.score ?? 0), 0);
  const totalEarned     = earnedFromAssignments + earnedFromForms;
  const totalPossible   =
    safeAssignments.filter((a) => !a.doNotCount && a.displayGradeAs !== "Not Graded")
      .reduce((sum, a) => sum + a.points, 0) +
    safeForms.reduce((sum, f) => sum + f.points, 0);
  const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;

  return { ...staff, assignmentGrades: safeGrades, formGrades: safeFormGrades, totalEarned, totalPossible, percentage };
}

/* ─────────────────────────────────────────────────────────────────────────────
   BACK BUTTON
───────────────────────────────────────────────────────────────────────────── */
function BackButton({ to, onNavigate }: { to: FilterSection; onNavigate: (s: FilterSection) => void }) {
  return (
    <button
      onClick={() => onNavigate(to)}
      className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 w-full hover:bg-gray-50 transition-colors"
    >
      <ChevronLeft size={14} className="text-gray-500" />
      <span className="text-xs font-semibold text-gray-600">Back</span>
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
      onClick={(e)     => { e.stopPropagation(); onOpenPanel(); }}
      className="w-6 h-9 flex items-center justify-center text-white text-[10px] font-black shrink-0 transition-all hover:opacity-80"
      style={{ background: MAROON }}
      title="Open grade panel"
    >→</button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FILTER PANEL  (full-screen bottom-sheet on mobile)
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
    if (isMobile) return; // mobile uses overlay backdrop
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, isMobile]);

  if (!open) return null;

  const statusOptions     = ["Late", "Missing", "Resubmitted", "Dropped", "Excused"];
  const submissionOptions = ["Has Ungraded Submissions", "Has Submissions", "Has No Submissions", "Has Unposted Grades"];

  const isActive   = (type: ActiveFilter["type"], value: string) =>
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
      <button onClick={() => toggleFilter(type, value)}
        className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between"
        style={active ? { background: MAROON, color: "white", fontWeight: 700 } : { color: "#374151", fontWeight: 500 }}>
        <span>{label ?? value}</span>
        {active && <CheckCircle2 size={14} />}
      </button>
    );
  };

  const inner = (
    <div style={{ fontFamily: FONT }}>
      {section === "root" && (
        <div>
          <button onClick={onManagePresets}
            className="w-full flex items-center gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-200">
            <Settings2 size={14} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Manage Filter Presets</span>
          </button>
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-black text-gray-600 uppercase tracking-wider">Filters</p>
          </div>
          {[
            { id: "assignmentGroups" as FilterSection, label: "Assignment Groups", count: activeFilters.filter(f => f.type === "assignmentGroup").length },
            { id: "studentGroups"   as FilterSection, label: "Staff Groups",       count: activeFilters.filter(f => f.type === "studentGroup").length },
            { id: "status"          as FilterSection, label: "Status",             count: activeFilters.filter(f => f.type === "status").length },
            { id: "submissions"     as FilterSection, label: "Submissions",        count: activeFilters.filter(f => f.type === "submissions").length },
            { id: "startEndDate"    as FilterSection, label: "Start & End Date",   count: activeFilters.filter(f => f.type === "dateRange").length },
          ].map(item => (
            <button key={item.id} onClick={() => setSection(item.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50">
              <span className="text-sm text-gray-700 font-medium">{item.label}</span>
              <div className="flex items-center gap-2">
                {item.count > 0 && (
                  <span className="w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                    style={{ background: MAROON }}>{item.count}</span>
                )}
                <ChevronRight size={14} className="text-gray-400" />
              </div>
            </button>
          ))}
          {activeFilters.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-3">
              <button onClick={() => { onClearAll(); onClose(); }} className="text-sm font-semibold hover:underline" style={{ color: MAROON }}>
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {section === "assignmentGroups" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div className="px-4 py-2.5 border-b border-gray-100"><p className="text-xs font-black text-gray-700">Assignment Groups</p></div>
          <div className="max-h-72 overflow-y-auto py-1">
            {assignmentGroups.length === 0
              ? <p className="px-4 py-3 text-xs text-gray-400 italic">No assignment groups available</p>
              : assignmentGroups.map(g => <OptionButton key={g} type="assignmentGroup" value={g} />)}
          </div>
        </div>
      )}

      {section === "studentGroups" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div className="px-4 py-2.5 border-b border-gray-100"><p className="text-xs font-black text-gray-700">Staff Groups</p></div>
          <div className="max-h-72 overflow-y-auto py-1">
            {staffGroups.length === 0
              ? <p className="px-4 py-3 text-xs text-gray-400 italic">No groups available</p>
              : staffGroups.map(g => <OptionButton key={g} type="studentGroup" value={g} />)}
          </div>
        </div>
      )}

      {section === "status" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div className="px-4 py-2.5 border-b border-gray-100"><p className="text-xs font-black text-gray-700">Status</p></div>
          <div className="py-1">{statusOptions.map(s => <OptionButton key={s} type="status" value={s} />)}</div>
        </div>
      )}

      {section === "submissions" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div className="px-4 py-2.5 border-b border-gray-100"><p className="text-xs font-black text-gray-700">Submissions</p></div>
          <div className="py-1">{submissionOptions.map(s => <OptionButton key={s} type="submissions" value={s} />)}</div>
        </div>
      )}

      {section === "startEndDate" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div className="px-4 py-3 border-b border-gray-100"><p className="text-xs font-black text-gray-700">Start & End Dates</p></div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Date</label>
              <div className="relative">
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setDateError(""); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-700 outline-none focus:border-gray-400 pr-9"
                  style={{ fontFamily: FONT }} />
                <Calendar size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Date</label>
              <div className="relative">
                <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setDateError(""); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-700 outline-none focus:border-gray-400 pr-9"
                  style={{ fontFamily: FONT }} />
                <Calendar size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {dateError && <p className="text-[10px] text-red-500 font-semibold">{dateError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setSection("root")}
                className="flex-1 h-11 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={applyDateFilter}
                className="flex-1 h-11 rounded-lg text-sm font-black text-white transition-all hover:opacity-90"
                style={{ background: MAROON }}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
          style={{ fontFamily: FONT }}>
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <p className="text-sm font-black text-gray-800">Filter</p>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"><X size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto">{inner}</div>
        </div>
      </>
    );
  }

  return (
    <div ref={ref}
      className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
      style={{ minWidth: 280, fontFamily: FONT }}>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4">
      <div ref={ref}
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 w-full sm:w-105 max-h-[80vh] flex flex-col"
        style={{ fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Settings2 size={15} style={{ color: MAROON }} />
            <p className="text-sm font-black text-gray-800">Filter Presets</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400"><X size={13} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Save Current Filters as Preset</p>
            {activeFilters.length === 0
              ? <p className="text-xs text-gray-400 italic">No active filters to save.</p>
              : (
                <div className="flex gap-2">
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Preset name…"
                    className="flex-1 h-10 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 outline-none"
                    style={{ fontFamily: FONT }}
                    onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                    onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")}
                    onKeyDown={e => { if (e.key === "Enter" && newName.trim()) { onSavePreset(newName.trim()); setNewName(""); } }} />
                  <button onClick={() => { if (newName.trim()) { onSavePreset(newName.trim()); setNewName(""); } }}
                    disabled={!newName.trim()}
                    className="h-10 px-4 rounded-lg text-xs font-black text-white disabled:opacity-40"
                    style={{ background: MAROON }}>Save</button>
                </div>
              )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Saved Presets</p>
            {presets.length === 0
              ? <p className="text-xs text-gray-400 italic">No presets saved yet.</p>
              : (
                <div className="space-y-2">
                  {presets.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-3 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-700 truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400">{p.filters.length} filter{p.filters.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => { onLoadPreset(p); onClose(); }}
                          className="h-8 px-3 rounded-lg text-xs font-black text-white"
                          style={{ background: MAROON }}>Apply</button>
                        <button onClick={() => onDeletePreset(p.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <X size={12} />
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
      case "studentGroup":    return "Student";
      case "status":          return "Status";
      case "submissions":     return "Sub";
      case "dateRange":       return "Date";
      default: return "";
    }
  })();

  return (
    <div ref={ref} className="relative">
      <button onClick={() => canChange ? setOpen(o => !o) : undefined}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-full border text-xs font-semibold transition-all"
        style={{ background: chipStyle.bg, borderColor: chipStyle.border, color: chipStyle.color }}>
        <span className="text-[9px] font-black opacity-60 uppercase">{typeLabel}:</span>
        <span>{filter.label}</span>
        {canChange && <ChevronDown size={11} />}
        <span onClick={e => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors cursor-pointer">
          <X size={9} />
        </span>
      </button>
      {open && canChange && statusOptions && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          style={{ minWidth: 160, fontFamily: FONT }}>
          <button onClick={() => { onRemove(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-600 hover:bg-gray-50 border-b border-gray-100">
            <X size={11} /> Remove Filter
          </button>
          {statusOptions.map(s => (
            <button key={s} onClick={() => { onChangeStatus!(s); setOpen(false); }}
              className="w-full flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              {filter.value === s && <span className="text-[#4338ca] mr-2">✓</span>}
              <span className={filter.value === s ? "font-bold text-[#4338ca]" : ""}>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GRADE PANEL  (bottom-sheet on mobile, right-side drawer on desktop)
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
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0" style={{ background: MAROON }}>
        <div className="flex items-center gap-3 min-w-0">
          {panel.staffImage
            ? <Image src={panel.staffImage} alt={panel.staffName} width={32} height={32} className="rounded-full object-cover shrink-0 ring-2 ring-white/30" />
            : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 ring-2 ring-white/30"
                style={{ background: MAROON_DARK }}>{getInitials(panel.staffName)}</div>}
          <div className="min-w-0">
            <p className="text-sm font-black text-white truncate">{panel.staffName}</p>
            <p className="text-[10px] text-white/60 truncate">{panel.staffEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {panel.grade.submissionId && (
            <button onClick={() => onOpenSpeedgrader(panel.staffId, panel.assignmentId, panel.grade.submissionId!)}
              className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-black text-white bg-white/15 hover:bg-white/25 transition-all">
              <Eye size={10} /> SpeedGrader
            </button>
          )}
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Assignment title bar */}
      <div className="px-5 py-2.5 border-b border-gray-100 shrink-0 bg-gray-50 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <button className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-100"><ChevronLeft size={11} /></button>
            <p className="text-xs font-black text-gray-800 truncate flex-1 text-center">{panel.assignmentTitle}</p>
            <button className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-100"><ChevronRight size={11} /></button>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 justify-center">
            <span className="text-[10px] text-gray-400">{panel.maxPoints} pts max</span>
            {panel.grade.submittedAt && (
              <span className="text-[10px] text-gray-400">
                · Submitted {new Date(panel.grade.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>
        {panel.grade.submissionId && (
          <button onClick={() => onOpenSpeedgrader(panel.staffId, panel.assignmentId, panel.grade.submissionId!)}
            className="ml-2 flex items-center gap-1 h-7 px-2.5 rounded-lg text-[10px] font-black border shrink-0 transition-all hover:opacity-80"
            style={{ borderColor: MAROON, color: MAROON, background: MAROON_LIGHT }}>
            <Eye size={10} /> SpeedGrader
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: MAROON }}>{gradeLabelForHeader}</p>
          {isNG && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center">
              <p className="text-xs font-semibold text-gray-400">This assignment is set to <strong>Not Graded</strong> and does not appear in the gradebook.</p>
            </div>
          )}
          {isCI && (
            <div className="relative">
              <select value={ciValue} onChange={e => setCiValue(e.target.value as "complete" | "incomplete" | "ungraded")}
                className="w-full h-11 border-2 rounded-xl px-3 text-sm font-bold text-gray-700 bg-white focus:outline-none appearance-none cursor-pointer"
                style={{ borderColor: MAROON, fontFamily: FONT }}>
                <option value="ungraded">Ungraded</option>
                <option value="complete">Complete</option>
                <option value="incomplete">Incomplete</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          )}
          {isPct && (
            <div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input type="number" min={0} max={100} step={1} value={pctInput}
                    onChange={e => { setPctInput(e.target.value); setError(null); }}
                    placeholder="—"
                    className="w-full h-11 border-2 rounded-xl px-3 pr-9 text-sm font-bold text-gray-800 outline-none"
                    style={{ borderColor: pctInput ? MAROON : "#e5e7eb", fontFamily: FONT }}
                    onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                    onBlur={e  => (e.currentTarget.style.borderColor = pctInput ? MAROON : "#e5e7eb")} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">%</span>
                </div>
                {pctInput !== "" && !isNaN(parseFloat(pctInput)) && (
                  <div className="h-11 px-3 rounded-xl flex flex-col items-center justify-center shrink-0 border"
                    style={{ background: gradeBg, borderColor: gradeColor + "40" }}>
                    <span className="text-xs font-black leading-none" style={{ color: gradeColor }}>{currentGrade} pts</span>
                    {letterGrade !== "—" && <span className="text-[9px] font-bold leading-none mt-0.5" style={{ color: gradeColor }}>{letterGrade}</span>}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Calculated from {panel.maxPoints} pts</p>
            </div>
          )}
          {!isNG && !isCI && !isPct && (
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={panel.maxPoints} step={0.5} value={pointsInput}
                onChange={e => { setPointsInput(e.target.value); setError(null); }}
                placeholder="—"
                className="flex-1 h-11 border-2 rounded-xl px-3 text-sm font-bold text-gray-800 outline-none"
                style={{ borderColor: pointsInput ? MAROON : "#e5e7eb", fontFamily: FONT }}
                onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                onBlur={e  => (e.currentTarget.style.borderColor = pointsInput ? MAROON : "#e5e7eb")} />
              <span className="text-sm font-bold text-gray-500 shrink-0">/ {panel.maxPoints}</span>
              {pointsInput !== "" && !isNaN(parseFloat(pointsInput)) && (
                <div className="h-11 px-2.5 rounded-xl flex flex-col items-center justify-center shrink-0 border"
                  style={{ background: gradeBg, borderColor: gradeColor + "40" }}>
                  <span className="text-xs font-black leading-none" style={{ color: gradeColor }}>{pctValue}%</span>
                  {letterGrade !== "—" && <span className="text-[9px] font-bold leading-none mt-0.5" style={{ color: gradeColor }}>{letterGrade}</span>}
                </div>
              )}
            </div>
          )}
          {error && <p className="text-[10px] text-red-500 mt-2 font-semibold">{error}</p>}
        </div>

        {!isNG && (
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: MAROON }}>Status</p>
            <div className="space-y-2">
              {(["None", "Late", "Missing", "Excused"] as SubmissionStatus[]).map(s => {
                const sc = statusColors[s];
                const isSelected = statusInput === s;
                return (
                  <label key={s}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all border"
                    style={{ background: isSelected ? sc.bg : "white", borderColor: isSelected ? sc.border : "#e5e7eb", color: isSelected ? sc.color : "#6b7280" }}>
                    <input type="radio" name="status" value={s} checked={isSelected}
                      onChange={() => { setStatusInput(s); if (s !== "Late") setDaysLate(""); }}
                      className="sr-only" />
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                      style={{ borderColor: isSelected ? sc.color : "#d1d5db" }}>
                      {isSelected && <div className="w-2 h-2 rounded-full" style={{ background: sc.color }} />}
                    </div>
                    <span className="text-xs font-bold">{s}</span>
                    {s === "Late" && isSelected && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <input type="number" min={0} value={daysLate} onChange={e => setDaysLate(e.target.value)}
                          placeholder="0"
                          className="w-14 h-7 border border-blue-200 rounded-md px-2 text-xs font-bold text-blue-700 outline-none focus:border-blue-400 bg-white"
                          onClick={e => e.stopPropagation()} />
                        <span className="text-[10px] font-semibold text-blue-600">days</span>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {(panel.grade.fileUrl || panel.grade.textEntry || panel.grade.websiteUrl) && (
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>Submission</p>
            {panel.grade.fileUrl && (
              <button onClick={() => panel.grade.submissionId && onOpenSpeedgrader(panel.staffId, panel.assignmentId, panel.grade.submissionId!)}
                className="flex items-center gap-2.5 px-3 py-3 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors group w-full text-left">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: MAROON_LIGHT }}>
                  <FileText size={13} style={{ color: MAROON }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-700 truncate">{panel.grade.fileUrl.split("/").pop() ?? "View File"}</p>
                  <p className="text-[10px] text-gray-400">Click to open SpeedGrader</p>
                </div>
              </button>
            )}
            {panel.grade.textEntry && (
              <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 max-h-24 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: panel.grade.textEntry }} />
            )}
            {panel.grade.websiteUrl && (
              <a href={panel.grade.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium">
                <ExternalLink size={10} />{panel.grade.websiteUrl}
              </a>
            )}
          </div>
        )}

        <div className="px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>Comments</p>
          <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
            placeholder="Add comments or feedback…" rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none resize-none leading-relaxed"
            style={{ fontFamily: FONT }}
            onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
            onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")} />
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 px-5 py-4 bg-gray-50 flex items-center justify-between gap-3">
        <button onClick={onClose}
          className="h-11 px-4 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-white transition-colors">
          Cancel
        </button>
        {!isNG && (
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-11 rounded-lg text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: saved ? "#15803d" : MAROON }}>
            {saving ? <><RotateCcw size={12} className="animate-spin" /> Saving…</>
             : saved  ? <><CheckCircle2 size={12} /> Saved!</>
             : "Update Grade"}
          </button>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "92vh", fontFamily: FONT }}>
          {panelContent}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col overflow-hidden"
        style={{ width: 400, fontFamily: FONT }}>
        {panelContent}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FORM RESPONSE PANEL  (bottom-sheet on mobile)
───────────────────────────────────────────────────────────────────────────── */
interface FetchedAnswer { questionId: string; question: string; type: string; answer: string | string[] | null; }

function FormResponsePanel({
  panel, courseId, onClose, onSave, onViewResponses, isMobile,
}: {
  panel: FormResponsePanelData; courseId: string;
  onClose: () => void;
  onSave: (score: number | null) => Promise<void>;
  onViewResponses: () => void;
  isMobile: boolean;
}) {
  const [gradeInput,     setGradeInput]     = useState(panel.formGrade.score !== null ? String(panel.formGrade.score) : "");
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [saved,          setSaved]          = useState(false);
  const [answers,        setAnswers]        = useState<FetchedAnswer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  useEffect(() => {
    const submissionId = panel.formGrade.submissionId;
    if (!submissionId) return;
    setLoadingAnswers(true);
    fetch(`/api/admin/courses/${courseId}/forms/${panel.formId}/submissions`)
      .then(r => r.json())
      .then(data => {
        const subs: { id: string; answers?: FetchedAnswer[] }[] = data.submissions ?? [];
        const match = subs.find(s => s.id === submissionId);
        if (match?.answers) setAnswers(match.answers);
      })
      .catch(() => {})
      .finally(() => setLoadingAnswers(false));
  }, [courseId, panel.formId, panel.formGrade.submissionId]);

  const handleSave = async () => {
    setError(null);
    const trimmed = gradeInput.trim();
    const parsed  = trimmed === "" ? null : parseFloat(trimmed);
    if (parsed !== null) {
      if (isNaN(parsed) || parsed < 0) { setError("Enter a valid score ≥ 0."); return; }
      if (panel.maxPoints > 0 && parsed > panel.maxPoints) { setError(`Max is ${panel.maxPoints} pts.`); return; }
    }
    setSaving(true);
    try { await onSave(parsed); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch { setError("Failed to save. Try again."); }
    finally { setSaving(false); }
  };

  const pctValue = gradeInput && panel.maxPoints > 0 ? Math.round((parseFloat(gradeInput) / panel.maxPoints) * 100) : null;
  function fmtAnswerValue(val: string | string[] | null): string {
    if (val === null || val === undefined) return "—";
    if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
    return val || "—";
  }

  const panelContent = (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0" style={{ background: MAROON }}>
        <div className="flex items-center gap-3 min-w-0">
          {panel.staffImage
            ? <Image src={panel.staffImage} alt={panel.staffName} width={32} height={32} className="rounded-full object-cover shrink-0 ring-2 ring-white/30" />
            : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 ring-2 ring-white/30"
                style={{ background: MAROON_DARK }}>{getInitials(panel.staffName)}</div>}
          <div className="min-w-0">
            <p className="text-sm font-black text-white truncate">{panel.staffName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ClipboardList size={10} className="text-white/60" />
              <p className="text-[10px] font-semibold text-white/70 truncate">{panel.formTitle}</p>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="px-5 py-3 border-b border-gray-100 shrink-0 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-gray-400 font-medium">Submitted</span>
              <p className="font-bold text-gray-700 mt-0.5">
                {panel.formGrade.submittedAt ? fmtDate(panel.formGrade.submittedAt) : <span className="text-gray-400 italic">Not submitted</span>}
              </p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Responses</span>
              <p className="font-bold text-gray-700 mt-0.5">{loadingAnswers ? "Loading…" : `${answers.length} answer${answers.length !== 1 ? "s" : ""}`}</p>
            </div>
          </div>
          {panel.formGrade.hasSubmission && (
            <button onClick={onViewResponses}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-black text-white transition-all hover:opacity-90 shrink-0"
              style={{ background: MAROON }}>
              <Eye size={11} /> View <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Responses</p>
        {loadingAnswers ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
            <RotateCcw size={14} className="animate-spin" />
            <span className="text-xs font-semibold">Loading answers…</span>
          </div>
        ) : answers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <ClipboardList size={18} className="text-gray-300" />
            </div>
            <p className="text-xs text-gray-400 font-semibold">No answers recorded</p>
          </div>
        ) : answers.map((ans, i) => (
          <div key={ans.questionId ?? i} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-black text-gray-500">
                <span className="text-gray-400 mr-1">Q{i + 1}.</span>{ans.question}
              </p>
            </div>
            <div className="px-3 py-2.5 text-xs text-gray-700 leading-relaxed">{fmtAnswerValue(ans.answer)}</div>
          </div>
        ))}

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Score</p>
            <span className="text-[10px] font-bold text-gray-400">{panel.maxPoints > 0 ? `/ ${panel.maxPoints} pts` : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={panel.maxPoints > 0 ? panel.maxPoints : undefined} step={0.5}
              value={gradeInput} onChange={e => { setGradeInput(e.target.value); setError(null); }}
              placeholder="—"
              className="flex-1 h-11 border-2 rounded-xl px-3 text-base font-black outline-none transition-colors"
              style={{ borderColor: gradeInput ? MAROON : "#e5e7eb", color: gradeInput ? MAROON : "#9ca3af" }}
              onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={e  => (e.currentTarget.style.borderColor = gradeInput ? MAROON : "#e5e7eb")} />
            {pctValue !== null && !isNaN(pctValue) && (
              <div className="h-11 px-3 rounded-xl flex flex-col items-center justify-center shrink-0 border"
                style={{ background: getScoreBg(parseFloat(gradeInput), panel.maxPoints), borderColor: getScoreColor(parseFloat(gradeInput), panel.maxPoints) + "40" }}>
                <span className="text-sm font-black leading-none" style={{ color: getScoreColor(parseFloat(gradeInput), panel.maxPoints) }}>{pctValue}%</span>
                <span className="text-[9px] font-bold leading-none mt-0.5" style={{ color: getScoreColor(parseFloat(gradeInput), panel.maxPoints) }}>{getLetterGrade(pctValue)}</span>
              </div>
            )}
          </div>
          {error && <p className="text-[10px] text-red-500 mt-1 font-semibold">{error}</p>}
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 px-5 py-4 bg-gray-50 flex items-center gap-3">
        <button onClick={onClose} className="h-11 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-white transition-colors">Close</button>
        {panel.formGrade.hasSubmission && (
          <button onClick={onViewResponses}
            className="h-11 px-4 rounded-xl text-sm font-black border-2 transition-all flex items-center gap-1.5"
            style={{ borderColor: MAROON, color: MAROON, background: "white" }}>
            <Eye size={12} /> Full Page
          </button>
        )}
        <button onClick={handleSave} disabled={saving}
          className="flex-1 h-11 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: saved ? "#15803d" : MAROON }}>
          {saving ? <><RotateCcw size={12} className="animate-spin" /> Saving…</> : saved ? <><CheckCircle2 size={12} /> Saved!</> : "Save Score"}
        </button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "92vh", fontFamily: FONT }}>
          {panelContent}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col"
        style={{ width: 460, fontFamily: FONT }}>
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
  const dga  = col.displayGradeAs ?? "Points";
  const isNG = dga === "Not Graded";
  const isCI = dga === "Complete/Incomplete";
  const isPct = dga === "Percentage";

  if (isSaving)         return <RotateCcw size={10} className="animate-spin text-gray-400" />;
  if (isNG)             return <span className="text-xs text-gray-400">-</span>;
  if (status === "EXCUSED") return <span className="text-xs font-bold text-amber-600">EX</span>;
  if (status === "MISSING") return <AlertCircle size={14} className="text-red-400" />;

  if (isCI) {
    if (score === col.points) return <span className="text-base font-bold text-green-600">✓</span>;
    if (score === 0)          return <span className="text-base font-bold text-red-500">✗</span>;
    return <Minus size={14} className="text-gray-300" />;
  }

  if (score !== null) {
    if (isPct) {
      const pct = col.points > 0 ? Math.round((score / col.points) * 100) : 0;
      return <span className="text-sm font-semibold text-gray-700">{pct}%</span>;
    }
    return <span className="text-sm font-semibold text-gray-700">{score}</span>;
  }

  if (status === "LATE") return <span className="text-xs font-semibold text-blue-500">Late</span>;

  if (hasSubmission) return (
    <div className="flex items-center gap-0.5">
      {col.type === "form"
        ? <ClipboardList size={11} style={{ color: MAROON }} />
        : <Eye size={11} style={{ color: "#1d4ed8" }} />}
      <span className="text-[9px] font-bold" style={{ color: col.type === "form" ? MAROON : "#1d4ed8" }}>
        {col.type === "form" ? "View" : "Sub"}
      </span>
    </div>
  );

  return <span className="text-xs text-gray-300">-</span>;
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
  const inputRef      = useRef<HTMLInputElement>(null);
  const committedRef  = useRef(false);
  const [ciVal, setCiVal] = useState<string>(
    score === col.points ? "complete" : score === 0 ? "incomplete" : ""
  );

  const commitPct = useCallback(async () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const val  = inputRef.current?.value.trim() ?? "";
    const pct  = parseFloat(val);
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
      <div data-cell-editor className="flex w-full">
        <div className="flex items-stretch w-full border-2 rounded" style={{ borderColor: "#2563eb" }}>
          <select autoFocus value={ciVal} onChange={e => setCiVal(e.target.value)}
            className="flex-1 h-9 text-xs font-bold bg-white outline-none px-1 cursor-pointer"
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
      <div data-cell-editor className="flex w-full">
        <div className="flex items-stretch w-full border-2 rounded" style={{ borderColor: "#2563eb" }}>
          <input ref={inputRef} autoFocus type="number" min={0} max={100} step={1}
            defaultValue={initPct}
            className="flex-1 h-9 text-sm font-semibold text-center bg-white outline-none w-0"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === "Escape") { onDismiss(); return; }
              if (e.key === "Enter")  { e.preventDefault(); void commitPct(); }
            }} />
          <span className="text-[10px] font-bold text-gray-400 self-center px-1">%</span>
          <ArrowBtn onOpenPanel={onOpenPanel} />
        </div>
      </div>
    );
  }

  return (
    <div data-cell-editor className="flex w-full">
      <div className="flex items-stretch w-full border-2 rounded" style={{ borderColor: "#2563eb" }}>
        <input ref={inputRef} autoFocus type="number" min={0} max={col.points} step={0.5}
          defaultValue={score ?? ""}
          className="flex-1 h-9 text-sm font-semibold text-center bg-white outline-none w-0"
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            if (e.key === "Escape") { onDismiss(); return; }
            if (e.key === "Enter")  { e.preventDefault(); void commitPts(); }
          }} />
        <span className="text-[10px] font-bold text-gray-400 self-center pr-1 shrink-0">/{col.points}</span>
        <ArrowBtn onOpenPanel={onOpenPanel} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOBILE STAFF GRADE CARD  — used instead of table rows on small screens
───────────────────────────────────────────────────────────────────────────── */
function MobileStaffCard({
  staff, filteredColumns, onOpenGradePanel, onOpenFormPanel, savingCells,
}: {
  staff: StaffRow;
  filteredColumns: GradeColumn[];
  onOpenGradePanel: (staff: StaffRow, col: GradeColumn) => void;
  onOpenFormPanel:  (staff: StaffRow, col: GradeColumn) => void;
  savingCells: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);

  const pctColor = staff.percentage === null ? "#9ca3af"
    : staff.percentage >= 90 ? "#15803d"
    : staff.percentage >= 70 ? "#b45309"
    : staff.percentage >= 50 ? "#c2410c"
    : "#b91c1c";

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden" style={{ fontFamily: FONT }}>
      {/* Card header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        {staff.image
          ? <Image src={staff.image} alt={staff.name} width={36} height={36} className="rounded-full object-cover shrink-0" />
          : <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
              style={{ background: MAROON }}>{getInitials(staff.name)}</div>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{staff.name}</p>
          <p className="text-[11px] text-gray-400 truncate">{staff.position ?? staff.courseRole}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {staff.percentage !== null && (
            <span className="text-sm font-black" style={{ color: pctColor }}>{staff.percentage}%</span>
          )}
          <ChevronRight size={16} className={`text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {/* Expanded assignments list */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
          {filteredColumns.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400 italic">No assignments</p>
          ) : filteredColumns.map(col => {
            const score: number | null = col.type === "form"
              ? (staff.formGrades?.find(g => g.formId === col.id)?.score ?? null)
              : (staff.assignmentGrades?.find(g => g.assignmentId === col.id)?.grade ?? null);
            const gradeEntry = col.type === "assignment"
              ? staff.assignmentGrades?.find(g => g.assignmentId === col.id) : null;
            const formEntry  = col.type === "form"
              ? staff.formGrades?.find(g => g.formId === col.id) : null;
            const status       = gradeEntry?.status ?? null;
            const hasSubmission = gradeEntry?.hasSubmission ?? formEntry?.hasSubmission ?? false;
            const cellKey      = `${staff.id}_${col.id}`;
            const isSaving     = savingCells.has(cellKey);
            const isNG         = col.displayGradeAs === "Not Graded";

            const handleTap = () => {
              if (isNG) return;
              if (col.type === "form" && formEntry) {
                onOpenFormPanel(staff, col);
              } else if (gradeEntry) {
                onOpenGradePanel(staff, col);
              }
            };

            return (
              <button key={col.id} onClick={handleTap}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isNG ? "opacity-50 cursor-default" : "hover:bg-white active:bg-white"}`}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {col.type === "form"
                    ? <ClipboardList size={12} className="text-gray-400 shrink-0" />
                    : <BookOpen size={12} className="text-gray-400 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">{col.title}</p>
                    <p className="text-[10px] text-gray-400">{col.assignmentGroup}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <div className="flex items-center justify-center w-16">
                    {isSaving
                      ? <RotateCcw size={12} className="animate-spin text-gray-400" />
                      : <CellDisplay col={col} score={score} status={status} hasSubmission={hasSubmission} isSaving={false} />
                    }
                  </div>
                  {!isNG && <ChevronRight size={13} className="text-gray-300" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function CourseGradesPage({ courseId }: { courseId: string }) {
  const router = useRouter();

  const [data,      setData]      = useState<GradesData>(EMPTY_GRADES_DATA);
  const [loadError, setLoadError] = useState(false);
  const [loading,   setLoading]   = useState(true);

  const [staffSearch,  setStaffSearch]  = useState("");
  const [assignSearch, setAssignSearch] = useState("");
  const [activeCell,   setActiveCell]   = useState<{ staffId: string; colId: string } | null>(null);
  const [savingCells,  setSavingCells]  = useState<Set<string>>(new Set());
  const [gradePanel,        setGradePanel]        = useState<GradePanelData | null>(null);
  const [formResponsePanel, setFormResponsePanel] = useState<FormResponsePanelData | null>(null);

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilters,   setActiveFilters]   = useState<ActiveFilter[]>([]);
  const [presetsOpen,     setPresetsOpen]     = useState(false);
  const [filterPresets,   setFilterPresets]   = useState<FilterPreset[]>([]);
  const filterBtnRef = useRef<HTMLDivElement>(null);

  // Responsive
  const [isMobile,       setIsMobile]       = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchGrades = useCallback(async () => {
    setLoading(true); setLoadError(false);
    setActiveCell(null); setGradePanel(null); setFormResponsePanel(null);
    try {
      const res  = await fetch(`/api/admin/courses/${courseId}/grades`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData({
        staff:       Array.isArray(json.staff)       ? json.staff       : [],
        assignments: Array.isArray(json.assignments) ? json.assignments : [],
        forms:       Array.isArray(json.forms)       ? json.forms       : [],
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
          return recalcStaff(s, updated, prev.assignments, prev.forms);
        }),
      }));
      if (gradePanel?.staffId === staffId && gradePanel?.assignmentId === assignmentId) {
        setGradePanel(p => p ? {
          ...p, grade: { ...p.grade, grade, feedback: feedback ?? p.grade.feedback, status: resolvedStatus, daysLate: daysLate ?? p.grade.daysLate }
        } : p);
      }
    } finally { setSavingCells(p => { const n = new Set(p); n.delete(key); return n; }); }
  };

  const saveFormScore = async (staffId: string, formId: string, score: number | null) => {
    const key = `${staffId}_${formId}`;
    setSavingCells(p => new Set(p).add(key));
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/grades/${staffId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId, score }),
      });
      if (!res.ok) throw new Error();
      setData(prev => ({
        ...prev,
        staff: prev.staff.map(s => {
          if (s.id !== staffId) return s;
          const updatedFormGrades = s.formGrades.map(g => g.formId === formId ? { ...g, score } : g);
          return recalcStaff(s, s.assignmentGrades, prev.assignments, prev.forms, updatedFormGrades);
        }),
      }));
      if (formResponsePanel?.staffId === staffId && formResponsePanel?.formId === formId) {
        setFormResponsePanel(p => p ? { ...p, formGrade: { ...p.formGrade, score } } : p);
      }
    } finally { setSavingCells(p => { const n = new Set(p); n.delete(key); return n; }); }
  };

  /* ── Loading / Error states ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400" style={{ fontFamily: FONT }}>
      <RotateCcw size={16} className="animate-spin" />
      <span className="text-sm font-semibold">Loading gradebook…</span>
    </div>
  );
  if (loadError) return (
    <div className="flex items-center justify-center h-64 text-gray-400" style={{ fontFamily: FONT }}>
      <div className="flex flex-col items-center gap-3">
        <AlertCircle size={28} className="opacity-40" />
        <p className="text-sm font-semibold">Failed to load grades.</p>
        <button onClick={fetchGrades} className="text-xs font-bold px-4 py-2 rounded-lg text-white" style={{ background: MAROON }}>Retry</button>
      </div>
    </div>
  );

  /* ── Derived data ── */
  const allColumns: GradeColumn[] = [...(data.assignments ?? []), ...(data.forms ?? [])];

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
          const hasAny = (s.assignmentGrades ?? []).some(g => g.hasSubmission) || (s.formGrades ?? []).some(g => g.hasSubmission);
          if (hasAny) return false;
        } else if (f.value === "Has Submissions") {
          const hasAny = (s.assignmentGrades ?? []).some(g => g.hasSubmission) || (s.formGrades ?? []).some(g => g.hasSubmission);
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
        const hasMatchingSubmission =
          (s.assignmentGrades ?? []).some(g => {
            if (!g.submittedAt) return false;
            const d = new Date(g.submittedAt);
            if (start && d < start) return false;
            if (end   && d > end)   return false;
            return true;
          }) || (s.formGrades ?? []).some(g => {
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

  const addFilter    = (f: ActiveFilter)   => setActiveFilters(p => [...p, f]);
  const removeFilter = (idx: number)       => setActiveFilters(p => p.filter((_, i) => i !== idx));
  const clearAllFilters = ()               => setActiveFilters([]);
  const changeFilterStatus = (idx: number, value: string) =>
    setActiveFilters(p => p.map((f, i) => i === idx ? { ...f, label: value, value } : f));

  const savePreset   = (name: string)          => {
    const preset: FilterPreset = { id: Date.now().toString(), name, filters: [...activeFilters] };
    setFilterPresets(p => [...p, preset]);
  };
  const loadPreset   = (preset: FilterPreset)  => setActiveFilters([...preset.filters]);
  const deletePreset = (id: string)            => setFilterPresets(p => p.filter(pr => pr.id !== id));

  /* ── Column widths for desktop table ── */
  const COL_W   = 120;
  const STAFF_W = 240;
  const TOTAL_W = 120;

  /* ── Helpers for mobile panel openers ── */
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

  const openFormPanelForStaff = (staff: StaffRow, col: GradeColumn) => {
    const formEntry = staff.formGrades?.find(g => g.formId === col.id);
    if (formEntry) {
      setFormResponsePanel({
        staffId: staff.id, staffName: staff.name, staffImage: staff.image,
        formId: col.id, formTitle: col.title, maxPoints: col.points, formGrade: formEntry,
      });
    }
  };

  /* ────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>

      {/* ── TOP HEADER ── */}
      <div className="border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0" style={{ background: MAROON }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <GraduationCap size={15} className="text-white" />
            <span className="text-sm font-black text-white hidden sm:inline">Gradebook</span>
            <span className="text-sm font-black text-white sm:hidden">Grades</span>
            <ChevronDown size={13} className="text-white/60" />
          </div>
          <span className="text-white/30 hidden sm:inline">|</span>
          <span className="text-xs text-white/70 font-medium hidden sm:inline">
            {filteredStaff.length} staff member{filteredStaff.length !== 1 ? "s" : ""}
          </span>
          {totalPending > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black text-white bg-white/20 shrink-0">
              <Clock size={9} />{totalPending} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile search toggle */}
          {isMobile && (
            <button onClick={() => setSearchExpanded(e => !e)}
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all">
              <Search size={14} />
            </button>
          )}
          <button onClick={fetchGrades}
            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
            title="Refresh">
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* ── SEARCH + FILTER BAR ── */}
      <div className={`bg-white border-b border-gray-200 px-4 py-3 shrink-0 ${isMobile && !searchExpanded ? "hidden" : ""}`}>
        <div className="flex items-start gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          <div className="w-full sm:flex-1">
            <p className="text-[10px] font-black text-gray-600 mb-1.5 uppercase tracking-wider">Staff Names</p>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder="Search Staff…"
                className="w-full pl-8 pr-3 h-10 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none text-gray-700"
                style={{ fontFamily: FONT }}
                onFocus={e => (e.currentTarget.style.borderColor = "#6b7280")}
                onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")} />
            </div>
          </div>
          <div className="w-full sm:flex-1">
            <p className="text-[10px] font-black text-gray-600 mb-1.5 uppercase tracking-wider">Assignment Names</p>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={assignSearch} onChange={e => setAssignSearch(e.target.value)} placeholder="Search Assignments…"
                className="w-full pl-8 pr-3 h-10 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none text-gray-700"
                style={{ fontFamily: FONT }}
                onFocus={e => (e.currentTarget.style.borderColor = "#6b7280")}
                onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div ref={filterBtnRef} className="relative">
            <button onClick={() => setFilterPanelOpen(o => !o)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-semibold transition-colors bg-white"
              style={{
                fontFamily: FONT,
                borderColor: activeFilters.length > 0 ? MAROON : "#d1d5db",
                color: activeFilters.length > 0 ? MAROON : "#374151",
              }}>
              <SlidersHorizontal size={13} className={activeFilters.length > 0 ? "" : "text-gray-500"}
                style={activeFilters.length > 0 ? { color: MAROON } : {}} />
              <span className="hidden sm:inline">Apply Filters</span>
              <span className="sm:hidden">Filter</span>
              {activeFilters.length > 0 && (
                <span className="w-5 h-5 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                  style={{ background: MAROON }}>{activeFilters.length}</span>
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

          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {activeFilters.map((f, idx) => (
              <FilterChip key={idx} filter={f} onRemove={() => removeFilter(idx)}
                onChangeStatus={f.type === "status" ? (val) => changeFilterStatus(idx, val) : undefined}
                statusOptions={f.type === "status" ? ["Late", "Missing", "Resubmitted", "Dropped", "Excused"] : undefined}
              />
            ))}
          </div>

          {activeFilters.length > 0 && (
            <button onClick={clearAllFilters}
              className="text-xs font-semibold hover:underline transition-colors shrink-0"
              style={{ color: MAROON }}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* ── MOBILE: Filter panel as bottom-sheet ── */}
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
      <div className="flex-1 overflow-auto">
        {filteredStaff.length === 0 || filteredColumns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-8">
            <BookOpen size={32} className="opacity-30" />
            <p className="text-sm font-semibold text-center">
              {filteredStaff.length === 0 ? "No staff members found." : "No assignments found."}
            </p>
            {activeFilters.length > 0 && (
              <button onClick={clearAllFilters}
                className="text-xs font-bold px-4 py-2 rounded-lg text-white"
                style={{ background: MAROON }}>
                Clear Filters
              </button>
            )}
          </div>
        ) : isMobile ? (
          /* ────────── MOBILE: Card list ────────── */
          <div className="p-3 space-y-2">
            {/* Summary row */}
            <div className="flex items-center justify-between px-1 py-1">
              <p className="text-xs font-bold text-gray-500">
                {filteredStaff.length} member{filteredStaff.length !== 1 ? "s" : ""} · {filteredColumns.length} assignment{filteredColumns.length !== 1 ? "s" : ""}
              </p>
            </div>
            {filteredStaff.map(staff => (
              <MobileStaffCard
                key={staff.id}
                staff={staff}
                filteredColumns={filteredColumns}
                onOpenGradePanel={openGradePanelForStaff}
                onOpenFormPanel={openFormPanelForStaff}
                savingCells={savingCells}
              />
            ))}
          </div>
        ) : (
          /* ────────── DESKTOP: Table ────────── */
          <table className="border-collapse"
            style={{ width: STAFF_W + filteredColumns.length * COL_W + (visibleGroups.length * TOTAL_W) + TOTAL_W }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-white border-b-2 border-r border-gray-200 text-left px-4 py-3"
                  style={{ width: STAFF_W, minWidth: STAFF_W, borderBottomColor: "#d1d5db" }}>
                  <span className="text-xs font-bold text-gray-700">Staff Name</span>
                </th>

                {filteredColumns.map(col => {
                  const dga  = col.displayGradeAs ?? "Points";
                  const isNG  = dga === "Not Graded";
                  const isCI  = dga === "Complete/Incomplete";
                  const isPct = dga === "Percentage";
                  const subLabel   = isNG ? "not graded" : isPct ? "percentage" : isCI ? "complete or incomplete" : "points";
                  const outOfLabel = isNG ? "UNGRADED" : `Out of ${col.points}`;
                  const needsGrading = col.type === "assignment"
                    ? (data.staff ?? []).filter(s => {
                        const g = (s.assignmentGrades ?? []).find(g => g.assignmentId === col.id);
                        return g?.hasSubmission && g.status !== "GRADED";
                      }).length
                    : 0;

                  return (
                    <th key={col.id}
                      className="border-b-2 border-r border-gray-200 px-2 py-0 align-bottom text-center"
                      style={{ width: COL_W, minWidth: COL_W, borderBottomColor: "#d1d5db", background: "white" }}>
                      <div className="flex flex-col items-center justify-end pb-2 pt-2 gap-0.5">
                        <div className="flex items-center gap-1 mb-0.5">
                          {col.type === "form"
                            ? <ClipboardList size={9} className="text-gray-400" />
                            : <BookOpen size={9} className="text-gray-400" />}
                          <span className="text-[10px] font-semibold text-gray-600 truncate max-w-22" title={col.title}>{col.title}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-normal">{subLabel}</span>
                        <span className="text-[10px] font-bold text-gray-600">{outOfLabel}</span>
                        {needsGrading > 0 && (
                          <span className="text-[8px] font-black px-1 py-0.5 rounded-full text-white mt-0.5"
                            style={{ background: "#b45309" }}>{needsGrading} missing</span>
                        )}
                        {col.doNotCount && <span className="text-[8px] text-gray-300 italic">not counted</span>}
                      </div>
                    </th>
                  );
                })}

                {visibleGroups.map(group => (
                  <th key={`group-total-${group}`}
                    className="border-b-2 border-r border-l border-gray-200 px-2 py-0 text-center align-bottom"
                    style={{ width: TOTAL_W, minWidth: TOTAL_W, borderBottomColor: "#d1d5db", background: "#f9fafb" }}>
                    <div className="pb-2 pt-2">
                      <p className="text-[10px] font-black text-gray-500 truncate max-w-25 mx-auto" title={group}>{group}</p>
                      <p className="text-[10px] text-gray-400 font-normal">UNGRADED AS 0</p>
                    </div>
                  </th>
                ))}

                <th className="sticky right-0 z-20 border-b-2 border-l border-gray-200 px-4 py-0 text-center bg-gray-50 align-bottom"
                  style={{ width: TOTAL_W, minWidth: TOTAL_W, borderBottomColor: "#d1d5db" }}>
                  <div className="pb-2 pt-2">
                    <p className="text-xs font-bold text-gray-700">Total</p>
                    <p className="text-[10px] text-gray-500 font-normal">UNGRADED AS 0</p>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredStaff.map((staff, si) => (
                <tr key={staff.id} className="group hover:bg-blue-50/30 transition-colors border-b border-gray-100">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/30 border-r border-gray-200 px-4 py-2.5 transition-colors"
                    style={{ width: STAFF_W }}>
                    <div className="flex items-center gap-2.5">
                      {staff.image
                        ? <Image src={staff.image} alt={staff.name} width={28} height={28} className="rounded-full object-cover shrink-0" />
                        : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0"
                            style={{ background: MAROON, opacity: 0.7 + (si % 3) * 0.1 }}>
                            {getInitials(staff.name)}
                          </div>}
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: "#0770A3" }}>{staff.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{staff.position ?? staff.courseRole}</p>
                      </div>
                    </div>
                  </td>

                  {filteredColumns.map(col => {
                    const dga   = col.displayGradeAs ?? "Points";
                    const isNG  = dga === "Not Graded";
                    const score: number | null = col.type === "form"
                      ? (staff.formGrades?.find(g => g.formId === col.id)?.score ?? null)
                      : (staff.assignmentGrades?.find(g => g.assignmentId === col.id)?.grade ?? null);
                    const gradeEntry    = col.type === "assignment" ? staff.assignmentGrades?.find(g => g.assignmentId === col.id) : null;
                    const formEntry     = col.type === "form" ? staff.formGrades?.find(g => g.formId === col.id) : null;
                    const status        = gradeEntry?.status ?? null;
                    const hasSubmission = gradeEntry?.hasSubmission ?? formEntry?.hasSubmission ?? false;
                    const cellKey       = `${staff.id}_${col.id}`;
                    const isActive      = activeCell?.staffId === staff.id && activeCell?.colId === col.id;
                    const isSaving      = savingCells.has(cellKey);

                    const openPanel = () => {
                      if (col.type === "form" && formEntry) {
                        setFormResponsePanel({
                          staffId: staff.id, staffName: staff.name, staffImage: staff.image,
                          formId: col.id, formTitle: col.title, maxPoints: col.points, formGrade: formEntry,
                        });
                        return;
                      }
                      if (gradeEntry) {
                        setGradePanel({
                          staffId: staff.id, staffName: staff.name, staffEmail: staff.email, staffImage: staff.image,
                          assignmentId: col.id, assignmentTitle: col.title, maxPoints: col.points,
                          displayGradeAs: dga, grade: gradeEntry,
                        });
                      }
                    };

                    const handleCellClick = () => {
                      if (isNG) return;
                      if (col.type === "form" && formEntry) {
                        setFormResponsePanel({
                          staffId: staff.id, staffName: staff.name, staffImage: staff.image,
                          formId: col.id, formTitle: col.title, maxPoints: col.points, formGrade: formEntry,
                        });
                        return;
                      }
                      setActiveCell(isActive ? null : { staffId: staff.id, colId: col.id });
                    };

                    return (
                      <td key={col.id} data-grade-cell
                        className="border-r border-gray-200 px-0 py-0 relative group/cell"
                        style={{ width: COL_W, minWidth: COL_W, background: isActive ? "#e0f2fe" : "transparent" }}>
                        {isActive ? (
                          <CellEditor col={col} score={score}
                            onSave={async (grade) => { await saveGrade(staff.id, col.id, grade); }}
                            onOpenPanel={openPanel}
                            onDismiss={() => setActiveCell(null)}
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-9 cursor-pointer relative"
                            onClick={handleCellClick}>
                            <div className="flex items-center justify-center h-9 text-xs font-semibold px-1">
                              <CellDisplay col={col} score={score} status={status} hasSubmission={hasSubmission} isSaving={isSaving} />
                            </div>
                            {!isNG && (
                              <button
                                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                                onClick={openPanel}
                                className="absolute right-0 top-0 bottom-0 w-5 flex items-center justify-center text-white text-[9px] font-black opacity-0 group-hover/cell:opacity-100 transition-opacity"
                                style={{ background: MAROON }}
                                title="Open grade panel">
                                →
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {visibleGroups.map(group => {
                    const groupCols   = allColumns.filter(c =>
                      (c.assignmentGroup || "Ungrouped") === group && !c.doNotCount && c.displayGradeAs !== "Not Graded"
                    );
                    const groupEarned = groupCols.reduce((sum, col) => {
                      if (col.type === "form") return sum + (staff.formGrades?.find(g => g.formId === col.id)?.score ?? 0);
                      return sum + (staff.assignmentGrades?.find(g => g.assignmentId === col.id)?.grade ?? 0);
                    }, 0);
                    const groupPossible = groupCols.reduce((sum, col) => sum + col.points, 0);
                    const groupPct      = groupPossible > 0 ? Math.round((groupEarned / groupPossible) * 100) : null;
                    return (
                      <td key={`group-total-${group}`}
                        className="border-r border-l border-gray-200 px-4 py-2.5 text-center"
                        style={{ width: TOTAL_W, background: "#f9fafb" }}>
                        {groupPct !== null
                          ? <span className="text-sm font-semibold text-gray-700">{groupPct}%</span>
                          : <span className="text-sm text-gray-400">—</span>}
                      </td>
                    );
                  })}

                  <td className="sticky right-0 z-10 bg-white group-hover:bg-blue-50/30 border-l border-gray-200 px-4 py-2.5 text-center transition-colors"
                    style={{ width: TOTAL_W }}>
                    {staff.percentage !== null
                      ? <span className="text-sm font-semibold text-gray-700">{staff.percentage}%</span>
                      : <span className="text-sm text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── STATUS BAR (desktop only) ── */}
      {!isMobile && (
        <div className="border-t border-gray-200 px-5 py-2 flex items-center gap-4 shrink-0 bg-gray-50">
          <div className="flex items-center gap-1.5">
            <Eye size={10} className="text-gray-400" />
            <span className="text-[10px] font-medium text-gray-400">Click cell to edit · Enter or click away to save · Esc to cancel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ClipboardList size={10} className="text-gray-400" />
            <span className="text-[10px] font-medium text-gray-400">Click → to open grade panel</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1">
              <BookOpen size={9} className="text-gray-400" />
              <span className="text-[10px] text-gray-400">Assignment</span>
            </div>
            <div className="flex items-center gap-1">
              <ClipboardList size={9} className="text-gray-400" />
              <span className="text-[10px] text-gray-400">Form</span>
            </div>
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

      {/* ── FORM RESPONSE PANEL ── */}
      {formResponsePanel && (
        <FormResponsePanel
          panel={formResponsePanel}
          courseId={courseId}
          onClose={() => setFormResponsePanel(null)}
          onSave={async score => { await saveFormScore(formResponsePanel.staffId, formResponsePanel.formId, score); }}
          onViewResponses={() => {
            router.push(`/admin/courses/${courseId}/forms/${formResponsePanel.formId}/responses`);
          }}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}