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

const BLOOD_PRESSURE_OPTIONS = [
  "90/60", "95/60", "100/60", "100/70", "105/70", "110/70", "110/80",
  "115/75", "115/80", "120/70", "120/80", "120/90", "125/80", "125/85",
  "130/80", "130/85", "130/90", "135/85", "135/90", "140/90", "140/95",
  "145/95", "150/90", "150/100", "160/100", "160/110", "170/100",
  "170/110", "180/110", "180/120", "190/120", "200/120",
];

const TEMPERATURE_OPTIONS: string[] = [];
for (let t = 350; t <= 410; t += 1) {
  TEMPERATURE_OPTIONS.push((t / 10).toFixed(1)); // 35.0 ... 41.0
}

const PULSE_RATE_OPTIONS: string[] = [];
for (let p = 40; p <= 180; p += 1) {
  PULSE_RATE_OPTIONS.push(String(p)); // 40 ... 180
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
// "Bachelor of Science in Information Technology (BSIT)" -> "BSIT"
function courseAbbrev(course: string | null | undefined): string | null {
  if (!course) return null;
  const match = course.match(/\(([^)]+)\)/);
  return match ? match[1] : course;
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
   CHIEF COMPLAINT COMBOBOX — free text + dropdown of previously saved complaints
───────────────────────────────────────────────────────────────────────────── */
function ComplaintCombobox({
  courseId,
  value,
  onChange,
}: {
  courseId: string;
  value:    string;
  onChange: (value: string) => void;
}) {
  const [suggestions,   setSuggestions]   = useState<string[]>([]);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/patient-records/complaints`)
      .then(r => r.json())
      .then(d => setSuggestions(d.complaints ?? []))
      .catch(() => setSuggestions([]));
  }, [courseId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const trimmed  = value.trim().toLowerCase();
  const filtered = trimmed
    ? suggestions.filter(s => s.toLowerCase().includes(trimmed) && s.toLowerCase() !== trimmed)
    : suggestions;

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        placeholder="e.g. Fever, Headache, Stomach ache..."
        className={inputCls}
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-44 overflow-y-auto">
          {filtered.slice(0, 8).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setShowDropdown(false); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}
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

      {entries.some(e => e.quantityUsed > e.stockQty) && (
        <div className="flex items-center gap-2 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle size={12} />
          Some medicines exceed available stock — visit will still be saved but stock will go negative.
        </div>
      )}

      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setShowPicker(v => !v)}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all w-full justify-center">
          <Plus size={12} /> Add Medicine from Inventory
        </button>

        {showPicker && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-52">
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
   ADD VISIT MODAL (still a side panel/modal — unchanged structure)
───────────────────────────────────────────────────────────────────────────── */
function AddVisitModal({
  courseId, onClose, onSaved,
}: {
  courseId: string; onClose: () => void; onSaved: (record: PatientRecord) => void;
}) {
  const [studentNum,    setStudentNum]    = useState("");
  const [student,       setStudent]       = useState<StudentInfo | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError,   setLookupError]   = useState("");

  const [visitDate,       setVisitDate]       = useState(todayISO());
  const [visitTime,       setVisitTime]       = useState(currentTime());
  const [complaint,       setComplaint]       = useState("");
  const [temperature,     setTemperature]     = useState("");
  const [bloodPressure,   setBloodPressure]   = useState("");
  const [pulseRate,       setPulseRate]       = useState("");
  const [weight,          setWeight]          = useState("");
  const [diagnosis,       setDiagnosis]       = useState("");
  const [medicineUsages,  setMedicineUsages]  = useState<MedicineUsageEntry[]>([]);
  const [action,          setAction]          = useState("GIVEN_MEDICINE");

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  // Referral fields — only shown when action === "REFERRED_HOSPITAL"
  const [referralTo,      setReferralTo]      = useState("");
  const [referralHPI,     setReferralHPI]     = useState("");
  const [referralReason,  setReferralReason]  = useState("");

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
    if (action === "REFERRED_HOSPITAL") {
      if (!referralTo.trim())     { setError("Please specify where the patient is being referred to."); return; }
      if (!referralReason.trim()) { setError("Reason for referral is required.");                       return; }
    }

    const medicineText = medicineUsages.length > 0
      ? medicineUsages.map(u => `${u.medicineName} × ${u.quantityUsed} ${u.unit}`).join(", ")
      : null;

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
          notes:         null,
          visitDate:     visitDateTime,
          medicineUsages: medicineUsages.map(u => ({
            medicineId:   u.medicineId,
            quantityUsed: u.quantityUsed,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }

      // Auto-generate referral doc if referred to hospital
      if (action === "REFERRED_HOSPITAL" && student) {
        try {
          const referralRes = await fetch(`/api/courses/${courseId}/patient-records/referral`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recordId:      data.record.id,
              to:            referralTo.trim(),
              hpi:           referralHPI.trim() || null,
              reason:        referralReason.trim(),
              visitDate:     visitDateTime,
              student:       student,
              complaint:     complaint.trim(),
              diagnosis:     diagnosis.trim() || null,
              medicine:      medicineText,
              medicineUsages: medicineUsages.map(u => ({
                medicineName: u.medicineName,
                quantityUsed: u.quantityUsed,
                unit:         u.unit,
              })),
            }),
          });
          if (referralRes.ok) {
            const blob = await referralRes.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = `referral_${student.name.replace(/\s+/g, "_")}.docx`;
            a.click();
            URL.revokeObjectURL(url);
          }
        } catch {
          // Don't block saving if referral doc fails
        }
      }

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
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl overflow-hidden max-h-[95vh] flex flex-col border border-gray-100"
        onClick={e => e.stopPropagation()}>

        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

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

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          {/* Student Lookup */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Student</p>
            <div className="relative mb-2">
              <input
                value={studentNum}
                onChange={e => handleStudentNumChange(e.target.value)}
                placeholder="Enter student number..."
                className={inputCls}
              />
              {lookupLoading && (
                <RefreshCw size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
              )}
            </div>
            {lookupError && <p className="text-xs text-red-500 mt-1">{lookupError}</p>}
            {student && (
              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#fef2f2" }}>
                  <Check size={12} style={{ color: MAROON }} />
                  <span className="text-xs font-semibold" style={{ color: MAROON }}>Student Found</span>
                </div>
                <div className="px-3 py-3 grid grid-cols-3 gap-x-4 gap-y-2 bg-white">
                  {[
                    ["Name",       student.name],
                    ["Student No.", student.studentNumber],
                    ["Course",     student.course  ?? "—"],
                    ["Age",        student.age ? `${student.age} yrs` : "—"],
                    ["Gender",     student.gender  ?? "—"],
                    ["Address",    student.address ?? "—"],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                      <p className="text-xs font-medium text-gray-800 leading-snug">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Visit Info */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Visit Info</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
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
            <FieldLabel required>Chief Complaint</FieldLabel>
            <ComplaintCombobox courseId={courseId} value={complaint} onChange={setComplaint} />
          </section>

          {/* Vital Signs */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Vital Signs <span className="normal-case font-normal text-gray-300 ml-1">optional</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Temperature</FieldLabel>
                <SelectWrapper>
                  <select value={temperature} onChange={e => setTemperature(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {TEMPERATURE_OPTIONS.map(t => <option key={t} value={t}>{t} °C</option>)}
                  </select>
                </SelectWrapper>
              </div>
              <div>
                <FieldLabel>Blood Pressure</FieldLabel>
                <SelectWrapper>
                  <select value={bloodPressure} onChange={e => setBloodPressure(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {BLOOD_PRESSURE_OPTIONS.map(bp => <option key={bp} value={bp}>{bp}</option>)}
                  </select>
                </SelectWrapper>
              </div>
              <div>
                <FieldLabel>Pulse Rate</FieldLabel>
                <SelectWrapper>
                  <select value={pulseRate} onChange={e => setPulseRate(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {PULSE_RATE_OPTIONS.map(p => <option key={p} value={p}>{p} bpm</option>)}
                  </select>
                </SelectWrapper>
              </div>
              <div>
                <FieldLabel>Weight (kg)</FieldLabel>
                <input type="number" step="0.1" min="1" max="300" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 55" className={inputCls} />
              </div>
            </div>
          </section>

          {/* Clinical */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Clinical <span className="normal-case font-normal text-gray-300 ml-1">optional</span>
            </p>
            <div className="space-y-3">
              <div>
                <FieldLabel>Diagnosis</FieldLabel>
                <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} placeholder="Clinical diagnosis..." className={textareaCls} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel>Medicines Given</FieldLabel>
                  {medicineUsages.length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: MAROON }}>
                      {medicineUsages.length} selected
                    </span>
                  )}
                </div>
                <MedicinePicker courseId={courseId} entries={medicineUsages} onChange={setMedicineUsages} />
              </div>
            </div>
          </section>

          {/* Action Taken */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Action Taken</p>
            <div className="space-y-1.5">
              {ACTION_OPTIONS.map(opt => {
                const isSelected = action === opt.value;
                return (
                  <label key={opt.value}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all"
                    style={isSelected ? { borderColor: MAROON, background: "#fef2f2" } : { borderColor: "#e5e7eb", background: "#fafafa" }}>
                    <input type="radio" name="action" value={opt.value} checked={isSelected}
                      onChange={() => setAction(opt.value)} style={{ accentColor: MAROON }} className="shrink-0" />
                    <span className="text-sm font-medium" style={{ color: isSelected ? MAROON : "#374151" }}>
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Referral Details */}
          {action === "REFERRED_HOSPITAL" && (
            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-red-400 mb-3">Referral Details</p>
              <div className="space-y-3 border border-red-100 rounded-lg bg-red-50/30 p-4">
                <div>
                  <FieldLabel required>Refer To (Hospital / Doctor)</FieldLabel>
                  <input value={referralTo} onChange={e => setReferralTo(e.target.value)}
                    placeholder="e.g. Jose B. Lingad Memorial Hospital" className={inputCls} />
                </div>
                <div>
                  <FieldLabel>History of Present Illness</FieldLabel>
                  <textarea value={referralHPI} onChange={e => setReferralHPI(e.target.value)}
                    rows={3} placeholder="Detailed history of present illness..." className={textareaCls} />
                </div>
                <div>
                  <FieldLabel required>Reason for Referral</FieldLabel>
                  <textarea value={referralReason} onChange={e => setReferralReason(e.target.value)}
                    rows={2} placeholder="Reason for referring to hospital..." className={textareaCls} />
                </div>
              </div>
            </section>
          )}
        </div>

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
   EDIT VISIT MODAL
───────────────────────────────────────────────────────────────────────────── */
function EditVisitModal({
  courseId, record, onClose, onSaved,
}: {
  courseId: string;
  record:   PatientRecord;
  onClose:  () => void;
  onSaved:  (updated: PatientRecord) => void;
}) {
  const [visitDate,     setVisitDate]     = useState(record.visitDate.split("T")[0]);
  const [visitTime,     setVisitTime]     = useState(fmtTime(record.visitDate));
  const [complaint,     setComplaint]     = useState(record.complaint);
  const [temperature,   setTemperature]   = useState(record.temperature != null ? String(record.temperature) : "");
  const [bloodPressure, setBloodPressure] = useState(record.bloodPressure ?? "");
  const [pulseRate,     setPulseRate]     = useState(record.pulseRate != null ? String(record.pulseRate) : "");
  const [weight,        setWeight]        = useState(record.weight != null ? String(record.weight) : "");
  const [diagnosis,     setDiagnosis]     = useState(record.diagnosis ?? "");
  const [action,        setAction]        = useState(record.action);
  const [notes,         setNotes]         = useState(record.notes ?? "");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const handleSave = async () => {
    setError("");
    if (!complaint.trim()) { setError("Chief complaint is required."); return; }
    if (!action)           { setError("Action taken is required.");     return; }
    setSaving(true);
    try {
      const visitDateTime = new Date(`${visitDate} ${visitTime}`).toISOString();
      const res  = await fetch(`/api/courses/${courseId}/patient-records/${record.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint:     complaint.trim(),
          temperature:   temperature   ? parseFloat(temperature)   : null,
          bloodPressure: bloodPressure || null,
          pulseRate:     pulseRate     ? parseInt(pulseRate)       : null,
          weight:        weight        ? parseFloat(weight)        : null,
          diagnosis:     diagnosis.trim() || null,
          action,
          notes:         notes.trim()     || null,
          visitDate:     visitDateTime,
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
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl overflow-hidden max-h-[95vh] flex flex-col border border-gray-100"
        onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0"
          style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Stethoscope size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Clinic</p>
              <p className="text-sm font-black text-white">Edit Visit Record</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{error}</div>
          )}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Student</p>
            <div className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50">
              <p className="text-sm font-semibold text-gray-900">{record.student.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{record.student.studentNumber} · {record.student.course ?? "—"}</p>
            </div>
          </section>
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Visit Info</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
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
            <FieldLabel required>Chief Complaint</FieldLabel>
            <ComplaintCombobox courseId={courseId} value={complaint} onChange={setComplaint} />
          </section>
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Vital Signs <span className="normal-case font-normal text-gray-300 ml-1">optional</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Temperature</FieldLabel>
                <SelectWrapper>
                  <select value={temperature} onChange={e => setTemperature(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {TEMPERATURE_OPTIONS.map(t => <option key={t} value={t}>{t} °C</option>)}
                  </select>
                </SelectWrapper>
              </div>
              <div>
                <FieldLabel>Blood Pressure</FieldLabel>
                <SelectWrapper>
                  <select value={bloodPressure} onChange={e => setBloodPressure(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {BLOOD_PRESSURE_OPTIONS.map(bp => <option key={bp} value={bp}>{bp}</option>)}
                  </select>
                </SelectWrapper>
              </div>
              <div>
                <FieldLabel>Pulse Rate</FieldLabel>
                <SelectWrapper>
                  <select value={pulseRate} onChange={e => setPulseRate(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {PULSE_RATE_OPTIONS.map(p => <option key={p} value={p}>{p} bpm</option>)}
                  </select>
                </SelectWrapper>
              </div>
              <div>
                <FieldLabel>Weight (kg)</FieldLabel>
                <input type="number" step="0.1" min="1" max="300"
                  value={weight} onChange={e => setWeight(e.target.value)}
                  placeholder="e.g. 55" className={inputCls} />
              </div>
            </div>
          </section>
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Clinical <span className="normal-case font-normal text-gray-300 ml-1">optional</span>
            </p>
            <FieldLabel>Diagnosis</FieldLabel>
            <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
              rows={2} placeholder="Clinical diagnosis..." className={textareaCls} />
          </section>
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Action Taken</p>
            <div className="space-y-1.5">
              {ACTION_OPTIONS.map(opt => {
                const isSelected = action === opt.value;
                return (
                  <label key={opt.value}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all"
                    style={isSelected ? { borderColor: MAROON, background: "#fef2f2" } : { borderColor: "#e5e7eb", background: "#fafafa" }}>
                    <input type="radio" name="edit-action" value={opt.value} checked={isSelected}
                      onChange={() => setAction(opt.value)} style={{ accentColor: MAROON }} className="shrink-0" />
                    <span className="text-sm font-medium" style={{ color: isSelected ? MAROON : "#374151" }}>
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
          <section>
            <FieldLabel>Notes / Remarks</FieldLabel>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Additional notes..." className={textareaCls} />
          </section>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button onClick={onClose} disabled={saving}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: MAROON }}>
            {saving
              ? <><RefreshCw size={13} className="animate-spin" /> Saving...</>
              : <><Check size={13} /> Save Changes</>}
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
  const [editTarget,    setEditTarget]    = useState<PatientRecord | null>(null);

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

       <div className="flex-1 overflow-y-auto">

        {/* ── Student Info ── */}
        <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400">Student</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
            {[
              ["Name",          record.student.name],
              ["Student No.",   record.student.studentNumber],
              ["Age",           record.student.age ? `${record.student.age} yrs` : "—"],
              ["Gender",        record.student.gender ?? "—"],
              ["Course",        record.student.course  ?? "—"],
              ["Address",       record.student.address ?? "—"],
              ["Total Visits",  loading ? "…" : String(visits.length)],
            ].map(([label, val]) => (
              <div key={label} className={label === "Course" || label === "Address" ? "col-span-2" : ""}>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Visit History ── */}
        <div className="px-5 sm:px-7 pt-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400">Visit History</span>
            {!loading && visits.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {visits.length} visit{visits.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-14 gap-2 text-gray-300">
              <RefreshCw size={15} className="animate-spin" />
              <span className="text-xs">Loading…</span>
            </div>
          ) : visits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-300">
              <FileText className="w-7 h-7" />
              <p className="text-xs">No visits recorded.</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Table header */}
              <div className="grid text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 border-b border-gray-200"
                style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr 2fr 1fr 48px 80px" }}
>
                {["Date", "Complaint", "Temp", "BP / PR", "Medicine / Dx", "Action", "Sig", ""].map((h, i) => (
                  <div key={i} className="px-3 py-2.5">{h}</div>
                ))}
              </div>
              {/* Rows */}
              {visits.map((v, idx) => {
                const medicinesStr = v.medicineUsages && v.medicineUsages.length > 0
                  ? formatMedicineUsages(v.medicineUsages)
                  : v.medicine;
                const vitals = [
                  v.temperature != null ? `${v.temperature}°C` : null,
                  v.bloodPressure ?? null,
                  v.pulseRate != null ? `${v.pulseRate}bpm` : null,
                ].filter(Boolean);
                return (
                  <div key={v.id}
                    className={`grid text-xs text-gray-700 ${idx !== visits.length - 1 ? "border-b border-gray-100" : ""} hover:bg-gray-50/60 transition-colors`}
                    style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr 2fr 1fr 48px 80px" }}
>
                    {/* Date */}
                    <div className="px-3 py-3 flex flex-col gap-0.5">
                      <span className="font-semibold text-gray-800 text-[11px]">{fmtDate(v.visitDate)}</span>
                      <span className="text-gray-400 text-[10px]">{fmtTime(v.visitDate)}</span>
                    </div>
                    {/* Complaint */}
                    <div className="px-3 py-3 flex items-center">
                      <span className="line-clamp-2 text-[11px] text-gray-700">{v.complaint}</span>
                    </div>
                    {/* Temp */}
                    <div className="px-3 py-3 flex items-center">
                      <span className="text-[11px] text-gray-600">
                        {v.temperature != null ? `${v.temperature}°C` : "—"}
                      </span>
                    </div>
                    {/* BP / PR */}
                    <div className="px-3 py-3 flex flex-col gap-0.5 justify-center">
                      <span className="text-[11px] text-gray-600">{v.bloodPressure ?? "—"}</span>
                      {v.pulseRate != null && (
                        <span className="text-[10px] text-gray-400">{v.pulseRate} bpm</span>
                      )}
                    </div>
                    {/* Medicine / Diagnosis */}
                    <div className="px-3 py-3 flex flex-col gap-0.5 justify-center">
                      {medicinesStr && (
                        <span className="text-[11px] text-gray-700 line-clamp-1">{medicinesStr}</span>
                      )}
                      {v.diagnosis && (
                        <span className="text-[10px] text-gray-400 line-clamp-1 italic">{v.diagnosis}</span>
                      )}
                      {!medicinesStr && !v.diagnosis && <span className="text-gray-300 text-[11px]">—</span>}
                    </div>
                    {/* Action */}
                    <div className="px-3 py-3 flex items-center">
                      <span className="text-[10px] font-semibold text-gray-700">
                        {actionLabel(v.action)}
                      </span>
                    </div>
                    {/* Signature */}
                    <div className="px-2 py-3 flex items-center">
                      {v.signatureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.signatureUrl} alt="sig" className="h-6 max-w-[40px] object-contain" />
                      ) : (
                        <span className="text-[10px] text-gray-300">—</span>
                      )}
                    </div>
                    {/* Edit + Delete */}
                    <div className="px-3 py-3 flex items-center gap-2">
                      {canDelete(v) && (
                        <>
                          <button onClick={() => setEditTarget(v)}
                            className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition-colors whitespace-nowrap">
                            Edit
                          </button>
                          <button onClick={() => setDeleteTarget(v)}
                            className="text-[11px] font-semibold text-red-400 hover:text-red-600 transition-colors whitespace-nowrap">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editTarget && (
        <EditVisitModal
          courseId={courseId}
          record={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={updated => {
            setVisits(prev => prev.map(v => v.id === updated.id ? updated : v));
            setEditTarget(null);
          }}
        />
      )}

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
   MAIN TAB — now a professional table-list with filters + pagination
───────────────────────────────────────────────────────────────────────────── */
export default function CoursePatientRecordsTab({
  courseId, isAdmin, isHead, currentUserId,
}: Props) {
  const [records,      setRecords]      = useState<PatientRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [courseFilter, setCourseFilter] = useState(""); // NEW: department/course filter
  const [showAdd,      setShowAdd]      = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [detailRecord, setDetailRecord] = useState<PatientRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PatientRecord | null>(null);
  const [showFilters,  setShowFilters]  = useState(false);
  const [dateFrom,     setDateFrom]     = useState(todayISO());
  const [dateTo,       setDateTo]       = useState(todayISO());
  const [page,         setPage]         = useState(1); // NEW: pagination

  const canManage = !isAdmin;

  const fetchRecords = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search)       params.set("search",   search);
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
  }, [courseId, search, dateFrom, dateTo]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => { setPage(1); }, [search, courseFilter, dateFrom, dateTo]);

  

  // Department/Course options derived from the currently loaded (search/status/date-filtered) records
  const courseOptions = [...new Set(records.map(r => r.student.course).filter(Boolean))] as string[];

  // Course filter applied client-side, on top of the server-side filtered set
  const filteredRecords = courseFilter
    ? records.filter(r => r.student.course === courseFilter)
    : records;

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginated  = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilter = !!courseFilter || dateFrom !== todayISO() || dateTo !== todayISO();

  /* ── Export Confirmation Modal ── */
  const ExportModal = () => {
    const [exportDateFrom, setExportDateFrom] = useState(dateFrom);
    const [exportDateTo,   setExportDateTo]   = useState(dateTo);
    const [exportCourse,   setExportCourse]   = useState(courseFilter);
    const [exporting,      setExporting]      = useState(false);

    const previewCount = records.filter(r => {
      const d = new Date(r.visitDate);
      const from = exportDateFrom ? new Date(`${exportDateFrom}T00:00:00+08:00`) : null;
      const to   = exportDateTo   ? new Date(`${exportDateTo}T23:59:59+08:00`)   : null;
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      if (exportCourse && r.student.course !== exportCourse) return false;
      return true;
    }).length;

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
        const suffix = exportDateFrom || exportDateTo
          ? `_${exportDateFrom || "start"}_to_${exportDateTo || "now"}`
          : "";
        a.href = url; a.download = `general_log_sheet${suffix}.pdf`; a.click();
        URL.revokeObjectURL(url);
        setShowExportModal(false);
      } catch {
        alert("Export failed. Please try again.");
      } finally {
        setExporting(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30"
        style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
        onClick={() => setShowExportModal(false)}>
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-[420px] overflow-hidden"
          onClick={e => e.stopPropagation()}>
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: MAROON }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Download size={15} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Clinic</p>
                <p className="text-sm font-black text-white">Export General Log Sheet</p>
              </div>
            </div>
            <button onClick={() => setShowExportModal(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Department / Course</p>
              <div className="relative">
                <select
                  value={exportCourse}
                  onChange={e => setExportCourse(e.target.value)}
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
                <input
                  type="date" value={exportDateFrom}
                  onChange={e => setExportDateFrom(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]"
                />
                <span className="text-xs text-gray-400 shrink-0">to</span>
                <input
                  type="date" value={exportDateTo}
                  onChange={e => setExportDateTo(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]"
                />
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
              <p className="text-xs text-gray-500">
                <span className="font-black text-gray-800">{previewCount}</span> record{previewCount !== 1 ? "s" : ""} will be exported
                {exportCourse ? ` · ${exportCourse}` : ""}
                {exportDateFrom ? ` · ${fmtDate(exportDateFrom)}` : ""}
                {exportDateTo && exportDateTo !== exportDateFrom ? ` – ${fmtDate(exportDateTo)}` : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
            <button onClick={() => setShowExportModal(false)} disabled={exporting}
              className="flex-1 h-10 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleExport} disabled={exporting || previewCount === 0}
              className="flex-1 h-10 rounded-xl text-xs font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              style={{ background: MAROON }}>
              {exporting
                ? <><RefreshCw size={13} className="animate-spin" /> Exporting...</>
                : <><Download size={13} /> Export PDF</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

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
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5 truncate" style={{ color: MAROON }}>
            Clinic
          </p>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">Patient Records</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchRecords}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all">
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

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: "Total Records",  value: filteredRecords.length },
            { label: "Today's Visits", value: filteredRecords.filter(r => new Date(r.visitDate).toDateString() === new Date().toDateString()).length },
            { label: hasActiveFilter ? "Matching Filter" : "Active Filters", value: hasActiveFilter ? filteredRecords.length : 0 },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
              <div className="rounded-lg p-2 sm:p-2.5 shrink-0" style={{ background: "#f3f4f6", color: MAROON }}>
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black tabular-nums leading-none text-gray-900">{s.value}</p>
                <p className="text-xs sm:text-sm font-semibold mt-0.5 text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table Card ── */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">

          {/* Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-white flex-wrap">
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
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
            </button>

            <button onClick={() => setShowExportModal(true)}
              disabled={filteredRecords.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all disabled:opacity-40 shrink-0 ml-auto">
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Export</span>
            </button>

            
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-2.5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Department / Course</span>
                <div className="relative">
                  <select
                    value={courseFilter}
                    onChange={e => setCourseFilter(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 outline-none appearance-none max-w-[260px]">
                    <option value="">All Departments / Courses</option>
                    {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
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
                  className="flex items-center gap-1 text-[11px] font-bold hover:underline"
                  style={{ color: MAROON }}>
                  <X size={11} /> Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 py-20">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-xs font-medium">Loading records...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-xs font-medium text-red-500 py-20">{error}</div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                <Stethoscope className="w-7 h-7" style={{ color: MAROON }} />
              </div>
              <p className="text-sm text-gray-400 font-medium">No patient records found.</p>
              {canManage && !hasActiveFilter && !search && (
                <button onClick={() => setShowAdd(true)}
                  className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                  + Record first visit
                </button>
              )}
            </div>
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
                    {paginated.map((r, i) => {
                      const canDel = !isAdmin && (isHead || r.recordedByUser.id === currentUserId);
                      return (
                        <tr key={r.id}
                          className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                          onClick={() => setDetailRecord(r)}>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-800" style={{ border: "1px solid #d1d5db" }}>
                            <p>{fmtDate(r.visitDate)}</p>
                            <p className="text-gray-500">{fmtTime(r.visitDate)}</p>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-800 tabular-nums text-center" style={{ border: "1px solid #d1d5db" }}>
                            {(page - 1) * PAGE_SIZE + i + 1}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-800 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                            {r.student.name}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-800 text-center" style={{ border: "1px solid #d1d5db" }}>
                            {r.student.gender ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-800 tabular-nums text-center" style={{ border: "1px solid #d1d5db" }}>
                            {r.student.age ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-800 max-w-[160px]" style={{ border: "1px solid #d1d5db" }}>
                            <span className="line-clamp-1">{r.student.address ?? "—"}</span>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-800" style={{ border: "1px solid #d1d5db" }}>
                            {r.student.course ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-800 max-w-[220px]" style={{ border: "1px solid #d1d5db" }}>
                            <span className="line-clamp-1">{r.complaint}</span>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-800" style={{ border: "1px solid #d1d5db", minWidth: "120px" }}>
                            {r.signatureUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={r.signatureUrl}
                                alt="signature"
                                className="h-8 max-w-[100px] object-contain"
                              />
                            ) : (
                              ""
                            )}
                          </td>
                          <td className="px-2 py-3 w-10" style={{ border: "1px solid #d1d5db" }}>
                            {canDel && (
                              <button
                                onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden p-3 space-y-2">
                {paginated.map(r => {
                  const canDel = !isAdmin && (isHead || r.recordedByUser.id === currentUserId);
                  return (
                    <div key={r.id}
                      className="bg-white rounded-xl border border-gray-200 p-4"
                      onClick={() => setDetailRecord(r)}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{r.student.name}</p>
                          <p className="text-[10px] font-mono font-bold text-gray-400">{r.student.studentNumber}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
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
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        {r.student.course && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest" style={{ background: "#fef2f2", color: MAROON }}>
                            {r.student.course}
                          </span>
                        )}
                        <span className={`flex items-center gap-0.5 text-[10px] font-bold ${r.signatureUrl ? "text-green-500" : "text-amber-500"}`}>
                          {r.signatureUrl ? <Check size={9} /> : <PenLine size={9} />}
                          {r.signatureUrl ? "Signed" : "Unsigned"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 mb-1.5">{r.complaint}</p>
                      <p className="text-[11px] text-gray-400">{fmtDate(r.visitDate)} · {fmtTime(r.visitDate)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredRecords.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-100 bg-white shrink-0 flex-wrap gap-2">
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

      {showExportModal && <ExportModal />}
    </div>
  );
}