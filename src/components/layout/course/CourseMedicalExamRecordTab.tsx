  "use client";

  // src/components/layout/course/CourseMedicalExamRecordTab.tsx

  import { useState, useEffect, useCallback, useRef } from "react";
  import {
    Search, Plus, X, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
    Trash2, Check, ArrowUpDown, Download, Filter, ClipboardList, PenLine, Eye,
    Activity, FileCheck,
  } from "lucide-react";
  import { resolveStudentAge } from "@/lib/age";

  /* ─────────────────────────────────────────────────────────────────────────────
    CONSTANTS
  ───────────────────────────────────────────────────────────────────────────── */
  const MAROON    = "#7b1113";
  const FONT      = "system-ui, -apple-system, sans-serif";
  const PAGE_SIZE = 15;

  const TIME_OPTIONS: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh   = h % 12 === 0 ? 12 : h % 12;
      const mm   = m === 0 ? "00" : "30";
      const ampm = h < 12 ? "AM" : "PM";
      TIME_OPTIONS.push(`${hh}:${mm} ${ampm}`);
    }
  }

  const HEIGHT_OPTIONS: string[] = [];
  for (let h = 100; h <= 220; h++) {
    HEIGHT_OPTIONS.push(String(h));
  }

  const WEIGHT_OPTIONS: string[] = [];
  for (let w = 30; w <= 200; w++) {
    WEIGHT_OPTIONS.push(String(w));
  }

  const HEART_RATE_OPTIONS: string[] = [];
  for (let hr = 40; hr <= 180; hr++) {
    HEART_RATE_OPTIONS.push(String(hr));
  }

  const RESPIRATORY_RATE_OPTIONS: string[] = [];
for (let rr = 8; rr <= 40; rr++) {
  RESPIRATORY_RATE_OPTIONS.push(String(rr));
}

const SECTION_OPTIONS = [
  "1A", "1B",
  "2A", "2B",
  "3A", "3B",
  "4A", "4B",
  
];

const CIVIL_STATUS_OPTIONS = [
  "Single",
  "Married",
];

  const BLOOD_PRESSURE_OPTIONS = [
    "90/60", "95/60", "100/60", "100/70", "105/70", "110/70", "110/80",
    "115/75", "115/80", "120/70", "120/80", "120/90", "125/80", "125/85",
    "130/80", "130/85", "130/90", "135/85", "135/90", "140/90", "140/95",
    "145/95", "150/90", "150/100", "160/100", "160/110", "170/100",
    "170/110", "180/110", "180/120", "190/120", "200/120",
  ];

  const TEMPERATURE_OPTIONS: string[] = [];
  for (let t = 350; t <= 410; t++) {
    TEMPERATURE_OPTIONS.push((t / 10).toFixed(1));
  }

  const PHYSICAL_SIGN_KEYS = [
    { key: "skin",         label: "Skin" },
    { key: "abdomen",      label: "Abdomen (GIT)" },
    { key: "heent",        label: "HEENT" },
    { key: "gut",          label: "Gut" },
    { key: "chestLungs",   label: "Chest / Lungs" },
    { key: "extremities",  label: "Extremities" },
    { key: "heartCvs",     label: "Heart / CVS" },
    { key: "neurological", label: "Neurological" },
    { key: "breast",       label: "Breast" },
  ] as const;

  const FITNESS_FOR_OPTIONS = [
    "Off Campus Procedure",
    "On-the-job Training",
    "Field Trip / Educational Tour",
    "Sports Activities",
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
    id:            string;
    purpose:       string;
    remarks:       string | null;
    visitDate:     string;
    createdAt:     string;
    student:       StudentInfo;
    recordedByUser: { id: string; name: string };
    section:         string | null;
    // vitals
    height:          number | null;
    weight:          number | null;
    heartRate:       string | null;
    bloodPressure:   string | null;
    temperature:     number | null;
    respiratoryRate: string | null;
    placeOfBirth:    string | null;
    // physical signs
    physicalSigns:       PhysicalSigns | null;
    isPregnant:          boolean | null;
    lastMenstrualPeriod: string | null;
    civilStatus:         string | null;
    // clearance
    fitnessStatus:     string | null;
    fitnessFor:        string[];
    clearanceRemarks:  string | null;
    clearanceIssuedAt: string | null;
    // signature
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
  function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-1 h-4 rounded-full" style={{ background: MAROON }} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{children}</p>
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
    const [error, setError]       = useState("");

    const handleDelete = async () => {
      setDeleting(true); setError("");
      try {
        const res = await fetch(`/api/courses/${courseId}/medical-exam-records/${record.id}`, { method: "DELETE" });
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
              <button onClick={onClose} disabled={deleting}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: "#ef4444" }}>
                {deleting ? <><RefreshCw size={12} className="animate-spin" /> Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────────
    ADD EXAM MODAL
  ───────────────────────────────────────────────────────────────────────────── */
  function AddExamModal({ courseId, onClose, onSaved }: {
    courseId: string; onClose: () => void; onSaved: (record: ExamRecord) => void;
  }) {
    const [studentNum,    setStudentNum]    = useState("");
    const [student,       setStudent]       = useState<StudentInfo | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError,   setLookupError]   = useState("");

    const [visitDate, setVisitDate] = useState(todayISO());
    const [visitTime, setVisitTime] = useState(currentTime());
    const [purpose,   setPurpose]   = useState("");

      // Vitals
    const [height,          setHeight]          = useState("");
    const [weight,          setWeight]          = useState("");
    const [heartRate,       setHeartRate]       = useState("");
    const [bloodPressure,   setBloodPressure]   = useState("");
    const [temperature,     setTemperature]     = useState("");
    const [respiratoryRate, setRespiratoryRate] = useState("");
    const [placeOfBirth,    setPlaceOfBirth]    = useState("");
    const [section,         setSection]         = useState("");

    // Physical signs: null = not assessed, true = YES, false = NO
    const [physicalSigns, setPhysicalSigns] = useState<PhysicalSigns>({});

    // Pregnancy
    const [isPregnant,          setIsPregnant]          = useState<boolean | null>(null);
    const [lastMenstrualPeriod, setLastMenstrualPeriod] = useState("");
    const [civilStatus,         setCivilStatus]         = useState("");

    // Remarks
    const [remarks, setRemarks] = useState("");

    // Clearance
    const [fitnessStatus,    setFitnessStatus]    = useState<"FIT" | "UNFIT" | "">("");
    const [fitnessFor,       setFitnessFor]       = useState<string[]>([]);
    const [clearanceRemarks, setClearanceRemarks] = useState("");

    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState("");

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      finally { setLookupLoading(false); }
    }, [courseId]);

    const handleStudentNumChange = (val: string) => {
      setStudentNum(val); setStudent(null); setLookupError("");
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => lookupStudent(val), 600);
    };

    const [fitnessForOther, setFitnessForOther] = useState("");

    const toggleFitnessFor = (opt: string) => {
      setFitnessFor(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]);
    };
    const handleSave = async () => {
      setError("");
      if (!student)        { setError("Please look up a valid student first."); return; }
      if (!purpose.trim()) { setError("Purpose is required.");                  return; }
      if (!visitDate)      { setError("Visit date is required.");               return; }

      setSaving(true);
      try {
        const visitDateTime = new Date(`${visitDate} ${visitTime}`).toISOString();
        const res = await fetch(`/api/courses/${courseId}/medical-exam-records`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: student.id,
            purpose:   purpose.trim(),
            visitDate: visitDateTime,
            height:          height          ? parseFloat(height)          : null,
            weight:          weight          ? parseFloat(weight)          : null,
            heartRate:       heartRate       || null,
            bloodPressure:   bloodPressure   || null,
            temperature:     temperature     ? parseFloat(temperature)     : null,
            respiratoryRate: respiratoryRate || null,
            placeOfBirth:    placeOfBirth    || null,
            section:         section         || null,
            physicalSigns:   Object.keys(physicalSigns).length ? physicalSigns : null,
            isPregnant:          isPregnant,
            lastMenstrualPeriod: lastMenstrualPeriod || null,
            civilStatus:         civilStatus         || null,
            remarks:         remarks.trim() || null,
            fitnessStatus:   fitnessStatus  || null,
            fitnessFor:      fitnessFor,
            clearanceRemarks: clearanceRemarks.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
        onSaved(data.record);
      } catch { setError("Network error. Please try again."); }
      finally { setSaving(false); }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
        style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={onClose}>
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl overflow-hidden max-h-[95vh] flex flex-col border border-gray-100"
          onClick={e => e.stopPropagation()}>

          <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0" style={{ background: MAROON }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ClipboardList size={15} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Clinic</p>
                <p className="text-sm font-black text-white">New Medical Exam Record</p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{error}</div>}

            {/* Student */}
            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Student</p>
              <div className="relative mb-2">
                <input value={studentNum} onChange={e => handleStudentNumChange(e.target.value)}
                  placeholder="Enter student number..." className={inputCls} />
                {lookupLoading && <RefreshCw size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
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
                      ["Name",        student.name],
                      ["Student No.", student.studentNumber],
                      ["Course",      student.course ?? "—"],
                      ["Age",         resolveStudentAge(student) ? `${resolveStudentAge(student)} yrs` : "—"],
                      ["Gender",      student.gender  ?? "—"],
                      ["Address",     student.address ?? "—"],
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

            {/* Exam Info */}
            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Exam Info</p>
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
              <FieldLabel required>Purpose</FieldLabel>
              <textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={2}
                placeholder="e.g. Pre-employment physical exam, OJT requirement..." className={textareaCls} />
            </section>

            {/* Vitals */}
            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Vitals <span className="normal-case font-normal text-gray-300 ml-1">optional</span>
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <FieldLabel>Height (cm)</FieldLabel>
                  <SelectWrapper>
                    <select value={height} onChange={e => setHeight(e.target.value)} className={selectCls}>
                      <option value="">—</option>
                      {HEIGHT_OPTIONS.map(h => <option key={h} value={h}>{h} cm</option>)}
                    </select>
                  </SelectWrapper>
                </div>
                <div>
                  <FieldLabel>Weight (kg)</FieldLabel>
                  <SelectWrapper>
                    <select value={weight} onChange={e => setWeight(e.target.value)} className={selectCls}>
                      <option value="">—</option>
                      {WEIGHT_OPTIONS.map(w => <option key={w} value={w}>{w} kg</option>)}
                    </select>
                  </SelectWrapper>
                </div>
                <div>
                  <FieldLabel>Heart Rate</FieldLabel>
                  <SelectWrapper>
                    <select value={heartRate} onChange={e => setHeartRate(e.target.value)} className={selectCls}>
                      <option value="">—</option>
                      {HEART_RATE_OPTIONS.map(hr => <option key={hr} value={`${hr} bpm`}>{hr} bpm</option>)}
                    </select>
                  </SelectWrapper>
                </div>
                <div>
                  <FieldLabel>Blood Pressure</FieldLabel>
                  <SelectWrapper>
                    <select value={bloodPressure} onChange={e => setBloodPressure(e.target.value)} className={selectCls}>
                      <option value="">—</option>
                      {BLOOD_PRESSURE_OPTIONS.map(bp => <option key={bp} value={bp}>{bp} mmHg</option>)}
                    </select>
                  </SelectWrapper>
                </div>
                <div>
                  <FieldLabel>Temperature (°C)</FieldLabel>
                  <SelectWrapper>
                    <select value={temperature} onChange={e => setTemperature(e.target.value)} className={selectCls}>
                      <option value="">—</option>
                      {TEMPERATURE_OPTIONS.map(t => <option key={t} value={t}>{t} °C</option>)}
                    </select>
                  </SelectWrapper>
                </div>
                <div>
                  <FieldLabel>Respiratory Rate</FieldLabel>
                  <SelectWrapper>
                    <select value={respiratoryRate} onChange={e => setRespiratoryRate(e.target.value)} className={selectCls}>
                      <option value="">—</option>
                      {RESPIRATORY_RATE_OPTIONS.map(rr => <option key={rr} value={`${rr} /min`}>{rr} /min</option>)}
                    </select>
                  </SelectWrapper>
                </div>
              </div>
              <div className="mt-3">
                <FieldLabel>Place of Birth</FieldLabel>
                <input value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)}
                  placeholder="e.g. San Fernando, Pampanga" className={inputCls} />
              </div>
              <div className="mt-3">
                <FieldLabel>Section</FieldLabel>
                <SelectWrapper>
                  <select value={section} onChange={e => setSection(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {SECTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </SelectWrapper>
              </div>
              <div className="mt-3">
                <FieldLabel>Civil Status</FieldLabel>
                <SelectWrapper>
                  <select value={civilStatus} onChange={e => setCivilStatus(e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {CIVIL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </SelectWrapper>
              </div>
            </section>

            {/* Physical Signs — 2-column layout */}
            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Physical Signs Disorder <span className="normal-case font-normal text-gray-300 ml-1">optional</span>
              </p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  {[PHYSICAL_SIGN_KEYS.slice(0, 5), PHYSICAL_SIGN_KEYS.slice(5)].map((col, ci) => (
                    <div key={ci}>
                      <div className="grid grid-cols-3 px-3 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Area</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Yes</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">No</span>
                      </div>
                      {col.map(({ key, label }) => (
                        <div key={key} className="grid grid-cols-3 px-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <span className="text-xs font-medium text-gray-700 self-center">{label}</span>
                          <div className="flex justify-center">
                            <button type="button"
                              onClick={() => setPhysicalSigns(prev => ({ ...prev, [key]: physicalSigns[key] === true ? undefined : true }))}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${physicalSigns[key] === true ? "border-red-500 bg-red-500" : "border-gray-300"}`}>
                              {physicalSigns[key] === true && <Check size={10} className="text-white" />}
                            </button>
                          </div>
                          <div className="flex justify-center">
                            <button type="button"
                              onClick={() => setPhysicalSigns(prev => ({ ...prev, [key]: physicalSigns[key] === false ? undefined : false }))}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${physicalSigns[key] === false ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                              {physicalSigns[key] === false && <Check size={10} className="text-white" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Pregnancy */}
            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Pregnancy <span className="normal-case font-normal text-gray-300 ml-1">optional</span>
              </p>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-gray-600">Pregnant?</span>
                {[{ label: "Yes", val: true }, { label: "No", val: false }].map(opt => (
                  <button key={opt.label} type="button"
                    onClick={() => setIsPregnant(isPregnant === opt.val ? null : opt.val)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${isPregnant === opt.val ? "text-white border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
                    style={isPregnant === opt.val ? { background: MAROON } : {}}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {isPregnant === true && (
                <div>
                  <FieldLabel>Last Menstrual Period</FieldLabel>
                  <input
                    type="date"
                    value={lastMenstrualPeriod}
                    onChange={e => setLastMenstrualPeriod(e.target.value)}
                    max={todayISO()}
                    className={inputCls}
                  />
                  {lastMenstrualPeriod && (
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      {(() => {
                        const lmp = new Date(lastMenstrualPeriod);
                        const today = new Date();
                        const diffDays = Math.floor((today.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24));
                        const weeks = Math.floor(diffDays / 7);
                        const days = diffDays % 7;
                        if (diffDays < 0) return "⚠ Date cannot be in the future";
                        return weeks > 0
                          ? `AOG: ${weeks} week${weeks !== 1 ? "s" : ""}${days > 0 ? ` and ${days} day${days !== 1 ? "s" : ""}` : ""}`
                          : `AOG: ${days} day${days !== 1 ? "s" : ""}`;
                      })()}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Remarks */}
            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Remarks <span className="normal-case font-normal text-gray-300 ml-1">optional</span>
              </p>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                placeholder="Additional remarks or observations..." className={textareaCls} />
            </section>

            {/* Clearance */}
            <section>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Medical Clearance <span className="normal-case font-normal text-gray-300 ml-1">optional</span>
              </p>
              <div className="flex gap-3 mb-4">
                {(["FIT", "UNFIT"] as const).map(status => (
                  <button key={status} type="button"
                    onClick={() => setFitnessStatus(fitnessStatus === status ? "" : status)}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-black transition-all ${fitnessStatus === status
                      ? status === "FIT" ? "border-green-500 bg-green-500 text-white" : "border-red-500 bg-red-500 text-white"
                      : "border-gray-200 text-gray-400 hover:border-gray-400"}`}>
                    {status}
                  </button>
                ))}
              </div>
              {fitnessStatus && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">To undergo in</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {FITNESS_FOR_OPTIONS.map(opt => (
                      <button key={opt} type="button" onClick={() => toggleFitnessFor(opt)}
                        className={`text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-all flex items-center gap-2 ${fitnessFor.includes(opt) ? "border-transparent text-white" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
                        style={fitnessFor.includes(opt) ? { background: MAROON } : {}}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${fitnessFor.includes(opt) ? "border-white" : "border-gray-300"}`}>
                          {fitnessFor.includes(opt) && <Check size={10} className="text-white" />}
                        </div>
                        {opt}
                      </button>
                    ))}
                  </div>
                  {fitnessFor.includes("Others, Specify:") && (
                    <div className="mb-3">
                      <input value={fitnessForOther} onChange={e => setFitnessForOther(e.target.value)}
                        placeholder="Please specify..." className={inputCls} />
                    </div>
                  )}
                  <FieldLabel>Clearance Remarks</FieldLabel>
                  <textarea value={clearanceRemarks} onChange={e => setClearanceRemarks(e.target.value)} rows={2}
                    placeholder="Additional clearance notes..." className={textareaCls} />
                </>
              )}
            </section>
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
              {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving...</> : <><Check size={13} /> Save Record</>}
            </button>
          </div>
        </div>
      </div>
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
    const [fitnessStatus,    setFitnessStatus]    = useState<"FIT" | "UNFIT" | "">(
      (record.fitnessStatus as "FIT" | "UNFIT") ?? ""
    );
    const [fitnessFor,       setFitnessFor]       = useState<string[]>(
      record.fitnessFor?.filter(f => !f.startsWith("Others:")) ?? []
    );
    const [fitnessForOther,  setFitnessForOther]  = useState(
      record.fitnessFor?.find(f => f.startsWith("Others:"))?.replace("Others: ", "") ?? ""
    );
    const [clearanceRemarks, setClearanceRemarks] = useState(record.clearanceRemarks ?? "");
const [civilStatus,      setCivilStatus]      = useState(record.civilStatus ?? "");
    const [saving,           setSaving]           = useState(false);
    const [saveError,        setSaveError]        = useState("");

    const toggleFitnessFor = (opt: string) =>
      setFitnessFor(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]);

    const handleSaveClearance = async () => {
      setSaving(true); setSaveError("");
      try {
        const res = await fetch(`/api/courses/${courseId}/medical-exam-records/${record.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fitnessStatus: fitnessStatus || null,
            fitnessFor: fitnessFor.map(f =>
              f === "Others, Specify:" && fitnessForOther.trim()
                ? `Others: ${fitnessForOther.trim()}`
                : f
            ),
            clearanceRemarks: clearanceRemarks || null,
            civilStatus:      civilStatus      || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setSaveError(data.error ?? "Failed to save."); return; }
        onUpdated(data.record);
        setEditing(false);
      } catch { setSaveError("Network error."); }
      finally { setSaving(false); }
    };

    const signs = record.physicalSigns ?? {};
    const hasVitals = record.height || record.weight || record.heartRate || record.bloodPressure || record.temperature || record.respiratoryRate;
    const hasSigns  = PHYSICAL_SIGN_KEYS.some(({ key }) => signs[key] !== undefined);

    return (
      <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/30"
        style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={onClose}>
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden max-h-[90vh] flex flex-col border border-gray-100"
          onClick={e => e.stopPropagation()}>

          <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0" style={{ background: MAROON }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ClipboardList size={15} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Clinic</p>
                <p className="text-sm font-black text-white">Medical Exam Record</p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

            {/* Student Info */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100" style={{ background: "#fef2f2" }}>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Student Information</p>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5 bg-white">
                {[
                  ["Name",           record.student.name],
                  ["Student No.",    record.student.studentNumber],
                  ["Course",         record.student.course       ?? "—"],
                  ["Age",            resolveStudentAge(record.student) ? `${resolveStudentAge(record.student)} yrs` : "—"],
                  ["Gender",         record.student.gender       ?? "—"],
                  ["Address",        record.student.address      ?? "—"],
                  ["Place of Birth", record.student.placeOfBirth ?? "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Exam Details */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Exam Details</p>
              </div>
              <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 bg-white">
                {[
                  ["Visit Date",     `${fmtDate(record.visitDate)} · ${fmtTime(record.visitDate)}`],
                  ["Purpose",        record.purpose],
                  ["Section",        record.section],
                  ["Civil Status",   record.civilStatus],
                  ["Remarks",        record.remarks],
                  ["Recorded by",    record.recordedByUser.name],
                ].filter(([, val]) => val != null && val !== "").map(([label, val]) => (
                  <div key={String(label)}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm text-gray-700 leading-snug">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Vitals */}
            {hasVitals && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                  <Activity size={12} className="text-gray-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vitals</p>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5 bg-white">
                  {[
                    ["Height",           record.height          ? `${record.height} cm`  : null],
                    ["Weight",           record.weight          ? `${record.weight} kg`  : null],
                    ["Heart Rate",       record.heartRate],
                    ["Blood Pressure",   record.bloodPressure],
                    ["Temperature",      record.temperature     ? `${record.temperature} °C` : null],
                    ["Respiratory Rate", record.respiratoryRate],
                  ].filter(([, val]) => val != null).map(([label, val]) => (
                    <div key={String(label)}>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-gray-800">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Physical Signs */}
            {hasSigns && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Physical Signs Disorder</p>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 gap-2 bg-white">
                  {PHYSICAL_SIGN_KEYS.filter(({ key }) => signs[key] !== undefined).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{label}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${signs[key] ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        {signs[key] ? "YES" : "NO"}
                      </span>
                    </div>
                  ))}
                </div>
                {record.isPregnant !== null && record.isPregnant !== undefined && (
                  <div className="px-4 pb-3 border-t border-gray-50 pt-2">
                    <span className="text-xs text-gray-600 mr-2">Pregnant:</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${record.isPregnant ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                      {record.isPregnant ? "YES" : "NO"}
                    </span>
                    {record.isPregnant && record.lastMenstrualPeriod && (
                      <span className="text-xs text-gray-400 ml-2">LMP: {record.lastMenstrualPeriod}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Clearance */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck size={12} className="text-gray-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Medical Clearance</p>
                </div>
                {!editing && (
                  <button onClick={() => setEditing(true)}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 transition-all">
                    {record.fitnessStatus ? "Edit" : "Issue Clearance"}
                  </button>
                )}
              </div>

              {editing ? (
                <div className="px-4 py-4 space-y-4">
                  {saveError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Civil Status</p>
                    <div className="flex gap-3 mb-4">
                      {["Single", "Married"].map(s => (
                        <button key={s} type="button"
                          onClick={() => setCivilStatus(civilStatus === s ? "" : s)}
                          className={`flex-1 py-2 rounded-xl border-2 text-xs font-black transition-all ${
                            civilStatus === s
                              ? "border-[#7b1113] bg-[#7b1113] text-white"
                              : "border-gray-200 text-gray-400 hover:border-gray-400"
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">He/She is physically / mentally:</p>
                    <div className="flex gap-3">
                      {(["FIT", "UNFIT"] as const).map(status => (
                        <button key={status} type="button"
                          onClick={() => setFitnessStatus(fitnessStatus === status ? "" : status)}
                          className={`flex-1 py-2 rounded-xl border-2 text-sm font-black transition-all ${fitnessStatus === status
                            ? status === "FIT" ? "border-green-500 bg-green-500 text-white" : "border-red-500 bg-red-500 text-white"
                            : "border-gray-200 text-gray-400 hover:border-gray-400"}`}>
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  {fitnessStatus && (
                    <>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">To undergo in:</p>
                        <div className="grid grid-cols-1 gap-2">
                          {FITNESS_FOR_OPTIONS.map(opt => (
                            <button key={opt} type="button" onClick={() => toggleFitnessFor(opt)}
                              className={`text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-all flex items-center gap-2 ${fitnessFor.includes(opt) ? "border-transparent text-white" : "border-gray-200 text-gray-500"}`}
                              style={fitnessFor.includes(opt) ? { background: MAROON } : {}}>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${fitnessFor.includes(opt) ? "border-white" : "border-gray-300"}`}>
                                {fitnessFor.includes(opt) && <Check size={10} className="text-white" />}
                              </div>
                              {opt}
                            </button>
                          ))}
                        </div>
                        {fitnessFor.includes("Others, Specify:") && (
                          <div className="mt-2">
                            <input
                              value={fitnessForOther}
                              onChange={e => setFitnessForOther(e.target.value)}
                              placeholder="Please specify..."
                              className={inputCls}
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Clearance Remarks</p>
                        <textarea value={clearanceRemarks} onChange={e => setClearanceRemarks(e.target.value)}
                          rows={2} placeholder="Additional clearance notes..." className={textareaCls} />
                      </div>
                    </>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} disabled={saving}
                      className="flex-1 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50">
                      Cancel
                    </button>
                    <button onClick={handleSaveClearance} disabled={saving}
                      className="flex-1 py-2 rounded-xl text-xs font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                      style={{ background: MAROON }}>
                      {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving...</> : <><Check size={12} /> Save Clearance</>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 bg-white">
                  {record.fitnessStatus ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black px-3 py-1 rounded-full ${record.fitnessStatus === "FIT" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                          {record.fitnessStatus}
                        </span>
                        {record.clearanceIssuedAt && (
                          <span className="text-[11px] text-gray-400">Issued {fmtDate(record.clearanceIssuedAt)}</span>
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
                        <p className="text-xs text-gray-500">{record.clearanceRemarks}</p>
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

            {/* Signature */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">E-Signature</p>
              </div>
              <div className="px-4 py-3 bg-gray-50/50">
                {record.signatureUrl ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <img src={record.signatureUrl} alt={`${record.student.name} signature`}
                      className="h-14 max-w-[180px] object-contain border border-gray-200 rounded-lg bg-white px-3 py-1.5" />
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <Check size={12} className="text-green-500 shrink-0" />
                      <span>Signed {fmtDate(record.signedAt)} {fmtTime(record.signedAt)}
                        {record.signatureMethod && <span className="text-gray-300"> · {record.signatureMethod === "uploaded" ? "Uploaded" : "Drawn"}</span>}
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
          </div>

          <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
            <button onClick={onClose}
              className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">
              Close
            </button>
            <a href={`/api/courses/${courseId}/medical-exam-records/${record.id}/export-clearance`}
              target="_blank"
              className="flex-1 h-10 rounded-xl text-sm font-black text-white transition-all flex items-center justify-center gap-1.5"
              style={{ background: MAROON }}>
              <Download size={13} /> Export Clearance
            </a>
            {canDelete && (
              <button onClick={onAskDelete}
                className="flex-1 h-10 rounded-xl text-sm font-black text-white transition-all flex items-center justify-center gap-1.5"
                style={{ background: "#ef4444" }}>
                <Trash2 size={13} /> Delete Record
              </button>
            )}
          </div>
        </div>
      </div>
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
          const params = new URLSearchParams();
          if (exportDateFrom) params.set("dateFrom", exportDateFrom);
          if (exportDateTo)   params.set("dateTo",   exportDateTo);
          if (exportCourse)   params.set("course",   exportCourse);
          const res  = await fetch(`/api/courses/${courseId}/medical-exam-records/export?${params}`);
          const blob = await res.blob();
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement("a");
          const suffix = exportDateFrom || exportDateTo
            ? `_${exportDateFrom || "start"}_to_${exportDateTo || "now"}`
            : "";
          a.href = url; a.download = `medical_exam_record${suffix}.pdf`; a.click();
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
                  <p className="text-sm font-black text-white">Export Medical Exam Record</p>
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

    const courseOptions = [...new Set(records.map(r => r.student.course).filter(Boolean))] as string[];
    const filteredRecords = courseFilter ? records.filter(r => r.student.course === courseFilter) : records;
    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
    const paginated  = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const hasActiveFilter = !!courseFilter || dateFrom !== todayISO() || dateTo !== todayISO();

    const canDeleteRecord = (r: ExamRecord) => {
      if (isAdmin) return false;
      if (isHead)  return true;
      return r.recordedByUser.id === currentUserId;
    };

    return (
      <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0 gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5 truncate" style={{ color: MAROON }}>Clinic</p>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">Medical Exam Record</h1>
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
                <span className="hidden sm:inline">New Record</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: "Total Records",  value: filteredRecords.length },
              { label: "Today's Exams",  value: filteredRecords.filter(r => new Date(r.visitDate).toDateString() === new Date().toDateString()).length },
              { label: hasActiveFilter ? "Matching Filter" : "Active Filters", value: hasActiveFilter ? filteredRecords.length : 0 },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
                <div className="rounded-lg p-2 sm:p-2.5 shrink-0" style={{ background: "#f3f4f6", color: MAROON }}>
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black tabular-nums leading-none text-gray-900">{s.value}</p>
                  <p className="text-xs sm:text-sm font-semibold mt-0.5 text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Table Card */}
          <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">

            {/* Toolbar */}
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-white flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 sm:flex-none sm:w-64 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or student no..."
                  className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
                {search && (
                  <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button onClick={() => setShowFilters(f => !f)}
                style={(showFilters || hasActiveFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0 ${!(showFilters || hasActiveFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700" : ""}`}>
                <Filter className="w-3 h-3" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
              </button>

              <div className="ml-auto">
                <button onClick={() => setShowExportModal(true)} disabled={records.length === 0}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all disabled:opacity-40 shrink-0">
                  <Download className="w-3 h-3" />
                  Export PDF
                </button>
              </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-2.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Department / Course</span>
                  <div className="relative">
                    <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
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
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none" />
                    <span className="text-xs text-gray-400">to</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none" />
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
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ background: "#fafafa" }}>
                        {["No.", "Date / Time", "Student No.", "Name", "Sex", "Age", "Course", "Purpose", "Remarks", "Signature", ""].map((h, i) => (
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
                        const canDel = canDeleteRecord(r);
                        const age    = resolveStudentAge(r.student);
                        return (
                          <tr key={r.id}
                            className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                            onClick={() => setViewRecord(r)}>
                            <td className="px-3 py-3 text-xs text-gray-800 tabular-nums text-center" style={{ border: "1px solid #d1d5db" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-800" style={{ border: "1px solid #d1d5db" }}>
                              <p>{fmtDate(r.visitDate)}</p>
                              <p className="text-gray-500">{fmtTime(r.visitDate)}</p>
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-800" style={{ border: "1px solid #d1d5db" }}>
                              {r.student.studentNumber}
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-800 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                              {r.student.name}
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-800 text-center" style={{ border: "1px solid #d1d5db" }}>
                              {r.student.gender ?? "—"}
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-800 tabular-nums text-center" style={{ border: "1px solid #d1d5db" }}>
                              {age ?? "—"}
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-800" style={{ border: "1px solid #d1d5db" }}>
                              {courseAbbrev(r.student.course) ?? "—"}
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-800 max-w-[180px]" style={{ border: "1px solid #d1d5db" }}>
                              <span className="line-clamp-1">{r.purpose}</span>
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-800 max-w-[160px]" style={{ border: "1px solid #d1d5db" }}>
                              <span className="line-clamp-1">{r.remarks ?? "—"}</span>
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-800" style={{ border: "1px solid #d1d5db", minWidth: "120px" }}>
                              {r.signatureUrl
                                ? <img src={r.signatureUrl} alt="signature" className="h-8 max-w-[100px] object-contain" />
                                : ""}
                            </td>
                            <td className="px-2 py-3 w-10" style={{ border: "1px solid #d1d5db" }}>
                              <div className="flex items-center gap-1">
                                <button onClick={e => { e.stopPropagation(); setViewRecord(r); }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                  <Eye size={13} />
                                </button>
                                {canDel && (
                                  <button onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
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
                    const canDel = canDeleteRecord(r);
                    return (
                      <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4" onClick={() => setViewRecord(r)}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{r.student.name}</p>
                            <p className="text-[10px] font-mono font-bold text-gray-400">{r.student.studentNumber}</p>
                          </div>
                          {canDel && (
                            <button onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
                              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors shrink-0">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          {r.student.course && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest" style={{ background: "#fef2f2", color: MAROON }}>
                              {courseAbbrev(r.student.course)}
                            </span>
                          )}
                          {r.fitnessStatus && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${r.fitnessStatus === "FIT" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                              {r.fitnessStatus}
                            </span>
                          )}
                          <span className={`flex items-center gap-0.5 text-[10px] font-bold ${r.signatureUrl ? "text-green-500" : "text-amber-500"}`}>
                            {r.signatureUrl ? <Check size={9} /> : <PenLine size={9} />}
                            {r.signatureUrl ? "Signed" : "Unsigned"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 mb-1.5">{r.purpose}</p>
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

        {/* Modals */}
        {showAdd && (
          <AddExamModal courseId={courseId} onClose={() => setShowAdd(false)}
            onSaved={record => { setRecords(prev => [record, ...prev]); setShowAdd(false); }} />
        )}

        {viewRecord && (
          <ViewRecordModal
            record={viewRecord}
            canDelete={canDeleteRecord(viewRecord)}
            courseId={courseId}
            onClose={() => setViewRecord(null)}
            onAskDelete={() => { setDeleteTarget(viewRecord); setViewRecord(null); }}
            onUpdated={updated => setRecords(prev => prev.map(r => r.id === updated.id ? updated : r))}
          />
        )}

        {deleteTarget && (
          <DeleteModal record={deleteTarget} courseId={courseId}
            onClose={() => setDeleteTarget(null)}
            onDeleted={() => { setRecords(prev => prev.filter(r => r.id !== deleteTarget.id)); setDeleteTarget(null); }} />
        )}

        {showExportModal && <ExportModal />}
      </div>
    );
  }