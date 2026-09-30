"use client";

// src/components/layout/course/CourseAssignmentsList.tsx

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search, Plus, MoreVertical, X, ChevronDown,
  CheckCircle,
} from "lucide-react";
import {
  MAROON, FONT, TIME_OPTIONS,
  fmtDue,
  isoToDate, isoToTime,
  loadPersistedGroups, persistGroups,
} from "./helpers";
import type { Assignment, Section, Staff } from "./types";

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL CSS — matches admin styling + fixes modal z-index over bottom nav
───────────────────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }

  @media (max-width: 767px) {
    input, textarea, select { font-size: 16px !important; }
  }

  button, [role="button"] { -webkit-tap-highlight-color: transparent; }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  /* ── Mobile modal: bottom sheet ── */
  @media (max-width: 639px) {
    .cal-modal-overlay {
      align-items: flex-end !important;
      padding-bottom: 96px !important;
    }
    .cal-modal-box {
      border-radius: 20px 20px 0 0 !important;
      max-height: calc(100dvh - 96px) !important;
    }
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
type AssignmentWithRole = Assignment & {
  _assignmentRole?: "manager" | "submitter";
  _publisherName?: string | null;
  _publisherImage?: string | null;
  _publisherRole?: string | null;
  _publisherId?: string | null;
  _isAssignedToYou?: boolean;
  _isExplicitlyAssignedToYou?: boolean;
  isAssignedToYou?: boolean;
  isCreator?: boolean;
};

const DEFAULT_GROUP = "Assignments";

/* ─────────────────────────────────────────────────────────────────────────────
   DEVICE DETECTION
───────────────────────────────────────────────────────────────────────────── */
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SEEN / NEW BADGE
───────────────────────────────────────────────────────────────────────────── */
const SEEN_KEY = (courseId: string) => `seen_assignments_${courseId}`;
function getSeenIds(courseId: string): Set<string> {
  try { const raw = localStorage.getItem(SEEN_KEY(courseId)); return new Set(raw ? JSON.parse(raw) : []); }
  catch { return new Set(); }
}
function markSeen(courseId: string, id: string | number) {
  try { const seen = getSeenIds(courseId); seen.add(String(id)); localStorage.setItem(SEEN_KEY(courseId), JSON.stringify([...seen])); }
  catch { /* ignore */ }
}
function NewBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff", background: "#dc2626", flexShrink: 0 }}>
      NEW
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function fmtDateLabel(date: string, time: string) {
  if (!date) return "";
  try {
    const d = new Date(`${date}T00:00:00`);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) + " " + (time || "11:59 PM");
  } catch { return ""; }
}
function getBool(v: unknown): boolean { return v === true; }
function resolveRole(a: AssignmentWithRole, currentUserId?: string | null): "manager" | "submitter" {
  const assignedToYou = getBool(a._isAssignedToYou) || getBool(a._isExplicitlyAssignedToYou) || getBool(a.isAssignedToYou);
  const isCreator = getBool(a.isCreator) || (!!currentUserId && !!a._publisherId && a._publisherId === currentUserId);
  if (assignedToYou && !isCreator) return "submitter";
  if (isCreator) return "manager";
  if (a._assignmentRole === "submitter") return "submitter";
  if (a._assignmentRole === "manager") return "manager";
  return "submitter";
}

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLISHER AVATAR
───────────────────────────────────────────────────────────────────────────── */
function PublisherAvatar({ name, image, size = 20 }: { name?: string | null; image?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  if (image && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={name ?? "Publisher"} width={size} height={size} onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid #bfdbfe" }} />
    );
  }
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", background: "#1d6fa4", color: "#fff", fontSize: size * 0.42, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {initial}
    </span>
  );
}

function PublisherChip({ name, image, role }: { name?: string | null; image?: string | null; role?: string | null }) {
  if (!name) return null;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
      <PublisherAvatar name={name} image={image} size={18} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{name}</span>
      {role && <span style={{ padding: "1px 5px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", background: "#eff6ff", color: "#1d6fa4", border: "1px solid #bfdbfe", flexShrink: 0 }}>{role}</span>}
    </span>
  );
}

function AuthorBadge({ name, role }: { name: string; role: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, border: "1px solid #f0c0c0", background: "#fdf8f8", color: MAROON, flexShrink: 0 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: MAROON, flexShrink: 0 }} />
      {name} · {role}
    </span>
  );
}

function PublishToggle({ published, onToggle }: { published: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} title={published ? "Published — click to unpublish" : "Unpublished — click to publish"}
      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 2, touchAction: "manipulation", minWidth: 26, minHeight: 26 }}>
      {published ? (
        <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#16a34a" /><path d="M5.5 10.5l3 3 6-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : (
        <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#9ca3af" strokeWidth="1.5" fill="none" /><line x1="6" y1="14" x2="14" y2="6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" /></svg>
      )}
    </button>
  );
}

function AssignmentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ flexShrink: 0 }}>
      <rect x="4" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL SHELL — matches admin style, fixed z-index over bottom nav
───────────────────────────────────────────────────────────────────────────── */
function ModalShell({ onClose, children, maxWidth = 420 }: {
  onClose: () => void; children: React.ReactNode; maxWidth?: number;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="cal-modal-overlay"
      style={{
        position: "fixed", inset: 0, zIndex: 9500,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.36)", fontFamily: FONT,
      }}
      onClick={onClose}
    >
      <div
        className="cal-modal-box"
        style={{
          background: "#fff", width: "100%", maxWidth,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          borderRadius: 12, overflow: "hidden",
          display: "flex", flexDirection: "column",
          maxHeight: "90vh",
          animation: "slideUp 0.2s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden" style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED MODAL COMPONENTS
───────────────────────────────────────────────────────────────────────────── */
function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e5e7eb", background: MAROON, flexShrink: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{title}</span>
      <button onClick={onClose} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 7, background: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)" }}>
        <X size={13} />
      </button>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "12px 18px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
      {children}
    </div>
  );
}

function BtnPrimary({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ height: 36, padding: "0 18px", fontFamily: FONT, fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", color: "#fff", background: disabled ? "#d1d5db" : MAROON, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

function BtnSecondary({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ height: 36, padding: "0 14px", fontFamily: FONT, fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid #d1d5db", color: "#374151", background: "#fff", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
      {children}{required && <span style={{ color: MAROON, marginLeft: 2 }}>*</span>}
    </label>
  );
}

function StyledInput({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
      onFocus={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(123,17,19,0.08)`; }}
      onBlur={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
      style={{ width: "100%", height: 40, border: "1px solid #d1d5db", borderRadius: 8, padding: "0 12px", fontFamily: FONT, fontSize: 13, color: "#111827", background: "#fafafa", outline: "none", transition: "border-color 0.15s" }} />
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROW 3-DOT MENU
───────────────────────────────────────────────────────────────────────────── */
type DropdownAction = "edit" | "duplicate" | "assignTo" | "delete";

function AssignmentRowMenu({ assignment, onAction, isManager, courseId, canDelete = false }: {
  assignment: AssignmentWithRole; onAction: (action: DropdownAction, a: AssignmentWithRole) => void;
  isManager: boolean; courseId: string; canDelete?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const itemCount = isManager ? (canDelete ? 4 : 3) : 0;
    const h = itemCount * 44 + 8;
    const w = 190;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= h ? rect.bottom + 4 : rect.top - h - 4;
    const left = Math.min(rect.right - w, window.innerWidth - w - 8);
    setMenuStyle({ position: "fixed", top: Math.max(8, top), left: Math.max(8, left), zIndex: 9999, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.14)", minWidth: w, overflow: "hidden" });
    setOpen(v => !v);
  };

  const managerItems: { label: string; action: DropdownAction; danger?: boolean; icon: React.ReactNode }[] = [
    { label: "Edit", action: "edit", icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" /></svg> },
    { label: "Duplicate", action: "duplicate", icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg> },
    { label: "Assign To…", action: "assignTo", icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="12" cy="7" r="4" /></svg> },
    ...(canDelete ? [{ label: "Delete", action: "delete" as DropdownAction, danger: true, icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" strokeLinecap="round" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" /><path d="M10 11v6M14 11v6" strokeLinecap="round" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" /></svg> }] : []),
  ];

  return (
    <>
      <button ref={btnRef} type="button" onClick={e => { e.stopPropagation(); handleOpen(); }}
        style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: "#9ca3af", touchAction: "manipulation" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}>
        <MoreVertical size={16} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={menuStyle} onClick={e => e.stopPropagation()}>
          {isManager && managerItems.map((item, i) => (
            <button key={item.action} type="button"
              onClick={() => { setOpen(false); onAction(item.action, assignment); }}
              style={{ width: "100%", textAlign: "left", padding: "11px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer", color: item.danger ? "#dc2626" : "#374151", borderTop: i > 0 ? "1px solid #f3f4f6" : "none", minHeight: 44 }}
              onMouseEnter={e => (e.currentTarget.style.background = item.danger ? "#fef2f2" : "#f9fafb")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GROUP 3-DOT MENU
───────────────────────────────────────────────────────────────────────────── */
function GroupMenu({ onEdit, onDelete, isLastGroup }: { onEdit: () => void; onDelete: () => void; isLastGroup?: boolean }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const h = isLastGroup ? 44 : 88;
    const w = 160;
    const top = window.innerHeight - rect.bottom >= h ? rect.bottom + 4 : rect.top - h - 4;
    const left = Math.min(rect.right - w, window.innerWidth - w - 8);
    setMenuStyle({ position: "fixed", top, left, zIndex: 9999, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.12)", minWidth: w, overflow: "hidden" });
    setOpen(v => !v);
  };

  return (
    <>
      <button ref={btnRef} type="button" onClick={e => { e.stopPropagation(); handleOpen(); }}
        style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#9ca3af", touchAction: "manipulation" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#e5e7eb")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}>
        <MoreVertical size={14} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={menuStyle}>
          <button type="button" onClick={() => { setOpen(false); onEdit(); }}
            style={{ width: "100%", textAlign: "left", padding: "11px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "#374151", minHeight: 44 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" /></svg>
            Edit
          </button>
          {!isLastGroup && (
            <button type="button" onClick={() => { setOpen(false); onDelete(); }}
              style={{ width: "100%", textAlign: "left", padding: "11px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "#dc2626", borderTop: "1px solid #f3f4f6", minHeight: 44 }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" strokeLinecap="round" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" /><path d="M10 11v6M14 11v6" strokeLinecap="round" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" /></svg>
              Delete
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE ASSIGNMENT MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteAssignmentModal({ assignment, onClose, onConfirm, deleting }: {
  assignment: AssignmentWithRole; onClose: () => void; onConfirm: () => void; deleting: boolean;
}) {
  return (
    <ModalShell onClose={onClose} maxWidth={400}>
      <ModalHeader title="Delete Assignment" onClose={onClose} />
      <div style={{ padding: "18px", flex: 1 }}>
        <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: 0 }}>
          Are you sure you want to delete <strong>&ldquo;{assignment.title}&rdquo;</strong>? This action cannot be undone.
        </p>
      </div>
      <ModalFooter>
        <BtnSecondary onClick={onClose} disabled={deleting}>Cancel</BtnSecondary>
        <button type="button" onClick={onConfirm} disabled={deleting}
          style={{ height: 36, padding: "0 18px", fontFamily: FONT, fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", color: "#fff", background: "#dc2626", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD GROUP MODAL
───────────────────────────────────────────────────────────────────────────── */
function AddGroupModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (name: string) => void; saving: boolean }) {
  const [name, setName] = useState("");
  return (
    <ModalShell onClose={onClose} maxWidth={420}>
      <ModalHeader title="Add Assignment Group" onClose={onClose} />
      <div style={{ padding: "18px", flex: 1 }}>
        <FieldLabel>Group Name</FieldLabel>
        <StyledInput value={name} onChange={setName} placeholder="e.g., Essay Group 1" autoFocus />
      </div>
      <ModalFooter>
        <BtnSecondary onClick={onClose} disabled={saving}>Cancel</BtnSecondary>
        <BtnPrimary onClick={() => name.trim() && onSave(name.trim())} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save"}
        </BtnPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EDIT GROUP MODAL
───────────────────────────────────────────────────────────────────────────── */
function EditGroupModal({ groupName, onClose, onSave, saving }: { groupName: string; onClose: () => void; onSave: (n: string) => void; saving: boolean }) {
  const [name, setName] = useState(groupName);
  return (
    <ModalShell onClose={onClose} maxWidth={420}>
      <ModalHeader title="Edit Assignment Group" onClose={onClose} />
      <div style={{ padding: "18px", flex: 1 }}>
        <FieldLabel>Group Name</FieldLabel>
        <StyledInput value={name} onChange={setName} autoFocus />
      </div>
      <ModalFooter>
        <BtnSecondary onClick={onClose} disabled={saving}>Cancel</BtnSecondary>
        <BtnPrimary onClick={() => name.trim() && onSave(name.trim())} disabled={saving || !name.trim() || name.trim() === groupName}>
          {saving ? "Saving…" : "Save"}
        </BtnPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE GROUP MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteGroupModal({ groupName, assignmentCount, otherGroups, onClose, onDelete }: {
  groupName: string; assignmentCount: number; otherGroups: string[];
  onClose: () => void; onDelete: (action: "delete" | "move", targetGroup?: string) => void;
}) {
  const [choice, setChoice] = useState<"delete" | "move">("delete");
  const [targetGroup, setTargetGroup] = useState(otherGroups[0] ?? "");
  return (
    <ModalShell onClose={onClose} maxWidth={460}>
      <ModalHeader title="Delete Assignment Group" onClose={onClose} />
      <div style={{ padding: "18px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>
          You are about to delete <strong>{groupName}</strong>, which has <strong>{assignmentCount}</strong> assignment{assignmentCount !== 1 ? "s" : ""}.
        </p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>What would you like to do with its assignments?</p>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", border: `1.5px solid ${choice === "delete" ? MAROON : "#e5e7eb"}`, borderRadius: 8, background: choice === "delete" ? "#fdf8f8" : "#fff" }}>
          <input type="radio" checked={choice === "delete"} onChange={() => setChoice("delete")} style={{ accentColor: MAROON, width: 16, height: 16, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#374151" }}>Delete its assignments</span>
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", border: `1.5px solid ${choice === "move" ? MAROON : "#e5e7eb"}`, borderRadius: 8, background: choice === "move" ? "#fdf8f8" : "#fff", opacity: otherGroups.length === 0 ? 0.4 : 1 }}>
            <input type="radio" checked={choice === "move"} onChange={() => setChoice("move")} disabled={otherGroups.length === 0} style={{ accentColor: MAROON, width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: otherGroups.length === 0 ? "#9ca3af" : "#374151" }}>Move its assignments to…</span>
          </label>
          {choice === "move" && otherGroups.length > 0 && (
            <div style={{ position: "relative", marginLeft: 26 }}>
              <select value={targetGroup} onChange={e => setTargetGroup(e.target.value)}
                style={{ width: "100%", height: 40, border: "1px solid #d1d5db", borderRadius: 8, padding: "0 32px 0 12px", fontFamily: FONT, fontSize: 13, color: "#111827", background: "#fafafa", outline: "none", appearance: "none", cursor: "pointer" }}>
                <option value="">[ Select a Group ]</option>
                {otherGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
            </div>
          )}
        </div>
      </div>
      <ModalFooter>
        <BtnSecondary onClick={onClose}>Cancel</BtnSecondary>
        <button type="button" onClick={() => onDelete(choice, choice === "move" ? targetGroup : undefined)}
          disabled={choice === "move" && !targetGroup}
          style={{ height: 36, padding: "0 18px", fontFamily: FONT, fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", color: "#fff", background: "#dc2626", cursor: "pointer", opacity: choice === "move" && !targetGroup ? 0.4 : 1 }}>
          Delete Group
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   QUICK EDIT MODAL
───────────────────────────────────────────────────────────────────────────── */
function QuickEditModal({ assignment, onClose, onSave, onMoreOptions }: {
  assignment: AssignmentWithRole; onClose: () => void;
  onSave: (updated: Partial<Assignment> & { dueTime?: string }) => Promise<void>;
  onMoreOptions: () => void;
}) {
  const [name, setName] = useState(assignment.title);
  const [dueDate, setDueDate] = useState(isoToDate(assignment.dueDate));
  const [dueTime, setDueTime] = useState(isoToTime(assignment.dueDate));
  const [points, setPoints] = useState(String(assignment.points));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateLabel = fmtDateLabel(dueDate, dueTime);

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    try { await onSave({ title: name.trim(), points: parseFloat(points) || 0, dueDate: dueDate || null, dueTime }); onClose(); }
    catch { setError("Failed to save."); } finally { setSaving(false); }
  };

  return (
    <ModalShell onClose={onClose} maxWidth={480}>
      <ModalHeader title="Edit Assignment" onClose={onClose} />
      <div style={{ padding: "18px", overflowY: "auto", flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <FieldLabel required>Name</FieldLabel>
          <StyledInput value={name} onChange={setName} autoFocus />
        </div>
        <div>
          <FieldLabel>Due at</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 4 }}>Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                style={{ width: "100%", height: 40, border: "1px solid #d1d5db", borderRadius: 8, padding: "0 10px", fontFamily: FONT, fontSize: 13, color: "#111827", background: "#fafafa", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 4 }}>Time</label>
              <div style={{ position: "relative" }}>
                <select value={dueTime} onChange={e => setDueTime(e.target.value)}
                  style={{ width: "100%", height: 40, border: "1px solid #d1d5db", borderRadius: 8, padding: "0 28px 0 10px", fontFamily: FONT, fontSize: 13, color: "#111827", background: "#fafafa", outline: "none", appearance: "none", cursor: "pointer" }}>
                  {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
              </div>
            </div>
          </div>
          {dateLabel && <p style={{ fontSize: 11, color: MAROON, fontWeight: 600, marginTop: 5, marginBottom: 0 }}>{dateLabel}</p>}
        </div>
        <div>
          <FieldLabel>Points</FieldLabel>
          <input type="number" min={0} value={points} onChange={e => setPoints(e.target.value)}
            style={{ width: 130, height: 40, border: "1px solid #d1d5db", borderRadius: 8, padding: "0 12px", fontFamily: FONT, fontSize: 13, color: "#111827", background: "#fafafa", outline: "none" }} />
        </div>
        {error && <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>⚠ {error}</p>}
      </div>
      <ModalFooter>
        <BtnSecondary onClick={onMoreOptions}>More Options</BtnSecondary>
        <div style={{ flex: 1 }} />
        <BtnSecondary onClick={onClose} disabled={saving}>Cancel</BtnSecondary>
        <BtnPrimary onClick={handleSave} disabled={saving || !name.trim()}>{saving ? "Saving…" : "Save"}</BtnPrimary>
      </ModalFooter>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ASSIGN TO PANEL — bottom sheet on mobile, side panel on desktop
───────────────────────────────────────────────────────────────────────────── */
interface AssignRow {
  id: number; assignees: string[];
  dueDate: string; dueTime: string;
  availableFrom: string; availableFromTime: string;
  until: string; untilTime: string;
}

function AssignToPanel({ assignment, courseId, sections, staff, onClose, onSave }: {
  assignment: AssignmentWithRole; courseId: string; sections: Section[]; staff: Staff[];
  onClose: () => void; onSave: () => void;
}) {
  const [rows, setRows] = useState<AssignRow[]>([{
    id: 1, assignees: ["Everyone"],
    dueDate: isoToDate(assignment.dueDate), dueTime: isoToTime(assignment.dueDate),
    availableFrom: isoToDate(assignment.availableFrom), availableFromTime: isoToTime(assignment.availableFrom),
    until: isoToDate(assignment.availableUntil), untilTime: isoToTime(assignment.availableUntil),
  }]);
  const [saving, setSaving] = useState(false);
  const [openDropId, setOpenDropId] = useState<number | null>(null);
  const [dropSearch, setDropSearch] = useState("");
  const isMobile = useIsMobile();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (openDropId === null) return;
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-assigndrop]")) setOpenDropId(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openDropId]);

  const updateRow = (id: number, field: keyof AssignRow, value: string | string[]) =>
    setRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const toggleAssignee = (rowId: number, name: string) =>
    setRows(p => p.map(r => {
      if (r.id !== rowId) return r;
      const has = r.assignees.includes(name);
      return { ...r, assignees: has ? r.assignees.filter(a => a !== name) : [...r.assignees, name] };
    }));

  const addRow = () => setRows(p => [...p, { id: Date.now(), assignees: [], dueDate: "", dueTime: "11:59 PM", availableFrom: "", availableFromTime: "12:00 AM", until: "", untilTime: "11:59 PM" }]);
  const removeRow = (id: number) => setRows(p => p.filter(r => r.id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      const row = rows[0];
      await fetch(`/api/courses/${courseId}/assignments/${assignment.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignees: row.assignees, dueDate: row.dueDate || null, dueTime: row.dueTime, availableFrom: row.availableFrom || null, availableFromTime: row.availableFromTime, availableUntil: row.until || null, untilTime: row.untilTime }),
      });
      onSave(); onClose();
    } finally { setSaving(false); }
  };

  function DateRow({ label, dateVal, timeVal, onDateChange, onTimeChange, onClear }: {
    label: string; dateVal: string; timeVal: string;
    onDateChange: (v: string) => void; onTimeChange: (v: string) => void; onClear: () => void;
  }) {
    const localLabel = fmtDateLabel(dateVal, timeVal);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: 0 }}>{label}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4, marginTop: 0 }}>Date</p>
            <input type="date" value={dateVal} onChange={e => onDateChange(e.target.value)}
              style={{ width: "100%", height: 38, border: "1px solid #d1d5db", borderRadius: 7, padding: "0 10px", fontFamily: FONT, fontSize: 13, color: "#111827", background: "#fff", outline: "none" }} />
          </div>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4, marginTop: 0 }}>Time</p>
            <div style={{ position: "relative" }}>
              <select value={timeVal} onChange={e => onTimeChange(e.target.value)}
                style={{ width: "100%", height: 38, border: "1px solid #d1d5db", borderRadius: 7, padding: "0 28px 0 10px", fontFamily: FONT, fontSize: 13, color: "#111827", background: "#fff", outline: "none", appearance: "none", cursor: "pointer" }}>
                {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
            </div>
          </div>
        </div>
        {localLabel && <p style={{ fontSize: 10, color: "#6b7280", margin: 0 }}>Local: {localLabel}</p>}
        <button onClick={onClear} style={{ fontSize: 10, fontWeight: 700, color: MAROON, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", textDecoration: "underline", alignSelf: "flex-start" }}>Clear</button>
      </div>
    );
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 9400, background: "rgba(0,0,0,0.25)" }} onClick={onClose} />
      <div style={{
        position: "fixed", zIndex: 9500, background: "#fff", display: "flex", flexDirection: "column", fontFamily: FONT,
        ...(isMobile
          ? { bottom: 0, left: 0, right: 0, maxHeight: "calc(100dvh - 96px)", borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)", borderTop: "1px solid #e5e7eb" }
          : { top: 0, right: 0, bottom: 0, width: 380, borderLeft: "1px solid #e5e7eb", boxShadow: "-4px 0 32px rgba(0,0,0,0.15)" }),
      }}>
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#d1d5db" }} />
          </div>
        )}

        {/* Panel header */}
        <div style={{ padding: "14px 16px", background: MAROON, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" }}>Assign To</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AssignmentIcon />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assignment.title}</span>
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", margin: "2px 0 0 23px" }}>Assignment · {assignment.points} pts</p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 7, background: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", flexShrink: 0 }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div style={{ margin: "12px 14px 0", display: "flex", gap: 10, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 12px", flexShrink: 0 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#1d6fa4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: 9, fontWeight: 800 }}>i</span>
          </div>
          <p style={{ fontSize: 11, color: "#1e40af", lineHeight: 1.5, margin: 0 }}>Select who should be assigned and set date and time using the fields below.</p>
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {rows.map((row, idx) => (
              <div key={row.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px", display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>
                {idx > 0 && (
                  <button onClick={() => removeRow(row.id)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 4 }}>
                    <X size={13} />
                  </button>
                )}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, marginTop: 0 }}>Assign To</p>
                  <div style={{ position: "relative" }} data-assigndrop>
                    <div onMouseDown={e => { e.stopPropagation(); setOpenDropId(openDropId === row.id ? null : row.id); setDropSearch(""); }}
                      style={{ minHeight: 40, border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", cursor: "pointer", background: "#fafafa" }}>
                      {row.assignees.map(a => (
                        <span key={a} style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#fff", background: MAROON }}>
                          {a}
                          <button onMouseDown={e => { e.stopPropagation(); toggleAssignee(row.id, a); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                        </span>
                      ))}
                      <input readOnly placeholder={row.assignees.length ? "" : "Start typing to search…"}
                        style={{ flex: 1, minWidth: 60, fontSize: 13, border: "none", outline: "none", background: "transparent", color: "#9ca3af", cursor: "pointer" }} />
                      <ChevronDown size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
                    </div>
                    {openDropId === row.id && (
                      <div data-assigndrop style={{ position: "absolute", zIndex: 50, width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", marginTop: 2, maxHeight: 200, overflowY: "auto" }}
                        onMouseDown={e => e.stopPropagation()}>
                        <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid #f3f4f6", position: "sticky", top: 0, background: "#fff" }}>
                          <input autoFocus value={dropSearch} onChange={e => setDropSearch(e.target.value)} placeholder="Search…"
                            style={{ width: "100%", height: 34, border: "1px solid #e5e7eb", borderRadius: 6, padding: "0 10px", fontSize: 13, fontFamily: FONT, outline: "none" }} />
                        </div>
                        {["Everyone"].filter(o => o.toLowerCase().includes(dropSearch.toLowerCase())).map(opt => (
                          <button key={opt} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, opt); }}
                            style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", color: row.assignees.includes(opt) ? MAROON : "#374151", fontWeight: row.assignees.includes(opt) ? 700 : 400, minHeight: 40 }}>
                            {opt}{row.assignees.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
                          </button>
                        ))}
                        {sections.filter(s => s.name.toLowerCase().includes(dropSearch.toLowerCase())).length > 0 && (
                          <>
                            <div style={{ padding: "6px 12px 4px", fontSize: 9, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", background: "#f9fafb", borderTop: "1px solid #f3f4f6" }}>Sections</div>
                            {sections.filter(s => s.name.toLowerCase().includes(dropSearch.toLowerCase())).map(s => (
                              <button key={s.id} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }}
                                style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", color: row.assignees.includes(s.name) ? MAROON : "#374151", fontWeight: row.assignees.includes(s.name) ? 700 : 400, minHeight: 40 }}>
                                {s.name}{row.assignees.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                              </button>
                            ))}
                          </>
                        )}
                        {staff.filter(s => s.name.toLowerCase().includes(dropSearch.toLowerCase())).length > 0 && (
                          <>
                            <div style={{ padding: "6px 12px 4px", fontSize: 9, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", background: "#f9fafb", borderTop: "1px solid #f3f4f6" }}>Staff</div>
                            {staff.filter(s => s.name.toLowerCase().includes(dropSearch.toLowerCase())).map(s => (
                              <button key={s.id} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }}
                                style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", color: row.assignees.includes(s.name) ? MAROON : "#374151", fontWeight: row.assignees.includes(s.name) ? 700 : 400, minHeight: 40 }}>
                                {s.name}{row.assignees.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <DateRow label="Due Date" dateVal={row.dueDate} timeVal={row.dueTime} onDateChange={v => updateRow(row.id, "dueDate", v)} onTimeChange={v => updateRow(row.id, "dueTime", v)} onClear={() => { updateRow(row.id, "dueDate", ""); updateRow(row.id, "dueTime", "11:59 PM"); }} />
                <DateRow label="Available from" dateVal={row.availableFrom} timeVal={row.availableFromTime} onDateChange={v => updateRow(row.id, "availableFrom", v)} onTimeChange={v => updateRow(row.id, "availableFromTime", v)} onClear={() => { updateRow(row.id, "availableFrom", ""); updateRow(row.id, "availableFromTime", "12:00 AM"); }} />
                <DateRow label="Until" dateVal={row.until} timeVal={row.untilTime} onDateChange={v => updateRow(row.id, "until", v)} onTimeChange={v => updateRow(row.id, "untilTime", v)} onClear={() => { updateRow(row.id, "until", ""); updateRow(row.id, "untilTime", "11:59 PM"); }} />
              </div>
            ))}
            <button onClick={addRow} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", padding: "4px 0", touchAction: "manipulation" }}>
              <Plus size={13} /> Add Row
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb", padding: "12px 14px", display: "flex", justifyContent: "flex-end", gap: 8, background: "#f9fafb" }}>
          <BtnSecondary onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</BtnPrimary>
        </div>
        <div style={{ height: "env(safe-area-inset-bottom)", flexShrink: 0 }} />
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MINE ASSIGNMENT ROW
───────────────────────────────────────────────────────────────────────────── */
function MineAssignmentRow({ a, courseId, currentUserName, currentUserRole, seenIds, canDelete, onView, onEdit, onDuplicate, onAssignTo, onDelete, onTogglePublish }: {
  a: AssignmentWithRole; courseId: string; currentUserName?: string | null; currentUserRole?: string | null;
  seenIds: Set<string>; canDelete?: boolean;
  onView: (a: AssignmentWithRole) => void; onEdit: (a: AssignmentWithRole) => void;
  onDuplicate: (a: AssignmentWithRole) => void; onAssignTo: (a: AssignmentWithRole) => void;
  onDelete: (a: AssignmentWithRole) => void; onTogglePublish: (a: AssignmentWithRole) => void;
}) {
  const now = new Date();
  const isClosed = a.availableUntil && now > new Date(a.availableUntil);
  const due = fmtDue(a.dueDate);
  const authorName = a._publisherName ?? currentUserName;
  const authorRole = a._publisherRole ?? currentUserRole ?? "Staff";

  const handleAction = (action: DropdownAction, assignment: AssignmentWithRole) => {
    if (action === "edit") onEdit(assignment);
    else if (action === "duplicate") onDuplicate(assignment);
    else if (action === "assignTo") onAssignTo(assignment);
    else if (action === "delete") onDelete(assignment);
  };

  return (
    <div
      style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "9px 8px 9px 12px", background: "#fff", borderBottom: "1px solid #f3f4f6", cursor: "pointer", position: "relative", transition: "background 0.1s" }}
      onClick={() => onView(a)}
      onMouseEnter={e => (e.currentTarget.style.background = "#fdf8f8")}
      onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "0 2px 2px 0", background: MAROON }} />
      <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, marginTop: 0 }}>
        <PublishToggle published={a.status === "PUBLISHED"} onToggle={() => onTogglePublish(a)} />
      </div>
      <div style={{ flexShrink: 0, marginTop: 2 }}><AssignmentIcon /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap", marginBottom: 3 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: MAROON, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{a.title}</span>
          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, flexShrink: 0 }}>· {a.points} pts</span>
          {!seenIds.has(String(a.id)) && <NewBadge />}
          {a.status === "UNPUBLISHED" && <span style={{ fontSize: 10, color: "#d97706", fontWeight: 600, flexShrink: 0 }}>Not Published</span>}
          {isClosed && <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, flexShrink: 0 }}>Closed</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {authorName && <AuthorBadge name={authorName} role={authorRole} />}
          {due && <span style={{ fontSize: 11, color: "#6b7280" }}>Due: {due}</span>}
        </div>
      </div>
      <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, marginLeft: 2 }}>
        <AssignmentRowMenu assignment={a} onAction={handleAction} isManager={true} courseId={courseId} canDelete={canDelete} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   OTHERS ASSIGNMENT ROW
───────────────────────────────────────────────────────────────────────────── */
function OthersAssignmentRow({ a, courseId, seenIds, onView }: {
  a: AssignmentWithRole; courseId: string; seenIds: Set<string>; onView: (a: AssignmentWithRole) => void;
}) {
  const now = new Date();
  const sub = (a as Assignment & { submissions?: { submittedAt?: string }[] }).submissions?.[0];
  const isClosed = a.availableUntil && now > new Date(a.availableUntil);
  const isLocked = a.availableFrom && now < new Date(a.availableFrom);
  const due = fmtDue(a.dueDate);

  return (
    <div
      style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "9px 8px 9px 12px", background: "#fafcff", borderBottom: "1px solid #f3f4f6", cursor: "pointer", position: "relative", transition: "background 0.1s" }}
      onClick={() => onView(a)}
      onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
      onMouseLeave={e => (e.currentTarget.style.background = "#fafcff")}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "0 2px 2px 0", background: "#60a5fa" }} />
      <div style={{ flexShrink: 0, marginLeft: 4, marginTop: 2 }}><AssignmentIcon /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap", marginBottom: 3 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1d4ed8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{a.title}</span>
          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, flexShrink: 0 }}>· {a.points} pts</span>
          {!seenIds.has(String(a.id)) && <NewBadge />}
          {isClosed && <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, flexShrink: 0 }}>Closed</span>}
          {isLocked && <span style={{ fontSize: 10, color: "#d97706", fontWeight: 600, flexShrink: 0 }}>Not yet open</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <PublisherChip name={a._publisherName} image={a._publisherImage} role={a._publisherRole} />
          {due && <span style={{ fontSize: 11, color: "#6b7280" }}>Due: {due}</span>}
          {sub?.submittedAt && <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}><CheckCircle size={11} /> Submitted</span>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MINE GROUP SECTION
───────────────────────────────────────────────────────────────────────────── */
function MineGroupSection({ title, items, courseId, currentUserName, currentUserRole, seenIds, canDelete, onAddAssignment, onView, onEdit, onDuplicate, onAssignTo, onDelete, onTogglePublish, onEditGroup, onDeleteGroup, isLastGroup }: {
  title: string; items: AssignmentWithRole[]; courseId: string;
  currentUserName?: string | null; currentUserRole?: string | null;
  seenIds: Set<string>; canDelete?: boolean;
  onAddAssignment: (group: string) => void;
  onView: (a: AssignmentWithRole) => void; onEdit: (a: AssignmentWithRole) => void;
  onDuplicate: (a: AssignmentWithRole) => void; onAssignTo: (a: AssignmentWithRole) => void;
  onDelete: (a: AssignmentWithRole) => void; onTogglePublish: (a: AssignmentWithRole) => void;
  onEditGroup: (group: string) => void; onDeleteGroup: (group: string) => void;
  isLastGroup?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const newCount = items.filter(a => !seenIds.has(String(a.id))).length;

  return (
    <div style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", border: "1px solid #ececec", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", background: "#f9fafb", borderBottom: collapsed ? "none" : "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", flex: 1, minWidth: 0 }} onClick={() => setCollapsed(c => !c)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" style={{ flexShrink: 0, transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>({items.length})</span>
          {newCount > 0 && <span style={{ padding: "1px 6px", borderRadius: 20, fontSize: 9, fontWeight: 800, color: "#fff", background: "#dc2626", flexShrink: 0 }}>{newCount}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <button onClick={() => onAddAssignment(title)}
            style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#9ca3af", touchAction: "manipulation" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e5e7eb")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
            <Plus size={15} />
          </button>
          <GroupMenu onEdit={() => onEditGroup(title)} onDelete={() => onDeleteGroup(title)} isLastGroup={isLastGroup} />
        </div>
      </div>
      {!collapsed && (
        <div>
          {items.length === 0
            ? <div style={{ padding: "16px", fontSize: 12, color: "#9ca3af", textAlign: "center" }}>No assignments in this group.</div>
            : items.map(a => (
              <MineAssignmentRow key={a.id} a={a} courseId={courseId} currentUserName={currentUserName} currentUserRole={currentUserRole}
                seenIds={seenIds} canDelete={canDelete}
                onView={onView} onEdit={onEdit} onDuplicate={onDuplicate} onAssignTo={onAssignTo} onDelete={onDelete} onTogglePublish={onTogglePublish} />
            ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   OTHERS AUTHOR SECTION
───────────────────────────────────────────────────────────────────────────── */
function OthersAuthorSection({ authorName, authorRole, authorImage, items, courseId, seenIds, onView }: {
  authorName: string; authorRole?: string | null; authorImage?: string | null;
  items: AssignmentWithRole[]; courseId: string; seenIds: Set<string>; onView: (a: AssignmentWithRole) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const newCount = items.filter(a => !seenIds.has(String(a.id))).length;

  return (
    <div style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", border: "1px solid #bfdbfe", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
      <div onClick={() => setCollapsed(c => !c)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", background: "#eff6ff", borderBottom: collapsed ? "none" : "1px solid #bfdbfe", cursor: "pointer" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d6fa4" strokeWidth="2.5" style={{ flexShrink: 0, transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        <PublisherAvatar name={authorName} image={authorImage} size={20} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>{authorName}</span>
        {authorRole && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", background: "#eff6ff", color: "#1d6fa4", border: "1px solid #bfdbfe", flexShrink: 0 }}>{authorRole}</span>}
        <span style={{ fontSize: 12, color: "#93c5fd", flexShrink: 0 }}>({items.length})</span>
        {newCount > 0 && <span style={{ padding: "1px 6px", borderRadius: 20, fontSize: 9, fontWeight: 800, color: "#fff", background: "#dc2626", flexShrink: 0 }}>{newCount}</span>}
      </div>
      {!collapsed && (
        <div>{items.map(a => <OthersAssignmentRow key={a.id} a={a} courseId={courseId} seenIds={seenIds} onView={onView} />)}</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   OTHERS GROUP SECTION
───────────────────────────────────────────────────────────────────────────── */
function OthersGroupSection({ title, items, courseId, seenIds, onView }: {
  title: string; items: AssignmentWithRole[]; courseId: string; seenIds: Set<string>; onView: (a: AssignmentWithRole) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const newCount = items.filter(a => !seenIds.has(String(a.id))).length;

  return (
    <div style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", border: "1px solid #bae6fd", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
      <div onClick={() => setCollapsed(c => !c)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", background: "#f0f9ff", borderBottom: collapsed ? "none" : "1px solid #bae6fd", cursor: "pointer" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2.5" style={{ flexShrink: 0, transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0369a1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>{title}</span>
        <span style={{ fontSize: 12, color: "#7dd3fc", flexShrink: 0 }}>({items.length})</span>
        {newCount > 0 && <span style={{ padding: "1px 6px", borderRadius: 20, fontSize: 9, fontWeight: 800, color: "#fff", background: "#dc2626", flexShrink: 0 }}>{newCount}</span>}
      </div>
      {!collapsed && (
        <div>{items.map(a => <OthersAssignmentRow key={a.id} a={a} courseId={courseId} seenIds={seenIds} onView={onView} />)}</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION LABEL
───────────────────────────────────────────────────────────────────────────── */
function SectionLabel({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "7px 12px", background: bg, borderBottom: `1px solid ${border}`, borderTop: `1px solid ${border}` }}>
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color }}>{children}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */
interface CourseAssignmentsListProps {
  courseId: string;
  assignments: AssignmentWithRole[];
  setAssignments: React.Dispatch<React.SetStateAction<AssignmentWithRole[]>>;
  sections: Section[];
  staff: Staff[];
  currentUserId?: string | null;
  currentUserName?: string | null;
  currentUserRole?: string | null;
  canDelete?: boolean;
  onViewDetail: (a: AssignmentWithRole) => void;
  onCreateNew: (group?: string) => void;
  onEditFull: (a: AssignmentWithRole) => void;
}

export default function CourseAssignmentsList({
  courseId, assignments, setAssignments, sections, staff,
  currentUserId, currentUserName, currentUserRole,
  canDelete = false,
  onViewDetail, onCreateNew, onEditFull,
}: CourseAssignmentsListProps) {
  const [mySearch, setMySearch] = useState("");
  const [othersSearch, setOthersSearch] = useState("");
  const [othersViewMode, setOthersViewMode] = useState<"author" | "group">("author");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [localGroups, setLocalGroups] = useState<string[]>([DEFAULT_GROUP]);
  const [quickEditTarget, setQuickEditTarget] = useState<AssignmentWithRole | null>(null);
  const [assignToTarget, setAssignToTarget] = useState<AssignmentWithRole | null>(null);
  const [editGroupTarget, setEditGroupTarget] = useState<string | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<string | null>(null);
  const [savingEditGroup, setSavingEditGroup] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssignmentWithRole | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => getSeenIds(courseId));

  const handleView = useCallback((a: AssignmentWithRole) => {
    markSeen(courseId, a.id);
    setSeenIds(getSeenIds(courseId));
    onViewDetail(a);
  }, [courseId, onViewDetail]);

  const resolved = useMemo(
    () => assignments.map(a => ({ ...a, _assignmentRole: resolveRole(a, currentUserId) })),
    [assignments, currentUserId]
  );

  const myAssignments = resolved.filter(a => a._assignmentRole === "manager");
  const otherAssignments = resolved.filter(a => a._assignmentRole === "submitter");

  const loadAssignments = useCallback(() => {
    fetch(`/api/courses/${courseId}/assignments`).then(r => r.json()).then(d => {
      const list: AssignmentWithRole[] = d.assignments ?? [];
      setAssignments(list);
      const apiGroups = [...new Set(list.filter(a => resolveRole(a, currentUserId) === "manager").map(a => a.assignmentGroup || DEFAULT_GROUP))];
      setLocalGroups(prev => {
        const merged = [...new Set([DEFAULT_GROUP, ...prev, ...apiGroups])];
        const ordered = [DEFAULT_GROUP, ...merged.filter(g => g !== DEFAULT_GROUP)];
        persistGroups(courseId, ordered);
        return ordered;
      });
    }).catch(() => { });
  }, [courseId, setAssignments, currentUserId]);

  useEffect(() => {
    const persisted = loadPersistedGroups(courseId);
    const apiGroups = [...new Set(assignments.filter(a => resolveRole(a, currentUserId) === "manager").map(a => a.assignmentGroup || DEFAULT_GROUP))];
    const merged = [...new Set([DEFAULT_GROUP, ...persisted, ...apiGroups])];
    setLocalGroups([DEFAULT_GROUP, ...merged.filter(g => g !== DEFAULT_GROUP)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const myFiltered = myAssignments.filter(a => a.title.toLowerCase().includes(mySearch.toLowerCase()));
  const othersFiltered = otherAssignments.filter(a => a.title.toLowerCase().includes(othersSearch.toLowerCase()));

  const myGrouped: Record<string, AssignmentWithRole[]> = {};
  for (const g of localGroups) myGrouped[g] = [];
  for (const a of myFiltered) { const g = a.assignmentGroup || DEFAULT_GROUP; if (!myGrouped[g]) myGrouped[g] = []; myGrouped[g].push(a); }

  const othersByAuthor: Record<string, { role?: string | null; image?: string | null; items: AssignmentWithRole[] }> = {};
  for (const a of othersFiltered) {
    const author = a._publisherName ?? "Unknown";
    if (!othersByAuthor[author]) othersByAuthor[author] = { role: a._publisherRole, image: a._publisherImage, items: [] };
    othersByAuthor[author].items.push(a);
  }

  const othersByGroup: Record<string, AssignmentWithRole[]> = {};
  for (const a of othersFiltered) { const g = a.assignmentGroup || DEFAULT_GROUP; if (!othersByGroup[g]) othersByGroup[g] = []; othersByGroup[g].push(a); }

  const handleSaveGroup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLocalGroups(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [DEFAULT_GROUP, ...prev.filter(g => g !== DEFAULT_GROUP), trimmed];
      persistGroups(courseId, next);
      return next;
    });
    setShowGroupModal(false);
  };

  const handleEditGroupSave = async (newName: string) => {
    if (!editGroupTarget) return;
    setSavingEditGroup(true);
    try {
      const oldName = editGroupTarget;
      setLocalGroups(prev => { const next = prev.map(g => g === oldName ? newName : g); persistGroups(courseId, next); return next; });
      setAssignments(prev => prev.map(a => a.assignmentGroup === oldName ? { ...a, assignmentGroup: newName } : a));
      myAssignments.filter(a => a.assignmentGroup === oldName).forEach(a => {
        fetch(`/api/courses/${courseId}/assignments/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentGroup: newName }) }).catch(() => { });
      });
      setEditGroupTarget(null);
    } finally { setSavingEditGroup(false); }
  };

  const handleDeleteGroup = (action: "delete" | "move", targetGroup?: string) => {
    if (!deleteGroupTarget) return;
    const groupName = deleteGroupTarget;
    if (action === "delete") {
      const toDelete = myAssignments.filter(a => (a.assignmentGroup || DEFAULT_GROUP) === groupName);
      toDelete.forEach(a => { fetch(`/api/courses/${courseId}/assignments/${a.id}`, { method: "DELETE" }).catch(() => { }); });
      setAssignments(prev => prev.filter(a => (a.assignmentGroup || DEFAULT_GROUP) !== groupName));
    } else if (action === "move" && targetGroup) {
      setAssignments(prev => prev.map(a => (a.assignmentGroup || DEFAULT_GROUP) === groupName ? { ...a, assignmentGroup: targetGroup } : a));
      myAssignments.filter(a => (a.assignmentGroup || DEFAULT_GROUP) === groupName).forEach(a => {
        fetch(`/api/courses/${courseId}/assignments/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentGroup: targetGroup }) }).catch(() => { });
      });
    }
    setLocalGroups(prev => {
      const next = prev.filter(g => g !== groupName);
      const safe = next.includes(DEFAULT_GROUP) ? next : [DEFAULT_GROUP, ...next];
      persistGroups(courseId, safe.length ? safe : [DEFAULT_GROUP]);
      return safe.length ? safe : [DEFAULT_GROUP];
    });
    setDeleteGroupTarget(null);
  };

  const handleQuickEditSave = async (updated: Partial<Assignment> & { dueTime?: string }) => {
    if (!quickEditTarget) return;
    await fetch(`/api/courses/${courseId}/assignments/${quickEditTarget.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: updated.title, points: updated.points, dueDate: updated.dueDate || null, dueTime: updated.dueTime }),
    });
    setAssignments(prev => prev.map(a => a.id === quickEditTarget.id ? { ...a, ...updated } : a));
  };

  const handleDuplicate = async (a: AssignmentWithRole) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `${a.title} Copy`, points: a.points, status: "UNPUBLISHED", assignmentGroup: a.assignmentGroup, dueDate: a.dueDate, availableFrom: a.availableFrom, availableUntil: a.availableUntil }),
      });
      if (res.ok) loadAssignments();
    } catch { /* ignore */ }
  };

  const handleTogglePublish = async (a: AssignmentWithRole) => {
    const newStatus = a.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, status: newStatus } : x));
    await fetch(`/api/courses/${courseId}/assignments/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) }).catch(() => { });
  };

  const handleDeleteAssignment = async () => {
    if (!deleteTarget) return;
    setDeletingAssignment(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) { setAssignments(prev => prev.filter(a => a.id !== deleteTarget.id)); setDeleteTarget(null); }
      else { alert("Failed to delete assignment."); }
    } catch { alert("Network error."); }
    finally { setDeletingAssignment(false); }
  };

  return (
    <div style={{ background: "#fff", fontFamily: FONT }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── SECTION 1: Published by You ── */}
      <SectionLabel color={MAROON} bg="#fef2f2" border="#f0c0c0">Published by You</SectionLabel>

      {/* Section 1 toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1px solid #f3f4f6", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
          <input value={mySearch} onChange={e => setMySearch(e.target.value)} placeholder="Search your assignments…"
            style={{ width: "100%", height: 34, border: "1px solid #e5e7eb", borderRadius: 8, paddingLeft: 30, paddingRight: 10, fontFamily: FONT, fontSize: 12.5, color: "#374151", background: "#fafafa", outline: "none" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button onClick={() => setShowGroupModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 4, height: 34, padding: "0 10px", fontFamily: FONT, fontSize: 12.5, fontWeight: 600, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#374151", cursor: "pointer", touchAction: "manipulation" }}>
            <Plus size={13} /><span>Group</span>
          </button>
          <button onClick={() => onCreateNew()}
            style={{ display: "flex", alignItems: "center", gap: 4, height: 34, padding: "0 12px", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, border: "none", borderRadius: 8, background: MAROON, color: "#fff", cursor: "pointer", touchAction: "manipulation" }}>
            <Plus size={13} /><span>New</span>
          </button>
        </div>
      </div>

      <div style={{ padding: "10px 10px 4px" }}>
        {myFiltered.length === 0 && mySearch ? (
          <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>No results for &ldquo;{mySearch}&rdquo;</div>
        ) : (
          Object.entries(myGrouped).map(([grp, items]) => (
            <MineGroupSection key={grp} title={grp} items={items} courseId={courseId}
              currentUserName={currentUserName} currentUserRole={currentUserRole}
              seenIds={seenIds} canDelete={canDelete}
              onAddAssignment={g => onCreateNew(g)}
              onView={handleView}
              onEdit={a => setQuickEditTarget(a)}
              onDuplicate={handleDuplicate}
              onAssignTo={a => setAssignToTarget(a)}
              onDelete={a => setDeleteTarget(a)}
              onTogglePublish={handleTogglePublish}
              onEditGroup={g => setEditGroupTarget(g)}
              onDeleteGroup={g => {
                const count = myAssignments.filter(a => (a.assignmentGroup || DEFAULT_GROUP) === g).length;
                if (count === 0) {
                  setLocalGroups(prev => { const next = prev.filter(x => x !== g); persistGroups(courseId, next); return next; });
                } else {
                  setDeleteGroupTarget(g);
                }
              }}
              isLastGroup={localGroups.length <= 1}
            />
          ))
        )}
      </div>

      {/* ── SECTION 2: Published by Others ── */}
      <SectionLabel color="#1d6fa4" bg="#eff6ff" border="#bfdbfe">
        Published by Others
        {otherAssignments.length > 0 && <span style={{ marginLeft: 6, fontWeight: 500, color: "#93c5fd", fontSize: 11 }}>({otherAssignments.length})</span>}
      </SectionLabel>

      {/* Section 2 toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1px solid #f3f4f6", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
          <input value={othersSearch} onChange={e => setOthersSearch(e.target.value)} placeholder="Search others' assignments…"
            style={{ width: "100%", height: 34, border: "1px solid #e5e7eb", borderRadius: 8, paddingLeft: 30, paddingRight: 10, fontFamily: FONT, fontSize: 12.5, color: "#374151", background: "#fafafa", outline: "none" }} />
        </div>
        <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
          {(["author", "group"] as const).map(mode => (
            <button key={mode} onClick={() => setOthersViewMode(mode)}
              style={{ padding: "0 12px", height: 34, fontFamily: FONT, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: othersViewMode === mode ? MAROON : "transparent", color: othersViewMode === mode ? "#fff" : "#6b7280", transition: "all 0.15s", touchAction: "manipulation" }}>
              {mode === "author" ? "By Author" : "By Group"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "10px 10px 20px" }}>
        {otherAssignments.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: 10 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>No assignments published by others yet.</p>
          </div>
        ) : othersFiltered.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>No results for &ldquo;{othersSearch}&rdquo;</div>
        ) : othersViewMode === "author" ? (
          Object.entries(othersByAuthor).map(([author, { role, image, items }]) => (
            <OthersAuthorSection key={author} authorName={author} authorRole={role} authorImage={image} items={items} courseId={courseId} seenIds={seenIds} onView={handleView} />
          ))
        ) : (
          Object.entries(othersByGroup).map(([grp, items]) => (
            <OthersGroupSection key={grp} title={grp} items={items} courseId={courseId} seenIds={seenIds} onView={handleView} />
          ))
        )}
      </div>

      {/* ── Modals ── */}
      {showGroupModal && <AddGroupModal onClose={() => setShowGroupModal(false)} onSave={handleSaveGroup} saving={false} />}
      {quickEditTarget && (
        <QuickEditModal assignment={quickEditTarget} onClose={() => setQuickEditTarget(null)} onSave={handleQuickEditSave}
          onMoreOptions={() => { onEditFull(quickEditTarget); setQuickEditTarget(null); }} />
      )}
      {assignToTarget && <AssignToPanel assignment={assignToTarget} courseId={courseId} sections={sections} staff={staff} onClose={() => setAssignToTarget(null)} onSave={loadAssignments} />}
      {editGroupTarget && <EditGroupModal groupName={editGroupTarget} onClose={() => setEditGroupTarget(null)} onSave={handleEditGroupSave} saving={savingEditGroup} />}
      {deleteGroupTarget && (
        <DeleteGroupModal groupName={deleteGroupTarget}
          assignmentCount={myAssignments.filter(a => (a.assignmentGroup || DEFAULT_GROUP) === deleteGroupTarget).length}
          otherGroups={localGroups.filter(g => g !== deleteGroupTarget)}
          onClose={() => setDeleteGroupTarget(null)} onDelete={handleDeleteGroup} />
      )}
      {deleteTarget && (
        <DeleteAssignmentModal assignment={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteAssignment} deleting={deletingAssignment} />
      )}
    </div>
  );
}