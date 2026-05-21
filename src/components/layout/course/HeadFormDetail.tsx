"use client";

// HeadFormDetail.tsx
// Mirrors AdminCourseFormDetailPage UI/features exactly, adapted for Head role

import { useState, useEffect, useRef } from "react";
import {
  CheckCircle, Circle, MoreVertical, X, Check,
  Pencil, FileText, Trash2, Users, ChevronDown,
} from "lucide-react";
import Image from "next/image";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
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
  points?: number;
  required: boolean;
  options?: string[];
  sectionTitle?: string;
  sectionDescription?: string;
  rows?: string[];
  columns?: string[];
}

interface Form {
  id: string | number;
  title: string;
  description?: string;
  formType: "Survey / Feedback" | "Evaluation" | "Registration Form" | "Graded Assessment";
  published: boolean;
  questions: FormQuestion[];
  confirmationMessage: string;
  allowMultipleResponses: boolean;
  assignTo: string[];
  dueDate: string;
  dueTime: string;
  availableFrom: string;
  availableFromTime: string;
  availableUntil: string;
  availableUntilTime: string;
  _publisherName?: string | null;
  _publisherImage?: string | null;
  _publisherId?: string | null;
  authorName?: string;
  authorRole?: string;
  authorImage?: string | null;
  createdAt?: string;
}

interface EnrolledUser { id: string; name: string; courseRole?: string; }

interface AssignRow {
  id: number;
  assignees: { id: string; label: string }[];
  dueDate: string; dueTime: string;
  availableFrom: string; availableFromTime: string;
  until: string; untilTime: string;
}

interface Props {
  form: Form;
  courseId?: string;
  formId?: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onViewResponses?: () => void;
  currentUserId?: string | null;
  enrolledUsers?: EnrolledUser[];
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
const TYPE_COLORS: Record<string, string> = {
  "Survey / Feedback":  "#3b82f6",
  "Evaluation":         "#8b5cf6",
  "Registration Form":  "#16a34a",
  "Graded Assessment":  MAROON,
};

function buildTimes() {
  const list: string[] = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 30) {
      const hh = ((h + 11) % 12) + 1;
      list.push(`${hh}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`);
    }
  return list;
}
const ASSIGN_TIMES = buildTimes();

function buildLocalDate(date: string | null | undefined, time: string | null | undefined): Date | null {
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

function fmtDue(date: string | null | undefined, time?: string | null): string {
  if (!date) return "—";
  const d = buildLocalDate(date, time ?? "12:00 AM");
  if (!d) return "—";
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  );
}

function fmtDateTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function fmtLocalCourse(date: string, time: string) {
  if (!date) return null;
  const t = time || "11:59 PM";
  const d = new Date(`${date} ${t}`);
  if (isNaN(d.getTime())) return null;
  return `Local: ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function getAvailability(form: Form) {
  const now = new Date();
  if (!form.published) return { label: "Not Published", color: "#9ca3af", canRespond: false };
  const from  = form.availableFrom  ? buildLocalDate(form.availableFrom,  form.availableFromTime)  : null;
  const until = form.availableUntil ? buildLocalDate(form.availableUntil, form.availableUntilTime) : null;
  if (from  && now < from)  return { label: `Opens ${fmtDue(form.availableFrom, form.availableFromTime)}`, color: "#f59e0b", canRespond: false };
  if (until && now > until) return { label: "Closed", color: "#ef4444", canRespond: false };
  return { label: "Open for responses", color: "#22c55e", canRespond: true };
}

function resolveAssigneesLabel(assignTo: string[], users: EnrolledUser[]): string {
  if (!assignTo || assignTo.length === 0 || assignTo.includes("Everyone")) return "Everyone";
  const names = assignTo.map(id => users.find(u => u.id === id)?.name ?? id);
  if (names.length === 1) return names[0];
  return `${names.length} people`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   QUESTION PREVIEW
───────────────────────────────────────────────────────────────────────────── */
function QuestionPreview({ q, index }: { q: FormQuestion; index: number }) {
  if (q.type === "section") {
    return (
      <div className="border-t-4 pt-4 mt-6 first:mt-0" style={{ borderTopColor: MAROON }}>
        <p className="text-sm font-bold text-gray-800">{q.sectionTitle || "Section"}</p>
        {q.sectionDescription && <p className="text-xs text-gray-500 mt-0.5">{q.sectionDescription}</p>}
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3 mb-2">
        <span className="text-xs text-gray-400 shrink-0 mt-0.5 font-mono">{index}.</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">
            {q.question || <em className="text-gray-400">No question text</em>}
            {q.required && <span className="ml-1" style={{ color: MAROON }}>*</span>}
          </p>
          {q.description && <p className="text-xs text-gray-500 mt-0.5">{q.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-gray-400 capitalize">{q.type.replace(/_/g, " ")}</span>
          {(q.points ?? 0) > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#fef2f2", color: MAROON }}>
              {q.points} pt{q.points !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      {q.options && q.options.length > 0 && (
        <div className="pl-6 space-y-1 mt-2">
          {q.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="text-gray-400">
                {q.type === "multiple_choice" ? "◉" : q.type === "checkboxes" ? "☑" : `${i + 1}.`}
              </span>
              {opt}
            </div>
          ))}
        </div>
      )}
      {(q.type === "short_answer" || q.type === "paragraph") && (
        <div className="pl-6 border-b border-dashed border-gray-200 pb-1 mt-1">
          <span className="text-xs text-gray-300">{q.type === "short_answer" ? "Short answer text" : "Long answer text"}</span>
        </div>
      )}
      {q.type === "linear_scale" && (
        <div className="pl-6 flex gap-4 flex-wrap mt-1">
          {Array.from({ length: 5 }, (_, i) => i + 1).map(n => (
            <div key={n} className="flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{n}</span>
              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteModal({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100" style={{ background: "#fef2f2" }}>
          <div className="flex items-center gap-2">
            <Trash2 size={15} style={{ color: MAROON }} />
            <span className="text-sm font-black" style={{ color: MAROON }}>Delete Form</span>
          </div>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-gray-700 leading-relaxed">
            Are you sure you want to delete <strong>&ldquo;{title}&rdquo;</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onCancel} className="h-9 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
          <button onClick={onConfirm} className="h-9 px-4 rounded-xl text-sm font-black text-white transition-all" style={{ background: MAROON }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function HeadFormDetail({
  form,
  courseId,
  formId,
  onBack,
  onEdit,
  onDelete,
  onTogglePublish,
  onViewResponses,
  currentUserId,
  enrolledUsers = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "questions" | "responses">("overview");
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const dotMenuRef = useRef<HTMLDivElement>(null);

  // Assign panel state
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [assignRows, setAssignRows] = useState<AssignRow[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [dropSearch, setDropSearch] = useState<Record<number, string>>({});
  const [openDrop, setOpenDrop] = useState<number | null>(null);

  const availability = getAvailability(form);
  const qCount = form.questions?.filter(q => q.type !== "section").length ?? 0;
  const isPublished = form.published;
  const forLabel = resolveAssigneesLabel(form.assignTo ?? [], enrolledUsers);

  useEffect(() => {
    if (!showDotMenu) return;
    const h = (e: MouseEvent) => {
      if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node)) setShowDotMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDotMenu]);

  const openAssignPanel = () => {
    const isoToDate = (iso: string | null | undefined) => iso ? new Date(iso).toISOString().split("T")[0] : "";
    const isoToTime = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s/, " ") : "11:59 PM";
    setAssignRows([{
      id: 1,
      assignees: (form.assignTo?.length && !form.assignTo.includes("Everyone"))
        ? form.assignTo.map(id => { const u = enrolledUsers.find(u => u.id === id); return { id, label: u?.name ?? id }; })
        : [{ id: "everyone", label: "Everyone" }],
      dueDate: form.dueDate || "",
      dueTime: form.dueTime || "11:59 PM",
      availableFrom: form.availableFrom || "",
      availableFromTime: form.availableFromTime || "12:00 AM",
      until: form.availableUntil || "",
      untilTime: form.availableUntilTime || "11:59 PM",
    }]);
    setDropSearch({}); setOpenDrop(null); setShowAssignPanel(true);
  };

  const updateAssignRow = (id: number, field: keyof AssignRow, value: string) =>
    setAssignRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const toggleAssignee = (rowId: number, user: { id: string; label: string }) =>
    setAssignRows(p => p.map(r => {
      if (r.id !== rowId) return r;
      const has = r.assignees.find(a => a.id === user.id);
      const withoutEveryone = r.assignees.filter(a => a.id !== "everyone");
      const next = has ? withoutEveryone.filter(a => a.id !== user.id) : [...withoutEveryone, user];
      return { ...r, assignees: next.length ? next : [{ id: "everyone", label: "Everyone" }] };
    }));

  const selectEveryone = (rowId: number) =>
    setAssignRows(p => p.map(r => r.id === rowId ? { ...r, assignees: [{ id: "everyone", label: "Everyone" }] } : r));

  const addAssignRow = () => setAssignRows(p => [...p, {
    id: Date.now(), assignees: [],
    dueDate: "", dueTime: "11:59 PM",
    availableFrom: "", availableFromTime: "12:00 AM",
    until: "", untilTime: "11:59 PM",
  }]);

  const removeAssignRow = (id: number) => setAssignRows(p => p.filter(r => r.id !== id));

  const saveAssignTo = async () => {
    setSavingAssign(true);
    // Caller should pass an onSaveAssign prop for real API calls.
    // For now, just close after a short delay.
    await new Promise(r => setTimeout(r, 600));
    setSavingAssign(false);
    setShowAssignPanel(false);
  };

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>
      {showDeleteModal && (
        <DeleteModal
          title={form.title}
          onConfirm={() => { setShowDeleteModal(false); onDelete(); }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* ── Top action bar ── */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold hover:underline shrink-0 py-1"
            style={{ color: MAROON }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back to Forms</span>
            <span className="sm:hidden">Back</span>
          </button>
          <span
            className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${availability.color}18`, color: availability.color, border: `1px solid ${availability.color}40` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: availability.color }} />
            {availability.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {/* View Responses */}
          {onViewResponses && (
            <button
              onClick={onViewResponses}
              className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-all"
            >
              <FileText size={12} /><span className="hidden sm:inline">Responses</span>
            </button>
          )}

          {/* Assign To */}
          <button
            onClick={openAssignPanel}
            className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-all"
          >
            <Users size={12} /><span className="hidden sm:inline">Assign To</span>
          </button>

          {/* Edit */}
          <button
            onClick={onEdit}
            className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-all"
          >
            <Pencil size={12} /><span className="hidden sm:inline">Edit</span>
          </button>

          {/* Dot menu */}
          <div className="relative" ref={dotMenuRef}>
            <button
              onClick={() => setShowDotMenu(p => !p)}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-all"
            >
              <MoreVertical size={15} />
            </button>
            {showDotMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 shadow-xl rounded-xl z-[100] overflow-hidden py-1">
                <button
                  onClick={() => { setShowDotMenu(false); onTogglePublish(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 transition-colors text-left"
                  style={{ color: isPublished ? "#15803d" : "#6b7280" }}
                >
                  {isPublished ? <CheckCircle size={13} color="#16a34a" /> : <Circle size={13} />}
                  {isPublished ? "Unpublish" : "Publish"}
                </button>
                <div className="h-px bg-gray-100 mx-2" />
                <button
                  onClick={() => { setShowDotMenu(false); setShowDeleteModal(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <Trash2 size={13} /> Delete Form
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Publisher bar */}
      {form._publisherName && form._publisherId !== currentUserId && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50 shrink-0 flex-wrap">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0">
            {form._publisherImage
              ? <Image src={form._publisherImage} alt={form._publisherName} width={28} height={28} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span className="text-[11px] font-bold text-gray-600">{form._publisherName.charAt(0).toUpperCase()}</span>}
          </div>
          <span className="text-xs font-semibold text-gray-700">{form._publisherName}</span>
          <span className="text-xs text-gray-400">· Published this form</span>
        </div>
      )}

      {/* Status banners */}
      {!isPublished && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" /></svg>
          <p className="text-xs text-amber-800 font-medium">This form is <strong>unpublished</strong>. Staff cannot see it until you publish it.</p>
        </div>
      )}
      {isPublished && form.availableFrom && (() => {
        const from = buildLocalDate(form.availableFrom, form.availableFromTime);
        return from && new Date() < from;
      })() && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2 shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
          <p className="text-xs text-blue-800 font-medium">Published but responses open {fmtDue(form.availableFrom, form.availableFromTime)}.</p>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-end border-b border-gray-200 px-3 sm:px-6 bg-white shrink-0 overflow-x-auto">
        {(["overview", "questions", "responses"] as const).map(key => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 sm:px-4 py-2 text-xs border border-b-0 -mb-px mr-0.5 transition-colors rounded-t capitalize whitespace-nowrap ${activeTab === key
              ? "bg-white border-gray-200 text-gray-900 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {key === "questions" ? (
              <span className="flex items-center gap-1">
                Questions
                {qCount > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] text-white" style={{ background: MAROON }}>
                    {qCount}
                  </span>
                )}
              </span>
            ) : key === "responses" ? "After Submission" : "Overview"}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <>
              {/* Title block */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${TYPE_COLORS[form.formType] ?? MAROON}18` }}>
                  <FileText size={18} style={{ color: TYPE_COLORS[form.formType] ?? MAROON }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900">{form.title}</h1>
                    <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium" style={{ background: TYPE_COLORS[form.formType] ?? MAROON }}>
                      {form.formType}
                    </span>
                  </div>
                  {form.authorName && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{ background: MAROON }}>
                        {form.authorImage
                          ? <Image src={form.authorImage} alt={form.authorName} width={22} height={22} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                          : form.authorName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-gray-800">{form.authorName}</span>
                      {form.authorRole && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: "#fef2f2", color: MAROON, border: `1px solid #fecaca` }}>
                          {form.authorRole}
                        </span>
                      )}
                      {form.createdAt && <span className="text-xs text-gray-400">· Posted {fmtDateTime(form.createdAt)}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {form.description && (
                <div
                  className="mb-6 text-sm text-gray-700 leading-relaxed border-l-4 pl-4"
                  style={{ borderColor: TYPE_COLORS[form.formType] ?? MAROON }}
                  dangerouslySetInnerHTML={{ __html: form.description }}
                />
              )}

              {/* Details grid */}
              <div className="bg-white border border-gray-100 rounded-xl mb-5 overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2" style={{ background: "#fdf2f2" }}>
                  <svg width="13" height="13" fill="none" stroke={MAROON} strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Details</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-gray-100">
                  <div className="px-4 py-4 flex flex-col gap-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Type</p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full text-white font-bold w-fit" style={{ background: TYPE_COLORS[form.formType] ?? MAROON }}>{form.formType}</span>
                  </div>
                  <div className="px-4 py-4 flex flex-col gap-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Questions</p>
                    <p className="text-2xl font-black" style={{ color: MAROON }}>{qCount}</p>
                  </div>
                  <div className="px-4 py-4 flex flex-col gap-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status</p>
                    <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: isPublished ? "#15803d" : "#9ca3af" }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: isPublished ? "#22c55e" : "#9ca3af" }} />
                      {isPublished ? "Published" : "Unpublished"}
                    </span>
                  </div>
                  <div className="px-4 py-4 flex flex-col gap-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Can Respond</p>
                    <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: availability.canRespond ? "#15803d" : "#ef4444" }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: availability.canRespond ? "#22c55e" : "#ef4444" }} />
                      {availability.canRespond ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Schedule grid */}
              <div className="bg-white border border-gray-100 rounded-xl mb-5 overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2" style={{ background: "#fdf2f2" }}>
                  <svg width="13" height="13" fill="none" stroke={MAROON} strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Schedule</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-gray-100">
                  {[
                    { label: "Due",            icon: "⏰", val: fmtDue(form.dueDate, form.dueTime),                      accent: true  },
                    { label: "For",            icon: "👥", val: forLabel,                                                  accent: false },
                    { label: "Available From", icon: "🟢", val: fmtDue(form.availableFrom, form.availableFromTime),       accent: false },
                    { label: "Until",          icon: "🔴", val: fmtDue(form.availableUntil, form.availableUntilTime),    accent: false },
                  ].map(({ label, icon, val, accent }) => (
                    <div key={label} className="px-4 py-4 flex flex-col gap-1.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                        <span>{icon}</span>{label}
                      </p>
                      <p className="text-sm font-semibold" style={{ color: accent ? MAROON : "#374151" }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── QUESTIONS TAB ── */}
          {activeTab === "questions" && (
            <div className="max-w-2xl space-y-3">
              {form.questions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                  <div className="text-3xl mb-3">📋</div>
                  <p className="text-sm text-gray-400 mb-3">No questions yet.</p>
                  <button onClick={onEdit} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                    + Add questions in Edit
                  </button>
                </div>
              ) : (() => {
                let qIdx = 0;
                return form.questions.map(q => {
                  if (q.type !== "section") qIdx++;
                  return <QuestionPreview key={q.id} q={q} index={qIdx} />;
                });
              })()}
            </div>
          )}

          {/* ── AFTER SUBMISSION TAB ── */}
          {activeTab === "responses" && (
            <div className="max-w-md space-y-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Confirmation Message</p>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#f0fdf4" }}>
                    <svg width="22" height="22" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm text-center font-semibold text-gray-800 mb-2">Your response has been recorded</p>
                  <p className="text-xs text-center text-gray-500">{form.confirmationMessage || "Thank you for completing this form."}</p>
                  {form.allowMultipleResponses && (
                    <p className="text-xs text-center mt-3 font-medium" style={{ color: MAROON }}>Submit another response</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Settings</p>
                <div className="space-y-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    {form.allowMultipleResponses
                      ? <Check size={13} className="text-green-500" />
                      : <X size={13} className="text-gray-300" />}
                    Allow multiple responses
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="hidden sm:flex w-52 border-l border-gray-200 bg-white shrink-0 flex-col overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Actions</p>
          </div>
          <div className="px-4 py-4 space-y-3">
            <button onClick={onEdit} className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left" style={{ color: MAROON }}>
              <Pencil size={13} /> Edit Form
            </button>
            {onViewResponses && (
              <button onClick={onViewResponses} className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left" style={{ color: MAROON }}>
                <FileText size={13} /> View Responses
              </button>
            )}
            <button onClick={onTogglePublish} className="w-full flex items-center gap-2 text-xs font-bold text-left" style={{ color: isPublished ? "#15803d" : "#6b7280" }}>
              {isPublished ? <CheckCircle size={13} color="#16a34a" /> : <Circle size={13} />}
              {isPublished ? "Unpublish" : "Publish"}
            </button>
            <div className="h-px bg-gray-100" />
            <button onClick={() => setShowDeleteModal(true)} className="w-full flex items-center gap-2 text-xs font-bold text-red-600 hover:underline text-left">
              <Trash2 size={13} /> Delete Form
            </button>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 mt-auto">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              {qCount} question{qCount !== 1 ? "s" : ""}<br />
              <span className="font-semibold" style={{ color: availability.color }}>{availability.label}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Assign To Side Panel ── */}
      {showAssignPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowAssignPanel(false)} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[340px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col" style={{ fontFamily: FONT }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: MAROON }}>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Assign To</p>
                <p className="text-sm font-bold text-white truncate mt-0.5">{form.title}</p>
              </div>
              <button onClick={() => setShowAssignPanel(false)} className="text-white/60 hover:text-white ml-2"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
              {assignRows.map((row, idx) => (
                <div key={row.id} className="space-y-4">
                  {idx > 0 && (
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-px flex-1 bg-gray-100" />
                      <button onClick={() => removeAssignRow(row.id)} className="mx-3 text-xs font-bold text-red-400 hover:text-red-600">Remove</button>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                  )}
                  {/* Assignees dropdown */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Assign To</label>
                    <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenDrop(null); }}>
                      <div
                        className="min-h-9 border-2 rounded-xl px-2 py-1.5 flex flex-wrap gap-1 items-center cursor-text bg-white"
                        style={{ borderColor: openDrop === row.id ? MAROON : "#e5e7eb" }}
                        onClick={() => setOpenDrop(row.id)}
                      >
                        {row.assignees.map(a => (
                          <span key={a.id} className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: MAROON }}>
                            {a.label}
                            <button type="button" tabIndex={-1} onClick={e => { e.stopPropagation(); if (a.id === "everyone") return; toggleAssignee(row.id, a); }} className="opacity-70 hover:opacity-100 font-black">×</button>
                          </span>
                        ))}
                        <input
                          value={dropSearch[row.id] ?? ""}
                          onChange={e => { setDropSearch(p => ({ ...p, [row.id]: e.target.value })); setOpenDrop(row.id); }}
                          onFocus={() => setOpenDrop(row.id)}
                          placeholder={row.assignees.length ? "" : "Search..."}
                          className="flex-1 min-w-20 text-xs outline-none bg-transparent py-0.5 text-gray-700 placeholder:text-gray-400"
                        />
                        <ChevronDown size={13} className="text-gray-400 shrink-0" />
                      </div>
                      {openDrop === row.id && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded-xl z-[200] max-h-48 overflow-y-auto">
                          {("everyone".includes((dropSearch[row.id] ?? "").toLowerCase()) || !(dropSearch[row.id] ?? "")) && (
                            <button type="button" tabIndex={0}
                              onMouseDown={e => { e.preventDefault(); selectEveryone(row.id); setDropSearch(p => ({ ...p, [row.id]: "" })); }}
                              className="w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-red-50 transition-colors"
                              style={row.assignees.some(a => a.id === "everyone") ? { color: MAROON } : { color: "#374151" }}>
                              Everyone
                              {row.assignees.some(a => a.id === "everyone") && <Check size={12} style={{ color: MAROON }} />}
                            </button>
                          )}
                          {enrolledUsers
                            .filter(u => u.name.toLowerCase().includes((dropSearch[row.id] ?? "").toLowerCase()))
                            .map(u => (
                              <button type="button" key={u.id} tabIndex={0}
                                onMouseDown={e => { e.preventDefault(); toggleAssignee(row.id, { id: u.id, label: u.name }); setDropSearch(p => ({ ...p, [row.id]: "" })); }}
                                className="w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-red-50 transition-colors"
                                style={row.assignees.some(a => a.id === u.id) ? { color: MAROON } : { color: "#374151" }}>
                                <span>{u.name}{u.courseRole && <span className="ml-1 text-gray-400 font-normal">({u.courseRole})</span>}</span>
                                {row.assignees.some(a => a.id === u.id) && <Check size={12} style={{ color: MAROON }} />}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date/time fields */}
                  {([
                    ["Due Date",       "dueDate",       "dueTime"           ],
                    ["Available From", "availableFrom", "availableFromTime" ],
                    ["Until",          "until",         "untilTime"         ],
                  ] as const).map(([label, dateField, timeField]) => (
                    <div key={label}>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">{label}</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input type="date" value={row[dateField]} onChange={e => updateAssignRow(row.id, dateField, e.target.value)}
                          className="flex-1 h-8 border border-gray-200 rounded-lg px-2 text-xs outline-none focus:border-gray-400 bg-white" />
                        <div className="flex items-center gap-1">
                          <select value={row[timeField]} onChange={e => updateAssignRow(row.id, timeField, e.target.value)}
                            className="h-8 border border-gray-200 rounded-lg px-1.5 text-xs bg-white outline-none focus:border-gray-400 w-full sm:w-28">
                            {ASSIGN_TIMES.map(t => <option key={t}>{t}</option>)}
                          </select>
                          <button onClick={() => updateAssignRow(row.id, dateField, "")} className="text-[10px] font-bold hover:underline shrink-0" style={{ color: MAROON }}>Clear</button>
                        </div>
                      </div>
                      {row[dateField] && <p className="text-[10px] text-gray-400 mt-1">{fmtLocalCourse(row[dateField], row[timeField])}</p>}
                    </div>
                  ))}
                </div>
              ))}
              <button onClick={addAssignRow} className="flex items-center gap-1.5 text-xs font-bold hover:underline" style={{ color: MAROON }}>
                <span className="text-base leading-none">+</span> Add Row
              </button>
            </div>

            <div className="flex gap-2 px-4 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowAssignPanel(false)} className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
              <button onClick={saveAssignTo} disabled={savingAssign} className="flex-1 h-9 rounded-xl text-sm font-black text-white disabled:opacity-60 transition-all" style={{ background: MAROON }}>
                {savingAssign ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}