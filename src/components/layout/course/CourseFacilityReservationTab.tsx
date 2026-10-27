"use client";

// src/components/layout/course/CourseFacilityReservationTab.tsx
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, Trash2, Check, ArrowLeft, X, Plus,
  Clock, AlertCircle, Inbox, CheckCircle2, XCircle, Ban, Printer, CalendarClock, FileCheck2, Link2, MoreVertical,
} from "lucide-react";
import QRCode from "qrcode";
import { FONT } from "./osaShared";

/* ═══ TOKENS ═══ */
const C = {
  brand: "#7b1113", brandTint: "#fdf2f2", brandRing: "rgba(123,17,19,0.12)",
  ink: "#111827", body: "#374151", muted: "#6b7280", faint: "#9ca3af",
  line: "#e5e7eb", lineSoft: "#f3f4f6", danger: "#b91c1c",
} as const;
const PAGE_SIZE = 15;

/* ═══ TYPES ═══ */
type Status = "PENDING" | "APPROVED" | "COMPLETED" | "DISAPPROVED" | "CANCELLED" | "NO_SHOW";
type RequestorType = "STUDENT" | "EMPLOYEE" | "COMMUNITY";
type FacilityType = "AUDIO_VISUAL" | "DISCUSSION" | "OTHER";
interface Participant { name: string; sex: "M" | "F" }

interface Reservation {
  id: string;
  requestorType: RequestorType;
  name: string;
  sex?: string | null;
  email?: string | null;
  contactNo?: string | null;
  collegeDept?: string | null;
  courseYearSection?: string | null;
  activityType: string;
  startAt: string;
  endAt: string;
  participants: Participant[];
  participantCount: number;
  letterReceived: boolean;
  consentGivenAt?: string | null;
  status: Status;
  facilityType?: FacilityType | null;
  facilityNo?: string | null;
  facilityOther?: string | null;
  disapprovalReason?: string | null;
  librarianName?: string | null;
  librarianSignatureUrl?: string | null;
  actionAt?: string | null;
  completedAt?: string | null;
  csmSubmitted: boolean;
  dateFiled: string;
  letterName?: string | null;
  submittedVia?: "STAFF" | "ONLINE";
  arrivedAt?: string | null;
  csmSubmittedAt?: string | null;
  requestorSignatureUrl?: string | null;
  requestorSignedAt?: string | null;
  releasedAt?: string | null;
}

interface Props { courseId: string; isHead: boolean }

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  PENDING:     { label: "Pending",     color: "#92400e", bg: "#fef3c7" },
  APPROVED:    { label: "Approved",    color: "#065f46", bg: "#d1fae5" },
  COMPLETED:   { label: "Completed",   color: "#374151", bg: "#f3f4f6" },
  DISAPPROVED: { label: "Disapproved", color: "#991b1b", bg: "#fee2e2" },
  CANCELLED:   { label: "Cancelled",   color: "#6b7280", bg: "#f3f4f6" },
  NO_SHOW:     { label: "No-show",     color: "#9a3412", bg: "#ffedd5" },
};
  const STATUS_TABS: Array<Status | "ALL"> = ["ALL", "PENDING", "APPROVED", "COMPLETED", "DISAPPROVED", "CANCELLED"];
const TYPE_LABELS: Record<RequestorType, string> = { STUDENT: "Student", EMPLOYEE: "Employee", COMMUNITY: "Community" };
const FACILITY_LABELS: Record<FacilityType, string> = {
  AUDIO_VISUAL: "Audio-Visual Room", DISCUSSION: "Discussion Room", OTHER: "Other facility",
};

/* ═══ HELPERS ═══ */
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }) : "—";
const fmtRange = (r: Reservation) => `${fmtDate(r.startAt)} · ${fmtTime(r.startAt)} – ${fmtTime(r.endAt)}`;
const facilityOf = (r: Reservation) =>
  !r.facilityType ? "—"
  : r.facilityType === "DISCUSSION" ? `Discussion Room ${r.facilityNo ?? ""}`.trim()
  : r.facilityType === "OTHER" ? r.facilityOther ?? "Other"
  : FACILITY_LABELS.AUDIO_VISUAL;

function toLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}


/** Fills the official PSU-QSP-ULIB-003-FO004-R00 PDF (public/template) and opens it. */
const TEMPLATE_URL = "/template/PSU-QSP-ULIB-003-FO004-R00.pdf";
const PAGE_H = 936;
const clean = (s: unknown) =>
  String(s ?? "")
    .replace(/[\u2013\u2014]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?");

async function embedImage(doc: PDFDocument, url?: string | null) {
  if (!url) return null;
  try { return url.startsWith("data:image/jpeg") ? await doc.embedJpg(url) : await doc.embedPng(url); }
  catch { return null; }
}

async function printForm(r: Reservation) {
  const w = window.open("", "_blank"); // buksan agad para hindi ma-block ng browser
  try {
    const bytes = await fetch(TEMPLATE_URL).then(res => { if (!res.ok) throw new Error("Template not found"); return res.arrayBuffer(); });
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.getPages()[0];
        const ink = rgb(0, 0, 0);

    // x, `bottom` = ilalim ng linya sa template (top-based), maxW = lapad ng linya
    const T = (pg: PDFPage, s: unknown, x: number, bottom: number, maxW: number, size = 9, f: PDFFont = font) => {
      const t = clean(s); if (!t) return;
      let sz = size; while (f.widthOfTextAtSize(t, sz) > maxW && sz > 5) sz -= 0.5;
      pg.drawText(t, { x, y: PAGE_H - (bottom - 3.5), size: sz, font: f, color: ink });
    };
    const X = (cx: number, cy: number, size = 9) =>
      page.drawText("X", { x: cx - bold.widthOfTextAtSize("X", size) / 2, y: PAGE_H - cy - size * 0.35, size, font: bold, color: ink });

    // Header
    T(page, r.name, 54, 145.6, 160);
    X(r.requestorType === "EMPLOYEE" ? 274 : r.requestorType === "STUDENT" ? 335 : 410, 140);
    if (r.sex === "M") X(453.8, 139.1);
    if (r.sex === "F") X(476.2, 139.1);
    T(page, fmtDate(r.dateFiled), 527, 145.6, 62);
    T(page, r.collegeDept, 242, 159.1, 137);
    T(page, r.courseYearSection, 502, 159.1, 88);
    T(page, r.activityType, 104, 172, 482);
    T(page, fmtDate(r.startAt), 102, 184.9, 164);
    T(page, fmtTime(r.startAt), 342, 184.9, 95);
    T(page, fmtTime(r.endAt), 520, 184.9, 58);

    // Participants: 10 rows x 2 columns sa template, ang sobra ay sa additional sheet
    const rowTops = [199.4, 211.1, 222.9, 234.6, 246.3, 258.1, 269.8, 281.5, 293.2, 304.9];
    const drawP = (p: Participant, i: number) => {
      const right = i >= 10, row = i % 10, top = rowTops[row];
      T(page, p.name, right ? 343 : 19, top + 10, right ? 177 : 224);
      X(right ? (p.sex === "M" ? 537 : 559) : (p.sex === "M" ? 262.5 : 285), top + 5.5, 8);
    };
    r.participants.slice(0, 20).forEach(drawP);

    if (r.participants.length > 20) {
      const extra = r.participants.slice(20);
      const per = 40;
      for (let s = 0; s < extra.length; s += per) {
        const pg = doc.addPage([612, PAGE_H]);
        pg.drawText("Additional Sheet - List of Participants", { x: 18, y: PAGE_H - 40, size: 13, font: bold });
        pg.drawText(clean(`${r.name} · ${r.activityType} · ${fmtDate(r.startAt)}`), { x: 18, y: PAGE_H - 58, size: 9, font });
        extra.slice(s, s + per).forEach((p, i) => {
          const y = PAGE_H - 90 - i * 18;
          pg.drawText(`${21 + s + i}.`, { x: 18, y, size: 9, font });
          pg.drawText(clean(p.name), { x: 40, y, size: 9, font });
          pg.drawText(p.sex === "M" ? "M" : "F", { x: 560, y, size: 9, font: bold });
        });
      }
    }

    // Requestor signature + consent signature
    const sig = await embedImage(doc, r.requestorSignatureUrl);
    if (sig) {
      const d = sig.scaleToFit(120, 24);
      page.drawImage(sig, { x: 28, y: PAGE_H - 507, width: d.width, height: d.height });
      const d2 = sig.scaleToFit(120, 22);
      if (r.consentGivenAt) page.drawImage(sig, { x: 250, y: PAGE_H - 536, width: d2.width, height: d2.height });
    }
    T(page, r.name, 22, 511.5, 138, 8);
    if (r.consentGivenAt) T(page, r.name, 300, 537, 160);

    // Librarian section
    if (r.status === "APPROVED" || r.status === "COMPLETED") X(103.2, 623.2);
    if (r.status === "DISAPPROVED") { X(202.2, 623.2); T(page, r.disapprovalReason, 290, 628.1, 292, 8); }
    if (r.facilityType === "AUDIO_VISUAL") X(134, 649);
    if (r.facilityType === "DISCUSSION") { X(291, 649); T(page, r.facilityNo, 331, 654.7, 26); }
    if (r.facilityType === "OTHER") T(page, r.facilityOther, 502, 654.7, 83);
    const lsig = await embedImage(doc, r.librarianSignatureUrl);
    if (lsig) { const d = lsig.scaleToFit(80, 20); page.drawImage(lsig, { x: 205, y: PAGE_H - 677, width: d.width, height: d.height }); }
    T(page, r.librarianName, 290, 677, 136);

    // Requestor copy
    T(page, r.name, 52, 763.7, 340);
    T(page, r.facilityType ? facilityOf(r) : "", 127, 775.5, 266);
    T(page, r.activityType, 100, 787.2, 292);
    T(page, fmtDate(r.startAt), 46, 798.9, 164);
    T(page, fmtTime(r.startAt), 280, 798.9, 114);
    T(page, fmtTime(r.endAt), 471, 798.9, 97);
    T(page, r.librarianName, 86, 881, 236);

    const out = await doc.save();
    const url = URL.createObjectURL(new Blob([out as unknown as BlobPart], { type: "application/pdf" }));
    if (w) w.location.href = url; else window.open(url, "_blank");
  } catch (e) {
    w?.close();
    throw e;
  }
}

/* ═══ UI PRIMITIVES ═══ */
function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}>{m.label}</span>
  );
}

type ToastState = { msg: string; tone: "success" | "error" } | null;
function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const err = toast.tone === "error";
  return (
    <div role="status" className="fixed left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold text-white"
      style={{ background: err ? C.danger : C.ink, bottom: "calc(24px + env(safe-area-inset-bottom))", fontFamily: FONT }}>
      {err ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />} {toast.msg}
    </div>
  );
}

function SheetModal({ onClose, title, subtitle, children, footer, maxWidth = "max-w-md", tone = "brand" }: {
  onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; maxWidth?: string; tone?: "brand" | "danger";
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      style={{ backdropFilter: "blur(3px)", fontFamily: FONT }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} sm:mx-4 overflow-hidden flex flex-col max-h-[92vh]`}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 shrink-0 text-white" style={{ background: tone === "danger" ? C.danger : C.brand }}>
          <div className="min-w-0">
            <p className="truncate" style={{ fontSize: 14, fontWeight: 800 }}>{title}</p>
            {subtitle && <p className="text-xs truncate text-white/70">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 shrink-0"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto">{children}</div>
        {footer && <div className="border-t shrink-0 bg-gray-50" style={{ borderColor: C.line, paddingBottom: "env(safe-area-inset-bottom)" }}>{footer}</div>}
      </div>
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 bg-white";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
const ghostBtn = "flex items-center gap-1.5 text-xs font-semibold px-3 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50";

function ConfirmModal({ title, message, confirmLabel, busy, onConfirm, onClose }: {
  title: string; message: ReactNode; confirmLabel: string; busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <SheetModal onClose={onClose} title={title} tone="danger" maxWidth="max-w-sm"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60" style={{ background: C.danger }}>
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      }>
      <div className="px-5 py-5 text-sm leading-relaxed" style={{ color: C.body }}>{message}</div>
    </SheetModal>
  );
}

/* ═══ NEW RESERVATION MODAL ═══ */
function NewReservationModal({ courseId, onClose, onCreated, notify }: {
  courseId: string; onClose: () => void; onCreated: (r: Reservation) => void;
  notify: (m: string, t?: "success" | "error") => void;
}) {
  const [f, setF] = useState({
    requestorType: "STUDENT" as RequestorType, firstName: "", middleName: "", lastName: "", sex: "", collegeDept: "", courseYearSection: "",
    email: "", contactNo: "", activityType: "", date: toLocalISODate(new Date()), start: "09:00", end: "11:00",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF(p => ({ ...p, [k]: v })); setError(""); };
  const [rows, setRows] = useState<Participant[]>([{ name: "", sex: "M" }]);
  const participants = useMemo(
    () => rows.filter(p => p.name.trim()).map(p => ({ name: p.name.trim(), sex: p.sex })),
    [rows],
  );
  const updateRow = (i: number, patch: Partial<Participant>) => {
    setRows(prev => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
    setError("");
  };
  const addRow = () => setRows(prev => [...prev, { name: "", sex: "M" }]);
  const removeRow = (i: number) =>
    setRows(prev => (prev.length === 1 ? [{ name: "", sex: "M" }] : prev.filter((_, idx) => idx !== i)));
  const fullName = [f.firstName, f.middleName, f.lastName].map(p => p.trim()).filter(Boolean).join(" ");

  const submit = async () => {
    if (!f.firstName.trim() || !f.lastName.trim()) return setError("Enter the requestor’s first name and last name.");
    if (!f.activityType.trim()) return setError("Enter the type of activity.");
    const startAt = new Date(`${f.date}T${f.start}`), endAt = new Date(`${f.date}T${f.end}`);
    if (!(endAt > startAt)) return setError("End time must be after the start time.");
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/library-facilities`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestorType: f.requestorType, name: fullName, sex: f.sex, collegeDept: f.collegeDept,
          courseYearSection: f.requestorType === "STUDENT" ? f.courseYearSection : "",
          email: f.email, contactNo: f.contactNo, activityType: f.activityType,
          startAt: startAt.toISOString(), endAt: endAt.toISOString(),
          participants, letterReceived: true, consent: true,
        }),
      });
      const d = await res.json();
      if (!res.ok) return setError(d.error ?? "Couldn’t save the reservation.");
      onCreated(d.reservation); notify("Reservation added"); onClose();
    } catch { setError("Couldn’t save the reservation. Check your connection."); }
    finally { setBusy(false); }
  };


  return (
    <SheetModal onClose={onClose} title="New reservation" subtitle="Library Facilities Reservation Form" maxWidth="max-w-xl"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60" style={{ background: C.brand }}>
            {busy ? "Saving…" : "Save reservation"}
          </button>
        </div>
      }>
      <div className="px-5 py-5 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TYPE_LABELS) as RequestorType[]).map(t => (
            <button key={t} type="button" onClick={() => set("requestorType", t)}
              className="h-9 rounded-lg border text-xs font-semibold transition-colors"
              style={f.requestorType === t ? { background: C.brand, color: "#fff", borderColor: C.brand } : { borderColor: C.line, color: C.body }}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className={labelCls}>First name <span className="text-red-500">*</span></label>
            <input className={inputCls} autoComplete="given-name" value={f.firstName} onChange={e => set("firstName", e.target.value)} /></div>
          <div><label className={labelCls}>Middle name</label>
            <input className={inputCls} autoComplete="additional-name" value={f.middleName} onChange={e => set("middleName", e.target.value)} /></div>
          <div><label className={labelCls}>Last name <span className="text-red-500">*</span></label>
            <input className={inputCls} autoComplete="family-name" value={f.lastName} onChange={e => set("lastName", e.target.value)} /></div>
        </div>

        <div className="w-full sm:w-40">
          <label className={labelCls}>Sex</label>
          <select className={inputCls} value={f.sex} onChange={e => set("sex", e.target.value)}>
            <option value="">—</option><option value="M">Male</option><option value="F">Female</option>
          </select>
        </div>  

        <div className={`grid grid-cols-1 ${f.requestorType === "STUDENT" ? "sm:grid-cols-2" : ""} gap-3`}>
          <div><label className={labelCls}>College / Department / Organization / Agency</label>
            <input className={inputCls} value={f.collegeDept} onChange={e => set("collegeDept", e.target.value)} /></div>
          {f.requestorType === "STUDENT" && (
            <div><label className={labelCls}>Course, Year &amp; Section</label>
              <input className={inputCls} value={f.courseYearSection} onChange={e => set("courseYearSection", e.target.value)} placeholder="e.g. BSIT 3-A" /></div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={f.email} onChange={e => set("email", e.target.value)} /></div>
          <div><label className={labelCls}>Contact no.</label><input className={inputCls} value={f.contactNo} onChange={e => set("contactNo", e.target.value)} /></div>
        </div>

        <div><label className={labelCls}>Type of activity <span className="text-red-500">*</span></label>
          <input className={inputCls} value={f.activityType} onChange={e => set("activityType", e.target.value)} placeholder="e.g. Group discussion, film viewing, presentation" /></div>

        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>Date of activity</label><input type="date" className={inputCls} value={f.date} onChange={e => set("date", e.target.value)} /></div>
          <div><label className={labelCls}>Time started</label><input type="time" className={inputCls} value={f.start} onChange={e => set("start", e.target.value)} /></div>
          <div><label className={labelCls}>Time finished</label><input type="time" className={inputCls} value={f.end} onChange={e => set("end", e.target.value)} /></div>
        </div>

        <div>
          <label className={labelCls}>List of participants <span className="font-normal text-gray-400">· {participants.length} listed</span></label>
          <div className="space-y-2">
            {rows.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_110px_36px] gap-2 items-center">
                <input className={inputCls} placeholder={`Participant ${i + 1} full name`} value={p.name}
                  onChange={e => updateRow(i, { name: e.target.value })} />
                <select className={inputCls} aria-label={`Sex of participant ${i + 1}`} value={p.sex}
                  onChange={e => updateRow(i, { sex: e.target.value as "M" | "F" })}>
                  <option value="M">Male</option><option value="F">Female</option>
                </select>
                <button type="button" onClick={() => removeRow(i)} aria-label={`Remove participant ${i + 1}`}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow}
            className="mt-2 h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5" style={{ borderColor: C.brand, color: C.brand }}>
            <Plus size={13} /> Add participant
          </button>
        </div>


        {error && <div className="flex items-center gap-2 text-xs text-red-500 font-semibold" role="alert"><AlertCircle size={13} /> {error}</div>}
      </div>
    </SheetModal>
  );
}

/* ═══ SIGNATURE PAD ═══ */
function SigPad({ onChange }: { onChange: (v: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const pos = (e: React.PointerEvent) => {
    const c = ref.current!, r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const down = (e: React.PointerEvent) => {
    const c = ref.current!, ctx = c.getContext("2d")!;
    ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
    drawing.current = true;
    const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    c.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!, p = pos(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(ref.current!.toDataURL("image/png"));
  };
  const clear = () => {
    const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); onChange("");
  };
  return (
    <div>
      <canvas ref={ref} width={600} height={200} className="w-full h-28 border border-gray-300 rounded-lg bg-white"
        style={{ touchAction: "none" }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      <button type="button" onClick={clear} className="mt-1 text-xs font-semibold underline text-gray-600">Clear</button>
    </div>
  );
}

/* ═══ APPROVE / DISAPPROVE MODAL ═══ */

/* ═══ APPROVE / DISAPPROVE MODAL ═══ */
function ActionModal({ mode, request, courseId, onClose, onUpdated, notify }: {
  mode: "approve" | "disapprove"; request: Reservation; courseId: string; onClose: () => void;
  onUpdated: (r: Reservation) => void; notify: (m: string, t?: "success" | "error") => void;
}) {
  const [facilityType, setFacilityType] = useState<FacilityType>(request.participantCount >= 50 ? "AUDIO_VISUAL" : "DISCUSSION");
  const [facilityNo, setFacilityNo] = useState("");
  const [facilityOther, setFacilityOther] = useState("");
  const [reason, setReason] = useState("");
  const [librarianName, setLibrarianName] = useState("");
  const [librarianSig, setLibrarianSig] = useState("");
  const [savedSig, setSavedSig] = useState("");
  const [showPad, setShowPad] = useState(false);
  const [sigIsNew, setSigIsNew] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canOverride, setCanOverride] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => {
      if (d.user?.name) setLibrarianName(d.user.name);
      if (d.user?.librarySignature) { setLibrarianSig(d.user.librarySignature); setSavedSig(d.user.librarySignature); }
    }).catch(() => {});
  }, []);

  const submit = async (override = false) => {
    setBusy(true); setError("");
    try {
      const body = mode === "approve"
        ? { action: "approve", facilityType, facilityNo, facilityOther, librarianName, librarianSignatureUrl: librarianSig || undefined, override }
        : { action: "disapprove", reason, librarianName };
      const res = await fetch(`/api/courses/${courseId}/library-facilities/${request.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Couldn’t update the reservation."); setCanOverride(!!d.canOverride); return; }
      if (mode === "approve" && sigIsNew && saveToProfile && librarianSig) {
        fetch("/api/profile", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ librarySignature: librarianSig }),
        }).catch(() => {});
      }
      onUpdated(d.reservation); notify(mode === "approve" ? "Reservation approved" : "Reservation disapproved"); onClose();
    } catch { setError("Couldn’t update the reservation. Check your connection."); }
    finally { setBusy(false); }
  };

  return (
    <SheetModal onClose={onClose} tone={mode === "disapprove" ? "danger" : "brand"}
      title={mode === "approve" ? "Approve reservation" : "Disapprove reservation"}
      subtitle={`${request.name} · ${fmtRange(request)}`}
      footer={
        <div className="px-5 py-4 flex gap-2 flex-wrap">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">Cancel</button>
          {canOverride && (
            <button onClick={() => submit(true)} disabled={busy} className="flex-1 h-10 rounded-xl text-xs font-bold border disabled:opacity-60" style={{ borderColor: C.brand, color: C.brand }}>
              Approve anyway
            </button>
          )}
          <button onClick={() => submit(false)} disabled={busy} className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: mode === "approve" ? C.brand : C.danger }}>
            {busy ? "Please wait…" : mode === "approve" ? "Approve" : "Disapprove"}
          </button>
        </div>
      }>
      <div className="px-5 py-5 space-y-4">
        {mode === "approve" ? (
          <>
            <div>
              <label className={labelCls}>Facility</label>
              <select className={inputCls} value={facilityType} onChange={e => { setFacilityType(e.target.value as FacilityType); setError(""); setCanOverride(false); }}>
                {(Object.keys(FACILITY_LABELS) as FacilityType[]).map(t => <option key={t} value={t}>{FACILITY_LABELS[t]}</option>)}
              </select>
              <p className="text-[11px] mt-1" style={{ color: C.faint }}>
                {request.participantCount} participants · {fmtTime(request.startAt)} – {fmtTime(request.endAt)}
              </p>
            </div>
            {facilityType === "DISCUSSION" && (
              <div><label className={labelCls}>Discussion room no.</label><input className={inputCls} value={facilityNo} onChange={e => setFacilityNo(e.target.value)} /></div>
            )}
            {facilityType === "OTHER" && (
              <div><label className={labelCls}>Other library facility</label><input className={inputCls} value={facilityOther} onChange={e => setFacilityOther(e.target.value)} /></div>
            )}
          </>
        ) : (
          <div><label className={labelCls}>Reason for disapproval <span className="text-red-500">*</span></label>
            <textarea className={inputCls} rows={3} value={reason} onChange={e => { setReason(e.target.value); setError(""); }} /></div>
        )}
        <div><label className={labelCls}>Librarian / library staff</label>
          <input className={inputCls} value={librarianName} onChange={e => setLibrarianName(e.target.value)} /></div>
        {mode === "approve" && (
          <div>
            <label className={labelCls}>Signature</label>
            {savedSig && !showPad ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={librarianSig || savedSig} alt="Librarian signature" className="h-12 border border-gray-200 rounded-lg bg-white p-1" />
                <button type="button" onClick={() => setShowPad(true)} className="text-xs font-semibold underline" style={{ color: C.brand }}>Draw new</button>
              </div>
            ) : (
              <div className="space-y-2">
                <SigPad onChange={v => { setLibrarianSig(v); setSigIsNew(!!v); }} />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="flex items-center gap-2 text-[11px]" style={{ color: C.body }}>
                    <input type="checkbox" className="w-3.5 h-3.5" style={{ accentColor: C.brand }} checked={saveToProfile} onChange={e => setSaveToProfile(e.target.checked)} />
                    Save to my profile for next time
                  </label>
                  {savedSig && (
                    <button type="button" onClick={() => { setLibrarianSig(savedSig); setSigIsNew(false); setShowPad(false); }}
                      className="text-xs font-semibold underline" style={{ color: C.brand }}>Use saved signature</button>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: C.faint }}>Draw your signature above. If left blank, the printed form will have an empty signature line.</p>
              </div>
            )}
          </div>
        )}
        {error && <div className="flex items-start gap-2 text-xs text-red-500 font-semibold" role="alert"><AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}</div>}
      </div>
    </SheetModal>
  );
}
/* ═══ GENERATE LINK MODAL ═══ */
function InviteModal({ courseId, onClose, notify }: {
  courseId: string; onClose: () => void; notify: (m: string, t?: "success" | "error") => void;
}) {
  const [type, setType] = useState<RequestorType | "">("");
  const [hours, setHours] = useState(48);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; expiresAt: string; qr: string } | null>(null);

  const generate = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/library-facilities/invites`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestorType: type, letterReceived: true, hours }),
      });
      const d = await res.json();
      if (!res.ok) return setError(d.error ?? "Couldn’t generate the link.");
      const qr = await QRCode.toDataURL(d.url, { width: 260, margin: 1 });
      setResult({ url: d.url, expiresAt: d.expiresAt, qr });
    } catch { setError("Couldn’t generate the link. Check your connection."); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(result!.url); notify("Link copied"); }
    catch { notify("Couldn’t copy. Select the link and copy it manually.", "error"); }
  };

  return (
    <SheetModal onClose={onClose} title="Generate reservation link" subtitle="One link per requestor. It works once."
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
            {result ? "Done" : "Cancel"}
          </button>
          {!result && (
            <button onClick={generate} disabled={busy} className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60" style={{ background: C.brand }}>
              {busy ? "Generating…" : "Generate link"}
            </button>
          )}
        </div>
      }>
      <div className="px-5 py-5 space-y-4">
        {!result ? (
          <>
            <div>
              <label className={labelCls}>Requestor type (optional)</label>
              <select className={inputCls} value={type} onChange={e => setType(e.target.value as RequestorType | "")}>
                <option value="">Let the requestor choose</option>
                {(Object.keys(TYPE_LABELS) as RequestorType[]).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Link expires after</label>
              <select className={inputCls} value={hours} onChange={e => setHours(Number(e.target.value))}>
                <option value={24}>24 hours</option><option value={48}>48 hours</option><option value={168}>7 days</option>
              </select>
            </div>
          </>
        ) : (
          <div className="text-center space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.qr} alt="QR code of the reservation link" className="mx-auto" width={220} height={220} />
            <input readOnly value={result.url} onFocus={e => e.currentTarget.select()} className={inputCls + " text-xs"} />
            <button onClick={copy} className={ghostBtn + " mx-auto"}><Link2 size={13} /> Copy link</button>
            <p className="text-[11px]" style={{ color: C.muted }}>
              Valid until {fmtDate(result.expiresAt)} · {fmtTime(result.expiresAt)}. Give it to the requestor only. It stops working after they submit.
            </p>
          </div>
        )}
        {error && <div className="flex items-start gap-2 text-xs text-red-500 font-semibold" role="alert"><AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}</div>}
      </div>
    </SheetModal>
  );
}

/* ═══ DETAIL VIEW ═══ */
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
function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium mb-0.5" style={{ color: C.muted }}>{label}</dt>
      <dd className="text-[13px] font-medium break-words" style={{ color: C.ink, lineHeight: 1.5 }}>{value}</dd>
    </div>
  );
}

function DetailView({ request, courseId, isHead, onBack, onUpdated, onDeleted, notify }: {
  request: Reservation; courseId: string; isHead: boolean; onBack: () => void;
  onUpdated: (r: Reservation) => void; onDeleted: (id: string) => void;
  notify: (m: string, t?: "success" | "error") => void;
}) {
  const [modal, setModal] = useState<"approve" | "disapprove" | null>(null);
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const r = request;

  const act = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/library-facilities/${r.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) { notify(d.error ?? "Couldn’t update the reservation.", "error"); return; }
      onUpdated(d.reservation); notify(ok);
    } catch { notify("Couldn’t update the reservation. Check your connection.", "error"); }
    finally { setBusy(false); setConfirm(null); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/library-facilities/${r.id}`, { method: "DELETE" });
      if (res.ok) { onDeleted(r.id); onBack(); return; }
      const d = await res.json().catch(() => ({}));
      notify(d.error ?? "Couldn’t delete the reservation.", "error");
    } catch { notify("Couldn’t delete the reservation.", "error"); }
    finally { setBusy(false); setConfirm(null); }
  };


  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT, background: "#fff" }}>
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 shrink-0 bg-white border-b flex-wrap" style={{ borderColor: C.line }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold shrink-0" style={{ color: C.brand }}><ArrowLeft size={15} /> Back</button>
        <span className="w-px h-4 shrink-0" style={{ background: C.line }} />
        <p className="text-sm font-bold flex-1 truncate min-w-0" style={{ color: C.ink }}>{r.name}</p>
        <StatusBadge status={r.status} />
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => printForm(r).catch(() => notify("Couldn’t generate the form. Check that the template is in public/template.", "error"))} className={ghostBtn}><Printer size={13} /> Export PDF / Print</button>
          {isHead && r.status === "PENDING" && (<>
            <button onClick={() => setModal("disapprove")} className="flex items-center gap-1.5 text-xs font-semibold px-3 h-8 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"><Ban size={13} /> Disapprove</button>
            <button onClick={() => setModal("approve")} className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-8 rounded-lg text-white" style={{ background: C.brand }}><Check size={13} /> Approve</button>
          </>)}
          {isHead && r.status === "APPROVED" && (<>
            {!r.arrivedAt && (
              <button onClick={() => act({ action: "arrived" }, "Marked as arrived")} disabled={busy} className={ghostBtn}><Check size={13} /> Arrived</button>
            )}
            <button onClick={() => act({ action: "complete" }, "Marked as completed")} disabled={busy}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-8 rounded-lg text-white disabled:opacity-50" style={{ background: "#065f46" }}>
              <Check size={13} /> Mark as completed
            </button>
          </>)}
          {isHead && (r.status === "APPROVED" || r.status === "COMPLETED") && !r.releasedAt && (
            <button onClick={() => act({ action: "release" }, "Marked as released")} disabled={busy} className={ghostBtn}><FileCheck2 size={13} /> Released to requestor</button>
          )}
          {isHead && r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
            <button onClick={() => setConfirm("cancel")} className={ghostBtn}><XCircle size={13} /> Cancel</button>
          )}
          {isHead && (
            <button onClick={() => setConfirm("delete")} aria-label="Delete reservation"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
          <div className="flex flex-col gap-4">
            <Panel title="Activity">
              <dl className="px-4 sm:px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Type of activity" value={r.activityType} />
                <Field label="Date of activity" value={fmtDate(r.startAt)} />
                <Field label="Time" value={`${fmtTime(r.startAt)} – ${fmtTime(r.endAt)}`} />
                <Field label="Participants" value={String(r.participantCount)} />
                <Field label="Facility" value={r.facilityType ? facilityOf(r) : undefined} />
                <Field label="Reason for disapproval" value={r.disapprovalReason} />
                <Field label="Arrived" value={r.arrivedAt ? `${fmtDate(r.arrivedAt)} · ${fmtTime(r.arrivedAt)}` : undefined} />
                <Field label="Form released" value={r.releasedAt ? `${fmtDate(r.releasedAt)} · ${fmtTime(r.releasedAt)}` : undefined} />
              </dl>
            </Panel>
            <Panel title={`Participants (${r.participantCount})`}>
              {r.participants.length === 0 ? (
                <p className="px-5 py-4 text-xs" style={{ color: C.muted }}>No participants listed.</p>
              ) : (
                <ul className="px-4 sm:px-5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-[13px]" style={{ color: C.ink }}>
                  {r.participants.map((p, i) => (
                    <li key={i} className="flex justify-between gap-3 py-1.5 border-b" style={{ borderColor: C.lineSoft }}>
                      <span className="truncate">{p.name}</span><span className="font-semibold shrink-0" style={{ color: C.muted }}>{p.sex}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="flex flex-col gap-4">
            <Panel title="Requestor">
              <dl className="px-4 sm:px-5 py-4 grid grid-cols-1 gap-4">
                <Field label="Name" value={r.name} />
                <Field label="Type" value={TYPE_LABELS[r.requestorType]} />
                <Field label="Sex" value={r.sex} />
                <Field label="College / dept. / org. / agency" value={r.collegeDept} />
                <Field label="Course, year & section" value={r.courseYearSection} />
                <Field label="Email" value={r.email} />
                <Field label="Contact no." value={r.contactNo} />
                <Field label="Date filed" value={fmtDate(r.dateFiled)} />
                <Field label="Submitted via" value={r.submittedVia === "ONLINE" ? "Online request form" : "Encoded by staff"} />
                {r.requestorSignatureUrl && (
                  <div>
                    <dt className="text-[11px] font-medium mb-0.5" style={{ color: C.muted }}>Requestor signature</dt>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <dd><img src={r.requestorSignatureUrl} alt="Requestor signature" className="h-12 border border-gray-200 rounded-lg bg-white p-1" /></dd>
                  </div>
                )}
              </dl>
            </Panel>
            {r.letterName && (
              <Panel title="Request letter">
                <div className="px-4 sm:px-5 py-4 text-[13px]">
                  <a href={`/api/courses/${courseId}/library-facilities/${r.id}/letter`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold underline" style={{ color: C.brand }}>
                    <FileCheck2 size={13} /> View uploaded letter ({r.letterName})
                  </a>
                </div>
              </Panel>
            )}
            {r.librarianName && (
              <Panel title="Processed by">
                <div className="px-4 sm:px-5 py-4">
                  <p className="text-[13px] font-medium" style={{ color: C.ink }}>{r.librarianName}</p>
                  <p className="text-[11px]" style={{ color: C.muted }}>{fmtDate(r.actionAt)}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.librarianSignatureUrl && <img src={r.librarianSignatureUrl} alt="Signature" className="h-12 mt-2 border border-gray-200 rounded-lg bg-white p-1" />}
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>

      {modal && <ActionModal mode={modal} request={r} courseId={courseId} onClose={() => setModal(null)} onUpdated={onUpdated} notify={notify} />}
      {confirm === "cancel" && (
        <ConfirmModal title="Cancel this reservation?" confirmLabel="Cancel reservation" busy={busy}
          message={<>The reservation of <strong>{r.name}</strong> will be marked as cancelled.</>}
          onConfirm={() => act({ action: "cancel" }, "Reservation cancelled")} onClose={() => setConfirm(null)} />
      )}
      {confirm === "delete" && (
        <ConfirmModal title="Delete this reservation?" confirmLabel="Delete" busy={busy}
          message={<><strong>{r.name}</strong> — {r.activityType}.<br />This can’t be undone.</>}
          onConfirm={remove} onClose={() => setConfirm(null)} />
      )}
    </div>
  );
}

/* ═══ LIST VIEW (default export) ═══ */
export default function CourseFacilityReservationTab({ courseId, isHead }: Props) {
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<Status | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearch = useDebounced(search);

  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const q = new URLSearchParams();
      if (debouncedSearch) q.set("search", debouncedSearch);
      if (typeFilter) q.set("type", typeFilter);
      const res = await fetch(`/api/courses/${courseId}/library-facilities?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load reservations.");
      setItems(data.reservations ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load reservations."); }
    finally { setLoading(false); }
  }, [courseId, debouncedSearch, typeFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [debouncedSearch, statusTab, typeFilter, dateFilter]);

  const dateItems = useMemo(
    () => dateFilter ? items.filter(i => toLocalISODate(new Date(i.startAt)) === dateFilter) : items,
    [items, dateFilter],
  );
  const counts = useMemo(() => {
    const c: Record<Status | "ALL", number> = { ALL: dateItems.length, PENDING: 0, APPROVED: 0, COMPLETED: 0, DISAPPROVED: 0, CANCELLED: 0, NO_SHOW: 0 };
    dateItems.forEach(i => { c[i.status] += 1; });
    return c;
  }, [dateItems]);

  const filtered = useMemo(() => statusTab === "ALL" ? dateItems : dateItems.filter(i => i.status === statusTab), [dateItems, statusTab]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  // Mga reserved na sa napiling araw (Pending + Approved lang ang binibilang)
  const dayBooked = useMemo(
    () => dateFilter
      ? dateItems.filter(i => i.status === "PENDING" || i.status === "APPROVED")
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      : [],
    [dateItems, dateFilter],
  );

  const selectedIds = useMemo(() => items.filter(i => selected.has(i.id)).map(i => i.id), [items, selected]);
  const pageIds = paginated.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleOne = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const togglePage = () => setSelected(prev => {
    const n = new Set(prev);
    if (allPageSelected) pageIds.forEach(id => n.delete(id)); else pageIds.forEach(id => n.add(id));
    return n;
  });

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const flip = rect.bottom + 92 > window.innerHeight;
    setMenu({ id, x: rect.right, y: flip ? rect.top - 88 : rect.bottom + 4 });
  };
  const menuItem = menu ? items.find(i => i.id === menu.id) ?? null : null;
  const deleteTarget = deleteIds && deleteIds.length === 1 ? items.find(i => i.id === deleteIds[0]) ?? null : null;

  const doDelete = async () => {
    if (!deleteIds) return;
    setDeleting(true);
    const results = await Promise.allSettled(deleteIds.map(id =>
      fetch(`/api/courses/${courseId}/library-facilities/${id}`, { method: "DELETE" })
        .then(res => { if (!res.ok) throw new Error("fail"); return id; })));
    const ok = results.filter((x): x is PromiseFulfilledResult<string> => x.status === "fulfilled").map(x => x.value);
    const failed = deleteIds.length - ok.length;
    setItems(prev => prev.filter(i => !ok.includes(i.id)));
    setSelected(prev => { const n = new Set(prev); ok.forEach(id => n.delete(id)); return n; });
    setDeleting(false); setDeleteIds(null);
    if (failed) notify(`${failed} couldn’t be deleted.`, "error");
    else notify(ok.length === 1 ? "Reservation deleted" : `${ok.length} reservations deleted`);
  };

  const detail = detailId ? items.find(i => i.id === detailId) ?? null : null;

  if (detail) {
    return (
      <>
        <DetailView request={detail} courseId={courseId} isHead={isHead} notify={notify}
          onBack={() => setDetailId(null)}
          onUpdated={u => setItems(prev => prev.map(i => i.id === u.id ? u : i))}
          onDeleted={id => setItems(prev => prev.filter(i => i.id !== id))} />
        <Toast toast={toast} />
      </>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: "#fff" }}>
      <div className="bg-white border-b px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between shrink-0 gap-3" style={{ borderColor: C.line }}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Facility reservations</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: C.faint }}>Discussion rooms, the Audio-Visual Room and other library facilities. First come, first served.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchItems} aria-label="Refresh"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 w-9 h-9 sm:w-auto sm:px-3 rounded-lg">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Refresh</span>
          </button>
          {isHead && (
            <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-9 rounded-lg text-white hover:opacity-90" style={{ background: C.brand }}>
              <Link2 className="w-3.5 h-3.5" /> Generate<span className="hidden sm:inline"> link</span>
            </button>
          )}
          {isHead && (
            <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              <Plus className="w-3.5 h-3.5" /> New<span className="hidden sm:inline"> reservation</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col min-h-0">
        <div className="flex-1 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[420px]" style={{ borderColor: C.line }}>
          <div className="border-b overflow-x-auto" style={{ borderColor: C.line }}>
            <div role="tablist" className="flex px-2 sm:px-3 min-w-max">
              {STATUS_TABS.map(t => {
                const active = statusTab === t;
                return (
                  <button key={t} role="tab" aria-selected={active} onClick={() => setStatusTab(t)}
                    className="relative flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: active ? C.brand : C.muted }}>
                    {t === "ALL" ? "All" : STATUS_META[t].label}
                    <span className="text-[11px] tabular-nums px-1.5 rounded-full" style={{ background: active ? C.brandTint : C.lineSoft, color: active ? C.brand : C.muted }}>{counts[t]}</span>
                    {active && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full" style={{ background: C.brand }} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: C.lineSoft }}>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-9 flex-1 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 min-w-0">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, activity, department" aria-label="Search reservations"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
              {search && <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5" /></button>}
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} aria-label="Requestor type"
              className="h-9 text-xs border border-gray-200 rounded-lg px-2.5 bg-white text-gray-700 outline-none focus:border-[#7b1113]">
              <option value="">All requestors</option>
              {(Object.keys(TYPE_LABELS) as RequestorType[]).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
            <div className="flex items-center gap-1 shrink-0">
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} aria-label="Filter by date of activity"
                className="h-9 text-xs border border-gray-200 rounded-lg px-2.5 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
              {dateFilter && (
                <button onClick={() => setDateFilter("")} aria-label="Clear date filter"
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          </div>

          {dateFilter && dayBooked.length > 0 && (
            <div className="px-3 sm:px-5 py-2 border-b text-xs font-medium"
              style={{ borderColor: C.lineSoft, background: "#fffbeb", color: "#92400e" }}>
              {`Already reserved on ${fmtDate(`${dateFilter}T00:00`)}: ` + dayBooked.map(i =>
                `${fmtTime(i.startAt)} – ${fmtTime(i.endAt)} (${i.facilityType ? facilityOf(i) + ", " : ""}${STATUS_META[i.status].label})`).join("; ")}
            </div>
          )}

          {isHead && selectedIds.length > 0 && (
            <div className="px-3 sm:px-5 py-2 border-b flex items-center justify-between gap-2 bg-red-50" style={{ borderColor: C.lineSoft }}>
              <span className="text-xs font-semibold" style={{ color: C.danger }}>{selectedIds.length} selected</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(new Set())} className={ghostBtn}>Clear</button>
                <button onClick={() => setDeleteIds(selectedIds)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 h-8 rounded-lg text-white" style={{ background: C.danger }}>
                  <Trash2 size={13} /> Delete selected
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="animate-pulse divide-y divide-gray-100" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-3 w-32 bg-gray-100 rounded" /><div className="h-3 flex-1 bg-gray-100 rounded" /><div className="h-5 w-16 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={fetchItems} className="text-xs font-bold px-4 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: C.brandTint }}>
                {items.length === 0 ? <CalendarClock className="w-6 h-6" style={{ color: C.brand }} /> : <Inbox className="w-6 h-6" style={{ color: C.brand }} />}
              </div>
              <p className="text-sm font-semibold" style={{ color: C.ink }}>{items.length === 0 ? "No reservations yet" : "No matching reservations"}</p>
              <p className="text-xs max-w-xs" style={{ color: C.muted }}>
                {items.length === 0 ? "Add a reservation when a requestor submits the form and their approved letter." : "Try a different search or status."}
              </p>
              {items.length === 0 && isHead && (
                <button onClick={() => setShowNew(true)} className="mt-2 flex items-center gap-1.5 text-xs font-bold px-4 h-9 rounded-lg text-white" style={{ background: C.brand }}>
                  <Plus size={13} /> New reservation
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse hidden sm:table">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: "#fafafa" }}>
                    {isHead && (
                      <th scope="col" className="w-10 pl-4 py-2.5 border-b" style={{ borderColor: C.line }}>
                        <input type="checkbox" aria-label="Select all on this page" className="w-4 h-4" style={{ accentColor: C.brand }}
                          checked={allPageSelected} onChange={togglePage} />
                      </th>
                    )}
                    {["Requestor", "Activity", "Schedule", "Facility", "Pax", "Status", ""].map((h, i) => (
                      <th key={i} scope="col" className="text-left px-4 py-2.5 whitespace-nowrap border-b" style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(r => (
                    <tr key={r.id} onClick={() => setDetailId(r.id)} tabIndex={0} onKeyDown={e => { if (e.key === "Enter" && e.target === e.currentTarget) setDetailId(r.id); }}
                      className={`group cursor-pointer hover:bg-gray-50 focus:bg-gray-50 outline-none ${selected.has(r.id) ? "bg-red-50/40" : ""}`}>
                      {isHead && (
                        <td className="w-10 pl-4 border-b" style={{ borderColor: C.lineSoft }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" aria-label={`Select ${r.name}`} className="w-4 h-4" style={{ accentColor: C.brand }}
                            checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                        </td>
                      )}
                      <td className="px-4 py-3.5 border-b min-w-[180px]" style={{ borderColor: C.lineSoft }}>
                        <p className="text-[13px] font-semibold" style={{ color: C.ink }}>{r.name}</p>
                        <p className="text-[11px]" style={{ color: C.muted }}>{TYPE_LABELS[r.requestorType]}{r.collegeDept ? ` · ${r.collegeDept}` : ""}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b max-w-[200px]" style={{ color: C.body, borderColor: C.lineSoft }}><span className="line-clamp-1">{r.activityType}</span></td>
                      <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {fmtDate(r.startAt)}<br /><span style={{ color: C.muted }}>{fmtTime(r.startAt)} – {fmtTime(r.endAt)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.body, borderColor: C.lineSoft }}>{facilityOf(r)}</td>
                      <td className="px-4 py-3.5 text-xs tabular-nums border-b" style={{ color: C.body, borderColor: C.lineSoft }}>{r.participantCount}</td>
                      <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }}><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-3.5 w-10 border-b" style={{ borderColor: C.lineSoft }} onClick={e => e.stopPropagation()}>
                        {isHead ? (
                          <button type="button" aria-label={`Actions for ${r.name}`} onClick={e => openMenu(e, r.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                            <MoreVertical size={16} />
                          </button>
                        ) : <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map(r => (
                  <div key={r.id} className="flex items-center gap-1 pl-4 pr-2">
                    {isHead && (
                      <input type="checkbox" aria-label={`Select ${r.name}`} className="w-4 h-4 shrink-0" style={{ accentColor: C.brand }}
                        checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                    )}
                    <button onClick={() => setDetailId(r.id)} className="flex-1 min-w-0 text-left px-3 py-3.5 active:bg-gray-50">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate" style={{ color: C.ink }}>{r.name}</p><StatusBadge status={r.status} />
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: C.muted }}>{r.activityType} · {r.participantCount} pax</p>
                      <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: C.faint }}><Clock size={11} /> {fmtRange(r)}</p>
                    </button>
                    {isHead && (
                      <button type="button" aria-label={`Actions for ${r.name}`} onClick={e => openMenu(e, r.id)}
                        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t bg-white shrink-0 gap-2" style={{ borderColor: C.line }}>
              <span className="text-xs tabular-nums truncate" style={{ color: C.muted }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <span className="text-xs font-semibold px-2 tabular-nums" style={{ color: C.muted }}>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {menu && menuItem && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div role="menu" className="fixed z-50 w-40 bg-white border rounded-xl shadow-lg py-1 overflow-hidden"
            style={{ top: menu.y, left: Math.max(8, menu.x - 160), borderColor: C.line, fontFamily: FONT }}>
            <button role="menuitem" onClick={() => { setDetailId(menuItem.id); setMenu(null); }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">View details</button>
            <button role="menuitem" onClick={() => { setDeleteIds([menuItem.id]); setMenu(null); }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
          </div>
        </>
      )}
      {deleteIds && (
        <ConfirmModal
          title={deleteIds.length === 1 ? "Delete this reservation?" : `Delete ${deleteIds.length} reservations?`}
          confirmLabel="Delete" busy={deleting}
          message={deleteTarget
            ? <><strong>{deleteTarget.name}</strong> — {deleteTarget.activityType}.<br />This can’t be undone.</>
            : <>{deleteIds.length} reservations will be permanently deleted.<br />This can’t be undone.</>}
          onConfirm={doDelete} onClose={() => { if (!deleting) setDeleteIds(null); }} />
      )}
      {showInvite && <InviteModal courseId={courseId} notify={notify} onClose={() => setShowInvite(false)} />}  
      {showNew && (
        <NewReservationModal courseId={courseId} notify={notify} onClose={() => setShowNew(false)}
          onCreated={r => setItems(prev => [r, ...prev])} />
      )}
      <Toast toast={toast} />
    </div>
  );
}