"use client";

// src/components/layout/course/CoursePatientRecordsTab.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, X, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  Trash2, Check, ArrowLeft, FileText, ArrowUpDown,
  Download, Filter, Stethoscope, Pill, AlertTriangle, PenLine,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const MAROON    = "#7b1113";
const FONT      = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const PAGE_SIZE = 15;

const ACTION_OPTIONS = [
  { value: "GIVEN_MEDICINE",    label: "Given Medicine Only"   },
  { value: "SENT_HOME",         label: "Sent Home"             },
  { value: "FOR_OBSERVATION",   label: "For Observation"       },
  { value: "REFERRED_HOSPITAL", label: "Referred to Hospital"  },
  { value: "REFERRED_GUIDANCE", label: "Referred to Guidance"  },
];

const ACTION_BADGE: Record<string, { dot: string }> = {
  GIVEN_MEDICINE:    { dot: "#15803d" },
  SENT_HOME:         { dot: "#1d4ed8" },
  FOR_OBSERVATION:   { dot: "#a16207" },
  REFERRED_HOSPITAL: { dot: "#b91c1c" },
  REFERRED_GUIDANCE: { dot: "#7c3aed" },
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

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
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
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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
   BODY SYSTEM + CONDITION SELECT
───────────────────────────────────────────────────────────────────────────── */
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
  const [loading,      setLoading]     = useState(true);

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
        <FieldLabel required>Body System</FieldLabel>
        <SelectWrapper>
          <select value={bodySystemId} onChange={e => onChange(e.target.value, "", "")}
            className={selectCls} disabled={loading}>
            <option value="">{loading ? "Loading..." : "Select body system"}</option>
            {bodySystems.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </SelectWrapper>
      </div>
      <div>
        <FieldLabel required>Medical Condition</FieldLabel>
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

/* ─────────────────────────────────────────────────────────────────────────────
   MEDICINE PICKER
───────────────────────────────────────────────────────────────────────────── */
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
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(entry => {
            const isInsufficient = entry.quantityUsed > entry.stockQty;
            const isLow = entry.stockQty <= 10 && !isInsufficient;
            return (
              <div key={entry.medicineId}
                className={`flex items-center gap-2 p-2.5 rounded-xl border ${isInsufficient ? "border-red-200 bg-red-50/40" : isLow ? "border-amber-200 bg-amber-50/30" : "border-gray-200 bg-gray-50"}`}>
                <Pill size={13} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{entry.medicineName}</p>
                  <p className="text-[10px] text-gray-400">{entry.stockQty} {entry.unit}(s) in stock</p>
                </div>
                <input type="number" min="1" value={entry.quantityUsed}
                  onChange={e => onChange(entries.map(en => en.medicineId === entry.medicineId ? { ...en, quantityUsed: Math.max(1, parseInt(e.target.value) || 1) } : en))}
                  className="w-14 h-7 border border-gray-300 rounded-md px-1.5 text-xs text-center outline-none focus:border-[#7b1113] bg-white shrink-0" />
                <span className="text-[10px] text-gray-400 shrink-0 hidden sm:inline">{entry.unit}</span>
                {isInsufficient && <AlertTriangle size={13} className="text-red-400 shrink-0" />}
                <button onClick={() => onChange(entries.filter(en => en.medicineId !== entry.medicineId))}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0">
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {entries.some(e => e.quantityUsed > e.stockQty) && (
        <div className="flex items-center gap-2 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle size={12} /> Some medicines exceed available stock.
        </div>
      )}

      <div className="relative" ref={pickerRef}>
        <button type="button" onClick={() => setShowPicker(v => !v)}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all w-full justify-center">
          <Plus size={12} /> Add Medicine from Inventory
        </button>
        {showPicker && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-52">
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                <Search size={12} className="text-gray-400 shrink-0" />
                <input autoFocus value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Search medicines..." className="flex-1 text-xs outline-none bg-transparent text-gray-700 placeholder:text-gray-400" />
              </div>
            </div>
            <div className="overflow-y-auto max-h-36">
              {loadingInv ? (
                <div className="flex items-center justify-center py-6 text-xs text-gray-400 gap-1.5">
                  <RefreshCw size={12} className="animate-spin" /> Loading...
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
                      <p className="text-xs font-semibold text-gray-800 truncate">{med.name}</p>
                      <p className="text-[10px] text-gray-400">{med.stockQty} {med.unit}(s)</p>
                    </div>
                    {isOut && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0 ml-2">Out</span>}
                    {isLow && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0 ml-2">Low</span>}
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

/* ─────────────────────────────────────────────────────────────────────────────
   ROW ACTIONS MENU
───────────────────────────────────────────────────────────────────────────── */
function RowActionsMenu({ onMedCert, onEdit, onDelete }: {
  onMedCert?: () => void; onEdit?: () => void; onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!onMedCert && !onEdit && !onDelete) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div onClick={e => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden py-1">
          {onMedCert && (
            <button onClick={() => { setOpen(false); onMedCert(); }}
              className="w-full text-left px-3 py-2.5 text-xs font-semibold hover:bg-gray-50 transition-colors min-h-10"
              style={{ color: MAROON }}>Generate Med Cert</button>
          )}
          {onEdit && (
            <button onClick={() => { setOpen(false); onEdit(); }}
              className="w-full text-left px-3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors min-h-10">Edit</button>
          )}
          {onDelete && (
            <button onClick={() => { setOpen(false); onDelete(); }}
              className="w-full text-left px-3 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors min-h-10">Delete</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────────────────────────────────────────── */
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
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-80 overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="px-5 py-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-50"><Trash2 className="w-5 h-5 text-red-400" /></div>
          <p className="text-sm font-bold text-gray-900 mb-1">Delete this record?</p>
          <p className="text-xs text-gray-500 mb-1 font-medium">{record.student.name}</p>
          <p className="text-xs text-gray-400 mb-5 leading-relaxed">
            {fmtDate(record.visitDate)} · {actionLabel(record.action)}<br />This action cannot be undone.
          </p>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={deleting}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: "#ef4444" }}>
              {deleting ? <><RefreshCw size={12} className="animate-spin" /> Deleting…</> : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   VISIT SIDEBAR (desktop-only preview panel inside Add/Edit modals)
───────────────────────────────────────────────────────────────────────────── */
function VisitSidebar({ isWalkIn, walkInName, student, visitDate, visitTime, complaint,
  temperature, bloodPressure, pulseRate, weight, action, medicineUsages }: {
  isWalkIn: boolean; walkInName: string; student: StudentInfo | null;
  visitDate: string; visitTime: string; complaint: string;
  temperature: string; bloodPressure: string; pulseRate: string; weight: string;
  action: string; medicineUsages: MedicineUsageEntry[];
}) {
  const patientName = isWalkIn ? (walkInName || "—") : (student?.name ?? "—");
  const hasVitals = !!(temperature || bloodPressure || pulseRate || weight);
  const badge = ACTION_BADGE[action] ?? { dot: "#9ca3af" };

  return (
    <aside className="hidden sm:flex w-60 shrink-0 border-r border-gray-100 bg-gray-50/70 flex-col px-5 py-6 gap-5 overflow-y-auto">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Patient</p>
        <p className="text-sm font-bold text-gray-900 leading-snug">{patientName}</p>
        {!isWalkIn && student && (
          <p className="text-[11px] text-gray-400 mt-0.5">{student.studentNumber} · {courseAbbrev(student.course) ?? "—"}</p>
        )}
        {isWalkIn && <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Walk-in / Emergency</p>}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Visit</p>
        <p className="text-xs font-semibold text-gray-700">{fmtDate(visitDate)}</p>
        <p className="text-[11px] text-gray-400">{visitTime}</p>
        {complaint && <p className="text-xs text-gray-700 mt-2 leading-snug">{complaint}</p>}
      </div>
      {hasVitals && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Vitals</p>
          <div className="space-y-1.5">
            {temperature && <div className="flex items-center justify-between text-xs"><span className="text-gray-400">Temp</span><span className="font-semibold text-gray-700">{temperature}°C</span></div>}
            {bloodPressure && <div className="flex items-center justify-between text-xs"><span className="text-gray-400">BP</span><span className="font-semibold text-gray-700">{bloodPressure}</span></div>}
            {pulseRate && <div className="flex items-center justify-between text-xs"><span className="text-gray-400">Pulse</span><span className="font-semibold text-gray-700">{pulseRate} bpm</span></div>}
            {weight && <div className="flex items-center justify-between text-xs"><span className="text-gray-400">Weight</span><span className="font-semibold text-gray-700">{weight} kg</span></div>}
          </div>
        </div>
      )}
      {medicineUsages.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Medicine</p>
          <div className="space-y-1">
            {medicineUsages.map(m => (
              <p key={m.medicineId} className="text-xs text-gray-700 leading-snug">{m.medicineName} × {m.quantityUsed} {m.unit}</p>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Action</p>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border border-gray-200 bg-white text-gray-700">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: badge.dot }} />
          {actionLabel(action)}
        </span>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD VISIT MODAL  (redesigned)
   - One scrollable form (no tabs)
   - Live "Visit summary" panel on desktop
   - Sticky footer that tells the user exactly what is still missing
───────────────────────────────────────────────────────────────────────────── */
function FormSection({ title, hint, children }: {
  title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section className="py-5 first:pt-0 border-b border-gray-100 last:border-b-0">
      <div className="mb-3.5">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function UnitInput({ unit, ...props }: { unit: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <input {...props} className={`${inputCls} pr-12`} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{unit}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs py-1">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-800 text-right break-words min-w-0">{value}</span>
    </div>
  );
}

function AddVisitModal({ courseId, onClose, onSaved, courseOptions }: {
  courseId: string; onClose: () => void; onSaved: (record: PatientRecord) => void; courseOptions: string[];
}) {
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

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef        = useRef<HTMLDivElement>(null);

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

  /* ── Validation ── */
  const BP_REGEX = /^\d{2,3}\/\d{2,3}$/;
  const bpValid  = !bloodPressure.trim() || BP_REGEX.test(bloodPressure.trim());

  const patientOk  = isWalkIn ? (walkInFirstName.trim().length > 0 && walkInLastName.trim().length > 0) : !!student;
  const conditionOk = !!medicalConditionId && !!visitDate;
  const referralOk = action !== "REFERRED_HOSPITAL" || (referralTo.trim().length > 0 && referralReason.trim().length > 0);
  const stockOk    = !medicineUsages.some(m => m.quantityUsed > m.stockQty);
  const canSave    = patientOk && conditionOk && bpValid && referralOk;

  const missing: string[] = [];
  if (!patientOk)   missing.push(isWalkIn ? "patient name" : "student");
  if (!conditionOk) missing.push("medical condition");
  if (!bpValid)     missing.push("valid blood pressure");
  if (!referralOk)  missing.push("referral details");

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
    setError("");
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async (closeAfter: boolean) => {
    setError("");
    if (!canSave) { setError(`Please complete: ${missing.join(", ")}.`); return; }

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

  const patientName = isWalkIn ? (walkInFullName || "—") : (student?.name ?? "—");
  const hasVitals   = !!(temperature || bloodPressure || pulseRate || weight);
  const badge       = ACTION_BADGE[action] ?? { dot: "#9ca3af" };

  const checklist = [
    { label: "Patient",           ok: patientOk },
    { label: "Medical condition", ok: conditionOk },
    { label: "Action taken",      ok: referralOk },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={showSuccess ? undefined : onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-4xl overflow-hidden flex flex-col border border-gray-200 h-[calc(94dvh-60px)] sm:h-[min(88vh,820px)] mb-[60px] sm:mb-0"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="shrink-0 bg-white border-b border-gray-200" style={{ borderTop: `3px solid ${MAROON}` }}>
          <div className="sm:hidden flex justify-center pt-2.5"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2", color: MAROON }}>
                <Stethoscope size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-gray-900 leading-tight">New patient visit</p>
                <p className="text-xs text-gray-500 truncate">
                  {showSuccess ? "Visit saved" : "Complete the details below, then save the record."}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex">
          {showSuccess && savedRecord ? (
            <div className="flex-1 overflow-y-auto flex items-center justify-center px-6 py-10">
              <div className="flex flex-col items-center text-center space-y-5 max-w-sm w-full">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-green-50">
                  <Check className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">Visit saved</p>
                  <p className="text-sm text-gray-500 mt-1">{savedRecord.student.name}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {action === "REFERRED_HOSPITAL"
                      ? "The referral document was downloaded automatically."
                      : "You can generate a medical certificate if needed."}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <button onClick={() => setShowMedCertFromSuccess(true)}
                    className="flex-1 h-10 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5"
                    style={{ background: MAROON }}>
                    <FileText size={14} /> Generate med cert
                  </button>
                  <button onClick={onClose}
                    className="flex-1 h-10 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ── Form column ── */}
              <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto px-5 sm:px-6 py-5">

                {/* Patient */}
                <FormSection title="Patient" hint="Look up a registered student or log a walk-in.">
                  <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg mb-4">
                    <button type="button" onClick={() => setIsWalkIn(false)}
                      className="h-8 rounded-md text-xs font-semibold transition-all"
                      style={!isWalkIn ? { background: "#fff", color: MAROON, boxShadow: "0 1px 2px rgba(0,0,0,.08)" } : { color: "#6b7280" }}>
                      Registered student
                    </button>
                    <button type="button" onClick={() => setIsWalkIn(true)}
                      className="h-8 rounded-md text-xs font-semibold transition-all"
                      style={isWalkIn ? { background: "#fff", color: MAROON, boxShadow: "0 1px 2px rgba(0,0,0,.08)" } : { color: "#6b7280" }}>
                      Walk-in / emergency
                    </button>
                  </div>

                  {isWalkIn ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <FieldLabel required>Last name</FieldLabel>
                          <input value={walkInLastName} onChange={e => setWalkInLastName(e.target.value)} placeholder="Dela Cruz" className={inputCls} />
                        </div>
                        <div>
                          <FieldLabel required>First name</FieldLabel>
                          <input value={walkInFirstName} onChange={e => setWalkInFirstName(e.target.value)} placeholder="Juan" className={inputCls} />
                        </div>
                        <div>
                          <FieldLabel>Middle name</FieldLabel>
                          <input value={walkInMiddleName} onChange={e => setWalkInMiddleName(e.target.value)} placeholder="Santos" className={inputCls} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <FieldLabel>Age</FieldLabel>
                          <input type="number" min="1" max="120" value={walkInAge} onChange={e => setWalkInAge(e.target.value)} placeholder="21" className={inputCls} />
                        </div>
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
                        <div className="col-span-2">
                          <FieldLabel>Course</FieldLabel>
                          <SelectWrapper>
                            <select value={walkInCourse} onChange={e => setWalkInCourse(e.target.value)} className={selectCls}>
                              <option value="">Select course</option>
                              {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </SelectWrapper>
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Address</FieldLabel>
                        <input value={walkInAddress} onChange={e => setWalkInAddress(e.target.value)} placeholder="Complete address" className={inputCls} />
                      </div>
                      <p className="text-xs text-gray-500 flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                        A temporary record will be created. Link the official student number later.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <FieldLabel required>Student number</FieldLabel>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input value={studentNum} onChange={e => handleStudentNumChange(e.target.value)}
                          placeholder="Enter student number" className={`${inputCls} pl-9`} />
                        {lookupLoading && <RefreshCw size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                      </div>
                      {lookupError && <p className="text-xs text-red-500 mt-1.5">{lookupError}</p>}
                      {student && (
                        <div className="mt-3 border border-green-200 rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-green-50 border-b border-green-100">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                              <Check size={13} /> Student found
                            </span>
                            {!student.email && (
                              <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
                                <AlertTriangle size={11} /> No email on file
                              </span>
                            )}
                          </div>
                          <div className="px-3.5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 bg-white">
                            {[
                              ["Name",        student.name],
                              ["Student no.", student.studentNumber],
                              ["Course",      student.course ?? "—"],
                              ["Age",         studentAge(student) ? `${studentAge(student)} yrs` : "—"],
                              ["Gender",      student.gender ?? "—"],
                              ["Address",     student.address ?? "—"],
                            ].map(([label, val]) => (
                              <div key={label} className="min-w-0">
                                <p className="text-[11px] text-gray-500 mb-0.5">{label}</p>
                                <p className="text-xs font-medium text-gray-900 leading-snug break-words">{val}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </FormSection>

                {/* Visit */}
                <FormSection title="Visit details">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <FieldLabel required>Date</FieldLabel>
                      <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={inputCls} />
                    </div>
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
                </FormSection>

                {/* Vitals */}
                <FormSection title="Vital signs" hint="Optional">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <FieldLabel>Temperature</FieldLabel>
                      <UnitInput unit="°C" type="number" step="0.1" min="30" max="45" value={temperature}
                        onChange={e => setTemperature(e.target.value)} placeholder="36.8" />
                    </div>
                    <div>
                      <FieldLabel>Blood pressure</FieldLabel>
                      <UnitInput unit="mmHg" value={bloodPressure} onChange={e => setBloodPressure(e.target.value)}
                        placeholder="120/80" style={!bpValid ? { borderColor: "#ef4444" } : undefined} />
                      {!bpValid && <p className="text-[11px] text-red-500 mt-1">Use the format 120/80</p>}
                    </div>
                    <div>
                      <FieldLabel>Pulse rate</FieldLabel>
                      <UnitInput unit="bpm" type="number" min="30" max="220" value={pulseRate}
                        onChange={e => setPulseRate(e.target.value)} placeholder="78" />
                    </div>
                    <div>
                      <FieldLabel>Weight</FieldLabel>
                      <UnitInput unit="kg" type="number" step="0.1" min="1" max="300" value={weight}
                        onChange={e => setWeight(e.target.value)} placeholder="55" />
                    </div>
                  </div>
                </FormSection>

                {/* Clinical */}
                <FormSection title="Clinical notes" hint="Optional">
                  <div>
                    <FieldLabel>Diagnosis</FieldLabel>
                    <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2}
                      placeholder="Clinical diagnosis" className={textareaCls} />
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <FieldLabel>Medicines given</FieldLabel>
                      {medicineUsages.length > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: MAROON }}>
                          {medicineUsages.length} selected
                        </span>
                      )}
                    </div>
                    <MedicinePicker courseId={courseId} entries={medicineUsages} onChange={setMedicineUsages} />
                  </div>
                </FormSection>

                {/* Action */}
                <FormSection title="Action taken" hint="Choose one.">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Action taken">
                    {ACTION_OPTIONS.map(opt => {
                      const isSelected = action === opt.value;
                      const b = ACTION_BADGE[opt.value];
                      return (
                        <button key={opt.value} type="button" role="radio" aria-checked={isSelected}
                          onClick={() => setAction(opt.value)}
                          className="flex items-center gap-2.5 px-3.5 h-11 rounded-lg border text-left transition-all"
                          style={isSelected
                            ? { borderColor: MAROON, background: "#fef2f2", boxShadow: `inset 0 0 0 1px ${MAROON}` }
                            : { borderColor: "#e5e7eb", background: "#fff" }}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.dot }} />
                          <span className="text-sm font-medium flex-1" style={{ color: isSelected ? MAROON : "#374151" }}>{opt.label}</span>
                          {isSelected && <Check size={14} style={{ color: MAROON }} />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Referral details (animated reveal) */}
                  <div className="grid transition-all duration-300 ease-out"
                    style={{ gridTemplateRows: action === "REFERRED_HOSPITAL" ? "1fr" : "0fr", opacity: action === "REFERRED_HOSPITAL" ? 1 : 0 }}>
                    <div className="overflow-hidden">
                      <div className="mt-4 space-y-3 border border-red-100 rounded-lg bg-red-50/40 p-4">
                        <p className="text-xs font-semibold text-red-700">Referral details</p>
                        <div>
                          <FieldLabel required>Refer to</FieldLabel>
                          <input value={referralTo} onChange={e => setReferralTo(e.target.value)}
                            placeholder="e.g. Jose B. Lingad Memorial Hospital" className={inputCls} />
                        </div>
                        <div>
                          <FieldLabel>History of present illness</FieldLabel>
                          <textarea value={referralHPI} onChange={e => setReferralHPI(e.target.value)} rows={3}
                            placeholder="Detailed history" className={textareaCls} />
                        </div>
                        <div>
                          <FieldLabel required>Reason for referral</FieldLabel>
                          <textarea value={referralReason} onChange={e => setReferralReason(e.target.value)} rows={2}
                            placeholder="Reason for referral" className={textareaCls} />
                        </div>
                      </div>
                    </div>
                  </div>
                </FormSection>
              </div>

              {/* ── Summary column (desktop) ── */}
              <aside className="hidden lg:flex w-72 shrink-0 border-l border-gray-200 bg-gray-50/70 flex-col overflow-y-auto px-5 py-5 gap-5">
                <div>
                  <p className="text-xs font-semibold text-gray-900 mb-2">Visit summary</p>
                  <div className="bg-white border border-gray-200 rounded-lg px-3.5 py-3">
                    <p className="text-sm font-semibold text-gray-900 leading-snug break-words">{patientName}</p>
                    {!isWalkIn && student && (
                      <p className="text-xs text-gray-500 mt-0.5">{student.studentNumber} · {courseAbbrev(student.course) ?? "—"}</p>
                    )}
                    {isWalkIn && <p className="text-xs text-amber-600 font-medium mt-0.5">Walk-in / emergency</p>}
                    <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                      <SummaryRow label="Date" value={fmtDate(visitDate)} />
                      <SummaryRow label="Time" value={visitTime} />
                      <SummaryRow label="Complaint" value={complaint || "—"} />
                    </div>
                  </div>
                </div>

                {hasVitals && (
                  <div>
                    <p className="text-xs font-semibold text-gray-900 mb-2">Vitals</p>
                    <div className="bg-white border border-gray-200 rounded-lg px-3.5 py-2.5">
                      {temperature   && <SummaryRow label="Temperature" value={`${temperature} °C`} />}
                      {bloodPressure && <SummaryRow label="Blood pressure" value={bloodPressure} />}
                      {pulseRate     && <SummaryRow label="Pulse" value={`${pulseRate} bpm`} />}
                      {weight        && <SummaryRow label="Weight" value={`${weight} kg`} />}
                    </div>
                  </div>
                )}

                {medicineUsages.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-900 mb-2">Medicines</p>
                    <div className="bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 space-y-1">
                      {medicineUsages.map(m => (
                        <p key={m.medicineId} className="text-xs text-gray-700 leading-snug">{m.medicineName} × {m.quantityUsed} {m.unit}</p>
                      ))}
                      {!stockOk && <p className="text-[11px] font-medium text-red-600 pt-1">Some quantities exceed stock.</p>}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-900 mb-2">Action</p>
                  <span className="text-xs font-medium px-2.5 py-1.5 rounded-full inline-flex items-center gap-1.5 border border-gray-200 bg-white text-gray-700">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: badge.dot }} />
                    {actionLabel(action)}
                  </span>
                </div>

                <div className="mt-auto">
                  <p className="text-xs font-semibold text-gray-900 mb-2">Required</p>
                  <ul className="space-y-1.5">
                    {checklist.map(c => (
                      <li key={c.label} className="flex items-center gap-2 text-xs" style={{ color: c.ok ? "#15803d" : "#6b7280" }}>
                        <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                          style={c.ok ? { background: "#dcfce7" } : { background: "#fff", border: "1px solid #d1d5db" }}>
                          {c.ok && <Check size={10} />}
                        </span>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </>
          )}
        </div>

        {/* Footer (sticky, always visible) */}
        {!showSuccess && (
          <div className="shrink-0 border-t border-gray-200 bg-white px-4 sm:px-6 py-3">
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2.5">{error}</div>
            )}
            <div className="flex items-center gap-2">
              <p className="hidden sm:block flex-1 text-xs min-w-0 truncate" style={{ color: canSave ? "#15803d" : "#6b7280" }}>
                {canSave ? "Ready to save." : `Still needed: ${missing.join(", ")}`}
              </p>
              <div className="flex-1 sm:hidden" />
              <button onClick={onClose} disabled={saving}
                className="h-10 px-4 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 shrink-0">
                Cancel
              </button>
              <button onClick={() => handleSave(false)} disabled={saving || !canSave}
                className="h-10 px-4 rounded-lg text-sm font-semibold border transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                style={{ borderColor: MAROON, color: MAROON, background: "#fff" }}>
                <Plus size={14} />
                <span className="hidden sm:inline">Save and add another</span>
                <span className="sm:hidden">Add another</span>
              </button>
              <button onClick={() => handleSave(true)} disabled={saving || !canSave}
                className="h-10 px-5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                style={{ background: MAROON }}>
                {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save visit</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {showMedCertFromSuccess && savedRecord && (
        <MedCertModal courseId={courseId} record={savedRecord} onClose={() => { setShowMedCertFromSuccess(false); onClose(); }} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MEDICAL CERTIFICATE MODAL
───────────────────────────────────────────────────────────────────────────── */
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
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-[480px] overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <FileText size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Clinic</p>
              <p className="text-sm font-black text-white">Generate Medical Certificate</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="px-4 sm:px-5 py-4 sm:py-5 space-y-4">
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100" style={{ background: "#fef2f2" }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Patient</p>
            </div>
            <div className="px-3 py-3 grid grid-cols-2 gap-x-4 gap-y-2 bg-white">
              {[
                ["Name",      record.student.name],
                ["Age / Sex", `${studentAge(record.student) ?? "—"} / ${record.student.gender ?? "—"}`],
                ["Course",    record.student.course ?? "—"],
                ["Date",      fmtDate(record.visitDate)],
                ["Diagnosis", record.diagnosis ?? record.complaint ?? "—"],
              ].map(([label, val]) => (
                <div key={label} className={label === "Diagnosis" ? "col-span-2" : ""}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                  <p className="text-xs font-semibold text-gray-800 leading-snug">{val}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel required>Recommendation</FieldLabel>
            <textarea value={recommendation} onChange={e => setRecommendation(e.target.value)} rows={3}
              placeholder="e.g. 3 days rest starting June 15, 2026" className={textareaCls} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["1 day rest", "2 days rest", "3 days rest", "to be sent home", "to be referred to a hospital for further evaluation"].map(p => (
                <button key={p} type="button" onClick={() => setRecommendation(p)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                  {p}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">Generated as .docx for printing and signing by the University Physician.</p>
        </div>
        <div className="flex gap-2 px-4 sm:px-5 py-3.5 sm:py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} disabled={generating}
            className="flex-1 h-11 sm:h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50">Cancel</button>
          <button onClick={handleGenerate} disabled={generating || !recommendation.trim()}
            className="flex-1 h-11 sm:h-10 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: MAROON }}>
            {generating ? <><RefreshCw size={13} className="animate-spin" /> Generating…</> : <><FileText size={13} /> Generate &amp; Download</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EDIT VISIT MODAL — same footer fix applied
───────────────────────────────────────────────────────────────────────────── */
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
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-5xl overflow-hidden flex flex-col border border-gray-100"
        style={{ height: "calc(100dvh - 0px)", maxHeight: "calc(94dvh - env(safe-area-inset-bottom))", marginBottom: "60px" }}
        onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 shrink-0" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><Stethoscope size={15} className="text-white" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Clinic</p>
              <p className="text-sm font-black text-white">Edit Visit Record</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"><X size={15} /></button>
        </div>

        <div className="flex-1 overflow-hidden flex min-h-0">
          <VisitSidebar isWalkIn={false} walkInName="" student={record.student}
            visitDate={visitDate} visitTime={visitTime} complaint={complaint}
            temperature={temperature} bloodPressure={bloodPressure} pulseRate={pulseRate} weight={weight}
            action={action} medicineUsages={medicineUsages} />

          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 sm:py-6 space-y-5 min-w-0">
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{error}</div>}

            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Visit Info</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <FieldLabel required>Date</FieldLabel>
                  <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <FieldLabel required>Time</FieldLabel>
                  <SelectWrapper><select value={visitTime} onChange={e => setVisitTime(e.target.value)} className={selectCls}>{TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></SelectWrapper>
                </div>
              </div>
              <FieldLabel required>Chief Complaint</FieldLabel>
              <BodySystemConditionSelect courseId={courseId} bodySystemId={bodySystemId} conditionId={medicalConditionId}
                onChange={(bsId, condId, condName) => { setBodySystemId(bsId); setMedicalConditionId(condId); setComplaint(condName); }} />
            </section>

            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Vital Signs <span className="normal-case font-normal text-gray-300 ml-1">optional</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Temperature (°C)</FieldLabel><input type="number" step="0.1" min="30" max="45" value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="36.8" className={inputCls} /></div>
                <div><FieldLabel>Blood Pressure</FieldLabel><input value={bloodPressure} onChange={e => setBloodPressure(e.target.value)} placeholder="120/80" className={inputCls} /></div>
                <div><FieldLabel>Pulse Rate (bpm)</FieldLabel><input type="number" min="30" max="220" value={pulseRate} onChange={e => setPulseRate(e.target.value)} placeholder="78" className={inputCls} /></div>
                <div><FieldLabel>Weight (kg)</FieldLabel><input type="number" step="0.1" min="1" max="300" value={weight} onChange={e => setWeight(e.target.value)} placeholder="55" className={inputCls} /></div>
              </div>
            </section>

            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Clinical <span className="normal-case font-normal text-gray-300 ml-1">optional</span></p>
              <FieldLabel>Diagnosis</FieldLabel>
              <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} placeholder="Clinical diagnosis…" className={textareaCls} />
              <div className="mt-3">
                <FieldLabel>Medicines Given</FieldLabel>
                <p className="text-[10px] text-gray-400 mb-1.5">Adjusting quantities will automatically correct inventory stock.</p>
                <MedicinePicker courseId={courseId} entries={medicineUsages} onChange={setMedicineUsages} />
              </div>
            </section>

            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Action Taken</p>
              <div className="space-y-1.5">
                {ACTION_OPTIONS.map(opt => {
                  const isSelected = action === opt.value;
                  return (
                    <label key={opt.value} className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border bg-white cursor-pointer transition-all min-h-10"
                      style={{ borderColor: isSelected ? MAROON : "#e5e7eb", borderWidth: isSelected ? "1.5px" : "1px" }}>
                      <input type="radio" name="edit-action" value={opt.value} checked={isSelected} onChange={() => setAction(opt.value)} style={{ accentColor: MAROON }} className="shrink-0" />
                      <span className="text-sm font-medium" style={{ color: isSelected ? MAROON : "#374151" }}>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>

            <section>
              <FieldLabel>Notes / Remarks</FieldLabel>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional notes…" className={textareaCls} />
            </section>
          </div>
        </div>

        {/* Footer — always pinned, never scrolled away */}
        <div className="shrink-0 flex gap-2 px-4 sm:px-5 py-3 sm:py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} disabled={saving}
            className="flex-1 h-11 sm:h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-11 sm:h-10 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: MAROON }}>
            {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Check size={13} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RECORD DETAIL VIEW  (redesigned)
───────────────────────────────────────────────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="px-5 py-3 border-b border-gray-100 last:border-b-0">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 leading-snug break-words">{value}</p>
    </div>
  );
}

function VitalChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 min-w-[72px]">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function RecordDetailView({ courseId, record, isAdmin, isHead, currentUserId, onBack, onDeleted }: {
  courseId: string; record: PatientRecord; isAdmin: boolean; isHead: boolean;
  currentUserId: string | null; onBack: () => void; onDeleted: (id: string) => void;
}) {
  const [visits,          setVisits]          = useState<PatientRecord[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [deleteTarget,    setDeleteTarget]    = useState<PatientRecord | null>(null);
  const [editTarget,      setEditTarget]      = useState<PatientRecord | null>(null);
  const [medCertTarget,   setMedCertTarget]   = useState<PatientRecord | null>(null);
  const [showStudentInfo, setShowStudentInfo] = useState(false);

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

  const initials = record.student.name
    .split(/[\s,]+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("");
  const age = studentAge(record.student);
  const lastVisit = visits[0]?.visitDate ?? null;

  const profile = (
    <div>
      <div className="px-5 py-5 flex items-center gap-3 border-b border-gray-100">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
          style={{ background: "#fef2f2", color: MAROON }}>
          {initials || "—"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug break-words">{record.student.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{record.student.studentNumber}</p>
        </div>
      </div>
      <InfoRow label="Course"  value={record.student.course} />
      <InfoRow label="Age"     value={age ? `${age} years old` : null} />
      <InfoRow label="Gender"  value={record.student.gender} />
      <InfoRow label="Address" value={record.student.address} />
      <InfoRow label="Email"   value={record.student.email} />
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50" style={{ fontFamily: FONT }}>

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 flex items-center gap-3 px-4 sm:px-6 h-14 shrink-0">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold px-2.5 h-8 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
          style={{ color: MAROON }}>
          <ArrowLeft size={15} /> <span className="hidden sm:inline">Back</span>
        </button>
        <span className="w-px h-5 bg-gray-200 hidden sm:block" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{record.student.name}</p>
          <p className="text-xs text-gray-500 hidden sm:block">Patient record</p>
        </div>
        <button onClick={() => setShowStudentInfo(v => !v)}
          className="sm:hidden text-xs font-semibold px-3 h-8 rounded-lg border border-gray-200 text-gray-600 shrink-0">
          {showStudentInfo ? "Hide profile" : "Profile"}
        </button>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: "#fef2f2", color: MAROON }}>
          {loading ? "…" : `${visits.length} visit${visits.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Mobile profile (collapsible) */}
      {showStudentInfo && (
        <div className="sm:hidden bg-white border-b border-gray-200 max-h-[50vh] overflow-y-auto">{profile}</div>
      )}

      <div className="flex-1 min-h-0 flex">

        {/* Profile column (desktop) */}
        <aside className="hidden sm:flex w-72 shrink-0 border-r border-gray-200 bg-white flex-col overflow-y-auto">
          {profile}
          <div className="mt-auto border-t border-gray-100 px-5 py-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Total visits</p>
              <p className="text-lg font-semibold text-gray-900 tabular-nums">{loading ? "…" : visits.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Last visit</p>
              <p className="text-sm font-semibold text-gray-900 leading-snug">{loading ? "…" : fmtDate(lastVisit)}</p>
            </div>
          </div>
        </aside>

        {/* Visit history */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Visit history</h2>
              {!loading && visits.length > 0 && <span className="text-xs text-gray-500">Newest first</span>}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
                <RefreshCw size={15} className="animate-spin" /><span className="text-sm">Loading visits…</span>
              </div>
            ) : visits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400 bg-white border border-gray-200 rounded-xl">
                <FileText className="w-7 h-7" />
                <p className="text-sm">No visits recorded for this patient.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visits.map((v, idx) => {
                  const medicinesStr = v.medicineUsages && v.medicineUsages.length > 0
                    ? formatMedicineUsages(v.medicineUsages) : v.medicine;
                  const badge = ACTION_BADGE[v.action] ?? { dot: "#9ca3af" };
                  const hasVitals = v.temperature != null || v.bloodPressure || v.pulseRate != null || v.weight != null;

                  return (
                    <article key={v.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      {/* Card header */}
                      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{fmtDate(v.visitDate)}</p>
                          <span className="text-xs text-gray-500">{fmtTime(v.visitDate)}</span>
                          {idx === 0 && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">Latest</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border border-gray-200 bg-white text-gray-700">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: badge.dot }} />
                            <span className="hidden sm:inline">{actionLabel(v.action)}</span>
                            <span className="sm:hidden">{actionLabel(v.action).split(" ")[0]}</span>
                          </span>
                          {canDelete(v) && (
                            <RowActionsMenu onMedCert={() => setMedCertTarget(v)} onEdit={() => setEditTarget(v)} onDelete={() => setDeleteTarget(v)} />
                          )}
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="px-4 sm:px-5 py-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Chief complaint</p>
                            <p className="text-sm font-medium text-gray-900 leading-relaxed">{v.complaint}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Diagnosis</p>
                            <p className="text-sm leading-relaxed" style={{ color: v.diagnosis ? "#111827" : "#9ca3af" }}>
                              {v.diagnosis || "Not recorded"}
                            </p>
                          </div>
                        </div>

                        {hasVitals && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1.5">Vital signs</p>
                            <div className="flex flex-wrap gap-2">
                              {v.temperature != null && <VitalChip label="Temp" value={`${v.temperature} °C`} />}
                              {v.bloodPressure       && <VitalChip label="BP" value={v.bloodPressure} />}
                              {v.pulseRate != null   && <VitalChip label="Pulse" value={`${v.pulseRate} bpm`} />}
                              {v.weight != null      && <VitalChip label="Weight" value={`${v.weight} kg`} />}
                            </div>
                          </div>
                        )}

                        {medicinesStr && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Medicine given</p>
                            <div className="flex items-start gap-2">
                              <Pill size={14} className="text-gray-400 mt-0.5 shrink-0" />
                              <p className="text-sm text-gray-900 leading-relaxed">{medicinesStr}</p>
                            </div>
                          </div>
                        )}

                        {v.notes && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Notes</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{v.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Card footer */}
                      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Recorded by</p>
                          <p className="text-sm font-medium text-gray-900 truncate">{v.recordedByUser.name}</p>
                        </div>
                        {v.signatureUrl ? (
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-500 mb-1">Signature</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={v.signatureUrl} alt="Signature"
                              className="h-9 max-w-[110px] object-contain border border-gray-200 rounded-md p-0.5 bg-white" />
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                            <PenLine size={12} /> Unsigned
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>
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

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN TAB
───────────────────────────────────────────────────────────────────────────── */
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

  const filteredRecords = courseFilter ? records.filter(r => r.student.course === courseFilter) : records;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginated  = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilter = !!courseFilter || dateFrom !== todayISO() || dateTo !== todayISO();

  const today = new Date();

  /* ── Export Modal ── */
  const ExportModal = () => {
    const [exportDateFrom, setExportDateFrom] = useState(dateFrom);
    const [exportDateTo,   setExportDateTo]   = useState(dateTo);
    const [exportCourse,   setExportCourse]   = useState(courseFilter);
    const [exporting,      setExporting]      = useState(false);
    const [previewCount,   setPreviewCount]   = useState(0);
    const [previewLoading, setPreviewLoading] = useState(true);
    const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    }, [exportDateFrom, exportDateTo, exportCourse]);

    const handleExport = async () => {
      setExporting(true);
      try {
        const params = new URLSearchParams({ format: "pdf" });
        if (exportDateFrom) params.set("dateFrom", exportDateFrom);
        if (exportDateTo)   params.set("dateTo",   exportDateTo);
        if (exportCourse)   params.set("course",   exportCourse);
        const res  = await fetch(`/api/courses/${courseId}/patient-records/export?${params}`);
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        const suffix = exportDateFrom || exportDateTo ? `_${exportDateFrom || "start"}_to_${exportDateTo || "now"}` : "";
        a.href = url; a.download = `general_log_sheet${suffix}.pdf`; a.click();
        URL.revokeObjectURL(url); setShowExportModal(false);
      } catch { alert("Export failed. Please try again."); }
      finally { setExporting(false); }
    };

    return (
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30"
        style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={() => setShowExportModal(false)}>
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-[420px] overflow-hidden"
          onClick={e => e.stopPropagation()}>
          <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100" style={{ background: MAROON }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><Download size={15} className="text-white" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Clinic</p>
                <p className="text-sm font-black text-white">Export General Log Sheet</p>
              </div>
            </div>
            <button onClick={() => setShowExportModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"><X size={15} /></button>
          </div>
          <div className="px-4 sm:px-5 py-4 sm:py-5 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Department / Course</p>
              <div className="relative">
                <select value={exportCourse} onChange={e => setExportCourse(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-2 bg-white text-gray-700 outline-none appearance-none focus:border-[#7b1113]">
                  <option value="">All Departments / Courses</option>
                  {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Date Range</p>
              <div className="flex items-center gap-2">
                <input type="date" value={exportDateFrom} onChange={e => setExportDateFrom(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                <span className="text-xs text-gray-400 shrink-0">to</span>
                <input type="date" value={exportDateTo} onChange={e => setExportDateTo(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {[
                  { label: "Today",      fn: () => { const d = todayISO(); setExportDateFrom(d); setExportDateTo(d); } },
                  { label: "Yesterday",  fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s = d.toISOString().split("T")[0]; setExportDateFrom(s); setExportDateTo(s); } },
                  { label: "This Week",  fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); setExportDateFrom(mon.toISOString().split("T")[0]); setExportDateTo(todayISO()); } },
                  { label: "This Month", fn: () => { const now = new Date(); setExportDateFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`); setExportDateTo(todayISO()); } },
                ].map(p => (
                  <button key={p.label} onClick={p.fn}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                {previewLoading ? (
                  <><RefreshCw size={11} className="animate-spin" /> Checking records…</>
                ) : (
                  <><span className="font-black text-gray-800">{previewCount}</span> record{previewCount !== 1 ? "s" : ""} will be exported</>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 px-4 sm:px-5 py-3.5 sm:py-4 border-t border-gray-100 bg-gray-50">
            <button onClick={() => setShowExportModal(false)} disabled={exporting}
              className="flex-1 h-11 sm:h-10 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
            <button onClick={handleExport} disabled={exporting || previewLoading || previewCount === 0}
              className="flex-1 h-11 sm:h-10 rounded-xl text-xs font-black text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
              style={{ background: MAROON }}>
              {exporting ? <><RefreshCw size={13} className="animate-spin" /> Exporting…</> : <><Download size={13} /> Export PDF</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (detailRecord) {
    return (
      <RecordDetailView courseId={courseId} record={detailRecord} isAdmin={isAdmin} isHead={isHead}
        currentUserId={currentUserId} onBack={() => setDetailRecord(null)}
        onDeleted={id => setRecords(prev => prev.filter(r => r.id !== id))} />
    );
  }

  return (
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between shrink-0 gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5 truncate" style={{ color: MAROON }}>Clinic</p>
          <h1 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">Patient Records</h1>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button onClick={fetchRecords} title="Refresh"
            className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 flex items-center justify-center sm:gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canManage && (
            <button onClick={() => setShowAdd(true)} title="New Visit"
              className="w-8 h-8 sm:w-auto sm:h-auto sm:px-4 sm:py-1.5 flex items-center justify-center sm:gap-1.5 text-xs font-bold text-white rounded-lg transition-all"
              style={{ background: MAROON }}>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Visit</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-3 sm:py-6 flex flex-col gap-3 sm:gap-5">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
          {[
            { label: "Total Records",   value: filteredRecords.length },
            { label: "Today's Visits",  value: filteredRecords.filter(r => new Date(r.visitDate).toDateString() === today.toDateString()).length },
            { label: hasActiveFilter ? "Filtered" : "This Month", value: hasActiveFilter ? filteredRecords.length : records.filter(r => { const d = new Date(r.visitDate); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); }).length },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-3">
              <div className="rounded-lg p-2 shrink-0" style={{ background: "#fef2f2", color: MAROON }}>
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-black tabular-nums leading-none text-gray-900">{s.value}</p>
                <p className="text-[10px] sm:text-xs font-semibold mt-0.5 text-gray-500 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">

          {/* Toolbar */}
          <div className="px-3 sm:px-5 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-white">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-1.5 flex-1 sm:max-w-64 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or ID…"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
              {search && <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0"><X className="w-3 h-3" /></button>}
            </div>

            <button onClick={() => setShowFilters(f => !f)}
              style={(showFilters || hasActiveFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0 ${!(showFilters || hasActiveFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700" : ""}`}>
              <Filter className="w-3 h-3" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
            </button>

            <button onClick={() => setShowExportModal(true)} disabled={filteredRecords.length === 0} title="Export"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all disabled:opacity-40 shrink-0 ml-auto">
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="px-3 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide sm:shrink-0">Department / Course</span>
                <div className="relative flex-1 sm:max-w-xs">
                  <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 outline-none appearance-none">
                    <option value="">All Departments / Courses</option>
                    {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Date Range</span>
                <div className="flex items-center gap-2">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none" />
                  <span className="text-xs text-gray-400 shrink-0">to</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "Today",      fn: () => { const d = todayISO(); setDateFrom(d); setDateTo(d); } },
                    { label: "Yesterday",  fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s = d.toISOString().split("T")[0]; setDateFrom(s); setDateTo(s); } },
                    { label: "This Week",  fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); setDateFrom(mon.toISOString().split("T")[0]); setDateTo(todayISO()); } },
                    { label: "This Month", fn: () => { const now = new Date(); setDateFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`); setDateTo(todayISO()); } },
                  ].map(p => (
                    <button key={p.label} onClick={p.fn}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilter && (
                <button onClick={() => { setCourseFilter(""); setDateFrom(todayISO()); setDateTo(todayISO()); }}
                  className="flex items-center gap-1 text-[11px] font-bold hover:underline" style={{ color: MAROON }}>
                  <X size={11} /> Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="animate-pulse divide-y divide-gray-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
                  <div className="h-3 w-16 bg-gray-100 rounded shrink-0" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                  <div className="h-3 w-16 bg-gray-100 rounded shrink-0 hidden sm:block" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-xs font-medium text-red-500 py-20">{error}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: "#fafafa" }}>
                      {["Date / Time", "No.", "Name", "Sex", "Age", "Address", "Course/Yr. & Sec.", "Chief Complaint", "Signature", ""].map((h, i) => (
                        <th key={i} className="text-left px-3 py-3 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-700">
                            {h} {h !== "" && <ArrowUpDown className="w-3 h-3" />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-16">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                              <Stethoscope className="w-6 h-6" style={{ color: MAROON }} />
                            </div>
                            <p className="text-sm text-gray-400 font-medium">
                              {hasActiveFilter || search ? "No records match your filters." : "No visits recorded yet today."}
                            </p>
                            {canManage && (
                              <button onClick={() => setShowAdd(true)} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                                + Record first visit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    {paginated.map((r, i) => {
                      const canDel = !isAdmin && (isHead || r.recordedByUser.id === currentUserId);
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/70 transition-colors cursor-pointer" onClick={() => setDetailRecord(r)}>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-800" style={{ border: "1px solid #d1d5db" }}>
                            <p>{fmtDate(r.visitDate)}</p><p className="text-gray-500">{fmtTime(r.visitDate)}</p>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-800 tabular-nums text-center" style={{ border: "1px solid #d1d5db" }}>
                            {(page - 1) * PAGE_SIZE + i + 1}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-800 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>{r.student.name}</td>
                          <td className="px-3 py-3 text-xs text-gray-800 text-center" style={{ border: "1px solid #d1d5db" }}>{r.student.gender ?? "—"}</td>
                          <td className="px-3 py-3 text-xs text-gray-800 tabular-nums text-center" style={{ border: "1px solid #d1d5db" }}>{r.student.age ?? "—"}</td>
                          <td className="px-3 py-3 text-xs text-gray-800 max-w-[160px]" style={{ border: "1px solid #d1d5db" }}><span className="line-clamp-1">{r.student.address ?? "—"}</span></td>
                          <td className="px-3 py-3 text-xs text-gray-800" style={{ border: "1px solid #d1d5db" }}>{r.student.course ?? "—"}</td>
                          <td className="px-3 py-3 text-xs text-gray-800 max-w-[220px]" style={{ border: "1px solid #d1d5db" }}><span className="line-clamp-1">{r.complaint}</span></td>
                          <td className="px-3 py-3 text-xs text-gray-800" style={{ border: "1px solid #d1d5db", minWidth: "100px" }}>
                            {r.signatureUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.signatureUrl} alt="signature" className="h-7 max-w-[90px] object-contain" />
                            ) : ""}
                          </td>
                          <td className="px-2 py-3 w-10" style={{ border: "1px solid #d1d5db" }}>
                            {canDel && <RowActionsMenu onEdit={() => setEditTarget(r)} onDelete={() => setDeleteTarget(r)} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden px-3 py-3 space-y-2">
                {filteredRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                      <Stethoscope className="w-6 h-6" style={{ color: MAROON }} />
                    </div>
                    <p className="text-sm text-gray-400 font-medium text-center">
                      {hasActiveFilter || search ? "No records match your filters." : "No visits recorded yet today."}
                    </p>
                    {canManage && (
                      <button onClick={() => setShowAdd(true)} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                        + Record first visit
                      </button>
                    )}
                  </div>
                ) : paginated.map(r => {
                  const canDel = !isAdmin && (isHead || r.recordedByUser.id === currentUserId);
                  const badge  = ACTION_BADGE[r.action] ?? { dot: "#9ca3af" };
                  return (
                    <div key={r.id}
                      className="bg-white rounded-xl border border-gray-200 p-3.5 active:bg-gray-50 transition-colors"
                      onClick={() => setDetailRecord(r)}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 leading-snug truncate">{r.student.name}</p>
                          <p className="text-[10px] font-mono font-semibold text-gray-400 mt-0.5">{r.student.studentNumber}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-gray-200 text-gray-600 bg-gray-50 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: badge.dot }} />
                            {actionLabel(r.action).split(" ")[0]}
                          </span>
                          {canDel && (
                            <div onClick={e => e.stopPropagation()}>
                              <RowActionsMenu onEdit={() => setEditTarget(r)} onDelete={() => setDeleteTarget(r)} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {r.student.course && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider" style={{ background: "#fef2f2", color: MAROON }}>
                            {courseAbbrev(r.student.course) ?? r.student.course}
                          </span>
                        )}
                        {r.student.gender && <span className="text-[10px] text-gray-400 font-medium">{r.student.gender}</span>}
                        {r.student.age && <span className="text-[10px] text-gray-400 font-medium">{r.student.age} yrs</span>}
                        <span className={`flex items-center gap-0.5 text-[10px] font-bold ml-auto ${r.signatureUrl ? "text-green-500" : "text-gray-300"}`}>
                          {r.signatureUrl ? <Check size={9} /> : <PenLine size={9} />}
                          {r.signatureUrl ? "Signed" : "Unsigned"}
                        </span>
                      </div>

                      <p className="text-xs text-gray-700 leading-snug line-clamp-1 mb-1">{r.complaint}</p>
                      <p className="text-[11px] text-gray-400">{fmtDate(r.visitDate)} · {fmtTime(r.visitDate)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredRecords.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-t border-gray-100 bg-white shrink-0 flex-wrap gap-2">
              <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-25 transition-all">
                  <ChevronLeft className="w-3 h-3" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const n = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  return (
                    <button key={n} type="button" onClick={() => setPage(n)}
                      style={page === n ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-semibold transition-all border ${page !== n ? "border-gray-200 text-gray-500 hover:border-gray-400" : ""}`}>
                      {n}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-25 transition-all">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <AddVisitModal courseId={courseId} courseOptions={courseOptions} onClose={() => setShowAdd(false)}
          onSaved={rec => { setRecords(prev => [rec, ...prev]); setShowAdd(false); }} />
      )}
      {deleteTarget && (
        <DeleteModal record={deleteTarget} courseId={courseId} onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setRecords(prev => prev.filter(r => r.id !== deleteTarget.id)); setDeleteTarget(null); }} />
      )}
      {editTarget && (
        <EditVisitModal courseId={courseId} record={editTarget} onClose={() => setEditTarget(null)}
          onSaved={updated => { setRecords(prev => prev.map(r => r.id === updated.id ? updated : r)); setEditTarget(null); }} />
      )}
      {showExportModal && <ExportModal />}
    </div>
  );
}