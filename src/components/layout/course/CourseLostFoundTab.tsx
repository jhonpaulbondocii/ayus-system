"use client";
// src/components/layout/course/CourseLostFoundTab.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Search, RefreshCw, ChevronDown, X, Plus, Check, Trash2, Pencil,
  AlertCircle, CheckCircle2, Inbox, PackageSearch, ArrowUpDown, MapPin,
} from "lucide-react";
import { FONT } from "./helpers";

/* ════════════════════════════════════════════════════════════════════════════
   1. DESIGN TOKENS (same as the Library / Violation Types tabs)
   ════════════════════════════════════════════════════════════════════════════ */

const C = {
  brand:     "#7b1113",
  brandTint: "#fdf2f2",
  brandRing: "rgba(123,17,19,0.12)",
  ink:       "#111827",
  body:      "#374151",
  muted:     "#6b7280",
  faint:     "#9ca3af",
  line:      "#e5e7eb",
  lineSoft:  "#f3f4f6",
  canvas:    "#ffffff",
  danger:    "#b91c1c",
} as const;

/* ════════════════════════════════════════════════════════════════════════════
   2. TYPES & STATIC META
   ════════════════════════════════════════════════════════════════════════════ */

const CATEGORIES = ["Electronics", "Clothing", "ID", "Bag", "Books", "Others"];
const STATUSES = ["UNCLAIMED", "CLAIMED", "TURNED_OVER"] as const;
type Status = typeof STATUSES[number];
type StatusTab = Status | "ALL";

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  UNCLAIMED:   { label: "Unclaimed",   color: "#92400e", bg: "#fef3c7" },
  CLAIMED:     { label: "Claimed",     color: "#166534", bg: "#dcfce7" },
  TURNED_OVER: { label: "Turned over", color: "#374151", bg: "#f3f4f6" },
};

const STATUS_TABS: StatusTab[] = ["ALL", "UNCLAIMED", "CLAIMED", "TURNED_OVER"];

interface LostFoundItem {
  id:             string;
  itemName:       string;
  description:    string | null;
  category:       string;
  dateFound:      string;
  locationFound:  string | null;
  foundBy:        string | null;
  status:         Status;
  claimerName:    string | null;
  claimedAt:      string | null;
  photoUrl:       string | null;
  createdAt:      string;
  recordedByUser: { id: string; name: string } | null;
}

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white placeholder:text-gray-400";
const selectCls =
  "w-full border border-gray-200 rounded-lg pl-3 pr-8 py-2.5 sm:py-2 text-sm outline-none appearance-none bg-white text-gray-700 focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function toLocalISO(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

/* ════════════════════════════════════════════════════════════════════════════
   3. SMALL UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status] ?? STATUS_META.TURNED_OVER;
  return (
    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  );
}

function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: C.brandTint }}>
        <Inbox className="w-6 h-6" style={{ color: C.brand }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: C.ink }}>{title}</p>
      {hint && <p className="text-xs max-w-xs" style={{ color: C.muted }}>{hint}</p>}
      {action}
    </div>
  );
}

type ToastState = { msg: string; tone: "success" | "error" } | null;

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const isErr = toast.tone === "error";
  return (
    <div role="status"
      className="fixed left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold text-white"
      style={{ background: isErr ? C.danger : C.ink, bottom: "calc(24px + env(safe-area-inset-bottom))", fontFamily: FONT }}>
      {isErr ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      {toast.msg}
    </div>
  );
}

function Thumb({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  if (!url) {
    return (
      <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: size, height: size, background: C.lineSoft }}>
        <PackageSearch size={size * 0.45} style={{ color: C.faint }} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className="rounded-lg object-cover border shrink-0" style={{ width: size, height: size, borderColor: C.line }} />
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   4. MODAL SHELL (bottom-sheet on mobile, centered on desktop)
   ════════════════════════════════════════════════════════════════════════════ */

function SheetModal({
  onClose, tone = "brand", icon, title, subtitle, children, footer,
  maxWidth = "max-w-md", zClass = "z-50",
}: {
  onClose: () => void; tone?: "brand" | "danger"; icon?: ReactNode;
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode;
  maxWidth?: string; zClass?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const accent = tone === "danger" ? C.danger : C.brand;

  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-end sm:items-center justify-center bg-black/40 pb-[60px] sm:pb-0`}
      style={{ backdropFilter: "blur(3px)", fontFamily: FONT }}
      onClick={onClose}
    >
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} sm:mx-4 overflow-hidden flex flex-col max-h-[92vh]`}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 shrink-0" style={{ background: accent, color: "#fff" }}>
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/20">{icon}</div>
            )}
            <div className="min-w-0">
              <p className="truncate" style={{ fontSize: 14, fontWeight: 800 }}>{title}</p>
              {subtitle && <p className="text-xs truncate text-white/70">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
        {footer && (
          <div className="border-t shrink-0 bg-gray-50" style={{ borderColor: C.line, paddingBottom: "env(safe-area-inset-bottom)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({
  title, message, confirmLabel, busy, onConfirm, onClose,
}: {
  title: string; message: ReactNode; confirmLabel: string;
  busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <SheetModal onClose={onClose} tone="danger" icon={<Trash2 size={16} />} title={title} maxWidth="max-w-sm" zClass="z-[60]"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={busy}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60" style={{ background: C.danger }}>
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      }>
      <div className="px-5 py-5 text-sm leading-relaxed" style={{ color: C.body }}>{message}</div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   5. ADD / EDIT MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function ItemFormModal({
  base, initial, onClose, onSaved,
}: {
  base: string; initial?: LostFoundItem; onClose: () => void; onSaved: (item: LostFoundItem) => void;
}) {
  const isEdit = !!initial;
  const [itemName,      setItemName]      = useState(initial?.itemName      ?? "");
  const [description,   setDescription]   = useState(initial?.description   ?? "");
  const [category,      setCategory]      = useState(initial?.category      ?? "Others");
  const [dateFound,     setDateFound]     = useState(initial ? toLocalISO(initial.dateFound) : toLocalISO(new Date()));
  const [locationFound, setLocationFound] = useState(initial?.locationFound ?? "");
  const [foundBy,       setFoundBy]       = useState(initial?.foundBy       ?? "");
  const [photoUrl,      setPhotoUrl]      = useState(initial?.photoUrl      ?? "");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  async function handleSave() {
    if (!itemName.trim()) { setError("Enter the item name."); return; }
    if (!dateFound)       { setError("Enter the date found."); return; }
    setSaving(true); setError("");
    try {
      const url    = isEdit ? `${base}/lost-found/${initial!.id}` : `${base}/lost-found`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName:      itemName.trim(),
          description:   description.trim()   || null,
          category,
          dateFound,
          locationFound: locationFound.trim() || null,
          foundBy:       foundBy.trim()       || null,
          photoUrl:      photoUrl.trim()      || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      onSaved(data.item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetModal
      onClose={() => { if (!saving) onClose(); }}
      maxWidth="max-w-lg" zClass="z-[60]"
      icon={<PackageSearch size={16} />}
      title={isEdit ? "Edit item" : "Log found item"}
      subtitle="Lost & Found"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={saving}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: C.brand }}>
            {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Check size={13} /> {isEdit ? "Save changes" : "Log item"}</>}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div>
          <label className={labelCls}>Item name <span className="text-red-500">*</span></label>
          <input className={inputCls} value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Black wallet" autoFocus />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea className={`${inputCls} resize-y min-h-[72px]`} value={description}
            onChange={e => setDescription(e.target.value)} placeholder="Color, brand, marks, contents" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Category</label>
            <div className="relative">
              <select className={selectCls} value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Date found <span className="text-red-500">*</span></label>
            <input type="date" className={inputCls} value={dateFound} onChange={e => setDateFound(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Location found</label>
          <input className={inputCls} value={locationFound} onChange={e => setLocationFound(e.target.value)} placeholder="e.g. Canteen, Room 201" />
        </div>

        <div>
          <label className={labelCls}>Found by</label>
          <input className={inputCls} value={foundBy} onChange={e => setFoundBy(e.target.value)} placeholder="Name of the person who turned it in" />
        </div>

        <div>
          <label className={labelCls}>Photo URL</label>
          <input className={inputCls} value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://…" />
        </div>
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   6. UPDATE STATUS MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function StatusModal({
  base, item, onClose, onSaved,
}: {
  base: string; item: LostFoundItem; onClose: () => void; onSaved: (item: LostFoundItem) => void;
}) {
  const [claimerName, setClaimerName] = useState(item.claimerName ?? "");
  const [status,      setStatus]      = useState<Status>(item.status === "UNCLAIMED" ? "CLAIMED" : item.status);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  async function handleSave() {
    if (status === "CLAIMED" && !claimerName.trim()) { setError("Enter the claimer’s name."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`${base}/lost-found/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          claimerName: status === "CLAIMED" ? claimerName.trim() : null,
          claimedAt:   status === "CLAIMED" ? new Date().toISOString() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to update status.");
      onSaved(data.item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetModal
      onClose={() => { if (!saving) onClose(); }}
      maxWidth="max-w-sm" zClass="z-[60]"
      icon={<Check size={16} />} title="Update status" subtitle={item.itemName}
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={saving}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: C.brand }}>
            {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Check size={13} /> Update</>}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div role="radiogroup" className="grid grid-cols-1 gap-2">
          {STATUSES.map(s => {
            const active = status === s;
            return (
              <button key={s} type="button" role="radio" aria-checked={active} onClick={() => setStatus(s)}
                className="rounded-xl border px-3.5 py-3 text-left transition-all flex items-center gap-3"
                style={active
                  ? { borderColor: C.brand, background: C.brandTint, boxShadow: `0 0 0 3px ${C.brandRing}` }
                  : { borderColor: C.line, background: "#fff" }}>
                <span className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                  style={{ borderColor: active ? C.brand : "#d1d5db" }}>
                  {active && <span className="w-2 h-2 rounded-full" style={{ background: C.brand }} />}
                </span>
                <span className="text-sm font-semibold" style={{ color: active ? C.brand : C.ink }}>{STATUS_META[s].label}</span>
              </button>
            );
          })}
        </div>

        {status === "CLAIMED" && (
          <div>
            <label className={labelCls}>Claimer name <span className="text-red-500">*</span></label>
            <input className={inputCls} value={claimerName} onChange={e => setClaimerName(e.target.value)} placeholder="Full name of the claimer" />
          </div>
        )}
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   7. DETAIL MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px]" style={{ color: C.muted }}>{label}</p>
      <p className="text-[13px] font-semibold mt-0.5 break-words" style={{ color: C.ink }}>{value || "—"}</p>
    </div>
  );
}

function ItemDetailModal({
  item, isHead, onClose, onEdit, onStatus, onDelete,
}: {
  item: LostFoundItem; isHead: boolean; onClose: () => void;
  onEdit: () => void; onStatus: () => void; onDelete: () => void;
}) {
  return (
    <SheetModal
      onClose={onClose} maxWidth="max-w-lg"
      icon={<PackageSearch size={16} />} title="Item details" subtitle={item.category}
      footer={isHead ? (
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onDelete} aria-label="Delete item"
            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-red-100 bg-white text-red-600 hover:bg-red-50">
            <Trash2 size={14} />
          </button>
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
            <Pencil size={13} /> Edit
          </button>
          <button onClick={onStatus}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold text-white"
            style={{ background: C.brand }}>
            <Check size={13} /> Update status
          </button>
        </div>
      ) : undefined}
    >
      <div className="px-5 py-5 space-y-5">
        {item.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photoUrl} alt={item.itemName} className="w-full max-h-52 object-cover rounded-xl border" style={{ borderColor: C.line }} />
        )}

        <div className="flex items-start gap-3">
          <h3 className="text-base font-bold flex-1 leading-snug" style={{ color: C.ink }}>{item.itemName}</h3>
          <StatusBadge status={item.status} />
        </div>

        {item.description && (
          <div className="rounded-xl border px-4 py-3 text-[13px] leading-relaxed" style={{ background: "#fafafa", borderColor: C.line, color: C.body }}>
            {item.description}
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <DetailRow label="Date found" value={fmtDate(item.dateFound)} />
          <DetailRow label="Location"   value={item.locationFound} />
          <DetailRow label="Found by"   value={item.foundBy} />
          <DetailRow label="Category"   value={item.category} />
        </div>

        {item.status === "CLAIMED" && (
          <div className="rounded-xl border px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-3" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <DetailRow label="Claimed by" value={item.claimerName} />
            <DetailRow label="Claimed on" value={fmtDate(item.claimedAt)} />
          </div>
        )}

        <div className="border-t pt-4 grid grid-cols-2 gap-x-4 gap-y-3" style={{ borderColor: C.lineSoft }}>
          <DetailRow label="Logged by" value={item.recordedByUser?.name} />
          <DetailRow label="Logged on" value={fmtDate(item.createdAt)} />
        </div>
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   8. MAIN TAB (default export)
   ════════════════════════════════════════════════════════════════════════════ */

export default function CourseLostFoundTab({ courseId, isHead }: { courseId: string; isHead: boolean }) {
  const base = `/api/courses/${courseId}/osa`;

  const [items,    setItems]    = useState<LostFoundItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [q,        setQ]        = useState("");
  const [tab,      setTab]      = useState<StatusTab>("ALL");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [sortDir,  setSortDir]  = useState<"desc" | "asc">("desc");

  const [showForm,     setShowForm]     = useState(false);
  const [openItem,     setOpenItem]     = useState<LostFoundItem | null>(null);
  const [editTarget,   setEditTarget]   = useState<LostFoundItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<LostFoundItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LostFoundItem | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [toast,        setToast]        = useState<ToastState>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* Status is filtered on the client (via tabs) so every tab can show an accurate count. */
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q",        q.trim());
      if (category) sp.set("category", category);
      if (dateFrom) sp.set("dateFrom", dateFrom);
      if (dateTo)   sp.set("dateTo",   dateTo);
      const res  = await fetch(`${base}/lost-found?${sp.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load items.");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load items.");
    } finally {
      setLoading(false);
    }
  }, [base, q, category, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${base}/lost-found/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn’t delete the item.");
      }
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
      setDeleteTarget(null);
      setOpenItem(null);
      notify("Item deleted");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Couldn’t delete the item.", "error");
    } finally {
      setDeleting(false);
    }
  }

  const counts = useMemo(() => {
    const c: Record<StatusTab, number> = { ALL: items.length, UNCLAIMED: 0, CLAIMED: 0, TURNED_OVER: 0 };
    items.forEach(i => { if (c[i.status] !== undefined) c[i.status] += 1; });
    return c;
  }, [items]);

  const displayed = useMemo(() => {
    const list = tab === "ALL" ? [...items] : items.filter(i => i.status === tab);
    list.sort((a, b) => {
      const diff = new Date(a.dateFound).getTime() - new Date(b.dateFound).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
    return list;
  }, [items, tab, sortDir]);

  const hasFilter = !!(q || category || dateFrom || dateTo || tab !== "ALL");
  const resetAll = () => { setQ(""); setCategory(""); setDateFrom(""); setDateTo(""); setTab("ALL"); };

  const presets = [
    { label: "Today",      fn: () => { const d = toLocalISO(new Date()); setDateFrom(d); setDateTo(d); } },
    { label: "This week",  fn: () => { const x = new Date(); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); setDateFrom(toLocalISO(x)); setDateTo(toLocalISO(new Date())); } },
    { label: "This month", fn: () => { const n = new Date(); setDateFrom(toLocalISO(new Date(n.getFullYear(), n.getMonth(), 1))); setDateTo(toLocalISO(n)); } },
  ];

  const emptyState = items.length === 0 && !q && !category && !dateFrom && !dateTo ? (
    <EmptyState
      title="No items logged yet"
      hint={isHead ? "Log the first found item so students can claim it." : "Found items will appear here once they’re logged."}
      action={isHead ? (
        <button onClick={() => setShowForm(true)}
          className="mt-2 flex items-center gap-1.5 text-xs font-bold px-4 h-9 rounded-lg text-white" style={{ background: C.brand }}>
          <Plus size={13} /> Log item
        </button>
      ) : undefined}
    />
  ) : (
    <EmptyState
      title={tab === "UNCLAIMED" && counts.UNCLAIMED === 0 && !q ? "Nothing left unclaimed" : "No matching items"}
      hint={tab === "UNCLAIMED" && counts.UNCLAIMED === 0 && !q ? "All logged items have been claimed or turned over." : "Try a different search, status, or date range."}
      action={
        hasFilter ? (
          <button onClick={resetAll} className="mt-2 text-xs font-bold hover:underline" style={{ color: C.brand }}>
            Clear all filters
          </button>
        ) : undefined
      }
    />
  );

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: C.canvas }}>

      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between shrink-0 gap-3" style={{ borderColor: C.line }}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Lost &amp; Found</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: C.faint }}>
            Track found items and see which ones are still waiting to be claimed.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={load} aria-label="Refresh"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 w-9 h-9 sm:w-auto sm:px-3 rounded-lg transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {isHead && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-9 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ background: C.brand }}>
              <Plus className="w-3.5 h-3.5" />
              <span>Log<span className="hidden sm:inline"> item</span></span>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5 min-h-0">

        <div className="flex-1 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[420px]" style={{ borderColor: C.line }}>

          {/* Status tabs */}
          <div className="border-b overflow-x-auto" style={{ borderColor: C.line }}>
            <div role="tablist" className="flex px-2 sm:px-3 min-w-max">
              {STATUS_TABS.map(t => {
                const active = tab === t;
                const highlight = t === "UNCLAIMED" && counts.UNCLAIMED > 0;
                return (
                  <button key={t} role="tab" aria-selected={active} onClick={() => setTab(t)}
                    className="relative flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors"
                    style={{ color: active ? C.brand : C.muted }}>
                    {t === "ALL" ? "All" : STATUS_META[t].label}
                    <span className="text-[11px] tabular-nums px-1.5 rounded-full"
                      style={{
                        background: active ? C.brandTint : highlight ? "#fef3c7" : C.lineSoft,
                        color: active ? C.brand : highlight ? "#92400e" : C.muted,
                      }}>
                      {counts[t]}
                    </span>
                    {active && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full" style={{ background: C.brand }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b flex flex-col gap-2.5" style={{ borderColor: C.lineSoft }}>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-9 flex-1 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-colors min-w-0">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Search item, location, or finder"
                  aria-label="Search items"
                  className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
                {q && (
                  <button onClick={() => setQ("")} aria-label="Clear search" className="text-gray-300 hover:text-gray-500 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="relative w-36 sm:w-44 shrink-0">
                <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Category"
                  className="w-full border border-gray-200 rounded-lg pl-3 pr-8 h-9 text-xs outline-none appearance-none bg-white text-gray-700 focus:border-gray-400">
                  <option value="">All categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold" style={{ color: C.muted }}>Found</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} aria-label="From date"
                className="border border-gray-200 rounded-lg px-2.5 h-8 text-xs outline-none bg-white text-gray-700 focus:border-gray-400" />
              <span className="text-[11px]" style={{ color: C.faint }}>to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} aria-label="To date"
                className="border border-gray-200 rounded-lg px-2.5 h-8 text-xs outline-none bg-white text-gray-700 focus:border-gray-400" />
              {presets.map(p => (
                <button key={p.label} onClick={p.fn}
                  className="h-8 px-2.5 text-[11px] font-semibold border border-gray-200 rounded-lg bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
                  {p.label}
                </button>
              ))}
              {hasFilter && (
                <button onClick={resetAll} className="text-xs font-bold hover:underline ml-auto" style={{ color: C.brand }}>
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading && items.length === 0 ? (
            <div className="animate-pulse divide-y divide-gray-100" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-10 w-10 bg-gray-100 rounded-lg" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                  <div className="h-5 w-20 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={load} className="text-xs font-bold px-4 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                Try again
              </button>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex-1">{emptyState}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop table */}
              <table className="w-full border-collapse hidden sm:table">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: "#fafafa" }}>
                    <th scope="col" className="text-left px-4 py-2.5 border-b" style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>Item</th>
                    <th scope="col" className="text-left px-4 py-2.5 border-b" style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>Category</th>
                    <th scope="col" className="text-left px-4 py-2.5 border-b whitespace-nowrap" style={{ borderColor: C.line }}>
                      <button onClick={() => setSortDir(d => (d === "desc" ? "asc" : "desc"))}
                        className="inline-flex items-center gap-1 hover:text-gray-900"
                        style={{ fontSize: 11, fontWeight: 800, color: C.body }}>
                        Date found <ArrowUpDown size={11} />
                      </button>
                    </th>
                    <th scope="col" className="text-left px-4 py-2.5 border-b" style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>Location</th>
                    <th scope="col" className="text-left px-4 py-2.5 border-b" style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>Found by</th>
                    <th scope="col" className="text-left px-4 py-2.5 border-b" style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(item => (
                    <tr key={item.id} onClick={() => setOpenItem(item)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 border-b align-middle min-w-[240px]" style={{ borderColor: C.lineSoft }}>
                        <div className="flex items-center gap-3">
                          <Thumb url={item.photoUrl} name={item.itemName} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold leading-snug" style={{ color: C.ink }}>{item.itemName}</p>
                            {item.description && (
                              <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: C.muted }}>{item.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs border-b align-middle whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>{item.category}</td>
                      <td className="px-4 py-3 text-xs border-b align-middle whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>{fmtDate(item.dateFound)}</td>
                      <td className="px-4 py-3 text-xs border-b align-middle" style={{ color: C.body, borderColor: C.lineSoft }}>{item.locationFound ?? "—"}</td>
                      <td className="px-4 py-3 text-xs border-b align-middle" style={{ color: C.body, borderColor: C.lineSoft }}>{item.foundBy ?? "—"}</td>
                      <td className="px-4 py-3 border-b align-middle" style={{ borderColor: C.lineSoft }}><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                <button onClick={() => setSortDir(d => (d === "desc" ? "asc" : "desc"))}
                  className="w-full flex items-center justify-end gap-1 px-4 py-2 text-[11px] font-semibold" style={{ color: C.muted }}>
                  <ArrowUpDown size={11} /> {sortDir === "desc" ? "Newest first" : "Oldest first"}
                </button>
                {displayed.map(item => (
                  <button key={item.id} onClick={() => setOpenItem(item)}
                    className="w-full text-left px-4 py-3.5 flex items-start gap-3 active:bg-gray-50">
                    <Thumb url={item.photoUrl} name={item.itemName} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold leading-snug" style={{ color: C.ink }}>{item.itemName}</p>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-xs mt-1" style={{ color: C.muted }}>
                        {item.category} · {fmtDate(item.dateFound)}
                      </p>
                      {item.locationFound && (
                        <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: C.muted }}>
                          <MapPin size={11} className="shrink-0" /> <span className="truncate">{item.locationFound}</span>
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer count */}
          {!loading && !error && displayed.length > 0 && (
            <div className="px-4 sm:px-5 py-3 border-t bg-white shrink-0" style={{ borderColor: C.line }}>
              <span className="text-xs tabular-nums" style={{ color: C.muted }}>
                Showing {displayed.length} of {items.length} item{items.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <ItemFormModal
          base={base}
          onClose={() => setShowForm(false)}
          onSaved={item => { setShowForm(false); setItems(prev => [item, ...prev]); notify("Item logged"); }}
        />
      )}

      {openItem && !editTarget && !statusTarget && !deleteTarget && (
        <ItemDetailModal
          item={openItem}
          isHead={isHead}
          onClose={() => setOpenItem(null)}
          onEdit={() => setEditTarget(openItem)}
          onStatus={() => setStatusTarget(openItem)}
          onDelete={() => setDeleteTarget(openItem)}
        />
      )}

      {editTarget && (
        <ItemFormModal
          base={base}
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); setOpenItem(null); load(); notify("Item updated"); }}
        />
      )}

      {statusTarget && (
        <StatusModal
          base={base}
          item={statusTarget}
          onClose={() => setStatusTarget(null)}
          onSaved={() => { setStatusTarget(null); setOpenItem(null); load(); notify("Status updated"); }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete this item?"
          confirmLabel="Delete"
          busy={deleting}
          message={<><strong>{deleteTarget.itemName}</strong><br />This can’t be undone.</>}
          onConfirm={confirmDelete}
          onClose={() => { if (!deleting) setDeleteTarget(null); }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}