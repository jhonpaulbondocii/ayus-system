"use client";

// src/components/layout/course/CoursePatientRecordsTab.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, X, RefreshCw, ChevronDown,
  Trash2, Check, ArrowLeft, FileText,
  Download, Filter, Stethoscope, Pill, AlertTriangle, PenLine,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const MAROON = "#7b1113";
const FONT   = "system-ui, -apple-system, sans-serif";

const ACTION_OPTIONS = [
  { value: "GIVEN_MEDICINE",    label: "Given Medicine Only"   },
  { value: "SENT_HOME",         label: "Sent Home"             },
  { value: "FOR_OBSERVATION",   label: "For Observation"       },
  { value: "REFERRED_HOSPITAL", label: "Referred to Hospital"  },
  { value: "REFERRED_GUIDANCE", label: "Referred to Guidance"  },
];

const ACTION_BADGE: Record<string, { bg: string; color: string }> = {
  GIVEN_MEDICINE:    { bg: "#f0fdf4", color: "#15803d" },
  SENT_HOME:         { bg: "#eff6ff", color: "#1d4ed8" },
  FOR_OBSERVATION:   { bg: "#fefce8", color: "#a16207" },
  REFERRED_HOSPITAL: { bg: "#fef2f2", color: "#b91c1c" },
  REFERRED_GUIDANCE: { bg: "#faf5ff", color: "#7c3aed" },
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
  age:           number | null;
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
  stockQty:     number; // for warning display
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
  action:        string;
  notes:         string | null;
  visitDate:     string;
  createdAt:     string;
  student:       StudentInfo;
  recordedByUser:{ id: string; name: string };
  medicineUsages?: MedicineUsage[];
  // ── NEW: e-signature ──
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
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
function fmtTime(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}
function fmtDateGroup(d: string) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
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
   MEDICINE PICKER (inside AddVisitModal)
───────────────────────────────────────────────────────────────────────────── */
function MedicinePicker({
  courseId,
  entries,
  onChange,
}: {
  courseId: string;
  entries:  MedicineUsageEntry[];
  onChange: (entries: MedicineUsageEntry[]) => void;
}) {
  const [inventory, setInventory] = useState<MedicineInventory[]>([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [pickerSearch, setPickerSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/medicine-inventory`)
      .then(r => r.json())
      .then(d => { setInventory(d.medicines ?? []); setLoadingInv(false); })
      .catch(() => setLoadingInv(false));
  }, [courseId]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
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
    onChange([...entries, {
      medicineId:   med.id,
      medicineName: med.name,
      unit:         med.unit,
      quantityUsed: 1,
      stockQty:     med.stockQty,
    }]);
    setShowPicker(false);
    setPickerSearch("");
  };

  const removeEntry = (medicineId: string) => {
    onChange(entries.filter(e => e.medicineId !== medicineId));
  };

  const updateQty = (medicineId: string, qty: number) => {
    onChange(entries.map(e => e.medicineId === medicineId ? { ...e, quantityUsed: qty } : e));
  };

  return (
    <div className="space-y-2">
      {/* Picked medicines list */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(entry => {
            const isInsufficient = entry.quantityUsed > entry.stockQty;
            const isLow = entry.stockQty <= 10 && !isInsufficient;
            return (
              <div key={entry.medicineId}
                className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                  isInsufficient ? "border-red-200 bg-red-50/40" :
                  isLow ? "border-amber-200 bg-amber-50/30" :
                  "border-gray-200 bg-gray-50"
                }`}>
                <Pill size={13} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{entry.medicineName}</p>
                  <p className="text-[10px] text-gray-400">{entry.stockQty} {entry.unit}(s) in stock</p>
                </div>
                {/* Qty input */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min="1"
                    value={entry.quantityUsed}
                    onChange={e => updateQty(entry.medicineId, Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 h-7 border border-gray-300 rounded-md px-2 text-xs text-center outline-none focus:border-[#7b1113] focus:ring-1 focus:ring-[#7b1113]/10 bg-white"
                  />
                  <span className="text-[10px] text-gray-400 shrink-0">{entry.unit}</span>
                </div>
                {isInsufficient && (
                  <AlertTriangle size={13} className="text-red-400 shrink-0" aria-label="Insufficient stock" />
                )}
                <button onClick={() => removeEntry(entry.medicineId)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0">
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Insufficient stock warning */}
      {entries.some(e => e.quantityUsed > e.stockQty) && (
        <div className="flex items-center gap-2 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle size={12} />
          Some medicines exceed available stock — visit will still be saved but stock will go negative.
        </div>
      )}

      {/* Add medicine button + dropdown picker */}
      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setShowPicker(v => !v)}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all w-full justify-center">
          <Plus size={12} /> Add Medicine from Inventory
        </button>

        {showPicker && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-52">
            {/* Search inside picker */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                <Search size={12} className="text-gray-400 shrink-0" />
                <input
                  autoFocus
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Search medicines..."
                  className="flex-1 text-xs outline-none bg-transparent text-gray-700 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-36">
              {loadingInv ? (
                <div className="flex items-center justify-center py-6 text-xs text-gray-400 gap-1.5">
                  <RefreshCw size={12} className="animate-spin" /> Loading...
                </div>
              ) : filteredInv.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">
                  {inventory.length === 0 ? "No medicines in inventory." : "No medicines match your search."}
                </div>
              ) : (
                filteredInv.map(med => {
                  const isOut = med.stockQty <= 0;
                  const isLow = med.stockQty > 0 && med.stockQty <= med.lowStockThreshold;
                  return (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => addMedicine(med)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{med.name}</p>
                        <p className="text-[10px] text-gray-400">{med.stockQty} {med.unit}(s)</p>
                      </div>
                      {isOut && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0 ml-2">Out</span>
                      )}
                      {isLow && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0 ml-2">Low</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteModal({
  record, courseId, onClose, onDeleted,
}: {
  record: PatientRecord; courseId: string; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res = await fetch(
        `/api/courses/${courseId}/patient-records/${record.id}`,
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
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-80 overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-5 py-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-50">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-sm font-bold text-gray-900 mb-1">Delete this record?</p>
          <p className="text-xs text-gray-500 mb-1 font-medium">{record.student.name}</p>
          <p className="text-xs text-gray-400 mb-5 leading-relaxed">
            {fmtDate(record.visitDate)} · {actionLabel(record.action)}
            <br />This action is permanent and cannot be undone.
          </p>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={deleting}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: "#ef4444" }}>
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
   ADD VISIT MODAL
───────────────────────────────────────────────────────────────────────────── */
function AddVisitModal({
  courseId, onClose, onSaved,
}: {
  courseId: string; onClose: () => void; onSaved: (record: PatientRecord) => void;
}) {
  // Student lookup
  const [studentNum,    setStudentNum]    = useState("");
  const [student,       setStudent]       = useState<StudentInfo | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError,   setLookupError]   = useState("");

  // Visit fields
  const [visitDate,       setVisitDate]       = useState(todayISO());
  const [visitTime,       setVisitTime]       = useState(currentTime());
  const [complaint,       setComplaint]       = useState("");
  const [temperature,     setTemperature]     = useState("");
  const [bloodPressure,   setBloodPressure]   = useState("");
  const [pulseRate,       setPulseRate]       = useState("");
  const [weight,          setWeight]          = useState("");
  const [diagnosis,       setDiagnosis]       = useState("");
  const [medicineUsages,  setMedicineUsages]  = useState<MedicineUsageEntry[]>([]);
  const [medicineNotes,   setMedicineNotes]   = useState(""); // free-text additional notes
  const [action,          setAction]          = useState("GIVEN_MEDICINE");
  const [notes,           setNotes]           = useState("");

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lookupStudent = useCallback(async (num: string) => {
    const trimmed = num.trim();
    if (!trimmed) { setStudent(null); setLookupError(""); return; }
    setLookupLoading(true); setLookupError(""); setStudent(null);
    try {
      const res  = await fetch(`/api/courses/${courseId}/patient-records/student-lookup?studentNumber=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error ?? "Student not found."); return; }
      setStudent(data.student);
    } catch {
      setLookupError("Network error. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  }, [courseId]);

  const handleStudentNumChange = (val: string) => {
    setStudentNum(val);
    setStudent(null);
    setLookupError("");
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => lookupStudent(val), 600);
  };

  const handleSave = async () => {
    setError("");
    if (!student)          { setError("Please look up a valid student first.");  return; }
    if (!complaint.trim()) { setError("Chief complaint is required.");            return; }
    if (!action)           { setError("Action taken is required.");               return; }
    if (!visitDate)        { setError("Visit date is required.");                 return; }

    // Build legacy medicine text from picked medicines + free-text notes
    const medicineText = [
      medicineUsages.map(u => `${u.medicineName} × ${u.quantityUsed} ${u.unit}`).join(", "),
      medicineNotes.trim(),
    ].filter(Boolean).join(" | ") || null;

    setSaving(true);
    try {
      const visitDateTime = new Date(`${visitDate} ${visitTime}`).toISOString();

      const res  = await fetch(`/api/courses/${courseId}/patient-records`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId:     student.id,
          complaint:     complaint.trim(),
          temperature:   temperature   ? parseFloat(temperature)   : null,
          bloodPressure: bloodPressure ? bloodPressure.trim()       : null,
          pulseRate:     pulseRate     ? parseInt(pulseRate)         : null,
          weight:        weight        ? parseFloat(weight)          : null,
          diagnosis:     diagnosis.trim()  || null,
          medicine:      medicineText,
          action,
          notes:         notes.trim()      || null,
          visitDate:     visitDateTime,
          // New: structured medicine usages for inventory deduction
          medicineUsages: medicineUsages.map(u => ({
            medicineId:   u.medicineId,
            quantityUsed: u.quantityUsed,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      onSaved(data.record);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden max-h-[95vh] flex flex-col border border-gray-100"
        onClick={e => e.stopPropagation()}>

        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0"
          style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Stethoscope size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Clinic</p>
              <p className="text-sm font-black text-white">New Patient Visit</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* ── STUDENT LOOKUP ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1 h-4 rounded-full" style={{ background: MAROON }} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Student Lookup</p>
            </div>
            <FieldLabel required>Student Number</FieldLabel>
            <div className="relative">
              <input
                value={studentNum}
                onChange={e => handleStudentNumChange(e.target.value)}
                placeholder="e.g. 2023-0001"
                className={inputCls}
              />
              {lookupLoading && (
                <RefreshCw size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
              )}
            </div>

            {lookupError && (
              <p className="text-xs text-red-500 mt-1.5 font-medium">{lookupError}</p>
            )}

            {student && (
              <div className="mt-2.5 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200"
                  style={{ background: "#fef2f2" }}>
                  <Check size={13} style={{ color: MAROON }} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>
                    Student Found
                  </span>
                </div>
                <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {[
                    ["Name",    student.name],
                    ["Student No.", student.studentNumber],
                    ["Age",     student.age     ? `${student.age} yrs` : "—"],
                    ["Gender",  student.gender  ?? "—"],
                    ["Course",  student.course  ?? "—"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</span>
                      <span className="text-xs font-semibold text-gray-800">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── VISIT INFO ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1 h-4 rounded-full" style={{ background: MAROON }} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Visit Info</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <FieldLabel required>Visit Date</FieldLabel>
                <input
                  type="date"
                  value={visitDate}
                  onChange={e => setVisitDate(e.target.value)}
                  className={inputCls}
                />
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

            <FieldLabel required>Chief Complaint</FieldLabel>
            <textarea
              value={complaint}
              onChange={e => setComplaint(e.target.value)}
              rows={2}
              placeholder="Describe the patient's chief complaint..."
              className={textareaCls}
            />
          </div>

          {/* ── VITAL SIGNS ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1 h-4 rounded-full bg-gray-300" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Vital Signs <span className="normal-case font-normal text-gray-300 ml-1">optional</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Temperature (°C)</FieldLabel>
                <input
                  type="number" step="0.1" min="30" max="45"
                  value={temperature} onChange={e => setTemperature(e.target.value)}
                  placeholder="e.g. 37.5"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Blood Pressure</FieldLabel>
                <input
                  value={bloodPressure} onChange={e => setBloodPressure(e.target.value)}
                  placeholder="e.g. 120/80"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Pulse Rate (bpm)</FieldLabel>
                <input
                  type="number" min="30" max="250"
                  value={pulseRate} onChange={e => setPulseRate(e.target.value)}
                  placeholder="e.g. 72"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Weight (kg)</FieldLabel>
                <input
                  type="number" step="0.1" min="1" max="300"
                  value={weight} onChange={e => setWeight(e.target.value)}
                  placeholder="e.g. 55"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* ── CLINICAL ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1 h-4 rounded-full bg-gray-300" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Clinical <span className="normal-case font-normal text-gray-300 ml-1">optional</span>
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <FieldLabel>Diagnosis</FieldLabel>
                <textarea
                  value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                  rows={2} placeholder="Clinical diagnosis..."
                  className={textareaCls}
                />
              </div>

              {/* Medicine picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel>Medicines Given</FieldLabel>
                  {medicineUsages.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#fef2f2", color: MAROON }}>
                      {medicineUsages.length} selected
                    </span>
                  )}
                </div>
                <MedicinePicker
                  courseId={courseId}
                  entries={medicineUsages}
                  onChange={setMedicineUsages}
                />
              </div>

              {/* Free-text additional medicine notes */}
              <div>
                <FieldLabel>Additional Medicine Notes</FieldLabel>
                <textarea
                  value={medicineNotes} onChange={e => setMedicineNotes(e.target.value)}
                  rows={2} placeholder="e.g. OTC medicines brought by student, topical ointments, etc."
                  className={textareaCls}
                />
              </div>
            </div>
          </div>

          {/* ── ACTION TAKEN ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1 h-4 rounded-full" style={{ background: MAROON }} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Action Taken</p>
            </div>
            <div className="space-y-2">
              {ACTION_OPTIONS.map(opt => {
                const badge = ACTION_BADGE[opt.value];
                const isSelected = action === opt.value;
                return (
                  <label key={opt.value}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all"
                    style={isSelected
                      ? { borderColor: MAROON, background: "#fef2f2" }
                      : { borderColor: "#e5e7eb", background: "#f9fafb" }}>
                    <input
                      type="radio" name="action"
                      value={opt.value} checked={isSelected}
                      onChange={() => setAction(opt.value)}
                      style={{ accentColor: MAROON }}
                      className="shrink-0"
                    />
                    <span className="text-xs font-semibold"
                      style={{ color: isSelected ? MAROON : "#374151" }}>
                      {opt.label}
                    </span>
                    {isSelected && (
                      <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: badge.bg, color: badge.color }}>
                        Selected
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── NOTES ── */}
          <div>
            <FieldLabel>Notes / Remarks</FieldLabel>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Additional notes or remarks..."
              className={textareaCls}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button onClick={onClose} disabled={saving}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !student}
            className="flex-1 h-10 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: MAROON }}>
            {saving
              ? <><RefreshCw size={13} className="animate-spin" /> Saving...</>
              : <><Check size={13} /> Save Visit</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RECORD DETAIL VIEW
───────────────────────────────────────────────────────────────────────────── */
function RecordDetailView({
  courseId, record, isAdmin, isHead, currentUserId, onBack, onDeleted,
}: {
  courseId:      string;
  record:        PatientRecord;
  isAdmin:       boolean;
  isHead:        boolean;
  currentUserId: string | null;
  onBack:        () => void;
  onDeleted:     (id: string) => void;
}) {
  const [visits,        setVisits]        = useState<PatientRecord[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [deleteTarget,  setDeleteTarget]  = useState<PatientRecord | null>(null);

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

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>

      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100 shrink-0 bg-white">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold hover:underline shrink-0"
          style={{ color: MAROON }}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className="w-px h-4 bg-gray-200 shrink-0" />
        <p className="text-sm font-bold text-gray-800 truncate">{record.student.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">

        <div className="rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-4 py-2 border-b border-gray-100" style={{ background: "#fef2f2" }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>
              Student Information
            </p>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5 bg-white">
            {[
              ["Name",       record.student.name],
              ["Student No.", record.student.studentNumber],
              ["Course",     record.student.course  ?? "—"],
              ["Age",        record.student.age ? `${record.student.age} yrs` : "—"],
              ["Gender",     record.student.gender ?? "—"],
              ["Total Visits", loading ? "..." : String(visits.length)],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-4">
          <div className="w-1 h-4 rounded-full" style={{ background: MAROON }} />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Visit History</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-300">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <FileText className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No visits recorded.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visits.map(v => {
              const badge = ACTION_BADGE[v.action] ?? { bg: "#f3f4f6", color: "#6b7280" };
              const medicinesStr = v.medicineUsages && v.medicineUsages.length > 0
                ? formatMedicineUsages(v.medicineUsages)
                : v.medicine;
              return (
                <div key={v.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100"
                    style={{ background: "#fafafa" }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-700">{fmtDate(v.visitDate)}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{fmtTime(v.visitDate)}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: badge.bg, color: badge.color }}>
                        {actionLabel(v.action)}
                      </span>
                    </div>
                    {canDelete(v) && (
                      <button onClick={() => setDeleteTarget(v)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-600 transition-colors shrink-0">
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>

                  <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                    {[
                      ["Chief Complaint", v.complaint],
                      ["Temperature",     v.temperature    != null ? `${v.temperature}°C` : null],
                      ["Blood Pressure",  v.bloodPressure],
                      ["Pulse Rate",      v.pulseRate      != null ? `${v.pulseRate} bpm` : null],
                      ["Weight",          v.weight         != null ? `${v.weight} kg`     : null],
                      ["Diagnosis",       v.diagnosis],
                      ["Medicine Given",  medicinesStr],
                      ["Notes",           v.notes],
                      ["Recorded by",     v.recordedByUser.name],
                    ].filter(([, val]) => val != null && val !== "").map(([label, val]) => (
                      <div key={String(label)}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                        <p className="text-sm text-gray-700 leading-snug">{val}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── NEW: E-Signature ── */}
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                      E-Signature
                    </p>
                    {v.signatureUrl ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <img
                          src={v.signatureUrl}
                          alt={`${v.student.name} signature`}
                          className="h-14 max-w-[180px] object-contain border border-gray-200 rounded-lg bg-white px-3 py-1.5"
                        />
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <Check size={12} className="text-green-500 shrink-0" />
                          <span>
                            Signed {fmtDate(v.signedAt)} {fmtTime(v.signedAt)}
                            {v.signatureMethod && (
                              <span className="text-gray-300"> · {v.signatureMethod === "uploaded" ? "Uploaded" : "Drawn"}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                        <PenLine size={11} /> Awaiting student signature
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal
          record={deleteTarget}
          courseId={courseId}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setVisits(prev => prev.filter(v => v.id !== deleteTarget.id));
            onDeleted(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN TAB
───────────────────────────────────────────────────────────────────────────── */
export default function CoursePatientRecordsTab({
  courseId, isAdmin, isHead, currentUserId,
}: Props) {
  const [records,      setRecords]      = useState<PatientRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd,      setShowAdd]      = useState(false);
  const [detailRecord, setDetailRecord] = useState<PatientRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PatientRecord | null>(null);
  const [exporting,    setExporting]    = useState<string | null>(null);
  const [showFilters,  setShowFilters]  = useState(false);
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");

  const canManage = !isAdmin;

  const fetchRecords = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search)       params.set("search",   search);
      if (statusFilter) params.set("status",   statusFilter);
      if (dateFrom)     params.set("dateFrom", dateFrom);
      if (dateTo)       params.set("dateTo",   dateTo);
      const res  = await fetch(`/api/courses/${courseId}/patient-records?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRecords(data.records ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [courseId, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleExport = async (format: string) => {
    setExporting(format);
    try {
      const params = new URLSearchParams({ format });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const res  = await fetch(`/api/courses/${courseId}/patient-records/export?${params}`);
      const blob = await res.blob();
      const ext  = format === "excel" ? "xlsx" : format;
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const suffix = dateFrom || dateTo
        ? `_${dateFrom || "start"}_to_${dateTo || "now"}`
        : "";
      a.href = url; a.download = `patient_records${suffix}.${ext}`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const grouped = records.reduce<Record<string, PatientRecord[]>>((acc, r) => {
    const key = new Date(r.visitDate).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const hasActiveFilter = !!statusFilter || !!dateFrom || !!dateTo;

  if (detailRecord) {
    return (
      <RecordDetailView
        courseId={courseId}
        record={detailRecord}
        isAdmin={isAdmin}
        isHead={isHead}
        currentUserId={currentUserId}
        onBack={() => setDetailRecord(null)}
        onDeleted={id => {
          setRecords(prev => prev.filter(r => r.id !== id));
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5 truncate" style={{ color: MAROON }}>
            Clinic
          </p>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">Patient Records</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button onClick={fetchRecords}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 py-1.5 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canManage && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-1.5 rounded-lg text-white transition-all"
              style={{ background: MAROON }}>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Visit</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 sm:px-6 py-4 shrink-0">
        {[
          { label: "Total Records",   value: records.length },
          { label: "Today's Visits",  value: records.filter(r => new Date(r.visitDate).toDateString() === new Date().toDateString()).length },
          { label: hasActiveFilter ? "Matching Filter" : "Active Filters", value: hasActiveFilter ? records.length : 0 },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-xl sm:text-2xl font-black tabular-nums leading-none text-gray-900">{s.value}</p>
            <p className="text-xs font-semibold mt-0.5 text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="px-4 sm:px-6 pb-3 shrink-0 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 sm:flex-none sm:w-64 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or student no..."
            className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button onClick={() => setShowFilters(f => !f)}
          style={(showFilters || hasActiveFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0
            ${!(showFilters || hasActiveFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700" : ""}`}>
          <Filter className="w-3 h-3" />
          <span className="hidden sm:inline">Filter</span>
          {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
        </button>

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {[
            { fmt: "pdf",   label: "PDF"   },
            { fmt: "excel", label: "Excel" },
            { fmt: "docx",  label: "DOCX"  },
          ].map(({ fmt, label }) => (
            <button key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={!!exporting || records.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all disabled:opacity-40 shrink-0">
              <Download className="w-3 h-3" />
              {exporting === fmt ? "..." : label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="px-4 sm:px-6 pb-3 shrink-0 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Action</span>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none appearance-none pr-7">
                <option value="">All Actions</option>
                {ACTION_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Date Range</span>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date" value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none"
              />
            </div>
            {(dateFrom || dateTo) && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ background: "#fef2f2", color: MAROON }}>
                {dateFrom && dateTo
                  ? `${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`
                  : dateFrom ? `From ${fmtDate(dateFrom)}`
                  : `Until ${fmtDate(dateTo)}`}
              </span>
            )}
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
            <button onClick={() => { setStatusFilter(""); setDateFrom(""); setDateTo(""); }}
              className="flex items-center gap-1 text-[11px] font-bold hover:underline"
              style={{ color: MAROON }}>
              <X size={11} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-gray-300 py-24">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-xs font-medium">Loading records...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center text-xs font-medium text-red-500 py-24">{error}</div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
              <Stethoscope className="w-7 h-7" style={{ color: MAROON }} />
            </div>
            <p className="text-sm text-gray-400 font-medium">No patient records yet.</p>
            {canManage && (
              <button onClick={() => setShowAdd(true)}
                className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                + Record first visit
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dateKey, dayRecords]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest shrink-0">
                    {fmtDateGroup(dayRecords[0].visitDate)}
                  </p>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] text-gray-400 shrink-0">{dayRecords.length} visit{dayRecords.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="space-y-2">
                  {dayRecords.map(r => {
                    const badge = ACTION_BADGE[r.action] ?? { bg: "#f3f4f6", color: "#6b7280" };
                    const canDel = !isAdmin && (isHead || r.recordedByUser.id === currentUserId);
                    const hasMedicines = r.medicineUsages && r.medicineUsages.length > 0;
                    return (
                      <div key={r.id}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all cursor-pointer shadow-sm"
                        onClick={() => setDetailRecord(r)}>

                        {/* Desktop row */}
                        <div className="hidden sm:flex items-center gap-4 px-4 py-3">
                          <div className="shrink-0 w-20 text-right">
                            <p className="text-[11px] font-bold text-gray-500">{fmtTime(r.visitDate)}</p>
                          </div>
                          <div className="w-px h-8 bg-gray-100 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="text-sm font-bold text-gray-900 truncate">{r.student.name}</p>
                              <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                                {r.student.studentNumber}
                              </span>
                              {r.student.course && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                  style={{ background: "#fef2f2", color: MAROON }}>
                                  {r.student.course}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                              <span className="font-medium text-gray-700 truncate">{r.complaint}</span>
                              {r.temperature != null && (
                                <><span>·</span><span>🌡 {r.temperature}°C</span></>
                              )}
                              {hasMedicines && (
                                <><span>·</span>
                                <span className="flex items-center gap-1">
                                  <Pill size={10} />
                                  {r.medicineUsages!.length} medicine{r.medicineUsages!.length !== 1 ? "s" : ""}
                                </span></>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {/* ── NEW: signature status (desktop) ── */}
                            {r.signatureUrl ? (
                              <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-green-50 text-green-600">
                                <Check size={10} /> Signed
                              </span>
                            ) : (
                              <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-600">
                                <PenLine size={10} /> Unsigned
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 font-medium hidden lg:inline">
                              by {r.recordedByUser.name}
                            </span>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                              style={{ background: badge.bg, color: badge.color }}>
                              {actionLabel(r.action)}
                            </span>
                            {canDel && (
                              <button
                                onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Mobile card */}
                        <div className="sm:hidden px-4 py-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{r.student.name}</p>
                              <p className="text-[10px] font-mono font-bold text-gray-400">{r.student.studentNumber}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: badge.bg, color: badge.color }}>
                                {actionLabel(r.action)}
                              </span>
                              {canDel && (
                                <button
                                  onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
                                  className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                            <span className="font-medium text-gray-700">{r.complaint}</span>
                            {r.temperature != null && <><span>·</span><span>🌡 {r.temperature}°C</span></>}
                            {hasMedicines && <><span>·</span><span className="flex items-center gap-0.5"><Pill size={9} /> {r.medicineUsages!.length} med{r.medicineUsages!.length !== 1 ? "s" : ""}</span></>}
                            <span>·</span>
                            <span>{fmtTime(r.visitDate)}</span>
                            {/* ── NEW: signature status (mobile) ── */}
                            <span>·</span>
                            <span className={`flex items-center gap-0.5 font-semibold ${r.signatureUrl ? "text-green-500" : "text-amber-500"}`}>
                              {r.signatureUrl ? <Check size={9} /> : <PenLine size={9} />}
                              {r.signatureUrl ? "Signed" : "Unsigned"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {!loading && records.length > 0 && (
        <div className="shrink-0 border-t border-gray-100 px-4 sm:px-6 py-3 bg-white flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] text-gray-400 font-medium">
            Showing {records.length} record{records.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1.5">
            {[
              { fmt: "pdf",   label: "PDF"   },
              { fmt: "excel", label: "Excel" },
              { fmt: "docx",  label: "DOCX"  },
            ].map(({ fmt, label }) => (
              <button key={fmt}
                onClick={() => handleExport(fmt)}
                disabled={!!exporting}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 transition-all disabled:opacity-40">
                <Download size={10} /> {exporting === fmt ? "..." : label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showAdd && (
        <AddVisitModal
          courseId={courseId}
          onClose={() => setShowAdd(false)}
          onSaved={record => {
            setRecords(prev => [record, ...prev]);
            setShowAdd(false);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          record={deleteTarget}
          courseId={courseId}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}