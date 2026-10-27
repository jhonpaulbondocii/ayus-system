"use client";

// src/components/layout/course/CourseBookCatalogTab.tsx

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  Plus, Search, SlidersHorizontal, BookOpen, Pencil, Trash2, X, Check,
  Download, RefreshCw, BookMarked, ChevronRight, ChevronLeft, MoreVertical,
  AlertCircle, CheckCircle2,
} from "lucide-react";
import { FONT } from "./osaShared";

/* ════════════════════════════════════════════════════════════════════════════
   1. DESIGN TOKENS
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
  canvas:    "#ffffff",
  danger:    "#b91c1c",
  ok:        "#15803d",
} as const;

const PAGE_SIZE = 20;

const CATEGORIES = ["Filipiniana", "Circulation", "Reserved", "General References"] as const;
type Category = typeof CATEGORIES[number];

const catShort = (c: string) => (c === "General References" ? "Gen. Ref." : c);

/* ════════════════════════════════════════════════════════════════════════════
   2. TYPES & HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

interface LibraryBook {
  id:              string;
  accessionNo:     string;
  callNumber:      string | null;
  isbn:            string | null;
  title:           string;
  author:          string | null;
  publisher:       string | null;
  copyrightYear:   string | null;
  edition:         string | null;
  pages:           number | null;
  volume:          string | null;
  category:        string;
  location:        string | null;
  totalCopies:     number;
  availableCopies: number;
  coverUrl:        string | null;
  createdAt:       string;
  _count:          { borrowRecords: number };
}

type AvailFilter = "" | "AVAILABLE" | "OUT_OF_STOCK";

const authorsOf = (a: string | null) => (a ? a.split("|").map(s => s.trim()).filter(Boolean) : []);

const YEAR_PRESETS = [
  { label: "Pre-2000", from: "1900", to: "1999" },
  { label: "2000s",    from: "2000", to: "2009" },
  { label: "2010s",    from: "2010", to: "2019" },
  { label: "2020s",    from: "2020", to: String(new Date().getFullYear()) },
];

function matchesYear(b: LibraryBook, from: string, to: string) {
  const y = parseInt(b.copyrightYear ?? "");
  if (from && !(y >= parseInt(from))) return false;
  if (to   && !(y <= parseInt(to)))   return false;
  return true;
}

function matchesAvail(b: LibraryBook, a: AvailFilter) {
  if (a === "AVAILABLE"    && b.availableCopies === 0) return false;
  if (a === "OUT_OF_STOCK" && b.availableCopies  > 0)  return false;
  return true;
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white placeholder:text-gray-400";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

/* ════════════════════════════════════════════════════════════════════════════
   3. UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════ */

type ToastState = { msg: string; tone: "success" | "error" } | null;

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

function SheetModal({
  onClose, tone = "brand", icon, title, subtitle, children, footer, maxWidth = "max-w-md",
}: {
  onClose: () => void; tone?: "brand" | "danger"; icon?: ReactNode; title: string; subtitle?: string;
  children: ReactNode; footer?: ReactNode; maxWidth?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const accent = tone === "danger" ? C.danger : C.brand;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      style={{ backdropFilter: "blur(3px)", fontFamily: FONT }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} sm:mx-4 overflow-hidden flex flex-col max-h-[92vh]`}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 shrink-0" style={{ background: accent, color: "#fff" }}>
          <div className="flex items-center gap-3 min-w-0">
            {icon && <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/20">{icon}</div>}
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
          <div className="border-t shrink-0 bg-gray-50" style={{ borderColor: C.line, paddingBottom: "env(safe-area-inset-bottom)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({
  title, message, confirmLabel, busy, onConfirm, onClose,
}: { title: string; message: ReactNode; confirmLabel: string; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <SheetModal onClose={onClose} tone="danger" icon={<Trash2 size={16} />} title={title} maxWidth="max-w-sm"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={busy}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60" style={{ background: C.danger }}>
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      }>
      <div className="px-5 py-5 text-sm leading-relaxed" style={{ color: C.body }}>{message}</div>
    </SheetModal>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={{ background: C.lineSoft, color: C.body }}>
      {catShort(category)}
    </span>
  );
}

function Availability({ book, compact }: { book: LibraryBook; compact?: boolean }) {
  const out = book.availableCopies === 0;
  return (
    <span className="text-xs font-semibold tabular-nums whitespace-nowrap" style={{ color: out ? C.danger : C.ok }}>
      {compact ? `${book.availableCopies}/${book.totalCopies}` : `${book.availableCopies} of ${book.totalCopies} available`}
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

/* ════════════════════════════════════════════════════════════════════════════
   4. AUTHOR TAG INPUT
   ════════════════════════════════════════════════════════════════════════════ */

function AuthorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [input, setInput] = useState("");
  const tags = authorsOf(value);

  const addTag = () => {
    const t = input.trim().replace(/,+$/, "").trim();
    if (!t) return;
    onChange([...tags, t].join(" | "));
    setInput("");
  };
  const removeTag = (i: number) => onChange(tags.filter((_, idx) => idx !== i).join(" | "));

  return (
    <div className="w-full border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus-within:ring-2 focus-within:ring-[#7b1113]/10 focus-within:border-[#7b1113] transition-all flex flex-wrap gap-1.5 min-h-[40px]">
      {tags.map((t, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: C.brandTint, color: C.brand }}>
          {t}
          <button type="button" onClick={() => removeTag(i)} aria-label={`Remove ${t}`} className="hover:opacity-70 leading-none"><X size={10} /></button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
          if (e.key === "Backspace" && !input && tags.length) removeTag(tags.length - 1);
        }}
        onBlur={addTag}
        placeholder={tags.length === 0 ? "Type a name, press Enter to add" : "Add another"}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-gray-400" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   5. ADD / EDIT MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function BookModal({
  courseId, book, onClose, onSaved,
}: { courseId: string; book: LibraryBook | null; onClose: () => void; onSaved: (b: LibraryBook) => void }) {
  const isEdit = !!book;
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const [accessionNo,   setAccessionNo]   = useState(book?.accessionNo   ?? "");
  const [callNumber,    setCallNumber]    = useState(book?.callNumber    ?? "");
  const [isbn,          setIsbn]          = useState(book?.isbn          ?? "");
  const [title,         setTitle]         = useState(book?.title         ?? "");
  const [author,        setAuthor]        = useState(book?.author        ?? "");
  const [publisher,     setPublisher]     = useState(book?.publisher     ?? "");
  const [copyrightYear, setCopyrightYear] = useState(book?.copyrightYear ?? "");
  const [edition,       setEdition]       = useState(book?.edition       ?? "");
  const [pages,         setPages]         = useState(book?.pages?.toString() ?? "");
  const [volume,        setVolume]        = useState(book?.volume        ?? "");
  const [category,      setCategory]      = useState<Category>((book?.category as Category) ?? "Circulation");
  const [totalCopies,   setTotalCopies]   = useState(book?.totalCopies?.toString() ?? "1");

  const handleSave = async () => {
    if (!accessionNo.trim()) { setError("Enter the accession number."); return; }
    if (!title.trim())       { setError("Enter the book title."); return; }
    setError(""); setSaving(true);
    try {
      const url = isEdit ? `/api/courses/${courseId}/library-books/${book!.id}` : `/api/courses/${courseId}/library-books`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessionNo, callNumber, isbn, title, author, publisher, copyrightYear, edition,
          pages: pages || null, volume, category, totalCopies: parseInt(totalCopies) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Couldn’t save the book."); return; }
      onSaved(data.book);
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <SheetModal onClose={onClose} icon={<BookOpen size={16} />} title={isEdit ? "Edit book" : "Add new book"}
      subtitle={isEdit ? book!.accessionNo : "Book catalog"} maxWidth="max-w-2xl"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60" style={{ background: C.brand }}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add book"}
          </button>
        </div>
      }>
      <div className="px-5 py-5 space-y-4">
        {error && (
          <div role="alert" className="flex items-center gap-2 text-xs font-semibold rounded-lg border px-3 py-2"
            style={{ color: C.danger, background: "#fef2f2", borderColor: "#fecaca" }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Accession no." required>
            <input value={accessionNo} onChange={e => setAccessionNo(e.target.value)} placeholder="e.g. 001234" className={inputCls} />
          </Field>
          <Field label="Call number">
            <input value={callNumber} onChange={e => setCallNumber(e.target.value)} placeholder="e.g. 808.3 M32" className={inputCls} />
          </Field>
        </div>

        <Field label="Title" required>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Book title" className={inputCls} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Author(s)"><AuthorInput value={author} onChange={setAuthor} /></Field>
          <Field label="Publisher">
            <input value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="Publisher" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Year"><input value={copyrightYear} onChange={e => setCopyrightYear(e.target.value)} placeholder="2023" className={inputCls} /></Field>
          <Field label="Edition"><input value={edition} onChange={e => setEdition(e.target.value)} placeholder="3rd" className={inputCls} /></Field>
          <Field label="Volume"><input value={volume} onChange={e => setVolume(e.target.value)} placeholder="Vol. 1" className={inputCls} /></Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Category" required>
            <select value={category} onChange={e => setCategory(e.target.value as Category)} className={inputCls}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Copies">
            <input type="number" min="1" value={totalCopies} onChange={e => setTotalCopies(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Pages">
            <input type="number" min="1" value={pages} onChange={e => setPages(e.target.value)} placeholder="No. of pages" className={inputCls} />
          </Field>
        </div>

        <Field label="ISBN">
          <input value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="ISBN" className={inputCls} />
        </Field>
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   6. BOOK DETAIL MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function BookDetailModal({
  book, courseId, isHead, onClose, onEdit, onDelete,
}: { book: LibraryBook; courseId: string; isHead: boolean; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [printError, setPrintError] = useState("");

  const barcodeUrl = useMemo(
    () => `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(book.accessionNo)}&scale=5&height=12&includetext=false&backgroundcolor=ffffff`,
    [book.accessionNo],
  );

  const handlePrintSingle = async () => {
    setGenerating(true); setPrintError("");
    try {
      const q = new URLSearchParams({ accessionNos: book.accessionNo });
      const res = await fetch(`/api/courses/${courseId}/library-books/print-barcodes?${q}`);
      if (!res.ok) { setPrintError("Couldn’t generate the barcode."); return; }
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob));
    } catch { setPrintError("Couldn’t generate the barcode."); }
    finally { setGenerating(false); }
  };

  const rows: Array<[string, string]> = [
    ["Call no.",   book.callNumber ?? "—"],
    ["ISBN",       book.isbn ?? "—"],
    ["Publisher",  book.publisher ?? "—"],
    ["Year",       book.copyrightYear ?? "—"],
    ...(book.edition ? [["Edition", book.edition] as [string, string]] : []),
    ...(book.volume  ? [["Volume",  book.volume]  as [string, string]] : []),
    ...(book.pages   ? [["Pages",   String(book.pages)] as [string, string]] : []),
    ["Times borrowed", String(book._count?.borrowRecords ?? 0)],
  ];
  const authors = authorsOf(book.author);

  return (
    <SheetModal onClose={onClose} icon={<BookOpen size={16} />} title={book.title} subtitle={book.accessionNo}
      footer={
        <div className="px-5 py-3 space-y-2">
          {printError && <p className="text-xs font-semibold" style={{ color: C.danger }}>{printError}</p>}
          {isHead && (
            <div className="flex gap-2">
              <button onClick={() => { onClose(); onEdit(); }}
                className="flex-1 h-9 border border-gray-200 bg-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 text-gray-600 hover:bg-gray-50">
                <Pencil size={12} /> Edit
              </button>
              <button onClick={() => { onClose(); onDelete(); }}
                className="flex-1 h-9 border border-red-200 bg-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 text-red-600 hover:bg-red-50">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 h-10 border border-gray-200 bg-white rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50">Close</button>
            <button onClick={handlePrintSingle} disabled={generating}
              className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
              style={{ background: C.brand }}>
              {generating ? <><RefreshCw size={13} className="animate-spin" /> Generating…</> : <><BookMarked size={13} /> Print barcode</>}
            </button>
          </div>
        </div>
      }>
      <div className="px-5 py-5 space-y-4">
        {authors.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: C.muted }}>Author(s)</p>
            <div className="flex flex-wrap gap-1.5">
              {authors.map((a, i) => (
                <span key={i} className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: C.brandTint, color: C.brand }}>{a}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <CategoryBadge category={book.category} />
          <Availability book={book} />
        </div>

        <dl className="rounded-xl border divide-y" style={{ borderColor: C.line }}>
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-3.5 py-2.5 gap-3" style={{ borderColor: C.lineSoft }}>
              <dt className="text-xs shrink-0" style={{ color: C.muted }}>{label}</dt>
              <dd className="text-xs font-semibold text-right truncate max-w-[60%]" style={{ color: C.ink }}>{value}</dd>
            </div>
          ))}
        </dl>

        <div className="rounded-xl border p-4 flex flex-col items-center gap-2 bg-gray-50" style={{ borderColor: C.line }}>
          <p className="text-xs font-semibold self-start" style={{ color: C.muted }}>Barcode</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={barcodeUrl} alt={`Barcode for ${book.accessionNo}`} className="w-full max-h-24 object-contain" />
          <p className="text-xs font-bold font-mono" style={{ color: C.body }}>{book.accessionNo}</p>
        </div>
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   7. PRINT BARCODES MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function PrintBarcodesModal({
  courseId, books, catFilter, selectedIds, onClose,
}: { courseId: string; books: LibraryBook[]; catFilter: string; selectedIds: Set<string>; onClose: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [pdfUrl,     setPdfUrl]     = useState<string | null>(null);
  const [error,      setError]      = useState("");
  const [cat,        setCat]        = useState(catFilter);

  const fromSelection = selectedIds.size > 0;
  const count = fromSelection ? selectedIds.size : books.filter(b => !cat || b.category === cat).length;
  const pages = Math.ceil(count / 24);

  const generate = async () => {
    setGenerating(true); setError(""); setPdfUrl(null);
    try {
      const q = new URLSearchParams();
      if (fromSelection) {
        q.set("accessionNos", books.filter(b => selectedIds.has(b.id)).map(b => b.accessionNo).join(","));
      } else if (cat) q.set("category", cat);
      const res = await fetch(`/api/courses/${courseId}/library-books/print-barcodes?${q}`);
      if (!res.ok) { setError("Couldn’t generate the PDF. Please try again."); return; }
      setPdfUrl(URL.createObjectURL(await res.blob()));
    } catch { setError("Network error. Please try again."); }
    finally { setGenerating(false); }
  };

  const handleClose = () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); onClose(); };

  return (
    <SheetModal onClose={handleClose} icon={<BookMarked size={16} />} title="Print barcode labels" subtitle="Library" maxWidth="max-w-lg"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={handleClose}
            className="flex-1 h-10 border border-gray-200 bg-white rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50">Close</button>
          {pdfUrl ? (
            <a href={pdfUrl} download="barcodes.pdf"
              className="flex-1 h-10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5" style={{ background: C.brand }}>
              <Download size={13} /> Download PDF
            </a>
          ) : (
            <button onClick={generate} disabled={generating || count === 0}
              className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
              style={{ background: C.brand }}>
              {generating ? <><RefreshCw size={13} className="animate-spin" /> Generating…</> : <><BookMarked size={13} /> Generate PDF</>}
            </button>
          )}
        </div>
      }>
      <div className="px-5 py-5 space-y-4">
        {!fromSelection && (
          <div>
            <label className={labelCls}>Category</label>
            <PillGroup<string>
              options={[["", "All"], ...CATEGORIES.map(c => [c, catShort(c)] as [string, string])]}
              value={cat} onChange={v => { setCat(v); setPdfUrl(null); }} />
          </div>
        )}

        <div className="rounded-xl border px-4 py-3 bg-gray-50 text-xs space-y-1" style={{ borderColor: C.line, color: C.muted }}>
          <p>
            <strong className="text-sm" style={{ color: C.ink }}>{count}</strong>{" "}
            {fromSelection ? "selected " : ""}book{count !== 1 ? "s" : ""} · {pages} page{pages !== 1 ? "s" : ""} · 3×8 labels per page
          </p>
          <p style={{ color: C.faint }}>Each label has a barcode, accession number, and title.</p>
        </div>

        {error && <p role="alert" className="text-xs font-semibold" style={{ color: C.danger }}>{error}</p>}

        {pdfUrl && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: C.line }}>
            <iframe src={pdfUrl} className="w-full" style={{ height: 280 }} title="Barcode preview" />
          </div>
        )}
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   8. EXPORT (CSV) MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function ExportModal({
  books, catFilter, availFilter, yearFrom, yearTo, onClose,
}: { books: LibraryBook[]; catFilter: string; availFilter: AvailFilter; yearFrom: string; yearTo: string; onClose: () => void }) {
  const [exporting, setExporting] = useState(false);
  const [cat,   setCat]   = useState(catFilter);
  const [avail, setAvail] = useState<AvailFilter>(availFilter);
  const [from,  setFrom]  = useState(yearFrom);
  const [to,    setTo]    = useState(yearTo);

  const preview = books.filter(b => matchesAvail(b, avail) && matchesYear(b, from, to) && (!cat || b.category === cat));

  const doExport = () => {
    setExporting(true);
    const header = ["Accession No.", "Call Number", "Title", "Author", "Publisher", "Copyright Year", "Edition", "Volume", "Category", "Total Copies", "Available", "ISBN"];
    const rows = preview.map(b => [
      b.accessionNo, b.callNumber ?? "", b.title, authorsOf(b.author).join("; "),
      b.publisher ?? "", b.copyrightYear ?? "", b.edition ?? "", b.volume ?? "",
      b.category, b.totalCopies, b.availableCopies, b.isbn ?? "",
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `book-catalog-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    onClose();
  };

  const numCls = "flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10";

  return (
    <SheetModal onClose={onClose} icon={<Download size={16} />} title="Export book catalog" subtitle="CSV" maxWidth="max-w-md"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-10 border border-gray-200 bg-white rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={doExport} disabled={exporting || preview.length === 0}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: C.brand }}>
            <Download size={13} /> Export {preview.length} book{preview.length !== 1 ? "s" : ""}
          </button>
        </div>
      }>
      <div className="px-5 py-5 space-y-4">
        <div>
          <label className={labelCls}>Category</label>
          <PillGroup<string> options={[["", "All"], ...CATEGORIES.map(c => [c, catShort(c)] as [string, string])]} value={cat} onChange={setCat} />
        </div>
        <div>
          <label className={labelCls}>Availability</label>
          <PillGroup<AvailFilter> options={[["", "All"], ["AVAILABLE", "Available"], ["OUT_OF_STOCK", "Out of stock"]]} value={avail} onChange={setAvail} />
        </div>
        <div>
          <label className={labelCls}>Copyright year</label>
          <div className="flex items-center gap-2">
            <input type="number" value={from} onChange={e => setFrom(e.target.value)} placeholder="From" min="1900" max="2099" aria-label="From year" className={numCls} />
            <span className="text-xs text-gray-400 shrink-0">to</span>
            <input type="number" value={to} onChange={e => setTo(e.target.value)} placeholder="To" min="1900" max="2099" aria-label="To year" className={numCls} />
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {YEAR_PRESETS.map(p => (
              <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border px-4 py-3 bg-gray-50 text-xs" style={{ borderColor: C.line, color: C.muted }}>
          <strong className="text-sm" style={{ color: C.ink }}>{preview.length}</strong> book{preview.length !== 1 ? "s" : ""} will be exported
          {preview.length < books.length && <> · filtered from {books.length} total</>}.
        </div>
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   9. MAIN TAB
   ════════════════════════════════════════════════════════════════════════════ */

export default function CourseBookCatalogTab({ courseId, isHead }: { courseId: string; isHead: boolean }) {
  const [books,        setBooks]        = useState<LibraryBook[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [catTab,       setCatTab]       = useState("");
  const [availFilter,  setAvailFilter]  = useState<AvailFilter>("");
  const [yearFrom,     setYearFrom]     = useState("");
  const [yearTo,       setYearTo]       = useState("");
  const [showFilters,  setShowFilters]  = useState(false);
  const [page,         setPage]         = useState(1);

  const [showAdd,      setShowAdd]      = useState(false);
  const [editBook,     setEditBook]     = useState<LibraryBook | null>(null);
  const [bookDetail,   setBookDetail]   = useState<LibraryBook | null>(null);
  const [showExport,   setShowExport]   = useState(false);
  const [showBarcodes, setShowBarcodes] = useState(false);

  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [rowMenu,      setRowMenu]      = useState<{ id: string; x: number; y: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [toast,        setToast]        = useState<ToastState>(null);

  const debouncedSearch = useDebounced(search, 350);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* Server handles search. Category, availability and year are filtered locally
     so the category tab counts stay accurate. */
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const q = new URLSearchParams();
      if (debouncedSearch) q.set("search", debouncedSearch);
      const res  = await fetch(`/api/courses/${courseId}/library-books?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load books.");
      setBooks(data.books ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load books.");
    } finally { setLoading(false); }
  }, [courseId, debouncedSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [debouncedSearch, catTab, availFilter, yearFrom, yearTo]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setRowMenu(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Rows matching every filter except the category tab (used for tab counts) */
  const baseFiltered = useMemo(
    () => books.filter(b => matchesAvail(b, availFilter) && matchesYear(b, yearFrom, yearTo)),
    [books, availFilter, yearFrom, yearTo],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { "": baseFiltered.length };
    CATEGORIES.forEach(k => { c[k] = 0; });
    baseFiltered.forEach(b => { c[b.category] = (c[b.category] ?? 0) + 1; });
    return c;
  }, [baseFiltered]);

  const filtered   = useMemo(() => (catTab ? baseFiltered.filter(b => b.category === catTab) : baseFiltered), [baseFiltered, catTab]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const activeFilterCount = [availFilter, yearFrom || yearTo].filter(Boolean).length;
  const hasAnyFilter = !!(search || catTab || activeFilterCount);
  const clearFilters = () => { setAvailFilter(""); setYearFrom(""); setYearTo(""); };
  const resetAll = () => { clearFilters(); setCatTab(""); setSearch(""); };

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) =>
    totalPages <= 5 || page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i,
  );

  /* Selection */
  const pageAllSelected  = paginated.length > 0 && paginated.every(b => selected.has(b.id));
  const pageSomeSelected = paginated.some(b => selected.has(b.id));
  const toggleOne = (id: string) =>
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglePage = () =>
    setSelected(prev => {
      const n = new Set(prev);
      if (pageAllSelected) paginated.forEach(b => n.delete(b.id)); else paginated.forEach(b => n.add(b.id));
      return n;
    });

  const openRowMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const flip = r.bottom + 140 > window.innerHeight;
    setRowMenu({ id, x: r.right, y: flip ? r.top - 136 : r.bottom + 4 });
  };

  /* Delete (single + bulk) */
  const deleteIds = async (ids: string[]) => {
    setDeleting(true);
    const results = await Promise.allSettled(
      ids.map(id =>
        fetch(`/api/courses/${courseId}/library-books/${id}`, { method: "DELETE" }).then(res => {
          if (!res.ok) throw new Error("Delete failed");
          return id;
        }),
      ),
    );
    const ok = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map(r => r.value);
    const failed = ids.length - ok.length;

    if (ok.length) setBooks(prev => prev.filter(b => !ok.includes(b.id)));
    setSelected(prev => { const n = new Set(prev); ok.forEach(id => n.delete(id)); return n; });
    setDeleting(false); setDeleteTarget(null);

    if (failed === 0) notify(ok.length === 1 ? "Book deleted" : `${ok.length} books deleted`);
    else notify(`${failed} couldn’t be deleted. They may have borrow records.`, "error");
  };

  const selectCls = "text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10";
  const filterLabelCls = "block text-xs font-semibold text-gray-500 mb-1.5";
  const menuBook = rowMenu ? books.find(b => b.id === rowMenu.id) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: C.canvas }}>

      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between shrink-0 gap-3" style={{ borderColor: C.line }}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Book catalog</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: C.faint }}>
            {loading ? "Loading…" : `${books.length} title${books.length !== 1 ? "s" : ""} · ${books.reduce((s, b) => s + b.totalCopies, 0)} copies`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowExport(true)} aria-label="Export"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 w-9 h-9 sm:w-auto sm:px-3 rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => { setSelected(new Set()); setShowBarcodes(true); }} aria-label="Barcodes"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 w-9 h-9 sm:w-auto sm:px-3 rounded-lg transition-colors">
            <BookMarked className="w-3.5 h-3.5" /><span className="hidden sm:inline">Barcodes</span>
          </button>
          {isHead && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-9 rounded-lg text-white transition-opacity hover:opacity-90" style={{ background: C.brand }}>
              <Plus className="w-3.5 h-3.5" /> Add book
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col min-h-0">
        <div className="flex-1 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[420px]" style={{ borderColor: C.line }}>

          {/* Category tabs */}
          <div className="border-b overflow-x-auto" style={{ borderColor: C.line }}>
            <div role="tablist" className="flex px-2 sm:px-3 min-w-max">
              {([["", "All"], ...CATEGORIES.map(c => [c, c] as [string, string])] as Array<[string, string]>).map(([val, label]) => {
                const active = catTab === val;
                return (
                  <button key={val || "all"} role="tab" aria-selected={active} onClick={() => setCatTab(val)}
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, author, accession no."
                aria-label="Search books"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-300 hover:text-gray-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
            <button onClick={() => setShowFilters(f => !f)} aria-expanded={showFilters}
              style={(showFilters || activeFilterCount) ? { background: C.brand, color: "#fff", borderColor: C.brand } : {}}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${!(showFilters || activeFilterCount) ? "border-gray-200 text-gray-600 hover:border-gray-400" : ""}`}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-white/90 text-[10px] font-bold flex items-center justify-center" style={{ color: C.brand }}>{activeFilterCount}</span>
              )}
            </button>
          </div>

          {/* Bulk action bar */}
          {isHead && selected.size > 0 && (
            <div className="px-3 sm:px-5 py-2.5 border-b flex items-center gap-3 flex-wrap" style={{ background: C.brandTint, borderColor: C.line }}>
              <span className="text-xs font-bold" style={{ color: C.brand }}>{selected.size} selected</span>
              {selected.size < filtered.length && (
                <button onClick={() => setSelected(new Set(filtered.map(b => b.id)))} className="text-xs font-semibold hover:underline" style={{ color: C.brand }}>
                  Select all {filtered.length}
                </button>
              )}
              <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-gray-500 hover:text-gray-700">Clear</button>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setShowBarcodes(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 h-8 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                  <BookMarked size={13} /> Print labels
                </button>
                <button onClick={() => setDeleteTarget(Array.from(selected))}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 h-8 rounded-lg text-white" style={{ background: C.danger }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          )}

          {/* Filter panel */}
          {showFilters && (
            <div className="px-3 sm:px-5 py-4 border-b bg-gray-50 space-y-4" style={{ borderColor: C.lineSoft }}>
              <div>
                <label className={filterLabelCls}>Availability</label>
                <PillGroup<AvailFilter> options={[["", "All"], ["AVAILABLE", "Available"], ["OUT_OF_STOCK", "Out of stock"]]} value={availFilter} onChange={setAvailFilter} />
              </div>
              <div>
                <label className={filterLabelCls}>Copyright year</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={yearFrom} onChange={e => setYearFrom(e.target.value)} placeholder="From" min="1900" max="2099" aria-label="From year" className={`${selectCls} w-24`} />
                  <span className="text-xs text-gray-400">to</span>
                  <input type="number" value={yearTo} onChange={e => setYearTo(e.target.value)} placeholder="To" min="1900" max="2099" aria-label="To year" className={`${selectCls} w-24`} />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {YEAR_PRESETS.map(p => (
                    <button key={p.label} onClick={() => { setYearFrom(p.from); setYearTo(p.to); }}
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
                  <div className="h-3 w-20 bg-gray-100 rounded" />
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
              <button onClick={load} className="text-xs font-bold px-4 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: C.brandTint }}>
                <BookOpen className="w-6 h-6" style={{ color: C.brand }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: C.ink }}>{hasAnyFilter ? "No matching books" : "No books yet"}</p>
              <p className="text-xs max-w-xs" style={{ color: C.muted }}>
                {hasAnyFilter ? "Try a different search or clear the filters." : isHead ? "Add your first book to start the catalog." : "Books added by the library will appear here."}
              </p>
              {hasAnyFilter ? (
                <button onClick={resetAll} className="mt-2 text-xs font-bold hover:underline" style={{ color: C.brand }}>Clear all filters</button>
              ) : isHead && (
                <button onClick={() => setShowAdd(true)}
                  className="mt-2 flex items-center gap-1.5 text-xs font-bold px-4 h-9 rounded-lg text-white" style={{ background: C.brand }}>
                  <Plus size={13} /> Add book
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop table */}
              <table className="w-full border-collapse hidden sm:table">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: "#fafafa" }}>
                    {isHead && (
                      <th scope="col" className="px-4 py-2.5 w-10 border-b" style={{ borderColor: C.line }}>
                        <input type="checkbox" aria-label="Select all on this page" checked={pageAllSelected}
                          ref={el => { if (el) el.indeterminate = !pageAllSelected && pageSomeSelected; }}
                          onChange={togglePage} className="w-4 h-4 cursor-pointer" style={{ accentColor: C.brand }} />
                      </th>
                    )}
                    {["Accession no.", "Call no.", "Title", "Author", "Category", "Copies", "Available", ""].map((h, i) => (
                      <th key={i} scope="col" className="text-left px-4 py-2.5 whitespace-nowrap border-b"
                        style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(book => {
                    const authors = authorsOf(book.author);
                    return (
                      <tr key={book.id} tabIndex={0} onClick={() => setBookDetail(book)}
                        onKeyDown={e => { if (e.key === "Enter") setBookDetail(book); }}
                        className="group cursor-pointer hover:bg-gray-50 focus:bg-gray-50 outline-none transition-colors"
                        style={selected.has(book.id) ? { background: C.brandTint } : undefined}>
                        {isHead && (
                          <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" aria-label={`Select ${book.title}`} checked={selected.has(book.id)}
                              onChange={() => toggleOne(book.id)} className="w-4 h-4 cursor-pointer" style={{ accentColor: C.brand }} />
                          </td>
                        )}
                        <td className="px-4 py-3.5 text-xs font-mono font-bold border-b whitespace-nowrap" style={{ color: C.brand, borderColor: C.lineSoft }}>{book.accessionNo}</td>
                        <td className="px-4 py-3.5 text-xs border-b whitespace-nowrap" style={{ color: C.muted, borderColor: C.lineSoft }}>{book.callNumber ?? "—"}</td>
                        <td className="px-4 py-3.5 border-b max-w-[260px]" style={{ borderColor: C.lineSoft }}>
                          <p className="text-[13px] font-semibold truncate" style={{ color: C.ink }}>{book.title}</p>
                          {book.copyrightYear && <p className="text-[11px]" style={{ color: C.faint }}>{book.copyrightYear}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-xs border-b max-w-[180px]" style={{ color: C.body, borderColor: C.lineSoft }}>
                          {authors.length ? <span className="line-clamp-2">{authors.join(", ")}</span> : <span style={{ color: C.faint }}>—</span>}
                        </td>
                        <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }}><CategoryBadge category={book.category} /></td>
                        <td className="px-4 py-3.5 text-xs font-semibold tabular-nums border-b" style={{ color: C.body, borderColor: C.lineSoft }}>{book.totalCopies}</td>
                        <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }}><Availability book={book} compact /></td>
                        <td className="px-3 py-3.5 w-12 border-b" style={{ borderColor: C.lineSoft }}>
                          {isHead ? (
                            <button onClick={e => openRowMenu(e, book.id)} aria-label={`Actions for ${book.title}`} aria-haspopup="menu"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          ) : (
                            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 transition-colors" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map(book => (
                  <div key={book.id} className="flex items-center gap-3 px-4 py-3.5"
                    style={selected.has(book.id) ? { background: C.brandTint } : undefined}>
                    {isHead && (
                      <input type="checkbox" aria-label={`Select ${book.title}`} checked={selected.has(book.id)}
                        onChange={() => toggleOne(book.id)} className="w-4 h-4 shrink-0" style={{ accentColor: C.brand }} />
                    )}
                    <button onClick={() => setBookDetail(book)} className="flex-1 min-w-0 text-left active:opacity-70">
                      <p className="text-sm font-bold truncate" style={{ color: C.ink }}>{book.title}</p>
                      <p className="text-[11px] font-mono font-bold mt-0.5" style={{ color: C.brand }}>{book.accessionNo}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <CategoryBadge category={book.category} />
                        <Availability book={book} compact />
                      </div>
                    </button>
                    {isHead ? (
                      <button onClick={e => openRowMenu(e, book.id)} aria-label={`Actions for ${book.title}`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 shrink-0">
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

      {/* Row action menu */}
      {rowMenu && menuBook && (
        <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)}>
          <div role="menu" className="absolute w-44 bg-white rounded-xl border shadow-lg py-1 overflow-hidden"
            style={{ top: rowMenu.y, left: Math.max(8, rowMenu.x - 176), borderColor: C.line, fontFamily: FONT }}
            onClick={e => e.stopPropagation()}>
            <button role="menuitem" onClick={() => { setRowMenu(null); setBookDetail(menuBook); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-gray-50" style={{ color: C.ink }}>
              <BookOpen size={14} /> View details
            </button>
            <button role="menuitem" onClick={() => { setRowMenu(null); setEditBook(menuBook); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-gray-50" style={{ color: C.ink }}>
              <Pencil size={14} /> Edit
            </button>
            <button role="menuitem" onClick={() => { setRowMenu(null); setDeleteTarget([menuBook.id]); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-red-50" style={{ color: C.danger }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showExport && (
        <ExportModal books={books} catFilter={catTab} availFilter={availFilter} yearFrom={yearFrom} yearTo={yearTo}
          onClose={() => setShowExport(false)} />
      )}
      {showBarcodes && (
        <PrintBarcodesModal courseId={courseId} books={books} catFilter={catTab} selectedIds={selected}
          onClose={() => setShowBarcodes(false)} />
      )}
      {bookDetail && (
        <BookDetailModal book={bookDetail} courseId={courseId} isHead={isHead}
          onClose={() => setBookDetail(null)}
          onEdit={() => setEditBook(bookDetail)}
          onDelete={() => setDeleteTarget([bookDetail.id])} />
      )}
      {showAdd && (
        <BookModal courseId={courseId} book={null} onClose={() => setShowAdd(false)}
          onSaved={b => { setBooks(prev => [b, ...prev]); setShowAdd(false); notify("Book added"); }} />
      )}
      {editBook && (
        <BookModal courseId={courseId} book={editBook} onClose={() => setEditBook(null)}
          onSaved={b => { setBooks(prev => prev.map(x => (x.id === b.id ? b : x))); setEditBook(null); notify("Book updated"); }} />
      )}
      {deleteTarget && (
        <ConfirmModal
          title={deleteTarget.length === 1 ? "Delete this book?" : `Delete ${deleteTarget.length} books?`}
          confirmLabel={deleteTarget.length === 1 ? "Delete" : `Delete ${deleteTarget.length}`}
          busy={deleting}
          message={
            deleteTarget.length === 1 ? (
              <><strong>{books.find(b => b.id === deleteTarget[0])?.title ?? "This book"}</strong> will be permanently removed.<br />This can’t be undone.</>
            ) : (
              <>{deleteTarget.length} selected books will be permanently removed.<br />This can’t be undone.</>
            )
          }
          onConfirm={() => deleteIds(deleteTarget)}
          onClose={() => { if (!deleting) setDeleteTarget(null); }} />
      )}

      <Toast toast={toast} />
    </div>
  );
}