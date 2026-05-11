"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Search, Plus, MoreVertical, X } from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

const FORM_TYPE_DISPLAY: Record<string, Form["formType"]> = {
  SURVEY_FEEDBACK: "Survey / Feedback",
  EVALUATION: "Evaluation",
  REGISTRATION_FORM: "Registration Form",
  GRADED_ASSESSMENT: "Graded Assessment",
  "Survey / Feedback": "Survey / Feedback",
  Evaluation: "Evaluation",
  "Registration Form": "Registration Form",
  "Graded Assessment": "Graded Assessment",
};

type RawForm = Omit<Form, "formType"> & { formType: string };

interface Form {
  id: string | number;
  title: string;
  description: string;
  formType: "Survey / Feedback" | "Evaluation" | "Registration Form" | "Graded Assessment";
  assignmentGroup: string;
  points: number;
  published: boolean;
  questions: { id: string; type: string; points: number }[];
  dueDate: string;
  createdAt: string;
  createdAtLabel: string;
  authorId?: string | null;
  authorName?: string;
  authorRole?: string;
  authorImage?: string | null;
  _isMine?: boolean;
  isCreator?: boolean;
}

interface Props {
  courseId: string;
  currentUserId?: string | null;
  currentUserName?: string | null;
}

const typeColors: Record<string, string> = {
  "Survey / Feedback": "#3b82f6",
  Evaluation: "#8b5cf6",
  "Registration Form": "#16a34a",
  "Graded Assessment": MAROON,
};

function normalizeForm(f: RawForm): Form {
  return { ...f, formType: FORM_TYPE_DISPLAY[f.formType as string] ?? "Survey / Feedback" };
}

function isMyForm(f: Form, userId?: string | null, userName?: string | null): boolean {
  if (f._isMine || f.isCreator) return true;
  if (userId && f.authorId) return String(f.authorId) === String(userId);
  if (!userId && userName && f.authorName)
    return f.authorName.trim().toLowerCase() === userName.trim().toLowerCase();
  return false;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function PublisherAvatar({
  name,
  image,
  size = 20,
}: {
  name?: string | null;
  image?: string | null;
  size?: number;
}) {
  const [imgErr, setImgErr] = useState(false);
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  if (image && !imgErr)
    return (
      <Image
        src={image}
        alt={name ?? ""}
        width={size}
        height={size}
        onError={() => setImgErr(true)}
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", flexShrink: 0, border: "1.5px solid #bfdbfe",
        }}
      />
    );
  return (
    <span
      style={{
        width: size, height: size, borderRadius: "50%", background: "#1d6fa4",
        color: "#fff", fontSize: size * 0.42, fontWeight: 700,
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}

function PublisherChip({
  name, image, role,
}: {
  name?: string | null; image?: string | null; role?: string | null;
}) {
  if (!name) return null;
  return (
    <span className="flex items-center gap-1 text-[11px] text-gray-500">
      <PublisherAvatar name={name} image={image} size={18} />
      <span className="truncate max-w-25">{name}</span>
      {role && (
        <span
          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
          style={{ background: "#eff6ff", color: "#1d6fa4", border: "1px solid #bfdbfe" }}
        >
          {role}
        </span>
      )}
    </span>
  );
}

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

// ── Publish toggle ────────────────────────────────────────────────────────────
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

// ── Row 3-dot menu ────────────────────────────────────────────────────────────
function FormRowMenu({
  formId,
  onView,
  onEdit,
  onDelete,
}: {
  formId: string | number;
  onView: (id: string | number) => void;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
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
    const w = 170, h = 110;
    const top = window.innerHeight - rect.bottom >= h ? rect.bottom + 4 : rect.top - h - 4;
    const left = Math.min(rect.right - w, window.innerWidth - w - 8);
    setStyle({
      position: "fixed", top, left, zIndex: 9999, background: "#fff",
      border: "1px solid #e5e7eb", borderRadius: 8,
      boxShadow: "0 4px 16px rgba(0,0,0,.12)", minWidth: w, overflow: "hidden",
    });
    setOpen(v => !v);
  };

  const menuItems = [
    {
      label: "View", icon: (
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ), action: () => { setOpen(false); onView(formId); },
    },
    {
      label: "Edit", icon: (
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ), action: () => { setOpen(false); onEdit(formId); },
    },
    {
      label: "Delete", danger: true, icon: (
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ), action: () => { setOpen(false); onDelete(formId); },
    },
  ];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
      >
        <MoreVertical size={16} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={style}>
          {menuItems.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={item.action}
              className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 ${
                item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
              }`}
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

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteFormModal({
  title,
  onClose,
  onConfirm,
  deleting,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full sm:max-w-105 border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ fontFamily: FONT }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-800">Delete Form</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100">
            <X size={14} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete <strong>&ldquo;{title}&rdquo;</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} disabled={deleting} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} className="h-9 px-4 text-sm text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: "#dc2626" }}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form Row ──────────────────────────────────────────────────────────────────
function FormRow({
  form,
  variant,
  onView,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  form: Form;
  variant: "mine" | "others";
  onView: (id: string | number) => void;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onTogglePublish: (id: string | number) => void;
}) {
  const accentColor = variant === "mine" ? MAROON : "#60a5fa";
  const qCount = form.questions?.filter(q => q.type !== "section").length ?? 0;

  return (
    <div
      className="flex items-start sm:items-center gap-3 px-3 sm:px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 relative"
      style={{ background: variant === "mine" ? "#fff" : "#fafcff" }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ background: accentColor }} />
      <div className="shrink-0 mt-0.5 sm:mt-0 pl-2">
        <PublishToggle published={form.published} onToggle={() => onTogglePublish(form.id)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3
            className="text-sm font-semibold cursor-pointer hover:underline truncate max-w-full"
            style={{ color: MAROON }}
            onClick={() => onView(form.id)}
          >
            {form.title}
          </h3>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium shrink-0"
            style={{ background: typeColors[form.formType] ?? MAROON }}
          >
            {form.formType}
          </span>
          {!form.published && (
            <span className="text-[10px] text-amber-600 font-medium">Not Published</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {variant === "others" && (
            <PublisherChip name={form.authorName} image={form.authorImage} role={form.authorRole} />
          )}
          {variant === "mine" && form.authorName && (
            <AuthorBadge name={form.authorName} role={form.authorRole ?? "Admin"} />
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            {form.formType === "Graded Assessment" && <span>{form.points} pts</span>}
            {qCount > 0 && <><span>•</span><span>{qCount} question{qCount !== 1 ? "s" : ""}</span></>}
            {form.dueDate && (
              <><span>•</span><span>Due: {new Date(form.dueDate).toLocaleDateString()}</span></>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0">
        <FormRowMenu formId={form.id} onView={onView} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

// ── Others author section ─────────────────────────────────────────────────────
function OthersAuthorSection({
  authorName, authorRole, authorImage, items, onView, onEdit, onDelete, onTogglePublish,
}: {
  authorName: string; authorRole?: string | null; authorImage?: string | null; items: Form[];
  onView: (id: string | number) => void;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onTogglePublish: (id: string | number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-4">
      <div
        className="flex items-center gap-2 px-4 py-2.5 border select-none cursor-pointer"
        style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
        onClick={() => setCollapsed(c => !c)}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d6fa4" strokeWidth="2.5"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .15s", flexShrink: 0 }}
        >
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
        <div className="border border-t-0" style={{ borderColor: "#bfdbfe" }}>
          {items.map(f => (
            <FormRow key={f.id} form={f} variant="others" onView={onView} onEdit={onEdit} onDelete={onDelete} onTogglePublish={onTogglePublish} />
          ))}
        </div>
      )}
    </div>
  );
}

function OthersTypeSection({
  typeName, items, onView, onEdit, onDelete, onTogglePublish,
}: {
  typeName: string; items: Form[];
  onView: (id: string | number) => void;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onTogglePublish: (id: string | number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-4">
      <div
        className="flex items-center gap-2 px-4 py-2.5 border select-none cursor-pointer"
        style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}
        onClick={() => setCollapsed(c => !c)}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2.5"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .15s", flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium" style={{ background: typeColors[typeName] ?? MAROON }}>
          {typeName}
        </span>
        <span className="text-xs text-blue-400 ml-1">({items.length})</span>
      </div>
      {!collapsed && (
        <div className="border border-t-0" style={{ borderColor: "#bae6fd" }}>
          {items.map(f => (
            <FormRow key={f.id} form={f} variant="others" onView={onView} onEdit={onEdit} onDelete={onDelete} onTogglePublish={onTogglePublish} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminCourseFormsPage({ courseId, currentUserId, currentUserName }: Props) {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySearch, setMySearch] = useState("");
  const [othersSearch, setOthersSearch] = useState("");
  const [othersViewMode, setOthersViewMode] = useState<"author" | "type">("author");
  const [myExpanded, setMyExpanded] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Form | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  const loadForms = useCallback(() => {
    if (!courseId) return;
    fetch(`/api/admin/courses/${courseId}/forms`)
      .then(r => r.json())
      .then(d => setForms((d.forms ?? []).map(normalizeForm)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => { loadForms(); }, [loadForms]);

  const myForms = forms.filter(f => isMyForm(f, resolvedUserId, resolvedUserName));
  const otherForms = forms.filter(f => !isMyForm(f, resolvedUserId, resolvedUserName));
  const myFiltered = myForms.filter(f => f.title.toLowerCase().includes(mySearch.toLowerCase()));
  const othersFiltered = otherForms.filter(f => f.title.toLowerCase().includes(othersSearch.toLowerCase()));

  const othersByAuthor: Record<string, { role?: string | null; image?: string | null; items: Form[] }> = {};
  for (const f of othersFiltered) {
    const a = f.authorName ?? "Unknown";
    if (!othersByAuthor[a]) othersByAuthor[a] = { role: f.authorRole, image: f.authorImage, items: [] };
    othersByAuthor[a].items.push(f);
  }

  const othersByType: Record<string, Form[]> = {};
  for (const f of othersFiltered) {
    const t = f.formType || "Other";
    if (!othersByType[t]) othersByType[t] = [];
    othersByType[t].push(f);
  }

  const handleView = (id: string | number) =>
    router.push(`/admin/courses/${courseId}/forms/${id}`);

  const handleEdit = (id: string | number) =>
    router.push(`/admin/courses/${courseId}/forms/${id}/edit`);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/courses/${courseId}/forms/${deleteTarget.id}`, { method: "DELETE" });
      setForms(prev => prev.filter(f => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  const handleTogglePublish = async (id: string | number) => {
    const form = forms.find(f => f.id === id);
    if (!form) return;
    setForms(prev => prev.map(f => f.id === id ? { ...f, published: !f.published } : f));
    await fetch(`/api/admin/courses/${courseId}/forms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !form.published }),
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-2" style={{ fontFamily: FONT }}>
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading forms...
      </div>
    );
  }

  return (
    <div className="bg-white" style={{ fontFamily: FONT }}>

      {/* ── SECTION 1: Published by You ── */}
      <div
        className="flex items-center gap-2 px-4 sm:px-8 py-2.5 border-b"
        style={{ color: MAROON, background: "#fef2f2", borderColor: "#f0c0c0" }}
      >
        <span className="text-xs font-extrabold tracking-widest uppercase">Published by You</span>
      </div>

      <div className="flex items-center justify-between px-3 sm:px-8 py-3 border-b border-gray-100 gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={mySearch}
            onChange={e => setMySearch(e.target.value)}
            placeholder="Search your forms..."
            className="pl-9 pr-4 py-1.5 border rounded text-sm w-44 sm:w-56 focus:outline-none"
            style={{ borderColor: "#d1d5db" }}
          />
        </div>
        <button
          onClick={() => router.push(`/admin/courses/${courseId}/forms/new`)}
          style={{ background: MAROON }}
          className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-white rounded-lg hover:opacity-90"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Form</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      <div className="px-3 sm:px-5 py-4 border-b-2 border-gray-200">
        <div className="border border-gray-200 rounded overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-100"
            onClick={() => setMyExpanded(v => !v)}
          >
            <span className="text-xs text-gray-500">{myExpanded ? "▾" : "▸"}</span>
            <span className="text-sm font-medium text-gray-700">My Forms</span>
            {myForms.length > 0 && <span className="text-xs text-gray-400 ml-1">({myForms.length})</span>}
          </div>
          {myExpanded && (
            <div>
              {myFiltered.length === 0 && myForms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <p className="text-sm text-gray-400">No forms published by you yet.</p>
                  <button
                    onClick={() => router.push(`/admin/courses/${courseId}/forms/new`)}
                    className="text-xs font-bold hover:underline"
                    style={{ color: MAROON }}
                  >
                    + Create your first form
                  </button>
                </div>
              ) : myFiltered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No results for &ldquo;{mySearch}&rdquo;</p>
              ) : (
                myFiltered.map(f => (
                  <FormRow key={f.id} form={f} variant="mine"
                    onView={handleView} onEdit={handleEdit}
                    onDelete={id => setDeleteTarget(forms.find(x => x.id === id) ?? null)}
                    onTogglePublish={handleTogglePublish}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2: Published by Others ── */}
      <div
        className="flex items-center gap-2 px-4 sm:px-8 py-2.5 border-b border-t"
        style={{ color: "#1d6fa4", background: "#eff6ff", borderColor: "#bfdbfe" }}
      >
        <span className="text-xs font-extrabold tracking-widest uppercase" style={{ color: "#1d6fa4" }}>
          Published by Others
        </span>
        {otherForms.length > 0 && (
          <span className="ml-1 font-normal normal-case text-blue-400 text-xs">({otherForms.length})</span>
        )}
      </div>

      <div className="flex items-center justify-between px-3 sm:px-8 py-3 border-b border-gray-100 gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={othersSearch}
            onChange={e => setOthersSearch(e.target.value)}
            placeholder="Search others' forms..."
            className="pl-9 pr-4 py-1.5 border rounded text-sm w-44 sm:w-56 focus:outline-none"
            style={{ borderColor: "#d1d5db" }}
          />
        </div>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          {(["author", "type"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setOthersViewMode(mode)}
              className="px-3 py-1.5 text-xs font-bold border-none transition-colors whitespace-nowrap capitalize"
              style={othersViewMode === mode ? { background: MAROON, color: "#fff" } : { background: "transparent", color: "#6b7280" }}
            >
              By {mode === "type" ? "Type" : "Author"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 sm:px-5 py-4">
        {otherForms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-sm text-gray-400">No forms published by others yet.</p>
          </div>
        ) : othersFiltered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No results for &ldquo;{othersSearch}&rdquo;</p>
        ) : othersViewMode === "author" ? (
          Object.entries(othersByAuthor).map(([author, { role, image, items }]) => (
            <OthersAuthorSection key={author} authorName={author} authorRole={role} authorImage={image}
              items={items} onView={handleView} onEdit={handleEdit}
              onDelete={id => setDeleteTarget(forms.find(x => x.id === id) ?? null)}
              onTogglePublish={handleTogglePublish}
            />
          ))
        ) : (
          Object.entries(othersByType).map(([typeName, items]) => (
            <OthersTypeSection key={typeName} typeName={typeName} items={items}
              onView={handleView} onEdit={handleEdit}
              onDelete={id => setDeleteTarget(forms.find(x => x.id === id) ?? null)}
              onTogglePublish={handleTogglePublish}
            />
          ))
        )}
      </div>

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <DeleteFormModal
          title={deleteTarget.title}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}