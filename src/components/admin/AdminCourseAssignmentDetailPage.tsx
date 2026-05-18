"use client";

// AdminCourseFormDetailPage.tsx
// Route: /admin/courses/[id]/forms/[formId]

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle, Circle, Pencil, Users, ChevronDown,
  RefreshCw, Check, X, Trash2, MoreVertical, FileText,
  ArrowLeft, Eye,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormQuestion {
  id: string;
  type: string;
  question: string;
  points: number;
  required: boolean;
  options?: string[];
  sectionTitle?: string;
}

interface FormRecord {
  id: string | number;
  title: string;
  description: string | null;
  formType: "Survey / Feedback" | "Evaluation" | "Registration Form" | "Graded Assessment";
  assignmentGroup: string;
  points: number;
  published: boolean;
  questions: FormQuestion[];
  confirmationMessage: string;
  allowMultipleResponses: boolean;
  assignTo: string[];
  dueDate: string | null;
  dueTime: string;
  availableFrom: string | null;
  availableFromTime: string;
  availableUntil: string | null;
  availableUntilTime: string;
  createdAt: string;
}

interface Creator {
  id: string;
  name: string;
  email: string;
  courseRole: string | null;
  createdAt: string;
}

interface EnrolledUser { id: string; name: string; courseRole?: string; }

interface AssignRow {
  id: number;
  assignees: { id: string; label: string }[];
  dueDate: string; dueTime: string;
  availableFrom: string; availableFromTime: string;
  until: string; untilTime: string;
}

const typeColors: Record<string, string> = {
  "Survey / Feedback": "#3b82f6",
  Evaluation: "#8b5cf6",
  "Registration Form": "#16a34a",
  "Graded Assessment": MAROON,
};

// ── Time options ──────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtLocalCourse(date: string, time: string) {
  if (!date) return null;
  const t = time || "11:59 PM";
  const d = new Date(`${date} ${t}`);
  if (isNaN(d.getTime())) return null;
  return `Local: ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function getAvailabilityStatus(form: FormRecord): { canRespond: boolean; statusLabel: string; statusColor: string } {
  const now = new Date();
  if (!form.published) return { canRespond: false, statusLabel: "Not Published", statusColor: "#9ca3af" };
  const from = form.availableFrom ? new Date(form.availableFrom) : null;
  const until = form.availableUntil ? new Date(form.availableUntil) : null;
  if (from && now < from) return { canRespond: false, statusLabel: `Opens ${fmtDate(form.availableFrom)}`, statusColor: "#f59e0b" };
  if (until && now > until) return { canRespond: false, statusLabel: "Closed", statusColor: "#ef4444" };
  return { canRespond: true, statusLabel: "Open for responses", statusColor: "#22c55e" };
}

function resolveAssigneesLabel(assignTo: string[], users: EnrolledUser[]): string {
  if (!assignTo || assignTo.length === 0 || assignTo.includes("Everyone")) return "Everyone";
  const names = assignTo.map(id => users.find(u => u.id === id)?.name ?? id);
  if (names.length === 1) return names[0];
  return `${names.length} people`;
}

// ── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  const normalized = role.toUpperCase();
  const styles: Record<string, React.CSSProperties> = {
    ADMIN: { background: "#fef2f2", color: MAROON, border: "1px solid #fecaca" },
    HEAD: { background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" },
    STAFF: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    TEACHER: { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" },
  };
  const style = styles[normalized] ?? { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" };
  return (
    <span style={{ ...style, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>
      {normalized}
    </span>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteFormModal({ title, onConfirm, onCancel, deleting }: {
  title: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={onCancel}>
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-5 py-4 border-b border-gray-100" style={{ background: "#fef2f2" }}>
          <div className="flex items-center gap-2">
            <Trash2 size={15} style={{ color: MAROON }} />
            <span className="text-sm font-black" style={{ color: MAROON }}>Delete Form</span>
          </div>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-gray-700 leading-relaxed">
            Are you sure you want to delete <span className="font-bold">&ldquo;{title}&rdquo;</span>? This action cannot be undone.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 h-11 sm:h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 h-11 sm:h-9 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60"
            style={{ background: MAROON }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Question Preview ──────────────────────────────────────────────────────────
function QuestionPreview({ q, index }: { q: FormQuestion; index: number }) {
  if (q.type === "section") {
    return (
      <div className="border-t-4 pt-4 mt-6 first:mt-0" style={{ borderTopColor: MAROON }}>
        <p className="text-sm font-bold text-gray-800">{q.sectionTitle || "Section"}</p>
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm active:scale-[0.99] transition-transform">
      <div className="flex items-start gap-3 mb-2">
        <span className="text-xs text-gray-400 shrink-0 mt-0.5 font-mono">{index}.</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 break-words">
            {q.question || <em className="text-gray-400">No question text</em>}
            {q.required && <span className="ml-1 text-red-500">*</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          <span className="text-[10px] text-gray-400 capitalize">{q.type.replace(/_/g, " ")}</span>
          {q.points > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#fef2f2", color: MAROON }}>
              {q.points} pt{q.points !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      {q.options && q.options.length > 0 && (
        <div className="pl-6 space-y-1.5 mt-2">
          {q.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="text-gray-300 shrink-0">◉</span>
              <span className="break-words">{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminCourseFormDetailPage({
  courseId, formId,
}: { courseId: string; formId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormRecord | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);

  // Dot menu
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dotMenuRef = useRef<HTMLDivElement>(null);

  // Assign panel
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [assignRows, setAssignRows] = useState<AssignRow[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [dropSearch, setDropSearch] = useState<Record<number, string>>({});
  const [openDrop, setOpenDrop] = useState<number | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<"overview" | "questions" | "responses">("overview");

  // Mobile action sheet
  const [showMobileActions, setShowMobileActions] = useState(false);

  useEffect(() => {
    if (!showDotMenu) return;
    const h = (e: MouseEvent) => {
      if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node)) setShowDotMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDotMenu]);

  useEffect(() => {
    if (!courseId || !formId) return;
    fetch(`/api/admin/courses/${courseId}/forms/${formId}`)
      .then(r => r.json())
      .then(d => {
        setForm(d.form ?? d);
        setCreator(d.creator ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/admin/courses/${courseId}/sections`)
      .then(r => r.json())
      .then(d => {
        const rawStaff = d.staff ?? d.users ?? d.members ?? [];
        setEnrolledUsers(rawStaff.map((u: { id: string; name?: string; userName?: string; email?: string; courseRole?: string }) => ({
          id: u.id, name: u.name ?? u.userName ?? u.email ?? u.id, courseRole: u.courseRole ?? "Staff",
        })));
      })
      .catch(() => {});
  }, [courseId, formId]);

  const togglePublish = async () => {
    if (!form) return;
    setPublishing(true);
    const newStatus = !form.published;
    const res = await fetch(`/api/admin/courses/${courseId}/forms/${formId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: newStatus }),
    });
    const data = await res.json();
    if (data.form || data.published !== undefined) setForm(prev => prev ? { ...prev, published: newStatus } : null);
    setPublishing(false);
  };

  const handleDelete = async () => {
    if (!form) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/forms/${formId}`, { method: "DELETE" });
      if (res.ok) {
        router.push(`/admin/courses/${courseId}/forms`);
      } else {
        const data = await res.json().catch(() => ({}));
        alert((data as { error?: string })?.error ?? "Failed to delete form.");
        setDeleting(false); setShowDeleteModal(false);
      }
    } catch {
      alert("Network error. Please try again.");
      setDeleting(false); setShowDeleteModal(false);
    }
  };

  const openAssignPanel = () => {
    if (!form) return;
    const isoToDate = (iso: string | null) => iso ? new Date(iso).toISOString().split("T")[0] : "";
    const isoToTime = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s/, " ") : "11:59 PM";
    setAssignRows([{
      id: 1,
      assignees: (form.assignTo.length && !form.assignTo.includes("Everyone"))
        ? form.assignTo.map(id => { const u = enrolledUsers.find(u => u.id === id); return { id, label: u?.name ?? id }; })
        : [{ id: "everyone", label: "Everyone" }],
      dueDate: isoToDate(form.dueDate), dueTime: isoToTime(form.dueDate),
      availableFrom: isoToDate(form.availableFrom), availableFromTime: isoToTime(form.availableFrom),
      until: isoToDate(form.availableUntil), untilTime: isoToTime(form.availableUntil),
    }]);
    setDropSearch({}); setOpenDrop(null); setShowAssignPanel(true);
    setShowMobileActions(false);
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
    if (!form) return;
    setSavingAssign(true);
    const allEveryone = assignRows.every(r => !r.assignees.length || r.assignees.some(a => a.id === "everyone"));
    const resolvedIds = allEveryone ? ["Everyone"] : assignRows.flatMap(r => r.assignees.filter(a => a.id !== "everyone").map(a => a.label));
    const row = assignRows[0];
    const res = await fetch(`/api/admin/courses/${courseId}/forms/${formId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignTo: resolvedIds,
        dueDate: row.dueDate || null, dueTime: row.dueTime,
        availableFrom: row.availableFrom || null, availableFromTime: row.availableFromTime,
        availableUntil: row.until || null, availableUntilTime: row.untilTime,
      }),
    });
    const data = await res.json();
    if (data.form) {
      setForm(prev => prev ? {
        ...prev,
        assignTo: resolvedIds,
        dueDate: data.form.dueDate ?? prev.dueDate,
        availableFrom: data.form.availableFrom ?? prev.availableFrom,
        availableUntil: data.form.availableUntil ?? prev.availableUntil,
      } : null);
    }
    setSavingAssign(false); setShowAssignPanel(false);
  };

  // ── Loading / Not found ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400" style={{ fontFamily: FONT }}>
      <RefreshCw size={16} className="animate-spin" /> Loading...
    </div>
  );
  if (!form) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ fontFamily: FONT }}>
      <p className="text-sm text-gray-500">Form not found.</p>
      <button onClick={() => router.back()} className="text-sm font-bold hover:underline" style={{ color: MAROON }}>← Go back</button>
    </div>
  );

  const isPublished = form.published;
  const availability = getAvailabilityStatus(form);
  const forLabel = resolveAssigneesLabel(form.assignTo ?? [], enrolledUsers);
  const qCount = form.questions?.filter(q => q.type !== "section").length ?? 0;

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "questions" as const, label: `Questions${qCount > 0 ? ` (${qCount})` : ""}` },
    { key: "responses" as const, label: "After Submit" },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 sm:bg-white" style={{ fontFamily: FONT }}>

      {/* Delete modal */}
      {showDeleteModal && (
        <DeleteFormModal
          title={form.title}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteModal(false); setShowDotMenu(false); }}
          deleting={deleting}
        />
      )}

      {/* Mobile action sheet backdrop */}
      {showMobileActions && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setShowMobileActions(false)}
        />
      )}

      {/* Mobile action sheet */}
      {showMobileActions && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-gray-100 pb-safe">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <div className="px-4 pt-2 pb-4 space-y-1">
            <button
              onClick={togglePublish}
              disabled={publishing}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-left transition-colors"
              style={isPublished
                ? { background: "#f0fdf4", color: "#15803d" }
                : { background: "#f9fafb", color: "#374151" }}
            >
              {isPublished ? <CheckCircle size={18} style={{ color: "#15803d" }} /> : <Circle size={18} />}
              {isPublished ? "Published — tap to unpublish" : "Unpublished — tap to publish"}
            </button>
            <button
              onClick={openAssignPanel}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Users size={18} style={{ color: MAROON }} />
              Assign To
            </button>
            <button
              onClick={() => { router.push(`/admin/courses/${courseId}/forms/${formId}/edit`); setShowMobileActions(false); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil size={18} style={{ color: MAROON }} />
              Edit Form
            </button>
            <button
              onClick={() => { router.push(`/admin/courses/${courseId}/forms/${formId}/responses`); setShowMobileActions(false); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye size={18} style={{ color: MAROON }} />
              View Responses
            </button>
            <div className="h-px bg-gray-100 my-1" />
            <button
              onClick={() => { setShowMobileActions(false); setTimeout(() => setShowDeleteModal(true), 100); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={18} />
              Delete Form
            </button>
          </div>
        </div>
      )}

      {/* ── Top action bar ── */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2.5 flex items-center justify-between shrink-0 gap-2">
        {/* Left: back + status */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push(`/admin/courses/${courseId}/forms`)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 shrink-0 transition-colors sm:hidden"
          >
            <ArrowLeft size={15} />
          </button>
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
            style={{
              background: `${availability.statusColor}18`,
              color: availability.statusColor,
              border: `1px solid ${availability.statusColor}40`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: availability.statusColor }} />
            <span className="hidden sm:inline">{availability.statusLabel}</span>
            <span className="sm:hidden">{isPublished ? "Live" : "Draft"}</span>
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          {/* Desktop actions */}
          <button
            onClick={togglePublish}
            disabled={publishing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-60"
            style={isPublished
              ? { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }
              : { background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb" }}
          >
            {isPublished ? <CheckCircle size={13} style={{ color: "#15803d" }} /> : <Circle size={13} />}
            {isPublished ? "Published" : "Unpublished"}
          </button>
          <button
            onClick={openAssignPanel}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-all"
          >
            <Users size={12} /> Assign To
          </button>
          <button
            onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}/edit`)}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-all"
          >
            <Pencil size={12} /> Edit
          </button>

          {/* Mobile: single action button */}
          <button
            onClick={() => setShowMobileActions(true)}
            className="sm:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: MAROON, color: "#fff" }}
          >
            <MoreVertical size={13} />
            Actions
          </button>

          {/* Desktop dot menu */}
          <div className="relative hidden sm:block" ref={dotMenuRef}>
            <button
              onClick={() => setShowDotMenu(p => !p)}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-all"
            >
              <MoreVertical size={15} />
            </button>
            {showDotMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 shadow-xl rounded-xl z-[100] overflow-hidden py-1">
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

      {/* Status banners */}
      {!isPublished && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" className="shrink-0">
            <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
          </svg>
          <p className="text-xs text-amber-800 font-medium leading-snug">
            This form is <strong>unpublished</strong>. Respondents cannot see it until you publish it.
          </p>
        </div>
      )}
      {isPublished && form.availableFrom && new Date() < new Date(form.availableFrom) && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6" className="shrink-0">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          <p className="text-xs text-blue-800 font-medium leading-snug">
            Published but responses open {fmtDate(form.availableFrom)}.
          </p>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex items-end border-b border-gray-200 bg-white shrink-0 overflow-x-auto px-3 sm:px-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm border-b-2 -mb-px mr-1 transition-colors whitespace-nowrap font-medium ${
              activeTab === tab.key
                ? "border-b-2 text-gray-900 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={activeTab === tab.key ? { borderBottomColor: MAROON, color: MAROON } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Main scroll area */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="max-w-3xl space-y-4">

              {/* Title card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${typeColors[form.formType] ?? MAROON}15` }}
                  >
                    <FileText size={20} style={{ color: typeColors[form.formType] ?? MAROON }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h1 className="text-lg sm:text-xl font-black text-gray-900 break-words">{form.title}</h1>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full text-white font-semibold shrink-0"
                        style={{ background: typeColors[form.formType] ?? MAROON }}
                      >
                        {form.formType}
                      </span>
                    </div>
                    {creator && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
                          style={{ background: MAROON }}
                        >
                          {creator.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-800">{creator.name}</span>
                        {creator.courseRole && <RoleBadge role={creator.courseRole} />}
                        <span className="text-xs text-gray-400">· {fmtDateTime(creator.createdAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {form.description && (
                <div
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 text-sm text-gray-700 leading-relaxed border-l-4"
                  style={{ borderLeftColor: typeColors[form.formType] ?? MAROON }}
                >
                  <div dangerouslySetInnerHTML={{ __html: form.description }} />
                </div>
              )}

              {/* Details grid */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100" style={{ background: "#fdf8f8" }}>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Details</p>
                </div>
                <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
                  {[
                    ["Type", form.formType],
                    ["Group", form.assignmentGroup],
                    ["Points", form.formType === "Graded Assessment" ? `${form.points}` : "—"],
                    ["Questions", `${qCount}`],
                    ["Status", isPublished ? "Published" : "Unpublished"],
                    ["Can Respond", availability.canRespond ? "Yes" : "No"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{k}</p>
                      <p className="text-sm font-bold text-gray-800 break-words">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule — card on mobile, table on desktop */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100" style={{ background: "#fdf8f8" }}>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Schedule</p>
                </div>

                {/* Mobile: stacked cards */}
                <div className="sm:hidden p-4 space-y-3">
                  {[
                    ["Due", fmtDate(form.dueDate)],
                    ["For", forLabel],
                    ["Available From", fmtDate(form.availableFrom)],
                    ["Until", fmtDate(form.availableUntil)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0 mt-0.5 w-24">{label}</span>
                      <span className="text-xs font-semibold text-gray-700 text-right">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Due", "For", "Available From", "Until"].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-700">{fmtDate(form.dueDate)}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-700">{forLabel}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{fmtDate(form.availableFrom)}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{fmtDate(form.availableUntil)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile quick actions */}
              <div className="sm:hidden grid grid-cols-2 gap-2 pb-4">
                <button
                  onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}/edit`)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <Pencil size={14} style={{ color: MAROON }} /> Edit Form
                </button>
                <button
                  onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}/responses`)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <Eye size={14} style={{ color: MAROON }} /> Responses
                </button>
              </div>
            </div>
          )}

          {/* ── QUESTIONS TAB ── */}
          {activeTab === "questions" && (
            <div className="max-w-2xl space-y-3 pb-6">
              {form.questions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 mx-0">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm text-gray-400 mb-4">No questions yet.</p>
                  <button
                    onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}/edit`)}
                    className="text-xs font-bold px-4 py-2 rounded-lg text-white transition-all active:scale-95"
                    style={{ background: MAROON }}
                  >
                    + Add questions
                  </button>
                </div>
              ) : (() => {
                let qIndex = 0;
                return form.questions.map(q => {
                  if (q.type !== "section") qIndex++;
                  return <QuestionPreview key={q.id} q={q} index={qIndex} />;
                });
              })()}
            </div>
          )}

          {/* ── RESPONSES / AFTER SUBMISSION TAB ── */}
          {activeTab === "responses" && (
            <div className="max-w-sm space-y-4 pb-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100" style={{ background: "#fdf8f8" }}>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Confirmation Message</p>
                </div>
                <div className="p-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f0fdf4" }}>
                    <svg width="24" height="24" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm text-center font-semibold text-gray-800 mb-2">Your response has been recorded</p>
                  <p className="text-xs text-center text-gray-500 leading-relaxed">
                    {form.confirmationMessage || "Thank you for completing this form."}
                  </p>
                  {form.allowMultipleResponses && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-center font-semibold" style={{ color: MAROON }}>
                        Submit another response →
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100" style={{ background: "#fdf8f8" }}>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Settings</p>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${form.allowMultipleResponses ? "bg-green-100" : "bg-gray-100"}`}>
                      {form.allowMultipleResponses
                        ? <Check size={11} className="text-green-600" />
                        : <X size={11} className="text-gray-400" />
                      }
                    </div>
                    <span className="text-xs font-medium">Allow multiple responses</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar (desktop only) ── */}
        <div className="hidden lg:flex w-52 border-l border-gray-200 bg-white shrink-0 flex-col overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100" style={{ background: "#fdf8f8" }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Related</p>
          </div>
          <div className="px-4 py-4 space-y-2">
            <button
              onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}/edit`)}
              className="w-full flex items-center gap-2 text-xs font-bold text-left px-3 py-2.5 rounded-lg hover:bg-red-50 transition-colors"
              style={{ color: MAROON }}
            >
              <Pencil size={13} /> Edit Form
            </button>
            <button
              onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}/responses`)}
              className="w-full flex items-center gap-2 text-xs font-bold text-left px-3 py-2.5 rounded-lg hover:bg-red-50 transition-colors"
              style={{ color: MAROON }}
            >
              <Eye size={13} /> View Responses
            </button>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 mt-auto">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              {qCount} question{qCount !== 1 ? "s" : ""}
              {form.formType === "Graded Assessment" && ` · ${form.points} pts`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Assign To Side Panel ── */}
      {showAssignPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowAssignPanel(false)} />
          <div
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
            style={{ fontFamily: FONT }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0"
              style={{ background: MAROON }}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Assign To</p>
                <p className="text-sm font-bold text-white truncate mt-0.5">{form.title}</p>
              </div>
              <button onClick={() => setShowAssignPanel(false)} className="text-white/60 hover:text-white ml-3 shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {assignRows.map((row, idx) => (
                <div key={row.id} className="space-y-4">
                  {idx > 0 && (
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-px flex-1 bg-gray-100" />
                      <button onClick={() => removeAssignRow(row.id)} className="mx-3 text-xs font-bold text-red-400 hover:text-red-600">
                        Remove
                      </button>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                  )}

                  {/* Assignee picker */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Assign To</label>
                    <div
                      className="relative"
                      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenDrop(null); }}
                    >
                      <div
                        className="min-h-10 border-2 rounded-xl px-2 py-1.5 flex flex-wrap gap-1 items-center cursor-text bg-white"
                        style={{ borderColor: openDrop === row.id ? MAROON : "#e5e7eb" }}
                        onClick={() => setOpenDrop(row.id)}
                      >
                        {row.assignees.map(a => (
                          <span
                            key={a.id}
                            className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ background: MAROON }}
                          >
                            {a.label}
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={e => { e.stopPropagation(); if (a.id === "everyone") return; toggleAssignee(row.id, a); }}
                              className="opacity-70 hover:opacity-100 font-black"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          value={dropSearch[row.id] ?? ""}
                          onChange={e => { setDropSearch(p => ({ ...p, [row.id]: e.target.value })); setOpenDrop(row.id); }}
                          onFocus={() => setOpenDrop(row.id)}
                          placeholder={row.assignees.length ? "" : "Search..."}
                          className="flex-1 min-w-16 text-xs outline-none bg-transparent py-0.5 text-gray-700 placeholder:text-gray-400"
                        />
                        <ChevronDown size={13} className="text-gray-400 shrink-0" />
                      </div>

                      {openDrop === row.id && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded-xl z-[200] max-h-52 overflow-y-auto">
                          {("everyone".includes((dropSearch[row.id] ?? "").toLowerCase()) || !(dropSearch[row.id] ?? "")) && (
                            <button
                              type="button"
                              tabIndex={0}
                              onMouseDown={e => { e.preventDefault(); selectEveryone(row.id); setDropSearch(p => ({ ...p, [row.id]: "" })); }}
                              className="w-full text-left px-3 py-3 text-xs font-semibold flex items-center justify-between hover:bg-red-50 transition-colors"
                              style={row.assignees.some(a => a.id === "everyone") ? { color: MAROON } : { color: "#374151" }}
                            >
                              Everyone
                              {row.assignees.some(a => a.id === "everyone") && <Check size={12} style={{ color: MAROON }} />}
                            </button>
                          )}
                          {enrolledUsers
                            .filter(u => u.name.toLowerCase().includes((dropSearch[row.id] ?? "").toLowerCase()))
                            .map(u => (
                              <button
                                type="button"
                                key={u.id}
                                tabIndex={0}
                                onMouseDown={e => { e.preventDefault(); toggleAssignee(row.id, { id: u.id, label: u.name }); setDropSearch(p => ({ ...p, [row.id]: "" })); }}
                                className="w-full text-left px-3 py-3 text-xs font-semibold flex items-center justify-between hover:bg-red-50 transition-colors"
                                style={row.assignees.some(a => a.id === u.id) ? { color: MAROON } : { color: "#374151" }}
                              >
                                <span>
                                  {u.name}
                                  {u.courseRole && <span className="ml-1 text-gray-400 font-normal">({u.courseRole})</span>}
                                </span>
                                {row.assignees.some(a => a.id === u.id) && <Check size={12} style={{ color: MAROON }} />}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date/time fields */}
                  {([
                    ["Due Date", "dueDate", "dueTime"],
                    ["Available From", "availableFrom", "availableFromTime"],
                    ["Until", "until", "untilTime"],
                  ] as const).map(([label, dateField, timeField]) => (
                    <div key={label}>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">{label}</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={row[dateField]}
                          onChange={e => updateAssignRow(row.id, dateField, e.target.value)}
                          className="flex-1 h-9 border border-gray-200 rounded-lg px-2 text-xs outline-none focus:border-gray-400 bg-white min-w-0"
                        />
                        <select
                          value={row[timeField]}
                          onChange={e => updateAssignRow(row.id, timeField, e.target.value)}
                          className="h-9 border border-gray-200 rounded-lg px-1.5 text-xs bg-white outline-none focus:border-gray-400 w-28 shrink-0"
                        >
                          {ASSIGN_TIMES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        {row[dateField]
                          ? <p className="text-[10px] text-gray-400">{fmtLocalCourse(row[dateField], row[timeField])}</p>
                          : <span />
                        }
                        <button
                          onClick={() => updateAssignRow(row.id, dateField, "")}
                          className="text-[10px] font-bold hover:underline shrink-0"
                          style={{ color: MAROON }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              <button
                onClick={addAssignRow}
                className="flex items-center gap-1.5 text-xs font-bold hover:underline"
                style={{ color: MAROON }}
              >
                <span className="text-base leading-none">+</span> Add Row
              </button>
            </div>

            {/* Panel footer */}
            <div className="flex gap-2 px-4 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button
                onClick={() => setShowAssignPanel(false)}
                className="flex-1 h-11 sm:h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveAssignTo}
                disabled={savingAssign}
                className="flex-1 h-11 sm:h-9 rounded-xl text-sm font-black text-white disabled:opacity-60 transition-all"
                style={{ background: MAROON }}
              >
                {savingAssign ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}