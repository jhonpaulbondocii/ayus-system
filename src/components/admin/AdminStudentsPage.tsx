"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, RefreshCw, X, ChevronLeft, ChevronRight,
  Trash2, Plus, ArrowUpDown, Users, Check, ChevronDown,
  Pencil, Upload, Download, FileSpreadsheet, AlertTriangle,
  CheckCircle2, GraduationCap, ArrowLeft, MoreVertical, Eye, Link2,
} from "lucide-react";
import { DEPARTMENTS, COURSES_BY_DEPARTMENT } from "@/lib/academic-programs";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";
const PAGE_SIZE = 12;
// Course ID ng Guidance office (galing sa URL: /courses/<id>)
const DEFAULT_GUIDANCE_COURSE_ID =
  process.env.NEXT_PUBLIC_GUIDANCE_COURSE_ID ?? "cmtr4nk8j000214183we77gri";
const IMPORT_CONCURRENCY = 5;

const GENDERS         = ["Male", "Female", "Prefer not to say"];
const EXTENSION_NAMES = ["Jr.", "Sr.", "II", "III", "IV", "V"];
const CIVIL_STATUSES  = ["Single", "Married", "Widowed", "Separated", "Annulled", "Live-in"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SLATE = "#0f172a";
const MUTED = "#64748b";
const RULE  = "#e2e8f0";

function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="py-2.5" style={{ borderBottom: `1px solid ${RULE}` }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 500, color: SLATE, lineHeight: 1.5 }}>{String(value)}</p>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 sm:px-5 py-3 border-b border-gray-100" style={{ background: "#fafafa" }}>
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: MAROON }}>{title}</p>
    </div>
  );
}

function RightSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
      <div className="px-4 py-2.5" style={{ background: "#fafafa", borderBottom: `1px solid ${RULE}` }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: MAROON }}>{title}</p>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="py-2.5" style={{ borderBottom: `1px solid ${RULE}` }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 500, color: SLATE, lineHeight: 1.5 }}>{String(value)}</p>
    </div>
  );
}

function StudentAvatar({ name, photoUrl, size = 28 }: { name: string; photoUrl?: string | null; size?: number }) {
  const initials = name
    .split(",")
    .map(p => p.trim()[0] ?? "")
    .reverse()
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${RULE}` }} />
    );
  }
  return (
    <div className="shrink-0 flex items-center justify-center text-white font-black rounded-full"
      style={{ width: size, height: size, background: MAROON, fontSize: Math.round(size * 0.36) }}>
      {initials}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface Sibling   { name: string; schoolWork: string; age: string; }
interface EducLevel { level: string; school: string; years: string; }
interface EducBackground {
  elementary?: EducLevel[];
  juniorHigh?: EducLevel[];
  seniorHigh?: EducLevel[];
  tertiary?:   EducLevel[];
  techVoc?:    EducLevel[];
}

interface Student {
  /* core fields (always present) */
  id:            string;
  studentNumber: string;
  name:          string;
  extensionName: string | null;
  email:         string | null;
  address:       string | null;
  birthDate:     string | null;
  age:           number | null;
  gender:        string | null;
  department:    string | null;
  course:        string | null;
  civilStatus:   string | null;
  isPwd:         boolean | null;
  isIndigenous:  boolean | null;
  isSoloParent:  boolean | null;
  isFirstGen:    boolean | null;
  createdAt:     string;

  /* guidance-sheet fields (optional — populated when student submitted IIS) */
  guidanceSheetId?:   string | null;
  nickname?:          string | null;
  placeOfBirth?:      string | null;
  birthOrder?:        string | null;
  mobileNo?:          string | null;
  religion?:          string | null;
  sex?:               string | null;
  dateOfBirth?:       string | null;
  yearSection?:       string | null;
  completeAddress?:   string | null;
  fatherName?:        string | null;
  fatherDOB?:         string | null;
  fatherAddress?:     string | null;
  fatherContact?:     string | null;
  fatherEduc?:        string | null;
  fatherOccupation?:  string | null;
  fatherIncome?:      string | null;
  fatherLanguage?:    string | null;
  fatherReligion?:    string | null;
  fatherOFW?:         string | null;
  fatherYearsAbroad?: string | null;
  motherName?:        string | null;
  motherDOB?:         string | null;
  motherAddress?:     string | null;
  motherContact?:     string | null;
  motherEduc?:        string | null;
  motherOccupation?:  string | null;
  motherIncome?:      string | null;
  motherLanguage?:    string | null;
  motherReligion?:    string | null;
  motherOFW?:         string | null;
  motherYearsAbroad?: string | null;
  maritalStatus?:     string | null;
  siblings?:          Sibling[];
  guardianName?:      string | null;
  guardianContact?:   string | null;
  guardianAddress?:   string | null;
  emergencyPerson?:   string | null;
  emergencyContact?:  string | null;
  educBackground?:    EducBackground;
  photoUrl?:          string | null;
  awards?:            string | null;
  interests?:         string | null;
  talents?:           string | null;
  hobbies?:           string | null;
  goals?:             string | null;
  principles?:        string | null;
  characteristics?:   string | null;
  fears?:             string | null;
  healthAcademics?:       string | null;
  healthExtracurricular?: string | null;
  psychiatricHelp?:       string | null;
  counseling?:            string | null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const inputCls = "w-full h-9 border border-gray-200 rounded-lg px-3 text-sm font-medium outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-gray-50 focus:bg-white";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "#9ca3af" }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SimpleSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`${inputCls} appearance-none pr-8 cursor-pointer`} style={{ fontFamily: FONT }}>
        <option value="">{placeholder ?? "Select…"}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="h-px flex-1 bg-gray-100" />
      <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">{label}</span>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  );
}

function YesNoRow({ label, value, onChange }: {
  label: string; value: boolean | null; onChange: (v: boolean | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-semibold text-gray-600 flex-1 leading-tight">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        {([true, false] as const).map(bool => (
          <button key={String(bool)} type="button"
            onClick={() => onChange(value === bool ? null : bool)}
            className={`h-7 px-3 rounded-lg text-[11px] font-bold transition-all border ${
              value === bool
                ? bool ? "bg-green-500 border-green-500 text-white" : "bg-gray-400 border-gray-400 text-white"
                : "bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
            }`}>
            {bool ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SHARE FORM LINK MODAL
───────────────────────────────────────────────────────────────────────────── */
function ShareFormLinkModal({ onClose }: { onClose: () => void }) {
  const courseId = DEFAULT_GUIDANCE_COURSE_ID;
  const [copied,    setCopied]    = useState(false);
  const [qr,        setQr]        = useState<{ url: string; data: string | null; failed: boolean } | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url    = courseId.trim() ? `${origin}/forms/guidance/${courseId.trim()}` : "";

  const copy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

    // Auto-generate QR kapag nagbago ang link
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}&color=7b1113&bgcolor=ffffff&margin=10`;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        const canvas = document.createElement("canvas");
        canvas.width = 260; canvas.height = 260;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        setQr({ url, data: canvas.toDataURL("image/png"), failed: false });
      };
      img.onerror = () => { if (!cancelled) setQr({ url, data: null, failed: true }); };
      img.src = apiUrl;
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [url]);

  // Derived: hindi na kailangan ng setState para sa loading
  const qrDataUrl = qr && qr.url === url ? qr.data : null;
  const qrLoading = !!url && !(qr && qr.url === url);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `information-sheet-qr-${courseId.trim()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-96 overflow-hidden max-h-[95vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <GraduationCap size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Guidance</p>
              <p className="text-sm font-black text-white">Individual Information Sheet</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 overflow-y-auto">
          <p className="text-xs text-gray-500 leading-relaxed">
            Ibahagi ang link o QR code na ito sa mga estudyante para masagutan nila ang kanilang Individual Information Sheet.
          </p>

          {/* Link */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "#9ca3af" }}>Form Link</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <p className="text-[11px] text-gray-700 font-mono flex-1 break-all leading-relaxed">
                {url || "—"}
              </p>
              <button onClick={copy} disabled={!url}
                className="shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all min-h-8 disabled:opacity-40"
                style={copied ? { background: "#dcfce7", color: "#15803d" } : { background: "#fef2f2", color: MAROON }}>
                {copied ? <><Check size={11} /> Copied!</> : "Copy"}
              </button>
            </div>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-2 text-[11px] font-bold hover:underline" style={{ color: MAROON }}>
                Open form in new tab →
              </a>
            )}
          </div>

          {/* QR */}
          <div className="flex flex-col items-center gap-3 py-1">
            <p className="text-[10px] font-black uppercase tracking-widest self-start" style={{ color: MAROON }}>QR Code</p>
            <div className="w-44 h-44 rounded-xl border-2 border-gray-100 flex items-center justify-center bg-white shadow-sm overflow-hidden">
              {qrLoading ? (
                <div className="w-8 h-8 rounded-full border-2 border-gray-200 animate-spin" style={{ borderTopColor: MAROON }} />
              ) : qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
              ) : (
                <p className="text-[10px] text-gray-400 text-center px-4">
                  Failed to generate QR code
                </p>
              )}
            </div>
            <button onClick={downloadQR} disabled={!qrDataUrl || qrLoading}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition-all disabled:opacity-40 min-h-9"
              style={{ borderColor: MAROON, color: MAROON }}>
              <Download size={12} /> Download QR Code
            </button>
          </div>

        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button onClick={onClose}
            className="w-full h-11 sm:h-10 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STUDENT DETAIL VIEW  (full-page, replaces the drawer)
───────────────────────────────────────────────────────────────────────────── */
function StudentDetailView({
  student,
  onBack,
  onDelete,
}: {
  student:  Student;
  onBack:   () => void;
  onDelete: () => void;
}) {
  const educ     = (student.educBackground ?? {}) as EducBackground;
  const siblings: Sibling[] = Array.isArray(student.siblings) ? student.siblings : [];

  const hasGuidanceData = !!(
    student.guidanceSheetId ||
    student.fatherName || student.motherName || student.guardianName ||
    student.maritalStatus ||
    (siblings.length > 0 && siblings.some(s => s.name)) ||
    Object.values(educ).some(arr => arr?.some((r: EducLevel) => r.school))
  );

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT, background: "#f8fafc" }}>

      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${RULE}` }}
        className="relative px-3 sm:px-6 py-3 shrink-0">
        {/* Row 1: Back + name */}
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold transition-colors shrink-0"
            style={{ color: MAROON }}>
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ width: 1, height: 16, background: RULE }} className="shrink-0" />
          <p className="text-sm font-bold truncate flex-1" style={{ color: SLATE }}>
            {student.name}{student.extensionName ? ` ${student.extensionName}` : ""}
          </p>
        </div>

        {/* Desktop action buttons */}
        <div className="hidden sm:flex items-center gap-2 absolute top-3 right-6">
          <button onClick={onDelete}
            className="flex items-center gap-1 text-xs font-semibold transition-colors text-red-400 hover:text-red-600">
            <Trash2 size={13} />
          </button>
        </div>

        {/* Mobile action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap mt-2 sm:hidden">  
          <button onClick={onDelete}
            className="flex items-center gap-1 text-xs font-semibold transition-colors text-red-400 hover:text-red-600 min-h-8 px-1">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto" style={{ background: "#f1f5f9" }}>
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-0 min-h-full">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-1 lg:border-r border-gray-200 flex flex-col" style={{ background: "#fff" }}>
            <SectionHeader title="Student Information" />

            {/* Photo / Avatar + Name */}
            <div className="px-4 sm:px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${RULE}` }}>
              <StudentAvatar name={student.name} photoUrl={student.photoUrl} size={56} />
              <div className="min-w-0">
                <p style={{ fontSize: 14, fontWeight: 700, color: SLATE, lineHeight: 1.3 }} className="truncate">
                  {student.name}{student.extensionName ? ` ${student.extensionName}` : ""}
                </p>
                {student.course     && <p style={{ fontSize: 11, color: MUTED, marginTop: 3 }} className="truncate">{student.course}</p>}
                {student.yearSection && <p style={{ fontSize: 11, color: MUTED }} className="truncate">{student.yearSection}</p>}
              </div>
            </div>

            {/* Left info fields */}
            <div className="px-4 sm:px-5 py-2 flex-1">
              <InfoField label="Student No."      value={student.studentNumber} />
              <InfoField label="Course / Program" value={student.course} />
              <InfoField label="Department"       value={student.department} />
              <InfoField label="Year & Section"   value={student.yearSection} />
              <InfoField label="Nickname"         value={student.nickname} />
              <InfoField label="Age"              value={student.age} />
              <InfoField label="Date of Birth"    value={(student.dateOfBirth ?? student.birthDate) ? formatDate(student.dateOfBirth ?? student.birthDate) : null} />
              <InfoField label="Place of Birth"   value={student.placeOfBirth} />
              <InfoField label="Sex / Gender"     value={student.sex ?? student.gender} />
              <InfoField label="Religion"         value={student.religion} />
              <InfoField label="Civil Status"     value={student.civilStatus} />
              <InfoField label="Mobile No."       value={student.mobileNo} />
              <InfoField label="Email"            value={student.email} />
              <InfoField label="Complete Address" value={student.completeAddress ?? student.address} />
              <InfoField label="Birth Order"      value={student.birthOrder} />
              <InfoField label="Added On"         value={formatDate(student.createdAt)} />
            </div>

            {/* Special categories */}
            <div className="px-4 sm:px-5 py-3 border-t border-gray-100">
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: MAROON, marginBottom: 8 }}>
                Special Categories
              </p>
              {[
                { label: "Person with Disability", value: student.isPwd },
                { label: "Indigenous People",      value: student.isIndigenous },
                { label: "Solo Parent",            value: student.isSoloParent },
                { label: "First Gen College",      value: student.isFirstGen },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1.5">
                  <span style={{ fontSize: 11, color: MUTED }}>{row.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    row.value === true  ? "bg-green-50 text-green-600" :
                    row.value === false ? "bg-gray-100 text-gray-400" :
                    "text-gray-200"
                  }`}>
                    {row.value === true ? "Yes" : row.value === false ? "No" : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="lg:col-span-2 overflow-y-auto">
            <div className="px-4 sm:px-5 py-3 border-b border-gray-200 lg:sticky top-0 z-10" style={{ background: "#fafafa" }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: MAROON }}>
                Full Information Sheet
              </p>
            </div>
            <div className="p-4 sm:p-5">

              {!hasGuidanceData && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                    <GraduationCap className="w-6 h-6" style={{ color: MAROON }} />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">No guidance sheet submitted yet</p>
                  <p className="text-xs text-gray-300 max-w-xs leading-relaxed">
                    When this student submits their Individual Information Sheet, the full details will appear here.
                  </p>
                </div>
              )}

              {/* Father's Info */}
              {(student.fatherName || student.fatherOccupation || student.fatherContact) && (
                <RightSection title="Father's Information">
                  <InfoRow label="Name"                   value={student.fatherName} />
                  <InfoRow label="Date of Birth"          value={student.fatherDOB ? formatDate(student.fatherDOB) : null} />
                  <InfoRow label="Address"                value={student.fatherAddress} />
                  <InfoRow label="Contact No."            value={student.fatherContact} />
                  <InfoRow label="Educational Attainment" value={student.fatherEduc} />
                  <InfoRow label="Occupation"             value={student.fatherOccupation} />
                  <InfoRow label="Monthly Income"         value={student.fatherIncome} />
                  <InfoRow label="Language Spoken"        value={student.fatherLanguage} />
                  <InfoRow label="Religion"               value={student.fatherReligion} />
                  <InfoRow label="OFW / Country"          value={student.fatherOFW} />
                  <InfoRow label="Years Abroad"           value={student.fatherYearsAbroad} />
                </RightSection>
              )}

              {/* Mother's Info */}
              {(student.motherName || student.motherOccupation || student.motherContact) && (
                <RightSection title="Mother's Information">
                  <InfoRow label="Name"                   value={student.motherName} />
                  <InfoRow label="Date of Birth"          value={student.motherDOB ? formatDate(student.motherDOB) : null} />
                  <InfoRow label="Address"                value={student.motherAddress} />
                  <InfoRow label="Contact No."            value={student.motherContact} />
                  <InfoRow label="Educational Attainment" value={student.motherEduc} />
                  <InfoRow label="Occupation"             value={student.motherOccupation} />
                  <InfoRow label="Monthly Income"         value={student.motherIncome} />
                  <InfoRow label="Language Spoken"        value={student.motherLanguage} />
                  <InfoRow label="Religion"               value={student.motherReligion} />
                  <InfoRow label="OFW / Country"          value={student.motherOFW} />
                  <InfoRow label="Years Abroad"           value={student.motherYearsAbroad} />
                </RightSection>
              )}

              {/* Marital Status */}
              {student.maritalStatus && (
                <RightSection title="Parents' Marital Status">
                  <p style={{ fontSize: 13, color: SLATE, fontWeight: 500, lineHeight: 1.5 }}>{student.maritalStatus}</p>
                </RightSection>
              )}

              {/* Siblings */}
              {siblings.some(s => s.name) && (
                <RightSection title="Siblings">
                  {/* Mobile: stacked */}
                  <div className="sm:hidden space-y-2">
                    {siblings.filter(s => s.name).map((s, i) => (
                      <div key={i} className="rounded-lg border border-gray-100 p-3 bg-gray-50">
                        <p style={{ fontSize: 12, fontWeight: 700, color: SLATE }}>{s.name}</p>
                        <p style={{ fontSize: 11, color: MUTED }}>{s.schoolWork || "—"} · Age {s.age || "—"}</p>
                      </div>
                    ))}
                  </div>
                  {/* Desktop: table */}
                  <div className="hidden sm:block">
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      {["Name", "School / Work", "Age"].map(h => (
                        <span key={h} style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED }}>{h}</span>
                      ))}
                    </div>
                    {siblings.filter(s => s.name).map((s, i) => (
                      <div key={i} className="grid grid-cols-3 gap-3 py-2.5" style={{ borderTop: `1px solid ${RULE}`, fontSize: 13, fontWeight: 500, color: SLATE }}>
                        <span>{s.name}</span>
                        <span>{s.schoolWork || "—"}</span>
                        <span>{s.age || "—"}</span>
                      </div>
                    ))}
                  </div>
                </RightSection>
              )}

              {/* Guardian */}
              {(student.guardianName || student.emergencyPerson) && (
                <RightSection title="Guardian Information">
                  <InfoRow label="Name of Guardian"         value={student.guardianName} />
                  <InfoRow label="Contact No."              value={student.guardianContact} />
                  <InfoRow label="Address"                  value={student.guardianAddress} />
                  <InfoRow label="Emergency Contact Person" value={student.emergencyPerson} />
                  <InfoRow label="Emergency Contact No."    value={student.emergencyContact} />
                </RightSection>
              )}

              {/* Educational Background */}
              {Object.values(educ).some(arr => arr?.some((r: EducLevel) => r.school)) && (
                <RightSection title="Educational Background">
                  {/* Mobile */}
                  <div className="sm:hidden space-y-3">
                    {([
                      { title: "Elementary",                    rows: educ.elementary },
                      { title: "Junior High School",            rows: educ.juniorHigh },
                      { title: "Senior High School",            rows: educ.seniorHigh },
                      { title: "Tertiary",                      rows: educ.tertiary },
                      { title: "Technical Vocational Training", rows: educ.techVoc },
                    ] as { title: string; rows?: EducLevel[] }[])
                      .filter(s => s.rows?.some(r => r.school))
                      .map(s => (
                        <div key={s.title}>
                          <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: MAROON, marginBottom: 4 }}>{s.title}</p>
                          {s.rows!.filter(r => r.school || r.level).map((r, i) => (
                            <div key={i} className="rounded-lg border border-gray-100 p-2.5 bg-gray-50 mb-1.5">
                              <p style={{ fontSize: 12, fontWeight: 600, color: SLATE }}>{r.school || "—"}</p>
                              <p style={{ fontSize: 11, color: MUTED }}>{r.level || "—"} · {r.years || "—"}</p>
                            </div>
                          ))}
                        </div>
                      ))
                    }
                  </div>
                  {/* Desktop */}
                  <div className="hidden sm:block">
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      {["Level", "School Attended", "Years"].map(h => (
                        <span key={h} style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED }}>{h}</span>
                      ))}
                    </div>
                    {([
                      { title: "Elementary",                    rows: educ.elementary },
                      { title: "Junior High School",            rows: educ.juniorHigh },
                      { title: "Senior High School",            rows: educ.seniorHigh },
                      { title: "Tertiary",                      rows: educ.tertiary },
                      { title: "Technical Vocational Training", rows: educ.techVoc },
                    ] as { title: string; rows?: EducLevel[] }[])
                      .filter(s => s.rows?.some(r => r.school))
                      .map(s => (
                        <div key={s.title} className="mb-3">
                          <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: MAROON, marginBottom: 4 }}>{s.title}</p>
                          {s.rows!.filter(r => r.school || r.level).map((r, i) => (
                            <div key={i} className="grid grid-cols-3 gap-3 py-2" style={{ fontSize: 13, fontWeight: 500, color: SLATE, borderTop: `1px solid ${RULE}` }}>
                              <span>{r.level || "—"}</span>
                              <span>{r.school || "—"}</span>
                              <span style={{ color: MUTED }}>{r.years || "—"}</span>
                            </div>
                          ))}
                        </div>
                      ))
                    }
                  </div>
                </RightSection>
              )}

              {/* Awards / Personal */}
              {(student.awards || student.interests || student.talents || student.hobbies ||
                student.goals || student.principles || student.characteristics || student.fears) && (
                <RightSection title="Personal Details">
                  <InfoRow label="Awards / Honors"    value={student.awards} />
                  <InfoRow label="Interests"          value={student.interests} />
                  <InfoRow label="Talents"            value={student.talents} />
                  <InfoRow label="Hobbies"            value={student.hobbies} />
                  <InfoRow label="Goals in Life"      value={student.goals} />
                  <InfoRow label="Principles in Life" value={student.principles} />
                  <InfoRow label="Characteristics"    value={student.characteristics} />
                  <InfoRow label="Present Fears"      value={student.fears} />
                </RightSection>
              )}

              {/* Health */}
              {(student.healthAcademics || student.healthExtracurricular ||
                student.psychiatricHelp || student.counseling) && (
                <RightSection title="Health Information">
                  <InfoRow label="Health (Academics)"        value={student.healthAcademics} />
                  <InfoRow label="Health (Extracurricular)"  value={student.healthExtracurricular} />
                  <InfoRow label="Psychiatric Help"          value={student.psychiatricHelp} />
                  <InfoRow label="Counseling"                value={student.counseling} />
                </RightSection>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STUDENT FORM MODAL  (add / edit)
───────────────────────────────────────────────────────────────────────────── */
function StudentFormModal({ student, onClose, onSaved }: {
  student?: Student | null; onClose: () => void; onSaved: (s: Student) => void;
}) {
  const isEdit = !!student;
  const [studentNumber, setStudentNumber] = useState(student?.studentNumber ?? "");
  const [firstName,     setFirstName]     = useState(() => { const p = student?.name?.split(","); return p?.[1]?.trim().split(" ")[0] ?? ""; });
  const [middleName,    setMiddleName]    = useState(() => { const p = student?.name?.split(","); const parts = p?.[1]?.trim().split(" ") ?? []; return parts.length > 1 ? parts.slice(1).join(" ") : ""; });
  const [lastName,      setLastName]      = useState(() => student?.name?.split(",")?.[0]?.trim() ?? "");
  const [extensionName, setExtensionName] = useState(student?.extensionName ?? "");
  const [email,         setEmail]         = useState(student?.email         ?? "");
  const [address,       setAddress]       = useState(student?.address       ?? "");
  const [birthDate,     setBirthDate]     = useState(student?.birthDate ? student.birthDate.slice(0, 10) : "");
  const [gender,        setGender]        = useState(student?.gender        ?? "");
  const [department,    setDepartment]    = useState(student?.department    ?? "");
  const [course,        setCourse]        = useState(student?.course        ?? "");
  const [civilStatus,   setCivilStatus]   = useState(student?.civilStatus   ?? "");
  const [isPwd,         setIsPwd]         = useState<boolean | null>(student?.isPwd         ?? null);
  const [isIndigenous,  setIsIndigenous]  = useState<boolean | null>(student?.isIndigenous  ?? null);
  const [isSoloParent,  setIsSoloParent]  = useState<boolean | null>(student?.isSoloParent  ?? null);
  const [isFirstGen,    setIsFirstGen]    = useState<boolean | null>(student?.isFirstGen    ?? null);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!studentNumber.trim()) { setError("Student number is required."); return; }
    if (!firstName.trim())     { setError("First name is required.");     return; }
    if (!lastName.trim())      { setError("Last name is required.");      return; }
    if (email.trim() && !EMAIL_REGEX.test(email.trim())) { setError("Email address looks invalid."); return; }
    const fullName = `${lastName.trim()}, ${firstName.trim()}${middleName.trim() ? " " + middleName.trim() : ""}`;
    setSaving(true);
    try {
      const url    = isEdit ? `/api/admin/students/${student!.id}` : "/api/admin/students";
      const method = isEdit ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: studentNumber.trim(), name: fullName,
          extensionName: extensionName.trim() || null,
          email: email.trim() || null, address: address.trim() || null,
          birthDate: birthDate || null, gender: gender || null,
          department: department || null, course: course || null,
          civilStatus: civilStatus || null,
          isPwd, isIndigenous, isSoloParent, isFirstGen,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      onSaved(data.student);
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              {isEdit ? <Pencil size={15} className="text-white" /> : <Plus size={15} className="text-white" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Students</p>
              <p className="text-sm font-black text-white">{isEdit ? "Edit Student" : "Add New Student"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4 overflow-y-auto flex-1">
          {error && <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

          <SectionDivider label="Basic Information" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Student Number" required>
              <input value={studentNumber} onChange={e => setStudentNumber(e.target.value)} className={inputCls} placeholder="e.g. 2023312239" />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="e.g. juan@example.com" />
            </Field>
          </div>
          <Field label="Address">
            <input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="e.g. San Juan, Mexico, Pampanga" />
          </Field>

          <SectionDivider label="Name" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Last Name" required>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} placeholder="e.g. Dela Cruz" />
            </Field>
            <Field label="First Name" required>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} placeholder="e.g. Juan" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Middle Name">
              <input value={middleName} onChange={e => setMiddleName(e.target.value)} className={inputCls} placeholder="Optional" />
            </Field>
            <Field label="Extension Name">
              <SimpleSelect value={extensionName} onChange={setExtensionName} options={EXTENSION_NAMES} placeholder="None" />
            </Field>
          </div>

          <SectionDivider label="Personal Details" />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Birth Date">
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Gender">
              <SimpleSelect value={gender} onChange={setGender} options={GENDERS} placeholder="Select…" />
            </Field>
            <Field label="Civil Status">
              <SimpleSelect value={civilStatus} onChange={setCivilStatus} options={CIVIL_STATUSES} placeholder="Select…" />
            </Field>
          </div>

          <SectionDivider label="Academic" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Department">
              <SimpleSelect value={department} onChange={v => { setDepartment(v); setCourse(""); }} options={DEPARTMENTS} placeholder="Select department…" />
            </Field>
            <Field label="Course / Program">
              <SimpleSelect value={course} onChange={setCourse} options={COURSES_BY_DEPARTMENT[department] ?? []} placeholder={department ? "Select course…" : "Select department first…"} />
            </Field>
          </div>

          <SectionDivider label="Special Categories" />
          <div className="bg-gray-50 rounded-xl px-4 py-1 divide-y divide-gray-100">
            <YesNoRow label="Person with Disability (PWD)"    value={isPwd}        onChange={setIsPwd} />
            <YesNoRow label="Indigenous People"                value={isIndigenous} onChange={setIsIndigenous} />
            <YesNoRow label="Solo Parent"                      value={isSoloParent} onChange={setIsSoloParent} />
            <YesNoRow label="First Generation College Student" value={isFirstGen}   onChange={setIsFirstGen} />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button onClick={onClose} disabled={saving}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 h-10 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: MAROON }}>
            {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving...</> : <><Check size={13} /> {isEdit ? "Save Changes" : "Add Student"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CSV IMPORT HELPERS
───────────────────────────────────────────────────────────────────────────── */
interface ParsedRow {
  studentNo:    string;
  lastName:     string;
  firstName:    string;
  middleName:   string;
  suffix:       string;
  email:        string;
  existingId:   string | null;   // may laman = existing na ang student number
  existingName: string | null;
  errors:       string[];
  warnings:     string[];
}

const HEADER_ALIASES: Record<string, string> = {
  "last_name":   "lastName",   "last name":  "lastName",  "lastname":  "lastName",  "surname": "lastName",
  "first_name":  "firstName",  "first name": "firstName", "firstname": "firstName", "given name": "firstName",
  "middle_name": "middleName", "middle name": "middleName", "middlename": "middleName",
  "suffix":      "suffix",     "extension name": "suffix", "ext": "suffix",
  "email":       "email",      "email address": "email",  "e-mail": "email",
  "student_no":  "studentNo",  "student no":  "studentNo", "student no.": "studentNo",
  "student number": "studentNo", "studentnumber": "studentNo", "id": "studentNo",
};

function parseCSVText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = []; let field = ""; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some(f => f.trim() !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); if (row.some(f => f.trim() !== "")) rows.push(row); }
  return rows;
}


function downloadCsvTemplate() {
  const header  = "last_name,first_name,middle_name,suffix,email,student_no";
  const example = 'Dela Cruz,Juan,Santos,,juan.delacruz@example.com,2024-00001';
  const example2 = 'Reyes,Maria,,,maria.reyes@example.com,2024-00002';
  const blob = new Blob([`${header}\n${example}\n${example2}\n`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "student_bulk_register_template.csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let idx = 0;
  async function next(): Promise<void> {
    const i = idx++; if (i >= items.length) return;
    await worker(items[i]); return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
}

/* ─────────────────────────────────────────────────────────────────────────────
   CSV IMPORT MODAL
───────────────────────────────────────────────────────────────────────────── */
function ImportCsvModal({ students, onClose, onImported }: {
  students: Student[]; onClose: () => void;
  onImported: (created: Student[], replaced: Student[]) => void;
}) {
  const [step,       setStep]       = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [fileName,   setFileName]   = useState("");
  const [parseError, setParseError] = useState("");
  const [rows,       setRows]       = useState<ParsedRow[]>([]);
  const [checked,    setChecked]    = useState<Set<number>>(new Set());
  const [replaceSet, setReplaceSet] = useState<Set<number>>(new Set());
  const [dragOver,   setDragOver]   = useState(false);
  const [progress,   setProgress]   = useState({ done: 0, total: 0 });
  const [results,    setResults]    = useState<{
    created: Student[]; replaced: Student[]; skipped: number;
    failed: { row: ParsedRow; reason: string }[];
  }>({ created: [], replaced: [], skipped: 0, failed: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCSV = (text: string) => {
    setParseError("");
    const table = parseCSVText(text);
    if (table.length < 2) { setParseError("That file looks empty, or has no data rows below the header."); return; }
    const headerKeys = table[0].map(h => HEADER_ALIASES[h.trim().toLowerCase()] ?? null);
    const dataRows = table.slice(1);
    const existingByNumber = new Map(students.map(s => [s.studentNumber.trim().toLowerCase(), s]));
    const existingEmails   = new Map(
      students.filter(s => s.email).map(s => [(s.email ?? "").trim().toLowerCase(), s.id])
    );
    const seenNumbers = new Set<string>();
    const seenEmails  = new Set<string>();
    const parsed: ParsedRow[] = dataRows.map(cells => {
      const obj: Record<string, string> = {
        studentNo: "", lastName: "", firstName: "", middleName: "", suffix: "", email: "",
      };
      headerKeys.forEach((key, i) => { if (key) obj[key] = (cells[i] ?? "").trim(); });
      const errors: string[] = []; const warnings: string[] = [];
      const num  = obj.studentNo.trim();
      const mail = obj.email.trim();
      const match = num ? existingByNumber.get(num.toLowerCase()) : undefined;

      if (!num) errors.push("Missing student number");
      else if (seenNumbers.has(num.toLowerCase())) errors.push("Duplicate student number in this file");
      if (!obj.lastName.trim())  errors.push("Missing last name");
      if (!obj.firstName.trim()) errors.push("Missing first name");
      if (!mail) errors.push("Email is required");
      else if (!EMAIL_REGEX.test(mail)) errors.push("Invalid email format");
      else {
        const owner = existingEmails.get(mail.toLowerCase());
        if (owner && owner !== match?.id) warnings.push("Email already used by another student");
        else if (seenEmails.has(mail.toLowerCase())) warnings.push("Duplicate email in this file");
      }
      if (num)  seenNumbers.add(num.toLowerCase());
      if (mail) seenEmails.add(mail.toLowerCase());

      return {
        studentNo:    obj.studentNo,
        lastName:     obj.lastName,
        firstName:    obj.firstName,
        middleName:   obj.middleName,
        suffix:       obj.suffix,
        email:        obj.email,
        existingId:   match?.id ?? null,
        existingName: match ? match.name : null,
        errors,
        warnings,
      };
    });
    setRows(parsed);
    // naka-check lahat maliban sa may error
    setChecked(new Set(parsed.map((r, i) => (r.errors.length === 0 ? i : -1)).filter(i => i >= 0)));
    setReplaceSet(new Set());
    setStep("preview");
  };

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) { setParseError("Please upload a .csv file."); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload  = () => processCSV(String(reader.result ?? ""));
    reader.onerror = () => setParseError("Couldn't read that file.");
    reader.readAsText(file);
  };

  /* ── derived ── */
  const selectableIdx = rows.map((r, i) => (r.errors.length === 0 ? i : -1)).filter(i => i >= 0);
  const conflictIdx   = selectableIdx.filter(i => !!rows[i].existingId);
  const errorCount    = rows.filter(r => r.errors.length > 0).length;
  const unresolved    = conflictIdx.filter(i => checked.has(i) && !replaceSet.has(i)).length;
  const replaceCount  = conflictIdx.filter(i => checked.has(i) && replaceSet.has(i)).length;
  const newCount      = selectableIdx.filter(i => checked.has(i) && !rows[i].existingId).length;
  const canImport     = checked.size > 0 && unresolved === 0;
  const allChecked    = selectableIdx.length > 0 && selectableIdx.every(i => checked.has(i));

  /* ── handlers ── */
  const toggleRow = (i: number) => {
    setChecked(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });
    setReplaceSet(prev => { if (!prev.has(i)) return prev; const n = new Set(prev); n.delete(i); return n; });
  };
  const toggleAll = () => {
    if (allChecked) { setChecked(new Set()); setReplaceSet(new Set()); }
    else setChecked(new Set(selectableIdx));
  };
  const toggleReplace = (i: number) => {
    setReplaceSet(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });
    setChecked(prev => new Set(prev).add(i));
  };
  const skipAllExisting = () => {
    setChecked(prev => { const n = new Set(prev); conflictIdx.forEach(i => n.delete(i)); return n; });
    setReplaceSet(prev => { const n = new Set(prev); conflictIdx.forEach(i => n.delete(i)); return n; });
  };
  const replaceAllExisting = () => {
    setChecked(prev => { const n = new Set(prev); conflictIdx.forEach(i => n.add(i)); return n; });
    setReplaceSet(prev => { const n = new Set(prev); conflictIdx.forEach(i => n.add(i)); return n; });
  };

  const startImport = async () => {
    const work = rows.map((r, i) => ({ r, i })).filter(({ i }) => checked.has(i));
    const skipped = rows.length - work.length;
    setStep("importing"); setProgress({ done: 0, total: work.length });
    const created: Student[] = []; const replaced: Student[] = [];
    const failed: { row: ParsedRow; reason: string }[] = [];

    await runWithConcurrency(work, IMPORT_CONCURRENCY, async ({ r, i }) => {
      try {
        const isReplace = replaceSet.has(i) && !!r.existingId;
        const fullName = `${r.lastName.trim()}, ${r.firstName.trim()}${r.middleName.trim() ? " " + r.middleName.trim() : ""}`;
        const res = await fetch(
          isReplace ? `/api/admin/students/${r.existingId}` : "/api/admin/students",
          {
            method: isReplace ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentNumber: r.studentNo.trim(),
              name: fullName,
              extensionName: EXTENSION_NAMES.find(e => e.toLowerCase() === r.suffix.trim().toLowerCase()) ?? null,
              email: r.email.trim() || null,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) failed.push({ row: r, reason: data.error ?? "Failed to save" });
        else if (isReplace) {
          const old = students.find(s => s.id === r.existingId);
          replaced.push({ ...(old as Student), ...data.student });
        } else created.push(data.student);
      } catch { failed.push({ row: r, reason: "Network error" }); }
      finally { setProgress(p => ({ ...p, done: p.done + 1 })); }
    });

    setResults({ created, replaced, skipped, failed });
    onImported(created, replaced);
    setStep("done");
  };

  const reset = () => {
    setStep("upload"); setFileName(""); setParseError(""); setRows([]);
    setChecked(new Set()); setReplaceSet(new Set());
    setProgress({ done: 0, total: 0 });
    setResults({ created: [], replaced: [], skipped: 0, failed: [] });
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Students</p>
              <p className="text-sm font-black text-white">Bulk Register from CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {step === "upload" && (
            <div className="px-5 py-6 space-y-4">
              <button type="button" onClick={downloadCsvTemplate}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all text-left">
                <div className="flex items-center gap-3">
                  <Download size={16} style={{ color: MAROON }} />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Download CSV template</p>
                    <p className="text-[11px] text-gray-400">Pre-filled column headers, two example rows</p>
                  </div>
                </div>
              </button>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 px-6 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all
                  ${dragOver ? "border-[#7b1113] bg-red-50/40" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                <Upload size={22} className="text-gray-300" />
                <p className="text-sm font-bold text-gray-600">Drop your CSV file here, or click to browse</p>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
              {parseError && <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{parseError}</div>}
            </div>
          )}

          {step === "preview" && (
            <div className="flex flex-col">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap bg-gray-50">
                <span className="text-xs font-bold text-gray-600">{fileName}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-600">{checked.size} selected</span>
                {conflictIdx.length > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600">{conflictIdx.length} already exist</span>}
                {errorCount > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600">{errorCount} with errors</span>}
                <button type="button" onClick={reset} className="ml-auto text-[11px] font-bold hover:underline" style={{ color: MAROON }}>Choose a different file</button>
              </div>

              {conflictIdx.length > 0 && (
                <div className="px-5 py-2.5 border-b border-amber-100 bg-amber-50/60 flex items-center gap-2 flex-wrap">
                  <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                  <p className="text-[11px] font-semibold text-amber-700 flex-1 min-w-48">
                    {conflictIdx.length} student number(s) already exist. I-uncheck para i-skip, o piliin ang Replace.
                  </p>
                  <button type="button" onClick={skipAllExisting}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50">
                    Skip all existing
                  </button>
                  <button type="button" onClick={replaceAllExisting}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-white hover:bg-red-50"
                    style={{ borderColor: MAROON, color: MAROON }}>
                    Replace all existing
                  </button>
                </div>
              )}

              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <th className="text-left pl-5 pr-2 py-2 w-8">
                        <input type="checkbox" checked={allChecked} onChange={toggleAll}
                          className="w-3.5 h-3.5 cursor-pointer rounded" style={{ accentColor: MAROON }} />
                      </th>
                      <th className="text-left px-2 py-2 w-6" />
                      <th className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Student No.</th>
                      <th className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Name</th>
                      <th className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Email</th>
                      <th className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const hasError   = r.errors.length > 0;
                      const isConflict = !hasError && !!r.existingId;
                      const isChecked  = checked.has(i);
                      const isReplace  = replaceSet.has(i);
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}
                          className={hasError ? "bg-red-50/30" : isConflict ? "bg-amber-50/40" : ""}>
                          <td className="pl-5 pr-2 py-2">
                            <input type="checkbox" checked={isChecked} disabled={hasError}
                              onChange={() => toggleRow(i)}
                              className="w-3.5 h-3.5 cursor-pointer rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              style={{ accentColor: MAROON }} />
                          </td>
                          <td className="px-2 py-2">
                            {hasError ? <AlertTriangle size={13} className="text-red-400" /> :
                             isConflict || r.warnings.length ? <AlertTriangle size={13} className="text-amber-400" /> :
                             <CheckCircle2 size={13} className="text-green-400" />}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-600">{r.studentNo || "—"}</td>
                          <td className="px-3 py-2 text-gray-700 font-medium">
                            {r.lastName || r.firstName
                              ? `${r.lastName}, ${r.firstName}${r.middleName ? " " + r.middleName : ""}${r.suffix ? " " + r.suffix : ""}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{r.email || "—"}</td>
                          <td className="px-3 py-2 text-[11px]">
                            {hasError ? (
                              <span className="text-red-500">{r.errors.join("; ")}</span>
                            ) : isConflict ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-amber-600 font-semibold">
                                  Already exists{r.existingName ? `: ${r.existingName}` : ""}
                                </span>
                                {isChecked ? (
                                  <button type="button" onClick={() => toggleReplace(i)}
                                    className="self-start text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all"
                                    style={isReplace
                                      ? { background: MAROON, color: "#fff", borderColor: MAROON }
                                      : { background: "#fff", color: MAROON, borderColor: MAROON }}>
                                    {isReplace ? "✓ Will replace" : "Replace"}
                                  </button>
                                ) : (
                                  <span className="text-gray-400">Will be skipped</span>
                                )}
                                {r.warnings.length > 0 && <span className="text-amber-500">{r.warnings.join("; ")}</span>}
                              </div>
                            ) : r.warnings.length > 0 ? (
                              <span className="text-amber-500">{r.warnings.join("; ")}</span>
                            ) : !isChecked ? (
                              <span className="text-gray-400">Will be skipped</span>
                            ) : (
                              <span className="text-gray-300">New</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="px-5 py-10 flex flex-col items-center justify-center gap-4">
              <RefreshCw size={20} className="animate-spin" style={{ color: MAROON }} />
              <p className="text-sm font-bold text-gray-700">Processing {progress.done} / {progress.total}...</p>
              <div className="w-full max-w-xs h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: MAROON }} />
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="px-5 py-8 flex flex-col gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Created",  value: results.created.length,  cls: "bg-green-50 text-green-600" },
                  { label: "Replaced", value: results.replaced.length, cls: "bg-blue-50 text-blue-600" },
                  { label: "Skipped",  value: results.skipped,         cls: "bg-gray-100 text-gray-500" },
                  { label: "Failed",   value: results.failed.length,   cls: "bg-red-50 text-red-600" },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl px-4 py-3 ${s.cls}`}>
                    <p className="text-xl font-black tabular-nums leading-none">{s.value}</p>
                    <p className="text-[11px] font-bold mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {results.failed.length > 0 && (
                <div className="border border-red-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Failed rows</p>
                  </div>
                  <div className="divide-y divide-red-50 max-h-40 overflow-y-auto">
                    {results.failed.map((f, i) => (
                      <div key={i} className="px-4 py-2">
                        <p className="text-xs font-semibold text-gray-700">{f.row.studentNo} — {f.row.lastName}, {f.row.firstName}</p>
                        <p className="text-[11px] text-red-500 font-medium">{f.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          {step === "preview" && (
            <>
              <button onClick={onClose} className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
              <button onClick={startImport} disabled={!canImport}
                className="flex-1 h-9 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: MAROON }}>
                <Upload size={13} />
                {unresolved > 0
                  ? `Resolve ${unresolved} existing first`
                  : `Import ${newCount} new${replaceCount > 0 ? ` + replace ${replaceCount}` : ""}`}
              </button>
            </>
          )}
          {step === "done" && (
            <button onClick={onClose} className="flex-1 h-9 rounded-xl text-sm font-black text-white transition-all" style={{ background: MAROON }}>Done</button>
          )}
          {(step === "upload" || step === "importing") && (
            <button onClick={onClose} disabled={step === "importing"}
              className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROW MENU
───────────────────────────────────────────────────────────────────────────── */
function RowMenu({ onView, onDelete }: { onView: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-rowmenu]") && !btnRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuW = 160; const menuH = 110;
    const vw = window.innerWidth; const vh = window.innerHeight;
    let left = rect.right - menuW; let top = rect.bottom + 4;
    if (top + menuH > vh) top = rect.top - menuH - 4;
    if (left < 8) left = rect.left;
    if (left + menuW > vw) left = vw - menuW - 8;
    setPos({ top, left }); setOpen(o => !o);
  };

  return (
    <>
      <div className="flex justify-end">
        <button ref={btnRef} type="button" onClick={handleOpen}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${open ? "bg-[#7b1113] text-white" : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"}`}>
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>
      {open && (
        <div data-rowmenu="true"
          className="fixed w-40 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 overflow-hidden"
          style={{ top: pos.top, left: pos.left, zIndex: 9999 }}>
          <button type="button" onClick={() => { onView(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 text-left">
            <Eye className="w-3.5 h-3.5 text-gray-400" /> View Profile
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button type="button" onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 text-left">
            <Trash2 className="w-3.5 h-3.5 text-red-400" /> Delete
          </button>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteModal({ student, onClose, onDeleted }: {
  student: Student; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed."); setDeleting(false); return; }
      onDeleted();
    } catch { setError("Network error."); setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/25"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 p-6 w-full sm:w-80">
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-50">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-sm font-bold text-gray-900 mb-1">Delete this student?</p>
        <p className="text-xs text-gray-400 mb-3 font-medium">{student.name} — {student.studentNumber}</p>
        <p className="text-xs text-gray-400 mb-5 leading-relaxed">This action is permanent and cannot be undone.</p>
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={deleting}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all min-h-11 sm:min-h-0">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-11 sm:min-h-0"
            style={{ background: "#ef4444" }}>
            {deleting ? <><RefreshCw size={12} className="animate-spin" /> Deleting...</> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function AdminStudentsPage() {
  const [students,      setStudents]      = useState<Student[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [search,        setSearch]        = useState("");
  const [courseFilter,  setCourseFilter]  = useState("");
  const [genderFilter,  setGenderFilter]  = useState("");
  const [page,          setPage]          = useState(1);
  const [showFilters,   setShowFilters]   = useState(false);
  const [showShare,     setShowShare]     = useState(false);
  const [showImport,    setShowImport]    = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState<Student | null>(null);
  const [viewedStudent, setViewedStudent] = useState<Student | null>(null);
  const [selected,      setSelected]      = useState<Set<string>>(new Set());

  const fetchStudents = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/admin/students");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setStudents(data.students ?? []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load students."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const courses = [...new Set(students.map(s => s.course).filter(Boolean))] as string[];

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.studentNumber.toLowerCase().includes(q)
      || (s.course ?? "").toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q);
    return matchQ && (!courseFilter || s.course === courseFilter) && (!genderFilter || s.gender === genderFilter);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = useCallback((id: string) => {
    setSelected(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const toggleAll = () => setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(s => s.id)));

  const handleDeleted = () => {
    if (!deleteTarget) return;
    setStudents(prev => prev.filter(s => s.id !== deleteTarget.id));
    setSelected(prev => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
    if (viewedStudent?.id === deleteTarget.id) setViewedStudent(null);
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    if (!selected.size || !confirm(`Delete ${selected.size} student(s)?`)) return;
    const ids = [...selected];
    await Promise.all(ids.map(id => fetch(`/api/admin/students/${id}`, { method: "DELETE" })));
    setStudents(prev => prev.filter(s => !ids.includes(s.id)));
    setSelected(new Set());
  };

  const hasActiveFilter = courseFilter || genderFilter;

  /* ── Full detail view when a student is selected ── */
  if (viewedStudent) {
    return (
      <>
        <StudentDetailView
          student={viewedStudent}
          onBack={() => setViewedStudent(null)}
          onDelete={() => setDeleteTarget(viewedStudent)}
        />
        {deleteTarget && (
          <DeleteModal
            student={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={() => { handleDeleted(); setViewedStudent(null); }}
          />
        )}
      </>
    );
  }

  /* ── List view ── */
  return (
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5 truncate" style={{ color: MAROON }}>Administration</p>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">Student Records</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={fetchStudents}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Bulk Register button */}
          <button type="button" onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-white px-2.5 sm:px-3 py-1.5 rounded-lg transition-all"
            style={{ background: MAROON }}>
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bulk Register</span>
            <span className="sm:hidden">CSV</span>
          </button>

          {/* Student Form Link button */}
          <button type="button" onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all">
            <Link2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Student Form Link</span>
            <span className="sm:hidden">Form</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            { label: "Total Students",   value: students.length, icon: <Users className="w-4 h-4" /> },
            { label: "Filtered Results", value: filtered.length, icon: <Search className="w-4 h-4" /> },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
              <div className="rounded-lg p-2 sm:p-2.5 shrink-0" style={{ background: "#f3f4f6", color: MAROON }}>{s.icon}</div>
              <div>
                <p className="text-xl sm:text-2xl font-black tabular-nums leading-none text-gray-900">{s.value}</p>
                <p className="text-xs sm:text-sm font-semibold mt-0.5 text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">

          {/* Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-white flex-wrap">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 sm:flex-none sm:w-56 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search students..."
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
              {search && <button type="button" onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0"><X className="w-3 h-3" /></button>}
            </div>
            <button type="button" onClick={() => setShowFilters(f => !f)}
              style={(showFilters || hasActiveFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0
                ${!(showFilters || hasActiveFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700" : ""}`}>
              <ArrowUpDown className="w-3 h-3" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
            </button>
          </div>

          {showFilters && (
            <div className="px-4 sm:px-5 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Filter by</span>
              <select value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setPage(1); }}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none">
                <option value="">All Courses</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={genderFilter} onChange={e => { setGenderFilter(e.target.value); setPage(1); }}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none">
                <option value="">All Genders</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {hasActiveFilter && (
                <button type="button" onClick={() => { setCourseFilter(""); setGenderFilter(""); }}
                  style={{ color: MAROON }} className="text-[11px] font-bold hover:underline whitespace-nowrap">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-4 sm:px-5 py-2.5 shrink-0" style={{ background: MAROON }}>
              <span className="text-xs font-bold text-white tabular-nums">{selected.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-[11px] font-bold transition-all border border-red-400/40">
                  <Trash2 className="w-3 h-3" /> Delete Selected
                </button>
                <button type="button" onClick={() => setSelected(new Set())}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 py-20">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-xs font-medium">Loading students...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-xs font-medium text-red-500 py-20">{error}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop Table */}
              <div className="hidden sm:block">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <th className="pl-5 pr-3 py-3 w-9">
                        <input type="checkbox"
                          checked={selected.size === paginated.length && paginated.length > 0}
                          onChange={toggleAll}
                          className="w-3.5 h-3.5 cursor-pointer rounded" style={{ accentColor: MAROON }} />
                      </th>
                      {["Student No.", "Name", "Email", "Gender", "Course", "Enrolled", ""].map((h, i) => (
                        <th key={i} className="text-left px-3 py-3">
                          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-600">
                            {h} {h && h !== "" && <ArrowUpDown className="w-3 h-3" />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-8 h-8 text-gray-200" />
                            <p className="text-sm text-gray-300 font-medium">No students found</p>
                          </div>
                        </td>
                      </tr>
                    ) : paginated.map(s => (
                      <tr key={s.id} style={{ borderBottom: "1px solid #f9fafb" }}
                        className={`transition-colors ${selected.has(s.id) ? "bg-red-50/30" : "hover:bg-gray-50/70"}`}>
                        <td className="pl-5 pr-3 py-3.5">
                          <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)}
                            className="w-3.5 h-3.5 cursor-pointer rounded" style={{ accentColor: MAROON }} />
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{s.studentNumber}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <button type="button" onClick={() => setViewedStudent(s)} className="flex items-center gap-3 text-left group/name">
                            <StudentAvatar name={s.name} photoUrl={s.photoUrl} />
                            <span className="text-sm font-semibold text-gray-900 group-hover/name:underline underline-offset-2 leading-tight"
                              style={{ textDecorationColor: MAROON }}>
                              {s.name}{s.extensionName ? <span className="text-gray-400 font-normal ml-1">{s.extensionName}</span> : null}
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-xs text-gray-500">{s.email ?? <span className="text-gray-200">—</span>}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          {s.gender
                            ? <span className="text-xs text-gray-600">{s.gender}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3.5">
                          {s.course || s.department
                            ? <span className="text-xs text-gray-600">{s.course ?? s.department}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">{formatDate(s.createdAt)}</span>
                        </td>
                        <td className="px-3 py-3.5 w-12">
                          <RowMenu
                            onView={() => setViewedStudent(s)}
                            onDelete={() => setDeleteTarget(s)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden p-3 space-y-2">
                {paginated.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-16">
                    <Users className="w-8 h-8 text-gray-200" />
                    <p className="text-sm text-gray-300 font-medium">No students found</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 pb-1">
                      <input type="checkbox"
                        checked={selected.size === paginated.length && paginated.length > 0}
                        onChange={toggleAll}
                        className="w-3.5 h-3.5 cursor-pointer rounded" style={{ accentColor: MAROON }} />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Select all</span>
                    </div>
                    {paginated.map(s => (
                      <div key={s.id}
                        className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors ${selected.has(s.id) ? "border-[#7b1113]/30 bg-red-50/20" : "border-gray-200"}`}>
                        <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)}
                          className="w-3.5 h-3.5 cursor-pointer rounded mt-0.5 shrink-0" style={{ accentColor: MAROON }} />
                        <button type="button" onClick={() => setViewedStudent(s)} className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2.5 mb-2">
                            <StudentAvatar name={s.name} photoUrl={s.photoUrl} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                {s.name}{s.extensionName ? <span className="text-gray-400 font-normal ml-1">{s.extensionName}</span> : null}
                              </p>
                              <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{s.studentNumber}</span>
                            </div>
                          </div>
                          {s.email && <p className="text-[11px] text-gray-400 mb-1.5 truncate">{s.email}</p>}
                          <p className="text-[11px] text-gray-500 truncate">
                            {[s.course, s.gender].filter(Boolean).join(" · ")}
                          </p>
                        </button>
                        <RowMenu
                          onView={() => setViewedStudent(s)}
                          onDelete={() => setDeleteTarget(s)} />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-100 bg-white shrink-0 flex-wrap gap-2">
              <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-25 transition-all">
                  <ChevronLeft className="w-3 h-3" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const n = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  return (
                    <button key={n} type="button" onClick={() => setPage(n)}
                      style={page === n ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-semibold transition-all border ${page !== n ? "border-gray-200 text-gray-500 hover:border-gray-400" : ""}`}>
                      {n}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-25 transition-all">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {deleteTarget && (
        <DeleteModal student={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />
      )}
      {showShare && (
        <ShareFormLinkModal onClose={() => setShowShare(false)} />
      )}
      {showImport && (
         <ImportCsvModal
          students={students}
          onClose={() => setShowImport(false)}
          onImported={(created, replaced) =>
            setStudents(prev => [
              ...created,
              ...prev.map(s => replaced.find(r => r.id === s.id) ?? s),
            ])
          }
        />
      )}
    </div>
  );
}