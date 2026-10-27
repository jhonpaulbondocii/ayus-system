"use client";

// src/components/layout/course/CourseLibraryLogTab.tsx

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  Search, RefreshCw, FileText, Trash2, Download, SlidersHorizontal, X,
  ChevronLeft, ChevronRight, Check, AlertCircle, CheckCircle2,
} from "lucide-react";
import { FONT } from "./osaShared";

/* ════════════════════════════════════════════════════════════════════════════
   1. DESIGN TOKENS (same palette as Library Cards / Disciplinary Log)
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
} as const;

const PAGE_SIZE = 15;

/* ════════════════════════════════════════════════════════════════════════════
   2. TYPES
   ════════════════════════════════════════════════════════════════════════════ */

interface ReceivingLog {
  id: string;
  name: string;
  sex?: string | null;
  courseYearSection?: string | null;
  collegeDept?: string | null;
  position?: string | null;
  documentReceived: string;
  releasedBy?: string | null;
  signatureUrl?: string | null;
  dateReceived: string;
  request?: {
    requestType: string;
    applicantType: "STUDENT" | "EMPLOYEE";
  } | null;
}

type TypeFilter = "" | "STUDENT" | "EMPLOYEE";

/* ════════════════════════════════════════════════════════════════════════════
   3. HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Local-timezone YYYY-MM-DD (toISOString() shifts the day for PH users). */
function toLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const detailOf = (l: ReceivingLog) =>
  l.courseYearSection || [l.collegeDept, l.position].filter(Boolean).join(" · ") || "—";

const typeOf = (l: ReceivingLog) => (l.request?.applicantType === "EMPLOYEE" ? "Employee" : "Student");

const DATE_PRESETS: Array<{ label: string; range: () => [string, string] }> = [
  { label: "Today", range: () => { const d = toLocalISODate(new Date()); return [d, d]; } },
  { label: "This week", range: () => {
      const now = new Date(); const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return [toLocalISODate(mon), toLocalISODate(now)];
  } },
  { label: "This month", range: () => {
      const now = new Date();
      return [toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1)), toLocalISODate(now)];
  } },
];

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ════════════════════════════════════════════════════════════════════════════
   4. UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════ */

type ToastState = { msg: string; tone: "success" | "error" } | null;

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const isErr = toast.tone === "error";
  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold text-white"
      style={{ background: isErr ? C.danger : C.ink, bottom: "calc(24px + env(safe-area-inset-bottom))", fontFamily: FONT }}
    >
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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/20">{icon}</div>
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
    <SheetModal
      onClose={onClose} tone="danger" icon={<Trash2 size={16} />} title={title} maxWidth="max-w-sm"
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

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={{ background: C.lineSoft, color: C.body }}>
      {label}
    </span>
  );
}

function SignedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700">
      <Check size={11} /> Signed
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   5. EXPORT MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function ExportModal({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [filename,       setFilename]       = useState("student_receiving_log");
  const [exporting,      setExporting]      = useState(false);
  const [error,          setError]          = useState("");
  const [previewCount,   setPreviewCount]   = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const q = new URLSearchParams({ type: "STUDENT" });
        if (dateFrom) q.set("dateFrom", dateFrom);
        if (dateTo)   q.set("dateTo",   dateTo);
        const res  = await fetch(`/api/courses/${courseId}/library-log?${q}`);
        const data = await res.json();
        setPreviewCount((data.logs ?? []).length);
      } catch { setPreviewCount(null); }
      finally { setPreviewLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [dateFrom, dateTo, courseId]);

  const handleExport = async () => {
    setExporting(true); setError("");
    try {
      const q = new URLSearchParams();
      if (dateFrom) q.set("dateFrom", dateFrom);
      if (dateTo)   q.set("dateTo",   dateTo);
      const res = await fetch(`/api/courses/${courseId}/library-cards/log-sheet/student?${q}`);
      if (!res.ok) { setError("Export failed. Please try again."); return; }
      const blob   = await res.blob();
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement("a");
      const base   = filename.trim().replace(/[\\/:*?"<>|]+/g, "_") || "student_receiving_log";
      const suffix = dateFrom || dateTo ? `_${dateFrom || "start"}_to_${dateTo || "now"}` : "";
      a.href = url; a.download = `${base}${suffix}.pdf`; a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch { setError("Export failed. Please try again."); }
    finally { setExporting(false); }
  };

  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
  const dateCls  = "flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10";

  return (
    <SheetModal
      onClose={onClose} icon={<Download size={16} />} title="Export receiving log" subtitle="Student records · PDF"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={exporting}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleExport} disabled={exporting || previewLoading || previewCount === 0}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: C.brand }}>
            {exporting ? <><RefreshCw size={13} className="animate-spin" /> Exporting…</> : <><Download size={13} /> Export PDF</>}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 space-y-4">
        <div>
          <label className={labelCls}>File name</label>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white focus-within:border-[#7b1113] focus-within:ring-2 focus-within:ring-[#7b1113]/10 transition-all">
            <input value={filename} onChange={e => setFilename(e.target.value)} placeholder="student_receiving_log"
              className="flex-1 text-sm text-gray-700 outline-none bg-transparent min-w-0" />
            <span className="text-xs text-gray-400 shrink-0">.pdf</span>
          </div>
        </div>

        <div>
          <label className={labelCls}>Date received</label>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} aria-label="From date" className={dateCls} />
            <span className="text-xs text-gray-400 shrink-0">to</span>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} aria-label="To date" className={dateCls} />
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {[...DATE_PRESETS, { label: "All time", range: (): [string, string] => ["", ""] }].map(p => (
              <button key={p.label} onClick={() => { const [f, t] = p.range(); setDateFrom(f); setDateTo(t); }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border px-4 py-3 bg-gray-50 text-xs" style={{ borderColor: C.line, color: C.muted }}>
          {previewLoading || previewCount === null ? (
            <span className="flex items-center gap-1.5"><RefreshCw size={11} className="animate-spin" /> Checking records…</span>
          ) : (
            <>
              <strong className="text-sm" style={{ color: C.ink }}>{previewCount}</strong>{" "}
              record{previewCount !== 1 ? "s" : ""} will be exported
              {dateFrom ? ` from ${fmtDate(dateFrom)}` : ""}{dateTo ? ` to ${fmtDate(dateTo)}` : ""}.
            </>
          )}
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 text-xs text-red-500 font-semibold">
            <AlertCircle size={13} /> {error}
          </div>
        )}
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   6. MAIN TAB
   ════════════════════════════════════════════════════════════════════════════ */

export default function CourseLibraryLogTab({ courseId, isHead }: { courseId: string; isHead: boolean }) {
  const [logs,         setLogs]         = useState<ReceivingLog[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [showFilters,  setShowFilters]  = useState(false);
  const [showExport,   setShowExport]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [toast,        setToast]        = useState<ToastState>(null);

  const debouncedSearch = useDebounced(search, 300);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const q = new URLSearchParams();
      if (debouncedSearch) q.set("search",   debouncedSearch);
      if (dateFrom)        q.set("dateFrom", dateFrom);
      if (dateTo)          q.set("dateTo",   dateTo);
      if (typeFilter)      q.set("type",     typeFilter);
      const res  = await fetch(`/api/courses/${courseId}/library-log?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load logs.");
      setLogs(data.logs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs.");
    } finally { setLoading(false); }
  }, [courseId, debouncedSearch, dateFrom, dateTo, typeFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [debouncedSearch, typeFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const paginated  = useMemo(() => logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [logs, page]);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const activeFilterCount = [typeFilter, dateFrom || dateTo].filter(Boolean).length;
  const clearFilters = () => { setTypeFilter(""); setDateFrom(""); setDateTo(""); };

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) =>
    totalPages <= 5 || page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i,
  );

  /* Selection */
  const pageAllSelected  = paginated.length > 0 && paginated.every(l => selected.has(l.id));
  const pageSomeSelected = paginated.some(l => selected.has(l.id));

  const toggleOne = (id: string) =>
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const togglePage = () =>
    setSelected(prev => {
      const n = new Set(prev);
      if (pageAllSelected) paginated.forEach(l => n.delete(l.id)); else paginated.forEach(l => n.add(l.id));
      return n;
    });

  /* Delete (single + bulk) */
  const deleteIds = async (ids: string[]) => {
    setDeleting(true);
    const results = await Promise.allSettled(
      ids.map(id =>
        fetch(`/api/courses/${courseId}/library-log?logId=${encodeURIComponent(id)}`, { method: "DELETE" }).then(res => {
          if (!res.ok) throw new Error("Delete failed");
          return id;
        }),
      ),
    );
    const ok = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map(r => r.value);
    const failed = ids.length - ok.length;

    if (ok.length) setLogs(prev => prev.filter(l => !ok.includes(l.id)));
    setSelected(prev => { const n = new Set(prev); ok.forEach(id => n.delete(id)); return n; });
    setDeleting(false); setDeleteTarget(null);

    if (failed === 0) notify(ok.length === 1 ? "Log entry deleted" : `${ok.length} log entries deleted`);
    else notify(`${failed} couldn’t be deleted. Please try again.`, "error");
  };

  const selectCls = "w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10";
  const filterLabelCls = "block text-xs font-semibold text-gray-500 mb-1";

  const hasAnyFilter = !!(search || activeFilterCount);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: C.canvas }}>

      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between shrink-0 gap-3" style={{ borderColor: C.line }}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Receiving log</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: C.faint }}>
            {loading ? "Loading…" : `${logs.length} entr${logs.length === 1 ? "y" : "ies"} · created automatically when a card is released`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchLogs} aria-label="Refresh"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 w-9 h-9 sm:w-auto sm:px-3 rounded-lg transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-9 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: C.brand }}>
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col min-h-0">
        <div className="flex-1 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[420px]" style={{ borderColor: C.line }}>

          {/* Toolbar */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b flex items-center gap-2" style={{ borderColor: C.lineSoft }}>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-9 flex-1 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-colors min-w-0">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name or department" aria-label="Search log"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0" />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button onClick={() => setShowFilters(f => !f)} aria-expanded={showFilters}
              style={(showFilters || activeFilterCount) ? { background: C.brand, color: "#fff", borderColor: C.brand } : {}}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${!(showFilters || activeFilterCount) ? "border-gray-200 text-gray-600 hover:border-gray-400" : ""}`}>
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
              {selected.size < logs.length && (
                <button onClick={() => setSelected(new Set(logs.map(l => l.id)))} className="text-xs font-semibold hover:underline" style={{ color: C.brand }}>
                  Select all {logs.length}
                </button>
              )}
              <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-gray-500 hover:text-gray-700">Clear</button>
              <button onClick={() => setDeleteTarget(Array.from(selected))}
                className="ml-auto flex items-center gap-1.5 text-xs font-bold px-3 h-8 rounded-lg text-white" style={{ background: C.danger }}>
                <Trash2 size={13} /> Delete selected
              </button>
            </div>
          )}

          {/* Filter panel */}
          {showFilters && (
            <div className="px-3 sm:px-5 py-4 border-b bg-gray-50 space-y-4" style={{ borderColor: C.lineSoft }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={filterLabelCls}>Applicant type</label>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TypeFilter)} className={selectCls}>
                    <option value="">All types</option>
                    <option value="STUDENT">Student</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={filterLabelCls}>Date received</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} aria-label="From date"
                    className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                  <span className="text-xs text-gray-400 shrink-0">to</span>
                  <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} aria-label="To date"
                    className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {DATE_PRESETS.map(p => (
                    <button key={p.label} onClick={() => { const [f, t] = p.range(); setDateFrom(f); setDateTo(t); }}
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
                  <div className="h-3 w-24 bg-gray-100 rounded hidden sm:block" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                  <div className="h-5 w-14 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={fetchLogs} className="text-xs font-bold px-4 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                Try again
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: C.brandTint }}>
                <FileText className="w-6 h-6" style={{ color: C.brand }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                {hasAnyFilter ? "No matching entries" : "No receiving log entries yet"}
              </p>
              <p className="text-xs max-w-xs" style={{ color: C.muted }}>
                {hasAnyFilter ? "Try a different search or clear the filters." : "Entries are created automatically when a card is released."}
              </p>
              {hasAnyFilter && (
                <button onClick={() => { clearFilters(); setSearch(""); }} className="mt-2 text-xs font-bold hover:underline" style={{ color: C.brand }}>
                  Clear all filters
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
                    {["No.", "Date received", "Name", "Sex", "Course / dept. & position", "Document", "Signature", "Released by", ""].map((h, i) => (
                      <th key={i} scope="col" className="text-left px-4 py-2.5 whitespace-nowrap border-b"
                        style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log, i) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors"
                      style={selected.has(log.id) ? { background: C.brandTint } : undefined}>
                      {isHead && (
                        <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft }}>
                          <input type="checkbox" aria-label={`Select ${log.name}`} checked={selected.has(log.id)}
                            onChange={() => toggleOne(log.id)} className="w-4 h-4 cursor-pointer" style={{ accentColor: C.brand }} />
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-xs tabular-nums border-b" style={{ color: C.faint, borderColor: C.lineSoft }}>
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap border-b" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {fmtDateTime(log.dateReceived)}
                      </td>
                      <td className="px-4 py-3.5 border-b min-w-[170px]" style={{ borderColor: C.lineSoft }}>
                        <p className="text-[13px] font-semibold" style={{ color: C.ink }}>{log.name}</p>
                        <div className="mt-0.5"><TypeBadge label={typeOf(log)} /></div>
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b" style={{ color: C.body, borderColor: C.lineSoft }}>{log.sex ?? "—"}</td>
                      <td className="px-4 py-3.5 text-xs border-b max-w-[220px]" style={{ color: C.body, borderColor: C.lineSoft }}>
                        <span className="line-clamp-2">{detailOf(log)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b" style={{ color: C.body, borderColor: C.lineSoft }}>{log.documentReceived}</td>
                      <td className="px-4 py-3.5 border-b" style={{ borderColor: C.lineSoft, minWidth: 100 }}>
                        {log.signatureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={log.signatureUrl} alt={`Signature of ${log.name}`} className="h-8 max-w-[90px] object-contain" />
                        ) : <span className="text-xs" style={{ color: C.faint }}>—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b" style={{ color: C.body, borderColor: C.lineSoft }}>{log.releasedBy ?? "—"}</td>
                      <td className="px-3 py-3.5 w-12 border-b" style={{ borderColor: C.lineSoft }}>
                        {isHead && (
                          <button onClick={() => setDeleteTarget([log.id])} aria-label={`Delete log entry for ${log.name}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paginated.map(log => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3.5"
                    style={selected.has(log.id) ? { background: C.brandTint } : undefined}>
                    {isHead && (
                      <input type="checkbox" aria-label={`Select ${log.name}`} checked={selected.has(log.id)}
                        onChange={() => toggleOne(log.id)} className="w-4 h-4 shrink-0 mt-1" style={{ accentColor: C.brand }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: C.ink }}>{log.name}</p>
                          <p className="text-xs truncate mt-0.5" style={{ color: C.muted }}>{detailOf(log)}</p>
                        </div>
                        <TypeBadge label={typeOf(log)} />
                      </div>
                      <p className="text-xs mt-1.5" style={{ color: C.body }}>{log.documentReceived}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[11px]" style={{ color: C.faint }}>{fmtDateTime(log.dateReceived)}</span>
                        {log.signatureUrl && <SignedBadge />}
                        {log.releasedBy && <span className="text-[11px]" style={{ color: C.faint }}>by {log.releasedBy}</span>}
                      </div>
                    </div>
                    {isHead && (
                      <button onClick={() => setDeleteTarget([log.id])} aria-label={`Delete log entry for ${log.name}`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 shrink-0">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && logs.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t bg-white shrink-0 gap-2" style={{ borderColor: C.line }}>
              <span className="text-xs tabular-nums truncate" style={{ color: C.muted }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, logs.length)} of {logs.length}
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

      {showExport && <ExportModal courseId={courseId} onClose={() => setShowExport(false)} />}

      {deleteTarget && (
        <ConfirmModal
          title={deleteTarget.length === 1 ? "Delete this log entry?" : `Delete ${deleteTarget.length} log entries?`}
          confirmLabel={deleteTarget.length === 1 ? "Delete" : `Delete ${deleteTarget.length}`}
          busy={deleting}
          message={
            deleteTarget.length === 1 ? (
              <>
                <strong>{logs.find(l => l.id === deleteTarget[0])?.name ?? "This entry"}</strong> will be permanently removed.<br />
                This can’t be undone.
              </>
            ) : (
              <>{deleteTarget.length} selected entries will be permanently removed.<br />This can’t be undone.</>
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