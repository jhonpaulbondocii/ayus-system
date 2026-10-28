"use client";

// src/components/layout/course/CoursePatientRecordsTab.tsx

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  Search, Plus, X, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  Trash2, Check, ArrowLeft, FileText, Download, SlidersHorizontal,
  Stethoscope, Pill, AlertTriangle, PenLine, MoreVertical, Inbox, ExternalLink,
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

/* ════════════════════════════════════════════════════════════════════════════
   2. CONSTANTS & TYPES
   ════════════════════════════════════════════════════════════════════════════ */

const ACTION_OPTIONS = [
  { value: "GIVEN_MEDICINE",    label: "Given Medicine Only"  },
  { value: "SENT_HOME",         label: "Sent Home"            },
  { value: "FOR_OBSERVATION",   label: "For Observation"      },
  { value: "REFERRED_HOSPITAL", label: "Referred to Hospital" },
  { value: "REFERRED_GUIDANCE", label: "Referred to Guidance" },
];

const ACTION_META: Record<string, { color: string; bg: string }> = {
  GIVEN_MEDICINE:    { color: "#065f46", bg: "#d1fae5" },
  SENT_HOME:         { color: "#1e40af", bg: "#dbeafe" },
  FOR_OBSERVATION:   { color: "#92400e", bg: "#fef3c7" },
  REFERRED_HOSPITAL: { color: "#991b1b", bg: "#fee2e2" },
  REFERRED_GUIDANCE: { color: "#5b21b6", bg: "#ede9fe" },
};

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hh   = h % 12 === 0 ? 12 : h % 12;
    const mm   = m === 0 ? "00" : "30";
    const ampm = h < 12 ? "AM" : "PM";
    TIME_OPTIONS.push(`${hh}:${mm} ${ampm}`);
  }
}

interface StudentInfo {
  id:            string;
  studentNumber: string;
  name:          string;
  email:         string | null;
  address:       string | null;
  age:           number | null;
  birthDate?:    string | null;
  gender:        string | null;
  course:        string | null;
}

interface MedicineInventory {
  id:                string;
  name:              string;
  unit:              string;
  stockQty:          number;
  lowStockThreshold: number;
}

interface MedicineUsageEntry {
  medicineId:   string;
  medicineName: string;
  unit:         string;
  quantityUsed: number;
  stockQty:     number;
}

interface MedicineUsage {
  id:           string;
  medicineName: string;
  quantityUsed: number;
  unit:         string;
}

interface PatientRecord {
  id:            string;
  complaint:     string;
  temperature:   number | null;
  bloodPressure: string | null;
  pulseRate:     number | null;
  weight:        number | null;
  diagnosis:     string | null;
  medicine:      string | null;
  bodySystemId:       string | null;
  medicalConditionId: string | null;
  action:        string;
  notes:         string | null;
  visitDate:     string;
  createdAt:     string;
  student:       StudentInfo;
  recordedByUser:{ id: string; name: string };
  medicineUsages?: MedicineUsage[];
  signatureUrl?:    string | null;
  signatureMethod?: string | null;
  signedAt?:        string | null;
}

interface Props {
  courseId:      string;
  isAdmin:       boolean;
  isHead:        boolean;
  currentUserId: string | null;
}

/* ════════════════════════════════════════════════════════════════════════════
   3. HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function actionLabel(action: string) {
  return ACTION_OPTIONS.find(a => a.value === action)?.label ?? action;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function currentTime() {
  const d = new Date();
  const h = d.getHours(), m = d.getMinutes();
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m < 30 ? 0 : 30).padStart(2, "0");
  return `${hh}:${mm} ${h < 12 ? "AM" : "PM"}`;
}
function formatMedicineUsages(usages: MedicineUsage[]): string {
  if (!usages || usages.length === 0) return "";
  return usages.map(u => `${u.medicineName} × ${u.quantityUsed} ${u.unit}`).join(", ");
}
function courseAbbrev(course: string | null | undefined): string | null {
  if (!course) return null;
  const match = course.match(/\(([^)]+)\)/);
  return match ? match[1] : course;
}
function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
function studentAge(student: { age: number | null; birthDate?: string | null }): number | null {
  return student.age ?? calcAge(student.birthDate);
}

function getDatePresets(setFrom: (v: string) => void, setTo: (v: string) => void) {
  return [
    { label: "Today", fn: () => { const d = todayISO(); setFrom(d); setTo(d); } },
    { label: "Yesterday", fn: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = toLocalISODate(d); setFrom(s); setTo(s); } },
    { label: "This week", fn: () => {
        const now = new Date(); const mon = new Date(now);
        mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        setFrom(toLocalISODate(mon)); setTo(toLocalISODate(now));
    } },
    { label: "This month", fn: () => {
        const now = new Date();
        setFrom(toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1))); setTo(toLocalISODate(now));
    } },
  ];
}

/* ════════════════════════════════════════════════════════════════════════════
   4. SMALL UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════ */

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white placeholder:text-gray-400";
const textareaCls = inputCls + " resize-none";
const selectCls = inputCls + " appearance-none cursor-pointer pr-8";

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function SelectWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <h3 className="text-sm font-bold mb-3" style={{ color: C.ink }}>
      {children}
      {hint && <span className="ml-2 text-xs font-medium" style={{ color: C.faint }}>{hint}</span>}
    </h3>
  );
}

function ActionBadge({ action, short }: { action: string; short?: boolean }) {
  const m = ACTION_META[action] ?? { color: "#374151", bg: "#f3f4f6" };
  const label = actionLabel(action);
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}
    >
      {short ? label.split(" ")[0] : label}
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

function Panel({ title, right, children, className = "" }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-xl border overflow-hidden ${className}`} style={{ borderColor: C.line }}>
      <header className="px-4 sm:px-5 py-3 border-b flex items-center justify-between gap-2" style={{ borderColor: C.lineSoft }}>
        <h2 className="text-sm font-bold" style={{ color: C.ink }}>{title}</h2>
        {right}
      </header>
      {children}
    </section>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium mb-0.5" style={{ color: C.muted }}>{label}</dt>
      <dd className="text-[13px] font-medium break-words" style={{ color: C.ink, lineHeight: 1.5 }}>{value}</dd>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   5. MODAL SHELL (bottom-sheet on mobile, centered on desktop)
   ════════════════════════════════════════════════════════════════════════════ */

function SheetModal({
  onClose, tone = "brand", icon, title, subtitle, children, footer, toolbar,
  maxWidth = "max-w-md", tall = false, z = 50, dismissable = true,
}: {
  onClose: () => void;
  tone?: "brand" | "danger";
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  toolbar?: ReactNode;
  maxWidth?: string;
  tall?: boolean;
  z?: number;
  dismissable?: boolean;
}) {
  useEffect(() => {
    if (!dismissable) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, dismissable]);

  const accent = tone === "danger" ? C.danger : C.brand;

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/40"
      style={{ backdropFilter: "blur(3px)", fontFamily: FONT, zIndex: z }}
      onClick={dismissable ? onClose : undefined}
    >
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} sm:mx-4 overflow-hidden flex flex-col ${tall ? "h-[92vh] sm:h-[88vh]" : "max-h-[92vh]"}`}
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
        {toolbar}
        <div className={tall ? "flex-1 min-h-0 flex overflow-hidden" : "overflow-y-auto"}>{children}</div>
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

const btnGhost =
  "h-10 px-4 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 shrink-0";

/* ════════════════════════════════════════════════════════════════════════════
   6. BODY SYSTEM + CONDITION SELECT
   ════════════════════════════════════════════════════════════════════════════ */

interface BodySystemOption {
  id:         string;
  name:       string;
  conditions: { id: string; name: string }[];
}

function BodySystemConditionSelect({
  courseId, bodySystemId, conditionId, onChange,
}: {
  courseId:     string;
  bodySystemId: string;
  conditionId:  string;
  onChange:     (bodySystemId: string, conditionId: string, conditionName: string) => void;
}) {
  const [bodySystems, setBodySystems] = useState<BodySystemOption[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/body-systems`)
      .then(r => r.json())
      .then(d => { setBodySystems(d.bodySystems ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [courseId]);

  const selectedSystem = bodySystems.find(b => b.id === bodySystemId);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <FieldLabel required>Body system</FieldLabel>
        <SelectWrapper>
          <select value={bodySystemId} onChange={e => onChange(e.target.value, "", "")}
            className={selectCls} disabled={loading}>
            <option value="">{loading ? "Loading…" : "Select body system"}</option>
            {bodySystems.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </SelectWrapper>
      </div>
      <div>
        <FieldLabel required>Medical condition</FieldLabel>
        <SelectWrapper>
          <select
            value={conditionId}
            onChange={e => {
              const cond = selectedSystem?.conditions.find(c => c.id === e.target.value);
              onChange(bodySystemId, e.target.value, cond?.name ?? "");
            }}
            className={selectCls} disabled={!selectedSystem}>
            <option value="">{selectedSystem ? "Select condition" : "Pick body system first"}</option>
            {selectedSystem?.conditions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </SelectWrapper>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   7. MEDICINE PICKER
   ════════════════════════════════════════════════════════════════════════════ */

function MedicinePicker({ courseId, entries, onChange }: {
  courseId: string;
  entries:  MedicineUsageEntry[];
  onChange: (entries: MedicineUsageEntry[]) => void;
}) {
  const [inventory,    setInventory]    = useState<MedicineInventory[]>([]);
  const [loadingInv,   setLoadingInv]   = useState(true);
  const [pickerSearch, setPickerSearch] = useState("");
  const [showPicker,   setShowPicker]   = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/medicine-inventory`)
      .then(r => r.json())
      .then(d => { setInventory(d.medicines ?? []); setLoadingInv(false); })
      .catch(() => setLoadingInv(false));
  }, [courseId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const alreadyPicked = new Set(entries.map(e => e.medicineId));
  const filteredInv = inventory.filter(m =>
    (!pickerSearch || m.name.toLowerCase().includes(pickerSearch.toLowerCase())) &&
    !alreadyPicked.has(m.id)
  );

  const addMedicine = (med: MedicineInventory) => {
    onChange([...entries, { medicineId: med.id, medicineName: med.name, unit: med.unit, quantityUsed: 1, stockQty: med.stockQty }]);
    setShowPicker(false); setPickerSearch("");
  };

  return (
    <div className="space-y-2">
      {entries.map(entry => {
        const isInsufficient = entry.quantityUsed > entry.stockQty;
        const isLow = entry.stockQty <= 10 && !isInsufficient;
        return (
          <div key={entry.medicineId}
            className="flex items-center gap-2 p-2.5 rounded-xl border"
            style={{
              borderColor: isInsufficient ? "#fecaca" : isLow ? "#fde68a" : C.line,
              background:  isInsufficient ? "#fef2f2" : isLow ? "#fffbeb" : "#fafafa",
            }}>
            <Pill size={14} className="text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: C.ink }}>{entry.medicineName}</p>
              <p className="text-[11px]" style={{ color: C.muted }}>{entry.stockQty} {entry.unit}(s) in stock</p>
            </div>
            <input type="number" min="1" value={entry.quantityUsed} aria-label={`Quantity of ${entry.medicineName}`}
              onChange={e => onChange(entries.map(en => en.medicineId === entry.medicineId ? { ...en, quantityUsed: Math.max(1, parseInt(e.target.value) || 1) } : en))}
              className="w-14 h-8 border border-gray-200 rounded-lg px-1.5 text-xs text-center outline-none focus:border-[#7b1113] bg-white shrink-0" />
            <span className="text-[11px] shrink-0 hidden sm:inline" style={{ color: C.muted }}>{entry.unit}</span>
            {isInsufficient && <AlertTriangle size={13} className="text-red-400 shrink-0" />}
            <button onClick={() => onChange(entries.filter(en => en.medicineId !== entry.medicineId))}
              aria-label={`Remove ${entry.medicineName}`}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
              <X size={13} />
            </button>
          </div>
        );
      })}

      {entries.some(e => e.quantityUsed > e.stockQty) && (
        <div className="flex items-center gap-2 text-xs font-semibold rounded-lg px-3 py-2" role="alert"
          style={{ color: C.danger, background: "#fef2f2", border: "1px solid #fecaca" }}>
          <AlertTriangle size={13} /> Some medicines exceed available stock.
        </div>
      )}

      <div className="relative" ref={pickerRef}>
        <button type="button" onClick={() => setShowPicker(v => !v)}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 h-9 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors w-full">
          <Plus size={13} /> Add medicine from inventory
        </button>
        {showPicker && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border rounded-xl shadow-lg z-20 overflow-hidden" style={{ borderColor: C.line }}>
            <div className="px-3 py-2 border-b" style={{ borderColor: C.lineSoft }}>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 h-8">
                <Search size={12} className="text-gray-400 shrink-0" />
                <input autoFocus value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Search medicines…" className="flex-1 text-xs outline-none bg-transparent text-gray-700 placeholder:text-gray-400" />
              </div>
            </div>
            <div className="overflow-y-auto max-h-44">
              {loadingInv ? (
                <div className="flex items-center justify-center py-6 text-xs text-gray-400 gap-1.5">
                  <RefreshCw size={12} className="animate-spin" /> Loading…
                </div>
              ) : filteredInv.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">
                  {inventory.length === 0 ? "No medicines in inventory." : "No matches."}
                </div>
              ) : filteredInv.map(med => {
                const isOut = med.stockQty <= 0;
                const isLow = med.stockQty > 0 && med.stockQty <= med.lowStockThreshold;
                return (
                  <button key={med.id} type="button" onClick={() => addMedicine(med)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: C.ink }}>{med.name}</p>
                      <p className="text-[11px]" style={{ color: C.muted }}>{med.stockQty} {med.unit}(s)</p>
                    </div>
                    {isOut && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2" style={{ background: "#fee2e2", color: "#991b1b" }}>Out</span>}
                    {isLow && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2" style={{ background: "#fef3c7", color: "#92400e" }}>Low</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   8. ROW ACTIONS MENU (fixed-position, never clipped by tables)
   ════════════════════════════════════════════════════════════════════════════ */

function RowActionsMenu({ onMedCert, onEdit, onDelete, label = "Row actions" }: {
  onMedCert?: () => void; onEdit?: () => void; onDelete?: () => void; label?: string;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPos(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pos]);

  if (!onMedCert && !onEdit && !onDelete) return null;

  const open = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const count = [onMedCert, onEdit, onDelete].filter(Boolean).length;
    const h = count * 40 + 8;
    const flip = r.bottom + h > window.innerHeight;
    setPos({ x: r.right, y: flip ? r.top - h - 4 : r.bottom + 4 });
  };

  const item = "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-gray-50";

  return (
    <>
      <button onClick={open} aria-label={label} aria-haspopup="menu"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <MoreVertical size={16} />
      </button>
      {pos && (
        <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setPos(null); }}>
          <div
            role="menu"
            className="absolute w-48 bg-white rounded-xl border shadow-lg py-1 overflow-hidden"
            style={{ top: pos.y, left: Math.max(8, pos.x - 192), borderColor: C.line, fontFamily: FONT }}
            onClick={e => e.stopPropagation()}
          >
            {onMedCert && (
              <button role="menuitem" onClick={() => { setPos(null); onMedCert(); }} className={item} style={{ color: C.brand }}>
                <FileText size={14} /> Generate med cert
              </button>
            )}
            {onEdit && (
              <button role="menuitem" onClick={() => { setPos(null); onEdit(); }} className={item} style={{ color: C.ink }}>
                <PenLine size={14} /> Edit
              </button>
            )}
            {onDelete && (
              <button role="menuitem" onClick={() => { setPos(null); onDelete(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-red-50" style={{ color: C.danger }}>
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   9. DELETE CONFIRM MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function DeleteModal({ record, courseId, onClose, onDeleted }: {
  record: PatientRecord; courseId: string; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/patient-records/${record.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to delete."); setDeleting(false); return; }
      onDeleted();
    } catch { setError("Network error. Please try again."); setDeleting(false); }
  };

  return (
    <SheetModal
      onClose={() => { if (!deleting) onClose(); }}
      tone="danger" z={80}
      icon={<Trash2 size={16} />}
      title="Delete this record?"
      maxWidth="max-w-sm"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={deleting} className={`flex-1 ${btnGhost}`}>Cancel</button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: C.danger }}>
            {deleting ? <><RefreshCw size={12} className="animate-spin" /> Deleting…</> : "Delete"}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 text-sm leading-relaxed" style={{ color: C.body }}>
        <strong>{record.student.name}</strong><br />
        {fmtDate(record.visitDate)} · {actionLabel(record.action)}<br />
        This can’t be undone.
        {error && (
          <div className="mt-3 text-xs rounded-lg px-3 py-2" role="alert" style={{ color: C.danger, background: "#fef2f2", border: "1px solid #fecaca" }}>
            {error}
          </div>
        )}
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   10. VISIT SIDEBAR (desktop preview inside Add/Edit modals)
   ════════════════════════════════════════════════════════════════════════════ */

function VisitSidebar({ isWalkIn, walkInName, student, visitDate, visitTime, complaint,
  temperature, bloodPressure, pulseRate, weight, action, medicineUsages }: {
  isWalkIn: boolean; walkInName: string; student: StudentInfo | null;
  visitDate: string; visitTime: string; complaint: string;
  temperature: string; bloodPressure: string; pulseRate: string; weight: string;
  action: string; medicineUsages: MedicineUsageEntry[];
}) {
  const patientName = isWalkIn ? (walkInName || "—") : (student?.name ?? "—");
  const hasVitals = !!(temperature || bloodPressure || pulseRate || weight);
  const label = "text-[11px] font-semibold mb-1.5";

  return (
    <aside className="hidden sm:flex w-60 shrink-0 border-r flex-col px-5 py-5 gap-5 overflow-y-auto bg-gray-50" style={{ borderColor: C.line }}>
      <div>
        <p className={label} style={{ color: C.muted }}>Patient</p>
        <p className="text-sm font-bold leading-snug" style={{ color: C.ink }}>{patientName}</p>
        {!isWalkIn && student && (
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>{student.studentNumber} · {courseAbbrev(student.course) ?? "—"}</p>
        )}
        {isWalkIn && <p className="text-xs font-semibold mt-0.5" style={{ color: "#92400e" }}>Walk-in / emergency</p>}
      </div>
      <div>
        <p className={label} style={{ color: C.muted }}>Visit</p>
        <p className="text-xs font-semibold" style={{ color: C.body }}>{fmtDate(visitDate)}</p>
        <p className="text-xs" style={{ color: C.muted }}>{visitTime}</p>
        {complaint && <p className="text-xs mt-2 leading-snug" style={{ color: C.body }}>{complaint}</p>}
      </div>
      {hasVitals && (
        <div>
          <p className={label} style={{ color: C.muted }}>Vitals</p>
          <dl className="space-y-1.5">
            {temperature   && <div className="flex justify-between text-xs"><dt style={{ color: C.muted }}>Temp</dt><dd className="font-semibold" style={{ color: C.body }}>{temperature}°C</dd></div>}
            {bloodPressure && <div className="flex justify-between text-xs"><dt style={{ color: C.muted }}>BP</dt><dd className="font-semibold" style={{ color: C.body }}>{bloodPressure}</dd></div>}
            {pulseRate     && <div className="flex justify-between text-xs"><dt style={{ color: C.muted }}>Pulse</dt><dd className="font-semibold" style={{ color: C.body }}>{pulseRate} bpm</dd></div>}
            {weight        && <div className="flex justify-between text-xs"><dt style={{ color: C.muted }}>Weight</dt><dd className="font-semibold" style={{ color: C.body }}>{weight} kg</dd></div>}
          </dl>
        </div>
      )}
      {medicineUsages.length > 0 && (
        <div>
          <p className={label} style={{ color: C.muted }}>Medicine</p>
          <div className="space-y-1">
            {medicineUsages.map(m => (
              <p key={m.medicineId} className="text-xs leading-snug" style={{ color: C.body }}>{m.medicineName} × {m.quantityUsed} {m.unit}</p>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto">
        <p className={label} style={{ color: C.muted }}>Action</p>
        <ActionBadge action={action} />
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   11. MEDICAL CERTIFICATE MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function MedCertModal({ courseId, record, onClose }: {
  courseId: string; record: PatientRecord; onClose: () => void;
}) {
  const [recommendation, setRecommendation] = useState(
    record.action === "SENT_HOME"         ? "to be sent home and rest for the day" :
    record.action === "FOR_OBSERVATION"   ? "to remain under observation" :
    record.action === "REFERRED_HOSPITAL" ? "to be referred to a hospital for further evaluation" :
    record.action === "REFERRED_GUIDANCE" ? "to see the Guidance Office for counseling" : ""
  );
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState("");

  const handleGenerate = async () => {
    if (!recommendation.trim()) { setError("Recommendation is required."); return; }
    setGenerating(true); setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/patient-records/medical-certificate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: record.id, recommendation: recommendation.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to generate."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `medical_certificate_${record.student.name.replace(/\s+/g, "_")}.docx`; a.click();
      URL.revokeObjectURL(url); onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setGenerating(false); }
  };

  return (
    <SheetModal
      onClose={onClose} z={90} maxWidth="max-w-lg"
      icon={<FileText size={16} />}
      title="Generate medical certificate"
      subtitle={record.student.name}
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={generating} className={`flex-1 ${btnGhost}`}>Cancel</button>
          <button onClick={handleGenerate} disabled={generating || !recommendation.trim()}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: C.brand }}>
            {generating ? <><RefreshCw size={13} className="animate-spin" /> Generating…</> : <><Download size={13} /> Generate &amp; download</>}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 space-y-4">
        {error && <div className="text-xs rounded-lg px-3 py-2" role="alert" style={{ color: C.danger, background: "#fef2f2", border: "1px solid #fecaca" }}>{error}</div>}

        <div className="rounded-xl border px-4 py-3 bg-gray-50 grid grid-cols-2 gap-x-4 gap-y-3" style={{ borderColor: C.line }}>
          {[
            ["Name",      record.student.name],
            ["Age / sex", `${studentAge(record.student) ?? "—"} / ${record.student.gender ?? "—"}`],
            ["Course",    record.student.course ?? "—"],
            ["Date",      fmtDate(record.visitDate)],
            ["Diagnosis", record.diagnosis ?? record.complaint ?? "—"],
          ].map(([label, val]) => (
            <div key={label} className={label === "Diagnosis" ? "col-span-2" : ""}>
              <p className="text-[11px] font-medium mb-0.5" style={{ color: C.muted }}>{label}</p>
              <p className="text-[13px] font-semibold leading-snug" style={{ color: C.ink }}>{val}</p>
            </div>
          ))}
        </div>

        <div>
          <FieldLabel required>Recommendation</FieldLabel>
          <textarea value={recommendation} onChange={e => setRecommendation(e.target.value)} rows={3}
            placeholder="e.g. 3 days rest starting June 15, 2026" className={textareaCls} />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {["1 day rest", "2 days rest", "3 days rest", "to be sent home", "to be referred to a hospital for further evaluation"].map(p => (
              <button key={p} type="button" onClick={() => setRecommendation(p)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition-colors">
                {p}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: C.faint }}>
          Generated as .docx for printing and signing by the University Physician.
        </p>
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   12. ADD VISIT MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function RadioActionList({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5" role="radiogroup">
      {ACTION_OPTIONS.map(opt => {
        const isSelected = value === opt.value;
        return (
          <label key={opt.value}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border bg-white cursor-pointer transition-colors min-h-10"
            style={{ borderColor: isSelected ? C.brand : C.line, background: isSelected ? C.brandTint : "#fff" }}>
            <input type="radio" name={name} value={opt.value} checked={isSelected}
              onChange={() => onChange(opt.value)} style={{ accentColor: C.brand }} className="shrink-0" />
            <span className="text-sm font-medium" style={{ color: isSelected ? C.brand : C.body }}>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function AddVisitModal({ courseId, onClose, onSaved, courseOptions }: {
  courseId: string; onClose: () => void; onSaved: (record: PatientRecord) => void; courseOptions: string[];
}) {
  type TabKey = "patient" | "visit" | "clinical";
  const TABS: { key: TabKey; label: string }[] = [
    { key: "patient",  label: "Patient" },
    { key: "visit",    label: "Visit info" },
    { key: "clinical", label: "Clinical & action" },
  ];
  const [activeTab,   setActiveTab]   = useState<TabKey>("patient");
  const [showSuccess, setShowSuccess] = useState(false);

  const [isWalkIn,         setIsWalkIn]         = useState(false);
  const [walkInFirstName,  setWalkInFirstName]  = useState("");
  const [walkInMiddleName, setWalkInMiddleName] = useState("");
  const [walkInLastName,   setWalkInLastName]   = useState("");
  const [walkInAge,        setWalkInAge]        = useState("");
  const [walkInGender,     setWalkInGender]     = useState("");
  const [walkInCourse,     setWalkInCourse]     = useState("");
  const [walkInAddress,    setWalkInAddress]    = useState("");

  const walkInFullName = [walkInLastName.trim(), walkInFirstName.trim(), walkInMiddleName.trim()].filter(Boolean).join(", ");

  const [studentNum,    setStudentNum]    = useState("");
  const [student,       setStudent]       = useState<StudentInfo | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError,   setLookupError]   = useState("");

  const [visitDate,          setVisitDate]          = useState(todayISO());
  const [visitTime,          setVisitTime]          = useState(currentTime());
  const [complaint,          setComplaint]          = useState("");
  const [bodySystemId,       setBodySystemId]       = useState("");
  const [medicalConditionId, setMedicalConditionId] = useState("");
  const [temperature,        setTemperature]        = useState("");
  const [bloodPressure,      setBloodPressure]      = useState("");
  const [pulseRate,          setPulseRate]          = useState("");
  const [weight,             setWeight]             = useState("");
  const [diagnosis,          setDiagnosis]          = useState("");
  const [medicineUsages,     setMedicineUsages]     = useState<MedicineUsageEntry[]>([]);
  const [action,             setAction]             = useState("GIVEN_MEDICINE");
  const [referralTo,         setReferralTo]         = useState("");
  const [referralHPI,        setReferralHPI]        = useState("");
  const [referralReason,     setReferralReason]     = useState("");

  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [savedRecord, setSavedRecord] = useState<PatientRecord | null>(null);
  const [showMedCertFromSuccess, setShowMedCertFromSuccess] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lookupStudent = useCallback(async (num: string) => {
    const trimmed = num.trim();
    if (!trimmed) { setStudent(null); setLookupError(""); return; }
    setLookupLoading(true); setLookupError(""); setStudent(null);
    try {
      const res  = await fetch(`/api/courses/${courseId}/patient-records/student-lookup?studentNumber=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error ?? "Student not found."); return; }
      setStudent(data.student);
    } catch { setLookupError("Network error. Please try again."); }
    finally { setLookupLoading(false); }
  }, [courseId]);

  const handleStudentNumChange = (val: string) => {
    setStudentNum(val); setStudent(null); setLookupError("");
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => lookupStudent(val), 600);
  };

  const BP_REGEX = /^\d{2,3}\/\d{2,3}$/;
  const bpValid  = !bloodPressure.trim() || BP_REGEX.test(bloodPressure.trim());

  const patientTabOk  = isWalkIn ? (walkInFirstName.trim().length > 0 && walkInLastName.trim().length > 0) : !!student;
  const visitTabOk    = !!medicalConditionId && !!visitDate && bpValid;
  const referralOk    = action !== "REFERRED_HOSPITAL" || (referralTo.trim().length > 0 && referralReason.trim().length > 0);
  const clinicalTabOk = !!action && referralOk;
  const canSave       = patientTabOk && visitTabOk && clinicalTabOk;

  const tabStatus: Record<TabKey, boolean> = { patient: patientTabOk, visit: visitTabOk, clinical: clinicalTabOk };

  const resetForm = () => {
    setIsWalkIn(false);
    setWalkInFirstName(""); setWalkInMiddleName(""); setWalkInLastName("");
    setWalkInAge(""); setWalkInGender(""); setWalkInCourse(""); setWalkInAddress("");
    setStudentNum(""); setStudent(null); setLookupError("");
    setVisitDate(todayISO()); setVisitTime(currentTime());
    setComplaint(""); setBodySystemId(""); setMedicalConditionId("");
    setTemperature(""); setBloodPressure(""); setPulseRate(""); setWeight("");
    setDiagnosis(""); setMedicineUsages([]); setAction("GIVEN_MEDICINE");
    setReferralTo(""); setReferralHPI(""); setReferralReason("");
    setActiveTab("patient"); setError("");
  };

  const handleSave = async (closeAfter: boolean) => {
    setError("");
    if (!patientTabOk)  { setActiveTab("patient");  setError(isWalkIn ? "Please enter the patient's name." : "Please look up a valid student first."); return; }
    if (!visitTabOk)    { setActiveTab("visit");    setError(!bpValid ? "Blood pressure format is invalid (e.g. 120/80)." : "Please select body system and medical condition."); return; }
    if (!clinicalTabOk) { setActiveTab("clinical"); setError(!referralOk ? "Referral details required for Referred to Hospital." : "Action taken is required."); return; }

    const medicineText = medicineUsages.length > 0
      ? medicineUsages.map(u => `${u.medicineName} × ${u.quantityUsed} ${u.unit}`).join(", ")
      : null;

    setSaving(true);
    try {
      const visitDateTime = new Date(`${visitDate} ${visitTime}`).toISOString();
      const res  = await fetch(`/api/courses/${courseId}/patient-records`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId:     isWalkIn ? null : student!.id,
          isWalkIn,
          walkInName:    isWalkIn ? walkInFullName : undefined,
          walkInAge:     isWalkIn ? (walkInAge ? parseInt(walkInAge) : null) : undefined,
          walkInGender:  isWalkIn ? (walkInGender || null) : undefined,
          walkInCourse:  isWalkIn ? (walkInCourse.trim() || null) : undefined,
          walkInAddress: isWalkIn ? (walkInAddress.trim() || null) : undefined,
          complaint: complaint.trim(), bodySystemId, medicalConditionId,
          temperature:   temperature   ? parseFloat(temperature)   : null,
          bloodPressure: bloodPressure ? bloodPressure.trim()       : null,
          pulseRate:     pulseRate     ? parseInt(pulseRate)         : null,
          weight:        weight        ? parseFloat(weight)          : null,
          diagnosis: diagnosis.trim() || null, medicine: medicineText, action, notes: null, visitDate: visitDateTime,
          medicineUsages: medicineUsages.map(u => ({ medicineId: u.medicineId, quantityUsed: u.quantityUsed })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }

      if (action === "REFERRED_HOSPITAL") {
        try {
          const referralRes = await fetch(`/api/courses/${courseId}/patient-records/referral`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recordId: data.record.id, to: referralTo.trim(), hpi: referralHPI.trim() || null,
              reason: referralReason.trim(), visitDate: visitDateTime, student: data.record.student,
              complaint: complaint.trim(), diagnosis: diagnosis.trim() || null, medicine: medicineText,
              medicineUsages: medicineUsages.map(u => ({ medicineName: u.medicineName, quantityUsed: u.quantityUsed, unit: u.unit })),
            }),
          });
          if (referralRes.ok) {
            const blob = await referralRes.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href = url; a.download = `referral_${data.record.student.name.replace(/\s+/g, "_")}.docx`; a.click();
            URL.revokeObjectURL(url);
          }
        } catch { /* don't block */ }
      }

      onSaved(data.record);
      setSavedRecord(data.record);
      if (closeAfter) { setShowSuccess(true); } else { resetForm(); }
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  const currentIdx = TABS.findIndex(t => t.key === activeTab);
  const prevTab    = currentIdx > 0 ? TABS[currentIdx - 1].key : null;
  const nextTab    = currentIdx < TABS.length - 1 ? TABS[currentIdx + 1].key : null;
  const isLastTab  = activeTab === "clinical";

  const tabBar = !showSuccess ? (
    <div role="tablist" className="flex border-b overflow-x-auto shrink-0 px-2 sm:px-3" style={{ borderColor: C.line }}>
      {TABS.map(t => {
        const active = activeTab === t.key;
        return (
          <button key={t.key} role="tab" aria-selected={active} onClick={() => setActiveTab(t.key)}
            className="relative flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors"
            style={{ color: active ? C.brand : C.muted }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tabStatus[t.key] ? "#22c55e" : "#d1d5db" }} />
            {t.label}
            {active && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full" style={{ background: C.brand }} />}
          </button>
        );
      })}
    </div>
  ) : null;

  const footer = !showSuccess ? (
    <div className="px-4 sm:px-5 py-3 flex flex-wrap gap-2 items-center">
      <button onClick={onClose} disabled={saving} className={btnGhost}>Cancel</button>
      {prevTab && <button onClick={() => setActiveTab(prevTab)} disabled={saving} className={btnGhost}>Back</button>}
      <div className="flex-1" />
      {nextTab && (
        <button onClick={() => setActiveTab(nextTab)}
          className="h-10 px-5 rounded-xl text-xs font-bold text-white shrink-0" style={{ background: C.brand }}>
          Next
        </button>
      )}
      {isLastTab && (
        <>
          <button onClick={() => handleSave(false)} disabled={saving || !canSave}
            className="h-10 px-4 rounded-xl text-xs font-bold border bg-white disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            style={{ borderColor: C.brand, color: C.brand }}>
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
            <span className="hidden sm:inline">Save &amp; new</span>
            <span className="sm:hidden">New</span>
          </button>
          <button onClick={() => handleSave(true)} disabled={saving || !canSave}
            className="h-10 px-5 rounded-xl text-xs font-bold text-white disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            style={{ background: C.brand }}>
            {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Check size={13} /> Save</>}
          </button>
        </>
      )}
    </div>
  ) : undefined;

  return (
    <>
      <SheetModal
        onClose={onClose} tall maxWidth="max-w-5xl" dismissable={!showSuccess}
        icon={<Stethoscope size={16} />}
        title="New patient visit" subtitle="Clinic"
        toolbar={tabBar} footer={footer}
      >
        {!showSuccess && (
          <VisitSidebar isWalkIn={isWalkIn} walkInName={walkInFullName} student={student}
            visitDate={visitDate} visitTime={visitTime} complaint={complaint}
            temperature={temperature} bloodPressure={bloodPressure} pulseRate={pulseRate} weight={weight}
            action={action} medicineUsages={medicineUsages} />
        )}

        <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-5 space-y-5 min-w-0">
          {error && (
            <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2.5" role="alert"
              style={{ color: C.danger, background: "#fef2f2", border: "1px solid #fecaca" }}>
              <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {showSuccess && savedRecord ? (
            <section className="flex flex-col items-center text-center py-10 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#d1fae5" }}>
                <Check className="w-7 h-7" style={{ color: "#065f46" }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: C.ink }}>Visit saved for {savedRecord.student.name}</p>
                <p className="text-xs mt-1" style={{ color: C.muted }}>
                  {action === "REFERRED_HOSPITAL"
                    ? "Referral document downloaded automatically."
                    : "You can generate a medical certificate now if needed."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
                <button onClick={() => setShowMedCertFromSuccess(true)}
                  className="flex-1 h-10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                  style={{ background: C.brand }}>
                  <FileText size={13} /> Generate med cert
                </button>
                <button onClick={onClose} className={`flex-1 ${btnGhost}`}>Done</button>
              </div>
            </section>
          ) : (
            <>
              {/* PATIENT */}
              {activeTab === "patient" && (
                <section className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setIsWalkIn(false)}
                      className="h-10 rounded-lg border text-xs font-semibold transition-colors"
                      style={!isWalkIn ? { borderColor: C.brand, background: C.brandTint, color: C.brand } : { borderColor: C.line, color: C.muted, background: "#fff" }}>
                      Registered student
                    </button>
                    <button type="button" onClick={() => setIsWalkIn(true)}
                      className="h-10 rounded-lg border text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      style={isWalkIn ? { borderColor: C.brand, background: C.brandTint, color: C.brand } : { borderColor: C.line, color: C.muted, background: "#fff" }}>
                      <AlertTriangle size={12} /> Walk-in
                    </button>
                  </div>

                  {isWalkIn ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div><FieldLabel required>Last name</FieldLabel><input value={walkInLastName} onChange={e => setWalkInLastName(e.target.value)} placeholder="Last name" className={inputCls} /></div>
                        <div><FieldLabel required>First name</FieldLabel><input value={walkInFirstName} onChange={e => setWalkInFirstName(e.target.value)} placeholder="First name" className={inputCls} /></div>
                        <div><FieldLabel>Middle name</FieldLabel><input value={walkInMiddleName} onChange={e => setWalkInMiddleName(e.target.value)} placeholder="Middle name" className={inputCls} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><FieldLabel>Age</FieldLabel><input type="number" min="1" max="120" value={walkInAge} onChange={e => setWalkInAge(e.target.value)} placeholder="21" className={inputCls} /></div>
                        <div>
                          <FieldLabel>Gender</FieldLabel>
                          <SelectWrapper>
                            <select value={walkInGender} onChange={e => setWalkInGender(e.target.value)} className={selectCls}>
                              <option value="">Select</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </SelectWrapper>
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Course</FieldLabel>
                        <SelectWrapper>
                          <select value={walkInCourse} onChange={e => setWalkInCourse(e.target.value)} className={selectCls}>
                            <option value="">Select course</option>
                            {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </SelectWrapper>
                      </div>
                      <div><FieldLabel>Address</FieldLabel><input value={walkInAddress} onChange={e => setWalkInAddress(e.target.value)} placeholder="Complete address" className={inputCls} /></div>
                      <p className="text-xs flex items-start gap-1.5" style={{ color: C.muted }}>
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: "#d97706" }} />
                        A temporary record will be created. Link the official student number later.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <FieldLabel required>Student number</FieldLabel>
                      <div className="relative">
                        <input value={studentNum} onChange={e => handleStudentNumChange(e.target.value)}
                          placeholder="Enter student number" className={inputCls} />
                        {lookupLoading && <RefreshCw size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                      </div>
                      {lookupError && <p className="text-xs mt-1.5" style={{ color: C.danger }}>{lookupError}</p>}
                      {student && (
                        <div className="mt-3 border rounded-xl overflow-hidden" style={{ borderColor: C.line }}>
                          <div className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ background: C.brandTint }}>
                            <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: C.brand }}>
                              <Check size={13} /> Student found
                            </span>
                            {!student.email && (
                              <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "#92400e" }}>
                                <AlertTriangle size={11} /> No email
                              </span>
                            )}
                          </div>
                          <dl className="px-4 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3 bg-white">
                            <InfoField label="Name"        value={student.name} />
                            <InfoField label="Student no." value={student.studentNumber} />
                            <InfoField label="Course"      value={student.course ?? "—"} />
                            <InfoField label="Age"         value={studentAge(student) ? `${studentAge(student)} yrs` : "—"} />
                            <InfoField label="Gender"      value={student.gender ?? "—"} />
                            <InfoField label="Address"     value={student.address ?? "—"} />
                          </dl>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* VISIT */}
              {activeTab === "visit" && (
                <div className="space-y-6">
                  <section>
                    <SectionTitle>Visit info</SectionTitle>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div><FieldLabel required>Date</FieldLabel><input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={inputCls} /></div>
                      <div>
                        <FieldLabel required>Time</FieldLabel>
                        <SelectWrapper>
                          <select value={visitTime} onChange={e => setVisitTime(e.target.value)} className={selectCls}>
                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </SelectWrapper>
                      </div>
                    </div>
                    <BodySystemConditionSelect courseId={courseId} bodySystemId={bodySystemId} conditionId={medicalConditionId}
                      onChange={(bsId, condId, condName) => { setBodySystemId(bsId); setMedicalConditionId(condId); setComplaint(condName); }} />
                  </section>

                  <section>
                    <SectionTitle hint="Optional">Vital signs</SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                      <div><FieldLabel>Temperature (°C)</FieldLabel><input type="number" step="0.1" min="30" max="45" value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="36.8" className={inputCls} /></div>
                      <div>
                        <FieldLabel>Blood pressure</FieldLabel>
                        <input value={bloodPressure} onChange={e => setBloodPressure(e.target.value)} placeholder="120/80"
                          className={inputCls} style={!bpValid ? { borderColor: "#ef4444" } : undefined} />
                        {!bpValid && <p className="text-[11px] mt-1" style={{ color: C.danger }}>Format: 120/80</p>}
                      </div>
                      <div><FieldLabel>Pulse rate (bpm)</FieldLabel><input type="number" min="30" max="220" value={pulseRate} onChange={e => setPulseRate(e.target.value)} placeholder="78" className={inputCls} /></div>
                      <div><FieldLabel>Weight (kg)</FieldLabel><input type="number" step="0.1" min="1" max="300" value={weight} onChange={e => setWeight(e.target.value)} placeholder="55" className={inputCls} /></div>
                    </div>
                  </section>
                </div>
              )}

              {/* CLINICAL */}
              {activeTab === "clinical" && (
                <div className="space-y-6">
                  <section>
                    <SectionTitle hint="Optional">Clinical</SectionTitle>
                    <FieldLabel>Diagnosis</FieldLabel>
                    <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} placeholder="Clinical diagnosis" className={textareaCls} />
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <FieldLabel>Medicines given</FieldLabel>
                        {medicineUsages.length > 0 && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: C.brandTint, color: C.brand }}>
                            {medicineUsages.length} selected
                          </span>
                        )}
                      </div>
                      <MedicinePicker courseId={courseId} entries={medicineUsages} onChange={setMedicineUsages} />
                    </div>
                  </section>

                  <section>
                    <SectionTitle>Action taken</SectionTitle>
                    <RadioActionList name="action" value={action} onChange={setAction} />
                  </section>

                  {action === "REFERRED_HOSPITAL" && (
                    <section>
                      <SectionTitle>Referral details</SectionTitle>
                      <div className="space-y-3 border rounded-xl p-4" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
                        <div><FieldLabel required>Refer to</FieldLabel><input value={referralTo} onChange={e => setReferralTo(e.target.value)} placeholder="e.g. Jose B. Lingad Memorial Hospital" className={inputCls} /></div>
                        <div><FieldLabel>History of present illness</FieldLabel><textarea value={referralHPI} onChange={e => setReferralHPI(e.target.value)} rows={3} placeholder="Detailed history" className={textareaCls} /></div>
                        <div><FieldLabel required>Reason for referral</FieldLabel><textarea value={referralReason} onChange={e => setReferralReason(e.target.value)} rows={2} placeholder="Reason" className={textareaCls} /></div>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </SheetModal>

      {showMedCertFromSuccess && savedRecord && (
        <MedCertModal courseId={courseId} record={savedRecord}
          onClose={() => { setShowMedCertFromSuccess(false); onClose(); }} />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   13. EDIT VISIT MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function EditVisitModal({ courseId, record, onClose, onSaved }: {
  courseId: string; record: PatientRecord; onClose: () => void; onSaved: (updated: PatientRecord) => void;
}) {
  const [visitDate,          setVisitDate]          = useState(record.visitDate.split("T")[0]);
  const [visitTime,          setVisitTime]          = useState(fmtTime(record.visitDate));
  const [complaint,          setComplaint]          = useState(record.complaint);
  const [bodySystemId,       setBodySystemId]       = useState(record.bodySystemId ?? "");
  const [medicalConditionId, setMedicalConditionId] = useState(record.medicalConditionId ?? "");
  const [temperature,        setTemperature]        = useState(record.temperature != null ? String(record.temperature) : "");
  const [bloodPressure,      setBloodPressure]      = useState(record.bloodPressure ?? "");
  const [pulseRate,          setPulseRate]          = useState(record.pulseRate != null ? String(record.pulseRate) : "");
  const [weight,             setWeight]             = useState(record.weight != null ? String(record.weight) : "");
  const [diagnosis,          setDiagnosis]          = useState(record.diagnosis ?? "");
  const [action,             setAction]             = useState(record.action);
  const [notes,              setNotes]              = useState(record.notes ?? "");
  const [medicineUsages,     setMedicineUsages]     = useState<MedicineUsageEntry[]>(
    (record.medicineUsages ?? []).map(u => ({ medicineId: u.id, medicineName: u.medicineName, unit: u.unit, quantityUsed: u.quantityUsed, stockQty: 0 }))
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const handleSave = async () => {
    setError("");
    if (!complaint.trim()) { setError("Chief complaint is required."); return; }
    if (!action)           { setError("Action taken is required.");    return; }
    setSaving(true);
    try {
      const visitDateTime = new Date(`${visitDate} ${visitTime}`).toISOString();
      const res  = await fetch(`/api/courses/${courseId}/patient-records/${record.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint: complaint.trim(), bodySystemId, medicalConditionId,
          temperature:   temperature   ? parseFloat(temperature)   : null,
          bloodPressure: bloodPressure || null,
          pulseRate:     pulseRate     ? parseInt(pulseRate)       : null,
          weight:        weight        ? parseFloat(weight)        : null,
          diagnosis: diagnosis.trim() || null,
          medicine: medicineUsages.length > 0 ? medicineUsages.map(u => `${u.medicineName} × ${u.quantityUsed} ${u.unit}`).join(", ") : null,
          action, notes: notes.trim() || null, visitDate: visitDateTime,
          medicineUsages: medicineUsages.map(u => ({ medicineId: u.medicineId, quantityUsed: u.quantityUsed })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      onSaved(data.record);
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <SheetModal
      onClose={onClose} tall maxWidth="max-w-5xl" z={70}
      icon={<Stethoscope size={16} />}
      title="Edit visit record" subtitle={record.student.name}
      footer={
        <div className="px-4 sm:px-5 py-3 flex gap-2">
          <button onClick={onClose} disabled={saving} className={`flex-1 sm:flex-none sm:w-32 ${btnGhost}`}>Cancel</button>
          <div className="hidden sm:block flex-1" />
          <button onClick={handleSave} disabled={saving}
            className="flex-1 sm:flex-none sm:w-44 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: C.brand }}>
            {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Check size={13} /> Save changes</>}
          </button>
        </div>
      }
    >
      <VisitSidebar isWalkIn={false} walkInName="" student={record.student}
        visitDate={visitDate} visitTime={visitTime} complaint={complaint}
        temperature={temperature} bloodPressure={bloodPressure} pulseRate={pulseRate} weight={weight}
        action={action} medicineUsages={medicineUsages} />

      <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-5 space-y-6 min-w-0">
        {error && (
          <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2.5" role="alert"
            style={{ color: C.danger, background: "#fef2f2", border: "1px solid #fecaca" }}>
            <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <section>
          <SectionTitle>Visit info</SectionTitle>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><FieldLabel required>Date</FieldLabel><input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={inputCls} /></div>
            <div>
              <FieldLabel required>Time</FieldLabel>
              <SelectWrapper>
                <select value={visitTime} onChange={e => setVisitTime(e.target.value)} className={selectCls}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </SelectWrapper>
            </div>
          </div>
          <BodySystemConditionSelect courseId={courseId} bodySystemId={bodySystemId} conditionId={medicalConditionId}
            onChange={(bsId, condId, condName) => { setBodySystemId(bsId); setMedicalConditionId(condId); setComplaint(condName); }} />
        </section>

        <section>
          <SectionTitle hint="Optional">Vital signs</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Temperature (°C)</FieldLabel><input type="number" step="0.1" min="30" max="45" value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="36.8" className={inputCls} /></div>
            <div><FieldLabel>Blood pressure</FieldLabel><input value={bloodPressure} onChange={e => setBloodPressure(e.target.value)} placeholder="120/80" className={inputCls} /></div>
            <div><FieldLabel>Pulse rate (bpm)</FieldLabel><input type="number" min="30" max="220" value={pulseRate} onChange={e => setPulseRate(e.target.value)} placeholder="78" className={inputCls} /></div>
            <div><FieldLabel>Weight (kg)</FieldLabel><input type="number" step="0.1" min="1" max="300" value={weight} onChange={e => setWeight(e.target.value)} placeholder="55" className={inputCls} /></div>
          </div>
        </section>

        <section>
          <SectionTitle hint="Optional">Clinical</SectionTitle>
          <FieldLabel>Diagnosis</FieldLabel>
          <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} placeholder="Clinical diagnosis" className={textareaCls} />
          <div className="mt-4">
            <FieldLabel>Medicines given</FieldLabel>
            <p className="text-[11px] mb-2" style={{ color: C.faint }}>Adjusting quantities will automatically correct inventory stock.</p>
            <MedicinePicker courseId={courseId} entries={medicineUsages} onChange={setMedicineUsages} />
          </div>
        </section>

        <section>
          <SectionTitle>Action taken</SectionTitle>
          <RadioActionList name="edit-action" value={action} onChange={setAction} />
        </section>

        <section>
          <FieldLabel>Notes / remarks</FieldLabel>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional notes" className={textareaCls} />
        </section>
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   14. RECORD DETAIL VIEW
   ════════════════════════════════════════════════════════════════════════════ */

function RecordDetailView({ courseId, record, isAdmin, isHead, currentUserId, onBack, onDeleted }: {
  courseId: string; record: PatientRecord; isAdmin: boolean; isHead: boolean;
  currentUserId: string | null; onBack: () => void; onDeleted: (id: string) => void;
}) {
  const [visits,        setVisits]        = useState<PatientRecord[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [deleteTarget,  setDeleteTarget]  = useState<PatientRecord | null>(null);
  const [editTarget,    setEditTarget]    = useState<PatientRecord | null>(null);
  const [medCertTarget, setMedCertTarget] = useState<PatientRecord | null>(null);
  const [showInfoMobile, setShowInfoMobile] = useState(false);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/patient-records/${record.id}`)
      .then(r => r.json())
      .then(d => { setVisits(d.visits ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [courseId, record.id]);

  const canDelete = (r: PatientRecord) => {
    if (isAdmin) return false;
    if (isHead)  return true;
    return r.recordedByUser.id === currentUserId;
  };

  const s = record.student;
  const studentFields = (
    <>
      <div className="px-4 sm:px-5 py-4 border-b" style={{ borderColor: C.lineSoft }}>
        <p className="text-base font-bold" style={{ color: C.ink }}>{s.name}</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>{s.studentNumber}</p>
        {s.course && (
          <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: C.brandTint, color: C.brand }}>
            {s.course}
          </span>
        )}
      </div>
      <dl className="px-4 sm:px-5 py-4 grid grid-cols-1 gap-4">
        <InfoField label="Age"     value={studentAge(s) ? `${studentAge(s)} yrs` : null} />
        <InfoField label="Gender"  value={s.gender} />
        <InfoField label="Address" value={s.address} />
        <InfoField label="Email"   value={s.email} />
      </dl>
    </>
  );

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT, background: C.canvas }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 shrink-0 bg-white border-b" style={{ borderColor: C.line }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold shrink-0" style={{ color: C.brand }}>
          <ArrowLeft size={15} /> Back
        </button>
        <span className="w-px h-4 shrink-0" style={{ background: C.line }} />
        <p className="text-sm font-bold flex-1 truncate min-w-0" style={{ color: C.ink }}>{s.name}</p>
        <button onClick={() => setShowInfoMobile(v => !v)} aria-expanded={showInfoMobile}
          className="lg:hidden text-xs font-semibold px-3 h-8 rounded-lg border border-gray-200 text-gray-600 shrink-0">
          {showInfoMobile ? "Hide info" : "Info"}
        </button>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 tabular-nums" style={{ background: C.brandTint, color: C.brand }}>
          {loading ? "…" : `${visits.length} visit${visits.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start">

          <div className={`${showInfoMobile ? "block" : "hidden"} lg:block`}>
            <Panel title="Student information">{studentFields}</Panel>
          </div>

          <Panel title="Visit history">
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-gray-300">
                <RefreshCw size={15} className="animate-spin" /><span className="text-xs">Loading…</span>
              </div>
            ) : visits.length === 0 ? (
              <EmptyState title="No visits recorded" hint="Visits for this patient will show up here." />
            ) : (
              <ul className="divide-y" style={{ borderColor: C.lineSoft }}>
                {visits.map(v => {
                  const medicinesStr = v.medicineUsages && v.medicineUsages.length > 0 ? formatMedicineUsages(v.medicineUsages) : v.medicine;
                  const hasVitals = v.temperature != null || v.bloodPressure || v.pulseRate != null || v.weight != null;
                  return (
                    <li key={v.id} className="px-4 sm:px-5 py-4" style={{ borderColor: C.lineSoft }}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="text-[13px] font-bold" style={{ color: C.ink }}>{fmtDate(v.visitDate)}</p>
                          <p className="text-xs" style={{ color: C.muted }}>{fmtTime(v.visitDate)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <ActionBadge action={v.action} />
                          {canDelete(v) && (
                            <RowActionsMenu
                              label="Visit actions"
                              onMedCert={() => setMedCertTarget(v)}
                              onEdit={() => setEditTarget(v)}
                              onDelete={() => setDeleteTarget(v)} />
                          )}
                        </div>
                      </div>

                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-3">
                        <InfoField label="Chief complaint" value={v.complaint} />
                        <InfoField label="Diagnosis"       value={v.diagnosis} />
                        <InfoField label="Medicine given"  value={medicinesStr} />
                        <InfoField label="Notes"           value={v.notes} />
                      </dl>

                      {hasVitals && (
                        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg px-3 py-2.5 bg-gray-50 border mb-3" style={{ borderColor: C.lineSoft }}>
                          {v.temperature != null && <InfoField label="Temp"   value={`${v.temperature}°C`} />}
                          {v.bloodPressure       && <InfoField label="BP"     value={v.bloodPressure} />}
                          {v.pulseRate != null   && <InfoField label="Pulse"  value={`${v.pulseRate} bpm`} />}
                          {v.weight != null      && <InfoField label="Weight" value={`${v.weight} kg`} />}
                        </dl>
                      )}

                      <div className="flex items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: C.lineSoft }}>
                        <InfoField label="Recorded by" value={v.recordedByUser.name} />
                        {v.signatureUrl && (
                          <div className="text-right">
                            <p className="text-[11px] font-medium mb-0.5" style={{ color: C.muted }}>Signature</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={v.signatureUrl} alt="Signature"
                              className="h-8 max-w-[90px] object-contain border rounded-md p-0.5 bg-white" style={{ borderColor: C.line }} />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {editTarget && (
        <EditVisitModal courseId={courseId} record={editTarget} onClose={() => setEditTarget(null)}
          onSaved={updated => { setVisits(prev => prev.map(v => v.id === updated.id ? updated : v)); setEditTarget(null); }} />
      )}
      {deleteTarget && (
        <DeleteModal record={deleteTarget} courseId={courseId} onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setVisits(prev => prev.filter(v => v.id !== deleteTarget.id)); onDeleted(deleteTarget.id); setDeleteTarget(null); }} />
      )}
      {medCertTarget && (
        <MedCertModal courseId={courseId} record={medCertTarget} onClose={() => setMedCertTarget(null)} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   15. EXPORT MODAL (top-level so its state survives parent re-renders)
   ════════════════════════════════════════════════════════════════════════════ */

function ExportModal({ courseId, initialFrom, initialTo, initialCourse, courseOptions, onClose }: {
  courseId: string; initialFrom: string; initialTo: string; initialCourse: string;
  courseOptions: string[]; onClose: () => void;
}) {
  const [exportDateFrom, setExportDateFrom] = useState(initialFrom);
  const [exportDateTo,   setExportDateTo]   = useState(initialTo);
  const [exportCourse,   setExportCourse]   = useState(initialCourse);
  const [exporting,      setExporting]      = useState(false);
  const [previewCount,   setPreviewCount]   = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [error,          setError]          = useState("");
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    previewTimeoutRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const params = new URLSearchParams();
        if (exportDateFrom) params.set("dateFrom", exportDateFrom);
        if (exportDateTo)   params.set("dateTo",   exportDateTo);
        const res  = await fetch(`/api/courses/${courseId}/patient-records?${params}`);
        const data = await res.json();
        const list: PatientRecord[] = data.records ?? [];
        setPreviewCount(exportCourse ? list.filter(r => r.student.course === exportCourse).length : list.length);
      } catch { setPreviewCount(0); }
      finally { setPreviewLoading(false); }
    }, 400);
    return () => { if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current); };
  }, [courseId, exportDateFrom, exportDateTo, exportCourse]);

  const handleExport = async () => {
    setExporting(true); setError("");
    try {
      const params = new URLSearchParams({ format: "pdf" });
      if (exportDateFrom) params.set("dateFrom", exportDateFrom);
      if (exportDateTo)   params.set("dateTo",   exportDateTo);
      if (exportCourse)   params.set("course",   exportCourse);
      const res = await fetch(`/api/courses/${courseId}/patient-records/export?${params}`);
      if (!res.ok) { setError("Export failed. Please try again."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const suffix = exportDateFrom || exportDateTo ? `_${exportDateFrom || "start"}_to_${exportDateTo || "now"}` : "";
      a.href = url; a.download = `general_log_sheet${suffix}.pdf`; a.click();
      URL.revokeObjectURL(url); onClose();
    } catch { setError("Export failed. Please try again."); }
    finally { setExporting(false); }
  };

  const presets = getDatePresets(setExportDateFrom, setExportDateTo);

  return (
    <SheetModal
      onClose={onClose} z={60}
      icon={<Download size={16} />}
      title="Export general log sheet" subtitle="Clinic"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={exporting} className={`flex-1 ${btnGhost}`}>Cancel</button>
          <button onClick={handleExport} disabled={exporting || previewLoading || previewCount === 0}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: C.brand }}>
            {exporting ? <><RefreshCw size={13} className="animate-spin" /> Exporting…</> : <><Download size={13} /> Export PDF</>}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 space-y-4">
        <div>
          <FieldLabel>Department / course</FieldLabel>
          <SelectWrapper>
            <select value={exportCourse} onChange={e => setExportCourse(e.target.value)} className={selectCls}>
              <option value="">All departments / courses</option>
              {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </SelectWrapper>
        </div>

        <div>
          <FieldLabel>Date range</FieldLabel>
          <div className="flex items-center gap-2">
            <input type="date" value={exportDateFrom} max={exportDateTo || undefined} onChange={e => setExportDateFrom(e.target.value)} aria-label="From date"
              className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
            <span className="text-xs text-gray-400 shrink-0">to</span>
            <input type="date" value={exportDateTo} min={exportDateFrom || undefined} onChange={e => setExportDateTo(e.target.value)} aria-label="To date"
              className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {presets.map(p => (
              <button key={p.label} onClick={p.fn}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border px-4 py-3 bg-gray-50" style={{ borderColor: C.line }}>
          <p className="text-xs flex items-center gap-1.5" style={{ color: C.muted }}>
            {previewLoading ? (
              <><RefreshCw size={11} className="animate-spin" /> Checking records…</>
            ) : (
              <><span className="font-bold" style={{ color: C.ink }}>{previewCount}</span> record{previewCount !== 1 ? "s" : ""} will be exported</>
            )}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs font-semibold" role="alert" style={{ color: C.danger }}>
            <AlertTriangle size={13} /> {error}
          </div>
        )}
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   16. MAIN TAB (default export)
   ════════════════════════════════════════════════════════════════════════════ */

export default function CoursePatientRecordsTab({ courseId, isAdmin, isHead, currentUserId }: Props) {
  const [records,         setRecords]         = useState<PatientRecord[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [search,          setSearch]          = useState("");
  const [courseFilter,    setCourseFilter]    = useState("");
  const [showAdd,         setShowAdd]         = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [detailRecord,    setDetailRecord]    = useState<PatientRecord | null>(null);
  const [deleteTarget,    setDeleteTarget]    = useState<PatientRecord | null>(null);
  const [editTarget,      setEditTarget]      = useState<PatientRecord | null>(null);
  const [showFilters,     setShowFilters]     = useState(false);
  const [dateFrom,        setDateFrom]        = useState(todayISO());
  const [dateTo,          setDateTo]          = useState(todayISO());
  const [page,            setPage]            = useState(1);

  const canManage = !isAdmin;

  const fetchRecords = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search)   params.set("search",   search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const res  = await fetch(`/api/courses/${courseId}/patient-records?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRecords(data.records ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [courseId, search, dateFrom, dateTo]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { setPage(1); }, [search, courseFilter, dateFrom, dateTo]);

  const [allCourses, setAllCourses] = useState<string[]>([]);
  useEffect(() => {
    fetch(`/api/courses/${courseId}/guidance-log/courses`)
      .then(r => r.json())
      .then(d => {
        if (d.courses && d.courses.length > 0) { setAllCourses(d.courses); return; }
        return fetch("/api/admin/students").then(r => r.json()).then(d2 => {
          setAllCourses([...new Set((d2.students ?? []).map((s: { course: string | null }) => s.course).filter(Boolean))] as string[]);
        });
      })
      .catch(() => {
        fetch("/api/admin/students").then(r => r.json()).then(d2 => {
          setAllCourses([...new Set((d2.students ?? []).map((s: { course: string | null }) => s.course).filter(Boolean))] as string[]);
        }).catch(() => {});
      });
  }, [courseId]);

  const courseOptions = allCourses.length > 0
    ? allCourses
    : [...new Set(records.map(r => r.student.course).filter(Boolean))] as string[];

  const filteredRecords = useMemo(
    () => courseFilter ? records.filter(r => r.student.course === courseFilter) : records,
    [records, courseFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginated  = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const defaultDates = dateFrom === todayISO() && dateTo === todayISO();
  const activeFilterCount = [courseFilter, !defaultDates ? "d" : ""].filter(Boolean).length;
  const hasActiveFilter   = activeFilterCount > 0;

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const today = new Date();
  const datePresets = getDatePresets(setDateFrom, setDateTo);

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) =>
    totalPages <= 5 || page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i,
  );

  const clearFilters = () => { setCourseFilter(""); setDateFrom(todayISO()); setDateTo(todayISO()); };

  if (detailRecord) {
    return (
      <RecordDetailView courseId={courseId} record={detailRecord} isAdmin={isAdmin} isHead={isHead}
        currentUserId={currentUserId} onBack={() => setDetailRecord(null)}
        onDeleted={id => setRecords(prev => prev.filter(r => r.id !== id))} />
    );
  }

  const stats = [
    { label: "Total records",  value: filteredRecords.length },
    { label: "Today’s visits", value: filteredRecords.filter(r => new Date(r.visitDate).toDateString() === today.toDateString()).length },
    {
      label: hasActiveFilter ? "Filtered" : "This month",
      value: hasActiveFilter
        ? filteredRecords.length
        : records.filter(r => { const d = new Date(r.visitDate); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); }).length,
    },
  ];

  const emptyState = (
    <EmptyState
      title={hasActiveFilter || search ? "No matching records" : "No visits recorded yet today"}
      hint={hasActiveFilter || search ? "Try a different search or clear the filters." : "Record the first visit to start today’s log."}
      action={
        hasActiveFilter || search ? (
          <button onClick={() => { clearFilters(); setSearch(""); }} className="mt-2 text-xs font-bold hover:underline" style={{ color: C.brand }}>
            Clear all filters
          </button>
        ) : canManage ? (
          <button onClick={() => setShowAdd(true)}
            className="mt-2 flex items-center gap-1.5 text-xs font-bold px-4 h-9 rounded-lg text-white" style={{ background: C.brand }}>
            <Plus size={13} /> Record first visit
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
          <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Patient records</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: C.faint }}>Log and review clinic visits for students and walk-in patients.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchRecords} aria-label="Refresh"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 w-9 h-9 sm:w-auto sm:px-3 rounded-lg transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canManage && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-9 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ background: C.brand }}>
              <Plus className="w-3.5 h-3.5" />
              <span>New<span className="hidden sm:inline"> visit</span></span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5 min-h-0">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {stats.map(st => (
            <div key={st.label} className="bg-white border rounded-xl px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-3" style={{ borderColor: C.line }}>
              <div className="rounded-lg p-2 shrink-0 hidden sm:block" style={{ background: C.brandTint, color: C.brand }}>
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none" style={{ color: C.ink }}>{st.value}</p>
                <p className="text-[11px] sm:text-xs font-medium mt-1 truncate" style={{ color: C.muted }}>{st.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="flex-1 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[420px]" style={{ borderColor: C.line }}>

          {/* Toolbar */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b flex items-center gap-2" style={{ borderColor: C.lineSoft }}>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-9 flex-1 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-colors min-w-0">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name or student no."
                aria-label="Search patient records"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(f => !f)} aria-expanded={showFilters}
              style={(showFilters || activeFilterCount) ? { background: C.brand, color: "#fff", borderColor: C.brand } : {}}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${!(showFilters || activeFilterCount) ? "border-gray-200 text-gray-600 hover:border-gray-400" : ""}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-white/90 text-[10px] font-bold flex items-center justify-center" style={{ color: C.brand }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button onClick={() => setShowExportModal(true)} disabled={filteredRecords.length === 0} aria-label="Export"
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-gray-400 transition-colors disabled:opacity-40 shrink-0">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="px-3 sm:px-5 py-4 border-b bg-gray-50 space-y-4" style={{ borderColor: C.lineSoft }}>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Department / course</label>
                <SelectWrapper>
                  <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg pl-3 pr-8 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 appearance-none">
                    <option value="">All departments / courses</option>
                    {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </SelectWrapper>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Date of visit</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} aria-label="From date"
                    className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                  <span className="text-xs text-gray-400 shrink-0">to</span>
                  <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} aria-label="To date"
                    className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {datePresets.map(p => (
                    <button key={p.label} onClick={p.fn}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition-colors">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilter && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: C.brand }}>
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="animate-pulse divide-y divide-gray-100" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                  <div className="h-3 w-32 bg-gray-100 rounded hidden sm:block" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                  <div className="h-5 w-16 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={fetchRecords}
                className="text-xs font-bold px-4 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                Try again
              </button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex-1">{emptyState}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop table */}
              <table className="w-full border-collapse hidden sm:table">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: "#fafafa" }}>
                    {["No.", "Date / time", "Patient", "Sex", "Age", "Course / yr. & sec.", "Chief complaint", "Action", "Signature", ""].map((h, i) => (
                      <th key={i} scope="col"
                        className="text-left px-4 py-2.5 whitespace-nowrap border-b"
                        style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, i) => {
                    const canDel = !isAdmin && (isHead || r.recordedByUser.id === currentUserId);
                    const cell = "px-4 py-3.5 border-b text-xs";
                    return (
                      <tr key={r.id} onClick={() => setDetailRecord(r)} tabIndex={0}
                        onKeyDown={e => { if (e.key === "Enter") setDetailRecord(r); }}
                        className="group cursor-pointer hover:bg-gray-50 focus:bg-gray-50 outline-none transition-colors">
                        <td className={`${cell} tabular-nums`} style={{ color: C.faint, borderColor: C.lineSoft }}>
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td className={`${cell} whitespace-nowrap`} style={{ color: C.body, borderColor: C.lineSoft }}>
                          <p className="font-medium">{fmtDate(r.visitDate)}</p>
                          <p style={{ color: C.muted }}>{fmtTime(r.visitDate)}</p>
                        </td>
                        <td className="px-4 py-3.5 border-b min-w-[170px]" style={{ borderColor: C.lineSoft }}>
                          <p className="text-[13px] font-semibold" style={{ color: C.ink }}>{r.student.name}</p>
                          <p className="text-[11px] font-mono" style={{ color: C.muted }}>{r.student.studentNumber}</p>
                        </td>
                        <td className={cell} style={{ color: C.body, borderColor: C.lineSoft }}>{r.student.gender ?? "—"}</td>
                        <td className={`${cell} tabular-nums`} style={{ color: C.body, borderColor: C.lineSoft }}>{studentAge(r.student) ?? "—"}</td>
                        <td className={`${cell} max-w-[200px]`} style={{ color: C.body, borderColor: C.lineSoft }}>
                          <span className="line-clamp-1">{r.student.course ?? "—"}</span>
                        </td>
                        <td className={`${cell} max-w-[220px]`} style={{ color: C.body, borderColor: C.lineSoft }}>
                          <span className="line-clamp-1">{r.complaint}</span>
                        </td>
                        <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }}>
                          <ActionBadge action={r.action} short />
                        </td>
                        <td className="px-4 py-3.5 border-b min-w-[100px]" style={{ borderColor: C.lineSoft }}>
                          {r.signatureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.signatureUrl} alt="Signature" className="h-7 max-w-[90px] object-contain" />
                          ) : (
                            <span className="text-[11px]" style={{ color: C.faint }}>Unsigned</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 w-12 border-b" style={{ borderColor: C.lineSoft }} onClick={e => e.stopPropagation()}>
                          {canDel ? (
                            <RowActionsMenu label={`Actions for ${r.student.name}`}
                              onEdit={() => setEditTarget(r)} onDelete={() => setDeleteTarget(r)} />
                          ) : (
                            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 transition-colors" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map(r => {
                  const canDel = !isAdmin && (isHead || r.recordedByUser.id === currentUserId);
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                      <button onClick={() => setDetailRecord(r)} className="flex-1 min-w-0 text-left active:opacity-70">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold truncate" style={{ color: C.ink }}>{r.student.name}</p>
                          <ActionBadge action={r.action} short />
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: C.muted }}>
                          {r.student.studentNumber}
                          {r.student.course ? ` · ${courseAbbrev(r.student.course)}` : ""}
                          {r.student.gender ? ` · ${r.student.gender}` : ""}
                          {studentAge(r.student) ? ` · ${studentAge(r.student)} yrs` : ""}
                        </p>
                        <p className="text-xs mt-1 line-clamp-1" style={{ color: C.body }}>{r.complaint}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[11px]" style={{ color: C.faint }}>{fmtDate(r.visitDate)} · {fmtTime(r.visitDate)}</p>
                          <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: r.signatureUrl ? "#065f46" : C.faint }}>
                            {r.signatureUrl ? <Check size={11} /> : <PenLine size={11} />}
                            {r.signatureUrl ? "Signed" : "Unsigned"}
                          </span>
                        </div>
                      </button>
                      {canDel ? (
                        <RowActionsMenu label={`Actions for ${r.student.name}`}
                          onEdit={() => setEditTarget(r)} onDelete={() => setDeleteTarget(r)} />
                      ) : (
                        <ChevronRight size={16} className="text-gray-300 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && filteredRecords.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t bg-white shrink-0 gap-2" style={{ borderColor: C.line }}>
              <span className="text-xs tabular-nums truncate" style={{ color: C.muted }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length}
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

      {/* Modals */}
      {showAdd && (
        <AddVisitModal courseId={courseId} courseOptions={courseOptions} onClose={() => setShowAdd(false)}
          onSaved={rec => { setRecords(prev => [rec, ...prev]); }} />
      )}
      {deleteTarget && (
        <DeleteModal record={deleteTarget} courseId={courseId} onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setRecords(prev => prev.filter(r => r.id !== deleteTarget.id)); setDeleteTarget(null); }} />
      )}
      {editTarget && (
        <EditVisitModal courseId={courseId} record={editTarget} onClose={() => setEditTarget(null)}
          onSaved={updated => { setRecords(prev => prev.map(r => r.id === updated.id ? updated : r)); setEditTarget(null); }} />
      )}
      {showExportModal && (
        <ExportModal courseId={courseId} initialFrom={dateFrom} initialTo={dateTo} initialCourse={courseFilter}
          courseOptions={courseOptions} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}