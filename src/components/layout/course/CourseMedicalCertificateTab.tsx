"use client";

// src/components/layout/course/CourseMedicalCertificateTab.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, X, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  Trash2, Check, ArrowUpDown, Download, Filter, FileText, PenLine,
} from "lucide-react";
import { resolveStudentAge } from "@/lib/age";

/* ─────────────────────────────────────────────────────────────────────────────
  CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";
const PAGE_SIZE = 15;

const TAB_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  @media (max-width: 639px) { input, textarea, select { font-size: 16px !important; } }
  button, [role="button"] { -webkit-tap-highlight-color: transparent; }
  .mct-scroll::-webkit-scrollbar { display: none; }
  .mct-scroll { scrollbar-width: none; }
`;

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hh   = h % 12 === 0 ? 12 : h % 12;
    const mm   = m === 0 ? "00" : "30";
    const ampm = h < 12 ? "AM" : "PM";
    TIME_OPTIONS.push(`${hh}:${mm} ${ampm}`);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
  TYPES
───────────────────────────────────────────────────────────────────────────── */
interface StudentInfo {
  id:            string;
  studentNumber: string;
  name:          string;
  email:         string | null;
  address:       string | null;
  birthDate:     string | null;
  age:           number | null;
  gender:        string | null;
  course:        string | null;
}

interface CertRecord {
  id:             string;
  purpose:        string;
  diagnosis:      string;
  recommendation: string;
  ptrNumber:      string | null;
  visitDate:      string;
  createdAt:      string;
  student:        StudentInfo;
  recordedByUser: { id: string; name: string };
}

interface Props {
  courseId:      string;
  isAdmin:       boolean;
  isHead:        boolean;
  currentUserId: string | null;
}

/* ─────────────────────────────────────────────────────────────────────────────
  HELPERS
───────────────────────────────────────────────────────────────────────────── */
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function currentTime() {
  const d = new Date();
  const h = d.getHours(), m = d.getMinutes();
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m < 30 ? 0 : 30).padStart(2,"0");
  return `${hh}:${mm} ${h < 12 ? "AM" : "PM"}`;
}
function courseAbbrev(course: string | null | undefined): string | null {
  if (!course) return null;
  const match = course.match(/\(([^)]+)\)/);
  return match ? match[1] : course.split(" ").filter(w => /^[A-Z]/.test(w)).join("") || course.slice(0, 8);
}

function useWindowHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const update = () => setH(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return h;
}

/* ─────────────────────────────────────────────────────────────────────────────
  SHARED UI ATOMS
───────────────────────────────────────────────────────────────────────────── */
const inputCls = [
  "w-full h-10 border border-gray-300 rounded-lg px-3 text-sm",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400",
].join(" ");

const textareaCls = [
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 resize-none",
].join(" ");

const selectCls = [
  "w-full h-10 border border-gray-300 rounded-lg px-3 text-sm bg-white",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all appearance-none cursor-pointer",
].join(" ");

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}
function SelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
      <div className="w-1 h-4 rounded-full shrink-0" style={{ background: MAROON }} />
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{children}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  MODAL SHELL
───────────────────────────────────────────────────────────────────────────── */
function ModalShell({
  onClose, children, maxWidth = "sm:max-w-2xl", fullHeight = false,
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  fullHeight?: boolean;
}) {
  const winH = useWindowHeight();
  const BOTTOM_NAV_H = typeof window !== "undefined" && window.innerWidth < 768 ? 60 : 0;
  const modalMaxH = winH > 0 ? Math.floor(winH * 0.92) - BOTTOM_NAV_H : 700;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}
    >
      <div
        className={`bg-white w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100`}
        style={{
          height: fullHeight ? modalMaxH : undefined,
          maxHeight: modalMaxH,
          marginBottom: typeof window !== "undefined" && window.innerWidth < 768 ? 60 : 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle = "Clinic", onClose, actions }: {
  title: string; subtitle?: string; onClose: () => void; actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 shrink-0" style={{ background: MAROON }}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <FileText size={15} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{subtitle}</p>
          <p className="text-sm font-bold text-white truncate">{title}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  DELETE MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteModal({ record, courseId, onClose, onDeleted }: {
  record: CertRecord; courseId: string; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/medical-certificates/${record.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to delete."); setDeleting(false); return; }
      onDeleted();
    } catch { setError("Network error. Please try again."); setDeleting(false); }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="sm:max-w-sm">
      <div className="px-5 py-5 overflow-y-auto" style={{ flex: "1 1 0", minHeight: 0 }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-50">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-sm font-bold text-gray-900 mb-1">Delete this certificate?</p>
        <p className="text-xs text-gray-500 mb-1 font-medium">{record.student.name}</p>
        <p className="text-xs text-gray-400 mb-5 leading-relaxed">
          {fmtDate(record.visitDate)}<br />This action is permanent and cannot be undone.
        </p>
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={deleting} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5" style={{ background: "#ef4444" }}>
            {deleting ? <><RefreshCw size={12} className="animate-spin" /> Deleting...</> : "Delete"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  ADD CERTIFICATE MODAL
───────────────────────────────────────────────────────────────────────────── */
function AddCertModal({ courseId, onClose, onSaved }: {
  courseId: string; onClose: () => void; onSaved: (record: CertRecord) => void;
}) {
  const [studentNum,    setStudentNum]    = useState("");
  const [student,       setStudent]       = useState<StudentInfo | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError,   setLookupError]   = useState("");

  const [visitDate,      setVisitDate]      = useState(todayISO());
  const [visitTime,      setVisitTime]      = useState(currentTime());
  const [purpose,        setPurpose]        = useState("");
  const [diagnosis,      setDiagnosis]      = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [ptrNumber,      setPtrNumber]      = useState("");

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const lookupStudent = useCallback(async (num: string) => {
    const trimmed = num.trim();
    if (!trimmed) { setStudent(null); setLookupError(""); return; }
    setLookupLoading(true); setLookupError(""); setStudent(null);
    try {
      const res  = await fetch(`/api/courses/${courseId}/medical-exam-records/student-lookup?studentNumber=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error ?? "Student not found."); return; }
      setStudent(data.student);
    } catch { setLookupError("Network error. Please try again."); }
    finally   { setLookupLoading(false); }
  }, [courseId]);

  const handleStudentNumChange = (val: string) => {
    setStudentNum(val); setStudent(null); setLookupError("");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => lookupStudent(val), 600);
  };

  const handleSave = async () => {
    setError("");
    if (!student)           { setError("Please look up a valid student first."); return; }
    if (!purpose.trim())    { setError("Purpose is required."); return; }
    if (!diagnosis.trim())  { setError("Diagnosis is required."); return; }
    if (!visitDate)         { setError("Visit date is required."); return; }
    setSaving(true);
    try {
      const visitDateTime = new Date(`${visitDate} ${visitTime}`).toISOString();
      const res = await fetch(`/api/courses/${courseId}/medical-certificates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId:      student.id,
          purpose:        purpose.trim(),
          diagnosis:      diagnosis.trim(),
          recommendation: recommendation.trim(),
          ptrNumber:      ptrNumber.trim() || null,
          visitDate:      visitDateTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      onSaved(data.record);
    } catch { setError("Network error. Please try again."); }
    finally  { setSaving(false); }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="sm:max-w-2xl" fullHeight>
      <ModalHeader title="New Medical Certificate" onClose={onClose} />

      <div
        style={{ flex: "1 1 0", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}
        className="px-4 sm:px-6 py-5 space-y-5"
      >
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{error}</div>
        )}

        {/* Student Lookup */}
        <div>
          <SectionHeading>Student Lookup</SectionHeading>
          <FieldLabel required>Student Number</FieldLabel>
          <div className="relative">
            <input
              value={studentNum}
              onChange={e => handleStudentNumChange(e.target.value)}
              placeholder="Enter student number..."
              className={inputCls}
            />
            {lookupLoading && <RefreshCw size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
          </div>
          {lookupError && <p className="text-xs text-red-500 mt-1.5">{lookupError}</p>}
          {student && (
            <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50">
                <Check size={12} className="text-green-600 shrink-0" />
                <span className="text-xs font-semibold text-green-700">Student Found</span>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 bg-white">
                {([
                  ["Name",       student.name],
                  ["Student No.", student.studentNumber],
                  ["Course",     student.course ?? "—"],
                  ["Age",        resolveStudentAge(student) ? `${resolveStudentAge(student)} yrs` : "—"],
                  ["Gender",     student.gender ?? "—"],
                  ["Address",    student.address ?? "—"],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[10px] text-gray-400 mb-0.5 font-medium">{label}</p>
                    <p className="text-xs font-semibold text-gray-800 leading-snug">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Visit Info */}
        <div>
          <SectionHeading>Visit Info</SectionHeading>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <FieldLabel required>Date</FieldLabel>
              <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <FieldLabel required>Time</FieldLabel>
              <SelectWrap>
                <select value={visitTime} onChange={e => setVisitTime(e.target.value)} className={selectCls}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </SelectWrap>
            </div>
          </div>
          <div className="mb-3">
            <FieldLabel required>Purpose</FieldLabel>
            <textarea
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              rows={2}
              placeholder="e.g. School requirement, employment, clearance..."
              className={textareaCls}
            />
          </div>
          <div>
            <FieldLabel>PTR Number</FieldLabel>
            <input
              value={ptrNumber}
              onChange={e => setPtrNumber(e.target.value)}
              placeholder="e.g. 2025-12345"
              className={inputCls}
            />
          </div>
        </div>

        {/* Medical Findings */}
        <div>
          <SectionHeading>Medical Findings</SectionHeading>
          <div className="mb-3">
            <FieldLabel required>Diagnosis</FieldLabel>
            <textarea
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              rows={2}
              placeholder="e.g. Upper Respiratory Tract Infection (URTI), No apparent illness..."
              className={textareaCls}
            />
          </div>
          <div>
            <FieldLabel>Recommendation</FieldLabel>
            <textarea
              value={recommendation}
              onChange={e => setRecommendation(e.target.value)}
              rows={2}
              placeholder="e.g. rest for 3 days and to take prescribed medications..."
              className={textareaCls}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{ flexShrink: 0, borderTop: "1px solid #f3f4f6", background: "#f9fafb", padding: "12px 16px 14px" }}
        className="sm:px-6 flex gap-2"
      >
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
          style={{ height: 48 }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !student}
          className="flex-1 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
          style={{ height: 48, background: MAROON }}
        >
          {saving
            ? <><RefreshCw size={13} className="animate-spin" /> Saving...</>
            : <><Check size={13} /> Issue Certificate</>
          }
        </button>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  VIEW CERTIFICATE MODAL
───────────────────────────────────────────────────────────────────────────── */
function ViewCertModal({ record, canDelete, onClose, onAskDelete, courseId, onUpdated }: {
  record: CertRecord; canDelete: boolean; onClose: () => void; onAskDelete: () => void;
  courseId: string; onUpdated: (r: CertRecord) => void;
}) {
  const [editing,        setEditing]        = useState(false);
  const [purpose,        setPurpose]        = useState(record.purpose);
  const [diagnosis,      setDiagnosis]      = useState(record.diagnosis);
  const [recommendation, setRecommendation] = useState(record.recommendation);
  const [ptrNumber,      setPtrNumber]      = useState(record.ptrNumber ?? "");
  const [saving,         setSaving]         = useState(false);
  const [saveError,      setSaveError]      = useState("");

  const SLATE = "#0f172a";
  const MUTED = "#64748b";
  const RULE  = "#e2e8f0";

  const handleSave = async () => {
    setSaving(true); setSaveError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/medical-certificates/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose:        purpose.trim()        || undefined,
          diagnosis:      diagnosis.trim()      || undefined,
          recommendation: recommendation.trim() || undefined,
          ptrNumber:      ptrNumber.trim()      || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Failed to save."); return; }
      onUpdated(data.record); setEditing(false);
    } catch { setSaveError("Network error."); }
    finally  { setSaving(false); }
  };

  const age = resolveStudentAge(record.student);

  return (
    <ModalShell onClose={onClose} maxWidth="sm:max-w-4xl" fullHeight>
      <ModalHeader
        title="Medical Certificate"
        onClose={onClose}
        actions={
          <>
            <a
              href={`/api/courses/${courseId}/medical-certificates/${record.id}/export`}
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
            >
              <Download size={12} /> Download
            </a>
            {canDelete && (
              <button
                onClick={onAskDelete}
                className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-all"
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-col sm:flex-row overflow-hidden" style={{ flex: "1 1 0", minHeight: 0, background: "#f1f5f9" }}>
        {/* LEFT: student sidebar */}
        <div className="sm:w-56 shrink-0 bg-white sm:border-r border-b sm:border-b-0 border-gray-200 flex flex-col overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MAROON }}>Student</p>
          </div>
          <div className="px-4 py-4 flex flex-col gap-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{record.student.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{record.student.studentNumber}</p>
              {record.student.course && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{record.student.course}</p>}
            </div>
          </div>
          <div className="px-4 py-2 flex-1">
            {([
              ["Age",    age ? `${age} yrs` : null],
              ["Gender", record.student.gender],
              ["Address", record.student.address],
            ] as [string, string | null | undefined][]).map(([label, value]) =>
              value ? (
                <div key={label} className="py-2.5 border-b border-gray-100 last:border-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
                  <p className="text-xs font-medium text-gray-800">{value}</p>
                </div>
              ) : null
            )}
            {/* Mobile: download link */}
            <div className="py-3 sm:hidden">
              <a
                href={`/api/courses/${courseId}/medical-certificates/${record.id}/export`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400 transition-all"
              >
                <Download size={12} /> Download Certificate
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT: certificate details */}
        <div className="flex flex-col overflow-y-auto" style={{ flex: "1 1 0", minHeight: 0 }}>
          <div className="px-4 py-3 border-b border-gray-200 sticky top-0 z-10 bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MAROON }}>Certificate Details</p>
          </div>
          <div className="p-4 space-y-3">

            {/* Visit info card */}
            <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 12, padding: "14px 16px" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ["Date Issued",  `${fmtDate(record.visitDate)} · ${fmtTime(record.visitDate)}`],
                  ["Purpose",      record.purpose],
                  ["Recorded by",  record.recordedByUser.name],
                  ["PTR Number",   record.ptrNumber],
                ] as [string, string | null][]).filter(([, v]) => v).map(([label, val]) => (
                  <div key={label}>
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", color: MAROON, marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: 13, color: SLATE, lineHeight: 1.6 }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Medical findings card */}
            <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 12, overflow: "hidden" }}>
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <FileText size={12} className="text-gray-400" />
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", color: MAROON }}>Medical Findings</p>
                </div>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 transition-all"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editing ? (
                <div className="px-4 py-4 space-y-3">
                  {saveError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>
                  )}
                  <div>
                    <FieldLabel required>Diagnosis</FieldLabel>
                    <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} className={textareaCls} />
                  </div>
                  <div>
                    <FieldLabel>Recommendation</FieldLabel>
                    <textarea value={recommendation} onChange={e => setRecommendation(e.target.value)} rows={2} className={textareaCls} />
                  </div>
                  <div>
                    <FieldLabel>Purpose</FieldLabel>
                    <textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={2} className={textareaCls} />
                  </div>
                  <div>
                    <FieldLabel>PTR Number</FieldLabel>
                    <input value={ptrNumber} onChange={e => setPtrNumber(e.target.value)} placeholder="e.g. 2025-12345" className={inputCls} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditing(false); setPurpose(record.purpose); setDiagnosis(record.diagnosis); setRecommendation(record.recommendation); setPtrNumber(record.ptrNumber ?? ""); }}
                      disabled={saving}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-xl text-xs font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                      style={{ background: MAROON }}
                    >
                      {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving...</> : <><Check size={12} /> Save</>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-4 space-y-4">
                  {([
                    ["Diagnosis",      record.diagnosis],
                    ["Recommendation", record.recommendation],
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label}>
                      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", color: MUTED, marginBottom: 4 }}>{label}</p>
                      <p style={{ fontSize: 13, color: SLATE, lineHeight: 1.7 }}>{val || <span style={{ color: MUTED, fontStyle: "italic" }}>—</span>}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certificate preview panel */}
            <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", color: MAROON, marginBottom: 10 }}>Certificate Preview</p>
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "16px 18px", border: `1px solid ${RULE}`, fontSize: 12, color: SLATE, lineHeight: 1.9 }}>
                <p style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>Date: {fmtDate(record.visitDate)}</p>
                <p style={{ marginBottom: 12, fontWeight: 700, textAlign: "center", letterSpacing: "0.12em", fontSize: 11 }}>M E D I C A L &nbsp; C E R T I F I C A T E</p>
                <p style={{ marginBottom: 10 }}>To whom it may concern:</p>
                <p style={{ marginBottom: 10 }}>
                  This is to certify that{" "}
                  <strong>
                    {(record.student.gender ?? "").toLowerCase() === "female" ? "Ms." : "Mr."}{" "}
                    {record.student.name}
                  </strong>
                  {" "}age/sex{" "}
                  <strong>
                    {resolveStudentAge(record.student) ?? "—"}/
                    {(record.student.gender ?? "").toLowerCase() === "female" ? "F" : "M"}
                  </strong>
                  , of{" "}
                  <strong>{record.student.course ?? "—"}</strong>
                  , was seen and examined on{" "}
                  <strong>{fmtDate(record.visitDate)}</strong>
                  {" "}and was diagnosed to have{" "}
                  <strong>{record.diagnosis}</strong>
                  {record.recommendation ? <> I therefore recommend <strong>{record.recommendation}</strong>.</> : "."}
                </p>
                <p style={{ fontSize: 11, color: MUTED }}>
                  This certificate is being issued upon the request of the above mentioned name for whatever purpose it may serve (excluding legal matters.)
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  MAIN TAB
───────────────────────────────────────────────────────────────────────────── */
export default function CourseMedicalCertificateTab({ courseId, isAdmin, isHead, currentUserId }: Props) {
  const [records,      setRecords]      = useState<CertRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [showAdd,      setShowAdd]      = useState(false);
  const [viewRecord,   setViewRecord]   = useState<CertRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CertRecord | null>(null);
  const [showFilters,  setShowFilters]  = useState(false);
  const [dateFrom,     setDateFrom]     = useState(todayISO());
  const [dateTo,       setDateTo]       = useState(todayISO());
  const [page,         setPage]         = useState(1);

  const canManage = !isAdmin;

  const fetchRecords = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search)   params.set("search",   search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const res  = await fetch(`/api/courses/${courseId}/medical-certificates?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRecords(data.records ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load records.");
    } finally { setLoading(false); }
  }, [courseId, search, dateFrom, dateTo]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { setPage(1); }, [search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const paginated  = records.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const hasActiveFilter = dateFrom !== todayISO() || dateTo !== todayISO();

  const canDeleteRecord = (r: CertRecord) => {
    if (isAdmin) return false;
    if (isHead)  return true;
    return r.recordedByUser.id === currentUserId;
  };

  const QUICK_DATES = [
    { label: "Today",      fn: () => { const d = todayISO(); setDateFrom(d); setDateTo(d); } },
    { label: "Yesterday",  fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s = d.toISOString().split("T")[0]; setDateFrom(s); setDateTo(s); } },
    { label: "This Week",  fn: () => { const n = new Date(), mon = new Date(n); mon.setDate(n.getDate()-n.getDay()+1); setDateFrom(mon.toISOString().split("T")[0]); setDateTo(todayISO()); } },
    { label: "This Month", fn: () => { const n = new Date(); setDateFrom(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`); setDateTo(todayISO()); } },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: "#f8f8f7" }}>
      <style>{TAB_CSS}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 truncate" style={{ color: MAROON }}>Clinic</p>
          <h1 className="text-lg font-bold text-gray-900 leading-none">Medical Certificate</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchRecords}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 py-2 rounded-lg transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canManage && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-2 rounded-lg text-white transition-all"
              style={{ background: MAROON }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Certificate</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 flex flex-col gap-4">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Total",   value: records.length,      icon: <FileText className="w-4 h-4" /> },
            { label: "Today",   value: records.filter(r => new Date(r.visitDate).toDateString() === new Date().toDateString()).length, icon: <Check className="w-4 h-4" /> },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
              <div className="rounded-lg p-2 shrink-0" style={{ background: "#fef2f2", color: MAROON }}>{s.icon}</div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-black tabular-nums leading-none text-gray-900">{s.value}</p>
                <p className="text-[10px] sm:text-xs font-semibold mt-0.5 text-gray-500 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">

          {/* Toolbar */}
          <div className="px-3 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 max-w-xs bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or student no."
                  className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0"><X className="w-3 h-3" /></button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0 ${showFilters || hasActiveFilter ? "text-white" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
                style={showFilters || hasActiveFilter ? { background: MAROON, borderColor: MAROON } : {}}
              >
                <Filter className="w-3 h-3" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="px-3 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Date Range</p>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                  <span className="text-xs text-gray-400">to</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {QUICK_DATES.map(q => (
                    <button key={q.label} onClick={q.fn} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
              {hasActiveFilter && (
                <button onClick={() => { setDateFrom(todayISO()); setDateTo(todayISO()); }} className="flex items-center gap-1 text-[11px] font-bold hover:underline" style={{ color: MAROON }}>
                  <X size={11} /> Clear filters
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 py-20">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-xs font-medium">Loading certificates...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-xs font-medium text-red-500 py-20">{error}</div>
          ) : records.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                <FileText className="w-7 h-7" style={{ color: MAROON }} />
              </div>
              <p className="text-sm text-gray-400 font-medium">No medical certificates found.</p>
              {canManage && !search && (
                <button onClick={() => setShowAdd(true)} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                  + Issue first certificate
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: "#fafafa" }}>
                      {["No.", "Date", "Student No.", "Name", "Sex", "Age", "Course", "Diagnosis", ""].map((h, i) => (
                        <th key={i} className="text-left px-3 py-3 whitespace-nowrap border border-gray-200">
                          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-700">
                            {h} {h && h !== "" && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r, i) => {
                      const canDel = canDeleteRecord(r);
                      const age    = resolveStudentAge(r.student);
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/70 transition-colors cursor-pointer" onClick={() => setViewRecord(r)}>
                          <td className="px-3 py-3 text-xs text-center text-gray-700 border border-gray-200 tabular-nums">{(page-1)*PAGE_SIZE+i+1}</td>
                          <td className="px-3 py-3 text-xs border border-gray-200 whitespace-nowrap">
                            <p className="text-gray-800">{fmtDate(r.visitDate)}</p>
                            <p className="text-gray-400">{fmtTime(r.visitDate)}</p>
                          </td>
                          <td className="px-3 py-3 text-xs border border-gray-200 text-gray-700">{r.student.studentNumber}</td>
                          <td className="px-3 py-3 text-xs border border-gray-200 text-gray-800 whitespace-nowrap">{r.student.name}</td>
                          <td className="px-3 py-3 text-xs border border-gray-200 text-center text-gray-700">{r.student.gender ?? "—"}</td>
                          <td className="px-3 py-3 text-xs border border-gray-200 text-center tabular-nums text-gray-700">{age ?? "—"}</td>
                          <td className="px-3 py-3 text-xs border border-gray-200 text-gray-700">{courseAbbrev(r.student.course) ?? "—"}</td>
                          <td className="px-3 py-3 text-xs border border-gray-200 max-w-[200px]">
                            <span className="line-clamp-2 text-gray-700">{r.diagnosis}</span>
                          </td>
                          <td className="px-2 py-3 border border-gray-200 w-10" onClick={e => e.stopPropagation()}>
                            {canDel && (
                              <button
                                onClick={() => setDeleteTarget(r)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map(r => {
                  const canDel = canDeleteRecord(r);
                  return (
                    <div
                      key={r.id}
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setViewRecord(r)}
                    >
                      <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: MAROON }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{r.student.name}</p>
                            <p className="text-[10px] font-mono font-semibold text-gray-400 mt-0.5">{r.student.studentNumber}</p>
                          </div>
                          {canDel && (
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
                              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        {r.student.course && (
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mb-1.5" style={{ background: "#fef2f2", color: MAROON }}>
                            {courseAbbrev(r.student.course)}
                          </span>
                        )}
                        <p className="text-xs text-gray-600 leading-snug line-clamp-2 mb-1">{r.diagnosis}</p>
                        <p className="text-[10px] text-gray-400">{fmtDate(r.visitDate)} · {fmtTime(r.visitDate)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && records.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-100 bg-white shrink-0 flex-wrap gap-2">
              <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, records.length)} of {records.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-25 transition-all">
                  <ChevronLeft className="w-3 h-3" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const n = totalPages <= 5 ? i+1 : page <= 3 ? i+1 : page >= totalPages-2 ? totalPages-4+i : page-2+i;
                  return (
                    <button key={n} onClick={() => setPage(n)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-semibold transition-all border"
                      style={page===n ? { background: MAROON, color:"#fff", borderColor: MAROON } : { borderColor:"#e5e7eb", color:"#6b7280" }}>
                      {n}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-25 transition-all">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <AddCertModal
          courseId={courseId}
          onClose={() => setShowAdd(false)}
          onSaved={record => { setRecords(prev => [record, ...prev]); setShowAdd(false); }}
        />
      )}
      {viewRecord && (
        <ViewCertModal
          record={viewRecord}
          canDelete={canDeleteRecord(viewRecord)}
          courseId={courseId}
          onClose={() => setViewRecord(null)}
          onAskDelete={() => { setDeleteTarget(viewRecord); setViewRecord(null); }}
          onUpdated={updated => { setRecords(prev => prev.map(r => r.id === updated.id ? updated : r)); setViewRecord(updated); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          record={deleteTarget}
          courseId={courseId}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setRecords(prev => prev.filter(r => r.id !== deleteTarget!.id)); setDeleteTarget(null); }}
        />
      )}

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; filter: invert(13%) sepia(85%) saturate(2000%) hue-rotate(340deg) brightness(70%); }
        input[type="date"]::-webkit-calendar-picker-indicator:hover { opacity: 1; }
        input[type="date"] { color-scheme: light; accent-color: #7b1113; }
      `}</style>
    </div>
  );
}