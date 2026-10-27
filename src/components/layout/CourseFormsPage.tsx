"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
  published: boolean;
  questions: { id: string; type: string }[];
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

function fmtDueShort(d?: string) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL CSS
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
   SMALL PIECES
───────────────────────────────────────────────────────────────────────────── */
function PublisherAvatar({ name, image, size = 20 }: { name?: string | null; image?: string | null; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  if (image && !imgErr)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={name ?? "Publisher"} width={size} height={size} onError={() => setImgErr(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid #bfdbfe" }} />
    );
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

function TypeChip({ type }: { type: string }) {
  return (
    <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 9.5, fontWeight: 700, color: "#fff", background: typeColors[type] ?? MAROON, flexShrink: 0, whiteSpace: "nowrap" }}>
      {type}
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

function FormIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ flexShrink: 0 }}>
      <rect x="4" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "7px 12px" }}>
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af" }}>{children}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL SHELL + DELETE MODAL
───────────────────────────────────────────────────────────────────────────── */
function ModalShell({ onClose, children, maxWidth = 420 }: { onClose: () => void; children: React.ReactNode; maxWidth?: number }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="cal-modal-overlay"
      style={{ position: "fixed", inset: 0, zIndex: 9500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.36)", fontFamily: FONT }}
      onClick={onClose}>
      <div className="cal-modal-box"
        style={{ background: "#fff", width: "100%", maxWidth, boxShadow: "0 24px 60px rgba(0,0,0,0.18)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh", animation: "slideUp 0.2s ease" }}
        onClick={e => e.stopPropagation()}>
        <div className="sm:hidden" style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>
        {children}
      </div>
    </div>
  );
}

function DeleteFormModal({ title, onClose, onConfirm, deleting }: { title: string; onClose: () => void; onConfirm: () => void; deleting: boolean }) {
  return (
    <ModalShell onClose={onClose} maxWidth={400}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e5e7eb", background: MAROON, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Delete Form</span>
        <button onClick={onClose} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 7, background: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)" }}>
          <X size={13} />
        </button>
      </div>
      <div style={{ padding: "18px", flex: 1 }}>
        <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: 0 }}>
          Are you sure you want to delete <strong>&ldquo;{title}&rdquo;</strong>? This action cannot be undone.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "12px 18px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
        <button type="button" onClick={onClose} disabled={deleting}
          style={{ height: 36, padding: "0 14px", fontFamily: FONT, fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid #d1d5db", color: "#374151", background: "#fff", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.5 : 1 }}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={deleting}
          style={{ height: 36, padding: "0 18px", fontFamily: FONT, fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", color: "#fff", background: "#dc2626", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROW 3-DOT MENU
───────────────────────────────────────────────────────────────────────────── */
function FormRowMenu({ formId, onView, onEdit, onDelete }: {
  formId: string | number;
  onView: (id: string | number) => void;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const w = 170, h = 3 * 44 + 8;
    const top = window.innerHeight - rect.bottom >= h ? rect.bottom + 4 : rect.top - h - 4;
    const left = Math.min(rect.right - w, window.innerWidth - w - 8);
    setMenuStyle({ position: "fixed", top: Math.max(8, top), left: Math.max(8, left), zIndex: 9999, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.14)", minWidth: w, overflow: "hidden" });
    setOpen(v => !v);
  };

  const items = [
    { label: "View", danger: false, action: () => onView(formId), icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> },
    { label: "Edit", danger: false, action: () => onEdit(formId), icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" /></svg> },
    { label: "Delete", danger: true, action: () => onDelete(formId), icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" strokeLinecap="round" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" /><path d="M10 11v6M14 11v6" strokeLinecap="round" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" /></svg> },
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
          {items.map((item, i) => (
            <button key={item.label} type="button" onClick={() => { setOpen(false); item.action(); }}
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
   FORM ROW
───────────────────────────────────────────────────────────────────────────── */
function FormRow({ form, variant, onView, onEdit, onDelete, onTogglePublish }: {
  form: Form; variant: "mine" | "others";
  onView: (id: string | number) => void;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onTogglePublish: (id: string | number) => void;
}) {
  const isMine = variant === "mine";
  const baseBg = isMine ? "#fff" : "#fafcff";
  const hoverBg = isMine ? "#fdf8f8" : "#eff6ff";
  const qCount = form.questions?.filter(q => q.type !== "section").length ?? 0;
  const due = fmtDueShort(form.dueDate);

  return (
    <div
      style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "9px 8px 9px 12px", background: baseBg, borderBottom: "1px solid #f3f4f6", cursor: "pointer", position: "relative", transition: "background 0.1s" }}
      onClick={() => onView(form.id)}
      onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
      onMouseLeave={e => (e.currentTarget.style.background = baseBg)}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "0 2px 2px 0", background: isMine ? MAROON : "#60a5fa" }} />
      <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
        <PublishToggle published={form.published} onToggle={() => onTogglePublish(form.id)} />
      </div>
      <div style={{ flexShrink: 0, marginTop: 2 }}><FormIcon /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap", marginBottom: 3 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: isMine ? MAROON : "#1d4ed8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{form.title}</span>
          <TypeChip type={form.formType} />
          {qCount > 0 && <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, flexShrink: 0 }}>· {qCount} question{qCount !== 1 ? "s" : ""}</span>}
          {!form.published && <span style={{ fontSize: 10, color: "#d97706", fontWeight: 600, flexShrink: 0 }}>Not Published</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {isMine
            ? (form.authorName && <AuthorBadge name={form.authorName} role={form.authorRole ?? "Admin"} />)
            : <PublisherChip name={form.authorName} image={form.authorImage} role={form.authorRole} />}
          {due && <span style={{ fontSize: 11, color: "#6b7280" }}>Due: {due}</span>}
        </div>
      </div>
      <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, marginLeft: 2 }}>
        <FormRowMenu formId={form.id} onView={onView} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTIONS
───────────────────────────────────────────────────────────────────────────── */
function Chevron({ collapsed, color }: { collapsed: boolean; color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
      style={{ flexShrink: 0, transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function MineSection({ items, totalCount, onCreate, onView, onEdit, onDelete, onTogglePublish, emptyMessage }: {
  items: Form[]; totalCount: number; onCreate: () => void; emptyMessage: string;
  onView: (id: string | number) => void; onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void; onTogglePublish: (id: string | number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", border: "1px solid #ececec", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", background: "#f9fafb", borderBottom: collapsed ? "none" : "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", flex: 1, minWidth: 0 }} onClick={() => setCollapsed(c => !c)}>
          <Chevron collapsed={collapsed} color="#6b7280" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>My Forms</span>
          <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>({totalCount})</span>
        </div>
        <button onClick={onCreate}
          style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#9ca3af", touchAction: "manipulation" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#e5e7eb")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
          <Plus size={15} />
        </button>
      </div>
      {!collapsed && (
        <div>
          {items.length === 0
            ? <div style={{ padding: "16px", fontSize: 12, color: "#9ca3af", textAlign: "center" }}>{emptyMessage}</div>
            : items.map(f => <FormRow key={f.id} form={f} variant="mine" onView={onView} onEdit={onEdit} onDelete={onDelete} onTogglePublish={onTogglePublish} />)}
        </div>
      )}
    </div>
  );
}

function OthersAuthorSection({ authorName, authorRole, authorImage, items, onView, onEdit, onDelete, onTogglePublish }: {
  authorName: string; authorRole?: string | null; authorImage?: string | null; items: Form[];
  onView: (id: string | number) => void; onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void; onTogglePublish: (id: string | number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", border: "1px solid #bfdbfe", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
      <div onClick={() => setCollapsed(c => !c)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", background: "#eff6ff", borderBottom: collapsed ? "none" : "1px solid #bfdbfe", cursor: "pointer" }}>
        <Chevron collapsed={collapsed} color="#1d6fa4" />
        <PublisherAvatar name={authorName} image={authorImage} size={20} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>{authorName}</span>
        {authorRole && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", background: "#eff6ff", color: "#1d6fa4", border: "1px solid #bfdbfe", flexShrink: 0 }}>{authorRole}</span>}
        <span style={{ fontSize: 12, color: "#93c5fd", flexShrink: 0 }}>({items.length})</span>
      </div>
      {!collapsed && (
        <div>{items.map(f => <FormRow key={f.id} form={f} variant="others" onView={onView} onEdit={onEdit} onDelete={onDelete} onTogglePublish={onTogglePublish} />)}</div>
      )}
    </div>
  );
}

function OthersTypeSection({ typeName, items, onView, onEdit, onDelete, onTogglePublish }: {
  typeName: string; items: Form[];
  onView: (id: string | number) => void; onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void; onTogglePublish: (id: string | number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", border: "1px solid #bae6fd", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
      <div onClick={() => setCollapsed(c => !c)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", background: "#f0f9ff", borderBottom: collapsed ? "none" : "1px solid #bae6fd", cursor: "pointer" }}>
        <Chevron collapsed={collapsed} color="#0369a1" />
        <TypeChip type={typeName} />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "#7dd3fc", flexShrink: 0 }}>({items.length})</span>
      </div>
      {!collapsed && (
        <div>{items.map(f => <FormRow key={f.id} form={f} variant="others" onView={onView} onEdit={onEdit} onDelete={onDelete} onTogglePublish={onTogglePublish} />)}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════════ */
export default function AdminCourseFormsPage({ courseId, currentUserId, currentUserName }: Props) {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySearch, setMySearch] = useState("");
  const [othersSearch, setOthersSearch] = useState("");
  const [othersViewMode, setOthersViewMode] = useState<"author" | "type">("author");
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

  const goNew = () => router.push(`/admin/courses/${courseId}/forms/new`);
  const handleView = (id: string | number) => router.push(`/admin/courses/${courseId}/forms/${id}`);
  const handleEdit = (id: string | number) => router.push(`/admin/courses/${courseId}/forms/${id}/edit`);
  const askDelete = (id: string | number) => setDeleteTarget(forms.find(x => x.id === id) ?? null);

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
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/forms/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !form.published }),
      });
      if (!res.ok) setForms(prev => prev.map(f => f.id === id ? { ...f, published: form.published } : f));
    } catch {
      setForms(prev => prev.map(f => f.id === id ? { ...f, published: form.published } : f));
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "#9ca3af", fontSize: 13, gap: 8, fontFamily: FONT }}>
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading forms...
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", fontFamily: FONT }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── SECTION 1: Published by You ── */}
      <SectionLabel>Published by You</SectionLabel>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1px solid #f3f4f6", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
          <input value={mySearch} onChange={e => setMySearch(e.target.value)} placeholder="Search your forms…"
            style={{ width: "100%", height: 34, border: "1px solid #e5e7eb", borderRadius: 8, paddingLeft: 30, paddingRight: 10, fontFamily: FONT, fontSize: 12.5, color: "#374151", background: "#fafafa", outline: "none" }} />
        </div>
        <button onClick={goNew}
          style={{ display: "flex", alignItems: "center", gap: 4, height: 34, padding: "0 12px", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, border: "none", borderRadius: 8, background: MAROON, color: "#fff", cursor: "pointer", touchAction: "manipulation", flexShrink: 0 }}>
          <Plus size={13} /><span>New</span>
        </button>
      </div>

      <div style={{ padding: "10px 10px 4px" }}>
        {myFiltered.length === 0 && mySearch ? (
          <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>No results for &ldquo;{mySearch}&rdquo;</div>
        ) : (
          <MineSection items={myFiltered} totalCount={myForms.length} onCreate={goNew}
            emptyMessage="No forms published by you yet."
            onView={handleView} onEdit={handleEdit} onDelete={askDelete} onTogglePublish={handleTogglePublish} />
        )}
      </div>

      {/* ── SECTION 2: Published by Others ── */}
      <SectionLabel>
        Published by Others
        {otherForms.length > 0 && <span style={{ marginLeft: 6, fontWeight: 500, color: "#9ca3af", fontSize: 11 }}>({otherForms.length})</span>}
      </SectionLabel>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1px solid #f3f4f6", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
          <input value={othersSearch} onChange={e => setOthersSearch(e.target.value)} placeholder="Search others' forms…"
            style={{ width: "100%", height: 34, border: "1px solid #e5e7eb", borderRadius: 8, paddingLeft: 30, paddingRight: 10, fontFamily: FONT, fontSize: 12.5, color: "#374151", background: "#fafafa", outline: "none" }} />
        </div>
        <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
          {(["author", "type"] as const).map(mode => (
            <button key={mode} onClick={() => setOthersViewMode(mode)}
              style={{ padding: "0 12px", height: 34, fontFamily: FONT, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: othersViewMode === mode ? MAROON : "transparent", color: othersViewMode === mode ? "#fff" : "#6b7280", transition: "all 0.15s", touchAction: "manipulation" }}>
              {mode === "author" ? "By Author" : "By Type"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "10px 10px 20px" }}>
        {otherForms.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: 10 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>No forms published by others yet.</p>
          </div>
        ) : othersFiltered.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>No results for &ldquo;{othersSearch}&rdquo;</div>
        ) : othersViewMode === "author" ? (
          Object.entries(othersByAuthor).map(([author, { role, image, items }]) => (
            <OthersAuthorSection key={author} authorName={author} authorRole={role} authorImage={image} items={items}
              onView={handleView} onEdit={handleEdit} onDelete={askDelete} onTogglePublish={handleTogglePublish} />
          ))
        ) : (
          Object.entries(othersByType).map(([typeName, items]) => (
            <OthersTypeSection key={typeName} typeName={typeName} items={items}
              onView={handleView} onEdit={handleEdit} onDelete={askDelete} onTogglePublish={handleTogglePublish} />
          ))
        )}
      </div>

      {deleteTarget && (
        <DeleteFormModal title={deleteTarget.title} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} deleting={deleting} />
      )}
    </div>
  );
}