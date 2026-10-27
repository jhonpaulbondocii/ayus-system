"use client";

// src/components/layout/course/CourseBorrowingTab.tsx

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import {
  ScanLine, BookOpen, RefreshCw, Search, CheckCircle2, AlertTriangle, AlertCircle,
  Clock, X, User, Download, ChevronLeft, ChevronRight, ChevronDown, RotateCcw, Plus,
} from "lucide-react";
import { FONT } from "./osaShared";

/* ════════════════════════════════════════════════════════════════════════════
   1. DESIGN TOKENS
   ════════════════════════════════════════════════════════════════════════════ */

const C = {
  brand:     "#7b1113",
  brandTint: "#fdf2f2",
  ink:       "#111827",
  body:      "#374151",
  muted:     "#6b7280",
  faint:     "#9ca3af",
  line:      "#e5e7eb",
  lineSoft:  "#f3f4f6",
  canvas:    "#ffffff",
  danger:    "#b91c1c",
  dangerTint:"#fef2f2",
  ok:        "#15803d",
  okTint:    "#f0fdf4",
  info:      "#1d4ed8",
  infoTint:  "#eff6ff",
} as const;

const PAGE_SIZE = 20;

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white placeholder:text-gray-400";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
const btnPrimary = "flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90";
const btnGhost   = "flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5";

/* ════════════════════════════════════════════════════════════════════════════
   2. TYPES & HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

interface BorrowRecord {
  id:             string;
  bookId:         string;
  borrowerType:   string;
  borrowerNo:     string | null;
  borrowerName:   string;
  borrowerCourse: string | null;
  borrowerDept:   string | null;
  borrowedAt:     string;
  dueDate:        string;
  returnedAt:     string | null;
  status:         string;
  remarks:        string | null;
  book: { title: string; accessionNo: string; callNumber: string | null; category: string };
}

interface ScannedBook {
  id:              string;
  accessionNo:     string;
  title:           string;
  author:          string | null;
  callNumber:      string | null;
  category:        string;
  availableCopies: number;
  totalCopies:     number;
  currentBorrow: {
    id: string; borrowerName: string; borrowerNo: string | null; dueDate: string; status: string;
  } | null;
}

type TabMode      = "BORROW" | "RETURN" | "RECORDS";
type StatusFilter = "" | "BORROWED" | "OVERDUE" | "RETURNED";
type ToastState   = { msg: string; tone: "success" | "error" } | null;

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dueIn = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return toLocalISO(d); };

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const daysOverdue = (dueDate: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000));

const plural = (n: number, w: string) => `${n} ${w}${n !== 1 ? "s" : ""}`;

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Kinukuha ang scanner keystrokes kahit walang naka-focus na field. */
function useScannerCapture(
  enabled: boolean,
  onChar: (buf: string) => void,
  onSubmit: (buf: string) => void,
) {
  const buf = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbs = useRef({ onChar, onSubmit });
  cbs.current = { onChar, onSubmit };

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") {
        const v = buf.current.trim();
        buf.current = "";
        if (v) { e.preventDefault(); cbs.current.onSubmit(v); }
        return;
      }
      if (e.key.length !== 1) return;
      buf.current += e.key;
      cbs.current.onChar(buf.current);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { buf.current = ""; }, 1500);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled]);
}

/* ════════════════════════════════════════════════════════════════════════════
   3. UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════ */

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const isErr = toast.tone === "error";
  return (
    <div role="status"
      className="fixed left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold text-white"
      style={{ background: isErr ? C.danger : C.ink, bottom: "calc(24px + env(safe-area-inset-bottom))", fontFamily: FONT }}>
      {isErr ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      {toast.msg}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = ({
    BORROWED: { bg: C.infoTint,   fg: C.info,   label: "Borrowed" },
    RETURNED: { bg: C.okTint,     fg: C.ok,     label: "Returned" },
    OVERDUE:  { bg: C.dangerTint, fg: C.danger, label: "Overdue"  },
  } as Record<string, { bg: string; fg: string; label: string }>)[status]
    ?? { bg: C.lineSoft, fg: C.muted, label: status };
  return (
    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function PillGroup<T extends string>({
  options, value, onChange,
}: { options: Array<[T, string]>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([val, label]) => {
        const active = value === val;
        return (
          <button key={val} type="button" onClick={() => onChange(val)} aria-pressed={active}
            className="px-3 h-8 rounded-full border text-[11px] font-semibold transition-colors"
            style={active ? { background: C.brand, color: "#fff", borderColor: C.brand } : { background: "#fff", color: C.body, borderColor: C.line }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function Banner({ tone, children }: { tone: "error" | "warn" | "ok"; children: ReactNode }) {
  const t = {
    error: { fg: C.danger, bg: C.dangerTint, bd: "#fecaca", icon: <AlertCircle size={13} className="shrink-0" /> },
    warn:  { fg: C.danger, bg: C.dangerTint, bd: "#fecaca", icon: <AlertTriangle size={13} className="shrink-0" /> },
    ok:    { fg: C.ok,     bg: C.okTint,     bd: "#bbf7d0", icon: <CheckCircle2 size={13} className="shrink-0" /> },
  }[tone];
  return (
    <div role={tone === "ok" ? "status" : "alert"} className="flex items-center gap-2 text-xs font-semibold rounded-lg border px-3 py-2"
      style={{ color: t.fg, background: t.bg, borderColor: t.bd }}>
      {t.icon}<span className="min-w-0">{children}</span>
    </div>
  );
}

function DetailList({ rows }: { rows: Array<[string, string | null | undefined]> }) {
  const visible = rows.filter(([, v]) => v);
  return (
    <dl className="rounded-xl border divide-y bg-white" style={{ borderColor: C.line }}>
      {visible.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between px-3.5 py-2.5 gap-3" style={{ borderColor: C.lineSoft }}>
          <dt className="text-xs shrink-0" style={{ color: C.muted }}>{label}</dt>
          <dd className="text-xs font-semibold text-right truncate max-w-[65%]" style={{ color: C.ink }}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StepCard({
  icon, title, subtitle, children,
}: { icon: ReactNode; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-4 sm:p-6 space-y-4 shadow-sm" style={{ borderColor: C.line }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.brandTint, color: C.brand }}>{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: C.ink }}>{title}</p>
          {subtitle && <p className="text-xs" style={{ color: C.muted }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 mb-4" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current, active = i === current;
        return (
          <li key={label} className="flex items-center gap-2 flex-1 last:flex-none" aria-current={active ? "step" : undefined}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={done || active ? { background: C.brand, color: "#fff" } : { background: C.lineSoft, color: C.muted }}>
              {done ? <Check2 /> : i + 1}
            </span>
            <span className="text-xs font-semibold hidden sm:inline" style={{ color: active ? C.ink : C.muted }}>{label}</span>
            {i < steps.length - 1 && <span className="flex-1 h-px" style={{ background: done ? C.brand : C.line }} />}
          </li>
        );
      })}
    </ol>
  );
}
const Check2 = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

function ScanInput({
  inputRef, value, onChange, onSubmit, disabled, placeholder,
}: {
  inputRef?: RefObject<HTMLInputElement | null>; value: string; onChange: (v: string) => void;
  onSubmit: () => void; disabled?: boolean; placeholder: string;
}) {
  return (
    <div className="relative">
      <ScanLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.brand }} />
      <input ref={inputRef} value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
        placeholder={placeholder} aria-label={placeholder} readOnly={disabled}
        className="w-full pl-9 pr-3 h-11 text-sm border-2 rounded-xl outline-none font-mono bg-white placeholder:text-gray-400 placeholder:font-sans"
        style={{ borderColor: C.brand }} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   4. BORROW PANEL
   ════════════════════════════════════════════════════════════════════════════ */

type BorrowStep = "BOOK" | "CONFIRM_BOOK" | "BORROWER" | "CONFIRM" | "DONE";

function BorrowPanel({
  courseId, onChanged, notify,
}: { courseId: string; onChanged: () => void; notify: (m: string, t?: "success" | "error") => void }) {
  const [step,        setStep]        = useState<BorrowStep>("BOOK");
  const [bookScan,    setBookScan]    = useState("");
  const [scannedBook, setScannedBook] = useState<ScannedBook | null>(null);
  const [bookError,   setBookError]   = useState("");
  const [scanning,    setScanning]    = useState(false);

  const [borrowerScan,   setBorrowerScan]   = useState("");
  const [borrowerNo,     setBorrowerNo]     = useState("");
  const [borrowerName,   setBorrowerName]   = useState("");
  const [borrowerType,   setBorrowerType]   = useState("STUDENT");
  const [borrowerCourse, setBorrowerCourse] = useState("");
  const [borrowerDept,   setBorrowerDept]   = useState("");
  const [borrowerId,     setBorrowerId]     = useState<string | null>(null);
  const [borrowerFound,  setBorrowerFound]  = useState(false);
  const [borrowerError,  setBorrowerError]  = useState("");
  const [lookupNote,     setLookupNote]     = useState("");
  const [lookingUp,      setLookingUp]      = useState(false);

  const [dueDate,   setDueDate]   = useState(() => dueIn(7));
  const [remarks,   setRemarks]   = useState("");
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState("");

  const bookRef     = useRef<HTMLInputElement>(null);
  const borrowerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "BOOK")     { const t = setTimeout(() => bookRef.current?.focus(), 100);     return () => clearTimeout(t); }
    if (step === "BORROWER") { const t = setTimeout(() => borrowerRef.current?.focus(), 100); return () => clearTimeout(t); }
  }, [step]);

  const reset = () => {
    setStep("BOOK"); setScannedBook(null); setBookScan(""); setBookError("");
    setBorrowerScan(""); setBorrowerName(""); setBorrowerNo(""); setBorrowerId(null); setBorrowerType("STUDENT");
    setBorrowerFound(false); setBorrowerError(""); setLookupNote(""); setBorrowerCourse(""); setBorrowerDept("");
    setRemarks(""); setSaveError(""); setDueDate(dueIn(7));
  };

  const scanBook = async (override?: string) => {
    const accNo = (override ?? bookScan).trim();
    if (!accNo) return;
    setScanning(true); setBookError("");
    try {
      const res  = await fetch(`/api/courses/${courseId}/library-books/scan?accessionNo=${encodeURIComponent(accNo)}`);
      const data = await res.json();
      if (!data.found)                  { setBookError(`No book with accession no. “${accNo}” in the catalog.`); setBookScan(""); return; }
      if (data.book.availableCopies < 1) { setBookError(`“${data.book.title}” has no available copies.`); setBookScan(""); return; }
      setScannedBook(data.book); setBookScan(""); setStep("CONFIRM_BOOK");
    } catch { setBookError("Couldn’t look up the book. Please try again."); }
    finally  { setScanning(false); }
  };

  const lookupBorrower = async (override?: string) => {
    const no = (override ?? borrowerScan).trim();
    if (!no) return;
    setLookingUp(true); setBorrowerError(""); setLookupNote(""); setBorrowerFound(false);
    try {
      const res  = await fetch(`/api/courses/${courseId}/library-borrow/lookup?no=${encodeURIComponent(no)}`);
      const data = await res.json();
      if (data.found) {
        setBorrowerName(data.borrowerName ?? "");
        setBorrowerNo(data.borrowerNo ?? no);
        setBorrowerId(data.borrowerId ?? null);
        setBorrowerType(data.borrowerType ?? "STUDENT");
        setBorrowerCourse(data.borrowerCourse ?? "");
        setBorrowerDept(data.borrowerDept ?? "");
        setBorrowerFound(true);
      } else {
        setBorrowerId(null); setBorrowerNo(no); setBorrowerName(""); setBorrowerCourse(""); setBorrowerDept("");
        setLookupNote(`No match for “${no}”. Enter the details below.`);
      }
      setBorrowerScan("");
    } catch { setBorrowerError("Couldn’t look up the ID. Enter the details manually."); }
    finally  { setLookingUp(false); }
  };

  useScannerCapture(
    step === "BOOK" || step === "BORROWER",
    buf => (step === "BOOK" ? setBookScan(buf) : setBorrowerScan(buf)),
    buf => (step === "BOOK" ? scanBook(buf) : lookupBorrower(buf)),
  );

  const goConfirm = () => {
    if (!borrowerName.trim()) { setBorrowerError("Enter the borrower’s full name."); return; }
    setBorrowerError(""); setSaveError(""); setStep("CONFIRM");
  };

  const handleBorrow = async () => {
    if (!scannedBook) return;
    if (!dueDate)                      { setSaveError("Choose a due date."); return; }
    if (dueDate < toLocalISO(new Date())) { setSaveError("The due date can’t be in the past."); return; }
    setSaving(true); setSaveError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/library-borrow`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: scannedBook.id, borrowerType, borrowerId,
          borrowerNo:     borrowerNo || null,
          borrowerName:   borrowerName.trim(),
          borrowerCourse: borrowerType === "STUDENT"  ? borrowerCourse || null : null,
          borrowerDept:   borrowerType === "EMPLOYEE" ? borrowerDept   || null : null,
          dueDate, remarks: remarks || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Couldn’t record the borrowing."); return; }
      onChanged(); notify("Book borrowed"); setStep("DONE");
    } catch { setSaveError("Network error. Please try again."); }
    finally  { setSaving(false); }
  };

  const stepIndex = ({ BOOK: 0, CONFIRM_BOOK: 0, BORROWER: 1, CONFIRM: 2, DONE: 3 } as const)[step];
  const duePreset = (["3", "7", "14"] as const).find(n => dueIn(Number(n)) === dueDate) ?? "";
  const today = toLocalISO(new Date());

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">
      <div className="max-w-lg mx-auto w-full">

        {step !== "DONE" && (
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0"><StepIndicator steps={["Scan book", "Borrower", "Confirm"]} current={stepIndex} /></div>
            {step !== "BOOK" && (
              <button onClick={reset} aria-label="Start over" title="Start over"
                className="w-7 h-7 -mt-1 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0">
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* 1 · Scan book */}
        {step === "BOOK" && (
          <StepCard icon={<ScanLine size={18} />} title="Scan book barcode" subtitle="Scan or type the accession number">
            <ScanInput inputRef={bookRef} value={bookScan} onChange={setBookScan} onSubmit={scanBook}
              disabled={scanning} placeholder="Accession no., then Enter" />
            {bookError && <Banner tone="error">{bookError}</Banner>}
            <button onClick={() => scanBook()} disabled={scanning || !bookScan.trim()}className={`${btnPrimary} w-full`} style={{ background: C.brand }}>
              {scanning ? <><RefreshCw size={13} className="animate-spin" /> Looking up…</> : "Find book"}
            </button>
          </StepCard>
        )}

        {/* 1b · Confirm book */}
        {step === "CONFIRM_BOOK" && scannedBook && (
          <StepCard icon={<BookOpen size={18} />} title="Is this the right book?" subtitle="Check the details before continuing">
            <div>
              <p className="text-sm font-bold leading-snug" style={{ color: C.ink }}>{scannedBook.title}</p>
              {scannedBook.author && <p className="text-xs mt-0.5" style={{ color: C.muted }}>{scannedBook.author.split("|").map(s => s.trim()).filter(Boolean).join(", ")}</p>}
            </div>
            <DetailList rows={[
              ["Accession no.", scannedBook.accessionNo],
              ["Call no.",      scannedBook.callNumber],
              ["Category",      scannedBook.category],
              ["Available",     `${scannedBook.availableCopies} of ${scannedBook.totalCopies} copies`],
            ]} />
            <div className="flex gap-2">
              <button onClick={() => { setScannedBook(null); setStep("BOOK"); }} className={btnGhost}>
                <ChevronLeft size={13} /> Wrong book
              </button>
              <button onClick={() => setStep("BORROWER")} className={btnPrimary} style={{ background: C.brand }}>
                Yes, continue <ChevronRight size={13} />
              </button>
            </div>
          </StepCard>
        )}

        {/* 2 · Borrower */}
        {step === "BORROWER" && scannedBook && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ background: C.okTint, borderColor: "#bbf7d0" }}>
              <CheckCircle2 size={15} className="shrink-0" style={{ color: C.ok }} />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: C.ink }}>{scannedBook.title}</p>
                <p className="text-[11px]" style={{ color: C.muted }}>{scannedBook.accessionNo}</p>
              </div>
            </div>

            <StepCard icon={<User size={18} />} title="Borrower" subtitle="Scan an ID or enter the details">
              <Field label="Library card or student ID">
                <div className="flex gap-2">
                  <div className="relative flex-1 min-w-0">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input ref={borrowerRef} value={borrowerScan} onChange={e => setBorrowerScan(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") lookupBorrower(); }}
                      placeholder="ID number, then Enter" className={`${inputCls} pl-8 font-mono placeholder:font-sans`} />
                    {lookingUp && <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                  </div>
                  <button onClick={() => lookupBorrower()} disabled={lookingUp || !borrowerScan.trim()}
                    className="px-4 h-10 sm:h-9 rounded-lg text-xs font-bold text-white disabled:opacity-50 shrink-0" style={{ background: C.brand }}>
                    Look up
                  </button>
                </div>
              </Field>

              {borrowerFound && <Banner tone="ok">Found {borrowerName}</Banner>}
              {lookupNote && <p className="text-xs" style={{ color: C.muted }}>{lookupNote}</p>}

              <div className="flex items-center gap-3">
                <span className="flex-1 h-px" style={{ background: C.line }} />
                <span className="text-xs" style={{ color: C.faint }}>or enter manually</span>
                <span className="flex-1 h-px" style={{ background: C.line }} />
              </div>

              <Field label="Borrower type">
                <PillGroup<string> options={[["STUDENT", "Student"], ["EMPLOYEE", "Employee"]]} value={borrowerType} onChange={setBorrowerType} />
              </Field>

              <Field label={borrowerType === "STUDENT" ? "Student no." : "Employee no."}>
                <input value={borrowerNo} onChange={e => setBorrowerNo(e.target.value)} placeholder="ID number" className={inputCls} />
              </Field>
              <Field label="Full name" required>
                <input value={borrowerName} onChange={e => { setBorrowerName(e.target.value); setBorrowerError(""); }}
                  placeholder="Borrower’s full name" className={inputCls} />
              </Field>
              {borrowerType === "STUDENT" ? (
                <Field label="Course, year and section">
                  <input value={borrowerCourse} onChange={e => setBorrowerCourse(e.target.value)} placeholder="e.g. BSIT 2-A" className={inputCls} />
                </Field>
              ) : (
                <Field label="College or department">
                  <input value={borrowerDept} onChange={e => setBorrowerDept(e.target.value)} placeholder="e.g. College of Engineering" className={inputCls} />
                </Field>
              )}

              {borrowerError && <Banner tone="error">{borrowerError}</Banner>}

              <div className="flex gap-2">
                <button onClick={() => setStep("CONFIRM_BOOK")} className={btnGhost}><ChevronLeft size={13} /> Back</button>
                <button onClick={goConfirm} className={btnPrimary} style={{ background: C.brand }}>Next <ChevronRight size={13} /></button>
              </div>
            </StepCard>
          </div>
        )}

        {/* 3 · Confirm */}
        {step === "CONFIRM" && scannedBook && (
          <StepCard icon={<CheckCircle2 size={18} />} title="Confirm borrowing" subtitle="Set the due date and review">
            <DetailList rows={[
              ["Book",          scannedBook.title],
              ["Accession no.", scannedBook.accessionNo],
              ["Borrower",      borrowerName],
              [borrowerType === "STUDENT" ? "Student no." : "Employee no.", borrowerNo],
              [borrowerType === "STUDENT" ? "Course" : "Department", borrowerType === "STUDENT" ? borrowerCourse : borrowerDept],
            ]} />

            <Field label="Due date" required>
              <div className="space-y-2">
                <PillGroup<string> options={[["3", "3 days"], ["7", "1 week"], ["14", "2 weeks"]]} value={duePreset}
                  onChange={n => setDueDate(dueIn(Number(n)))} />
                <input type="date" value={dueDate} min={today} onChange={e => setDueDate(e.target.value)} className={inputCls} />
              </div>
            </Field>

            <Field label="Remarks">
              <input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional" className={inputCls} />
            </Field>

            {saveError && <Banner tone="error">{saveError}</Banner>}

            <div className="flex gap-2">
              <button onClick={() => setStep("BORROWER")} className={btnGhost}><ChevronLeft size={13} /> Back</button>
              <button onClick={handleBorrow} disabled={saving} className={btnPrimary} style={{ background: C.brand }}>
                {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : "Confirm borrow"}
              </button>
            </div>
          </StepCard>
        )}

        {/* Done */}
        {step === "DONE" && scannedBook && (
          <div className="bg-white rounded-xl border p-5 sm:p-6 space-y-4 shadow-sm text-center" style={{ borderColor: C.line }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: C.okTint }}>
              <CheckCircle2 size={24} style={{ color: C.ok }} />
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: C.ink }}>Book borrowed</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>The borrowing has been recorded.</p>
            </div>
            <div className="text-left">
              <DetailList rows={[
                ["Book",     scannedBook.title],
                ["Borrower", borrowerName],
                ["Due",      fmtDate(dueDate + "T00:00:00")],
              ]} />
            </div>
            <button onClick={reset} className={`${btnPrimary} w-full`} style={{ background: C.brand }}>
              <Plus size={13} /> Borrow another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   5. RETURN PANEL
   ════════════════════════════════════════════════════════════════════════════ */

function ReturnPanel({
  courseId, onChanged, notify,
}: { courseId: string; onChanged: () => void; notify: (m: string, t?: "success" | "error") => void }) {
  const [scanInput, setScanInput] = useState("");
  const [scanned,   setScanned]   = useState<ScannedBook | null>(null);
  const [error,     setError]     = useState("");
  const [scanning,  setScanning]  = useState(false);
  const [returning, setReturning] = useState(false);
  const [done,      setDone]      = useState<{ title: string; lateDays: number } | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const focusScan = () => setTimeout(() => scanRef.current?.focus(), 100);
  useEffect(() => { const t = focusScan(); return () => clearTimeout(t); }, []);

  useScannerCapture(!done, setScanInput, buf => scanBook(buf));

  const scanBook = async (override?: string) => {
    const accNo = (override ?? scanInput).trim();
    if (!accNo) return;
    setScanning(true); setError(""); setScanned(null);
    try {
      const res  = await fetch(`/api/courses/${courseId}/library-books/scan?accessionNo=${encodeURIComponent(accNo)}`);
      const data = await res.json();
      if (!data.found)              { setError(`No book with accession no. “${accNo}” in the catalog.`); setScanInput(""); return; }
      if (!data.book.currentBorrow) { setError(`“${data.book.title}” isn’t currently borrowed.`); setScanInput(""); return; }
      setScanned(data.book); setScanInput("");
    } catch { setError("Couldn’t look up the book. Please try again."); }
    finally  { setScanning(false); }
  };

  const handleReturn = async () => {
    if (!scanned?.currentBorrow) return;
    setReturning(true); setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/library-borrow/${scanned.currentBorrow.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "return" }),
      });
      if (!res.ok) { setError("Couldn’t record the return. Please try again."); return; }
      setDone({ title: scanned.title, lateDays: daysOverdue(scanned.currentBorrow.dueDate) });
      setScanned(null);
      onChanged(); notify("Book returned");
    } catch { setError("Network error. Please try again."); }
    finally  { setReturning(false); }
  };

  const reset = () => { setScanned(null); setScanInput(""); setError(""); setDone(null); focusScan(); };
  const late = scanned?.currentBorrow ? daysOverdue(scanned.currentBorrow.dueDate) : 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">
      <div className="max-w-lg mx-auto w-full">
        {done ? (
          <div className="bg-white rounded-xl border p-5 sm:p-6 space-y-4 shadow-sm text-center" style={{ borderColor: C.line }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: C.okTint }}>
              <CheckCircle2 size={24} style={{ color: C.ok }} />
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: C.ink }}>Book returned</p>
              <p className="text-sm mt-0.5" style={{ color: C.muted }}>
                <span className="font-semibold" style={{ color: C.body }}>{done.title}</span> is back in the library.
              </p>
            </div>
            {done.lateDays > 0 && <Banner tone="warn">Returned {plural(done.lateDays, "day")} late</Banner>}
            <button onClick={reset} className={`${btnPrimary} w-full`} style={{ background: C.brand }}>
              <RotateCcw size={13} /> Return another
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <StepCard icon={<ScanLine size={18} />} title="Scan book to return" subtitle="Scan the barcode of the returned book">
              <ScanInput inputRef={scanRef} value={scanInput} onChange={setScanInput} onSubmit={scanBook}
                disabled={scanning} placeholder="Accession no., then Enter" />
              {error && <Banner tone="error">{error}</Banner>}
              <button onClick={() => scanBook()} disabled={scanning || !scanInput.trim()} className={`${btnPrimary} w-full`} style={{ background: C.brand }}>
                {scanning ? <><RefreshCw size={13} className="animate-spin" /> Looking up…</> : "Find book"}
              </button>
            </StepCard>

            {scanned?.currentBorrow && (
              <StepCard icon={<BookOpen size={18} />} title="Return details" subtitle={scanned.accessionNo}>
                <p className="text-sm font-bold leading-snug" style={{ color: C.ink }}>{scanned.title}</p>
                <DetailList rows={[
                  ["Borrower", scanned.currentBorrow.borrowerName],
                  ["ID no.",   scanned.currentBorrow.borrowerNo],
                  ["Category", scanned.category],
                  ["Due date", fmtDate(scanned.currentBorrow.dueDate)],
                ]} />
                {late > 0 && <Banner tone="warn">Overdue by {plural(late, "day")}</Banner>}
                <div className="flex gap-2">
                  <button onClick={reset} className={btnGhost}>Cancel</button>
                  <button onClick={handleReturn} disabled={returning} className={btnPrimary} style={{ background: C.brand }}>
                    {returning ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : "Confirm return"}
                  </button>
                </div>
              </StepCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   6. RECORDS PANEL
   ════════════════════════════════════════════════════════════════════════════ */

function RecordsPanel({
  records, loading, error, onReload,
}: { records: BorrowRecord[]; loading: boolean; error: string; onReload: () => void }) {
  const [status,     setStatus]     = useState<StatusFilter>("");
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const debounced = useDebounced(search, 300);

  const searched = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r =>
      r.borrowerName.toLowerCase().includes(q) ||
      (r.borrowerNo ?? "").toLowerCase().includes(q) ||
      r.book.title.toLowerCase().includes(q) ||
      r.book.accessionNo.toLowerCase().includes(q));
  }, [records, debounced]);

  const counts = useMemo(() => {
    const c = { "": searched.length, BORROWED: 0, OVERDUE: 0, RETURNED: 0 } as Record<string, number>;
    searched.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [searched]);

  const filtered   = useMemo(() => (status ? searched.filter(r => r.status === status) : searched), [searched, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  useEffect(() => { setPage(1); }, [debounced, status]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) =>
    totalPages <= 5 || page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i);

  const exportCSV = () => {
    const header = ["Borrower", "ID No.", "Type", "Book Title", "Accession No.", "Category", "Borrowed At", "Due Date", "Returned At", "Status"];
    const rows = filtered.map(r => [
      r.borrowerName, r.borrowerNo ?? "", r.borrowerType, r.book.title, r.book.accessionNo, r.book.category,
      fmtDateTime(r.borrowedAt), fmtDate(r.dueDate), r.returnedAt ? fmtDateTime(r.returnedAt) : "", r.status,
    ]);
    const csv  = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `borrow-records-${toLocalISO(new Date())}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: Array<[StatusFilter, string]> = [["", "All"], ["BORROWED", "Borrowed"], ["OVERDUE", "Overdue"], ["RETURNED", "Returned"]];
  const hasFilter = !!(debounced || status);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col min-h-0">
      <div className="flex-1 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[420px]" style={{ borderColor: C.line }}>

        {/* Status tabs */}
        <div className="border-b overflow-x-auto" style={{ borderColor: C.line }}>
          <div role="tablist" className="flex px-2 sm:px-3 min-w-max">
            {tabs.map(([val, label]) => {
              const active = status === val;
              return (
                <button key={val || "all"} role="tab" aria-selected={active} onClick={() => setStatus(val)}
                  className="relative flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors"
                  style={{ color: active ? C.brand : C.muted }}>
                  {label}
                  <span className="text-[11px] tabular-nums px-1.5 rounded-full"
                    style={{ background: active ? C.brandTint : C.lineSoft, color: active ? C.brand : C.muted }}>
                    {counts[val] ?? 0}
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search borrower, ID, book, accession no."
              aria-label="Search records"
              className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-300 hover:text-gray-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
          <button onClick={exportCSV} disabled={filtered.length === 0} aria-label="Export CSV"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 w-9 h-9 sm:w-auto sm:px-3 rounded-lg transition-colors disabled:opacity-40 shrink-0">
            <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={onReload} aria-label="Refresh records"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors shrink-0">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Content */}
        {loading && records.length === 0 ? (
          <div className="animate-pulse divide-y divide-gray-100" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-3 flex-1 bg-gray-100 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded hidden sm:block" />
                <div className="h-5 w-16 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button onClick={onReload} className="text-xs font-bold px-4 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: C.brandTint }}>
              <Clock className="w-6 h-6" style={{ color: C.brand }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: C.ink }}>{hasFilter ? "No matching records" : "No borrow records yet"}</p>
            <p className="text-xs max-w-xs" style={{ color: C.muted }}>
              {hasFilter ? "Try a different search or status." : "Borrowed books will appear here."}
            </p>
            {hasFilter && (
              <button onClick={() => { setSearch(""); setStatus(""); }} className="mt-2 text-xs font-bold hover:underline" style={{ color: C.brand }}>Clear all filters</button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Desktop table */}
            <table className="w-full border-collapse hidden sm:table">
              <thead className="sticky top-0 z-10">
                <tr style={{ background: "#fafafa" }}>
                  {["Book", "Borrower", "ID no.", "Borrowed", "Due", "Returned", "Status"].map(h => (
                    <th key={h} scope="col" className="text-left px-4 py-2.5 whitespace-nowrap border-b"
                      style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(r => {
                  const od = r.status !== "RETURNED" ? daysOverdue(r.dueDate) : 0;
                  const sub = r.borrowerCourse ?? r.borrowerDept;
                  return (
                    <tr key={r.id} style={r.status === "OVERDUE" ? { background: "#fffafa" } : undefined}>
                      <td className="px-4 py-3.5 border-b max-w-[260px]" style={{ borderColor: C.lineSoft }}>
                        <p className="text-[13px] font-semibold truncate" style={{ color: C.ink }}>{r.book.title}</p>
                        <p className="text-[11px] font-mono" style={{ color: C.faint }}>{r.book.accessionNo}</p>
                      </td>
                      <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }}>
                        <p className="text-xs font-semibold" style={{ color: C.ink }}>{r.borrowerName}</p>
                        {sub && <p className="text-[11px]" style={{ color: C.faint }}>{sub}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono border-b whitespace-nowrap" style={{ color: C.muted, borderColor: C.lineSoft }}>{r.borrowerNo ?? "—"}</td>
                      <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.muted, borderColor: C.lineSoft }}>{fmtDateTime(r.borrowedAt)}</td>
                      <td className="px-4 py-3.5 border-b whitespace-nowrap" style={{ borderColor: C.lineSoft }}>
                        <p className="text-xs font-semibold" style={{ color: od > 0 ? C.danger : C.muted }}>{fmtDate(r.dueDate)}</p>
                        {od > 0 && <p className="text-[11px]" style={{ color: C.danger }}>{od}d overdue</p>}
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.muted, borderColor: C.lineSoft }}>
                        {r.returnedAt ? fmtDateTime(r.returnedAt) : "—"}
                      </td>
                      <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }}><StatusBadge status={r.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile list */}
            <div className="sm:hidden divide-y divide-gray-100">
              {paginated.map(r => {
                const od = r.status !== "RETURNED" ? daysOverdue(r.dueDate) : 0;
                const expanded = expandedId === r.id;
                return (
                  <div key={r.id} style={r.status === "OVERDUE" ? { background: "#fffafa" } : undefined}>
                    <button onClick={() => setExpandedId(expanded ? null : r.id)} aria-expanded={expanded}
                      className="w-full text-left px-4 py-3.5 flex items-start gap-3 active:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: C.ink }}>{r.book.title}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: C.body }}>
                          {r.borrowerName}{r.borrowerNo && <span className="font-mono" style={{ color: C.faint }}> · {r.borrowerNo}</span>}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: od > 0 ? C.danger : C.muted }}>
                          Due {fmtDate(r.dueDate)}{od > 0 && ` · ${od}d overdue`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatusBadge status={r.status} />
                        <ChevronDown size={14} className={`text-gray-300 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-4 pb-3.5">
                        <DetailList rows={[
                          ["Accession no.", r.book.accessionNo],
                          ["Category",      r.book.category],
                          ["Borrower type", r.borrowerType === "EMPLOYEE" ? "Employee" : "Student"],
                          ["Course / dept", r.borrowerCourse ?? r.borrowerDept],
                          ["Borrowed",      fmtDateTime(r.borrowedAt)],
                          ["Returned",      r.returnedAt ? fmtDateTime(r.returnedAt) : null],
                          ["Remarks",       r.remarks],
                        ]} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {!error && filtered.length > PAGE_SIZE && (
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
              <span className="sm:hidden text-xs font-semibold px-2 tabular-nums" style={{ color: C.muted }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   7. MAIN TAB
   ════════════════════════════════════════════════════════════════════════════ */

export default function CourseBorrowingTab({ courseId }: { courseId: string; isHead?: boolean }) {
  const [tab,     setTab]     = useState<TabMode>("BORROW");
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [toast,   setToast]   = useState<ToastState>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* Records are loaded once here so the header subtitle and the Records tab
     share the same data; status filtering and search happen locally. */
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`/api/courses/${courseId}/library-borrow`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load records.");
      setRecords(data.records ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load records.");
    } finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const out     = records.filter(r => r.status === "BORROWED" || r.status === "OVERDUE").length;
  const overdue = records.filter(r => r.status === "OVERDUE").length;

  const tabs: Array<[TabMode, string, React.ElementType]> = [
    ["BORROW",  "Borrow",  ScanLine],
    ["RETURN",  "Return",  CheckCircle2],
    ["RECORDS", "Records", Clock],
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: C.canvas }}>

      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-8 pt-3.5 sm:pt-5 shrink-0" style={{ borderColor: C.line }}>
        <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Book borrowing</h1>
        <p className="text-xs mt-0.5 mb-2 sm:mb-3" style={{ color: C.faint }}>
          {loading && records.length === 0
            ? "Loading…"
            : <>{out} currently borrowed{overdue > 0 && <> · <span style={{ color: C.danger }}>{overdue} overdue</span></>}</>}
        </p>

        <div role="tablist" className="flex -mb-px">
          {tabs.map(([val, label, Icon]) => {
            const active = tab === val;
            return (
              <button key={val} role="tab" aria-selected={active} onClick={() => setTab(val)}
                className="relative flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors"
                style={{ color: active ? C.brand : C.muted }}>
                <Icon size={13} className="shrink-0" />
                {label}
                {val === "RECORDS" && records.length > 0 && (
                  <span className="text-[11px] tabular-nums px-1.5 rounded-full"
                    style={{ background: active ? C.brandTint : C.lineSoft, color: active ? C.brand : C.muted }}>
                    {records.length}
                  </span>
                )}
                {active && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full" style={{ background: C.brand }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {tab === "BORROW"  && <BorrowPanel  courseId={courseId} onChanged={load} notify={notify} />}
      {tab === "RETURN"  && <ReturnPanel  courseId={courseId} onChanged={load} notify={notify} />}
      {tab === "RECORDS" && <RecordsPanel records={records} loading={loading} error={error} onReload={load} />}

      <Toast toast={toast} />
    </div>
  );
}