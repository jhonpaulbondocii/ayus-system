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
  "w-full h-9 border border-gray-300 rounded-sm px-3 text-sm",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400",
].join(" ");

const textareaCls = [
  "w-full border border-gray-300 rounded-sm px-3 py-2 text-sm",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 resize-none",
].join(" ");

const selectCls = [
  "w-full h-9 border border-gray-300 rounded-sm px-3 text-sm bg-white",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all appearance-none cursor-pointer",
].join(" ");

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-gray-400">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STOCK STATUS BADGE
───────────────────────────────────────────────────────────────────────────── */
function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
        <AlertTriangle size={9} /> Out of Stock
      </span>
    );
  }
  if (qty <= threshold) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle size={9} /> Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      <Check size={9} /> In Stock
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD / EDIT MODAL
───────────────────────────────────────────────────────────────────────────── */
function MedicineModal({
  courseId,
  medicine,
  onClose,
  onSaved,
}: {
  courseId: string;
  medicine: MedicineInventory | null; // null = add mode
  onClose:  () => void;
  onSaved:  (m: MedicineInventory) => void;
}) {
  const isEdit = !!medicine;

  const [name,      setName]      = useState(medicine?.name              ?? "");
  const [unit,      setUnit]      = useState(medicine?.unit              ?? "tablet");
  const [stockQty,  setStockQty]  = useState(String(medicine?.stockQty   ?? "0"));
  const [threshold, setThreshold] = useState(String(medicine?.lowStockThreshold ?? "10"));
  const [notes,     setNotes]     = useState(medicine?.notes             ?? "");

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const handleSave = async () => {
    setError("");
    if (!name.trim()) { setError("Medicine name is required."); return; }
    if (!unit.trim()) { setError("Unit is required.");          return; }

    const qty  = parseInt(stockQty)  || 0;
    const thr  = parseInt(threshold) || 0;

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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
          style={{ background: MAROON }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Pill size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Medicine Inventory</p>
              <p className="text-sm font-black text-white">{isEdit ? "Edit Medicine" : "Add Medicine"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <FieldLabel required>Medicine Name</FieldLabel>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Paracetamol 500mg"
              className={inputCls}
            />
          </div>

          {/* Unit */}
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

          {/* Stock + Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Stock Quantity</FieldLabel>
              <input
                type="number"
                min="0"
                value={stockQty}
                onChange={e => setStockQty(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel>Low Stock Alert At</FieldLabel>
              <input
                type="number"
                min="0"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                placeholder="10"
                className={inputCls}
              />
            </div>
          </div>

          {/* Notes */}
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

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-10 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: MAROON }}
          >
            {saving
              ? <><RefreshCw size={13} className="animate-spin" /> Saving...</>
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
  medicine: MedicineInventory;
  courseId: string;
  onClose:  () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

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
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-80 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-5 py-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-50">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-sm font-bold text-gray-900 mb-1">Delete this medicine?</p>
          <p className="text-xs text-gray-500 mb-1 font-medium">{medicine.name}</p>
          <p className="text-xs text-gray-400 mb-5 leading-relaxed">
            This will permanently remove it from the inventory.
            <br />
            <span className="font-semibold text-red-500">
              Cannot be deleted if it has existing usage records.
            </span>
          </p>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: "#ef4444" }}
            >
              {deleting
                ? <><RefreshCw size={12} className="animate-spin" /> Deleting...</>
                : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN TAB
───────────────────────────────────────────────────────────────────────────── */
export default function CourseMedicineInventoryTab({ courseId, isAdmin, isHead }: Props) {
  const [medicines,    setMedicines]    = useState<MedicineInventory[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [showAdd,      setShowAdd]      = useState(false);
  const [editTarget,   setEditTarget]   = useState<MedicineInventory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MedicineInventory | null>(null);

  const canManage = !isAdmin; // Staff and Head can manage, not ADMIN

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

  /* ── Stat counts ── */
  const totalMedicines = medicines.length;
  const lowStock       = medicines.filter(m => m.stockQty > 0 && m.stockQty <= m.lowStockThreshold).length;
  const outOfStock     = medicines.filter(m => m.stockQty <= 0).length;

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5 truncate" style={{ color: MAROON }}>
            Clinic
          </p>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">Medicine Inventory</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchMedicines}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 py-1.5 rounded-lg transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canManage && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-1.5 rounded-lg text-white transition-all"
              style={{ background: MAROON }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Medicine</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-3 px-4 sm:px-6 py-4 shrink-0">
        {[
          { label: "Total Medicines", value: totalMedicines, color: "text-gray-900" },
          { label: "Low Stock",       value: lowStock,       color: "text-amber-600" },
          { label: "Out of Stock",    value: outOfStock,     color: "text-red-600"   },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <p className={`text-xl sm:text-2xl font-black tabular-nums leading-none ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold mt-0.5 text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search bar ── */}
      <div className="px-4 sm:px-6 pb-3 shrink-0">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search medicines..."
            className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-gray-300 py-24">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-xs font-medium">Loading medicines...</span>
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
                className="text-xs font-bold hover:underline"
                style={{ color: MAROON }}
              >
                + Add first medicine
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="hidden sm:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Medicine Name", "Unit", "Stock", "Low Stock At", "Status", "Notes", ""].map(h => (
                      <th
                        key={h}
                        className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 pb-2 pt-1 pr-4 last:pr-0"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {medicines.map(med => (
                    <tr key={med.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: "#fef2f2" }}>
                            <Pill size={13} style={{ color: MAROON }} />
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{med.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs text-gray-500 font-medium capitalize">{med.unit}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-sm font-bold tabular-nums ${
                          med.stockQty <= 0 ? "text-red-600" :
                          med.stockQty <= med.lowStockThreshold ? "text-amber-600" :
                          "text-gray-800"
                        }`}>
                          {med.stockQty}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs text-gray-400 tabular-nums">{med.lowStockThreshold}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <StockBadge qty={med.stockQty} threshold={med.lowStockThreshold} />
                      </td>
                      <td className="py-3 pr-4 max-w-[200px]">
                        {med.notes
                          ? <span className="text-xs text-gray-400 truncate block">{med.notes}</span>
                          : <span className="text-xs text-gray-200">—</span>
                        }
                      </td>
                      <td className="py-3 text-right">
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
            <div className="sm:hidden space-y-2">
              {medicines.map(med => (
                <div
                  key={med.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "#fef2f2" }}>
                        <Pill size={14} style={{ color: MAROON }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{med.name}</p>
                        <p className="text-[10px] text-gray-400 capitalize">{med.unit}</p>
                      </div>
                    </div>
                    <StockBadge qty={med.stockQty} threshold={med.lowStockThreshold} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Stock</p>
                      <p className={`text-sm font-black tabular-nums ${
                        med.stockQty <= 0 ? "text-red-600" :
                        med.stockQty <= med.lowStockThreshold ? "text-amber-600" :
                        "text-gray-800"
                      }`}>{med.stockQty} <span className="text-xs font-normal text-gray-400">{med.unit}(s)</span></p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Alert At</p>
                      <p className="text-sm font-black tabular-nums text-gray-800">{med.lowStockThreshold}</p>
                    </div>
                  </div>

                  {med.notes && (
                    <p className="text-xs text-gray-400 mb-3 leading-relaxed">{med.notes}</p>
                  )}

                  {canManage && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setEditTarget(med)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-all"
                      >
                        <Edit2 size={11} /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(med)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Footer count ── */}
      {!loading && medicines.length > 0 && (
        <div className="shrink-0 border-t border-gray-100 px-4 sm:px-6 py-3 bg-white">
          <p className="text-[11px] text-gray-400 font-medium">
            {medicines.length} medicine{medicines.length !== 1 ? "s" : ""} in inventory
          </p>
        </div>
      )}

      {/* ── Modals ── */}
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