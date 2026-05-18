"use client";

import CourseFormAnswer from "@/components/layout/CourseFormAnswer";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  Plus, MoreVertical,
  CheckCircle, Circle, FileText,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Form {
  id: string | number;
  title: string;
  description: string;
  formType: "Survey / Feedback" | "Evaluation" | "Registration Form" | "Graded Assessment";
  assignmentGroup: string;
  shuffleAnswers: boolean;
  allowMultipleResponses: boolean;
  responseLimit: number | null;
  anonymousResponses: boolean;
  showResultsToRespondents: boolean;
  showOneAtATime: boolean;
  lockQuestionsAfterAnswering: boolean;
  accessCode: string;
  confirmationMessage: string;
  assignTo: string[];
  dueDate: string;
  dueTime: string;
  availableFrom: string;
  availableFromTime: string;
  availableUntil: string;
  availableUntilTime: string;
  points: number;
  published: boolean;
  questions: FormQuestion[];
  createdAt: string;
  createdAtLabel: string;
  authorId?: string | null;
  authorName?: string;
  authorRole?: string;
  authorImage?: string | null;
  _formRole?: "manager" | "submitter";
  _publisherName?: string | null;
  _publisherImage?: string | null;
  _publisherId?: string | null;
  isCreator?: boolean;
  _isAssignedToYou?: boolean;
}

type QuestionType =
  | "multiple_choice" | "checkboxes" | "dropdown"
  | "short_answer" | "paragraph" | "linear_scale"
  | "mc_grid" | "checkbox_grid" | "date" | "time"
  | "file_upload" | "section";

interface FormQuestion {
  id: string;
  type: QuestionType;
  question: string;
  description?: string;
  points: number;
  required: boolean;
  image?: string;
  options?: string[];
  correctAnswer?: string | string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  rows?: string[];
  columns?: string[];
  sectionTitle?: string;
  sectionDescription?: string;
}

interface Section { id: string; name: string; }
interface Staff { id: string; name: string; }
interface AssignmentGroup { id: number; name: string; }

const QUESTION_CATEGORIES = [
  { label: "Choice", types: [
    { value: "multiple_choice" as QuestionType, label: "Multiple Choice", icon: "◉" },
    { value: "checkboxes" as QuestionType, label: "Checkboxes", icon: "☑" },
    { value: "dropdown" as QuestionType, label: "Dropdown", icon: "⌄" },
  ]},
  { label: "Text", types: [
    { value: "short_answer" as QuestionType, label: "Short Answer", icon: "─" },
    { value: "paragraph" as QuestionType, label: "Paragraph", icon: "≡" },
  ]},
  { label: "Scale & Grid", types: [
    { value: "linear_scale" as QuestionType, label: "Linear Scale", icon: "◁▷" },
    { value: "mc_grid" as QuestionType, label: "Multiple Choice Grid", icon: "⊞" },
    { value: "checkbox_grid" as QuestionType, label: "Checkbox Grid", icon: "⊟" },
  ]},
  { label: "Date & Time", types: [
    { value: "date" as QuestionType, label: "Date", icon: "📅" },
    { value: "time" as QuestionType, label: "Time", icon: "🕐" },
  ]},
  { label: "Upload", types: [
    { value: "file_upload" as QuestionType, label: "File Upload", icon: "⬆" },
  ]},
];
const ALL_QUESTION_TYPES = QUESTION_CATEGORIES.flatMap(c => c.types);
function getTypeLabel(type: QuestionType) {
  return ALL_QUESTION_TYPES.find(t => t.value === type)?.label ?? type;
}

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

function buildLocalDate(
  date: string | null | undefined,
  time: string | null | undefined
): Date | null {
  if (!date) return null;
  const timeStr = time || "12:00 AM";
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let hours = 0, minutes = 0;
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours !== 12) hours += 12;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date(`${date}T${pad(hours)}:${pad(minutes)}`);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(date: string | null | undefined, time?: string | null): string {
  if (!date) return "";
  const d = buildLocalDate(date, time ?? "12:00 AM");
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDue(date: string | null | undefined, time?: string | null): string {
  if (!date) return "";
  const d = buildLocalDate(date, time ?? "12:00 AM");
  if (!d) return "";
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  );
}

function useOnClickOutside<T extends HTMLElement>(ref: React.RefObject<T | null>, handler: () => void) {
  useEffect(() => {
    function listener(e: MouseEvent) {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      handler();
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

// ── Responsive CSS ─────────────────────────────────────────────────────────────
const RESPONSIVE_CSS = `
  * { box-sizing: border-box; }
  .cft-toolbar { display:flex; align-items:center; justify-content:space-between; padding:10px 20px; border-bottom:1px solid #e5e7eb; gap:8px; flex-wrap:wrap; }
  .cft-toolbar-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .cft-row { display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid #e5e7eb; background:#fff; cursor:pointer; transition:background .1s; -webkit-tap-highlight-color:transparent; }
  .cft-row:hover { background:#fdf8f8; }
  .cft-row:active { background:#fef2f2; }
  .cft-row-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .cft-section-label { display:flex; align-items:center; gap:8px; padding:10px 20px 8px; font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
  .cft-view-toggle { display:flex; align-items:center; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
  .cft-view-toggle button { padding:6px 12px; font-size:12px; font-weight:700; border:none; background:transparent; cursor:pointer; transition:background .15s,color .15s; white-space:nowrap; min-height:36px; -webkit-tap-highlight-color:transparent; }
  .cft-view-toggle button.active { background:${MAROON}; color:#fff; }
  .cft-view-toggle button:not(.active) { color:#6b7280; }
  .cft-detail-header { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #e5e7eb; background:#fff; flex-wrap:wrap; gap:8px; flex-shrink:0; }
  .cft-detail-actions { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .cft-submitter-page { display:flex; flex-direction:column; height:100%; background:#fff; }
  .cft-submitter-topbar { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #e5e7eb; flex-shrink:0; flex-wrap:wrap; gap:8px; }
  .cft-publisher-bar { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid #e5e7eb; background:#fafafa; flex-shrink:0; flex-wrap:wrap; }
  .cft-row-menu-portal {
    position: fixed;
    z-index: 9999;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,.14);
    min-width: 160px;
    overflow: hidden;
  }
  .cft-form-grid { display:grid; grid-template-columns:160px 1fr; align-items:start; gap:14px 12px; }
  .cft-form-label { text-align:right; padding-top:8px; font-size:12px; color:#374151; }
  .cft-tab-bar { display:flex; align-items:flex-end; border-bottom:1px solid #e2e8f0; padding:0 16px; background:#fff; flex-shrink:0; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .cft-tab-bar::-webkit-scrollbar { display:none; }
  .cft-tab-btn { padding:10px 12px; font-size:12px; border:1px solid transparent; border-bottom:none; margin-bottom:-1px; border-radius:4px 4px 0 0; white-space:nowrap; flex-shrink:0; cursor:pointer; transition:all .15s; background:transparent; -webkit-tap-highlight-color:transparent; }
  .cft-tab-btn.active { background:#fff; border-color:#e2e8f0; color:#111827; font-weight:600; }
  .cft-tab-btn:not(.active) { color:#6b7280; }
  .cft-tab-btn:not(.active):hover { color:#374151; }
  .cft-floating-add {
    position: fixed;
    right: 16px;
    bottom: 72px;
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  .cft-add-btn {
    display:flex; align-items:center; gap:8px;
    padding:0 18px; height:46px; border-radius:99px;
    color:#fff; font-size:13px; font-weight:700;
    border:none; cursor:pointer;
    box-shadow:0 4px 16px rgba(123,17,19,.3);
    transition:opacity .15s;
    -webkit-tap-highlight-color:transparent;
    touch-action: manipulation;
  }
  .cft-add-menu {
    background:#fff; border:1px solid #e5e7eb;
    border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,.15);
    width:210px; overflow:hidden; max-height:65vh; overflow-y:auto;
  }
  @media (max-width: 640px) {
    .cft-toolbar { padding:10px 12px; }
    .cft-row { padding:10px 12px; gap:8px; }
    .cft-detail-header { padding:10px 12px; }
    .cft-submitter-topbar { padding:10px 12px; }
    .cft-section-label { padding:10px 12px 8px; }
    .cft-publisher-bar { padding:10px 12px; }
    .cft-form-grid { grid-template-columns:1fr; gap:10px 0; }
    .cft-form-label { text-align:left; padding-top:0; font-weight:600; }
    .cft-tab-bar { padding:0 10px; }
    .cft-tab-btn { padding:10px 10px; font-size:11px; }
    .cft-floating-add { right:12px; bottom:16px; }
  }
  @media (max-width: 400px) {
    .cft-detail-actions { gap:4px; }
    .cft-view-toggle button { padding:6px 8px; font-size:11px; }
  }
`;

// ── Type colors ────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  "Survey / Feedback": "#3b82f6",
  "Evaluation": "#8b5cf6",
  "Registration Form": "#16a34a",
  "Graded Assessment": MAROON,
};

// ── Author Badge ───────────────────────────────────────────────────────────────
function AuthorBadge({ name, role }: { name: string; role: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    Admin: { bg: "#fdf8f8", text: MAROON, border: "#f0c0c0" },
    Head: { bg: "#fdf8f8", text: MAROON, border: "#f0c0c0" },
    Staff: { bg: "#f0f9ff", text: "#0369a1", border: "#bae6fd" },
  };
  const c = colors[role] ?? colors.Admin;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.text }} />
      {name} · {role}
    </span>
  );
}

// ── Publisher Bar ──────────────────────────────────────────────────────────────
function PublisherBar({ name, image, role, publisherId, currentUserId }: {
  name?: string | null; image?: string | null; role?: string | null;
  publisherId?: string | null; currentUserId?: string | null;
}) {
  if (!name) return null;
  if (publisherId && currentUserId && publisherId === currentUserId) return null;
  return (
    <div className="cft-publisher-bar">
      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-gray-100 flex items-center justify-center">
        {image
          ? <Image src={image} alt={name} width={28} height={28} className="w-full h-full object-cover" />
          : <span className="text-xs font-bold text-gray-500">{name.charAt(0).toUpperCase()}</span>}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0 flex-wrap">
        <span className="font-semibold text-gray-800 truncate">{name}</span>
        {role && (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
            style={{ background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" }}
          >
            {role}
          </span>
        )}
        <span className="text-gray-400 shrink-0">· Published this form</span>
      </div>
    </div>
  );
}

// ── Publisher Chip ─────────────────────────────────────────────────────────────
function PublisherChip({ name, image }: { name?: string | null; image?: string | null }) {
  if (!name) return null;
  return (
    <span className="flex items-center gap-1 text-[11px] text-gray-500">
      <span className="w-4 h-4 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0">
        {image
          ? <Image src={image} alt={name} width={16} height={16} className="w-full h-full object-cover" />
          : <span className="text-[8px] font-bold text-gray-500">{name.charAt(0).toUpperCase()}</span>}
      </span>
      <span className="truncate max-w-20">{name}</span>
    </span>
  );
}

// ── Publish Toggle ─────────────────────────────────────────────────────────────
function PublishToggle({ published, onToggle }: { published: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={published ? "Published" : "Unpublished"}
      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 4, borderRadius: "50%", minWidth: 28, minHeight: 44 }}
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

// ── Form Row Menu ──────────────────────────────────────────────────────────────
function FormRowMenu({ formId, onEdit, onDelete }: {
  formId: string | number; onEdit: (id: string | number) => void; onDelete: (id: string | number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler() { setOpen(false); }
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [open]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const right = window.innerWidth - rect.right;
      const top = rect.bottom + 4;
      setMenuPos({ top, right: Math.max(8, right) });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="w-9 h-9 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 shrink-0"
        style={{ fontSize: 18, minWidth: 36 }}
      >
        ⋮
      </button>
      {open && menuPos && (
        <div
          ref={menuRef}
          className="cft-row-menu-portal"
          style={{ top: menuPos.top, right: menuPos.right }}
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(formId); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            style={{ minHeight: 40 }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit
          </button>
          <div style={{ borderTop: "1px solid #f3f4f6", margin: "2px 0" }} />
          <button
            type="button"
            onClick={() => { setOpen(false); onDelete(formId); }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            style={{ minHeight: 40 }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function DeleteConfirmModal({ title, onConfirm, onCancel, deleting }: {
  title: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b" style={{ background: "#fef2f2" }}>
          <span className="text-sm font-black" style={{ color: MAROON }}>Delete Form</span>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete <strong>&ldquo;{title}&rdquo;</strong>? This cannot be undone.
          </p>
        </div>
        <div className="px-5 py-4 border-t bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="h-11 sm:h-10 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 min-w-20 touch-manipulation"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-11 sm:h-10 px-4 rounded-xl text-sm font-black text-white disabled:opacity-60 min-w-20 touch-manipulation"
            style={{ background: MAROON }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Question Type Menu ─────────────────────────────────────────────────────────
function QuestionTypeMenu({ current, onChange }: { current: QuestionType; onChange: (t: QuestionType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));
  const currentDef = ALL_QUESTION_TYPES.find(t => t.value === current);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="h-9 px-3 border border-gray-300 rounded text-xs bg-white flex items-center gap-2 hover:border-gray-400 min-w-40 max-w-xs"
        style={{ minHeight: 36 }}
      >
        <span className="text-gray-500 shrink-0">{currentDef?.icon}</span>
        <span className="flex-1 text-left truncate">{currentDef?.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="shrink-0">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded z-50 w-56 py-1 max-h-72 overflow-y-auto">
          {QUESTION_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cat.label}</div>
              {cat.types.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { onChange(t.value); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50"
                  style={{
                    color: current === t.value ? MAROON : "#374151",
                    fontWeight: current === t.value ? 600 : 400,
                    minHeight: 36,
                  }}
                >
                  <span className="w-5 text-center text-sm shrink-0">{t.icon}</span>
                  {t.label}
                  {current === t.value && <span className="ml-auto" style={{ color: MAROON }}>✓</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Action Bar ────────────────────────────────────────────────────────────────
function QuestionActionBar({
  question, isGraded, isSection, onChange, onMoveUp, onMoveDown, onDuplicate, onDelete,
}: {
  question: FormQuestion; isGraded: boolean; isSection: boolean;
  onChange: (q: FormQuestion) => void;
  onMoveUp: () => void; onMoveDown: () => void;
  onDuplicate: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1 px-4 py-3 border-t border-gray-100 flex-wrap">
      {isGraded && !isSection && (
        <div className="flex items-center gap-1.5 mr-auto">
          <input
            type="number"
            min={0}
            value={question.points}
            onChange={e => onChange({ ...question, points: parseFloat(e.target.value) || 0 })}
            className="w-14 h-8 border border-gray-300 rounded px-2 text-xs text-center outline-none focus:border-[#7b1113]"
          />
          <span className="text-xs text-gray-500">pts</span>
        </div>
      )}
      <button type="button" onClick={onMoveUp} title="Move up"
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 text-xs touch-manipulation"
        style={{ minWidth: 32, minHeight: 32 }}>↑</button>
      <button type="button" onClick={onMoveDown} title="Move down"
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 text-xs touch-manipulation"
        style={{ minWidth: 32, minHeight: 32 }}>↓</button>
      <div className="w-px h-5 bg-gray-200 mx-0.5" />
      <button type="button" onClick={onDuplicate} title="Duplicate"
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 touch-manipulation"
        style={{ minWidth: 32, minHeight: 32 }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" />
        </svg>
      </button>
      {!isSection && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-0.5" />
          <span className="text-xs text-gray-500 mr-1 hidden sm:inline">Required</span>
          <button
            type="button"
            onClick={() => onChange({ ...question, required: !question.required })}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors touch-manipulation"
            style={{ background: question.required ? MAROON : "#d1d5db", minWidth: 36 }}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${question.required ? "translate-x-4" : "translate-x-1"}`} />
          </button>
        </>
      )}
      <div className="w-px h-5 bg-gray-200 mx-0.5" />
      <button type="button" onClick={onDelete} title="Delete"
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 touch-manipulation"
        style={{ minWidth: 32, minHeight: 32 }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" />
          <path d="M10 11v6M14 11v6" strokeLinecap="round" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ── Question Card ──────────────────────────────────────────────────────────────
function QuestionCard({ question, isActive, isGraded, onActivate, onChange, onDuplicate, onDelete, onMoveUp, onMoveDown }: {
  question: FormQuestion; isActive: boolean; isGraded: boolean;
  onActivate: () => void; onChange: (q: FormQuestion) => void;
  onDuplicate: () => void; onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const isSection = question.type === "section";
  const updateOptions = (idx: number, val: string) => { const opts = [...(question.options ?? [])]; opts[idx] = val; onChange({ ...question, options: opts }); };
  const addOption = () => onChange({ ...question, options: [...(question.options ?? []), `Option ${(question.options?.length ?? 0) + 1}`] });
  const removeOption = (idx: number) => onChange({ ...question, options: (question.options ?? []).filter((_, i) => i !== idx) });
  const addRow = () => onChange({ ...question, rows: [...(question.rows ?? []), `Row ${(question.rows?.length ?? 0) + 1}`] });
  const addCol = () => onChange({ ...question, columns: [...(question.columns ?? []), `Column ${(question.columns?.length ?? 0) + 1}`] });
  const updateRow = (idx: number, val: string) => { const rows = [...(question.rows ?? [])]; rows[idx] = val; onChange({ ...question, rows }); };
  const updateCol = (idx: number, val: string) => { const cols = [...(question.columns ?? [])]; cols[idx] = val; onChange({ ...question, columns: cols }); };

  if (isSection) {
    return (
      <div
        onClick={!isActive ? onActivate : undefined}
        className={`relative bg-white rounded-lg border-t-4 shadow-sm transition-all ${isActive ? "shadow-md" : "cursor-pointer hover:shadow-md"}`}
        style={{ borderTopColor: MAROON, borderLeft: isActive ? `3px solid ${MAROON}` : "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}
      >
        <div className="px-4 sm:px-5 py-5">
          {isActive ? (
            <div className="space-y-3">
              <input
                value={question.sectionTitle ?? ""}
                onChange={e => onChange({ ...question, sectionTitle: e.target.value })}
                placeholder="Section title"
                className="w-full text-lg sm:text-xl font-medium border-0 border-b-2 border-gray-300 focus:border-b-2 pb-1 outline-none bg-transparent"
                style={{ borderBottomColor: MAROON }}
              />
              <input
                value={question.sectionDescription ?? ""}
                onChange={e => onChange({ ...question, sectionDescription: e.target.value })}
                placeholder="Section description (optional)"
                className="w-full text-sm border-0 border-b border-gray-200 pb-1 outline-none bg-transparent text-gray-600"
              />
            </div>
          ) : (
            <div>
              <div className="text-base font-semibold text-gray-800 word-break">{question.sectionTitle || "Section"}</div>
              {question.sectionDescription && <div className="text-xs text-gray-500 mt-1">{question.sectionDescription}</div>}
              <div className="text-[10px] mt-1 font-medium uppercase tracking-widest" style={{ color: MAROON }}>Section divider</div>
            </div>
          )}
        </div>
        {isActive && (
          <QuestionActionBar
            question={question} isGraded={isGraded} isSection={isSection}
            onChange={onChange} onMoveUp={onMoveUp} onMoveDown={onMoveDown}
            onDuplicate={onDuplicate} onDelete={onDelete}
          />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={!isActive ? onActivate : undefined}
      className={`relative bg-white rounded-lg shadow-sm transition-all ${isActive ? "shadow-md" : "cursor-pointer hover:shadow-md"}`}
      style={{ border: "1px solid #e5e7eb", borderLeft: isActive ? `3px solid ${MAROON}` : "1px solid #e5e7eb" }}
    >
      <div className="px-4 sm:px-5 pt-5 pb-3">
        <div className="flex items-start gap-2 mb-3 flex-col sm:flex-row">
          <div className="flex-1 min-w-0 w-full">
            {isActive ? (
              <input
                value={question.question}
                onChange={e => onChange({ ...question, question: e.target.value })}
                placeholder="Question"
                className="w-full text-sm bg-gray-50 border-0 border-b-2 px-3 py-2 outline-none rounded-t"
                style={{ borderBottomColor: MAROON }}
              />
            ) : (
              <div className="text-sm font-medium text-gray-800 word-break">
                {question.question || <span className="text-gray-400 italic">Question</span>}
                {question.required && <span className="ml-1" style={{ color: MAROON }}>*</span>}
              </div>
            )}
          </div>
          {isActive ? (
            <div className="shrink-0 w-full sm:w-auto">
              <QuestionTypeMenu current={question.type} onChange={t => {
                const defaults: Partial<FormQuestion> = {};
                if (["multiple_choice","checkboxes","dropdown"].includes(t)) defaults.options = ["Option 1","Option 2","Option 3"];
                if (["mc_grid","checkbox_grid"].includes(t)) { defaults.rows = ["Row 1","Row 2"]; defaults.columns = ["Column 1","Column 2"]; }
                if (t === "linear_scale") { defaults.scaleMin = 1; defaults.scaleMax = 5; }
                onChange({ ...question, type: t, ...defaults });
              }} />
            </div>
          ) : (
            <div className="text-[10px] text-gray-400 shrink-0 mt-0.5 whitespace-nowrap">{getTypeLabel(question.type)}</div>
          )}
        </div>
        {isActive && (
          <input
            value={question.description ?? ""}
            onChange={e => onChange({ ...question, description: e.target.value })}
            placeholder="Description (optional)"
            className="w-full text-xs text-gray-500 border-0 border-b border-gray-200 pb-1 mb-4 outline-none bg-transparent"
          />
        )}
        {["multiple_choice","checkboxes","dropdown"].includes(question.type) && (
          <div className="space-y-2">
            {(question.options ?? []).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="shrink-0 text-gray-400">{question.type === "multiple_choice" ? "◉" : question.type === "checkboxes" ? "☑" : `${idx + 1}.`}</span>
                {isActive ? (
                  <>
                    <input
                      value={opt}
                      onChange={e => updateOptions(idx, e.target.value)}
                      className="flex-1 text-sm border-0 border-b border-gray-300 pb-0.5 outline-none bg-transparent min-w-0"
                    />
                    <button type="button" onClick={() => removeOption(idx)} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-500 text-sm shrink-0">×</button>
                  </>
                ) : (
                  <span className="text-sm text-gray-600 word-break">{opt}</span>
                )}
              </div>
            ))}
            {isActive && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-300 shrink-0">{question.type === "multiple_choice" ? "◉" : question.type === "checkboxes" ? "☑" : `${(question.options?.length ?? 0) + 1}.`}</span>
                <button type="button" onClick={addOption} className="text-sm text-gray-400 hover:text-gray-600">Add option</button>
              </div>
            )}
          </div>
        )}
        {question.type === "short_answer" && (
          <div className="border-b border-dashed border-gray-300 py-1">
            <span className="text-sm text-gray-300">Short answer text</span>
          </div>
        )}
        {question.type === "paragraph" && (
          <div className="border-b border-dashed border-gray-300 py-2">
            <span className="text-sm text-gray-300">Long answer text</span>
          </div>
        )}
        {question.type === "linear_scale" && (
          <div className="flex items-center gap-2 flex-wrap">
            {Array.from({ length: (question.scaleMax ?? 5) - (question.scaleMin ?? 1) + 1 }, (_, i) => i + (question.scaleMin ?? 1)).map(n => (
              <div key={n} className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{n}</span>
                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              </div>
            ))}
          </div>
        )}
        {["mc_grid","checkbox_grid"].includes(question.type) && (
          <div className="overflow-x-auto -mx-1">
            <table className="text-xs border-collapse min-w-60">
              <thead>
                <tr>
                  <th className="w-24 p-2" />
                  {(question.columns ?? []).map((col, ci) => (
                    <th key={ci} className="p-2 text-center min-w-14">
                      {isActive
                        ? <input value={col} onChange={e => updateCol(ci, e.target.value)} className="w-14 text-center border-0 border-b border-gray-300 outline-none bg-transparent text-xs" />
                        : col}
                    </th>
                  ))}
                  {isActive && (
                    <th className="p-2">
                      <button type="button" onClick={addCol} className="text-xs text-blue-500 hover:underline whitespace-nowrap">+ Col</button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(question.rows ?? []).map((row, ri) => (
                  <tr key={ri} className="border-t border-gray-100">
                    <td className="p-2">
                      {isActive
                        ? <input value={row} onChange={e => updateRow(ri, e.target.value)} className="w-20 border-0 border-b border-gray-300 outline-none bg-transparent text-xs" />
                        : row}
                    </td>
                    {(question.columns ?? []).map((_, ci) => (
                      <td key={ci} className="p-2 text-center">
                        <div className={`w-4 h-4 mx-auto border-2 border-gray-300 ${question.type === "mc_grid" ? "rounded-full" : "rounded-sm"}`} />
                      </td>
                    ))}
                  </tr>
                ))}
                {isActive && (
                  <tr>
                    <td className="p-2">
                      <button type="button" onClick={addRow} className="text-xs text-blue-500 hover:underline">+ Add row</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {question.type === "date" && (
          <div className="flex items-center gap-2 text-sm text-gray-400 border-b border-dashed border-gray-300 py-1 w-48">
            <span>📅</span> Month / Day / Year
          </div>
        )}
        {question.type === "time" && (
          <div className="flex items-center gap-2 text-sm text-gray-400 border-b border-dashed border-gray-300 py-1 w-36">
            <span>🕐</span> Time
          </div>
        )}
        {question.type === "file_upload" && (
          <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
            <span className="text-xs text-gray-400">Add File</span>
          </div>
        )}
      </div>
      {isActive && (
        <QuestionActionBar
          question={question} isGraded={isGraded} isSection={isSection}
          onChange={onChange} onMoveUp={onMoveUp} onMoveDown={onMoveDown}
          onDuplicate={onDuplicate} onDelete={onDelete}
        />
      )}
    </div>
  );
}

// ── Floating Toolbar ───────────────────────────────────────────────────────────
function FloatingToolbar({ onAdd }: { onAdd: (type: QuestionType | "section") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));
  const items = [
    { group: "Choice", options: [
      { label: "Multiple Choice", action: () => onAdd("multiple_choice") },
      { label: "Checkboxes", action: () => onAdd("checkboxes") },
      { label: "Dropdown", action: () => onAdd("dropdown") },
    ]},
    { group: "Text", options: [
      { label: "Short Answer", action: () => onAdd("short_answer") },
      { label: "Paragraph", action: () => onAdd("paragraph") },
    ]},
    { group: "Scale & Grid", options: [
      { label: "Linear Scale", action: () => onAdd("linear_scale") },
      { label: "Multiple Choice Grid", action: () => onAdd("mc_grid") },
      { label: "Checkbox Grid", action: () => onAdd("checkbox_grid") },
    ]},
    { group: "Date & Time", options: [
      { label: "Date", action: () => onAdd("date") },
      { label: "Time", action: () => onAdd("time") },
    ]},
    { group: "Other", options: [
      { label: "File Upload", action: () => onAdd("file_upload") },
      { label: "Section Divider", action: () => onAdd("section") },
    ]},
  ];
  return (
    <div ref={ref} className="cft-floating-add">
      {open && (
        <div className="cft-add-menu">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Add Question</span>
            <button type="button" onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-sm">×</button>
          </div>
          {items.map(group => (
            <div key={group.group}>
              <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{group.group}</div>
              {group.options.map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => { item.action(); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-xs text-gray-700 touch-manipulation"
                  style={{ minHeight: 40 }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
          <div className="h-2" />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="cft-add-btn"
        style={{ background: MAROON }}
      >
        {open ? "Close" : "+ Add Question"}
      </button>
    </div>
  );
}

// ── Questions Tab ──────────────────────────────────────────────────────────────
function QuestionsTab({ questions, isGraded, onChange }: { questions: FormQuestion[]; isGraded: boolean; onChange: (q: FormQuestion[]) => void }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const idCounter = useRef(1000);
  const newQ = (type: QuestionType | "section"): FormQuestion => {
    const id = String(idCounter.current++);
    if (type === "section") return { id, type: "section", question: "", points: 0, required: false, sectionTitle: "New Section", sectionDescription: "" };
    const defaults: Partial<FormQuestion> = {};
    if (["multiple_choice","checkboxes","dropdown"].includes(type)) defaults.options = ["Option 1","Option 2","Option 3"];
    if (["mc_grid","checkbox_grid"].includes(type)) { defaults.rows = ["Row 1","Row 2"]; defaults.columns = ["Column 1","Column 2"]; }
    if (type === "linear_scale") { defaults.scaleMin = 1; defaults.scaleMax = 5; }
    return { id, type: type as QuestionType, question: "", points: 1, required: false, ...defaults };
  };
  const addQ = (type: QuestionType | "section") => { const q = newQ(type); onChange([...questions, q]); setActiveId(q.id); };
  const dup = (idx: number) => { const q = { ...questions[idx], id: String(idCounter.current++) }; const u = [...questions]; u.splice(idx + 1, 0, q); onChange(u); setActiveId(q.id); };
  const delQ = (idx: number) => { onChange(questions.filter((_, i) => i !== idx)); setActiveId(null); };
  const upd = (idx: number, q: FormQuestion) => { const u = [...questions]; u[idx] = q; onChange(u); };
  const up = (idx: number) => { if (idx === 0) return; const u = [...questions]; [u[idx - 1], u[idx]] = [u[idx], u[idx - 1]]; onChange(u); };
  const dn = (idx: number) => { if (idx === questions.length - 1) return; const u = [...questions]; [u[idx], u[idx + 1]] = [u[idx + 1], u[idx]]; onChange(u); };
  const total = questions.reduce((s, q) => s + (q.points || 0), 0);
  return (
    <div className="relative">
      {questions.length > 0 && (
        <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
          <span>{questions.filter(q => q.type !== "section").length} question(s)</span>
          {isGraded && <span>{total} pt(s) total</span>}
        </div>
      )}
      <div className="space-y-3 pb-24">
        {questions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-sm text-gray-400 mb-1">No questions yet</p>
            <p className="text-xs text-gray-300">Tap the + button to add questions</p>
          </div>
        )}
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            isActive={activeId === q.id}
            isGraded={isGraded}
            onActivate={() => setActiveId(q.id)}
            onChange={updated => upd(idx, updated)}
            onDuplicate={() => dup(idx)}
            onDelete={() => delQ(idx)}
            onMoveUp={() => up(idx)}
            onMoveDown={() => dn(idx)}
          />
        ))}
      </div>
      <FloatingToolbar onAdd={addQ} />
    </div>
  );
}

// ── Assign To Dropdown ─────────────────────────────────────────────────────────
function AssignToDropdown({ selected, setSelected, sections, staff }: {
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  sections: Section[];
  staff: Staff[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));

  const toggle = (name: string) => {
    setSelected(prev => {
      if (name === "Everyone") return prev.includes("Everyone") ? [] : ["Everyone"];
      const without = prev.filter(x => x !== "Everyone");
      return prev.includes(name) ? without.filter(x => x !== name) : [...without, name];
    });
  };

  // Shared option button style builder — avoids duplicate style props
  const optionStyle = (isSelected: boolean): React.CSSProperties => ({
    color: isSelected ? MAROON : "#374151",
    fontWeight: isSelected ? 600 : 400,
  });

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onMouseDown={e => { e.stopPropagation(); setOpen(v => !v); setSearch(""); }}
        className="w-full min-h-9 border rounded-sm px-2 py-1 text-xs flex flex-wrap gap-1 items-center cursor-pointer bg-white"
        style={{ borderColor: open ? MAROON : "#d1d5db" }}
      >
        {selected.length > 0 ? selected.map(a => (
          <span key={a} className="px-2 py-0.5 rounded text-xs flex items-center gap-1 text-white" style={{ background: MAROON }}>
            {a}
            <button
              type="button"
              onMouseDown={e => { e.stopPropagation(); toggle(a); }}
              className="hover:opacity-70 ml-0.5"
            >
              ×
            </button>
          </span>
        )) : <span className="text-gray-400">Start typing to search...</span>}
        <span className="ml-auto text-gray-400 text-[10px] pl-2">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 shadow-lg rounded-sm mt-0.5 max-h-52 overflow-y-auto">
          <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-7 px-2 text-xs border border-gray-200 rounded outline-none"
            />
          </div>
          {["Everyone"].filter(o => o.toLowerCase().includes(search.toLowerCase())).map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggle(opt); }}
              className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
              style={{ ...optionStyle(selected.includes(opt)), minHeight: 36 }}
            >
              {opt}
              {selected.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
            </button>
          ))}
          {sections.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 bg-gray-50">Sections</div>
              {sections.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggle(s.name); }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                  style={{ ...optionStyle(selected.includes(s.name)), minHeight: 36 }}
                >
                  {s.name}
                  {selected.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                </button>
              ))}
            </>
          )}
          {staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 bg-gray-50">Staff</div>
              {staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggle(s.name); }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                  style={{ ...optionStyle(selected.includes(s.name)), minHeight: 36 }}
                >
                  {s.name}
                  {selected.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Submit Confirmation Preview ────────────────────────────────────────────────
function SubmitConfirmationPreview({ message, allowMultiple }: { message: string; allowMultiple: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sm:p-8 text-center max-w-md mx-auto mt-6">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f0fdf4" }}>
        <svg width="28" height="28" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-2">Your response has been recorded</h3>
      <p className="text-sm text-gray-500 mb-4">{message || "Thank you for completing this form."}</p>
      {allowMultiple && (
        <button type="button" className="text-sm hover:underline font-medium" style={{ color: MAROON }}>
          Submit another response
        </button>
      )}
    </div>
  );
}

// ── Form Create/Edit View ──────────────────────────────────────────────────────
function FormCreateEditView({ form, courseId, sections, staff, onCancel, onSave }: {
  form?: Form; courseId: string; sections: Section[]; staff: Staff[];
  onCancel: () => void;
  onSave: (data: Partial<Form>, publish: boolean) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"details" | "questions" | "responses">("details");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [published, setPublished] = useState(form?.published ?? false);
  const [title, setTitle] = useState(form?.title ?? "");
  const [description, setDescription] = useState(form?.description ?? "");
  const [formType, setFormType] = useState<Form["formType"]>(form?.formType ?? "Survey / Feedback");
  const [assignmentGroup, setAssignmentGroup] = useState(form?.assignmentGroup ?? "Assignments");
  const [groups, setGroups] = useState<AssignmentGroup[]>([{ id: 1, name: "Assignments" }]);
  const [points, setPoints] = useState(String(form?.points ?? 0));
  const [allowMultipleResponses, setAllowMultipleResponses] = useState(form?.allowMultipleResponses ?? false);
  const [confirmationMessage, setConfirmationMessage] = useState(form?.confirmationMessage ?? "");
  const [assignTo, setAssignTo] = useState<string[]>(form?.assignTo ?? ["Everyone"]);
  const [dueDate, setDueDate] = useState(form?.dueDate ?? "");
  const [dueTime, setDueTime] = useState(form?.dueTime ?? "");
  const [availableFrom, setAvailableFrom] = useState(form?.availableFrom ?? "");
  const [availableFromTime, setAvailableFromTime] = useState(form?.availableFromTime ?? "");
  const [availableUntil, setAvailableUntil] = useState(form?.availableUntil ?? "");
  const [availableUntilTime, setAvailableUntilTime] = useState(form?.availableUntilTime ?? "");
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [questions, setQuestions] = useState<FormQuestion[]>(form?.questions ?? []);

  const isGraded = formType === "Graded Assessment";
  const computedPoints = questions.filter(q => q.type !== "section").reduce((sum, q) => sum + (q.points || 0), 0);
  const displayPoints = isGraded ? (questions.length > 0 ? computedPoints : (parseFloat(points) || 0)) : 0;

  useEffect(() => {
    fetch(`/api/courses/${courseId}/assignments`).then(r => r.json()).then(d => {
      const list = d.assignments ?? [];
      const names: string[] = [...new Set<string>(list.map((a: { assignmentGroup: string }) => a.assignmentGroup || "Assignments"))];
      if (!names.includes("Assignments")) names.unshift("Assignments");
      setGroups(names.map((n, i) => ({ id: i + 1, name: n })));
    }).catch(() => {});
  }, [courseId]);

  const handleSave = async (publish: boolean) => {
    setSaveError(null);
    if (!title.trim()) { setSaveError("Form Title is required."); return; }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(), description, formType, assignmentGroup,
        points: isGraded ? (questions.length > 0 ? computedPoints : (parseFloat(points) || 0)) : 0,
        shuffleAnswers: false, allowMultipleResponses, responseLimit: null,
        anonymousResponses: false, showResultsToRespondents: false,
        showOneAtATime: false, lockQuestionsAfterAnswering: false,
        accessCode: "", confirmationMessage, assignTo,
        dueDate, dueTime, availableFrom, availableFromTime,
        availableUntil, availableUntilTime, published: publish, questions,
      }, publish);
      setPublished(publish);
    } catch { setSaveError("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  const saveGroup = () => {
    const n = newGroupName.trim(); if (!n) return;
    if (!groups.find(g => g.name === n)) setGroups(p => [...p, { id: Date.now(), name: n }]);
    setAssignmentGroup(n); setGroupModalOpen(false); setNewGroupName("");
  };

  const sel = "h-9 border border-gray-300 rounded-sm px-3 text-xs w-full bg-white outline-none focus:border-[#7b1113]";

  return (
    <div className="w-full h-full bg-white flex flex-col" style={{ fontFamily: FONT }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-gray-200 bg-white shrink-0 flex-wrap gap-2">
        <span className="text-sm font-bold text-gray-700">{form ? "Edit Form" : "New Form"}</span>
        <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
          {isGraded && <span>Points <strong className="text-gray-800">{displayPoints}</strong></span>}
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full border"
              style={published ? { background: "#22c55e", borderColor: "#22c55e" } : { borderColor: "#9ca3af" }}
            />
            <span>{published ? "Published" : "Not Published"}</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="cft-tab-bar">
        {(["details","questions","responses"] as const).map(key => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`cft-tab-btn${activeTab === key ? " active" : ""}`}
          >
            {key === "questions" ? (
              <span className="flex items-center gap-1">
                Questions
                {questions.length > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] text-white" style={{ background: MAROON }}>
                    {questions.filter(q => q.type !== "section").length}
                  </span>
                )}
              </span>
            ) : key === "responses" ? "After Submission" : "Details"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {activeTab === "details" && (
          <div className="max-w-2xl space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Form Title <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Untitled Form"
                className="w-full h-9 border rounded-sm px-3 text-sm outline-none"
                style={{ borderColor: MAROON }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Description / Instructions</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Form description..."
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#7b1113] resize-none"
              />
            </div>
            {/* Responsive form grid */}
            <div className="cft-form-grid">
              <label className="cft-form-label">Form Type</label>
              <select value={formType} onChange={e => setFormType(e.target.value as Form["formType"])} className={sel}>
                <option>Survey / Feedback</option>
                <option>Evaluation</option>
                <option>Registration Form</option>
                <option>Graded Assessment</option>
              </select>

              <label className="cft-form-label">Assignment Group</label>
              <select
                value={assignmentGroup}
                onChange={e => {
                  if (e.target.value === "__create__") { setNewGroupName(""); setGroupModalOpen(true); }
                  else setAssignmentGroup(e.target.value);
                }}
                className={sel}
              >
                {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                <option value="__create__">[ Create Group ]</option>
              </select>

              {isGraded && (
                <>
                  <label className="cft-form-label">Points</label>
                  <input
                    type="number"
                    min={0}
                    value={questions.length > 0 ? computedPoints : points}
                    onChange={e => setPoints(e.target.value)}
                    readOnly={questions.length > 0}
                    className="h-9 border border-gray-300 rounded-sm px-3 text-xs w-full outline-none focus:border-[#7b1113]"
                    style={questions.length > 0 ? { background: "#f9fafb", color: "#6b7280" } : {}}
                  />
                </>
              )}

              <label className="cft-form-label">Assign</label>
              <div className="border border-gray-200 rounded-sm p-3 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Assign To</p>
                  <AssignToDropdown selected={assignTo} setSelected={setAssignTo} sections={sections} staff={staff} />
                </div>
                {[
                  { label: "Due Date",       date: dueDate,        setDate: setDueDate,        time: dueTime,            setTime: setDueTime },
                  { label: "Available from", date: availableFrom,  setDate: setAvailableFrom,  time: availableFromTime,  setTime: setAvailableFromTime },
                  { label: "Until",          date: availableUntil, setDate: setAvailableUntil, time: availableUntilTime, setTime: setAvailableUntilTime },
                ].map(({ label, date, setDate, time, setTime }) => (
                  <div key={label}>
                    <p className="text-xs font-medium text-gray-700 mb-1">{label}</p>
                    <div className="flex border border-gray-300 rounded-sm overflow-hidden">
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="flex-1 h-8 border-0 px-2 text-xs outline-none bg-white min-w-0"
                        style={{ fontSize: "13px" }}
                      />
                      <div className="w-px bg-gray-200 self-stretch" />
                      <select
                        value={time}
                        onChange={e => setTime(e.target.value)}
                        className="h-8 border-0 px-2 text-xs bg-white outline-none w-28 shrink-0"
                      >
                        <option value="">Time</option>
                        {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setDate(""); setTime(""); }}
                      className="text-xs hover:underline mt-0.5"
                      style={{ color: MAROON }}
                    >
                      Clear
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeTab === "questions" && (
          <QuestionsTab questions={questions} isGraded={isGraded} onChange={setQuestions} />
        )}
        {activeTab === "responses" && (
          <div className="max-w-lg space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Confirmation Message</label>
              <textarea
                value={confirmationMessage}
                onChange={e => setConfirmationMessage(e.target.value)}
                placeholder="Thank you for completing this form."
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#7b1113] resize-none"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowMultipleResponses}
                onChange={e => setAllowMultipleResponses(e.target.checked)}
                style={{ accentColor: MAROON }}
              />
              Show &quot;Submit another response&quot; button
            </label>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-700 mb-3">Preview</p>
              <SubmitConfirmationPreview message={confirmationMessage} allowMultiple={allowMultipleResponses} />
            </div>
          </div>
        )}
      </div>

      {/* Group create modal */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm bg-white shadow-xl border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Add Assignment Group</span>
              <button
                onClick={() => setGroupModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center border rounded text-sm"
                style={{ borderColor: MAROON, color: MAROON }}
              >
                ×
              </button>
            </div>
            <div className="px-5 py-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-700">Group Name</label>
                <input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveGroup()}
                  placeholder="e.g., Evaluation Group 1"
                  className="h-9 border border-gray-300 px-2 text-xs outline-none focus:border-[#7b1113] rounded-sm w-full"
                />
              </div>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                onClick={() => setGroupModalOpen(false)}
                className="h-10 px-4 border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50 rounded touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={saveGroup}
                style={{ background: MAROON }}
                className="h-10 px-4 text-white text-xs rounded hover:opacity-90 touch-manipulation"
              >
                Add Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div>{saveError && <span className="text-xs text-red-600 font-medium">⚠ {saveError}</span>}</div>
        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
          <button
            onClick={onCancel}
            disabled={saving}
            className="h-9 px-4 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 touch-manipulation"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="h-9 px-4 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 touch-manipulation"
          >
            {saving ? "Saving..." : "Save & Publish"}
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{ background: MAROON }}
            className="h-9 px-4 text-white text-xs rounded hover:opacity-90 disabled:opacity-50 touch-manipulation"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Manager Detail View ────────────────────────────────────────────────────────
function ManagerFormDetail({ form, onBack, onEdit, onDelete, onTogglePublish, currentUserId }: {
  form: Form; onBack: () => void;
  onEdit: () => void; onDelete: () => void; onTogglePublish: () => void;
  currentUserId?: string | null;
}) {
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const dotBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDotMenu) return;
    function handler(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node) || dotBtnRef.current?.contains(e.target as Node)) return;
      setShowDotMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDotMenu]);

  const handleDotOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showDotMenu) { setShowDotMenu(false); return; }
    const rect = dotBtnRef.current?.getBoundingClientRect();
    if (rect) setMenuPos({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
    setShowDotMenu(true);
  };

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>
      <div className="cft-detail-header">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-bold hover:underline touch-manipulation"
          style={{ color: MAROON, minHeight: 36 }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Back to Forms</span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="cft-detail-actions">
          <button
            onClick={onTogglePublish}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all touch-manipulation"
            style={form.published
              ? { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", minHeight: 36 }
              : { background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb", minHeight: 36 }}
          >
            {form.published ? <CheckCircle size={13} style={{ color: "#15803d" }} /> : <Circle size={13} />}
            <span className="hidden sm:inline">{form.published ? "Published" : "Unpublished"}</span>
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 transition-all touch-manipulation"
            style={{ minHeight: 36 }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          <button
            ref={dotBtnRef}
            onClick={handleDotOpen}
            className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 touch-manipulation"
          >
            <MoreVertical size={15} />
          </button>
          {showDotMenu && menuPos && (
            <div ref={menuRef} className="cft-row-menu-portal" style={{ top: menuPos.top, right: menuPos.right }}>
              <button
                onClick={() => { setShowDotMenu(false); onDelete(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 text-left"
                style={{ minHeight: 40 }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
                Delete Form
              </button>
            </div>
          )}
        </div>
      </div>
      <PublisherBar
        name={form._publisherName}
        image={form._publisherImage}
        role="Head"
        publisherId={form._publisherId}
        currentUserId={currentUserId}
      />
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 mb-5 word-break">{form.title}</h1>
        {form.description && (
          <div className="text-sm text-gray-700 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: form.description }} />
        )}
        <div className="bg-white border rounded-lg mb-5 overflow-hidden">
          <div className="px-4 py-2 border-b" style={{ background: "#fdf2f2" }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Details</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Type</p>
              <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: TYPE_COLORS[form.formType] ?? MAROON }}>
                {form.formType}
              </span>
            </div>
            {form.formType === "Graded Assessment" && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Points</p>
                <p className="text-sm font-bold text-gray-800">{form.points}</p>
              </div>
            )}
            {form.questions?.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Questions</p>
                <p className="text-sm font-bold text-gray-800">{form.questions.filter(q => q.type !== "section").length}</p>
              </div>
            )}
            {form.dueDate && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Due Date</p>
                <p className="text-sm font-bold text-gray-800">{fmtDue(form.dueDate, form.dueTime)}</p>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b" style={{ background: "#fdf2f2" }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Schedule</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 320 }}>
              <thead>
                <tr className="border-b border-gray-100">
                  {["Due", "Available From", "Until"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">{fmtDue(form.dueDate, form.dueTime) || "No due date"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{form.availableFrom ? fmtDue(form.availableFrom, form.availableFromTime) : "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{form.availableUntil ? fmtDue(form.availableUntil, form.availableUntilTime) : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {!form.published && (
          <div
            className="mt-5 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold"
            style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            This form is not published yet. Staff cannot see it.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Manager Section ────────────────────────────────────────────────────────────
function ManagerSection({ forms, onCreate, onEdit, onDelete, onTogglePublish, onView }: {
  forms: Form[];
  onCreate: () => void; onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void; onTogglePublish: (id: string | number) => void;
  onView: (f: Form) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div />
        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded font-medium hover:opacity-90 touch-manipulation"
          style={{ minHeight: 40, background: MAROON }}
        >
          <Plus size={14} /> Form
        </button>
      </div>
      <div className="border border-gray-200 rounded">
        <div
          className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-100"
          onClick={() => setExpanded(v => !v)}
        >
          <span className="text-xs text-gray-500">{expanded ? "▾" : "▸"}</span>
          <span className="text-sm font-medium text-gray-700">Forms</span>
          {forms.length > 0 && <span className="text-xs text-gray-400 ml-1">({forms.length})</span>}
        </div>
        {expanded && (
          <div>
            {forms.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="text-2xl mb-3">📋</div>
                <p className="text-sm text-gray-400">No forms yet</p>
                <button onClick={onCreate} className="mt-3 text-xs font-bold hover:underline" style={{ color: MAROON }}>
                  + Create your first form
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {forms.map(form => (
                  <div key={form.id} className="cft-row">
                    <PublishToggle published={form.published} onToggle={() => onTogglePublish(form.id)} />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(form)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold hover:underline word-break" style={{ color: MAROON }}>{form.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium shrink-0" style={{ background: TYPE_COLORS[form.formType] ?? MAROON }}>
                          {form.formType}
                        </span>
                        {!form.published && <span className="text-[10px] text-amber-600 font-medium shrink-0">Not Published</span>}
                      </div>
                      <div className="cft-row-meta mt-1 text-xs text-gray-500">
                        {form.formType === "Graded Assessment" && <span>{form.points} pts</span>}
                        {form.questions?.length > 0 && <><span>•</span><span>{form.questions.filter(q => q.type !== "section").length} Q</span></>}
                        {form.dueDate && <><span>•</span><span>Due: {fmtDate(form.dueDate, form.dueTime)}</span></>}
                      </div>
                    </div>
                    <FormRowMenu formId={form.id} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Submitter Section ──────────────────────────────────────────────────────────
function SubmitterSection({ forms, onView }: { forms: Form[]; onView: (f: Form) => void }) {
  const [expanded, setExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<"date" | "type">("date");
  const now = new Date();

  const upcoming: Form[] = [], undated: Form[] = [], past: Form[] = [];
  forms.forEach(f => {
    if (!f.dueDate) {
      undated.push(f);
    } else {
      const d = buildLocalDate(f.dueDate, f.dueTime);
      if (d && d >= now) upcoming.push(f);
      else past.push(f);
    }
  });

  const typeGroups: Record<string, Form[]> = {};
  forms.forEach(f => {
    const g = f.assignmentGroup || "Assignments";
    if (!typeGroups[g]) typeGroups[g] = [];
    typeGroups[g].push(f);
  });

  const FormRow = ({ form }: { form: Form }) => {
    const untilDate = buildLocalDate(form.availableUntil, form.availableUntilTime);
    const isClosed = !!untilDate && now > untilDate;
    return (
      <div className="cft-row" onClick={() => onView(form)}>
        <div className="w-1 h-8 rounded-full shrink-0" style={{ background: "#60a5fa" }} />
        <FileText size={16} className="shrink-0 text-gray-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold hover:underline word-break" style={{ color: "#0369a1" }}>{form.title}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium shrink-0" style={{ background: TYPE_COLORS[form.formType] ?? MAROON }}>
              {form.formType}
            </span>
            {isClosed && <span className="text-[10px] text-gray-500 font-medium shrink-0">Closed</span>}
          </div>
          <div className="cft-row-meta mt-0.5 text-xs text-gray-500">
            {form.formType === "Graded Assessment" && <span>{form.points} pts</span>}
            {form.questions?.length > 0 && <><span>•</span><span>{form.questions.filter(q => q.type !== "section").length} Q</span></>}
            {form.dueDate && <><span>•</span><span><span className="font-medium text-gray-700">Due</span> {fmtDue(form.dueDate, form.dueTime)}</span></>}
            {form._publisherName && <><span>•</span><PublisherChip name={form._publisherName} image={form._publisherImage} /></>}
          </div>
        </div>
        <span
          className="text-[11px] px-2 sm:px-3 py-1 rounded-full font-bold shrink-0"
          style={{ background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" }}
        >
          Fill out
        </span>
      </div>
    );
  };

  const GroupSection = ({ title, items }: { title: string; items: Form[] }) => {
    const [col, setCol] = useState(false);
    return (
      <div className="mb-3">
        <div
          className="flex items-center gap-2 px-4 py-2.5 border select-none cursor-pointer"
          style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}
          onClick={() => setCol(c => !c)}
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2.5"
            style={{ transform: col ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: "#0369a1" }}>{title}</span>
          <span className="text-xs text-blue-400 ml-1">({items.length})</span>
        </div>
        {!col && (
          <div className="border border-t-0" style={{ borderColor: "#bae6fd" }}>
            {items.map(f => <FormRow key={f.id} form={f} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4">
      <div className="border border-gray-200 rounded">
        <div
          className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100 cursor-pointer select-none"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-400">{expanded ? "▾" : "▸"}</span>
            <span className="text-sm font-medium" style={{ color: "#0369a1" }}>Forms</span>
            {forms.length > 0 && <span className="text-xs text-blue-400 ml-1">({forms.length})</span>}
          </div>
          {expanded && (
            <div className="cft-view-toggle" onClick={e => e.stopPropagation()}>
              <button className={viewMode === "date" ? "active" : ""} onClick={() => setViewMode("date")}>By Date</button>
              <button className={viewMode === "type" ? "active" : ""} onClick={() => setViewMode("type")}>By Type</button>
            </div>
          )}
        </div>
        {expanded && (
          <div>
            {forms.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-400">No forms assigned to you.</p>
              </div>
            ) : viewMode === "date" ? (
              <>
                {upcoming.length > 0 && <GroupSection title="Upcoming" items={upcoming} />}
                {undated.length > 0 && <GroupSection title="Undated" items={undated} />}
                {past.length > 0 && <GroupSection title="Past" items={past} />}
              </>
            ) : (
              Object.entries(typeGroups).map(([grp, items]) => (
                <GroupSection key={grp} title={grp} items={items} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Staff Read-Only List ───────────────────────────────────────────────────────
function StaffFormsList({ forms, onView }: { forms: Form[]; onView: (f: Form) => void }) {
  const [expanded, setExpanded] = useState(true);
  const now = new Date();

  return (
    <div className="px-3 sm:px-6 py-5" style={{ fontFamily: FONT }}>
      <div className="border border-gray-200 rounded overflow-hidden">
        <div
          className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-100"
          onClick={() => setExpanded(v => !v)}
        >
          <span className="text-xs text-gray-500">{expanded ? "▾" : "▸"}</span>
          <span className="text-sm font-medium text-gray-700">Forms &amp; Quizzes</span>
          {forms.length > 0 && <span className="text-xs text-gray-400 ml-1">({forms.length})</span>}
        </div>
        {expanded && (
          <div>
            {forms.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="text-2xl mb-3">📋</div>
                <p className="text-sm text-gray-400">No forms available</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {forms.map(form => {
                  const untilDate = buildLocalDate(form.availableUntil, form.availableUntilTime);
                  const isClosed = !!untilDate && now > untilDate;
                  return (
                    <div key={form.id} className="cft-row" onClick={() => onView(form)}>
                      <FileText size={16} className="shrink-0 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold hover:underline word-break" style={{ color: MAROON }}>{form.title}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium shrink-0" style={{ background: TYPE_COLORS[form.formType] ?? MAROON }}>
                            {form.formType}
                          </span>
                          {isClosed && <span className="text-[10px] text-gray-500 font-medium shrink-0">Closed</span>}
                        </div>
                        <div className="cft-row-meta mt-1 text-xs text-gray-500">
                          {form.formType === "Graded Assessment" && <span>{form.points} pts</span>}
                          {form.questions?.length > 0 && <><span>•</span><span>{form.questions.filter(q => q.type !== "section").length} Q</span></>}
                          {form.dueDate && <><span>•</span><span>Due: {fmtDate(form.dueDate, form.dueTime)}</span></>}
                          {form._publisherName && <><span>•</span><AuthorBadge name={form._publisherName} role="Head" /></>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── resolveFormRole ────────────────────────────────────────────────────────────
function resolveFormRole(form: Form, currentUserId?: string | null): "manager" | "submitter" {
  if (form._formRole === "submitter") return "submitter";
  if (form._formRole === "manager") return "manager";
  if (form._isAssignedToYou) return "submitter";
  const isActualCreator =
    form.isCreator === true ||
    (!!currentUserId && !!form._publisherId && String(form._publisherId) === String(currentUserId));
  if (isActualCreator) return "manager";
  return "submitter";
}

// ── Main Export ────────────────────────────────────────────────────────────────
interface CourseFormsPageProps {
  courseId: string;
  isHead?: boolean;
  canManageForms?: boolean;
  currentUserId?: string | null;
}

export default function CourseFormsPage({ courseId, isHead, canManageForms, currentUserId }: CourseFormsPageProps) {
  const [mode, setMode] = useState<"list" | "create" | "edit" | "detail" | "answer">("list");
  const [forms, setForms] = useState<Form[]>([]);
  const [editingForm, setEditingForm] = useState<Form | undefined>(undefined);
  const [viewingForm, setViewingForm] = useState<Form | undefined>(undefined);
  const [sections, setSections] = useState<Section[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Form | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{ canManageForms: boolean; courseRole: string | null } | null>(null);

  const canManage = canManageForms ?? viewer?.canManageForms ?? false;
  const headMode = isHead ?? (viewer?.courseRole === "Head");

  const loadForms = useCallback(() => {
    setLoading(true);
    fetch(`/api/courses/${courseId}/forms`)
      .then(r => r.json())
      .then(d => { setForms(d.forms ?? []); if (d.viewer) setViewer(d.viewer); })
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch(`/api/courses/${courseId}/sections`)
      .then(r => r.json())
      .then(d => { setSections(d.sections ?? []); setStaff(d.staff ?? []); })
      .catch(() => {});
  }, [courseId]);

  useEffect(() => { loadForms(); }, [loadForms]);

  const onSave = async (data: Partial<Form>, publish: boolean) => {
    const url = editingForm
      ? `/api/courses/${courseId}/forms/${editingForm.id}`
      : `/api/courses/${courseId}/forms`;
    const res = await fetch(url, {
      method: editingForm ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, published: publish }),
    });
    if (!res.ok) throw new Error("Save failed");
    loadForms();
    setMode("list"); setEditingForm(undefined);
  };

  const onDelete = async (id: string | number) => {
    setDeleting(true);
    try {
      await fetch(`/api/courses/${courseId}/forms/${id}`, { method: "DELETE" });
      setForms(prev => prev.filter(f => f.id !== id));
      setDeleteTarget(null);
      if (mode === "detail" || mode === "answer") setMode("list");
    } finally { setDeleting(false); }
  };

  const onEdit = (id: string | number) => {
    const form = forms.find(f => f.id === id);
    if (!form) return;
    setEditingForm(form); setMode("edit");
  };

  const onTogglePublish = async (id: string | number) => {
    const form = forms.find(f => f.id === id);
    if (!form) return;
    setForms(prev => prev.map(f => f.id === id ? { ...f, published: !f.published } : f));
    await fetch(`/api/courses/${courseId}/forms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !form.published }),
    }).catch(() => {});
  };

  const openForm = (form: Form) => {
    setViewingForm(form);
    const role = resolveFormRole(form, currentUserId);
    if (headMode && canManage && role === "manager") setMode("detail");
    else setMode("answer");
  };

  if (mode === "answer" && viewingForm) {
    return (
      <>
        <style>{RESPONSIVE_CSS}</style>
        <CourseFormAnswer
          courseId={courseId}
          form={viewingForm}
          currentUserId={currentUserId}
          onBack={() => { setMode("list"); setViewingForm(undefined); }}
        />
      </>
    );
  }

  if (mode === "detail" && viewingForm) {
    return (
      <>
        <style>{RESPONSIVE_CSS}</style>
        <ManagerFormDetail
          form={viewingForm}
          currentUserId={currentUserId}
          onBack={() => { setMode("list"); setViewingForm(undefined); }}
          onEdit={() => { setEditingForm(viewingForm); setMode("edit"); }}
          onDelete={() => setDeleteTarget(viewingForm)}
          onTogglePublish={() => {
            onTogglePublish(viewingForm.id);
            setViewingForm(prev => prev ? { ...prev, published: !prev.published } : prev);
          }}
        />
        {deleteTarget && (
          <DeleteConfirmModal
            title={deleteTarget.title}
            onConfirm={() => onDelete(deleteTarget.id)}
            onCancel={() => setDeleteTarget(null)}
            deleting={deleting}
          />
        )}
      </>
    );
  }

  if ((mode === "create" || mode === "edit") && canManage) {
    return (
      <>
        <style>{RESPONSIVE_CSS}</style>
        <FormCreateEditView
          form={editingForm}
          courseId={courseId}
          sections={sections}
          staff={staff}
          onCancel={() => { setMode("list"); setEditingForm(undefined); }}
          onSave={onSave}
        />
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-gray-400" style={{ fontFamily: FONT }}>
        Loading forms...
      </div>
    );
  }

  if (headMode && canManage) {
    const resolvedForms = forms.map(f => ({ ...f, _resolvedRole: resolveFormRole(f, currentUserId) }));
    const managerForms = resolvedForms.filter(f => f._resolvedRole === "manager");
    const submitterForms = resolvedForms.filter(f => f._resolvedRole === "submitter");

    return (
      <>
        <style>{RESPONSIVE_CSS}</style>
        {deleteTarget && (
          <DeleteConfirmModal
            title={deleteTarget.title}
            onConfirm={() => onDelete(deleteTarget.id)}
            onCancel={() => setDeleteTarget(null)}
            deleting={deleting}
          />
        )}
        <div className="h-full overflow-y-auto pb-6" style={{ fontFamily: FONT }}>
          <div className="cft-section-label" style={{ color: "#7b1113", background: "#fef2f2", borderBottom: "1px solid #f0c0c0" }}>
            <span>Published by You</span>
          </div>
          <div className="px-3 sm:px-5 py-4" style={{ borderBottom: "2px solid #e5e7eb" }}>
            <ManagerSection
              forms={managerForms}
              onCreate={() => { setEditingForm(undefined); setMode("create"); }}
              onEdit={onEdit}
              onDelete={id => { const f = forms.find(x => x.id === id); if (f) setDeleteTarget(f); }}
              onTogglePublish={onTogglePublish}
              onView={openForm}
            />
          </div>
          <div className="cft-section-label" style={{ color: "#1d6fa4", background: "#eff6ff", borderBottom: "1px solid #bfdbfe", borderTop: "1px solid #bfdbfe" }}>
            <span>Assigned to You</span>
          </div>
          <div className="px-3 sm:px-5 py-4">
            <SubmitterSection forms={submitterForms} onView={openForm} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{RESPONSIVE_CSS}</style>
      <StaffFormsList forms={forms} onView={openForm} />
    </>
  );
}