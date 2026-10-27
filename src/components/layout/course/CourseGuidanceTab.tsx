"use client";

// src/components/layout/course/CourseGuidanceTab.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, Trash2, Check, ArrowLeft,
  SlidersHorizontal, X, Download, GraduationCap, AlertTriangle, Eye,
  ExternalLink, MoreVertical, Copy, Inbox, CheckCircle2, AlertCircle,
  QrCode, Clock, Archive,
} from "lucide-react";
import { FONT } from "./osaShared";

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

const MAROON    = C.brand;
const PAGE_SIZE = 15;

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface Sibling {
  name:       string;
  schoolWork: string;
  age:        string;
}

interface EducLevel {
  level:  string;
  school: string;
  years:  string;
}

interface EducBackground {
  elementary?: EducLevel[];
  juniorHigh?: EducLevel[];
  seniorHigh?: EducLevel[];
  tertiary?:   EducLevel[];
  techVoc?:    EducLevel[];
}

interface GuidanceSheet {
  id:               string;
  courseId:         string;
  studentNo:        string;
  courseProgram:    string | null;
  yearSection:      string | null;
  name:             string;
  nickname:         string | null;
  age:              number | null;
  dateOfBirth:      string | null;
  placeOfBirth:     string | null;
  birthOrder:       string | null;
  mobileNo:         string | null;
  email:            string | null;
  sex:              string | null;
  religion:         string | null;
  completeAddress:  string | null;
  fatherName:       string | null;
  fatherDOB:        string | null;
  fatherAddress:    string | null;
  fatherContact:    string | null;
  fatherEduc:       string | null;
  fatherOccupation: string | null;
  fatherIncome:     string | null;
  fatherLanguage:   string | null;
  fatherReligion:   string | null;
  fatherOFW:        string | null;
  fatherYearsAbroad:string | null;
  motherName:       string | null;
  motherDOB:        string | null;
  motherAddress:    string | null;
  motherContact:    string | null;
  motherEduc:       string | null;
  motherOccupation: string | null;
  motherIncome:     string | null;
  motherLanguage:   string | null;
  motherReligion:   string | null;
  motherOFW:        string | null;
  motherYearsAbroad:string | null;
  maritalStatus:    string | null;
  siblings:         Sibling[];
  guardianName:     string | null;
  guardianContact:  string | null;
  guardianAddress:  string | null;
  emergencyPerson:  string | null;
  emergencyContact: string | null;
  educBackground:   EducBackground;
  photoUrl:         string | null;
  status:           string;
  allowResubmit:    boolean;
  submittedAt:      string;
  updatedAt:        string;
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
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const SLATE = C.ink;
const MUTED = C.muted;
const RULE  = C.line;

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="min-w-0 py-2.5" style={{ borderBottom: `1px solid ${C.lineSoft}` }}>
      <p className="text-[11px] font-medium mb-0.5" style={{ color: C.muted }}>{label}</p>
      <p className="text-[13px] font-medium break-words" style={{ color: C.ink, lineHeight: 1.5 }}>{String(value)}</p>
    </div>
  );
}
const InfoRow = Field;

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 sm:px-5 py-3 border-b" style={{ borderColor: C.lineSoft, background: "#fff" }}>
      <h2 className="text-sm font-bold" style={{ color: C.ink }}>{title}</h2>
    </div>
  );
}

function RightSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border overflow-hidden mb-4" style={{ borderColor: C.line }}>
      <header className="px-4 sm:px-5 py-3 border-b" style={{ borderColor: C.lineSoft }}>
        <h2 className="text-sm font-bold" style={{ color: C.ink }}>{title}</h2>
      </header>
      <div className="px-4 sm:px-5 py-2">{children}</div>
    </section>
  );
}

type Tab = "ALL" | "SUBMITTED" | "REVIEWED" | "ARCHIVED";

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: ReactNode }> = {
  SUBMITTED: { label: "Submitted", color: "#1e40af", bg: "#dbeafe", icon: <Clock size={11} /> },
  REVIEWED:  { label: "Reviewed",  color: "#065f46", bg: "#d1fae5", icon: <Check size={11} /> },
  ARCHIVED:  { label: "Archived",  color: "#374151", bg: "#f3f4f6", icon: <Archive size={11} /> },
};
const STATUS_TABS: Tab[] = ["ALL", "SUBMITTED", "REVIEWED", "ARCHIVED"];

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.SUBMITTED;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}>
      {m.icon} {m.label}
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
    <div role="status"
      className="fixed left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold text-white"
      style={{ background: isErr ? C.danger : C.ink, bottom: "calc(24px + env(safe-area-inset-bottom))", fontFamily: FONT }}>
      {isErr ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      {toast.msg}
    </div>
  );
}

function SheetModal({
  onClose, tone = "brand", icon, title, subtitle, children, footer, maxWidth = "max-w-md",
}: {
  onClose: () => void; tone?: "brand" | "danger"; icon?: ReactNode; title: string;
  subtitle?: string; children: ReactNode; footer?: ReactNode; maxWidth?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const accent = tone === "danger" ? C.danger : C.brand;
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40"
      style={{ backdropFilter: "blur(3px)", fontFamily: FONT }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} sm:mx-4 overflow-hidden flex flex-col max-h-[92vh]`}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 shrink-0" style={{ background: accent, color: "#fff" }}>
          <div className="flex items-center gap-3 min-w-0">
            {icon && <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/20">{icon}</div>}
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
          <div className="border-t shrink-0 bg-gray-50" style={{ borderColor: C.line, paddingBottom: "env(safe-area-inset-bottom)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({
  title, message, confirmLabel, busy, error, onConfirm, onClose,
}: {
  title: string; message: ReactNode; confirmLabel: string; busy?: boolean;
  error?: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <SheetModal onClose={onClose} tone="danger" icon={<Trash2 size={16} />} title={title} maxWidth="max-w-sm"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={busy}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60" style={{ background: C.danger }}>
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      }>
      <div className="px-5 py-5 text-sm leading-relaxed" style={{ color: C.body }}>
        {message}
        {error && <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      </div>
    </SheetModal>
  );
}

function DeleteModal({
  sheet, courseId, onClose, onDeleted,
}: { sheet: GuidanceSheet; courseId: string; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/guidance-sheets/${sheet.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to delete."); setDeleting(false); return;
      }
      onDeleted();
    } catch { setError("Network error. Please try again."); setDeleting(false); }
  };

  return (
    <ConfirmModal
      title="Delete this submission?" confirmLabel="Delete" busy={deleting} error={error}
      message={<><strong>{sheet.name}</strong> — Student No. {sheet.studentNo}<br />This can’t be undone.</>}
      onConfirm={handleDelete} onClose={() => { if (!deleting) onClose(); }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DETAIL VIEW — full individual information sheet
───────────────────────────────────────────────────────────────────────────── */
function SheetDetailView({
  sheet, courseId, isHead, onBack, onUpdated, onDeleted,
}: {
  sheet:     GuidanceSheet;
  courseId:  string;
  isHead:    boolean;
  onBack:    () => void;
  onUpdated: (updated: GuidanceSheet) => void;
  onDeleted: (id: string) => void;
}) {
  const [showDelete,   setShowDelete]   = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [dlFilename,   setDlFilename]   = useState("");
  const [patching,     setPatching]     = useState(false);
  const [local,        setLocal]        = useState(sheet);
  const [showPreview,    setShowPreview]    = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError,   setPreviewError]   = useState("");

  const patch = async (data: { allowResubmit?: boolean; status?: string }) => {
    setPatching(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/guidance-sheets/${sheet.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const d = await res.json();
      setLocal(d.sheet);
      onUpdated(d.sheet);
    } finally { setPatching(false); }
  };

  const defaultName = `IIS_${local.name.replace(/\s+/g, "_")}_${local.studentNo}`;

  const openPreview = async () => {
    setShowPreview(true);
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewBlobUrl(null);
    try {
      const url = `/api/courses/${courseId}/guidance-sheets/${local.id}/export?filename=${encodeURIComponent(defaultName)}`;
      console.log("EXPORT URL:", url);
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        console.error("EXPORT FAILED", res.status, text.slice(0, 500));
        let msg = `Failed (${res.status})`;
        try { msg = JSON.parse(text).error ?? msg; } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const pdf  = new Blob([blob], { type: "application/pdf" });
      setPreviewBlobUrl(URL.createObjectURL(pdf));
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Failed to load the PDF preview. Please try again.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setShowDownload(false);
    setShowPreview(false);
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    setPreviewBlobUrl(null);
  };

  const confirmDownload = () => {
    if (!previewBlobUrl) return;
    const name = (dlFilename.trim() || defaultName).replace(/\.pdf$/i, "");
    const a = document.createElement("a");
    a.href = previewBlobUrl;
    a.download = `${name}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setShowDownload(false);
  };

  const educ = (local.educBackground ?? {}) as EducBackground;
  const siblings: Sibling[] = Array.isArray(local.siblings) ? local.siblings : [];

  const ghostBtn =
    "flex items-center gap-1.5 text-xs font-semibold px-3 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50";

  const actionButtons = (
    <>
      <button onClick={openPreview} className={ghostBtn}><Eye size={13} /> Preview PDF</button>
      {isHead && local.status !== "REVIEWED" && (
        <button onClick={() => patch({ status: "REVIEWED" })} disabled={patching}
          className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-8 rounded-lg text-white disabled:opacity-50"
          style={{ background: C.brand }}>
          <Check size={13} /> Mark reviewed
        </button>
      )}
      {isHead && !local.allowResubmit && (
        <button onClick={() => patch({ allowResubmit: true })} disabled={patching} className={ghostBtn}>
          Allow resubmit
        </button>
      )}
      {local.allowResubmit && (
        <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
          <AlertTriangle size={11} /> Resubmission allowed
        </span>
      )}
      {isHead && (
        <button onClick={() => setShowDelete(true)} aria-label="Delete submission"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={14} />
        </button>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT, background: C.canvas }}>

      {/* ── Top bar ── */}
      <div className="shrink-0 bg-white border-b px-4 sm:px-6 py-3" style={{ borderColor: C.line }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold shrink-0" style={{ color: C.brand }}>
            <ArrowLeft size={15} /> Back
          </button>
          <span className="w-px h-4 shrink-0" style={{ background: C.line }} />
          <p className="text-sm font-bold flex-1 truncate min-w-0" style={{ color: C.ink }}>{local.name}</p>
          <StatusBadge status={local.status} />
          <div className="hidden sm:flex items-center gap-2">{actionButtons}</div>
        </div>
        <div className="flex sm:hidden items-center gap-1.5 flex-wrap mt-2.5">{actionButtons}</div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto" style={{ background: C.canvas }}>
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-0 min-h-full">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-1 lg:border-r border-gray-200 flex flex-col" style={{ background: "#fff" }}>

            <SectionHeader title="Student Information" />

            {/* Photo + Name */}
            <div className="px-4 sm:px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${RULE}` }}>
              {local.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={local.photoUrl}
                  alt="Passport photo"
                  style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: `1px solid ${RULE}`, flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 8, background: "#f1f5f9", border: `1px solid ${RULE}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <GraduationCap size={22} style={{ color: MUTED }} />
                </div>
              )}
              <div className="min-w-0">
                <p style={{ fontSize: 14, fontWeight: 700, color: SLATE, lineHeight: 1.3 }} className="truncate">{local.name}</p>
                {local.courseProgram && <p style={{ fontSize: 11, color: MUTED, marginTop: 3 }} className="truncate">{local.courseProgram}</p>}
                {local.yearSection   && <p style={{ fontSize: 11, color: MUTED }} className="truncate">{local.yearSection}</p>}
              </div>
            </div>

            {/* Left info fields */}
            <div className="px-4 sm:px-5 py-2">
              <Field label="Student No."            value={local.studentNo} />
              <Field label="Course / Program"       value={local.courseProgram} />
              <Field label="Year & Section"         value={local.yearSection} />
              <Field label="Nickname"               value={local.nickname} />
              <Field label="Age"                    value={local.age} />
              <Field label="Date of Birth"          value={local.dateOfBirth ? fmtDate(local.dateOfBirth) : null} />
              <Field label="Place of Birth"         value={local.placeOfBirth} />
              <Field label="Sex"                    value={local.sex} />
              <Field label="Religion"               value={local.religion} />
              <Field label="Mobile No."             value={local.mobileNo} />
              <Field label="Email"                  value={local.email} />
              <Field label="Complete Address"       value={local.completeAddress} />
              <Field label="Birth Order"            value={local.birthOrder} />
              <Field label="Submitted"              value={fmtDate(local.submittedAt)} />
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="lg:col-span-2 overflow-y-auto">
            <div className="px-4 sm:px-5 pt-4 pb-1">
              <h2 className="text-base font-bold" style={{ color: C.ink }}>Full information sheet</h2>
            </div>
            <div className="p-4 sm:p-5">

              <RightSection title="Father's Information">
                <InfoRow label="Name"                   value={local.fatherName} />
                <InfoRow label="Date of Birth"          value={local.fatherDOB ? fmtDate(local.fatherDOB) : null} />
                <InfoRow label="Address"                value={local.fatherAddress} />
                <InfoRow label="Contact No."            value={local.fatherContact} />
                <InfoRow label="Educational Attainment" value={local.fatherEduc} />
                <InfoRow label="Occupation"             value={local.fatherOccupation} />
                <InfoRow label="Monthly Income"         value={local.fatherIncome} />
                <InfoRow label="Language Spoken"        value={local.fatherLanguage} />
                <InfoRow label="Religion"               value={local.fatherReligion} />
                <InfoRow label="OFW / Country"          value={local.fatherOFW} />
                <InfoRow label="Years Abroad"           value={local.fatherYearsAbroad} />
              </RightSection>

              <RightSection title="Mother's Information">
                <InfoRow label="Name"                   value={local.motherName} />
                <InfoRow label="Date of Birth"          value={local.motherDOB ? fmtDate(local.motherDOB) : null} />
                <InfoRow label="Address"                value={local.motherAddress} />
                <InfoRow label="Contact No."            value={local.motherContact} />
                <InfoRow label="Educational Attainment" value={local.motherEduc} />
                <InfoRow label="Occupation"             value={local.motherOccupation} />
                <InfoRow label="Monthly Income"         value={local.motherIncome} />
                <InfoRow label="Language Spoken"        value={local.motherLanguage} />
                <InfoRow label="Religion"               value={local.motherReligion} />
                <InfoRow label="OFW / Country"          value={local.motherOFW} />
                <InfoRow label="Years Abroad"           value={local.motherYearsAbroad} />
              </RightSection>

              {local.maritalStatus && (
                <RightSection title="Parents' Marital Status">
                  <p style={{ fontSize: 13, color: SLATE, fontWeight: 500, lineHeight: 1.5 }}>{local.maritalStatus}</p>
                </RightSection>
              )}

              {siblings.some(s => s.name) && (
                <RightSection title="Siblings">
                  {/* Mobile: stacked cards */}
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
                      {["Name","School / Work","Age"].map(h => (
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

              <RightSection title="Guardian Information">
                <InfoRow label="Name of Guardian"         value={local.guardianName} />
                <InfoRow label="Contact No."              value={local.guardianContact} />
                <InfoRow label="Address"                  value={local.guardianAddress} />
                <InfoRow label="Emergency Contact Person" value={local.emergencyPerson} />
                <InfoRow label="Emergency Contact No."    value={local.emergencyContact} />
              </RightSection>

              {(educ.elementary?.some(r => r.school) ||
                educ.juniorHigh?.some(r => r.school) ||
                educ.seniorHigh?.some(r => r.school) ||
                educ.tertiary?.some(r => r.school)   ||
                educ.techVoc?.some(r => r.school)) && (
                <RightSection title="Educational Background">
                  {/* Mobile: stacked */}
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
                  {/* Desktop: table */}
                  <div className="hidden sm:block">
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      {["Level","School Attended","Years"].map(h => (
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

            </div>
          </div>
        </div>
      </div>

      {showDelete && (
        <DeleteModal
          sheet={local}
          courseId={courseId}
          onClose={() => setShowDelete(false)}
          onDeleted={() => { setShowDelete(false); onDeleted(local.id); onBack(); }}
        />
      )}

            {/* ── PDF Preview Modal ── */}
      {showPreview && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.6)", padding: 16, fontFamily: FONT }}
          onClick={closePreview}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 900, height: "90dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: MAROON, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <GraduationCap size={14} style={{ color: "rgba(255,255,255,.7)", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Individual Information Sheet — {local.name}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <button
                  type="button"
                  disabled={!previewBlobUrl}
                  onClick={() => previewBlobUrl && window.open(previewBlobUrl, "_blank", "noopener,noreferrer")}
                  style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", opacity: previewBlobUrl ? 1 : 0.4 }}
                >
                  <ExternalLink size={11} /> Open
                </button>
                <button
                  type="button"
                  disabled={!previewBlobUrl}
                  onClick={() => { setDlFilename(defaultName); setShowDownload(true); }}
                  style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", opacity: previewBlobUrl ? 1 : 0.4 }}
                >
                  <Download size={11} /> Download
                </button>
                <button onClick={closePreview} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.6)" }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflow: "hidden", background: "#f3f4f6", minHeight: 0 }}>
              {previewLoading ? (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#9ca3af" }}>
                  <RefreshCw size={22} className="animate-spin" />
                  <p style={{ fontSize: 13 }}>Generating PDF…</p>
                </div>
              ) : previewError ? (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#ef4444", padding: 24, textAlign: "center" }}>
                  <AlertTriangle size={28} />
                  <p style={{ fontSize: 13 }}>{previewError}</p>
                  <button onClick={openPreview}
                    style={{ fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 10, color: "#fff", background: MAROON, border: "none", cursor: "pointer" }}>
                    Try again
                  </button>
                </div>
              ) : previewBlobUrl ? (
                <iframe src={previewBlobUrl} title="PDF Preview" style={{ width: "100%", height: "100%", border: "none" }} />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Download Name Panel (lalabas lang kapag pinindot ang Download sa preview) ── */}
      {showDownload && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.5)", padding: 16, fontFamily: FONT }}
          onClick={() => setShowDownload(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, padding: 20, boxShadow: "0 20px 50px rgba(0,0,0,.3)" }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Download file</p>
            <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>
              Pwede mong palitan ang pangalan ng file bago i-download.
            </p>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid #d1d5db", borderRadius: 10, overflow: "hidden" }}>
              <input
                type="text"
                value={dlFilename}
                onChange={e => setDlFilename(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") confirmDownload(); }}
                autoFocus
                style={{ flex: 1, fontSize: 13, padding: "10px 12px", border: "none", outline: "none" }}
              />
              <span style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#94a3b8", background: "#f8fafc", borderLeft: "1px solid #d1d5db" }}>
                .pdf
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowDownload(false)}
                style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", color: "#4b5563", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDownload}
                style={{ fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 10, border: "none", background: MAROON, color: "#fff", cursor: "pointer" }}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShareLinkModal({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/forms/guidance/${courseId}`;
  const [copied,    setCopied]    = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  useEffect(() => {
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}&color=7b1113&bgcolor=ffffff&margin=10`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 260; canvas.height = 260;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      setQrDataUrl(canvas.toDataURL("image/png"));
      setQrLoading(false);
    };
    img.onerror = () => setQrLoading(false);
    img.src = apiUrl;
  }, [url]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl; a.download = `information-sheet-qr-${courseId}.png`; a.click();
  };

  return (
    <SheetModal onClose={onClose} icon={<QrCode size={16} />} title="Form link" subtitle="Individual information sheet"
      footer={<button onClick={onClose} className="w-full h-11 sm:h-10 text-xs font-semibold text-gray-600 hover:bg-gray-100">Close</button>}>
      <div className="px-5 py-5 space-y-5">
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
          Share this link or QR code with enrollees so they can fill out their Individual Information Sheet.
        </p>
        <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 bg-gray-50" style={{ borderColor: C.line }}>
          <p className="text-xs font-mono flex-1 break-all" style={{ color: C.body }}>{url}</p>
          <button onClick={copy}
            className="shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
            style={copied ? { background: "#dcfce7", color: "#15803d" } : { background: C.brandTint, color: C.brand }}>
            {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
          </button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-xl border flex items-center justify-center bg-white overflow-hidden" style={{ borderColor: C.line }}>
            {qrLoading ? (
              <div className="w-8 h-8 rounded-full border-2 border-gray-200 animate-spin" style={{ borderTopColor: C.brand }} />
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR code" className="w-full h-full object-contain" />
            ) : (
              <p className="text-[11px] text-gray-400 text-center px-4">Couldn’t generate the QR code. Check your connection and reopen this window.</p>
            )}
          </div>
          <button onClick={downloadQR} disabled={!qrDataUrl || qrLoading}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition-all disabled:opacity-40"
            style={{ borderColor: C.brand, color: C.brand }}>
            <Download size={12} /> Download QR code
          </button>
        </div>
      </div>
    </SheetModal>
  );
}

export default function CourseGuidanceTab({ courseId, isHead }: Props) {
  const [sheets,        setSheets]        = useState<GuidanceSheet[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [search,        setSearch]        = useState("");
  const [statusTab,     setStatusTab]     = useState<Tab>("ALL");
  const [programFilter, setProgramFilter] = useState("");
  const [showFilters,   setShowFilters]   = useState(false);
  const [showShare,     setShowShare]     = useState(false);
  const [detailSheet,   setDetailSheet]   = useState<GuidanceSheet | null>(null);
  const [page,          setPage]          = useState(1);
  const [toast,         setToast]         = useState<ToastState>(null);
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [rowMenu,       setRowMenu]       = useState<{ id: string; x: number; y: number } | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<string[] | null>(null);
  const [deleting,      setDeleting]      = useState(false);

  const debouncedSearch = useDebounced(search, 300);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* Server: search lang. Status at program ay local para tama ang tab counts. */
  const fetchSheets = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res  = await fetch(`/api/courses/${courseId}/guidance-sheets?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load submissions.");
      setSheets(data.sheets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions.");
    } finally { setLoading(false); }
  }, [courseId, debouncedSearch]);

  useEffect(() => { fetchSheets(); }, [fetchSheets]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [debouncedSearch, statusTab, programFilter]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setRowMenu(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const baseFiltered = useMemo(
    () => sheets.filter(s => !programFilter || s.courseProgram === programFilter),
    [sheets, programFilter],
  );

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { ALL: baseFiltered.length, SUBMITTED: 0, REVIEWED: 0, ARCHIVED: 0 };
    baseFiltered.forEach(s => { if (s.status in c) c[s.status as Tab] += 1; });
    return c;
  }, [baseFiltered]);

  const filtered   = useMemo(() => statusTab === "ALL" ? baseFiltered : baseFiltered.filter(s => s.status === statusTab), [baseFiltered, statusTab]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const programOptions = useMemo(
    () => [...new Set(sheets.map(s => s.courseProgram).filter((c): c is string => !!c))].sort(),
    [sheets],
  );

  const activeFilterCount = programFilter ? 1 : 0;
  const hasAnyFilter      = !!(search || statusTab !== "ALL" || activeFilterCount);
  const resetAll          = () => { setProgramFilter(""); setStatusTab("ALL"); setSearch(""); };

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) =>
    totalPages <= 5 || page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i,
  );

  const pageAllSelected  = paginated.length > 0 && paginated.every(s => selected.has(s.id));
  const pageSomeSelected = paginated.some(s => selected.has(s.id));

  const toggleOne = (id: string) =>
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglePage = () =>
    setSelected(prev => {
      const n = new Set(prev);
      if (pageAllSelected) paginated.forEach(s => n.delete(s.id)); else paginated.forEach(s => n.add(s.id));
      return n;
    });
  const selectAllFiltered = () => setSelected(new Set(filtered.map(s => s.id)));

  const openRowMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const flip = r.bottom + 140 > window.innerHeight;
    setRowMenu({ id, x: r.right, y: flip ? r.top - 136 : r.bottom + 4 });
  };

  const allowResubmit = async (sheet: GuidanceSheet) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/guidance-sheets/${sheet.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowResubmit: true }),
      });
      if (!res.ok) { notify("Couldn’t update the submission.", "error"); return; }
      const d = await res.json();
      setSheets(prev => prev.map(s => s.id === sheet.id ? d.sheet : s));
      notify("Resubmission allowed");
    } catch { notify("Couldn’t update the submission.", "error"); }
  };

  const deleteIds = async (ids: string[]) => {
    setDeleting(true);
    const results = await Promise.allSettled(
      ids.map(id =>
        fetch(`/api/courses/${courseId}/guidance-sheets/${id}`, { method: "DELETE" }).then(res => {
          if (!res.ok) throw new Error("Delete failed");
          return id;
        }),
      ),
    );
    const ok = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map(r => r.value);
    const failed = ids.length - ok.length;
    if (ok.length) setSheets(prev => prev.filter(s => !ok.includes(s.id)));
    setSelected(prev => { const n = new Set(prev); ok.forEach(id => n.delete(id)); return n; });
    setDeleting(false); setDeleteTarget(null);
    if (failed === 0) notify(ok.length === 1 ? "Submission deleted" : `${ok.length} submissions deleted`);
    else notify(`${failed} couldn’t be deleted. Please try again.`, "error");
  };

  const exportCSV = () => {
    const csv = [
      ["Student No.", "Name", "Course", "Year/Section", "Sex", "Age", "Email", "Mobile", "Status", "Submitted At"].join(","),
      ...filtered.map(s => [
        s.studentNo, s.name, s.courseProgram ?? "", s.yearSection ?? "",
        s.sex ?? "", s.age ?? "", s.email ?? "", s.mobileNo ?? "",
        s.status, fmtDate(s.submittedAt),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "guidance_submissions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const emptyState = sheets.length === 0 && !hasAnyFilter ? (
    <EmptyState
      title="No submissions yet"
      hint="Share the form link so enrollees can fill out their information sheet."
      action={
        <button onClick={() => setShowShare(true)}
          className="mt-2 flex items-center gap-1.5 text-xs font-bold px-4 h-9 rounded-lg text-white" style={{ background: C.brand }}>
          <QrCode size={13} /> Share form link
        </button>
      }
    />
  ) : (
    <EmptyState
      title="No matching submissions"
      hint="Try a different search or clear the filters."
      action={<button onClick={resetAll} className="mt-2 text-xs font-bold hover:underline" style={{ color: C.brand }}>Clear all filters</button>}
    />
  );

  /* ── Detail ── */
  if (detailSheet) {
    return (
      <>
        <SheetDetailView
          sheet={detailSheet} courseId={courseId} isHead={isHead}
          onBack={() => setDetailSheet(null)}
          onUpdated={u => setSheets(prev => prev.map(s => s.id === u.id ? u : s))}
          onDeleted={id => { setSheets(prev => prev.filter(s => s.id !== id)); setDetailSheet(null); }}
        />
        <Toast toast={toast} />
      </>
    );
  }

  /* ── List ── */
  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: C.canvas }}>

      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between shrink-0 gap-3" style={{ borderColor: C.line }}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Information sheets</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: C.faint }}>Review individual information sheets submitted by students.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchSheets} aria-label="Refresh"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 w-9 h-9 sm:w-auto sm:px-3 rounded-lg transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-9 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: C.brand }}>
            <QrCode className="w-3.5 h-3.5" />
            <span>Share<span className="hidden sm:inline"> form link</span></span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5 min-h-0">
        <div className="flex-1 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[420px]" style={{ borderColor: C.line }}>

          {/* Status tabs */}
          <div className="border-b overflow-x-auto" style={{ borderColor: C.line }}>
            <div role="tablist" className="flex px-2 sm:px-3 min-w-max">
              {STATUS_TABS.map(t => {
                const active = statusTab === t;
                return (
                  <button key={t} role="tab" aria-selected={active} onClick={() => setStatusTab(t)}
                    className="relative flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors"
                    style={{ color: active ? C.brand : C.muted }}>
                    {t === "ALL" ? "All" : STATUS_META[t].label}
                    <span className="text-[11px] tabular-nums px-1.5 rounded-full"
                      style={{ background: active ? C.brandTint : C.lineSoft, color: active ? C.brand : C.muted }}>
                      {counts[t]}
                    </span>
                    {active && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full" style={{ background: C.brand }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b flex items-center gap-2" style={{ borderColor: C.lineSoft }}>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-9 flex-1 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-colors min-w-0">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name or student no." aria-label="Search submissions"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button onClick={() => setShowFilters(f => !f)} aria-expanded={showFilters}
              style={(showFilters || activeFilterCount) ? { background: C.brand, color: "#fff", borderColor: C.brand } : {}}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${!(showFilters || activeFilterCount) ? "border-gray-200 text-gray-600 hover:border-gray-400" : ""}`}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-white/90 text-[10px] font-bold flex items-center justify-center" style={{ color: C.brand }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button onClick={exportCSV} disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-gray-400 transition-colors disabled:opacity-40 shrink-0">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>

          {/* Bulk action bar */}
          {isHead && selected.size > 0 && (
            <div className="px-3 sm:px-5 py-2.5 border-b flex items-center gap-3 flex-wrap" style={{ background: C.brandTint, borderColor: C.line }}>
              <span className="text-xs font-bold" style={{ color: C.brand }}>{selected.size} selected</span>
              {selected.size < filtered.length && (
                <button onClick={selectAllFiltered} className="text-xs font-semibold hover:underline" style={{ color: C.brand }}>
                  Select all {filtered.length}
                </button>
              )}
              <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-gray-500 hover:text-gray-700">Clear</button>
              <button onClick={() => setDeleteTarget(Array.from(selected))}
                className="ml-auto flex items-center gap-1.5 text-xs font-bold px-3 h-8 rounded-lg text-white" style={{ background: C.danger }}>
                <Trash2 size={13} /> Delete selected
              </button>
            </div>
          )}

          {/* Filter panel */}
          {showFilters && (
            <div className="px-3 sm:px-5 py-4 border-b bg-gray-50 space-y-4" style={{ borderColor: C.lineSoft }}>
              <div className="max-w-xs">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Course / program</label>
                <select value={programFilter} onChange={e => setProgramFilter(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10">
                  <option value="">All programs</option>
                  {programOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <button onClick={() => setProgramFilter("")} className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: C.brand }}>
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
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                  <div className="h-3 w-20 bg-gray-100 rounded hidden sm:block" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                  <div className="h-5 w-16 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={fetchSheets} className="text-xs font-bold px-4 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1">{emptyState}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop table */}
              <table className="w-full border-collapse hidden sm:table">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: "#fafafa" }}>
                    {isHead && (
                      <th scope="col" className="px-4 py-2.5 w-10 border-b" style={{ borderColor: C.line }}>
                        <input type="checkbox" aria-label="Select all on this page"
                          checked={pageAllSelected}
                          ref={el => { if (el) el.indeterminate = !pageAllSelected && pageSomeSelected; }}
                          onChange={togglePage} className="w-4 h-4 cursor-pointer" style={{ accentColor: C.brand }} />
                      </th>
                    )}
                    {["No.", "Student", "Student no.", "Course", "Year & section", "Submitted", "Status", ""].map((h, i) => (
                      <th key={i} scope="col" className="text-left px-4 py-2.5 whitespace-nowrap border-b"
                        style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s, i) => (
                    <tr key={s.id} onClick={() => setDetailSheet(s)} tabIndex={0}
                      onKeyDown={e => { if (e.key === "Enter") setDetailSheet(s); }}
                      className="group cursor-pointer hover:bg-gray-50 focus:bg-gray-50 outline-none transition-colors"
                      style={selected.has(s.id) ? { background: C.brandTint } : undefined}>
                      {isHead && (
                        <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" aria-label={`Select ${s.name}`}
                            checked={selected.has(s.id)} onChange={() => toggleOne(s.id)}
                            className="w-4 h-4 cursor-pointer" style={{ accentColor: C.brand }} />
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-xs tabular-nums border-b" style={{ color: C.faint, borderColor: C.lineSoft }}>
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3.5 border-b min-w-[180px]" style={{ borderColor: C.lineSoft }}>
                        <p className="text-[13px] font-semibold" style={{ color: C.ink }}>{s.name}</p>
                        {s.email && <p className="text-[11px] truncate max-w-[220px]" style={{ color: C.muted }}>{s.email}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono border-b whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>{s.studentNo}</td>
                      <td className="px-4 py-3.5 text-xs border-b max-w-[200px]" style={{ color: C.body, borderColor: C.lineSoft }}>
                        <span className="line-clamp-1">{s.courseProgram ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>{s.yearSection ?? "—"}</td>
                      <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>{fmtDate(s.submittedAt)}</td>
                      <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }}><StatusBadge status={s.status} /></td>
                      <td className="px-3 py-3.5 w-12 border-b" style={{ borderColor: C.lineSoft }}>
                        {isHead ? (
                          <button onClick={e => openRowMenu(e, s.id)} aria-label={`Actions for ${s.name}`} aria-haspopup="menu"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        ) : (
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 transition-colors" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3.5"
                    style={selected.has(s.id) ? { background: C.brandTint } : undefined}>
                    {isHead && (
                      <input type="checkbox" aria-label={`Select ${s.name}`}
                        checked={selected.has(s.id)} onChange={() => toggleOne(s.id)}
                        className="w-4 h-4 shrink-0" style={{ accentColor: C.brand }} />
                    )}
                    <button onClick={() => setDetailSheet(s)} className="flex-1 min-w-0 text-left active:opacity-70">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate" style={{ color: C.ink }}>{s.name}</p>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: C.muted }}>
                        {[s.studentNo, s.courseProgram, s.yearSection].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: C.faint }}>{fmtDate(s.submittedAt)}</p>
                    </button>
                    {isHead ? (
                      <button onClick={e => openRowMenu(e, s.id)} aria-label={`Actions for ${s.name}`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 shrink-0">
                        <MoreVertical size={16} />
                      </button>
                    ) : (
                      <ChevronRight size={16} className="text-gray-300 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t bg-white shrink-0 gap-2" style={{ borderColor: C.line }}>
              <span className="text-xs tabular-nums truncate" style={{ color: C.muted }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
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
                <span className="sm:hidden text-xs font-semibold px-2 tabular-nums" style={{ color: C.muted }}>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showShare && <ShareLinkModal courseId={courseId} onClose={() => setShowShare(false)} />}

      {/* Row actions menu */}
      {rowMenu && (() => {
        const s = sheets.find(x => x.id === rowMenu.id);
        return (
          <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)}>
            <div role="menu" className="absolute w-48 bg-white rounded-xl border shadow-lg py-1 overflow-hidden"
              style={{ top: rowMenu.y, left: Math.max(8, rowMenu.x - 192), borderColor: C.line, fontFamily: FONT }}
              onClick={e => e.stopPropagation()}>
              <button role="menuitem"
                onClick={() => { setRowMenu(null); if (s) setDetailSheet(s); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-gray-50"
                style={{ color: C.ink }}>
                <ExternalLink size={14} /> View full sheet
              </button>
              {s && !s.allowResubmit && (
                <button role="menuitem"
                  onClick={() => { setRowMenu(null); allowResubmit(s); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-gray-50"
                  style={{ color: C.ink }}>
                  <RefreshCw size={14} /> Allow resubmission
                </button>
              )}
              <button role="menuitem"
                onClick={() => { setDeleteTarget([rowMenu.id]); setRowMenu(null); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-red-50"
                style={{ color: C.danger }}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        );
      })()}

      {deleteTarget && (
        <ConfirmModal
          title={deleteTarget.length === 1 ? "Delete this submission?" : `Delete ${deleteTarget.length} submissions?`}
          confirmLabel={deleteTarget.length === 1 ? "Delete" : `Delete ${deleteTarget.length}`}
          busy={deleting}
          message={
            deleteTarget.length === 1 ? (
              <><strong>{sheets.find(s => s.id === deleteTarget[0])?.name ?? "This submission"}</strong> will be permanently removed.<br />This can’t be undone.</>
            ) : (
              <>{deleteTarget.length} selected submissions will be permanently removed.<br />This can’t be undone.</>
            )
          }
          onConfirm={() => deleteIds(deleteTarget)}
          onClose={() => { if (!deleting) setDeleteTarget(null); }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}