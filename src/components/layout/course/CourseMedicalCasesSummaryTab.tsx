"use client";

// src/components/layout/course/CourseMedicalCasesSummaryTab.tsx

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";
import type { ReactNode } from "react";
import {
  RefreshCw, SlidersHorizontal, X, ChevronDown, Settings2, Plus, Trash2,
  Pencil, Check, Layers, AlertTriangle, AlertCircle, Download, CheckCircle2,
  ChevronsDownUp, ChevronsUpDown,
} from "lucide-react";
import { FONT } from "./osaShared";

/* ════════════════════════════════════════════════════════════════════════════
   1. DESIGN TOKENS (same as CourseLibraryTab)
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

const OFFICIAL_BODY_SYSTEM_NAMES = [
  "ALIMENTARY SYSTEM", "RESPIRATORY SYSTEM", "MUSCULO-SKELETAL SYSTEM",
  "INTEGUMENTARY SYSTEM", "URINARY SYSTEM", "METABOLIC ENDOCRINE SYSTEM",
  "CARDIOVASCULAR SYSTEM", "EYES, EARS, NOSE & THROAT DISORDERS",
  "COMMUNICABLE DISEASES",
  // TODO: add remaining 9 names matching FIXED_BODY_SYSTEMS in medical-cases-config.ts (ALL CAPS, exact spelling)
];

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/* ════════════════════════════════════════════════════════════════════════════
   2. TYPES
   ════════════════════════════════════════════════════════════════════════════ */

interface ConditionRow {
  id:           string;
  name:         string;
  countsByDept: Record<string, number>;
  total:        number;
}

interface BodySystemRow {
  id:           string;
  name:         string;
  conditions:   ConditionRow[];
  countsByDept: Record<string, number>;
  total:        number;
}

interface SummaryResponse {
  departments:       string[];
  bodySystems:       BodySystemRow[];
  grandTotal:        number;
  grandCountsByDept: Record<string, number>;
}

interface BodySystemOption {
  id:         string;
  name:       string;
  order:      number;
  conditions: { id: string; name: string; order: number }[];
}

interface Props {
  courseId: string;
  isAdmin:  boolean;
  isHead:   boolean;
}

/* ════════════════════════════════════════════════════════════════════════════
   3. HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

/** Local-timezone YYYY-MM-DD (toISOString() would shift the day for PH users). */
function toLocalISODate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/* ════════════════════════════════════════════════════════════════════════════
   4. SMALL UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════ */

function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: C.brandTint }}>
        <Layers className="w-6 h-6" style={{ color: C.brand }} />
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
  onClose, tone = "brand", icon, title, subtitle, children, footer,
  maxWidth = "max-w-md", zClass = "z-50", closeOnEsc = true,
}: {
  onClose: () => void;
  tone?: "brand" | "danger";
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  zClass?: string;
  closeOnEsc?: boolean;
}) {
  useEffect(() => {
    if (!closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, closeOnEsc]);

  const accent = tone === "danger" ? C.danger : C.brand;

  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-end sm:items-center justify-center bg-black/40`}
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

/* ════════════════════════════════════════════════════════════════════════════
   6. MANAGE BODY SYSTEMS & CONDITIONS MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function ManageCategoriesModal({
  courseId, onClose, onChanged,
}: {
  courseId:  string;
  onClose:   () => void;
  onChanged: () => void;
}) {
  const [bodySystems, setBodySystems] = useState<BodySystemOption[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  const [expanded,         setExpanded]         = useState<Set<string>>(new Set());
  const [newConditionName, setNewConditionName] = useState<Record<string, string>>({});
  const [addingCondition,  setAddingCondition]  = useState<string | null>(null);

  const [editingConditionId,   setEditingConditionId]   = useState<string | null>(null);
  const [editingConditionName, setEditingConditionName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "system";    id: string; name: string }
    | { type: "condition"; id: string; name: string }
    | null
  >(null);
  const [deleting,    setDeleting]    = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchBodySystems = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`/api/courses/${courseId}/body-systems`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load.");
      setBodySystems(data.bodySystems ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load body systems.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchBodySystems(); }, [fetchBodySystems]);

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const handleAddCondition = async (bodySystemId: string) => {
    const name = (newConditionName[bodySystemId] ?? "").trim();
    if (!name) return;
    setAddingCondition(bodySystemId); setError("");
    try {
      const res  = await fetch(`/api/courses/${courseId}/body-systems/${bodySystemId}/conditions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add.");
      setBodySystems(prev => prev.map(b =>
        b.id === bodySystemId ? { ...b, conditions: [...b.conditions, data.condition] } : b
      ));
      setNewConditionName(prev => ({ ...prev, [bodySystemId]: "" }));
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add condition.");
    } finally {
      setAddingCondition(null);
    }
  };

  const handleRenameCondition = async (conditionId: string) => {
    if (!editingConditionName.trim()) return;
    try {
      const res  = await fetch(`/api/courses/${courseId}/medical-conditions/${conditionId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ name: editingConditionName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to rename.");
      setBodySystems(prev => prev.map(b => ({
        ...b,
        conditions: b.conditions.map(c => c.id === conditionId ? { ...c, name: data.condition.name } : c),
      })));
      setEditingConditionId(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename condition.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError("");
    try {
      const url = deleteTarget.type === "system"
        ? `/api/courses/${courseId}/body-systems/${deleteTarget.id}`
        : `/api/courses/${courseId}/medical-conditions/${deleteTarget.id}`;
      const res  = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error ?? "Failed to delete."); return; }
      if (deleteTarget.type === "system") {
        setBodySystems(prev => prev.filter(b => b.id !== deleteTarget.id));
      } else {
        setBodySystems(prev => prev.map(b => ({
          ...b, conditions: b.conditions.filter(c => c.id !== deleteTarget.id),
        })));
      }
      setDeleteTarget(null);
      onChanged();
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const iconBtn =
    "w-7 h-7 flex items-center justify-center rounded-lg shrink-0 transition-colors";

  return (
    <>
      <SheetModal
        onClose={onClose}
        closeOnEsc={!deleteTarget}
        maxWidth="max-w-xl"
        icon={<Settings2 size={16} />}
        title="Manage body systems & conditions"
        subtitle="Clinic"
        footer={
          <div className="px-5 py-4">
            <button onClick={onClose}
              className="w-full h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
              Done
            </button>
          </div>
        }
      >
        <div className="px-5 py-5 space-y-3">
          {error && (
            <div className="flex items-start gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5" role="alert">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border px-3.5 py-3" style={{ background: C.brandTint, borderColor: C.line }}>
            <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: C.brand }} />
            <p className="text-[11px] leading-relaxed" style={{ color: C.body }}>
              Body systems follow the standard 18-category clinic report and can&apos;t be renamed or removed.
              You can add, rename, or remove <span className="font-bold">conditions</span> under each one.
            </p>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-2" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-11 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : bodySystems.length === 0 ? (
            <EmptyState title="No body systems yet" />
          ) : (
            <div className="space-y-2">
              {bodySystems.map(bs => {
                const isExpanded = expanded.has(bs.id);
                return (
                  <div key={bs.id} className="border rounded-xl overflow-hidden" style={{ borderColor: C.line }}>
                    {/* System row */}
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50">
                      <button
                        onClick={() => toggleExpand(bs.id)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                        className={`${iconBtn} text-gray-400 hover:text-gray-700 hover:bg-gray-100`}
                      >
                        <ChevronDown size={14} className="transition-transform" style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }} />
                      </button>
                      <span className="flex-1 text-xs font-bold leading-snug" style={{ color: C.ink }}>{bs.name}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 tabular-nums"
                        style={{ background: C.lineSoft, color: C.muted }}>
                        {bs.conditions.length}
                      </span>
                      {!OFFICIAL_BODY_SYSTEM_NAMES.includes(bs.name.toUpperCase()) && (
                        <button
                          onClick={() => { setDeleteError(""); setDeleteTarget({ type: "system", id: bs.id, name: bs.name }); }}
                          className={`${iconBtn} text-gray-300 hover:text-red-500 hover:bg-red-50`}
                          aria-label={`Delete ${bs.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Conditions */}
                    {isExpanded && (
                      <div className="px-3 py-2.5 space-y-1 bg-white border-t" style={{ borderColor: C.lineSoft }}>
                        {bs.conditions.length === 0 && (
                          <p className="pl-8 py-1 text-[11px] italic" style={{ color: C.faint }}>No conditions yet.</p>
                        )}
                        {bs.conditions.map(c => {
                          const isEditing = editingConditionId === c.id;
                          return (
                            <div key={c.id} className="flex items-center gap-2 pl-5 pr-1 py-1 rounded-lg hover:bg-gray-50">
                              <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                              {isEditing ? (
                                <input
                                  autoFocus
                                  value={editingConditionName}
                                  onChange={e => setEditingConditionName(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") handleRenameCondition(c.id);
                                    if (e.key === "Escape") setEditingConditionId(null);
                                  }}
                                  className="flex-1 min-w-0 h-8 border border-gray-200 rounded-lg px-2.5 text-xs outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10"
                                />
                              ) : (
                                <span className="flex-1 min-w-0 text-xs" style={{ color: C.body }}>{c.name}</span>
                              )}
                              {isEditing ? (
                                <button onClick={() => handleRenameCondition(c.id)} aria-label="Save name"
                                  className={`${iconBtn} text-green-600 hover:bg-green-50`}>
                                  <Check size={13} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => { setEditingConditionId(c.id); setEditingConditionName(c.name); }}
                                  aria-label={`Rename ${c.name}`}
                                  className={`${iconBtn} text-gray-300 hover:text-gray-700 hover:bg-gray-100`}>
                                  <Pencil size={12} />
                                </button>
                              )}
                              <button
                                onClick={() => { setDeleteError(""); setDeleteTarget({ type: "condition", id: c.id, name: c.name }); }}
                                aria-label={`Delete ${c.name}`}
                                className={`${iconBtn} text-gray-300 hover:text-red-500 hover:bg-red-50`}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}

                        {/* Add condition */}
                        <div className="flex items-center gap-2 pl-5 pt-2">
                          <input
                            value={newConditionName[bs.id] ?? ""}
                            onChange={e => setNewConditionName(prev => ({ ...prev, [bs.id]: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && handleAddCondition(bs.id)}
                            placeholder="New condition…"
                            className="flex-1 min-w-0 h-9 border border-gray-200 rounded-lg px-3 text-xs outline-none bg-gray-50 focus:bg-white focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10"
                          />
                          <button
                            onClick={() => handleAddCondition(bs.id)}
                            disabled={addingCondition === bs.id || !(newConditionName[bs.id] ?? "").trim()}
                            className="h-9 px-3 rounded-lg text-xs font-bold text-white flex items-center gap-1 shrink-0 disabled:opacity-50"
                            style={{ background: C.brand }}
                          >
                            {addingCondition === bs.id ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetModal>

      {/* Delete confirm */}
      {deleteTarget && (
        <SheetModal
          onClose={() => { if (!deleting) setDeleteTarget(null); }}
          zClass="z-[60]"
          tone="danger"
          maxWidth="max-w-sm"
          icon={<Trash2 size={16} />}
          title={`Delete this ${deleteTarget.type === "system" ? "body system" : "condition"}?`}
          footer={
            <div className="px-5 py-4 flex gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
                style={{ background: C.danger }}>
                {deleting ? <><RefreshCw size={12} className="animate-spin" /> Deleting…</> : "Delete"}
              </button>
            </div>
          }
        >
          <div className="px-5 py-5 space-y-3">
            <p className="text-sm leading-relaxed" style={{ color: C.body }}>
              <strong>{deleteTarget.name}</strong> will be permanently removed.
              {deleteTarget.type === "system" ? " Its conditions will be removed as well." : ""}
            </p>
            {deleteError && (
              <div className="flex items-start gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
                <AlertCircle size={13} className="mt-0.5 shrink-0" /> {deleteError}
              </div>
            )}
          </div>
        </SheetModal>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   7. MAIN TAB
   ════════════════════════════════════════════════════════════════════════════ */

export default function CourseMedicalCasesSummaryTab({ courseId, isAdmin }: Props) {
  const [summary,     setSummary]     = useState<SummaryResponse | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showManage,  setShowManage]  = useState(false);
  const [toast,       setToast]       = useState<ToastState>(null);

  const [department,       setDepartment]       = useState("");
  const [dateFrom,         setDateFrom]         = useState("");
  const [dateTo,           setDateTo]           = useState("");
  const [bodySystemFilter, setBodySystemFilter] = useState("");
  const [conditionFilter,  setConditionFilter]  = useState("");

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const canManage = !isAdmin;

  const [exportSheet, setExportSheet] = useState(MONTH_NAMES[new Date().getMonth()]);
  const [exportYear,  setExportYear]  = useState(new Date().getFullYear());
  const [exporting,   setExporting]   = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* ── Export ── */
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/courses/${courseId}/medical-cases-summary/export?sheet=${exportSheet}&year=${exportYear}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        notify(data?.error ?? "Export failed.", "error");
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `medical-cases-summary-${exportSheet}-${exportYear}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify("Export downloaded");
    } catch {
      notify("Network error while exporting.", "error");
    } finally {
      setExporting(false);
    }
  };

  /* ── Fetch ── */
  const fetchSummary = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const p = new URLSearchParams();
      if (department)       p.set("department",   department);
      if (dateFrom)         p.set("dateFrom",     dateFrom);
      if (dateTo)           p.set("dateTo",       dateTo);
      if (bodySystemFilter) p.set("bodySystemId", bodySystemFilter);
      if (conditionFilter)  p.set("conditionId",  conditionFilter);

      const res  = await fetch(`/api/courses/${courseId}/medical-cases-summary?${p}`);
      const raw  = await res.text();
      const data = raw ? JSON.parse(raw) : null;

      if (!res.ok) throw new Error(data?.error ?? `Failed to load (status ${res.status}).`);
      if (!data)   throw new Error("Server returned an empty response.");

      setSummary(data);
      setCollapsed(new Set<string>((data.bodySystems ?? []).map((bs: BodySystemRow) => bs.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load summary.");
    } finally {
      setLoading(false);
    }
  }, [courseId, department, dateFrom, dateTo, bodySystemFilter, conditionFilter]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const toggleCollapse = (id: string) =>
    setCollapsed(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  /* ── Derived data ── */
  const departments       = summary?.departments ?? [];
  const bodySystemOptions = summary?.bodySystems ?? [];
  const conditionOptions  = bodySystemOptions
    .filter(bs => !bodySystemFilter || bs.id === bodySystemFilter)
    .flatMap(bs => bs.conditions.map(c => ({ id: c.id, name: c.name, systemName: bs.name })));

  const activeFilterCount = [department, bodySystemFilter, conditionFilter, dateFrom || dateTo].filter(Boolean).length;

  const filteredBodySystems = useMemo(() => {
    if (!summary) return [];
    return summary.bodySystems
      .filter(bs => !bodySystemFilter || bs.id === bodySystemFilter)
      .map(bs => {
        const conditions = bs.conditions.filter(c => !conditionFilter || c.id === conditionFilter);
        if (!conditionFilter) return { ...bs, conditions };
        const countsByDept: Record<string, number> = {};
        let total = 0;
        conditions.forEach(c => {
          total += c.total;
          Object.entries(c.countsByDept).forEach(([d, v]) => {
            countsByDept[d] = (countsByDept[d] ?? 0) + v;
          });
        });
        return { ...bs, conditions, countsByDept, total };
      })
      .filter(bs => !conditionFilter || bs.conditions.length > 0);
  }, [summary, bodySystemFilter, conditionFilter]);

  const filteredGrandTotal = (bodySystemFilter || conditionFilter)
    ? filteredBodySystems.reduce((s, bs) => s + bs.total, 0)
    : (summary?.grandTotal ?? 0);

  const filteredGrandCountsByDept = (bodySystemFilter || conditionFilter)
    ? departments.reduce((acc, d) => {
        acc[d] = filteredBodySystems.reduce((s, bs) => s + (bs.countsByDept[d] ?? 0), 0);
        return acc;
      }, {} as Record<string, number>)
    : (summary?.grandCountsByDept ?? {});

  const allCollapsed = filteredBodySystems.length > 0 && filteredBodySystems.every(bs => collapsed.has(bs.id));
  const toggleAll = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(filteredBodySystems.map(bs => bs.id)));

  const clearFilters = () => {
    setDepartment(""); setDateFrom(""); setDateTo(""); setBodySystemFilter(""); setConditionFilter("");
  };

  const datePresets = [
    { label: "Today", fn: () => { const d = toLocalISODate(new Date()); setDateFrom(d); setDateTo(d); } },
    { label: "This week", fn: () => {
        const now = new Date(); const mon = new Date(now);
        mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        setDateFrom(toLocalISODate(mon)); setDateTo(toLocalISODate(now));
    } },
    { label: "This month", fn: () => {
        const now = new Date();
        setDateFrom(toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1))); setDateTo(toLocalISODate(now));
    } },
    { label: "All time", fn: () => { setDateFrom(""); setDateTo(""); } },
  ];

  const selectCls =
    "w-full text-xs border border-gray-200 rounded-lg pl-3 pr-8 py-2 bg-white text-gray-700 outline-none appearance-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10";
  const filterLabelCls = "block text-xs font-semibold text-gray-500 mb-1";

  /* ── Render ── */
  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: C.canvas }}>

      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between shrink-0 gap-3" style={{ borderColor: C.line }}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Medical cases summary</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: C.faint }}>
            Case counts by body system, condition and department.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchSummary} aria-label="Refresh"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 w-9 h-9 sm:w-auto sm:px-3 rounded-lg transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canManage && (
            <button onClick={() => setShowManage(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-9 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ background: C.brand }}>
              <Settings2 className="w-3.5 h-3.5" />
              <span>Manage<span className="hidden sm:inline"> categories</span></span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5 min-h-0">

        {/* Export card */}
        <div className="bg-white border rounded-xl shadow-sm px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.brandTint }}>
              <Download size={14} style={{ color: C.brand }} />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: C.ink }}>Export to Excel</p>
              <p className="text-[11px]" style={{ color: C.faint }}>Pick a month or the full year.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
            <div className="relative flex-1 sm:flex-none sm:w-52 min-w-[140px]">
              <select value={exportSheet} onChange={e => setExportSheet(e.target.value)}
                aria-label="Export sheet" className={selectCls}>
                <option value="consolidated">All year (consolidated)</option>
                {MONTH_NAMES.map(m => (
                  <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <input
              type="number" value={exportYear} aria-label="Export year"
              onChange={e => setExportYear(parseInt(e.target.value) || exportYear)}
              className="w-24 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 shrink-0"
            />
            <button onClick={handleExport} disabled={exporting}
              className="h-9 px-4 flex items-center gap-1.5 text-xs font-bold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
              style={{ background: C.brand }}>
              {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {exporting ? "Exporting…" : "Download"}
            </button>
          </div>
        </div>

        {/* Table card */}
        <div className="flex-1 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[420px]" style={{ borderColor: C.line }}>

          {/* Toolbar */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b flex items-center gap-2" style={{ borderColor: C.lineSoft }}>
            <button
              onClick={() => setShowFilters(f => !f)} aria-expanded={showFilters}
              style={(showFilters || activeFilterCount) ? { background: C.brand, color: "#fff", borderColor: C.brand } : {}}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${!(showFilters || activeFilterCount) ? "border-gray-200 text-gray-600 hover:border-gray-400" : ""}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-white/90 text-[10px] font-bold flex items-center justify-center" style={{ color: C.brand }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filteredBodySystems.length > 0 && (
              <button onClick={toggleAll}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-gray-400 transition-colors shrink-0">
                {allCollapsed ? <ChevronsUpDown className="w-3.5 h-3.5" /> : <ChevronsDownUp className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{allCollapsed ? "Expand all" : "Collapse all"}</span>
              </button>
            )}

            <span className="text-[11px] ml-auto leading-tight text-right" style={{ color: C.faint }}>
              All-time totals unless a date range is set.
            </span>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="px-3 sm:px-5 py-4 border-b bg-gray-50 space-y-4" style={{ borderColor: C.lineSoft }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={filterLabelCls}>Department / course</label>
                  <div className="relative">
                    <select value={department} onChange={e => setDepartment(e.target.value)} className={selectCls}>
                      <option value="">All departments / courses</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className={filterLabelCls}>Body system</label>
                  <div className="relative">
                    <select value={bodySystemFilter}
                      onChange={e => { setBodySystemFilter(e.target.value); setConditionFilter(""); }}
                      className={selectCls}>
                      <option value="">All body systems</option>
                      {bodySystemOptions.map(bs => <option key={bs.id} value={bs.id}>{bs.name}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className={filterLabelCls}>Medical condition</label>
                  <div className="relative">
                    <select value={conditionFilter} onChange={e => setConditionFilter(e.target.value)} className={selectCls}>
                      <option value="">All conditions</option>
                      {conditionOptions.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{!bodySystemFilter ? ` (${c.systemName})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className={filterLabelCls}>Date range</label>
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
                  <div className="h-3 w-40 bg-gray-100 rounded" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                  <div className="h-3 w-12 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={fetchSummary}
                className="text-xs font-bold px-4 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                Try again
              </button>
            </div>
          ) : !summary || summary.bodySystems.length === 0 ? (
            <div className="flex-1">
              <EmptyState
                title="No body systems set up yet"
                hint="Add body systems and conditions so cases can be summarized here."
                action={canManage ? (
                  <button onClick={() => setShowManage(true)}
                    className="mt-2 flex items-center gap-1.5 text-xs font-bold px-4 h-9 rounded-lg text-white"
                    style={{ background: C.brand }}>
                    <Settings2 size={13} /> Set up body systems & conditions
                  </button>
                ) : undefined}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse" style={{ minWidth: Math.max(420, departments.length * 110 + 260) }}>
                <thead className="sticky top-0 z-20">
                  <tr style={{ background: "#fafafa" }}>
                    <th scope="col"
                      className="text-left px-4 py-2.5 whitespace-nowrap border-b sticky left-0 z-30"
                      style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line, background: "#fafafa", minWidth: 200 }}>
                      Body system / condition
                    </th>
                    {departments.map(d => (
                      <th key={d} scope="col"
                        className="text-left px-4 py-2.5 whitespace-nowrap border-b"
                        style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>
                        {d}
                      </th>
                    ))}
                    <th scope="col"
                      className="text-left px-4 py-2.5 whitespace-nowrap border-b"
                      style={{ fontSize: 11, fontWeight: 800, color: C.brand, borderColor: C.line, background: C.brandTint }}>
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBodySystems.length === 0 ? (
                    <tr>
                      <td colSpan={departments.length + 2} className="px-4 py-12 text-center">
                        <p className="text-sm font-semibold" style={{ color: C.ink }}>No matching results</p>
                        <p className="text-xs mt-1" style={{ color: C.muted }}>Try a different filter combination.</p>
                        <button onClick={clearFilters} className="mt-2 text-xs font-bold hover:underline" style={{ color: C.brand }}>
                          Clear filters
                        </button>
                      </td>
                    </tr>
                  ) : filteredBodySystems.map(bs => {
                    const isCollapsed = collapsed.has(bs.id);
                    return (
                      <Fragment key={bs.id}>
                        {/* Body system row */}
                        <tr
                          className="group cursor-pointer hover:bg-gray-50 focus:bg-gray-50 outline-none transition-colors"
                          tabIndex={0}
                          aria-expanded={!isCollapsed}
                          onClick={() => toggleCollapse(bs.id)}
                          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCollapse(bs.id); } }}
                        >
                          <td className="px-4 py-3.5 whitespace-nowrap border-b sticky left-0 z-10 bg-white group-hover:bg-gray-50 transition-colors"
                            style={{ borderColor: C.lineSoft }}>
                            <span className="flex items-center gap-2 text-[13px] font-bold" style={{ color: C.ink }}>
                              <ChevronDown size={14} className="text-gray-400 shrink-0 transition-transform"
                                style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }} />
                              {bs.name}
                              <span className="text-[11px] font-semibold px-1.5 rounded-full tabular-nums"
                                style={{ background: C.lineSoft, color: C.muted }}>
                                {bs.conditions.length}
                              </span>
                            </span>
                          </td>
                          {departments.map(d => (
                            <td key={d} className="px-4 py-3.5 text-xs font-bold tabular-nums border-b"
                              style={{ color: C.ink, borderColor: C.lineSoft }}>
                              {bs.countsByDept[d] ?? 0}
                            </td>
                          ))}
                          <td className="px-4 py-3.5 text-xs font-bold tabular-nums border-b"
                            style={{ color: C.brand, background: C.brandTint, borderColor: C.lineSoft }}>
                            {bs.total}
                          </td>
                        </tr>

                        {/* Condition rows */}
                        {!isCollapsed && bs.conditions.map(c => (
                          <tr key={c.id} className="group hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap border-b sticky left-0 z-10 bg-white group-hover:bg-gray-50 transition-colors"
                              style={{ borderColor: C.lineSoft }}>
                              <span className="flex items-center gap-2 pl-6 text-xs" style={{ color: C.body }}>
                                <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                                {c.name}
                              </span>
                            </td>
                            {departments.map(d => (
                              <td key={d} className="px-4 py-3 text-xs tabular-nums border-b"
                                style={{ color: C.body, borderColor: C.lineSoft }}>
                                {c.countsByDept[d] ?? 0}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-xs font-bold tabular-nums border-b"
                              style={{ color: C.ink, background: "#fef9f9", borderColor: C.lineSoft }}>
                              {c.total}
                            </td>
                          </tr>
                        ))}

                        {!isCollapsed && bs.conditions.length === 0 && (
                          <tr>
                            <td colSpan={departments.length + 2}
                              className="px-4 py-2.5 pl-12 text-[11px] italic border-b"
                              style={{ color: C.faint, borderColor: C.lineSoft }}>
                              No conditions added under this body system yet.
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>

                <tfoot className="sticky bottom-0 z-20">
                  <tr style={{ background: "#fafafa" }}>
                    <td className="px-4 py-3 whitespace-nowrap border-t-2 sticky left-0 z-30"
                      style={{ borderColor: C.line, background: "#fafafa" }}>
                      <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: C.ink }}>Total</span>
                    </td>
                    {departments.map(d => (
                      <td key={d} className="px-4 py-3 text-xs font-bold tabular-nums border-t-2"
                        style={{ color: C.ink, borderColor: C.line }}>
                        {filteredGrandCountsByDept[d] ?? 0}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-xs font-extrabold tabular-nums border-t-2"
                      style={{ color: C.brand, background: C.brandTint, borderColor: C.line }}>
                      {filteredGrandTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {showManage && (
        <ManageCategoriesModal
          courseId={courseId}
          onClose={() => setShowManage(false)}
          onChanged={fetchSummary}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}