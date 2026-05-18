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
function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isDesktop;
}

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
   SPEEDGRADER BUTTON — opens new tab on desktop, navigates in-app on mobile
───────────────────────────────────────────────────────────────────────────── */
function SpeedGraderButton({ courseId, assignmentId }: { courseId: string; assignmentId: string | number }) {
  const isDesktop = useIsDesktop();
  const href = `/courses/${courseId}/gradebook/speed_grader?assignment_id=${assignmentId}`;

  const handleClick = (e: React.MouseEvent) => {
    if (isDesktop) {
      e.preventDefault();
      window.open(href, "_blank", "noopener,noreferrer");
    }
    // on mobile/tablet: default anchor navigation (no new tab)
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      title="SpeedGrader"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-colors hover:opacity-90 active:opacity-75 whitespace-nowrap"
      style={{ color: MAROON, borderColor: "#f0c0c0", background: "#fef2f2" }}
    >
      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      SpeedGrader
      {isDesktop && (
        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="opacity-50">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
    </a>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SEEN / NEW BADGE HELPERS
───────────────────────────────────────────────────────────────────────────── */
const SEEN_KEY = (courseId: string) => `seen_assignments_${courseId}`;

function getSeenIds(courseId: string): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY(courseId));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function markSeen(courseId: string, id: string | number) {
  try {
    const seen = getSeenIds(courseId);
    seen.add(String(id));
    localStorage.setItem(SEEN_KEY(courseId), JSON.stringify([...seen]));
  } catch { /* ignore */ }
}

function NewBadge() {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide text-white"
      style={{ background: "#dc2626", letterSpacing: "0.08em" }}
    >
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
    return (
      d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) +
      " " + (time || "11:59 PM")
    );
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
      <img src={image} alt={name ?? "Publisher"} width={size} height={size}
        onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid #bfdbfe" }} />
    );
  }
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", background: "#1d6fa4", color: "#fff", fontSize: size * 0.42, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {initial}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLISHER CHIP
───────────────────────────────────────────────────────────────────────────── */
function PublisherChip({ name, image, role }: { name?: string | null; image?: string | null; role?: string | null }) {
  if (!name) return null;
  return (
    <span className="flex items-center gap-1 text-[11px] text-gray-500 flex-wrap">
      <PublisherAvatar name={name} image={image} size={18} />
      <span className="truncate max-w-[100px]">{name}</span>
      {role && (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: "#eff6ff", color: "#1d6fa4", border: "1px solid #bfdbfe" }}>{role}</span>
      )}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   AUTHOR BADGE
───────────────────────────────────────────────────────────────────────────── */
function AuthorBadge({ name, role }: { name: string; role: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ background: "#fdf8f8", color: MAROON, borderColor: "#f0c0c0" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: MAROON }} />
      <span className="truncate max-w-[120px]">{name} · {role}</span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLISH TOGGLE
───────────────────────────────────────────────────────────────────────────── */
function PublishToggle({ published, onToggle }: { published: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} title={published ? "Published — click to unpublish" : "Unpublished — click to publish"}
      className="flex items-center p-1 rounded hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation">
      {published ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" fill="#16a34a" />
          <path d="M5.5 10.5l3 3 6-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#9ca3af" strokeWidth="1.5" fill="none" />
          <line x1="6" y1="14" x2="14" y2="6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ASSIGNMENT ICON
───────────────────────────────────────────────────────────────────────────── */
function AssignmentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" style={{ flexShrink: 0 }}>
      <rect x="4" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROW 3-DOT MENU (portal) — positions above on mobile to avoid off-screen
───────────────────────────────────────────────────────────────────────────── */
type DropdownAction = "edit" | "duplicate" | "assignTo" | "delete" | "speedgrader";

function AssignmentRowMenu({ assignment, onAction, isManager, courseId }: {
  assignment: AssignmentWithRole;
  onAction: (action: DropdownAction, a: AssignmentWithRole) => void;
  isManager: boolean;
  courseId: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const itemCount = isManager ? 5 : 1; // speedgrader always shown
    const h = itemCount * 38 + 8;
    const w = 190;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= h ? rect.bottom + 4 : rect.top - h - 4;
    const left = Math.min(rect.right - w, window.innerWidth - w - 8);
    setMenuStyle({
      position: "fixed", top: Math.max(8, top), left: Math.max(8, left),
      zIndex: 9999, background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.14)", minWidth: w, overflow: "hidden",
    });
    setOpen(v => !v);
  };

  const speedgraderHref = `/courses/${courseId}/gradebook/speed_grader?assignment_id=${assignment.id}`;

  const managerItems: { label: string; action: DropdownAction; danger?: boolean; icon: React.ReactNode }[] = [
    { label: "Edit", action: "edit", icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" /></svg> },
    { label: "Duplicate", action: "duplicate", icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg> },
    { label: "Assign To…", action: "assignTo", icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="12" cy="7" r="4" /></svg> },
    { label: "Delete", action: "delete", danger: true, icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" strokeLinecap="round" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" /><path d="M10 11v6M14 11v6" strokeLinecap="round" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" /></svg> },
  ];

  return (
    <>
      <button ref={btnRef} type="button" onClick={e => { e.stopPropagation(); handleOpen(); }}
        className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-500 transition-colors touch-manipulation">
        <MoreVertical size={16} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={menuStyle} onClick={e => e.stopPropagation()}>
          {/* SpeedGrader — always visible */}
          {isDesktop ? (
            <button
              type="button"
              onClick={() => { setOpen(false); window.open(speedgraderHref, "_blank", "noopener,noreferrer"); }}
              className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 text-gray-700 hover:bg-gray-50"
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              SpeedGrader
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="ml-auto opacity-40"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </button>
          ) : (
            <a
              href={speedgraderHref}
              onClick={() => setOpen(false)}
              className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 text-gray-700 hover:bg-gray-50"
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              SpeedGrader
            </a>
          )}
          {isManager && managerItems.map((item, i) => (
            <button key={item.action} type="button"
              onClick={() => { setOpen(false); onAction(item.action, assignment); }}
              className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 ${item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}`}
              style={{ borderTop: "1px solid #f3f4f6" }}>
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
   GROUP 3-DOT MENU (portal)
───────────────────────────────────────────────────────────────────────────── */
function GroupMenu({ onEdit, onDelete, isLastGroup }: { onEdit: () => void; onDelete: () => void; isLastGroup?: boolean }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
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
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 active:bg-gray-300 text-gray-400 transition-colors touch-manipulation">
        <MoreVertical size={15} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={menuStyle}>
          <button type="button" onClick={() => { setOpen(false); onEdit(); }}
            className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 text-gray-700 hover:bg-gray-50">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" /></svg>
            Edit
          </button>
          {!isLastGroup && (
            <button type="button" onClick={() => { setOpen(false); onDelete(); }}
              className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 text-red-600 hover:bg-red-50"
              style={{ borderTop: "1px solid #f3f4f6" }}>
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
   SHARED MODAL SHELL — bottom sheet on mobile, centered on desktop
───────────────────────────────────────────────────────────────────────────── */
function ModalShell({ onClose, children, maxWidth = 420 }: {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 px-0 sm:px-4"
      onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl sm:rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        style={{ maxWidth: `min(100%, ${maxWidth}px)` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE ASSIGNMENT MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteAssignmentModal({ assignment, onClose, onConfirm, deleting }: {
  assignment: AssignmentWithRole; onClose: () => void; onConfirm: () => void; deleting: boolean;
}) {
  return (
    <ModalShell onClose={onClose} maxWidth={420}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <span className="text-sm font-bold text-gray-800">Delete Assignment</span>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100"><X size={14} /></button>
      </div>
      <div className="px-5 py-5">
        <p className="text-sm text-gray-700">Are you sure you want to delete <strong>&ldquo;{assignment.title}&rdquo;</strong>? This action cannot be undone.</p>
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
        <button onClick={onClose} disabled={deleting} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50">Cancel</button>
        <button onClick={onConfirm} disabled={deleting} className="h-9 px-4 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50" style={{ background: "#dc2626" }}>
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD / EDIT / DELETE GROUP MODALS
───────────────────────────────────────────────────────────────────────────── */
function AddGroupModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (name: string) => void; saving: boolean }) {
  const [name, setName] = useState("");
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <span className="text-sm font-bold text-gray-800">Add Assignment Group</span>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border rounded-lg hover:bg-gray-100" style={{ borderColor: MAROON, color: MAROON }}><X size={14} /></button>
      </div>
      <div className="px-5 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <label className="text-sm text-gray-700 shrink-0">Group Name:</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && name.trim() && onSave(name.trim())}
            placeholder="e.g., Essay Group 1" className="flex-1 w-full h-10 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#7b1113] transition-colors" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
        <button onClick={onClose} disabled={saving} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50">Cancel</button>
        <button onClick={() => name.trim() && onSave(name.trim())} disabled={saving || !name.trim()} className="h-9 px-4 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </ModalShell>
  );
}

function EditGroupModal({ groupName, onClose, onSave, saving }: { groupName: string; onClose: () => void; onSave: (n: string) => void; saving: boolean }) {
  const [name, setName] = useState(groupName);
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <span className="text-sm font-bold text-gray-800">Edit Assignment Group</span>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border rounded-lg hover:bg-gray-100" style={{ borderColor: MAROON, color: MAROON }}><X size={14} /></button>
      </div>
      <div className="px-5 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <label className="text-sm text-gray-700 shrink-0">Group Name:</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && name.trim() && onSave(name.trim())}
            className="flex-1 w-full h-10 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#7b1113] transition-colors" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
        <button onClick={onClose} disabled={saving} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50">Cancel</button>
        <button onClick={() => name.trim() && onSave(name.trim())} disabled={saving || !name.trim() || name.trim() === groupName}
          className="h-9 px-4 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </ModalShell>
  );
}

function DeleteGroupModal({ groupName, assignmentCount, otherGroups, onClose, onDelete }: {
  groupName: string; assignmentCount: number; otherGroups: string[];
  onClose: () => void; onDelete: (action: "delete" | "move", targetGroup?: string) => void;
}) {
  const [choice, setChoice] = useState<"delete" | "move">("delete");
  const [targetGroup, setTargetGroup] = useState(otherGroups[0] ?? "");
  return (
    <ModalShell onClose={onClose} maxWidth={460}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <span className="text-sm font-bold text-gray-800">Delete Assignment Group</span>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100"><X size={14} /></button>
      </div>
      <div className="px-5 py-5 space-y-4">
        <p className="text-sm text-gray-700">You are about to delete <strong>{groupName}</strong>, which has <strong>{assignmentCount}</strong> assignment{assignmentCount !== 1 ? "s" : ""} in it.</p>
        <p className="text-sm text-gray-700">Would you like to:</p>
        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={choice === "delete"} onChange={() => setChoice("delete")} className="accent-[#7b1113]" /><span className="text-sm text-gray-700">Delete its assignments</span></label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={choice === "move"} onChange={() => setChoice("move")} disabled={otherGroups.length === 0} className="accent-[#7b1113]" /><span className={`text-sm ${otherGroups.length === 0 ? "text-gray-400" : "text-gray-700"}`}>Move its assignments to</span></label>
          {choice === "move" && otherGroups.length > 0 && (
            <div className="ml-6 relative">
              <select value={targetGroup} onChange={e => setTargetGroup(e.target.value)} className="w-full sm:w-52 h-9 border border-gray-300 rounded-lg px-3 text-sm bg-white outline-none appearance-none pr-8 focus:border-[#7b1113]">
                <option value="">[ Select a Group ]</option>
                {otherGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
        <button onClick={onClose} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded-lg hover:bg-gray-100">Cancel</button>
        <button onClick={() => onDelete(choice, choice === "move" ? targetGroup : undefined)} disabled={choice === "move" && !targetGroup}
          className="h-9 px-4 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>Delete Group</button>
      </div>
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
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <span className="text-sm font-bold text-gray-800">Edit Assignment</span>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100"><X size={14} /></button>
      </div>
      <div className="px-5 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Name <span className="text-red-500">*</span></label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#7b1113] transition-colors" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-2">Due at</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 block mb-0.5">Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full h-10 border border-gray-300 rounded-lg px-3 text-xs outline-none focus:border-[#7b1113] transition-colors" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Time</label>
              <div className="relative">
                <select value={dueTime} onChange={e => setDueTime(e.target.value)} className="h-10 border border-gray-300 rounded-lg px-3 text-xs bg-white outline-none appearance-none pr-8 w-full sm:w-auto focus:border-[#7b1113] transition-colors" style={{ minWidth: 130 }}>
                  {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          {dateLabel && <p className="text-xs mt-1.5 font-medium" style={{ color: MAROON }}>{dateLabel}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Points</label>
          <input type="number" min={0} value={points} onChange={e => setPoints(e.target.value)} className="w-full sm:w-32 h-10 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#7b1113] transition-colors" />
        </div>
        {error && <p className="text-xs text-red-600">⚠ {error}</p>}
      </div>
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
        <button onClick={onMoreOptions} className="h-9 px-4 border border-gray-300 text-xs text-gray-600 rounded-lg hover:bg-white transition-colors">More Options</button>
        <div className="flex items-center gap-2 justify-end">
          <button onClick={onClose} disabled={saving} className="h-9 px-4 border border-gray-300 text-xs text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="h-9 px-5 text-xs text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity" style={{ background: MAROON }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ASSIGN TO PANEL — full-screen sheet on mobile, side panel on desktop
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
    if (openDropId === null) return;
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-assigndrop]")) setOpenDropId(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openDropId]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Date</p>
            <input type="date" value={dateVal} onChange={e => onDateChange(e.target.value)} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-xs outline-none focus:border-[#7b1113] transition-colors" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Time</p>
            <div className="relative">
              <select value={timeVal} onChange={e => onTimeChange(e.target.value)} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-xs bg-white outline-none appearance-none pr-6 focus:border-[#7b1113] transition-colors">
                {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        {localLabel && <p className="text-[10px] text-gray-500">Local: {localLabel}</p>}
        <button onClick={onClear} className="text-[11px] hover:underline" style={{ color: MAROON }}>Clear</button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div
        className="fixed z-50 bg-white shadow-2xl border-t sm:border-t-0 sm:border-l border-gray-200 flex flex-col"
        style={{
          // Mobile: slide up from bottom, full width, ~85vh
          // Desktop: side panel from right, full height, 380px wide
          ...(isMobile
            ? { bottom: 0, left: 0, right: 0, maxHeight: "88dvh", borderRadius: "16px 16px 0 0" }
            : { top: 0, right: 0, bottom: 0, width: 380 }),
          fontFamily: FONT,
        }}
      >
        {/* Mobile drag handle */}
        {isMobile && (
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-gray-200" />
          </div>
        )}

        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <AssignmentIcon />
              <span className="text-sm font-bold text-gray-800 truncate max-w-[200px]">{assignment.title}</span>
            </div>
            <p className="text-xs text-gray-500 ml-6">Assignment | {assignment.points} pts</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-lg text-gray-400 hover:bg-gray-100 shrink-0 mt-0.5"><X size={14} /></button>
        </div>

        <div className="mx-4 mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 shrink-0">
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#1d6fa4" }}>
            <span className="text-white text-[10px] font-bold">i</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">Select who should be assigned and use the drop-down menus or manually enter your date and time.</p>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">
          {rows.map((row, idx) => (
            <div key={row.id} className="border border-gray-200 rounded-xl p-3 space-y-4 relative">
              {idx > 0 && <button onClick={() => removeRow(row.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"><X size={13} /></button>}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Assign To</p>
                <div className="relative" data-assigndrop>
                  <div onMouseDown={e => { e.stopPropagation(); setOpenDropId(openDropId === row.id ? null : row.id); setDropSearch(""); }}
                    className="w-full min-h-9 border border-gray-300 rounded-lg px-2 py-1 flex flex-wrap gap-1 items-center cursor-pointer bg-white">
                    {row.assignees.map(a => (
                      <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs text-white font-medium" style={{ background: MAROON }}>
                        {a}<button onMouseDown={e => { e.stopPropagation(); toggleAssignee(row.id, a); }} className="hover:opacity-70 font-bold text-sm leading-none ml-0.5">×</button>
                      </span>
                    ))}
                    <input readOnly placeholder={row.assignees.length ? "" : "Start typing to search..."} className="flex-1 min-w-[60px] text-xs outline-none bg-transparent text-gray-400 cursor-pointer" />
                    <ChevronDown size={12} className="text-gray-400 shrink-0" style={{ transform: openDropId === row.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                  </div>
                  {openDropId === row.id && (
                    <div data-assigndrop className="absolute z-50 w-full bg-white border border-gray-200 shadow-xl rounded-lg mt-1 max-h-56 overflow-y-auto" onMouseDown={e => e.stopPropagation()}>
                      <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white">
                        <input autoFocus value={dropSearch} onChange={e => setDropSearch(e.target.value)} placeholder="Search..." className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#7b1113]" />
                      </div>
                      {["Everyone"].filter(o => o.toLowerCase().includes(dropSearch.toLowerCase())).map(opt => (
                        <button key={opt} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, opt); }}
                          className="w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-gray-50 active:bg-gray-100"
                          style={{ color: row.assignees.includes(opt) ? MAROON : "#374151", fontWeight: row.assignees.includes(opt) ? 600 : 400 }}>
                          {opt}{row.assignees.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
                        </button>
                      ))}
                      {sections.filter(s => s.name.toLowerCase().includes(dropSearch.toLowerCase())).length > 0 && (
                        <>
                          <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 border-t border-gray-100">Sections</div>
                          {sections.filter(s => s.name.toLowerCase().includes(dropSearch.toLowerCase())).map(s => (
                            <button key={s.id} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }}
                              className="w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-gray-50 active:bg-gray-100"
                              style={{ color: row.assignees.includes(s.name) ? MAROON : "#374151", fontWeight: row.assignees.includes(s.name) ? 600 : 400 }}>
                              {s.name}{row.assignees.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                            </button>
                          ))}
                        </>
                      )}
                      {staff.filter(s => s.name.toLowerCase().includes(dropSearch.toLowerCase())).length > 0 && (
                        <>
                          <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 border-t border-gray-100">Staff</div>
                          {staff.filter(s => s.name.toLowerCase().includes(dropSearch.toLowerCase())).map(s => (
                            <button key={s.id} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }}
                              className="w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-gray-50 active:bg-gray-100"
                              style={{ color: row.assignees.includes(s.name) ? MAROON : "#374151", fontWeight: row.assignees.includes(s.name) ? 600 : 400 }}>
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
          <button onClick={addRow} className="flex items-center gap-1.5 text-xs font-medium hover:underline" style={{ color: MAROON }}><Plus size={13} /> Add</button>
        </div>

        <div className="shrink-0 border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-2 bg-gray-50">
          <button onClick={onClose} className="h-9 px-4 border border-gray-300 text-xs text-gray-600 rounded-lg hover:bg-white transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="h-9 px-5 text-xs text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium transition-opacity" style={{ background: MAROON }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
        {/* iOS safe area */}
        <div className="sm:hidden h-[env(safe-area-inset-bottom)] shrink-0" />
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MINE ASSIGNMENT ROW
───────────────────────────────────────────────────────────────────────────── */
function MineAssignmentRow({ a, courseId, currentUserName, currentUserRole, seenIds, onView, onEdit, onDuplicate, onAssignTo, onDelete, onTogglePublish }: {
  a: AssignmentWithRole;
  courseId: string;
  currentUserName?: string | null;
  currentUserRole?: string | null;
  seenIds: Set<string>;
  onView: (a: AssignmentWithRole) => void;
  onEdit: (a: AssignmentWithRole) => void;
  onDuplicate: (a: AssignmentWithRole) => void;
  onAssignTo: (a: AssignmentWithRole) => void;
  onDelete: (a: AssignmentWithRole) => void;
  onTogglePublish: (a: AssignmentWithRole) => void;
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
      className="flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-3.5 sm:py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 last:border-0 relative cursor-pointer"
      style={{ background: "#fff" }}
      onClick={() => onView(a)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ background: MAROON }} />

      {/* Publish toggle */}
      <div className="shrink-0 mt-0 pl-2" onClick={e => e.stopPropagation()}>
        <PublishToggle published={a.status === "PUBLISHED"} onToggle={() => onTogglePublish(a)} />
      </div>

      <div className="shrink-0 hidden xs:block mt-0.5"><AssignmentIcon /></div>

      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="text-sm font-semibold hover:underline leading-snug" style={{ color: MAROON }}>{a.title}</h3>
          {!seenIds.has(String(a.id)) && <NewBadge />}
          {a.status === "UNPUBLISHED" && <span className="text-[10px] text-amber-600 font-medium shrink-0">Not Published</span>}
          {isClosed && <span className="text-[10px] text-gray-500 font-medium shrink-0">Closed</span>}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {authorName && <AuthorBadge name={authorName} role={authorRole} />}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
            <span>{a.points} pts</span>
            {due && <><span>·</span><span>Due: {due}</span></>}
          </div>
        </div>

        {/* SpeedGrader button (mobile/tablet shows here inline) */}
        <div className="mt-2 sm:hidden" onClick={e => e.stopPropagation()}>
          <SpeedGraderButton courseId={courseId} assignmentId={a.id} />
        </div>
      </div>

      {/* Right actions */}
      <div className="shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
        {/* SpeedGrader — desktop inline */}
        <div className="hidden sm:block">
          <SpeedGraderButton courseId={courseId} assignmentId={a.id} />
        </div>
        <AssignmentRowMenu assignment={a} onAction={handleAction} isManager={true} courseId={courseId} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   OTHERS ASSIGNMENT ROW
───────────────────────────────────────────────────────────────────────────── */
function OthersAssignmentRow({ a, courseId, seenIds, onView }: {
  a: AssignmentWithRole;
  courseId: string;
  seenIds: Set<string>;
  onView: (a: AssignmentWithRole) => void;
}) {
  const now = new Date();
  const sub = a.submissions?.[0];
  const isClosed = a.availableUntil && now > new Date(a.availableUntil);
  const isLocked = a.availableFrom && now < new Date(a.availableFrom);
  const due = fmtDue(a.dueDate);

  return (
    <div
      className="flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-3.5 sm:py-4 hover:bg-blue-50/30 active:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 relative cursor-pointer"
      style={{ background: "#fafcff" }}
      onClick={() => onView(a)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ background: "#60a5fa" }} />
      <div className="shrink-0 ml-2 hidden xs:block mt-0.5"><AssignmentIcon /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="text-sm font-semibold hover:underline leading-snug" style={{ color: "#1d4ed8" }}>{a.title}</h3>
          {!seenIds.has(String(a.id)) && <NewBadge />}
          {isClosed && <span className="text-[10px] text-gray-500 font-medium shrink-0">Closed</span>}
          {isLocked && <span className="text-[10px] text-amber-600 font-medium shrink-0">Not yet open</span>}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <PublisherChip name={a._publisherName} image={a._publisherImage} role={a._publisherRole} />
          <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
            <span>{a.points} pts</span>
            {due && <><span>·</span><span>Due: {due}</span></>}
            {sub?.submittedAt && <><span>·</span><span className="text-green-600 font-semibold flex items-center gap-1"><CheckCircle size={11} /> Submitted</span></>}
          </div>
        </div>
      </div>
      <div className="shrink-0" onClick={e => e.stopPropagation()}>
        <AssignmentRowMenu assignment={a} onAction={() => {}} isManager={false} courseId={courseId} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MINE GROUP SECTION
───────────────────────────────────────────────────────────────────────────── */
function MineGroupSection({ title, items, courseId, currentUserName, currentUserRole, seenIds, onAddAssignment, onView, onEdit, onDuplicate, onAssignTo, onDelete, onTogglePublish, onEditGroup, onDeleteGroup, isLastGroup }: {
  title: string; items: AssignmentWithRole[];
  courseId: string;
  currentUserName?: string | null; currentUserRole?: string | null;
  seenIds: Set<string>;
  onAddAssignment: (group: string) => void;
  onView: (a: AssignmentWithRole) => void;
  onEdit: (a: AssignmentWithRole) => void;
  onDuplicate: (a: AssignmentWithRole) => void;
  onAssignTo: (a: AssignmentWithRole) => void;
  onDelete: (a: AssignmentWithRole) => void;
  onTogglePublish: (a: AssignmentWithRole) => void;
  onEditGroup: (group: string) => void;
  onDeleteGroup: (group: string) => void;
  isLastGroup?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const newCount = items.filter(a => !seenIds.has(String(a.id))).length;

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-lg select-none">
        <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" onClick={() => setCollapsed(c => !c)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span className="text-sm font-semibold text-gray-700 truncate">{title}</span>
          <span className="text-xs text-gray-400 ml-1 shrink-0">({items.length})</span>
          {newCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white shrink-0" style={{ background: "#dc2626" }}>
              {newCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onAddAssignment(title)} className="p-1.5 text-gray-400 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors touch-manipulation" title="Add assignment"><Plus size={15} /></button>
          <GroupMenu onEdit={() => onEditGroup(title)} onDelete={() => onDeleteGroup(title)} isLastGroup={isLastGroup} />
        </div>
      </div>
      {!collapsed && (
        <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
          {items.length === 0
            ? <div className="px-6 py-4 text-sm text-gray-400 text-center">No assignments in this group.</div>
            : items.map(a => (
              <MineAssignmentRow key={a.id} a={a} courseId={courseId} currentUserName={currentUserName} currentUserRole={currentUserRole}
                seenIds={seenIds}
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
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border select-none cursor-pointer rounded-t-lg"
        style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
        onClick={() => setCollapsed(c => !c)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d6fa4" strokeWidth="2.5"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .15s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        <PublisherAvatar name={authorName} image={authorImage} size={22} />
        <span className="text-sm font-semibold truncate" style={{ color: "#1d4ed8" }}>{authorName}</span>
        {authorRole && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0" style={{ background: "#eff6ff", color: "#1d6fa4", border: "1px solid #bfdbfe" }}>{authorRole}</span>
        )}
        <span className="text-xs text-blue-400 ml-1 shrink-0">({items.length})</span>
      </div>
      {!collapsed && (
        <div className="border border-t-0 rounded-b-lg overflow-hidden" style={{ borderColor: "#bfdbfe" }}>
          {items.map(a => <OthersAssignmentRow key={a.id} a={a} courseId={courseId} seenIds={seenIds} onView={onView} />)}
        </div>
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
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border select-none cursor-pointer rounded-t-lg"
        style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}
        onClick={() => setCollapsed(c => !c)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2.5"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .15s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span className="text-sm font-semibold truncate" style={{ color: "#0369a1" }}>{title}</span>
        <span className="text-xs text-blue-400 ml-1 shrink-0">({items.length})</span>
      </div>
      {!collapsed && (
        <div className="border border-t-0 rounded-b-lg overflow-hidden" style={{ borderColor: "#bae6fd" }}>
          {items.map(a => <OthersAssignmentRow key={a.id} a={a} courseId={courseId} seenIds={seenIds} onView={onView} />)}
        </div>
      )}
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
  onViewDetail: (a: AssignmentWithRole) => void;
  onCreateNew: (group?: string) => void;
  onEditFull: (a: AssignmentWithRole) => void;
}

export default function CourseAssignmentsList({
  courseId, assignments, setAssignments, sections, staff,
  currentUserId, currentUserName, currentUserRole,
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
    const apiGroups = [...new Set(
      assignments
        .filter(a => resolveRole(a, currentUserId) === "manager")
        .map(a => a.assignmentGroup || DEFAULT_GROUP)
    )];
    const merged = [...new Set([DEFAULT_GROUP, ...persisted, ...apiGroups])];
    const ordered = [DEFAULT_GROUP, ...merged.filter(g => g !== DEFAULT_GROUP)];
    persistGroups(courseId, ordered);
    setLocalGroups(ordered);
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
      if (safe.length === 0) return [DEFAULT_GROUP];
      persistGroups(courseId, safe);
      return safe;
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
    <div className="bg-white" style={{ fontFamily: FONT }}>

      {/* ── SECTION 1: Published by You ── */}
      <div className="flex items-center gap-2 px-4 sm:px-8 py-2.5 border-b" style={{ color: MAROON, background: "#fef2f2", borderColor: "#f0c0c0" }}>
        <span className="text-xs font-extrabold tracking-widest uppercase">Published by You</span>
      </div>

      {/* Section 1 toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-8 py-3 border-b border-gray-100 gap-2 flex-wrap">
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={mySearch} onChange={e => setMySearch(e.target.value)} placeholder="Search your assignments..."
            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full sm:w-56 focus:outline-none focus:border-[#7b1113] transition-colors" style={{ borderColor: "#d1d5db" }} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowGroupModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors" style={{ borderColor: "#d1d5db", color: "#374151" }}>
            <Plus size={14} />
            <span className="hidden sm:inline">Group</span>
          </button>
          <button onClick={() => onCreateNew()} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 active:opacity-80 transition-opacity" style={{ background: MAROON }}>
            <Plus size={14} />
            <span className="hidden sm:inline">Assignment</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-5 py-4 border-b-2 border-gray-200 space-y-3">
        {localGroups.length > 0 ? (
          Object.entries(myGrouped).map(([grp, items]) => (
            <MineGroupSection key={grp} title={grp} items={items}
              courseId={courseId}
              currentUserName={currentUserName} currentUserRole={currentUserRole}
              seenIds={seenIds}
              onAddAssignment={g => onCreateNew(g)}
              onView={handleView}
              onEdit={a => setQuickEditTarget(a)}
              onDuplicate={handleDuplicate}
              onAssignTo={a => setAssignToTarget(a)}
              onDelete={a => setDeleteTarget(a)}
              onTogglePublish={handleTogglePublish}
              onEditGroup={g => setEditGroupTarget(g)}
              onDeleteGroup={g => setDeleteGroupTarget(g)}
              isLastGroup={localGroups.length <= 1}
            />
          ))
        ) : mySearch && myFiltered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No results for &ldquo;{mySearch}&rdquo;</p>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <p className="text-sm text-gray-400">No assignments published by you yet.</p>
            <button onClick={() => onCreateNew()} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>+ Create your first assignment</button>
          </div>
        )}
      </div>

      {/* ── SECTION 2: Published by Others ── */}
      <div className="flex items-center gap-2 px-4 sm:px-8 py-2.5 border-b border-t" style={{ color: "#1d6fa4", background: "#eff6ff", borderColor: "#bfdbfe" }}>
        <span className="text-xs font-extrabold tracking-widest uppercase" style={{ color: "#1d6fa4" }}>Published by Others</span>
        {otherAssignments.length > 0 && <span className="ml-1 font-normal normal-case text-blue-400 text-xs">({otherAssignments.length})</span>}
      </div>

      {/* Section 2 toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-8 py-3 border-b border-gray-100 gap-2 flex-wrap">
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={othersSearch} onChange={e => setOthersSearch(e.target.value)} placeholder="Search others' assignments..."
            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full sm:w-56 focus:outline-none focus:border-[#7b1113] transition-colors" style={{ borderColor: "#d1d5db" }} />
        </div>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
          {(["author", "group"] as const).map(mode => (
            <button key={mode} onClick={() => setOthersViewMode(mode)}
              className="px-3 py-2 text-xs font-bold border-none transition-colors whitespace-nowrap"
              style={othersViewMode === mode ? { background: MAROON, color: "#fff" } : { background: "transparent", color: "#6b7280" }}>
              By {mode === "author" ? "Author" : "Group"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 sm:px-5 py-4">
        {otherAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            <p className="text-sm text-gray-400">No assignments published by others yet.</p>
          </div>
        ) : othersFiltered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No results for &ldquo;{othersSearch}&rdquo;</p>
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
      {showGroupModal && <AddGroupModal onClose={() => setShowGroupModal(false)} onSave={handleSaveGroup} saving={savingEditGroup} />}
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