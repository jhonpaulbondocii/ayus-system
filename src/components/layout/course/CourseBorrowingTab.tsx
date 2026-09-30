"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ScanLine, BookOpen, RefreshCw, Search,
  CheckCircle2, AlertTriangle, Clock, X,
  User, BookMarked, Download,
} from "lucide-react";

const MAROON = "#7b1113";
const SLATE  = "#0f172a";
const MUTED  = "#64748b";
const RULE   = "#e2e8f0";
const FONT   = "'Inter', system-ui, sans-serif";

const inputCls =
  "w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-all bg-white" +
  " focus:ring-2 focus:ring-[#7b1113]/10 focus:border-[#7b1113] placeholder:text-gray-400";

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
  book: {
    title:       string;
    accessionNo: string;
    callNumber:  string | null;
    category:    string;
  };
}

interface ScannedBook {
  id:             string;
  accessionNo:    string;
  title:          string;
  author:         string | null;
  callNumber:     string | null;
  category:       string;
  availableCopies:number;
  totalCopies:    number;
  currentBorrow:  {
    id:           string;
    borrowerName: string;
    borrowerNo:   string | null;
    dueDate:      string;
    status:       string;
  } | null;
}

type TabMode = "BORROW" | "RETURN" | "RECORDS";

function StatusBadge({ status }: { status: string }) {
  const s = {
    BORROWED: { bg: "#dbeafe", text: "#1e40af", label: "Borrowed" },
    RETURNED: { bg: "#dcfce7", text: "#14532d", label: "Returned" },
    OVERDUE:  { bg: "#fee2e2", text: "#991b1b", label: "Overdue"  },
  }[status] ?? { bg: "#f1f5f9", text: MUTED, label: status };

  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function daysOverdue(dueDate: string) {
  return Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
}

/* ── Step Indicator ── */
function StepIndicator({
  steps, current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {steps.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-1 flex-1 last:flex-none">
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                style={
                  done   ? { background: "#dcfce7", color: "#16a34a" } :
                  active ? { background: MAROON, color: "#fff" } :
                           { background: "#f1f5f9", color: MUTED }
                }>
                {done ? <CheckCircle2 size={12} /> : i + 1}
              </div>
              <span
                className="text-[11px] font-bold hidden sm:inline"
                style={{ color: active ? SLATE : MUTED }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px mx-1" style={{ background: done ? "#86efac" : RULE }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Info Grid ── */
function InfoGrid({ rows }: { rows: [string, string | null | undefined][] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {rows.filter(([, v]) => v).map(([label, val]) => (
        <div key={label}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED }}>{label}</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: SLATE, marginTop: 2 }}>{val}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Borrow Panel ── */
function BorrowPanel({ courseId, onBorrowed }: { courseId: string; onBorrowed: () => void }) {
  type Step = "BOOK" | "CONFIRM_BOOK" | "BORROWER" | "CONFIRM";
  const [step,        setStep]        = useState<Step>("BOOK");
  const [bookScan,    setBookScan]    = useState("");
  const [scannedBook, setScannedBook] = useState<ScannedBook | null>(null);
  const [bookError,   setBookError]   = useState("");
  const [scanning,    setScanning]    = useState(false);

  const [borrowerScan,    setBorrowerScan]    = useState("");
  const [borrowerNo,      setBorrowerNo]      = useState("");
  const [borrowerName,    setBorrowerName]    = useState("");
  const [borrowerType,    setBorrowerType]    = useState("STUDENT");
  const [borrowerCourse,  setBorrowerCourse]  = useState("");
  const [borrowerDept,    setBorrowerDept]    = useState("");
  const [borrowerId,      setBorrowerId]      = useState<string | null>(null);
  const [borrowerFound,   setBorrowerFound]   = useState(false);
  const [borrowerError,   setBorrowerError]   = useState("");
  const [lookingUp,       setLookingUp]       = useState(false);

  const [dueDate,   setDueDate]   = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [remarks,   setRemarks]   = useState("");
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState("");

  const bookRef     = useRef<HTMLInputElement>(null);
  const borrowerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "BOOK")     setTimeout(() => bookRef.current?.focus(), 100);
    if (step === "BORROWER") setTimeout(() => borrowerRef.current?.focus(), 100);
  }, [step]);

  const scanBook = async (accNo: string) => {
    if (!accNo.trim()) return;
    setScanning(true); setBookError("");
    try {
      const res  = await fetch(`/api/courses/${courseId}/library-books/scan?accessionNo=${encodeURIComponent(accNo.trim())}`);
      const data = await res.json();
      if (!data.found) { setBookError(`Book "${accNo}" not found in catalog.`); setBookScan(""); return; }
      if (data.book.availableCopies < 1 && !data.book.currentBorrow) {
        setBookError("No available copies of this book."); setBookScan(""); return;
      }
      setScannedBook(data.book);
      setBookScan("");
      setStep("CONFIRM_BOOK");
    } catch { setBookError("Scan failed. Try again."); }
    finally  { setScanning(false); }
  };

  const lookupBorrower = async (no: string) => {
    if (!no.trim()) return;
    setLookingUp(true); setBorrowerError(""); setBorrowerFound(false);
    try {
      const res  = await fetch(`/api/courses/${courseId}/library-borrow/lookup?no=${encodeURIComponent(no.trim())}`);
      const data = await res.json();
      if (data.found) {
        setBorrowerName(data.borrowerName ?? "");
        setBorrowerNo(data.borrowerNo ?? no.trim());
        setBorrowerId(data.borrowerId ?? null);
        setBorrowerType(data.borrowerType ?? "STUDENT");
        setBorrowerCourse(data.borrowerCourse ?? "");
        setBorrowerDept(data.borrowerDept ?? "");
        setBorrowerFound(true);
      } else {
        setBorrowerFound(false); setBorrowerId(null);
        setBorrowerNo(no.trim()); setBorrowerName("");
        setBorrowerCourse(""); setBorrowerDept("");
      }
    } catch { /* ignore */ }
    finally  { setLookingUp(false); }
  };

  const handleBorrow = async () => {
    if (!scannedBook) return;
    if (!borrowerName.trim()) { setSaveError("Borrower name is required."); return; }
    setSaving(true); setSaveError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/library-borrow`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId:         scannedBook.id,
          borrowerType,   borrowerId,
          borrowerNo:     borrowerNo || null,
          borrowerName:   borrowerName.trim(),
          borrowerCourse: borrowerType === "STUDENT"   ? borrowerCourse || null : null,
          borrowerDept:   borrowerType === "EMPLOYEE"  ? borrowerDept   || null : null,
          dueDate,
          remarks:        remarks || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Failed."); return; }
      onBorrowed();
      reset();
    } catch { setSaveError("Network error."); }
    finally  { setSaving(false); }
  };

  const reset = () => {
    setStep("BOOK"); setScannedBook(null); setBookScan(""); setBookError("");
    setBorrowerScan(""); setBorrowerName(""); setBorrowerNo(""); setBorrowerId(null);
    setBorrowerFound(false); setBorrowerError(""); setBorrowerCourse(""); setBorrowerDept("");
    setRemarks(""); setSaveError("");
    const d = new Date(); d.setDate(d.getDate() + 7);
    setDueDate(d.toISOString().slice(0, 10));
  };

  const stepIndex = { BOOK: 0, CONFIRM_BOOK: 0, BORROWER: 1, CONFIRM: 2 }[step];

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
      <div className="max-w-lg mx-auto w-full">

        <div className="flex items-center gap-2 mb-1">
          <StepIndicator steps={["Scan Book", "Borrower", "Confirm"]} current={stepIndex} />
          {step !== "BOOK" && (
            <button onClick={reset} className="ml-auto shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors" style={{ color: MUTED }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Step 1: Scan Book */}
        {step === "BOOK" && (
          <div className="bg-white rounded-2xl border p-4 sm:p-6 space-y-4" style={{ borderColor: RULE }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                <ScanLine size={20} style={{ color: MAROON }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: SLATE }}>Scan Book Barcode</p>
                <p className="text-xs" style={{ color: MUTED }}>Scan or type the accession number</p>
              </div>
            </div>
            <div className="relative">
              <ScanLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MAROON }} />
              <input
                ref={bookRef}
                value={bookScan}
                onChange={e => setBookScan(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") scanBook(bookScan); }}
                placeholder="Scan or type accession no. + Enter…"
                className="w-full pl-9 pr-4 py-3 text-sm border-2 rounded-xl outline-none font-mono"
                style={{ borderColor: MAROON, background: "#fffbfb" }}
                disabled={scanning}
              />
            </div>
            {bookError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle size={13} className="shrink-0" /> {bookError}
              </div>
            )}
            <button onClick={() => scanBook(bookScan)} disabled={scanning || !bookScan.trim()}
              className="w-full py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50 min-h-11"
              style={{ background: MAROON }}>
              {scanning ? "Looking up…" : "Find Book"}
            </button>
          </div>
        )}

        {/* Step 1b: Confirm Book */}
        {step === "CONFIRM_BOOK" && scannedBook && (
          <div className="bg-white rounded-2xl border p-4 sm:p-6 space-y-4" style={{ borderColor: RULE }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                <BookOpen size={20} style={{ color: MAROON }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: SLATE }}>Is this the right book?</p>
                <p className="text-xs" style={{ color: MUTED }}>Verify before proceeding</p>
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: RULE, background: "#fafafa" }}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: MAROON }}>Title</p>
                <p className="text-sm font-bold leading-snug" style={{ color: SLATE }}>{scannedBook.title}</p>
              </div>
              {scannedBook.author && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: MUTED }}>Author</p>
                  <p className="text-xs font-semibold" style={{ color: SLATE }}>{scannedBook.author}</p>
                </div>
              )}
              <InfoGrid rows={[
                ["Accession No.", scannedBook.accessionNo],
                ["Call Number",   scannedBook.callNumber],
                ["Category",      scannedBook.category],
                ["Available",     `${scannedBook.availableCopies} / ${scannedBook.totalCopies} copies`],
              ]} />
            </div>

            {scannedBook.availableCopies < 1 && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle size={13} className="shrink-0" /> No available copies — cannot be borrowed.
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setScannedBook(null); setStep("BOOK"); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold min-h-11"
                style={{ border: `1px solid ${RULE}`, color: MUTED }}>
                ← Wrong Book
              </button>
              <button onClick={() => setStep("BORROWER")} disabled={scannedBook.availableCopies < 1}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 min-h-11"
                style={{ background: MAROON }}>
                Yes, Confirm →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Borrower */}
        {step === "BORROWER" && scannedBook && (
          <div className="space-y-3">
            {/* Book confirmed banner */}
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <CheckCircle2 size={15} className="text-green-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-green-800 truncate">{scannedBook.title}</p>
                <p className="text-[10px] text-green-600">{scannedBook.accessionNo} · {scannedBook.availableCopies} copies available</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border p-4 sm:p-6 space-y-4" style={{ borderColor: RULE }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                  <User size={18} style={{ color: MAROON }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: SLATE }}>Borrower Information</p>
                  <p className="text-xs" style={{ color: MUTED }}>Scan ID or fill in manually</p>
                </div>
              </div>

              {/* ID lookup */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold" style={{ color: MUTED }}>
                  Library Card / Student ID
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                    <input
                      ref={borrowerRef}
                      value={borrowerScan}
                      onChange={e => setBorrowerScan(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { lookupBorrower(borrowerScan.trim()); setBorrowerScan(""); } }}
                      placeholder="ID number + Enter…"
                      className="w-full pl-8 pr-4 py-2.5 text-xs border rounded-xl outline-none font-mono"
                      style={{ borderColor: RULE }}
                    />
                    {lookingUp && (
                      <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: MUTED }} />
                    )}
                  </div>
                  <button
                    onClick={() => { lookupBorrower(borrowerScan.trim()); setBorrowerScan(""); }}
                    disabled={lookingUp || !borrowerScan.trim()}
                    className="px-3 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 shrink-0 min-h-11"
                    style={{ background: MAROON }}>
                    Look Up
                  </button>
                </div>
              </div>

              {borrowerFound && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle2 size={13} className="shrink-0" />
                  Found: <span className="font-bold">{borrowerName}</span>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: RULE }} />
                <span className="text-[10px] font-bold" style={{ color: MUTED }}>OR ENTER MANUALLY</span>
                <div className="flex-1 h-px" style={{ background: RULE }} />
              </div>

              {/* Borrower type toggle */}
              <div className="grid grid-cols-2 gap-2">
                {["STUDENT", "EMPLOYEE"].map(t => (
                  <button key={t} onClick={() => setBorrowerType(t)}
                    className="py-2.5 rounded-xl border text-xs font-bold transition-all min-h-11"
                    style={borrowerType === t
                      ? { background: MAROON, color: "#fff", borderColor: MAROON }
                      : { background: "#fff", color: MUTED, borderColor: RULE }}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>
                    {borrowerType === "STUDENT" ? "Student No." : "Employee No."}
                  </label>
                  <input value={borrowerNo} onChange={e => setBorrowerNo(e.target.value)}
                    placeholder="ID Number" className={inputCls} style={{ borderColor: RULE }} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input value={borrowerName} onChange={e => setBorrowerName(e.target.value)}
                    placeholder="Borrower's full name" className={inputCls} style={{ borderColor: RULE }} />
                </div>
                {borrowerType === "STUDENT" && (
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>
                      Course / Year & Section
                    </label>
                    <input value={borrowerCourse} onChange={e => setBorrowerCourse(e.target.value)}
                      placeholder="e.g. BSIT 2-A" className={inputCls} style={{ borderColor: RULE }} />
                  </div>
                )}
                {borrowerType === "EMPLOYEE" && (
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>
                      College / Department
                    </label>
                    <input value={borrowerDept} onChange={e => setBorrowerDept(e.target.value)}
                      placeholder="e.g. College of Engineering" className={inputCls} style={{ borderColor: RULE }} />
                  </div>
                )}
              </div>

              {borrowerError && <p className="text-xs text-red-600">{borrowerError}</p>}

              <button
                onClick={() => { if (borrowerName.trim()) setStep("CONFIRM"); else setBorrowerError("Name is required."); }}
                className="w-full py-3 rounded-xl text-xs font-bold text-white min-h-11"
                style={{ background: MAROON }}>
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "CONFIRM" && scannedBook && (
          <div className="bg-white rounded-2xl border p-4 sm:p-6 space-y-4" style={{ borderColor: RULE }}>
            <p className="text-sm font-bold" style={{ color: SLATE }}>Confirm Borrowing</p>

            {/* Book summary */}
            <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: RULE, background: "#fafafa" }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>Book</p>
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                  <BookOpen size={16} style={{ color: MAROON }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-snug" style={{ color: SLATE }}>{scannedBook.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                    {scannedBook.accessionNo}
                    {scannedBook.callNumber && ` · ${scannedBook.callNumber}`}
                    {` · ${scannedBook.category}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Borrower summary */}
            <div className="rounded-xl border p-4 space-y-1" style={{ borderColor: RULE, background: "#fafafa" }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>Borrower</p>
              <p className="text-sm font-bold" style={{ color: SLATE }}>{borrowerName}</p>
              {borrowerNo     && <p className="text-xs" style={{ color: MUTED }}>{borrowerType} · {borrowerNo}</p>}
              {borrowerCourse && <p className="text-xs" style={{ color: MUTED }}>{borrowerCourse}</p>}
              {borrowerDept   && <p className="text-xs" style={{ color: MUTED }}>{borrowerDept}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>
                Due Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className={inputCls} style={{ borderColor: RULE }} />
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Remarks</label>
              <input value={remarks} onChange={e => setRemarks(e.target.value)}
                placeholder="Optional remarks" className={inputCls} style={{ borderColor: RULE }} />
            </div>

            {saveError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {saveError}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep("BORROWER")}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold min-h-11"
                style={{ border: `1px solid ${RULE}`, color: MUTED }}>
                ← Back
              </button>
              <button onClick={handleBorrow} disabled={saving}
                className="flex-1 py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50 min-h-11"
                style={{ background: MAROON }}>
                {saving ? "Processing…" : "✓ Confirm Borrow"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Return Panel ── */
function ReturnPanel({ courseId, onReturned }: { courseId: string; onReturned: () => void }) {
  const [scanInput, setScanInput] = useState("");
  const [scanned,   setScanned]   = useState<ScannedBook | null>(null);
  const [error,     setError]     = useState("");
  const [scanning,  setScanning]  = useState(false);
  const [returning, setReturning] = useState(false);
  const [returned,  setReturned]  = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => scanRef.current?.focus(), 100); }, []);

  const scanBook = async (accNo: string) => {
    if (!accNo.trim()) return;
    setScanning(true); setError(""); setScanned(null); setReturned(false);
    try {
      const res  = await fetch(`/api/courses/${courseId}/library-books/scan?accessionNo=${encodeURIComponent(accNo.trim())}`);
      const data = await res.json();
      if (!data.found)             { setError(`Book "${accNo}" not found.`); setScanInput(""); return; }
      if (!data.book.currentBorrow){ setError("This book is not currently borrowed."); setScanInput(""); return; }
      setScanned(data.book); setScanInput("");
    } catch { setError("Scan failed. Try again."); }
    finally  { setScanning(false); }
  };

  const handleReturn = async () => {
    if (!scanned?.currentBorrow) return;
    setReturning(true);
    try {
      const res = await fetch(
        `/api/courses/${courseId}/library-borrow/${scanned.currentBorrow.id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "return" }) }
      );
      if (!res.ok) { setError("Return failed. Try again."); return; }
      setReturned(true); onReturned();
    } catch { setError("Network error."); }
    finally  { setReturning(false); }
  };

  const reset = () => {
    setScanned(null); setScanInput(""); setError(""); setReturned(false);
    setTimeout(() => scanRef.current?.focus(), 100);
  };

  const overdue = scanned?.currentBorrow ? daysOverdue(scanned.currentBorrow.dueDate) : 0;

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
      <div className="max-w-lg mx-auto w-full">

        {!returned ? (
          <div className="space-y-3">
            {/* Scan input card */}
            <div className="bg-white rounded-2xl border p-4 sm:p-6 space-y-4" style={{ borderColor: RULE }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                  <ScanLine size={20} style={{ color: MAROON }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: SLATE }}>Scan Book to Return</p>
                  <p className="text-xs" style={{ color: MUTED }}>Scan the barcode of the book being returned</p>
                </div>
              </div>

              <div className="relative">
                <ScanLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MAROON }} />
                <input
                  ref={scanRef}
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") scanBook(scanInput); }}
                  placeholder="Scan or type accession no. + Enter…"
                  className="w-full pl-9 pr-4 py-3 text-sm border-2 rounded-xl outline-none font-mono"
                  style={{ borderColor: MAROON, background: "#fffbfb" }}
                  disabled={scanning}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} className="shrink-0" /> {error}
                </div>
              )}

              <button onClick={() => scanBook(scanInput)} disabled={scanning || !scanInput.trim()}
                className="w-full py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50 min-h-11"
                style={{ background: MAROON }}>
                {scanning ? "Looking up…" : "Find Book"}
              </button>
            </div>

            {/* Return details */}
            {scanned?.currentBorrow && (
              <div className="bg-white rounded-2xl border p-4 sm:p-6 space-y-4" style={{ borderColor: RULE }}>
                <p className="text-sm font-bold" style={{ color: SLATE }}>Return Details</p>

                <div className="rounded-xl p-4 space-y-3" style={{ background: "#fafafa", border: `1px solid ${RULE}` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                      <BookOpen size={16} style={{ color: MAROON }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-snug" style={{ color: SLATE }}>{scanned.title}</p>
                      <p className="text-xs" style={{ color: MUTED }}>{scanned.accessionNo} · {scanned.category}</p>
                    </div>
                  </div>

                  <InfoGrid rows={[
                    ["Borrower", scanned.currentBorrow.borrowerName],
                    ["Status",   scanned.currentBorrow.status],
                    ["Due Date", fmtDate(scanned.currentBorrow.dueDate)],
                    ["ID No.",   scanned.currentBorrow.borrowerNo],
                  ]} />

                  {overdue > 0 && (
                    <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertTriangle size={13} className="shrink-0" />
                      Overdue by {overdue} day{overdue > 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={reset}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold min-h-11"
                    style={{ border: `1px solid ${RULE}`, color: MUTED }}>
                    Cancel
                  </button>
                  <button onClick={handleReturn} disabled={returning}
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50 min-h-11"
                    style={{ background: MAROON }}>
                    {returning ? "Processing…" : "✓ Confirm Return"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Success */
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-50">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <div>
              <p className="text-base font-bold mb-1" style={{ color: SLATE }}>Book Returned!</p>
              <p className="text-sm" style={{ color: MUTED }}>
                <span className="font-semibold">{scanned?.title}</span> has been returned successfully.
              </p>
            </div>
            <button onClick={reset}
              className="text-xs font-bold px-6 py-3 rounded-xl text-white min-h-11"
              style={{ background: MAROON }}>
              Return Another Book
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Records Panel ── */
function RecordsPanel({ courseId }: { courseId: string }) {
  const [records,     setRecords]     = useState<BorrowRecord[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [status,      setStatus]      = useState("");
  const [search,      setSearch]      = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (status) p.set("status", status);
      if (search) p.set("search", search);
      const res  = await fetch(`/api/courses/${courseId}/library-borrow?${p}`);
      const data = await res.json();
      setRecords(data.records ?? []);
    } catch { /* ignore */ }
    finally  { setLoading(false); }
  }, [courseId, status, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(val), 400);
  };

  const exportCSV = () => {
    const header = ["Borrower","ID No.","Type","Book Title","Accession No.","Category","Borrowed At","Due Date","Returned At","Status"];
    const rows   = records.map(r => [
      r.borrowerName, r.borrowerNo ?? "", r.borrowerType,
      r.book.title, r.book.accessionNo, r.book.category,
      fmtDateTime(r.borrowedAt),
      fmtDate(r.dueDate),
      r.returnedAt ? fmtDateTime(r.returnedAt) : "",
      r.status,
    ]);
    const csv  = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url;
    a.download = `borrow-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const borrowed = records.filter(r => r.status === "BORROWED").length;
  const overdue  = records.filter(r => r.status === "OVERDUE").length;
  const returned = records.filter(r => r.status === "RETURNED").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Toolbar */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b bg-white shrink-0 space-y-3" style={{ borderColor: RULE }}>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Borrowed", full: "Currently Borrowed", value: borrowed, color: "#1e40af", bg: "#dbeafe" },
            { label: "Overdue",  full: "Overdue",            value: overdue,  color: "#991b1b", bg: "#fee2e2" },
            { label: "Returned", full: "Returned",           value: returned, color: "#14532d", bg: "#dcfce7" },
          ].map(({ label, full, value, color, bg }) => (
            <div key={label} className="rounded-xl border p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3"
              style={{ borderColor: RULE, background: "#fff" }}>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
                <BookMarked size={13} style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-black leading-none" style={{ color }}>{value}</p>
                <p className="text-[10px] font-semibold mt-0.5 truncate" style={{ color: MUTED }}>
                  <span className="sm:hidden">{label}</span>
                  <span className="hidden sm:inline">{full}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter — scrollable on mobile */}
          <div className="flex rounded-lg border overflow-hidden shrink-0" style={{ borderColor: RULE }}>
            {[["","All"],["BORROWED","Borrowed"],["OVERDUE","Overdue"],["RETURNED","Returned"]].map(([val, label]) => (
              <button key={val} onClick={() => setStatus(val)}
                className="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap"
                style={status === val
                  ? { background: MAROON, color: "#fff" }
                  : { color: MUTED, background: "#fff" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={searchInput} onChange={e => handleSearchInput(e.target.value)}
              placeholder="Search borrower, ID, or book…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg outline-none"
              style={{ borderColor: RULE }} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={exportCSV}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border"
              style={{ borderColor: RULE, color: MUTED }}>
              <Download size={13} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={load}
              className="p-1.5 rounded-lg border" style={{ borderColor: RULE }}>
              <RefreshCw size={13} style={{ color: MUTED }} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={18} className="animate-spin" style={{ color: MUTED }} />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <BookOpen size={28} style={{ color: RULE }} />
            <p className="text-sm" style={{ color: MUTED }}>No borrow records found.</p>
          </div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: `2px solid ${RULE}` }}>
                    {["Book","Borrower","ID No.","Borrowed","Due Date","Returned","Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left whitespace-nowrap"
                        style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const od = r.status !== "RETURNED" ? daysOverdue(r.dueDate) : 0;
                    return (
                      <tr key={r.id}
                        style={{
                          background: r.status === "OVERDUE" ? "#fff8f8" : i % 2 === 0 ? "#fff" : "#fafafa",
                          borderBottom: `1px solid ${RULE}`,
                        }}>
                        <td className="px-4 py-3" style={{ maxWidth: 220 }}>
                          <p className="font-semibold text-xs truncate" style={{ color: SLATE }}>{r.book.title}</p>
                          <p className="text-[10px]" style={{ color: MUTED }}>
                            {r.book.accessionNo}{r.book.callNumber && ` · ${r.book.callNumber}`}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold" style={{ color: SLATE }}>{r.borrowerName}</p>
                          {(r.borrowerCourse || r.borrowerDept) && (
                            <p className="text-[10px]" style={{ color: MUTED }}>{r.borrowerCourse ?? r.borrowerDept}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono" style={{ color: MUTED }}>{r.borrowerNo ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: MUTED }}>{fmtDateTime(r.borrowedAt)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold"
                            style={{ color: od > 0 && r.status !== "RETURNED" ? "#ef4444" : MUTED }}>
                            {fmtDate(r.dueDate)}
                            {od > 0 && r.status !== "RETURNED" && (
                              <span className="block text-[10px] text-red-500">{od}d overdue</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: MUTED }}>
                            {r.returnedAt ? fmtDateTime(r.returnedAt) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile list ── */}
            <div className="sm:hidden divide-y" style={{ borderColor: RULE }}>
              {records.map(r => {
                const od       = r.status !== "RETURNED" ? daysOverdue(r.dueDate) : 0;
                const expanded = expandedId === r.id;
                return (
                  <div key={r.id}
                    style={{ background: r.status === "OVERDUE" ? "#fff8f8" : "#fff" }}>
                    {/* Row summary */}
                    <button
                      className="w-full text-left px-3 py-3 flex items-start gap-3 active:bg-gray-50"
                      onClick={() => setExpandedId(expanded ? null : r.id)}>
                      {/* Book icon */}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "#fef2f2" }}>
                        <BookOpen size={14} style={{ color: MAROON }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: SLATE }}>{r.book.title}</p>
                        <p className="text-[10px] font-semibold truncate mt-0.5" style={{ color: MUTED }}>
                          {r.borrowerName}
                          {r.borrowerNo && <span className="font-mono"> · {r.borrowerNo}</span>}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                          Due {fmtDate(r.dueDate)}
                          {od > 0 && r.status !== "RETURNED" && (
                            <span className="text-red-500 font-bold"> · {od}d overdue</span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={r.status} />
                        <span className="text-[10px]" style={{ color: MUTED }}>{expanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {expanded && (
                      <div className="px-3 pb-3 pt-1">
                        <div className="rounded-xl border p-3 space-y-2.5" style={{ borderColor: RULE, background: "#fafafa" }}>
                          <InfoGrid rows={[
                            ["Accession No.", r.book.accessionNo],
                            ["Category",      r.book.category],
                            ["Borrower Type", r.borrowerType],
                            ["Course / Dept", r.borrowerCourse ?? r.borrowerDept],
                            ["Borrowed At",   fmtDateTime(r.borrowedAt)],
                            ["Due Date",      fmtDate(r.dueDate)],
                            ["Returned At",   r.returnedAt ? fmtDateTime(r.returnedAt) : "—"],
                            ["Remarks",       r.remarks],
                          ]} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function CourseBorrowingTab({
  courseId,
  isHead,
}: {
  courseId: string;
  isHead:   boolean;
}) {
  const [tab,        setTab]        = useState<TabMode>("BORROW");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT, background: "#f8fafc" }}>

      {/* Header */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b bg-white shrink-0" style={{ borderColor: RULE }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: MAROON }}>Library</p>
            <h1 className="text-base sm:text-lg font-black" style={{ color: SLATE }}>Book Borrowing</h1>
          </div>
        </div>

        {/* Tab switcher — full width on mobile */}
        <div className="flex rounded-xl border overflow-hidden w-full sm:w-fit" style={{ borderColor: RULE }}>
          {([
            ["BORROW",  "Borrow",  "Borrow Book",  ScanLine     ],
            ["RETURN",  "Return",  "Return Book",  CheckCircle2 ],
            ["RECORDS", "Records", "Records",      Clock        ],
          ] as [TabMode, string, string, React.ElementType][]).map(([val, shortLabel, fullLabel, Icon]) => (
            <button key={val} onClick={() => setTab(val)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2 text-xs font-bold transition-all"
              style={tab === val
                ? { background: MAROON, color: "#fff" }
                : { color: MUTED, background: "#fff" }}>
              <Icon size={13} className="shrink-0" />
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{fullLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "BORROW"  && <BorrowPanel  key={`borrow-${refreshKey}`}  courseId={courseId} onBorrowed={refresh} />}
      {tab === "RETURN"  && <ReturnPanel  key={`return-${refreshKey}`}  courseId={courseId} onReturned={refresh} />}
      {tab === "RECORDS" && <RecordsPanel key={`records-${refreshKey}`} courseId={courseId} />}
    </div>
  );
}