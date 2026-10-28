"use client";

// src/app/forms/guidance/[courseId]/page.tsx
// PUBLIC — no auth required, students fill this out

import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check, AlertCircle, RefreshCw,
  ClipboardList, Plus, Trash2, Upload, X, Pencil,
} from "lucide-react";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { COURSES_BY_DEPARTMENT } from "@/lib/academic-programs";
import { FONT } from "@/components/layout/course/osaShared";

/* ════════════════════════════════════════════════════════════════════════════
   1. DESIGN TOKENS (same palette as the Library Card form)
   ════════════════════════════════════════════════════════════════════════════ */

const C = {
  brand:     "#7b1113",
  brandTint: "#fdf2f2",
  brandRing: "rgba(123,17,19,0.12)",
  ink:       "#111827",
  body:      "#374151",
  muted:     "#6b7280",
  faint:     "#9ca3af",
  line:      "#e5e7eb",
  lineSoft:  "#f3f4f6",
  danger:    "#b91c1c",
} as const;

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white placeholder:text-gray-400";
const textareaCls = `${inputCls} resize-none`;
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
const addBtnCls =
  "flex items-center gap-1.5 text-xs font-semibold mt-1 px-3 h-8 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-all";
const delBtnCls =
  "w-9 h-10 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors shrink-0";

/* ── Types ── */
interface Sibling   { name: string; schoolWork: string; age: string; }
interface EducLevel { level: string; school: string; years: string; }
interface OrgRow    { name: string; position: string; }
interface EducBackground {
  elementary: EducLevel[]; juniorHigh: EducLevel[];
  seniorHigh: EducLevel[]; tertiary: EducLevel[]; techVoc: EducLevel[];
}
interface Organizations { academic: OrgRow[]; nonAcademic: OrgRow[]; }
interface Parent {
  name: string; dob: string; address: string; contact: string; educ: string;
  occupation: string; income: string; language: string; religion: string;
  ofw: string; yearsAbroad: string;
}

const CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated", "Annulled", "Live-in"];

const SPECIAL_CATEGORIES = [
  { key: "isPwd",        label: "Person with Disability (PWD)" },
  { key: "isIndigenous", label: "Indigenous People" },
  { key: "isSoloParent", label: "Solo Parent" },
  { key: "isFirstGen",   label: "First Generation College Student" },
] as const;

const toBool = (v: string): boolean | null => (v === "Yes" ? true : v === "No" ? false : null);

const MARITAL_OPTIONS = [
  "Living together but not married", "Permanently separated",
  "Father w/ another partner", "Temporarily separated",
  "Mother w/ another partner", "Marriage annulled/legally separated",
  "Married in Church", "Civil Marriage", "Others",
];

const STEPS = [
  "Personal info", "Parents", "Siblings & guardian",
  "Educational background", "Awards & organizations",
  "Unique features", "Health & signature", "Review & submit",
];

const emptySibling   = (): Sibling   => ({ name: "", schoolWork: "", age: "" });
const emptyEducLevel = (): EducLevel => ({ level: "", school: "", years: "" });
const emptyOrg       = (): OrgRow    => ({ name: "", position: "" });
const emptyParent    = (): Parent    => ({
  name: "", dob: "", address: "", contact: "", educ: "",
  occupation: "", income: "", language: "", religion: "", ofw: "", yearsAbroad: "",
});

const EDUC_SECTIONS: [keyof EducBackground, string][] = [
  ["elementary", "Elementary level"],
  ["juniorHigh", "Junior high school"],
  ["seniorHigh", "Senior high school"],
  ["tertiary",   "Tertiary level"],
  ["techVoc",    "Technical vocational training (if applicable)"],
];

/* ── Auto age from birthdate ── */
function computeAge(dob: string): number | null {
  if (!dob) return null;
  const b = new Date(dob);
  if (isNaN(b.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
}

/* ════════════════════════════════════════════════════════════════════════════
   2. LAYOUT PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════ */

function Card({
  title, description, action, children,
}: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: C.line }}>
      <header className="px-5 py-3.5 border-b flex items-start justify-between gap-3" style={{ borderColor: C.lineSoft }}>
        <div className="min-w-0">
          <h2 className="text-sm font-bold" style={{ color: C.ink }}>{title}</h2>
          {description && <p className="text-xs mt-0.5" style={{ color: C.faint }}>{description}</p>}
        </div>
        {action}
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelCls}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] mt-1" style={{ color: C.faint }}>{hint}</p>}
    </div>
  );
}

function Modal({
  title, onClose, children, footer,
}: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      style={{ backdropFilter: "blur(3px)", fontFamily: FONT }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm sm:mx-4 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ background: C.brand, color: "#fff" }}>
          <p style={{ fontSize: 14, fontWeight: 800 }}>{title}</p>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
        {footer && (
          <div className="border-t bg-gray-50 shrink-0" style={{ borderColor: C.line, paddingBottom: "env(safe-area-inset-bottom)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadStatus({ text }: { text: string }) {
  if (!text) return null;
  const failed = /fail/i.test(text);
  return (
    <p className="text-xs mt-1.5 font-medium" style={{ color: failed ? C.danger : C.muted }}>{text}</p>
  );
}

/* Single-choice card (radio) — same active style as the library request-type cards */
function ChoiceCard({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick}
      className="rounded-xl border px-3.5 py-3 text-left transition-all flex items-center gap-3"
      style={active
        ? { borderColor: C.brand, background: C.brandTint, boxShadow: `0 0 0 3px ${C.brandRing}` }
        : { borderColor: C.line, background: "#fff" }}>
      <span className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
        style={{ borderColor: active ? C.brand : "#d1d5db" }}>
        {active && <span className="w-2 h-2 rounded-full" style={{ background: C.brand }} />}
      </span>
      <span className="text-sm font-semibold" style={{ color: active ? C.brand : C.ink }}>{label}</span>
    </button>
  );
}

/* Yes / No toggle */
function YesNo({
  value, onChange, options = ["Yes", "No"],
}: { value: string; onChange: (v: string) => void; options?: string[] }) {
  return (
    <div role="radiogroup" className="flex gap-2 shrink-0">
      {options.map(opt => {
        const active = value === opt;
        return (
          <button key={opt} type="button" role="radio" aria-checked={active} onClick={() => onChange(opt)}
            className="h-9 min-w-[64px] px-4 rounded-lg border text-xs font-bold transition-all"
            style={active
              ? { borderColor: C.brand, background: C.brandTint, color: C.brand, boxShadow: `0 0 0 3px ${C.brandRing}` }
              : { borderColor: C.line, background: "#fff", color: C.body }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function Question({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold leading-snug mb-2.5" style={{ color: C.body }}>{children}</p>;
}

/* ════════════════════════════════════════════════════════════════════════════
   3. SIGNATURE PAD
   ════════════════════════════════════════════════════════════════════════════ */

function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, c: HTMLCanvasElement) => {
    const r  = c.getBoundingClientRect();
    const sx = c.width / r.width;
    const sy = c.height / r.height;
    const pt = "touches" in e ? e.touches[0] : (e as React.MouseEvent);
    return { x: (pt.clientX - r.left) * sx, y: (pt.clientY - r.top) * sy };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    drawing.current = true;
    const p = getPos(e, c); ctx.beginPath(); ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const p = getPos(e, c);
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#111";
    ctx.lineTo(p.x, p.y); ctx.stroke(); setHasDrawn(true);
  };
  const end   = () => { drawing.current = false; };
  const clear = () => {
    const c = canvasRef.current; if (!c) return;
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  };

  return (
    <div>
      <canvas
        ref={canvasRef} width={500} height={140}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-white touch-none cursor-crosshair"
        style={{ maxHeight: 140 }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={clear}
          className="flex items-center gap-1 text-xs font-semibold px-3 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
          <X size={11} /> Clear
        </button>
        <button type="button" disabled={!hasDrawn}
          onClick={() => { const c = canvasRef.current; if (c) onSave(c.toDataURL("image/png")); }}
          className="flex items-center gap-1 text-xs font-bold px-3 h-8 rounded-lg text-white disabled:opacity-40"
          style={{ background: C.brand }}>
          <Check size={11} /> Save signature
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   4. PHOTO CROP UPLOAD (passport 2×3)
   ════════════════════════════════════════════════════════════════════════════ */

function PhotoCropUpload({
  url, onUploaded, onRemove, courseId,
}: {
  url: string; onUploaded: (u: string) => void; onRemove: () => void; courseId: string;
}) {
  const [srcImg, setSrcImg] = useState<string | null>(null);
  const [crop,   setCrop]   = useState<Crop>();
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const imgRef       = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSrcImg(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setCrop(centerCrop(makeAspectCrop({ unit: "%", width: 80 }, 2 / 3, w, h), w, h));
  };

  const closeCrop = () => { setSrcImg(null); setStatus(""); };

  const handleCropSave = () => {
    const img = imgRef.current;
    if (!img || !crop) return;
    setSaving(true); setStatus("Processing…");

    const px = {
      x:      crop.unit === "%" ? (crop.x      / 100) * img.naturalWidth  : crop.x,
      y:      crop.unit === "%" ? (crop.y      / 100) * img.naturalHeight : crop.y,
      width:  crop.unit === "%" ? (crop.width  / 100) * img.naturalWidth  : crop.width,
      height: crop.unit === "%" ? (crop.height / 100) * img.naturalHeight : crop.height,
    };
    const canvas = document.createElement("canvas");
    canvas.width = 600; canvas.height = 900;
    canvas.getContext("2d")!.drawImage(img, px.x, px.y, px.width, px.height, 0, 0, 600, 900);

    canvas.toBlob(async blob => {
      if (!blob) { setStatus("Failed. Try again."); setSaving(false); return; }
      const fd = new FormData();
      fd.append("file", blob, "passport-photo.jpg");
      try {
        const res  = await fetch(`/api/guidance/${courseId}/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onUploaded(data.fileUrl);
        closeCrop();
      } catch { setStatus("Upload failed. Try again."); }
      finally { setSaving(false); }
    }, "image/jpeg", 0.92);
  };

  return (
    <div>
      {srcImg && (
        <Modal
          title="Crop photo" onClose={closeCrop}
          footer={
            <div className="px-5 py-4">
              {status && (
                <p className="text-xs text-center mb-2 font-medium" style={{ color: /fail/i.test(status) ? C.danger : C.muted }}>{status}</p>
              )}
              <div className="flex gap-2">
                <button onClick={closeCrop}
                  className="flex-1 h-10 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleCropSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
                  style={{ background: C.brand }}>
                  {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving…</> : <><Check size={12} /> Use this photo</>}
                </button>
              </div>
            </div>
          }
        >
          <p className="px-5 py-3 text-xs text-center" style={{ color: C.muted }}>
            Drag to adjust. The box is locked to passport size (2×3).
          </p>
          <div className="flex items-center justify-center bg-gray-900 max-h-[50vh] overflow-auto p-3">
            <ReactCrop crop={crop} onChange={(_, pct) => setCrop(pct)} aspect={2 / 3} minWidth={30} keepSelection>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imgRef} src={srcImg} alt="Crop preview" onLoad={onImageLoad} style={{ maxHeight: "45vh", maxWidth: "100%" }} />
            </ReactCrop>
          </div>
        </Modal>
      )}

      {url ? (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Passport photo" className="w-20 h-28 object-cover rounded-xl border" style={{ borderColor: C.line }} />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-green-700 flex items-center gap-1"><Check size={12} /> Photo uploaded</p>
            <button type="button" onClick={onRemove} className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1">
              <X size={11} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-all w-full justify-center">
            <Upload size={15} /> Choose photo
          </button>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   5. PARENT FIELDS
   ════════════════════════════════════════════════════════════════════════════ */

function ParentFields({ value, onChange }: { value: Parent; onChange: (p: Parent) => void }) {
  const set = (k: keyof Parent) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <Field label="Name"><input value={value.name} onChange={set("name")} placeholder="Full name" className={inputCls} /></Field>
      </div>
      <Field label="Date of birth"><input type="date" value={value.dob} onChange={set("dob")} className={inputCls} /></Field>
      <Field label="Contact no."><input value={value.contact} onChange={set("contact")} placeholder="09XXXXXXXXX" inputMode="tel" className={inputCls} /></Field>
      <div className="sm:col-span-2">
        <Field label="Address"><input value={value.address} onChange={set("address")} placeholder="Street, Barangay, City, Province" className={inputCls} /></Field>
      </div>
      <Field label="Educational attainment"><input value={value.educ} onChange={set("educ")} placeholder="e.g. College graduate" className={inputCls} /></Field>
      <Field label="Occupation"><input value={value.occupation} onChange={set("occupation")} placeholder="Occupation" className={inputCls} /></Field>
      <Field label="Monthly income"><input value={value.income} onChange={set("income")} placeholder="e.g. ₱15,000" className={inputCls} /></Field>
      <Field label="Language spoken"><input value={value.language} onChange={set("language")} placeholder="e.g. Filipino" className={inputCls} /></Field>
      <Field label="Religion"><input value={value.religion} onChange={set("religion")} placeholder="Religion" className={inputCls} /></Field>
      <Field label="OFW / country"><input value={value.ofw} onChange={set("ofw")} placeholder="Country (if OFW)" className={inputCls} /></Field>
      <Field label="Years of stay abroad"><input value={value.yearsAbroad} onChange={set("yearsAbroad")} placeholder="e.g. 3 years" className={inputCls} /></Field>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   6. PAGE
   ════════════════════════════════════════════════════════════════════════════ */

export default function GuidanceFormPage() {
  const params   = useParams();
  const courseId = params.courseId as string;

  const [step,        setStep]        = useState(0);
  const [officeName,  setOfficeName]  = useState("");
  const [officeReady, setOfficeReady] = useState(false);
  const [officeError, setOfficeError] = useState("");
  const [submitted,   setSubmitted]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [checkingDup, setCheckingDup] = useState(false);
  const [dupWarning,  setDupWarning]  = useState("");
  const dupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 0 — header + personal
  const [studentNo,       setStudentNo]       = useState("");
  const [courseProgram,   setCourseProgram]   = useState("");
  const [yearSection,     setYearSection]     = useState("");
  const [lastName,        setLastName]        = useState("");
  const [firstName,       setFirstName]       = useState("");
  const [middleName,      setMiddleName]      = useState("");
  const [nickname,        setNickname]        = useState("");
  const [dateOfBirth,     setDateOfBirth]     = useState("");
  const [placeOfBirth,    setPlaceOfBirth]    = useState("");
  const [birthOrder,      setBirthOrder]      = useState("");
  const [mobileNo,        setMobileNo]        = useState("");
  const [email,           setEmail]           = useState("");
  const [sex,             setSex]             = useState("");
  const [religion,        setReligion]        = useState("");
  const [completeAddress, setCompleteAddress] = useState("");
  const [civilStatus,     setCivilStatus]     = useState("");
  const [special, setSpecial] = useState<Record<string, string>>({
    isPwd: "", isIndigenous: "", isSoloParent: "", isFirstGen: "",
  });

  // "Last Name, First Name Middle Name" (used on the PDF)
  const name = lastName.trim() && firstName.trim()
    ? `${lastName.trim()}, ${firstName.trim()}${middleName.trim() ? " " + middleName.trim() : ""}`
    : "";
  const age = computeAge(dateOfBirth);

  // Step 1 — parents
  const [father,        setFather]        = useState<Parent>(emptyParent());
  const [mother,        setMother]        = useState<Parent>(emptyParent());
  const [maritalStatus, setMaritalStatus] = useState("");

  // Step 2 — siblings & guardian
  const [siblings,         setSiblings]         = useState<Sibling[]>([emptySibling()]);
  const [guardianName,     setGuardianName]     = useState("");
  const [guardianContact,  setGuardianContact]  = useState("");
  const [guardianAddress,  setGuardianAddress]  = useState("");
  const [emergencyPerson,  setEmergencyPerson]  = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // Step 3 — educational background
  const [educBackground, setEducBackground] = useState<EducBackground>({
    elementary: [emptyEducLevel()], juniorHigh: [emptyEducLevel()],
    seniorHigh: [emptyEducLevel()], tertiary:   [emptyEducLevel()],
    techVoc:    [emptyEducLevel()],
  });

  // Step 4 — awards & organizations
  const [awards,        setAwards]        = useState("");
  const [organizations, setOrganizations] = useState<Organizations>({
    academic:    [emptyOrg(), emptyOrg(), emptyOrg()],
    nonAcademic: [emptyOrg(), emptyOrg(), emptyOrg()],
  });

  // Step 5 — unique features
  const [interests,       setInterests]       = useState("");
  const [talents,         setTalents]         = useState("");
  const [hobbies,         setHobbies]         = useState("");
  const [goals,           setGoals]           = useState("");
  const [principles,      setPrinciples]      = useState("");
  const [characteristics, setCharacteristics] = useState("");
  const [fears,           setFears]           = useState("");

  // Step 6 — health & signature
  const [healthAcademics,     setHealthAcademics]     = useState("");
  const [healthAcademicsSpec, setHealthAcademicsSpec] = useState("");
  const [healthExtra,         setHealthExtra]         = useState("");
  const [healthExtraSpec,     setHealthExtraSpec]     = useState("");
  const [psychiatricHelp,     setPsychiatricHelp]     = useState("");
  const [counseling,          setCounseling]          = useState("");
  const [counselingSpec,      setCounselingSpec]      = useState("");
  const [signatureUrl,        setSignatureUrl]        = useState("");
  const [signatureSaved,      setSignatureSaved]      = useState(false);
  const [photoUrl,            setPhotoUrl]            = useState("");
  const [sigUploading,        setSigUploading]        = useState("");

  useEffect(() => {
    fetch(`/api/guidance/${courseId}/info`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setOfficeError(d.error); return; }
        setOfficeName(d.name); setOfficeReady(true);
      })
      .catch(() => setOfficeError("Failed to load the form. Please try again."));
  }, [courseId]);

  useEffect(() => () => { if (dupTimeoutRef.current) clearTimeout(dupTimeoutRef.current); }, []);

  const handleStudentNoChange = (val: string) => {
    setStudentNo(val); setDupWarning("");
    if (dupTimeoutRef.current) clearTimeout(dupTimeoutRef.current);
    if (!val.trim()) return;
    dupTimeoutRef.current = setTimeout(async () => {
      setCheckingDup(true);
      try {
        const res  = await fetch(`/api/guidance/${courseId}/submit?studentNo=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        if (data.exists && !data.allowResubmit)
          setDupWarning(`A submission already exists for “${val.trim()}”. Contact the Guidance Office to update it.`);
      } catch { /* ignore */ }
      finally { setCheckingDup(false); }
    }, 700);
  };

  const uploadDataUrl = useCallback(async (dataUrl: string): Promise<string> => {
    const blob = await (await fetch(dataUrl)).blob();
    const fd = new FormData();
    fd.append("file", blob, "signature.png");
    const res  = await fetch(`/api/guidance/${courseId}/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.fileUrl;
  }, [courseId]);

  const handleSignatureSave = async (dataUrl: string) => {
    setSigUploading("Uploading signature…");
    try {
      setSignatureUrl(await uploadDataUrl(dataUrl));
      setSignatureSaved(true);
      setSigUploading("");
    } catch { setSigUploading("Signature upload failed. Try again."); }
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!studentNo.trim()) return "Enter your student number.";
      if (!courseProgram)    return "Select your course or program.";
      if (!lastName.trim())  return "Enter your last name.";
      if (!firstName.trim()) return "Enter your first name.";
      if (!sex.trim())       return "Select your sex.";
      if (checkingDup)       return "Checking your student number. Please wait a moment.";
      if (dupWarning)        return "A submission already exists for this student number.";
    }
    if (step === 6 && !signatureUrl) return "Draw and save your signature.";
    return null;
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleNext = () => {
    const err = validateStep();
    if (err) { setSubmitError(err); scrollTop(); return; }
    setSubmitError("");
    setStep(s => Math.min(s + 1, STEPS.length - 1));
    scrollTop();
  };

  const handleBack = () => {
    setSubmitError("");
    setStep(s => Math.max(s - 1, 0));
    scrollTop();
  };

  const goTo = (n: number) => { setSubmitError(""); setStep(n); scrollTop(); };

  const handleSubmit = async () => {
    setSubmitting(true); setSubmitError("");
    try {
      const healthAcademicsVal = healthAcademics === "Yes" ? (healthAcademicsSpec || "Yes") : "No";
      const healthExtraVal     = healthExtra     === "Yes" ? (healthExtraSpec     || "Yes") : "No";
      const counselingVal      = counseling      === "Yes" ? (counselingSpec      || "Yes") : "No";

      const res = await fetch(`/api/guidance/${courseId}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNo, courseProgram, yearSection,
          name, nickname, age,
          dateOfBirth, placeOfBirth, birthOrder,
          mobileNo, email, sex, religion, completeAddress,
          civilStatus: civilStatus || null,
          isPwd:        toBool(special.isPwd),
          isIndigenous: toBool(special.isIndigenous),
          isSoloParent: toBool(special.isSoloParent),
          isFirstGen:   toBool(special.isFirstGen),
          fatherName: father.name, fatherDOB: father.dob, fatherAddress: father.address,
          fatherContact: father.contact, fatherEduc: father.educ,
          fatherOccupation: father.occupation, fatherIncome: father.income,
          fatherLanguage: father.language, fatherReligion: father.religion,
          fatherOFW: father.ofw, fatherYearsAbroad: father.yearsAbroad,
          motherName: mother.name, motherDOB: mother.dob, motherAddress: mother.address,
          motherContact: mother.contact, motherEduc: mother.educ,
          motherOccupation: mother.occupation, motherIncome: mother.income,
          motherLanguage: mother.language, motherReligion: mother.religion,
          motherOFW: mother.ofw, motherYearsAbroad: mother.yearsAbroad,
          maritalStatus,
          siblings: siblings.filter(s => s.name.trim()),
          guardianName, guardianContact, guardianAddress,
          emergencyPerson, emergencyContact,
          educBackground,
          awards,
          organizations,
          interests, talents, hobbies, goals, principles, characteristics, fears,
          healthAcademics: healthAcademicsVal,
          healthExtracurricular: healthExtraVal,
          psychiatricHelp,
          counseling: counselingVal,
          signatureUrl,
          photoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? "Submission failed."); scrollTop(); return; }
      setSubmitted(true);
    } catch {
      setSubmitError("Network error. Check your connection and try again.");
      scrollTop();
    } finally {
      setSubmitting(false);
    }
  };

  // Sibling helpers
  const updateSibling = (i: number, field: keyof Sibling, val: string) =>
    setSiblings(prev => prev.map((s, j) => (j === i ? { ...s, [field]: val } : s)));

  // Educ helpers
  const updateEduc = (section: keyof EducBackground, idx: number, field: keyof EducLevel, val: string) =>
    setEducBackground(prev => ({ ...prev, [section]: prev[section].map((r, i) => (i === idx ? { ...r, [field]: val } : r)) }));
  const addEducRow = (section: keyof EducBackground) =>
    setEducBackground(prev => ({ ...prev, [section]: [...prev[section], emptyEducLevel()] }));
  const removeEducRow = (section: keyof EducBackground, idx: number) =>
    setEducBackground(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== idx) }));

  // Org helpers
  const updateOrg = (type: keyof Organizations, idx: number, field: keyof OrgRow, val: string) =>
    setOrganizations(prev => ({ ...prev, [type]: prev[type].map((r, i) => (i === idx ? { ...r, [field]: val } : r)) }));

  /* ── Loading / error / success ── */
  if (!officeReady && !officeError)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" style={{ fontFamily: FONT }}>
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );

  if (officeError)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 bg-white text-center" style={{ fontFamily: FONT }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: C.brandTint }}>
          <AlertCircle className="w-6 h-6" style={{ color: C.brand }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: C.ink }}>This form isn’t available</p>
        <p className="text-xs max-w-xs" style={{ color: C.muted }}>{officeError}</p>
      </div>
    );

  if (submitted)
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50" style={{ fontFamily: FONT }}>
        <div className="bg-white rounded-xl border w-full max-w-md overflow-hidden" style={{ borderColor: C.line }}>
          <div className="px-6 pt-8 pb-6 text-center">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "#dcfce7" }}>
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-lg font-bold" style={{ color: C.ink }}>Information sheet submitted</h1>
            <p className="text-sm mt-1.5" style={{ color: C.muted }}>
              <strong style={{ color: C.body }}>{officeName}</strong> received your Individual Information Sheet.
            </p>
          </div>
          <dl className="px-6 py-4 border-t text-xs space-y-2" style={{ borderColor: C.lineSoft, background: "#fafafa" }}>
            <div className="flex justify-between gap-4"><dt style={{ color: C.muted }}>Name</dt><dd className="font-semibold text-right" style={{ color: C.ink }}>{name}</dd></div>
            <div className="flex justify-between gap-4"><dt style={{ color: C.muted }}>Student no.</dt><dd className="font-semibold" style={{ color: C.ink }}>{studentNo}</dd></div>
          </dl>
          <p className="px-6 py-3 text-[11px] text-center border-t" style={{ color: C.faint, borderColor: C.lineSoft }}>You can close this page now.</p>
        </div>
      </div>
    );

  /* ── Review data ── */
  const personalRows: Array<[string, string]> = [
    ["Student no.",       studentNo],
    ["Name",              name],
    ["Course / program",  courseProgram],
    ["Year & section",    yearSection],
    ["Age",               age !== null ? String(age) : ""],
    ["Sex",               sex],
    ["Civil status",      civilStatus],
    ["Date of birth",     dateOfBirth],
    ["Mobile no.",        mobileNo],
    ["Email",             email],
    ["Address",           completeAddress],
  ];

  const familyRows: Array<[string, string]> = [
    ["Father",           father.name],
    ["Mother",           mother.name],
    ["Parents’ status",  maritalStatus],
    ["Siblings listed",  String(siblings.filter(s => s.name.trim()).length || "")],
    ["Guardian",         guardianName],
    ["Emergency contact", [emergencyPerson, emergencyContact].filter(Boolean).join(" · ")],
  ];

  const ReviewList = ({ rows }: { rows: Array<[string, string]> }) => (
    <dl className="divide-y" style={{ borderColor: C.lineSoft }}>
      {rows.filter(([, v]) => v).map(([label, val]) => (
        <div key={label} className="flex gap-4 py-2.5 first:pt-0 last:pb-0" style={{ borderColor: C.lineSoft }}>
          <dt className="text-xs w-36 shrink-0" style={{ color: C.muted }}>{label}</dt>
          <dd className="text-xs font-semibold break-words min-w-0" style={{ color: C.ink }}>{val}</dd>
        </div>
      ))}
    </dl>
  );

  const EditBtn = ({ to }: { to: number }) => (
    <button type="button" onClick={() => goTo(to)}
      className="flex items-center gap-1 text-xs font-semibold hover:underline shrink-0" style={{ color: C.brand }}>
      <Pencil size={11} /> Edit
    </button>
  );

  const orgBlock = (type: keyof Organizations, title: string) => (
    <div>
      <p className="text-xs font-bold mb-2" style={{ color: C.ink }}>{title}</p>
      <div className="space-y-2">
        {organizations[type].map((org, i) => (
          <div key={i} className="grid grid-cols-[1fr_110px] gap-2">
            <input value={org.name} onChange={e => updateOrg(type, i, "name", e.target.value)} placeholder="Organization" className={inputCls} />
            <input value={org.position} onChange={e => updateOrg(type, i, "position", e.target.value)} placeholder="Position" className={inputCls} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: FONT }}>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b" style={{ borderColor: C.line }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.brand }}>
            <ClipboardList size={17} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate" style={{ color: C.ink }}>Individual information sheet</p>
            <p className="text-xs truncate" style={{ color: C.faint }}>Pampanga State University · {officeName || "Guidance Office"}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
            {STEPS.map((s, i) => (
              <span key={s} className="h-1.5 flex-1 rounded-full transition-colors"
                style={{ background: i <= step ? C.brand : C.line }} />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs font-bold" style={{ color: C.ink }}>{STEPS[step]}</p>
            <p className="text-xs tabular-nums" style={{ color: C.faint }}>Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 pb-32 space-y-4">

        {submitError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border px-4 py-3 text-xs font-medium"
            style={{ background: "#fef2f2", borderColor: "#fecaca", color: C.danger }}>
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {submitError}
          </div>
        )}

        {/* STEP 0 — Personal info */}
        {step === 0 && (
          <>
            <Card title="Student details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Student no." required>
                  <div className="relative">
                    <input value={studentNo} onChange={e => handleStudentNoChange(e.target.value)} placeholder="e.g. 2023312239" className={inputCls} />
                    {checkingDup && <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                  </div>
                  {dupWarning && <p className="text-[11px] mt-1 leading-snug" style={{ color: "#b45309" }}>{dupWarning}</p>}
                </Field>
                <Field label="Year & section">
                  <input value={yearSection} onChange={e => setYearSection(e.target.value)} placeholder="e.g. 1-A" className={inputCls} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Course / program" required>
                    <select value={courseProgram} onChange={e => setCourseProgram(e.target.value)} className={inputCls}>
                      <option value="">Select</option>
                      {Object.entries(COURSES_BY_DEPARTMENT).map(([dept, list]) => (
                        <optgroup key={dept} label={dept}>
                          {list.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            </Card>

            <Card title="Personal information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Last name" required>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz" className={inputCls} autoComplete="family-name" />
                  </Field>
                  <Field label="First name" required>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" className={inputCls} autoComplete="given-name" />
                  </Field>
                  <Field label="Middle name" hint="Leave blank if none.">
                    <input value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Santos" className={inputCls} autoComplete="additional-name" />
                  </Field>
                </div>
                <Field label="Nickname"><input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Nickname" className={inputCls} /></Field>
                <Field label="Sex" required>
                  <select value={sex} onChange={e => setSex(e.target.value)} className={inputCls}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </Field>
                <Field label="Date of birth" hint={age !== null ? `Age: ${age}` : undefined}>
                  <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Place of birth"><input value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)} placeholder="City / municipality" className={inputCls} /></Field>
                <Field label="Birth order among siblings"><input value={birthOrder} onChange={e => setBirthOrder(e.target.value)} placeholder="e.g. 2nd of 4" className={inputCls} /></Field>
                <Field label="Religion"><input value={religion} onChange={e => setReligion(e.target.value)} placeholder="Religion" className={inputCls} /></Field>
                <Field label="Civil status">
                  <select value={civilStatus} onChange={e => setCivilStatus(e.target.value)} className={inputCls}>
                    <option value="">Select</option>
                    {CIVIL_STATUSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Mobile no."><input value={mobileNo} onChange={e => setMobileNo(e.target.value)} placeholder="09XXXXXXXXX" inputMode="tel" className={inputCls} autoComplete="tel" /></Field>
                <div className="sm:col-span-2">
                  <Field label="Email address"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@psu.edu.ph" className={inputCls} autoComplete="email" /></Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Complete address"><input value={completeAddress} onChange={e => setCompleteAddress(e.target.value)} placeholder="Street, Barangay, City, Province" className={inputCls} autoComplete="street-address" /></Field>
                </div>
              </div>
            </Card>

            <Card title="Special categories" description="Answer each one.">
              <div className="divide-y" style={{ borderColor: C.lineSoft }}>
                {SPECIAL_CATEGORIES.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" style={{ borderColor: C.lineSoft }}>
                    <span className="text-xs font-semibold flex-1" style={{ color: C.body }}>{label}</span>
                    <YesNo value={special[key]} onChange={v => setSpecial(p => ({ ...p, [key]: v }))} />
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* STEP 1 — Parents */}
        {step === 1 && (
          <>
            <Card title="Father’s information">
              <ParentFields value={father} onChange={setFather} />
            </Card>
            <Card title="Mother’s information">
              <ParentFields value={mother} onChange={setMother} />
            </Card>
            <Card title="Parents’ marital status" description="Choose the option that applies.">
              <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MARITAL_OPTIONS.map(opt => (
                  <ChoiceCard key={opt} label={opt} active={maritalStatus === opt} onClick={() => setMaritalStatus(opt)} />
                ))}
              </div>
            </Card>
          </>
        )}

        {/* STEP 2 — Siblings & guardian */}
        {step === 2 && (
          <>
            <Card title="Siblings" description="Eldest to youngest. Include yourself.">
              <div className="space-y-3">
                <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_36px] gap-2 px-0.5">
                  <span className={labelCls + " mb-0"}>Name</span>
                  <span className={labelCls + " mb-0"}>School / work</span>
                  <span className={labelCls + " mb-0"}>Age</span>
                  <span />
                </div>
                {siblings.map((sib, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_36px] gap-2 items-start">
                    <input value={sib.name} onChange={e => updateSibling(i, "name", e.target.value)} placeholder="Full name" className={inputCls} />
                    <input value={sib.schoolWork} onChange={e => updateSibling(i, "schoolWork", e.target.value)} placeholder="School / company" className={inputCls} />
                    <input type="number" min="1" value={sib.age} onChange={e => updateSibling(i, "age", e.target.value)} placeholder="Age" className={inputCls} />
                    <button type="button" aria-label="Remove sibling" onClick={() => setSiblings(prev => prev.filter((_, j) => j !== i))}
                      disabled={siblings.length <= 1} className={delBtnCls}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setSiblings(prev => [...prev, emptySibling()])} className={addBtnCls}>
                  <Plus size={12} /> Add sibling
                </button>
              </div>
            </Card>

            <Card title="Guardian and emergency contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Guardian name" hint="Only if you don’t live with your parents.">
                  <input value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Full name" className={inputCls} />
                </Field>
                <Field label="Guardian contact no.">
                  <input value={guardianContact} onChange={e => setGuardianContact(e.target.value)} placeholder="09XXXXXXXXX" inputMode="tel" className={inputCls} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Guardian address">
                    <input value={guardianAddress} onChange={e => setGuardianAddress(e.target.value)} placeholder="Street, Barangay, City, Province" className={inputCls} />
                  </Field>
                </div>
                <Field label="Person to contact in case of emergency">
                  <input value={emergencyPerson} onChange={e => setEmergencyPerson(e.target.value)} placeholder="Full name" className={inputCls} />
                </Field>
                <Field label="Emergency contact no.">
                  <input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} placeholder="09XXXXXXXXX" inputMode="tel" className={inputCls} />
                </Field>
              </div>
            </Card>
          </>
        )}

        {/* STEP 3 — Educational background */}
        {step === 3 && (
          <>
            {EDUC_SECTIONS.map(([key, label]) => (
              <Card key={key} title={label}>
                <div className="space-y-3">
                  <div className="hidden sm:grid grid-cols-[1fr_2fr_130px_36px] gap-2 px-0.5">
                    <span className={labelCls + " mb-0"}>Level / grade</span>
                    <span className={labelCls + " mb-0"}>School attended</span>
                    <span className={labelCls + " mb-0"}>Years</span>
                    <span />
                  </div>
                  {educBackground[key].map((row, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_130px_36px] gap-2 items-start">
                      <input value={row.level} onChange={e => updateEduc(key, i, "level", e.target.value)} placeholder="e.g. Grade 6" className={inputCls} />
                      <input value={row.school} onChange={e => updateEduc(key, i, "school", e.target.value)} placeholder="School name" className={inputCls} />
                      <input value={row.years} onChange={e => updateEduc(key, i, "years", e.target.value)} placeholder="e.g. 2018-2019" className={inputCls} />
                      <button type="button" aria-label="Remove row" onClick={() => removeEducRow(key, i)}
                        disabled={educBackground[key].length <= 1} className={delBtnCls}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addEducRow(key)} className={addBtnCls}>
                    <Plus size={12} /> Add row
                  </button>
                </div>
              </Card>
            ))}
          </>
        )}

        {/* STEP 4 — Awards & organizations */}
        {step === 4 && (
          <>
            <Card title="Awards and honors received">
              <textarea value={awards} onChange={e => setAwards(e.target.value)} rows={3}
                placeholder="List any awards or honors you have received" className={textareaCls} />
            </Card>
            <Card title="Membership in organizations">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {orgBlock("academic", "Academic organizations")}
                {orgBlock("nonAcademic", "Non-academic organizations")}
              </div>
            </Card>
          </>
        )}

        {/* STEP 5 — Unique features */}
        {step === 5 && (
          <Card title="Unique features" description="Tell us what makes you, you.">
            <div className="space-y-4">
              {([
                ["Interests",                              interests,       setInterests],
                ["Talents",                                talents,         setTalents],
                ["Hobbies",                                hobbies,         setHobbies],
                ["Goals in life",                          goals,           setGoals],
                ["Principle in life",                      principles,      setPrinciples],
                ["Characteristics that describe you best", characteristics, setCharacteristics],
                ["Present fears",                          fears,           setFears],
              ] as Array<[string, string, React.Dispatch<React.SetStateAction<string>>]>).map(([label, val, setter]) => (
                <Field key={label} label={label}>
                  <input value={val} onChange={e => setter(e.target.value)}
                    placeholder={`Your ${label.toLowerCase()}`} className={inputCls} />
                </Field>
              ))}
            </div>
          </Card>
        )}

        {/* STEP 6 — Health & signature */}
        {step === 6 && (
          <>
            <Card title="Physical and mental health">
              <div className="space-y-6">
                <div>
                  <Question>A1. Do you have any health problems or physical limitations that may hinder you from performing well in your <strong>academics</strong>?</Question>
                  <YesNo value={healthAcademics} onChange={setHealthAcademics} options={["No", "Yes"]} />
                  {healthAcademics === "Yes" && (
                    <input value={healthAcademicsSpec} onChange={e => setHealthAcademicsSpec(e.target.value)}
                      placeholder="Please specify" className={`${inputCls} mt-3`} />
                  )}
                </div>

                <div>
                  <Question>A2. Do you have any health problems or physical limitations that may hinder you from performing well in your <strong>extra-curricular activities</strong>?</Question>
                  <YesNo value={healthExtra} onChange={setHealthExtra} options={["No", "Yes"]} />
                  {healthExtra === "Yes" && (
                    <input value={healthExtraSpec} onChange={e => setHealthExtraSpec(e.target.value)}
                      placeholder="Please specify" className={`${inputCls} mt-3`} />
                  )}
                </div>

                <div>
                  <Question>B. Have you ever sought psychiatric assessment or help?</Question>
                  <YesNo value={psychiatricHelp} onChange={setPsychiatricHelp} />
                </div>

                <div>
                  <Question>C. Have you ever undergone counseling?</Question>
                  <YesNo value={counseling} onChange={setCounseling} />
                  {counseling === "Yes" && (
                    <input value={counselingSpec} onChange={e => setCounselingSpec(e.target.value)}
                      placeholder="Please specify" className={`${inputCls} mt-3`} />
                  )}
                </div>
              </div>
            </Card>

            <Card title="Passport size photo" description="You’ll crop it to a 2×3 ratio before it’s uploaded.">
              <PhotoCropUpload
                url={photoUrl} onUploaded={setPhotoUrl} onRemove={() => setPhotoUrl("")} courseId={courseId}
              />
            </Card>

            <Card title="Signature">
              <p className={labelCls}>Signature over printed name <span className="text-red-500">*</span></p>
              <p className="text-[11px] mb-2" style={{ color: C.faint }}>Draw your signature in the box, then select “Save signature”.</p>
              {signatureSaved ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signatureUrl} alt="Your signature" className="h-16 border rounded-lg bg-white p-1" style={{ borderColor: C.line }} />
                  <button type="button" onClick={() => { setSignatureSaved(false); setSignatureUrl(""); }}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1">
                    <X size={12} /> Redo
                  </button>
                </div>
              ) : (
                <>
                  <SignaturePad onSave={handleSignatureSave} />
                  <UploadStatus text={sigUploading} />
                </>
              )}
            </Card>
          </>
        )}

        {/* STEP 7 — Review & submit */}
        {step === 7 && (
          <>
            <Card title="Your details" description="Check everything before you submit." action={<EditBtn to={0} />}>
              <ReviewList rows={personalRows} />
            </Card>

            <Card title="Family" action={<EditBtn to={1} />}>
              {familyRows.some(([, v]) => v)
                ? <ReviewList rows={familyRows} />
                : <p className="text-xs" style={{ color: C.muted }}>No family details entered.</p>}
            </Card>

            <Card title="Photo and signature" action={<EditBtn to={6} />}>
              <div className="flex flex-wrap gap-3">
                {photoUrl && (
                  <div className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl} alt="Photo" className="w-16 h-20 object-cover rounded-lg border" style={{ borderColor: C.line }} />
                    <span className="text-[11px]" style={{ color: C.muted }}>Photo</span>
                  </div>
                )}
                {signatureUrl && (
                  <div className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signatureUrl} alt="Signature" className="h-20 border rounded-lg bg-white p-1 object-contain" style={{ width: 88, borderColor: C.line }} />
                    <span className="text-[11px]" style={{ color: C.muted }}>Signature</span>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Data privacy consent">
              <div className="rounded-xl border px-4 py-3 text-xs leading-relaxed" style={{ background: C.brandTint, borderColor: "#f1d5d5", color: C.body }}>
                By submitting, I certify that all information provided is complete and accurate. I allow{" "}
                <strong>Pampanga State University</strong>, through the Counseling &amp; Testing Center, to collect, record,
                organize, and use my personal data under <strong>Republic Act No. 10173</strong> (Data Privacy Act of 2012).
              </div>
            </Card>
          </>
        )}
      </main>

      {/* Bottom nav */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t z-10" style={{ borderColor: C.line, paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-3">
          {step > 0 && (
            <button onClick={handleBack}
              className="flex items-center gap-1.5 px-4 h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              <ChevronLeft size={15} /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-bold text-white transition-opacity"
              style={{ background: C.brand }}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
              style={{ background: C.brand }}>
              {submitting ? <><RefreshCw size={14} className="animate-spin" /> Submitting…</> : <><Check size={14} /> Submit information sheet</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}