"use client";

// src/components/layout/course/CourseMedicalExamRecordTab.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, X, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  Trash2, Check, ArrowUpDown, Download, Filter, ClipboardList, PenLine,
  FileCheck, Activity,
} from "lucide-react";
import { resolveStudentAge } from "@/lib/age";

/* ─────────────────────────────────────────────────────────────────────────────
  CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";
const PAGE_SIZE = 15;

const TAB_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  @media (max-width: 639px) { input, textarea, select { font-size: 16px !important; } }
  button, [role="button"] { -webkit-tap-highlight-color: transparent; }
  .mer-scroll::-webkit-scrollbar { display: none; }
  .mer-scroll { scrollbar-width: none; }
`;

const ALL_COURSES = [
  "Bachelor of Elementary Education",
  "Bachelor of Secondary Education Major in Filipino",
  "Bachelor of Secondary Education Major in Mathematics",
  "Bachelor of Secondary Education Major in Science",
  "Bachelor of Secondary Education Major in Social Studies",
  "Bachelor of Secondary Education Major in Physical Education",
  "Bachelor of Science in Accountancy",
  "Bachelor of Science in Business Administration",
  "Bachelor of Science in Hospitality Management",
  "Bachelor of Science in Information Technology",
  "Bachelor of Industrial Technology Major in Automotive Technology",
];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hh   = h % 12 === 0 ? 12 : h % 12;
    const mm   = m === 0 ? "00" : "30";
    const ampm = h < 12 ? "AM" : "PM";
    TIME_OPTIONS.push(`${hh}:${mm} ${ampm}`);
  }
}

const HEIGHT_OPTIONS  = Array.from({ length: 121 }, (_, i) => String(i + 100));
const WEIGHT_OPTIONS  = Array.from({ length: 171 }, (_, i) => String(i + 30));
const HEART_RATE_OPTIONS = Array.from({ length: 141 }, (_, i) => String(i + 40));
const RESPIRATORY_RATE_OPTIONS = Array.from({ length: 33 }, (_, i) => String(i + 8));
const SECTION_OPTIONS = ["1A","1B","2A","2B","3A","3B","4A","4B"];
const CIVIL_STATUS_OPTIONS = ["Single","Married"];

const BLOOD_PRESSURE_OPTIONS = [
  "90/60","95/60","100/60","100/70","105/70","110/70","110/80",
  "115/75","115/80","120/70","120/80","120/90","125/80","125/85",
  "130/80","130/85","130/90","135/85","135/90","140/90","140/95",
  "145/95","150/90","150/100","160/100","160/110","170/100",
  "170/110","180/110","180/120","190/120","200/120",
];

const TEMPERATURE_OPTIONS: string[] = [];
for (let t = 350; t <= 410; t++) TEMPERATURE_OPTIONS.push((t / 10).toFixed(1));

const PHYSICAL_SIGN_KEYS = [
  { key: "skin",          label: "Skin" },
  { key: "nose",          label: "Nose" },
  { key: "abdomen",       label: "Abdomen" },
  { key: "head",          label: "Head" },
  { key: "throat",        label: "Throat" },
  { key: "kidneyBladder", label: "Kidney / Bladder" },
  { key: "eyes",          label: "Eyes" },
  { key: "chestLungs",   label: "Chest / Lungs" },
  { key: "brain",         label: "Brain" },
  { key: "ears",          label: "Ears" },
  { key: "heart",         label: "Heart" },
  { key: "mentalDisorder",label: "Mental Disorder" },
] as const;

const FITNESS_FOR_OPTIONS = [
  "Field Trip/Educational Tour",
  "Outbound Activities",
  "Others, Specify:",
] as const;

type PhysicalSigns = Partial<Record<typeof PHYSICAL_SIGN_KEYS[number]["key"], boolean>>;

/* ─────────────────────────────────────────────────────────────────────────────
  TYPES
───────────────────────────────────────────────────────────────────────────── */
interface StudentInfo {
  id:            string;
  studentNumber: string;
  name:          string;
  email:         string | null;
  address:       string | null;
  birthDate:     string | null;
  age:           number | null;
  gender:        string | null;
  course:        string | null;
  placeOfBirth:  string | null;
}

interface ExamRecord {
  id:              string;
  purpose:         string;
  remarks:         string | null;
  visitDate:       string;
  createdAt:       string;
  student:         StudentInfo;
  recordedByUser:  { id: string; name: string };
  section:         string | null;
  height:          number | null;
  weight:          number | null;
  heartRate:       string | null;
  bloodPressure:   string | null;
  temperature:     number | null;
  respiratoryRate: string | null;
  placeOfBirth:    string | null;
  physicalSigns:   PhysicalSigns | null;
  isPregnant:      boolean | null;
  lastMenstrualPeriod: string | null;
  civilStatus:     string | null;
  fitnessStatus:   string | null;
  fitnessFor:      string[];
  clearanceRemarks: string | null;
  clearanceIssuedAt: string | null;
  signatureUrl?:   string | null;
  signatureMethod?: string | null;
  signedAt?:       string | null;
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
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function currentTime() {
  const d = new Date();
  const h = d.getHours(), m = d.getMinutes();
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m < 30 ? 0 : 30).padStart(2,"0");
  return `${hh}:${mm} ${h < 12 ? "AM" : "PM"}`;
}
function courseAbbrev(course: string | null | undefined): string | null {
  if (!course) return null;
  const match = course.match(/\(([^)]+)\)/);
  return match ? match[1] : course.split(" ").filter(w => /^[A-Z]/.test(w)).join("") || course.slice(0, 8);
}

/* ─────────────────────────────────────────────────────────────────────────────
  useWindowHeight — reads window.innerHeight (the true visible viewport height,
  excluding browser chrome on mobile) and updates on resize/orientationchange.
  This is the only reliable cross-browser way to get the real usable height.
───────────────────────────────────────────────────────────────────────────── */
function useWindowHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const update = () => setH(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return h;
}

/* ─────────────────────────────────────────────────────────────────────────────
  SHARED UI ATOMS
───────────────────────────────────────────────────────────────────────────── */
const inputCls = [
  "w-full h-10 border border-gray-300 rounded-lg px-3 text-sm",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400",
].join(" ");

const textareaCls = [
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm",
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
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}
function SelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
      <div className="w-1 h-4 rounded-full shrink-0" style={{ background: MAROON }} />
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{children}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  STATUS BADGE
───────────────────────────────────────────────────────────────────────────── */
function FitnessBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const isFit = status === "FIT";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${isFit ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
      {status}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  MODAL SHELL
  Uses JS-measured window.innerHeight so the height is always correct on
  mobile browsers regardless of dvh/vh support or browser chrome size.
───────────────────────────────────────────────────────────────────────────── */
function ModalShell({
  onClose, children, maxWidth = "sm:max-w-3xl", fullHeight = false,
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  fullHeight?: boolean;
}) {
  const winH = useWindowHeight();
  // 92% of true visible viewport height, with a px floor while JS loads
  const BOTTOM_NAV_H = typeof window !== "undefined" && window.innerWidth < 768 ? 60 : 0;
  const modalMaxH = winH > 0 ? Math.floor(winH * 0.92) - BOTTOM_NAV_H : 700;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}
    >
      <div
        className={`bg-white w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100`}
        style={{
          height: fullHeight ? modalMaxH : undefined,
          maxHeight: modalMaxH,
          marginBottom: typeof window !== "undefined" && window.innerWidth < 768 ? 60 : 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle = "Clinic", onClose, actions }: {
  title: string; subtitle?: string; onClose: () => void; actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 shrink-0" style={{ background: MAROON }}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <ClipboardList size={15} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{subtitle}</p>
          <p className="text-sm font-bold text-white truncate">{title}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  DELETE MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteModal({ record, courseId, onClose, onDeleted }: {
  record: ExamRecord; courseId: string; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/medical-exam-records/${record.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to delete."); setDeleting(false); return; }
      onDeleted();
    } catch { setError("Network error. Please try again."); setDeleting(false); }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="sm:max-w-sm">
      <div className="px-5 py-5 overflow-y-auto" style={{ flex: "1 1 0", minHeight: 0 }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-50">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-sm font-bold text-gray-900 mb-1">Delete this record?</p>
        <p className="text-xs text-gray-500 mb-1 font-medium">{record.student.name}</p>
        <p className="text-xs text-gray-400 mb-5 leading-relaxed">
          {fmtDate(record.visitDate)} · {record.purpose}<br />This action is permanent and cannot be undone.
        </p>
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={deleting} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5" style={{ background: "#ef4444" }}>
            {deleting ? <><RefreshCw size={12} className="animate-spin" /> Deleting...</> : "Delete"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  PHYSICAL SIGNS GRID
───────────────────────────────────────────────────────────────────────────── */
function PhysicalSignsGrid({
  physicalSigns,
  onChange,
}: {
  physicalSigns: PhysicalSigns;
  onChange: (next: PhysicalSigns) => void;
}) {
  const toggle = (key: string, val: boolean) => {
    const current = (physicalSigns as Record<string, boolean | undefined>)[key];
    onChange({ ...physicalSigns, [key]: current === val ? undefined : val });
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-4 px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        <span className="col-span-2">Area</span>
        <span className="text-center">Yes</span>
        <span className="text-center">No</span>
      </div>
      {PHYSICAL_SIGN_KEYS.map(({ key, label }) => {
        const val = (physicalSigns as Record<string, boolean | undefined>)[key];
        return (
          <div key={key} className="grid grid-cols-4 px-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
            <span className="col-span-2 text-xs font-medium text-gray-700 self-center leading-snug">{label}</span>
            <div className="flex justify-center">
              <button type="button" onClick={() => toggle(key, true)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${val === true ? "border-red-500 bg-red-500" : "border-gray-300"}`}>
                {val === true && <Check size={10} className="text-white" />}
              </button>
            </div>
            <div className="flex justify-center">
              <button type="button" onClick={() => toggle(key, false)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${val === false ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                {val === false && <Check size={10} className="text-white" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  CLEARANCE EDITOR
───────────────────────────────────────────────────────────────────────────── */
function ClearanceEditor({
  fitnessStatus, setFitnessStatus,
  fitnessFor, setFitnessFor,
  fitnessForOther, setFitnessForOther,
  clearanceRemarks, setClearanceRemarks,
}: {
  fitnessStatus: "FIT" | "UNFIT" | "";
  setFitnessStatus: (v: "FIT" | "UNFIT" | "") => void;
  fitnessFor: string[];
  setFitnessFor: React.Dispatch<React.SetStateAction<string[]>>;
  fitnessForOther: string;
  setFitnessForOther: (v: string) => void;
  clearanceRemarks: string;
  setClearanceRemarks: (v: string) => void;
}) {
  const toggle = (opt: string) =>
    setFitnessFor(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {(["FIT", "UNFIT"] as const).map(s => (
          <button key={s} type="button"
            onClick={() => setFitnessStatus(fitnessStatus === s ? "" : s)}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-black transition-all ${fitnessStatus === s
              ? s === "FIT" ? "border-green-500 bg-green-500 text-white" : "border-red-500 bg-red-500 text-white"
              : "border-gray-200 text-gray-400 hover:border-gray-400"}`}>
            {s}
          </button>
        ))}
      </div>
      {fitnessStatus && (
        <>
          <div>
            <FieldLabel>To undergo in</FieldLabel>
            <div className="space-y-2">
              {FITNESS_FOR_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => toggle(opt)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2.5 ${fitnessFor.includes(opt) ? "border-transparent text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
                  style={fitnessFor.includes(opt) ? { background: MAROON } : {}}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${fitnessFor.includes(opt) ? "border-white" : "border-gray-300"}`}>
                    {fitnessFor.includes(opt) && <Check size={9} className="text-white" />}
                  </div>
                  {opt}
                </button>
              ))}
            </div>
            {fitnessFor.includes("Others, Specify:") && (
              <div className="mt-2">
                <input value={fitnessForOther} onChange={e => setFitnessForOther(e.target.value)}
                  placeholder="Please specify..." className={inputCls} />
              </div>
            )}
          </div>
          <div>
            <FieldLabel>Clearance Remarks</FieldLabel>
            <textarea value={clearanceRemarks} onChange={e => setClearanceRemarks(e.target.value)}
              rows={2} placeholder="Additional clearance notes..." className={textareaCls} />
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  ADD EXAM MODAL
  Layout: header (shrink-0) → tab strip (shrink-0) → scroll body (flex-1)
          → footer (shrink-0). ModalShell height is set by JS window.innerHeight
          so it always fits within the visible viewport on every mobile browser.
───────────────────────────────────────────────────────────────────────────── */
function AddExamModal({ courseId, onClose, onSaved }: {
  courseId: string; onClose: () => void; onSaved: (record: ExamRecord) => void;
}) {
  type AddTab = "student" | "vitals" | "signs" | "clearance";
  const TABS: { key: AddTab; label: string }[] = [
    { key: "student",   label: "Student" },
    { key: "vitals",    label: "Vitals" },
    { key: "signs",     label: "Signs" },
    { key: "clearance", label: "Clearance" },
  ];

  const [tab, setTab] = useState<AddTab>("student");

  const [studentNum,    setStudentNum]    = useState("");
  const [student,       setStudent]       = useState<StudentInfo | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError,   setLookupError]   = useState("");

  const [visitDate, setVisitDate] = useState(todayISO());
  const [visitTime, setVisitTime] = useState(currentTime());
  const [purpose,   setPurpose]   = useState("");

  const [height,          setHeight]          = useState("");
  const [weight,          setWeight]          = useState("");
  const [heartRate,       setHeartRate]       = useState("");
  const [bloodPressure,   setBloodPressure]   = useState("");
  const [temperature,     setTemperature]     = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [placeOfBirth,    setPlaceOfBirth]    = useState("");
  const [section,         setSection]         = useState("");
  const [civilStatus,     setCivilStatus]     = useState("");

  const [physicalSigns,        setPhysicalSigns]        = useState<PhysicalSigns>({});
  const [isPregnant,           setIsPregnant]           = useState<boolean | null>(null);
  const [lastMenstrualPeriod,  setLastMenstrualPeriod]  = useState("");
  const [remarks,              setRemarks]              = useState("");

  const [fitnessStatus,    setFitnessStatus]    = useState<"FIT" | "UNFIT" | "">("");
  const [fitnessFor,       setFitnessFor]       = useState<string[]>([]);
  const [fitnessForOther,  setFitnessForOther]  = useState("");
  const [clearanceRemarks, setClearanceRemarks] = useState("");

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const lookupStudent = useCallback(async (num: string) => {
    const trimmed = num.trim();
    if (!trimmed) { setStudent(null); setLookupError(""); return; }
    setLookupLoading(true); setLookupError(""); setStudent(null);
    try {
      const res  = await fetch(`/api/courses/${courseId}/medical-exam-records/student-lookup?studentNumber=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error ?? "Student not found."); return; }
      setStudent(data.student);
    } catch { setLookupError("Network error. Please try again."); }
    finally   { setLookupLoading(false); }
  }, [courseId]);

  const handleStudentNumChange = (val: string) => {
    setStudentNum(val); setStudent(null); setLookupError("");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => lookupStudent(val), 600);
  };

  const handleSave = async () => {
    setError("");
    if (!student)        { setError("Please look up a valid student first."); setTab("student"); return; }
    if (!purpose.trim()) { setError("Purpose is required."); setTab("student"); return; }
    if (!visitDate)      { setError("Visit date is required."); setTab("student"); return; }
    setSaving(true);
    try {
      const visitDateTime = new Date(`${visitDate} ${visitTime}`).toISOString();
      const res = await fetch(`/api/courses/${courseId}/medical-exam-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId:      student.id,
          purpose:        purpose.trim(),
          visitDate:      visitDateTime,
          height:         height          ? parseFloat(height)          : null,
          weight:         weight          ? parseFloat(weight)          : null,
          heartRate:      heartRate       || null,
          bloodPressure:  bloodPressure   || null,
          temperature:    temperature     ? parseFloat(temperature)     : null,
          respiratoryRate: respiratoryRate || null,
          placeOfBirth:   placeOfBirth    || null,
          section:        section         || null,
          civilStatus:    civilStatus     || null,
          physicalSigns:  Object.keys(physicalSigns).length ? physicalSigns : null,
          isPregnant,
          lastMenstrualPeriod: lastMenstrualPeriod || null,
          remarks:        remarks.trim() || null,
          fitnessStatus:  fitnessStatus   || null,
          fitnessFor,
          clearanceRemarks: clearanceRemarks.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      onSaved(data.record);
    } catch { setError("Network error. Please try again."); }
    finally  { setSaving(false); }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="sm:max-w-2xl" fullHeight>
      {/* 1. Header */}
      <ModalHeader title="New Medical Exam Record" onClose={onClose} />

      {/* 2. Tab strip */}
      <div
        className="mer-scroll flex border-b border-gray-100 bg-white overflow-x-auto"
        style={{ flexShrink: 0 }}
      >
        {TABS.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors"
            style={{
              color: tab === t.key ? MAROON : "#6b7280",
              borderBottom: tab === t.key ? `2px solid ${MAROON}` : "2px solid transparent",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 3. Scrollable body */}
      <div
        style={{ flex: "1 1 0", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}
        className="px-4 sm:px-6 py-5 space-y-5"
      >
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
            {error}
          </div>
        )}

        {tab === "student" && (
          <>
            <div>
              <SectionHeading>Student Lookup</SectionHeading>
              <FieldLabel required>Student Number</FieldLabel>
              <div className="relative">
                <input value={studentNum} onChange={e => handleStudentNumChange(e.target.value)}
                  placeholder="Enter student number..." className={inputCls} />
                {lookupLoading && <RefreshCw size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
              </div>
              {lookupError && <p className="text-xs text-red-500 mt-1.5">{lookupError}</p>}
              {student && (
                <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50">
                    <Check size={12} className="text-green-600 shrink-0" />
                    <span className="text-xs font-semibold text-green-700">Student Found</span>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 bg-white">
                    {([
                      ["Name", student.name],
                      ["Student No.", student.studentNumber],
                      ["Course", student.course ?? "—"],
                      ["Age", resolveStudentAge(student) ? `${resolveStudentAge(student)} yrs` : "—"],
                      ["Gender", student.gender ?? "—"],
                      ["Address", student.address ?? "—"],
                    ] as [string,string][]).map(([label, val]) => (
                      <div key={label}>
                        <p className="text-[10px] text-gray-400 mb-0.5 font-medium">{label}</p>
                        <p className="text-xs font-semibold text-gray-800 leading-snug">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <SectionHeading>Exam Info</SectionHeading>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <FieldLabel required>Date</FieldLabel>
                  <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <FieldLabel required>Time</FieldLabel>
                  <SelectWrap>
                    <select value={visitTime} onChange={e => setVisitTime(e.target.value)} className={selectCls}>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </SelectWrap>
                </div>
              </div>
              <FieldLabel required>Purpose</FieldLabel>
              <textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={2}
                placeholder="e.g. Pre-employment physical exam, OJT requirement..." className={textareaCls} />
            </div>
            <div>
              <SectionHeading>Remarks</SectionHeading>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                placeholder="Additional remarks or observations..." className={textareaCls} />
            </div>
          </>
        )}

        {tab === "vitals" && (
          <>
            <SectionHeading>Vital Signs</SectionHeading>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel>Height (cm)</FieldLabel>
                <SelectWrap>
                  <select value={height} onChange={e => setHeight(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {HEIGHT_OPTIONS.map(h => <option key={h} value={h}>{h} cm</option>)}
                  </select>
                </SelectWrap>
              </div>
              <div>
                <FieldLabel>Weight (kg)</FieldLabel>
                <SelectWrap>
                  <select value={weight} onChange={e => setWeight(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {WEIGHT_OPTIONS.map(w => <option key={w} value={w}>{w} kg</option>)}
                  </select>
                </SelectWrap>
              </div>
              <div>
                <FieldLabel>Heart Rate</FieldLabel>
                <SelectWrap>
                  <select value={heartRate} onChange={e => setHeartRate(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {HEART_RATE_OPTIONS.map(hr => <option key={hr} value={`${hr} bpm`}>{hr} bpm</option>)}
                  </select>
                </SelectWrap>
              </div>
              <div>
                <FieldLabel>Blood Pressure</FieldLabel>
                <SelectWrap>
                  <select value={bloodPressure} onChange={e => setBloodPressure(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {BLOOD_PRESSURE_OPTIONS.map(bp => <option key={bp} value={bp}>{bp} mmHg</option>)}
                  </select>
                </SelectWrap>
              </div>
              <div>
                <FieldLabel>Temperature (°C)</FieldLabel>
                <SelectWrap>
                  <select value={temperature} onChange={e => setTemperature(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {TEMPERATURE_OPTIONS.map(t => <option key={t} value={t}>{t} °C</option>)}
                  </select>
                </SelectWrap>
              </div>
              <div>
                <FieldLabel>Respiratory Rate</FieldLabel>
                <SelectWrap>
                  <select value={respiratoryRate} onChange={e => setRespiratoryRate(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {RESPIRATORY_RATE_OPTIONS.map(rr => <option key={rr} value={`${rr} /min`}>{rr} /min</option>)}
                  </select>
                </SelectWrap>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <div>
                <FieldLabel>Place of Birth</FieldLabel>
                <input value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)}
                  placeholder="e.g. San Fernando, Pampanga" className={inputCls} />
              </div>
              <div>
                <FieldLabel>Section</FieldLabel>
                <SelectWrap>
                  <select value={section} onChange={e => setSection(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {SECTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </SelectWrap>
              </div>
              <div>
                <FieldLabel>Civil Status</FieldLabel>
                <SelectWrap>
                  <select value={civilStatus} onChange={e => setCivilStatus(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {CIVIL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </SelectWrap>
              </div>
            </div>
          </>
        )}

        {tab === "signs" && (
          <>
            <div>
              <SectionHeading>Physical Signs Disorder</SectionHeading>
              <PhysicalSignsGrid physicalSigns={physicalSigns} onChange={setPhysicalSigns} />
            </div>
            <div>
              <SectionHeading>Pregnancy</SectionHeading>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-xs text-gray-600 font-medium">Pregnant?</span>
                {[{ label: "Yes", val: true }, { label: "No", val: false }].map(opt => (
                  <button key={opt.label} type="button"
                    onClick={() => setIsPregnant(isPregnant === opt.val ? null : opt.val)}
                    className={`px-4 py-1.5 rounded-lg border text-xs font-bold transition-all ${isPregnant === opt.val ? "text-white border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
                    style={isPregnant === opt.val ? { background: MAROON } : {}}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {isPregnant === true && (
                <div>
                  <FieldLabel>Last Menstrual Period</FieldLabel>
                  <input type="date" value={lastMenstrualPeriod} onChange={e => setLastMenstrualPeriod(e.target.value)}
                    max={todayISO()} className={inputCls} />
                  {lastMenstrualPeriod && (
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      {(() => {
                        const lmp = new Date(lastMenstrualPeriod);
                        const diff = Math.floor((Date.now() - lmp.getTime()) / 86400000);
                        if (diff < 0) return "⚠ Date cannot be in the future";
                        const w = Math.floor(diff / 7), d = diff % 7;
                        return w > 0 ? `AOG: ${w}w${d > 0 ? ` ${d}d` : ""}` : `AOG: ${d}d`;
                      })()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "clearance" && (
          <>
            <SectionHeading>Medical Clearance</SectionHeading>
            <ClearanceEditor
              fitnessStatus={fitnessStatus} setFitnessStatus={setFitnessStatus}
              fitnessFor={fitnessFor} setFitnessFor={setFitnessFor}
              fitnessForOther={fitnessForOther} setFitnessForOther={setFitnessForOther}
              clearanceRemarks={clearanceRemarks} setClearanceRemarks={setClearanceRemarks}
            />
          </>
        )}
      </div>

      {/* 4. Footer — always visible, never scrolls away */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid #f3f4f6",
          background: "#f9fafb",
          padding: "12px 16px 14px",
        }}
        className="sm:px-6 flex gap-2"
      >
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
          style={{ height: 48 }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !student}
          className="flex-1 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
          style={{ height: 48, background: MAROON }}
        >
          {saving
            ? <><RefreshCw size={13} className="animate-spin" /> Saving...</>
            : <><Check size={13} /> Save Record</>
          }
        </button>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  VIEW RECORD MODAL
───────────────────────────────────────────────────────────────────────────── */
function ViewRecordModal({ record, canDelete, onClose, onAskDelete, courseId, onUpdated }: {
  record: ExamRecord; canDelete: boolean; onClose: () => void; onAskDelete: () => void;
  courseId: string; onUpdated: (r: ExamRecord) => void;
}) {
  const [editing,          setEditing]          = useState(false);
  const [fitnessStatus,    setFitnessStatus]    = useState<"FIT" | "UNFIT" | "">((record.fitnessStatus as "FIT" | "UNFIT") ?? "");
  const [fitnessFor,       setFitnessFor]       = useState<string[]>(record.fitnessFor?.filter(f => !f.startsWith("Others:")) ?? []);
  const [fitnessForOther,  setFitnessForOther]  = useState(record.fitnessFor?.find(f => f.startsWith("Others:"))?.replace("Others: ","") ?? "");
  const [clearanceRemarks, setClearanceRemarks] = useState(record.clearanceRemarks ?? "");
  const [civilStatus,      setCivilStatus]      = useState(record.civilStatus ?? "");
  const [saving,           setSaving]           = useState(false);
  const [saveError,        setSaveError]        = useState("");

  const signs    = record.physicalSigns ?? {};
  const hasVitals = record.height || record.weight || record.heartRate || record.bloodPressure || record.temperature || record.respiratoryRate;
  const hasSigns  = PHYSICAL_SIGN_KEYS.some(({ key }) => (signs as Record<string, boolean | undefined>)[key] !== undefined);

  const SLATE = "#0f172a";
  const MUTED = "#64748b";
  const RULE  = "#e2e8f0";

  const handleSaveClearance = async () => {
    setSaving(true); setSaveError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/medical-exam-records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fitnessStatus: fitnessStatus || null,
          fitnessFor: fitnessFor.map(f =>
            f === "Others, Specify:" && fitnessForOther.trim() ? `Others: ${fitnessForOther.trim()}` : f
          ),
          clearanceRemarks: clearanceRemarks || null,
          civilStatus:      civilStatus      || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Failed to save."); return; }
      onUpdated(data.record); setEditing(false);
    } catch { setSaveError("Network error."); }
    finally  { setSaving(false); }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="sm:max-w-5xl" fullHeight>
      <ModalHeader
        title="Medical Exam Record"
        onClose={onClose}
        actions={
          <>
            <a href={`/api/courses/${courseId}/medical-exam-records/${record.id}/export-clearance`}
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all">
              <Download size={12} /> Export
            </a>
            {canDelete && (
              <button onClick={onAskDelete}
                className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-all">
                <Trash2 size={12} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-col sm:flex-row overflow-hidden" style={{ flex: "1 1 0", minHeight: 0, background: "#f1f5f9" }}>
        {/* LEFT sidebar */}
        <div className="sm:w-60 shrink-0 bg-white sm:border-r border-b sm:border-b-0 border-gray-200 flex flex-col overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MAROON }}>Student Information</p>
          </div>
          <div className="px-4 py-4 flex items-start gap-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{record.student.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{record.student.studentNumber}</p>
              {record.student.course && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{record.student.course}</p>}
            </div>
          </div>
          <div className="px-4 py-2 flex-1">
            {([
              ["Age",            resolveStudentAge(record.student) ? `${resolveStudentAge(record.student)} yrs` : null],
              ["Gender",         record.student.gender],
              ["Address",        record.student.address],
              ["Place of Birth", record.student.placeOfBirth],
              ["Section",        record.section],
              ["Civil Status",   record.civilStatus],
            ] as [string, string | null | undefined][]).map(([label, value]) =>
              value ? (
                <div key={label} className="py-2.5 border-b border-gray-100 last:border-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
                  <p className="text-xs font-medium text-gray-800">{value}</p>
                </div>
              ) : null
            )}
            <div className="py-3 border-b border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">E-Signature</p>
              {record.signatureUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={record.signatureUrl} alt="signature"
                    style={{ height: 40, maxWidth: 140, objectFit: "contain", border: `1px solid ${RULE}`, borderRadius: 6, padding: 3, background: "#fff" }} />
                  <p className="text-[10px] text-gray-400 mt-1">Signed {fmtDate(record.signedAt)}</p>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  <PenLine size={9} /> Awaiting signature
                </span>
              )}
            </div>
            <div className="py-3 sm:hidden">
              <a href={`/api/courses/${courseId}/medical-exam-records/${record.id}/export-clearance`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400 transition-all">
                <Download size={12} /> Export Clearance
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT — exam details */}
        <div className="flex flex-col overflow-y-auto" style={{ flex: "1 1 0", minHeight: 0 }}>
          <div className="px-4 py-3 border-b border-gray-200 sticky top-0 z-10 bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MAROON }}>Exam Details</p>
          </div>
          <div className="p-4 space-y-3">
            <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 12, padding: "14px 16px" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ["Visit Date", `${fmtDate(record.visitDate)} · ${fmtTime(record.visitDate)}`],
                  ["Purpose",     record.purpose],
                  ["Recorded by", record.recordedByUser.name],
                  ["Remarks",     record.remarks],
                ] as [string, string | null][]).filter(([,v]) => v).map(([label, val]) => (
                  <div key={label}>
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", color: MAROON, marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: 13, color: SLATE, lineHeight: 1.6 }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {hasVitals && (
              <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", color: MAROON, marginBottom: 10 }}>Vitals</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 rounded-lg px-3 py-2.5" style={{ background: "#f8fafc", border: `1px solid ${RULE}` }}>
                  {([
                    ["Height",     record.height         ? `${record.height} cm`      : null],
                    ["Weight",     record.weight         ? `${record.weight} kg`      : null],
                    ["Heart Rate", record.heartRate],
                    ["BP",         record.bloodPressure],
                    ["Temp",       record.temperature    ? `${record.temperature} °C` : null],
                    ["Resp.",      record.respiratoryRate],
                  ] as [string, string | null][]).filter(([,v]) => v).map(([label, val]) => (
                    <div key={label}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: SLATE }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasSigns && (
              <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", color: MAROON, marginBottom: 10 }}>Physical Signs Disorder</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PHYSICAL_SIGN_KEYS.filter(({ key }) => (signs as Record<string, boolean | undefined>)[key] !== undefined).map(({ key, label }) => {
                    const v = (signs as Record<string, boolean | undefined>)[key];
                    return (
                      <div key={key} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ background: "#f8fafc" }}>
                        <span style={{ fontSize: 12, color: SLATE }}>{label}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${v ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>{v ? "YES" : "NO"}</span>
                      </div>
                    );
                  })}
                </div>
                {record.isPregnant !== null && record.isPregnant !== undefined && (
                  <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-lg" style={{ background: "#f8fafc" }}>
                    <span style={{ fontSize: 12, color: SLATE }}>Pregnant</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${record.isPregnant ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>{record.isPregnant ? "YES" : "NO"}</span>
                    {record.isPregnant && record.lastMenstrualPeriod && (
                      <span style={{ fontSize: 11, color: MUTED }}>LMP: {record.lastMenstrualPeriod}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 12, overflow: "hidden" }}>
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <FileCheck size={12} className="text-gray-400" />
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", color: MAROON }}>Medical Clearance</p>
                </div>
                {!editing && (
                  <button onClick={() => setEditing(true)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 transition-all">
                    {record.fitnessStatus ? "Edit" : "Issue Clearance"}
                  </button>
                )}
              </div>
              {editing ? (
                <div className="px-4 py-4 space-y-4">
                  {saveError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Civil Status</p>
                    <div className="flex gap-3">
                      {["Single","Married"].map(s => (
                        <button key={s} type="button"
                          onClick={() => setCivilStatus(civilStatus === s ? "" : s)}
                          className={`flex-1 py-2 rounded-xl border-2 text-xs font-black transition-all ${civilStatus === s ? "border-[#7b1113] bg-[#7b1113] text-white" : "border-gray-200 text-gray-400 hover:border-gray-400"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">He/She is physically / mentally:</p>
                  <ClearanceEditor
                    fitnessStatus={fitnessStatus} setFitnessStatus={setFitnessStatus}
                    fitnessFor={fitnessFor} setFitnessFor={setFitnessFor}
                    fitnessForOther={fitnessForOther} setFitnessForOther={setFitnessForOther}
                    clearanceRemarks={clearanceRemarks} setClearanceRemarks={setClearanceRemarks}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} disabled={saving}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50">
                      Cancel
                    </button>
                    <button onClick={handleSaveClearance} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl text-xs font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                      style={{ background: MAROON }}>
                      {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving...</> : <><Check size={12} /> Save</>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3">
                  {record.fitnessStatus ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FitnessBadge status={record.fitnessStatus} />
                        {record.clearanceIssuedAt && (
                          <span style={{ fontSize: 11, color: MUTED }}>Issued {fmtDate(record.clearanceIssuedAt)}</span>
                        )}
                      </div>
                      {record.fitnessFor?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {record.fitnessFor.map(f => (
                            <span key={f} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{f}</span>
                          ))}
                        </div>
                      )}
                      {record.clearanceRemarks && (
                        <p style={{ fontSize: 12, color: MUTED }}>{record.clearanceRemarks}</p>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                      <PenLine size={11} /> No clearance issued yet
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  EXPORT MODAL
───────────────────────────────────────────────────────────────────────────── */
function ExportModal({ onClose, courseId, records, courseOptions, dateFrom: initialFrom, dateTo: initialTo, courseFilter: initialCourse }: {
  onClose: () => void; courseId: string; records: ExamRecord[];
  courseOptions: string[]; dateFrom: string; dateTo: string; courseFilter: string;
}) {
  const [exportDateFrom, setExportDateFrom] = useState(initialFrom);
  const [exportDateTo,   setExportDateTo]   = useState(initialTo);
  const [exportCourse,   setExportCourse]   = useState(initialCourse);
  const [exporting,      setExporting]      = useState(false);

  const previewCount = records.filter(r => {
    const d    = new Date(r.visitDate);
    const from = exportDateFrom ? new Date(`${exportDateFrom}T00:00:00`) : null;
    const to   = exportDateTo   ? new Date(`${exportDateTo}T23:59:59`)   : null;
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    if (exportCourse && r.student.course !== exportCourse) return false;
    return true;
  }).length;

  const QUICK = [
    { label: "Today",      fn: () => { const d = todayISO(); setExportDateFrom(d); setExportDateTo(d); } },
    { label: "Yesterday",  fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s = d.toISOString().split("T")[0]; setExportDateFrom(s); setExportDateTo(s); } },
    { label: "This Week",  fn: () => { const n = new Date(), mon = new Date(n); mon.setDate(n.getDate()-n.getDay()+1); setExportDateFrom(mon.toISOString().split("T")[0]); setExportDateTo(todayISO()); } },
    { label: "This Month", fn: () => { const n = new Date(); setExportDateFrom(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`); setExportDateTo(todayISO()); } },
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportDateFrom) params.set("dateFrom", exportDateFrom);
      if (exportDateTo)   params.set("dateTo",   exportDateTo);
      if (exportCourse)   params.set("course",   exportCourse);
      const res  = await fetch(`/api/courses/${courseId}/medical-exam-records/export?${params}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `medical_exam_record.pdf`; a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch { alert("Export failed. Please try again."); }
    finally  { setExporting(false); }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="sm:max-w-md">
      <ModalHeader title="Export Medical Exam Record" onClose={onClose} />
      <div className="px-4 sm:px-5 py-5 space-y-4 overflow-y-auto" style={{ flex: "1 1 0", minHeight: 0 }}>
        <div>
          <FieldLabel>Department / Course</FieldLabel>
          <SelectWrap>
            <select value={exportCourse} onChange={e => setExportCourse(e.target.value)} className={selectCls}>
              <option value="">All Departments / Courses</option>
              {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </SelectWrap>
        </div>
        <div>
          <FieldLabel>Date Range</FieldLabel>
          <div className="flex items-center gap-2 mb-2">
            <input type="date" value={exportDateFrom} onChange={e => setExportDateFrom(e.target.value)} className={inputCls} />
            <span className="text-xs text-gray-400 shrink-0">to</span>
            <input type="date" value={exportDateTo} onChange={e => setExportDateTo(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map(q => (
              <button key={q.label} onClick={q.fn}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                {q.label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500">
            <span className="font-black text-gray-800">{previewCount}</span> record{previewCount !== 1 ? "s" : ""} will be exported
          </p>
        </div>
      </div>
      <div
        style={{ flexShrink: 0, borderTop: "1px solid #f3f4f6", background: "#f9fafb", padding: "12px 16px 14px" }}
        className="sm:px-5 flex gap-2"
      >
        <button onClick={onClose} disabled={exporting}
          className="flex-1 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
          style={{ height: 48 }}>
          Cancel
        </button>
        <button onClick={handleExport} disabled={exporting || previewCount === 0}
          className="flex-1 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
          style={{ height: 48, background: MAROON }}>
          {exporting ? <><RefreshCw size={13} className="animate-spin" /> Exporting...</> : <><Download size={13} /> Export PDF</>}
        </button>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
  MAIN TAB
───────────────────────────────────────────────────────────────────────────── */
export default function CourseMedicalExamRecordTab({ courseId, isAdmin, isHead, currentUserId }: Props) {
  const [records,      setRecords]      = useState<ExamRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [showAdd,      setShowAdd]      = useState(false);
  const [viewRecord,   setViewRecord]   = useState<ExamRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamRecord | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilters,  setShowFilters]  = useState(false);
  const [dateFrom,     setDateFrom]     = useState(todayISO());
  const [dateTo,       setDateTo]       = useState(todayISO());
  const [page,         setPage]         = useState(1);
  const [allCourses,   setAllCourses]   = useState<string[]>([]);

  const canManage = !isAdmin;

  const fetchRecords = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search)   params.set("search",   search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const res  = await fetch(`/api/courses/${courseId}/medical-exam-records?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRecords(data.records ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load records.");
    } finally { setLoading(false); }
  }, [courseId, search, dateFrom, dateTo]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { setPage(1); }, [search, courseFilter, dateFrom, dateTo]);
  useEffect(() => {
    fetch(`/api/courses/${courseId}/guidance-log/courses`)
      .then(r => r.json())
      .then(d => { if (d.courses?.length) setAllCourses(d.courses); })
      .catch(() => {});
  }, [courseId]);

  const courseOptions = allCourses.length ? allCourses : ALL_COURSES;
  const filteredRecords = courseFilter ? records.filter(r => r.student.course === courseFilter) : records;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginated  = filteredRecords.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const hasActiveFilter = !!courseFilter || dateFrom !== todayISO() || dateTo !== todayISO();

  const canDeleteRecord = (r: ExamRecord) => {
    if (isAdmin) return false;
    if (isHead)  return true;
    return r.recordedByUser.id === currentUserId;
  };

  const QUICK_DATES = [
    { label: "Today",      fn: () => { const d = todayISO(); setDateFrom(d); setDateTo(d); } },
    { label: "Yesterday",  fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s = d.toISOString().split("T")[0]; setDateFrom(s); setDateTo(s); } },
    { label: "This Week",  fn: () => { const n = new Date(), mon = new Date(n); mon.setDate(n.getDate()-n.getDay()+1); setDateFrom(mon.toISOString().split("T")[0]); setDateTo(todayISO()); } },
    { label: "This Month", fn: () => { const n = new Date(); setDateFrom(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`); setDateTo(todayISO()); } },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: "#f8f8f7" }}>
      <style>{TAB_CSS}</style>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 truncate" style={{ color: MAROON }}>Clinic</p>
          <h1 className="text-lg font-bold text-gray-900 leading-none">Medical Exam Record</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchRecords}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 py-2 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canManage && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-2 rounded-lg text-white transition-all"
              style={{ background: MAROON }}>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Record</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total",   value: filteredRecords.length, icon: <ClipboardList className="w-4 h-4" /> },
            { label: "Today",   value: filteredRecords.filter(r => new Date(r.visitDate).toDateString() === new Date().toDateString()).length, icon: <Activity className="w-4 h-4" /> },
            { label: "Filtered",value: hasActiveFilter ? filteredRecords.length : 0, icon: <Filter className="w-4 h-4" /> },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
              <div className="rounded-lg p-2 shrink-0" style={{ background: "#fef2f2", color: MAROON }}>{s.icon}</div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-black tabular-nums leading-none text-gray-900">{s.value}</p>
                <p className="text-[10px] sm:text-xs font-semibold mt-0.5 text-gray-500 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">
          <div className="px-3 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 max-w-xs bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or student no."
                  className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
                {search && (
                  <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0"><X className="w-3 h-3" /></button>
                )}
              </div>
              <button onClick={() => setShowFilters(f => !f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0 ${showFilters || hasActiveFilter ? "text-white" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
                style={showFilters || hasActiveFilter ? { background: MAROON, borderColor: MAROON } : {}}>
                <Filter className="w-3 h-3" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />}
              </button>
            </div>
            <button onClick={() => setShowExportModal(true)} disabled={records.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all disabled:opacity-40 shrink-0">
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>

          {showFilters && (
            <div className="px-3 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Department / Course</p>
                <SelectWrap>
                  <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
                    className="w-full sm:max-w-xs text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-2 bg-white text-gray-700 outline-none appearance-none focus:border-[#7b1113]">
                    <option value="">All Departments / Courses</option>
                    {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </SelectWrap>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Date Range</p>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                  <span className="text-xs text-gray-400">to</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {QUICK_DATES.map(q => (
                    <button key={q.label} onClick={q.fn}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                      {q.label}
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
                <ClipboardList className="w-7 h-7" style={{ color: MAROON }} />
              </div>
              <p className="text-sm text-gray-400 font-medium">No medical exam records found.</p>
              {canManage && !hasActiveFilter && !search && (
                <button onClick={() => setShowAdd(true)} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                  + Record first exam
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: "#fafafa" }}>
                      {["No.","Date / Time","Student No.","Name","Sex","Age","Course","Purpose","Remarks","Sig.",""].map((h, i) => (
                        <th key={i} className="text-left px-3 py-3 whitespace-nowrap border border-gray-200">
                          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-700">
                            {h} {h && h !== "" && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r, i) => {
                      const canDel = canDeleteRecord(r);
                      const age    = resolveStudentAge(r.student);
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/70 transition-colors cursor-pointer" onClick={() => setViewRecord(r)}>
                          <td className="px-3 py-3 text-xs text-center text-gray-700 border border-gray-200 tabular-nums">{(page-1)*PAGE_SIZE+i+1}</td>
                          <td className="px-3 py-3 text-xs border border-gray-200 whitespace-nowrap">
                            <p className="text-gray-800">{fmtDate(r.visitDate)}</p>
                            <p className="text-gray-400">{fmtTime(r.visitDate)}</p>
                          </td>
                          <td className="px-3 py-3 text-xs border border-gray-200 text-gray-700">{r.student.studentNumber}</td>
                          <td className="px-3 py-3 text-xs border border-gray-200 text-gray-800 whitespace-nowrap">{r.student.name}</td>
                          <td className="px-3 py-3 text-xs border border-gray-200 text-center text-gray-700">{r.student.gender ?? "—"}</td>
                          <td className="px-3 py-3 text-xs border border-gray-200 text-center tabular-nums text-gray-700">{age ?? "—"}</td>
                          <td className="px-3 py-3 text-xs border border-gray-200 text-gray-700">{courseAbbrev(r.student.course) ?? "—"}</td>
                          <td className="px-3 py-3 text-xs border border-gray-200 max-w-[160px]"><span className="line-clamp-1 text-gray-700">{r.purpose}</span></td>
                          <td className="px-3 py-3 text-xs border border-gray-200 max-w-[140px]"><span className="line-clamp-1 text-gray-500">{r.remarks ?? "—"}</span></td>
                          <td className="px-3 py-3 border border-gray-200" style={{ minWidth: 80 }}>
                            {r.signatureUrl
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={r.signatureUrl} alt="sig" className="h-7 max-w-[90px] object-contain" />
                              : <span className="text-[10px] text-amber-500 font-semibold">Unsigned</span>}
                          </td>
                          <td className="px-2 py-3 border border-gray-200 w-10" onClick={e => e.stopPropagation()}>
                            {canDel && (
                              <button onClick={() => setDeleteTarget(r)}
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

              <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map(r => {
                  const canDel = canDeleteRecord(r);
                  return (
                    <div key={r.id}
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setViewRecord(r)}>
                      <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: r.fitnessStatus === "FIT" ? "#22c55e" : r.fitnessStatus === "UNFIT" ? "#ef4444" : "#d1d5db" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{r.student.name}</p>
                            <p className="text-[10px] font-mono font-semibold text-gray-400 mt-0.5">{r.student.studentNumber}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {r.fitnessStatus && <FitnessBadge status={r.fitnessStatus} />}
                            {canDel && (
                              <button onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
                                className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          {r.student.course && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{ background: "#fef2f2", color: MAROON }}>
                              {courseAbbrev(r.student.course)}
                            </span>
                          )}
                          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${r.signatureUrl ? "text-green-500" : "text-amber-500"}`}>
                            {r.signatureUrl ? <Check size={9} /> : <PenLine size={9} />}
                            {r.signatureUrl ? "Signed" : "Unsigned"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 leading-snug line-clamp-1 mb-1">{r.purpose}</p>
                        <p className="text-[10px] text-gray-400">{fmtDate(r.visitDate)} · {fmtTime(r.visitDate)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && filteredRecords.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-100 bg-white shrink-0 flex-wrap gap-2">
              <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-25 transition-all">
                  <ChevronLeft className="w-3 h-3" />
                </button>
                {Array.from({ length: Math.min(totalPages,5) }, (_,i) => {
                  const n = totalPages<=5 ? i+1 : page<=3 ? i+1 : page>=totalPages-2 ? totalPages-4+i : page-2+i;
                  return (
                    <button key={n} onClick={() => setPage(n)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-semibold transition-all border"
                      style={page===n ? { background: MAROON, color:"#fff", borderColor: MAROON } : { borderColor:"#e5e7eb", color:"#6b7280" }}>
                      {n}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-25 transition-all">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddExamModal courseId={courseId} onClose={() => setShowAdd(false)}
          onSaved={record => { setRecords(prev => [record, ...prev]); setShowAdd(false); }} />
      )}
      {viewRecord && (
        <ViewRecordModal
          record={viewRecord} canDelete={canDeleteRecord(viewRecord)}
          courseId={courseId}
          onClose={() => setViewRecord(null)}
          onAskDelete={() => { setDeleteTarget(viewRecord); setViewRecord(null); }}
          onUpdated={updated => { setRecords(prev => prev.map(r => r.id === updated.id ? updated : r)); setViewRecord(updated); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal record={deleteTarget} courseId={courseId}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setRecords(prev => prev.filter(r => r.id !== deleteTarget!.id)); setDeleteTarget(null); }} />
      )}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          courseId={courseId} records={records}
          courseOptions={courseOptions}
          dateFrom={dateFrom} dateTo={dateTo} courseFilter={courseFilter}
        />
      )}

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer; opacity: 0.6;
          filter: invert(13%) sepia(85%) saturate(2000%) hue-rotate(340deg) brightness(70%);
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover { opacity: 1; }
        input[type="date"] { color-scheme: light; accent-color: #7b1113; }
      `}</style>
    </div>
  );
}