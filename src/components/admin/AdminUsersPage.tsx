"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import ReactDOM from "react-dom";
import {
  Search, RefreshCw, X, ChevronLeft, ChevronRight,
  MoreVertical, UserX, UserCheck, Trash2, BookPlus, Eye,
  SlidersHorizontal, ArrowUpDown, Users, Activity,
  UserPlus, Copy, RefreshCcw, EyeOff, KeyRound, Check,
  GraduationCap, Briefcase, ChevronDown,
} from "lucide-react";
import EnrollModal from "./EnrollModal";

type Status = "APPROVED" | "REJECTED" | "DEACTIVATED";
type Role = "ADMIN" | "STAFF" | "FACULTY" | "USER" | string;

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

const NAME_SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "V", "PhD", "MD", "Esq.", "CPA"];

const TEACHING_RANKS = [
  "Instructor I", "Instructor II", "Instructor III",
  "Assistant Professor I", "Assistant Professor II", "Assistant Professor III", "Assistant Professor IV",
  "Associate Professor I", "Associate Professor II", "Associate Professor III", "Associate Professor IV", "Associate Professor V",
  "Professor I", "Professor II", "Professor III", "Professor IV", "Professor V", "Professor VI",
];

interface StaffUser {
  id: string; name: string; email: string;
  department: string | null; position: string | null;
  employmentStatus: string | null;
  accountType: string | null;
  status: Status; createdAt: string; role?: Role; image?: string | null;
  plainPassword?: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  term: string | null;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Avatar({ user, size = "sm" }: { user: StaffUser; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const dim      = size === "lg" ? "w-12 h-12" : size === "md" ? "w-8 h-8" : "w-7 h-7";
  const iconSize = size === "lg" ? "w-7 h-7"  : size === "md" ? "w-5 h-5" : "w-4 h-4";
  if (user.image && !imgError) {
    return <Image src={user.image} alt={user.name} onError={() => setImgError(true)}
      width={size === "lg" ? 48 : size === "md" ? 32 : 28}
      height={size === "lg" ? 48 : size === "md" ? 32 : 28}
      className={`${dim} rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm`}/>;
  }
  return (
    <div className={`${dim} rounded-full shrink-0 bg-gray-200 text-gray-400 flex items-center justify-center`}>
      <svg viewBox="0 0 24 24" className={iconSize} fill="currentColor">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    </div>
  );
}

const STATUS_CFG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  APPROVED:    { label: "Active",      dot: "#22c55e", bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  REJECTED:    { label: "Rejected",    dot: "#ef4444", bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  DEACTIVATED: { label: "Deactivated", dot: "#9ca3af", bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.APPROVED;
  return (
    <span style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: cfg.dot }}/>
      {cfg.label}
    </span>
  );
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
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

/* ── Simple Select Dropdown ── */
function SimpleSelect({
  value, onChange, options, placeholder, disabled,
}: {
  value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`${inputCls} appearance-none pr-8 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        style={{ fontFamily: FONT }}
      >
        <option value="">{placeholder ?? "Select…"}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

/* ── Non-Teaching Rank Field: text + existing as dropdown ── */
function NonTeachingRankField({
  value, onChange, existingRanks,
}: {
  value: string; onChange: (v: string) => void; existingRanks: string[];
}) {
  const [mode, setMode] = useState<"text" | "dropdown">("text");

  return (
    <div className="space-y-1.5">
      {existingRanks.length > 0 && (
        <div className="flex gap-1.5">
          <button type="button"
            onClick={() => { setMode("text"); onChange(""); }}
            className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${mode === "text" ? "text-white border-transparent" : "text-gray-500 border-gray-200 hover:border-gray-400"}`}
            style={mode === "text" ? { background: MAROON } : {}}>
            New
          </button>
          <button type="button"
            onClick={() => { setMode("dropdown"); onChange(""); }}
            className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${mode === "dropdown" ? "text-white border-transparent" : "text-gray-500 border-gray-200 hover:border-gray-400"}`}
            style={mode === "dropdown" ? { background: MAROON } : {}}>
            Existing
          </button>
        </div>
      )}
      {mode === "text" || existingRanks.length === 0 ? (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder=""
          className={inputCls}
        />
      ) : (
        <SimpleSelect
          value={value}
          onChange={onChange}
          options={existingRanks}
          placeholder="Select existing rank…"
        />
      )}
    </div>
  );
}

function useCourses(enabled: boolean) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;
    const fetchData = async () => {
      try {
        const r = await fetch("/api/admin/courses");
        const data = await r.json();
        if (isMounted) setCourses(data.courses ?? []);
      } catch {
        if (isMounted) setCourses([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [enabled]);

  const academic      = courses.filter(c => c.term === "Academic");
  const nonAcademic   = courses.filter(c => c.term === "Non-Academic");
  const uncategorized = courses.filter(c => c.term !== "Academic" && c.term !== "Non-Academic");

  return { courses, loading, academic, nonAcademic, uncategorized };
}

function GroupedCourseDropdown({
  value, onChange, academic, nonAcademic, uncategorized, loading,
  placeholder, displayFn, keyFn,
}: {
  value: string; onChange: (v: string) => void;
  academic: Course[]; nonAcademic: Course[]; uncategorized: Course[];
  loading: boolean; placeholder?: string;
  keyFn: (c: Course) => string; displayFn: (c: Course) => string;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const allCourses = [...academic, ...nonAcademic, ...uncategorized];
  const selectedItem = allCourses.find(c => keyFn(c) === value);

  const handleOpen = () => {
    if (loading) return;
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const update = () => { if (btnRef.current) setRect(btnRef.current.getBoundingClientRect()); };
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-grouped-dropdown]") && !btnRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const renderGroup = (label: string, items: Course[], icon: React.ReactNode) =>
    items.length > 0 ? (
      <div key={label}>
        <div className="px-2 pt-2.5 pb-1">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded"
            style={{ background: MAROON }}>
            {icon}{label}
          </span>
        </div>
        {items.map(c => (
          <button key={c.id} type="button"
            onClick={() => { onChange(keyFn(c)); setOpen(false); }}
            className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between
              ${value === keyFn(c) ? "font-bold bg-red-50" : "text-gray-700 hover:bg-gray-50 font-medium"}`}
            style={value === keyFn(c) ? { color: MAROON } : {}}>
            <span className="truncate mr-2">{c.name}</span>
            <span className="text-[10px] text-gray-400 font-mono shrink-0">{c.code}</span>
          </button>
        ))}
      </div>
    ) : null;

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen}
        className={`${inputCls} flex items-center justify-between text-left ${loading ? "opacity-60 cursor-not-allowed" : ""}`}>
        <span className={`truncate ${selectedItem ? "text-gray-800" : "text-gray-400"}`}>
          {loading ? "Loading courses…" : selectedItem ? displayFn(selectedItem) : (placeholder ?? "Select course")}
        </span>
        {loading
          ? <RefreshCw size={12} className="animate-spin text-gray-400 shrink-0 ml-2"/>
          : <ChevronDown size={13} className="text-gray-400 shrink-0 ml-2" style={{ transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}/>
        }
      </button>

      {open && rect && typeof document !== "undefined" && (() => {
        const menuH = 280;
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const top = spaceBelow >= menuH ? rect.bottom + 4 : rect.top - menuH - 4;
        const isMobile = window.innerWidth < 480;
        const left  = isMobile ? 12 : rect.left;
        const width = isMobile ? window.innerWidth - 24 : rect.width;
        return ReactDOM.createPortal(
          <div data-grouped-dropdown="true"
            className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-y-auto"
            style={{ position: "fixed", top, left, width, maxHeight: menuH, zIndex: 9999, fontFamily: FONT }}>
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 border-b border-gray-100 font-medium">
              — Clear selection
            </button>
            {renderGroup("Academic",     academic,      <GraduationCap size={9} className="shrink-0"/>)}
            {renderGroup("Non-Academic", nonAcademic,   <Briefcase size={9} className="shrink-0"/>)}
            {uncategorized.length > 0 && renderGroup("Uncategorized", uncategorized, null)}
          </div>,
          document.body
        );
      })()}
    </>
  );
}

/* ── Initials helper ── */
function buildFullName(firstName: string, middleName: string, lastName: string, initials: boolean, suffix: string) {
  const mid = middleName.trim()
    ? initials
      ? middleName.trim().split(" ").map(w => w[0]?.toUpperCase() + ".").join(" ")
      : middleName.trim()
    : "";
  const parts = [firstName.trim(), mid, lastName.trim()].filter(Boolean).join(" ");
  return suffix ? `${parts}, ${suffix}` : parts;
}

// ── Create User Modal ──────────────────────────────────────────────────────────
const CreateUserModal = React.memo(function CreateUserModal({
  isOpen, onClose, onCreated, existingNonTeachingRanks,
}: {
  isOpen: boolean; onClose: () => void;
  onCreated: (user: StaffUser) => void;
  existingNonTeachingRanks: string[];
}) {
  const [firstName,    setFirstName]    = useState("");
  const [middleName,   setMiddleName]   = useState("");
  const [lastName,     setLastName]     = useState("");
  const useInitials = true;
  const [suffix,       setSuffix]       = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [staffType,    setStaffType]    = useState<"" | "Teaching" | "Non-Teaching">("");
  const [academicRank, setAcademicRank] = useState("");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [copied,       setCopied]       = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFirstName(""); setMiddleName(""); setLastName("");
    setSuffix("");
    setEmail(""); setPassword(""); setShowPassword(false);
    setStaffType(""); setAcademicRank("");
    setError(""); setCopied(false);
  }, [isOpen]);

  // Reset academic rank when staff type changes
  useEffect(() => { setAcademicRank(""); }, [staffType]);

  const handleGenerate = useCallback(() => {
    const pw = generatePassword();
    setPassword(pw);
    setShowPassword(true);
  }, []);

  const handleCopy = useCallback(() => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [password]);

  const fullName = buildFullName(firstName, middleName, lastName, useInitials, suffix);

  const handleSubmit = async () => {
    setError("");
    if (!firstName.trim()) { setError("First name is required."); return; }
    if (!lastName.trim())  { setError("Last name is required."); return; }
    if (!email.trim())     { setError("Email is required."); return; }
    if (!password.trim())  { setError("Password is required."); return; }
    if (!staffType)        { setError("Please select a staff type."); return; }

    setSaving(true);
    try {
      const res  = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: email.trim(),
          password,
          department: null,
          position: academicRank || null,
          accountType: staffType,
          status: "APPROVED",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create user."); return; }
      onCreated({ ...data.user, plainPassword: password });
    } catch {
      setError("Network error. Please try again.");
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;

  const previewName = fullName || <span className="text-gray-300 italic">Full name preview</span>;

  return (
    <div className="fixed inset-0 z-500 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 shrink-0" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <UserPlus size={15} className="text-white"/>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Administration</p>
              <p className="text-sm font-black text-white">Create New User</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
            <X size={15}/>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}

          {/* ── Name Section ── */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Name</p>

            {/* First + Last */}
            <div className="grid grid-cols-2 gap-2">
              <Field label="First Name" required>
                <input value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="" className={inputCls}/>
              </Field>
              <Field label="Last Name" required>
                <input value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="" className={inputCls}/>
              </Field>
            </div>

            {/* Middle Name */}
            <Field label="Middle Name (optional)">
              <input value={middleName} onChange={e => setMiddleName(e.target.value)}
                placeholder="" className={inputCls}/>
            </Field>

            {/* Suffix */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-140px">
                <SimpleSelect
                  value={suffix}
                  onChange={setSuffix}
                  options={NAME_SUFFIXES}
                  placeholder="Suffix (optional)"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">Preview:</span>
              <span className="text-sm font-semibold text-gray-700 truncate">{previewName}</span>
            </div>
          </div>

          {/* ── Email ── */}
          <Field label="Email Address" required>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="" className={inputCls}/>
          </Field>

          {/* ── Password ── */}
          <Field label="Password" required>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <input type={showPassword ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter or generate password" className={`${inputCls} pr-9`}/>
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
              <button type="button" onClick={handleGenerate} title="Generate password"
                className="h-9 px-2.5 sm:px-3 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all flex items-center gap-1 sm:gap-1.5 text-xs font-bold shrink-0">
                <RefreshCcw size={13}/> <span className="hidden sm:inline">Generate</span>
              </button>
              <button type="button" onClick={handleCopy} disabled={!password} title="Copy password"
                className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all disabled:opacity-30 shrink-0">
                {copied ? <Check size={13} className="text-green-500"/> : <Copy size={13}/>}
              </button>
            </div>
            {password && showPassword && (
              <p className="text-[10px] font-mono text-gray-400 mt-1 px-1 break-all">{password}</p>
            )}
          </Field>

          {/* ── Staff Type ── */}
          <Field label="Staff Type" required>
            <div className="flex gap-2">
              {(["Teaching", "Non-Teaching"] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setStaffType(t)}
                  className={`flex-1 h-9 rounded-lg border text-xs font-bold transition-all ${staffType === t ? "text-white border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
                  style={staffType === t ? { background: MAROON } : {}}>
                  {t === "Teaching"
                    ? <span className="flex items-center justify-center gap-1.5"><GraduationCap size={12}/> Teaching</span>
                    : <span className="flex items-center justify-center gap-1.5"><Briefcase size={12}/> Non-Teaching</span>}
                </button>
              ))}
            </div>
          </Field>

          {/* ── Academic Rank — Teaching ── */}
          {staffType === "Teaching" && (
            <Field label="Academic Rank">
              <SimpleSelect
                value={academicRank}
                onChange={setAcademicRank}
                options={TEACHING_RANKS}
                placeholder="Select academic rank…"
              />
            </Field>
          )}

          {/* ── Academic Rank — Non-Teaching ── */}
          {staffType === "Non-Teaching" && (
            <Field label="Academic Rank / Position">
              <NonTeachingRankField
                value={academicRank}
                onChange={setAcademicRank}
                existingRanks={existingNonTeachingRanks}
              />
            </Field>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <span className="text-amber-400 text-sm mt-0.5 shrink-0">⚠</span>
            <p className="text-[11px] font-medium text-amber-700 leading-relaxed">
              Make sure to copy the password before saving — it won&apos;t be shown again. Share it with the user securely.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button onClick={onClose} disabled={saving}
            className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 h-9 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: MAROON }}>
            {saving ? <><RefreshCw size={13} className="animate-spin"/> Creating...</> : <><Check size={13}/> Create User</>}
          </button>
        </div>
      </div>
    </div>
  );
});

// ── Bulk Enroll Modal ──────────────────────────────────────────────────────────
function BulkEnrollModal({ userIds, userCount, onClose, onDone }: {
  userIds: string[]; userCount: number; onClose: () => void; onDone: () => void;
}) {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");
  const [success,        setSuccess]        = useState(false);

  const { loading: coursesLoading, academic, nonAcademic, uncategorized } = useCourses(true);

  const handleEnroll = async () => {
    if (!selectedCourse) { setError("Please select a course."); return; }
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/admin/enroll/bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, courseId: selectedCourse }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to enroll users."); setSaving(false); return; }
      setSuccess(true);
      setTimeout(() => { onDone(); }, 1200);
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-500 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <BookPlus size={15} className="text-white"/>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Bulk Action</p>
              <p className="text-sm font-black text-white">Enroll to Course</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <X size={15}/>
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5 space-y-4">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
            <Users size={13} className="text-blue-400 shrink-0"/>
            <p className="text-xs font-semibold text-blue-700">
              Enrolling <span className="font-black">{userCount}</span> selected user{userCount !== 1 ? "s" : ""}
            </p>
          </div>
          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
          {success ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={20} className="text-green-500"/>
              </div>
              <p className="text-sm font-bold text-gray-700">Enrollment successful!</p>
            </div>
          ) : (
            <Field label="Select Course" required>
              <GroupedCourseDropdown
                value={selectedCourse} onChange={setSelectedCourse}
                academic={academic} nonAcademic={nonAcademic} uncategorized={uncategorized}
                loading={coursesLoading} placeholder="Select a course"
                keyFn={c => c.id} displayFn={c => `${c.name} (${c.code})`}
              />
            </Field>
          )}
        </div>
        {!success && (
          <div className="flex gap-2 px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button onClick={onClose} disabled={saving}
              className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">
              Cancel
            </button>
            <button onClick={handleEnroll} disabled={saving || !selectedCourse || coursesLoading}
              className="flex-1 h-9 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              style={{ background: MAROON }}>
              {saving ? <><RefreshCw size={13} className="animate-spin"/> Enrolling...</> : <><BookPlus size={13}/> Enroll Users</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bulk Delete Confirm Modal ──────────────────────────────────────────────────
function BulkDeleteModal({ userIds, userCount, onClose, onDeleted }: {
  userIds: string[]; userCount: number; onClose: () => void; onDeleted: (ids: string[]) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res  = await fetch("/api/admin/users/bulk", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to delete users."); setDeleting(false); return; }
      onDeleted(userIds);
    } catch {
      setError("Network error. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-500 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-80 mx-0 sm:mx-4 p-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-50">
          <Trash2 className="w-5 h-5 text-red-400"/>
        </div>
        <p className="text-sm font-bold text-gray-900 mb-1">Delete {userCount} user{userCount !== 1 ? "s" : ""}?</p>
        <p className="text-xs text-gray-400 mb-3 font-medium leading-relaxed">
          This action is permanent and cannot be undone. All selected accounts will be removed.
        </p>
        {error && (
          <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={deleting}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ background: "#ef4444" }}>
            {deleting ? <><RefreshCw size={12} className="animate-spin"/> Deleting...</> : "Delete All"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RowMenu ────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

function RowMenu({ user, onView, onToggleDeactivate, onDelete, onEnroll }: {
  user: StaffUser; onView: () => void;
  onToggleDeactivate: () => void; onDelete: () => void; onEnroll: () => void;
}) {
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

  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    document.addEventListener("scroll", h, true);
    return () => document.removeEventListener("scroll", h, true);
  }, [open]);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect  = btnRef.current.getBoundingClientRect();
    const menuW = 176;
    const menuH = 180;
    const vw    = window.innerWidth;
    const vh    = window.innerHeight;
    let left    = rect.right - menuW;
    let top     = rect.bottom + 4;
    if (left < 8)          left = rect.left;
    if (top + menuH > vh)  top  = rect.top - menuH - 4;
    if (left + menuW > vw) left = vw - menuW - 8;
    setPos({ top, left });
    setOpen(o => !o);
  };

  const item = (icon: React.ReactNode, label: string, cb: () => void, danger = false) => (
    <button type="button" onClick={() => { cb(); setOpen(false); }}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors text-left
        ${danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}`}>
      <span className={`shrink-0 ${danger ? "text-red-400" : "text-gray-400"}`}>{icon}</span>
      {label}
    </button>
  );

  return (
    <>
      <div className="flex justify-end">
        <button ref={btnRef} type="button" onClick={handleOpen}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
            ${open ? "bg-[#7b1113] text-white" : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"}`}>
          <MoreVertical className="w-3.5 h-3.5"/>
        </button>
      </div>
      {open && (
        <div data-rowmenu="true"
          className="fixed w-44 bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-200/80 py-1.5 overflow-hidden"
          style={{ top: pos.top, left: pos.left, zIndex: 9999 }}>
          {item(<Eye className="w-3.5 h-3.5"/>,      "View Profile",     onView)}
          {item(<BookPlus className="w-3.5 h-3.5"/>, "Enroll to Course", onEnroll)}
          <div className="my-1 border-t border-gray-100"/>
          {user.status === "DEACTIVATED"
            ? item(<UserCheck className="w-3.5 h-3.5"/>, "Reactivate", onToggleDeactivate)
            : item(<UserX className="w-3.5 h-3.5"/>,     "Deactivate", onToggleDeactivate)}
          {item(<Trash2 className="w-3.5 h-3.5"/>, "Delete", onDelete, true)}
        </div>
      )}
    </>
  );
}

// ── Mobile User Card ───────────────────────────────────────────────────────────
function MobileUserCard({ user, selected, onSelect, onView, onToggleDeactivate, onDelete, onEnroll }: {
  user: StaffUser; selected: boolean;
  onSelect: () => void; onView: () => void;
  onToggleDeactivate: () => void; onDelete: () => void; onEnroll: () => void;
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors ${selected ? "border-[#7b1113]/30 bg-red-50/20" : "border-gray-200"}`}>
      <input type="checkbox" checked={selected} onChange={onSelect}
        className="w-3.5 h-3.5 cursor-pointer rounded mt-0.5 shrink-0" style={{ accentColor: MAROON }}/>
      <button type="button" onClick={onView} className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2.5 mb-2">
          <Avatar user={user}/>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{user.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill status={user.status}/>
          {user.accountType && (
            <span className="text-[10px] font-bold text-gray-500">{user.accountType}</span>
          )}
        </div>
      </button>
      <RowMenu user={user} onView={onView} onToggleDeactivate={onToggleDeactivate} onDelete={onDelete} onEnroll={onEnroll}/>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users,       setUsers]       = useState<StaffUser[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [deptFilter,  setDeptFilter]  = useState("");
  const [page,        setPage]        = useState(1);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);

  const [viewed,   setViewed]   = useState<StaffUser|null>(null);
  const [showPw,   setShowPw]   = useState(false);
  const [pwCopied, setPwCopied] = useState(false);
  const [confirm,  setConfirm]  = useState<{ user: StaffUser; action: "deactivate"|"reactivate"|"delete" }|null>(null);
  const [enrollModal, setEnrollModal] = useState<StaffUser|null>(null);
  const [acting,   setActing]   = useState(false);

  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUsers((data.users ?? []).filter((u: StaffUser) => u.role !== "ADMIN"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setShowPw(false); setPwCopied(false); }, [viewed?.id]);

  // Collect existing non-teaching ranks from current users
  const existingNonTeachingRanks = Array.from(
    new Set(
      users
        .filter(u => u.accountType === "Non-Teaching" && u.position)
        .map(u => u.position as string)
    )
  );

  const applyAction = async (userId: string, action: "deactivate"|"reactivate"|"delete") => {
    setActing(true);
    try {
      if (action === "delete") {
        const res = await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
        if (!res.ok) { const d = await res.json(); alert(d.error ?? "Delete failed"); setActing(false); return; }
        setUsers(p => p.filter(u => u.id !== userId));
        setConfirm(null); setViewed(null); setActing(false); return;
      }
      const res  = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const next: Status = action === "deactivate" ? "DEACTIVATED" : "APPROVED";
      setUsers(p => p.map(u => u.id === userId ? { ...u, status: next } : u));
      setViewed(p => p?.id === userId ? { ...p, status: next } : p);
      setConfirm(null);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Failed"); }
    finally { setActing(false); }
  };

  const handleModalClose   = useCallback(() => { setShowCreate(false); }, []);
  const handleModalCreated = useCallback((user: StaffUser) => {
    setUsers(prev => [user, ...prev]);
    setShowCreate(false);
    setViewed(user);
  }, []);

  const handleCopyPw = useCallback(() => {
    if (!viewed?.plainPassword) return;
    navigator.clipboard.writeText(viewed.plainPassword);
    setPwCopied(true);
    setTimeout(() => setPwCopied(false), 2000);
  }, [viewed]);

  const handleBulkDeleted = useCallback((deletedIds: string[]) => {
    setUsers(prev => prev.filter(u => !deletedIds.includes(u.id)));
    setSelected(new Set());
    setShowBulkDelete(false);
  }, []);

  const handleBulkEnrollDone = useCallback(() => {
    setSelected(new Set());
    setShowBulkEnroll(false);
  }, []);

  const total    = users.length;
  const approved = users.filter(u => u.status === "APPROVED").length;
  const departments = [...new Set(users.map(u => u.department).filter(Boolean))] as string[];

  const filtered = users.filter(u => {
    const matchDept = !deptFilter || u.department === deptFilter;
    const q = search.toLowerCase();
    return matchDept &&
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.department ?? "").toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = useCallback((id: string) => {
    setSelected(p => {
      const n = new Set(p);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }, []);
  const toggleAll = () => setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(u => u.id)));

  const selectedIds = [...selected];

  return (
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5 truncate" style={{ color: MAROON }}>Administration</p>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">User Management</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={fetchUsers}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}/>
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button type="button" onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-1.5 rounded-lg text-white transition-all"
            style={{ background: MAROON }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <UserPlus className="w-3.5 h-3.5"/>
            <span className="hidden sm:inline">Create User</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            { label: "Total Users", value: total,    icon: <Users className="w-4 h-4"/>,    accent: "#2d3b45" },
            { label: "Active",      value: approved, icon: <Activity className="w-4 h-4"/>, accent: "#15803d" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", borderColor: "#e5e7eb" }}
              className="border rounded-xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
              <div className="rounded-lg p-2 sm:p-2.5 shrink-0" style={{ background: "#f3f4f6", color: s.accent }}>
                {s.icon}
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black tabular-nums leading-none" style={{ color: "#111827" }}>{s.value}</p>
                <p className="text-xs sm:text-sm font-semibold mt-0.5" style={{ color: "#6b7280" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">

          {/* Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 bg-white">
            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 sm:w-52 sm:flex-none bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search users..." className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"/>
                {search && <button type="button" onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0"><X className="w-3 h-3"/></button>}
              </div>
              <button type="button" onClick={() => setShowFilters(f => !f)}
                style={(showFilters || deptFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0 ${!(showFilters || deptFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700" : ""}`}>
                <SlidersHorizontal className="w-3 h-3"/>
                <span className="hidden sm:inline">Filters</span>
                {deptFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0"/>}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="px-4 sm:px-5 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Filter by</span>
              <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none flex-1 sm:flex-none">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {deptFilter && (
                <button type="button" onClick={() => setDeptFilter("")}
                  style={{ color: MAROON }} className="text-[11px] font-bold hover:underline whitespace-nowrap">Clear filters</button>
              )}
            </div>
          )}

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 shrink-0 flex-wrap" style={{ background: MAROON }}>
              <span className="text-xs font-bold text-white tabular-nums">
                {selected.size} selected
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" onClick={() => setShowBulkEnroll(true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition-all border border-white/20 whitespace-nowrap">
                  <BookPlus className="w-3 h-3"/>
                  <span className="hidden sm:inline">Enroll to Course</span>
                  <span className="sm:hidden">Enroll</span>
                </button>
                <button type="button" onClick={() => setShowBulkDelete(true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-[11px] font-bold transition-all border border-red-400/40 whitespace-nowrap">
                  <Trash2 className="w-3 h-3"/>
                  <span className="hidden sm:inline">Delete Selected</span>
                  <span className="sm:hidden">Delete</span>
                </button>
                <button type="button" onClick={() => setSelected(new Set())}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 py-20">
              <RefreshCw className="w-5 h-5 animate-spin"/>
              <span className="text-xs font-medium">Loading users...</span>
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
                          className="w-3.5 h-3.5 cursor-pointer rounded" style={{ accentColor: MAROON }}/>
                      </th>
                      <th className="text-left px-3 py-3">
                        <button type="button" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-600 hover:text-gray-900">
                          Name <ArrowUpDown className="w-3 h-3"/>
                        </button>
                      </th>
                      {["Staff Type", "Position / Rank", "Joined", "Status", ""].map((h, i) => (
                        <th key={i} className="text-left px-3 py-3 text-xs font-bold uppercase tracking-wide text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-8 h-8 text-gray-200"/>
                            <p className="text-sm text-gray-300 font-medium">No users found</p>
                          </div>
                        </td>
                      </tr>
                    ) : paginated.map(u => (
                      <tr key={u.id} style={{ borderBottom: "1px solid #f9fafb" }}
                        className={`transition-colors ${selected.has(u.id) ? "bg-red-50/30" : "hover:bg-gray-50/70"}`}>
                        <td className="pl-5 pr-3 py-3.5">
                          <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)}
                            className="w-3.5 h-3.5 cursor-pointer rounded" style={{ accentColor: MAROON }}/>
                        </td>
                        <td className="px-3 py-3.5">
                          <button type="button" onClick={() => setViewed(u)} className="flex items-center gap-3 text-left group/name">
                            <Avatar user={u}/>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 group-hover/name:underline underline-offset-2 leading-tight"
                                style={{ textDecorationColor: MAROON }}>{u.name}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">{u.email}</p>
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-3.5">
                          {u.accountType ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest ${u.accountType === "Teaching" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                              {u.accountType}
                            </span>
                          ) : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-3 py-3.5 max-w-45">
                          <span className="text-xs text-gray-500 truncate block">{u.position ?? <span className="text-gray-200">—</span>}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">{formatDate(u.createdAt)}</span>
                        </td>
                        <td className="px-3 py-3.5"><StatusPill status={u.status}/></td>
                        <td className="px-3 py-3.5 w-12">
                          <RowMenu user={u}
                            onView={()             => setViewed(u)}
                            onToggleDeactivate={() => setConfirm({ user: u, action: u.status === "DEACTIVATED" ? "reactivate" : "deactivate" })}
                            onDelete={()           => setConfirm({ user: u, action: "delete" })}
                            onEnroll={()           => setEnrollModal(u)}/>
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
                    <Users className="w-8 h-8 text-gray-200"/>
                    <p className="text-sm text-gray-300 font-medium">No users found</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 pb-1">
                      <input type="checkbox"
                        checked={selected.size === paginated.length && paginated.length > 0}
                        onChange={toggleAll}
                        className="w-3.5 h-3.5 cursor-pointer rounded" style={{ accentColor: MAROON }}/>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Select all</span>
                    </div>
                    {paginated.map(u => (
                      <MobileUserCard
                        key={u.id}
                        user={u}
                        selected={selected.has(u.id)}
                        onSelect={() => toggleSelect(u.id)}
                        onView={() => setViewed(u)}
                        onToggleDeactivate={() => setConfirm({ user: u, action: u.status === "DEACTIVATED" ? "reactivate" : "deactivate" })}
                        onDelete={() => setConfirm({ user: u, action: "delete" })}
                        onEnroll={() => setEnrollModal(u)}
                      />
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
                  <ChevronLeft className="w-3 h-3"/>
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const n = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  return (
                    <button key={n} type="button" onClick={() => setPage(n)}
                      style={page === n ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-semibold transition-all border ${page !== n ? "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700" : ""}`}>
                      {n}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-25 transition-all">
                  <ChevronRight className="w-3 h-3"/>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateUserModal
        isOpen={showCreate}
        onClose={handleModalClose}
        onCreated={handleModalCreated}
        existingNonTeachingRanks={existingNonTeachingRanks}
      />

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-400 flex items-end sm:items-center justify-center bg-black/25 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 p-6 w-full sm:w-80 mx-0 sm:mx-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: confirm.action === "reactivate" ? MAROON : confirm.action === "delete" ? "#fef2f2" : "#f3f4f6" }}>
              {confirm.action === "reactivate"
                ? <Check className="w-5 h-5 text-white"/>
                : confirm.action === "delete" ? <Trash2 className="w-5 h-5 text-red-400"/>
                : <UserX className="w-5 h-5 text-gray-500"/>}
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">
              {confirm.action === "deactivate" ? "Deactivate this account?" :
               confirm.action === "reactivate" ? "Reactivate this account?" :
               "Permanently delete?"}
            </p>
            <p className="text-xs text-gray-400 mb-6 font-medium">{confirm.user.name}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirm(null)} disabled={acting}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all">Cancel</button>
              <button type="button" onClick={() => applyAction(confirm.user.id, confirm.action)} disabled={acting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                style={{ background: confirm.action === "delete" ? "#ef4444" : confirm.action === "reactivate" ? MAROON : "#374151" }}>
                {acting ? "..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {enrollModal && <EnrollModal user={enrollModal} onClose={() => setEnrollModal(null)}/>}

      {showBulkDelete && (
        <BulkDeleteModal userIds={selectedIds} userCount={selected.size}
          onClose={() => setShowBulkDelete(false)} onDeleted={handleBulkDeleted}/>
      )}

      {showBulkEnroll && (
        <BulkEnrollModal userIds={selectedIds} userCount={selected.size}
          onClose={() => setShowBulkEnroll(false)} onDone={handleBulkEnrollDone}/>
      )}

      {/* Profile Drawer */}
      {viewed && (
        <div className="fixed inset-0 z-400 flex items-stretch sm:items-center justify-end"
          style={{ backdropFilter: "blur(4px)", backgroundColor: "rgba(0,0,0,0.2)" }}
          onClick={() => setViewed(null)}>
          <div
            className="w-full sm:w-72 sm:h-full bg-white border-l border-gray-200 shadow-2xl flex flex-col rounded-t-2xl sm:rounded-none max-h-[85vh] sm:max-h-full"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Profile</span>
              <button type="button" onClick={() => setViewed(null)}
                className="w-6 h-6 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-all">
                <X className="w-3 h-3"/>
              </button>
            </div>
            <div className="px-5 py-5 border-b border-gray-100 shrink-0">
              <div className="flex items-start gap-3">
                <Avatar user={viewed} size="lg"/>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-gray-900 leading-tight truncate">{viewed.name}</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{viewed.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-3">
                <StatusPill status={viewed.status}/>
                {viewed.accountType && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest ${viewed.accountType === "Teaching" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                    {viewed.accountType}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2">
              {[
                { label: "Staff Type",   value: viewed.accountType     ?? "—" },
                { label: "Position / Rank", value: viewed.position     ?? "—" },
                { label: "Member Since", value: formatDate(viewed.createdAt) },
              ].map(row => (
                <div key={row.label} className="py-3.5 border-b border-gray-50 last:border-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{row.label}</p>
                  <p className="text-sm text-gray-800 font-semibold">{row.value}</p>
                </div>
              ))}

              {viewed.plainPassword && (
                <div className="py-3.5 border-b border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Password</p>
                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <KeyRound className="w-3 h-3 text-gray-400 shrink-0"/>
                    <span className="flex-1 text-xs font-mono text-gray-700 truncate select-all">
                      {showPw ? viewed.plainPassword : "••••••••••••"}
                    </span>
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      title={showPw ? "Hide password" : "Show password"}
                      className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                      {showPw ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}
                    </button>
                    <button type="button" onClick={handleCopyPw} title="Copy password"
                      className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                      {pwCopied ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                    <span>⚠</span> Visible this session only — not stored.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}