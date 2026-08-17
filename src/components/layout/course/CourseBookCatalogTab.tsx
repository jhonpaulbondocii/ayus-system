"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Search, Filter, BookOpen, Edit2, Trash2,
  X, Check, ChevronDown, Download, RefreshCw, BookMarked,
} from "lucide-react";

const MAROON = "#7b1113";
const SLATE  = "#0f172a";
const MUTED  = "#64748b";
const RULE   = "#e2e8f0";
const FONT   = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";

const CATEGORIES = ["Filipiniana", "Circulation", "Reserved", "General References"] as const;
type Category = typeof CATEGORIES[number];

const CAT_COLORS: Record<Category, { bg: string; text: string; border: string }> = {
  "Filipiniana":        { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
  "Circulation":        { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
  "Reserved":           { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
  "General References": { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
};

interface LibraryBook {
  id:             string;
  accessionNo:    string;
  callNumber:     string | null;
  isbn:           string | null;
  title:          string;
  author:         string | null;
  publisher:      string | null;
  copyrightYear:  string | null;
  edition:        string | null;
  pages:          number | null;
  volume:         string | null;
  category:       string;
  location:       string | null; // keep in interface for backward compat, just hidden in UI
  totalCopies:    number;
  availableCopies:number;
  coverUrl:       string | null;
  createdAt:      string;
  _count:         { borrowRecords: number };
}

interface Stat {
  category:    string;
  _count:      { id: number };
  _sum:        { totalCopies: number | null; availableCopies: number | null };
}

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm outline-none transition-all bg-white"
  + " focus:ring-2 focus:ring-[#7b1113]/10 focus:border-[#7b1113] placeholder:text-gray-400";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function AuthorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [input, setInput] = useState("");
  const tags = value ? value.split("|").map(s => s.trim()).filter(Boolean) : [];

  const addTag = () => {
    const trimmed = input.trim().replace(/,+$/, "").trim();
    if (!trimmed) return;
    const next = [...tags, trimmed];
    onChange(next.join(" | "));
    setInput("");
  };

  const removeTag = (i: number) => {
    const next = tags.filter((_, idx) => idx !== i);
    onChange(next.join(" | "));
  };

  return (
    <div className="w-full border rounded-lg px-2 py-1.5 bg-white focus-within:ring-2 focus-within:ring-[#7b1113]/10 focus-within:border-[#7b1113] transition-all flex flex-wrap gap-1.5 min-h-[38px]"
      style={{ borderColor: RULE }}>
      {tags.map((t, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "#fef2f2", color: MAROON, border: "1px solid #e5d0d0" }}>
          {t}
          <button type="button" onClick={() => removeTag(i)} className="hover:opacity-70 leading-none">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
          if (e.key === "Backspace" && !input && tags.length) removeTag(tags.length - 1);
        }}
        onBlur={addTag}
        placeholder={tags.length === 0 ? "Type name, press Enter or comma to add" : "Add another..."}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-gray-400"
        style={{ fontSize: 13 }}
      />
    </div>
  );
}

/* ── Add / Edit Modal ── */
function BookModal({
  courseId, book, onClose, onSaved,
}: {
  courseId: string;
  book:     LibraryBook | null;
  onClose:  () => void;
  onSaved:  (b: LibraryBook) => void;
}) {
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
  const [location,      setLocation]      = useState(book?.location      ?? "");
  const [totalCopies,   setTotalCopies]   = useState(book?.totalCopies?.toString() ?? "1");

  const handleSave = async () => {
    setError(""); setSaving(true);
    try {
      const url    = isEdit
        ? `/api/courses/${courseId}/library-books/${book!.id}`
        : `/api/courses/${courseId}/library-books`;
      const method = isEdit ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessionNo, callNumber, isbn, title, author,
          publisher, copyrightYear, edition,
          pages:      pages || null,
          volume, category, location,
          totalCopies: parseInt(totalCopies) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      onSaved(data.book);
    } catch { setError("Network error."); }
    finally  { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
        style={{ border: `1px solid ${RULE}` }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: RULE }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#fef2f2" }}>
              <BookOpen size={16} style={{ color: MAROON }} />
            </div>
            <p className="text-sm font-bold" style={{ color: SLATE }}>
              {isEdit ? "Edit Book" : "Add New Book"}
            </p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={15} style={{ color: MUTED }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Accession No." required>
              <input value={accessionNo} onChange={e => setAccessionNo(e.target.value)}
                placeholder="e.g. 001234" className={inputCls}
                style={{ borderColor: RULE }} />
            </Field>
            <Field label="Call Number">
              <input value={callNumber} onChange={e => setCallNumber(e.target.value)}
                placeholder="e.g. 808.3 M32" className={inputCls}
                style={{ borderColor: RULE }} />
            </Field>
          </div>

          <Field label="Title" required>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Book title" className={inputCls}
              style={{ borderColor: RULE }} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Author (multiple, press Enter or comma to add)">
              <AuthorInput value={author} onChange={setAuthor} />
            </Field>
            <Field label="Publisher">
              <input value={publisher} onChange={e => setPublisher(e.target.value)}
                placeholder="Publisher" className={inputCls}
                style={{ borderColor: RULE }} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Copyright Year">
              <input value={copyrightYear} onChange={e => setCopyrightYear(e.target.value)}
                placeholder="e.g. 2023" className={inputCls}
                style={{ borderColor: RULE }} />
            </Field>
            <Field label="Edition (optional)">
              <input value={edition} onChange={e => setEdition(e.target.value)}
                placeholder="e.g. 3rd" className={inputCls}
                style={{ borderColor: RULE }} />
            </Field>
            <Field label="Volume (optional)">
              <input value={volume} onChange={e => setVolume(e.target.value)}
                placeholder="e.g. Vol. 1" className={inputCls}
                style={{ borderColor: RULE }} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Category" required>
              <div className="relative">
                <select value={category} onChange={e => setCategory(e.target.value as Category)}
                  className={inputCls} style={{ borderColor: RULE, appearance: "none" }}>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: MUTED }} />
              </div>
            </Field>
            <Field label="No. of Copies">
              <input type="number" min="1" value={totalCopies}
                onChange={e => setTotalCopies(e.target.value)}
                className={inputCls} style={{ borderColor: RULE }} />
            </Field>
            <Field label="ISBN">
              <input value={isbn} onChange={e => setIsbn(e.target.value)}
                placeholder="ISBN" className={inputCls}
                style={{ borderColor: RULE }} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Field label="Pages">
              <input type="number" min="1" value={pages}
                onChange={e => setPages(e.target.value)}
                placeholder="No. of pages" className={inputCls}
                style={{ borderColor: RULE }} />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t" style={{ borderColor: RULE }}>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
            style={{ border: `1px solid ${RULE}`, color: MUTED }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
            style={{ background: MAROON }}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Book"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function CourseBookCatalogTab({
  courseId, isHead,
}: {
  courseId: string;
  isHead:   boolean;
}) {
  const [books,    setBooks]    = useState<LibraryBook[]>([]);
  const [stats,    setStats]    = useState<Stat[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [catFilter,setCatFilter]= useState("");
  const [showAdd,  setShowAdd]  = useState(false);
  const [editBook, setEditBook] = useState<LibraryBook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibraryBook | null>(null);
  const [deleting,         setDeleting]         = useState(false);
  const [showExportModal,    setShowExportModal]    = useState(false);
  const [showBarcodeModal,   setShowBarcodeModal]   = useState(false);
  const [selectMode,         setSelectMode]         = useState(false);
  const [selectedIds,        setSelectedIds]        = useState<Set<string>>(new Set());
  const [bulkDeleting,       setBulkDeleting]       = useState(false);
  const [bookDetail,         setBookDetail]         = useState<LibraryBook | null>(null);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [searchInput,    setSearchInput]    = useState("");
  const [showFilters,    setShowFilters]    = useState(false);
  const [availFilter,    setAvailFilter]    = useState<"" | "AVAILABLE" | "OUT_OF_STOCK">("");
  const [yearFrom,       setYearFrom]       = useState("");
  const [yearTo,         setYearTo]         = useState("");

  const LOCATIONS = [
    "Shelf A", "Shelf B", "Shelf C", "Shelf D",
    "Mezzanine", "Storage",
    "Reference Section", "Stack Room", "Periodicals", "Special Collection",
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)    params.set("search",   search);
      if (catFilter) params.set("category", catFilter);
      const res  = await fetch(`/api/courses/${courseId}/library-books?${params}`);
      const data = await res.json();
      setBooks(data.books ?? []);
      setStats(data.stats ?? []);
    } catch { /* ignore */ }
    finally  { setLoading(false); }
  }, [courseId, search, catFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(val), 400);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/courses/${courseId}/library-books/${deleteTarget.id}`, { method: "DELETE" });
      setBooks(prev => prev.filter(b => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { /* ignore */ }
    finally  { setDeleting(false); }
  };

  const doExportCSV = (booksToExport: LibraryBook[]) => {
    const header = ["Accession No.","Call Number","Title","Author","Publisher","Copyright Year","Edition","Volume","Category","Location","Total Copies","Available","ISBN"];
    const rows   = booksToExport.map(b => [
      b.accessionNo, b.callNumber ?? "", b.title, b.author ?? "",
      b.publisher ?? "", b.copyrightYear ?? "", b.edition ?? "",
      b.volume ?? "", b.category, b.location ?? "",
      b.totalCopies, b.availableCopies, b.isbn ?? "",
    ]);
    const csv  = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url;
    a.download = `book-catalog-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Book Detail Modal ── */
  const BookDetailModal = ({ book, onClose }: { book: LibraryBook; onClose: () => void }) => {
    const [barcodeUrl, setBarcodeUrl] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
      // Generate single barcode preview via bwip-js API
      const url = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(book.accessionNo)}&scale=5&height=12&includetext=false&backgroundcolor=ffffff`;
      setBarcodeUrl(url);
    }, [book.accessionNo]);

    const handlePrintSingle = async () => {
      setGenerating(true);
      try {
        const q = new URLSearchParams({ accessionNos: book.accessionNo });
        const res = await fetch(`/api/courses/${courseId}/library-books/print-barcodes?${q}`);
        if (!res.ok) return;
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        window.open(url);
      } catch { /* ignore */ }
      finally  { setGenerating(false); }
    };

    const col = CAT_COLORS[book.category as Category] ?? { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        style={{ backdropFilter: "blur(4px)", fontFamily: FONT }} onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
          style={{ border: `1px solid ${RULE}` }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background: MAROON }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <BookOpen size={15} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Book</p>
                <p className="text-sm font-black text-white truncate max-w-[200px]">{book.title}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10">
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-4">
            {/* Book info */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>Accession No.</span>
                <span className="text-xs font-black font-mono" style={{ color: MAROON }}>{book.accessionNo}</span>
              </div>
              {book.callNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>Call No.</span>
                  <span className="text-xs font-semibold text-gray-700">{book.callNumber}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>Category</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
                  {book.category}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>Copies</span>
                <span className="text-xs font-semibold text-gray-700">{book.availableCopies} / {book.totalCopies} available</span>
              </div>
            </div>

            {/* Barcode preview */}
            <div className="rounded-xl border p-4 flex flex-col items-center gap-2" style={{ borderColor: RULE, background: "#fafafa" }}>
              <p className="text-[10px] font-black uppercase tracking-widest self-start" style={{ color: MUTED }}>Barcode Preview</p>
              {barcodeUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={barcodeUrl} alt="barcode" className="w-full max-h-32 object-contain" />
                : <div className="w-full h-14 bg-gray-100 rounded animate-pulse" />}
              <p className="text-xs font-black font-mono text-gray-700">{book.accessionNo}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: RULE, background: "#f9fafb" }}>
            <button onClick={onClose}
              className="flex-1 h-10 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              style={{ borderColor: RULE }}>
              Close
            </button>
            <button onClick={handlePrintSingle} disabled={generating}
              className="flex-1 h-10 rounded-xl text-xs font-black text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: MAROON }}>
              {generating
                ? <><RefreshCw size={13} className="animate-spin" /> Generating...</>
                : <><BookMarked size={13} /> Print Barcode</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ── Print Barcodes Modal ── */
  const PrintBarcodesModal = () => {
    const [generating,    setGenerating]    = useState(false);
    const [pdfUrl,        setPdfUrl]        = useState<string | null>(null);
    const [error,         setError]         = useState("");
    const [printCatFilter, setPrintCatFilter] = useState(catFilter);

    const isFromSelection = selectMode && selectedIds.size > 0;
    const previewCount = isFromSelection
      ? selectedIds.size
      : books.filter(b => !printCatFilter || b.category === printCatFilter).length;

    const generate = async () => {
      setGenerating(true); setError(""); setPdfUrl(null);
      try {
        const q = new URLSearchParams();
        if (isFromSelection) {
          q.set("accessionNos", [...selectedIds].map(id => books.find(b => b.id === id)?.accessionNo ?? "").filter(Boolean).join(","));
        } else if (printCatFilter) {
          q.set("category", printCatFilter);
        }
        const res = await fetch(`/api/courses/${courseId}/library-books/print-barcodes?${q}`);
        if (!res.ok) { setError("Failed to generate PDF."); return; }
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch { setError("Network error."); }
      finally   { setGenerating(false); }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
        style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
        onClick={() => { setShowBarcodeModal(false); if (pdfUrl) URL.revokeObjectURL(pdfUrl); }}>
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[520px] overflow-hidden"
          style={{ border: `1px solid ${RULE}` }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background: MAROON }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <BookMarked size={15} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Library</p>
                <p className="text-sm font-black text-white">Print Barcode Labels</p>
              </div>
            </div>
            <button onClick={() => { setShowBarcodeModal(false); if (pdfUrl) URL.revokeObjectURL(pdfUrl); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10">
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-4">

            {/* Category filter */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MUTED }}>Category</p>
              <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: RULE }}>
                {([["", "All"], ...CATEGORIES.map(c => [c, c])] as [string, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => { setPrintCatFilter(val); setPdfUrl(null); }}
                    className="flex-1 px-2 py-1.5 text-[10px] font-bold transition-all truncate"
                    style={printCatFilter === val
                      ? { background: MAROON, color: "#fff" }
                      : { color: MUTED, background: "#fff" }}>
                    {label === "General References" ? "Gen. Ref." : label}
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="rounded-lg border px-4 py-3 space-y-1" style={{ background: "#f8fafc", borderColor: RULE }}>
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <span className="font-black text-gray-800 text-sm">{previewCount}</span>
                book{previewCount !== 1 ? "s" : ""} · {Math.ceil(previewCount / 24)} page{Math.ceil(previewCount / 24) !== 1 ? "s" : ""}
                <span style={{ color: MUTED }}>· 3 columns × 8 rows per page</span>
              </p>
              <p className="text-[10px]" style={{ color: MUTED }}>Each label includes barcode + accession no. + title.</p>
            </div>

            {error && (
              <p className="text-xs text-red-500 font-semibold">{error}</p>
            )}

            {/* PDF Preview */}
            {pdfUrl && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: RULE }}>
                <iframe src={pdfUrl} className="w-full" style={{ height: 320 }} title="Barcode Preview" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: RULE, background: "#f9fafb" }}>
            <button onClick={() => { setShowBarcodeModal(false); if (pdfUrl) URL.revokeObjectURL(pdfUrl); }}
              className="flex-1 h-10 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              style={{ borderColor: RULE }}>
              Close
            </button>
            {pdfUrl ? (
              <a href={pdfUrl} download="barcodes.pdf"
                className="flex-1 h-10 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5"
                style={{ background: MAROON }}>
                <Download size={13} /> Download PDF
              </a>
            ) : (
              <button onClick={generate} disabled={generating || previewCount === 0}
                className="flex-1 h-10 rounded-xl text-xs font-black text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: MAROON }}>
                {generating
                  ? <><RefreshCw size={13} className="animate-spin" /> Generating...</>
                  : <><BookMarked size={13} /> Generate PDF</>}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ── Export Modal ── */
  const ExportModal = () => {
    const [exporting,       setExporting]       = useState(false);
    const [expCatFilter,    setExpCatFilter]    = useState(catFilter);
    const [expAvailFilter,  setExpAvailFilter]  = useState(availFilter);
    const [expYearFrom,     setExpYearFrom]     = useState(yearFrom);
    const [expYearTo,       setExpYearTo]       = useState(yearTo);
    const [expSearch,       setExpSearch]       = useState(search);

    const exportPreview = books.filter(b => {
      if (expAvailFilter === "AVAILABLE"    && b.availableCopies === 0) return false;
      if (expAvailFilter === "OUT_OF_STOCK" && b.availableCopies  > 0)  return false;
      if (expYearFrom && parseInt(b.copyrightYear ?? "0")    < parseInt(expYearFrom)) return false;
      if (expYearTo   && parseInt(b.copyrightYear ?? "9999") > parseInt(expYearTo))   return false;
      if (expCatFilter && b.category !== expCatFilter)                    return false;
      if (expSearch) {
        const q = expSearch.toLowerCase();
        if (
          !b.title.toLowerCase().includes(q) &&
          !(b.author ?? "").toLowerCase().includes(q) &&
          !b.accessionNo.toLowerCase().includes(q) &&
          !(b.callNumber ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    const handleExport = () => {
      setExporting(true);
      setTimeout(() => {
        doExportCSV(exportPreview);
        setExporting(false);
        setShowExportModal(false);
      }, 300);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
        style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
        onClick={() => setShowExportModal(false)}>
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[460px] overflow-hidden"
          style={{ border: `1px solid ${RULE}` }}
          onClick={e => e.stopPropagation()}>

          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background: MAROON }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Download size={15} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Library</p>
                <p className="text-sm font-black text-white">Export Book Catalog</p>
              </div>
            </div>
            <button onClick={() => setShowExportModal(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-4">

            {/* Category */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MUTED }}>Category</p>
              <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: RULE }}>
                {([["", "All"], ...CATEGORIES.map(c => [c, c])] as [string, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => setExpCatFilter(val)}
                    className="flex-1 px-2 py-1.5 text-[10px] font-bold transition-all truncate"
                    style={expCatFilter === val
                      ? { background: MAROON, color: "#fff" }
                      : { color: MUTED, background: "#fff" }}>
                    {label === "General References" ? "Gen. Ref." : label}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MUTED }}>Availability</p>
              <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: RULE }}>
                {([["", "All"], ["AVAILABLE", "Available"], ["OUT_OF_STOCK", "Out of Stock"]] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setExpAvailFilter(val)}
                    className="flex-1 px-3 py-1.5 text-[10px] font-bold transition-all"
                    style={expAvailFilter === val
                      ? { background: MAROON, color: "#fff" }
                      : { color: MUTED, background: "#fff" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Copyright Year */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MUTED }}>Copyright Year</p>
              <div className="flex items-center gap-2">
                <input type="number" value={expYearFrom} onChange={e => setExpYearFrom(e.target.value)}
                  placeholder="From" min="1900" max="2099"
                  className="flex-1 text-xs border rounded-lg px-3 py-2 bg-white outline-none"
                  style={{ borderColor: RULE }} />
                <span className="text-xs shrink-0" style={{ color: MUTED }}>to</span>
                <input type="number" value={expYearTo} onChange={e => setExpYearTo(e.target.value)}
                  placeholder="To" min="1900" max="2099"
                  className="flex-1 text-xs border rounded-lg px-3 py-2 bg-white outline-none"
                  style={{ borderColor: RULE }} />
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {[
                  { label: "Pre-2000", fn: () => { setExpYearFrom("1900"); setExpYearTo("1999"); } },
                  { label: "2000s",    fn: () => { setExpYearFrom("2000"); setExpYearTo("2009"); } },
                  { label: "2010s",    fn: () => { setExpYearFrom("2010"); setExpYearTo("2019"); } },
                  { label: "2020s",    fn: () => { setExpYearFrom("2020"); setExpYearTo(new Date().getFullYear().toString()); } },
                ].map(p => (
                  <button key={p.label} onClick={p.fn}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border transition-all"
                    style={{ borderColor: RULE, color: MUTED }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview count */}
            <div className="rounded-lg border px-4 py-3" style={{ background: "#f8fafc", borderColor: RULE }}>
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <span className="font-black text-gray-800 text-sm">{exportPreview.length}</span>
                book{exportPreview.length !== 1 ? "s" : ""} will be exported
                {exportPreview.length < books.length && (
                  <span style={{ color: MUTED }}>· filtered from {books.length} total</span>
                )}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: RULE, background: "#f9fafb" }}>
            <button onClick={() => setShowExportModal(false)}
              className="flex-1 h-10 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all"
              style={{ borderColor: RULE }}>
              Cancel
            </button>
            <button onClick={handleExport} disabled={exporting || exportPreview.length === 0}
              className="flex-1 h-10 rounded-xl text-xs font-black text-white disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
              style={{ background: MAROON }}>
              {exporting
                ? <><RefreshCw size={13} className="animate-spin" /> Exporting...</>
                : <><Download size={13} /> Export {exportPreview.length} Book{exportPreview.length !== 1 ? "s" : ""}</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Client-side filters on top of server results
  const filteredBooks = books.filter(b => {
    if (availFilter === "AVAILABLE"    && b.availableCopies === 0) return false;
    if (availFilter === "OUT_OF_STOCK" && b.availableCopies  > 0)  return false;
    if (yearFrom && parseInt(b.copyrightYear ?? "0") < parseInt(yearFrom)) return false;
    if (yearTo   && parseInt(b.copyrightYear ?? "9999") > parseInt(yearTo))  return false;
    return true;
  });

  const hasActiveFilter = !!(availFilter || catFilter || yearFrom || yearTo);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBooks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBooks.map(b => b.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} book(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        [...selectedIds].map(id =>
          fetch(`/api/courses/${courseId}/library-books/${id}`, { method: "DELETE" })
        )
      );
      setBooks(prev => prev.filter(b => !selectedIds.has(b.id)));
      exitSelectMode();
    } catch { /* ignore */ }
    finally  { setBulkDeleting(false); }
  };

  const doExportCSVSelected = () => {
    const selected = filteredBooks.filter(b => selectedIds.has(b.id));
    doExportCSV(selected);
  };

  // Total stats
  const totalBooks    = stats.reduce((s, x) => s + (x._sum.totalCopies ?? 0), 0);
  const totalTitles   = books.length;
  const totalBorrowed = books.reduce((s, b) => s + (b._count?.borrowRecords ?? 0), 0);

  return (
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5" style={{ color: MAROON }}>Library</p>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">Book Catalog</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => selectMode && selectedIds.size > 0 ? doExportCSVSelected() : setShowExportModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{selectMode && selectedIds.size > 0 ? `Export (${selectedIds.size})` : "Export CSV"}</span>
          </button>
          <button onClick={() => setShowBarcodeModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all">
            <BookMarked className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{selectMode && selectedIds.size > 0 ? `Barcodes (${selectedIds.size})` : "Print Barcodes"}</span>
          </button>
          {isHead && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-1.5 rounded-lg text-white transition-all"
              style={{ background: MAROON }}>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Book</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Titles",   value: totalTitles },
            { label: "Total Copies",   value: totalBooks },
            { label: "Times Borrowed", value: totalBorrowed },
            { label: "Categories",     value: CATEGORIES.length },
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

          {/* Bulk actions bar */}
          {selectMode && selectedIds.size > 0 && (
            <div className="px-4 sm:px-5 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-700">{selectedIds.size} selected</span>
              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                <button onClick={handleBulkDelete} disabled={bulkDeleting}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-all">
                  <Trash2 size={12} /> {bulkDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
                </button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            {!selectMode ? (
              <>
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 sm:flex-none sm:w-64 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
                  <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <input value={searchInput} onChange={e => handleSearchInput(e.target.value)}
                    placeholder="Search title, author, accession no.…"
                    className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
                  {searchInput && <button onClick={() => handleSearchInput("")} className="text-gray-300 hover:text-gray-500"><X className="w-3 h-3" /></button>}
                </div>
                <button onClick={() => setShowFilters(f => !f)}
                  style={(showFilters || hasActiveFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0 ${!(showFilters || hasActiveFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400" : ""}`}>
                  <Filter className="w-3 h-3" />
                  <span className="hidden sm:inline">Filters</span>
                  {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70" />}
                </button>
                {isHead && (
                  <button onClick={() => setSelectMode(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold border-gray-200 text-gray-500 hover:border-gray-400 transition-all shrink-0">
                    <Check size={12} /> Select
                  </button>
                )}
              </>
            ) : (
              <>
                <input type="checkbox"
                  checked={selectedIds.size === filteredBooks.length && filteredBooks.length > 0}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 accent-[#7b1113] cursor-pointer" />
                <span className="text-xs text-gray-500 font-medium">
                  {selectedIds.size === filteredBooks.length && filteredBooks.length > 0 ? "Deselect all" : "Select all"}
                </span>
                <button onClick={exitSelectMode}
                  className="ml-auto flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all">
                  <X size={12} /> Cancel
                </button>
              </>
            )}
          </div>

          {showFilters && (
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-2.5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Availability</span>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  {([["", "All"], ["AVAILABLE", "Available"], ["OUT_OF_STOCK", "Out of Stock"]] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setAvailFilter(val)}
                      className="px-3 py-1.5 text-xs font-bold transition-all"
                      style={availFilter === val ? { background: MAROON, color: "#fff" } : { color: MUTED, background: "#fff" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Category</span>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  {([["", "All"], ...CATEGORIES.map(c => [c, c])] as [string, string][]).map(([val, label]) => (
                    <button key={val} onClick={() => setCatFilter(val)}
                      className="px-3 py-1.5 text-xs font-bold transition-all"
                      style={catFilter === val ? { background: MAROON, color: "#fff" } : { color: MUTED, background: "#fff" }}>
                      {label === "General References" ? "Gen. Ref." : label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Year</span>
                <div className="flex items-center gap-2">
                  <input type="number" value={yearFrom} onChange={e => setYearFrom(e.target.value)}
                    placeholder="From" min="1900" max="2099"
                    className="w-24 text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none" />
                  <span className="text-xs text-gray-400">to</span>
                  <input type="number" value={yearTo} onChange={e => setYearTo(e.target.value)}
                    placeholder="To" min="1900" max="2099"
                    className="w-24 text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "Pre-2000", fn: () => { setYearFrom("1900"); setYearTo("1999"); } },
                    { label: "2000s",    fn: () => { setYearFrom("2000"); setYearTo("2009"); } },
                    { label: "2010s",    fn: () => { setYearFrom("2010"); setYearTo("2019"); } },
                    { label: "2020s",    fn: () => { setYearFrom("2020"); setYearTo(new Date().getFullYear().toString()); } },
                  ].map(p => (
                    <button key={p.label} onClick={p.fn}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {hasActiveFilter && (
                <button onClick={() => { setAvailFilter(""); setCatFilter(""); setYearFrom(""); setYearTo(""); }}
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
          ) : filteredBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                <BookOpen className="w-6 h-6" style={{ color: MAROON }} />
              </div>
              <p className="text-sm text-gray-400 font-medium">
                {search || catFilter || hasActiveFilter ? "No books match your filters." : "No books yet. Add your first book!"}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse hidden sm:table">
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {selectMode && <th className="px-3 py-3 w-8" style={{ border: "1px solid #d1d5db" }} />}
                    {["Accession No.", "Call No.", "Title", "Author", "Category", "Copies", "Available", ""].map((h, i) => (
                      <th key={i} className="text-left px-3 py-3 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-700">{h}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book, i) => {
                    const col = CAT_COLORS[book.category as Category] ?? { bg: "#f1f5f9", text: MUTED, border: RULE };
                    return (
                      <tr key={book.id}
                        className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                        style={{ borderBottom: "1px solid #d1d5db", background: selectedIds.has(book.id) ? "#fef2f2" : undefined }}
                        onClick={() => selectMode ? toggleSelect(book.id) : setBookDetail(book)}>
                        {selectMode && (
                          <td className="px-3 py-3 w-8" style={{ border: "1px solid #d1d5db" }}
                            onClick={e => { e.stopPropagation(); toggleSelect(book.id); }}>
                            <input type="checkbox" checked={selectedIds.has(book.id)} onChange={() => toggleSelect(book.id)}
                              className="w-3.5 h-3.5 accent-[#7b1113] cursor-pointer" />
                          </td>
                        )}
                        <td className="px-3 py-3 text-xs font-mono font-bold" style={{ border: "1px solid #d1d5db", color: MAROON }}>
                          {book.accessionNo}
                        </td>
                        <td className="px-3 py-3 text-xs" style={{ border: "1px solid #d1d5db", color: MUTED }}>
                          {book.callNumber ?? "—"}
                        </td>
                        <td className="px-3 py-3 max-w-[220px]" style={{ border: "1px solid #d1d5db" }}>
                          <p className="text-xs font-semibold truncate text-gray-800">{book.title}</p>
                          {book.copyrightYear && <p className="text-[10px] text-gray-400">{book.copyrightYear}</p>}
                        </td>
                        <td className="px-3 py-3 max-w-[160px]" style={{ border: "1px solid #d1d5db" }}>
                          {book.author
                            ? book.author.split("|").map(a => a.trim()).filter(Boolean).map((a, idx) => (
                                <span key={idx} className="block text-xs truncate text-gray-500">{a}</span>
                              ))
                            : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-3" style={{ border: "1px solid #d1d5db" }}>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
                            {book.category}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-bold text-gray-800" style={{ border: "1px solid #d1d5db" }}>
                          {book.totalCopies}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-bold" style={{ border: "1px solid #d1d5db", color: book.availableCopies === 0 ? "#ef4444" : "#16a34a" }}>
                          {book.availableCopies}
                        </td>
                        <td className="px-3 py-3" style={{ border: "1px solid #d1d5db" }}
                          onClick={e => e.stopPropagation()}>
                          {isHead && !selectMode && (
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => setEditBook(book)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
                                <Edit2 size={12} style={{ color: MUTED }} />
                              </button>
                              <button onClick={() => setDeleteTarget(book)} className="p-1.5 rounded-lg hover:bg-red-50 transition-all">
                                <Trash2 size={12} className="text-red-400" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="sm:hidden p-3 space-y-2">
                {filteredBooks.map(book => {
                  const col = CAT_COLORS[book.category as Category] ?? { bg: "#f1f5f9", text: MUTED, border: RULE };
                  return (
                    <div key={book.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{book.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{book.accessionNo}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
                          {book.category}
                        </span>
                      </div>
                      {book.author && (
                        <p className="text-xs text-gray-500 truncate mt-1">{book.author.split("|")[0].trim()}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] text-gray-400">{book.totalCopies} copies</span>
                        <span className="text-[11px] font-semibold" style={{ color: book.availableCopies === 0 ? "#ef4444" : "#16a34a" }}>
                          {book.availableCopies} available
                        </span>
                        {isHead && (
                          <div className="flex items-center gap-1 ml-auto">
                            <button onClick={() => setEditBook(book)} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit2 size={12} style={{ color: MUTED }} /></button>
                            <button onClick={() => setDeleteTarget(book)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={12} className="text-red-400" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && <ExportModal />}

      {/* Print Barcodes Modal */}
      {showBarcodeModal && <PrintBarcodesModal />}

      {/* Book Detail Modal */}
      {bookDetail && <BookDetailModal book={bookDetail} onClose={() => setBookDetail(null)} />}

      {/* Add Modal */}
      {showAdd && (
        <BookModal courseId={courseId} book={null}
          onClose={() => setShowAdd(false)}
          onSaved={b => { setBooks(prev => [b, ...prev]); setShowAdd(false); }} />
      )}

      {/* Edit Modal */}
      {editBook && (
        <BookModal courseId={courseId} book={editBook}
          onClose={() => setEditBook(null)}
          onSaved={b => { setBooks(prev => prev.map(x => x.id === b.id ? b : x)); setEditBook(null); }} />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
          onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-6"
            style={{ border: `1px solid ${RULE}` }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
              <Trash2 size={18} className="text-red-400" />
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: SLATE }}>Delete this book?</p>
            <p className="text-xs mb-4" style={{ color: MUTED }}>
              <span className="font-semibold">{deleteTarget.title}</span> will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{ border: `1px solid ${RULE}`, color: MUTED }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 disabled:opacity-50">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}