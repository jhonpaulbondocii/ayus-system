"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Search, Plus, MoreVertical, X, ChevronDown } from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ── Responsive global CSS ──────────────────────────────────────────────────────
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }

  /* Prevent iOS input zoom */
  @media (max-width: 767px) {
    input, textarea, select { font-size: 16px !important; }
  }

  /* Smooth native scroll */
  .asgn-scroll { -webkit-overflow-scrolling: touch; }
  .asgn-scroll::-webkit-scrollbar { width: 3px; }
  .asgn-scroll::-webkit-scrollbar-thumb { background: #f0c0c0; border-radius: 2px; }

  /* Hide scrollbar on tab strip */
  .asgn-tabstrip { scrollbar-width: none; }
  .asgn-tabstrip::-webkit-scrollbar { display: none; }

  /* Tap highlight */
  button, [role="button"] { -webkit-tap-highlight-color: transparent; }

  /* ── Mobile overrides ── */
  @media (max-width: 639px) {

    /* AssignTo side panel: full-width bottom sheet */
    .asgn-assign-panel {
      width: 100% !important;
      top: auto !important;
      bottom: 0 !important;
      height: 92dvh !important;
      border-left: none !important;
      border-top: 1px solid #e5e7eb !important;
      border-radius: 20px 20px 0 0 !important;
      box-shadow: 0 -8px 40px rgba(0,0,0,0.18) !important;
    }

    /* Modal bottom-sheet style */
    .asgn-modal {
      border-radius: 20px 20px 0 0 !important;
      max-height: 92dvh !important;
      overflow-y: auto !important;
    }
    .asgn-modal-footer {
      flex-direction: column !important;
      gap: 8px !important;
      padding: 12px 16px !important;
    }
    .asgn-modal-footer button {
      width: 100% !important;
      height: 46px !important;
      font-size: 14px !important;
      border-radius: 10px !important;
    }
    /* Reorder footer buttons so primary action is on top on mobile */
    .asgn-modal-footer-primary { order: -1; }

    /* Assignment row metadata stacks vertically */
    .asgn-row-meta {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 4px !important;
    }

    /* Date picker grid: single column on very small screens */
    .asgn-date-grid {
      grid-template-columns: 1fr !important;
    }

    /* Toolbar: search takes full width, actions wrap below */
    .asgn-toolbar {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 8px !important;
      padding: 10px 12px !important;
    }
    .asgn-toolbar-search {
      max-width: 100% !important;
      width: 100% !important;
    }
    .asgn-toolbar-right {
      width: 100%;
      justify-content: flex-end;
    }

    /* Section label font */
    .asgn-section-label { font-size: 10px !important; }

    /* Group header: make title truncate gracefully */
    .asgn-group-title { max-width: calc(100vw - 120px) !important; }

    /* Assignment row: tighter padding on mobile */
    .asgn-row { padding: 11px 10px 11px 14px !important; }

    /* Assignment title: allow wrap instead of truncate on tiny screens */
    .asgn-row-title {
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: unset !important;
      word-break: break-word !important;
    }

    /* Dots menu button: bigger tap target */
    .asgn-dots-btn {
      width: 40px !important;
      height: 40px !important;
    }

    /* Points + due inline — collapse separator dot */
    .asgn-meta-dot { display: none !important; }
    .asgn-meta-due { display: block !important; }
  }

  /* 360px and below: even tighter */
  @media (max-width: 380px) {
    .asgn-toolbar-right button span { display: none; }
    .asgn-toolbar-right button { padding: 0 10px !important; }
  }

  /* Safe area insets */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .asgn-assign-panel-footer {
      padding-bottom: calc(12px + env(safe-area-inset-bottom)) !important;
    }
    .asgn-modal-footer {
      padding-bottom: calc(12px + env(safe-area-inset-bottom)) !important;
    }
  }

  /* Desktop: modal centered */
  @media (min-width: 640px) {
    .asgn-modal {
      border-radius: 12px !important;
      margin: auto !important;
      max-height: 90vh !important;
    }
    .asgn-modal-footer { flex-direction: row !important; }
    .asgn-modal-footer button { width: auto !important; height: 36px !important; font-size: 13px !important; }
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
`;

function buildTimes() {
  const list: string[] = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 30) {
      const hh = ((h + 11) % 12) + 1;
      list.push(`${hh}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`);
    }
  return list;
}
const TIME_OPTIONS = buildTimes();

// ── Types ──────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string;
  title: string;
  points: number;
  status: "PUBLISHED" | "UNPUBLISHED";
  dueDate: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  assignmentGroup: string;
  createdBy?: string | null;
  createdById?: string | null;
  publisherName?: string | null;
  publisherImage?: string | null;
  publisherRole?: string | null;
  _isMine?: boolean;
  isCreator?: boolean;
}

interface Props {
  courseId: string;
  currentUserId?: string | null;
  currentUserName?: string | null;
  currentUserRole?: string | null;
}

// ── Seen/New badge helpers ─────────────────────────────────────────────────────
const SEEN_KEY = (courseId: string) => `seen_assignments_${courseId}`;
function getSeenIds(courseId: string): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY(courseId));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function markSeen(courseId: string, id: string) {
  try {
    const seen = getSeenIds(courseId);
    seen.add(String(id));
    localStorage.setItem(SEEN_KEY(courseId), JSON.stringify([...seen]));
  } catch { /* ignore */ }
}

function NewBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "1px 6px", borderRadius: 4,
      fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
      textTransform: "uppercase", color: "#fff", background: "#dc2626",
      flexShrink: 0,
    }}>
      NEW
    </span>
  );
}

// ── Date/time helpers ──────────────────────────────────────────────────────────
function fmtDue(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  );
}
function isoToDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().split("T")[0];
}
function isoToTime(iso: string | null) {
  if (!iso) return "11:59 PM";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
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

// ── Group persistence ──────────────────────────────────────────────────────────
function groupsKey(courseId: string) { return `assignment_groups_${courseId}`; }
function loadPersistedGroups(courseId: string): string[] {
  try {
    const raw = localStorage.getItem(groupsKey(courseId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr.includes("Assignments") ? arr : ["Assignments", ...arr]) : [];
  } catch { return []; }
}
function persistGroups(courseId: string, groups: string[]) {
  try { localStorage.setItem(groupsKey(courseId), JSON.stringify(groups)); } catch { }
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function PublisherAvatar({ name, image, size = 20 }: { name?: string | null; image?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  if (image && !imgError) {
    return (
      <Image src={image} alt={name ?? "Publisher"} width={size} height={size}
        onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid #bfdbfe" }} />
    );
  }
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%", background: "#1d6fa4", color: "#fff",
      fontSize: size * 0.42, fontWeight: 700, display: "inline-flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0,
    }}>
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
      {role && (
        <span style={{ padding: "1px 5px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", background: "#eff6ff", color: "#1d6fa4", border: "1px solid #bfdbfe", flexShrink: 0 }}>
          {role}
        </span>
      )}
    </span>
  );
}

function AuthorBadge({ name, role }: { name: string; role: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 600, padding: "2px 8px",
      borderRadius: 20, border: "1px solid #f0c0c0",
      background: "#fdf8f8", color: MAROON, flexShrink: 0,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: MAROON, flexShrink: 0 }} />
      {name} · {role}
    </span>
  );
}

// ── Publish toggle ─────────────────────────────────────────────────────────────
function PublishToggle({ published, onToggle }: { published: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      title={published ? "Published — click to unpublish" : "Unpublished — click to publish"}
      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 4, touchAction: "manipulation", minWidth: 30, minHeight: 30 }}>
      {published ? (
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" fill="#16a34a" />
          <path d="M5.5 10.5l3 3 6-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#9ca3af" strokeWidth="1.5" fill="none" />
          <line x1="6" y1="14" x2="14" y2="6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

function AssignmentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ flexShrink: 0 }}>
      <rect x="4" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

// ── 3-dot row menu ─────────────────────────────────────────────────────────────
type DropdownAction = "edit" | "speedgrader" | "duplicate" | "assignTo" | "delete";

function AssignmentRowMenu({ assignment, onAction }: {
  assignment: Assignment;
  onAction: (action: DropdownAction, a: Assignment) => void;
}) {
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
    const w = 190, h = 210;
    const top = window.innerHeight - rect.bottom >= h ? rect.bottom + 4 : rect.top - h - 4;
    const left = Math.min(rect.right - w, window.innerWidth - w - 8);
    setMenuStyle({
      position: "fixed", top, left, zIndex: 9999, background: "#fff",
      border: "1px solid #e5e7eb", borderRadius: 10,
      boxShadow: "0 8px 24px rgba(0,0,0,0.13)", minWidth: w, overflow: "hidden",
    });
    setOpen(v => !v);
  };

  const items: { label: string; action: DropdownAction; danger?: boolean; icon: React.ReactNode }[] = [
    { label: "Edit", action: "edit", icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" /></svg> },
    { label: "SpeedGrader", action: "speedgrader", icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" /></svg> },
    { label: "Duplicate", action: "duplicate", icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg> },
    { label: "Assign To…", action: "assignTo", icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="12" cy="7" r="4" /></svg> },
    { label: "Delete", action: "delete", danger: true, icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" strokeLinecap="round" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" /><path d="M10 11v6M14 11v6" strokeLinecap="round" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" /></svg> },
  ];

  return (
    <>
      <button ref={btnRef} type="button" onClick={e => { e.stopPropagation(); handleOpen(); }}
        className="asgn-dots-btn"
        style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: "#9ca3af", touchAction: "manipulation" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}>
        <MoreVertical size={16} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={menuStyle} onClick={e => e.stopPropagation()}>
          {items.map((item, i) => (
            <button key={item.action} type="button"
              onClick={() => { setOpen(false); onAction(item.action, assignment); }}
              style={{
                width: "100%", textAlign: "left", padding: "11px 14px",
                fontSize: 13, display: "flex", alignItems: "center", gap: 9,
                background: "none", border: "none", cursor: "pointer",
                color: item.danger ? "#dc2626" : "#374151",
                borderTop: i > 0 ? "1px solid #f3f4f6" : "none",
                minHeight: 44,
              }}
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

// ── Group 3-dot menu ───────────────────────────────────────────────────────────
function GroupMenu({ onEdit, onDelete, isLastGroup }: {
  onEdit: () => void; onDelete: () => void; isLastGroup?: boolean;
}) {
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
    const w = 160, h = isLastGroup ? 44 : 88;
    const top = window.innerHeight - rect.bottom >= h ? rect.bottom + 4 : rect.top - h - 4;
    const left = Math.min(rect.right - w, window.innerWidth - w - 8);
    setMenuStyle({ position: "fixed", top, left, zIndex: 9999, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.13)", minWidth: w, overflow: "hidden" });
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

// ── Modal shell ────────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, children, footer }: {
  title: string; onClose: () => void;
  children: React.ReactNode; footer: React.ReactNode;
}) {
  // Lock body scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.36)",
        padding: 0,
      }}
      onClick={onClose}
    >
      <div
        className="asgn-modal"
        style={{
          background: "#fff", width: "100%", maxWidth: 480,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          overflow: "hidden", fontFamily: FONT,
          animation: "slideUp 0.22s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 18px", borderBottom: "1px solid #e5e7eb",
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</span>
          <button onClick={onClose} style={{
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid #e5e7eb", borderRadius: 7, background: "none", cursor: "pointer", color: "#6b7280",
          }}>
            <X size={14} />
          </button>
        </div>
        {/* Body */}
        <div
          style={{ padding: "18px", overflowY: "auto", maxHeight: "55vh" }}
          className="asgn-scroll"
        >
          {children}
        </div>
        {/* Footer */}
        <div
          className="asgn-modal-footer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            gap: 8, padding: "12px 18px",
            background: "#fafafa", borderTop: "1px solid #e5e7eb",
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}

function BtnPrimary({ onClick, disabled, children, className }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}
      style={{ height: 36, padding: "0 20px", fontFamily: FONT, fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", color: "#fff", background: disabled ? "#d1d5db" : MAROON, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap", touchAction: "manipulation" }}>
      {children}
    </button>
  );
}
function BtnSecondary({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ height: 36, padding: "0 16px", fontFamily: FONT, fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid #d1d5db", color: "#374151", background: "#fff", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap", touchAction: "manipulation" }}>
      {children}
    </button>
  );
}
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
      {children}{required && <span style={{ color: MAROON, marginLeft: 2 }}>*</span>}
    </label>
  );
}
function StyledInput({ value, onChange, placeholder, type = "text", onFocus, onBlur, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; onFocus?: () => void; onBlur?: () => void; autoFocus?: boolean;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
      onFocus={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(123,17,19,0.08)`; onFocus?.(); }}
      onBlur={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; onBlur?.(); }}
      style={{ width: "100%", height: 42, border: "1px solid #d1d5db", borderRadius: 8, padding: "0 12px", fontFamily: FONT, color: "#111827", background: "#fafafa", outline: "none", transition: "border-color 0.15s" }} />
  );
}
function StyledSelect({ value, onChange, children, style }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", height: 42, border: "1px solid #d1d5db", borderRadius: 8, padding: "0 32px 0 12px", fontFamily: FONT, color: "#111827", background: "#fafafa", outline: "none", appearance: "none", cursor: "pointer", ...style }}>
        {children}
      </select>
      <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
    </div>
  );
}

// ── Delete Assignment Modal ────────────────────────────────────────────────────
function DeleteAssignmentModal({ assignment, onClose, onConfirm, deleting }: {
  assignment: Assignment; onClose: () => void; onConfirm: () => void; deleting: boolean;
}) {
  return (
    <ModalShell title="Delete Assignment" onClose={onClose}
      footer={<>
        <BtnSecondary onClick={onClose} disabled={deleting}>Cancel</BtnSecondary>
        <button type="button" onClick={onConfirm} disabled={deleting}
          className="asgn-modal-footer-primary"
          style={{ height: 36, padding: "0 20px", fontFamily: FONT, fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", color: "#fff", background: "#dc2626", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1, touchAction: "manipulation" }}>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </>}>
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: 0 }}>
        Are you sure you want to delete <strong>&ldquo;{assignment.title}&rdquo;</strong>? This action cannot be undone.
      </p>
    </ModalShell>
  );
}

// ── Quick Edit Modal ───────────────────────────────────────────────────────────
function QuickEditModal({ assignment, courseId, onClose, onSave, onMoreOptions }: {
  assignment: Assignment; courseId: string; onClose: () => void;
  onSave: (updated: Partial<Assignment> & { dueTime?: string }) => Promise<void>;
  onMoreOptions: () => void;
}) {
  const [name, setName] = useState(assignment.title);
  const [dueDate, setDueDate] = useState(isoToDate(assignment.dueDate));
  const [dueTime, setDueTime] = useState(isoToTime(assignment.dueDate));
  const [points, setPoints] = useState(String(assignment.points));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  void courseId;

  const dateLabel = fmtDateLabel(dueDate, dueTime);

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    try {
      await onSave({ title: name.trim(), points: parseFloat(points) || 0, dueDate: dueDate || null, dueTime });
      onClose();
    } catch { setError("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title="Edit Assignment" onClose={onClose}
      footer={<>
        {/* Mobile: primary on top via CSS order; desktop: row order preserved */}
        <BtnSecondary onClick={onMoreOptions}>More Options</BtnSecondary>
        <div style={{ flex: 1 }} />
        <BtnSecondary onClick={onClose} disabled={saving}>Cancel</BtnSecondary>
        <BtnPrimary onClick={handleSave} disabled={saving || !name.trim()} className="asgn-modal-footer-primary">{saving ? "Saving…" : "Save"}</BtnPrimary>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <FieldLabel required>Name</FieldLabel>
          <StyledInput value={name} onChange={setName} autoFocus />
        </div>
        <div>
          <FieldLabel>Due at</FieldLabel>
          <div className="asgn-date-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4 }}>Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                style={{ width: "100%", height: 42, border: "1px solid #d1d5db", borderRadius: 8, padding: "0 10px", fontFamily: FONT, color: "#111827", background: "#fafafa", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4 }}>Time</label>
              <StyledSelect value={dueTime} onChange={setDueTime}>
                {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </StyledSelect>
            </div>
          </div>
          {dateLabel && <p style={{ fontSize: 12, color: MAROON, fontWeight: 600, marginTop: 6, marginBottom: 0 }}>{dateLabel}</p>}
        </div>
        <div>
          <FieldLabel>Points</FieldLabel>
          <input type="number" min={0} value={points} onChange={e => setPoints(e.target.value)}
            style={{ width: "100%", maxWidth: 140, height: 42, border: "1px solid #d1d5db", borderRadius: 8, padding: "0 12px", fontFamily: FONT, color: "#111827", background: "#fafafa", outline: "none" }} />
        </div>
        {error && <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>⚠ {error}</p>}
      </div>
    </ModalShell>
  );
}

// ── Add / Edit / Delete Group Modals ──────────────────────────────────────────
function GroupNameModal({ title, initialValue, onClose, onSave, saving, saveLabel }: {
  title: string; initialValue?: string; onClose: () => void;
  onSave: (name: string) => void; saving: boolean; saveLabel: string;
}) {
  const [name, setName] = useState(initialValue ?? "");
  const unchanged = name.trim() === (initialValue ?? "").trim();
  return (
    <ModalShell title={title} onClose={onClose}
      footer={<>
        <BtnSecondary onClick={onClose} disabled={saving}>Cancel</BtnSecondary>
        <BtnPrimary onClick={() => name.trim() && onSave(name.trim())} disabled={saving || !name.trim() || unchanged} className="asgn-modal-footer-primary">
          {saving ? "Saving…" : saveLabel}
        </BtnPrimary>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <FieldLabel>Group Name</FieldLabel>
        <StyledInput value={name} onChange={setName} placeholder="e.g. Essay Group 1" autoFocus />
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
    <ModalShell title="Delete Assignment Group" onClose={onClose}
      footer={<>
        <BtnSecondary onClick={onClose}>Cancel</BtnSecondary>
        <button type="button" onClick={() => onDelete(choice, choice === "move" ? targetGroup : undefined)}
          disabled={choice === "move" && !targetGroup}
          className="asgn-modal-footer-primary"
          style={{ height: 36, padding: "0 20px", fontFamily: FONT, fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", color: "#fff", background: "#dc2626", cursor: "pointer", opacity: choice === "move" && !targetGroup ? 0.4 : 1, touchAction: "manipulation" }}>
          Delete Group
        </button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 14, color: "#374151" }}>
        <p style={{ margin: 0 }}>You are about to delete <strong>{groupName}</strong>, which has <strong>{assignmentCount}</strong> assignment{assignmentCount !== 1 ? "s" : ""}.</p>
        <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>What would you like to do with its assignments?</p>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", border: `1.5px solid ${choice === "delete" ? MAROON : "#e5e7eb"}`, borderRadius: 8, background: choice === "delete" ? "#fdf8f8" : "#fff" }}>
          <input type="radio" checked={choice === "delete"} onChange={() => setChoice("delete")} style={{ accentColor: MAROON, width: 16, height: 16, flexShrink: 0 }} />
          Delete its assignments
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", border: `1.5px solid ${choice === "move" ? MAROON : "#e5e7eb"}`, borderRadius: 8, background: choice === "move" ? "#fdf8f8" : "#fff", opacity: otherGroups.length === 0 ? 0.4 : 1 }}>
            <input type="radio" checked={choice === "move"} onChange={() => setChoice("move")} disabled={otherGroups.length === 0} style={{ accentColor: MAROON, width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ color: otherGroups.length === 0 ? "#9ca3af" : "#374151" }}>Move its assignments to…</span>
          </label>
          {choice === "move" && otherGroups.length > 0 && (
            <StyledSelect value={targetGroup} onChange={setTargetGroup}>
              <option value="">[ Select a Group ]</option>
              {otherGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </StyledSelect>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

// ── Assign To Side Panel ───────────────────────────────────────────────────────
interface AssignRow {
  id: number; assignees: string[];
  dueDate: string; dueTime: string;
  availableFrom: string; availableFromTime: string;
  until: string; untilTime: string;
}

function AssignToPanel({ assignment, courseId, onClose, onSave }: {
  assignment: Assignment; courseId: string; onClose: () => void; onSave: () => void;
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

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (openDropId === null) return;
    const h = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-assigndrop]")) setOpenDropId(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openDropId]);

  const updateRow = (id: number, field: keyof AssignRow, value: string | string[]) =>
    setRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const toggleAssignee = (rowId: number, name: string) =>
    setRows(p => p.map(r => {
      if (r.id !== rowId) return r;
      if (name === "Everyone") return { ...r, assignees: ["Everyone"] };
      const without = r.assignees.filter(a => a !== "Everyone");
      const has = without.includes(name);
      const next = has ? without.filter(a => a !== name) : [...without, name];
      return { ...r, assignees: next.length ? next : ["Everyone"] };
    }));

  const addRow = () => setRows(p => [...p, { id: Date.now(), assignees: [], dueDate: "", dueTime: "11:59 PM", availableFrom: "", availableFromTime: "12:00 AM", until: "", untilTime: "11:59 PM" }]);
  const removeRow = (id: number) => setRows(p => p.filter(r => r.id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      const row = rows[0];
      await fetch(`/api/admin/courses/${courseId}/assignments/${assignment.id}`, {
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
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>{label}</p>
        <div className="asgn-date-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <p style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4, marginTop: 0 }}>Date</p>
            <input type="date" value={dateVal} onChange={e => onDateChange(e.target.value)}
              style={{ width: "100%", height: 40, border: "1px solid #d1d5db", borderRadius: 7, padding: "0 10px", fontFamily: FONT, fontSize: 13, color: "#111827", background: "#fff", outline: "none" }} />
          </div>
          <div>
            <p style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4, marginTop: 0 }}>Time</p>
            <StyledSelect value={timeVal} onChange={onTimeChange}>
              {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
            </StyledSelect>
          </div>
        </div>
        {localLabel && <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{localLabel}</p>}
        <button onClick={onClear} style={{ fontSize: 11, fontWeight: 600, color: MAROON, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", textDecoration: "underline", alignSelf: "flex-start" }}>
          Clear
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.25)" }} onClick={onClose} />
      <div
        className="asgn-assign-panel"
        style={{
          position: "fixed", top: 0, right: 0, height: "100%", zIndex: 50,
          width: "min(400px, 100vw)", background: "#fff",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.15)", borderLeft: "1px solid #e5e7eb",
          display: "flex", flexDirection: "column", fontFamily: FONT,
          animation: "slideUp 0.22s ease",
        }}
      >
        {/* Drag handle (visible on mobile bottom sheet) */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "12px 16px 14px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <AssignmentIcon />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assignment.title}</span>
              </div>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0, marginLeft: 26 }}>Assignment · {assignment.points} pts</p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e5e7eb", borderRadius: 7, background: "none", cursor: "pointer", color: "#6b7280", flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div style={{ margin: "12px 14px 0", display: "flex", gap: 10, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 12px", flexShrink: 0 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#1d6fa4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>i</span>
          </div>
          <p style={{ fontSize: 12, color: "#1e40af", lineHeight: 1.5, margin: 0 }}>Select who should be assigned and set date and time using the fields below.</p>
        </div>

        {/* Rows */}
        <div className="asgn-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {rows.map((row, idx) => (
              <div key={row.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px", display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
                {idx > 0 && (
                  <button onClick={() => removeRow(row.id)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 4 }}>
                    <X size={13} />
                  </button>
                )}
                {/* Assign to dropdown */}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6, marginTop: 0 }}>Assign To</p>
                  <div style={{ position: "relative" }} data-assigndrop>
                    <div onMouseDown={e => { e.stopPropagation(); setOpenDropId(openDropId === row.id ? null : row.id); setDropSearch(""); }}
                      style={{ minHeight: 42, border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", cursor: "pointer", background: "#fafafa" }}>
                      {row.assignees.map(a => (
                        <span key={a} style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#fff", background: MAROON }}>
                          {a}
                          <button onMouseDown={e => { e.stopPropagation(); toggleAssignee(row.id, a); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: 14, lineHeight: 1, padding: 0, minWidth: 18, minHeight: 18 }}>×</button>
                        </span>
                      ))}
                      <input readOnly placeholder={row.assignees.length ? "" : "Start typing to search…"}
                        style={{ flex: 1, minWidth: 60, fontSize: 13, border: "none", outline: "none", background: "transparent", color: "#9ca3af", cursor: "pointer" }} />
                      <ChevronDown size={13} style={{ color: "#9ca3af", flexShrink: 0, transform: openDropId === row.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
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
                            style={{ width: "100%", textAlign: "left", padding: "11px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", color: row.assignees.includes(opt) ? MAROON : "#374151", fontWeight: row.assignees.includes(opt) ? 700 : 400, minHeight: 44 }}>
                            {opt}{row.assignees.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <DateRow label="Due Date" dateVal={row.dueDate} timeVal={row.dueTime}
                  onDateChange={v => updateRow(row.id, "dueDate", v)} onTimeChange={v => updateRow(row.id, "dueTime", v)}
                  onClear={() => { updateRow(row.id, "dueDate", ""); updateRow(row.id, "dueTime", "11:59 PM"); }} />
                <DateRow label="Available from" dateVal={row.availableFrom} timeVal={row.availableFromTime}
                  onDateChange={v => updateRow(row.id, "availableFrom", v)} onTimeChange={v => updateRow(row.id, "availableFromTime", v)}
                  onClear={() => { updateRow(row.id, "availableFrom", ""); updateRow(row.id, "availableFromTime", "12:00 AM"); }} />
                <DateRow label="Until" dateVal={row.until} timeVal={row.untilTime}
                  onDateChange={v => updateRow(row.id, "until", v)} onTimeChange={v => updateRow(row.id, "untilTime", v)}
                  onClear={() => { updateRow(row.id, "until", ""); updateRow(row.id, "untilTime", "11:59 PM"); }} />
              </div>
            ))}
            <button onClick={addRow} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: MAROON, background: "none", border: "none", cursor: "pointer", padding: "6px 0", touchAction: "manipulation" }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="asgn-assign-panel-footer" style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb", padding: "12px 14px", display: "flex", justifyContent: "flex-end", gap: 8, background: "#fafafa" }}>
          <BtnSecondary onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</BtnPrimary>
        </div>
      </div>
    </>
  );
}

// ── Assignment Row ─────────────────────────────────────────────────────────────
function AssignmentRow({
  a, courseId, router, variant,
  currentUserName, currentUserRole,
  seenIds, onView,
  onEdit, onDuplicate, onAssignTo, onSpeedGrader, onDelete, onTogglePublish,
}: {
  a: Assignment; courseId: string; router: ReturnType<typeof useRouter>;
  variant: "mine" | "others";
  currentUserName?: string | null; currentUserRole?: string | null;
  seenIds: Set<string>;
  onView: (a: Assignment) => void;
  onEdit: (a: Assignment) => void; onDuplicate: (a: Assignment) => void;
  onAssignTo: (a: Assignment) => void; onSpeedGrader: (a: Assignment) => void;
  onDelete: (a: Assignment) => void; onTogglePublish: (a: Assignment) => void;
}) {
  const accentColor = variant === "mine" ? MAROON : "#60a5fa";
  const now = new Date();
  const isClosed = a.availableUntil && now > new Date(a.availableUntil);
  const due = fmtDue(a.dueDate);
  const isNew = !seenIds.has(String(a.id));

  const authorDisplayName = variant === "mine"
    ? (currentUserName ?? a.publisherName ?? a.createdBy)
    : (a.publisherName ?? a.createdBy);
  const authorRole = variant === "mine"
    ? (currentUserRole ?? a.publisherRole ?? "Admin")
    : a.publisherRole;

  const handleAction = (action: DropdownAction, assignment: Assignment) => {
    if (action === "edit") onEdit(assignment);
    else if (action === "speedgrader") onSpeedGrader(assignment);
    else if (action === "duplicate") onDuplicate(assignment);
    else if (action === "assignTo") onAssignTo(assignment);
    else if (action === "delete") onDelete(assignment);
  };

  const handleClick = () => {
    onView(a);
    router.push(`/admin/courses/${courseId}/assignments/${a.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="asgn-row"
      style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        padding: "14px 12px 14px 16px",
        background: variant === "mine" ? "#fff" : "#fafcff",
        borderBottom: "1px solid #f3f4f6",
        cursor: "pointer", position: "relative",
        transition: "background 0.1s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "#fdf8f8")}
      onMouseLeave={e => (e.currentTarget.style.background = variant === "mine" ? "#fff" : "#fafcff")}
    >
      {/* Left accent bar */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "0 2px 2px 0", background: accentColor }} />

      {/* Publish toggle */}
      <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, marginTop: 0 }}>
        <PublishToggle published={a.status === "PUBLISHED"} onToggle={() => onTogglePublish(a)} />
      </div>

      <div style={{ flexShrink: 0, marginTop: 5 }}>
        <AssignmentIcon />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, flexWrap: "wrap", marginBottom: 5 }}>
          <span
            className="asgn-row-title"
            style={{
              fontSize: 13, fontWeight: 700, color: MAROON,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {a.title}
          </span>
          {isNew && <NewBadge />}
          {a.status === "UNPUBLISHED" && (
            <span style={{ fontSize: 10, color: "#d97706", fontWeight: 600, flexShrink: 0 }}>Not Published</span>
          )}
          {isClosed && (
            <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, flexShrink: 0 }}>Closed</span>
          )}
        </div>
        {/* Meta row — stacks on mobile via CSS */}
        <div
          className="asgn-row-meta"
          style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
        >
          {variant === "mine" && authorDisplayName && (
            <AuthorBadge name={authorDisplayName} role={authorRole ?? "Admin"} />
          )}
          {variant === "others" && (
            <PublisherChip name={authorDisplayName} image={a.publisherImage} role={authorRole} />
          )}
          <span style={{ fontSize: 12, color: "#6b7280", flexShrink: 0 }}>{a.points} pts</span>
          {due && (
            <>
              <span className="asgn-meta-dot" style={{ color: "#d1d5db", flexShrink: 0 }}>·</span>
              <span className="asgn-meta-due" style={{ fontSize: 12, color: "#6b7280" }}>Due: {due}</span>
            </>
          )}
        </div>
      </div>

      {/* 3-dot menu */}
      <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, marginLeft: 2 }}>
        <AssignmentRowMenu assignment={a} onAction={handleAction} />
      </div>
    </div>
  );
}

// ── Group Section ──────────────────────────────────────────────────────────────
function AssignmentGroupSection({
  title, items, courseId, router, currentUserName, currentUserRole,
  seenIds, onView,
  onAddAssignment, onEdit, onDuplicate, onAssignTo, onSpeedGrader, onDelete, onTogglePublish,
  onEditGroup, onDeleteGroup, isLastGroup, rowVariant = "mine",
}: {
  title: string; items: Assignment[]; courseId: string; router: ReturnType<typeof useRouter>;
  currentUserName?: string | null; currentUserRole?: string | null;
  seenIds: Set<string>; onView: (a: Assignment) => void;
  onAddAssignment: (group: string) => void;
  onEdit: (a: Assignment) => void; onDuplicate: (a: Assignment) => void;
  onAssignTo: (a: Assignment) => void; onSpeedGrader: (a: Assignment) => void;
  onDelete: (a: Assignment) => void; onTogglePublish: (a: Assignment) => void;
  onEditGroup: (group: string) => void; onDeleteGroup: (group: string) => void;
  isLastGroup?: boolean; rowVariant?: "mine" | "others";
}) {
  const [collapsed, setCollapsed] = useState(false);
  const newCount = items.filter(a => !seenIds.has(String(a.id))).length;

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Group header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 12px", background: "#f9fafb",
        border: "1px solid #e5e7eb", borderRadius: collapsed ? 8 : "8px 8px 0 0",
      }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", flex: 1, minWidth: 0 }}
          onClick={() => setCollapsed(c => !c)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"
            style={{ flexShrink: 0, transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span
            className="asgn-group-title"
            style={{ fontSize: 13, fontWeight: 700, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {title}
          </span>
          <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>({items.length})</span>
          {newCount > 0 && (
            <span style={{ padding: "1px 6px", borderRadius: 20, fontSize: 9, fontWeight: 800, color: "#fff", background: "#dc2626", flexShrink: 0 }}>
              {newCount}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {rowVariant === "mine" && (
            <button onClick={() => onAddAssignment(title)}
              style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#9ca3af", touchAction: "manipulation" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#e5e7eb")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              <Plus size={15} />
            </button>
          )}
          <GroupMenu onEdit={() => onEditGroup(title)} onDelete={() => onDeleteGroup(title)} isLastGroup={isLastGroup} />
        </div>
      </div>

      {!collapsed && (
        <div style={{ border: "1px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
          {items.length === 0 ? (
            <div style={{ padding: "20px 16px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
              No assignments in this group.
            </div>
          ) : (
            items.map(a => (
              <AssignmentRow key={a.id} a={a} courseId={courseId} router={router}
                variant={rowVariant} currentUserName={currentUserName} currentUserRole={currentUserRole}
                seenIds={seenIds} onView={onView}
                onEdit={onEdit} onDuplicate={onDuplicate} onAssignTo={onAssignTo}
                onSpeedGrader={onSpeedGrader} onDelete={onDelete} onTogglePublish={onTogglePublish} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Others Author Section ──────────────────────────────────────────────────────
function OthersAuthorSection({
  authorName, authorRole, authorImage, items, courseId, router,
  seenIds, onView, onEdit, onDuplicate, onAssignTo, onSpeedGrader, onDelete, onTogglePublish,
}: {
  authorName: string; authorRole?: string | null; authorImage?: string | null;
  items: Assignment[]; courseId: string; router: ReturnType<typeof useRouter>;
  seenIds: Set<string>; onView: (a: Assignment) => void;
  onEdit: (a: Assignment) => void; onDuplicate: (a: Assignment) => void;
  onAssignTo: (a: Assignment) => void; onSpeedGrader: (a: Assignment) => void;
  onDelete: (a: Assignment) => void; onTogglePublish: (a: Assignment) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const newCount = items.filter(a => !seenIds.has(String(a.id))).length;

  return (
    <div style={{ marginBottom: 12 }}>
      <div onClick={() => setCollapsed(c => !c)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: collapsed ? 8 : "8px 8px 0 0", cursor: "pointer" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d6fa4" strokeWidth="2.5"
          style={{ flexShrink: 0, transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        <PublisherAvatar name={authorName} image={authorImage} size={22} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>{authorName}</span>
        {authorRole && (
          <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", background: "#eff6ff", color: "#1d6fa4", border: "1px solid #bfdbfe", flexShrink: 0 }}>
            {authorRole}
          </span>
        )}
        <span style={{ fontSize: 12, color: "#93c5fd", flexShrink: 0 }}>({items.length})</span>
        {newCount > 0 && (
          <span style={{ padding: "1px 6px", borderRadius: 20, fontSize: 9, fontWeight: 800, color: "#fff", background: "#dc2626", flexShrink: 0 }}>
            {newCount}
          </span>
        )}
      </div>
      {!collapsed && (
        <div style={{ border: "1px solid #bfdbfe", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
          {items.map(a => (
            <AssignmentRow key={a.id} a={a} courseId={courseId} router={router} variant="others"
              seenIds={seenIds} onView={onView}
              onEdit={onEdit} onDuplicate={onDuplicate} onAssignTo={onAssignTo}
              onSpeedGrader={onSpeedGrader} onDelete={onDelete} onTogglePublish={onTogglePublish} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Others Group Section ───────────────────────────────────────────────────────
function OthersGroupSection({
  title, items, courseId, router,
  seenIds, onView, onEdit, onDuplicate, onAssignTo, onSpeedGrader, onDelete, onTogglePublish,
}: {
  title: string; items: Assignment[]; courseId: string; router: ReturnType<typeof useRouter>;
  seenIds: Set<string>; onView: (a: Assignment) => void;
  onEdit: (a: Assignment) => void; onDuplicate: (a: Assignment) => void;
  onAssignTo: (a: Assignment) => void; onSpeedGrader: (a: Assignment) => void;
  onDelete: (a: Assignment) => void; onTogglePublish: (a: Assignment) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const newCount = items.filter(a => !seenIds.has(String(a.id))).length;

  return (
    <div style={{ marginBottom: 12 }}>
      <div onClick={() => setCollapsed(c => !c)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: collapsed ? 8 : "8px 8px 0 0", cursor: "pointer" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2.5"
          style={{ flexShrink: 0, transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0369a1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>{title}</span>
        <span style={{ fontSize: 12, color: "#7dd3fc", flexShrink: 0 }}>({items.length})</span>
        {newCount > 0 && (
          <span style={{ padding: "1px 6px", borderRadius: 20, fontSize: 9, fontWeight: 800, color: "#fff", background: "#dc2626", flexShrink: 0 }}>
            {newCount}
          </span>
        )}
      </div>
      {!collapsed && (
        <div style={{ border: "1px solid #bae6fd", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
          {items.map(a => (
            <AssignmentRow key={a.id} a={a} courseId={courseId} router={router} variant="others"
              seenIds={seenIds} onView={onView}
              onEdit={onEdit} onDuplicate={onDuplicate} onAssignTo={onAssignTo}
              onSpeedGrader={onSpeedGrader} onDelete={onDelete} onTogglePublish={onTogglePublish} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────────────
function Toolbar({ search, onSearch, right }: {
  search: string; onSearch: (v: string) => void; right: React.ReactNode;
}) {
  return (
    <div
      className="asgn-toolbar"
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 12px", borderBottom: "1px solid #f3f4f6", gap: 8,
      }}
    >
      {/* Search */}
      <div className="asgn-toolbar-search" style={{ position: "relative", flex: 1, maxWidth: 280 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
        <input
          value={search} onChange={e => onSearch(e.target.value)} placeholder="Search assignments…"
          style={{
            width: "100%", height: 38, border: "1px solid #e5e7eb", borderRadius: 8,
            paddingLeft: 32, paddingRight: 10, fontFamily: FONT, fontSize: 13,
            color: "#374151", background: "#fafafa", outline: "none",
          }}
        />
      </div>
      {/* Right actions */}
      <div className="asgn-toolbar-right" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {right}
      </div>
    </div>
  );
}

function SectionLabel({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      padding: "8px 14px",
      background: bg, borderBottom: `1px solid ${border}`, borderTop: `1px solid ${border}`,
    }}>
      <span
        className="asgn-section-label"
        style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color }}
      >
        {children}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function CourseAssignmentsPage({
  courseId, currentUserId, currentUserName, currentUserRole,
}: Props) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [mySearch, setMySearch] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [localGroups, setLocalGroups] = useState<string[]>(["Assignments"]);
  const [othersSearch, setOthersSearch] = useState("");
  const [othersViewMode, setOthersViewMode] = useState<"author" | "group">("author");

  const [quickEditTarget, setQuickEditTarget] = useState<Assignment | null>(null);
  const [assignToTarget, setAssignToTarget] = useState<Assignment | null>(null);
  const [editGroupTarget, setEditGroupTarget] = useState<string | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<string | null>(null);
  const [savingEditGroup, setSavingEditGroup] = useState(false);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState<Assignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState(false);

  const [resolvedUserId, setResolvedUserId] = useState<string | null | undefined>(currentUserId);
  const [resolvedUserName, setResolvedUserName] = useState<string | null | undefined>(currentUserName);

  const [seenIds, setSeenIds] = useState<Set<string>>(() => getSeenIds(courseId));

  const handleView = useCallback((a: Assignment) => {
    markSeen(courseId, String(a.id));
    setSeenIds(getSeenIds(courseId));
  }, [courseId]);

  useEffect(() => {
    if (!currentUserId) {
      fetch("/api/auth/session").then(r => r.json()).then(s => {
        if (s?.user?.id) setResolvedUserId(s.user.id);
        if (s?.user?.name) setResolvedUserName(s.user.name);
      }).catch(() => { });
    }
  }, [currentUserId]);

  function isMyAssignment(a: Assignment, userId?: string | null, userName?: string | null): boolean {
    if (a._isMine || a.isCreator) return true;
    if (userId && a.createdById && a.createdById === userId) return true;
    if (userName && a.createdBy && a.createdBy === userName) return true;
    if (userName && a.publisherName && a.publisherName === userName) return true;
    return false;
  }

  const loadAssignments = useCallback(() => {
    if (!courseId) return;
    fetch(`/api/admin/courses/${courseId}/assignments`)
      .then(r => r.json())
      .then(d => {
        const list: Assignment[] = d.assignments ?? [];
        setAssignments(list);
        setSeenIds(getSeenIds(courseId));
        const apiGroups = [...new Set(
          list.filter(a => isMyAssignment(a, resolvedUserId, resolvedUserName))
            .map(a => a.assignmentGroup || "Assignments")
        )];
        setLocalGroups(prev => {
          const merged = [...new Set(["Assignments", ...prev, ...apiGroups])];
          persistGroups(courseId, merged);
          return merged;
        });
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, resolvedUserId, resolvedUserName]);

  useEffect(() => {
    if (!courseId) return;
    const persisted = loadPersistedGroups(courseId);
    if (persisted.length > 0) setLocalGroups(prev => [...new Set(["Assignments", ...persisted, ...prev])]);
    loadAssignments();
  }, [courseId, loadAssignments]);

  const handleTogglePublish = async (a: Assignment) => {
    const newStatus = a.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, status: newStatus } : x));
    await fetch(`/api/admin/courses/${courseId}/assignments/${a.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => { });
  };

  const handleSaveGroup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLocalGroups(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
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
      assignments.filter(a => a.assignmentGroup === oldName).forEach(a => {
        fetch(`/api/admin/courses/${courseId}/assignments/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentGroup: newName }) }).catch(() => { });
      });
      setEditGroupTarget(null);
    } finally { setSavingEditGroup(false); }
  };

  const handleDeleteGroup = (action: "delete" | "move", targetGroup?: string) => {
    if (!deleteGroupTarget) return;
    const groupName = deleteGroupTarget;
    if (action === "delete") {
      assignments.filter(a => (a.assignmentGroup || "Assignments") === groupName).forEach(a => {
        fetch(`/api/admin/courses/${courseId}/assignments/${a.id}`, { method: "DELETE" }).catch(() => { });
      });
      setAssignments(prev => prev.filter(a => (a.assignmentGroup || "Assignments") !== groupName));
    } else if (action === "move" && targetGroup) {
      setAssignments(prev => prev.map(a => (a.assignmentGroup || "Assignments") === groupName ? { ...a, assignmentGroup: targetGroup } : a));
      assignments.filter(a => (a.assignmentGroup || "Assignments") === groupName).forEach(a => {
        fetch(`/api/admin/courses/${courseId}/assignments/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentGroup: targetGroup }) }).catch(() => { });
      });
    }
    setLocalGroups(prev => { if (prev.length <= 1) return prev; const next = prev.filter(g => g !== groupName); persistGroups(courseId, next); return next; });
    setDeleteGroupTarget(null);
  };

  const handleQuickEditSave = async (updated: Partial<Assignment> & { dueTime?: string }) => {
    if (!quickEditTarget) return;
    await fetch(`/api/admin/courses/${courseId}/assignments/${quickEditTarget.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: updated.title, points: updated.points, dueDate: updated.dueDate || null, dueTime: updated.dueTime }),
    });
    setAssignments(prev => prev.map(a => a.id === quickEditTarget.id ? { ...a, ...updated } : a));
  };

  const handleDuplicate = async (a: Assignment) => {
    const res = await fetch(`/api/admin/courses/${courseId}/assignments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `${a.title} Copy`, points: a.points, status: "UNPUBLISHED", assignmentGroup: a.assignmentGroup, dueDate: a.dueDate, availableFrom: a.availableFrom, availableUntil: a.availableUntil }),
    }).catch(() => null);
    if (res?.ok) loadAssignments();
  };

  const handleSpeedGrader = (a: Assignment) => window.open(`/admin/courses/${courseId}/assignments/${a.id}/speedgrader`, "_blank");

  const handleDeleteAssignment = async () => {
    if (!deleteAssignmentTarget) return;
    setDeletingAssignment(true);
    try {
      await fetch(`/api/admin/courses/${courseId}/assignments/${deleteAssignmentTarget.id}`, { method: "DELETE" });
      setAssignments(prev => prev.filter(a => a.id !== deleteAssignmentTarget.id));
      setDeleteAssignmentTarget(null);
    } finally { setDeletingAssignment(false); }
  };

  // Derived
  const myAssignments = assignments.filter(a => isMyAssignment(a, resolvedUserId, resolvedUserName));
  const otherAssignments = assignments.filter(a => !isMyAssignment(a, resolvedUserId, resolvedUserName));
  const myFiltered = myAssignments.filter(a => a.title.toLowerCase().includes(mySearch.toLowerCase()));
  const othersFiltered = otherAssignments.filter(a => a.title.toLowerCase().includes(othersSearch.toLowerCase()));

  const myGrouped: Record<string, Assignment[]> = {};
  for (const g of localGroups) myGrouped[g] = [];
  for (const a of myFiltered) {
    const g = a.assignmentGroup || "Assignments";
    if (!myGrouped[g]) myGrouped[g] = [];
    myGrouped[g].push(a);
  }

  const othersByAuthor: Record<string, { role?: string | null; image?: string | null; items: Assignment[] }> = {};
  for (const a of othersFiltered) {
    const author = a.publisherName ?? a.createdBy ?? "Unknown";
    if (!othersByAuthor[author]) othersByAuthor[author] = { role: a.publisherRole, image: a.publisherImage, items: [] };
    othersByAuthor[author].items.push(a);
  }

  const othersByGroup: Record<string, Assignment[]> = {};
  for (const a of othersFiltered) {
    const g = a.assignmentGroup || "Assignments";
    if (!othersByGroup[g]) othersByGroup[g] = [];
    othersByGroup[g].push(a);
  }

  const rowHandlers = {
    onEdit: (a: Assignment) => setQuickEditTarget(a),
    onDuplicate: handleDuplicate,
    onAssignTo: (a: Assignment) => setAssignToTarget(a),
    onSpeedGrader: handleSpeedGrader,
    onDelete: (a: Assignment) => setDeleteAssignmentTarget(a),
    onTogglePublish: handleTogglePublish,
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: "#9ca3af", fontSize: 13, fontFamily: FONT }}>
        <svg style={{ animation: "spin 1s linear infinite", width: 18, height: 18 }} viewBox="0 0 24 24" fill="none">
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading assignments…
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", fontFamily: FONT }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Section 1: Published by You ── */}
      <SectionLabel color={MAROON} bg="#fef2f2" border="#f0c0c0">
        Published by You
      </SectionLabel>

      <Toolbar search={mySearch} onSearch={setMySearch}
        right={<>
          <button onClick={() => setShowGroupModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              height: 38, padding: "0 12px", fontFamily: FONT,
              fontSize: 13, fontWeight: 600,
              border: "1px solid #e5e7eb", borderRadius: 8,
              background: "#fff", color: "#374151", cursor: "pointer", touchAction: "manipulation",
            }}>
            <Plus size={14} />
            <span>Group</span>
          </button>
          <button onClick={() => router.push(`/admin/courses/${courseId}/assignments/new`)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              height: 38, padding: "0 14px", fontFamily: FONT,
              fontSize: 13, fontWeight: 700,
              border: "none", borderRadius: 8,
              background: MAROON, color: "#fff", cursor: "pointer", touchAction: "manipulation",
            }}>
            <Plus size={14} />
            <span>New</span>
          </button>
        </>}
      />

      <div style={{ padding: "12px 12px 4px" }}>
        {myFiltered.length === 0 && mySearch ? (
          <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
            No results for &ldquo;{mySearch}&rdquo;
          </div>
        ) : (
          Object.entries(myGrouped).map(([grp, items]) => (
            <AssignmentGroupSection
              key={grp} title={grp} items={items} courseId={courseId} router={router}
              rowVariant="mine" currentUserName={resolvedUserName} currentUserRole={currentUserRole}
              seenIds={seenIds} onView={handleView}
              onAddAssignment={g => router.push(`/admin/courses/${courseId}/assignments/new?group=${encodeURIComponent(g)}`)}
              onEditGroup={g => setEditGroupTarget(g)}
              onDeleteGroup={g => {
                const count = assignments.filter(a => (a.assignmentGroup || "Assignments") === g).length;
                if (count === 0) {
                  setLocalGroups(prev => { const next = prev.filter(x => x !== g); persistGroups(courseId, next); return next; });
                } else {
                  setDeleteGroupTarget(g);
                }
              }}
              isLastGroup={localGroups.length <= 1}
              {...rowHandlers}
            />
          ))
        )}
      </div>

      {/* ── Section 2: Published by Others ── */}
      <SectionLabel color="#1d6fa4" bg="#eff6ff" border="#bfdbfe">
        Published by Others
        {otherAssignments.length > 0 && (
          <span style={{ marginLeft: 6, fontWeight: 500, color: "#93c5fd", fontSize: 11 }}>
            ({otherAssignments.length})
          </span>
        )}
      </SectionLabel>

      <Toolbar search={othersSearch} onSearch={setOthersSearch}
        right={
          <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            {(["author", "group"] as const).map(mode => (
              <button key={mode} onClick={() => setOthersViewMode(mode)}
                style={{
                  padding: "0 12px", height: 38, fontFamily: FONT,
                  fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
                  whiteSpace: "nowrap",
                  background: othersViewMode === mode ? MAROON : "transparent",
                  color: othersViewMode === mode ? "#fff" : "#6b7280",
                  transition: "all 0.15s", touchAction: "manipulation",
                }}>
                {mode === "author" ? "By Author" : "By Group"}
              </button>
            ))}
          </div>
        }
      />

      <div style={{ padding: "12px 12px 24px" }}>
        {otherAssignments.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: 10 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>No assignments published by others yet.</p>
          </div>
        ) : othersFiltered.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
            No results for &ldquo;{othersSearch}&rdquo;
          </div>
        ) : othersViewMode === "author" ? (
          Object.entries(othersByAuthor).map(([author, { role, image, items }]) => (
            <OthersAuthorSection key={author} authorName={author} authorRole={role} authorImage={image}
              items={items} courseId={courseId} router={router}
              seenIds={seenIds} onView={handleView} {...rowHandlers} />
          ))
        ) : (
          Object.entries(othersByGroup).map(([grp, items]) => (
            <OthersGroupSection key={grp} title={grp} items={items} courseId={courseId} router={router}
              seenIds={seenIds} onView={handleView} {...rowHandlers} />
          ))
        )}
      </div>

      {/* ── Modals ── */}
      {showGroupModal && (
        <GroupNameModal title="Add Assignment Group" onClose={() => setShowGroupModal(false)}
          onSave={handleSaveGroup} saving={false} saveLabel="Save" />
      )}
      {quickEditTarget && (
        <QuickEditModal assignment={quickEditTarget} courseId={courseId}
          onClose={() => setQuickEditTarget(null)}
          onSave={handleQuickEditSave}
          onMoreOptions={() => { router.push(`/admin/courses/${courseId}/assignments/${quickEditTarget.id}/edit`); setQuickEditTarget(null); }} />
      )}
      {assignToTarget && (
        <AssignToPanel assignment={assignToTarget} courseId={courseId}
          onClose={() => setAssignToTarget(null)} onSave={loadAssignments} />
      )}
      {editGroupTarget && (
        <GroupNameModal title="Edit Assignment Group" initialValue={editGroupTarget}
          onClose={() => setEditGroupTarget(null)} onSave={handleEditGroupSave}
          saving={savingEditGroup} saveLabel="Save" />
      )}
      {deleteGroupTarget && (
        <DeleteGroupModal
          groupName={deleteGroupTarget}
          assignmentCount={assignments.filter(a => (a.assignmentGroup || "Assignments") === deleteGroupTarget).length}
          otherGroups={localGroups.filter(g => g !== deleteGroupTarget)}
          onClose={() => setDeleteGroupTarget(null)}
          onDelete={handleDeleteGroup} />
      )}
      {deleteAssignmentTarget && (
        <DeleteAssignmentModal
          assignment={deleteAssignmentTarget}
          onClose={() => setDeleteAssignmentTarget(null)}
          onConfirm={handleDeleteAssignment}
          deleting={deletingAssignment} />
      )}
    </div>
  );
}