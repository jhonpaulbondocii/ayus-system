"use client";

// src/app/forms/library/[courseId]/page.tsx
// PUBLIC — no auth required

import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode, RefObject } from "react";
import { useParams } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check, AlertCircle, RefreshCw,
  BookOpen, X, Upload, FileText, Pencil,
} from "lucide-react";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { FONT } from "@/components/layout/course/osaShared";

/* ════════════════════════════════════════════════════════════════════════════
   1. DESIGN TOKENS (same palette as the admin Library Cards tab)
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

type AppType = "STUDENT_NEW" | "STUDENT_LOST" | "";

const STEPS = ["Request type", "Personal info", "School info", "Documents", "Consent & signature", "Review & submit"];

const APP_TYPES: Array<{ value: Exclude<AppType, "">; title: string; desc: string }> = [
  { value: "STUDENT_NEW",  title: "New card",  desc: "For currently enrolled students applying for a new library card." },
  { value: "STUDENT_LOST", title: "Lost card", desc: "Replacement for a lost card. Requires a notarized Affidavit of Lost." },
];

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

/* ════════════════════════════════════════════════════════════════════════════
   3. UPLOAD FIELDS
   ════════════════════════════════════════════════════════════════════════════ */

function UploadStatus({ text }: { text: string }) {
  if (!text) return null;
  const failed = /fail/i.test(text);
  return (
    <p className="text-xs mt-1.5 font-medium" style={{ color: failed ? C.danger : C.muted }}>{text}</p>
  );
}

function UploadField({
  label, required, hint, accept, url, uploading, inputRef, onFileChange, onRemove,
}: {
  label: string; required?: boolean; hint?: string; accept: string;
  url: string; uploading: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {hint && <p className="text-[11px] mb-2" style={{ color: C.faint }}>{hint}</p>}
      {url ? (
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: "#bbf7d0", background: "#f0fdf4" }}>
          <Check size={14} className="text-green-600 shrink-0" />
          <span className="text-xs font-semibold text-green-700 flex-1 truncate">{label} uploaded</span>
          <button type="button" onClick={onRemove} className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 shrink-0">
            <X size={11} /> Remove
          </button>
        </div>
      ) : (
        <>
          <input ref={inputRef} type="file" accept={accept} onChange={onFileChange} className="hidden" />
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-all w-full justify-center">
            <Upload size={15} /> Choose file
          </button>
          <UploadStatus text={uploading} />
        </>
      )}
    </div>
  );
}

function PhotoCropUpload({
  label, required, hint, url, onUploaded, onRemove, courseId,
}: {
  label: string; required?: boolean; hint?: string; url: string;
  onUploaded: (u: string) => void; onRemove: () => void; courseId: string;
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
        const res  = await fetch(`/api/library/${courseId}/upload`, { method: "POST", body: fd });
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
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {hint && <p className="text-[11px] mb-2" style={{ color: C.faint }}>{hint}</p>}

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
   4. SIGNATURE PAD
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
   5. PAGE
   ════════════════════════════════════════════════════════════════════════════ */

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

  // Step 0 — request type
  const [appType, setAppType] = useState<AppType>("");

  // Step 1 — personal
  const [lastName,   setLastName]   = useState("");
  const [firstName,  setFirstName]  = useState("");
  const [middleName, setMiddleName] = useState("");
  const fullName = [lastName.trim() && `${lastName.trim()},`, firstName.trim(), middleName.trim()]
    .filter(Boolean)
    .join(" ");
  const [sex,       setSex]       = useState("");
  const [address,   setAddress]   = useState("");
  const [contactNo, setContactNo] = useState("");
  const [email,     setEmail]     = useState("");

  // Step 2 — school
  const [studentNo,     setStudentNo]     = useState("");
  const [courseProgram, setCourseProgram] = useState("");
  const [yearSection,   setYearSection]   = useState("");
  const [reason,        setReason]        = useState("");

  // Step 3 — documents
  const [photoUrl, setPhotoUrl] = useState("");

  const [corUrl,       setCorUrl]       = useState("");
  const [corUploading, setCorUploading] = useState("");
  const corRef = useRef<HTMLInputElement>(null);

  const [affidavitUrl,       setAffidavitUrl]       = useState("");
  const [affidavitUploading, setAffidavitUploading] = useState("");
  const affidavitRef = useRef<HTMLInputElement>(null);

  // Step 4 — signature
  const [signatureUrl,   setSignatureUrl]   = useState("");
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [sigUploading,   setSigUploading]   = useState("");

  // Duplicate check
  const [checkingDup, setCheckingDup] = useState(false);
  const [dupWarning,  setDupWarning]  = useState("");
  const dupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/library/${courseId}/info`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setOfficeError(d.error); return; }
        setOfficeName(d.name); setOfficeReady(true);
      })
      .catch(() => setOfficeError("Failed to load the form. Please try again."));
  }, [courseId]);

  useEffect(() => () => { if (dupTimeout.current) clearTimeout(dupTimeout.current); }, []);

  const checkDup = (no: string) => {
    setDupWarning("");
    if (dupTimeout.current) clearTimeout(dupTimeout.current);
    if (!no.trim()) return;
    dupTimeout.current = setTimeout(async () => {
      setCheckingDup(true);
      try {
        const res  = await fetch(`/api/library/${courseId}/submit?studentNo=${encodeURIComponent(no.trim())}`);
        const data = await res.json();
        if (data.exists)
          setDupWarning(`An active request already exists for this number (status: ${data.status}). Please contact the Library Office.`);
      } catch { /* ignore */ }
      finally { setCheckingDup(false); }
    }, 700);
  };

  const upload = useCallback(async (file: File | string, isDataUrl = false): Promise<string> => {
    const fd = new FormData();
    if (isDataUrl) {
      const blob = await (await fetch(file as string)).blob();
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
    file: File, setUrl: (u: string) => void, setStatus: (s: string) => void, label: string,
  ) => {
    setStatus("Uploading…");
    try { setUrl(await upload(file)); setStatus(""); }
    catch { setStatus(`${label} upload failed. Try again.`); }
  };

  const handleSignatureSave = async (dataUrl: string) => {
    setSigUploading("Uploading signature…");
    try {
      setSignatureUrl(await upload(dataUrl, true));
      setSignatureSaved(true);
      setSigUploading("");
    } catch { setSigUploading("Signature upload failed. Try again."); }
  };

  const validateStep = (): string | null => {
    if (step === 0 && !appType) return "Select a request type.";
    if (step === 1) {
      if (!lastName.trim())  return "Enter your last name.";
      if (!firstName.trim()) return "Enter your first name.";
    }
    if (step === 2) {
      if (!studentNo.trim())     return "Enter your student number.";
      if (!courseProgram.trim()) return "Select your course or program.";
      if (checkingDup)           return "Checking your student number. Please wait a moment.";
      if (dupWarning)            return "A request already exists for this student number.";
    }
    if (step === 3) {
      if (!photoUrl) return "Upload your passport size photo.";
      if (appType === "STUDENT_LOST" && !affidavitUrl) return "Upload your Affidavit of Lost.";
    }
    if (step === 4 && !signatureUrl) return "Draw and save your signature.";
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
    const err = validateStep();
    if (err) { setSubmitError(err); scrollTop(); return; }
    setSubmitting(true); setSubmitError("");
    try {
      const res = await fetch(`/api/library/${courseId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: appType, applicantType: "STUDENT",
          cardType: appType === "STUDENT_LOST" ? "LOST" : "NEW",
          employeeType: null,
          name: fullName, sex, address, contactNo, email, reason: reason || null,
          studentNo, courseProgram, yearSection,
          employeeNo: null, collegeDept: null, position: null,
          photoUrl:     photoUrl     || null,
          corIdUrl:     corUrl       || null,
          affidavitUrl: affidavitUrl || null,
          signatureUrl: signatureUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? "Submission failed."); scrollTop(); return; }
      setSubmitted(true);
    } catch {
      setSubmitError("Network error. Check your connection and try again.");
      scrollTop();
    } finally { setSubmitting(false); }
  };

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
            <h1 className="text-lg font-bold" style={{ color: C.ink }}>Request submitted</h1>
            <p className="text-sm mt-1.5" style={{ color: C.muted }}>
              <strong style={{ color: C.body }}>{officeName}</strong> received your library card request.
              Wait for processing, then visit the library to claim your card.
            </p>
          </div>
          <dl className="px-6 py-4 border-t text-xs space-y-2" style={{ borderColor: C.lineSoft, background: "#fafafa" }}>
            <div className="flex justify-between gap-4"><dt style={{ color: C.muted }}>Name</dt><dd className="font-semibold text-right" style={{ color: C.ink }}>{fullName}</dd></div>
            {studentNo && (
              <div className="flex justify-between gap-4"><dt style={{ color: C.muted }}>Student no.</dt><dd className="font-semibold" style={{ color: C.ink }}>{studentNo}</dd></div>
            )}
          </dl>
          <p className="px-6 py-3 text-[11px] text-center border-t" style={{ color: C.faint, borderColor: C.lineSoft }}>You can close this page now.</p>
        </div>
      </div>
    );

  const reviewRows: Array<[string, string]> = [
    ["Request type",     appType === "STUDENT_NEW" ? "Student card (new)" : "Student card (lost)"],
    ["Name",             fullName],
    ["Sex",              sex],
    ["Contact no.",      contactNo],
    ["Email",            email],
    ["Address",          address],
    ["Student no.",      studentNo],
    ["Course / program", courseProgram],
    ["Year & section",   yearSection],
    ["Reason for loss",  reason],
  ];

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: FONT }}>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b" style={{ borderColor: C.line }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.brand }}>
            <BookOpen size={17} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate" style={{ color: C.ink }}>Library card request</p>
            <p className="text-xs truncate" style={{ color: C.faint }}>Pampanga State University · {officeName || "Library"}</p>
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

        {/* STEP 0 — Request type */}
        {step === 0 && (
          <Card title="What are you requesting?" description="Choose the option that applies to you.">
            <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {APP_TYPES.map(t => {
                const active = appType === t.value;
                return (
                  <button
                    key={t.value} type="button" role="radio" aria-checked={active}
                    onClick={() => { setAppType(t.value); setSubmitError(""); setDupWarning(""); }}
                    className="rounded-xl border p-4 text-left transition-all flex items-start gap-3"
                    style={active
                      ? { borderColor: C.brand, background: C.brandTint, boxShadow: `0 0 0 3px ${C.brandRing}` }
                      : { borderColor: C.line, background: "#fff" }}
                  >
                    <span className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center"
                      style={{ borderColor: active ? C.brand : "#d1d5db" }}>
                      {active && <span className="w-2 h-2 rounded-full" style={{ background: C.brand }} />}
                    </span>
                    <span>
                      <span className="block text-sm font-bold" style={{ color: active ? C.brand : C.ink }}>{t.title}</span>
                      <span className="block text-xs mt-1 leading-snug" style={{ color: C.muted }}>{t.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* STEP 1 — Personal info */}
        {step === 1 && (
          <Card title="Personal information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Last name" required>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz" className={inputCls} autoComplete="family-name" />
                </Field>
                <Field label="First name" required>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" className={inputCls} autoComplete="given-name" />
                </Field>
                <Field label="Middle name">
                  <input value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Santos" className={inputCls} autoComplete="additional-name" />
                </Field>
              </div>
              <Field label="Sex">
                <select value={sex} onChange={e => setSex(e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </Field>
              <Field label="Contact no.">
                <input value={contactNo} onChange={e => setContactNo(e.target.value)} placeholder="09XXXXXXXXX" inputMode="tel" className={inputCls} autoComplete="tel" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Email address">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@psu.edu.ph" className={inputCls} autoComplete="email" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Complete address">
                  <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, Barangay, City, Province" className={inputCls} autoComplete="street-address" />
                </Field>
              </div>
            </div>
          </Card>
        )}

        {/* STEP 2 — School info */}
        {step === 2 && (
          <Card title="School information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Student no." required>
                <div className="relative">
                  <input
                    value={studentNo}
                    onChange={e => { setStudentNo(e.target.value); checkDup(e.target.value); }}
                    placeholder="e.g. 2024-0001" className={inputCls}
                  />
                  {checkingDup && <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                </div>
                {dupWarning && <p className="text-[11px] mt-1 leading-snug" style={{ color: "#b45309" }}>{dupWarning}</p>}
              </Field>
              <Field label="Year & section">
                <input value={yearSection} onChange={e => setYearSection(e.target.value)} placeholder="e.g. 2-A" className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Course / program" required>
                  <select value={courseProgram} onChange={e => setCourseProgram(e.target.value)} className={inputCls}>
                    <option value="">Select</option>
                    {Object.entries(COURSES_BY_DEPARTMENT).map(([dept, courses]) => (
                      <optgroup key={dept} label={dept}>
                        {courses.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </Field>
              </div>
              {appType === "STUDENT_LOST" && (
                <div className="sm:col-span-2">
                  <Field label="Reason for loss">
                    <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Briefly describe how you lost your card" className={inputCls} />
                  </Field>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* STEP 3 — Documents */}
        {step === 3 && (
          <>
            <Card title="Passport size photo" description="You’ll crop it to a 2×3 ratio before it’s uploaded.">
              <PhotoCropUpload
                label="Photo" required url={photoUrl}
                onUploaded={setPhotoUrl} onRemove={() => setPhotoUrl("")} courseId={courseId}
              />
            </Card>

            <Card title="COR or validated ID" description="Certificate of Registration or your school-validated ID.">
              <UploadField
                label="COR or validated ID"
                accept="image/*,.pdf" url={corUrl} uploading={corUploading} inputRef={corRef}
                onFileChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, setCorUrl, setCorUploading, "COR/ID"); }}
                onRemove={() => { setCorUrl(""); if (corRef.current) corRef.current.value = ""; }}
              />
            </Card>

            {appType === "STUDENT_LOST" && (
              <Card title="Affidavit of lost" description="Required for replacement of a lost card.">
                <div className="flex items-center justify-between gap-3 mb-4 rounded-xl border px-4 py-3" style={{ borderColor: C.line, background: "#fafafa" }}>
                  <div className="min-w-0">
                    <p className="text-xs font-bold" style={{ color: C.ink }}>Need the template?</p>
                    <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>Download, print, fill out, and get it notarized before uploading.</p>
                  </div>
                  <a href="/template/affidavit-of-lost.docx" download
                    className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 h-8 rounded-lg text-white"
                    style={{ background: C.brand }}>
                    <FileText size={12} /> Download
                  </a>
                </div>
                <UploadField
                  label="Affidavit of lost" required
                  hint="Upload a scan or clear photo of the signed and notarized affidavit."
                  accept="image/*,.pdf" url={affidavitUrl} uploading={affidavitUploading} inputRef={affidavitRef}
                  onFileChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, setAffidavitUrl, setAffidavitUploading, "Affidavit"); }}
                  onRemove={() => { setAffidavitUrl(""); if (affidavitRef.current) affidavitRef.current.value = ""; }}
                />
              </Card>
            )}
          </>
        )}

        {/* STEP 4 — Consent & signature */}
        {step === 4 && (
          <Card title="Data privacy consent">
            <div className="rounded-xl border px-4 py-3 text-xs leading-relaxed mb-5" style={{ background: C.brandTint, borderColor: "#f1d5d5", color: C.body }}>
              By signing below, I consent to <strong>Pampanga State University</strong> collecting and processing my personal
              information under <strong>Republic Act No. 10173</strong> (Data Privacy Act of 2012) for the purpose of issuing a library card.
            </div>
            <div>
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
            </div>
          </Card>
        )}

        {/* STEP 5 — Review & submit */}
        {step === 5 && (
          <>
            <Card
              title="Your details"
              description="Check everything before you submit."
              action={
                <button type="button" onClick={() => goTo(1)}
                  className="flex items-center gap-1 text-xs font-semibold hover:underline shrink-0" style={{ color: C.brand }}>
                  <Pencil size={11} /> Edit
                </button>
              }
            >
              <dl className="divide-y" style={{ borderColor: C.lineSoft }}>
                {reviewRows.filter(([, v]) => v).map(([label, val]) => (
                  <div key={label} className="flex gap-4 py-2.5 first:pt-0 last:pb-0" style={{ borderColor: C.lineSoft }}>
                    <dt className="text-xs w-36 shrink-0" style={{ color: C.muted }}>{label}</dt>
                    <dd className="text-xs font-semibold break-words min-w-0" style={{ color: C.ink }}>{val}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card
              title="Documents"
              action={
                <button type="button" onClick={() => goTo(3)}
                  className="flex items-center gap-1 text-xs font-semibold hover:underline shrink-0" style={{ color: C.brand }}>
                  <Pencil size={11} /> Edit
                </button>
              }
            >
              <div className="flex flex-wrap gap-3">
                {photoUrl && (
                  <div className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl} alt="Photo" className="w-16 h-20 object-cover rounded-lg border" style={{ borderColor: C.line }} />
                    <span className="text-[11px]" style={{ color: C.muted }}>Photo</span>
                  </div>
                )}
                {corUrl && (
                  <div className="flex flex-col items-center justify-center gap-1 w-16 h-20 rounded-lg border bg-gray-50" style={{ borderColor: C.line }}>
                    <FileText size={18} style={{ color: C.faint }} />
                    <span className="text-[11px]" style={{ color: C.muted }}>COR / ID</span>
                  </div>
                )}
                {affidavitUrl && (
                  <div className="flex flex-col items-center justify-center gap-1 w-16 h-20 rounded-lg border bg-gray-50" style={{ borderColor: C.line }}>
                    <FileText size={18} style={{ color: C.faint }} />
                    <span className="text-[11px]" style={{ color: C.muted }}>Affidavit</span>
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

            <p className="text-xs text-center px-4" style={{ color: C.faint }}>
              By submitting, you confirm that the information you provided is accurate and complete.
            </p>
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
            <button onClick={handleNext} disabled={step === 0 && !appType}
              className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: C.brand }}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
              style={{ background: C.brand }}>
              {submitting ? <><RefreshCw size={14} className="animate-spin" /> Submitting…</> : <><Check size={14} /> Submit request</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}