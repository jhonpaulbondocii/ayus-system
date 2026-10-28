"use client";

// src/components/layout/course/CourseExitInterviewTab.tsx

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, Trash2, Check, ArrowLeft,
  X, Download, PenLine, QrCode, Copy, GraduationCap, AlertCircle,
  CheckCircle2, Inbox, MoreVertical, Clock, Eye,
} from "lucide-react";
import { FONT } from "./osaShared";

/* ════════════════════════════════════════════════════════════════════════════
   1. DESIGN TOKENS (same as CourseLibraryTab)
   ════════════════════════════════════════════════════════════════════════════ */

const C = {
  brand:      "#7b1113",
  brandDark:  "#5e0d0f",
  brandTint:  "#fdf2f2",
  brandRing:  "rgba(123,17,19,0.12)",
  ink:        "#111827",
  body:       "#374151",
  muted:      "#6b7280",
  faint:      "#9ca3af",
  line:       "#e5e7eb",
  lineSoft:   "#f3f4f6",
  surface:    "#ffffff",
  canvas:     "#ffffff",
  danger:     "#b91c1c",
} as const;

const PAGE_SIZE = 15;

/* ════════════════════════════════════════════════════════════════════════════
   2. TYPES & STATIC META
   ════════════════════════════════════════════════════════════════════════════ */

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

type DisplayStatus = "SUBMITTED" | "REVIEWED" | "COMPLETED";

const STATUS_META: Record<DisplayStatus, { label: string; color: string; bg: string; icon: ReactNode }> = {
  SUBMITTED: { label: "Submitted", color: "#92400e", bg: "#fef3c7", icon: <Clock size={11} /> },
  REVIEWED:  { label: "Reviewed",  color: "#1e40af", bg: "#dbeafe", icon: <Eye size={11} /> },
  COMPLETED: { label: "Completed", color: "#065f46", bg: "#d1fae5", icon: <Check size={11} /> },
};

const STATUS_TABS: Array<DisplayStatus | "ALL"> = ["ALL", "SUBMITTED", "REVIEWED", "COMPLETED"];

const displayStatusOf = (i: ExitInterview): DisplayStatus =>
  i.counselorSignatureUrl ? "COMPLETED" : i.status === "REVIEWED" ? "REVIEWED" : "SUBMITTED";

const fullName = (i: ExitInterview) =>
  `${i.lastName}, ${i.firstName}${i.middleName ? ` ${i.middleName}` : ""}`;

/* ════════════════════════════════════════════════════════════════════════════
   3. HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ════════════════════════════════════════════════════════════════════════════
   4. SMALL UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: DisplayStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}
    >
      {m.icon} {m.label}
    </span>
  );
}

function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: C.brandTint }}>
        <Inbox className="w-6 h-6" style={{ color: C.brand }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: C.ink }}>{title}</p>
      {hint && <p className="text-xs max-w-xs" style={{ color: C.muted }}>{hint}</p>}
      {action}
    </div>
  );
}

type ToastState = { msg: string; tone: "success" | "error" } | null;

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const isErr = toast.tone === "error";
  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold text-white"
      style={{
        background: isErr ? C.danger : C.ink,
        bottom: "calc(24px + env(safe-area-inset-bottom))",
        fontFamily: FONT,
      }}
    >
      {isErr ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      {toast.msg}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   5. MODAL SHELL (bottom-sheet on mobile, centered on desktop)
   ════════════════════════════════════════════════════════════════════════════ */

function SheetModal({
  onClose, tone = "brand", icon, title, subtitle, children, footer, maxWidth = "max-w-md",
}: {
  onClose: () => void;
  tone?: "brand" | "danger";
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const accent = tone === "danger" ? C.danger : C.brand;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      style={{ backdropFilter: "blur(3px)", fontFamily: FONT }}
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} sm:mx-4 overflow-hidden flex flex-col max-h-[92vh]`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 shrink-0" style={{ background: accent, color: "#fff" }}>
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/20">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate" style={{ fontSize: 14, fontWeight: 800 }}>{title}</p>
              {subtitle && <p className="text-xs truncate text-white/70">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
        {footer && (
          <div
            className="border-t shrink-0 bg-gray-50"
            style={{ borderColor: C.line, paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({
  title, message, confirmLabel, busy, onConfirm, onClose,
}: {
  title: string; message: ReactNode; confirmLabel: string;
  busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <SheetModal
      onClose={onClose}
      tone="danger"
      icon={<Trash2 size={16} />}
      title={title}
      maxWidth="max-w-sm"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: C.danger }}>
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 text-sm leading-relaxed" style={{ color: C.body }}>{message}</div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   6. SIGNATURE PAD
   ════════════════════════════════════════════════════════════════════════════ */

function SignaturePad({ onSave, onCancel, busy }: { onSave: (dataUrl: string) => void; onCancel: () => void; busy?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect();
    // Scale from CSS pixels to canvas pixels so strokes land under the cursor
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
    <div className="space-y-2">
      <canvas
        ref={canvasRef} width={340} height={90}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-white touch-none cursor-crosshair"
        style={{ maxHeight: 90 }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div className="flex gap-2 flex-wrap items-center">
        <button type="button" onClick={clear}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
          <X size={11} /> Clear
        </button>
        <button type="button"
          onClick={() => { const c = canvasRef.current; if (c) onSave(c.toDataURL("image/png")); }}
          disabled={!hasDrawn || busy}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
          style={{ background: C.brand }}>
          {busy ? <><RefreshCw size={11} className="animate-spin" /> Uploading…</> : <><Check size={11} /> Save signature</>}
        </button>
        <button type="button" onClick={onCancel}
          className="ml-auto text-xs font-semibold text-gray-400 hover:text-gray-600 px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   7. MODALS: download PDF / share link
   ════════════════════════════════════════════════════════════════════════════ */

function DownloadPdfModal({
  courseId, interviewId, studentName, onClose,
}: { courseId: string; interviewId: string; studentName: string; onClose: () => void }) {
  const [filename, setFilename] = useState(`Exit_Interview_${studentName.replace(/\s+/g, "_")}`);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.select(); }, []);

  const confirm = () => {
    const name = (filename.trim() || `Exit_Interview_${studentName}`).replace(/\.pdf$/i, "");
    window.open(
      `/api/courses/${courseId}/exit-interview/${interviewId}/export?filename=${encodeURIComponent(name)}`,
      "_blank", "noreferrer",
    );
    onClose();
  };

  return (
    <SheetModal
      onClose={onClose}
      icon={<Download size={16} />}
      title="Download PDF"
      subtitle="You can rename the file first"
      maxWidth="max-w-sm"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={confirm}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold text-white"
            style={{ background: C.brand }}>
            <Download size={13} /> Download
          </button>
        </div>
      }
    >
      <div className="px-5 py-5">
        <label className="block text-xs font-semibold text-gray-600 mb-1">File name</label>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#7b1113] focus-within:ring-2 focus-within:ring-[#7b1113]/10 transition-all">
          <input
            ref={inputRef} value={filename} onChange={e => setFilename(e.target.value)}
            onKeyDown={e => e.key === "Enter" && confirm()}
            className="flex-1 min-w-0 px-3 py-2.5 sm:py-2 text-sm outline-none bg-white"
          />
          <span className="px-3 py-2.5 sm:py-2 text-xs font-semibold border-l border-gray-200 bg-gray-50" style={{ color: C.faint }}>.pdf</span>
        </div>
      </div>
    </SheetModal>
  );
}

function ShareLinkModal({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/forms/exit-interview/${courseId}`;
  const [copied, setCopied]       = useState(false);
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
    <SheetModal
      onClose={onClose}
      icon={<QrCode size={16} />}
      title="Student form link"
      subtitle="Exit interview"
      footer={
        <button onClick={onClose} className="w-full h-11 sm:h-10 text-xs font-semibold text-gray-600 hover:bg-gray-100">
          Close
        </button>
      }
    >
      <div className="px-5 py-5 space-y-5">
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
          Share this link or QR code with graduating students so they can fill out the Exit Interview Form.
        </p>

        <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 bg-gray-50" style={{ borderColor: C.line }}>
          <p className="text-xs font-mono flex-1 break-all" style={{ color: C.body }}>{url}</p>
          <button onClick={copy}
            className="shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
            style={copied ? { background: "#dcfce7", color: "#15803d" } : { background: C.brandTint, color: C.brand }}>
            {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-xl border flex items-center justify-center bg-white overflow-hidden" style={{ borderColor: C.line }}>
            {qrLoading ? (
              <div className="w-8 h-8 rounded-full border-2 border-gray-200 animate-spin" style={{ borderTopColor: C.brand }} />
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR code for the exit interview form" className="w-full h-full object-contain" />
            ) : (
              <p className="text-[11px] text-gray-400 text-center px-4">Couldn’t generate the QR code. Check your connection and reopen this window.</p>
            )}
          </div>
          <button onClick={downloadQR} disabled={!qrDataUrl || qrLoading}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition-all disabled:opacity-40"
            style={{ borderColor: C.brand, color: C.brand }}>
            <Download size={12} /> Download QR code
          </button>
        </div>
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   8. MOBILE ACTION SHEET
   ════════════════════════════════════════════════════════════════════════════ */

interface SheetAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function ActionSheet({ actions, onClose }: { actions: SheetAction[]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:hidden"
      style={{ backdropFilter: "blur(3px)", fontFamily: FONT }}
      onClick={onClose}
    >
      <div className="bg-white rounded-t-2xl shadow-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-2.5 pb-1"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <p className="px-5 pt-1 pb-2 text-xs font-semibold" style={{ color: C.muted }}>More actions</p>
        <div className="pb-2">
          {actions.map(a => (
            <button
              key={a.key}
              onClick={() => { if (!a.disabled) { a.onClick(); onClose(); } }}
              disabled={a.disabled}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-left disabled:opacity-40 active:bg-gray-50"
              style={{ color: a.danger ? C.danger : C.ink }}
            >
              <span className="w-5 flex items-center justify-center">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
        <div className="border-t px-5 py-3.5" style={{ borderColor: C.line, paddingBottom: "calc(14px + env(safe-area-inset-bottom))" }}>
          <button onClick={onClose} className="w-full text-center text-sm font-bold text-gray-500">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   9. DETAIL VIEW
   ════════════════════════════════════════════════════════════════════════════ */

function InfoField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium mb-0.5" style={{ color: C.muted }}>{label}</dt>
      <dd className="text-[13px] font-medium break-words" style={{ color: C.ink, lineHeight: 1.5 }}>{value}</dd>
    </div>
  );
}

function Panel({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-xl border overflow-hidden ${className}`} style={{ borderColor: C.line }}>
      <header className="px-4 sm:px-5 py-3 border-b flex items-center justify-between gap-2" style={{ borderColor: C.lineSoft }}>
        <h2 className="text-sm font-bold" style={{ color: C.ink }}>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function QCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border px-4 py-3" style={{ borderColor: C.line, background: "#fff" }}>
      <p className="text-[11px] font-semibold mb-1.5" style={{ color: C.brand }}>{label}</p>
      <p className="text-[13px] m-0" style={{ color: C.ink, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{value}</p>
    </div>
  );
}

function InterviewDetailView({
  interview, courseId, isHead, onBack, onUpdated, onDeleted, notify,
}: {
  interview: ExitInterview; courseId: string; isHead: boolean;
  onBack: () => void;
  onUpdated: (u: ExitInterview) => void;
  onDeleted: (id: string) => void;
  notify: (msg: string, tone?: "success" | "error") => void;
}) {
  const [local,                setLocal]                = useState(interview);
  const [showDelete,           setShowDelete]           = useState(false);
  const [deleting,             setDeleting]             = useState(false);
  const [showPdf,              setShowPdf]              = useState(false);
  const [showMore,             setShowMore]             = useState(false);
  const [showSignPad,          setShowSignPad]          = useState(false);
  const [editingCounselorName, setEditingCounselorName] = useState(false);
  const [counselorName,        setCounselorName]        = useState(interview.counselorName ?? "");
  const [sigUploading,         setSigUploading]         = useState(false);
  const [patching,             setPatching]             = useState(false);

  const patch = async (data: Record<string, unknown>, successMsg?: string) => {
    setPatching(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/exit-interview/${local.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) { notify("Couldn’t update the submission. Please try again.", "error"); return false; }
      const d = await res.json();
      setLocal(d.interview); onUpdated(d.interview);
      if (successMsg) notify(successMsg);
      return true;
    } catch {
      notify("Couldn’t update the submission. Check your connection.", "error");
      return false;
    } finally { setPatching(false); }
  };

  const handleCounselorSign = async (dataUrl: string) => {
    setSigUploading(true);
    try {
      const res  = await fetch(dataUrl); const blob = await res.blob();
      const fd   = new FormData(); fd.append("file", blob, "counselor-sig.png");
      const r    = await fetch(`/api/guidance/${courseId}/upload`, { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const ok = await patch(
        { counselorSignatureUrl: data.fileUrl, counselorName: counselorName || null, status: "REVIEWED" },
        "Signature saved",
      );
      if (ok) setShowSignPad(false);
    } catch { notify("Upload failed. Please try again.", "error"); }
    finally  { setSigUploading(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/exit-interview/${local.id}`, { method: "DELETE" });
      if (res.ok) { onDeleted(local.id); onBack(); return; }
      notify("Couldn’t delete the submission.", "error");
    } catch { notify("Couldn’t delete the submission.", "error"); }
    finally { setDeleting(false); setShowDelete(false); }
  };

  const saveCounselorName = () => {
    patch({ counselorName: counselorName || null }, "Name updated");
    setEditingCounselorName(false);
  };

  const prob     = local.pressingProblemDetails ?? {};
  const feelings = [
    local.feelHappy && "Happy", local.feelExcited && "Excited", local.feelSad && "Sad",
    local.feelNervous && "Nervous", local.feelChallenged && "Challenged", local.feelOthers,
  ].filter(Boolean).join(", ") || "—";

  const influences = [
    ...["influenceProfessor", "influenceClassmate", "influenceFriends", "influenceFamily"]
      .filter(k => (local as unknown as Record<string, unknown>)[k])
      .map(k => ({ influenceProfessor: "Professor", influenceClassmate: "Classmate", influenceFriends: "Friends", influenceFamily: "Family" }[k]!)),
    local.influenceOthers,
  ].filter(Boolean).join(", ") || "—";

  const plans = [
    local.planFindJob && "Find Job", local.planGradStudies && "Graduate studies",
    local.planBoardExam && "Board exam", local.planOthers && "Others",
  ].filter(Boolean).join(", ") || "—";

  const problems = [
    ...["familyProblem", "schoolDifficulties", "financialProblem", "boyGirl", "futureJob"]
      .filter(k => (prob as Record<string, unknown>)[k])
      .map(k => ({ familyProblem: "Family Problem", schoolDifficulties: "School Difficulties", financialProblem: "Financial Problem", boyGirl: "Boy/Girl Relationship", futureJob: "Future Job" }[k]!)),
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

  const name         = fullName(local);
  const canMarkRev   = local.status !== "REVIEWED" && !local.counselorSignatureUrl;
  const pdfName      = `${local.lastName}_${local.firstName}`;

  const secondaryActions: SheetAction[] = [
    { key: "pdf",    label: "Download PDF",       icon: <Download size={15} />, onClick: () => setShowPdf(true) },
    { key: "sign",   label: local.counselorSignatureUrl ? "Re-sign as counselor" : "Add counselor signature", icon: <PenLine size={15} />, onClick: () => setShowSignPad(true) },
    { key: "delete", label: "Delete submission",  icon: <Trash2 size={15} />,   onClick: () => setShowDelete(true), danger: true },
  ];

  const ghostBtn =
    "flex items-center gap-1.5 text-xs font-semibold px-3 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT, background: C.canvas }}>

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 shrink-0 bg-white border-b" style={{ borderColor: C.line }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold shrink-0" style={{ color: C.brand }}>
          <ArrowLeft size={15} /> Back
        </button>
        <span className="w-px h-4 shrink-0" style={{ background: C.line }} />
        <p className="text-sm font-bold flex-1 truncate min-w-0" style={{ color: C.ink }}>{name}</p>
        <StatusBadge status={displayStatusOf(local)} />

        {isHead && (
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={() => setShowPdf(true)} className={ghostBtn}>
              <Download size={13} /> Download PDF
            </button>
            {canMarkRev && (
              <button onClick={() => patch({ status: "REVIEWED" }, "Marked as reviewed")} disabled={patching}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-8 rounded-lg text-white transition-opacity disabled:opacity-50"
                style={{ background: C.brand }}>
                <Check size={13} /> Mark reviewed
              </button>
            )}
            <button onClick={() => setShowDelete(true)} aria-label="Delete submission"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {isHead && (
          <button onClick={() => setShowMore(true)} aria-label="More actions"
            className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 shrink-0">
            <MoreVertical size={17} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)] gap-4 items-start">

          {/* Left: student + signatures */}
          <div className="flex flex-col gap-4 sm:gap-5">
            <Panel title="Student information">
              <div className="px-4 sm:px-5 py-4 border-b" style={{ borderColor: C.lineSoft }}>
                <p className="text-base font-bold" style={{ color: C.ink }}>{name}</p>
                {local.programSection && <p className="text-xs mt-1" style={{ color: C.muted }}>{local.programSection}</p>}
              </div>
              <dl className="px-4 sm:px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-6 gap-y-4">
                <InfoField label="Mobile no."       value={local.mobileNo} />
                <InfoField label="Graduation month" value={local.graduationMonth} />
                <InfoField label="Campus"           value={local.campus} />
                <InfoField label="Home address"     value={local.homeAddress} />
                <InfoField label="Submitted"        value={fmtDate(local.submittedAt)} />
              </dl>
            </Panel>

            <Panel
              title="Signatures"
              action={isHead && !showSignPad ? (
                <button onClick={() => setShowSignPad(true)}
                  className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: C.brand }}>
                  <PenLine size={12} /> {local.counselorSignatureUrl ? "Re-sign" : "Add counselor"}
                </button>
              ) : undefined}
            >
              {/* Student */}
              <div className="px-4 sm:px-5 py-4 border-b" style={{ borderColor: C.lineSoft }}>
                <p className="text-[11px] font-medium mb-1.5" style={{ color: C.muted }}>Student</p>
                {local.studentSignatureUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={local.studentSignatureUrl} alt="Student signature"
                      className="h-12 border rounded-lg bg-white p-1" style={{ borderColor: C.line }} />
                    {local.studentSignedAt && <p className="text-[11px] mt-1.5" style={{ color: C.faint }}>{fmtDate(local.studentSignedAt)}</p>}
                  </>
                ) : (
                  <p className="text-xs italic" style={{ color: C.faint }}>No signature on file</p>
                )}
              </div>

              {/* Counselor */}
              <div className="px-4 sm:px-5 py-4">
                <p className="text-[11px] font-medium mb-1.5" style={{ color: C.muted }}>Guidance counselor</p>

                {showSignPad ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Counselor name</label>
                      <input
                        value={counselorName} onChange={e => setCounselorName(e.target.value)}
                        placeholder="Full name of guidance counselor"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white"
                      />
                    </div>
                    <SignaturePad onSave={handleCounselorSign} onCancel={() => setShowSignPad(false)} busy={sigUploading} />
                  </div>
                ) : local.counselorSignatureUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={local.counselorSignatureUrl} alt="Counselor signature"
                      className="h-12 border rounded-lg bg-white p-1" style={{ borderColor: C.line }} />
                    {editingCounselorName ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          value={counselorName} onChange={e => setCounselorName(e.target.value)} autoFocus
                          onKeyDown={e => {
                            if (e.key === "Enter") saveCounselorName();
                            if (e.key === "Escape") { setCounselorName(local.counselorName ?? ""); setEditingCounselorName(false); }
                          }}
                          className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#7b1113]"
                        />
                        <button onClick={saveCounselorName}
                          className="text-xs font-bold px-3 h-8 rounded-lg text-white shrink-0" style={{ background: C.brand }}>
                          Save
                        </button>
                        <button onClick={() => { setCounselorName(local.counselorName ?? ""); setEditingCounselorName(false); }}
                          aria-label="Cancel"
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[13px] font-semibold" style={{ color: C.ink }}>
                          {local.counselorName || <span className="italic font-normal" style={{ color: C.faint }}>No name set</span>}
                        </p>
                        {isHead && (
                          <button onClick={() => setEditingCounselorName(true)}
                            className="flex items-center gap-1 text-[11px] font-bold hover:underline" style={{ color: C.brand }}>
                            <PenLine size={10} /> Edit
                          </button>
                        )}
                      </div>
                    )}
                    {local.counselorSignedAt && <p className="text-[11px] mt-1" style={{ color: C.faint }}>{fmtDate(local.counselorSignedAt)}</p>}
                  </>
                ) : (
                  <p className="text-xs font-semibold" style={{ color: "#92400e" }}>Pending counselor signature</p>
                )}
              </div>
            </Panel>
          </div>

          {/* Right: questionnaire */}
          <Panel title="Questionnaire">
            <div className="p-4 sm:p-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
              {qItems.map(q => <QCard key={q.label} label={q.label} value={q.value} />)}
            </div>
          </Panel>
        </div>

        {/* Spacer so content clears the mobile sticky bar */}
        {isHead && canMarkRev && <div className="h-20 sm:hidden" />}
      </div>

      {/* Mobile sticky primary action */}
      {isHead && canMarkRev && (
        <div
          className="sm:hidden shrink-0 border-t bg-white px-4 pt-3"
          style={{ borderColor: C.line, paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
        >
          <button onClick={() => patch({ status: "REVIEWED" }, "Marked as reviewed")} disabled={patching}
            className="w-full flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: C.brand }}>
            <Check size={14} /> Mark reviewed
          </button>
        </div>
      )}

      {showMore && <ActionSheet actions={secondaryActions} onClose={() => setShowMore(false)} />}
      {showPdf && (
        <DownloadPdfModal courseId={courseId} interviewId={local.id} studentName={pdfName} onClose={() => setShowPdf(false)} />
      )}
      {showDelete && (
        <ConfirmModal
          title="Delete this submission?" confirmLabel="Delete" busy={deleting}
          message={<><strong>{name}</strong><br />This can’t be undone.</>}
          onConfirm={handleDelete} onClose={() => { if (!deleting) setShowDelete(false); }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   10. LIST VIEW (default export)
   ════════════════════════════════════════════════════════════════════════════ */

export default function CourseExitInterviewTab({ courseId, isHead }: Props) {
  const [interviews, setInterviews] = useState<ExitInterview[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [search,     setSearch]     = useState("");
  const [statusTab,  setStatusTab]  = useState<DisplayStatus | "ALL">("ALL");
  const [showShare,  setShowShare]  = useState(false);
  const [detail,     setDetail]     = useState<ExitInterview | null>(null);
  const [page,       setPage]       = useState(1);
  const [toast,      setToast]      = useState<ToastState>(null);

  const debouncedSearch = useDebounced(search, 300);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* Server handles search. Status tabs are filtered locally so counts stay accurate. */
  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res  = await fetch(`/api/courses/${courseId}/exit-interview?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load submissions.");
      setInterviews(data.interviews ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions.");
    } finally { setLoading(false); }
  }, [courseId, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusTab]);

  const counts = useMemo(() => {
    const c: Record<DisplayStatus | "ALL", number> = { ALL: interviews.length, SUBMITTED: 0, REVIEWED: 0, COMPLETED: 0 };
    interviews.forEach(i => { c[displayStatusOf(i)] += 1; });
    return c;
  }, [interviews]);

  const filtered   = useMemo(
    () => statusTab === "ALL" ? interviews : interviews.filter(i => displayStatusOf(i) === statusTab),
    [interviews, statusTab],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) =>
    totalPages <= 5 || page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i,
  );

  const hasAnyFilter = !!(search || statusTab !== "ALL");
  const resetAll = () => { setSearch(""); setStatusTab("ALL"); };

  const emptyState = interviews.length === 0 && !hasAnyFilter ? (
    <EmptyState
      title="No submissions yet"
      hint="Share the form link so graduating students can submit their exit interview."
      action={
        <button onClick={() => setShowShare(true)}
          className="mt-2 flex items-center gap-1.5 text-xs font-bold px-4 h-9 rounded-lg text-white" style={{ background: C.brand }}>
          <QrCode size={13} /> Share form link
        </button>
      }
    />
  ) : (
    <EmptyState
      title="No matching submissions"
      hint="Try a different search or clear the filters."
      action={
        <button onClick={resetAll} className="mt-2 text-xs font-bold hover:underline" style={{ color: C.brand }}>
          Clear all filters
        </button>
      }
    />
  );

  /* ── Detail ── */
  if (detail) {
    return (
      <>
        <InterviewDetailView
          interview={detail} courseId={courseId} isHead={isHead} notify={notify}
          onBack={() => setDetail(null)}
          onUpdated={u => { setInterviews(prev => prev.map(i => i.id === u.id ? u : i)); setDetail(u); }}
          onDeleted={id => { setInterviews(prev => prev.filter(i => i.id !== id)); setDetail(null); }}
        />
        <Toast toast={toast} />
      </>
    );
  }

  /* ── List ── */
  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: C.canvas }}>

      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between shrink-0 gap-3" style={{ borderColor: C.line }}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Exit interviews</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: C.faint }}>Review submissions from graduating students and add counselor signatures.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchData} aria-label="Refresh"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 w-9 h-9 sm:w-auto sm:px-3 rounded-lg transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-9 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: C.brand }}>
            <QrCode className="w-3.5 h-3.5" />
            <span>Share<span className="hidden sm:inline"> form link</span></span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5 min-h-0">

        {/* Table card */}
        <div className="flex-1 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[420px]" style={{ borderColor: C.line }}>

          {/* Status tabs */}
          <div className="border-b overflow-x-auto" style={{ borderColor: C.line }}>
            <div role="tablist" className="flex px-2 sm:px-3 min-w-max">
              {STATUS_TABS.map(t => {
                const active = statusTab === t;
                return (
                  <button
                    key={t} role="tab" aria-selected={active} onClick={() => setStatusTab(t)}
                    className="relative flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors"
                    style={{ color: active ? C.brand : C.muted }}
                  >
                    {t === "ALL" ? "All" : STATUS_META[t].label}
                    <span className="text-[11px] tabular-nums px-1.5 rounded-full"
                      style={{ background: active ? C.brandTint : C.lineSoft, color: active ? C.brand : C.muted }}>
                      {counts[t]}
                    </span>
                    {active && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full" style={{ background: C.brand }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b flex items-center gap-2" style={{ borderColor: C.lineSoft }}>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-9 flex-1 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-colors min-w-0">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name"
                aria-label="Search submissions"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="animate-pulse divide-y divide-gray-100" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                  <div className="h-3 w-20 bg-gray-100 rounded hidden sm:block" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                  <div className="h-5 w-16 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={fetchData}
                className="text-xs font-bold px-4 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1">{emptyState}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop table */}
              <table className="w-full border-collapse hidden sm:table">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: "#fafafa" }}>
                    {["No.", "Student", "Program / section", "Campus", "Grad month", "Submitted", "Status", ""].map((h, i) => (
                      <th key={i} scope="col"
                        className="text-left px-4 py-2.5 whitespace-nowrap border-b"
                        style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((iv, i) => (
                    <tr
                      key={iv.id} onClick={() => setDetail(iv)} tabIndex={0}
                      onKeyDown={e => { if (e.key === "Enter") setDetail(iv); }}
                      className="group cursor-pointer hover:bg-gray-50 focus:bg-gray-50 outline-none transition-colors"
                    >
                      <td className="px-4 py-3.5 text-xs tabular-nums border-b" style={{ color: C.faint, borderColor: C.lineSoft }}>
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3.5 border-b min-w-[180px]" style={{ borderColor: C.lineSoft }}>
                        <p className="text-[13px] font-semibold" style={{ color: C.ink }}>{fullName(iv)}</p>
                        {iv.mobileNo && <p className="text-[11px]" style={{ color: C.muted }}>{iv.mobileNo}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b max-w-[200px]" style={{ color: C.body, borderColor: C.lineSoft }}>
                        <span className="line-clamp-1">{iv.programSection ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {iv.campus ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {iv.graduationMonth ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {fmtDate(iv.submittedAt)}
                      </td>
                      <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }}>
                        <StatusBadge status={displayStatusOf(iv)} />
                      </td>
                      <td className="px-3 py-3.5 w-12 border-b" style={{ borderColor: C.lineSoft }}>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map(iv => (
                  <button key={iv.id} onClick={() => setDetail(iv)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate" style={{ color: C.ink }}>{fullName(iv)}</p>
                        <StatusBadge status={displayStatusOf(iv)} />
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: C.muted }}>
                        {[iv.programSection, iv.campus].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: C.faint }}>
                        {fmtDate(iv.submittedAt)}{iv.graduationMonth ? ` · Grad: ${iv.graduationMonth}` : ""}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t bg-white shrink-0 gap-2" style={{ borderColor: C.line }}>
              <span className="text-xs tabular-nums truncate" style={{ color: C.muted }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="hidden sm:flex items-center gap-1">
                  {pageNumbers.map(n => (
                    <button key={n} onClick={() => setPage(n)} aria-current={page === n ? "page" : undefined}
                      style={page === n ? { background: C.brand, color: "#fff", borderColor: C.brand } : {}}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold border transition-colors ${page !== n ? "border-gray-200 text-gray-600 hover:border-gray-400" : ""}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <span className="sm:hidden text-xs font-semibold px-2 tabular-nums" style={{ color: C.muted }}>
                  {page} / {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showShare && <ShareLinkModal courseId={courseId} onClose={() => setShowShare(false)} />}
      <Toast toast={toast} />
    </div>
  );
}