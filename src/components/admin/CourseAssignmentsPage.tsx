"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Search, Plus, MoreVertical, X, ChevronDown } from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

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
  // removed currentUserImage — was unused
}

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

function groupsStorageKey(courseId: string) { return `assignment_groups_${courseId}`; }
function loadPersistedGroups(courseId: string): string[] {
  try {
    const raw = localStorage.getItem(groupsStorageKey(courseId));
    if (!raw) return [];
    const p = JSON.parse(raw);
    const arr = Array.isArray(p) ? p : [];
    return arr.includes("Assignments") ? arr : ["Assignments", ...arr];
  } catch { return []; }
}
function persistGroups(courseId: string, groups: string[]) {
  try { localStorage.setItem(groupsStorageKey(courseId), JSON.stringify(groups)); } catch { }
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function PublisherAvatar({ name, image, size = 20 }: { name?: string | null; image?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  if (image && !imgError) {
    return (
      <Image
        src={image}
        alt={name ?? "Publisher"}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid #bfdbfe" }}
      />
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
    <span className="flex items-center gap-1 text-[11px] text-gray-500">
      <PublisherAvatar name={name} image={image} size={18} />
      <span className="truncate max-w-25">{name}</span>
      {role && (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: "#eff6ff", color: "#1d6fa4", border: "1px solid #bfdbfe" }}>
          {role}
        </span>
      )}
    </span>
  );
}

// ── AuthorBadge — shown on your own assignments ────────────────────────────────
function AuthorBadge({ name, role }: { name: string; role: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ background: "#fdf8f8", color: MAROON, borderColor: "#f0c0c0" }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: MAROON }} />
      {name} · {role}
    </span>
  );
}

// ── Publish toggle ─────────────────────────────────────────────────────────────
function PublishToggle({ published, onToggle }: { published: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={published ? "Published — click to unpublish" : "Unpublished — click to publish"}
      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 }}
    >
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

// ── Assignment icon ────────────────────────────────────────────────────────────
function AssignmentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" style={{ flexShrink: 0 }}>
      <rect x="4" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

// ── Row 3-dot menu (portal) ────────────────────────────────────────────────────
type DropdownAction = "edit" | "speedgrader" | "duplicate" | "assignTo" | "delete";

function AssignmentRowMenu({
  assignment,
  onAction,
}: {
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
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const w = 180, h = 165;
    const top = window.innerHeight - rect.bottom >= h ? rect.bottom + 4 : rect.top - h - 4;
    const left = Math.min(rect.right - w, window.innerWidth - w - 8);
    setMenuStyle({
      position: "fixed", top, left, zIndex: 9999, background: "#fff",
      border: "1px solid #e5e7eb", borderRadius: 8,
      boxShadow: "0 4px 16px rgba(0,0,0,.12)", minWidth: w, overflow: "hidden",
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
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); handleOpen(); }}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
      >
        <MoreVertical size={16} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={menuStyle} onClick={(e) => e.stopPropagation()}>
          {items.map((item, i) => (
            <button
              key={item.action}
              type="button"
              onClick={() => { setOpen(false); onAction(item.action, assignment); }}
              className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 ${item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}`}
              style={i > 0 ? { borderTop: "1px solid #f3f4f6" } : {}}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ── Group 3-dot menu (portal) ──────────────────────────────────────────────────
function GroupMenu({
  onEdit,
  onDelete,
  isLastGroup,
}: {
  onEdit: () => void;
  onDelete: () => void;
  isLastGroup?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
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
    setMenuStyle({
      position: "fixed", top, left, zIndex: 9999, background: "#fff",
      border: "1px solid #e5e7eb", borderRadius: 8,
      boxShadow: "0 4px 16px rgba(0,0,0,.12)", minWidth: w, overflow: "hidden",
    });
    setOpen(v => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); handleOpen(); }}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400"
      >
        <MoreVertical size={15} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={menuStyle}>
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(); }}
            className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-gray-700 hover:bg-gray-50"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" />
            </svg>
            Edit
          </button>
          {!isLastGroup && (
            <button
              type="button"
              onClick={() => { setOpen(false); onDelete(); }}
              className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-red-600 hover:bg-red-50"
              style={{ borderTop: "1px solid #f3f4f6" }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" />
                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" />
              </svg>
              Delete
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

// ── Delete Assignment Modal ────────────────────────────────────────────────────
function DeleteAssignmentModal({ assignment, onClose, onConfirm, deleting }: {
  assignment: Assignment; onClose: () => void; onConfirm: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full sm:max-w-105 border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()} style={{ fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-800">Delete Assignment</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100"><X size={14} /></button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete <strong>&ldquo;{assignment.title}&rdquo;</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} disabled={deleting} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="h-9 px-4 text-sm text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: "#dc2626" }}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
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
    } catch {
      setError("Failed to save. Please try again.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 px-4 sm:px-0" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full sm:max-w-120 border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()} style={{ fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-800">Edit Assignment</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100"><X size={14} /></button>
        </div>
        <div className="px-5 sm:px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Name <span className="text-red-500">*</span></label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              className="w-full h-9 border border-gray-300 rounded px-3 text-sm outline-none transition-all"
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">Due at</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 block mb-0.5">Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-9 border border-gray-300 rounded px-3 text-xs outline-none transition-all"
                  onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">Time</label>
                <div className="relative">
                  <select value={dueTime} onChange={(e) => setDueTime(e.target.value)}
                    className="h-9 border border-gray-300 rounded px-3 text-xs bg-white outline-none appearance-none pr-7 transition-all w-full sm:w-auto"
                    style={{ minWidth: 120 }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}>
                    {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            {dateLabel && <p className="text-xs mt-1.5 font-medium" style={{ color: MAROON }}>{dateLabel}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Points</label>
            <input type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)}
              className="w-32 h-9 border border-gray-300 rounded px-3 text-sm outline-none transition-all"
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
          </div>
          {error && <p className="text-xs text-red-600">⚠ {error}</p>}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onMoreOptions} className="h-8 px-4 border border-gray-300 text-xs text-gray-600 rounded hover:bg-white transition-all">More Options</button>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={onClose} disabled={saving} className="h-8 px-4 border border-gray-300 text-xs text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving || !name.trim()} className="h-8 px-5 text-xs text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
      <style>{`input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.6;}input[type="date"]::-webkit-calendar-picker-indicator:hover{opacity:1;}`}</style>
    </div>
  );
}

// ── Assign To Right Panel ──────────────────────────────────────────────────────
interface AssignRow {
  id: number;
  assignees: string[];
  dueDate: string;
  dueTime: string;
  availableFrom: string;
  availableFromTime: string;
  until: string;
  untilTime: string;
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
      const withoutEveryone = r.assignees.filter(a => a !== "Everyone");
      const has = withoutEveryone.includes(name);
      const next = has ? withoutEveryone.filter(a => a !== name) : [...withoutEveryone, name];
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
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Date</p>
            <div className="relative flex items-center border border-gray-300 rounded h-8 px-2 bg-white">
              <input type="date" value={dateVal} onChange={(e) => onDateChange(e.target.value)} className="flex-1 text-xs outline-none bg-transparent" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Time</p>
            <div className="relative">
              <select value={timeVal} onChange={(e) => onTimeChange(e.target.value)} className="w-full h-8 border border-gray-300 rounded px-2 text-xs bg-white outline-none appearance-none pr-6">
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
      <div className="fixed top-0 right-0 h-full z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col w-full sm:w-95" style={{ fontFamily: FONT }}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <AssignmentIcon />
              <span className="text-sm font-bold text-gray-800">{assignment.title}</span>
            </div>
            <p className="text-xs text-gray-500 ml-6">Assignment | {assignment.points} pts</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-400 hover:bg-gray-100 shrink-0 mt-0.5"><X size={14} /></button>
        </div>
        <div className="mx-4 mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded p-3 shrink-0">
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#1d6fa4" }}>
            <span className="text-white text-[10px] font-bold">i</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">Select who should be assigned and use the drop-down menus or manually enter your date and time.</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {rows.map((row, idx) => (
            <div key={row.id} className="border border-gray-200 rounded-md p-3 space-y-4 relative">
              {idx > 0 && (
                <button onClick={() => removeRow(row.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><X size={13} /></button>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Assign To</p>
                <div className="relative" data-assigndrop>
                  <div onMouseDown={(e) => { e.stopPropagation(); setOpenDropId(openDropId === row.id ? null : row.id); setDropSearch(""); }}
                    className="w-full min-h-8.5 border border-gray-300 rounded px-2 py-1 flex flex-wrap gap-1 items-center cursor-pointer bg-white">
                    {row.assignees.map(a => (
                      <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white font-medium" style={{ background: MAROON }}>
                        {a}
                        <button onMouseDown={(e) => { e.stopPropagation(); toggleAssignee(row.id, a); }} className="hover:opacity-70 font-bold text-sm leading-none">×</button>
                      </span>
                    ))}
                    <input readOnly placeholder={row.assignees.length ? "" : "Start typing to search..."}
                      className="flex-1 min-w-15 text-xs outline-none bg-transparent text-gray-400 cursor-pointer" />
                    <ChevronDown size={12} className="text-gray-400 shrink-0" style={{ transform: openDropId === row.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                  </div>
                  {openDropId === row.id && (
                    <div data-assigndrop className="absolute z-50 w-full bg-white border border-gray-200 shadow-xl rounded mt-0.5 max-h-60 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
                      <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white">
                        <input autoFocus value={dropSearch} onChange={(e) => setDropSearch(e.target.value)} placeholder="Start typing to search..."
                          className="w-full h-7 px-2 text-xs border border-gray-200 rounded outline-none focus:border-[#7b1113]" />
                      </div>
                      {["Everyone"].filter(o => o.toLowerCase().includes(dropSearch.toLowerCase())).map(opt => (
                        <button key={opt} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, opt); }}
                          className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                          style={{ color: row.assignees.includes(opt) ? MAROON : "#374151", fontWeight: row.assignees.includes(opt) ? 600 : 400 }}>
                          {opt}{row.assignees.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DateRow label="Due Date" dateVal={row.dueDate} timeVal={row.dueTime}
                onDateChange={(v) => updateRow(row.id, "dueDate", v)} onTimeChange={(v) => updateRow(row.id, "dueTime", v)}
                onClear={() => { updateRow(row.id, "dueDate", ""); updateRow(row.id, "dueTime", "11:59 PM"); }} />
              <DateRow label="Available from" dateVal={row.availableFrom} timeVal={row.availableFromTime}
                onDateChange={(v) => updateRow(row.id, "availableFrom", v)} onTimeChange={(v) => updateRow(row.id, "availableFromTime", v)}
                onClear={() => { updateRow(row.id, "availableFrom", ""); updateRow(row.id, "availableFromTime", "12:00 AM"); }} />
              <DateRow label="Until" dateVal={row.until} timeVal={row.untilTime}
                onDateChange={(v) => updateRow(row.id, "until", v)} onTimeChange={(v) => updateRow(row.id, "untilTime", v)}
                onClear={() => { updateRow(row.id, "until", ""); updateRow(row.id, "untilTime", "11:59 PM"); }} />
            </div>
          ))}
          <button onClick={addRow} className="flex items-center gap-1.5 text-xs font-medium hover:underline" style={{ color: MAROON }}>
            <Plus size={13} /> Add
          </button>
        </div>
        <div className="shrink-0 border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-2 bg-gray-50">
          <button onClick={onClose} className="h-8 px-4 border border-gray-300 text-xs text-gray-600 rounded hover:bg-white transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="h-8 px-5 text-xs text-white rounded hover:opacity-90 disabled:opacity-50 font-medium" style={{ background: MAROON }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Add Group Modal ────────────────────────────────────────────────────────────
function AddGroupModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (name: string) => void; saving: boolean }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full sm:max-w-105 border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-800">Add Assignment Group</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100" style={{ borderColor: MAROON, color: MAROON }}><X size={14} /></button>
        </div>
        <div className="px-6 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-sm text-gray-700 shrink-0">Group Name:</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())}
              placeholder="e.g., Essay Group 1"
              className="flex-1 w-full h-9 border border-gray-300 rounded px-3 text-sm outline-none transition-all"
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} disabled={saving} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={() => name.trim() && onSave(name.trim())} disabled={saving || !name.trim()} className="h-9 px-4 text-sm text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Group Modal ───────────────────────────────────────────────────────────
function EditGroupModal({ groupName, onClose, onSave, saving }: {
  groupName: string; onClose: () => void; onSave: (newName: string) => void; saving: boolean;
}) {
  const [name, setName] = useState(groupName);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full sm:max-w-105 border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-800">Edit Assignment Group</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100" style={{ borderColor: MAROON, color: MAROON }}><X size={14} /></button>
        </div>
        <div className="px-6 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-sm text-gray-700 shrink-0">Group Name:</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())}
              className="flex-1 w-full h-9 border border-gray-300 rounded px-3 text-sm outline-none transition-all"
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} disabled={saving} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={() => name.trim() && onSave(name.trim())} disabled={saving || !name.trim() || name.trim() === groupName}
            className="h-9 px-4 text-sm text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Group Modal ─────────────────────────────────────────────────────────
function DeleteGroupModal({ groupName, assignmentCount, otherGroups, onClose, onDelete }: {
  groupName: string; assignmentCount: number; otherGroups: string[];
  onClose: () => void; onDelete: (action: "delete" | "move", targetGroup?: string) => void;
}) {
  const [choice, setChoice] = useState<"delete" | "move">("delete");
  const [targetGroup, setTargetGroup] = useState(otherGroups[0] ?? "");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full sm:max-w-115 border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-800">Delete Assignment Group</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100"><X size={14} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-700">You are about to delete <strong>{groupName}</strong>, which has <strong>{assignmentCount}</strong> assignment{assignmentCount !== 1 ? "s" : ""} in it.</p>
          <p className="text-sm text-gray-700">Would you like to:</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={choice === "delete"} onChange={() => setChoice("delete")} className="accent-[#7b1113]" />
            <span className="text-sm text-gray-700">Delete its assignments</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={choice === "move"} onChange={() => setChoice("move")} disabled={otherGroups.length === 0} className="accent-[#7b1113]" />
              <span className={`text-sm ${otherGroups.length === 0 ? "text-gray-400" : "text-gray-700"}`}>Move its assignments to</span>
            </label>
            {choice === "move" && otherGroups.length > 0 && (
              <div className="ml-6 relative">
                <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-52 h-9 border border-gray-300 rounded px-3 text-sm bg-white outline-none appearance-none pr-8 focus:border-[#7b1113]">
                  <option value="">[ Select a Group ]</option>
                  {otherGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-100">Cancel</button>
          <button onClick={() => onDelete(choice, choice === "move" ? targetGroup : undefined)}
            disabled={choice === "move" && !targetGroup}
            className="h-9 px-4 text-sm text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
            Delete Group
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assignment Row ─────────────────────────────────────────────────────────────
function AssignmentRow({
  a,
  courseId,
  router,
  variant,
  currentUserName,
  currentUserRole,
  onEdit,
  onDuplicate,
  onAssignTo,
  onSpeedGrader,
  onDelete,
  onTogglePublish,
}: {
  a: Assignment;
  courseId: string;
  router: ReturnType<typeof useRouter>;
  variant: "mine" | "others";
  currentUserName?: string | null;
  currentUserRole?: string | null;
  onEdit: (a: Assignment) => void;
  onDuplicate: (a: Assignment) => void;
  onAssignTo: (a: Assignment) => void;
  onSpeedGrader: (a: Assignment) => void;
  onDelete: (a: Assignment) => void;
  onTogglePublish: (a: Assignment) => void;
}) {
  const accentColor = variant === "mine" ? MAROON : "#60a5fa";
  const now = new Date();
  const isClosed = a.availableUntil && now > new Date(a.availableUntil);
  const due = fmtDue(a.dueDate);

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

  return (
    <div
      className="flex items-start sm:items-center gap-3 px-3 sm:px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 relative cursor-pointer"
      style={{ background: variant === "mine" ? "#fff" : "#fafcff" }}
      onClick={() => router.push(`/admin/courses/${courseId}/assignments/${a.id}`)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ background: accentColor }} />
      <div className="shrink-0 mt-0.5 sm:mt-0 pl-2" onClick={(e) => e.stopPropagation()}>
        <PublishToggle published={a.status === "PUBLISHED"} onToggle={() => onTogglePublish(a)} />
      </div>
      <div className="shrink-0">
        <AssignmentIcon />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold truncate max-w-full hover:underline" style={{ color: MAROON }}>
            {a.title}
          </h3>
          {a.status === "UNPUBLISHED" && (
            <span className="text-[10px] text-amber-600 font-medium">Not Published</span>
          )}
          {isClosed && (
            <span className="text-[10px] text-gray-500 font-medium">Closed</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {variant === "mine" && authorDisplayName && (
            <AuthorBadge name={authorDisplayName} role={authorRole ?? "Admin"} />
          )}
          {variant === "others" && (
            <PublisherChip name={authorDisplayName} image={a.publisherImage} role={authorRole} />
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            <span>{a.points} pts</span>
            {due && (<><span>•</span><span>Due: {due}</span></>)}
          </div>
        </div>
      </div>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <AssignmentRowMenu assignment={a} onAction={handleAction} />
      </div>
    </div>
  );
}

// ── Assignment Group Section ───────────────────────────────────────────────────
function AssignmentGroupSection({
  title, items, courseId, router, currentUserName, currentUserRole,
  onAddAssignment, onEdit, onDuplicate, onAssignTo, onSpeedGrader, onDelete, onTogglePublish,
  onEditGroup, onDeleteGroup, isLastGroup, rowVariant = "mine",
}: {
  title: string; items: Assignment[]; courseId: string; router: ReturnType<typeof useRouter>;
  currentUserName?: string | null; currentUserRole?: string | null;
  onAddAssignment: (group: string) => void;
  onEdit: (a: Assignment) => void; onDuplicate: (a: Assignment) => void;
  onAssignTo: (a: Assignment) => void; onSpeedGrader: (a: Assignment) => void;
  onDelete: (a: Assignment) => void; onTogglePublish: (a: Assignment) => void;
  onEditGroup: (group: string) => void; onDeleteGroup: (group: string) => void;
  isLastGroup?: boolean; rowVariant?: "mine" | "others";
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t select-none">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCollapsed(c => !c)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          <span className="text-xs text-gray-400 ml-1">({items.length})</span>
        </div>
        <div className="flex items-center gap-1">
          {rowVariant === "mine" && (
            <button onClick={() => onAddAssignment(title)} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded transition-colors" title="Add assignment">
              <Plus size={15} />
            </button>
          )}
          <GroupMenu onEdit={() => onEditGroup(title)} onDelete={() => onDeleteGroup(title)} isLastGroup={isLastGroup} />
        </div>
      </div>
      {!collapsed && (
        <div className="border border-t-0 border-gray-200 rounded-b overflow-hidden">
          {items.length === 0 ? (
            <div className="px-6 py-4 text-sm text-gray-400 text-center">No assignments in this group.</div>
          ) : (
            items.map(a => (
              <AssignmentRow
                key={a.id} a={a} courseId={courseId} router={router}
                variant={rowVariant}
                currentUserName={currentUserName}
                currentUserRole={currentUserRole}
                onEdit={onEdit} onDuplicate={onDuplicate} onAssignTo={onAssignTo}
                onSpeedGrader={onSpeedGrader} onDelete={onDelete} onTogglePublish={onTogglePublish}
              />
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
  onEdit, onDuplicate, onAssignTo, onSpeedGrader, onDelete, onTogglePublish,
}: {
  authorName: string; authorRole?: string | null; authorImage?: string | null;
  items: Assignment[]; courseId: string; router: ReturnType<typeof useRouter>;
  onEdit: (a: Assignment) => void; onDuplicate: (a: Assignment) => void;
  onAssignTo: (a: Assignment) => void; onSpeedGrader: (a: Assignment) => void;
  onDelete: (a: Assignment) => void; onTogglePublish: (a: Assignment) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-4 py-2.5 border select-none cursor-pointer rounded-t"
        style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
        onClick={() => setCollapsed(c => !c)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d6fa4" strokeWidth="2.5"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .15s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        <PublisherAvatar name={authorName} image={authorImage} size={22} />
        <span className="text-sm font-semibold" style={{ color: "#1d4ed8" }}>{authorName}</span>
        {authorRole && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: "#eff6ff", color: "#1d6fa4", border: "1px solid #bfdbfe" }}>
            {authorRole}
          </span>
        )}
        <span className="text-xs text-blue-400 ml-1">({items.length})</span>
      </div>
      {!collapsed && (
        <div className="border border-t-0 rounded-b overflow-hidden" style={{ borderColor: "#bfdbfe" }}>
          {items.map(a => (
            <AssignmentRow key={a.id} a={a} courseId={courseId} router={router} variant="others"
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
  onEdit, onDuplicate, onAssignTo, onSpeedGrader, onDelete, onTogglePublish,
}: {
  title: string; items: Assignment[]; courseId: string; router: ReturnType<typeof useRouter>;
  onEdit: (a: Assignment) => void; onDuplicate: (a: Assignment) => void;
  onAssignTo: (a: Assignment) => void; onSpeedGrader: (a: Assignment) => void;
  onDelete: (a: Assignment) => void; onTogglePublish: (a: Assignment) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-4 py-2.5 border select-none cursor-pointer rounded-t"
        style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}
        onClick={() => setCollapsed(c => !c)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2.5"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .15s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span className="text-sm font-semibold" style={{ color: "#0369a1" }}>{title}</span>
        <span className="text-xs text-blue-400 ml-1">({items.length})</span>
      </div>
      {!collapsed && (
        <div className="border border-t-0 rounded-b overflow-hidden" style={{ borderColor: "#bae6fd" }}>
          {items.map(a => (
            <AssignmentRow key={a.id} a={a} courseId={courseId} router={router} variant="others"
              onEdit={onEdit} onDuplicate={onDuplicate} onAssignTo={onAssignTo}
              onSpeedGrader={onSpeedGrader} onDelete={onDelete} onTogglePublish={onTogglePublish} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function CourseAssignmentsPage({
  courseId,
  currentUserId,
  currentUserName,
  currentUserRole,
  // fix: removed currentUserImage — was defined but never used
}: Props) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [mySearch, setMySearch] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  // fix: removed setSavingGroup — was assigned but never used; hardcode false instead
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

  useEffect(() => {
    if (!currentUserId) {
      fetch("/api/auth/session").then(r => r.json()).then(s => {
        if (s?.user?.id) setResolvedUserId(s.user.id);
        if (s?.user?.name) setResolvedUserName(s.user.name);
      }).catch(() => {});
    }
  }, [currentUserId]);

  const loadAssignments = useCallback(() => {
    if (!courseId) return;
    fetch(`/api/admin/courses/${courseId}/assignments`)
      .then(r => r.json())
      .then(d => {
        const list: Assignment[] = d.assignments ?? [];
        setAssignments(list);
        const apiGroups = [...new Set(
          list
            .filter(a => isMyAssignment(a, resolvedUserId, resolvedUserName))
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
  }, [courseId, resolvedUserId, resolvedUserName]);

  useEffect(() => {
    if (!courseId) return;
    const persisted = loadPersistedGroups(courseId);
    if (persisted.length > 0) setLocalGroups(prev => [...new Set(["Assignments", ...persisted, ...prev])]);
    loadAssignments();
  }, [courseId, loadAssignments]);

  function isMyAssignment(a: Assignment, userId?: string | null, userName?: string | null): boolean {
    if (a._isMine || a.isCreator) return true;
    if (userId && a.createdById && a.createdById === userId) return true;
    if (userName && a.createdBy && a.createdBy === userName) return true;
    if (userName && a.publisherName && a.publisherName === userName) return true;
    return false;
  }

  const handleTogglePublish = async (a: Assignment) => {
    const newStatus = a.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, status: newStatus } : x));
    await fetch(`/api/admin/courses/${courseId}/assignments/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => {});
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
      setLocalGroups(prev => {
        const next = prev.map(g => g === oldName ? newName : g);
        persistGroups(courseId, next);
        return next;
      });
      setAssignments(prev => prev.map(a => a.assignmentGroup === oldName ? { ...a, assignmentGroup: newName } : a));
      assignments.filter(a => a.assignmentGroup === oldName).forEach(a => {
        fetch(`/api/admin/courses/${courseId}/assignments/${a.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentGroup: newName }),
        }).catch(() => { });
      });
      setEditGroupTarget(null);
    } finally { setSavingEditGroup(false); }
  };

  const handleDeleteGroup = (action: "delete" | "move", targetGroup?: string) => {
    if (!deleteGroupTarget) return;
    const groupName = deleteGroupTarget;
    if (action === "delete") {
      const toDelete = assignments.filter(a => (a.assignmentGroup || "Assignments") === groupName);
      toDelete.forEach(a => {
        fetch(`/api/admin/courses/${courseId}/assignments/${a.id}`, { method: "DELETE" }).catch(() => { });
      });
      setAssignments(prev => prev.filter(a => (a.assignmentGroup || "Assignments") !== groupName));
    } else if (action === "move" && targetGroup) {
      setAssignments(prev => prev.map(a => (a.assignmentGroup || "Assignments") === groupName ? { ...a, assignmentGroup: targetGroup } : a));
      assignments.filter(a => (a.assignmentGroup || "Assignments") === groupName).forEach(a => {
        fetch(`/api/admin/courses/${courseId}/assignments/${a.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentGroup: targetGroup }),
        }).catch(() => { });
      });
    }
    setLocalGroups(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(g => g !== groupName);
      persistGroups(courseId, next);
      return next;
    });
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
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/assignments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `${a.title} Copy`, points: a.points, status: "UNPUBLISHED", assignmentGroup: a.assignmentGroup, dueDate: a.dueDate, availableFrom: a.availableFrom, availableUntil: a.availableUntil }),
      });
      if (res.ok) loadAssignments();
    } catch { /* ignore */ }
  };

  const handleSpeedGrader = (a: Assignment) => {
    window.open(`/admin/courses/${courseId}/assignments/${a.id}/speedgrader`, "_blank");
  };

  const handleDeleteAssignment = async () => {
    if (!deleteAssignmentTarget) return;
    setDeletingAssignment(true);
    try {
      await fetch(`/api/admin/courses/${courseId}/assignments/${deleteAssignmentTarget.id}`, { method: "DELETE" });
      setAssignments(prev => prev.filter(a => a.id !== deleteAssignmentTarget.id));
      setDeleteAssignmentTarget(null);
    } finally { setDeletingAssignment(false); }
  };

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
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-2" style={{ fontFamily: FONT }}>
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading assignments...
      </div>
    );
  }

  return (
    <div className="bg-white" style={{ fontFamily: FONT }}>

      {/* ── SECTION 1: Published by You ── */}
      <div className="flex items-center gap-2 px-4 sm:px-8 py-2.5 border-b"
        style={{ color: MAROON, background: "#fef2f2", borderColor: "#f0c0c0" }}>
        <span className="text-xs font-extrabold tracking-widest uppercase">Published by You</span>
      </div>

      <div className="flex items-center justify-between px-3 sm:px-8 py-3 border-b border-gray-100 gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={mySearch} onChange={e => setMySearch(e.target.value)}
            placeholder="Search your assignments..."
            className="pl-9 pr-4 py-1.5 border rounded text-sm w-44 sm:w-56 focus:outline-none"
            style={{ borderColor: "#d1d5db" }} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGroupModal(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
            style={{ borderColor: "#d1d5db", color: "#374151" }}>
            <Plus size={14} /><span className="hidden sm:inline">Group</span>
          </button>
          <button onClick={() => router.push(`/admin/courses/${courseId}/assignments/new`)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white rounded-lg hover:opacity-90 transition-colors"
            style={{ background: MAROON }}>
            <Plus size={14} /><span className="hidden sm:inline">Assignment</span><span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-5 py-4 border-b-2 border-gray-200 space-y-3">
        {myFiltered.length === 0 && mySearch ? (
          <p className="text-sm text-gray-400 text-center py-6">No results for &ldquo;{mySearch}&rdquo;</p>
        ) : (
          Object.entries(myGrouped).map(([grp, items]) => (
            <AssignmentGroupSection
              key={grp} title={grp} items={items} courseId={courseId} router={router}
              rowVariant="mine"
              currentUserName={resolvedUserName}
              currentUserRole={currentUserRole}
              onAddAssignment={(g) => router.push(`/admin/courses/${courseId}/assignments/new?group=${encodeURIComponent(g)}`)}
              onEditGroup={(g) => setEditGroupTarget(g)}
              onDeleteGroup={(g) => {
                const count = assignments.filter(a => (a.assignmentGroup || "Assignments") === g).length;
                if (count === 0) {
                  setLocalGroups(prev => {
                    const next = prev.filter(grp => grp !== g);
                    persistGroups(courseId, next);
                    return next;
                  });
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

      {/* ── SECTION 2: Published by Others ── */}
      <div className="flex items-center gap-2 px-4 sm:px-8 py-2.5 border-b border-t"
        style={{ color: "#1d6fa4", background: "#eff6ff", borderColor: "#bfdbfe" }}>
        <span className="text-xs font-extrabold tracking-widest uppercase" style={{ color: "#1d6fa4" }}>
          Published by Others
        </span>
        {otherAssignments.length > 0 && (
          <span className="ml-1 font-normal normal-case text-blue-400 text-xs">({otherAssignments.length})</span>
        )}
      </div>

      <div className="flex items-center justify-between px-3 sm:px-8 py-3 border-b border-gray-100 gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={othersSearch} onChange={e => setOthersSearch(e.target.value)}
            placeholder="Search others' assignments..."
            className="pl-9 pr-4 py-1.5 border rounded text-sm w-44 sm:w-56 focus:outline-none"
            style={{ borderColor: "#d1d5db" }} />
        </div>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          {(["author", "group"] as const).map(mode => (
            <button key={mode} onClick={() => setOthersViewMode(mode)}
              className="px-3 py-1.5 text-xs font-bold border-none transition-colors whitespace-nowrap"
              style={othersViewMode === mode ? { background: MAROON, color: "#fff" } : { background: "transparent", color: "#6b7280" }}>
              By {mode === "author" ? "Author" : "Group"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 sm:px-5 py-4">
        {otherAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <p className="text-sm text-gray-400">No assignments published by others yet.</p>
          </div>
        ) : othersFiltered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No results for &ldquo;{othersSearch}&rdquo;</p>
        ) : othersViewMode === "author" ? (
          Object.entries(othersByAuthor).map(([author, { role, image, items }]) => (
            <OthersAuthorSection key={author} authorName={author} authorRole={role} authorImage={image}
              items={items} courseId={courseId} router={router} {...rowHandlers} />
          ))
        ) : (
          Object.entries(othersByGroup).map(([grp, items]) => (
            <OthersGroupSection key={grp} title={grp} items={items} courseId={courseId} router={router} {...rowHandlers} />
          ))
        )}
      </div>

      {/* ── Modals ── */}
      {showGroupModal && (
        <AddGroupModal onClose={() => setShowGroupModal(false)} onSave={handleSaveGroup} saving={false} />
      )}
      {quickEditTarget && (
        <QuickEditModal assignment={quickEditTarget} courseId={courseId}
          onClose={() => setQuickEditTarget(null)}
          onSave={handleQuickEditSave}
          onMoreOptions={() => {
            router.push(`/admin/courses/${courseId}/assignments/${quickEditTarget.id}/edit`);
            setQuickEditTarget(null);
          }} />
      )}
      {assignToTarget && (
        <AssignToPanel assignment={assignToTarget} courseId={courseId} onClose={() => setAssignToTarget(null)} onSave={loadAssignments} />
      )}
      {editGroupTarget && (
        <EditGroupModal groupName={editGroupTarget} onClose={() => setEditGroupTarget(null)} onSave={handleEditGroupSave} saving={savingEditGroup} />
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