"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import ReactDOM from "react-dom";
import {
  Search, RefreshCw, X, ChevronLeft, ChevronRight,
  MoreVertical, UserX, UserCheck, Trash2, BookPlus, Eye,
  SlidersHorizontal, ArrowUpDown, Users, Activity,
  UserPlus, Copy, RefreshCcw, EyeOff, KeyRound, Check,
  GraduationCap, Briefcase,
} from "lucide-react";
import EnrollModal from "./EnrollModal";

type Status = "APPROVED" | "REJECTED" | "DEACTIVATED";
type Role = "ADMIN" | "STAFF" | "FACULTY" | "USER" | string;

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

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
  term: string | null; // "Academic" | "Non-Academic" | null — same field the dashboard uses
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
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.dot }}/>
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

// ── Shared hook: fetch + split courses by term (matches dashboard logic) ────────
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

  // Use course.term — same field the dashboard reads — instead of a hardcoded code list
  const academic      = courses.filter(c => c.term === "Academic");
  const nonAcademic   = courses.filter(c => c.term === "Non-Academic");
  const uncategorized = courses.filter(c => c.term !== "Academic" && c.term !== "Non-Academic");

  return { courses, loading, academic, nonAcademic, uncategorized };
}

// ── Shared grouped dropdown (portal-based, matches dashboard visual style) ─────
function GroupedCourseDropdown({
  value,
  onChange,
  academic,
  nonAcademic,
  uncategorized,
  loading,
  placeholder,
  displayFn,
  keyFn,
}: {
  value: string;
  onChange: (v: string) => void;
  academic: Course[];
  nonAcademic: Course[];
  uncategorized: Course[];
  loading: boolean;
  placeholder?: string;
  // keyFn: what value to store when an item is selected (e.g. id or name)
  keyFn: (c: Course) => string;
  // displayFn: how to show the selected item in the button
  displayFn: (c: Course) => string;
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
            <span>{c.name}</span>
            <span className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">{c.code}</span>
          </button>
        ))}
      </div>
    ) : null;

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen}
        className={`${inputCls} flex items-center justify-between text-left ${loading ? "opacity-60 cursor-not-allowed" : ""}`}>
        <span className={selectedItem ? "text-gray-800" : "text-gray-400"}>
          {loading ? "Loading courses…" : selectedItem ? displayFn(selectedItem) : (placeholder ?? "Select course")}
        </span>
        {loading
          ? <RefreshCw size={12} className="animate-spin text-gray-400 shrink-0"/>
          : <svg viewBox="0 0 20 20" fill="currentColor"
              className="w-3.5 h-3.5 text-gray-400 shrink-0"
              style={{ transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
            </svg>
        }
      </button>

      {open && rect && typeof document !== "undefined" && (() => {
        const menuH = 280;
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const top = spaceBelow >= menuH ? rect.bottom + 4 : rect.top - menuH - 4;
        return ReactDOM.createPortal(
          <div data-grouped-dropdown="true"
            className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-y-auto"
            style={{ position: "fixed", top, left: rect.left, width: rect.width, maxHeight: menuH, zIndex: 9999, fontFamily: FONT }}>
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

// ── Create User Modal ──────────────────────────────────────────────────────────
const CreateUserModal = React.memo(function CreateUserModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (user: StaffUser) => void;
}) {
  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [department,   setDepartment]   = useState("");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [copied,       setCopied]       = useState(false);

  const { loading: coursesLoading, academic, nonAcademic, uncategorized } = useCourses(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setName(""); setEmail(""); setPassword(""); setShowPassword(false);
    setDepartment(""); setError(""); setCopied(false);
  }, [isOpen]);

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

  const handleSubmit = async () => {
    setError("");
    if (!name.trim())     { setError("Full name is required."); return; }
    if (!email.trim())    { setError("Email is required."); return; }
    if (!password.trim()) { setError("Password is required."); return; }

    setSaving(true);
    try {
      const res  = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(), password,
          department: department || null,
          status: "APPROVED",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create user."); return; }
      onCreated({ ...data.user, plainPassword: password });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-500 flex items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <UserPlus size={15} className="text-white"/>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Administration</p>
              <p className="text-sm font-black text-white">Create New User</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <X size={15}/>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <Field label="Full Name" required>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Juan Dela Cruz" className={inputCls}/>
          </Field>

          <Field label="Email Address" required>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="e.g. juan@psu.edu.ph" className={inputCls}/>
          </Field>

          <Field label="Password" required>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type={showPassword ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter or generate password" className={`${inputCls} pr-9`}/>
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
              <button type="button" onClick={handleGenerate} title="Generate password"
                className="h-9 px-3 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0">
                <RefreshCcw size={13}/> Generate
              </button>
              <button type="button" onClick={handleCopy} disabled={!password} title="Copy password"
                className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all disabled:opacity-30 shrink-0">
                {copied ? <Check size={13} className="text-green-500"/> : <Copy size={13}/>}
              </button>
            </div>
            {password && showPassword && (
              <p className="text-[10px] font-mono text-gray-400 mt-1 px-1">{password}</p>
            )}
          </Field>

          <Field label="Department">
            {/* Stores department name (used for user profile display) */}
            <GroupedCourseDropdown
              value={department}
              onChange={setDepartment}
              academic={academic}
              nonAcademic={nonAcademic}
              uncategorized={uncategorized}
              loading={coursesLoading}
              placeholder="Select department"
              keyFn={c => c.name}
              displayFn={c => `${c.name} (${c.code})`}
            />
          </Field>

          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <span className="text-amber-400 text-sm mt-0.5 shrink-0">⚠</span>
            <p className="text-[11px] font-medium text-amber-700 leading-relaxed">
              Make sure to copy the password before saving — it won&apos;t be shown again. Share it with the user securely.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
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
function BulkEnrollModal({
  userIds,
  userCount,
  onClose,
  onDone,
}: {
  userIds: string[];
  userCount: number;
  onClose: () => void;
  onDone: () => void;
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <div className="fixed inset-0 z-500 flex items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
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

        <div className="px-6 py-5 space-y-4">
          {/* User count badge */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
            <Users size={13} className="text-blue-400 shrink-0"/>
            <p className="text-xs font-semibold text-blue-700">
              Enrolling <span className="font-black">{userCount}</span> selected user{userCount !== 1 ? "s" : ""}
            </p>
          </div>

          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
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
              {/* Stores course id (used for enrollment API) */}
              <GroupedCourseDropdown
                value={selectedCourse}
                onChange={setSelectedCourse}
                academic={academic}
                nonAcademic={nonAcademic}
                uncategorized={uncategorized}
                loading={coursesLoading}
                placeholder="Select a course"
                keyFn={c => c.id}
                displayFn={c => `${c.name} (${c.code})`}
              />
            </Field>
          )}
        </div>

        {!success && (
          <div className="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button onClick={onClose} disabled={saving}
              className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">
              Cancel
            </button>
            <button onClick={handleEnroll} disabled={saving || !selectedCourse || coursesLoading}
              className="flex-1 h-9 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              style={{ background: MAROON }}>
              {saving
                ? <><RefreshCw size={13} className="animate-spin"/> Enrolling...</>
                : <><BookPlus size={13}/> Enroll Users</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bulk Delete Confirm Modal ──────────────────────────────────────────────────
function BulkDeleteModal({
  userIds,
  userCount,
  onClose,
  onDeleted,
}: {
  userIds: string[];
  userCount: number;
  onClose: () => void;
  onDeleted: (ids: string[]) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res  = await fetch("/api/admin/users/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
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
    <div className="fixed inset-0 z-500 flex items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="bg-white rounded-2xl shadow-2xl w-80 mx-4 p-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-50">
          <Trash2 className="w-5 h-5 text-red-400"/>
        </div>
        <p className="text-sm font-bold text-gray-900 mb-1">Delete {userCount} user{userCount !== 1 ? "s" : ""}?</p>
        <p className="text-xs text-gray-400 mb-3 font-medium leading-relaxed">
          This action is permanent and cannot be undone. All selected accounts will be removed.
        </p>

        {error && (
          <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
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
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }, []);
  const toggleAll    = () => setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(u => u.id)));

  const selectedIds = [...selected];

  return (
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5" style={{ color: MAROON }}>Administration</p>
          <h1 className="text-xl font-bold text-gray-900 leading-none">User Management</h1>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={fetchUsers}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}/> Refresh
          </button>
          <button type="button" onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-lg text-white transition-all"
            style={{ background: MAROON }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <UserPlus className="w-3.5 h-3.5"/> Create User
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Total Users", value: total,    icon: <Users className="w-4 h-4"/>,    accent: "#2d3b45" },
            { label: "Active",      value: approved, icon: <Activity className="w-4 h-4"/>, accent: "#15803d" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", borderColor: "#e5e7eb" }}
              className="border rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="rounded-lg p-2.5 shrink-0" style={{ background: "#f3f4f6", color: s.accent }}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums leading-none" style={{ color: "#111827" }}>{s.value}</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: "#6b7280" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">

          {/* Toolbar */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 bg-white">
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 w-52 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search users..." className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent"/>
                {search && <button type="button" onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500"><X className="w-3 h-3"/></button>}
              </div>
              <button type="button" onClick={() => setShowFilters(f => !f)}
                style={(showFilters || deptFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${!(showFilters || deptFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700" : ""}`}>
                <SlidersHorizontal className="w-3 h-3"/> Filters
                {deptFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0"/>}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Filter by</span>
              <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {deptFilter && (
                <button type="button" onClick={() => setDeptFilter("")}
                  style={{ color: MAROON }} className="ml-auto text-[11px] font-bold hover:underline">Clear filters</button>
              )}
            </div>
          )}

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-5 py-2.5 shrink-0" style={{ background: MAROON }}>
              <span className="text-xs font-bold text-white tabular-nums">
                {selected.size} user{selected.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" onClick={() => setShowBulkEnroll(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition-all border border-white/20">
                  <BookPlus className="w-3 h-3"/> Enroll to Course
                </button>
                <button type="button" onClick={() => setShowBulkDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-[11px] font-bold transition-all border border-red-400/40">
                  <Trash2 className="w-3 h-3"/> Delete Selected
                </button>
                <button type="button" onClick={() => setSelected(new Set())}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors ml-1">
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
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <th className="pl-5 pr-3 py-3 w-9">
                      <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0}
                        onChange={toggleAll} className="w-3.5 h-3.5 cursor-pointer rounded" style={{ accentColor: MAROON }}/>
                    </th>
                    <th className="text-left px-3 py-3">
                      <button type="button" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-600 hover:text-gray-900">
                        Name <ArrowUpDown className="w-3 h-3"/>
                      </button>
                    </th>
                    {["Department","Joined","Status",""].map((h, i) => (
                      <th key={i} className="text-left px-3 py-3 text-xs font-bold uppercase tracking-wide text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
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
                      <td className="px-3 py-3.5"><span className="text-xs text-gray-500">{u.department ?? <span className="text-gray-200">—</span>}</span></td>
                      <td className="px-3 py-3.5"><span className="text-[11px] text-gray-400 tabular-nums">{formatDate(u.createdAt)}</span></td>
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
          )}

          {!loading && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white shrink-0">
              <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-25 transition-all">
                  <ChevronLeft className="w-3 h-3"/>
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const n = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
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

      <CreateUserModal isOpen={showCreate} onClose={handleModalClose} onCreated={handleModalCreated}/>

      {/* Confirm modal (single user) */}
      {confirm && (
        <div className="fixed inset-0 z-400 flex items-center justify-center bg-black/25 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-80 mx-4">
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
        <BulkDeleteModal
          userIds={selectedIds}
          userCount={selected.size}
          onClose={() => setShowBulkDelete(false)}
          onDeleted={handleBulkDeleted}
        />
      )}

      {showBulkEnroll && (
        <BulkEnrollModal
          userIds={selectedIds}
          userCount={selected.size}
          onClose={() => setShowBulkEnroll(false)}
          onDone={handleBulkEnrollDone}
        />
      )}

      {/* Profile Drawer */}
      {viewed && (
        <div className="fixed inset-0 z-400 flex items-center justify-end"
          style={{ backdropFilter: "blur(4px)", backgroundColor: "rgba(0,0,0,0.2)" }}
          onClick={() => setViewed(null)}>
          <div className="h-full w-72 bg-white border-l border-gray-200 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Profile</span>
              <button type="button" onClick={() => setViewed(null)}
                className="w-6 h-6 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-all">
                <X className="w-3 h-3"/>
              </button>
            </div>
            <div className="px-5 py-5 border-b border-gray-100">
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
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white uppercase tracking-widest"
                    style={{ background: MAROON }}>{viewed.accountType}</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2">
              {[
                { label: "Account Type", value: viewed.accountType     ?? "—" },
                { label: "Department",   value: viewed.department       ?? "—" },
                { label: "Position",     value: viewed.position         ?? "—" },
                { label: "Employment",   value: viewed.employmentStatus ?? "—" },
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