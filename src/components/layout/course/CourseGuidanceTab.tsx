"use client";

// src/components/layout/course/CourseGuidanceTab.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  Trash2, Check, ArrowLeft, Filter, X, Plus,
  GraduationCap, Download, AlertTriangle, Users,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const MAROON    = "#7b1113";
const FONT      = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
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
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/* ───────────────────────────────────────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    SUBMITTED: { bg: "#dbeafe", text: "#1e40af", label: "Submitted" },
    REVIEWED:  { bg: "#dcfce7", text: "#15803d", label: "Reviewed"  },
    ARCHIVED:  { bg: "#f3f4f6", text: "#6b7280", label: "Archived"  },
  };
  const s = map[status] ?? map.SUBMITTED;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROW ACTIONS MENU
───────────────────────────────────────────────────────────────────────────── */
function RowActionsMenu({
  onView, onAllowResubmit, onDelete,
}: {
  onView?:          () => void;
  onAllowResubmit?: () => void;
  onDelete?:        () => void;
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden py-1">
          {onView && (
            <button onClick={() => { setOpen(false); onView(); }}
              className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors"
              style={{ color: MAROON }}>
              View Full Sheet
            </button>
          )}
          {onAllowResubmit && (
            <button onClick={() => { setOpen(false); onAllowResubmit(); }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Allow Resubmission
            </button>
          )}
          {onDelete && (
            <button onClick={() => { setOpen(false); onDelete(); }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteModal({
  sheet, courseId, onClose, onDeleted,
}: {
  sheet: GuidanceSheet; courseId: string; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res = await fetch(
        `/api/courses/${courseId}/guidance-sheets/${sheet.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to delete.");
        setDeleting(false);
        return;
      }
      onDeleted();
    } catch {
      setError("Network error. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-200 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-80 overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-5 py-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-50">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-sm font-bold text-gray-900 mb-1">Delete this submission?</p>
          <p className="text-xs text-gray-500 mb-1 font-medium">{sheet.name}</p>
          <p className="text-xs text-gray-400 mb-5 leading-relaxed">
            Student No. {sheet.studentNo}<br />
            This action is permanent and cannot be undone.
          </p>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={deleting}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: "#ef4444" }}>
              {deleting
                ? <><RefreshCw size={12} className="animate-spin" /> Deleting...</>
                : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
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

  const SLATE = "#0f172a";
  const MUTED = "#64748b";
  const RULE  = "#e2e8f0";

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

  const educ = (local.educBackground ?? {}) as EducBackground;
  const siblings: Sibling[] = Array.isArray(local.siblings) ? local.siblings : [];

  function Field({ label, value }: { label: string; value?: string | number | null }) {
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
      <div className="px-5 py-3 border-b border-gray-100" style={{ background: "#fafafa" }}>
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
      <div className="flex gap-3 py-1.5" style={{ borderBottom: `1px solid #f8fafc` }}>
        <span style={{ fontSize: 11, color: MUTED, fontWeight: 500, width: 160, flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 12, color: SLATE, fontWeight: 600 }}>{String(value)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT, background: "#f8fafc" }}>

      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${RULE}` }}
        className="flex items-center gap-3 px-6 py-3 shrink-0 flex-wrap">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: MAROON }}>
          <ArrowLeft size={14} /> Back
        </button>
        <span style={{ width: 1, height: 16, background: RULE }} />
        <p className="text-sm font-bold flex-1 truncate" style={{ color: SLATE }}>{local.name}</p>
        {isHead && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => {
                setDlFilename(`IIS_${local.name.replace(/\s+/g, "_")}_${local.studentNo}`);
                setShowDownload(true);
              }}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all"
              style={{ borderColor: RULE, color: SLATE }}>
              <Download size={12} /> Download PDF
            </button>
            {local.status !== "REVIEWED" && (
              <button onClick={() => patch({ status: "REVIEWED" })} disabled={patching}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50"
                style={{ borderColor: MAROON, color: MAROON }}>
                <Check size={12} /> Mark Reviewed
              </button>
            )}
            {!local.allowResubmit && (
              <button onClick={() => patch({ allowResubmit: true })} disabled={patching}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-gray-400 transition-all disabled:opacity-50">
                Allow Resubmit
              </button>
            )}
            {local.allowResubmit && (
              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                <AlertTriangle size={11} /> Resubmission allowed
              </span>
            )}
            <button onClick={() => setShowDelete(true)}
              className="flex items-center gap-1 text-xs font-semibold transition-colors text-red-400 hover:text-red-600">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto" style={{ background: "#f1f5f9" }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-full">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-1 border-r border-gray-200 flex flex-col" style={{ background: "#fff" }}>

            <SectionHeader title="Student Information" />

            {/* Photo + Name */}
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${RULE}` }}>
              {local.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={local.photoUrl}
                  alt="Passport photo"
                  style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", border: `1px solid ${RULE}`, flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 8, background: "#f1f5f9", border: `1px solid ${RULE}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <GraduationCap size={24} style={{ color: MUTED }} />
                </div>
              )}
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: SLATE, lineHeight: 1.3 }}>{local.name}</p>
                {local.courseProgram && <p style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{local.courseProgram}</p>}
                {local.yearSection   && <p style={{ fontSize: 11, color: MUTED }}>{local.yearSection}</p>}
              </div>
            </div>

            {/* Left info fields */}
            <div className="flex-1 overflow-y-auto px-5 py-2">
              <Field label="Student No."            value={local.studentNo} />
              <Field label="Course / Program"       value={local.courseProgram} />
              <Field label="Year & Section"         value={local.yearSection} />
              <Field label="Nickname"               value={local.nickname} />
              <Field label="Age"                    value={local.age} />
              <Field label="Date of Birth"          value={local.dateOfBirth} />
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
            <div className="px-5 py-3 border-b border-gray-200 sticky top-0 z-10" style={{ background: "#fafafa" }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: MAROON }}>
                Full Information Sheet
              </p>
            </div>
            <div className="p-5">

              <RightSection title="Father's Information">
                <InfoRow label="Name"                   value={local.fatherName} />
                <InfoRow label="Date of Birth"          value={local.fatherDOB} />
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
                <InfoRow label="Date of Birth"          value={local.motherDOB} />
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
                  <p style={{ fontSize: 13, color: SLATE, fontWeight: 600 }}>{local.maritalStatus}</p>
                </RightSection>
              )}

              {siblings.some(s => s.name) && (
                <RightSection title="Siblings">
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    {["Name","School / Work","Age"].map(h => (
                      <span key={h} style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED }}>{h}</span>
                    ))}
                  </div>
                  {siblings.filter(s => s.name).map((s, i) => (
                    <div key={i} className="grid grid-cols-3 gap-3 py-1.5" style={{ borderTop: `1px solid ${RULE}`, fontSize: 12, color: SLATE }}>
                      <span>{s.name}</span>
                      <span>{s.schoolWork || "—"}</span>
                      <span>{s.age || "—"}</span>
                    </div>
                  ))}
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
                          <div key={i} className="grid grid-cols-3 gap-3 py-1" style={{ fontSize: 12, color: SLATE, borderTop: `1px solid ${RULE}` }}>
                            <span>{r.level || "—"}</span>
                            <span>{r.school || "—"}</span>
                            <span style={{ color: MUTED }}>{r.years || "—"}</span>
                          </div>
                        ))}
                      </div>
                    ))
                  }
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

      {showDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
          onClick={() => setShowDownload(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-96 p-6"
            style={{ border: `1px solid ${RULE}` }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "#fef2f2" }}>
              <Download className="w-5 h-5" style={{ color: MAROON }} />
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: SLATE }}>Download PDF</p>
            <p className="text-xs mb-4" style={{ color: "#64748b" }}>
              You can rename the file before downloading.
            </p>
            <div className="mb-5">
              <label className="block mb-1.5" style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                File name
              </label>
              <div className="flex items-center border rounded-lg overflow-hidden"
                style={{ borderColor: RULE }}>
                <input
                  value={dlFilename}
                  onChange={e => setDlFilename(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      const name = (dlFilename.trim() || `IIS_${local.name}`).replace(/\.pdf$/i, "");
                      window.open(`/api/courses/${courseId}/guidance-sheets/${local.id}/export?filename=${encodeURIComponent(name)}`, "_blank", "noreferrer");
                      setShowDownload(false);
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm outline-none bg-white"
                  style={{ color: SLATE }}
                  autoFocus
                />
                <span className="px-3 py-2 text-xs font-semibold border-l"
                  style={{ borderColor: RULE, color: "#94a3b8", background: "#f8fafc" }}>
                  .pdf
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDownload(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{ border: `1px solid ${RULE}`, color: "#64748b" }}>
                Cancel
              </button>
              <button onClick={() => {
                  const name = (dlFilename.trim() || `IIS_${local.name}`).replace(/\.pdf$/i, "");
                  window.open(`/api/courses/${courseId}/guidance-sheets/${local.id}/export?filename=${encodeURIComponent(name)}`, "_blank", "noreferrer");
                  setShowDownload(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
                style={{ background: MAROON }}>
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  /* ─────────────────────────────────────────────────────────────────────────────
   QR / LINK MODAL
───────────────────────────────────────────────────────────────────────────── */
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
    a.href = qrDataUrl;
    a.download = `information-sheet-qr-${courseId}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-200 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-96 overflow-hidden"
        onClick={e => e.stopPropagation()}>

        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <GraduationCap size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Guidance</p>
              <p className="text-sm font-black text-white">Student Form Link</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Share this link or QR code with enrollees so they can fill out their Individual Information Sheet.
          </p>

          {/* URL row */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <p className="text-xs text-gray-700 font-mono flex-1 break-all">{url}</p>
            <button onClick={copy}
              className="shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={copied ? { background: "#dcfce7", color: "#15803d" } : { background: "#fef2f2", color: MAROON }}>
              {copied ? <><Check size={11} /> Copied!</> : "Copy"}
            </button>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest self-start" style={{ color: MAROON }}>QR Code</p>
            <div className="w-45 h-45 rounded-xl border-2 border-gray-100 flex items-center justify-center bg-white shadow-sm overflow-hidden">
              {qrLoading
                ? <div className="w-8 h-8 rounded-full border-2 border-gray-200 animate-spin" style={{ borderTopColor: MAROON }} />
                : qrDataUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                  : <p className="text-[10px] text-gray-400 text-center px-4">Failed to generate QR code</p>
              }
            </div>
            <button onClick={downloadQR} disabled={!qrDataUrl || qrLoading}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition-all disabled:opacity-40"
              style={{ borderColor: MAROON, color: MAROON }}>
              <Download size={12} /> Download QR Code
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose}
            className="w-full h-10 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN TAB
───────────────────────────────────────────────────────────────────────────── */
export default function CourseGuidanceTab({
  courseId, isHead,
}: Props) {
  const [sheets,        setSheets]        = useState<GuidanceSheet[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [showFilters,   setShowFilters]   = useState(false);
  const [showShare,     setShowShare]     = useState(false);
  const [detailSheet,   setDetailSheet]   = useState<GuidanceSheet | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<GuidanceSheet | null>(null);
  const [page,          setPage]          = useState(1);

  const fetchSheets = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search)        params.set("search",  search);
      if (statusFilter)  params.set("status",  statusFilter);
      if (programFilter) params.set("course",  programFilter);
      const res  = await fetch(`/api/courses/${courseId}/guidance-sheets?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSheets(data.sheets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }, [courseId, search, statusFilter, programFilter]);

  useEffect(() => { fetchSheets(); }, [fetchSheets]);
  useEffect(() => { setPage(1); }, [search, statusFilter, programFilter]);

  const programOptions = [...new Set(sheets.map(s => s.courseProgram).filter(Boolean))] as string[];
  const hasActiveFilter = !!programFilter;

  const totalPages = Math.max(1, Math.ceil(sheets.length / PAGE_SIZE));
  const paginated  = sheets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allowResubmit = async (sheet: GuidanceSheet) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/guidance-sheets/${sheet.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ allowResubmit: true }),
      });
      if (!res.ok) return;
      const d = await res.json();
      setSheets(prev => prev.map(s => s.id === sheet.id ? d.sheet : s));
    } catch { /* ignore */ }
  };

  if (detailSheet) {
    return (
      <SheetDetailView
        sheet={detailSheet}
        courseId={courseId}
        isHead={isHead}
        onBack={() => setDetailSheet(null)}
        onUpdated={updated => setSheets(prev => prev.map(s => s.id === updated.id ? updated : s))}
        onDeleted={id => {
          setSheets(prev => prev.filter(s => s.id !== id));
          setDetailSheet(null);
        }}
      />
    );
  }

  return (
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5 truncate" style={{ color: MAROON }}>
            Guidance
          </p>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">Information Sheets</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchSheets}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-1.5 rounded-lg text-white transition-all"
            style={{ background: MAROON }}>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share Form Link</span>
            <span className="sm:hidden">Share</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: "Total Submissions", value: sheets.length },
            { label: "Reviewed",          value: sheets.filter(s => s.status === "REVIEWED").length  },
            { label: "Pending Review",    value: sheets.filter(s => s.status === "SUBMITTED").length },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
              <div className="rounded-lg p-2 sm:p-2.5 shrink-0" style={{ background: "#f3f4f6", color: MAROON }}>
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black tabular-nums leading-none text-gray-900">{s.value}</p>
                <p className="text-xs sm:text-sm font-semibold mt-0.5 text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">

          {/* Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-white flex-wrap">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 sm:flex-none sm:w-64 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or student no..."
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button onClick={() => setShowFilters(f => !f)}
              style={(showFilters || hasActiveFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0
                ${!(showFilters || hasActiveFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700" : ""}`}>
              <Filter className="w-3 h-3" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
            </button>

            <button
              onClick={() => {
                const csv = [
                  ["Student No.", "Name", "Course", "Year/Section", "Sex", "Age", "Email", "Mobile", "Status", "Submitted At"].join(","),
                  ...sheets.map(s => [
                    s.studentNo, s.name, s.courseProgram ?? "", s.yearSection ?? "",
                    s.sex ?? "", s.age ?? "", s.email ?? "", s.mobileNo ?? "",
                    s.status, fmtDate(s.submittedAt),
                  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href = url; a.download = "guidance_submissions.csv"; a.click();
                URL.revokeObjectURL(url);
              }}
              disabled={sheets.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all disabled:opacity-40 shrink-0 ml-auto">
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-2.5">


              {programOptions.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Course / Program</span>
                  <div className="relative">
                    <select value={programFilter} onChange={e => setProgramFilter(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 outline-none appearance-none max-w-65">
                      <option value="">All Programs</option>
                      {programOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {hasActiveFilter && (
                <button onClick={() => { setStatusFilter(""); setProgramFilter(""); }}
                  className="flex items-center gap-1 text-[11px] font-bold hover:underline"
                  style={{ color: MAROON }}>
                  <X size={11} /> Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="animate-pulse divide-y divide-gray-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 sm:px-5 py-3.5">
                  <div className="h-3 w-16 bg-gray-100 rounded shrink-0" />
                  <div className="h-3 w-28 bg-gray-100 rounded shrink-0" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                  <div className="h-3 w-20 bg-gray-100 rounded shrink-0 hidden sm:block" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-xs font-medium text-red-500 py-20">{error}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: "#fafafa" }}>
                     {["No.", "Student No.", "Name", "Course / Program", "Year & Section", "Sex", "Submitted", ""].map((h, i) => (
                        <th key={i} className="text-left px-3 py-3 whitespace-nowrap" style={{ border: "1px solid #e5e7eb" }}>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{h}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheets.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-16">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                              <GraduationCap className="w-6 h-6" style={{ color: MAROON }} />
                            </div>
                            <p className="text-sm text-gray-400 font-medium">
                              {hasActiveFilter || search ? "No submissions match your filters." : "No submissions yet."}
                            </p>
                            <button onClick={() => setShowShare(true)}
                              className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                              Share the form link with students →
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {paginated.map((s, i) => (
                      <tr key={s.id}
                        className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                        onClick={() => setDetailSheet(s)}>
                        <td className="px-3 py-3 text-xs text-gray-500 tabular-nums text-center" style={{ border: "1px solid #e5e7eb" }}>
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td className="px-3 py-3 text-xs font-mono text-gray-700 whitespace-nowrap" style={{ border: "1px solid #e5e7eb" }}>
                          {s.studentNo}
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap" style={{ border: "1px solid #e5e7eb" }}>
                          {s.name}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600" style={{ border: "1px solid #e5e7eb" }}>
                          {s.courseProgram ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600" style={{ border: "1px solid #e5e7eb" }}>
                          {s.yearSection ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 text-center" style={{ border: "1px solid #e5e7eb" }}>
                          {s.sex ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap" style={{ border: "1px solid #e5e7eb" }}>
                          {fmtDate(s.submittedAt)}
                        </td>
                        <td className="px-2 py-3 w-10" onClick={e => e.stopPropagation()}>
                          {isHead && (
                            <RowActionsMenu
                              onView={() => setDetailSheet(s)}
                              onAllowResubmit={s.allowResubmit ? undefined : () => allowResubmit(s)}
                              onDelete={() => setDeleteTarget(s)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden p-3 space-y-2">
                {sheets.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                      <GraduationCap className="w-6 h-6" style={{ color: MAROON }} />
                    </div>
                    <p className="text-sm text-gray-400 font-medium text-center">
                      {hasActiveFilter || search ? "No submissions match your filters." : "No submissions yet."}
                    </p>
                    <button onClick={() => setShowShare(true)}
                      className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                      Share the form link →
                    </button>
                  </div>
                )}
                {paginated.map(s => (
                  <div key={s.id}
                    className="bg-white rounded-xl border border-gray-200 p-4"
                    onClick={() => setDetailSheet(s)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                        <p className="text-[10px] font-mono text-gray-400">{s.studentNo}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isHead && (
                          <div onClick={e => e.stopPropagation()}>
                            <RowActionsMenu
                              onView={() => setDetailSheet(s)}
                              onAllowResubmit={s.allowResubmit ? undefined : () => allowResubmit(s)}
                              onDelete={() => setDeleteTarget(s)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {s.courseProgram && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest"
                          style={{ background: "#fef2f2", color: MAROON }}>
                          {s.courseProgram}
                        </span>
                      )}
                      {s.yearSection && (
                        <span className="text-[10px] font-semibold text-gray-500">{s.yearSection}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">{fmtDate(s.submittedAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && sheets.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-100 bg-white shrink-0 flex-wrap gap-2">
              <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sheets.length)} of {sheets.length}
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

      {/* ── Modals ── */}
      {deleteTarget && (
        <DeleteModal
          sheet={deleteTarget}
          courseId={courseId}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setSheets(prev => prev.filter(s => s.id !== deleteTarget.id));
            setDeleteTarget(null);
          }}
        />
      )}

      {showShare && <ShareLinkModal courseId={courseId} onClose={() => setShowShare(false)} />}
    </div>
  );
}