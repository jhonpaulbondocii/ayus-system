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
const FONT   = "'Inter', system-ui, sans-serif";

const CATEGORIES = ["Filipiniana", "Circulation", "Reserved", "General References"] as const;
type Category = typeof CATEGORIES[number];

const CAT_COLORS: Record<Category, { bg: string; text: string; border: string }> = {
  "Filipiniana":        { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  "Circulation":        { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  "Reserved":           { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" },
  "General References": { bg: "#dcfce7", text: "#14532d", border: "#bbf7d0" },
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
  location:       string | null;
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
            <Field label="Author">
              <input value={author} onChange={e => setAuthor(e.target.value)}
                placeholder="Author name" className={inputCls}
                style={{ borderColor: RULE }} />
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
            <Field label="Edition">
              <input value={edition} onChange={e => setEdition(e.target.value)}
                placeholder="e.g. 3rd" className={inputCls}
                style={{ borderColor: RULE }} />
            </Field>
            <Field label="Volume">
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Location / Section">
              <input value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Shelf A-3" className={inputCls}
                style={{ borderColor: RULE }} />
            </Field>
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
  const [showExportModal,  setShowExportModal]  = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [searchInput,    setSearchInput]    = useState("");
  const [showFilters,    setShowFilters]    = useState(false);
  const [availFilter,    setAvailFilter]    = useState<"" | "AVAILABLE" | "OUT_OF_STOCK">("");
  const [locationFilter, setLocationFilter] = useState("");
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

  /* ── Export Modal ── */
  const ExportModal = () => {
    const [exporting,       setExporting]       = useState(false);
    const [expCatFilter,    setExpCatFilter]    = useState(catFilter);
    const [expAvailFilter,  setExpAvailFilter]  = useState(availFilter);
    const [expLocationFilter, setExpLocationFilter] = useState(locationFilter);
    const [expYearFrom,     setExpYearFrom]     = useState(yearFrom);
    const [expYearTo,       setExpYearTo]       = useState(yearTo);
    const [expSearch,       setExpSearch]       = useState(search);

    const exportPreview = books.filter(b => {
      if (expAvailFilter === "AVAILABLE"    && b.availableCopies === 0) return false;
      if (expAvailFilter === "OUT_OF_STOCK" && b.availableCopies  > 0)  return false;
      if (expLocationFilter && b.location !== expLocationFilter)          return false;
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

            {/* Section */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MUTED }}>Section</p>
              <div className="relative">
                <select value={expLocationFilter} onChange={e => setExpLocationFilter(e.target.value)}
                  className="w-full text-xs border rounded-lg pl-3 pr-7 py-2 bg-white outline-none appearance-none"
                  style={{ borderColor: RULE, color: SLATE }}>
                  <option value="">All Sections</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: MUTED }} />
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
    if (locationFilter && b.location !== locationFilter)            return false;
    if (yearFrom && parseInt(b.copyrightYear ?? "0") < parseInt(yearFrom)) return false;
    if (yearTo   && parseInt(b.copyrightYear ?? "9999") > parseInt(yearTo))  return false;
    return true;
  });

  const hasActiveFilter = !!(availFilter || locationFilter || yearFrom || yearTo);

  // Total stats
  const totalBooks    = stats.reduce((s, x) => s + (x._sum.totalCopies ?? 0), 0);
  const totalTitles   = books.length;
  const totalBorrowed = books.reduce((s, b) => s + (b._count?.borrowRecords ?? 0), 0);

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT, background: "#f8fafc" }}>

      {/* Header */}
      <div className="px-6 py-4 border-b bg-white shrink-0" style={{ borderColor: RULE }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: MAROON }}>Library</p>
            <h1 className="text-lg font-black" style={{ color: SLATE }}>Book Catalog</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-all"
              style={{ borderColor: RULE, color: MUTED }}>
              <Download size={13} /> Export CSV
            </button>
            {isHead && (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg text-white transition-all"
                style={{ background: MAROON }}>
                <Plus size={13} /> Add Book
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Total Titles",   value: totalTitles,   icon: BookOpen },
            { label: "Total Copies",   value: totalBooks,    icon: BookMarked },
            { label: "Times Borrowed", value: totalBorrowed, icon: RefreshCw },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border p-3 flex items-center gap-3 bg-white"
              style={{ borderColor: RULE }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "#fef2f2" }}>
                <Icon size={15} style={{ color: MAROON }} />
              </div>
              <div>
                <p className="text-lg font-black leading-none" style={{ color: SLATE }}>{value}</p>
                <p className="text-[10px] font-semibold mt-0.5" style={{ color: MUTED }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Category stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {CATEGORIES.map(cat => {
            const s    = stats.find(x => x.category === cat);
            const col  = CAT_COLORS[cat];
            return (
              <button key={cat}
                onClick={() => setCatFilter(catFilter === cat ? "" : cat)}
                className="rounded-xl border px-3 py-2 text-left transition-all"
                style={catFilter === cat
                  ? { background: col.bg, borderColor: col.border }
                  : { background: "#fff", borderColor: RULE }}>
                <p className="text-xs font-bold truncate" style={{ color: catFilter === cat ? col.text : SLATE }}>{cat}</p>
                <p className="text-lg font-black leading-tight" style={{ color: catFilter === cat ? col.text : SLATE }}>
                  {s?._count.id ?? 0}
                </p>
                <p className="text-[10px]" style={{ color: MUTED }}>
                  {s?._sum.totalCopies ?? 0} copies
                </p>
              </button>
            );
          })}
        </div>

        {/* Search + Filter toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
            <input value={searchInput} onChange={e => handleSearchInput(e.target.value)}
              placeholder="Search by title, author, accession no., call number..."
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg outline-none bg-white"
              style={{ borderColor: RULE }} />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            style={(showFilters || hasActiveFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all shrink-0 ${!(showFilters || hasActiveFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700" : ""}`}>
            <Filter size={13} />
            Filters
            {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
          </button>
          {catFilter && (
            <button onClick={() => setCatFilter("")}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border"
              style={{ borderColor: RULE, color: MUTED }}>
              <X size={12} /> {catFilter}
            </button>
          )}
        </div>

        {/* Collapsible filter panel */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: RULE }}>

            {/* Row 1: Availability + Location */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Availability</span>
                <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: RULE }}>
                  {([["", "All"], ["AVAILABLE", "Available"], ["OUT_OF_STOCK", "Out of Stock"]] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setAvailFilter(val)}
                      className="px-3 py-1.5 text-xs font-bold transition-all"
                      style={availFilter === val
                        ? { background: MAROON, color: "#fff" }
                        : { color: MUTED, background: "#fff" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Section</span>
                <div className="relative">
                  <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
                    className="text-xs border rounded-lg pl-3 pr-7 py-1.5 bg-white outline-none appearance-none"
                    style={{ borderColor: RULE, color: SLATE }}>
                    <option value="">All Sections</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: MUTED }} />
                </div>
              </div>
            </div>

            {/* Row 2: Copyright Year range */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wide shrink-0" style={{ color: MUTED }}>Copyright Year</span>
              <div className="flex items-center gap-2">
                <input type="number" value={yearFrom} onChange={e => setYearFrom(e.target.value)}
                  placeholder="From" min="1900" max="2099"
                  className="w-24 text-xs border rounded-lg px-3 py-1.5 bg-white outline-none"
                  style={{ borderColor: RULE }} />
                <span className="text-xs" style={{ color: MUTED }}>to</span>
                <input type="number" value={yearTo} onChange={e => setYearTo(e.target.value)}
                  placeholder="To" min="1900" max="2099"
                  className="w-24 text-xs border rounded-lg px-3 py-1.5 bg-white outline-none"
                  style={{ borderColor: RULE }} />
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { label: "Pre-2000", fn: () => { setYearFrom("1900"); setYearTo("1999"); } },
                  { label: "2000s",    fn: () => { setYearFrom("2000"); setYearTo("2009"); } },
                  { label: "2010s",    fn: () => { setYearFrom("2010"); setYearTo("2019"); } },
                  { label: "2020s",    fn: () => { setYearFrom("2020"); setYearTo(new Date().getFullYear().toString()); } },
                ].map(p => (
                  <button key={p.label} onClick={p.fn}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border transition-all"
                    style={{ borderColor: RULE, color: MUTED }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {hasActiveFilter && (
              <button
                onClick={() => { setAvailFilter(""); setLocationFilter(""); setYearFrom(""); setYearTo(""); }}
                className="flex items-center gap-1 text-xs font-bold hover:underline"
                style={{ color: MAROON }}>
                <X size={11} /> Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={18} className="animate-spin" style={{ color: MUTED }} />
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <BookOpen size={32} style={{ color: RULE }} />
            <p className="text-sm font-semibold" style={{ color: MUTED }}>
              {search || catFilter || hasActiveFilter ? "No books match your filters." : "No books yet. Add your first book!"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: `2px solid ${RULE}` }}>
                {["Accession No.","Call No.","Title","Author","Category","Copies","Available",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left"
                    style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase",
                      letterSpacing: "0.08em", color: MUTED, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book, i) => {
                const col = CAT_COLORS[book.category as Category] ?? { bg: "#f1f5f9", text: MUTED, border: RULE };
                return (
                  <tr key={book.id}
                    style={{ background: i % 2 === 0 ? "#fff" : "#fafafa",
                      borderBottom: `1px solid ${RULE}` }}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold" style={{ color: MAROON }}>
                        {book.accessionNo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: MUTED }}>{book.callNumber ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3" style={{ maxWidth: 280 }}>
                      <p className="font-semibold text-xs truncate" style={{ color: SLATE }}>{book.title}</p>
                      {book.copyrightYear && (
                        <p className="text-[10px]" style={{ color: MUTED }}>{book.copyrightYear}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: MUTED }}>{book.author ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                        style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
                        {book.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-bold" style={{ color: SLATE }}>{book.totalCopies}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-bold"
                        style={{ color: book.availableCopies === 0 ? "#ef4444" : "#16a34a" }}>
                        {book.availableCopies}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isHead && (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setEditBook(book)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
                            <Edit2 size={12} style={{ color: MUTED }} />
                          </button>
                          <button onClick={() => setDeleteTarget(book)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-all">
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
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && <ExportModal />}

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