"use client";

// src/components/layout/course/CourseLibraryTab.tsx
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, Trash2, Check, ArrowLeft,
  SlidersHorizontal, X, Download, Users, Clock, ExternalLink,
  FileText, QrCode, FileDown, AlertCircle, MoreVertical, Copy, Inbox,
  CheckCircle2, XCircle, Ban,
} from "lucide-react";
import { FONT } from "./osaShared";

/* ════════════════════════════════════════════════════════════════════════════
   1. DESIGN TOKENS
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

type Status = "PENDING" | "PROCESSING" | "READY" | "RELEASED" | "REJECTED";
type RequestType = "STUDENT_NEW" | "STUDENT_LOST" | "EMPLOYEE";

interface LibraryCardRequest {
  id: string;
  requestType: RequestType;
  applicantType: "STUDENT" | "EMPLOYEE";
  cardType: string;
  employeeType?: string | null;
  name: string;
  sex?: string | null;
  address?: string | null;
  contactNo?: string | null;
  email?: string | null;
  reason?: string | null;
  studentNo?: string | null;
  courseProgram?: string | null;
  yearSection?: string | null;
  employeeNo?: string | null;
  collegeDept?: string | null;
  position?: string | null;
  photoUrl?: string | null;
  affidavitUrl?: string | null;
  corIdUrl?: string | null;
  status: Status;
  submittedAt: string;
  releasedAt?: string | null;
  releasedBy?: string | null;
  directorSignatureUrl?: string | null;
  directorSignedAt?: string | null;
  directorName?: string | null;
  recipientSignatureUrl?: string | null;
  recipientSignedAt?: string | null;
}

interface Props {
  courseId: string;
  isHead: boolean;
}

const STATUS_META: Record<Status, { label: string; color: string; bg: string; icon: ReactNode }> = {
  PENDING:    { label: "Pending",    color: "#92400e", bg: "#fef3c7", icon: <Clock size={11} /> },
  PROCESSING: { label: "Processing", color: "#1e40af", bg: "#dbeafe", icon: <RefreshCw size={11} /> },
  READY:      { label: "Ready",      color: "#065f46", bg: "#d1fae5", icon: <Check size={11} /> },
  RELEASED:   { label: "Released",   color: "#374151", bg: "#f3f4f6", icon: <Download size={11} /> },
  REJECTED:   { label: "Rejected",   color: "#991b1b", bg: "#fee2e2", icon: <X size={11} /> },
};

const STATUS_ORDER: Status[] = ["PENDING", "PROCESSING", "READY", "RELEASED"];
const STATUS_TABS: Array<Status | "ALL"> = ["ALL", "PENDING", "PROCESSING", "READY", "RELEASED", "REJECTED"];

const TYPE_LABELS: Record<RequestType, string> = {
  STUDENT_NEW:  "Student card (new)",
  STUDENT_LOST: "Student card (lost)",
  EMPLOYEE:     "Employee card",
};

/* ════════════════════════════════════════════════════════════════════════════
   3. HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

function fmtDate(iso: string | null | undefined, withTime = true) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Local-timezone YYYY-MM-DD (toISOString() would shift the day for PH users). */
function toLocalISODate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const isImageUrl = (url?: string | null) =>
  !!url && (/\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url) || url.startsWith("data:image"));

const idNoOf = (r: LibraryCardRequest) => r.studentNo ?? r.employeeNo ?? "—";

async function downloadBlob(res: Response, filename: string) {
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
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

function StatusBadge({ status }: { status: Status }) {
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
  title, message, confirmLabel, tone = "danger", busy, onConfirm, onClose,
}: {
  title: string; message: ReactNode; confirmLabel: string; tone?: "brand" | "danger";
  busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const bg = tone === "danger" ? C.danger : C.brand;
  return (
    <SheetModal
      onClose={onClose}
      tone={tone}
      icon={tone === "danger" ? <Trash2 size={16} /> : <AlertCircle size={16} />}
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
            style={{ background: bg }}>
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

function SignaturePad({ onSave, onCancel }: { onSave: (dataUrl: string) => void; onCancel: () => void }) {
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
          disabled={!hasDrawn}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
          style={{ background: C.brand }}>
          <Check size={11} /> Save signature
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
   7. MODALS: share link / export card / lightbox
   ════════════════════════════════════════════════════════════════════════════ */

function ShareLinkModal({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/forms/library/${courseId}`;
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
    a.href = qrDataUrl; a.download = `library-card-request-qr-${courseId}.png`; a.click();
  };

  return (
    <SheetModal
      onClose={onClose}
      icon={<QrCode size={16} />}
      title="Request form link"
      subtitle="Library card requests"
      footer={
        <button onClick={onClose} className="w-full h-11 sm:h-10 text-xs font-semibold text-gray-600 hover:bg-gray-100">
          Close
        </button>
      }
    >
      <div className="px-5 py-5 space-y-5">
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
          Share this link or QR code so students and employees can submit a library card request online.
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
              <img src={qrDataUrl} alt="QR code for the request form" className="w-full h-full object-contain" />
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

function ExportCardModal({
  request, courseId, onClose,
}: { request: LibraryCardRequest; courseId: string; onClose: () => void }) {
  const { data: session } = useSession();
  const [campus,        setCampus]        = useState("");
  const [cardNo,        setCardNo]        = useState("");
  const [cardNoLoading, setCardNoLoading] = useState(true);
  const [librarian,     setLibrarian]     = useState(session?.user?.name ?? "");
  const [librarianSig,  setLibrarianSig]  = useState("");
  const [showSigPad,    setShowSigPad]    = useState(false);
  const [downloading,   setDownloading]   = useState(false);
  const [error,         setError]         = useState("");

  useEffect(() => {
    (async () => {
      setCardNoLoading(true);
      try {
        const res  = await fetch(`/api/courses/${courseId}/library-cards/next-card-no`);
        const data = await res.json();
        if (res.ok && data.cardNo) setCardNo(data.cardNo);
      } catch { /* leave blank, librarian can type manually */ }
      finally { setCardNoLoading(false); }
    })();
  }, [courseId]);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(d => {
        if (d.user?.name)             setLibrarian(d.user.name);
        if (d.user?.librarySignature) setLibrarianSig(d.user.librarySignature);
      })
      .catch(() => {});
  }, []);

  const handleDownload = async () => {
    if (!campus.trim()) { setError("Enter the campus."); return; }
    if (!cardNo.trim()) { setError("Enter the card number."); return; }
    setError(""); setDownloading(true);
    try {
      const q = new URLSearchParams({ campus: campus.trim(), cardNo: cardNo.trim() });
      if (librarian.trim()) q.set("librarian",    librarian.trim());
      if (librarianSig)     q.set("librarianSig", librarianSig);
      const res = await fetch(`/api/courses/${courseId}/library-cards/${request.id}/export-card?${q}`);
      if (!res.ok) { setError("Export failed. Please try again."); return; }
      await downloadBlob(res, `library_card_${request.name.replace(/\s+/g, "_")}.pdf`);
      onClose();
    } catch { setError("Export failed. Please try again."); }
    finally  { setDownloading(false); }
  };

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

  return (
    <SheetModal
      onClose={onClose}
      icon={<FileDown size={16} />}
      title="Export library card"
      subtitle={request.name}
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleDownload} disabled={downloading}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: C.brand }}>
            {downloading ? <><RefreshCw size={13} className="animate-spin" /> Generating…</> : <><FileDown size={13} /> Download PDF</>}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 space-y-4">
        <div className="rounded-xl border px-4 py-3 bg-gray-50 space-y-0.5" style={{ borderColor: C.line }}>
          <p className="text-xs font-bold" style={{ color: C.ink }}>{request.name}</p>
          {request.studentNo && <p className="text-[11px]" style={{ color: C.muted }}>Student no. {request.studentNo}</p>}
          {request.courseProgram && <p className="text-[11px]" style={{ color: C.muted }}>{request.courseProgram} {request.yearSection}</p>}
        </div>

        <div>
          <label className={labelCls}>Campus <span className="text-red-500">*</span></label>
          <input value={campus} onChange={e => { setCampus(e.target.value); setError(""); }}
            placeholder="e.g. Main, San Fernando, Apalit" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Card no. <span className="text-red-500">*</span></label>
          <div className="relative">
            <input value={cardNo} onChange={e => { setCardNo(e.target.value); setError(""); }}
              placeholder={cardNoLoading ? "Generating…" : "e.g. 2024-00001"}
              disabled={cardNoLoading}
              className={inputCls + (cardNoLoading ? " opacity-50" : "")} />
            {cardNoLoading && (
              <RefreshCw size={13} className="animate-spin text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>
          <p className="text-[11px] mt-1" style={{ color: C.faint }}>Generated from the total cards issued. You can edit it.</p>
        </div>

        <div>
          <label className={labelCls}>Librarian name</label>
          <input value={librarian} onChange={e => setLibrarian(e.target.value)} placeholder="Full name of librarian" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Librarian signature</label>
          {librarianSig ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={librarianSig} alt="Librarian signature" className="h-12 border border-gray-200 rounded-lg bg-white p-1" />
              <button onClick={() => { setLibrarianSig(""); setShowSigPad(true); }}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                <X size={11} /> Redo
              </button>
            </div>
          ) : showSigPad ? (
            <SignaturePad onSave={d => { setLibrarianSig(d); setShowSigPad(false); }} onCancel={() => setShowSigPad(false)} />
          ) : (
            <button type="button" onClick={() => setShowSigPad(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-gray-400">
              Draw signature
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-500 font-semibold" role="alert">
            <AlertCircle size={13} /> {error}
          </div>
        )}
      </div>
    </SheetModal>
  );
}

function Lightbox({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4"
      style={{ fontFamily: FONT }}
      onClick={onClose}
    >
      <div className="w-full max-w-3xl flex items-center justify-between mb-3" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-white">{label}</p>
        <div className="flex items-center gap-2">
          <a href={src} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">
            <ExternalLink size={12} /> Open original
          </a>
          <button onClick={onClose} aria-label="Close preview"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/80 hover:text-white bg-white/10 hover:bg-white/20">
            <X size={16} />
          </button>
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src} alt={label}
        className="max-h-[80vh] max-w-full rounded-lg shadow-2xl object-contain bg-white"
        onClick={e => e.stopPropagation()}
      />
    </div>
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

function Panel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-xl border overflow-hidden ${className}`} style={{ borderColor: C.line }}>
      <header className="px-4 sm:px-5 py-3 border-b" style={{ borderColor: C.lineSoft }}>
        <h2 className="text-sm font-bold" style={{ color: C.ink }}>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function StatusStepper({ status }: { status: Status }) {
  if (status === "REJECTED") {
    return (
      <div className="flex items-start gap-2.5 px-4 sm:px-5 py-4">
        <XCircle size={18} className="shrink-0 mt-0.5" style={{ color: "#991b1b" }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: "#991b1b" }}>Request rejected</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>No further action is needed on this request.</p>
        </div>
      </div>
    );
  }
  const current = STATUS_ORDER.indexOf(status);
  return (
    <ol className="px-4 sm:px-5 py-4">
      {STATUS_ORDER.map((s, i) => {
        const done   = i < current;
        const active = i === current;
        const last   = i === STATUS_ORDER.length - 1;
        return (
          <li key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2"
                style={{
                  background: done || active ? C.brand : "#fff",
                  borderColor: done || active ? C.brand : C.line,
                  boxShadow: active ? `0 0 0 4px ${C.brandRing}` : undefined,
                }}
              >
                {done && <Check size={11} className="text-white" strokeWidth={3} />}
              </span>
              {!last && <span className="w-0.5 flex-1 my-1 rounded" style={{ background: done ? C.brand : C.line, minHeight: 18 }} />}
            </div>
            <p
              className={`text-[13px] pb-3 ${active ? "font-bold" : "font-medium"}`}
              style={{ color: active ? C.ink : done ? C.body : C.faint, lineHeight: "20px" }}
            >
              {STATUS_META[s].label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function AttachmentTile({
  label, url, onPreview, missingTone,
}: { label: string; url?: string | null; onPreview?: () => void; missingTone?: "warn" }) {
  const base = "relative flex flex-col items-center justify-center gap-1.5 w-24 h-28 rounded-xl border overflow-hidden shrink-0 text-center";

  if (!url) {
    const warn = missingTone === "warn";
    return (
      <div className={`${base} border-dashed`}
        style={{ borderColor: warn ? "#fecaca" : C.line, background: warn ? "#fef2f2" : "#fafafa", color: warn ? "#f87171" : C.faint }}>
        {label === "Photo" ? <Users size={18} /> : <FileText size={18} />}
        <span className="text-[11px] font-medium px-1">No {label.toLowerCase()}</span>
      </div>
    );
  }

  const image = isImageUrl(url);
  const inner = (
    <>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <FileText size={20} style={{ color: C.muted }} />
      )}
      <span
        className={`${image ? "absolute bottom-0 inset-x-0 bg-black/55 text-white py-1" : ""} text-[11px] font-semibold px-1`}
        style={image ? undefined : { color: C.body }}
      >
        {label}
      </span>
    </>
  );

  return image && onPreview ? (
    <button type="button" onClick={onPreview} className={`${base} bg-gray-100 hover:shadow-md transition-shadow`} style={{ borderColor: C.line }}>
      {inner}
    </button>
  ) : (
    <a href={url} target="_blank" rel="noreferrer" className={`${base} bg-gray-50 hover:bg-gray-100 transition-colors`} style={{ borderColor: C.line }}>
      {inner}
    </a>
  );
}

function RequestDetailView({
  request, courseId, isHead, onBack, onUpdated, onDeleted, notify,
}: {
  request: LibraryCardRequest; courseId: string; isHead: boolean;
  onBack: () => void;
  onUpdated: (r: LibraryCardRequest) => void;
  onDeleted: (id: string) => void;
  notify: (msg: string, tone?: "success" | "error") => void;
}) {
  const { data: session } = useSession();
  const [currentUserName, setCurrentUserName] = useState<string | null>(session?.user?.name ?? null);
  const [local,           setLocal]           = useState(request);
  const [patching,        setPatching]        = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [affidavitDl,     setAffidavitDl]     = useState(false);
  const [showExport,      setShowExport]      = useState(false);
  const [showMore,        setShowMore]        = useState(false);
  const [confirm,         setConfirm]         = useState<"reject" | "delete" | null>(null);
  const [preview,         setPreview]         = useState<{ src: string; label: string } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(d => { if (d.user?.name) setCurrentUserName(d.user.name); })
      .catch(() => {});
  }, []);

  const patch = async (data: Record<string, unknown>, successMsg?: string) => {
    setPatching(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/library-cards/${local.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) { notify("Couldn’t update the request. Please try again.", "error"); return false; }
      const d = await res.json();
      const updated: LibraryCardRequest = d.request ?? { ...local, ...data };
      setLocal(updated); onUpdated(updated);
      if (successMsg) notify(successMsg);
      return true;
    } catch {
      notify("Couldn’t update the request. Check your connection.", "error");
      return false;
    } finally { setPatching(false); }
  };

  const handleReject = async () => {
    await patch({ status: "REJECTED" }, "Request rejected");
    setConfirm(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/library-cards/${local.id}`, { method: "DELETE" });
      if (res.ok) { onDeleted(local.id); onBack(); return; }
      notify("Couldn’t delete the request.", "error");
    } catch { notify("Couldn’t delete the request.", "error"); }
    finally { setDeleting(false); setConfirm(null); }
  };

  const handleDownloadAffidavit = async () => {
    setAffidavitDl(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/library-cards/${local.id}/affidavit`);
      if (!res.ok) { notify("Couldn’t generate the affidavit.", "error"); return; }
      await downloadBlob(res, `affidavit_${local.name.replace(/\s+/g, "_")}.pdf`);
    } catch { notify("Couldn’t generate the affidavit.", "error"); }
    finally { setAffidavitDl(false); }
  };

  /* Actions derived once, shared by desktop bar and mobile sheet */
  const progressAction =
    local.status === "PENDING"    ? { label: "Approve",          color: C.brand,   icon: <Check size={13} />,    onClick: () => patch({ status: "PROCESSING" }, "Request approved") } :
    local.status === "PROCESSING" ? { label: "Mark as ready",    color: "#065f46", icon: <Check size={13} />,    onClick: () => patch({ status: "READY" }, "Marked as ready") } :
    local.status === "READY"      ? { label: "Mark as released", color: "#1d4ed8", icon: <Download size={13} />, onClick: () => patch({ status: "RELEASED", releasedAt: new Date().toISOString(), _releasedBy: currentUserName }, "Marked as released") } :
    null;

  const canReject    = local.status !== "RELEASED" && local.status !== "REJECTED";
  const canExport    = local.applicantType === "STUDENT";
  const canAffidavit = local.requestType === "STUDENT_LOST";

  const secondaryActions: SheetAction[] = [
    ...(canReject    ? [{ key: "reject",    label: "Reject request",    icon: <Ban size={15} />,      onClick: () => setConfirm("reject"), danger: true, disabled: patching }] : []),
    ...(canExport    ? [{ key: "export",    label: "Export card",       icon: <FileDown size={15} />, onClick: () => setShowExport(true) }] : []),
    ...(canAffidavit ? [{ key: "affidavit", label: affidavitDl ? "Generating…" : "Download affidavit", icon: <FileText size={15} />, onClick: handleDownloadAffidavit, disabled: affidavitDl }] : []),
    { key: "delete", label: "Delete request", icon: <Trash2 size={15} />, onClick: () => setConfirm("delete"), danger: true },
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
        <p className="text-sm font-bold flex-1 truncate min-w-0" style={{ color: C.ink }}>{local.name}</p>
        <StatusBadge status={local.status} />

        {isHead && (
          <div className="hidden sm:flex items-center gap-2">
            {canExport && (
              <button onClick={() => setShowExport(true)} className={ghostBtn}>
                <FileDown size={13} /> Export card
              </button>
            )}
            {canAffidavit && (
              <button onClick={handleDownloadAffidavit} disabled={affidavitDl} className={ghostBtn}>
                {affidavitDl ? <><RefreshCw size={13} className="animate-spin" /> Generating…</> : <><FileText size={13} /> Affidavit</>}
              </button>
            )}
            {canReject && (
              <button onClick={() => setConfirm("reject")} disabled={patching}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 h-8 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                <Ban size={13} /> Reject
              </button>
            )}
            {progressAction && (
              <button onClick={progressAction.onClick} disabled={patching}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-8 rounded-lg text-white transition-opacity disabled:opacity-50"
                style={{ background: progressAction.color }}>
                {progressAction.icon} {progressAction.label}
              </button>
            )}
            <button onClick={() => setConfirm("delete")} aria-label="Delete request"
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
        <div className="w-full px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] gap-4 items-start">

          {/* Left: applicant */}
          <Panel title="Applicant information">
            <div className="px-4 sm:px-5 py-4 border-b" style={{ borderColor: C.lineSoft }}>
              <p className="text-base font-bold" style={{ color: C.ink }}>{local.name}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs" style={{ color: C.muted }}>{TYPE_LABELS[local.requestType]}</span>
                {local.cardType && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                    style={{ background: C.brandTint, color: C.brand }}>
                    {local.cardType}
                  </span>
                )}
              </div>
            </div>
            <dl className="px-4 sm:px-5 py-4 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-x-6 gap-y-4">
              <InfoField label="Sex"        value={local.sex} />
              <InfoField label="Contact no." value={local.contactNo} />
              <InfoField label="Email"      value={local.email} />
              <InfoField label="Address"    value={local.address} />
              {local.applicantType === "STUDENT" ? (
                <>
                  <InfoField label="Student no."       value={local.studentNo} />
                  <InfoField label="Course / program"  value={local.courseProgram} />
                  <InfoField label="Year & section"    value={local.yearSection} />
                  <InfoField label="Reason"            value={local.reason} />
                </>
              ) : (
                <>
                  <InfoField label="Employee no."    value={local.employeeNo} />
                  <InfoField label="Employee type"   value={local.employeeType} />
                  <InfoField label="College / dept." value={local.collegeDept} />
                  <InfoField label="Position"        value={local.position} />
                </>
              )}
              <InfoField label="Submitted" value={fmtDate(local.submittedAt)} />
            </dl>
          </Panel>

          {/* Right: progress, attachments, release */}
          <div className="flex flex-col gap-4 sm:gap-5">
            <Panel title="Progress">
              <StatusStepper status={local.status} />
            </Panel>

            <Panel title="Attachments">
              <div className="px-4 sm:px-5 py-4 flex gap-3 flex-wrap">
                <AttachmentTile
                  label="Photo" url={local.photoUrl}
                  onPreview={() => local.photoUrl && setPreview({ src: local.photoUrl, label: `${local.name} — Photo` })}
                />
                {local.requestType === "STUDENT_LOST" && (
                  <AttachmentTile
                    label="Affidavit" url={local.affidavitUrl}
                    onPreview={() => local.affidavitUrl && setPreview({ src: local.affidavitUrl, label: `${local.name} — Affidavit` })}
                  />
                )}
                <AttachmentTile
                  label="COR / ID" url={local.corIdUrl} missingTone="warn"
                  onPreview={() => local.corIdUrl && setPreview({ src: local.corIdUrl, label: `${local.name} — COR / ID` })}
                />
              </div>
            </Panel>

            {local.status === "RELEASED" && (
              <Panel title="Release details">
                <dl className="px-4 sm:px-5 py-4 grid grid-cols-1 gap-4">
                  <InfoField label="Released on" value={fmtDate(local.releasedAt)} />
                  <InfoField label="Released by" value={local.releasedBy} />
                </dl>
              </Panel>
            )}
          </div>
        </div>

        {/* Spacer so content clears the mobile sticky bar */}
        {isHead && progressAction && <div className="h-20 sm:hidden" />}
      </div>

      {/* Mobile sticky primary action */}
      {isHead && progressAction && (
        <div
          className="sm:hidden shrink-0 border-t bg-white px-4 pt-3"
          style={{ borderColor: C.line, paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
        >
          <button onClick={progressAction.onClick} disabled={patching}
            className="w-full flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: progressAction.color }}>
            {progressAction.icon} {progressAction.label}
          </button>
        </div>
      )}

      {showMore   && <ActionSheet actions={secondaryActions} onClose={() => setShowMore(false)} />}
      {showExport && <ExportCardModal request={local} courseId={courseId} onClose={() => setShowExport(false)} />}
      {preview    && <Lightbox src={preview.src} label={preview.label} onClose={() => setPreview(null)} />}

      {confirm === "reject" && (
        <ConfirmModal
          title="Reject this request?" confirmLabel="Reject request" busy={patching}
          message={<>The request from <strong>{local.name}</strong> will be marked as rejected.</>}
          onConfirm={handleReject} onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "delete" && (
        <ConfirmModal
          title="Delete this request?" confirmLabel="Delete" busy={deleting}
          message={<><strong>{local.name}</strong> — {TYPE_LABELS[local.requestType]}.<br />This can’t be undone.</>}
          onConfirm={handleDelete} onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   10. LIST VIEW (default export)
   ════════════════════════════════════════════════════════════════════════════ */



export default function CourseLibraryTab({ courseId, isHead }: Props) {
  const [requests,     setRequests]     = useState<LibraryCardRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusTab,    setStatusTab]    = useState<Status | "ALL">("ALL");
  const [typeFilter,   setTypeFilter]   = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [showFilters,  setShowFilters]  = useState(false);
  const [showShare,    setShowShare]    = useState(false);
  const [detail,       setDetail]       = useState<LibraryCardRequest | null>(null);
  const [page,         setPage]         = useState(1);
  const [toast,        setToast]        = useState<ToastState>(null);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [rowMenu,      setRowMenu]      = useState<{ id: string; x: number; y: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const debouncedSearch = useDebounced(search, 300);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* Server handles search + type. Status, course and dates are filtered locally
     so the tab counts stay accurate. */
  const fetchRequests = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const q = new URLSearchParams();
      if (debouncedSearch) q.set("search", debouncedSearch);
      if (typeFilter)      q.set("type",   typeFilter);
      const res  = await fetch(`/api/courses/${courseId}/library-cards?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load requests.");
      setRequests(data.requests ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests.");
    } finally { setLoading(false); }
  }, [courseId, debouncedSearch, typeFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [debouncedSearch, statusTab, typeFilter, courseFilter, dateFrom, dateTo]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setRowMenu(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Rows matching every filter except the status tab (used for tab counts) */
  const baseFiltered = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const to   = dateTo   ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return requests.filter(r => {
      if (courseFilter && r.courseProgram !== courseFilter) return false;
      const t = new Date(r.submittedAt).getTime();
      if (from !== null && t < from) return false;
      if (to   !== null && t > to)   return false;
      return true;
    });
  }, [requests, courseFilter, dateFrom, dateTo]);

  const counts = useMemo(() => {
    const c: Record<Status | "ALL", number> = { ALL: baseFiltered.length, PENDING: 0, PROCESSING: 0, READY: 0, RELEASED: 0, REJECTED: 0 };
    baseFiltered.forEach(r => { c[r.status] += 1; });
    return c;
  }, [baseFiltered]);

  const filtered   = useMemo(() => statusTab === "ALL" ? baseFiltered : baseFiltered.filter(r => r.status === statusTab), [baseFiltered, statusTab]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const courseOptions = useMemo(
    () => [...new Set(requests.map(r => r.courseProgram).filter((c): c is string => !!c))].sort(),
    [requests],
  );

  const activeFilterCount = [typeFilter, courseFilter, dateFrom || dateTo].filter(Boolean).length;
  const hasAnyFilter      = !!(search || statusTab !== "ALL" || activeFilterCount);

  const clearFilters = () => { setTypeFilter(""); setCourseFilter(""); setDateFrom(""); setDateTo(""); };
  const resetAll     = () => { clearFilters(); setStatusTab("ALL"); setSearch(""); };

  const datePresets = [
    { label: "Today",      fn: () => { const d = toLocalISODate(new Date()); setDateFrom(d); setDateTo(d); } },
    { label: "This week",  fn: () => {
        const now = new Date(); const mon = new Date(now);
        mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        setDateFrom(toLocalISODate(mon)); setDateTo(toLocalISODate(now));
    } },
    { label: "This month", fn: () => {
        const now = new Date();
        setDateFrom(toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1))); setDateTo(toLocalISODate(now));
    } },
  ];

  const selectCls =
    "w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10";
  const filterLabelCls = "block text-xs font-semibold text-gray-500 mb-1";

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) =>
    totalPages <= 5 || page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i,
  );

  const pageAllSelected  = paginated.length > 0 && paginated.every(r => selected.has(r.id));
  const pageSomeSelected = paginated.some(r => selected.has(r.id));

  const toggleOne = (id: string) =>
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const togglePage = () =>
    setSelected(prev => {
      const n = new Set(prev);
      if (pageAllSelected) paginated.forEach(r => n.delete(r.id));
      else paginated.forEach(r => n.add(r.id));
      return n;
    });

  const selectAllFiltered = () => setSelected(new Set(filtered.map(r => r.id)));

  const openRowMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const flip = r.bottom + 96 > window.innerHeight;
    setRowMenu({ id, x: r.right, y: flip ? r.top - 92 : r.bottom + 4 });
  };

  const deleteIds = async (ids: string[]) => {
    setDeleting(true);
    const results = await Promise.allSettled(
      ids.map(id =>
        fetch(`/api/courses/${courseId}/library-cards/${id}`, { method: "DELETE" }).then(res => {
          if (!res.ok) throw new Error("Delete failed");
          return id;
        }),
      ),
    );
    const ok = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map(r => r.value);
    const failed = ids.length - ok.length;

    if (ok.length) setRequests(prev => prev.filter(r => !ok.includes(r.id)));
    setSelected(prev => { const n = new Set(prev); ok.forEach(id => n.delete(id)); return n; });
    setDeleting(false);
    setDeleteTarget(null);

    if (failed === 0) notify(ok.length === 1 ? "Request deleted" : `${ok.length} requests deleted`);
    else notify(`${failed} couldn’t be deleted. Please try again.`, "error");
  };

  const emptyState = requests.length === 0 && !hasAnyFilter ? (
    <EmptyState
      title="No requests yet"
      hint="Share the form link so students and employees can request a library card."
      action={
        <button onClick={() => setShowShare(true)}
          className="mt-2 flex items-center gap-1.5 text-xs font-bold px-4 h-9 rounded-lg text-white" style={{ background: C.brand }}>
          <QrCode size={13} /> Share form link
        </button>
      }
    />
  ) : (
    <EmptyState
      title="No matching requests"
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
        <RequestDetailView
          request={detail} courseId={courseId} isHead={isHead} notify={notify}
          onBack={() => setDetail(null)}
          onUpdated={u => { setRequests(prev => prev.map(r => r.id === u.id ? u : r)); setDetail(u); }}
          onDeleted={id => { setRequests(prev => prev.filter(r => r.id !== id)); setDetail(null); }}
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
          <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Library cards</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: C.faint }}>Review and process card requests from students and employees.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchRequests} aria-label="Refresh"
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
                placeholder="Search name, student no., email"
                aria-label="Search requests"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(f => !f)} aria-expanded={showFilters}
              style={(showFilters || activeFilterCount) ? { background: C.brand, color: "#fff", borderColor: C.brand } : {}}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${!(showFilters || activeFilterCount) ? "border-gray-200 text-gray-600 hover:border-gray-400" : ""}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-white/90 text-[10px] font-bold flex items-center justify-center" style={{ color: C.brand }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Bulk action bar */}
          {isHead && selected.size > 0 && (
            <div className="px-3 sm:px-5 py-2.5 border-b flex items-center gap-3 flex-wrap" style={{ background: C.brandTint, borderColor: C.line }}>
              <span className="text-xs font-bold" style={{ color: C.brand }}>{selected.size} selected</span>
              {selected.size < filtered.length && (
                <button onClick={selectAllFiltered} className="text-xs font-semibold hover:underline" style={{ color: C.brand }}>
                  Select all {filtered.length}
                </button>
              )}
              <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
                Clear
              </button>
              <button onClick={() => setDeleteTarget(Array.from(selected))}
                className="ml-auto flex items-center gap-1.5 text-xs font-bold px-3 h-8 rounded-lg text-white"
                style={{ background: C.danger }}>
                <Trash2 size={13} /> Delete selected
              </button>
            </div>
          )}

          {/* Filter panel */}
          {showFilters && (
            <div className="px-3 sm:px-5 py-4 border-b bg-gray-50 space-y-4" style={{ borderColor: C.lineSoft }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={filterLabelCls}>Request type</label>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
                    <option value="">All types</option>
                    {(Object.keys(TYPE_LABELS) as RequestType[]).map(t => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={filterLabelCls}>Course</label>
                  <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className={selectCls}>
                    <option value="">All courses</option>
                    {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={filterLabelCls}>Date submitted</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)}
                    aria-label="From date"
                    className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                  <span className="text-xs text-gray-400 shrink-0">to</span>
                  <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)}
                    aria-label="To date"
                    className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {datePresets.map(p => (
                    <button key={p.label} onClick={p.fn}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition-colors">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: C.brand }}>
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
          )}

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
              <button onClick={fetchRequests}
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
                    {isHead && (
                      <th scope="col" className="px-4 py-2.5 w-10 border-b" style={{ borderColor: C.line }}>
                        <input
                          type="checkbox" aria-label="Select all on this page"
                          checked={pageAllSelected}
                          ref={el => { if (el) el.indeterminate = !pageAllSelected && pageSomeSelected; }}
                          onChange={togglePage}
                          className="w-4 h-4 cursor-pointer" style={{ accentColor: C.brand }}
                        />
                      </th>
                    )}
                    {["No.", "Applicant", "ID no.", "Course", "Type", "Submitted", "Status", ""].map((h, i) => (
                      <th key={i} scope="col"
                        className="text-left px-4 py-2.5 whitespace-nowrap border-b"
                        style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, i) => (
                    <tr
                      key={r.id} onClick={() => setDetail(r)} tabIndex={0}
                      onKeyDown={e => { if (e.key === "Enter") setDetail(r); }}
                      className="group cursor-pointer hover:bg-gray-50 focus:bg-gray-50 outline-none transition-colors"
                      style={selected.has(r.id) ? { background: C.brandTint } : undefined}
                    >
                      {isHead && (
                        <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox" aria-label={`Select ${r.name}`}
                            checked={selected.has(r.id)} onChange={() => toggleOne(r.id)}
                            className="w-4 h-4 cursor-pointer" style={{ accentColor: C.brand }}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-xs tabular-nums border-b" style={{ color: C.faint, borderColor: C.lineSoft }}>
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3.5 border-b min-w-[180px]" style={{ borderColor: C.lineSoft }}>
                        <p className="text-[13px] font-semibold" style={{ color: C.ink }}>{r.name}</p>
                        {r.email && <p className="text-[11px] truncate max-w-[220px]" style={{ color: C.muted }}>{r.email}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono border-b whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {idNoOf(r)}
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b max-w-[200px]" style={{ color: C.body, borderColor: C.lineSoft }}>
                        <span className="line-clamp-1">{r.courseProgram ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {TYPE_LABELS[r.requestType]}
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {fmtDate(r.submittedAt)}
                      </td>
                      <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-3.5 w-12 border-b" style={{ borderColor: C.lineSoft }}>
                        {isHead ? (
                          <button
                            onClick={e => openRowMenu(e, r.id)}
                            aria-label={`Actions for ${r.name}`} aria-haspopup="menu"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>
                        ) : (
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 transition-colors" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={selected.has(r.id) ? { background: C.brandTint } : undefined}
                  >
                    {isHead && (
                      <input
                        type="checkbox" aria-label={`Select ${r.name}`}
                        checked={selected.has(r.id)} onChange={() => toggleOne(r.id)}
                        className="w-4 h-4 shrink-0" style={{ accentColor: C.brand }}
                      />
                    )}
                    <button onClick={() => setDetail(r)} className="flex-1 min-w-0 text-left active:opacity-70">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate" style={{ color: C.ink }}>{r.name}</p>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: C.muted }}>
                        {TYPE_LABELS[r.requestType]} · {idNoOf(r)}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: C.faint }}>{fmtDate(r.submittedAt)}</p>
                    </button>
                    {isHead ? (
                      <button
                        onClick={e => openRowMenu(e, r.id)}
                        aria-label={`Actions for ${r.name}`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 shrink-0"
                      >
                        <MoreVertical size={16} />
                      </button>
                    ) : (
                      <ChevronRight size={16} className="text-gray-300 shrink-0" />
                    )}
                  </div>
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

      {rowMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)}>
          <div
            role="menu"
            className="absolute w-44 bg-white rounded-xl border shadow-lg py-1 overflow-hidden"
            style={{ top: rowMenu.y, left: Math.max(8, rowMenu.x - 176), borderColor: C.line, fontFamily: FONT }}
            onClick={e => e.stopPropagation()}
          >
            <button
              role="menuitem"
              onClick={() => {
                const r = requests.find(x => x.id === rowMenu.id);
                setRowMenu(null);
                if (r) setDetail(r);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-gray-50"
              style={{ color: C.ink }}
            >
              <ExternalLink size={14} /> View details
            </button>
            <button
              role="menuitem"
              onClick={() => { setDeleteTarget([rowMenu.id]); setRowMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-red-50"
              style={{ color: C.danger }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title={deleteTarget.length === 1 ? "Delete this request?" : `Delete ${deleteTarget.length} requests?`}
          confirmLabel={deleteTarget.length === 1 ? "Delete" : `Delete ${deleteTarget.length}`}
          busy={deleting}
          message={
            deleteTarget.length === 1 ? (
              <>
                <strong>{requests.find(r => r.id === deleteTarget[0])?.name ?? "This request"}</strong> will be permanently removed.<br />
                This can’t be undone.
              </>
            ) : (
              <>
                {deleteTarget.length} selected requests will be permanently removed.<br />
                This can’t be undone.
              </>
            )
          }
          onConfirm={() => deleteIds(deleteTarget)}
          onClose={() => { if (!deleting) setDeleteTarget(null); }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}