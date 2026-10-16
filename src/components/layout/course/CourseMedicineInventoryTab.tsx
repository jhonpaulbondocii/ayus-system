"use client";

// src/components/layout/course/CourseMedicineInventoryTab.tsx

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Plus, X, RefreshCw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Trash2, Check, Pill, AlertTriangle, Package, Edit2, PackagePlus,
  SlidersHorizontal, Clock, ArchiveRestore,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const MAROON    = "#7b1113";
const FONT      = "'Inter', system-ui, -apple-system, sans-serif";
const PAGE_SIZE = 25;

const UNIT_OPTIONS      = ["tablet", "capsule", "mL", "g", "sachet", "ampule", "patch", "piece"];
const PACKAGING_OPTIONS = ["box", "bottle", "strip", "sachet pack", "tube", "vial", "piece"];
const DOSAGE_FORMS      = ["Tablet", "Capsule", "Syrup", "Suspension", "Drops", "Ointment", "Cream", "Injection", "Lotion", "Other"];
const CATEGORIES        = ["Pain reliever", "Antibiotic", "Antihistamine", "Antacid", "Cough & cold", "Antidiarrheal", "Vitamins", "Topical", "First aid", "Other"];
const SOURCE_OPTIONS    = [
  { v: "PURCHASE", l: "Purchased" },
  { v: "DONATION", l: "Donation" },
  { v: "TRANSFER", l: "Transfer from another office" },
];

const MOVE_META: Record<string, { label: string; cls: string }> = {
  OPENING:        { label: "Opening",     cls: "bg-gray-100 text-gray-700" },
  RESTOCK:        { label: "Restock",     cls: "bg-green-50 text-green-700" },
  ADJUST:         { label: "Adjust",      cls: "bg-blue-50 text-blue-700" },
  COUNT:          { label: "Stock count", cls: "bg-blue-50 text-blue-700" },
  USAGE:          { label: "Dispensed",   cls: "bg-amber-50 text-amber-700" },
  USAGE_REVERSAL: { label: "Returned",    cls: "bg-green-50 text-green-700" },
  EXPIRED:        { label: "Expired",     cls: "bg-red-50 text-red-700" },
  DAMAGED:        { label: "Damaged",     cls: "bg-red-50 text-red-700" },
};

const TAB_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  @media (max-width: 767px) { input, textarea, select { font-size: 16px !important; } }
  button, [role="button"] { -webkit-tap-highlight-color: transparent; }

  .mi-action-bar {
    background: #fff; border-top: 1px solid #e5e7eb;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    position: fixed; left: 0; right: 0; bottom: 65px;
    padding: 10px 16px; padding-bottom: max(10px, env(safe-area-inset-bottom));
    z-index: 30;
  }
  .mi-action-spacer { height: 64px; flex-shrink: 0; }
  @media (min-width: 640px) { .mi-action-bar, .mi-action-spacer { display: none; } }

  .mi-overlay {
    position: fixed; inset: 0; display: flex; align-items: flex-end; justify-content: center;
    background: rgba(17,24,39,0.45); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    z-index: 9999;
  }
  @media (min-width: 640px) { .mi-overlay { align-items: center; } }

  .mi-sheet {
    display: flex; flex-direction: column; width: 100%; max-height: 90svh;
    background: #fff; border-radius: 1rem 1rem 0 0;
    box-shadow: 0 25px 60px rgba(0,0,0,.25); overflow: hidden;
    border-top: 3px solid ${MAROON};
  }
  @media (min-width: 640px) { .mi-sheet { max-width: 34rem; border-radius: 0.75rem; max-height: 92svh; } }
  .mi-sheet-sm {
    display: flex; flex-direction: column; width: 100%; max-height: 80svh;
    background: #fff; border-radius: 1rem 1rem 0 0;
    box-shadow: 0 25px 60px rgba(0,0,0,.25); overflow: hidden;
  }
  @media (min-width: 640px) { .mi-sheet-sm { max-width: 24rem; border-radius: 0.75rem; } }
  .mi-body { flex: 1 1 auto; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
  .mi-footer { flex-shrink: 0; padding-bottom: max(14px, env(safe-area-inset-bottom)); }

  .mi-drawer-overlay {
    position: fixed; inset: 0; display: flex; justify-content: flex-end;
    background: rgba(17,24,39,0.45); z-index: 9000;
  }
  .mi-drawer {
    display: flex; flex-direction: column; width: 100%; max-width: 30rem; height: 100%;
    background: #fff; box-shadow: -20px 0 50px rgba(0,0,0,.2);
    border-top: 3px solid ${MAROON};
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface MedicineInventory {
  id:                 string;
  name:               string;
  unit:               string;
  stockQty:           number;
  lowStockThreshold:  number;
  notes:              string | null;
  genericName:        string | null;
  brandName:          string | null;
  strength:           string | null;
  dosageForm:         string | null;
  category:           string | null;
  location:           string | null;
  supplier:           string | null;
  isPrescriptionOnly: boolean;
  packaging:          string;
  piecesPerPack:      number;
  parLevel:           number | null;
  packCost:           number | null;
  defaultDispenseQty: number | null;
  archivedAt:         string | null;
  nextExpiry:         string | null;
  expiredQty:         number;
  expiringSoonQty:    number;
  createdAt:          string;
  updatedAt:          string;
}

interface Movement {
  id:           string;
  type:         string;
  qtyChange:    number;
  balanceAfter: number;
  reason:       string | null;
  createdAt:    string;
  createdBy:    { id: string; name: string } | null;
  batch:        { batchNo: string | null; expiryDate: string | null } | null;
}

interface BatchRow {
  id:           string;
  batchNo:      string | null;
  expiryDate:   string | null;
  qtyRemaining: number;
  source:       string;
  receivedAt:   string;
}

interface Props {
  courseId: string;
  isAdmin:  boolean;
  isHead:   boolean;
}

type Status       = "in" | "low" | "out";
type StatusFilter = "all" | Status | "exp";
type SortKey      = "status" | "name" | "stock" | "expiry" | "category";

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function getStatus(qty: number, threshold: number): Status {
  if (qty <= 0)         return "out";
  if (qty <= threshold) return "low";
  return "in";
}

const STATUS_META: Record<Status, { label: string; dot: string; bar: string; text: string; badge: string }> = {
  in:  { label: "In stock",     dot: "#15803d", bar: "#22c55e", text: "text-gray-900",  badge: "bg-green-50 text-green-700 border-green-100" },
  low: { label: "Low stock",    dot: "#b45309", bar: "#f59e0b", text: "text-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-100" },
  out: { label: "Out of stock", dot: "#b91c1c", bar: "#ef4444", text: "text-red-600",   badge: "bg-red-50 text-red-700 border-red-100" },
};

/** Ang stock na pwede pang gamitin (hindi kasama ang expired). */
function usableQty(m: MedicineInventory) {
  return Math.max(0, m.stockQty - m.expiredQty);
}

/** "ml" → "mL" */
function fmtUnit(u: string) {
  return u.trim().toLowerCase() === "ml" ? "mL" : u.trim();
}

function plural(word: string, n: number) {
  const w = fmtUnit(word);
  if (n === 1 || w === "mL" || w === "g") return w;
  if (/(x|ch|sh|s)$/i.test(w)) return `${w}es`;
  return `${w}s`;
}

/** 498 tablets (100/box) → "4 boxes + 98 tablets" */
function formatStock(qty: number, m: Pick<MedicineInventory, "unit" | "packaging" | "piecesPerPack">) {
  const ppp = m.piecesPerPack || 1;
  if (ppp <= 1) return `${qty} ${plural(m.unit, qty)}`;
  const packs = Math.floor(qty / ppp);
  const rem   = qty % ppp;
  const parts: string[] = [];
  if (packs > 0) parts.push(`${packs} ${plural(m.packaging, packs)}`);
  if (rem > 0)   parts.push(`${rem} ${plural(m.unit, rem)}`);
  return parts.length ? parts.join(" + ") : `0 ${plural(m.unit, 0)}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function num(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function useLockScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
}

/* ─────────────────────────────────────────────────────────────────────────────
   INPUT STYLES + SMALL FIELD COMPONENTS
───────────────────────────────────────────────────────────────────────────── */
const inputCls = [
  "w-full h-10 border border-gray-300 rounded-lg px-3 text-sm",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all bg-white placeholder:text-gray-400",
].join(" ");

const textareaCls = [
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all bg-white placeholder:text-gray-400 resize-none",
].join(" ");

const selectCls = [
  "w-full h-10 border border-gray-300 rounded-lg px-3 text-sm bg-white",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all appearance-none cursor-pointer",
].join(" ");

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 pt-1">{children}</p>;
}

function TextField({ label, value, onChange, placeholder, required, type = "text", min }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string; min?: string;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input type={type} min={min} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className={inputCls} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, blank }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; blank?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <SelectWrapper>
        <select value={value} onChange={e => onChange(e.target.value)} className={selectCls}>
          {blank !== undefined && <option value="">{blank}</option>}
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </SelectWrapper>
    </div>
  );
}

/** Quantity at unit sa iisang input */
function QtyInput({ value, onChange, suffix }: { value: string; onChange: (v: string) => void; suffix: string }) {
  return (
    <div className="flex items-stretch h-10 border border-gray-300 rounded-lg bg-white overflow-hidden focus-within:border-[#7b1113] focus-within:ring-2 focus-within:ring-[#7b1113]/10 transition-all">
      <input type="number" min="0" value={value} onChange={e => onChange(e.target.value)}
        className="flex-1 min-w-0 px-3 text-sm outline-none bg-transparent" placeholder="0" />
      <span className="flex items-center px-3 text-xs font-medium text-gray-500 bg-gray-50 border-l border-gray-200 whitespace-nowrap">
        {suffix}
      </span>
    </div>
  );
}

function ModalHeader({ icon, title, subtitle, onClose }: {
  icon: React.ReactNode; title: string; subtitle: string; onClose: () => void;
}) {
  return (
    <>
      <div className="sm:hidden flex justify-center pt-2.5 shrink-0">
        <div className="w-10 h-1 rounded-full bg-gray-200" />
      </div>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2", color: MAROON }}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 leading-tight truncate">{title}</p>
            <p className="text-xs text-gray-500 truncate">{subtitle}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>
    </>
  );
}

function ModalFooter({ onClose, onSubmit, busy, disabled, label, busyLabel, color = MAROON }: {
  onClose: () => void; onSubmit: () => void; busy: boolean; disabled?: boolean;
  label: string; busyLabel: string; color?: string;
}) {
  return (
    <div className="mi-footer flex gap-2 px-5 pt-3 border-t border-gray-200 bg-white">
      <button onClick={onClose} disabled={busy}
        className="flex-1 h-10 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50">
        Cancel
      </button>
      <button onClick={onSubmit} disabled={busy || disabled}
        className="flex-1 h-10 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
        style={{ background: color }}>
        {busy ? <><RefreshCw size={14} className="animate-spin" /> {busyLabel}</> : <><Check size={14} /> {label}</>}
      </button>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATUS BADGE + EXPIRY BADGE + STOCK BAR
───────────────────────────────────────────────────────────────────────────── */
function StatusBadge({ qty, threshold }: { qty: number; threshold: number }) {
  const s = getStatus(qty, threshold);
  const m = STATUS_META[s];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${m.badge}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

function ExpiryBadge({ med }: { med: MedicineInventory }) {
  if (med.expiredQty > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border bg-red-50 text-red-700 border-red-100 whitespace-nowrap">
        <Clock size={11} /> Expired: {formatStock(med.expiredQty, med)}
      </span>
    );
  }
  if (med.expiringSoonQty > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-100 whitespace-nowrap">
        <Clock size={11} /> Expiring soon
      </span>
    );
  }
  return null;
}

function StockBar({ qty, threshold }: { qty: number; threshold: number }) {
  const s     = getStatus(qty, threshold);
  const cap   = Math.max(threshold * 3, 1);
  const width = Math.min(100, Math.round((qty / cap) * 100));
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
      <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, background: STATUS_META[s].bar }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD / EDIT MODAL
───────────────────────────────────────────────────────────────────────────── */
function MedicineModal({ courseId, medicine, onClose, onSaved }: {
  courseId: string;
  medicine: MedicineInventory | null;
  onClose:  () => void;
  onSaved:  () => void;
}) {
  const isEdit = !!medicine;
  const m = medicine;

  const [f, setF] = useState({
    name:         m?.name ?? "",
    genericName:  m?.genericName ?? "",
    brandName:    m?.brandName ?? "",
    strength:     m?.strength ?? "",
    dosageForm:   m?.dosageForm ?? "",
    category:     m?.category ?? "",
    unit:         m ? fmtUnit(m.unit) : "tablet",
    packaging:    m?.packaging ?? "box",
    piecesPerPack: String(m?.piecesPerPack ?? 1),
    threshold:    String(m?.lowStockThreshold ?? 10),
    parLevel:     m?.parLevel != null ? String(m.parLevel) : "",
    packCost:     m?.packCost != null ? String(m.packCost) : "",
    defaultDose:  m?.defaultDispenseQty != null ? String(m.defaultDispenseQty) : "",
    location:     m?.location ?? "",
    supplier:     m?.supplier ?? "",
    notes:        m?.notes ?? "",
    isRx:         m?.isPrescriptionOnly ?? false,
    openPacks:    "0",
    openPieces:   "0",
    batchNo:      "",
    expiryDate:   "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  useLockScroll();

  const set = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: v }));

  const unitOptions = useMemo(
    () => (UNIT_OPTIONS.includes(f.unit) ? UNIT_OPTIONS : [f.unit, ...UNIT_OPTIONS]),
    [f.unit]
  );
  const packOptions = useMemo(
    () => (PACKAGING_OPTIONS.includes(f.packaging) ? PACKAGING_OPTIONS : [f.packaging, ...PACKAGING_OPTIONS]),
    [f.packaging]
  );

  const ppp         = Math.max(1, parseInt(f.piecesPerPack) || 1);
  const hasPacks    = ppp > 1;
  const openingQty  = (parseInt(f.openPacks) || 0) * ppp + (parseInt(f.openPieces) || 0);

  const handleSave = async () => {
    setError("");
    if (!f.name.trim()) { setError("Medicine name is required."); return; }
    if (!Number.isInteger(Number(f.piecesPerPack)) || Number(f.piecesPerPack) < 1) {
      setError("Pieces per pack must be at least 1."); return;
    }

    const payload: Record<string, unknown> = {
      name:               f.name.trim(),
      unit:               f.unit.trim(),
      lowStockThreshold:  num(f.threshold) ?? 10,
      notes:              f.notes.trim() || null,
      genericName:        f.genericName.trim() || null,
      brandName:          f.brandName.trim() || null,
      strength:           f.strength.trim() || null,
      dosageForm:         f.dosageForm.trim() || null,
      category:           f.category.trim() || null,
      location:           f.location.trim() || null,
      supplier:           f.supplier.trim() || null,
      isPrescriptionOnly: f.isRx,
      packaging:          f.packaging.trim() || "piece",
      piecesPerPack:      ppp,
      parLevel:           num(f.parLevel),
      packCost:           num(f.packCost),
      defaultDispenseQty: num(f.defaultDose),
    };

    if (!isEdit) {
      payload.stockQty   = openingQty;
      payload.batchNo    = f.batchNo.trim() || null;
      payload.expiryDate = f.expiryDate || null;
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/courses/${courseId}/medicine-inventory/${medicine!.id}`
        : `/api/courses/${courseId}/medicine-inventory`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      onSaved();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mi-overlay" style={{ fontFamily: FONT }} onClick={onClose}>
      <div className="mi-sheet" onClick={e => e.stopPropagation()}>
        <ModalHeader icon={<Pill size={17} />} onClose={onClose}
          title={isEdit ? "Edit medicine" : "Add medicine"}
          subtitle={isEdit ? "Stock changes are made with Restock or Adjust." : "Add a new item to the clinic inventory."} />

        <div className="mi-body px-5 py-5 space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          <SectionTitle>Medicine</SectionTitle>
          <TextField label="Medicine name" required value={f.name} onChange={set("name")} placeholder="e.g. Paracetamol 500mg" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Generic name" value={f.genericName} onChange={set("genericName")} placeholder="Paracetamol" />
            <TextField label="Brand name"   value={f.brandName}   onChange={set("brandName")}   placeholder="Biogesic" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Strength" value={f.strength} onChange={set("strength")} placeholder="500mg" />
            <SelectField label="Dosage form" value={f.dosageForm} onChange={set("dosageForm")} options={DOSAGE_FORMS} blank="—" />
          </div>
          <SelectField label="Category" value={f.category} onChange={set("category")} options={CATEGORIES} blank="—" />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input type="checkbox" checked={f.isRx} onChange={e => setF(p => ({ ...p, isRx: e.target.checked }))}
              className="w-4 h-4 accent-[#7b1113]" />
            Prescription-only (Rx)
          </label>

          <SectionTitle>Packaging</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Smallest unit" value={f.unit} onChange={set("unit")} options={unitOptions} />
            <SelectField label="Comes in" value={f.packaging} onChange={set("packaging")} options={packOptions} />
          </div>
          <div>
            <FieldLabel required>Pieces per {f.packaging}</FieldLabel>
            <QtyInput value={f.piecesPerPack} onChange={set("piecesPerPack")} suffix={`${fmtUnit(f.unit)} / ${f.packaging}`} />
            <p className="text-[11px] text-gray-400 mt-1">
              Halimbawa: 1 box = 100 tablets, o 1 bottle = 60 mL. Gawing 1 kung walang pack.
            </p>
          </div>

          {!isEdit && (
            <>
              <SectionTitle>Opening stock</SectionTitle>
              {hasPacks ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>{plural(f.packaging, 2)}</FieldLabel>
                    <QtyInput value={f.openPacks} onChange={set("openPacks")} suffix={plural(f.packaging, 2)} />
                  </div>
                  <div>
                    <FieldLabel>Loose</FieldLabel>
                    <QtyInput value={f.openPieces} onChange={set("openPieces")} suffix={plural(f.unit, 2)} />
                  </div>
                </div>
              ) : (
                <div>
                  <FieldLabel>Quantity</FieldLabel>
                  <QtyInput value={f.openPieces} onChange={set("openPieces")} suffix={plural(f.unit, 2)} />
                </div>
              )}
              {openingQty > 0 && (
                <p className="text-xs text-gray-500">
                  Total: <span className="font-semibold text-gray-800">{openingQty} {plural(f.unit, openingQty)}</span>
                  {hasPacks && <> ({formatStock(openingQty, { unit: f.unit, packaging: f.packaging, piecesPerPack: ppp })})</>}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Batch no." value={f.batchNo} onChange={set("batchNo")} placeholder="Optional" />
                <TextField label="Expiry date" type="date" value={f.expiryDate} onChange={set("expiryDate")} />
              </div>
            </>
          )}

          <SectionTitle>Alerts &amp; ordering</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Low-stock alert at</FieldLabel>
              <QtyInput value={f.threshold} onChange={set("threshold")} suffix={plural(f.unit, 2)} />
            </div>
            <div>
              <FieldLabel>Target stock (par)</FieldLabel>
              <QtyInput value={f.parLevel} onChange={set("parLevel")} suffix={plural(f.unit, 2)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Default dose per visit</FieldLabel>
              <QtyInput value={f.defaultDose} onChange={set("defaultDose")} suffix={plural(f.unit, 2)} />
            </div>
            <div>
              <FieldLabel>Cost per {f.packaging} (₱)</FieldLabel>
              <input type="number" min="0" step="0.01" value={f.packCost}
                onChange={e => set("packCost")(e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
          </div>

          <SectionTitle>Storage</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Location" value={f.location} onChange={set("location")} placeholder="Cabinet A, shelf 2" />
            <TextField label="Supplier"  value={f.supplier} onChange={set("supplier")} placeholder="Optional" />
          </div>
          <div>
            <FieldLabel>Notes</FieldLabel>
            <textarea value={f.notes} onChange={e => set("notes")(e.target.value)} rows={2}
              placeholder="Optional notes" className={textareaCls} />
          </div>
        </div>

        <ModalFooter onClose={onClose} onSubmit={handleSave} busy={saving} disabled={!f.name.trim()}
          label={isEdit ? "Save changes" : "Add medicine"} busyLabel="Saving…" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESTOCK MODAL
───────────────────────────────────────────────────────────────────────────── */
function RestockModal({ courseId, med, onClose, onDone }: {
  courseId: string; med: MedicineInventory; onClose: () => void; onDone: () => void;
}) {
  const ppp      = med.piecesPerPack || 1;
  const hasPacks = ppp > 1;

  const [packs,  setPacks]  = useState("");
  const [pieces, setPieces] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [expiry,  setExpiry]  = useState("");
  const [source,  setSource]  = useState("PURCHASE");
  const [reason,  setReason]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useLockScroll();

  const addQty = (parseInt(packs) || 0) * ppp + (parseInt(pieces) || 0);

  const submit = async () => {
    setError("");
    if (addQty <= 0) { setError("Enter a quantity greater than 0."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/medicine-inventory/${med.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packs:      parseInt(packs)  || 0,
          pieces:     parseInt(pieces) || 0,
          batchNo:    batchNo.trim() || null,
          expiryDate: expiry || null,
          source,
          reason:     reason.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to restock."); return; }
      onDone();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mi-overlay" style={{ fontFamily: FONT }} onClick={onClose}>
      <div className="mi-sheet" onClick={e => e.stopPropagation()}>
        <ModalHeader icon={<PackagePlus size={17} />} onClose={onClose}
          title="Restock" subtitle={med.name} />

        <div className="mi-body px-5 py-5 space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5">
            <p className="text-xs text-gray-500">Current stock</p>
            <p className="text-sm font-semibold text-gray-900">{formatStock(med.stockQty, med)}</p>
          </div>

          {hasPacks ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>{plural(med.packaging, 2)} received</FieldLabel>
                <QtyInput value={packs} onChange={setPacks} suffix={plural(med.packaging, 2)} />
              </div>
              <div>
                <FieldLabel>Loose pieces</FieldLabel>
                <QtyInput value={pieces} onChange={setPieces} suffix={plural(med.unit, 2)} />
              </div>
            </div>
          ) : (
            <div>
              <FieldLabel required>Quantity received</FieldLabel>
              <QtyInput value={pieces} onChange={setPieces} suffix={plural(med.unit, 2)} />
            </div>
          )}

          {addQty > 0 && (
            <p className="text-xs text-gray-500">
              Adds <span className="font-semibold text-gray-800">{addQty} {plural(med.unit, addQty)}</span>
              {" → "}new total <span className="font-semibold text-gray-800">{formatStock(med.stockQty + addQty, med)}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Batch no." value={batchNo} onChange={setBatchNo} placeholder="Optional" />
            <TextField label="Expiry date" type="date" value={expiry} onChange={setExpiry} />
          </div>

          <div>
            <FieldLabel>Source</FieldLabel>
            <SelectWrapper>
              <select value={source} onChange={e => setSource(e.target.value)} className={selectCls}>
                {SOURCE_OPTIONS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </SelectWrapper>
          </div>

          <TextField label="Note" value={reason} onChange={setReason} placeholder="e.g. Delivery from supplier, DR# 1234" />
        </div>

        <ModalFooter onClose={onClose} onSubmit={submit} busy={saving} disabled={addQty <= 0}
          label="Add stock" busyLabel="Saving…" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADJUST MODAL
───────────────────────────────────────────────────────────────────────────── */
function AdjustModal({ courseId, med, canReduce, onClose, onDone }: {
  courseId: string; med: MedicineInventory; canReduce: boolean; onClose: () => void; onDone: () => void;
}) {
  const [dir,    setDir]    = useState<"add" | "reduce">(canReduce ? "reduce" : "add");
  const [qty,    setQty]    = useState("");
  const [type,   setType]   = useState("ADJUST");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  useLockScroll();

  const q      = parseInt(qty) || 0;
  const delta  = dir === "add" ? q : -q;
  const result = med.stockQty + delta;

  const typeOptions = dir === "add"
    ? [{ v: "ADJUST", l: "Correction" }, { v: "COUNT", l: "Physical count" }]
    : [{ v: "ADJUST", l: "Correction" }, { v: "COUNT", l: "Physical count" }, { v: "EXPIRED", l: "Expired (write-off)" }, { v: "DAMAGED", l: "Damaged / lost" }];

  useEffect(() => {
    if (!typeOptions.some(t => t.v === type)) setType("ADJUST");
  }, [dir]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setError("");
    if (q <= 0)          { setError("Enter a quantity greater than 0."); return; }
    if (!reason.trim())  { setError("Reason is required."); return; }
    if (result < 0)      { setError("Cannot reduce below zero."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/medicine-inventory/${med.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, type, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to adjust."); return; }
      onDone();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mi-overlay" style={{ fontFamily: FONT }} onClick={onClose}>
      <div className="mi-sheet" onClick={e => e.stopPropagation()}>
        <ModalHeader icon={<SlidersHorizontal size={17} />} onClose={onClose}
          title="Adjust stock" subtitle={med.name} />

        <div className="mi-body px-5 py-5 space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5">
            <p className="text-xs text-gray-500">Current stock</p>
            <p className="text-sm font-semibold text-gray-900">{formatStock(med.stockQty, med)}</p>
          </div>

          <div className="flex p-1 bg-gray-100 rounded-lg">
            {([
              { k: "add" as const,    l: "Add (+)" },
              { k: "reduce" as const, l: "Reduce (−)" },
            ]).map(o => {
              const disabled = o.k === "reduce" && !canReduce;
              const active   = dir === o.k;
              return (
                <button key={o.k} type="button" disabled={disabled} onClick={() => setDir(o.k)}
                  className="flex-1 h-8 rounded-md text-xs font-semibold transition-all disabled:opacity-40"
                  style={active ? { background: "#fff", color: MAROON, boxShadow: "0 1px 2px rgba(0,0,0,.08)" } : { color: "#6b7280" }}>
                  {o.l}
                </button>
              );
            })}
          </div>
          {!canReduce && (
            <p className="text-[11px] text-gray-400 -mt-2">Ang Head lang ang pwedeng magbawas ng stock.</p>
          )}

          <div>
            <FieldLabel required>Quantity ({plural(med.unit, 2)})</FieldLabel>
            <QtyInput value={qty} onChange={setQty} suffix={plural(med.unit, 2)} />
          </div>

          <div>
            <FieldLabel>Type</FieldLabel>
            <SelectWrapper>
              <select value={type} onChange={e => setType(e.target.value)} className={selectCls}>
                {typeOptions.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </SelectWrapper>
          </div>

          <TextField label="Reason" required value={reason} onChange={setReason}
            placeholder="e.g. Nasira, expired, naitama sa bilangan" />

          {q > 0 && (
            <p className={`text-xs ${result < 0 ? "text-red-600" : "text-gray-500"}`}>
              New total: <span className="font-semibold">{result < 0 ? "below zero" : formatStock(result, med)}</span>
            </p>
          )}
        </div>

        <ModalFooter onClose={onClose} onSubmit={submit} busy={saving} disabled={q <= 0 || !reason.trim()}
          label="Save adjustment" busyLabel="Saving…" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE / ARCHIVE CONFIRM MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteModal({ medicine, courseId, onClose, onDeleted }: {
  medicine:  MedicineInventory;
  courseId:  string;
  onClose:   () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  useLockScroll();

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/medicine-inventory/${medicine.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed.");
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
        <div className="sm:hidden flex justify-center pt-2.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="mi-body px-5 pt-5 pb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-red-50 shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-base font-semibold text-gray-900">Remove this medicine?</p>
          <p className="text-sm text-gray-700 mt-1 font-medium">{medicine.name}</p>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Kung wala pa itong history, tuluyan itong buburahin. Kung may history na, itatago (archive) na lang ito
            para buo pa rin ang mga record at report. Pwede mo itong ibalik anumang oras.
          </p>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">{error}</div>
          )}
        </div>

        <div className="mi-footer flex gap-2 px-5 pt-3 border-t border-gray-200 bg-white">
          <button onClick={onClose} disabled={deleting}
            className="flex-1 h-10 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 h-10 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ background: "#dc2626" }}>
            {deleting ? <><RefreshCw size={13} className="animate-spin" /> Working…</> : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DETAIL DRAWER (details + batches + history)
───────────────────────────────────────────────────────────────────────────── */
function DetailDrawer({ courseId, med, version, canManage, onClose, onRestock, onAdjust, onEdit, onDelete, onRestore }: {
  courseId: string; med: MedicineInventory; version: number; canManage: boolean;
  onClose: () => void; onRestock: () => void; onAdjust: () => void;
  onEdit: () => void; onDelete: () => void; onRestore: () => void;
}) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [batches,   setBatches]   = useState<BatchRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  useLockScroll();

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    fetch(`/api/courses/${courseId}/medicine-inventory/${med.id}/history`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load history.");
        if (!cancelled) { setMovements(d.movements ?? []); setBatches(d.batches ?? []); }
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load history."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [courseId, med.id, version]);

  const usable = usableQty(med);
  const s      = getStatus(usable, med.lowStockThreshold);
  const now    = Date.now();

  const details: [string, string | null][] = [
    ["Generic name", med.genericName],
    ["Brand name",   med.brandName],
    ["Strength",     med.strength],
    ["Dosage form",  med.dosageForm],
    ["Category",     med.category],
    ["Packaging",    med.piecesPerPack > 1 ? `1 ${med.packaging} = ${med.piecesPerPack} ${plural(med.unit, med.piecesPerPack)}` : null],
    ["Location",     med.location],
    ["Supplier",     med.supplier],
    ["Cost per pack", med.packCost != null ? `₱${med.packCost.toFixed(2)}` : null],
    ["Target stock", med.parLevel != null ? formatStock(med.parLevel, med) : null],
    ["Default dose", med.defaultDispenseQty != null ? `${med.defaultDispenseQty} ${plural(med.unit, med.defaultDispenseQty)}` : null],
  ];

  return (
    <div className="mi-drawer-overlay" style={{ fontFamily: FONT }} onClick={onClose}>
      <div className="mi-drawer" onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 leading-tight">
              {med.name}
              {med.isPrescriptionOnly && (
                <span className="ml-2 align-middle text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">Rx</span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {med.archivedAt
                ? <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-gray-100 text-gray-600 border-gray-200">Archived</span>
                : <StatusBadge qty={usable} threshold={med.lowStockThreshold} />}
              <ExpiryBadge med={med} />
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="mi-body px-5 py-5 space-y-6">
          {/* Stock */}
          <div className="rounded-xl border border-gray-200 px-4 py-3.5">
            <p className="text-xs text-gray-500">In stock</p>
            <p className={`text-xl font-semibold mt-0.5 ${STATUS_META[s].text}`}>{formatStock(med.stockQty, med)}</p>
            {med.piecesPerPack > 1 && (
              <p className="text-xs text-gray-400 mt-0.5">= {med.stockQty} {plural(med.unit, med.stockQty)}</p>
            )}
            <div className="mt-3"><StockBar qty={usable} threshold={med.lowStockThreshold} /></div>
            <p className="text-xs text-gray-500 mt-2">Alert at {med.lowStockThreshold} {plural(med.unit, med.lowStockThreshold)}</p>
          </div>

          {/* Actions */}
          {canManage && (
            <div className="grid grid-cols-2 gap-2">
              {!med.archivedAt && (
                <>
                  <button onClick={onRestock}
                    className="h-10 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5"
                    style={{ background: MAROON }}>
                    <PackagePlus size={15} /> Restock
                  </button>
                  <button onClick={onAdjust}
                    className="h-10 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1.5">
                    <SlidersHorizontal size={15} /> Adjust
                  </button>
                </>
              )}
              <button onClick={onEdit}
                className="h-10 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1.5">
                <Edit2 size={14} /> Edit
              </button>
              {med.archivedAt ? (
                <button onClick={onRestore}
                  className="h-10 rounded-lg text-sm font-semibold text-green-700 border border-green-200 hover:bg-green-50 flex items-center justify-center gap-1.5">
                  <ArchiveRestore size={15} /> Restore
                </button>
              ) : (
                <button onClick={onDelete}
                  className="h-10 rounded-lg text-sm font-semibold text-red-600 border border-red-100 hover:bg-red-50 flex items-center justify-center gap-1.5">
                  <Trash2 size={14} /> Remove
                </button>
              )}
            </div>
          )}

          {/* Details */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Details</p>
            <dl className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {details.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="text-gray-900 font-medium text-right">{v}</dd>
                </div>
              ))}
              {details.every(([, v]) => !v) && (
                <p className="px-4 py-3 text-xs text-gray-400">Wala pang detalye. Pindutin ang Edit para magdagdag.</p>
              )}
            </dl>
            {med.notes && <p className="text-xs text-gray-500 mt-2 leading-relaxed">{med.notes}</p>}
          </div>

          {/* Batches */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Batches (nauuna ang pinakamalapit mag-expire)</p>
            {loading ? (
              <div className="h-14 rounded-xl bg-gray-100 animate-pulse" />
            ) : batches.length === 0 ? (
              <p className="text-xs text-gray-400">Walang batch na may natitira.</p>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {batches.map(b => {
                  const exp     = b.expiryDate ? new Date(b.expiryDate).getTime() : null;
                  const expired = exp !== null && exp <= now;
                  const soon    = exp !== null && !expired && exp <= now + 30 * 86400000;
                  return (
                    <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{formatStock(b.qtyRemaining, med)}</p>
                        <p className="text-xs text-gray-500">{b.batchNo ? `Batch ${b.batchNo}` : "No batch no."}</p>
                      </div>
                      <p className={`text-xs font-medium whitespace-nowrap ${expired ? "text-red-600" : soon ? "text-amber-600" : "text-gray-500"}`}>
                        {b.expiryDate ? `${expired ? "Expired " : "Exp "}${fmtDate(b.expiryDate)}` : "No expiry"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* History */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Stock history</p>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[0, 1, 2].map(i => <div key={i} className="h-12 rounded-xl bg-gray-100" />)}
              </div>
            ) : error ? (
              <p className="text-xs text-red-600">{error}</p>
            ) : movements.length === 0 ? (
              <p className="text-xs text-gray-400">Wala pang galaw ng stock.</p>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {movements.map(mv => {
                  const meta = MOVE_META[mv.type] ?? { label: mv.type, cls: "bg-gray-100 text-gray-700" };
                  return (
                    <div key={mv.id} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                        <span className={`text-sm font-semibold tabular-nums ${mv.qtyChange >= 0 ? "text-green-700" : "text-red-600"}`}>
                          {mv.qtyChange >= 0 ? "+" : ""}{mv.qtyChange}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 mt-1">
                        <p className="text-xs text-gray-500 truncate">
                          {mv.reason ?? "—"}{mv.createdBy ? ` · ${mv.createdBy.name}` : ""}
                        </p>
                        <p className="text-xs text-gray-400 whitespace-nowrap">Balance {mv.balanceAfter}</p>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{fmtDateTime(mv.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOBILE MEDICINE CARD
───────────────────────────────────────────────────────────────────────────── */
function MedicineMobileCard({ med, canManage, onOpen, onRestock, onAdjust, onEdit }: {
  med: MedicineInventory; canManage: boolean;
  onOpen: () => void; onRestock: () => void; onAdjust: () => void; onEdit: () => void;
}) {
  const usable = usableQty(med);
  const s      = getStatus(usable, med.lowStockThreshold);
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" onClick={onOpen} className="block w-full text-left px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2", color: MAROON }}>
              <Pill size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{med.name}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {[med.strength, med.category].filter(Boolean).join(" · ") || fmtUnit(med.unit)}
              </p>
            </div>
          </div>
          <StatusBadge qty={usable} threshold={med.lowStockThreshold} />
        </div>

        <div className="mt-3.5">
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <p className={`text-base font-semibold ${STATUS_META[s].text}`}>{formatStock(med.stockQty, med)}</p>
            <p className="text-xs text-gray-500 whitespace-nowrap">Alert at {med.lowStockThreshold}</p>
          </div>
          <StockBar qty={usable} threshold={med.lowStockThreshold} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <ExpiryBadge med={med} />
          {med.nextExpiry && <span className="text-xs text-gray-500">Next expiry {fmtDate(med.nextExpiry)}</span>}
        </div>
      </button>

      {canManage && !med.archivedAt && (
        <div className="flex divide-x divide-gray-100 border-t border-gray-100">
          <button onClick={onRestock}
            className="flex-1 flex items-center justify-center gap-1.5 h-11 text-sm font-medium active:bg-gray-50" style={{ color: MAROON }}>
            <PackagePlus size={14} /> Restock
          </button>
          <button onClick={onAdjust}
            className="flex-1 flex items-center justify-center gap-1.5 h-11 text-sm font-medium text-gray-600 active:bg-gray-50">
            <SlidersHorizontal size={14} /> Adjust
          </button>
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 h-11 text-sm font-medium text-gray-600 active:bg-gray-50">
            <Edit2 size={14} /> Edit
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SORTABLE TABLE HEADER
───────────────────────────────────────────────────────────────────────────── */
function SortTh({ label, k, sortKey, sortDir, onSort, className = "" }: {
  label: string; k: SortKey; sortKey: SortKey; sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = sortKey === k;
  return (
    <th className={`text-left text-xs font-semibold text-gray-600 px-4 py-3 ${className}`}>
      <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-gray-900">
        {label}
        {active
          ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
          : <ChevronDown size={12} className="opacity-0" />}
      </button>
    </th>
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [sortKey,      setSortKey]      = useState<SortKey>("status");
  const [sortDir,      setSortDir]      = useState<"asc" | "desc">("asc");
  const [page,         setPage]         = useState(1);
  const [version,      setVersion]      = useState(0);

  const [showAdd,       setShowAdd]       = useState(false);
  const [editTarget,    setEditTarget]    = useState<MedicineInventory | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<MedicineInventory | null>(null);
  const [restockTarget, setRestockTarget] = useState<MedicineInventory | null>(null);
  const [adjustTarget,  setAdjustTarget]  = useState<MedicineInventory | null>(null);
  const [drawerId,      setDrawerId]      = useState<string | null>(null);

  // Head and Staff can always manage; pure admin viewers are read-only
  const canManage = isHead || !isAdmin;

  const fetchMedicines = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (showArchived) params.set("archived", "1");
      const res  = await fetch(`/api/courses/${courseId}/medicine-inventory?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMedicines(data.medicines ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load medicines.");
    } finally {
      setLoading(false);
    }
  }, [courseId, search, showArchived]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);
  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter, showArchived, sortKey, sortDir]);

  const refreshAll = () => { fetchMedicines(); setVersion(v => v + 1); };

  const drawerMed = drawerId ? medicines.find(m => m.id === drawerId) ?? null : null;

  const active = useMemo(() => medicines.filter(m => !m.archivedAt), [medicines]);

  const counts = useMemo(() => {
    const c = { all: active.length, in: 0, low: 0, out: 0, exp: 0 };
    active.forEach(m => {
      c[getStatus(usableQty(m), m.lowStockThreshold)]++;
      if (m.expiredQty > 0 || m.expiringSoonQty > 0) c.exp++;
    });
    return c;
  }, [active]);

  const categories = useMemo(
    () => Array.from(new Set(medicines.map(m => m.category).filter((c): c is string => !!c))).sort(),
    [medicines]
  );

  const visible = useMemo(() => {
    const rank: Record<Status, number> = { out: 0, low: 1, in: 2 };
    const list = medicines.filter(m => {
      if (categoryFilter && m.category !== categoryFilter) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "exp") return m.expiredQty > 0 || m.expiringSoonQty > 0;
      return getStatus(usableQty(m), m.lowStockThreshold) === statusFilter;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let r = 0;
      if (sortKey === "name")     r = a.name.localeCompare(b.name);
      else if (sortKey === "stock")    r = a.stockQty - b.stockQty;
      else if (sortKey === "category") r = (a.category ?? "~").localeCompare(b.category ?? "~");
      else if (sortKey === "expiry") {
        const ea = a.nextExpiry ? new Date(a.nextExpiry).getTime() : Infinity;
        const eb = b.nextExpiry ? new Date(b.nextExpiry).getTime() : Infinity;
        r = ea === eb ? 0 : ea < eb ? -1 : 1;
      } else {
        r = rank[getStatus(usableQty(a), a.lowStockThreshold)] - rank[getStatus(usableQty(b), b.lowStockThreshold)];
      }
      return (r || a.name.localeCompare(b.name)) * dir;
    });
  }, [medicines, statusFilter, categoryFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasFilter = statusFilter !== "all" || !!search || !!categoryFilter;

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const restoreMedicine = async (m: MedicineInventory) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/medicine-inventory/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      if (res.ok) refreshAll();
    } catch { /* ignore */ }
  };

  const STAT_CARDS: { key: StatusFilter; label: string; value: number; color: string }[] = [
    { key: "all", label: "Total medicines", value: counts.all, color: "#111827" },
    { key: "low", label: "Low stock",       value: counts.low, color: "#b45309" },
    { key: "out", label: "Out of stock",    value: counts.out, color: "#b91c1c" },
    { key: "exp", label: "Expiring soon",   value: counts.exp, color: "#c2410c" },
  ];

  const FILTER_CHIPS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in",  label: "In stock" },
    { key: "low", label: "Low" },
    { key: "out", label: "Out" },
    { key: "exp", label: "Expiry" },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50" style={{ fontFamily: FONT }}>
      <style>{TAB_CSS}</style>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 shrink-0 flex items-center justify-between gap-3"
        style={{ borderTop: `3px solid ${MAROON}` }}>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">Medicine inventory</h1>
          <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Track stock, batches, expiry dates, and low-stock alerts.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={refreshAll} aria-label="Refresh"
            className="h-9 w-9 sm:w-auto sm:px-3 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canManage && (
            <button onClick={() => setShowAdd(true)}
              className="hidden sm:flex h-9 px-4 items-center gap-1.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
              style={{ background: MAROON }}>
              <Plus className="w-4 h-4" /> Add medicine
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable area ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4">

          {/* Stat cards (click to filter) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
            {STAT_CARDS.map(s => {
              const isActive = statusFilter === s.key;
              return (
                <button key={s.key} type="button" onClick={() => setStatusFilter(s.key)}
                  aria-pressed={isActive}
                  className="text-left bg-white border rounded-xl px-3.5 sm:px-5 py-3 sm:py-4 transition-all hover:border-gray-300"
                  style={isActive
                    ? { borderColor: MAROON, boxShadow: `inset 0 0 0 1px ${MAROON}` }
                    : { borderColor: "#e5e7eb" }}>
                  <p className="text-2xl font-semibold tabular-nums leading-none" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1.5 leading-tight">{s.label}</p>
                </button>
              );
            })}
          </div>

          {/* Alert banner */}
          {!loading && (counts.low > 0 || counts.out > 0 || counts.exp > 0) && statusFilter === "all" && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-900 leading-snug">
                {[
                  counts.out > 0 && <span key="o"><span className="font-semibold">{counts.out}</span> out of stock</span>,
                  counts.low > 0 && <span key="l"><span className="font-semibold">{counts.low}</span> running low</span>,
                  counts.exp > 0 && <span key="e"><span className="font-semibold">{counts.exp}</span> expired or expiring within 30 days</span>,
                ].filter(Boolean).reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ", ", el]), [])}
                . Consider restocking soon.
              </p>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-10 bg-white focus-within:border-gray-400 transition-all flex-1 lg:max-w-sm">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name, brand, generic, category" aria-label="Search medicines"
                className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-400 hover:text-gray-600 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              <div className="flex p-1 bg-gray-100 rounded-lg" role="tablist" aria-label="Filter by status">
                {FILTER_CHIPS.map(c => {
                  const isActive = statusFilter === c.key;
                  return (
                    <button key={c.key} type="button" role="tab" aria-selected={isActive}
                      onClick={() => setStatusFilter(c.key)}
                      className="h-8 px-3 rounded-md text-xs font-semibold transition-all"
                      style={isActive
                        ? { background: "#fff", color: MAROON, boxShadow: "0 1px 2px rgba(0,0,0,.08)" }
                        : { color: "#6b7280" }}>
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {categories.length > 0 && (
                <div className="relative">
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label="Filter by category"
                    className="h-10 border border-gray-200 rounded-lg pl-3 pr-8 text-xs font-medium text-gray-700 bg-white outline-none appearance-none focus:border-gray-400">
                    <option value="">All categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              )}

              <div className="relative">
                <select value={sortKey} onChange={e => { setSortKey(e.target.value as SortKey); setSortDir("asc"); }} aria-label="Sort by"
                  className="h-10 border border-gray-200 rounded-lg pl-3 pr-8 text-xs font-medium text-gray-700 bg-white outline-none appearance-none focus:border-gray-400">
                  <option value="status">Sort: needs attention</option>
                  <option value="name">Sort: name</option>
                  <option value="stock">Sort: stock</option>
                  <option value="expiry">Sort: nearest expiry</option>
                  <option value="category">Sort: category</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#7b1113]" />
                Show archived
              </label>
            </div>
          </div>

          {/* Content */}
          {loading && medicines.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-4">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                  <div className="h-3 w-40 bg-gray-100 rounded" />
                  <div className="h-3 flex-1 bg-gray-100 rounded hidden sm:block" />
                  <div className="h-5 w-20 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-white border border-red-100 rounded-xl py-16 flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-red-600">{error}</p>
              <button onClick={fetchMedicines} className="text-sm font-semibold hover:underline" style={{ color: MAROON }}>
                Try again
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl py-16 flex flex-col items-center gap-3 text-center px-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                <Package className="w-6 h-6" style={{ color: MAROON }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {hasFilter ? "No medicines match your filters" : "No medicines yet"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {hasFilter ? "Try a different search or filter." : "Add your first medicine to start tracking stock."}
                </p>
              </div>
              {hasFilter ? (
                <button onClick={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter(""); }}
                  className="text-sm font-semibold hover:underline" style={{ color: MAROON }}>
                  Clear filters
                </button>
              ) : canManage && (
                <button onClick={() => setShowAdd(true)}
                  className="h-9 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5"
                  style={{ background: MAROON }}>
                  <Plus size={15} /> Add medicine
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <SortTh label="Medicine"    k="name"     sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="pl-5" />
                      <SortTh label="Stock level" k="stock"    sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                      <SortTh label="Status"      k="status"   sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                      <SortTh label="Next expiry" k="expiry"   sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                      <SortTh label="Category"    k="category" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                      <th className="px-4 py-3 pr-5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paged.map(med => {
                      const usable = usableQty(med);
                      const s      = getStatus(usable, med.lowStockThreshold);
                      return (
                        <tr key={med.id} onClick={() => setDrawerId(med.id)}
                          className={`hover:bg-gray-50/70 transition-colors group cursor-pointer ${med.archivedAt ? "opacity-60" : ""}`}>
                          <td className="py-3.5 px-4 pl-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2", color: MAROON }}>
                                <Pill size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {med.name}
                                  {med.isPrescriptionOnly && (
                                    <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">Rx</span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {[med.genericName, med.strength].filter(Boolean).join(" · ") || fmtUnit(med.unit)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 w-64">
                            <p className={`text-sm font-semibold mb-1.5 ${STATUS_META[s].text}`}>{formatStock(med.stockQty, med)}</p>
                            <StockBar qty={usable} threshold={med.lowStockThreshold} />
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col items-start gap-1.5">
                              {med.archivedAt
                                ? <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-gray-100 text-gray-600 border-gray-200">Archived</span>
                                : <StatusBadge qty={usable} threshold={med.lowStockThreshold} />}
                              <ExpiryBadge med={med} />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-sm text-gray-600 whitespace-nowrap">{fmtDate(med.nextExpiry)}</td>
                          <td className="py-3.5 px-4 text-xs text-gray-600">{med.category ?? <span className="text-gray-300">—</span>}</td>
                          <td className="py-3.5 px-4 pr-5 text-right" onClick={e => e.stopPropagation()}>
                            {canManage && !med.archivedAt && (
                              <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                                <button onClick={() => setRestockTarget(med)} title="Restock" aria-label={`Restock ${med.name}`}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100" style={{ color: MAROON }}>
                                  <PackagePlus size={15} />
                                </button>
                                <button onClick={() => setAdjustTarget(med)} title="Adjust" aria-label={`Adjust ${med.name}`}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                  <SlidersHorizontal size={14} />
                                </button>
                                <button onClick={() => setEditTarget(med)} title="Edit" aria-label={`Edit ${med.name}`}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => setDeleteTarget(med)} title="Remove" aria-label={`Remove ${med.name}`}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2.5">
                {paged.map(med => (
                  <MedicineMobileCard key={med.id} med={med} canManage={canManage}
                    onOpen={() => setDrawerId(med.id)}
                    onRestock={() => setRestockTarget(med)}
                    onAdjust={() => setAdjustTarget(med)}
                    onEdit={() => setEditTarget(med)} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                <p>
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, visible.length)} of {visible.length}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Previous page"
                      className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50">
                      <ChevronLeft size={14} />
                    </button>
                    <span className="px-1 tabular-nums">Page {safePage} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Next page"
                      className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="mi-action-spacer" aria-hidden="true" />
      </div>

      {/* ── Mobile action bar ── */}
      <div className="mi-action-bar">
        <p className="text-xs text-gray-500 font-medium">
          {loading ? "Loading…" : `${visible.length} of ${medicines.length} medicine${medicines.length !== 1 ? "s" : ""}`}
        </p>
        {canManage && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-white active:opacity-80"
            style={{ background: MAROON }}>
            <Plus className="w-4 h-4" /> Add medicine
          </button>
        )}
      </div>

      {/* ── Drawer ── */}
      {drawerMed && (
        <DetailDrawer
          courseId={courseId} med={drawerMed} version={version} canManage={canManage}
          onClose={() => setDrawerId(null)}
          onRestock={() => setRestockTarget(drawerMed)}
          onAdjust={() => setAdjustTarget(drawerMed)}
          onEdit={() => setEditTarget(drawerMed)}
          onDelete={() => setDeleteTarget(drawerMed)}
          onRestore={() => restoreMedicine(drawerMed)}
        />
      )}

      {/* ── Modals ── */}
      {(showAdd || editTarget) && (
        <MedicineModal
          courseId={courseId}
          medicine={editTarget}
          onClose={() => { setShowAdd(false); setEditTarget(null); }}
          onSaved={() => { setShowAdd(false); setEditTarget(null); refreshAll(); }}
        />
      )}

      {restockTarget && (
        <RestockModal courseId={courseId} med={restockTarget}
          onClose={() => setRestockTarget(null)}
          onDone={() => { setRestockTarget(null); refreshAll(); }} />
      )}

      {adjustTarget && (
        <AdjustModal courseId={courseId} med={adjustTarget} canReduce={isHead}
          onClose={() => setAdjustTarget(null)}
          onDone={() => { setAdjustTarget(null); refreshAll(); }} />
      )}

      {deleteTarget && (
        <DeleteModal
          medicine={deleteTarget}
          courseId={courseId}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); setDrawerId(null); refreshAll(); }}
        />
      )}
    </div>
  );
}