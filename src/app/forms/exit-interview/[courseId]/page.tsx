"use client";

// src/app/forms/exit-interview/[courseId]/page.tsx
// PUBLIC — no auth required, graduating students fill this out

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check, AlertCircle,
  RefreshCw, GraduationCap, X, Upload,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT   = "'Inter', system-ui, sans-serif";

const inputCls    = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white placeholder:text-gray-400";
const labelCls    = "block text-xs font-semibold text-gray-600 mb-1";
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

const STEPS = [
  "Personal Info",
  "Feelings & Influences",
  "Plans & Values",
  "Feedback",
  "Signature & Submit",
];

/* ── Signature Pad ── */
function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const drawing    = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
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
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height); setHasDrawn(false);
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
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
          <X size={11} /> Clear
        </button>
        <button type="button" onClick={() => { const c = canvasRef.current; if (c) onSave(c.toDataURL("image/png")); }}
          disabled={!hasDrawn}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
          style={{ background: MAROON }}>
          <Check size={11} /> Save Signature
        </button>
      </div>
    </div>
  );
}

/* ── Checkbox helper ── */
function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-all"
      style={checked ? { borderColor: MAROON, background: "#fef2f2" } : { borderColor: "#e5e7eb", background: "#fafafa" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: MAROON }} />
      <span className="text-xs font-medium" style={{ color: checked ? MAROON : "#374151" }}>{label}</span>
    </label>
  );
}

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

  // ── Step 0: Personal Info ──
  const [lastName,       setLastName]       = useState("");
  const [firstName,      setFirstName]      = useState("");
  const [middleName,     setMiddleName]     = useState("");
  const [programSection, setProgramSection] = useState("");
  const [mobileNo,       setMobileNo]       = useState("");
  const [graduationMonth,setGraduationMonth]= useState("");
  const [campus,         setCampus]         = useState("");
  const [homeAddress,    setHomeAddress]    = useState("");

  // ── Step 1: Feelings & Influences ──
  const [feelHappy,       setFeelHappy]       = useState(false);
  const [feelExcited,     setFeelExcited]     = useState(false);
  const [feelSad,         setFeelSad]         = useState(false);
  const [feelNervous,     setFeelNervous]     = useState(false);
  const [feelChallenged,  setFeelChallenged]  = useState(false);
  const [feelOthers,      setFeelOthers]      = useState("");

  const [influenceProfessor, setInfluenceProfessor] = useState(false);
  const [influenceClassmate, setInfluenceClassmate] = useState(false);
  const [influenceFriends,   setInfluenceFriends]   = useState(false);
  const [influenceFamily,    setInfluenceFamily]    = useState(false);
  const [influenceOthers,    setInfluenceOthers]    = useState("");

  // ── Step 2: Plans & Values ──
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

  // ── Step 3: Feedback ──
  const [likedMost,    setLikedMost]    = useState("");
  const [likedLeast,   setLikedLeast]   = useState("");
  const [recommend,    setRecommend]    = useState("");
  const [suggestions,  setSuggestions]  = useState("");

  // ── Step 4: Signature ──
  const [signatureUrl,   setSignatureUrl]   = useState("");
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [sigUploading,   setSigUploading]   = useState("");

  useEffect(() => {
    fetch(`/api/exit-interview/${courseId}/info`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setOfficeError(d.error); return; }
        setOfficeName(d.name); setOfficeReady(true);
      })
      .catch(() => setOfficeError("Failed to load form. Please try again."));
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
    setSigUploading("Uploading signature...");
    try {
      const url = await uploadFile(dataUrl);
      setSignatureUrl(url);
      setSignatureSaved(true);
      setSigUploading("");
    } catch {
      setSigUploading("Signature upload failed. Try again.");
    }
  };

  const validateStep = () => {
    if (step === 0) {
      if (!lastName.trim())  return "Last name is required.";
      if (!firstName.trim()) return "First name is required.";
    }
    if (step === 4) {
      if (!signatureUrl) return "Please draw and save your signature before submitting.";
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
      if (!res.ok) { setSubmitError(data.error ?? "Submission failed."); return; }
      setSubmitted(true);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
          <p className="text-sm text-gray-500 max-w-sm">Your Exit Interview Form has been submitted to the {officeName}. You may now close this page.</p>
        </div>
        <div className="text-xs text-gray-400 mt-2 text-center">
          <p>Name: <span className="font-semibold text-gray-600">{lastName}, {firstName}</span></p>
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
            <p className="text-sm font-bold text-gray-900 truncate">{officeName} — Exit Interview Form</p>
          </div>
        </div>
        {/* Step indicator */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 transition-all ${i <= step ? "text-white" : "text-gray-400 border border-gray-300"}`}
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
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <SectionTitle>Personal Information</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Last Name" required>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" className={inputCls} />
              </Field>
              <Field label="First Name" required>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" className={inputCls} />
              </Field>
              <Field label="Middle Name">
                <input value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Middle name" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Program & Section">
                <input value={programSection} onChange={e => setProgramSection(e.target.value)} placeholder="e.g. BSIT 4-A" className={inputCls} />
              </Field>
              <Field label="Mobile No.">
                <input value={mobileNo} onChange={e => setMobileNo(e.target.value)} placeholder="09XXXXXXXXX" className={inputCls} />
              </Field>
              <Field label="Month/Year of Graduation">
                <input value={graduationMonth} onChange={e => setGraduationMonth(e.target.value)} placeholder="e.g. June 2026" className={inputCls} />
              </Field>
              <Field label="Campus">
                <input value={campus} onChange={e => setCampus(e.target.value)} placeholder="e.g. Main Campus" className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Home Address">
                  <input value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="Street, Barangay, City, Province" className={inputCls} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Feelings & Influences ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <SectionTitle>Q1 — How do you feel about graduating?</SectionTitle>
              <p className="text-xs text-gray-500">Check all that apply.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Checkbox label="Happy"      checked={feelHappy}      onChange={setFeelHappy} />
                <Checkbox label="Excited"    checked={feelExcited}    onChange={setFeelExcited} />
                <Checkbox label="Sad"        checked={feelSad}        onChange={setFeelSad} />
                <Checkbox label="Nervous"    checked={feelNervous}    onChange={setFeelNervous} />
                <Checkbox label="Challenged" checked={feelChallenged} onChange={setFeelChallenged} />
              </div>
              <Field label="Others (please specify)">
                <input value={feelOthers} onChange={e => setFeelOthers(e.target.value)} placeholder="Other feelings..." className={inputCls} />
              </Field>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <SectionTitle>Q2 — Who influenced you most to pursue your studies?</SectionTitle>
              <p className="text-xs text-gray-500">Check all that apply.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Checkbox label="Professor"  checked={influenceProfessor} onChange={setInfluenceProfessor} />
                <Checkbox label="Classmate"  checked={influenceClassmate} onChange={setInfluenceClassmate} />
                <Checkbox label="Friends"    checked={influenceFriends}   onChange={setInfluenceFriends} />
                <Checkbox label="Family"     checked={influenceFamily}    onChange={setInfluenceFamily} />
              </div>
              <Field label="Others (please specify)">
                <input value={influenceOthers} onChange={e => setInfluenceOthers(e.target.value)} placeholder="Other influences..." className={inputCls} />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 2: Plans & Values ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <SectionTitle>Q3 — What is your immediate plan after graduation?</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Checkbox label="Find a Job"               checked={planFindJob}      onChange={setPlanFindJob} />
                <Checkbox label="Pursue Graduate Studies"  checked={planGradStudies}  onChange={setPlanGradStudies} />
                <Checkbox label="Take the Board Exam"      checked={planBoardExam}    onChange={setPlanBoardExam} />
                <Checkbox label="Others"                   checked={planOthers}       onChange={setPlanOthers} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <SectionTitle>Q4 — What Honorian values do you carry as you leave?</SectionTitle>
              <textarea value={honorianValues} onChange={e => setHonorianValues(e.target.value)} rows={3}
                placeholder="Describe the values you will carry from PSU..." className={textareaCls} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <SectionTitle>Q5 — What pressing problems did you encounter?</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Checkbox label="Family Problem"          checked={probFamilyProblem}      onChange={setProbFamilyProblem} />
                <Checkbox label="Difficulties in School"  checked={probSchoolDifficulties} onChange={setProbSchoolDifficulties} />
                <Checkbox label="Financial Problem"       checked={probFinancialProblem}   onChange={setProbFinancialProblem} />
                <Checkbox label="Boy/Girl Relationship"   checked={probBoyGirl}            onChange={setProbBoyGirl} />
                <Checkbox label="Future Job"              checked={probFutureJob}          onChange={setProbFutureJob} />
              </div>
              <Field label="Others (please specify)">
                <input value={probOthers} onChange={e => setProbOthers(e.target.value)} placeholder="Other problems..." className={inputCls} />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 3: Feedback ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <SectionTitle>Q6 — What did you like most about PSU?</SectionTitle>
              <textarea value={likedMost} onChange={e => setLikedMost(e.target.value)} rows={3}
                placeholder="Share what you liked most..." className={textareaCls} />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <SectionTitle>Q7 — What did you like least about PSU?</SectionTitle>
              <textarea value={likedLeast} onChange={e => setLikedLeast(e.target.value)} rows={3}
                placeholder="Share what you liked least..." className={textareaCls} />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <SectionTitle>Q8 — Would you recommend PSU to others?</SectionTitle>
              <textarea value={recommend} onChange={e => setRecommend(e.target.value)} rows={3}
                placeholder="Share your recommendation..." className={textareaCls} />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <SectionTitle>Q9 — Suggestions for Improvement</SectionTitle>
              <textarea value={suggestions} onChange={e => setSuggestions(e.target.value)} rows={3}
                placeholder="Share your suggestions..." className={textareaCls} />
            </div>
          </div>
        )}

        {/* ── STEP 4: Signature & Submit ── */}
        {step === 4 && (
          <div className="space-y-5">
            {/* Review summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <SectionTitle>Review</SectionTitle>
              <div className="space-y-1.5 text-sm">
                {[
                  ["Name",              `${lastName}, ${firstName}${middleName ? ` ${middleName}` : ""}`],
                  ["Program & Section", programSection],
                  ["Campus",            campus],
                  ["Graduation Month",  graduationMonth],
                  ["Mobile No.",        mobileNo],
                ].map(([label, val]) => val ? (
                  <div key={label} className="flex gap-3 py-1 border-b border-gray-50">
                    <span className="text-gray-400 font-medium shrink-0 w-40 text-xs">{label}</span>
                    <span className="text-gray-800 font-semibold text-xs">{val}</span>
                  </div>
                ) : null)}
              </div>
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

            {/* Privacy notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              <p className="font-bold mb-1">Data Privacy Notice</p>
              <p className="leading-relaxed">
                By submitting this form, I certify that all information provided is complete and accurate.
                I allow Pampanga State University through the Guidance &amp; Testing Center to collect,
                record, organize, and utilize my personal data pursuant to Republic Act No. 10173 (Data Privacy Act of 2012).
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
              : <><Check size={14} /> Submit Exit Interview</>}
          </button>
        )}
      </div>
    </div>
  );
}