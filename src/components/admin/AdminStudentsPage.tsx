"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, RefreshCw, X, ChevronLeft, ChevronRight,
  MoreVertical, Trash2, Plus, ArrowUpDown, Users,
  Check, ChevronDown, Pencil, Upload, Download,
  FileSpreadsheet, AlertTriangle, CheckCircle2, Eye,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";
const PAGE_SIZE = 12;
const IMPORT_CONCURRENCY = 5;
const PREVIEW_ROW_LIMIT = 200;

const GENDERS  = ["Male", "Female", "Prefer not to say"];
const EXTENSION_NAMES = ["Jr.", "Sr.", "II", "III", "IV", "V"];
const CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated", "Annulled", "Live-in"];

const DEPARTMENTS = [
  "College of Education",
  "College of Business Studies",
  "College of Hospitality & Tourism Management",
  "College of Computing Studies",
  "College of Industrial Technology",
];

const COURSES_BY_DEPARTMENT: Record<string, string[]> = {
  "College of Education": [
    "Bachelor of Elementary Education",
    "Bachelor of Secondary Education Major in Filipino",
    "Bachelor of Secondary Education Major in Mathematics",
    "Bachelor of Secondary Education Major in Science",
    "Bachelor of Secondary Education Major in Social Studies",
    "Bachelor of Secondary Education Major in Physical Education",
  ],
  "College of Business Studies": [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Business Administration",
  ],
  "College of Hospitality & Tourism Management": [
    "Bachelor of Science in Hospitality Management",
  ],
  "College of Computing Studies": [
    "Bachelor of Science in Information Technology",
  ],
  "College of Industrial Technology": [
    "Bachelor of Industrial Technology Major in Automotive Technology",
  ],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Student {
  id:               string;
  studentNumber:    string;
  name:             string;
  extensionName:    string | null;
  email:            string | null;
  address:          string | null;
  birthDate:        string | null;
  age:              number | null;
  gender:           string | null;
  department:       string | null;
  course:           string | null;
  civilStatus:      string | null;
  isPwd:            boolean | null;
  isIndigenous:     boolean | null;
  isSoloParent:     boolean | null;
  isFirstGen:       boolean | null;
  createdAt:        string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const inputCls = "w-full h-9 border border-gray-200 rounded-lg px-3 text-sm font-medium outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-gray-50 focus:bg-white";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "#9ca3af" }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SimpleSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`${inputCls} appearance-none pr-8 cursor-pointer`} style={{ fontFamily: FONT }}>
        <option value="">{placeholder ?? "Select…"}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="h-px flex-1 bg-gray-100"/>
      <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">{label}</span>
      <div className="h-px flex-1 bg-gray-100"/>
    </div>
  );
}

function YesNoRow({ label, value, onChange }: {
  label: string; value: boolean | null; onChange: (v: boolean | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-semibold text-gray-600 flex-1 leading-tight">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        {([true, false] as const).map(bool => (
          <button key={String(bool)} type="button"
            onClick={() => onChange(value === bool ? null : bool)}
            className={`h-7 px-3 rounded-lg text-[11px] font-bold transition-all border ${
              value === bool
                ? bool ? "bg-green-500 border-green-500 text-white" : "bg-gray-400 border-gray-400 text-white"
                : "bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
            }`}>
            {bool ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Student Profile Drawer ────────────────────────────────────────────────────
function StudentProfileDrawer({ student, onClose, onEdit, onDelete }: {
  student: Student; onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const initials = student.name
    .split(",")
    .map(p => p.trim()[0] ?? "")
    .reverse()
    .join("")
    .toUpperCase()
    .slice(0, 2);


  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-stretch sm:justify-end"
      style={{ backdropFilter: "blur(4px)", backgroundColor: "rgba(0,0,0,0.2)" }}
      onClick={onClose}>
      <div
        className="w-full sm:w-80 sm:h-full bg-white border-t sm:border-t-0 sm:border-l border-gray-200 shadow-2xl flex flex-col rounded-t-2xl sm:rounded-none max-h-[92vh] sm:max-h-full"
        onClick={e => e.stopPropagation()}>
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full"/>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Student Profile</span>
          <button type="button" onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-all">
            <X className="w-3 h-3"/>
          </button>
        </div>

        {/* Avatar + basic info */}
        <div className="px-5 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white font-black text-sm"
              style={{ background: MAROON }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-gray-900 leading-tight">
                {student.name}{student.extensionName ? <span className="text-gray-400 font-normal ml-1">{student.extensionName}</span> : null}
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{student.studentNumber}</p>
              {student.email && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{student.email}</p>}
            </div>
          </div>
          {student.course && (
            <div className="mt-3">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest" style={{ background: "#fef2f2", color: MAROON }}>
                {student.course}
              </span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {[
             { label: "Email",         value: student.email       ?? "—" },
            { label: "Department",    value: student.department  ?? "—" },
            { label: "Address",       value: student.address     ?? "—" },
            { label: "Birth Date",    value: student.birthDate ? formatDate(student.birthDate) : "—" },
            { label: "Age",           value: student.age ? `${student.age} years old` : "—" },
            { label: "Gender",        value: student.gender      ?? "—" },
            { label: "Civil Status",  value: student.civilStatus ?? "—" },
            { label: "Enrolled",      value: formatDate(student.createdAt) },
          ].map(row => (
            <div key={row.label} className="py-3 border-b border-gray-50 last:border-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{row.label}</p>
              <p className="text-sm text-gray-800 font-semibold">{row.value}</p>
            </div>
          ))}

          {/* Special categories */}
          <div className="py-3 border-b border-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Special Categories</p>
            <div className="space-y-1.5">
              {[
                { label: "Person with Disability", value: student.isPwd },
                { label: "Indigenous People",       value: student.isIndigenous },
                { label: "Solo Parent",             value: student.isSoloParent },
                { label: "First Gen College",       value: student.isFirstGen },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{row.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    row.value === true  ? "bg-green-50 text-green-600" :
                    row.value === false ? "bg-gray-100 text-gray-400" :
                    "text-gray-300"
                  }`}>
                    {row.value === true ? "Yes" : row.value === false ? "No" : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 space-y-2">
          <button type="button" onClick={onEdit}
            className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
            <Pencil className="w-3.5 h-3.5"/> Edit Student
          </button>
          <button type="button" onClick={onDelete}
            className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 text-xs font-bold text-red-500 hover:bg-red-50 transition-all">
            <Trash2 className="w-3.5 h-3.5"/> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Student Form Modal ────────────────────────────────────────────────────────
function StudentFormModal({ student, onClose, onSaved }: {
  student?: Student | null; onClose: () => void; onSaved: (s: Student) => void;
}) {
  const isEdit = !!student;
  const [studentNumber, setStudentNumber] = useState(student?.studentNumber ?? "");
  const [firstName,     setFirstName]     = useState(() => { const p = student?.name?.split(","); return p?.[1]?.trim().split(" ")[0] ?? ""; });
  const [middleName,    setMiddleName]    = useState(() => { const p = student?.name?.split(","); const parts = p?.[1]?.trim().split(" ") ?? []; return parts.length > 1 ? parts.slice(1).join(" ") : ""; });
  const [lastName,      setLastName]      = useState(() => student?.name?.split(",")?.[0]?.trim() ?? "");
  const [extensionName, setExtensionName] = useState(student?.extensionName ?? "");
  const [email,         setEmail]         = useState(student?.email         ?? "");
  const [address,       setAddress]       = useState(student?.address       ?? "");
  const [birthDate,     setBirthDate]     = useState(student?.birthDate ? student.birthDate.slice(0, 10) : "");
  const [gender,        setGender]        = useState(student?.gender        ?? "");
  const [department,    setDepartment]    = useState(student?.department    ?? "");
  const [course,        setCourse]        = useState(student?.course        ?? "");
  const [civilStatus,   setCivilStatus]   = useState(student?.civilStatus   ?? "");
  const [isPwd,         setIsPwd]         = useState<boolean | null>(student?.isPwd         ?? null);
  const [isIndigenous,  setIsIndigenous]  = useState<boolean | null>(student?.isIndigenous  ?? null);
  const [isSoloParent,  setIsSoloParent]  = useState<boolean | null>(student?.isSoloParent  ?? null);
  const [isFirstGen,    setIsFirstGen]    = useState<boolean | null>(student?.isFirstGen    ?? null);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!studentNumber.trim()) { setError("Student number is required."); return; }
    if (!firstName.trim())     { setError("First name is required.");     return; }
    if (!lastName.trim())      { setError("Last name is required.");      return; }
    if (email.trim() && !EMAIL_REGEX.test(email.trim())) { setError("Email address looks invalid."); return; }
    const fullName = `${lastName.trim()}, ${firstName.trim()}${middleName.trim() ? " " + middleName.trim() : ""}`;
    setSaving(true);
    try {
      const url    = isEdit ? `/api/admin/students/${student!.id}` : "/api/admin/students";
      const method = isEdit ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            studentNumber: studentNumber.trim(), name: fullName,
            extensionName: extensionName.trim() || null,
            email: email.trim() || null, address: address.trim() || null,
            birthDate: birthDate || null, gender: gender || null,
            department: department || null, course: course || null,
            civilStatus: civilStatus || null,
            isPwd, isIndigenous, isSoloParent, isFirstGen,
          }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      onSaved(data.student);
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}>
      {/* wider: sm:max-w-xl */}
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full"/>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              {isEdit ? <Pencil size={15} className="text-white"/> : <Plus size={15} className="text-white"/>}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Students</p>
              <p className="text-sm font-black text-white">{isEdit ? "Edit Student" : "Add New Student"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
            <X size={15}/>
          </button>
        </div>

        <div className="px-6 py-6 space-y-4 overflow-y-auto flex-1">
          {error && <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

          <SectionDivider label="Basic Information"/>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Student Number" required>
              <input value={studentNumber} onChange={e => setStudentNumber(e.target.value)} className={inputCls} placeholder="e.g. 2023312239"/>
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="e.g. juan@example.com"/>
            </Field>
          </div>
          <Field label="Address">
            <input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="e.g. San Juan, Mexico, Pampanga"/>
          </Field>

          <SectionDivider label="Name"/>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Last Name" required>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} placeholder="e.g. Dela Cruz"/>
            </Field>
            <Field label="First Name" required>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} placeholder="e.g. Juan"/>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Middle Name">
              <input value={middleName} onChange={e => setMiddleName(e.target.value)} className={inputCls} placeholder="Optional"/>
            </Field>
            <Field label="Extension Name">
              <SimpleSelect value={extensionName} onChange={setExtensionName} options={EXTENSION_NAMES} placeholder="None"/>
            </Field>
          </div>

          <SectionDivider label="Personal Details"/>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Birth Date">
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputCls}/>
            </Field>
            <Field label="Gender">
              <SimpleSelect value={gender} onChange={setGender} options={GENDERS} placeholder="Select…"/>
            </Field>
            <Field label="Civil Status">
              <SimpleSelect value={civilStatus} onChange={setCivilStatus} options={CIVIL_STATUSES} placeholder="Select…"/>
            </Field>
          </div>

           <SectionDivider label="Academic"/>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Department">
              <SimpleSelect value={department} onChange={v => { setDepartment(v); setCourse(""); }} options={DEPARTMENTS} placeholder="Select department…"/>
            </Field>
            <Field label="Course / Program">
              <SimpleSelect value={course} onChange={setCourse} options={COURSES_BY_DEPARTMENT[department] ?? []} placeholder={department ? "Select course…" : "Select department first…"}/>
            </Field>
          </div>

          <SectionDivider label="Special Categories"/>

          <div className="bg-gray-50 rounded-xl px-4 py-1 divide-y divide-gray-100">
            <YesNoRow label="Person with Disability (PWD)"    value={isPwd}        onChange={setIsPwd}/>
            <YesNoRow label="Indigenous People"                value={isIndigenous} onChange={setIsIndigenous}/>
            <YesNoRow label="Solo Parent"                      value={isSoloParent} onChange={setIsSoloParent}/>
            <YesNoRow label="First Generation College Student" value={isFirstGen}   onChange={setIsFirstGen}/>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button onClick={onClose} disabled={saving}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 h-10 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: MAROON }}>
            {saving ? <><RefreshCw size={13} className="animate-spin"/> Saving...</> : <><Check size={13}/> {isEdit ? "Save Changes" : "Add Student"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CSV Import Modal ──────────────────────────────────────────────────────────
interface ParsedRow {
  studentNumber: string; lastName: string; firstName: string; middleName: string;
  extensionName: string; email: string; age: string; gender: string; course: string;
  civilStatus: string; isPwd: string; isIndigenous: string; isSoloParent: string;
  isFirstGen: string; errors: string[]; warnings: string[];
}

const HEADER_ALIASES: Record<string, string> = {
  "student number": "studentNumber", "student no": "studentNumber", "student no.": "studentNumber",
  "studentnumber": "studentNumber", "id": "studentNumber", "id number": "studentNumber",
  "last name": "lastName", "lastname": "lastName", "surname": "lastName",
  "first name": "firstName", "firstname": "firstName", "given name": "firstName",
  "middle name": "middleName", "middlename": "middleName",
  "extension name": "extensionName", "extensionname": "extensionName", "suffix": "extensionName", "ext": "extensionName",
  "email": "email", "email address": "email", "e-mail": "email",
  "age": "age",
  "gender": "gender", "sex": "gender",
  "course": "course", "program": "course", "course / program": "course", "course/program": "course",
  "civil status": "civilStatus", "civilstatus": "civilStatus", "marital status": "civilStatus",
  "pwd": "isPwd", "person with disability": "isPwd", "disability": "isPwd",
  "indigenous": "isIndigenous", "indigenous people": "isIndigenous", "ip": "isIndigenous",
  "solo parent": "isSoloParent", "soloparent": "isSoloParent",
  "first generation": "isFirstGen", "first gen": "isFirstGen", "firstgen": "isFirstGen",
};

function parseCSVText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = []; let field = ""; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some(f => f.trim() !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); if (row.some(f => f.trim() !== "")) rows.push(row); }
  return rows;
}

function parseYesNo(val: string): boolean | null {
  const v = val.trim().toLowerCase();
  if (v === "yes" || v === "y" || v === "1" || v === "true")  return true;
  if (v === "no"  || v === "n" || v === "0" || v === "false") return false;
  return null;
}

function downloadCsvTemplate() {
  const header  = "Student Number,Last Name,First Name,Middle Name,Extension Name,Email,Age,Gender,Civil Status,Course,PWD,Indigenous People,Solo Parent,First Generation";
  const example = '2023312239,Dela Cruz,Juan,Santos,,juan.delacruz@example.com,20,Male,Single,Bachelor of Science in Information Technology (BSIT),No,No,No,Yes';
  const blob = new Blob([`${header}\n${example}\n`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "student_import_template.csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let idx = 0;
  async function next(): Promise<void> {
    const i = idx++; if (i >= items.length) return;
    await worker(items[i]); return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
}

function ImportCsvModal({ students, onClose, onImported }: {
  students: Student[]; onClose: () => void; onImported: (created: Student[]) => void;
}) {
  const [step,       setStep]       = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [fileName,   setFileName]   = useState("");
  const [parseError, setParseError] = useState("");
  const [rows,       setRows]       = useState<ParsedRow[]>([]);
  const [dragOver,   setDragOver]   = useState(false);
  const [progress,   setProgress]   = useState({ done: 0, total: 0 });
  const [results,    setResults]    = useState<{ created: Student[]; failed: { row: ParsedRow; reason: string }[] }>({ created: [], failed: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCSV = (text: string) => {
    setParseError("");
    const table = parseCSVText(text);
    if (table.length < 2) { setParseError("That file looks empty, or has no data rows below the header."); return; }
    const headerKeys = table[0].map(h => HEADER_ALIASES[h.trim().toLowerCase()] ?? null);
    const dataRows = table.slice(1);
    const existingNumbers = new Set(students.map(s => s.studentNumber.trim().toLowerCase()));
    const existingEmails  = new Set(students.map(s => (s.email ?? "").trim().toLowerCase()).filter(Boolean));
    const seenNumbers = new Set<string>(); const seenEmails = new Set<string>();
    const parsed: ParsedRow[] = dataRows.map(cells => {
      const obj: Record<string, string> = {
        studentNumber: "", lastName: "", firstName: "", middleName: "", extensionName: "",
        email: "", age: "", gender: "", course: "", civilStatus: "",
        isPwd: "", isIndigenous: "", isSoloParent: "", isFirstGen: "",
      };
      headerKeys.forEach((key, i) => { if (key) obj[key] = (cells[i] ?? "").trim(); });
      const errors: string[] = []; const warnings: string[] = [];
      const num = obj.studentNumber.trim(); const mail = obj.email.trim();
      if (!num) errors.push("Missing student number");
      else if (existingNumbers.has(num.toLowerCase())) errors.push("Student number already exists");
      else if (seenNumbers.has(num.toLowerCase())) errors.push("Duplicate student number in this file");
      if (!obj.lastName.trim())  errors.push("Missing last name");
      if (!obj.firstName.trim()) errors.push("Missing first name");
      if (mail) {
        if (!EMAIL_REGEX.test(mail)) errors.push("Invalid email format");
        else if (existingEmails.has(mail.toLowerCase())) warnings.push("Email already used by another student");
        else if (seenEmails.has(mail.toLowerCase())) warnings.push("Duplicate email in this file");
      }
      if (num) seenNumbers.add(num.toLowerCase());
      if (mail) seenEmails.add(mail.toLowerCase());
      return { ...(obj as Omit<ParsedRow, "errors" | "warnings">), errors, warnings };
    });
    setRows(parsed); setStep("preview");
  };

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) { setParseError("Please upload a .csv file."); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => processCSV(String(reader.result ?? ""));
    reader.onerror = () => setParseError("Couldn't read that file.");
    reader.readAsText(file);
  };

  const validRows   = rows.filter(r => r.errors.length === 0);
  const invalidRows = rows.filter(r => r.errors.length > 0);

  const startImport = async () => {
    setStep("importing"); setProgress({ done: 0, total: validRows.length });
    const created: Student[] = []; const failed: { row: ParsedRow; reason: string }[] = [];
    await runWithConcurrency(validRows, IMPORT_CONCURRENCY, async (r) => {
      try {
        const fullName = `${r.lastName.trim()}, ${r.firstName.trim()}${r.middleName.trim() ? " " + r.middleName.trim() : ""}`;
        const res = await fetch("/api/admin/students", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentNumber: r.studentNumber.trim(), name: fullName,
            extensionName: EXTENSION_NAMES.find(e => e.toLowerCase() === r.extensionName.trim().toLowerCase()) ?? null,
            email: r.email.trim() && EMAIL_REGEX.test(r.email.trim()) ? r.email.trim() : null,
            age: r.age.trim() && !isNaN(Number(r.age)) ? r.age.trim() : null,
            gender: GENDERS.find(g => g.toLowerCase() === r.gender.trim().toLowerCase()) ?? null,
            course: Object.values(COURSES_BY_DEPARTMENT).flat().find((c: string) => c.toLowerCase() === r.course.trim().toLowerCase()) ?? null,
            civilStatus: CIVIL_STATUSES.find(c => c.toLowerCase() === r.civilStatus.trim().toLowerCase()) ?? null,
            isPwd:        r.isPwd.trim()        ? parseYesNo(r.isPwd)        : null,
            isIndigenous: r.isIndigenous.trim() ? parseYesNo(r.isIndigenous) : null,
            isSoloParent: r.isSoloParent.trim() ? parseYesNo(r.isSoloParent) : null,
            isFirstGen:   r.isFirstGen.trim()   ? parseYesNo(r.isFirstGen)   : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) failed.push({ row: r, reason: data.error ?? "Failed to save" });
        else created.push(data.student);
      } catch { failed.push({ row: r, reason: "Network error" }); }
      finally { setProgress(p => ({ ...p, done: p.done + 1 })); }
    });
    setResults({ created, failed }); onImported(created); setStep("done");
  };

  const reset = () => {
    setStep("upload"); setFileName(""); setParseError(""); setRows([]);
    setProgress({ done: 0, total: 0 }); setResults({ created: [], failed: [] });
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 bg-gray-200 rounded-full"/></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={15} className="text-white"/>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Students</p>
              <p className="text-sm font-black text-white">Bulk Import from CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"><X size={15}/></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {step === "upload" && (
            <div className="px-5 py-6 space-y-4">
              <button type="button" onClick={downloadCsvTemplate}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all text-left">
                <div className="flex items-center gap-3">
                  <Download size={16} style={{ color: MAROON }}/>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Download CSV template</p>
                    <p className="text-[11px] text-gray-400">Pre-filled column headers, one example row</p>
                  </div>
                </div>
              </button>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 px-6 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all
                  ${dragOver ? "border-[#7b1113] bg-red-50/40" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                <Upload size={22} className="text-gray-300"/>
                <p className="text-sm font-bold text-gray-600">Drop your CSV file here, or click to browse</p>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}/>
              </div>
              {parseError && <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{parseError}</div>}
            </div>
          )}

          {step === "preview" && (
            <div className="flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4 flex-wrap bg-gray-50">
                <span className="text-xs font-bold text-gray-600">{fileName}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-600">{validRows.length} ready to import</span>
                {invalidRows.length > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600">{invalidRows.length} with errors</span>}
                <button type="button" onClick={reset} className="ml-auto text-[11px] font-bold hover:underline" style={{ color: MAROON }}>Choose a different file</button>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <th className="text-left px-4 py-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] w-8"></th>
                      <th className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Student No.</th>
                      <th className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Name</th>
                      <th className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Email</th>
                      <th className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, PREVIEW_ROW_LIMIT).map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }} className={r.errors.length ? "bg-red-50/30" : ""}>
                        <td className="px-4 py-2">
                          {r.errors.length ? <AlertTriangle size={13} className="text-red-400"/> : r.warnings.length ? <AlertTriangle size={13} className="text-amber-400"/> : <CheckCircle2 size={13} className="text-green-400"/>}
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-600">{r.studentNumber || "—"}</td>
                        <td className="px-3 py-2 text-gray-700 font-medium">{r.lastName || r.firstName ? `${r.lastName}, ${r.firstName}` : "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{r.email || "—"}</td>
                        <td className="px-3 py-2 text-[11px]">
                          {[...r.errors, ...r.warnings].length === 0
                            ? <span className="text-gray-300">—</span>
                            : <span className={r.errors.length ? "text-red-500" : "text-amber-500"}>{[...r.errors, ...r.warnings].join("; ")}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > PREVIEW_ROW_LIMIT && (
                  <p className="text-[11px] text-gray-400 text-center py-3">+ {rows.length - PREVIEW_ROW_LIMIT} more rows not shown</p>
                )}
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="px-5 py-10 flex flex-col items-center justify-center gap-4">
              <RefreshCw size={20} className="animate-spin" style={{ color: MAROON }}/>
              <p className="text-sm font-bold text-gray-700">Importing {progress.done} / {progress.total}...</p>
              <div className="w-full max-w-xs h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: MAROON }}/>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="px-5 py-8 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 shrink-0">
                  <CheckCircle2 size={18} className="text-green-500"/>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{results.created.length} student(s) imported successfully</p>
                  {(results.failed.length > 0 || invalidRows.length > 0) && (
                    <p className="text-xs text-gray-400">{results.failed.length + invalidRows.length} row(s) skipped</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          {step === "preview" && (
            <>
              <button onClick={onClose} className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
              <button onClick={startImport} disabled={validRows.length === 0}
                className="flex-1 h-9 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: MAROON }}>
                <Upload size={13}/> Import {validRows.length} Student{validRows.length === 1 ? "" : "s"}
              </button>
            </>
          )}
          {step === "done" && (
            <button onClick={onClose} className="flex-1 h-9 rounded-xl text-sm font-black text-white transition-all" style={{ background: MAROON }}>Done</button>
          )}
          {(step === "upload" || step === "importing") && (
            <button onClick={onClose} disabled={step === "importing"}
              className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Row Menu ──────────────────────────────────────────────────────────────────
function RowMenu({ onView, onEdit, onDelete }: { onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-rowmenu]") && !btnRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuW = 160; const menuH = 110;
    const vw = window.innerWidth; const vh = window.innerHeight;
    let left = rect.right - menuW; let top = rect.bottom + 4;
    if (top + menuH > vh) top = rect.top - menuH - 4;
    if (left < 8) left = rect.left;
    if (left + menuW > vw) left = vw - menuW - 8;
    setPos({ top, left }); setOpen(o => !o);
  };

  return (
    <>
      <div className="flex justify-end">
        <button ref={btnRef} type="button" onClick={handleOpen}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${open ? "bg-[#7b1113] text-white" : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"}`}>
          <MoreVertical className="w-3.5 h-3.5"/>
        </button>
      </div>
      {open && (
        <div data-rowmenu="true"
          className="fixed w-40 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 overflow-hidden"
          style={{ top: pos.top, left: pos.left, zIndex: 9999 }}>
          <button type="button" onClick={() => { onView(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 text-left">
            <Eye className="w-3.5 h-3.5 text-gray-400"/> View Profile
          </button>
          <button type="button" onClick={() => { onEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 text-left">
            <Pencil className="w-3.5 h-3.5 text-gray-400"/> Edit
          </button>
          <div className="my-1 border-t border-gray-100"/>
          <button type="button" onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 text-left">
            <Trash2 className="w-3.5 h-3.5 text-red-400"/> Delete
          </button>
        </div>
      )}
    </>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteModal({ student, onClose, onDeleted }: {
  student: Student; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed."); setDeleting(false); return; }
      onDeleted();
    } catch { setError("Network error."); setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/25" style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 p-6 w-full sm:w-80">
        <div className="sm:hidden flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full"/></div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-50"><Trash2 className="w-5 h-5 text-red-400"/></div>
        <p className="text-sm font-bold text-gray-900 mb-1">Delete this student?</p>
        <p className="text-xs text-gray-400 mb-3 font-medium">{student.name} — {student.studentNumber}</p>
        <p className="text-xs text-gray-400 mb-5 leading-relaxed">This action is permanent and cannot be undone.</p>
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={deleting}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ background: "#ef4444" }}>
            {deleting ? <><RefreshCw size={12} className="animate-spin"/> Deleting...</> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminStudentsPage() {
  const [students,     setStudents]     = useState<Student[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [page,         setPage]         = useState(1);
  const [showFilters,  setShowFilters]  = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [showImport,   setShowImport]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [viewedStudent,setViewedStudent]= useState<Student | null>(null);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());

  const fetchStudents = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/admin/students");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setStudents(data.students ?? []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load students."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const courses = [...new Set(students.map(s => s.course).filter(Boolean))] as string[];

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.studentNumber.toLowerCase().includes(q)
      || (s.course ?? "").toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q);
    return matchQ && (!courseFilter || s.course === courseFilter) && (!genderFilter || s.gender === genderFilter);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = useCallback((id: string) => {
    setSelected(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const toggleAll = () => setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(s => s.id)));

  const handleSaved = (student: Student) => {
    setStudents(prev => {
      const idx = prev.findIndex(s => s.id === student.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = student; return next; }
      return [student, ...prev];
    });
    setShowForm(false); setEditTarget(null);
    // refresh viewed student if it was the one being edited
    if (viewedStudent?.id === student.id) setViewedStudent(student);
  };

  const handleImported = (created: Student[]) => {
    if (created.length === 0) return;
    setStudents(prev => [...created, ...prev]);
  };

  const handleDeleted = () => {
    if (!deleteTarget) return;
    setStudents(prev => prev.filter(s => s.id !== deleteTarget.id));
    setSelected(prev => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
    if (viewedStudent?.id === deleteTarget.id) setViewedStudent(null);
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    if (!selected.size || !confirm(`Delete ${selected.size} student(s)?`)) return;
    const ids = [...selected];
    await Promise.all(ids.map(id => fetch(`/api/admin/students/${id}`, { method: "DELETE" })));
    setStudents(prev => prev.filter(s => !ids.includes(s.id)));
    setSelected(new Set());
  };

  const hasActiveFilter = courseFilter || genderFilter;

  return (
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5 truncate" style={{ color: MAROON }}>Administration</p>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">Student Records</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={fetchStudents}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}/>
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button type="button" onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all">
            <Upload className="w-3.5 h-3.5"/>
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button type="button" onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-1.5 rounded-lg text-white transition-all"
            style={{ background: MAROON }}>
            <Plus className="w-3.5 h-3.5"/>
            <span className="hidden sm:inline">Add Student</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            { label: "Total Students",   value: students.length, icon: <Users className="w-4 h-4"/> },
            { label: "Filtered Results", value: filtered.length, icon: <Search className="w-4 h-4"/> },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
              <div className="rounded-lg p-2 sm:p-2.5 shrink-0" style={{ background: "#f3f4f6", color: MAROON }}>{s.icon}</div>
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
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 sm:flex-none sm:w-56 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search students..."
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"/>
              {search && <button type="button" onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0"><X className="w-3 h-3"/></button>}
            </div>
            <button type="button" onClick={() => setShowFilters(f => !f)}
              style={(showFilters || hasActiveFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0
                ${!(showFilters || hasActiveFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700" : ""}`}>
              <ArrowUpDown className="w-3 h-3"/>
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0"/>}
            </button>
          </div>

          {showFilters && (
            <div className="px-4 sm:px-5 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Filter by</span>
              <select value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setPage(1); }}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none">
                <option value="">All Courses</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={genderFilter} onChange={e => { setGenderFilter(e.target.value); setPage(1); }}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none">
                <option value="">All Genders</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {hasActiveFilter && (
                <button type="button" onClick={() => { setCourseFilter(""); setGenderFilter(""); }}
                  style={{ color: MAROON }} className="text-[11px] font-bold hover:underline whitespace-nowrap">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-4 sm:px-5 py-2.5 shrink-0" style={{ background: MAROON }}>
              <span className="text-xs font-bold text-white tabular-nums">{selected.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-[11px] font-bold transition-all border border-red-400/40">
                  <Trash2 className="w-3 h-3"/> Delete Selected
                </button>
                <button type="button" onClick={() => setSelected(new Set())}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 py-20">
              <RefreshCw className="w-5 h-5 animate-spin"/>
              <span className="text-xs font-medium">Loading students...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-xs font-medium text-red-500 py-20">{error}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop Table */}
              <div className="hidden sm:block">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <th className="pl-5 pr-3 py-3 w-9">
                        <input type="checkbox"
                          checked={selected.size === paginated.length && paginated.length > 0}
                          onChange={toggleAll}
                          className="w-3.5 h-3.5 cursor-pointer rounded" style={{ accentColor: MAROON }}/>
                      </th>
                      {["Student No.", "Name", "Email", "Gender", "Course", "Enrolled", ""].map((h, i) => (
                        <th key={i} className="text-left px-3 py-3">
                          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-600">
                            {h} {h && h !== "" && <ArrowUpDown className="w-3 h-3"/>}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-8 h-8 text-gray-200"/>
                            <p className="text-sm text-gray-300 font-medium">No students found</p>
                            <button type="button" onClick={() => { setEditTarget(null); setShowForm(true); }}
                              className="text-xs font-bold hover:underline mt-1" style={{ color: MAROON }}>
                              + Add first student
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : paginated.map(s => (
                      <tr key={s.id} style={{ borderBottom: "1px solid #f9fafb" }}
                        className={`transition-colors ${selected.has(s.id) ? "bg-red-50/30" : "hover:bg-gray-50/70"}`}>
                        <td className="pl-5 pr-3 py-3.5">
                          <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)}
                            className="w-3.5 h-3.5 cursor-pointer rounded" style={{ accentColor: MAROON }}/>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{s.studentNumber}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <button type="button" onClick={() => setViewedStudent(s)} className="flex items-center gap-3 text-left group/name">
                            {/* Avatar initials */}
                            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white font-black text-[10px]"
                              style={{ background: MAROON }}>
                              {s.name.split(",").map(p => p.trim()[0] ?? "").reverse().join("").toUpperCase().slice(0, 2)}
                            </div>
                            <span className="text-sm font-semibold text-gray-900 group-hover/name:underline underline-offset-2 leading-tight"
                              style={{ textDecorationColor: MAROON }}>
                              {s.name}{s.extensionName ? <span className="text-gray-400 font-normal ml-1">{s.extensionName}</span> : null}
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-xs text-gray-500">{s.email ?? <span className="text-gray-200">—</span>}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          {s.gender
                            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest bg-blue-50 text-blue-600">{s.gender}</span>
                            : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-3 py-3.5">
                          {s.course
                            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest" style={{ background: "#fef2f2", color: MAROON }}>{s.course}</span>
                            : s.department
                            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest bg-gray-100 text-gray-500">{s.department}</span>
                            : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">{formatDate(s.createdAt)}</span>
                        </td>
                        <td className="px-3 py-3.5 w-12">
                          <RowMenu
                            onView={() => setViewedStudent(s)}
                            onEdit={() => { setEditTarget(s); setShowForm(true); }}
                            onDelete={() => setDeleteTarget(s)}/>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden p-3 space-y-2">
                {paginated.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-16">
                    <Users className="w-8 h-8 text-gray-200"/>
                    <p className="text-sm text-gray-300 font-medium">No students found</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 pb-1">
                      <input type="checkbox"
                        checked={selected.size === paginated.length && paginated.length > 0}
                        onChange={toggleAll}
                        className="w-3.5 h-3.5 cursor-pointer rounded" style={{ accentColor: MAROON }}/>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Select all</span>
                    </div>
                    {paginated.map(s => (
                      <div key={s.id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors ${selected.has(s.id) ? "border-[#7b1113]/30 bg-red-50/20" : "border-gray-200"}`}>
                        <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)}
                          className="w-3.5 h-3.5 cursor-pointer rounded mt-0.5 shrink-0" style={{ accentColor: MAROON }}/>
                        <button type="button" onClick={() => setViewedStudent(s)} className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white font-black text-[10px]"
                              style={{ background: MAROON }}>
                              {s.name.split(",").map(p => p.trim()[0] ?? "").reverse().join("").toUpperCase().slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                {s.name}{s.extensionName ? <span className="text-gray-400 font-normal ml-1">{s.extensionName}</span> : null}
                              </p>
                              <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{s.studentNumber}</span>
                            </div>
                          </div>
                          {s.email && <p className="text-[11px] text-gray-400 mb-1.5 truncate">{s.email}</p>}
                          <div className="flex items-center gap-2 flex-wrap">
                            {s.course  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest" style={{ background: "#fef2f2", color: MAROON }}>{s.course}</span>}
                            {s.gender  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest bg-blue-50 text-blue-600">{s.gender}</span>}
                          </div>
                        </button>
                        <RowMenu
                          onView={() => setViewedStudent(s)}
                          onEdit={() => { setEditTarget(s); setShowForm(true); }}
                          onDelete={() => setDeleteTarget(s)}/>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-100 bg-white shrink-0 flex-wrap gap-2">
              <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-25 transition-all">
                  <ChevronLeft className="w-3 h-3"/>
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
                  <ChevronRight className="w-3 h-3"/>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <StudentFormModal
          student={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSaved={handleSaved}/>
      )}
      {showImport && (
        <ImportCsvModal students={students} onClose={() => setShowImport(false)} onImported={handleImported}/>
      )}
      {deleteTarget && (
        <DeleteModal student={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted}/>
      )}
      {viewedStudent && (
        <StudentProfileDrawer
          student={viewedStudent}
          onClose={() => setViewedStudent(null)}
          onEdit={() => { setEditTarget(viewedStudent); setViewedStudent(null); setShowForm(true); }}
          onDelete={() => { setDeleteTarget(viewedStudent); setViewedStudent(null); }}/>
      )}
    </div>
  );
}