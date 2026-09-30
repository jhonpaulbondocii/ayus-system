"use client";

// src/components/layout/course/CourseGuidanceLogSheetTab.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  Download, Filter, X, BookOpen, PenLine, Check, AlertTriangle,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const MAROON    = "#7b1113";
const FONT      = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const PAGE_SIZE = 20;

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface LogEntry {
  id:              string;
  name:            string;
  department:      string | null;
  sex:             string | null;
  purpose:         string;
  email:           string | null;
  signatureUrl:    string | null;
  signatureMethod: string | null;
  signedAt:        string | null;
  signEmailSentAt: string | null;
  visitDate:       string;
}

interface Props {
  courseId: string;
  isHead:   boolean;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   FIELD LABEL
───────────────────────────────────────────────────────────────────────────── */
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </p>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORT MODAL
───────────────────────────────────────────────────────────────────────────── */
function ExportModal({
  courseId, programOptions, defaultDateFrom, defaultDateTo, defaultProgram, onClose,
}: {
  courseId: string; programOptions: string[];
  defaultDateFrom: string; defaultDateTo: string; defaultProgram: string;
  onClose: () => void;
}) {
  const [exportDateFrom, setExportDateFrom] = useState(defaultDateFrom);
  const [exportDateTo,   setExportDateTo]   = useState(defaultDateTo);
  const [exportProgram,  setExportProgram]  = useState(defaultProgram);
  const [exporting,      setExporting]      = useState(false);
  const [previewCount,   setPreviewCount]   = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const previewRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (previewRef.current) clearTimeout(previewRef.current);
    previewRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const params = new URLSearchParams();
        if (exportDateFrom) params.set("dateFrom", exportDateFrom);
        if (exportDateTo)   params.set("dateTo",   exportDateTo);
        if (exportProgram)  params.set("course",   exportProgram);
        const res  = await fetch(`/api/courses/${courseId}/guidance-log?${params}`);
        const data = await res.json();
        setPreviewCount((data.entries ?? []).length);
      } catch { setPreviewCount(null); }
      finally  { setPreviewLoading(false); }
    }, 400);
    return () => { if (previewRef.current) clearTimeout(previewRef.current); };
  }, [exportDateFrom, exportDateTo, exportProgram, courseId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportDateFrom) params.set("dateFrom", exportDateFrom);
      if (exportDateTo)   params.set("dateTo",   exportDateTo);
      if (exportProgram)  params.set("course",   exportProgram);
      const res = await fetch(`/api/courses/${courseId}/guidance-sheets/log-sheet?${params}`);
      if (!res.ok) { alert("Export failed. Please try again."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const suffix = exportDateFrom || exportDateTo
        ? `_${exportDateFrom || "start"}_to_${exportDateTo || "now"}`
        : "";
      a.href = url; a.download = `guidance_log_sheet${suffix}.pdf`; a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch { alert("Export failed. Please try again."); }
    finally   { setExporting(false); }
  };

  const quickRange = (fn: () => { from: string; to: string }) => {
    const { from, to } = fn();
    setExportDateFrom(from); setExportDateTo(to);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-[420px] overflow-hidden flex flex-col"
        style={{ maxHeight: "calc(92vh - 60px)", marginBottom: 60 }}
        onClick={e => e.stopPropagation()}>

        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0"
          style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Download size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Guidance</p>
              <p className="text-sm font-black text-white">Export Log Sheet PDF</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">

          {/* Program filter */}
          <div>
            <FieldLabel>Course / Program</FieldLabel>
            <div className="relative">
              <select value={exportProgram} onChange={e => setExportProgram(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-2 bg-white text-gray-700 outline-none appearance-none focus:border-[#7b1113]">
                <option value="">All Programs</option>
                {programOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Date range */}
          <div>
            <FieldLabel>Date Range</FieldLabel>
            <div className="flex items-center gap-2 mb-2">
              <input type="date" value={exportDateFrom} onChange={e => setExportDateFrom(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113] min-w-0" />
              <span className="text-xs text-gray-400 shrink-0">to</span>
              <input type="date" value={exportDateTo} onChange={e => setExportDateTo(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113] min-w-0" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: "Today",      fn: () => { const d = todayISO(); return { from: d, to: d }; } },
                { label: "Yesterday",  fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s = d.toISOString().split("T")[0]; return { from: s, to: s }; } },
                { label: "This Week",  fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate()-now.getDay()+1); return { from: mon.toISOString().split("T")[0], to: todayISO() }; } },
                { label: "This Month", fn: () => { const now = new Date(); return { from: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`, to: todayISO() }; } },
              ].map(p => (
                <button key={p.label} onClick={() => quickRange(p.fn)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview count */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
              {previewLoading
                ? <><RefreshCw size={11} className="animate-spin shrink-0" /> Checking records...</>
                : previewCount === null
                  ? "Could not load preview."
                  : (
                    <>
                      <span className="font-black text-gray-800">{previewCount}</span>
                      {" "}record{previewCount !== 1 ? "s" : ""} will be exported
                      {exportProgram ? ` · ${exportProgram}` : ""}
                      {exportDateFrom ? ` · ${fmtDate(exportDateFrom)}` : ""}
                      {exportDateTo && exportDateTo !== exportDateFrom ? ` – ${fmtDate(exportDateTo)}` : ""}
                    </>
                  )
              }
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button onClick={onClose} disabled={exporting}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleExport} disabled={exporting || previewLoading || previewCount === 0}
            className="flex-1 h-10 rounded-xl text-xs font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: MAROON }}>
            {exporting
              ? <><RefreshCw size={13} className="animate-spin" /> Exporting...</>
              : <><Download size={13} /> Export PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD ENTRY MODAL
───────────────────────────────────────────────────────────────────────────── */
function AddEntryModal({
  courseId, onClose, onSaved,
}: {
  courseId: string; onClose: () => void; onSaved: () => void;
}) {
  const [addMode,       setAddMode]       = useState<"student" | "manual">("student");
  const [addStudentNum, setAddStudentNum] = useState("");
  const [addStudent,    setAddStudent]    = useState<{ id: string; name: string; course: string | null; gender: string | null; email: string | null } | null>(null);
  const [addLookupLoad, setAddLookupLoad] = useState(false);
  const [addLookupErr,  setAddLookupErr]  = useState("");
  const [addName,       setAddName]       = useState("");
  const [addCollege,    setAddCollege]    = useState("");
  const [addDept,       setAddDept]       = useState("");
  const [addSex,        setAddSex]        = useState("");
  const [addEmail,      setAddEmail]      = useState("");
  const [addPurpose,    setAddPurpose]    = useState("Counseling");
  const [addDate,       setAddDate]       = useState(todayISO());
  const [addLoading,    setAddLoading]    = useState(false);
  const [addError,      setAddError]      = useState("");
  const [departments,   setDepartments]   = useState<string[]>([]);
  const [collegeCourses, setCollegeCourses] = useState<string[]>([]);
  const addLookupTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/admin/students/courses")
      .then(r => r.json())
      .then(d => setDepartments(d.departments ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!addCollege) { setCollegeCourses([]); setAddDept(""); return; }
    fetch(`/api/admin/students/courses?department=${encodeURIComponent(addCollege)}`)
      .then(r => r.json())
      .then(d => setCollegeCourses(d.courses ?? []))
      .catch(() => {});
  }, [addCollege]);

  const lookupStudent = async (num: string) => {
    if (!num.trim()) { setAddStudent(null); setAddLookupErr(""); return; }
    setAddLookupLoad(true); setAddLookupErr(""); setAddStudent(null);
    try {
      const res  = await fetch(`/api/courses/${courseId}/guidance-log/student-lookup?studentNumber=${encodeURIComponent(num.trim())}`);
      const data = await res.json();
      if (!res.ok) { setAddLookupErr(data.error ?? "Student not found."); return; }
      setAddStudent(data.student);
    } catch { setAddLookupErr("Network error."); }
    finally  { setAddLookupLoad(false); }
  };

  const handleStudentNumChange = (val: string) => {
    setAddStudentNum(val); setAddStudent(null); setAddLookupErr("");
    if (addLookupTimeout.current) clearTimeout(addLookupTimeout.current);
    addLookupTimeout.current = setTimeout(() => lookupStudent(val), 600);
  };

  const handleAddEntry = async () => {
    if (addMode === "manual" && !addName.trim()) { setAddError("Name is required."); return; }
    if (addMode === "manual" && !addEmail.trim()) { setAddError("Email is required for manual entries so we can send the signing link."); return; }
    setAddLoading(true); setAddError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/guidance-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          addMode === "student"
            ? { studentId: addStudent!.id, purpose: addPurpose || "Counseling", visitDate: addDate }
            : { name: addName.trim(), department: addDept.trim() || null, sex: addSex || null, email: addEmail.trim() || null, purpose: addPurpose || "Counseling", visitDate: addDate, isManual: true }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onSaved(); onClose();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add entry.");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-[440px] overflow-hidden flex flex-col"
        style={{ maxHeight: "calc(92vh - 60px)", marginBottom: 60 }}
        onClick={e => e.stopPropagation()}>

        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0"
          style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <PenLine size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Guidance</p>
              <p className="text-sm font-black text-white">Add Log Entry</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">

          {addError && (
            <div className="text-xs text-red-500 font-semibold bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {addError}
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button type="button"
              onClick={() => { setAddMode("student"); setAddStudent(null); setAddStudentNum(""); setAddLookupErr(""); setAddError(""); }}
              className="flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all"
              style={addMode === "student"
                ? { borderColor: MAROON, background: "#fef2f2", color: MAROON }
                : { borderColor: "#e5e7eb", color: "#6b7280" }}>
              Registered Student
            </button>
            <button type="button"
              onClick={() => { setAddMode("manual"); setAddError(""); }}
              className="flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all"
              style={addMode === "manual"
                ? { borderColor: MAROON, background: "#fef2f2", color: MAROON }
                : { borderColor: "#e5e7eb", color: "#6b7280" }}>
              Manual Entry
            </button>
          </div>

          {/* Student lookup */}
          {addMode === "student" && (
            <div>
              <FieldLabel required>Student Number</FieldLabel>
              <div className="relative mb-1">
                <input value={addStudentNum} onChange={e => handleStudentNumChange(e.target.value)}
                  placeholder="Enter student number..."
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 outline-none focus:border-[#7b1113] bg-white pr-8" />
                {addLookupLoad && (
                  <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                )}
              </div>
              {addLookupErr && <p className="text-[11px] text-red-500 mt-1">{addLookupErr}</p>}
              {addStudent && (
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 flex-wrap" style={{ background: "#fef2f2" }}>
                    <Check size={11} style={{ color: MAROON }} />
                    <span className="text-xs font-semibold" style={{ color: MAROON }}>Student Found</span>
                    {!addStudent.email && (
                      <span className="text-[10px] font-semibold text-amber-600 ml-auto flex items-center gap-1">
                        <AlertTriangle size={10} /> No email — signing link won&apos;t be sent
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-3 grid grid-cols-2 gap-x-4 gap-y-2 bg-white">
                    {([["Name", addStudent.name], ["Course", addStudent.course ?? "—"], ["Sex", addStudent.gender ?? "—"], ["Email", addStudent.email ?? "—"]] as [string,string][]).map(([label, val]) => (
                      <div key={label}>
                        <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                        <p className="text-xs font-medium text-gray-800 leading-snug break-words">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual fields */}
          {addMode === "manual" && (
            <>
              <div>
                <FieldLabel required>Complete Name</FieldLabel>
                <input value={addName} onChange={e => setAddName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 outline-none focus:border-[#7b1113] bg-white" />
              </div>
              <div>
                <FieldLabel required>Email</FieldLabel>
                <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
                  placeholder="student@psu.edu.ph"
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 outline-none focus:border-[#7b1113] bg-white" />
                <p className="text-[10px] text-gray-400 mt-1">Signing link will be sent here.</p>
              </div>
              <div>
                <FieldLabel>College / Department</FieldLabel>
                <div className="relative">
                  <select value={addCollege} onChange={e => { setAddCollege(e.target.value); setAddDept(""); }}
                    className="w-full text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-2 bg-white text-gray-700 outline-none appearance-none focus:border-[#7b1113]">
                    <option value="">Select college...</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Course / Program</FieldLabel>
                  <div className="relative">
                    <select value={addDept} onChange={e => setAddDept(e.target.value)}
                      disabled={!addCollege}
                      className="w-full text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-2 bg-white text-gray-700 outline-none appearance-none focus:border-[#7b1113] disabled:opacity-50">
                      <option value="">{addCollege ? "Select..." : "Select college first"}</option>
                      {collegeCourses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <FieldLabel>Sex</FieldLabel>
                  <div className="relative">
                    <select value={addSex} onChange={e => setAddSex(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-2 bg-white text-gray-700 outline-none appearance-none focus:border-[#7b1113]">
                      <option value="">—</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Purpose + Date (shared) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Purpose</FieldLabel>
              <input value={addPurpose} onChange={e => setAddPurpose(e.target.value)}
                placeholder="Counseling"
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 outline-none focus:border-[#7b1113] bg-white" />
            </div>
            <div>
              <FieldLabel>Date</FieldLabel>
              <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 outline-none focus:border-[#7b1113] bg-white" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button onClick={onClose} disabled={addLoading}
            className="flex-1 h-11 sm:h-10 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleAddEntry}
            disabled={addLoading || (addMode === "student" ? !addStudent : !addName.trim())}
            className="flex-1 h-11 sm:h-10 rounded-xl text-xs font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: MAROON }}>
            {addLoading
              ? <><RefreshCw size={13} className="animate-spin" /> Saving...</>
              : <><Check size={13} /> Save Entry</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────────────────────────── */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-3 flex items-center gap-2.5">
      <div className="rounded-lg p-1.5 sm:p-2 shrink-0" style={{ background: "#f3f4f6" }}>
        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: MAROON }} />
      </div>
      <div>
        <p className="text-lg sm:text-xl font-black tabular-nums leading-none text-gray-900">{value}</p>
        <p className="text-[10px] sm:text-xs font-semibold mt-0.5 text-gray-500 leading-tight">{label}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN TAB
───────────────────────────────────────────────────────────────────────────── */
export default function CourseGuidanceLogSheetTab({ courseId, isHead }: Props) {
  const [entries,       setEntries]       = useState<LogEntry[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [search,        setSearch]        = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [showFilters,   setShowFilters]   = useState(false);
  const [showExport,    setShowExport]    = useState(false);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [dateFrom,      setDateFrom]      = useState(todayISO());
  const [dateTo,        setDateTo]        = useState(todayISO());
  const [page,          setPage]          = useState(1);

  const fetchEntries = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search)        params.set("search",   search);
      if (dateFrom)      params.set("dateFrom", dateFrom);
      if (dateTo)        params.set("dateTo",   dateTo);
      if (programFilter) params.set("course",   programFilter);
      const res  = await fetch(`/api/courses/${courseId}/guidance-log?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setEntries(data.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally { setLoading(false); }
  }, [courseId, search, dateFrom, dateTo, programFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { setPage(1); }, [search, programFilter, dateFrom, dateTo]);

  const handleDelete = async (entryId: string) => {
    if (!confirm("Delete this log entry?")) return;
    await fetch(`/api/courses/${courseId}/guidance-log?entryId=${entryId}`, { method: "DELETE" });
    fetchEntries();
  };

  const programOptions = [...new Set(entries.map(e => e.department).filter(Boolean))] as string[];
  const hasActiveFilter = !!programFilter || dateFrom !== todayISO() || dateTo !== todayISO();
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const paginated  = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-0.5" style={{ color: MAROON }}>Guidance</p>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-none">Log Sheet</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchEntries}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 py-1.5 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-1.5 rounded-lg text-white transition-all"
            style={{ background: MAROON }}>
            <PenLine className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Entry</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard label="Total" value={entries.length} />
          <StatCard label="Signed" value={entries.filter(e => e.signatureUrl).length} />
          <StatCard label="Unsigned" value={entries.filter(e => !e.signatureUrl).length} />
        </div>

        {/* Table Card */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">

          {/* Toolbar */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 min-w-0 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..."
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button onClick={() => setShowFilters(f => !f)}
              style={(showFilters || hasActiveFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0
                ${!(showFilters || hasActiveFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400" : ""}`}>
              <Filter className="w-3 h-3" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
            </button>

            {isHead && (
              <button onClick={() => setShowExport(true)} disabled={entries.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all disabled:opacity-40 shrink-0">
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 space-y-3">
              {programOptions.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Program</span>
                  <div className="relative">
                    <select value={programFilter} onChange={e => setProgramFilter(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 outline-none appearance-none max-w-[200px]">
                      <option value="">All Programs</option>
                      {programOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block">Date Range</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none flex-1 min-w-0" />
                  <span className="text-xs text-gray-400 shrink-0">to</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none flex-1 min-w-0" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "Today",      fn: () => { const d = todayISO(); setDateFrom(d); setDateTo(d); } },
                    { label: "Yesterday",  fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s = d.toISOString().split("T")[0]; setDateFrom(s); setDateTo(s); } },
                    { label: "This Week",  fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate()-now.getDay()+1); setDateFrom(mon.toISOString().split("T")[0]); setDateTo(todayISO()); } },
                    { label: "This Month", fn: () => { const now = new Date(); setDateFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`); setDateTo(todayISO()); } },
                  ].map(p => (
                    <button key={p.label} onClick={p.fn}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilter && (
                <button onClick={() => { setProgramFilter(""); setDateFrom(todayISO()); setDateTo(todayISO()); }}
                  className="flex items-center gap-1 text-[11px] font-bold hover:underline" style={{ color: MAROON }}>
                  <X size={11} /> Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="animate-pulse divide-y divide-gray-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="h-3 w-6 bg-gray-100 rounded shrink-0" />
                  <div className="h-3 w-20 bg-gray-100 rounded shrink-0" />
                  <div className="h-3 w-32 bg-gray-100 rounded shrink-0" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-xs font-medium text-red-500 py-12">{error}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* ── Desktop Table ── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: "#fafafa" }}>
                      {["No.", "Date", "Complete Name", "Department / Course", "Sex", "Purpose", "Signature"].map((h, i) => (
                        <th key={i} className="text-left px-3 py-2.5 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{h}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-14">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                            <BookOpen className="w-6 h-6" style={{ color: MAROON }} />
                          </div>
                          <p className="text-sm text-gray-400 font-medium">
                            {hasActiveFilter || search ? "No entries match your filters." : "No entries yet."}
                          </p>
                        </div>
                      </td></tr>
                    )}
                    {paginated.map((e, i) => (
                      <tr key={e.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-3 py-2.5 text-xs text-gray-500 tabular-nums text-center w-10" style={{ border: "1px solid #d1d5db" }}>
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                          {fmtDate(e.visitDate)}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-semibold text-gray-800 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                          {e.name}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[200px]" style={{ border: "1px solid #d1d5db" }}>
                          <span className="line-clamp-1">{e.department ?? "—"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 text-center" style={{ border: "1px solid #d1d5db" }}>
                          {e.sex ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-600" style={{ border: "1px solid #d1d5db" }}>
                          {e.purpose}
                        </td>
                        <td className="px-3 py-2.5" style={{ border: "1px solid #d1d5db", minWidth: 110 }}>
                          <div className="flex items-center justify-between gap-1">
                            {e.signatureUrl
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={e.signatureUrl} alt="signature" className="h-7 max-w-[90px] object-contain" />
                              : <span className="text-[10px] font-semibold text-amber-500 flex items-center gap-1">
                                  <PenLine size={10} /> Unsigned
                                </span>
                            }
                            {isHead && (
                              <button onClick={() => handleDelete(e.id)}
                                className="text-gray-300 hover:text-red-400 transition-colors shrink-0 ml-1">
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile List ── */}
              <div className="sm:hidden divide-y divide-gray-100">
                {entries.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-14 gap-3 px-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                      <BookOpen className="w-6 h-6" style={{ color: MAROON }} />
                    </div>
                    <p className="text-sm text-gray-400 font-medium text-center">
                      {hasActiveFilter || search ? "No entries match your filters." : "No entries yet."}
                    </p>
                  </div>
                )}
                {paginated.map((e, i) => (
                  <div key={e.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold tabular-nums text-gray-300 shrink-0">
                            {(page - 1) * PAGE_SIZE + i + 1}.
                          </span>
                          <p className="text-sm font-bold text-gray-900 truncate">{e.name}</p>
                        </div>
                        {e.department && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate pl-5">{e.department}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {e.signatureUrl
                          ? <span className="text-[10px] text-green-500 font-bold flex items-center gap-0.5">
                              <Check size={10} /> Signed
                            </span>
                          : <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                              <PenLine size={10} /> Unsigned
                            </span>
                        }
                        {isHead && (
                          <button onClick={() => handleDelete(e.id)}
                            className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-400 transition-colors">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 pl-5 flex-wrap">
                      <span>{fmtDate(e.visitDate)}</span>
                      {e.sex && <><span>·</span><span>{e.sex}</span></>}
                      <span>·</span>
                      <span>{e.purpose}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && entries.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-white shrink-0 flex-wrap gap-2">
              <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, entries.length)} of {entries.length}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 disabled:opacity-25 transition-all">
                  <ChevronLeft className="w-3 h-3" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const n = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  return (
                    <button key={n} type="button" onClick={() => setPage(n)}
                      style={page === n ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-semibold transition-all border
                        ${page !== n ? "border-gray-200 text-gray-500 hover:border-gray-400" : ""}`}>
                      {n}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 disabled:opacity-25 transition-all">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showExport && (
        <ExportModal
          courseId={courseId}
          programOptions={programOptions}
          defaultDateFrom={dateFrom}
          defaultDateTo={dateTo}
          defaultProgram={programFilter}
          onClose={() => setShowExport(false)}
        />
      )}

      {showAddModal && (
        <AddEntryModal
          courseId={courseId}
          onClose={() => setShowAddModal(false)}
          onSaved={fetchEntries}
        />
      )}
    </div>
  );
}