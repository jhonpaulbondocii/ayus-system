"use client";

// src/app/forms/library/[courseId]/page.tsx
// PUBLIC — no auth required

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check, AlertCircle,
  RefreshCw, BookOpen, X, Upload, FileText,
} from "lucide-react";
import "react-image-crop/dist/ReactCrop.css";

const MAROON = "#7b1113";
const FONT   = "'Inter', system-ui, sans-serif";

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white placeholder:text-gray-400";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

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

type AppType = "STUDENT_NEW" | "STUDENT_LOST" | "EMPLOYEE" | "";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
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

/* ── Upload Field ── */
function UploadField({
  label, required, hint, accept, url, uploading, inputRef,
  onFileChange, onRemove,
  preview = false,
}: {
  label: string; required?: boolean; hint?: string; accept: string;
  url: string; uploading: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  preview?: boolean;
}) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {hint && <p className="text-[11px] text-gray-400 mb-2">{hint}</p>}
      {url ? (
        <div className="flex items-center gap-3">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="w-16 h-20 object-cover rounded-lg border border-gray-200" />
          )}
          {!preview && (
            <div className="flex items-center gap-2 flex-1 p-3 rounded-lg border border-green-200 bg-green-50">
              <Check size={14} className="text-green-500 shrink-0" />
              <span className="text-xs font-semibold text-green-700 flex-1 truncate">{label} uploaded</span>
            </div>
          )}
          <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 shrink-0">
            <X size={11} /> Remove
          </button>
        </div>
      ) : (
        <div>
          <input ref={inputRef} type="file" accept={accept} onChange={onFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-gray-400 transition-all w-full justify-center"
          >
            <Upload size={15} />
            {uploading || `Upload ${label}`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Photo Crop Upload ── */
function PhotoCropUpload({
  label, required, hint, url, uploading, onUploaded, onRemove, courseId,
}: {
  label: string; required?: boolean; hint?: string;
  url: string; uploading: string;
  onUploaded: (u: string) => void;
  onRemove: () => void;
  courseId: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: ReactCrop, centerCrop, makeAspectCrop } = require("react-image-crop") as typeof import("react-image-crop");
  type Crop = import("react-image-crop").Crop;
  const [srcImg,     setSrcImg]     = useState<string | null>(null);
  const [crop,       setCrop]       = useState<Crop>();
  const [status,     setStatus]     = useState("");
  const imgRef       = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSrcImg(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    const c = centerCrop(
      makeAspectCrop({ unit: "%", width: 80 }, 2 / 3, width, height),
      width, height,
    );
    setCrop(c);
  };

  const handleCropSave = async () => {
    const img = imgRef.current;
    if (!img || !crop) return;
    setStatus("Processing...");
    const canvas = document.createElement("canvas");
    const pixelCrop = {
      x:      (crop.unit === "%" ? (crop.x      / 100) * img.naturalWidth  : crop.x),
      y:      (crop.unit === "%" ? (crop.y      / 100) * img.naturalHeight : crop.y),
      width:  (crop.unit === "%" ? (crop.width  / 100) * img.naturalWidth  : crop.width),
      height: (crop.unit === "%" ? (crop.height / 100) * img.naturalHeight : crop.height),
    };
    canvas.width  = 600;
    canvas.height = 900;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, 600, 900);
    canvas.toBlob(async (blob) => {
      if (!blob) { setStatus("Failed. Try again."); return; }
      const fd = new FormData();
      fd.append("file", blob, "passport-photo.jpg");
      try {
        const res  = await fetch(`/api/library/${courseId}/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onUploaded(data.fileUrl);
        setSrcImg(null);
        setStatus("");
      } catch { setStatus("Upload failed. Try again."); }
    }, "image/jpeg", 0.92);
  };

  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {hint && <p className="text-[11px] text-gray-400 mb-2">{hint}</p>}
      {srcImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" style={{ fontFamily: FONT }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background: MAROON }}>
              <p className="text-sm font-black text-white">Crop Photo</p>
              <button onClick={() => setSrcImg(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10">
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
              <button onClick={() => setSrcImg(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
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
          <img src={url} alt="Photo" className="w-16 h-24 object-cover rounded-lg border border-gray-200" />
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-green-600 flex items-center gap-1"><Check size={11} /> Photo cropped & uploaded</p>
            <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><X size={11} /> Remove</button>
          </div>
        </div>
      ) : (
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-gray-400 transition-all w-full justify-center">
            <Upload size={15} />
            {uploading || `Upload ${label}`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Signature Pad ── */
function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: (e as React.MouseEvent).clientX - r.left, y: (e as React.MouseEvent).clientY - r.top };
  };
  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    drawing.current = true;
    const p = getPos(e, c); ctx.beginPath(); ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const p = getPos(e, c);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#111";
    ctx.lineTo(p.x, p.y); ctx.stroke(); setHasDrawn(true);
  };
  const end = () => { drawing.current = false; };
  const clear = () => {
    const c = canvasRef.current; if (!c) return;
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  };

  return (
    <div>
      <canvas
        ref={canvasRef} width={500} height={120}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-white touch-none cursor-crosshair"
        style={{ maxHeight: 120 }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={clear}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
          <X size={11} /> Clear
        </button>
        <button
          type="button"
          onClick={() => { const c = canvasRef.current; if (c) onSave(c.toDataURL("image/png")); }}
          disabled={!hasDrawn}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
          style={{ background: MAROON }}
        >
          <Check size={11} /> Save Signature
        </button>
      </div>
    </div>
  );
}

/* ── Step definitions ── */
const STEPS_STUDENT = ["Application Type", "Personal Info", "School Info", "Documents", "Consent & Signature", "Review & Submit"];
const STEPS_EMPLOYEE = ["Application Type", "Personal Info", "Employee Info", "Documents", "Consent & Signature", "Review & Submit"];

export default function LibraryFormPage() {
  const params   = useParams();
  const courseId = params.courseId as string;

  const [step,        setStep]        = useState(0);
  const [officeName,  setOfficeName]  = useState("");
  const [officeReady, setOfficeReady] = useState(false);
  const [officeError, setOfficeError] = useState("");
  const [submitted,   setSubmitted]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Step 0 — Application Type
  const [appType, setAppType] = useState<AppType>("");

  // Step 1 — Personal Info
  const [name,      setName]      = useState("");
  const [sex,       setSex]       = useState("");
  const [address,   setAddress]   = useState("");
  const [contactNo, setContactNo] = useState("");
  const [email,     setEmail]     = useState("");

  // Step 2 — Student Info
  const [studentNo,     setStudentNo]     = useState("");
  const [courseProgram, setCourseProgram] = useState("");
  const [yearSection,   setYearSection]   = useState("");
  const [reason,        setReason]        = useState("");

  // Step 2 — Employee Info
  const [employeeNo,   setEmployeeNo]   = useState("");
  const [collegeDept,  setCollegeDept]  = useState("");
  const [position,     setPosition]     = useState("");
  const [employeeType, setEmployeeType] = useState("");

  // Step 3 — Documents
  const [photoUrl,       setPhotoUrl]       = useState("");
  const [photoUploading, setPhotoUploading] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  const [corUrl,       setCorUrl]       = useState("");
  const [corUploading, setCorUploading] = useState("");
  const corRef = useRef<HTMLInputElement>(null);

  const [affidavitUrl,       setAffidavitUrl]       = useState("");
  const [affidavitUploading, setAffidavitUploading] = useState("");
  const affidavitRef = useRef<HTMLInputElement>(null);

  // Step 4 — Signature
  const [signatureUrl,   setSignatureUrl]   = useState("");
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [sigUploading,   setSigUploading]   = useState("");

  // Duplicate check
  const [checkingDup, setCheckingDup] = useState(false);
  const [dupWarning,  setDupWarning]  = useState("");
  const dupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const STEPS = appType === "EMPLOYEE" ? STEPS_EMPLOYEE : STEPS_STUDENT;
  const isStudent  = appType === "STUDENT_NEW" || appType === "STUDENT_LOST";
  const isEmployee = appType === "EMPLOYEE";

  useEffect(() => {
    fetch(`/api/library/${courseId}/info`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setOfficeError(d.error); return; }
        setOfficeName(d.name); setOfficeReady(true);
      })
      .catch(() => setOfficeError("Failed to load form. Please try again."));
  }, [courseId]);

  const checkDup = (no: string, field: "studentNo" | "employeeNo") => {
    setDupWarning("");
    if (dupTimeout.current) clearTimeout(dupTimeout.current);
    if (!no.trim()) return;
    dupTimeout.current = setTimeout(async () => {
      setCheckingDup(true);
      try {
        const res  = await fetch(`/api/library/${courseId}/submit?${field}=${encodeURIComponent(no.trim())}`);
        const data = await res.json();
        if (data.exists)
          setDupWarning(`An active request already exists for this number (Status: ${data.status}). Please contact the Library Office.`);
      } catch { /* ignore */ }
      finally { setCheckingDup(false); }
    }, 700);
  };

  const upload = useCallback(async (file: File | string, isDataUrl = false): Promise<string> => {
    const fd = new FormData();
    if (isDataUrl) {
      const res  = await fetch(file as string);
      const blob = await res.blob();
      fd.append("file", blob, "signature.png");
    } else {
      fd.append("file", file as File);
    }
    const res  = await fetch(`/api/library/${courseId}/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.fileUrl;
  }, [courseId]);

  const handleFileUpload = async (
    file: File,
    setUrl: (u: string) => void,
    setStatus: (s: string) => void,
    label: string,
  ) => {
    setStatus("Uploading...");
    try { setUrl(await upload(file)); setStatus(""); }
    catch { setStatus(`${label} upload failed. Try again.`); }
  };

  const handleSignatureSave = async (dataUrl: string) => {
    setSigUploading("Uploading signature...");
    try {
      setSignatureUrl(await upload(dataUrl, true));
      setSignatureSaved(true);
      setSigUploading("");
    } catch { setSigUploading("Signature upload failed. Try again."); }
  };

  const validateStep = (): string | null => {
    if (step === 0 && !appType) return "Please select an application type.";
    if (step === 1) {
      if (!name.trim()) return "Full name is required.";
    }
    if (step === 2) {
      if (isStudent) {
        if (!studentNo.trim())     return "Student number is required.";
        if (!courseProgram.trim()) return "Course / Program is required.";
        if (dupWarning)            return "Please resolve the duplicate request first.";
      }
      if (isEmployee) {
        if (!employeeNo.trim()) return "Employee number is required.";
        if (!employeeType)      return "Employee type is required.";
        if (dupWarning)         return "Please resolve the duplicate request first.";
      }
    }
    if (step === 3) {
      if (!photoUrl) return `Please upload your ${isEmployee ? "1×1" : "passport size"} photo.`;
      if (appType === "STUDENT_LOST" && !affidavitUrl) return "Please upload the Affidavit of Lost.";
    }
    if (step === 4) {
      if (!signatureUrl) return "Please draw and save your signature.";
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
    const err = validateStep();
    if (err) { setSubmitError(err); return; }
    setSubmitting(true); setSubmitError("");
    try {
      const applicantType = isEmployee ? "EMPLOYEE" : "STUDENT";
      const cardType      = appType === "STUDENT_NEW" ? "NEW" : appType === "STUDENT_LOST" ? "LOST" : "NEW";

      const res = await fetch(`/api/library/${courseId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: appType, applicantType, cardType,
          employeeType: isEmployee ? employeeType : null,
          name, sex, address, contactNo, email, reason: reason || null,
          studentNo:     isStudent  ? studentNo     : null,
          courseProgram: isStudent  ? courseProgram : null,
          yearSection:   isStudent  ? yearSection   : null,
          employeeNo:    isEmployee ? employeeNo    : null,
          collegeDept:   isEmployee ? collegeDept   : null,
          position:      isEmployee ? position      : null,
          photoUrl:      photoUrl      || null,
          corIdUrl:      corUrl        || null,
          affidavitUrl:  affidavitUrl  || null,
          signatureUrl:  signatureUrl  || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? "Submission failed."); return; }
      setSubmitted(true);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally { setSubmitting(false); }
  };

  /* ── Loading / Error / Success ── */
  if (!officeReady && !officeError)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ fontFamily: FONT }}>
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );

  if (officeError)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4" style={{ fontFamily: FONT }}>
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-gray-600 text-center">{officeError}</p>
      </div>
    );

  if (submitted)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ fontFamily: FONT }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#f0fdf4" }}>
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-1">Request Submitted!</h1>
          <p className="text-sm text-gray-500 max-w-sm">
            Your Library Card request has been received by <strong>{officeName}</strong>.
            Please wait for processing and visit the library to claim your card.
          </p>
        </div>
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-xs text-gray-500 text-center space-y-1">
          <p>Name: <span className="font-semibold text-gray-800">{name}</span></p>
          {studentNo  && <p>Student No.: <span className="font-semibold text-gray-800">{studentNo}</span></p>}
          {employeeNo && <p>Employee No.: <span className="font-semibold text-gray-800">{employeeNo}</span></p>}
          <p className="mt-2 text-[11px] text-gray-400">You may now close this page.</p>
        </div>
      </div>
    );

  const activeSteps = appType ? STEPS : STEPS_STUDENT;

  return (
    <div className="min-h-screen bg-gray-50 pb-32" style={{ fontFamily: FONT }}>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: MAROON }}>
            <BookOpen size={16} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pampanga State University</p>
            <p className="text-sm font-bold text-gray-900 truncate">{officeName || "Library"} — Card Request Form</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-1">
            {activeSteps.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 transition-all ${
                    i <= step ? "text-white" : "text-gray-400 border border-gray-300"
                  }`}
                  style={i <= step ? { background: MAROON } : {}}
                >
                  {i < step ? <Check size={10} /> : i + 1}
                </div>
                <span className={`text-[10px] font-semibold hidden sm:block truncate ${i === step ? "text-gray-800" : "text-gray-400"}`}>
                  {s}
                </span>
                {i < activeSteps.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {submitError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {submitError}
          </div>
        )}

        {/* ── STEP 0: Application Type ── */}
        {step === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionTitle>What type of request is this?</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                ["STUDENT_NEW",  "Student — New Card",  "For currently enrolled students applying for a new library card."],
                ["STUDENT_LOST", "Student — Lost Card", "Replacement for a lost card. Requires Affidavit of Lost."],
                ["EMPLOYEE",     "Employee Card",       "For faculty and non-teaching staff."],
              ] as [AppType, string, string][]).map(([val, title, desc]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => { setAppType(val); setSubmitError(""); setDupWarning(""); }}
                  className="rounded-xl border-2 p-4 text-left transition-all"
                  style={appType === val
                    ? { borderColor: MAROON, background: "#fef2f2" }
                    : { borderColor: "#e5e7eb", background: "#fafafa" }}
                >
                  <p className="text-sm font-bold mb-1" style={{ color: appType === val ? MAROON : "#111827" }}>{title}</p>
                  <p className="text-[11px] text-gray-500 leading-snug">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: Personal Info ── */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <SectionTitle>Personal Information</SectionTitle>
            <div className="sm:col-span-2">
              <Field label="Complete Name" required>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Last, First Middle" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Sex">
                <select value={sex} onChange={e => setSex(e.target.value)} className={inputCls}>
                  <option value="">— Select —</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </Field>
              <Field label="Contact No.">
                <input value={contactNo} onChange={e => setContactNo(e.target.value)} placeholder="09XXXXXXXXX" className={inputCls} />
              </Field>
              <Field label="Email Address">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@psu.edu.ph" className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Complete Address">
                  <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, Barangay, City, Province" className={inputCls} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Student Info ── */}
        {step === 2 && isStudent && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <SectionTitle>Student Information</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Student No." required>
                <div className="relative">
                  <input
                    value={studentNo}
                    onChange={e => { setStudentNo(e.target.value); checkDup(e.target.value, "studentNo"); }}
                    placeholder="e.g. 2024-0001"
                    className={inputCls}
                  />
                  {checkingDup && <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                </div>
                {dupWarning && <p className="text-[11px] text-amber-600 mt-1 leading-snug">{dupWarning}</p>}
              </Field>
              <Field label="Course / Program" required>
                <select value={courseProgram} onChange={e => setCourseProgram(e.target.value)} className={inputCls}>
                  <option value="">— Select —</option>
                  {Object.values(COURSES_BY_DEPARTMENT).flat().map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Year & Section">
                <input value={yearSection} onChange={e => setYearSection(e.target.value)} placeholder="e.g. 2-A" className={inputCls} />
              </Field>
            </div>
            {appType === "STUDENT_LOST" && (
              <Field label="Reason for Loss">
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Briefly describe how you lost your card" className={inputCls} />
              </Field>
            )}
          </div>
        )}

        {/* ── STEP 2: Employee Info ── */}
        {step === 2 && isEmployee && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <SectionTitle>Employee Information</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Employee No." required>
                <div className="relative">
                  <input
                    value={employeeNo}
                    onChange={e => { setEmployeeNo(e.target.value); checkDup(e.target.value, "employeeNo"); }}
                    placeholder="Employee number"
                    className={inputCls}
                  />
                  {checkingDup && <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                </div>
                {dupWarning && <p className="text-[11px] text-amber-600 mt-1 leading-snug">{dupWarning}</p>}
              </Field>
              <Field label="Employee Type" required>
                <select value={employeeType} onChange={e => setEmployeeType(e.target.value)} className={inputCls}>
                  <option value="">— Select —</option>
                  <option>Academic Personnel</option>
                  <option>Academic-Related Personnel</option>
                  <option>Non-Academic Personnel</option>
                </select>
              </Field>
              <Field label="College / Department">
                <input value={collegeDept} onChange={e => setCollegeDept(e.target.value)} placeholder="e.g. College of Engineering" className={inputCls} />
              </Field>
              <Field label="Position">
                <input value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Instructor I" className={inputCls} />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 3: Documents ── */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Photo */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <SectionTitle>{isEmployee ? "1×1 ID Photo" : "Passport Size Photo"}</SectionTitle>
              {isEmployee ? (
                <UploadField
                  label="1×1 Photo"
                  required
                  hint="Upload a recent 1×1 ID photo (white background preferred)."
                  accept="image/*"
                  url={photoUrl}
                  uploading={photoUploading}
                  inputRef={photoRef}
                  onFileChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, setPhotoUrl, setPhotoUploading, "Photo"); }}
                  onRemove={() => { setPhotoUrl(""); if (photoRef.current) photoRef.current.value = ""; }}
                  preview
                />
              ) : (
                <PhotoCropUpload
                  label="Passport Size Photo"
                  required
                  hint="Upload your photo — you'll crop it to passport size (2×3) before submitting."
                  url={photoUrl}
                  uploading={photoUploading}
                  onUploaded={setPhotoUrl}
                  onRemove={() => setPhotoUrl("")}
                  courseId={courseId}
                />
              )}
            </div>

            {/* COR / ID — Student only */}
            {isStudent && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <SectionTitle>COR / Validated ID</SectionTitle>
                <UploadField
                  label="COR or Validated ID"
                  hint="Upload your Certificate of Registration (COR) or your school-validated ID."
                  accept="image/*,.pdf"
                  url={corUrl}
                  uploading={corUploading}
                  inputRef={corRef}
                  onFileChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, setCorUrl, setCorUploading, "COR/ID"); }}
                  onRemove={() => { setCorUrl(""); if (corRef.current) corRef.current.value = ""; }}
                />
              </div>
            )}

            {/* Affidavit — Lost card only */}
            {appType === "STUDENT_LOST" && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <SectionTitle>Affidavit of Lost</SectionTitle>
                <div className="flex items-center justify-between mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-amber-800">Need the template?</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">Download, print, fill out, and have it notarized before uploading.</p>
                  </div>
                  <a
                    href="/template/affidavit-of-lost.docx"
                    download
                    className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg text-white ml-3"
                    style={{ background: MAROON }}
                  >
                    <FileText size={12} /> Download
                  </a>
                </div>
                <UploadField
                  label="Affidavit of Lost"
                  required
                  hint="Upload a scanned copy or clear photo of your signed and notarized Affidavit of Lost."
                  accept="image/*,.pdf"
                  url={affidavitUrl}
                  uploading={affidavitUploading}
                  inputRef={affidavitRef}
                  onFileChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, setAffidavitUrl, setAffidavitUploading, "Affidavit"); }}
                  onRemove={() => { setAffidavitUrl(""); if (affidavitRef.current) affidavitRef.current.value = ""; }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Consent & Signature ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <SectionTitle>Data Privacy Consent</SectionTitle>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
                By signing below, I give my consent to <strong>Pampanga State University</strong> to collect and
                process my personal information in accordance with <strong>Republic Act No. 10173</strong> (Data
                Privacy Act of 2012) for the purpose of issuing a Library Card.
              </div>
              <div>
                <p className={labelCls}>Signature over Printed Name <span className="text-red-500">*</span></p>
                <p className="text-[11px] text-gray-400 mb-2">Draw your signature in the box below, then click &ldquo;Save Signature&rdquo;.</p>
                {signatureSaved ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signatureUrl} alt="Signature" className="h-16 border border-gray-200 rounded-lg bg-white p-1" />
                    <button
                      onClick={() => { setSignatureSaved(false); setSignatureUrl(""); }}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
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
          </div>
        )}

        {/* ── STEP 5: Review & Submit ── */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <SectionTitle>Review Your Request</SectionTitle>
              <div className="space-y-1.5">
                {[
                  ["Application Type", appType === "STUDENT_NEW" ? "Student — New Card" : appType === "STUDENT_LOST" ? "Student — Lost Card" : "Employee Card"],
                  ["Name",             name],
                  ["Sex",              sex],
                  ["Contact No.",      contactNo],
                  ["Email",            email],
                  ["Address",          address],
                  ...(isStudent ? [
                    ["Student No.",      studentNo],
                    ["Course / Program", courseProgram],
                    ["Year & Section",   yearSection],
                  ] : [
                    ["Employee No.",   employeeNo],
                    ["Employee Type",  employeeType],
                    ["College / Dept", collegeDept],
                    ["Position",       position],
                  ]),
                ].map(([label, val]) => val ? (
                  <div key={label} className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-400 font-medium w-40 shrink-0">{label}</span>
                    <span className="text-xs text-gray-800 font-semibold">{val}</span>
                  </div>
                ) : null)}
              </div>
            </div>

            {/* Uploaded docs preview */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <SectionTitle>Uploaded Documents</SectionTitle>
              <div className="flex flex-wrap gap-3">
                {photoUrl && (
                  <div className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl} alt="Photo" className="w-16 h-20 object-cover rounded-lg border border-gray-200" />
                    <span className="text-[10px] text-gray-400 font-medium">Photo</span>
                  </div>
                )}
                {corUrl && (
                  <div className="flex flex-col items-center justify-center gap-1 w-16 h-20 rounded-lg border border-gray-200 bg-gray-50">
                    <FileText size={20} className="text-gray-400" />
                    <span className="text-[10px] text-gray-400 font-medium text-center">COR/ID</span>
                  </div>
                )}
                {affidavitUrl && (
                  <div className="flex flex-col items-center justify-center gap-1 w-16 h-20 rounded-lg border border-gray-200 bg-gray-50">
                    <FileText size={20} className="text-gray-400" />
                    <span className="text-[10px] text-gray-400 font-medium text-center leading-tight">Affidavit</span>
                  </div>
                )}
                {signatureUrl && (
                  <div className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signatureUrl} alt="Signature" className="h-20 border border-gray-200 rounded-lg bg-white p-1 object-contain" style={{ width: 80 }} />
                    <span className="text-[10px] text-gray-400 font-medium">Signature</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center px-4">
              By submitting, you confirm that all information provided is accurate and complete.
            </p>
          </div>
        )}
      </div>

      {/* Fixed bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 max-w-2xl mx-auto">
        {step > 0 && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
          >
            <ChevronLeft size={15} /> Back
          </button>
        )}
        {step < activeSteps.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={step === 0 && !appType}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: MAROON }}
          >
            Next <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: MAROON }}
          >
            {submitting
              ? <><RefreshCw size={14} className="animate-spin" /> Submitting...</>
              : <><Check size={14} /> Submit Request</>}
          </button>
        )}
      </div>
    </div>
  );
}