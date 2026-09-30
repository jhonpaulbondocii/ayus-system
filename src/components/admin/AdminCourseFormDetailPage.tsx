"use client";

// AdminCourseFormDetailPage.tsx
// Route: /admin/courses/[id]/forms/[formId]

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle, Circle, Pencil, Users, ChevronDown,
  RefreshCw, Check, X, Trash2, MoreVertical, FileText,
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
  description?: string;
  formType: "Survey / Feedback" | "Evaluation" | "Registration Form" | "Graded Assessment";
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

const FORMDETAIL_CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }

  .fd-desc { font-size: 13px; color: #374151; line-height: 1.75; }
  .fd-desc p { margin: 0 0 8px; }
  .fd-desc strong, .fd-desc b { font-weight: 700; color: #111827; }
  .fd-desc ul, .fd-desc ol { padding-left: 20px; margin: 0 0 6px; }
  .fd-desc li { margin-bottom: 3px; }
  .fd-desc a { color: #7b1113; text-decoration: underline; }

  .fd-sidebar { display: flex !important; }

  .fd-overview-layout { display: flex; flex: 1; overflow: hidden; }
  .fd-overview-main { flex: 1; overflow-y: auto; padding: 20px 24px; min-width: 0; }
  .fd-overview-sidebar { width: 220px; flex-shrink: 0; border-left: 1px solid #e5e7eb; background: #fff; overflow-y: auto; display: flex; flex-direction: column; }

  .fd-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .fd-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .fd-action-label { display: inline !important; }

  @media (max-width: 1023px) {
    .fd-overview-sidebar { display: none !important; }
    .fd-overview-main { padding: 16px; }
  }

  @media (max-width: 767px) {
    .fd-overview-main { padding: 10px 8px; }
    .fd-detail-card-body { grid-template-columns: 1fr !important; gap: 8px !important; }
    .fd-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 6px; }

    .fd-top-bar-wrap { flex-direction: column !important; align-items: stretch !important; padding: 0 8px !important; min-height: auto !important; }
    .fd-tabs-row { width: 100%; }
    .fd-tabs-row button { flex: 1; justify-content: center; padding: 8px 6px !important; font-size: 12px !important; }

    .fd-tab-actions-wrap {
      width: 100%; padding: 8px 0 10px !important; gap: 0 !important;
      border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background: #fff;
    }
    .fd-tab-actions-wrap > button, .fd-tab-actions-wrap > div {
      flex: 1; margin: 0 !important; border-radius: 0 !important; border: none !important;
      border-right: 1px solid #e5e7eb !important; justify-content: center !important; height: 38px !important;
    }
    .fd-tab-actions-wrap > button:last-child, .fd-tab-actions-wrap > div:last-child { border-right: none !important; }
    .fd-tab-actions-wrap > div > button { width: 100% !important; height: 100% !important; border-radius: 0 !important; }

    .fd-hero { padding: 12px 14px !important; border-radius: 12px !important; }
    .fd-action-label { display: none !important; }
  }
`;

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
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.4)", padding: "0 16px" }} onClick={onCancel}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 20px 40px rgba(0,0,0,.2)", width: "100%", maxWidth: 400, overflow: "hidden", fontFamily: FONT }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #fce8e8", background: "#fef2f2", display: "flex", alignItems: "center", gap: 8 }}>
          <Trash2 size={15} style={{ color: MAROON }} />
          <span style={{ fontSize: 14, fontWeight: 900, color: MAROON }}>Delete Form</span>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: 0 }}>
            Are you sure you want to delete <strong>&ldquo;{title}&rdquo;</strong>? This cannot be undone.
          </p>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onCancel} disabled={deleting} style={{ height: 36, padding: "0 16px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", background: "#fff" }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{ height: 36, padding: "0 16px", borderRadius: 10, fontSize: 13, fontWeight: 900, color: "#fff", cursor: "pointer", background: MAROON, border: "none", opacity: deleting ? 0.6 : 1 }}>
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
      <div className="border-t-4 border-gray-200 pt-4 mt-6 first:mt-0" style={{ borderTopColor: MAROON }}>
        <p className="text-sm font-bold text-gray-800">{q.sectionTitle || "Section"}</p>
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
            {q.required && <span className="ml-1 text-red-500">*</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-gray-400 capitalize">{q.type.replace(/_/g, " ")}</span>
          {q.points > 0 && (
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
              <span className="text-gray-400">◉</span> {opt}
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

  // Active tab in detail
  const [activeTab, setActiveTab] = useState<"overview" | "questions" | "responses">("overview");
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!showDotMenu) return;
    const h = (e: MouseEvent) => { if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node)) setShowDotMenu(false); };
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
    const isoToDate = (iso: string | null) => {
      if (!iso) return "";
      // Kung date string na siya (YYYY-MM-DD), ibalik na lang directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
      return new Date(iso).toISOString().split("T")[0];
    };
    const isoToTime = (iso: string | null) => {
      if (!iso) return "11:59 PM";
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "11:59 PM";
      return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s/, " ");
    };
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
        assignTo:          resolvedIds,
        dueDate:           data.form.dueDate           ?? prev.dueDate,
        dueTime:           data.form.dueTime           ?? prev.dueTime,
        availableFrom:     data.form.availableFrom     ?? prev.availableFrom,
        availableFromTime: data.form.availableFromTime ?? prev.availableFromTime,
        availableUntil:    data.form.availableUntil    ?? prev.availableUntil,
        availableUntilTime: data.form.availableUntilTime ?? prev.availableUntilTime,
      } : null);
    }
    setSavingAssign(false); setShowAssignPanel(false);
  };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff", fontFamily: FONT }}>
      <style>{FORMDETAIL_CSS}</style>

      {/* Delete modal */}
      {showDeleteModal && (
        <DeleteFormModal title={form.title} onConfirm={handleDelete} onCancel={() => { setShowDeleteModal(false); setShowDotMenu(false); }} deleting={deleting} />
      )}

      {/* ── Unpublished banner ── */}
      {!isPublished && (
        <div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" style={{ flexShrink: 0 }}><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" /></svg>
          <p style={{ fontSize: 12, color: "#92400e", fontWeight: 500, margin: 0 }}>This form is <strong>unpublished</strong>. Respondents cannot see it until published.</p>
        </div>
      )}
      {isPublished && form.availableFrom && new Date() < new Date(form.availableFrom) && (
        <div style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#3b82f6" style={{ flexShrink: 0 }}><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
          <p style={{ fontSize: 12, color: "#1e40af", fontWeight: 500, margin: 0 }}>Published but responses open {fmtDate(form.availableFrom)}.</p>
        </div>
      )}

      {/* ── Top action bar ── */}
      <div className="fd-top-bar-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb", padding: "0 8px 0 12px", background: "#fff", flexShrink: 0, flexWrap: "wrap", gap: 0, minHeight: 48 }}>
        {/* Tabs */}
        <div className="fd-tabs-row" style={{ display: "flex", alignItems: "flex-end" }}>
          {(["overview", "questions", "responses"] as const).map(key => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ padding: "10px 12px", fontSize: 13, marginBottom: -1, marginRight: 2, borderRadius: "6px 6px 0 0", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", textTransform: "capitalize", transition: "all 0.15s",
                border: activeTab === key ? "1px solid #e5e7eb" : "1px solid transparent",
                borderBottom: activeTab === key ? "1px solid #fff" : "1px solid transparent",
                background: activeTab === key ? "#fff" : "transparent",
                color: activeTab === key ? "#111827" : "#6b7280",
                fontWeight: activeTab === key ? 600 : 400 }}>
              {key === "questions" ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Questions
                  {qCount > 0 && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", fontSize: 10, color: "#fff", background: MAROON }}>{qCount}</span>}
                </span>
              ) : key === "responses" ? "After Submission" : "Overview"}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="fd-tab-actions-wrap" style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", padding: "6px 0" }}>
          <button onClick={togglePublish} disabled={publishing}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", opacity: publishing ? 0.6 : 1, border: "1px solid",
              background: isPublished ? "#f0fdf4" : "#f9fafb",
              color: isPublished ? "#15803d" : "#6b7280",
              borderColor: isPublished ? "#bbf7d0" : "#e5e7eb" }}>
            {isPublished ? <CheckCircle size={13} style={{ color: "#15803d" }} /> : <Circle size={13} />}
            <span className="fd-action-label">{isPublished ? "Published" : "Unpublished"}</span>
          </button>
          <button onClick={openAssignPanel}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", border: "1px solid #e5e7eb", background: "#fff", color: "#374151" }}>
            <Users size={13} /><span className="fd-action-label">Assign</span>
          </button>
          <button onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}/edit`)}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", border: "1px solid #e5e7eb", background: "#fff", color: "#374151" }}>
            <Pencil size={13} /><span className="fd-action-label">Edit</span>
          </button>
          <div style={{ position: "relative" }} ref={dotMenuRef}>
            <button onClick={() => setShowDotMenu(p => !p)}
              style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", background: "#fff", color: "#6b7280" }}>
              <MoreVertical size={15} />
            </button>
            {showDotMenu && (() => {
  const rect = dotMenuRef.current?.querySelector("button")?.getBoundingClientRect();
  const top = rect ? Math.min(rect.bottom + 4, window.innerHeight - 80) : 100;
  const right = rect ? window.innerWidth - rect.right : 8;
  return (
    <div style={{ position: "fixed", right, top, width: 180, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 9999, overflow: "hidden", padding: "4px 0" }}>
      <button onClick={() => { setShowDotMenu(false); setShowDeleteModal(true); }}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#ef4444", cursor: "pointer", background: "none", border: "none", textAlign: "left" }}>
        <Trash2 size={13} /> Delete Form
      </button>
    </div>
  );
})()}
          </div>
        </div>
      </div>

       <div className="fd-overview-layout" style={activeTab !== "overview" ? { display: "flex", flex: 1, overflow: "hidden" } : undefined}>

        {/* ── Main content ── */}
        <div className={activeTab === "overview" ? "fd-overview-main" : "flex-1 overflow-y-auto px-4 sm:px-8 py-6"}>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>

              {/* Hero */}
              <div className="fd-hero" style={{ background: `linear-gradient(135deg, ${typeColors[form.formType] ?? MAROON} 0%, ${MAROON} 100%)`, borderRadius: 12, padding: "12px 14px", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", flexWrap: "wrap" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText size={16} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ fontSize: 15, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.01em", lineHeight: 1.25, wordBreak: "break-word" }}>{form.title}</h1>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 3 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.85)", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {form.formType}
                      </span>
                      {creator && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.75)" }}>{creator.name}{creator.courseRole ? ` · ${creator.courseRole}` : ""}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.12)", borderRadius: 20, padding: "4px 9px", flexShrink: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: availability.statusColor }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>{availability.statusLabel}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {form.description && (
                <div style={{ background: "#fff", border: "1px solid #f0e4e4", borderLeft: `3px solid ${typeColors[form.formType] ?? MAROON}`, borderRadius: "0 10px 10px 0", padding: "10px 12px" }}>
                  <p style={{ fontSize: 9, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 5px" }}>Description</p>
                  <div className="fd-desc" dangerouslySetInnerHTML={{ __html: form.description }} />
                </div>
              )}

              {/* Stats */}
              <div className="fd-stats-grid">
                {[
                  { label: "Questions", value: qCount, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
                  { label: "Status", value: isPublished ? "Published" : "Draft", color: isPublished ? "#15803d" : "#9ca3af", bg: isPublished ? "#f0fdf4" : "#f9fafb", border: isPublished ? "#bbf7d0" : "#e5e7eb" },
                  { label: "Can Respond", value: availability.canRespond ? "Yes" : "No", color: availability.canRespond ? "#15803d" : MAROON, bg: availability.canRespond ? "#f0fdf4" : "#fef2f2", border: availability.canRespond ? "#bbf7d0" : "#f0c0c0" },
                  { label: "For", value: forLabel, color: "#374151", bg: "#f9fafb", border: "#e5e7eb" },
                ].map(stat => (
                  <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: 9, padding: "8px 4px", textAlign: "center", overflow: "hidden" }}>
                    <p style={{ fontSize: "clamp(11px, 2.5vw, 15px)", fontWeight: 900, color: stat.color, margin: 0, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stat.value}</p>
                    <p style={{ fontSize: "clamp(7.5px, 1.2vw, 10px)", fontWeight: 800, color: stat.color, textTransform: "uppercase", letterSpacing: "0.05em", margin: "3px 0 0" }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Details + Schedule — merged card */}
              <div style={{ background: "#fff", border: "1px solid #f0e4e4", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "8px 12px", background: "linear-gradient(90deg,#fef2f2,#fff)", borderBottom: "1px solid #fce8e8" }}>
                  <p style={{ fontSize: 9, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Details &amp; Schedule</p>
                </div>
                <div className="fd-detail-card-body" style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px" }}>
                  {([
                    ["Type", form.formType],
                    ["Due", fmtDate(form.dueDate)],
                    ["Assigned To", forLabel],
                    ["Available From", fmtDate(form.availableFrom)],
                    ["Status", isPublished ? "Published" : "Unpublished"],
                    ["Until", fmtDate(form.availableUntil)],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k}>
                      <p style={{ fontSize: 8.5, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>{k}</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Mobile Quick Links ── */}
              {isMobile && (
                <div style={{ background: "#fff", border: "1px solid #f0e4e4", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "8px 12px", background: "linear-gradient(90deg,#fef2f2,#fff)", borderBottom: "1px solid #fce8e8" }}>
                    <p style={{ fontSize: 9, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Quick Links</p>
                  </div>
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <button
                      onClick={() => setActiveTab("questions")}
                      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                    >
                      <FileText size={14} />
                      View Questions
                      {qCount > 0 && <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>({qCount})</span>}
                    </button>
                    <button
                      onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}/responses`)}
                      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                    >
                      <FileText size={14} />
                      View Responses
                    </button>
                    <button
                      onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}/edit`)}
                      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                    >
                      <Pencil size={14} />
                      Edit Form
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── QUESTIONS TAB ── */}
          {activeTab === "questions" && (
            <div className="max-w-2xl space-y-3">
              {form.questions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                  <div className="text-3xl mb-3">📋</div>
                  <p className="text-sm text-gray-400 mb-3">No questions yet.</p>
                  <button onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}/edit`)}
                    className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
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

          {/* ── RESPONSES TAB ── */}
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
                    {form.allowMultipleResponses ? <Check size={13} className="text-green-500" /> : <X size={13} className="text-gray-300" />}
                    Allow multiple responses
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        {activeTab === "overview" && (
          <div className="fd-overview-sidebar fd-sidebar">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", background: "#fdf2f2" }}>
              <p style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: MAROON, margin: 0 }}>Related Items</p>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => setActiveTab("questions")} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}><FileText size={13} /> View Questions</button>
              <button onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}/responses`)} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}><FileText size={13} /> View Responses</button>
              <button onClick={() => router.push(`/admin/courses/${courseId}/forms/${formId}/edit`)} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}><Pencil size={13} /> Edit Form</button>
            </div>
            <div style={{ padding: "14px 16px", borderTop: "1px solid #f3f4f6" }}>
              <p style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", margin: "0 0 8px" }}>Summary</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Questions</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: MAROON }}>{qCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Assign To Side Panel ── */}
      {showAssignPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowAssignPanel(false)} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-85 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col" style={{ fontFamily: FONT }}>
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
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded-xl z-200 max-h-48 overflow-y-auto">
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

                  {([["Due Date", "dueDate", "dueTime"], ["Available From", "availableFrom", "availableFromTime"], ["Until", "until", "untilTime"]] as const).map(([label, dateField, timeField]) => (
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