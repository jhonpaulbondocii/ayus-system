"use client";

// src/components/layout/course/CourseLibraryLogTab.tsx
// Same UI pattern as CoursePatientRecordsTab

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, RefreshCw, FileText, Trash2,
  Download, Filter, X, ChevronLeft, ChevronRight,
  BookOpen, Check,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const MAROON    = "#7b1113";
const FONT      = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const PAGE_SIZE = 15;

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}
function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORT MODAL
───────────────────────────────────────────────────────────────────────────── */
function ExportModal({
  courseId,
  type,
  onClose,
}: {
  courseId: string;
  type: "student";
  onClose: () => void;
}) {
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [filename,      setFilename]      = useState("student_receiving_log");
  const [exporting,     setExporting]     = useState(false);
  const [previewCount,  setPreviewCount]  = useState<number | null>(null);
  const [previewLoading,setPreviewLoading]= useState(false);
  const previewRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (previewRef.current) clearTimeout(previewRef.current);
    previewRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const q = new URLSearchParams();
        if (dateFrom) q.set("dateFrom", dateFrom);
        if (dateTo)   q.set("dateTo",   dateTo);
        q.set("type", type === "student" ? "STUDENT" : "EMPLOYEE");
        const res  = await fetch(`/api/courses/${courseId}/library-log?${q}`);
        const data = await res.json();
        setPreviewCount((data.logs ?? []).length);
      } catch {
        setPreviewCount(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => { if (previewRef.current) clearTimeout(previewRef.current); };
  }, [dateFrom, dateTo, type, courseId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const q = new URLSearchParams();
      if (dateFrom) q.set("dateFrom", dateFrom);
      if (dateTo)   q.set("dateTo",   dateTo);
      const endpoint = `/api/courses/${courseId}/library-cards/log-sheet/student?${q}`;
      const res  = await fetch(endpoint);
      if (!res.ok) { alert("Export failed. Please try again."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const suffix = dateFrom || dateTo ? `_${dateFrom || "start"}_to_${dateTo || "now"}` : "";
      a.href     = url;
      a.download = `${filename.trim() || "student_receiving_log"}${suffix}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const label = "Student";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-[420px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Download size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Library Log</p>
              <p className="text-sm font-black text-white">Export {label} Receiving Log</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Filename */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">File Name</p>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white focus-within:border-[#7b1113] transition-all">
              <input
                value={filename}
                onChange={e => setFilename(e.target.value)}
                placeholder="student_receiving_log"
                className="flex-1 text-xs text-gray-700 outline-none bg-transparent"
              />
              <span className="text-xs text-gray-400 shrink-0">.pdf</span>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Date Range</p>
            <div className="flex items-center gap-2">
              <input
                type="date" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]"
              />
              <span className="text-xs text-gray-400 shrink-0">to</span>
              <input
                type="date" value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113]"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {[
                { label: "This Month", fn: () => { const now = new Date(); setDateFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`); setDateTo(todayISO()); } },
                { label: "This Week",  fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); setDateFrom(mon.toISOString().split("T")[0]); setDateTo(todayISO()); } },
                { label: "Today",      fn: () => { const d = todayISO(); setDateFrom(d); setDateTo(d); } },
                { label: "All Time",   fn: () => { setDateFrom(""); setDateTo(""); } },
              ].map(p => (
                <button key={p.label} onClick={p.fn}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview count */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              {previewLoading ? (
                <><RefreshCw size={11} className="animate-spin" /> Checking records...</>
              ) : previewCount === null ? (
                <>Checking records...</>
              ) : (
                <>
                  <span className="font-black text-gray-800">{previewCount}</span>
                  {" "}{label.toLowerCase()} record{previewCount !== 1 ? "s" : ""} will be exported
                  {dateFrom ? ` · from ${fmtDate(dateFrom)}` : ""}
                  {dateTo   ? ` to ${fmtDate(dateTo)}`       : ""}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} disabled={exporting}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || previewLoading || previewCount === 0}
            className="flex-1 h-10 rounded-xl text-xs font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            style={{ background: MAROON }}>
            {exporting
              ? <><RefreshCw size={13} className="animate-spin" /> Exporting...</>
              : <><Download size={13} /> Export PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN TAB
───────────────────────────────────────────────────────────────────────────── */
export default function CourseLibraryLogTab({
  courseId,
  isHead,
}: {
  courseId: string;
  isHead: boolean;
}) {
  const [logs,       setLogs]       = useState<ReceivingLog[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "STUDENT" | "EMPLOYEE">("");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [showFilters,setShowFilters]= useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportType, setExportType] = useState<"student" | null>(null);
  const [page,       setPage]       = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const q = new URLSearchParams();
      if (search)     q.set("search",   search);
      if (dateFrom)   q.set("dateFrom", dateFrom);
      if (dateTo)     q.set("dateTo",   dateTo);
      if (typeFilter) q.set("type",     typeFilter);
      const res  = await fetch(`/api/courses/${courseId}/library-log?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setLogs(data.logs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [courseId, search, dateFrom, dateTo, typeFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [search, typeFilter, dateFrom, dateTo]);

  const handleDelete = async (logId: string) => {
    if (!confirm("Delete this log entry? This cannot be undone.")) return;
    setDeletingId(logId);
    try {
      await fetch(`/api/courses/${courseId}/library-log?logId=${logId}`, { method: "DELETE" });
      setLogs(prev => prev.filter(l => l.id !== logId));
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const paginated  = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilter  = !!typeFilter || !!dateFrom || !!dateTo;

  return (
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5" style={{ color: MAROON }}>Library</p>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">Receiving Log</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 max-w-xs">
          {[
            { label: "Total Logs",  value: logs.length },
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

        {/* ── Table Card ── */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">

          {/* Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 sm:flex-none sm:w-64 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name or department…"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(f => !f)}
              style={(showFilters || hasFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0
                ${!(showFilters || hasFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400" : ""}`}>
              <Filter className="w-3 h-3" />
              <span className="hidden sm:inline">Filters</span>
              {hasFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70" />}
            </button>

            {/* Export buttons */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => setExportType("student")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all shrink-0">
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Export Log</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Type</span>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as "" | "STUDENT" | "EMPLOYEE")}
                  className="text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 outline-none">
                  <option value="">All</option>
                  <option value="STUDENT">Student</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date</span>
                <input
                  type="date" value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date" value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 outline-none"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "Today",      fn: () => { const d = todayISO(); setDateFrom(d); setDateTo(d); } },
                    { label: "This Week",  fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); setDateFrom(mon.toISOString().split("T")[0]); setDateTo(todayISO()); } },
                    { label: "This Month", fn: () => { const now = new Date(); setDateFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`); setDateTo(todayISO()); } },
                  ].map(p => (
                    <button key={p.label} onClick={p.fn}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {hasFilter && (
                <button
                  onClick={() => { setTypeFilter(""); setDateFrom(""); setDateTo(""); }}
                  className="flex items-center gap-1 text-[11px] font-bold hover:underline"
                  style={{ color: MAROON }}>
                  <X size={11} /> Clear
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="animate-pulse divide-y divide-gray-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                  <div className="h-3 w-20 bg-gray-100 rounded hidden sm:block" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-xs font-medium text-red-500 py-20">{error}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: "#fafafa" }}>
                      {["No.", "Date Received", "Name", "Sex", "Course / Dept & Position", "Document", "Signature", "Released By", ""].map((h, i) => (
                        <th key={i} className="text-left px-3 py-3 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-700">{h}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-16">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                              <FileText className="w-6 h-6" style={{ color: MAROON }} />
                            </div>
                            <p className="text-sm text-gray-400 font-medium">No receiving log entries yet.</p>
                            <p className="text-xs text-gray-400">Entries are created automatically when a card is Released.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {paginated.map((log, i) => (
                      <tr key={log.id}
                        className="hover:bg-gray-50/70 transition-colors border-b border-gray-100 last:border-0">
                        <td className="px-3 py-3 text-xs text-gray-500 tabular-nums text-center" style={{ border: "1px solid #e5e7eb" }}>
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap" style={{ border: "1px solid #e5e7eb" }}>
                          {fmtDateTime(log.dateReceived)}
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap" style={{ border: "1px solid #e5e7eb" }}>
                          {log.name}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 text-center" style={{ border: "1px solid #e5e7eb" }}>
                          {log.sex ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600" style={{ border: "1px solid #e5e7eb" }}>
                          {(log.courseYearSection ?? [log.collegeDept, log.position].filter(Boolean).join(" · ")) || "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600" style={{ border: "1px solid #e5e7eb" }}>
                          {log.documentReceived}
                        </td>
                        <td className="px-3 py-3" style={{ border: "1px solid #e5e7eb", minWidth: 100 }}>
                          {log.signatureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={log.signatureUrl} alt="sig" className="h-8 max-w-[90px] object-contain" />
                          ) : (
                            <span className="text-[10px] text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600" style={{ border: "1px solid #e5e7eb" }}>
                          {log.releasedBy ?? "—"}
                        </td>
                        <td className="px-2 py-3 w-10" style={{ border: "1px solid #e5e7eb" }}>
                          {isHead && (
                            <button
                              onClick={() => handleDelete(log.id)}
                              disabled={deletingId === log.id}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40">
                              {deletingId === log.id
                                ? <RefreshCw size={13} className="animate-spin" />
                                : <Trash2 size={13} />}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden p-3 space-y-2">
                {logs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <FileText className="w-8 h-8" style={{ color: MAROON }} />
                    <p className="text-sm text-gray-400 font-medium text-center">No receiving log entries yet.</p>
                  </div>
                )}
                {paginated.map(log => (
                  <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{log.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {log.courseYearSection ?? [log.collegeDept, log.position].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: "#f3f4f6", color: "#374151" }}>
                        {log.request?.applicantType === "STUDENT" ? "Student" : "Employee"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <p className="text-[11px] text-gray-400">{fmtDateTime(log.dateReceived)}</p>
                      {log.signatureUrl && (
                        <span className="text-[10px] text-green-500 font-bold flex items-center gap-0.5">
                          <Check size={9} /> Signed
                        </span>
                      )}
                      {log.releasedBy && (
                        <span className="text-[10px] text-gray-400">by {log.releasedBy}</span>
                      )}
                    </div>
                    {isHead && (
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={deletingId === log.id}
                        className="mt-2 flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 font-semibold disabled:opacity-40">
                        {deletingId === log.id
                          ? <><RefreshCw size={11} className="animate-spin" /> Deleting...</>
                          : <><Trash2 size={11} /> Delete</>}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && logs.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white shrink-0 flex-wrap gap-2">
              <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, logs.length)} of {logs.length}
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

      {/* Export Modals */}
      {exportType && (
        <ExportModal
          courseId={courseId}
          type={exportType}
          onClose={() => setExportType(null)}
        />
      )}
    </div>
  );
}