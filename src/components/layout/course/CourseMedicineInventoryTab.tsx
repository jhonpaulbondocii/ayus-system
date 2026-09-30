"use client";

// src/components/layout/course/CourseMedicineInventoryTab.tsx

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, X, RefreshCw, ChevronDown,
  Trash2, Check, Pill, AlertTriangle, Package,
  Edit2,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const MAROON = "#7b1113";
const FONT   = "system-ui, -apple-system, sans-serif";

const UNIT_OPTIONS = [
  "tablet", "capsule", "ml", "bottle", "box", "sachet", "ampule", "patch", "piece",
];

const TAB_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  @media (max-width: 767px) { input, textarea, select { font-size: 16px !important; } }
  button, [role="button"] { -webkit-tap-highlight-color: transparent; }

  /*
   * Bottom action bar:
   * Mobile  → position:fixed, sitting above the app nav bar (65px) + safe area.
   * Desktop → position:static, flows naturally at the bottom of the flex column.
   */
  .mi-action-bar {
    background: #fff;
    border-top: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 65px;
    padding: 10px 16px;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
    z-index: 30;
  }
  @media (min-width: 640px) {
    .mi-action-bar {
      position: static;
      bottom: auto;
      padding: 12px 24px;
    }
  }

  /* Pushes scroll content up so it is never hidden behind the fixed bar */
  .mi-action-bar-spacer {
    display: block;
    height: 60px;
  }
  @media (min-width: 640px) {
    .mi-action-bar-spacer { display: none; }
  }

  /*
   * Modal overlay: always covers the true viewport.
   * Using position:fixed with inset-0 works even inside overflow:hidden parents
   * because fixed positioning is relative to the viewport, not the containing block —
   * UNLESS a parent has transform/filter/will-change. Next.js pages don't, so this is safe.
   */
  .mi-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 9999;
  }
  @media (min-width: 640px) {
    .mi-overlay { align-items: center; }
  }

  /* The sheet itself: flex column, max-height caps it so footer is always visible */
  .mi-sheet {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 88svh;          /* svh = small viewport height, avoids mobile URL bar */
    background: #fff;
    border-radius: 1.25rem 1.25rem 0 0;
    box-shadow: 0 25px 60px rgba(0,0,0,.25);
    overflow: hidden;           /* children cannot bleed out */
  }
  @media (min-width: 640px) {
    .mi-sheet {
      max-width: 28rem;
      border-radius: 1.25rem;
      max-height: 92svh;
    }
  }
  .mi-sheet-sm {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 80svh;
    background: #fff;
    border-radius: 1.25rem 1.25rem 0 0;
    box-shadow: 0 25px 60px rgba(0,0,0,.25);
    overflow: hidden;
  }
  @media (min-width: 640px) {
    .mi-sheet-sm {
      max-width: 20rem;
      border-radius: 1.25rem;
      max-height: 80svh;
    }
  }

  /* Scrollable body region inside the sheet */
  .mi-body {
    flex: 1 1 auto;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  /* Footer: never shrinks, always at bottom of sheet */
  .mi-footer {
    flex-shrink: 0;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   INPUT STYLES
───────────────────────────────────────────────────────────────────────────── */
const inputCls = [
  "w-full h-10 border border-gray-300 rounded-lg px-3 text-sm",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400",
].join(" ");

const textareaCls = [
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 resize-none",
].join(" ");

const selectCls = [
  "w-full h-10 border border-gray-300 rounded-lg px-3 text-sm bg-white",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all appearance-none cursor-pointer",
].join(" ");

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STOCK STATUS BADGE
───────────────────────────────────────────────────────────────────────────── */
function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 whitespace-nowrap">
        <AlertTriangle size={9} /> Out of Stock
      </span>
    );
  }
  if (qty <= threshold) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">
        <AlertTriangle size={9} /> Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
      <Check size={9} /> In Stock
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD / EDIT MODAL
   Uses a portal-like fixed overlay so it escapes overflow:hidden parents.
───────────────────────────────────────────────────────────────────────────── */
function MedicineModal({
  courseId,
  medicine,
  onClose,
  onSaved,
}: {
  courseId: string;
  medicine: MedicineInventory | null;
  onClose:  () => void;
  onSaved:  (m: MedicineInventory) => void;
}) {
  const isEdit = !!medicine;

  const [name,      setName]      = useState(medicine?.name              ?? "");
  const [unit,      setUnit]      = useState(medicine?.unit              ?? "tablet");
  const [stockQty,  setStockQty]  = useState(String(medicine?.stockQty   ?? "0"));
  const [threshold, setThreshold] = useState(String(medicine?.lowStockThreshold ?? "10"));
  const [notes,     setNotes]     = useState(medicine?.notes             ?? "");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  // Prevent background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleSave = async () => {
    setError("");
    if (!name.trim()) { setError("Medicine name is required."); return; }
    if (!unit.trim()) { setError("Unit is required."); return; }

    const qty = parseInt(stockQty)  || 0;
    const thr = parseInt(threshold) || 0;

    setSaving(true);
    try {
      const url    = isEdit
        ? `/api/courses/${courseId}/medicine-inventory/${medicine!.id}`
        : `/api/courses/${courseId}/medicine-inventory`;
      const method = isEdit ? "PUT" : "POST";

      const res  = await fetch(url, {
        method,
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
      onSaved(data.medicine);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mi-overlay" style={{ fontFamily: FONT }} onClick={onClose}>
      <div className="mi-sheet" onClick={e => e.stopPropagation()}>

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header — never scrolls */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0"
          style={{ background: MAROON }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Pill size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Medicine Inventory</p>
              <p className="text-sm font-bold text-white">{isEdit ? "Edit Medicine" : "Add Medicine"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="mi-body px-5 py-5 space-y-4">
          {error && (
            <div className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          <div>
            <FieldLabel required>Medicine Name</FieldLabel>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Paracetamol 500mg"
              className={inputCls}
            />
          </div>

          <div>
            <FieldLabel required>Unit</FieldLabel>
            <SelectWrapper>
              <select value={unit} onChange={e => setUnit(e.target.value)} className={selectCls}>
                {UNIT_OPTIONS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </SelectWrapper>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Stock Quantity</FieldLabel>
              <input
                type="number" min="0"
                value={stockQty}
                onChange={e => setStockQty(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel>Low Stock Alert At</FieldLabel>
              <input
                type="number" min="0"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                placeholder="10"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Notes</FieldLabel>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes about this medicine..."
              className={textareaCls}
            />
          </div>
        </div>

        {/* Footer — never scrolls, always visible */}
        <div className="mi-footer flex gap-2 px-5 pt-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose} disabled={saving}
            className="flex-1 h-11 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave} disabled={saving}
            className="flex-1 h-11 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: MAROON }}
          >
            {saving
              ? <><RefreshCw size={13} className="animate-spin" /> Saving…</>
              : <><Check size={13} /> {isEdit ? "Save Changes" : "Add Medicine"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteModal({
  medicine,
  courseId,
  onClose,
  onDeleted,
}: {
  medicine:  MedicineInventory;
  courseId:  string;
  onClose:   () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res = await fetch(
        `/api/courses/${courseId}/medicine-inventory/${medicine.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to delete.");
        setDeleting(false);
        return;
      }
      onDeleted();
    } catch {
      setError("Network error. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="mi-overlay" style={{ fontFamily: FONT }} onClick={onClose}>
      <div className="mi-sheet-sm" onClick={e => e.stopPropagation()}>

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Scrollable body */}
        <div className="mi-body px-5 pt-5 pb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-50 shrink-0">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-sm font-bold text-gray-900 mb-1">Delete this medicine?</p>
          <p className="text-xs text-gray-500 mb-1 font-medium">{medicine.name}</p>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            This will permanently remove it from the inventory.{" "}
            <span className="font-semibold text-red-500">
              Cannot be deleted if it has existing usage records.
            </span>
          </p>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer — always visible */}
        <div className="mi-footer flex gap-2 px-5 pt-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose} disabled={deleting}
            className="flex-1 h-11 border border-gray-200 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete} disabled={deleting}
            className="flex-1 h-11 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ background: "#ef4444" }}
          >
            {deleting
              ? <><RefreshCw size={12} className="animate-spin" /> Deleting…</>
              : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOBILE MEDICINE CARD
───────────────────────────────────────────────────────────────────────────── */
function MedicineMobileCard({
  med,
  canManage,
  onEdit,
  onDelete,
}: {
  med:        MedicineInventory;
  canManage:  boolean;
  onEdit:     () => void;
  onDelete:   () => void;
}) {
  const stockColor =
    med.stockQty <= 0                          ? "text-red-600"
    : med.stockQty <= med.lowStockThreshold    ? "text-amber-600"
    : "text-gray-800";

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
            <Pill size={14} style={{ color: MAROON }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{med.name}</p>
            <p className="text-[11px] text-gray-400 capitalize leading-tight">{med.unit}</p>
          </div>
        </div>
        <StockBadge qty={med.stockQty} threshold={med.lowStockThreshold} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-4 py-2.5">
          <p className="text-[10px] text-gray-400 font-medium mb-0.5">Current Stock</p>
          <p className={`text-base font-bold tabular-nums leading-tight ${stockColor}`}>
            {med.stockQty}
            <span className="text-xs font-normal text-gray-400 ml-1">{med.unit}(s)</span>
          </p>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-[10px] text-gray-400 font-medium mb-0.5">Alert Threshold</p>
          <p className="text-base font-bold tabular-nums text-gray-700 leading-tight">
            {med.lowStockThreshold}
          </p>
        </div>
      </div>

      {/* Notes (if any) */}
      {med.notes && (
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
          <p className="text-[11px] text-gray-500 leading-relaxed">{med.notes}</p>
        </div>
      )}

      {/* Action row */}
      {canManage && (
        <div className="flex divide-x divide-gray-100">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors"
          >
            <Edit2 size={12} /> Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN TAB
   Layout strategy: the tab fills its flex parent (overflow-hidden flex flex-col
   from CourseViewPage). We use a pure flexbox column — NO position:fixed inside
   the tab itself — so everything stays in flow and nothing gets clipped.
───────────────────────────────────────────────────────────────────────────── */
export default function CourseMedicineInventoryTab({ courseId, isAdmin, isHead }: Props) {
  const [medicines,    setMedicines]    = useState<MedicineInventory[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [showAdd,      setShowAdd]      = useState(false);
  const [editTarget,   setEditTarget]   = useState<MedicineInventory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MedicineInventory | null>(null);

  // Head and Staff can always manage; pure admin viewers are read-only
  const canManage = isHead || !isAdmin;

  const fetchMedicines = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res  = await fetch(`/api/courses/${courseId}/medicine-inventory?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMedicines(data.medicines ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load medicines.");
    } finally {
      setLoading(false);
    }
  }, [courseId, search]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

  const totalMedicines = medicines.length;
  const lowStock       = medicines.filter(m => m.stockQty > 0 && m.stockQty <= m.lowStockThreshold).length;
  const outOfStock     = medicines.filter(m => m.stockQty <= 0).length;

  return (
    /*
     * Root: fills the parent's flex cell completely.
     * flex flex-col + h-full means:
     *   - top bar, stat cards, search bar → shrink-0 (fixed height)
     *   - content area                    → flex-1 overflow-y-auto (scrolls)
     *   - bottom action bar               → shrink-0 (fixed height, always visible)
     * No position:fixed needed — the parent is already a bounded box.
     */
    <div className="flex flex-col h-full min-h-0 bg-gray-50" style={{ fontFamily: FONT }}>
      <style>{TAB_CSS}</style>

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5 truncate" style={{ color: MAROON }}>
            Clinic
          </p>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-none">Medicine Inventory</h1>
        </div>
        <button
          onClick={fetchMedicines}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 px-2.5 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-2.5 px-4 sm:px-6 pt-4 pb-3 shrink-0">
        {[
          { label: "Total",        value: totalMedicines, color: "text-gray-900",  bg: "bg-white" },
          { label: "Low Stock",    value: lowStock,       color: "text-amber-600", bg: "bg-white" },
          { label: "Out of Stock", value: outOfStock,     color: "text-red-600",   bg: "bg-white" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm`}>
            <p className={`text-xl sm:text-2xl font-bold tabular-nums leading-none ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-medium mt-0.5 text-gray-400 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search bar ── */}
      <div className="px-4 sm:px-6 pb-3 shrink-0">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white focus-within:border-gray-400 transition-all">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search medicines…"
            className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable content ── flex-1 means it takes whatever height remains */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-gray-300 py-24">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-xs font-medium text-gray-400">Loading medicines…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center text-xs font-medium text-red-500 py-24">{error}</div>
        ) : medicines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
              <Package className="w-7 h-7" style={{ color: MAROON }} />
            </div>
            <p className="text-sm text-gray-400 font-medium">
              {search ? "No medicines match your search." : "No medicines in inventory yet."}
            </p>
            {canManage && !search && (
              <button
                onClick={() => setShowAdd(true)}
                className="text-xs font-semibold hover:underline"
                style={{ color: MAROON }}
              >
                + Add first medicine
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {["Medicine", "Unit", "Stock", "Alert At", "Status", "Notes", ""].map(h => (
                      <th
                        key={h}
                        className="text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 py-3 first:pl-5 last:pr-5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {medicines.map(med => (
                    <tr key={med.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="py-3 px-4 pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                            <Pill size={13} style={{ color: MAROON }} />
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{med.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-500 font-medium capitalize">{med.unit}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-bold tabular-nums ${
                          med.stockQty <= 0                       ? "text-red-600"
                          : med.stockQty <= med.lowStockThreshold ? "text-amber-600"
                          : "text-gray-800"
                        }`}>
                          {med.stockQty}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-400 tabular-nums">{med.lowStockThreshold}</span>
                      </td>
                      <td className="py-3 px-4">
                        <StockBadge qty={med.stockQty} threshold={med.lowStockThreshold} />
                      </td>
                      <td className="py-3 px-4 max-w-[180px]">
                        {med.notes
                          ? <span className="text-xs text-gray-400 truncate block">{med.notes}</span>
                          : <span className="text-xs text-gray-200">—</span>}
                      </td>
                      <td className="py-3 px-4 pr-5 text-right">
                        {canManage && (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditTarget(med)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(med)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="sm:hidden space-y-2.5">
              {medicines.map(med => (
                <MedicineMobileCard
                  key={med.id}
                  med={med}
                  canManage={canManage}
                  onEdit={() => setEditTarget(med)}
                  onDelete={() => setDeleteTarget(med)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Bottom action bar ──
          Mobile:  position:fixed, hovers above the app bottom nav bar (65px tall).
          Desktop: position:static, flows at the bottom of the flex column.
          The spacer div below prevents scroll content from hiding behind the
          fixed bar on mobile.
      ── */}
      <div className="mi-action-bar">
        <p className="text-[11px] text-gray-400 font-medium">
          {loading
            ? "Loading…"
            : `${medicines.length} medicine${medicines.length !== 1 ? "s" : ""}`}
        </p>

        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold text-white transition-all active:opacity-80"
            style={{ background: MAROON }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Medicine
          </button>
        )}
      </div>
      {/* Spacer: only on mobile, keeps scroll content above the fixed bar */}
      <div className="mi-action-bar-spacer" aria-hidden="true" />

      {/* ── Modals — rendered via fixed overlay, escapes overflow:hidden ── */}
      {(showAdd || editTarget) && (
        <MedicineModal
          courseId={courseId}
          medicine={editTarget}
          onClose={() => { setShowAdd(false); setEditTarget(null); }}
          onSaved={saved => {
            if (editTarget) {
              setMedicines(prev => prev.map(m => m.id === saved.id ? saved : m));
            } else {
              setMedicines(prev => [saved, ...prev]);
            }
            setShowAdd(false);
            setEditTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          medicine={deleteTarget}
          courseId={courseId}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setMedicines(prev => prev.filter(m => m.id !== deleteTarget.id));
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}