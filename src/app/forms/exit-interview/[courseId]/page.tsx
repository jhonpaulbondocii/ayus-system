"use client";

// src/app/forms/exit-interview/[courseId]/page.tsx
// PUBLIC — no auth required, graduating students fill this out

import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check, AlertCircle, RefreshCw,
  GraduationCap, X, Pencil,
} from "lucide-react";
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

const STEPS = [
  "Personal info",
  "Feelings & influences",
  "Plans & values",
  "Feedback",
  "Consent & signature",
  "Review & submit",
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

function UploadStatus({ text }: { text: string }) {
  if (!text) return null;
  const failed = /fail/i.test(text);
  return (
    <p className="text-xs mt-1.5 font-medium" style={{ color: failed ? C.danger : C.muted }}>{text}</p>
  );
}

/* Selectable option (checkbox) — same active style as the library request-type cards */
function Option({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button" role="checkbox" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="rounded-xl border px-3.5 py-3 text-left transition-all flex items-center gap-3"
      style={checked
        ? { borderColor: C.brand, background: C.brandTint, boxShadow: `0 0 0 3px ${C.brandRing}` }
        : { borderColor: C.line, background: "#fff" }}
    >
      <span className="w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center"
        style={{ borderColor: checked ? C.brand : "#d1d5db", background: checked ? C.brand : "#fff" }}>
        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
      </span>
      <span className="text-sm font-semibold" style={{ color: checked ? C.brand : C.ink }}>{label}</span>
    </button>
  );
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
   4. PAGE
   ════════════════════════════════════════════════════════════════════════════ */

export default function ExitInterviewFormPage() {
  const params   = useParams();
  const courseId = params.courseId as string;

  const [step,        setStep]        = useState(0);
  const [officeName,  setOfficeName]  = useState("");
  const [officeReady, setOfficeReady] = useState(false);
  const [officeError, setOfficeError] = useState("");
  const [submitted,   setSubmitted]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Step 0 — personal info
  const [lastName,        setLastName]        = useState("");
  const [firstName,       setFirstName]       = useState("");
  const [middleName,      setMiddleName]      = useState("");
  const [programSection,  setProgramSection]  = useState("");
  const [mobileNo,        setMobileNo]        = useState("");
  const [graduationMonth, setGraduationMonth] = useState("");
  const [campus,          setCampus]          = useState("");
  const [homeAddress,     setHomeAddress]     = useState("");

  // Step 1 — feelings & influences
  const [feelHappy,      setFeelHappy]      = useState(false);
  const [feelExcited,    setFeelExcited]    = useState(false);
  const [feelSad,        setFeelSad]        = useState(false);
  const [feelNervous,    setFeelNervous]    = useState(false);
  const [feelChallenged, setFeelChallenged] = useState(false);
  const [feelOthers,     setFeelOthers]     = useState("");

  const [influenceProfessor, setInfluenceProfessor] = useState(false);
  const [influenceClassmate, setInfluenceClassmate] = useState(false);
  const [influenceFriends,   setInfluenceFriends]   = useState(false);
  const [influenceFamily,    setInfluenceFamily]    = useState(false);
  const [influenceOthers,    setInfluenceOthers]    = useState("");

  // Step 2 — plans & values
  const [planFindJob,     setPlanFindJob]     = useState(false);
  const [planGradStudies, setPlanGradStudies] = useState(false);
  const [planBoardExam,   setPlanBoardExam]   = useState(false);
  const [planOthers,      setPlanOthers]      = useState(false);
  const [honorianValues,  setHonorianValues]  = useState("");

  const [probFamilyProblem,      setProbFamilyProblem]      = useState(false);
  const [probSchoolDifficulties, setProbSchoolDifficulties] = useState(false);
  const [probFinancialProblem,   setProbFinancialProblem]   = useState(false);
  const [probBoyGirl,            setProbBoyGirl]            = useState(false);
  const [probFutureJob,          setProbFutureJob]          = useState(false);
  const [probOthers,             setProbOthers]             = useState("");

  // Step 3 — feedback
  const [likedMost,   setLikedMost]   = useState("");
  const [likedLeast,  setLikedLeast]  = useState("");
  const [recommend,   setRecommend]   = useState("");
  const [suggestions, setSuggestions] = useState("");

  // Step 4 — signature
  const [signatureUrl,   setSignatureUrl]   = useState("");
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [sigUploading,   setSigUploading]   = useState("");

  const fullName = [lastName.trim() && `${lastName.trim()},`, firstName.trim(), middleName.trim()]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    fetch(`/api/exit-interview/${courseId}/info`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setOfficeError(d.error); return; }
        setOfficeName(d.name); setOfficeReady(true);
      })
      .catch(() => setOfficeError("Failed to load the form. Please try again."));
  }, [courseId]);

  const uploadFile = useCallback(async (dataUrl: string): Promise<string> => {
    const res  = await fetch(dataUrl);
    const blob = await res.blob();
    const fd   = new FormData();
    fd.append("file", blob, "signature.png");
    const r    = await fetch(`/api/guidance/${courseId}/upload`, { method: "POST", body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Upload failed");
    return data.fileUrl;
  }, [courseId]);

  const handleSignatureSave = async (dataUrl: string) => {
    setSigUploading("Uploading signature…");
    try {
      const url = await uploadFile(dataUrl);
      setSignatureUrl(url);
      setSignatureSaved(true);
      setSigUploading("");
    } catch {
      setSigUploading("Signature upload failed. Try again.");
    }
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!lastName.trim())  return "Enter your last name.";
      if (!firstName.trim()) return "Enter your first name.";
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
      const res = await fetch(`/api/exit-interview/${courseId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName, firstName, middleName,
          programSection, mobileNo, graduationMonth, campus, homeAddress,
          feelHappy, feelExcited, feelSad, feelNervous, feelChallenged,
          feelOthers: feelOthers.trim() || null,
          influenceProfessor, influenceClassmate, influenceFriends, influenceFamily,
          influenceOthers: influenceOthers.trim() || null,
          planFindJob, planGradStudies, planBoardExam, planOthers,
          honorianValues: honorianValues.trim() || null,
          pressingProblemDetails: {
            familyProblem: probFamilyProblem,
            schoolDifficulties: probSchoolDifficulties,
            financialProblem: probFinancialProblem,
            boyGirl: probBoyGirl,
            futureJob: probFutureJob,
            others: probOthers.trim() || null,
          },
          likedMost:   likedMost.trim()   || null,
          likedLeast:  likedLeast.trim()  || null,
          recommend:   recommend.trim()   || null,
          suggestions: suggestions.trim() || null,
          studentSignatureUrl: signatureUrl || null,
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
            <h1 className="text-lg font-bold" style={{ color: C.ink }}>Exit interview submitted</h1>
            <p className="text-sm mt-1.5" style={{ color: C.muted }}>
              <strong style={{ color: C.body }}>{officeName}</strong> received your exit interview form.
              Thank you for your time and congratulations on your graduation.
            </p>
          </div>
          <dl className="px-6 py-4 border-t text-xs space-y-2" style={{ borderColor: C.lineSoft, background: "#fafafa" }}>
            <div className="flex justify-between gap-4">
              <dt style={{ color: C.muted }}>Name</dt>
              <dd className="font-semibold text-right" style={{ color: C.ink }}>{fullName}</dd>
            </div>
          </dl>
          <p className="px-6 py-3 text-[11px] text-center border-t" style={{ color: C.faint, borderColor: C.lineSoft }}>You can close this page now.</p>
        </div>
      </div>
    );

  /* ── Review helpers ── */
  const pick = (pairs: Array<[boolean, string]>, others?: string) =>
    [...pairs.filter(([on]) => on).map(([, l]) => l), others?.trim() ? `Others: ${others.trim()}` : ""]
      .filter(Boolean)
      .join(", ");

  const personalRows: Array<[string, string]> = [
    ["Name",             fullName],
    ["Program & section", programSection],
    ["Campus",           campus],
    ["Graduation",       graduationMonth],
    ["Mobile no.",       mobileNo],
    ["Home address",     homeAddress],
  ];

  const answerRows: Array<[string, string]> = [
    ["Feelings", pick([
      [feelHappy, "Happy"], [feelExcited, "Excited"], [feelSad, "Sad"],
      [feelNervous, "Nervous"], [feelChallenged, "Challenged"],
    ], feelOthers)],
    ["Influences", pick([
      [influenceProfessor, "Professor"], [influenceClassmate, "Classmate"],
      [influenceFriends, "Friends"], [influenceFamily, "Family"],
    ], influenceOthers)],
    ["Plans", pick([
      [planFindJob, "Find a job"], [planGradStudies, "Graduate studies"],
      [planBoardExam, "Board exam"], [planOthers, "Others"],
    ])],
    ["Honorian values", honorianValues],
    ["Problems", pick([
      [probFamilyProblem, "Family"], [probSchoolDifficulties, "School"],
      [probFinancialProblem, "Financial"], [probBoyGirl, "Relationship"],
      [probFutureJob, "Future job"],
    ], probOthers)],
    ["Liked most",  likedMost],
    ["Liked least", likedLeast],
    ["Recommend",   recommend],
    ["Suggestions", suggestions],
  ];

  const ReviewList = ({ rows }: { rows: Array<[string, string]> }) => (
    <dl className="divide-y" style={{ borderColor: C.lineSoft }}>
      {rows.filter(([, v]) => v).map(([label, val]) => (
        <div key={label} className="flex gap-4 py-2.5 first:pt-0 last:pb-0" style={{ borderColor: C.lineSoft }}>
          <dt className="text-xs w-36 shrink-0" style={{ color: C.muted }}>{label}</dt>
          <dd className="text-xs font-semibold break-words min-w-0 whitespace-pre-wrap" style={{ color: C.ink }}>{val}</dd>
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

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: FONT }}>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b" style={{ borderColor: C.line }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.brand }}>
            <GraduationCap size={17} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate" style={{ color: C.ink }}>Exit interview form</p>
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
          <Card title="Personal information" description="Only your last and first name are required.">
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
              <Field label="Program & section">
                <input value={programSection} onChange={e => setProgramSection(e.target.value)} placeholder="e.g. BSIT 4-A" className={inputCls} />
              </Field>
              <Field label="Mobile no.">
                <input value={mobileNo} onChange={e => setMobileNo(e.target.value)} placeholder="09XXXXXXXXX" inputMode="tel" className={inputCls} autoComplete="tel" />
              </Field>
              <Field label="Month / year of graduation">
                <input value={graduationMonth} onChange={e => setGraduationMonth(e.target.value)} placeholder="e.g. June 2026" className={inputCls} />
              </Field>
              <Field label="Campus">
                <input value={campus} onChange={e => setCampus(e.target.value)} placeholder="e.g. Main Campus" className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Home address">
                  <input value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="Street, Barangay, City, Province" className={inputCls} autoComplete="street-address" />
                </Field>
              </div>
            </div>
          </Card>
        )}

        {/* STEP 1 — Feelings & influences */}
        {step === 1 && (
          <>
            <Card title="How do you feel about graduating?" description="Select all that apply.">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                <Option label="Happy"      checked={feelHappy}      onChange={setFeelHappy} />
                <Option label="Excited"    checked={feelExcited}    onChange={setFeelExcited} />
                <Option label="Sad"        checked={feelSad}        onChange={setFeelSad} />
                <Option label="Nervous"    checked={feelNervous}    onChange={setFeelNervous} />
                <Option label="Challenged" checked={feelChallenged} onChange={setFeelChallenged} />
              </div>
              <Field label="Others">
                <input value={feelOthers} onChange={e => setFeelOthers(e.target.value)} placeholder="Other feelings" className={inputCls} />
              </Field>
            </Card>

            <Card title="Who influenced you most to pursue your studies?" description="Select all that apply.">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                <Option label="Professor" checked={influenceProfessor} onChange={setInfluenceProfessor} />
                <Option label="Classmate" checked={influenceClassmate} onChange={setInfluenceClassmate} />
                <Option label="Friends"   checked={influenceFriends}   onChange={setInfluenceFriends} />
                <Option label="Family"    checked={influenceFamily}    onChange={setInfluenceFamily} />
              </div>
              <Field label="Others">
                <input value={influenceOthers} onChange={e => setInfluenceOthers(e.target.value)} placeholder="Other influences" className={inputCls} />
              </Field>
            </Card>
          </>
        )}

        {/* STEP 2 — Plans & values */}
        {step === 2 && (
          <>
            <Card title="What is your immediate plan after graduation?" description="Select all that apply.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Option label="Find a job"              checked={planFindJob}     onChange={setPlanFindJob} />
                <Option label="Pursue graduate studies" checked={planGradStudies} onChange={setPlanGradStudies} />
                <Option label="Take the board exam"     checked={planBoardExam}   onChange={setPlanBoardExam} />
                <Option label="Others"                  checked={planOthers}      onChange={setPlanOthers} />
              </div>
            </Card>

            <Card title="What Honorian values do you carry as you leave?">
              <textarea value={honorianValues} onChange={e => setHonorianValues(e.target.value)} rows={3}
                placeholder="Describe the values you will carry from PSU" className={textareaCls} />
            </Card>

            <Card title="What pressing problems did you encounter?" description="Select all that apply.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                <Option label="Family problem"         checked={probFamilyProblem}      onChange={setProbFamilyProblem} />
                <Option label="Difficulties in school" checked={probSchoolDifficulties} onChange={setProbSchoolDifficulties} />
                <Option label="Financial problem"      checked={probFinancialProblem}   onChange={setProbFinancialProblem} />
                <Option label="Boy/girl relationship"  checked={probBoyGirl}            onChange={setProbBoyGirl} />
                <Option label="Future job"             checked={probFutureJob}          onChange={setProbFutureJob} />
              </div>
              <Field label="Others">
                <input value={probOthers} onChange={e => setProbOthers(e.target.value)} placeholder="Other problems" className={inputCls} />
              </Field>
            </Card>
          </>
        )}

        {/* STEP 3 — Feedback */}
        {step === 3 && (
          <>
            <Card title="What did you like most about PSU?">
              <textarea value={likedMost} onChange={e => setLikedMost(e.target.value)} rows={3}
                placeholder="Share what you liked most" className={textareaCls} />
            </Card>
            <Card title="What did you like least about PSU?">
              <textarea value={likedLeast} onChange={e => setLikedLeast(e.target.value)} rows={3}
                placeholder="Share what you liked least" className={textareaCls} />
            </Card>
            <Card title="Would you recommend PSU to others?">
              <textarea value={recommend} onChange={e => setRecommend(e.target.value)} rows={3}
                placeholder="Share your recommendation" className={textareaCls} />
            </Card>
            <Card title="Suggestions for improvement">
              <textarea value={suggestions} onChange={e => setSuggestions(e.target.value)} rows={3}
                placeholder="Share your suggestions" className={textareaCls} />
            </Card>
          </>
        )}

        {/* STEP 4 — Consent & signature */}
        {step === 4 && (
          <Card title="Data privacy consent">
            <div className="rounded-xl border px-4 py-3 text-xs leading-relaxed mb-5" style={{ background: C.brandTint, borderColor: "#f1d5d5", color: C.body }}>
              By signing below, I certify that all information provided is complete and accurate. I allow{" "}
              <strong>Pampanga State University</strong>, through the Guidance &amp; Testing Center, to collect, record,
              organize, and use my personal data under <strong>Republic Act No. 10173</strong> (Data Privacy Act of 2012).
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
            <Card title="Your details" description="Check everything before you submit." action={<EditBtn to={0} />}>
              <ReviewList rows={personalRows} />
            </Card>

            <Card title="Your answers" action={<EditBtn to={1} />}>
              {answerRows.some(([, v]) => v)
                ? <ReviewList rows={answerRows} />
                : <p className="text-xs" style={{ color: C.muted }}>You haven’t answered any optional questions.</p>}
            </Card>

            <Card title="Signature" action={<EditBtn to={4} />}>
              {signatureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signatureUrl} alt="Signature" className="h-20 border rounded-lg bg-white p-1 object-contain" style={{ borderColor: C.line }} />
              )}
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
            <button onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-bold text-white transition-opacity"
              style={{ background: C.brand }}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
              style={{ background: C.brand }}>
              {submitting ? <><RefreshCw size={14} className="animate-spin" /> Submitting…</> : <><Check size={14} /> Submit exit interview</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}