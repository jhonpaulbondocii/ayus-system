"use client";

// src/app/forms/guidance/[courseId]/page.tsx
// PUBLIC — no auth required, students fill this out

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check, AlertCircle,
  RefreshCw, GraduationCap, Plus, Trash2, Upload, X,
} from "lucide-react";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { COURSES_BY_DEPARTMENT } from "@/lib/academic-programs";

const MAROON = "#7b1113";
const FONT   = "'Inter', system-ui, sans-serif";

/* ── Types ── */
interface Sibling  { name: string; schoolWork: string; age: string; }
interface EducLevel { level: string; school: string; years: string; }
interface OrgRow   { name: string; position: string; }
interface EducBackground {
  elementary: EducLevel[]; juniorHigh: EducLevel[];
  seniorHigh: EducLevel[]; tertiary: EducLevel[]; techVoc: EducLevel[];
}
interface Organizations { academic: OrgRow[]; nonAcademic: OrgRow[]; }

/* ── Input styles ── */
const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white placeholder:text-gray-400";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
const textareaCls = `${inputCls} resize-none`;

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 h-px bg-gray-200" />
      <p className="text-xs font-black uppercase tracking-widest text-gray-500 shrink-0">{children}</p>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
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
  "Living together but not married","Permanently separated",
  "Father w/ another partner","Temporarily separated",
  "Mother w/ another partner","Marriage annulled/legally separated",
  "Married in Church","Civil Marriage","Others",
];

const STEPS = [
  "Personal Info","Parents","Siblings & Guardian",
  "Educational Background","Awards & Orgs",
  "Unique Features","Health & Signature","Review & Submit",
];

const emptySibling   = (): Sibling   => ({ name: "", schoolWork: "", age: "" });
const emptyEducLevel = (): EducLevel => ({ level: "", school: "", years: "" });
const emptyOrg       = (): OrgRow   => ({ name: "", position: "" });

/* ── Signature Pad ── */
function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const drawing    = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    drawing.current = true;
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#111";
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    setHasDrawn(true);
  };

  const end = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const save = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div>
      <canvas ref={canvasRef} width={500} height={120}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-white touch-none cursor-crosshair"
        style={{ maxHeight: 120 }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={clear}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all">
          <X size={11} /> Clear
        </button>
        <button type="button" onClick={save} disabled={!hasDrawn}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all disabled:opacity-40"
          style={{ background: MAROON }}>
          <Check size={11} /> Save Signature
        </button>
      </div>
    </div>
  );
}

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

/* ── Photo Crop Upload (passport 2x3) ── */
function PhotoCropUpload({
  url, onUploaded, onRemove, courseId,
}: {
  url: string;
  onUploaded: (u: string) => void;
  onRemove: () => void;
  courseId: string;
}) {
  const [srcImg, setSrcImg] = useState<string | null>(null);
  const [crop,   setCrop]   = useState<Crop>();
  const [status, setStatus] = useState("");
  const imgRef       = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeCrop = () => {
    setSrcImg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSrcImg(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    setCrop(centerCrop(makeAspectCrop({ unit: "%", width: 80 }, 2 / 3, width, height), width, height));
  };

  const handleCropSave = async () => {
    const img = imgRef.current;
    if (!img || !crop) return;
    setStatus("Processing...");
    const px = {
      x:      crop.unit === "%" ? (crop.x      / 100) * img.naturalWidth  : crop.x,
      y:      crop.unit === "%" ? (crop.y      / 100) * img.naturalHeight : crop.y,
      width:  crop.unit === "%" ? (crop.width  / 100) * img.naturalWidth  : crop.width,
      height: crop.unit === "%" ? (crop.height / 100) * img.naturalHeight : crop.height,
    };
    const canvas = document.createElement("canvas");
    canvas.width = 600; canvas.height = 900;
    canvas.getContext("2d")!.drawImage(img, px.x, px.y, px.width, px.height, 0, 0, 600, 900);
    canvas.toBlob(async (blob) => {
      if (!blob) { setStatus("Failed. Try again."); return; }
      const fd = new FormData();
      fd.append("file", blob, "passport-photo.jpg");
      try {
        setStatus("Uploading...");
        const res  = await fetch(`/api/guidance/${courseId}/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onUploaded(data.fileUrl);
        closeCrop();
        setStatus("");
      } catch { setStatus("Upload failed. Try again."); }
    }, "image/jpeg", 0.92);
  };

  return (
    <div>
      {srcImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" style={{ fontFamily: FONT }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background: MAROON }}>
              <p className="text-sm font-black text-white">Crop Photo</p>
              <button onClick={closeCrop} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10">
                <X size={15} />
              </button>
            </div>
            <div className="px-4 py-3 bg-gray-50 text-center">
              <p className="text-[11px] text-gray-500">Drag to adjust. The box is locked to <strong>passport size (2×3) ratio</strong>.</p>
            </div>
            <div className="flex items-center justify-center bg-gray-900 max-h-[55vh] overflow-auto p-3">
              <ReactCrop crop={crop} onChange={(_, pct) => setCrop(pct)} aspect={2 / 3} minWidth={30} keepSelection>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={imgRef} src={srcImg} alt="Crop preview" onLoad={onImageLoad} style={{ maxHeight: "50vh", maxWidth: "100%" }} />
              </ReactCrop>
            </div>
            <div className="px-5 py-4 border-t flex gap-2">
              <button onClick={closeCrop} className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCropSave} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white" style={{ background: MAROON }}>
                <Check size={12} /> Use this photo
              </button>
            </div>
            {status && <p className="text-center text-xs text-gray-500 pb-3">{status}</p>}
          </div>
        </div>
      )}

      {url ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Passport photo" className="w-16 h-24 object-cover rounded-lg border border-gray-200" />
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-green-600 flex items-center gap-1"><Check size={11} /> Photo cropped & uploaded</p>
            <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><X size={11} /> Remove</button>
          </div>
        </div>
      ) : (
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all w-full justify-center">
            <Upload size={15} /> Upload Photo
          </button>
        </div>
      )}
    </div>
  );
}

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
  const dupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Step 0: Header + Personal ──
  const [studentNo,      setStudentNo]      = useState("");
  const [courseProgram,  setCourseProgram]  = useState("");
  const [yearSection,    setYearSection]    = useState("");
  const [lastName,       setLastName]       = useState("");
  const [firstName,      setFirstName]      = useState("");
  const [middleName,     setMiddleName]     = useState("");
  const [nickname,       setNickname]       = useState("");
  const [dateOfBirth,    setDateOfBirth]    = useState("");
  const [placeOfBirth,   setPlaceOfBirth]   = useState("");
  const [birthOrder,     setBirthOrder]     = useState("");
  const [mobileNo,       setMobileNo]       = useState("");
  const [email,          setEmail]          = useState("");
  const [sex,            setSex]            = useState("");
  const [religion,       setReligion]       = useState("");
  const [completeAddress,setCompleteAddress]= useState("");
  const [civilStatus,    setCivilStatus]    = useState("");
  const [special, setSpecial] = useState<Record<string, string>>({
    isPwd: "", isIndigenous: "", isSoloParent: "", isFirstGen: "",
  });

  // Auto-computed: "Last Name, First Name Middle Name" (ito ang mapupunta sa PDF)
  const name = lastName.trim() && firstName.trim()
    ? `${lastName.trim()}, ${firstName.trim()}${middleName.trim() ? " " + middleName.trim() : ""}`
    : "";
  // Auto-computed from birthdate
  const age = computeAge(dateOfBirth);

  // ── Step 1: Parents ──
  const [fatherName,        setFatherName]        = useState("");
  const [fatherDOB,         setFatherDOB]         = useState("");
  const [fatherAddress,     setFatherAddress]     = useState("");
  const [fatherContact,     setFatherContact]     = useState("");
  const [fatherEduc,        setFatherEduc]        = useState("");
  const [fatherOccupation,  setFatherOccupation]  = useState("");
  const [fatherIncome,      setFatherIncome]      = useState("");
  const [fatherLanguage,    setFatherLanguage]    = useState("");
  const [fatherReligion,    setFatherReligion]    = useState("");
  const [fatherOFW,         setFatherOFW]         = useState("");
  const [fatherYearsAbroad, setFatherYearsAbroad] = useState("");
  const [motherName,        setMotherName]        = useState("");
  const [motherDOB,         setMotherDOB]         = useState("");
  const [motherAddress,     setMotherAddress]     = useState("");
  const [motherContact,     setMotherContact]     = useState("");
  const [motherEduc,        setMotherEduc]        = useState("");
  const [motherOccupation,  setMotherOccupation]  = useState("");
  const [motherIncome,      setMotherIncome]      = useState("");
  const [motherLanguage,    setMotherLanguage]    = useState("");
  const [motherReligion,    setMotherReligion]    = useState("");
  const [motherOFW,         setMotherOFW]         = useState("");
  const [motherYearsAbroad, setMotherYearsAbroad] = useState("");
  const [maritalStatus,     setMaritalStatus]     = useState("");

  // ── Step 2: Siblings & Guardian ──
  const [siblings,        setSiblings]        = useState<Sibling[]>([emptySibling()]);
  const [guardianName,    setGuardianName]    = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [guardianAddress, setGuardianAddress] = useState("");
  const [emergencyPerson, setEmergencyPerson] = useState("");
  const [emergencyContact,setEmergencyContact]= useState("");

  // ── Step 3: Educational Background ──
  const [educBackground, setEducBackground] = useState<EducBackground>({
    elementary: [emptyEducLevel()], juniorHigh: [emptyEducLevel()],
    seniorHigh: [emptyEducLevel()], tertiary:   [emptyEducLevel()],
    techVoc:    [emptyEducLevel()],
  });

  // ── Step 4: Awards & Organizations ──
  const [awards,        setAwards]        = useState("");
  const [organizations, setOrganizations] = useState<Organizations>({
    academic: [emptyOrg(), emptyOrg(), emptyOrg()],
    nonAcademic: [emptyOrg(), emptyOrg(), emptyOrg()],
  });

  // ── Step 5: Unique Features ──
  const [interests,       setInterests]       = useState("");
  const [talents,         setTalents]         = useState("");
  const [hobbies,         setHobbies]         = useState("");
  const [goals,           setGoals]           = useState("");
  const [principles,      setPrinciples]      = useState("");
  const [characteristics, setCharacteristics] = useState("");
  const [fears,           setFears]           = useState("");

  // ── Step 6: Health & Signature ──
  const [healthAcademics,       setHealthAcademics]       = useState("");
  const [healthAcademicsSpec,   setHealthAcademicsSpec]   = useState("");
  const [healthExtra,           setHealthExtra]           = useState("");
  const [healthExtraSpec,       setHealthExtraSpec]       = useState("");
  const [psychiatricHelp,       setPsychiatricHelp]       = useState("");
  const [counseling,            setCounseling]            = useState("");
  const [counselingSpec,        setCounselingSpec]        = useState("");
  const [signatureUrl,          setSignatureUrl]          = useState("");
  const [signatureSaved,        setSignatureSaved]        = useState(false);
  const [photoUrl,              setPhotoUrl]              = useState("");
  const [sigUploading,          setSigUploading]          = useState("");

  useEffect(() => {
    fetch(`/api/guidance/${courseId}/info`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setOfficeError(d.error); return; }
        setOfficeName(d.name); setOfficeReady(true);
      })
      .catch(() => setOfficeError("Failed to load form. Please try again."));
  }, [courseId]);

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
          setDupWarning(`A submission already exists for "${val.trim()}". Contact the Guidance Office to update.`);
      } catch { /* ignore */ }
      finally { setCheckingDup(false); }
    }, 700);
  };

  const uploadToCloudinary = useCallback(async (file: File | string, isDataUrl = false): Promise<string> => {
    const fd = new FormData();
    if (isDataUrl) {
      const res  = await fetch(file as string);
      const blob = await res.blob();
      fd.append("file", blob, "signature.png");
    } else {
      fd.append("file", file as File);
    }
    const res  = await fetch(`/api/guidance/${courseId}/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.fileUrl;
  }, [courseId]);


  const handleSignatureSave = async (dataUrl: string) => {
    setSigUploading("Uploading signature...");
    try {
      const url = await uploadToCloudinary(dataUrl, true);
      setSignatureUrl(url);
      setSignatureSaved(true);
      setSigUploading("");
    } catch {
      setSigUploading("Signature upload failed. Try again.");
    }
  };

  const validateStep = () => {
    if (step === 0) {
      if (!studentNo.trim()) return "Student number is required.";
      if (!courseProgram)    return "Course / Program is required.";
      if (!lastName.trim())  return "Last name is required.";
      if (!firstName.trim()) return "First name is required.";
      if (!sex.trim())       return "Sex is required.";
      if (dupWarning)        return "Please resolve the duplicate submission issue before continuing.";
    }
    if (step === 6) {
      if (!signatureUrl) return "Please draw and save your signature before proceeding.";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setSubmitError(err); return; }
    setSubmitError("");
    setStep(s => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setSubmitError("");
    setStep(s => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
          fatherName, fatherDOB, fatherAddress, fatherContact,
          fatherEduc, fatherOccupation, fatherIncome,
          fatherLanguage, fatherReligion, fatherOFW, fatherYearsAbroad,
          motherName, motherDOB, motherAddress, motherContact,
          motherEduc, motherOccupation, motherIncome,
          motherLanguage, motherReligion, motherOFW, motherYearsAbroad,
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
      if (!res.ok) { setSubmitError(data.error ?? "Submission failed."); return; }
      setSubmitted(true);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Educ helpers
  const updateEduc = (section: keyof EducBackground, idx: number, field: keyof EducLevel, val: string) =>
    setEducBackground(prev => ({ ...prev, [section]: prev[section].map((r, i) => i === idx ? { ...r, [field]: val } : r) }));
  const addEducRow = (section: keyof EducBackground) =>
    setEducBackground(prev => ({ ...prev, [section]: [...prev[section], emptyEducLevel()] }));
  const removeEducRow = (section: keyof EducBackground, idx: number) =>
    setEducBackground(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== idx) }));

  // Org helpers
  const updateOrg = (type: keyof Organizations, idx: number, field: keyof OrgRow, val: string) =>
    setOrganizations(prev => ({ ...prev, [type]: prev[type].map((r, i) => i === idx ? { ...r, [field]: val } : r) }));

  if (!officeReady && !officeError) {
    return <div className="min-h-screen flex items-center justify-center" style={{ fontFamily: FONT }}><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }
  if (officeError) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4" style={{ fontFamily: FONT }}><AlertCircle className="w-10 h-10 text-red-400" /><p className="text-sm text-gray-600 text-center">{officeError}</p></div>;
  }
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ fontFamily: FONT }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#f0fdf4" }}>
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-1">Submission Successful!</h1>
          <p className="text-sm text-gray-500 max-w-sm">Your Individual Information Sheet has been submitted to the {officeName}. You may now close this page.</p>
        </div>
        <div className="text-xs text-gray-400 mt-2 text-center">
          <p>Student No: <span className="font-semibold text-gray-600">{studentNo}</span></p>
          <p>Name: <span className="font-semibold text-gray-600">{name}</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: FONT }}>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: MAROON }}>
            <GraduationCap size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pampanga State University</p>
            <p className="text-sm font-bold text-gray-900 truncate">{officeName} — Individual Information Sheet</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 transition-all ${i < step ? "text-white" : i === step ? "text-white" : "text-gray-400 border border-gray-300"}`}
                  style={i <= step ? { background: MAROON } : {}}>
                  {i < step ? <Check size={10} /> : i + 1}
                </div>
                <span className={`text-[10px] font-semibold hidden sm:block truncate ${i === step ? "text-gray-800" : "text-gray-400"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {submitError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-xs text-red-600">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />{submitError}
          </div>
        )}

        {/* ── STEP 0: Personal Info ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <SectionTitle>Student Header</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Course / Program" required>
                  <select value={courseProgram} onChange={e => setCourseProgram(e.target.value)} className={inputCls}>
                    <option value="">— Select —</option>
                    {Object.entries(COURSES_BY_DEPARTMENT).map(([dept, list]) => (
                      <optgroup key={dept} label={dept}>
                        {list.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field label="Year & Section">
                  <input value={yearSection} onChange={e => setYearSection(e.target.value)} placeholder="e.g. 1-A" className={inputCls} />
                </Field>
                <Field label="Student No." required>
                  <div className="relative">
                    <input value={studentNo} onChange={e => handleStudentNoChange(e.target.value)} placeholder="e.g. 2023312239" className={inputCls} />
                    {checkingDup && <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                  </div>
                  {dupWarning && <p className="text-[11px] text-amber-600 mt-1 leading-snug">{dupWarning}</p>}
                </Field>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <SectionTitle>Personal Information</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Last Name" required><input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" className={inputCls} /></Field>
                <Field label="First Name" required><input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" className={inputCls} /></Field>
                <Field label="Middle Name"><input value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Middle Name (leave blank if none)" className={inputCls} /></Field>
                <Field label="Nickname"><input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Nickname" className={inputCls} /></Field>
                <Field label="Date of Birth"><input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className={inputCls} /></Field>
                <Field label="Place of Birth"><input value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)} placeholder="City / Municipality" className={inputCls} /></Field>
                <Field label="Sex" required>
                  <select value={sex} onChange={e => setSex(e.target.value)} className={inputCls}>
                    <option value="">— Select —</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </Field>
                <Field label="Birth Order Among Siblings"><input value={birthOrder} onChange={e => setBirthOrder(e.target.value)} placeholder="e.g. 2nd of 4" className={inputCls} /></Field>
                <Field label="Religion"><input value={religion} onChange={e => setReligion(e.target.value)} placeholder="Religion" className={inputCls} /></Field>
                <Field label="Civil Status">
                  <select value={civilStatus} onChange={e => setCivilStatus(e.target.value)} className={inputCls}>
                    <option value="">— Select —</option>
                    {CIVIL_STATUSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Mobile No."><input value={mobileNo} onChange={e => setMobileNo(e.target.value)} placeholder="09XXXXXXXXX" className={inputCls} /></Field>
                <Field label="E-mail"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className={inputCls} /></Field>
                <div className="sm:col-span-2"><Field label="Complete Address"><input value={completeAddress} onChange={e => setCompleteAddress(e.target.value)} placeholder="Street, Barangay, City, Province" className={inputCls} /></Field></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <SectionTitle>Special Categories</SectionTitle>
              <div className="divide-y divide-gray-100">
                {SPECIAL_CATEGORIES.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-xs font-semibold text-gray-700 flex-1">{label}</span>
                    <div className="flex gap-4 shrink-0">
                      {["Yes", "No"].map(opt => (
                        <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name={key} value={opt} checked={special[key] === opt}
                            onChange={() => setSpecial(p => ({ ...p, [key]: opt }))} style={{ accentColor: MAROON }} />
                          <span className="text-sm font-medium text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Parents ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <SectionTitle>Father&apos;s Information</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><Field label="Name"><input value={fatherName} onChange={e => setFatherName(e.target.value)} placeholder="Full Name" className={inputCls} /></Field></div>
                <Field label="Date of Birth"><input type="date" value={fatherDOB} onChange={e => setFatherDOB(e.target.value)} className={inputCls} /></Field>
                <Field label="Contact No."><input value={fatherContact} onChange={e => setFatherContact(e.target.value)} placeholder="09XXXXXXXXX" className={inputCls} /></Field>
                <div className="sm:col-span-2"><Field label="Address"><input value={fatherAddress} onChange={e => setFatherAddress(e.target.value)} placeholder="Address" className={inputCls} /></Field></div>
                <Field label="Educational Attainment"><input value={fatherEduc} onChange={e => setFatherEduc(e.target.value)} placeholder="e.g. College Graduate" className={inputCls} /></Field>
                <Field label="Occupation"><input value={fatherOccupation} onChange={e => setFatherOccupation(e.target.value)} placeholder="Occupation" className={inputCls} /></Field>
                <Field label="Monthly Income"><input value={fatherIncome} onChange={e => setFatherIncome(e.target.value)} placeholder="e.g. ₱15,000" className={inputCls} /></Field>
                <Field label="Language Spoken"><input value={fatherLanguage} onChange={e => setFatherLanguage(e.target.value)} placeholder="e.g. Filipino" className={inputCls} /></Field>
                <Field label="Religion"><input value={fatherReligion} onChange={e => setFatherReligion(e.target.value)} placeholder="Religion" className={inputCls} /></Field>
                <Field label="OFW / Country"><input value={fatherOFW} onChange={e => setFatherOFW(e.target.value)} placeholder="Country (if OFW)" className={inputCls} /></Field>
                <Field label="Years of Stay Abroad"><input value={fatherYearsAbroad} onChange={e => setFatherYearsAbroad(e.target.value)} placeholder="e.g. 3 years" className={inputCls} /></Field>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <SectionTitle>Mother&apos;s Information</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><Field label="Name"><input value={motherName} onChange={e => setMotherName(e.target.value)} placeholder="Full Name" className={inputCls} /></Field></div>
                <Field label="Date of Birth"><input type="date" value={motherDOB} onChange={e => setMotherDOB(e.target.value)} className={inputCls} /></Field>
                <Field label="Contact No."><input value={motherContact} onChange={e => setMotherContact(e.target.value)} placeholder="09XXXXXXXXX" className={inputCls} /></Field>
                <div className="sm:col-span-2"><Field label="Address"><input value={motherAddress} onChange={e => setMotherAddress(e.target.value)} placeholder="Address" className={inputCls} /></Field></div>
                <Field label="Educational Attainment"><input value={motherEduc} onChange={e => setMotherEduc(e.target.value)} placeholder="e.g. College Graduate" className={inputCls} /></Field>
                <Field label="Occupation"><input value={motherOccupation} onChange={e => setMotherOccupation(e.target.value)} placeholder="Occupation" className={inputCls} /></Field>
                <Field label="Monthly Income"><input value={motherIncome} onChange={e => setMotherIncome(e.target.value)} placeholder="e.g. ₱15,000" className={inputCls} /></Field>
                <Field label="Language Spoken"><input value={motherLanguage} onChange={e => setMotherLanguage(e.target.value)} placeholder="e.g. Filipino" className={inputCls} /></Field>
                <Field label="Religion"><input value={motherReligion} onChange={e => setMotherReligion(e.target.value)} placeholder="Religion" className={inputCls} /></Field>
                <Field label="OFW / Country"><input value={motherOFW} onChange={e => setMotherOFW(e.target.value)} placeholder="Country (if OFW)" className={inputCls} /></Field>
                <Field label="Years of Stay Abroad"><input value={motherYearsAbroad} onChange={e => setMotherYearsAbroad(e.target.value)} placeholder="e.g. 3 years" className={inputCls} /></Field>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <SectionTitle>Parents&apos; Marital Status</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MARITAL_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all"
                    style={maritalStatus === opt ? { borderColor: MAROON, background: "#fef2f2" } : { borderColor: "#e5e7eb", background: "#fafafa" }}>
                    <input type="radio" name="marital" value={opt} checked={maritalStatus === opt} onChange={() => setMaritalStatus(opt)} style={{ accentColor: MAROON }} />
                    <span className="text-xs font-medium" style={{ color: maritalStatus === opt ? MAROON : "#374151" }}>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Siblings & Guardian ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <SectionTitle>Siblings (Eldest to Youngest — Include Yourself)</SectionTitle>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Name</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">School / Work</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Age</span>
                  <span />
                </div>
                {siblings.map((sib, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_80px_32px] gap-2">
                    <input value={sib.name} onChange={e => setSiblings(prev => prev.map((s,j) => j===i?{...s,name:e.target.value}:s))} placeholder="Full name" className={inputCls} />
                    <input value={sib.schoolWork} onChange={e => setSiblings(prev => prev.map((s,j) => j===i?{...s,schoolWork:e.target.value}:s))} placeholder="School/Company" className={inputCls} />
                    <input type="number" min="1" value={sib.age} onChange={e => setSiblings(prev => prev.map((s,j) => j===i?{...s,age:e.target.value}:s))} placeholder="Age" className={inputCls} />
                    <button onClick={() => setSiblings(prev => prev.filter((_,j) => j!==i))} disabled={siblings.length<=1}
                      className="w-8 h-9 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button onClick={() => setSiblings(prev => [...prev, emptySibling()])}
                  className="flex items-center gap-1.5 text-xs font-semibold mt-2 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 transition-all">
                  <Plus size={12} /> Add Sibling
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <SectionTitle>Guardian Information</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name of Guardian (if not living with parents)"><input value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Full Name" className={inputCls} /></Field>
                <Field label="Contact No."><input value={guardianContact} onChange={e => setGuardianContact(e.target.value)} placeholder="09XXXXXXXXX" className={inputCls} /></Field>
                <div className="sm:col-span-2"><Field label="Address"><input value={guardianAddress} onChange={e => setGuardianAddress(e.target.value)} placeholder="Address" className={inputCls} /></Field></div>
                <Field label="Person to Contact in Case of Emergency"><input value={emergencyPerson} onChange={e => setEmergencyPerson(e.target.value)} placeholder="Full Name" className={inputCls} /></Field>
                <Field label="Emergency Contact No."><input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} placeholder="09XXXXXXXXX" className={inputCls} /></Field>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Educational Background ── */}
        {step === 3 && (
          <div className="space-y-5">
            {([
              ["elementary","Elementary Level"],["juniorHigh","Junior High School"],
              ["seniorHigh","Senior High School"],["tertiary","Tertiary Level"],
              ["techVoc","Technical Vocational Training (If Applicable)"],
            ] as [keyof EducBackground, string][]).map(([key, label]) => (
              <div key={key} className="bg-white rounded-xl border border-gray-200 p-5">
                <SectionTitle>{label}</SectionTitle>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_2fr_120px_32px] gap-2 px-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Level / Grade</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">School Attended</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Years</span>
                    <span />
                  </div>
                  {educBackground[key].map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_2fr_120px_32px] gap-2">
                      <input value={row.level} onChange={e => updateEduc(key,i,"level",e.target.value)} placeholder="e.g. Grade 6" className={inputCls} />
                      <input value={row.school} onChange={e => updateEduc(key,i,"school",e.target.value)} placeholder="School name" className={inputCls} />
                      <input value={row.years} onChange={e => updateEduc(key,i,"years",e.target.value)} placeholder="e.g. 2018-2019" className={inputCls} />
                      <button onClick={() => removeEducRow(key,i)} disabled={educBackground[key].length<=1}
                        className="w-8 h-9 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addEducRow(key)}
                    className="flex items-center gap-1.5 text-xs font-semibold mt-1 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 transition-all">
                    <Plus size={12} /> Add Row
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 4: Awards & Organizations ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <SectionTitle>Awards / Honors Received</SectionTitle>
              <textarea value={awards} onChange={e => setAwards(e.target.value)} rows={3}
                placeholder="List any awards or honors you have received..."
                className={textareaCls} />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <SectionTitle>Membership in Organizations</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Academic Organization</p>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_100px] gap-1 px-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Name</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Position</span>
                    </div>
                    {organizations.academic.map((org, i) => (
                      <div key={i} className="grid grid-cols-[1fr_100px] gap-1">
                        <input value={org.name} onChange={e => updateOrg("academic",i,"name",e.target.value)} placeholder="Organization" className={inputCls} />
                        <input value={org.position} onChange={e => updateOrg("academic",i,"position",e.target.value)} placeholder="Position" className={inputCls} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Non-Academic Organization</p>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_100px] gap-1 px-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Name</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Position</span>
                    </div>
                    {organizations.nonAcademic.map((org, i) => (
                      <div key={i} className="grid grid-cols-[1fr_100px] gap-1">
                        <input value={org.name} onChange={e => updateOrg("nonAcademic",i,"name",e.target.value)} placeholder="Organization" className={inputCls} />
                        <input value={org.position} onChange={e => updateOrg("nonAcademic",i,"position",e.target.value)} placeholder="Position" className={inputCls} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: Unique Features ── */}
        {step === 5 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <SectionTitle>Unique Features</SectionTitle>
            {[
              ["Interests",                    interests,       setInterests],
              ["Talents",                      talents,         setTalents],
              ["Hobbies",                      hobbies,         setHobbies],
              ["Goals in Life",                goals,           setGoals],
              ["Principle in Life",            principles,      setPrinciples],
              ["Characteristics that describe you best", characteristics, setCharacteristics],
              ["Present Fears",                fears,           setFears],
            ].map(([label, val, setter]) => (
              <Field key={label as string} label={label as string}>
                <input value={val as string} onChange={e => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                  placeholder={`Your ${(label as string).toLowerCase()}...`} className={inputCls} />
              </Field>
            ))}
          </div>
        )}

        {/* ── STEP 6: Health & Signature ── */}
        {step === 6 && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <SectionTitle>Physical / Mental Health Information</SectionTitle>

              {/* Health - Academics */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  A1. Do you have any health problems or physical limitations which may hinder you from performing well in your <span className="font-bold">academics</span>?
                </p>
                <div className="flex gap-3 mb-2">
                  {["No","Yes"].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="healthAcad" value={opt} checked={healthAcademics===opt} onChange={() => setHealthAcademics(opt)} style={{ accentColor: MAROON }} />
                      <span className="text-sm font-medium text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
                {healthAcademics === "Yes" && (
                  <input value={healthAcademicsSpec} onChange={e => setHealthAcademicsSpec(e.target.value)}
                    placeholder="Please specify..." className={inputCls} />
                )}
              </div>

              {/* Health - Extracurricular */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  A2. Do you have any health problems or physical limitations which may hinder you from performing well in your <span className="font-bold">extra-curricular activities</span>?
                </p>
                <div className="flex gap-3 mb-2">
                  {["No","Yes"].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="healthExtra" value={opt} checked={healthExtra===opt} onChange={() => setHealthExtra(opt)} style={{ accentColor: MAROON }} />
                      <span className="text-sm font-medium text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
                {healthExtra === "Yes" && (
                  <input value={healthExtraSpec} onChange={e => setHealthExtraSpec(e.target.value)}
                    placeholder="Please specify..." className={inputCls} />
                )}
              </div>

              {/* Psychiatric */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">B. Have you ever sought psychiatric assessment or help?</p>
                <div className="flex gap-3">
                  {["Yes","No"].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="psychiatric" value={opt} checked={psychiatricHelp===opt} onChange={() => setPsychiatricHelp(opt)} style={{ accentColor: MAROON }} />
                      <span className="text-sm font-medium text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Counseling */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">C. Have you ever undergone counseling?</p>
                <div className="flex gap-3 mb-2">
                  {["Yes","No"].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="counseling" value={opt} checked={counseling===opt} onChange={() => setCounseling(opt)} style={{ accentColor: MAROON }} />
                      <span className="text-sm font-medium text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
                {counseling === "Yes" && (
                  <input value={counselingSpec} onChange={e => setCounselingSpec(e.target.value)}
                    placeholder="Please specify..." className={inputCls} />
                )}
              </div>
            </div>

            {/* Passport Photo */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <SectionTitle>Passport Size Photo</SectionTitle>
              <p className="text-xs text-gray-500">Upload your photo. You&apos;ll crop it to passport size (2×3) before it&apos;s saved.</p>
              <PhotoCropUpload
                url={photoUrl}
                onUploaded={setPhotoUrl}
                onRemove={() => setPhotoUrl("")}
                courseId={courseId}
              />
            </div>

            {/* Signature */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <SectionTitle>Signature <span className="text-red-500">*</span></SectionTitle>
              <p className="text-xs text-gray-500">Draw your signature in the box below, then click &quot;Save Signature&quot;.</p>
              {signatureSaved ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signatureUrl} alt="Signature" className="h-16 border border-gray-200 rounded-lg bg-white p-1" />
                  <button onClick={() => { setSignatureSaved(false); setSignatureUrl(""); }}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1">
                    <X size={12} /> Redo
                  </button>
                </div>
              ) : (
                <div>
                  <SignaturePad onSave={handleSignatureSave} />
                  {sigUploading && <p className="text-xs text-gray-500 mt-1">{sigUploading}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 7: Review & Submit ── */}
        {step === 7 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <SectionTitle>Review Your Information</SectionTitle>
              <div className="space-y-2 text-sm">
                {[
                  ["Student No.",    studentNo],
                  ["Name",           name],
                  ["Course",         courseProgram],
                  ["Year & Section", yearSection],
                  ["Age",            age !== null ? String(age) : ""],
                  ["Sex",            sex],
                  ["Date of Birth",  dateOfBirth],
                  ["Mobile No.",     mobileNo],
                  ["Email",          email],
                  ["Address",        completeAddress],
                  ["Marital Status (Parents)", maritalStatus],
                ].map(([label, val]) => val ? (
                  <div key={label} className="flex gap-3 py-1 border-b border-gray-50">
                    <span className="text-gray-400 font-medium shrink-0 w-40">{label}</span>
                    <span className="text-gray-800 font-semibold">{val}</span>
                  </div>
                ) : null)}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {signatureUrl && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Signature</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signatureUrl} alt="Signature" className="h-12 border border-gray-200 rounded bg-white p-1" />
                  </div>
                )}
                {photoUrl && (
                  <div className="ml-auto">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Photo</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl} alt="Photo" className="w-14 h-16 object-cover rounded border border-gray-200" />
                  </div>
                )}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              <p className="font-bold mb-1">Data Privacy Notice</p>
              <p className="leading-relaxed">
                By submitting this form, I certify that all information provided is complete and accurate. I allow Pampanga State University through the Counseling &amp; Testing Center to collect, record, organize, and utilize my personal data pursuant to Republic Act No. 10173 (Data Privacy Act of 2012).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 max-w-2xl mx-auto">
        {step > 0 && (
          <button onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
            <ChevronLeft size={15} /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: MAROON }}>
            Next <ChevronRight size={15} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: MAROON }}>
            {submitting
              ? <><RefreshCw size={14} className="animate-spin" /> Submitting...</>
              : <><Check size={14} /> Submit Information Sheet</>}
          </button>
        )}
      </div>
    </div>
  );
}