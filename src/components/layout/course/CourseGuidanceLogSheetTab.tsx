"use client";

// src/components/layout/course/CourseGuidanceLogSheetTab.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import {
  Search, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  Download, SlidersHorizontal, X, BookOpen, PenLine, Check, AlertTriangle,
  AlertCircle, CheckCircle2, Trash2, Inbox,
} from "lucide-react";
import { FONT } from "./osaShared";

/* ════════════════════════════════════════════════════════════════════════════
   1. DESIGN TOKENS (same as CourseLibraryTab)
   ════════════════════════════════════════════════════════════════════════════ */

const C = {
  brand:      "#7b1113",
  brandDark:  "#5e0d0f",
  brandTint:  "#fdf2f2",
  brandRing:  "rgba(123,17,19,0.12)",
  ink:        "#111827",
  body:       "#374151",
  muted:      "#6b7280",
  faint:      "#9ca3af",
  line:       "#e5e7eb",
  lineSoft:   "#f3f4f6",
  surface:    "#ffffff",
  canvas:     "#ffffff",
  danger:     "#b91c1c",
} as const;

const PAGE_SIZE = 20;

/* ════════════════════════════════════════════════════════════════════════════
   2. TYPES
   ════════════════════════════════════════════════════════════════════════════ */

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

/* ════════════════════════════════════════════════════════════════════════════
   3. HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

/** Local-timezone YYYY-MM-DD (toISOString() would shift the day for PH users). */
function toLocalISODate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function todayISO() {
  return toLocalISODate(new Date());
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Shared quick date ranges (Monday-start week, local dates) */
const QUICK_RANGES: { label: string; fn: () => { from: string; to: string } }[] = [
  { label: "Today", fn: () => { const d = todayISO(); return { from: d, to: d }; } },
  { label: "Yesterday", fn: () => {
      const d = new Date(); d.setDate(d.getDate() - 1);
      const s = toLocalISODate(d); return { from: s, to: s };
  } },
  { label: "This week", fn: () => {
      const now = new Date(); const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: toLocalISODate(mon), to: toLocalISODate(now) };
  } },
  { label: "This month", fn: () => {
      const now = new Date();
      return { from: toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toLocalISODate(now) };
  } },
];

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white";
const selectCls =
  "w-full border border-gray-200 rounded-lg pl-3 pr-8 py-2.5 sm:py-2 text-sm outline-none appearance-none bg-white text-gray-700 focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all disabled:opacity-50";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

/* ════════════════════════════════════════════════════════════════════════════
   4. SMALL UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════ */

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className={labelCls}>
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function SelectChevron() {
  return <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />;
}

function SignBadge({ signed }: { signed: boolean }) {
  return signed ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={{ color: "#065f46", background: "#d1fae5" }}>
      <Check size={11} /> Signed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={{ color: "#92400e", background: "#fef3c7" }}>
      <PenLine size={11} /> Unsigned
    </span>
  );
}

function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: C.brandTint }}>
        <Inbox className="w-6 h-6" style={{ color: C.brand }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: C.ink }}>{title}</p>
      {hint && <p className="text-xs max-w-xs" style={{ color: C.muted }}>{hint}</p>}
      {action}
    </div>
  );
}

type ToastState = { msg: string; tone: "success" | "error" } | null;

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const isErr = toast.tone === "error";
  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold text-white"
      style={{
        background: isErr ? C.danger : C.ink,
        bottom: "calc(24px + env(safe-area-inset-bottom))",
        fontFamily: FONT,
      }}
    >
      {isErr ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      {toast.msg}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="bg-white border rounded-xl px-3 sm:px-4 py-3 flex items-center gap-2.5 shadow-sm" style={{ borderColor: C.line }}>
      <div className="rounded-lg w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0" style={{ background: C.brandTint, color: C.brand }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg sm:text-xl font-bold tabular-nums leading-none" style={{ color: C.ink }}>{value}</p>
        <p className="text-[11px] sm:text-xs font-medium mt-1 leading-tight truncate" style={{ color: C.muted }}>{label}</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   5. MODAL SHELL (bottom-sheet on mobile, centered on desktop)
   ════════════════════════════════════════════════════════════════════════════ */

function SheetModal({
  onClose, tone = "brand", icon, title, subtitle, children, footer,
  maxWidth = "max-w-md", zClass = "z-50", closeOnEsc = true,
}: {
  onClose: () => void;
  tone?: "brand" | "danger";
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  zClass?: string;
  closeOnEsc?: boolean;
}) {
  useEffect(() => {
    if (!closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, closeOnEsc]);

  const accent = tone === "danger" ? C.danger : C.brand;

  return (
    <div
      /* pb-[60px] on mobile keeps the sheet clear of the bottom nav */
      className={`fixed inset-0 ${zClass} flex items-end sm:items-center justify-center bg-black/40 pb-[60px] sm:pb-0`}
      style={{ backdropFilter: "blur(3px)", fontFamily: FONT }}
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} sm:mx-4 overflow-hidden flex flex-col max-h-[92vh]`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 shrink-0" style={{ background: accent, color: "#fff" }}>
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/20">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate" style={{ fontSize: 14, fontWeight: 800 }}>{title}</p>
              {subtitle && <p className="text-xs truncate text-white/70">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
        {footer && (
          <div
            className="border-t shrink-0 bg-gray-50"
            style={{ borderColor: C.line, paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({
  title, message, confirmLabel, busy, onConfirm, onClose,
}: {
  title: string; message: ReactNode; confirmLabel: string;
  busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <SheetModal
      onClose={onClose}
      tone="danger"
      icon={<Trash2 size={16} />}
      title={title}
      maxWidth="max-w-sm"
      zClass="z-[60]"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={busy}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: C.danger }}>
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 text-sm leading-relaxed" style={{ color: C.body }}>{message}</div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   6. EXPORT MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function ExportModal({
  courseId, programOptions, defaultDateFrom, defaultDateTo, defaultProgram, onClose, notify,
}: {
  courseId: string; programOptions: string[];
  defaultDateFrom: string; defaultDateTo: string; defaultProgram: string;
  onClose: () => void;
  notify: (msg: string, tone?: "success" | "error") => void;
}) {
  const [exportDateFrom, setExportDateFrom] = useState(defaultDateFrom);
  const [exportDateTo,   setExportDateTo]   = useState(defaultDateTo);
  const [exportProgram,  setExportProgram]  = useState(defaultProgram);
  const [exporting,      setExporting]      = useState(false);
  const [previewCount,   setPreviewCount]   = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const previewRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (!res.ok) { notify("Export failed. Please try again.", "error"); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const suffix = exportDateFrom || exportDateTo
        ? `_${exportDateFrom || "start"}_to_${exportDateTo || "now"}`
        : "";
      a.href = url; a.download = `guidance_log_sheet${suffix}.pdf`; a.click();
      URL.revokeObjectURL(url);
      notify("Log sheet exported");
      onClose();
    } catch { notify("Export failed. Please try again.", "error"); }
    finally   { setExporting(false); }
  };

  return (
    <SheetModal
      onClose={onClose}
      maxWidth="max-w-md"
      icon={<Download size={16} />}
      title="Export log sheet"
      subtitle="Guidance"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={exporting}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleExport} disabled={exporting || previewLoading || previewCount === 0}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: C.brand }}>
            {exporting
              ? <><RefreshCw size={13} className="animate-spin" /> Exporting…</>
              : <><Download size={13} /> Export PDF</>}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 space-y-4">
        <div>
          <Label>Course / program</Label>
          <div className="relative">
            <select value={exportProgram} onChange={e => setExportProgram(e.target.value)} className={selectCls}>
              <option value="">All programs</option>
              {programOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <SelectChevron />
          </div>
        </div>

        <div>
          <Label>Date range</Label>
          <div className="flex items-center gap-2">
            <input type="date" value={exportDateFrom} max={exportDateTo || undefined}
              onChange={e => setExportDateFrom(e.target.value)} aria-label="From date"
              className={`${inputCls} flex-1 min-w-0`} />
            <span className="text-xs text-gray-400 shrink-0">to</span>
            <input type="date" value={exportDateTo} min={exportDateFrom || undefined}
              onChange={e => setExportDateTo(e.target.value)} aria-label="To date"
              className={`${inputCls} flex-1 min-w-0`} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {QUICK_RANGES.map(p => (
              <button key={p.label} onClick={() => { const r = p.fn(); setExportDateFrom(r.from); setExportDateTo(r.to); }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border px-4 py-3 bg-gray-50" style={{ borderColor: C.line }}>
          <p className="text-xs flex items-center gap-1.5 flex-wrap" style={{ color: C.muted }}>
            {previewLoading
              ? <><RefreshCw size={11} className="animate-spin shrink-0" /> Checking records…</>
              : previewCount === null
                ? "Couldn’t load the preview."
                : (
                  <>
                    <span className="font-bold" style={{ color: C.ink }}>{previewCount}</span>
                    record{previewCount !== 1 ? "s" : ""} will be exported
                    {exportProgram ? ` · ${exportProgram}` : ""}
                    {exportDateFrom ? ` · ${fmtDate(exportDateFrom)}` : ""}
                    {exportDateTo && exportDateTo !== exportDateFrom ? ` – ${fmtDate(exportDateTo)}` : ""}
                  </>
                )}
          </p>
        </div>
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   7. ADD ENTRY MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function AddEntryModal({
  courseId, onClose, onSaved, notify,
}: {
  courseId: string; onClose: () => void; onSaved: () => void;
  notify: (msg: string, tone?: "success" | "error") => void;
}) {
  const [addMode,        setAddMode]        = useState<"student" | "manual">("student");
  const [addStudentNum,  setAddStudentNum]  = useState("");
  const [addStudent,     setAddStudent]     = useState<{ id: string; name: string; course: string | null; gender: string | null; email: string | null } | null>(null);
  const [addLookupLoad,  setAddLookupLoad]  = useState(false);
  const [addLookupErr,   setAddLookupErr]   = useState("");
  const [addName,        setAddName]        = useState("");
  const [addCollege,     setAddCollege]     = useState("");
  const [addDept,        setAddDept]        = useState("");
  const [addSex,         setAddSex]         = useState("");
  const [addEmail,       setAddEmail]       = useState("");
  const [addPurpose,     setAddPurpose]     = useState("Counseling");
  const [addDate,        setAddDate]        = useState(todayISO());
  const [addLoading,     setAddLoading]     = useState(false);
  const [addError,       setAddError]       = useState("");
  const [departments,    setDepartments]    = useState<string[]>([]);
  const [collegeCourses, setCollegeCourses] = useState<string[]>([]);
  const addLookupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (addLookupTimeout.current) clearTimeout(addLookupTimeout.current); }, []);

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
      onSaved(); notify("Entry added"); onClose();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add entry.");
    } finally {
      setAddLoading(false);
    }
  };

  const modeBtn = (active: boolean) =>
    `flex-1 py-2.5 rounded-lg border text-xs font-bold transition-colors ${active ? "" : "border-gray-200 text-gray-500 hover:border-gray-400"}`;
  const modeStyle = (active: boolean) =>
    active ? { borderColor: C.brand, background: C.brandTint, color: C.brand } : {};

  return (
    <SheetModal
      onClose={onClose}
      maxWidth="max-w-md"
      icon={<PenLine size={16} />}
      title="Add log entry"
      subtitle="Guidance"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={addLoading}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleAddEntry}
            disabled={addLoading || (addMode === "student" ? !addStudent : !addName.trim())}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: C.brand }}>
            {addLoading
              ? <><RefreshCw size={13} className="animate-spin" /> Saving…</>
              : <><Check size={13} /> Save entry</>}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 space-y-4">
        {addError && (
          <div className="flex items-start gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5" role="alert">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {addError}
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button type="button" className={modeBtn(addMode === "student")} style={modeStyle(addMode === "student")}
            onClick={() => { setAddMode("student"); setAddStudent(null); setAddStudentNum(""); setAddLookupErr(""); setAddError(""); }}>
            Registered student
          </button>
          <button type="button" className={modeBtn(addMode === "manual")} style={modeStyle(addMode === "manual")}
            onClick={() => { setAddMode("manual"); setAddError(""); }}>
            Manual entry
          </button>
        </div>

        {/* Student lookup */}
        {addMode === "student" && (
          <div>
            <Label required>Student number</Label>
            <div className="relative">
              <input value={addStudentNum} onChange={e => handleStudentNumChange(e.target.value)}
                placeholder="Enter student number…" className={`${inputCls} pr-9`} />
              {addLookupLoad && (
                <RefreshCw size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
              )}
            </div>
            {addLookupErr && <p className="text-[11px] text-red-500 font-medium mt-1.5">{addLookupErr}</p>}
            {addStudent && (
              <div className="mt-3 border rounded-xl overflow-hidden" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-2 px-3.5 py-2 flex-wrap" style={{ background: C.brandTint }}>
                  <Check size={12} style={{ color: C.brand }} />
                  <span className="text-xs font-bold" style={{ color: C.brand }}>Student found</span>
                  {!addStudent.email && (
                    <span className="text-[11px] font-semibold text-amber-600 ml-auto flex items-center gap-1">
                      <AlertTriangle size={11} /> No email — signing link won’t be sent
                    </span>
                  )}
                </div>
                <dl className="px-3.5 py-3 grid grid-cols-2 gap-x-4 gap-y-3 bg-white">
                  {([["Name", addStudent.name], ["Course", addStudent.course ?? "—"], ["Sex", addStudent.gender ?? "—"], ["Email", addStudent.email ?? "—"]] as [string, string][]).map(([label, val]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-[11px] font-medium mb-0.5" style={{ color: C.muted }}>{label}</dt>
                      <dd className="text-[13px] font-medium break-words" style={{ color: C.ink, lineHeight: 1.5 }}>{val}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}

        {/* Manual fields */}
        {addMode === "manual" && (
          <>
            <div>
              <Label required>Complete name</Label>
              <input value={addName} onChange={e => setAddName(e.target.value)}
                placeholder="e.g. Juan Dela Cruz" className={inputCls} />
            </div>
            <div>
              <Label required>Email</Label>
              <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
                placeholder="student@psu.edu.ph" className={inputCls} />
              <p className="text-[11px] mt-1" style={{ color: C.faint }}>The signing link will be sent here.</p>
            </div>
            <div>
              <Label>College / department</Label>
              <div className="relative">
                <select value={addCollege} onChange={e => { setAddCollege(e.target.value); setAddDept(""); }} className={selectCls}>
                  <option value="">Select college…</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <SelectChevron />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Course / program</Label>
                <div className="relative">
                  <select value={addDept} onChange={e => setAddDept(e.target.value)} disabled={!addCollege} className={selectCls}>
                    <option value="">{addCollege ? "Select…" : "Select college first"}</option>
                    {collegeCourses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <SelectChevron />
                </div>
              </div>
              <div>
                <Label>Sex</Label>
                <div className="relative">
                  <select value={addSex} onChange={e => setAddSex(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  <SelectChevron />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Purpose + Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Purpose</Label>
            <input value={addPurpose} onChange={e => setAddPurpose(e.target.value)}
              placeholder="Counseling" className={inputCls} />
          </div>
          <div>
            <Label>Date</Label>
            <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   8. MAIN TAB
   ════════════════════════════════════════════════════════════════════════════ */

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
  const [toast,         setToast]         = useState<ToastState>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<LogEntry | null>(null);
  const [deleting,      setDeleting]      = useState(false);

  const debouncedSearch = useDebounced(search, 300);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search",   debouncedSearch);
      if (dateFrom)        params.set("dateFrom", dateFrom);
      if (dateTo)          params.set("dateTo",   dateTo);
      if (programFilter)   params.set("course",   programFilter);
      const res  = await fetch(`/api/courses/${courseId}/guidance-log?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load entries.");
      setEntries(data.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load entries.");
    } finally { setLoading(false); }
  }, [courseId, debouncedSearch, dateFrom, dateTo, programFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { setPage(1); }, [debouncedSearch, programFilter, dateFrom, dateTo]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/guidance-log?entryId=${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { notify("Couldn’t delete the entry.", "error"); return; }
      setEntries(prev => prev.filter(e => e.id !== deleteTarget.id));
      notify("Entry deleted");
      setDeleteTarget(null);
    } catch {
      notify("Couldn’t delete the entry.", "error");
    } finally { setDeleting(false); }
  };

  /* ── Derived ── */
  const today = todayISO();
  const dateIsCustom = dateFrom !== today || dateTo !== today;
  const activeFilterCount = [programFilter, dateIsCustom].filter(Boolean).length;
  const hasAnyFilter = !!(search || activeFilterCount);

  const programOptions = [...new Set(entries.map(e => e.department).filter(Boolean))] as string[];
  const signedCount    = entries.filter(e => e.signatureUrl).length;
  const totalPages     = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const paginated      = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const clearFilters = () => { setProgramFilter(""); setDateFrom(todayISO()); setDateTo(todayISO()); };
  const resetAll     = () => { clearFilters(); setSearch(""); };

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) =>
    totalPages <= 5 || page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i,
  );

  const emptyState = !hasAnyFilter ? (
    <EmptyState
      title="No entries yet"
      hint="Add an entry to start the log sheet for today."
      action={
        <button onClick={() => setShowAddModal(true)}
          className="mt-2 flex items-center gap-1.5 text-xs font-bold px-4 h-9 rounded-lg text-white" style={{ background: C.brand }}>
          <PenLine size={13} /> Add entry
        </button>
      }
    />
  ) : (
    <EmptyState
      title="No matching entries"
      hint="Try a different search or date range."
      action={
        <button onClick={resetAll} className="mt-2 text-xs font-bold hover:underline" style={{ color: C.brand }}>
          Clear all filters
        </button>
      }
    />
  );

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: C.canvas }}>

      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between shrink-0 gap-3" style={{ borderColor: C.line }}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Log sheet</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: C.faint }}>
            Record and review guidance office visits and signatures.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchEntries} aria-label="Refresh"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 w-9 h-9 sm:w-auto sm:px-3 rounded-lg transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-9 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: C.brand }}>
            <PenLine className="w-3.5 h-3.5" />
            <span>Add<span className="hidden sm:inline"> entry</span></span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5 min-h-0">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
          <StatCard label="Total" value={entries.length} icon={<BookOpen size={16} />} />
          <StatCard label="Signed" value={signedCount} icon={<Check size={16} />} />
          <StatCard label="Unsigned" value={entries.length - signedCount} icon={<PenLine size={16} />} />
        </div>

        {/* Table card */}
        <div className="flex-1 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[420px]" style={{ borderColor: C.line }}>

          {/* Toolbar */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b flex items-center gap-2" style={{ borderColor: C.lineSoft }}>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-9 flex-1 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-colors min-w-0">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name"
                aria-label="Search entries"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(f => !f)} aria-expanded={showFilters}
              style={(showFilters || activeFilterCount) ? { background: C.brand, color: "#fff", borderColor: C.brand } : {}}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${!(showFilters || activeFilterCount) ? "border-gray-200 text-gray-600 hover:border-gray-400" : ""}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-white/90 text-[10px] font-bold flex items-center justify-center" style={{ color: C.brand }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {isHead && (
              <button onClick={() => setShowExport(true)} disabled={entries.length === 0}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-gray-400 transition-colors disabled:opacity-40 shrink-0">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="px-3 sm:px-5 py-4 border-b bg-gray-50 space-y-4" style={{ borderColor: C.lineSoft }}>
              {programOptions.length > 0 && (
                <div className="sm:max-w-xs">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Program</label>
                  <div className="relative">
                    <select value={programFilter} onChange={e => setProgramFilter(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg pl-3 pr-8 py-2 bg-white text-gray-700 outline-none appearance-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10">
                      <option value="">All programs</option>
                      {programOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <SelectChevron />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Date range</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)}
                    aria-label="From date"
                    className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                  <span className="text-xs text-gray-400 shrink-0">to</span>
                  <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)}
                    aria-label="To date"
                    className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {QUICK_RANGES.map(p => (
                    <button key={p.label} onClick={() => { const r = p.fn(); setDateFrom(r.from); setDateTo(r.to); }}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition-colors">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: C.brand }}>
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="animate-pulse divide-y divide-gray-100" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-3 w-6 bg-gray-100 rounded" />
                  <div className="h-3 w-20 bg-gray-100 rounded hidden sm:block" />
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                  <div className="h-5 w-16 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={fetchEntries}
                className="text-xs font-bold px-4 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                Try again
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex-1">{emptyState}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop table */}
              <table className="w-full border-collapse hidden sm:table">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: "#fafafa" }}>
                    {["No.", "Date", "Complete name", "Department / course", "Sex", "Purpose", "Signature", ""].map((h, i) => (
                      <th key={i} scope="col"
                        className="text-left px-4 py-2.5 whitespace-nowrap border-b"
                        style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((e, i) => (
                    <tr key={e.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 text-xs tabular-nums border-b w-12" style={{ color: C.faint, borderColor: C.lineSoft }}>
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap border-b" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {fmtDate(e.visitDate)}
                      </td>
                      <td className="px-4 py-3.5 border-b min-w-[180px]" style={{ borderColor: C.lineSoft }}>
                        <p className="text-[13px] font-semibold" style={{ color: C.ink }}>{e.name}</p>
                        {e.email && <p className="text-[11px] truncate max-w-[220px]" style={{ color: C.muted }}>{e.email}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b max-w-[220px]" style={{ color: C.body, borderColor: C.lineSoft }}>
                        <span className="line-clamp-1">{e.department ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {e.sex ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {e.purpose}
                      </td>
                      <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft, minWidth: 120 }}>
                        {e.signatureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.signatureUrl} alt={`${e.name} signature`} className="h-7 max-w-[100px] object-contain" />
                        ) : (
                          <SignBadge signed={false} />
                        )}
                      </td>
                      <td className="px-3 py-3.5 w-12 border-b" style={{ borderColor: C.lineSoft }}>
                        {isHead && (
                          <button onClick={() => setDeleteTarget(e)} aria-label={`Delete entry for ${e.name}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map((e, i) => (
                  <div key={e.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: C.faint }}>
                            {(page - 1) * PAGE_SIZE + i + 1}.
                          </span>
                          <p className="text-sm font-bold truncate" style={{ color: C.ink }}>{e.name}</p>
                        </div>
                        {e.department && (
                          <p className="text-xs truncate mt-0.5 pl-6" style={{ color: C.muted }}>{e.department}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <SignBadge signed={!!e.signatureUrl} />
                        {isHead && (
                          <button onClick={() => setDeleteTarget(e)} aria-label={`Delete entry for ${e.name}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 active:bg-red-50 active:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] mt-1.5 pl-6" style={{ color: C.faint }}>
                      {fmtDate(e.visitDate)}
                      {e.sex ? ` · ${e.sex}` : ""}
                      {` · ${e.purpose}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && entries.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t bg-white shrink-0 gap-2" style={{ borderColor: C.line }}>
              <span className="text-xs tabular-nums truncate" style={{ color: C.muted }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, entries.length)} of {entries.length}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="hidden sm:flex items-center gap-1">
                  {pageNumbers.map(n => (
                    <button key={n} onClick={() => setPage(n)} aria-current={page === n ? "page" : undefined}
                      style={page === n ? { background: C.brand, color: "#fff", borderColor: C.brand } : {}}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold border transition-colors ${page !== n ? "border-gray-200 text-gray-600 hover:border-gray-400" : ""}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <span className="sm:hidden text-xs font-semibold px-2 tabular-nums" style={{ color: C.muted }}>
                  {page} / {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showExport && (
        <ExportModal
          courseId={courseId}
          programOptions={programOptions}
          defaultDateFrom={dateFrom}
          defaultDateTo={dateTo}
          defaultProgram={programFilter}
          onClose={() => setShowExport(false)}
          notify={notify}
        />
      )}

      {showAddModal && (
        <AddEntryModal
          courseId={courseId}
          onClose={() => setShowAddModal(false)}
          onSaved={fetchEntries}
          notify={notify}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete this entry?"
          confirmLabel="Delete"
          busy={deleting}
          message={
            <>
              The log entry for <strong>{deleteTarget.name}</strong> ({fmtDate(deleteTarget.visitDate)}) will be permanently removed.<br />
              This can’t be undone.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => { if (!deleting) setDeleteTarget(null); }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}