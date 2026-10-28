"use client";

// src/components/layout/course/CourseMedicineInventoryTab.tsx

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  Search, Plus, X, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  Trash2, Check, Pill, AlertTriangle, Package, MoreVertical, Pencil,
  AlertCircle, CheckCircle2, Inbox,
} from "lucide-react";
import { FONT } from "./osaShared";

/* ════════════════════════════════════════════════════════════════════════════
   1. DESIGN TOKENS (same as CourseLibraryTab)
   ════════════════════════════════════════════════════════════════════════════ */

const C = {
  brand:      "#7b1113",
  brandDark:  "#5e0d0f",
  brandTint:  "#fdf2f2",
  brandRing:  "rgba(123,17,19,0.12)",
  ink:        "#111827",
  body:       "#374151",
  muted:      "#6b7280",
  faint:      "#9ca3af",
  line:       "#e5e7eb",
  lineSoft:   "#f3f4f6",
  surface:    "#ffffff",
  canvas:     "#ffffff",
  danger:     "#b91c1c",
} as const;

const PAGE_SIZE = 15;

const UNIT_OPTIONS = [
  "tablet", "capsule", "ml", "bottle", "box", "sachet", "ampule", "patch", "piece",
];

/* ════════════════════════════════════════════════════════════════════════════
   2. TYPES & STATIC META
   ════════════════════════════════════════════════════════════════════════════ */

interface MedicineInventory {
  id:                string;
  name:              string;
  unit:              string;
  stockQty:          number;
  lowStockThreshold: number;
  notes:             string | null;
  createdAt:         string;
  updatedAt:         string;
}

interface Props {
  courseId: string;
  isAdmin:  boolean;
  isHead:   boolean;
}

type StockStatus = "IN_STOCK" | "LOW" | "OUT";

const STOCK_META: Record<StockStatus, { label: string; color: string; bg: string; icon: ReactNode }> = {
  IN_STOCK: { label: "In stock",     color: "#065f46", bg: "#d1fae5", icon: <Check size={11} /> },
  LOW:      { label: "Low stock",    color: "#92400e", bg: "#fef3c7", icon: <AlertTriangle size={11} /> },
  OUT:      { label: "Out of stock", color: "#991b1b", bg: "#fee2e2", icon: <AlertTriangle size={11} /> },
};

const STOCK_TABS: Array<StockStatus | "ALL"> = ["ALL", "IN_STOCK", "LOW", "OUT"];

function stockStatusOf(m: MedicineInventory): StockStatus {
  if (m.stockQty <= 0) return "OUT";
  if (m.stockQty <= m.lowStockThreshold) return "LOW";
  return "IN_STOCK";
}

/* ════════════════════════════════════════════════════════════════════════════
   3. HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const qtyColor = (m: MedicineInventory) =>
  m.stockQty <= 0 ? "#991b1b" : m.stockQty <= m.lowStockThreshold ? "#92400e" : C.ink;

/* ════════════════════════════════════════════════════════════════════════════
   4. SMALL UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════ */

function StockBadge({ status }: { status: StockStatus }) {
  const m = STOCK_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}
    >
      {m.icon} {m.label}
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
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold text-white"
      style={{
        background: isErr ? C.danger : C.ink,
        bottom: "calc(24px + env(safe-area-inset-bottom))",
        fontFamily: FONT,
      }}
    >
      {isErr ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      {toast.msg}
    </div>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white placeholder:text-gray-400";

/* ════════════════════════════════════════════════════════════════════════════
   5. MODAL SHELL (bottom-sheet on mobile, centered on desktop)
   ════════════════════════════════════════════════════════════════════════════ */

function SheetModal({
  onClose, tone = "brand", icon, title, subtitle, children, footer, maxWidth = "max-w-md",
}: {
  onClose: () => void;
  tone?: "brand" | "danger";
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const accent = tone === "danger" ? C.danger : C.brand;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      style={{ backdropFilter: "blur(3px)", fontFamily: FONT }}
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} sm:mx-4 overflow-hidden flex flex-col max-h-[92vh]`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 shrink-0" style={{ background: accent, color: "#fff" }}>
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/20">
                {icon}
              </div>
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
          <div
            className="border-t shrink-0 bg-gray-50"
            style={{ borderColor: C.line, paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({
  title, message, confirmLabel, busy, error, onConfirm, onClose,
}: {
  title: string; message: ReactNode; confirmLabel: string;
  busy?: boolean; error?: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <SheetModal
      onClose={onClose}
      tone="danger"
      icon={<Trash2 size={16} />}
      title={title}
      maxWidth="max-w-sm"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={busy}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: C.danger }}>
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 text-sm leading-relaxed space-y-3" style={{ color: C.body }}>
        <div>{message}</div>
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 font-semibold" role="alert">
            <AlertCircle size={13} /> {error}
          </div>
        )}
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   6. ADD / EDIT MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function MedicineModal({
  courseId, medicine, onClose, onSaved,
}: {
  courseId: string;
  medicine: MedicineInventory | null;
  onClose:  () => void;
  onSaved:  (m: MedicineInventory, isEdit: boolean) => void;
}) {
  const isEdit = !!medicine;

  const [name,      setName]      = useState(medicine?.name ?? "");
  const [unit,      setUnit]      = useState(medicine?.unit ?? "tablet");
  const [stockQty,  setStockQty]  = useState(String(medicine?.stockQty ?? "0"));
  const [threshold, setThreshold] = useState(String(medicine?.lowStockThreshold ?? "10"));
  const [notes,     setNotes]     = useState(medicine?.notes ?? "");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const handleSave = async () => {
    setError("");
    if (!name.trim()) { setError("Medicine name is required."); return; }
    if (!unit.trim()) { setError("Unit is required."); return; }

    const qty = parseInt(stockQty)  || 0;
    const thr = parseInt(threshold) || 0;

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/courses/${courseId}/medicine-inventory/${medicine!.id}`
        : `/api/courses/${courseId}/medicine-inventory`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:              name.trim(),
          unit:              unit.trim(),
          stockQty:          qty,
          lowStockThreshold: thr,
          notes:             notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      onSaved(data.medicine, isEdit);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal
      onClose={onClose}
      icon={<Pill size={16} />}
      title={isEdit ? "Edit medicine" : "Add medicine"}
      subtitle="Medicine inventory"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={saving}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: C.brand }}>
            {saving
              ? <><RefreshCw size={13} className="animate-spin" /> Saving…</>
              : <><Check size={13} /> {isEdit ? "Save changes" : "Add medicine"}</>}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 space-y-4">
        <div>
          <FieldLabel required>Medicine name</FieldLabel>
          <input
            value={name} onChange={e => { setName(e.target.value); setError(""); }}
            placeholder="e.g. Paracetamol 500mg" className={inputCls} autoFocus
          />
        </div>

        <div>
          <FieldLabel required>Unit</FieldLabel>
          <div className="relative">
            <select value={unit} onChange={e => setUnit(e.target.value)}
              className={`${inputCls} appearance-none cursor-pointer pr-9 capitalize`}>
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>Stock quantity</FieldLabel>
            <input type="number" min="0" value={stockQty}
              onChange={e => setStockQty(e.target.value)} placeholder="0" className={inputCls} />
          </div>
          <div>
            <FieldLabel>Low stock alert at</FieldLabel>
            <input type="number" min="0" value={threshold}
              onChange={e => setThreshold(e.target.value)} placeholder="10" className={inputCls} />
          </div>
        </div>

        <div>
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Optional notes about this medicine"
            className={`${inputCls} resize-none`}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-500 font-semibold" role="alert">
            <AlertCircle size={13} /> {error}
          </div>
        )}
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   7. MAIN TAB
   ════════════════════════════════════════════════════════════════════════════ */

export default function CourseMedicineInventoryTab({ courseId, isAdmin, isHead }: Props) {
  const [medicines,    setMedicines]    = useState<MedicineInventory[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusTab,    setStatusTab]    = useState<StockStatus | "ALL">("ALL");
  const [page,         setPage]         = useState(1);
  const [showAdd,      setShowAdd]      = useState(false);
  const [editTarget,   setEditTarget]   = useState<MedicineInventory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MedicineInventory | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState("");
  const [rowMenu,      setRowMenu]      = useState<{ id: string; x: number; y: number } | null>(null);
  const [toast,        setToast]        = useState<ToastState>(null);

  const debouncedSearch = useDebounced(search, 300);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Head and Staff can always manage; pure admin viewers are read-only
  const canManage = isHead || !isAdmin;

  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const fetchMedicines = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res  = await fetch(`/api/courses/${courseId}/medicine-inventory?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load medicines.");
      setMedicines(data.medicines ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load medicines.");
    } finally {
      setLoading(false);
    }
  }, [courseId, debouncedSearch]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusTab]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setRowMenu(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const c: Record<StockStatus | "ALL", number> = { ALL: medicines.length, IN_STOCK: 0, LOW: 0, OUT: 0 };
    medicines.forEach(m => { c[stockStatusOf(m)] += 1; });
    return c;
  }, [medicines]);

  const filtered = useMemo(
    () => statusTab === "ALL" ? medicines : medicines.filter(m => stockStatusOf(m) === statusTab),
    [medicines, statusTab],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) =>
    totalPages <= 5 || page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i,
  );

  const hasAnyFilter = !!(search || statusTab !== "ALL");
  const resetAll = () => { setSearch(""); setStatusTab("ALL"); };

  const openRowMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const flip = r.bottom + 96 > window.innerHeight;
    setRowMenu({ id, x: r.right, y: flip ? r.top - 92 : r.bottom + 4 });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError("");
    try {
      const res = await fetch(
        `/api/courses/${courseId}/medicine-inventory/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setDeleteError(d.error ?? "Failed to delete.");
        return;
      }
      setMedicines(prev => prev.filter(m => m.id !== deleteTarget.id));
      setDeleteTarget(null);
      notify("Medicine deleted");
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const emptyState = medicines.length === 0 && !hasAnyFilter ? (
    <EmptyState
      title="No medicines yet"
      hint="Add the first medicine to start tracking your clinic inventory."
      action={canManage ? (
        <button onClick={() => setShowAdd(true)}
          className="mt-2 flex items-center gap-1.5 text-xs font-bold px-4 h-9 rounded-lg text-white" style={{ background: C.brand }}>
          <Plus size={13} /> Add medicine
        </button>
      ) : undefined}
    />
  ) : (
    <EmptyState
      title="No matching medicines"
      hint="Try a different search or clear the filters."
      action={
        <button onClick={resetAll} className="mt-2 text-xs font-bold hover:underline" style={{ color: C.brand }}>
          Clear all filters
        </button>
      }
    />
  );

  const menuMed = rowMenu ? medicines.find(m => m.id === rowMenu.id) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: C.canvas }}>

      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between shrink-0 gap-3" style={{ borderColor: C.line }}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Medicine inventory</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: C.faint }}>Track clinic stock levels and get alerted when supplies run low.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchMedicines} aria-label="Refresh"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 w-9 h-9 sm:w-auto sm:px-3 rounded-lg transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canManage && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-9 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ background: C.brand }}>
              <Plus className="w-3.5 h-3.5" />
              <span>Add<span className="hidden sm:inline"> medicine</span></span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5 min-h-0">

        {/* Table card */}
        <div className="flex-1 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[420px]" style={{ borderColor: C.line }}>

          {/* Status tabs */}
          <div className="border-b overflow-x-auto" style={{ borderColor: C.line }}>
            <div role="tablist" className="flex px-2 sm:px-3 min-w-max">
              {STOCK_TABS.map(t => {
                const active = statusTab === t;
                return (
                  <button
                    key={t} role="tab" aria-selected={active} onClick={() => setStatusTab(t)}
                    className="relative flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors"
                    style={{ color: active ? C.brand : C.muted }}
                  >
                    {t === "ALL" ? "All" : STOCK_META[t].label}
                    <span className="text-[11px] tabular-nums px-1.5 rounded-full"
                      style={{ background: active ? C.brandTint : C.lineSoft, color: active ? C.brand : C.muted }}>
                      {counts[t]}
                    </span>
                    {active && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full" style={{ background: C.brand }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b flex items-center gap-2" style={{ borderColor: C.lineSoft }}>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-9 flex-1 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-colors min-w-0">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search medicines"
                aria-label="Search medicines"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="animate-pulse divide-y divide-gray-100" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-3 w-40 bg-gray-100 rounded" />
                  <div className="h-3 w-16 bg-gray-100 rounded hidden sm:block" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                  <div className="h-5 w-20 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={fetchMedicines}
                className="text-xs font-bold px-4 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1">{emptyState}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop table */}
              <table className="w-full border-collapse hidden sm:table">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: "#fafafa" }}>
                    {["No.", "Medicine", "Unit", "Stock", "Alert at", "Status", "Notes", ""].map((h, i) => (
                      <th key={i} scope="col"
                        className="text-left px-4 py-2.5 whitespace-nowrap border-b"
                        style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((m, i) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 text-xs tabular-nums border-b" style={{ color: C.faint, borderColor: C.lineSoft }}>
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3.5 border-b min-w-[200px]" style={{ borderColor: C.lineSoft }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.brandTint }}>
                            <Pill size={14} style={{ color: C.brand }} />
                          </div>
                          <p className="text-[13px] font-semibold" style={{ color: C.ink }}>{m.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b capitalize whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {m.unit}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold tabular-nums border-b" style={{ color: qtyColor(m), borderColor: C.lineSoft }}>
                        {m.stockQty}
                      </td>
                      <td className="px-4 py-3.5 text-xs tabular-nums border-b" style={{ color: C.muted, borderColor: C.lineSoft }}>
                        {m.lowStockThreshold}
                      </td>
                      <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }}>
                        <StockBadge status={stockStatusOf(m)} />
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b max-w-[220px]" style={{ color: C.muted, borderColor: C.lineSoft }}>
                        <span className="line-clamp-1">{m.notes ?? "—"}</span>
                      </td>
                      <td className="px-3 py-3.5 w-12 border-b" style={{ borderColor: C.lineSoft }}>
                        {canManage && (
                          <button
                            onClick={e => openRowMenu(e, m.id)}
                            aria-label={`Actions for ${m.name}`} aria-haspopup="menu"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.brandTint }}>
                      <Pill size={15} style={{ color: C.brand }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate" style={{ color: C.ink }}>{m.name}</p>
                        <StockBadge status={stockStatusOf(m)} />
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                        <span className="font-bold tabular-nums" style={{ color: qtyColor(m) }}>{m.stockQty}</span>
                        {" "}<span className="capitalize">{m.unit}</span>(s) · alert at {m.lowStockThreshold}
                      </p>
                      {m.notes && <p className="text-[11px] mt-1 line-clamp-2" style={{ color: C.faint }}>{m.notes}</p>}
                    </div>
                    {canManage && (
                      <button
                        onClick={e => openRowMenu(e, m.id)}
                        aria-label={`Actions for ${m.name}`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 shrink-0"
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t bg-white shrink-0 gap-2" style={{ borderColor: C.line }}>
              <span className="text-xs tabular-nums truncate" style={{ color: C.muted }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="hidden sm:flex items-center gap-1">
                  {pageNumbers.map(n => (
                    <button key={n} onClick={() => setPage(n)} aria-current={page === n ? "page" : undefined}
                      style={page === n ? { background: C.brand, color: "#fff", borderColor: C.brand } : {}}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold border transition-colors ${page !== n ? "border-gray-200 text-gray-600 hover:border-gray-400" : ""}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <span className="sm:hidden text-xs font-semibold px-2 tabular-nums" style={{ color: C.muted }}>
                  {page} / {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row action menu */}
      {rowMenu && menuMed && (
        <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)}>
          <div
            role="menu"
            className="absolute w-44 bg-white rounded-xl border shadow-lg py-1 overflow-hidden"
            style={{ top: rowMenu.y, left: Math.max(8, rowMenu.x - 176), borderColor: C.line, fontFamily: FONT }}
            onClick={e => e.stopPropagation()}
          >
            <button
              role="menuitem"
              onClick={() => { setEditTarget(menuMed); setRowMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-gray-50"
              style={{ color: C.ink }}
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              role="menuitem"
              onClick={() => { setDeleteError(""); setDeleteTarget(menuMed); setRowMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-red-50"
              style={{ color: C.danger }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {(showAdd || editTarget) && (
        <MedicineModal
          courseId={courseId}
          medicine={editTarget}
          onClose={() => { setShowAdd(false); setEditTarget(null); }}
          onSaved={(saved, wasEdit) => {
            if (wasEdit) setMedicines(prev => prev.map(m => m.id === saved.id ? saved : m));
            else         setMedicines(prev => [saved, ...prev]);
            setShowAdd(false);
            setEditTarget(null);
            notify(wasEdit ? "Medicine updated" : "Medicine added");
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete this medicine?"
          confirmLabel="Delete"
          busy={deleting}
          error={deleteError}
          message={
            <>
              <strong>{deleteTarget.name}</strong> will be permanently removed from the inventory.<br />
              It can’t be deleted if it has existing usage records.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => { if (!deleting) { setDeleteTarget(null); setDeleteError(""); } }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}