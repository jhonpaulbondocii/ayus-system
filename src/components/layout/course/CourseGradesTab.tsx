"use client";
// src/components/layout/course/CourseGradesTab.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Search, Filter,
  ChevronDown, BookOpen, FileText, RotateCcw, CheckCircle2,
  Clock, AlertCircle, Minus, TrendingUp, X, ExternalLink,
  Eye, ChevronRight, ChevronLeft,
  ClipboardList, GraduationCap, ArrowRight,
  Calendar, Settings2,
} from "lucide-react";
import { MAROON, FONT, COLORS } from "./helpers";
import {
  getGradeColor,
  getGradeBg,
  getLetterGradeFromDisplay,
  type DisplayGradeAs,
} from "@/lib/gradeDisplay";

/* ─────────────────────────────────────────────────────────────────────────────
   PROPS
───────────────────────────────────────────────────────────────────────────── */
interface Props {
  courseId: string;
  isHead: boolean;
  isAdmin?: boolean;
  currentUserId?: string | null;
}

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

interface OwnSubmission {
  submissionId: string | null;
  status: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
  fileUrl: string | null;
  textEntry: string | null;
  websiteUrl: string | null;
  hasSubmission: boolean;
}

interface OwnGradeRow {
  id: string;
  title: string;
  points: number;
  dueDate: string | null;
  assignmentGroup: string;
  type: "assignment" | "form";
  displayGradeAs: DisplayGradeAs;
  submission: OwnSubmission | null;
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

interface FilterPreset {
  id: string;
  name: string;
  filters: ActiveFilter[];
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
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
    case "LATE": return "Late";
    case "MISSING": return "Missing";
    case "EXCUSED": return "Excused";
    default: return "None";
  }
}

function uiStatusToDb(uiStatus: SubmissionStatus): string {
  switch (uiStatus) {
    case "Late": return "LATE";
    case "Missing": return "MISSING";
    case "Excused": return "EXCUSED";
    default: return "SUBMITTED";
  }
}

function recalcStaff(
  staff: StaffRow,
  updatedAssignmentGrades: AssignmentGrade[],
  assignments: GradeColumn[],
  forms: GradeColumn[] = [],
  updatedFormGrades?: FormGrade[]
): StaffRow {
  const safeAssignments = assignments ?? [];
  const safeForms = forms ?? [];
  const safeGrades = updatedAssignmentGrades ?? [];
  const safeFormGrades = updatedFormGrades ?? staff.formGrades ?? [];

  const earnedFromAssignments = safeGrades.reduce((sum, g) => {
    const col = safeAssignments.find((a) => a.id === g.assignmentId);
    if (col?.doNotCount || col?.displayGradeAs === "Not Graded") return sum;
    return sum + (g.grade ?? 0);
  }, 0);

  const earnedFromForms = safeFormGrades.reduce((sum, g) => sum + (g.score ?? 0), 0);
  const totalEarned = earnedFromAssignments + earnedFromForms;
  const totalPossible =
    safeAssignments
      .filter((a) => !a.doNotCount && a.displayGradeAs !== "Not Graded")
      .reduce((sum, a) => sum + a.points, 0) +
    safeForms.reduce((sum, f) => sum + f.points, 0);
  const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

  return { ...staff, assignmentGrades: safeGrades, formGrades: safeFormGrades, totalEarned, totalPossible, percentage };
}

/* ─────────────────────────────────────────────────────────────────────────────
   BACK BUTTON
───────────────────────────────────────────────────────────────────────────── */
function BackButton({ to, onNavigate }: { to: FilterSection; onNavigate: (s: FilterSection) => void }) {
  return (
    <button
      onClick={() => onNavigate(to)}
      className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 w-full hover:bg-gray-50 transition-colors"
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
      tabIndex={0}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => { e.stopPropagation(); onOpenPanel(); }}
      className="w-6 h-9 flex items-center justify-center text-white text-[10px] font-black shrink-0 transition-all hover:opacity-80"
      style={{ background: MAROON }}
      title="Open grade panel"
    >
      →
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FILTER PANEL
───────────────────────────────────────────────────────────────────────────── */
function FilterPanel({
  open, onClose, assignmentGroups, staffGroups,
  activeFilters, onAddFilter, onRemoveFilter, onClearAll, onManagePresets,
}: {
  open: boolean;
  onClose: () => void;
  assignmentGroups: string[];
  staffGroups: string[];
  activeFilters: ActiveFilter[];
  onAddFilter: (filter: ActiveFilter) => void;
  onRemoveFilter: (idx: number) => void;
  onClearAll: () => void;
  onManagePresets: () => void;
}) {
  const [section, setSection] = useState<FilterSection>("root");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setTimeout(() => { setSection("root"); setStartDate(""); setEndDate(""); setDateError(""); }, 0);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const statusOptions = ["Late", "Missing", "Resubmitted", "Dropped", "Excused"];
  const submissionOptions = ["Has Ungraded Submissions", "Has Submissions", "Has No Submissions", "Has Unposted Grades"];

  const isActive = (type: ActiveFilter["type"], value: string) =>
    activeFilters.some(f => f.type === type && f.value === value);

  const toggleFilter = (type: ActiveFilter["type"], value: string) => {
    const idx = activeFilters.findIndex(f => f.type === type && f.value === value);
    if (idx >= 0) { onRemoveFilter(idx); }
    else { onAddFilter({ type, label: value, value }); }
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
        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${active ? "font-bold" : "font-medium text-gray-700 hover:bg-gray-50"}`}
        style={active ? { background: MAROON, color: "white" } : {}}>
        <span>{label ?? value}</span>
        {active && <CheckCircle2 size={13} />}
      </button>
    );
  };

  return (
    <div ref={ref}
      className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
      style={{ minWidth: 260, fontFamily: FONT }}>

      {section === "root" && (
        <div>
          <button onClick={onManagePresets}
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-200">
            <Settings2 size={13} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Create & Manage Filter Presets</span>
          </button>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-black text-gray-600 uppercase tracking-wider">Filters</p>
          </div>
          {[
            { id: "assignmentGroups" as FilterSection, label: "Assignment Groups", count: activeFilters.filter(f => f.type === "assignmentGroup").length },
            { id: "studentGroups" as FilterSection, label: "Student Groups", count: activeFilters.filter(f => f.type === "studentGroup").length },
            { id: "status" as FilterSection, label: "Status", count: activeFilters.filter(f => f.type === "status").length },
            { id: "submissions" as FilterSection, label: "Submissions", count: activeFilters.filter(f => f.type === "submissions").length },
            { id: "startEndDate" as FilterSection, label: "Start & End Date", count: activeFilters.filter(f => f.type === "dateRange").length },
          ].map(item => (
            <button key={item.id} onClick={() => setSection(item.id)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
              <span className="text-sm text-gray-700 font-medium">{item.label}</span>
              <div className="flex items-center gap-2">
                {item.count > 0 && (
                  <span className="w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                    style={{ background: MAROON }}>{item.count}</span>
                )}
                <ChevronRight size={14} className="text-gray-400" />
              </div>
            </button>
          ))}
          {activeFilters.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2">
              <button onClick={() => { onClearAll(); onClose(); }}
                className="text-xs font-semibold hover:underline" style={{ color: MAROON }}>
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {section === "assignmentGroups" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-black text-gray-700">Assignment Groups</p>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {assignmentGroups.length === 0
              ? <p className="px-4 py-3 text-xs text-gray-400 italic">No assignment groups available</p>
              : assignmentGroups.map(g => <OptionButton key={g} type="assignmentGroup" value={g} />)}
          </div>
        </div>
      )}

      {section === "studentGroups" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-black text-gray-700">Student Groups</p>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {staffGroups.length === 0
              ? <p className="px-4 py-3 text-xs text-gray-400 italic">No groups available</p>
              : staffGroups.map(g => <OptionButton key={g} type="studentGroup" value={g} />)}
          </div>
        </div>
      )}

      {section === "status" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-black text-gray-700">Status</p>
          </div>
          <div className="py-1">
            {statusOptions.map(s => <OptionButton key={s} type="status" value={s} />)}
          </div>
        </div>
      )}

      {section === "submissions" && (
        <div>
          <BackButton to="root" onNavigate={setSection} />
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-black text-gray-700">Submissions</p>
          </div>
          <div className="py-1">
            {submissionOptions.map(s => <OptionButton key={s} type="submissions" value={s} />)}
          </div>
        </div>
      )}

      {section === "startEndDate" && (
        <div style={{ minWidth: 300 }}>
          <BackButton to="root" onNavigate={setSection} />
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-black text-gray-700">Start & End Dates</p>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Date</label>
              <div className="relative">
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setDateError(""); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-400 pr-9"
                  style={{ fontFamily: FONT }} />
                <Calendar size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Date</label>
              <div className="relative">
                <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setDateError(""); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-400 pr-9"
                  style={{ fontFamily: FONT }} />
                <Calendar size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {dateError && <p className="text-[10px] text-red-500 font-semibold">{dateError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setSection("root")}
                className="flex-1 h-8 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={applyDateFilter}
                className="flex-1 h-8 rounded-lg text-xs font-black text-white transition-all hover:opacity-90"
                style={{ background: MAROON }}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FILTER PRESETS MODAL
───────────────────────────────────────────────────────────────────────────── */
function FilterPresetsModal({
  open, onClose, presets, activeFilters,
  onSavePreset, onLoadPreset, onDeletePreset,
}: {
  open: boolean;
  onClose: () => void;
  presets: FilterPreset[];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div ref={ref} className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-105 max-h-[80vh] flex flex-col"
        style={{ fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Settings2 size={15} style={{ color: MAROON }} />
            <p className="text-sm font-black text-gray-800">Filter Presets</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={13} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Save Current Filters as Preset</p>
            {activeFilters.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No active filters to save.</p>
            ) : (
              <div className="flex gap-2">
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Preset name…"
                  className="flex-1 h-9 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 outline-none"
                  style={{ fontFamily: FONT }}
                  onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                  onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
                  onKeyDown={e => { if (e.key === "Enter" && newName.trim()) { onSavePreset(newName.trim()); setNewName(""); } }} />
                <button onClick={() => { if (newName.trim()) { onSavePreset(newName.trim()); setNewName(""); } }}
                  disabled={!newName.trim()}
                  className="h-9 px-4 rounded-lg text-xs font-black text-white disabled:opacity-40"
                  style={{ background: MAROON }}>Save</button>
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Saved Presets</p>
            {presets.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No presets saved yet.</p>
            ) : (
              <div className="space-y-2">
                {presets.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.filters.length} filter{p.filters.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => { onLoadPreset(p); onClose(); }}
                        className="h-7 px-2.5 rounded-lg text-[10px] font-black text-white"
                        style={{ background: MAROON }}>Apply</button>
                      <button onClick={() => onDeletePreset(p.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
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
   FILTER CHIP
───────────────────────────────────────────────────────────────────────────── */
function FilterChip({ filter, onRemove, onChangeStatus, statusOptions }: {
  filter: ActiveFilter;
  onRemove: () => void;
  onChangeStatus?: (value: string) => void;
  statusOptions?: string[];
}) {
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
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-semibold transition-all"
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
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 border-b border-gray-100">
            <X size={11} /> Remove Filter
          </button>
          {statusOptions.map(s => (
            <button key={s} onClick={() => { onChangeStatus!(s); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
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
   GRADE PANEL
───────────────────────────────────────────────────────────────────────────── */
function GradePanel({
  panel, onClose, onSave, onOpenSpeedgrader,
}: {
  panel: GradePanelData;
  onClose: () => void;
  onSave: (grade: number | null, feedback: string, status: string, daysLate: number | null) => Promise<void>;
  onOpenSpeedgrader: (staffId: string, assignmentId: string, submissionId: string) => void;
}) {
  const dga = panel.displayGradeAs;
  const isCI = dga === "Complete/Incomplete";
  const isNG = dga === "Not Graded";
  const isPct = dga === "Percentage";

  const initCiValue = (): "complete" | "incomplete" | "ungraded" => {
    if (panel.grade.status === "EXCUSED") return "ungraded";
    if (panel.grade.grade === panel.maxPoints) return "complete";
    if (panel.grade.grade === 0) return "incomplete";
    return "ungraded";
  };

  const [pointsInput, setPointsInput] = useState(panel.grade.grade !== null ? String(panel.grade.grade) : "");
  const [pctInput, setPctInput] = useState(
    panel.grade.grade !== null && panel.maxPoints > 0
      ? String(Math.round((panel.grade.grade / panel.maxPoints) * 100)) : ""
  );
  const [ciValue, setCiValue] = useState<"complete" | "incomplete" | "ungraded">(initCiValue);
  const [statusInput, setStatusInput] = useState<SubmissionStatus>(dbStatusToUiStatus(panel.grade.status));
  const [daysLate, setDaysLate] = useState(panel.grade.daysLate != null ? String(panel.grade.daysLate) : "");
  const [feedback, setFeedback] = useState(panel.grade.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const getRawGrade = (): number | null => {
    if (isCI) {
      if (ciValue === "complete") return panel.maxPoints;
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
      if (grade < 0 || grade > panel.maxPoints) { setError(`Score must be between 0 and ${panel.maxPoints}.`); return; }
    }
    setSaving(true);
    try {
      const dbStatus = statusInput === "None" && grade !== null ? "GRADED" : uiStatusToDb(statusInput);
      await onSave(grade, feedback, dbStatus, statusInput === "Late" && daysLate !== "" ? parseInt(daysLate) : null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { setError("Failed to save. Try again."); }
    finally { setSaving(false); }
  };

  const currentGrade = getRawGrade();
  const pctValue = currentGrade !== null && panel.maxPoints > 0 ? Math.round((currentGrade / panel.maxPoints) * 100) : null;
  const gradeColor = getGradeColor(currentGrade, panel.maxPoints, dga);
  const gradeBg = getGradeBg(currentGrade, panel.maxPoints, dga);
  const letterGrade = getLetterGradeFromDisplay(currentGrade, panel.maxPoints, dga);
  const gradeLabelForHeader = isNG ? "Not Graded" : isCI ? "Grade" : isPct ? "Grade out of 100%" : `Grade out of ${panel.maxPoints}`;

  const statusColors: Record<SubmissionStatus, { bg: string; color: string; border: string }> = {
    None:    { bg: "white",   color: "#374151", border: "#e5e7eb" },
    Late:    { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    Missing: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
    Excused: { bg: "#fefce8", color: "#92400e", border: "#fde68a" },
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col overflow-hidden"
        style={{ width: 400, fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0" style={{ background: MAROON }}>
          <div className="flex items-center gap-3 min-w-0">
            {panel.staffImage
              ? <Image src={panel.staffImage} alt={panel.staffName} width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white/30" />
              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 ring-2 ring-white/30"
                  style={{ background: "#5a0d0f" }}>{getInitials(panel.staffName)}</div>}
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

        <div className="px-5 py-2.5 border-b border-gray-100 shrink-0 bg-gray-50 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 mb-0.5">
              <button className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-100">
                <ChevronLeft size={11} />
              </button>
              <p className="text-xs font-black text-gray-800 truncate flex-1 text-center">{panel.assignmentTitle}</p>
              <button className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-100">
                <ChevronRight size={11} />
              </button>
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
              style={{ borderColor: MAROON, color: MAROON, background: "#fef2f2" }}>
              <Eye size={10} /> SpeedGrader
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: MAROON }}>{gradeLabelForHeader}</p>
            {isNG && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center">
                <p className="text-xs font-semibold text-gray-400">This assignment is set to <strong>Not Graded</strong>.</p>
              </div>
            )}
            {isCI && (
              <div className="relative">
                <select value={ciValue} onChange={e => setCiValue(e.target.value as "complete" | "incomplete" | "ungraded")}
                  className="w-full h-10 border-2 rounded-xl px-3 text-sm font-bold text-gray-700 bg-white focus:outline-none appearance-none cursor-pointer"
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
                      className="w-full h-10 border-2 rounded-xl px-3 pr-9 text-sm font-bold text-gray-800 outline-none"
                      style={{ borderColor: pctInput ? MAROON : "#e5e7eb", fontFamily: FONT }}
                      onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                      onBlur={e => (e.currentTarget.style.borderColor = pctInput ? MAROON : "#e5e7eb")} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">%</span>
                  </div>
                  {pctInput !== "" && !isNaN(parseFloat(pctInput)) && (
                    <div className="h-10 px-3 rounded-xl flex flex-col items-center justify-center shrink-0 border"
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
                  className="flex-1 h-10 border-2 rounded-xl px-3 text-sm font-bold text-gray-800 outline-none"
                  style={{ borderColor: pointsInput ? MAROON : "#e5e7eb", fontFamily: FONT }}
                  onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                  onBlur={e => (e.currentTarget.style.borderColor = pointsInput ? MAROON : "#e5e7eb")} />
                <span className="text-sm font-bold text-gray-500 shrink-0">/ {panel.maxPoints}</span>
                {pointsInput !== "" && !isNaN(parseFloat(pointsInput)) && (
                  <div className="h-10 px-2.5 rounded-xl flex flex-col items-center justify-center shrink-0 border"
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
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border"
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
                            className="w-14 h-6 border border-blue-200 rounded-md px-2 text-xs font-bold text-blue-700 outline-none focus:border-blue-400 bg-white"
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
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors group w-full text-left">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                    <FileText size={12} style={{ color: MAROON }} />
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
              onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 px-5 py-3 bg-gray-50 flex items-center justify-between gap-3">
          <button onClick={onClose}
            className="h-8 px-4 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-white transition-colors">
            Cancel
          </button>
          {!isNG && (
            <button onClick={handleSave} disabled={saving}
              className="flex-1 h-8 rounded-lg text-xs font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: saved ? "#15803d" : MAROON }}>
              {saving ? <><RotateCcw size={11} className="animate-spin" /> Saving…</>
               : saved  ? <><CheckCircle2 size={11} /> Saved!</>
               : "Update Grade"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FORM RESPONSE PANEL
───────────────────────────────────────────────────────────────────────────── */
interface FetchedAnswer {
  questionId: string;
  question: string;
  type: string;
  answer: string | string[] | null;
}

function FormResponsePanel({
  panel, courseId, onClose, onSave, onViewResponses,
}: {
  panel: FormResponsePanelData;
  courseId: string;
  onClose: () => void;
  onSave: (score: number | null) => Promise<void>;
  onViewResponses: () => void;
}) {
  const [gradeInput, setGradeInput] = useState(panel.formGrade.score !== null ? String(panel.formGrade.score) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [answers, setAnswers] = useState<FetchedAnswer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  useEffect(() => {
    const submissionId = panel.formGrade.submissionId;
    if (!submissionId) return;
    setLoadingAnswers(true);
    fetch(`/api/courses/${courseId}/forms/${panel.formId}/submissions`)
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
    const parsed = trimmed === "" ? null : parseFloat(trimmed);
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

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col" style={{ width: 460, fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0" style={{ background: MAROON }}>
          <div className="flex items-center gap-3 min-w-0">
            {panel.staffImage
              ? <Image src={panel.staffImage} alt={panel.staffName} width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white/30" />
              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 ring-2 ring-white/30"
                  style={{ background: "#5a0d0f" }}>{getInitials(panel.staffName)}</div>}
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">{panel.staffName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ClipboardList size={10} className="text-white/60" />
                <p className="text-[10px] font-semibold text-white/70 truncate">{panel.formTitle}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 transition-colors">
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
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-black text-white transition-all hover:opacity-90 shrink-0"
                style={{ background: MAROON }}>
                <Eye size={11} /> View Response <ArrowRight size={11} />
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
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                <p className="text-[10px] font-black text-gray-500"><span className="text-gray-400 mr-1">Q{i + 1}.</span>{ans.question}</p>
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
                className="flex-1 h-10 border-2 rounded-xl px-3 text-base font-black outline-none transition-colors"
                style={{ borderColor: gradeInput ? MAROON : "#e5e7eb", color: gradeInput ? MAROON : "#9ca3af" }}
                onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                onBlur={e => (e.currentTarget.style.borderColor = gradeInput ? MAROON : "#e5e7eb")} />
              {pctValue !== null && !isNaN(pctValue) && (
                <div className="h-10 px-3 rounded-xl flex flex-col items-center justify-center shrink-0 border"
                  style={{ background: getScoreBg(parseFloat(gradeInput), panel.maxPoints), borderColor: getScoreColor(parseFloat(gradeInput), panel.maxPoints) + "40" }}>
                  <span className="text-sm font-black leading-none" style={{ color: getScoreColor(parseFloat(gradeInput), panel.maxPoints) }}>{pctValue}%</span>
                </div>
              )}
            </div>
            {error && <p className="text-[10px] text-red-500 mt-1 font-semibold">{error}</p>}
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 px-5 py-4 bg-gray-50 flex items-center justify-between gap-3">
          <button onClick={onClose} className="h-9 px-4 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-white transition-colors">Close</button>
          {panel.formGrade.hasSubmission && (
            <button onClick={onViewResponses}
              className="h-9 px-4 rounded-xl text-xs font-black border-2 transition-all flex items-center gap-1.5"
              style={{ borderColor: MAROON, color: MAROON, background: "white" }}>
              <Eye size={11} /> Full Page
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-9 rounded-xl text-xs font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: saved ? "#15803d" : MAROON }}>
            {saving ? <><RotateCcw size={12} className="animate-spin" /> Saving…</> : saved ? <><CheckCircle2 size={12} /> Saved!</> : "Save Score"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   INLINE CELL DISPLAY
───────────────────────────────────────────────────────────────────────────── */
function CellDisplay({
  col, score, status, hasSubmission, isSaving,
}: {
  col: GradeColumn;
  score: number | null;
  status: string | null;
  hasSubmission: boolean;
  isSaving: boolean;
}) {
  const dga = col.displayGradeAs ?? "Points";
  const isNG = dga === "Not Graded";
  const isCI = dga === "Complete/Incomplete";
  const isPct = dga === "Percentage";

  if (isSaving) return <RotateCcw size={10} className="animate-spin text-gray-400" />;
  if (isNG) return <span className="text-xs text-gray-400">-</span>;
  if (status === "EXCUSED") return <span className="text-xs font-bold text-amber-600">EX</span>;
  if (status === "MISSING") return <AlertCircle size={14} className="text-red-400" />;

  if (isCI) {
    if (score === col.points) return <span className="text-base font-bold text-green-600">✓</span>;
    if (score === 0) return <span className="text-base font-bold text-red-500">✗</span>;
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
function CellEditor({
  col, score, onSave, onOpenPanel, onDismiss,
}: {
  col: GradeColumn;
  score: number | null;
  onSave: (grade: number | null) => Promise<void>;
  onOpenPanel: () => void;
  onDismiss: () => void;
}) {
  const dga = col.displayGradeAs ?? "Points";
  const isCI = dga === "Complete/Incomplete";
  const isPct = dga === "Percentage";
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef(false);

  const [ciVal, setCiVal] = useState<string>(
    score === col.points ? "complete" : score === 0 ? "incomplete" : ""
  );

  const doSave = async (grade: number | null) => {
    if (savedRef.current) return;
    savedRef.current = true;
    await onSave(grade);
    onDismiss();
  };

  const handleContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) return;
    if (isCI) {
      doSave(ciVal === "complete" ? col.points : ciVal === "incomplete" ? 0 : null);
      return;
    }
    const val = inputRef.current?.value.trim() ?? "";
    if (isPct) {
      const pct = parseFloat(val);
      doSave(!val || isNaN(pct) ? null : Math.round((pct / 100) * col.points * 10) / 10);
    } else {
      const v = parseFloat(val);
      doSave(!val || isNaN(v) ? null : v);
    }
  };

  if (isCI) {
    return (
      <div ref={containerRef} tabIndex={-1} onBlur={handleContainerBlur}
        className="flex items-stretch w-full h-full border-2 rounded outline-none"
        style={{ borderColor: "#2563eb" }}>
        <select autoFocus value={ciVal} onChange={e => setCiVal(e.target.value)}
          className="flex-1 h-9 text-xs font-bold bg-white outline-none px-1 cursor-pointer"
          onKeyDown={e => { if (e.key === "Escape") { savedRef.current = true; onDismiss(); } }}>
          <option value="" disabled>Select…</option>
          <option value="complete">✓ Complete</option>
          <option value="incomplete">✗ Incomplete</option>
          <option value="ungraded">— Ungraded</option>
        </select>
        <ArrowBtn onOpenPanel={onOpenPanel} />
      </div>
    );
  }

  if (isPct) {
    const initPct = score !== null && col.points > 0 ? String(Math.round((score / col.points) * 100)) : "";
    return (
      <div ref={containerRef} tabIndex={-1} onBlur={handleContainerBlur}
        className="flex items-stretch w-full h-full border-2 rounded outline-none"
        style={{ borderColor: "#2563eb" }}>
        <input ref={inputRef} autoFocus type="number" min={0} max={100} step={1} defaultValue={initPct}
          className="flex-1 h-9 text-sm font-semibold text-center bg-white outline-none w-0"
          onKeyDown={e => {
            if (e.key === "Enter") {
              const val = inputRef.current?.value.trim() ?? "";
              const pct = parseFloat(val);
              doSave(!val || isNaN(pct) ? null : Math.round((pct / 100) * col.points * 10) / 10);
            }
            if (e.key === "Escape") { savedRef.current = true; onDismiss(); }
          }} />
        <span className="text-[10px] font-bold text-gray-400 self-center px-1">%</span>
        <ArrowBtn onOpenPanel={onOpenPanel} />
      </div>
    );
  }

  return (
    <div ref={containerRef} tabIndex={-1} onBlur={handleContainerBlur}
      className="flex items-stretch w-full h-full border-2 rounded outline-none"
      style={{ borderColor: "#2563eb" }}>
      <input ref={inputRef} autoFocus type="number" min={0} max={col.points} step={0.5} defaultValue={score ?? ""}
        className="flex-1 h-9 text-sm font-semibold text-center bg-white outline-none w-0"
        onKeyDown={e => {
          if (e.key === "Enter") {
            const val = inputRef.current?.value.trim() ?? "";
            const v = parseFloat(val);
            doSave(!val || isNaN(v) ? null : v);
          }
          if (e.key === "Escape") { savedRef.current = true; onDismiss(); }
        }} />
      <span className="text-[10px] font-bold text-gray-400 self-center pr-1 shrink-0">/{col.points}</span>
      <ArrowBtn onOpenPanel={onOpenPanel} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MY GRADES VIEW — matches admin Gradebook UI style
───────────────────────────────────────────────────────────────────────────── */
function MyGradesView({ courseId }: { courseId: string }) {
  const [rows, setRows] = useState<OwnGradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetch(`/api/courses/${courseId}/grades`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setRows([...(json.assignments ?? []), ...(json.forms ?? [])]);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));
  const groups: string[] = Array.from(new Set(rows.map(r => r.assignmentGroup).filter(Boolean)));
  const visibleGroups = groups.filter(g =>
    rows.some(r => r.assignmentGroup === g && r.displayGradeAs !== "Not Graded" && r.points > 0)
  );
  const countable = rows.filter(r => r.displayGradeAs !== "Not Graded");
  const totalEarned = countable.reduce((sum, r) => sum + (r.submission?.grade ?? 0), 0);
  const totalPossible = countable.reduce((sum, r) => sum + r.points, 0);
  const totalPct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;

  const COL_W = 120;
  const NAME_W = 200;
  const TOTAL_W = 120;

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400" style={{ fontFamily: FONT }}>
      <RotateCcw size={16} className="animate-spin" />
      <span className="text-sm font-semibold">Loading your grades…</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400" style={{ fontFamily: FONT }}>
      <AlertCircle size={24} className="opacity-40" />
      <p className="text-sm font-semibold">Failed to load grades.</p>
      <button onClick={load} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: MAROON }}>Retry</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>

      {/* HEADER — same as admin Gradebook */}
      <div className="border-b border-gray-200 px-5 py-2.5 flex items-center justify-between shrink-0" style={{ background: MAROON }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <GraduationCap size={15} className="text-white" />
            <span className="text-sm font-black text-white">My Grades</span>
          </div>
          <span className="text-white/30">|</span>
          <span className="text-xs text-white/70 font-medium">
            {rows.length} item{rows.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button onClick={load}
          className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
          title="Refresh">
          <RotateCcw size={12} />
        </button>
      </div>

      {/* SEARCH BAR — same layout as admin */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 shrink-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-50">
            <p className="text-[10px] font-black text-gray-600 mb-1.5 uppercase tracking-wider">Assignment Names</p>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Assignments…"
                className="w-full pl-8 pr-3 h-9 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none text-gray-700"
                style={{ fontFamily: FONT }}
                onFocus={e => (e.currentTarget.style.borderColor = "#6b7280")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
            </div>
          </div>
        </div>
      </div>

      {/* GRADEBOOK TABLE */}
      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <BookOpen size={32} className="opacity-30" />
            <p className="text-sm font-semibold">No assignments assigned to you yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <BookOpen size={32} className="opacity-30" />
            <p className="text-sm font-semibold">No results for &quot;{search}&quot;</p>
          </div>
        ) : (
          <table className="border-collapse" style={{ width: NAME_W + filtered.length * COL_W + (visibleGroups.length * TOTAL_W) + TOTAL_W }}>
            <thead>
              <tr>
                {/* Name header */}
                <th className="sticky left-0 z-20 bg-white border-b-2 border-r border-gray-200 text-left px-4 py-3"
                  style={{ width: NAME_W, minWidth: NAME_W, borderBottomColor: "#d1d5db" }}>
                  <span className="text-xs font-bold text-gray-700">Assignment</span>
                </th>

                {/* Column headers */}
                {filtered.map(row => {
                  const dga = row.displayGradeAs ?? "Points";
                  const isNG = dga === "Not Graded";
                  return (
                    <th key={row.id}
                      className="border-b-2 border-r border-gray-200 px-2 py-0 align-bottom text-center"
                      style={{ width: COL_W, minWidth: COL_W, borderBottomColor: "#d1d5db", background: "white" }}>
                      <div className="flex flex-col items-center justify-end pb-2 pt-2 gap-0.5">
                        <div className="flex items-center gap-1 mb-0.5">
                          {row.type === "form"
                            ? <ClipboardList size={9} className="text-gray-400" />
                            : <BookOpen size={9} className="text-gray-400" />}
                          <span className="text-[10px] font-semibold text-gray-600 truncate max-w-22" title={row.title}>
                            {row.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-normal">points</span>
                        <span className="text-[10px] font-bold text-gray-600">
                          {isNG ? "UNGRADED" : `Out of ${row.points}`}
                        </span>
                      </div>
                    </th>
                  );
                })}

                {/* Group subtotal headers */}
                {visibleGroups.map(group => (
                  <th key={`gh-${group}`}
                    className="border-b-2 border-r border-l border-gray-200 px-2 py-0 text-center align-bottom"
                    style={{ width: TOTAL_W, minWidth: TOTAL_W, borderBottomColor: "#d1d5db", background: "#f9fafb" }}>
                    <div className="pb-2 pt-2">
                      <p className="text-[10px] font-black text-gray-500 truncate max-w-25 mx-auto" title={group}>{group}</p>
                      <p className="text-[10px] text-gray-400 font-normal">UNGRADED AS 0</p>
                    </div>
                  </th>
                ))}

                {/* Total header */}
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
              <tr className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors group">

                {/* "My Grades" name cell */}
                <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/30 border-r border-gray-200 px-4 py-2.5 transition-colors"
                  style={{ width: NAME_W }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0"
                      style={{ background: MAROON }}>Me</div>
                    <p className="text-xs font-bold truncate" style={{ color: "#0770A3" }}>My Grades</p>
                  </div>
                </td>

                {/* Score cells */}
                {filtered.map(row => {
                  const sub = row.submission;
                  const dga = row.displayGradeAs ?? "Points";
                  const isNG = dga === "Not Graded";
                  const grade = sub?.grade ?? null;
                  const scoreColor = getScoreColor(grade, row.points);
                  const scoreBg = getScoreBg(grade, row.points);

                  return (
                    <td key={row.id}
                      className="border-r border-gray-200 px-0 py-0 text-center"
                      style={{ width: COL_W, minWidth: COL_W }}>
                      <div className="flex items-center justify-center h-9 px-1">
                        {isNG ? (
                          <span className="text-xs text-gray-400">-</span>
                        ) : sub?.status === "EXCUSED" ? (
                          <span className="text-xs font-bold text-amber-600">EX</span>
                        ) : sub?.status === "MISSING" ? (
                          <AlertCircle size={14} className="text-red-400" />
                        ) : grade !== null ? (
                          <span className="text-sm font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: scoreBg, color: scoreColor }}>
                            {grade} / {row.points}
                          </span>
                        ) : sub?.hasSubmission ? (
                          <span className="text-[10px] font-bold text-blue-600">Submitted</span>
                        ) : (
                          <span className="text-xs text-gray-300">— / {row.points}</span>
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* Group subtotals */}
                {visibleGroups.map(group => {
                  const groupRows = rows.filter(r =>
                    r.assignmentGroup === group && r.displayGradeAs !== "Not Graded"
                  );
                  const gEarned = groupRows.reduce((sum, r) => sum + (r.submission?.grade ?? 0), 0);
                  const gPossible = groupRows.reduce((sum, r) => sum + r.points, 0);
                  const gPct = gPossible > 0 ? Math.round((gEarned / gPossible) * 100) : null;
                  return (
                    <td key={`gs-${group}`}
                      className="border-r border-l border-gray-200 px-4 py-2.5 text-center"
                      style={{ width: TOTAL_W, background: "#f9fafb" }}>
                      {gPct !== null
                        ? <span className="text-sm font-semibold text-gray-700">{gPct}%</span>
                        : <span className="text-sm text-gray-400">—</span>}
                    </td>
                  );
                })}

                {/* Total */}
                <td className="sticky right-0 z-10 bg-white group-hover:bg-blue-50/30 border-l border-gray-200 px-4 py-2.5 text-center transition-colors"
                  style={{ width: TOTAL_W }}>
                  {totalPct !== null
                    ? <span className="text-sm font-semibold text-gray-700">{totalPct}%</span>
                    : <span className="text-sm text-gray-400">—</span>}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* STATUS BAR */}
      <div className="border-t border-gray-200 px-5 py-2 flex items-center gap-4 shrink-0 bg-gray-50">
        <div className="flex items-center gap-1">
          <BookOpen size={9} className="text-gray-400" />
          <span className="text-[10px] text-gray-400">Assignment</span>
        </div>
        <div className="flex items-center gap-1">
          <ClipboardList size={9} className="text-gray-400" />
          <span className="text-[10px] text-gray-400">Form</span>
        </div>
        {totalPct !== null && (
          <span className="ml-auto text-xs font-semibold text-gray-500">
            Total: {totalEarned.toFixed(1)} / {totalPossible} pts ({totalPct}%)
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MANAGE GRADES VIEW
───────────────────────────────────────────────────────────────────────────── */
function ManageGradesView({ courseId }: { courseId: string }) {
  const [data, setData] = useState<GradesData>(EMPTY_GRADES_DATA);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffSearch, setStaffSearch] = useState("");
  const [assignSearch, setAssignSearch] = useState("");
  const [activeCell, setActiveCell] = useState<{ staffId: string; colId: string } | null>(null);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [gradePanel, setGradePanel] = useState<GradePanelData | null>(null);
  const [formResponsePanel, setFormResponsePanel] = useState<FormResponsePanelData | null>(null);

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const filterBtnRef = useRef<HTMLDivElement>(null);

  const fetchGrades = useCallback(async () => {
    setLoading(true); setLoadError(false);
    setActiveCell(null); setGradePanel(null); setFormResponsePanel(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/grades/managed`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData({
        staff: Array.isArray(json.staff) ? json.staff : [],
        assignments: Array.isArray(json.assignments) ? json.assignments : [],
        forms: Array.isArray(json.forms) ? json.forms : [],
      });
    } catch { setLoadError(true); setData(EMPTY_GRADES_DATA); }
    finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const navigateToSpeedgrader = useCallback((staffId: string, assignmentId: string, submissionId: string) => {
    window.open(`/courses/${courseId}/assignments/${assignmentId}/speedgrader?submissionId=${submissionId}&staffId=${staffId}`, "_blank");
  }, [courseId]);

  const saveGrade = async (
    staffId: string, assignmentId: string,
    grade: number | null, feedback?: string,
    status?: string, daysLate?: number | null
  ) => {
    const key = `${staffId}_${assignmentId}`;
    setSavingCells(p => new Set(p).add(key));
    try {
      const res = await fetch(`/api/courses/${courseId}/grades/managed`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, assignmentId, grade, feedback, status, daysLate }),
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
          ...p,
          grade: { ...p.grade, grade, feedback: feedback ?? p.grade.feedback, status: resolvedStatus, daysLate: daysLate ?? p.grade.daysLate }
        } : p);
      }
    } finally { setSavingCells(p => { const n = new Set(p); n.delete(key); return n; }); }
  };

  const saveFormScore = async (staffId: string, formId: string, score: number | null) => {
    const key = `${staffId}_${formId}`;
    setSavingCells(p => new Set(p).add(key));
    try {
      const res = await fetch(`/api/courses/${courseId}/grades/managed`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, formId, score }),
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
        <button onClick={fetchGrades} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: MAROON }}>Retry</button>
      </div>
    </div>
  );

  const allColumns: GradeColumn[] = [...(data.assignments ?? []), ...(data.forms ?? [])];
  const assignmentGroups: string[] = Array.from(new Set(allColumns.map(c => c.assignmentGroup).filter(Boolean)));
  const staffGroups: string[] = Array.from(new Set((data.staff ?? []).flatMap(s => s.position ? [s.position] : [])));

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
        const end = f.endDate ? new Date(f.endDate + "T23:59:59") : null;
        const hasMatchingSubmission = (s.assignmentGrades ?? []).some(g => {
          if (!g.submittedAt) return false;
          const d = new Date(g.submittedAt);
          if (start && d < start) return false;
          if (end && d > end) return false;
          return true;
        }) || (s.formGrades ?? []).some(g => {
          if (!g.submittedAt) return false;
          const d = new Date(g.submittedAt);
          if (start && d < start) return false;
          if (end && d > end) return false;
          return true;
        });
        if (!hasMatchingSubmission) return false;
      }
    }
    return true;
  });

  const activeGroupFilters = activeFilters.filter(f => f.type === "assignmentGroup").map(f => f.value);
  const visibleGroups = (activeGroupFilters.length > 0
    ? assignmentGroups.filter(g => activeGroupFilters.includes(g))
    : assignmentGroups
  ).filter(group =>
    allColumns.some(c =>
      c.assignmentGroup === group && !c.doNotCount && c.displayGradeAs !== "Not Graded" && c.points > 0
    )
  );

  const filteredColumns = allColumns.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(assignSearch.toLowerCase());
    if (!matchSearch) return false;
    if (activeGroupFilters.length > 0 && !activeGroupFilters.includes(c.assignmentGroup)) return false;
    return true;
  });

  const totalPending = (data.staff ?? []).reduce((sum, s) =>
    sum + (s.assignmentGrades ?? []).filter(g => g.hasSubmission && g.status !== "GRADED").length, 0);

  const COL_W = 120;
  const STAFF_W = 240;
  const TOTAL_W = 120;

  const addFilter = (f: ActiveFilter) => setActiveFilters(p => [...p, f]);
  const removeFilter = (idx: number) => setActiveFilters(p => p.filter((_, i) => i !== idx));
  const clearAllFilters = () => setActiveFilters([]);
  const changeFilterStatus = (idx: number, value: string) =>
    setActiveFilters(p => p.map((f, i) => i === idx ? { ...f, label: value, value } : f));
  const savePreset = (name: string) => {
    setFilterPresets(p => [...p, { id: Date.now().toString(), name, filters: [...activeFilters] }]);
  };
  const loadPreset = (preset: FilterPreset) => setActiveFilters([...preset.filters]);
  const deletePreset = (id: string) => setFilterPresets(p => p.filter(pr => pr.id !== id));

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>

      {/* TOP HEADER */}
      <div className="border-b border-gray-200 px-5 py-2.5 flex items-center justify-between shrink-0" style={{ background: MAROON }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <GraduationCap size={15} className="text-white" />
            <span className="text-sm font-black text-white">Gradebook</span>
            <ChevronDown size={13} className="text-white/60" />
          </div>
          <span className="text-white/30">|</span>
          <span className="text-xs text-white/70 font-medium">
            {filteredStaff.length} staff member{filteredStaff.length !== 1 ? "s" : ""}
          </span>
          {totalPending > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black text-white bg-white/20">
              <Clock size={9} />{totalPending} need{totalPending === 1 ? "s" : ""} grading
            </span>
          )}
        </div>
        <button onClick={fetchGrades}
          className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
          title="Refresh">
          <RotateCcw size={12} />
        </button>
      </div>

      {/* SEARCH + FILTER BAR */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 shrink-0">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-50">
            <p className="text-[10px] font-black text-gray-600 mb-1.5 uppercase tracking-wider">Staff Names</p>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder="Search Staff…"
                className="w-full pl-8 pr-3 h-9 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none text-gray-700"
                style={{ fontFamily: FONT }}
                onFocus={e => (e.currentTarget.style.borderColor = "#6b7280")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
            </div>
          </div>
          <div className="flex-1 min-w-50">
            <p className="text-[10px] font-black text-gray-600 mb-1.5 uppercase tracking-wider">Assignment Names</p>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={assignSearch} onChange={e => setAssignSearch(e.target.value)} placeholder="Search Assignments…"
                className="w-full pl-8 pr-3 h-9 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none text-gray-700"
                style={{ fontFamily: FONT }}
                onFocus={e => (e.currentTarget.style.borderColor = "#6b7280")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div ref={filterBtnRef} className="relative">
            <button onClick={() => setFilterPanelOpen(o => !o)}
              className="flex items-center gap-2 h-8 px-3 rounded-lg border text-sm font-semibold transition-colors bg-white"
              style={{
                fontFamily: FONT,
                borderColor: activeFilters.length > 0 ? MAROON : "#d1d5db",
                color: activeFilters.length > 0 ? MAROON : "#374151",
              }}>
              <Filter size={13} className={activeFilters.length > 0 ? "" : "text-gray-500"}
                style={activeFilters.length > 0 ? { color: MAROON } : {}} />
              Apply Filters
              {activeFilters.length > 0 && (
                <span className="w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                  style={{ background: MAROON }}>{activeFilters.length}</span>
              )}
            </button>
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
            />
          </div>

          {activeFilters.map((f, idx) => (
            <FilterChip
              key={idx}
              filter={f}
              onRemove={() => removeFilter(idx)}
              onChangeStatus={f.type === "status" ? (val) => changeFilterStatus(idx, val) : undefined}
              statusOptions={f.type === "status" ? ["Late", "Missing", "Resubmitted", "Dropped", "Excused"] : undefined}
            />
          ))}

          {activeFilters.length > 0 && (
            <button onClick={clearAllFilters}
              className="ml-auto text-xs font-semibold hover:underline transition-colors"
              style={{ color: MAROON }}>
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* GRADEBOOK TABLE */}
      <div className="flex-1 overflow-auto">
        {filteredStaff.length === 0 || filteredColumns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <BookOpen size={32} className="opacity-30" />
            <p className="text-sm font-semibold">
              {filteredStaff.length === 0 ? "No staff members found." : "No assignments found."}
            </p>
            {activeFilters.length > 0 && (
              <button onClick={clearAllFilters}
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                style={{ background: MAROON }}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <table className="border-collapse" style={{ width: STAFF_W + filteredColumns.length * COL_W + (visibleGroups.length * TOTAL_W) + TOTAL_W }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-white border-b-2 border-r border-gray-200 text-left px-4 py-3"
                  style={{ width: STAFF_W, minWidth: STAFF_W, borderBottomColor: "#d1d5db" }}>
                  <span className="text-xs font-bold text-gray-700">Staff Name</span>
                </th>

                {filteredColumns.map(col => {
                  const dga = col.displayGradeAs ?? "Points";
                  const isNG = dga === "Not Graded";
                  const isCI = dga === "Complete/Incomplete";
                  const isPct = dga === "Percentage";
                  const subLabel = isNG ? "not graded" : isPct ? "percentage" : isCI ? "complete or incomplete" : "points";
                  const outOfLabel = isNG ? "UNGRADED" : `Out of ${col.points}`;
                  const needsGrading = col.type === "assignment"
                    ? (data.staff ?? []).filter(s => {
                        const g = (s.assignmentGrades ?? []).find(g => g.assignmentId === col.id);
                        return g?.hasSubmission && g.status !== "GRADED";
                      }).length : 0;

                  return (
                    <th key={col.id}
                      className="border-b-2 border-r border-gray-200 px-2 py-0 align-bottom text-center"
                      style={{ width: COL_W, minWidth: COL_W, borderBottomColor: "#d1d5db", background: "white" }}>
                      <div className="flex flex-col items-center justify-end pb-2 pt-2 gap-0.5">
                        <div className="flex items-center gap-1 mb-0.5">
                          {col.type === "form"
                            ? <ClipboardList size={9} className="text-gray-400" />
                            : <BookOpen size={9} className="text-gray-400" />}
                          <span className="text-[10px] font-semibold text-gray-600 truncate max-w-22" title={col.title}>
                            {col.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-normal">{subLabel}</span>
                        <span className="text-[10px] font-bold text-gray-600">{outOfLabel}</span>
                        {needsGrading > 0 && (
                          <span className="text-[8px] font-black px-1 py-0.5 rounded-full text-white mt-0.5"
                            style={{ background: "#b45309" }}>
                            {needsGrading} pending
                          </span>
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
                        ? <Image src={staff.image} alt={staff.name} width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0" />
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
                    const dga = col.displayGradeAs ?? "Points";
                    const isNG = dga === "Not Graded";
                    const score: number | null = col.type === "form"
                      ? (staff.formGrades?.find(g => g.formId === col.id)?.score ?? null)
                      : (staff.assignmentGrades?.find(g => g.assignmentId === col.id)?.grade ?? null);
                    const gradeEntry = col.type === "assignment"
                      ? staff.assignmentGrades?.find(g => g.assignmentId === col.id) : null;
                    const formEntry = col.type === "form"
                      ? staff.formGrades?.find(g => g.formId === col.id) : null;
                    const status = gradeEntry?.status ?? null;
                    const hasSubmission = gradeEntry?.hasSubmission ?? formEntry?.hasSubmission ?? false;
                    const cellKey = `${staff.id}_${col.id}`;
                    const isActive = activeCell?.staffId === staff.id && activeCell?.colId === col.id;
                    const isSaving = savingCells.has(cellKey);

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
                          assignmentId: col.id, assignmentTitle: col.title, maxPoints: col.points, displayGradeAs: dga,
                          grade: gradeEntry,
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
                      <td key={col.id}
                        className="border-r border-gray-200 px-0 py-0 relative group/cell"
                        style={{ width: COL_W, minWidth: COL_W, background: isActive ? "#e0f2fe" : "transparent" }}>
                        {isActive ? (
                          <CellEditor
                            col={col} score={score}
                            onSave={async (grade) => { await saveGrade(staff.id, col.id, grade); }}
                            onOpenPanel={openPanel}
                            onDismiss={() => setActiveCell(null)}
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-9 cursor-pointer relative" onClick={handleCellClick}>
                            <div className="flex items-center justify-center h-9 text-xs font-semibold px-1">
                              <CellDisplay col={col} score={score} status={status} hasSubmission={hasSubmission} isSaving={isSaving} />
                            </div>
                            {!isNG && (
                              <button
                                tabIndex={-1}
                                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                                onClick={e => { e.stopPropagation(); openPanel(); }}
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
                    const groupCols = allColumns.filter(c =>
                      (c.assignmentGroup || "Ungrouped") === group && !c.doNotCount && c.displayGradeAs !== "Not Graded"
                    );
                    const groupEarned = groupCols.reduce((sum, col) => {
                      if (col.type === "form") return sum + (staff.formGrades?.find(g => g.formId === col.id)?.score ?? 0);
                      return sum + (staff.assignmentGrades?.find(g => g.assignmentId === col.id)?.grade ?? 0);
                    }, 0);
                    const groupPossible = groupCols.reduce((sum, col) => sum + col.points, 0);
                    const groupPct = groupPossible > 0 ? Math.round((groupEarned / groupPossible) * 100) : null;
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
                    {staff.percentage !== null && staff.totalPossible > 0
                      ? <span className="text-sm font-semibold text-gray-700">{staff.percentage}%</span>
                      : <span className="text-sm text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* STATUS BAR */}
      <div className="border-t border-gray-200 px-5 py-2 flex items-center gap-4 shrink-0 bg-gray-50">
        <div className="flex items-center gap-1.5">
          <Eye size={10} className="text-gray-400" />
          <span className="text-[10px] font-medium text-gray-400">Click any cell to grade inline</span>
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

      <FilterPresetsModal
        open={presetsOpen}
        onClose={() => setPresetsOpen(false)}
        presets={filterPresets}
        activeFilters={activeFilters}
        onSavePreset={savePreset}
        onLoadPreset={loadPreset}
        onDeletePreset={deletePreset}
      />

      {gradePanel && (
        <GradePanel
          panel={gradePanel}
          onClose={() => setGradePanel(null)}
          onSave={async (grade, feedback, status, daysLate) => {
            await saveGrade(gradePanel.staffId, gradePanel.assignmentId, grade, feedback, status, daysLate);
          }}
          onOpenSpeedgrader={navigateToSpeedgrader}
        />
      )}

      {formResponsePanel && (
        <FormResponsePanel
          panel={formResponsePanel}
          courseId={courseId}
          onClose={() => setFormResponsePanel(null)}
          onSave={async score => { await saveFormScore(formResponsePanel.staffId, formResponsePanel.formId, score); }}
          onViewResponses={() => {
            window.open(`/courses/${courseId}/forms/${formResponsePanel.formId}/responses`, "_blank");
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */
export default function CourseGradesTab({ courseId, isHead, isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<"my-grades" | "manage">(
    isHead ? "manage" : "my-grades"
  );

  if (!isHead) {
    return (
      <div className="flex flex-col h-full" style={{ fontFamily: FONT }}>
        <MyGradesView courseId={courseId} />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex flex-col h-full" style={{ fontFamily: FONT }}>
        <ManageGradesView courseId={courseId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT }}>
      <div className="flex border-b shrink-0 px-8 pt-4" style={{ borderColor: COLORS.border }}>
        <button onClick={() => setActiveTab("my-grades")}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors"
          style={activeTab === "my-grades"
            ? { borderColor: MAROON, color: COLORS.text }
            : { borderColor: "transparent", color: COLORS.primary }}>
          <BookOpen size={14} /> My Grades
        </button>
        <button onClick={() => setActiveTab("manage")}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors"
          style={activeTab === "manage"
            ? { borderColor: MAROON, color: COLORS.text }
            : { borderColor: "transparent", color: COLORS.primary }}>
          <TrendingUp size={14} /> Manage Grades
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === "my-grades"
          ? <MyGradesView courseId={courseId} />
          : <ManageGradesView courseId={courseId} />}
      </div>
    </div>
  );
}