"use client";

// src/components/layout/course/CourseExitInterviewTab.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  Trash2, Check, ArrowLeft, Filter, X, Plus,
  GraduationCap, Download, Users, PenLine,
} from "lucide-react";

const MAROON    = "#7b1113";
const FONT      = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const PAGE_SIZE = 15;

/* ─── Types ─── */
interface ProbDetails {
  familyProblem?: boolean; schoolDifficulties?: boolean; financialProblem?: boolean;
  boyGirl?: boolean; futureJob?: boolean; others?: string | null;
}

interface ExitInterview {
  id:             string;
  courseId:       string;
  lastName:       string;
  firstName:      string;
  middleName:     string | null;
  programSection: string | null;
  mobileNo:       string | null;
  graduationMonth:string | null;
  campus:         string | null;
  homeAddress:    string | null;
  feelHappy:      boolean; feelExcited: boolean; feelSad: boolean;
  feelNervous:    boolean; feelChallenged: boolean; feelOthers: string | null;
  influenceProfessor: boolean; influenceClassmate: boolean;
  influenceFriends:   boolean; influenceFamily:    boolean; influenceOthers: string | null;
  planFindJob: boolean; planGradStudies: boolean; planBoardExam: boolean; planOthers: boolean;
  honorianValues:        string | null;
  pressingProblemDetails:ProbDetails | null;
  likedMost:    string | null;
  likedLeast:   string | null;
  recommend:    string | null;
  suggestions:  string | null;
  studentSignatureUrl:  string | null;
  studentSignedAt:      string | null;
  counselorSignatureUrl:string | null;
  counselorSignedAt:    string | null;
  counselorName:        string | null;
  status:       string;
  submittedAt:  string;
  updatedAt:    string;
}

interface Props { courseId: string; isHead: boolean; }

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status, hasCounselorSig }: { status: string; hasCounselorSig: boolean }) {
  if (hasCounselorSig) return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-gray-900 text-white">
      Completed
    </span>
  );
  const map: Record<string, { bg: string; text: string; label: string }> = {
    SUBMITTED: { bg: "#1e293b", text: "#f8fafc", label: "Submitted" },
    REVIEWED:  { bg: "#374151", text: "#f9fafb", label: "Reviewed"  },
  };
  const s = map[status] ?? map.SUBMITTED;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
      style={{ background: s.bg, color: s.text }}>{s.label}</span>
  );
}

/* ── Download PDF Button ── */
function DownloadPDFButton({ courseId, interviewId, studentName }: {
  courseId: string; interviewId: string; studentName: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [filename,  setFilename]  = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    setFilename(`Exit_Interview_${studentName.replace(/\s+/g, "_")}`);
    setShowModal(true);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const confirm = () => {
    const name = (filename.trim() || `Exit_Interview_${studentName}`).replace(/\.pdf$/i, "");
    window.open(
      `/api/courses/${courseId}/exit-interview/${interviewId}/export?filename=${encodeURIComponent(name)}`,
      "_blank", "noreferrer"
    );
    setShowModal(false);
  };

  return (
    <>
      <button onClick={open}
        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all"
        style={{ borderColor: "#e2e8f0", color: "#0f172a" }}>
        <Download size={12} /> <span className="hidden sm:inline">Download PDF</span><span className="sm:hidden">PDF</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            style={{ border: "1px solid #e2e8f0" }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "#fef2f2" }}>
              <Download className="w-5 h-5" style={{ color: MAROON }} />
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: "#0f172a" }}>Download PDF</p>
            <p className="text-xs mb-4" style={{ color: "#64748b" }}>You can rename the file before downloading.</p>
            <div className="mb-5">
              <label className="block mb-1.5" style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>File name</label>
              <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: "#e2e8f0" }}>
                <input ref={inputRef} value={filename} onChange={e => setFilename(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && confirm()}
                  className="flex-1 px-3 py-2 text-sm outline-none bg-white" style={{ color: "#0f172a" }} />
                <span className="px-3 py-2 text-xs font-semibold border-l"
                  style={{ borderColor: "#e2e8f0", color: "#94a3b8", background: "#f8fafc" }}>.pdf</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{ border: "1px solid #e2e8f0", color: "#64748b" }}>Cancel</button>
              <button onClick={confirm}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
                style={{ background: MAROON }}>Download</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Signature Pad ── */
function SignaturePad({ onSave, onCancel }: { onSave: (dataUrl: string) => void; onCancel: () => void }) {
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
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height); setHasDrawn(false);
  };

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} width={300} height={80}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-white touch-none cursor-crosshair"
        style={{ maxHeight: 80 }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={clear}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
          <X size={11} /> Clear
        </button>
        <button type="button" onClick={() => { const c = canvasRef.current; if (c) onSave(c.toDataURL("image/png")); }}
          disabled={!hasDrawn}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
          style={{ background: MAROON }}>
          <Check size={11} /> Save
        </button>
        <button type="button" onClick={onCancel}
          className="ml-auto text-xs font-semibold text-gray-400 hover:text-gray-600 px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Info field used in detail view ── */
function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2.5 border-b border-gray-100 last:border-0">
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 500, color: "#0f172a", lineHeight: 1.5 }}>{value || "—"}</p>
    </div>
  );
}

/* ── Questionnaire card ── */
function QCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", color: MAROON, marginBottom: 5 }}>{label}</p>
      <p style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{value}</p>
    </div>
  );
}

/* ── Detail View ── */
function InterviewDetailView({
  interview, courseId, isHead, onBack, onUpdated, onDeleted,
}: {
  interview: ExitInterview; courseId: string; isHead: boolean;
  onBack: () => void; onUpdated: (u: ExitInterview) => void; onDeleted: (id: string) => void;
}) {
  const [local,                setLocal]                = useState(interview);
  const [showDelete,           setShowDelete]           = useState(false);
  const [showSignPad,          setShowSignPad]          = useState(false);
  const [editingCounselorName, setEditingCounselorName] = useState(false);
  const [counselorName,        setCounselorName]        = useState(interview.counselorName ?? "");
  const [sigUploading,         setSigUploading]         = useState("");
  const [patching,             setPatching]             = useState(false);
  // Mobile: toggle between "info" and "questionnaire" panels
  const [mobilePanel, setMobilePanel] = useState<"info" | "questions">("info");

  const patch = async (data: Record<string, unknown>) => {
    setPatching(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/exit-interview/${local.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const d = await res.json();
      setLocal(d.interview); onUpdated(d.interview);
    } finally { setPatching(false); }
  };

  const handleCounselorSign = async (dataUrl: string) => {
    setSigUploading("Uploading...");
    try {
      const res  = await fetch(dataUrl); const blob = await res.blob();
      const fd   = new FormData(); fd.append("file", blob, "counselor-sig.png");
      const r    = await fetch(`/api/guidance/${courseId}/upload`, { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await patch({ counselorSignatureUrl: data.fileUrl, counselorName: counselorName || null, status: "REVIEWED" });
      setShowSignPad(false);
    } catch { setSigUploading("Upload failed. Try again."); }
    finally   { setSigUploading(""); }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/courses/${courseId}/exit-interview/${local.id}`, { method: "DELETE" });
    if (res.ok) { onDeleted(local.id); onBack(); }
  };

  const prob     = local.pressingProblemDetails ?? {};
  const feelings = [
    local.feelHappy && "Happy", local.feelExcited && "Excited", local.feelSad && "Sad",
    local.feelNervous && "Nervous", local.feelChallenged && "Challenged", local.feelOthers,
  ].filter(Boolean).join(", ") || "—";

  const influences = [
    ...["influenceProfessor","influenceClassmate","influenceFriends","influenceFamily"]
      .filter(k => (local as unknown as Record<string,unknown>)[k])
      .map(k => ({ influenceProfessor:"Professor", influenceClassmate:"Classmate", influenceFriends:"Friends", influenceFamily:"Family" }[k]!)),
    local.influenceOthers,
  ].filter(Boolean).join(", ") || "—";

  const plans = [
    local.planFindJob && "Find Job", local.planGradStudies && "Graduate studies",
    local.planBoardExam && "Board exam", local.planOthers && "Others",
  ].filter(Boolean).join(", ") || "—";

  const problems = [
    ...["familyProblem","schoolDifficulties","financialProblem","boyGirl","futureJob"]
      .filter(k => (prob as Record<string,unknown>)[k])
      .map(k => ({ familyProblem:"Family Problem", schoolDifficulties:"School Difficulties", financialProblem:"Financial Problem", boyGirl:"Boy/Girl Relationship", futureJob:"Future Job" }[k]!)),
    prob.others,
  ].filter(Boolean).join(", ") || "—";

  const qItems = [
    { label: "Q1 — How do you feel about graduating?", value: feelings },
    { label: "Q2 — Who influenced you most?",          value: influences },
    { label: "Q3 — Immediate plan after graduation?",  value: plans },
    ...(local.honorianValues ? [{ label: "Q4 — Honorian Values", value: local.honorianValues }] : []),
    { label: "Q5 — Pressing Problems", value: problems },
    ...(local.likedMost   ? [{ label: "Q6 — What did you like most about PSU?",  value: local.likedMost }]   : []),
    ...(local.likedLeast  ? [{ label: "Q7 — What did you like least about PSU?", value: local.likedLeast }]  : []),
    ...(local.recommend   ? [{ label: "Q8 — Would you recommend PSU?",           value: local.recommend }]   : []),
    ...(local.suggestions ? [{ label: "Q9 — Suggestions",                        value: local.suggestions }] : []),
  ];

  const RULE = "#e2e8f0";

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT, background: "#f8fafc" }}>

      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${RULE}` }}
        className="flex items-center gap-2 px-4 py-3 shrink-0">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold shrink-0"
          style={{ color: MAROON }}>
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Back</span>
        </button>
        <span style={{ width: 1, height: 16, background: RULE }} className="shrink-0" />
        <p className="text-sm font-bold flex-1 truncate" style={{ color: "#0f172a" }}>
          {local.lastName}, {local.firstName} {local.middleName ?? ""}
        </p>
        <StatusBadge status={local.status} hasCounselorSig={!!local.counselorSignatureUrl} />
        {isHead && (
          <div className="flex items-center gap-2 shrink-0">
            <DownloadPDFButton courseId={courseId} interviewId={local.id}
              studentName={`${local.lastName}_${local.firstName}`} />
            {local.status !== "REVIEWED" && !local.counselorSignatureUrl && (
              <button onClick={() => patch({ status: "REVIEWED" })} disabled={patching}
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50"
                style={{ borderColor: RULE, color: "#0f172a" }}>
                <Check size={12} /> Mark Reviewed
              </button>
            )}
            <button onClick={() => setShowDelete(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-red-50">
              <Trash2 size={14} className="text-red-400" />
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile panel toggle ── */}
      <div className="flex sm:hidden shrink-0 border-b border-gray-200 bg-white">
        {(["info","questions"] as const).map(p => (
          <button key={p} onClick={() => setMobilePanel(p)}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors"
            style={{
              color: mobilePanel === p ? MAROON : "#6b7280",
              borderBottom: mobilePanel === p ? `2px solid ${MAROON}` : "2px solid transparent",
            }}>
            {p === "info" ? "Info & Signatures" : "Questionnaire"}
          </button>
        ))}
      </div>

      {/* ── Counselor sign panel ── */}
      {showSignPad && (
        <div className="mx-4 mt-3 rounded-xl p-4 space-y-3 shrink-0"
          style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
          <p className="text-xs font-bold" style={{ color: "#0369a1" }}>Add Counselor Signature</p>
          <div>
            <label className="block mb-1" style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Counselor name</label>
            <input value={counselorName} onChange={e => setCounselorName(e.target.value)}
              placeholder="Full name of guidance counselor"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: `1px solid ${RULE}`, background: "#fff" }} />
          </div>
          <SignaturePad onSave={handleCounselorSign} onCancel={() => setShowSignPad(false)} />
          {sigUploading && <p className="text-xs" style={{ color: "#64748b" }}>{sigUploading}</p>}
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">

        {/* ── LEFT / INFO PANEL ── */}
        <div
          className={`sm:w-72 sm:flex flex-col border-r border-gray-200 bg-white overflow-y-auto shrink-0
            ${mobilePanel === "info" ? "flex flex-1 overflow-y-auto" : "hidden"}`}
        >
          {/* Personal info */}
          <div className="px-4 py-3 border-b border-gray-100" style={{ background: "#fafafa" }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: MAROON }}>
              Personal Information
            </p>
          </div>

          <div className="px-4 py-4 border-b border-gray-100">
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
              {local.lastName}, {local.firstName}
            </p>
            {local.middleName && <p style={{ fontSize: 12, color: "#64748b" }}>{local.middleName}</p>}
            {local.programSection && <p style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{local.programSection}</p>}
            {local.campus && <p style={{ fontSize: 11, color: "#64748b" }}>{local.campus}</p>}
          </div>

          <div className="px-4 py-2 flex-1">
            <InfoField label="Program & Section" value={local.programSection} />
            <InfoField label="Mobile No." value={local.mobileNo} />
            <InfoField label="Graduation Month" value={local.graduationMonth} />
            <InfoField label="Campus" value={local.campus} />
            <InfoField label="Home Address" value={local.homeAddress} />
            <InfoField label="Submitted" value={fmtDate(local.submittedAt)} />
          </div>

          {/* Signatures */}
          <div style={{ borderTop: `1px solid ${RULE}` }}>
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between"
              style={{ background: "#fafafa" }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: MAROON }}>Signatures</p>
              {isHead && (
                <button onClick={() => setShowSignPad(v => !v)}
                  className="flex items-center gap-1"
                  style={{ fontSize: 10, fontWeight: 700, color: showSignPad ? MAROON : "#94a3b8" }}>
                  <PenLine size={10} /> {local.counselorSignatureUrl ? "Re-sign" : "Add"}
                </button>
              )}
            </div>

            {/* Student signature */}
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${RULE}` }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 6 }}>Student</p>
              {local.studentSignatureUrl
                ? <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={local.studentSignatureUrl} alt="Student signature"
                      style={{ height: 40, border: `1px solid ${RULE}`, borderRadius: 6, background: "#fff", padding: 3 }} />
                    {local.studentSignedAt && <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{fmtDate(local.studentSignedAt)}</p>}
                  </>
                : <p style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>No signature on file</p>}
            </div>

            {/* Counselor signature */}
            <div className="px-4 py-3">
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 6 }}>Guidance Counselor</p>
              {local.counselorSignatureUrl
                ? <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={local.counselorSignatureUrl} alt="Counselor signature"
                      style={{ height: 40, border: `1px solid ${RULE}`, borderRadius: 6, background: "#fff", padding: 3 }} />
                    {editingCounselorName
                      ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input value={counselorName} onChange={e => setCounselorName(e.target.value)}
                            className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs outline-none min-w-0"
                            style={{ borderColor: RULE, color: "#0f172a" }}
                            onKeyDown={e => {
                              if (e.key === "Enter") { patch({ counselorName: counselorName || null }); setEditingCounselorName(false); }
                              if (e.key === "Escape") { setCounselorName(local.counselorName ?? ""); setEditingCounselorName(false); }
                            }}
                            autoFocus />
                          <button onClick={() => { patch({ counselorName: counselorName || null }); setEditingCounselorName(false); }}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg text-white shrink-0"
                            style={{ background: MAROON }}>Save</button>
                          <button onClick={() => { setCounselorName(local.counselorName ?? ""); setEditingCounselorName(false); }}
                            className="text-xs font-semibold px-2 py-1.5 rounded-lg shrink-0"
                            style={{ color: "#64748b", border: `1px solid ${RULE}` }}>✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1.5">
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                            {local.counselorName || <span style={{ color: "#94a3b8", fontStyle: "italic", fontWeight: 400 }}>No name set</span>}
                          </p>
                          {isHead && (
                            <button onClick={() => setEditingCounselorName(true)}
                              className="flex items-center gap-0.5"
                              style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>
                              <PenLine size={10} /> Edit
                            </button>
                          )}
                        </div>
                      )
                    }
                    {local.counselorSignedAt && <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{fmtDate(local.counselorSignedAt)}</p>}
                  </>
                : <p style={{ fontSize: 11, color: "#92400e", fontWeight: 600, fontStyle: "italic" }}>Pending counselor signature</p>}
            </div>

            {/* Mobile: mark reviewed inline */}
            {isHead && local.status !== "REVIEWED" && !local.counselorSignatureUrl && (
              <div className="px-4 pb-4 sm:hidden">
                <button onClick={() => patch({ status: "REVIEWED" })} disabled={patching}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl border transition-all disabled:opacity-50"
                  style={{ borderColor: RULE, color: "#0f172a" }}>
                  <Check size={12} /> Mark Reviewed
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT / QUESTIONNAIRE PANEL ── */}
        <div
          className={`flex-1 overflow-y-auto bg-gray-50
            ${mobilePanel === "questions" ? "flex flex-col" : "hidden sm:flex sm:flex-col"}`}
        >
          <div className="px-4 py-2.5 border-b border-gray-200 sticky top-0 z-10"
            style={{ background: "#fafafa" }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: MAROON }}>
              Questionnaire
            </p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {qItems.map(({ label, value }) => (
              <QCard key={label} label={label} value={value} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Delete confirm ── */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
          onClick={() => setShowDelete(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6"
            style={{ border: `1px solid ${RULE}` }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "#fef2f2" }}>
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: "#0f172a" }}>Delete this submission?</p>
            <p className="text-xs mb-5" style={{ color: "#64748b" }}>
              {local.lastName}, {local.firstName}<br />This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDelete(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{ border: `1px solid ${RULE}`, color: "#64748b" }}>Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Share Link Modal ── */
function ShareLinkModal({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/forms/exit-interview/${courseId}`;
  const [copied,    setCopied]    = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  useEffect(() => {
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}&color=7b1113&bgcolor=ffffff&margin=10`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 260; canvas.height = 260;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      setQrDataUrl(canvas.toDataURL("image/png"));
      setQrLoading(false);
    };
    img.onerror = () => setQrLoading(false);
    img.src = apiUrl;
  }, [url]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl; a.download = `exit-interview-qr-${courseId}.png`; a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-96 overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <GraduationCap size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Exit Interview</p>
              <p className="text-sm font-black text-white">Student Form Link</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Share this link or QR code with graduating students to fill out their Exit Interview Form.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <p className="text-xs text-gray-700 font-mono flex-1 break-all">{url}</p>
            <button onClick={copy}
              className="shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={copied ? { background: "#dcfce7", color: "#15803d" } : { background: "#fef2f2", color: MAROON }}>
              {copied ? <><Check size={11} /> Copied!</> : "Copy"}
            </button>
          </div>
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest self-start" style={{ color: MAROON }}>QR Code</p>
            <div className="w-44 h-44 rounded-xl border-2 border-gray-100 flex items-center justify-center bg-white shadow-sm overflow-hidden">
              {qrLoading
                ? <div className="w-8 h-8 rounded-full border-2 border-gray-200 animate-spin" style={{ borderTopColor: MAROON }} />
                : qrDataUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                  : <p className="text-[10px] text-gray-400 text-center px-4">Failed to generate QR</p>}
            </div>
            <button onClick={downloadQR} disabled={!qrDataUrl || qrLoading}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition-all disabled:opacity-40"
              style={{ borderColor: MAROON, color: MAROON }}>
              <Download size={12} /> Download QR Code
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="w-full h-10 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-3 flex items-center gap-2.5">
      <div className="rounded-lg p-1.5 shrink-0" style={{ background: "#f3f4f6" }}>
        <Users className="w-3.5 h-3.5" style={{ color: MAROON }} />
      </div>
      <div>
        <p className="text-lg font-black tabular-nums text-gray-900 leading-none">{value}</p>
        <p className="text-[10px] font-semibold text-gray-500 mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

/* ── Main Tab ── */
export default function CourseExitInterviewTab({ courseId, isHead }: Props) {
  const [interviews,   setInterviews]   = useState<ExitInterview[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters,  setShowFilters]  = useState(false);
  const [showShare,    setShowShare]    = useState(false);
  const [detail,       setDetail]       = useState<ExitInterview | null>(null);
  const [page,         setPage]         = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search)       params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res  = await fetch(`/api/courses/${courseId}/exit-interview?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setInterviews(data.interviews ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally { setLoading(false); }
  }, [courseId, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(interviews.length / PAGE_SIZE));
  const paginated  = interviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (detail) {
    return (
      <InterviewDetailView
        interview={detail} courseId={courseId} isHead={isHead}
        onBack={() => setDetail(null)}
        onUpdated={u => { setInterviews(prev => prev.map(i => i.id === u.id ? u : i)); setDetail(u); }}
        onDeleted={id => { setInterviews(prev => prev.filter(i => i.id !== id)); setDetail(null); }}
      />
    );
  }

  return (
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-0.5" style={{ color: MAROON }}>Guidance</p>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-none">Exit Interviews</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchData}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 py-1.5 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-1.5 rounded-lg text-white transition-all"
            style={{ background: MAROON }}>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share Form</span>
            <span className="sm:hidden">Share</span>
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-4">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatCard label="Total" value={interviews.length} />
          <StatCard label="Pending Sig." value={interviews.filter(i => !i.counselorSignatureUrl).length} />
          <StatCard label="Completed" value={interviews.filter(i => !!i.counselorSignatureUrl).length} />
          <StatCard label="Reviewed" value={interviews.filter(i => i.status === "REVIEWED").length} />
        </div>

        {/* ── Table card ── */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">

          {/* Toolbar */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 min-w-0 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..."
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button onClick={() => setShowFilters(f => !f)}
              style={(showFilters || !!statusFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0
                ${!(showFilters || !!statusFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400" : ""}`}>
              <Filter className="w-3 h-3" />
              <span className="hidden sm:inline">Filters</span>
              {statusFilter && <span className="ml-0.5">•</span>}
            </button>
          </div>

          {showFilters && (
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Status</span>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 outline-none">
                  <option value="">All</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="REVIEWED">Reviewed</option>
                </select>
                {statusFilter && (
                  <button onClick={() => setStatusFilter("")}
                    className="flex items-center gap-1 text-[11px] font-bold hover:underline" style={{ color: MAROON }}>
                    <X size={11} /> Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex-1 overflow-hidden">
              <div className="animate-pulse divide-y divide-gray-100">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                    <div className="h-3 w-6 bg-gray-100 rounded" />
                    <div className="h-3 w-32 bg-gray-100 rounded" />
                    <div className="h-3 w-20 bg-gray-100 rounded" />
                    <div className="h-3 flex-1 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-xs font-medium text-red-500 py-12">{error}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* ── Desktop table ── */}
              <table className="w-full border-collapse hidden sm:table">
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["No.","Name","Program / Section","Campus","Grad Month","Counselor Sig","Status",""].map((h, i) => (
                      <th key={i} className="text-left px-3 py-2.5 whitespace-nowrap" style={{ border: "1px solid #e5e7eb" }}>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{h}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {interviews.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-16">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                          <GraduationCap className="w-6 h-6" style={{ color: MAROON }} />
                        </div>
                        <p className="text-sm text-gray-400 font-medium">No submissions yet.</p>
                        <button onClick={() => setShowShare(true)} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                          Share the form link with students →
                        </button>
                      </div>
                    </td></tr>
                  )}
                  {paginated.map((iv, i) => (
                    <tr key={iv.id} className="hover:bg-gray-50/70 cursor-pointer transition-colors" onClick={() => setDetail(iv)}>
                      <td className="px-3 py-2.5 text-xs text-gray-500 text-center tabular-nums" style={{ border: "1px solid #e5e7eb" }}>
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-gray-800 whitespace-nowrap" style={{ border: "1px solid #e5e7eb" }}>
                        {iv.lastName}, {iv.firstName}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600" style={{ border: "1px solid #e5e7eb" }}>{iv.programSection ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600" style={{ border: "1px solid #e5e7eb" }}>{iv.campus ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap" style={{ border: "1px solid #e5e7eb" }}>{iv.graduationMonth ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center" style={{ border: "1px solid #e5e7eb" }}>
                        {iv.counselorSignatureUrl
                          ? <Check size={13} className="mx-auto text-green-500" />
                          : <span className="text-[10px] text-amber-500 font-bold">Pending</span>}
                      </td>
                      <td className="px-3 py-2.5" style={{ border: "1px solid #e5e7eb" }}>
                        <StatusBadge status={iv.status} hasCounselorSig={!!iv.counselorSignatureUrl} />
                      </td>
                      <td className="px-2 py-2.5 w-10" onClick={e => e.stopPropagation()}>
                        {isHead && (
                          <button onClick={() => setDetail(iv)} className="text-xs text-gray-400 hover:text-gray-700 px-1">View</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ── Mobile list ── */}
              <div className="sm:hidden divide-y divide-gray-100">
                {interviews.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-14 gap-3 px-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                      <GraduationCap className="w-6 h-6" style={{ color: MAROON }} />
                    </div>
                    <p className="text-sm text-gray-400 font-medium text-center">No submissions yet.</p>
                    <button onClick={() => setShowShare(true)} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                      Share link →
                    </button>
                  </div>
                )}
                {paginated.map(iv => (
                  <button key={iv.id}
                    className="w-full text-left px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    onClick={() => setDetail(iv)}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {iv.lastName}, {iv.firstName}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {[iv.programSection, iv.campus].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {iv.counselorSignatureUrl
                          ? <Check size={13} className="text-green-500" />
                          : <span className="text-[10px] text-amber-500 font-bold">Pending</span>}
                        <StatusBadge status={iv.status} hasCounselorSig={!!iv.counselorSignatureUrl} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-gray-400">{fmtDate(iv.submittedAt)}</p>
                      {iv.graduationMonth && (
                        <p className="text-[10px] text-gray-400">· Grad: {iv.graduationMonth}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Pagination ── */}
          {!loading && interviews.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-white shrink-0 flex-wrap gap-2">
              <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, interviews.length)} of {interviews.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 disabled:opacity-25">
                  <ChevronLeft className="w-3 h-3" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const n = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  return (
                    <button key={n} onClick={() => setPage(n)}
                      style={page === n ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-semibold border transition-all
                        ${page !== n ? "border-gray-200 text-gray-500 hover:border-gray-400" : ""}`}>
                      {n}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 disabled:opacity-25">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showShare && <ShareLinkModal courseId={courseId} onClose={() => setShowShare(false)} />}
    </div>
  );
}