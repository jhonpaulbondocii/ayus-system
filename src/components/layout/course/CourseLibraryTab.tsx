"use client";

// src/components/layout/course/CourseLibraryTab.tsx
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  Trash2, Check, ArrowLeft, Filter, X,
  BookOpen, Download, Users, Clock,
  ExternalLink, FileText, QrCode, FileDown, AlertCircle,
} from "lucide-react";

const MAROON    = "#7b1113";
const FONT      = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const PAGE_SIZE = 15;

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

const STATUS_META: Record<Status, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:    { label: "Pending",    color: "#92400e", bg: "#fef3c7", icon: <Clock size={11} /> },
  PROCESSING: { label: "Processing", color: "#1e40af", bg: "#dbeafe", icon: <RefreshCw size={11} /> },
  READY:      { label: "Ready",      color: "#065f46", bg: "#d1fae5", icon: <Check size={11} /> },
  RELEASED:   { label: "Released",   color: "#374151", bg: "#f3f4f6", icon: <Download size={11} /> },
  REJECTED:   { label: "Rejected",   color: "#991b1b", bg: "#fee2e2", icon: <X size={11} /> },
};

const TYPE_LABELS: Record<RequestType, string> = {
  STUDENT_NEW:  "Student Card (New)",
  STUDENT_LOST: "Student Card (Lost)",
  EMPLOYEE:     "Employee Card",
};

function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: m.color, background: m.bg }}
    >
      {m.icon} {m.label}
    </span>
  );
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

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
      <div className="flex gap-2">
        <button type="button" onClick={clear}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
          <X size={11} /> Clear
        </button>
        <button type="button"
          onClick={() => { const c = canvasRef.current; if (c) onSave(c.toDataURL("image/png")); }}
          disabled={!hasDrawn}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
          style={{ background: MAROON }}>
          <Check size={11} /> Save Signature
        </button>
        <button type="button" onClick={onCancel}
          className="ml-auto text-xs font-semibold text-gray-400 hover:text-gray-600 px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

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
    a.href = qrDataUrl;
    a.download = `library-card-request-qr-${courseId}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-96 overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center"><BookOpen size={15} className="text-white" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Library</p>
              <p className="text-sm font-black text-white">Request Form Link</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10"><X size={15} /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">Share this link or QR code so students and employees can submit a library card request online.</p>
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
            <div className="w-48 h-48 rounded-xl border-2 border-gray-100 flex items-center justify-center bg-white shadow-sm overflow-hidden">
              {qrLoading
                ? <div className="w-8 h-8 rounded-full border-2 border-gray-200 animate-spin" style={{ borderTopColor: MAROON }} />
                : qrDataUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                  : <p className="text-[10px] text-gray-400 text-center px-4">Failed to generate QR code</p>}
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

function ExportCardModal({ request, courseId, onClose }: { request: LibraryCardRequest; courseId: string; onClose: () => void }) {
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
  const fetchNextCardNo = async () => {
    setCardNoLoading(true);
    try {
      const res  = await fetch(`/api/courses/${courseId}/library-cards/next-card-no`);
      const data = await res.json();
      if (res.ok && data.cardNo) setCardNo(data.cardNo);
    } catch { /* leave blank, librarian can type manually */ }
    finally { setCardNoLoading(false); }
  };
  fetchNextCardNo();
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
    if (!campus.trim()) { setError("Campus is required."); return; }
    if (!cardNo.trim())  { setError("Card No. is required."); return; }
    setError(""); setDownloading(true);
    try {
      const q   = new URLSearchParams({ campus: campus.trim(), cardNo: cardNo.trim() });
if (librarian.trim())    q.set("librarian",    librarian.trim());
if (librarianSig)        q.set("librarianSig", librarianSig);
      const res = await fetch(`/api/courses/${courseId}/library-cards/${request.id}/export-card?${q}`);
      if (!res.ok) { setError("Export failed. Please try again."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `library_card_${request.name.replace(/\s+/g, "_")}.pdf`; a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch { setError("Export failed. Please try again."); }
    finally  { setDownloading(false); }
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center"><FileDown size={15} className="text-white" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Library Card</p>
              <p className="text-sm font-black text-white">Export / Print Card</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10"><X size={15} /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs font-bold text-gray-800">{request.name}</p>
            {request.studentNo    && <p className="text-[11px] text-gray-500">Student No.: {request.studentNo}</p>}
            {request.courseProgram && <p className="text-[11px] text-gray-500">{request.courseProgram} {request.yearSection}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Campus <span className="text-red-500">*</span></label>
            <input value={campus} onChange={e => { setCampus(e.target.value); setError(""); }} placeholder="e.g. Main, San Fernando, Apalit" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Card No. <span className="text-red-500">*</span></label>
            <div className="relative">
              <input value={cardNo} onChange={e => { setCardNo(e.target.value); setError(""); }}
                placeholder={cardNoLoading ? "Generating…" : "e.g. 2024-00001"}
                disabled={cardNoLoading}
                className={inputCls + (cardNoLoading ? " opacity-50" : "")} />
              {cardNoLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <RefreshCw size={13} className="animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Auto-generated based on total cards issued. You may edit if needed.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Librarian Name</label>
            <input value={librarian} onChange={e => setLibrarian(e.target.value)} placeholder="Full name of librarian" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Librarian Signature</label>
            {librarianSig ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={librarianSig} alt="Librarian sig" className="h-12 border border-gray-200 rounded-lg bg-white p-1" />
                <button onClick={() => { setLibrarianSig(""); setShowSigPad(true); }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <X size={11} /> Redo
                </button>
              </div>
            ) : showSigPad ? (
              <SignaturePad
                onSave={d => { setLibrarianSig(d); setShowSigPad(false); }}
                onCancel={() => setShowSigPad(false)}
              />
            ) : (
              <button type="button" onClick={() => setShowSigPad(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-gray-400 w-full justify-center">
                Draw Signature
              </button>
            )}
          </div>
          {error && <div className="flex items-center gap-2 text-xs text-red-500 font-semibold"><AlertCircle size={13} /> {error}</div>}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleDownload} disabled={downloading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-60 transition-all"
            style={{ background: MAROON }}>
            {downloading ? <><RefreshCw size={13} className="animate-spin" /> Generating...</> : <><FileDown size={13} /> Download PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestDetailView({
  request, courseId, isHead, onBack, onUpdated, onDeleted,
}: {
  request: LibraryCardRequest; courseId: string; isHead: boolean;
  onBack: () => void; onUpdated: (r: LibraryCardRequest) => void; onDeleted: (id: string) => void;
}) {
  const { data: session } = useSession();
  const [currentUserName,  setCurrentUserName]  = useState<string | null>(session?.user?.name ?? null);
  const [local,            setLocal]           = useState(request);
  const [showDelete,       setShowDelete]      = useState(false);
  const [patching,         setPatching]        = useState(false);
  const [showExportModal,  setShowExportModal] = useState(false);
  const [affidavitDl,      setAffidavitDl]     = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(d => { if (d.user?.name) setCurrentUserName(d.user.name); })
      .catch(() => {});
  }, []);

  const SLATE = "#0f172a";
  const MUTED = "#64748b";
  const RULE  = "#e2e8f0";

  const handleDownloadAffidavit = async () => {
    setAffidavitDl(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/library-cards/${local.id}/affidavit`);
      if (!res.ok) { alert("Failed to generate affidavit."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `affidavit_${local.name.replace(/\s+/g, "_")}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Failed to generate affidavit."); }
    finally  { setAffidavitDl(false); }
  };

  const patch = async (data: Record<string, unknown>) => {
    setPatching(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/library-cards/${local.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const d = await res.json();
      const updated = d.request ?? { ...local, ...data };
      setLocal(updated); onUpdated(updated);
    } finally { setPatching(false); }
  };

  const handleReject = async () => {
    if (!confirm("Reject this request?")) return;
    await patch({ status: "REJECTED" });
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/courses/${courseId}/library-cards/${local.id}`, { method: "DELETE" });
    if (res.ok) { onDeleted(local.id); onBack(); }
  };

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="py-2.5" style={{ borderBottom: `1px solid ${RULE}` }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 500, color: SLATE, lineHeight: 1.5 }}>{value}</p>
      </div>
    ) : null;

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT, background: "#f8fafc" }}>

      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${RULE}` }}
        className="flex items-center gap-3 px-6 py-3 shrink-0 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold transition-colors" style={{ color: MAROON }}>
          <ArrowLeft size={14} /> Back
        </button>
        <span style={{ width: 1, height: 16, background: RULE }} />
        <p className="text-sm font-bold flex-1 truncate" style={{ color: SLATE }}>{local.name}</p>
        <StatusBadge status={local.status} />
        {isHead && (
          <div className="flex items-center gap-2 flex-wrap">
            {local.status === "PENDING" && (
  <button onClick={() => patch({ status: "PROCESSING" })} disabled={patching}
    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all disabled:opacity-50"
    style={{ background: MAROON }}>
    <Check size={12} /> Approve
  </button>
)}
{local.status === "PROCESSING" && (
  <button onClick={() => patch({ status: "READY" })} disabled={patching}
    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all disabled:opacity-50"
    style={{ background: "#065f46" }}>
    <Check size={12} /> Mark as Ready
  </button>
)}
{local.status === "READY" && (
  <button onClick={() => patch({ status: "RELEASED", releasedAt: new Date().toISOString(), _releasedBy: currentUserName })} disabled={patching}
    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all disabled:opacity-50"
    style={{ background: "#1d4ed8" }}>
    <Download size={12} /> Mark as Released
  </button>
)}
{local.status !== "RELEASED" && local.status !== "REJECTED" && (
              <button onClick={handleReject} disabled={patching}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all disabled:opacity-50">
                <X size={12} /> Reject
              </button>
            )}
            {local.applicantType === "STUDENT" && (
              <button onClick={() => setShowExportModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                <FileDown size={13} /> Export Card
              </button>
            )}
            {local.requestType === "STUDENT_LOST" && (
              <button onClick={handleDownloadAffidavit} disabled={affidavitDl}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50">
                {affidavitDl ? <><RefreshCw size={13} className="animate-spin" /> Generating...</> : <><FileText size={13} /> Affidavit</>}
              </button>
            )}
            <button onClick={() => setShowDelete(true)}
              className="flex items-center gap-1 text-xs font-semibold text-red-300 hover:text-red-500 px-1 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto" style={{ background: "#f1f5f9" }}>
        <div className="grid grid-cols-1 gap-0 h-full">

          {/* LEFT COLUMN */}
          <div className="flex flex-col" style={{ background: "#fff" }}>
            <div className="px-5 py-3 border-b border-gray-100" style={{ background: "#fafafa" }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: MAROON }}>Applicant Information</p>
            </div>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${RULE}` }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: SLATE, lineHeight: 1.3 }}>{local.name}</p>
              <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{TYPE_LABELS[local.requestType]}</p>
              <span className="inline-flex items-center mt-2 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide"
                style={{ background: "#fef2f2", color: MAROON, border: `1px solid #e5d0d0` }}>
                {local.cardType ?? "—"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-2">
              <InfoRow label="Sex"          value={local.sex} />
              <InfoRow label="Contact No."  value={local.contactNo} />
              <InfoRow label="Email"        value={local.email} />
              <InfoRow label="Address"      value={local.address} />
              {local.applicantType === "STUDENT" ? (
                <>
                  <InfoRow label="Student No."      value={local.studentNo} />
                  <InfoRow label="Course / Program" value={local.courseProgram} />
                  <InfoRow label="Year & Section"   value={local.yearSection} />
                  <InfoRow label="Reason"           value={local.reason} />
                </>
              ) : (
                <>
                  <InfoRow label="Employee No."  value={local.employeeNo} />
                  <InfoRow label="Employee Type" value={local.employeeType} />
                  <InfoRow label="College/Dept"  value={local.collegeDept} />
                  <InfoRow label="Position"      value={local.position} />
                </>
              )}
              <InfoRow label="Submitted" value={fmtDate(local.submittedAt)} />
            </div>

            {/* Attachments */}
            <div style={{ borderTop: `1px solid ${RULE}` }}>
              <div className="px-5 py-3 border-b border-gray-100" style={{ background: "#fafafa" }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: MAROON }}>Attachments</p>
              </div>
              <div className="px-5 py-4 flex gap-3 flex-wrap">
                {local.photoUrl ? (
                  <a href={local.photoUrl} target="_blank" rel="noreferrer"
                    className="group relative w-16 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-100 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={local.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ExternalLink size={12} className="text-white" />
                    </div>
                    <span className="absolute bottom-0 left-0 right-0 text-[9px] font-bold text-center bg-black/50 text-white py-0.5">Photo</span>
                  </a>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 w-16 h-20 rounded-lg border-2 border-dashed border-gray-200 text-gray-300">
                    <Users size={16} /><span className="text-[9px]">No photo</span>
                  </div>
                )}
                {local.affidavitUrl && (
                  <a href={local.affidavitUrl} target="_blank" rel="noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 w-16 h-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition-all text-gray-500">
                    <FileText size={16} /><span className="text-[9px] font-bold text-center leading-tight px-1">Affidavit</span>
                  </a>
                )}
                {local.corIdUrl ? (
                  <a href={local.corIdUrl} target="_blank" rel="noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 w-16 h-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition-all text-gray-500">
                    <FileText size={16} /><span className="text-[9px] font-bold text-center leading-tight px-1">COR / ID</span>
                  </a>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 w-16 h-20 rounded-lg border-2 border-dashed border-red-200 bg-red-50 text-red-300">
                    <FileText size={16} /><span className="text-[9px] font-bold text-center leading-tight px-1 text-red-400">No COR/ID</span>
                  </div>
                )}
              </div>
            </div>

            {local.status === "RELEASED" && (
              <div className="px-5 py-4" style={{ borderTop: `1px solid ${RULE}`, background: "#f8fafc" }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>Released</p>
                <p style={{ fontSize: 10, color: MUTED }}>{fmtDate(local.releasedAt)}</p>
              </div>
            )}
          </div>


        </div>
      </div>

      {showExportModal && <ExportCardModal request={local} courseId={courseId} onClose={() => setShowExportModal(false)} />}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={() => setShowDelete(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-6" style={{ border: `1px solid ${RULE}` }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "#fef2f2" }}>
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: SLATE }}>Delete this request?</p>
            <p className="text-xs mb-5" style={{ color: MUTED }}>
              {local.name} — {TYPE_LABELS[local.requestType]}<br />This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{ border: `1px solid ${RULE}`, color: MUTED }}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourseLibraryTab({ courseId, isHead }: Props) {
  const [requests,     setRequests]     = useState<LibraryCardRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
 const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter,   setTypeFilter]   = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [showFilters,  setShowFilters]  = useState(false);
  const [showShare,    setShowShare]    = useState(false);
  const [detail,       setDetail]       = useState<LibraryCardRequest | null>(null);
  const [page,         setPage]         = useState(1);

  const fetchRequests = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const q = new URLSearchParams();
      if (search)       q.set("search", search);
      if (statusFilter) q.set("status", statusFilter);
      if (typeFilter)   q.set("type",   typeFilter);
      if (dateFrom)     q.set("dateFrom", dateFrom);
      if (dateTo)       q.set("dateTo",   dateTo);
      const res  = await fetch(`/api/courses/${courseId}/library-cards?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRequests(data.requests ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally { setLoading(false); }
  }, [courseId, search, statusFilter, typeFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
 useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter, courseFilter, dateFrom, dateTo]);

  const filteredRequests = requests.filter(r => {
    if (courseFilter && r.courseProgram !== courseFilter) return false;
    if (dateFrom && r.submittedAt < dateFrom) return false;
    if (dateTo   && r.submittedAt > dateTo + "T23:59:59") return false;
    return true;
  });
  const hasActiveFilter = !!(statusFilter || typeFilter || courseFilter || dateFrom || dateTo);
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginated  = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (detail) {
    return (
      <RequestDetailView
        request={detail} courseId={courseId} isHead={isHead}
        onBack={() => setDetail(null)}
        onUpdated={u => { setRequests(prev => prev.map(r => r.id === u.id ? u : r)); setDetail(u); }}
        onDeleted={id => { setRequests(prev => prev.filter(r => r.id !== id)); setDetail(null); }}
      />
    );
  }

  return (
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5" style={{ color: MAROON }}>Library</p>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">Library Cards</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchRequests}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-1.5 rounded-lg text-white transition-all"
            style={{ background: MAROON }}>
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share Form Link</span>
            <span className="sm:hidden">Share</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",      value: requests.length },
            { label: "Pending",    value: requests.filter(r => r.status === "PENDING").length },
            { label: "Ready",      value: requests.filter(r => r.status === "READY").length },
            { label: "Released",   value: requests.filter(r => r.status === "RELEASED").length },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="rounded-lg p-2 shrink-0" style={{ background: "#f3f4f6" }}>
                <BookOpen className="w-4 h-4" style={{ color: MAROON }} />
              </div>
              <div>
                <p className="text-xl font-black tabular-nums text-gray-900">{s.value}</p>
                <p className="text-xs font-semibold text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">

          {/* Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 sm:flex-none sm:w-64 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name, student no., email…"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
              {search && <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500"><X className="w-3 h-3" /></button>}
            </div>
            <button onClick={() => setShowFilters(f => !f)}
              style={(showFilters || hasActiveFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0 ${!(showFilters || hasActiveFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400" : ""}`}>
              <Filter className="w-3 h-3" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70" />}
            </button>
          </div>

          {showFilters && (
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-2.5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Type</span>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 outline-none">
                  <option value="">All Types</option>
                  <option value="STUDENT_NEW">Student (New)</option>
                  <option value="STUDENT_LOST">Student (Lost)</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Status</span>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 outline-none">
                  <option value="">All Statuses</option>
                  {(Object.keys(STATUS_META) as Status[]).map(s => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Course</span>
                <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 outline-none max-w-[260px]">
                  <option value="">All Courses</option>
                  {[...new Set(requests.map(r => r.courseProgram).filter(Boolean))].map(c => (
                    <option key={c} value={c!}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Date Range</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none" />
                  <span className="text-xs text-gray-400">to</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "Today",      fn: () => { const d = new Date().toISOString().split("T")[0]; setDateFrom(d); setDateTo(d); } },
                    { label: "This Week",  fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); setDateFrom(mon.toISOString().split("T")[0]); setDateTo(new Date().toISOString().split("T")[0]); } },
                    { label: "This Month", fn: () => { const now = new Date(); setDateFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`); setDateTo(new Date().toISOString().split("T")[0]); } },
                  ].map(p => (
                    <button key={p.label} onClick={p.fn}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {hasActiveFilter && (
                <button onClick={() => { setStatusFilter(""); setTypeFilter(""); setCourseFilter(""); setDateFrom(""); setDateTo(""); }}
                  className="flex items-center gap-1 text-[11px] font-bold hover:underline" style={{ color: MAROON }}>
                  <X size={11} /> Clear all filters
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="animate-pulse divide-y divide-gray-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="h-3 w-28 bg-gray-100 rounded" />
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-xs font-medium text-red-500 py-20">{error}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse hidden sm:table">
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["No.", "Name", "Student No.", "Course", "Type", "Date Submitted", "Status", ""].map((h, i) => (
                      <th key={i} className="text-left px-3 py-3 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-700">
                          {h}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-16">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                            <BookOpen className="w-6 h-6" style={{ color: MAROON }} />
                          </div>
                          <p className="text-sm text-gray-400 font-medium">No requests yet.</p>
                          <button onClick={() => setShowShare(true)} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                            Share the form link →
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-16">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                            <BookOpen className="w-6 h-6" style={{ color: MAROON }} />
                          </div>
                          <p className="text-sm text-gray-400 font-medium">No requests found.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {paginated.map((r, i) => (
                    <tr key={r.id} className="hover:bg-gray-50/70 cursor-pointer transition-colors" onClick={() => setDetail(r)}>
                      <td className="px-3 py-3 text-xs text-gray-800 tabular-nums text-center" style={{ border: "1px solid #d1d5db" }}>
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>{r.name}</td>
                      <td className="px-3 py-3 text-xs text-gray-800 font-mono" style={{ border: "1px solid #d1d5db" }}>{r.studentNo ?? r.employeeNo ?? "—"}</td>
                      <td className="px-3 py-3 text-xs text-gray-800 max-w-[200px]" style={{ border: "1px solid #d1d5db" }}>
                        <span className="line-clamp-1">{r.courseProgram ?? "—"}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-800" style={{ border: "1px solid #d1d5db" }}>
                        {TYPE_LABELS[r.requestType]}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-800 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>{fmtDate(r.submittedAt)}</td>
                      <td className="px-3 py-3 text-xs text-gray-800" style={{ border: "1px solid #d1d5db" }}>
                        {STATUS_META[r.status].label}
                      </td>
                      <td className="px-2 py-3 w-10 text-xs text-gray-400 hover:text-gray-700" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setDetail(r)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="sm:hidden p-3 space-y-2">
                {requests.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <BookOpen className="w-8 h-8" style={{ color: MAROON }} />
                    <p className="text-sm text-gray-400 font-medium text-center">No requests yet.</p>
                    <button onClick={() => setShowShare(true)} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>Share link →</button>
                  </div>
                )}
                {paginated.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4" onClick={() => setDetail(r)}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{r.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{TYPE_LABELS[r.requestType]}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-[11px] text-gray-400">{fmtDate(r.submittedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && filteredRequests.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white shrink-0 flex-wrap gap-2">
              <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length}
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
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-semibold border transition-all ${page !== n ? "border-gray-200 text-gray-500 hover:border-gray-400" : ""}`}>
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