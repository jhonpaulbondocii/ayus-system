"use client";

// src/components/layout/course/CourseMedicalCasesSummaryTab.tsx

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import {
  RefreshCw, Filter, X, ChevronDown, Settings2, Plus, Trash2,
  Pencil, Check, Layers, ClipboardList, AlertTriangle, Download, ArrowUpDown,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const MAROON = "#7b1113";
const FONT   = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";

const OFFICIAL_BODY_SYSTEM_NAMES = [
  "ALIMENTARY SYSTEM", "RESPIRATORY SYSTEM", "MUSCULO-SKELETAL SYSTEM",
  "INTEGUMENTARY SYSTEM", "URINARY SYSTEM", "METABOLIC ENDOCRINE SYSTEM",
  "CARDIOVASCULAR SYSTEM", "EYES, EARS, NOSE & THROAT DISORDERS",
  "COMMUNICABLE DISEASES",
  // TODO: idagdag dito yung natitirang 9 pangalan (dapat tumugma sa FIXED_BODY_SYSTEMS
  // sa src/lib/medical-cases-config.ts, ALL CAPS, eksaktong spelling)
];

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
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
  departments:      string[];
  bodySystems:      BodySystemRow[];
  grandTotal:       number;
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

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED STYLES / MINI COMPONENTS
───────────────────────────────────────────────────────────────────────────── */
const inputCls = [
  "w-full h-9 border border-gray-300 rounded-sm px-3 text-sm",
  "outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10",
  "transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400",
].join(" ");

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-gray-400">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MANAGE BODY SYSTEMS & CONDITIONS MODAL
───────────────────────────────────────────────────────────────────────────── */
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

  const [newSystemName, setNewSystemName] = useState("");
  const [addingSystem,  setAddingSystem]  = useState(false);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newConditionName, setNewConditionName] = useState<Record<string, string>>({});
  const [addingCondition,  setAddingCondition]  = useState<string | null>(null);

  const [editingSystemId, setEditingSystemId]     = useState<string | null>(null);
  const [editingSystemName, setEditingSystemName] = useState("");

  const [editingConditionId, setEditingConditionId]     = useState<string | null>(null);
  const [editingConditionName, setEditingConditionName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<
    { type: "system"; id: string; name: string } |
    { type: "condition"; id: string; name: string } | null
  >(null);
  const [deleting, setDeleting] = useState(false);
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

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddSystem = async () => {
    if (!newSystemName.trim()) return;
    setAddingSystem(true); setError("");
    try {
      const res  = await fetch(`/api/courses/${courseId}/body-systems`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: newSystemName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add.");
      setBodySystems(prev => [...prev, data.bodySystem]);
      setNewSystemName("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add body system.");
    } finally {
      setAddingSystem(false);
    }
  };

  const handleRenameSystem = async (id: string) => {
    if (!editingSystemName.trim()) return;
    try {
      const res  = await fetch(`/api/courses/${courseId}/body-systems/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: editingSystemName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to rename.");
      setBodySystems(prev => prev.map(b => b.id === id ? { ...b, name: data.bodySystem.name } : b));
      setEditingSystemId(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename body system.");
    }
  };

  const handleAddCondition = async (bodySystemId: string) => {
    const name = (newConditionName[bodySystemId] ?? "").trim();
    if (!name) return;
    setAddingCondition(bodySystemId); setError("");
    try {
      const res  = await fetch(`/api/courses/${courseId}/body-systems/${bodySystemId}/conditions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
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
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: editingConditionName.trim() }),
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
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error ?? "Failed to delete."); return; }

      if (deleteTarget.type === "system") {
        setBodySystems(prev => prev.filter(b => b.id !== deleteTarget.id));
      } else {
        setBodySystems(prev => prev.map(b => ({
          ...b,
          conditions: b.conditions.filter(c => c.id !== deleteTarget.id),
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

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30"
      style={{ backdropFilter: "blur(4px)", fontFamily: FONT }}
      onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100"
        onClick={e => e.stopPropagation()}>

        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0"
          style={{ background: MAROON }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Settings2 size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Clinic</p>
              <p className="text-sm font-black text-white">Manage Body Systems & Conditions</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
            <AlertTriangle size={13} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-blue-700 leading-relaxed">
              Body systems follow the standard 18-category clinic report and can&apos;t be added, renamed, or removed.
              You can still add, rename, or remove <span className="font-bold">conditions</span> under each one.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-300">
              <RefreshCw size={15} className="animate-spin" />
              <span className="text-xs">Loading…</span>
            </div>
          ) : bodySystems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300">
              <Layers className="w-7 h-7" />
              <p className="text-xs">No body systems yet. Add one above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bodySystems.map(bs => {
                const isExpanded = expanded.has(bs.id);
                const isEditingSystem = editingSystemId === bs.id;
                return (
                  <div key={bs.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50">
                      <button onClick={() => toggleExpand(bs.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 shrink-0 transition-transform"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                        <ChevronDown size={14} />
                      </button>

                      <span className="flex-1 text-sm font-black text-gray-800">{bs.name}</span>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 shrink-0">
                        {bs.conditions.length} condition{bs.conditions.length !== 1 ? "s" : ""}
                      </span>

                      {!OFFICIAL_BODY_SYSTEM_NAMES.includes(bs.name.toUpperCase()) && (
                        <button
                          onClick={() => setDeleteTarget({ type: "system", id: bs.id, name: bs.name })}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-red-300 hover:text-red-500 hover:bg-red-50 shrink-0"
                          title="Delete duplicate/stray body system">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="px-3 py-2.5 space-y-1.5 bg-white">
                        {bs.conditions.map(c => {
                          const isEditingCondition = editingConditionId === c.id;
                          return (
                            <div key={c.id}
                              className="flex items-center gap-2 pl-6 pr-1 py-1.5 rounded-md hover:bg-gray-50">
                              <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                              {isEditingCondition ? (
                                <input
                                  autoFocus
                                  value={editingConditionName}
                                  onChange={e => setEditingConditionName(e.target.value)}
                                  onKeyDown={e => e.key === "Enter" && handleRenameCondition(c.id)}
                                  className="flex-1 h-7 border border-gray-300 rounded-md px-2 text-xs outline-none focus:border-[#7b1113]"
                                />
                              ) : (
                                <span className="flex-1 text-xs text-gray-700">{c.name}</span>
                              )}
                              {isEditingCondition ? (
                                <button onClick={() => handleRenameCondition(c.id)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md text-green-500 hover:bg-green-50 shrink-0">
                                  <Check size={11} />
                                </button>
                              ) : (
                                <button onClick={() => { setEditingConditionId(c.id); setEditingConditionName(c.name); }}
                                  className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 shrink-0">
                                  <Pencil size={10} />
                                </button>
                              )}
                              <button onClick={() => setDeleteTarget({ type: "condition", id: c.id, name: c.name })}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-red-300 hover:text-red-500 hover:bg-red-50 shrink-0">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          );
                        })}

                        <div className="flex items-center gap-2 pl-6 pt-1">
                          <input
                            value={newConditionName[bs.id] ?? ""}
                            onChange={e => setNewConditionName(prev => ({ ...prev, [bs.id]: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && handleAddCondition(bs.id)}
                            placeholder="New condition (e.g. Diarrhea)"
                            className="flex-1 h-7 border border-gray-200 rounded-md px-2 text-xs outline-none bg-gray-50 focus:bg-white focus:border-[#7b1113]"
                          />
                          <button
                            onClick={() => handleAddCondition(bs.id)}
                            disabled={addingCondition === bs.id || !(newConditionName[bs.id] ?? "").trim()}
                            className="h-7 px-2.5 rounded-md text-[10px] font-bold text-white flex items-center gap-1 shrink-0 disabled:opacity-50"
                            style={{ background: MAROON }}>
                            {addingCondition === bs.id ? <RefreshCw size={10} className="animate-spin" /> : <Plus size={10} />}
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

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button onClick={onClose}
            className="w-full h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">
            Done
          </button>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/30"
          style={{ backdropFilter: "blur(4px)" }}
          onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full sm:w-80 overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-50">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">
                Delete {deleteTarget.type === "system" ? "this body system" : "this condition"}?
              </p>
              <p className="text-xs text-gray-500 mb-4 font-medium">{deleteTarget.name}</p>
              {deleteError && (
                <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ background: "#ef4444" }}>
                  {deleting ? <><RefreshCw size={12} className="animate-spin" /> Deleting...</> : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN TAB
───────────────────────────────────────────────────────────────────────────── */
export default function CourseMedicalCasesSummaryTab({ courseId, isAdmin }: Props) {
  const [summary,     setSummary]     = useState<SummaryResponse | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showManage,  setShowManage]  = useState(false);

  const [department, setDepartment] = useState("");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [bodySystemFilter, setBodySystemFilter] = useState("");
  const [conditionFilter,  setConditionFilter]  = useState("");

  // ── KEY CHANGE: collapsed is initialized from summary data so ALL rows
  //    start collapsed. We derive the initial set after the first fetch.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const canManage = !isAdmin;

  const MONTH_NAMES = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const currentMonth = MONTH_NAMES[new Date().getMonth()];
  const [exportSheet, setExportSheet] = useState(currentMonth);
  const [exportYear,  setExportYear]  = useState(new Date().getFullYear());
  const [exporting,   setExporting]   = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/medical-cases-summary/export?sheet=${exportSheet}&year=${exportYear}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Export failed.");
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `medical-cases-summary-${exportSheet}-${exportYear}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Network error while exporting.");
    } finally {
      setExporting(false);
    }
  };

  const fetchSummary = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const paramsObj = new URLSearchParams();
      if (department)       paramsObj.set("department",   department);
      if (dateFrom)         paramsObj.set("dateFrom",     dateFrom);
      if (dateTo)           paramsObj.set("dateTo",       dateTo);
      if (bodySystemFilter) paramsObj.set("bodySystemId", bodySystemFilter);
      if (conditionFilter)  paramsObj.set("conditionId",  conditionFilter);

      const res  = await fetch(`/api/courses/${courseId}/medical-cases-summary?${paramsObj}`);
      const raw  = await res.text();
      const data = raw ? JSON.parse(raw) : null;

      if (!res.ok) throw new Error(data?.error ?? `Failed to load (status ${res.status}).`);
      if (!data)   throw new Error("Server returned an empty response.");

      setSummary(data);

      // ── Collapse ALL body-system rows on every fresh fetch so the table
      //    starts clean. User can expand individual rows as needed.
      const allIds = new Set<string>((data.bodySystems ?? []).map((bs: BodySystemRow) => bs.id));
      setCollapsed(allIds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load summary.");
    } finally {
      setLoading(false);
    }
  }, [courseId, department, dateFrom, dateTo, bodySystemFilter, conditionFilter]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasActiveFilter = !!department || !!dateFrom || !!dateTo || !!bodySystemFilter || !!conditionFilter;
  const departments = summary?.departments ?? [];

  const bodySystemOptions = summary?.bodySystems ?? [];
  const conditionOptions = bodySystemOptions
    .filter(bs => !bodySystemFilter || bs.id === bodySystemFilter)
    .flatMap(bs => bs.conditions.map(c => ({ id: c.id, name: c.name, systemName: bs.name })));

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
    ? filteredBodySystems.reduce((sum, bs) => sum + bs.total, 0)
    : (summary?.grandTotal ?? 0);

  const filteredGrandCountsByDept = (bodySystemFilter || conditionFilter)
    ? departments.reduce((acc, d) => {
        acc[d] = filteredBodySystems.reduce((sum, bs) => sum + (bs.countsByDept[d] ?? 0), 0);
        return acc;
      }, {} as Record<string, number>)
    : (summary?.grandCountsByDept ?? {});

  return (
    <div className="h-full bg-[#f8f8f7] flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-0.5 truncate" style={{ color: MAROON }}>
            Clinic
          </p>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">Medical Cases Summary</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <button onClick={fetchSummary}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <select value={exportSheet} onChange={e => setExportSheet(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none">
            <option value="consolidated">All Year (Consolidated)</option>
            {MONTH_NAMES.map(m => (
              <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
          <input type="number" value={exportYear} onChange={e => setExportYear(parseInt(e.target.value) || exportYear)}
            className="w-20 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none" />
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
            {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {canManage && (
            <button onClick={() => setShowManage(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-1.5 rounded-lg text-white transition-all"
              style={{ background: MAROON }}>
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Manage Categories</span>
              <span className="sm:hidden">Manage</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* ── Table Card ── */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">

          {/* Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-white flex-wrap">
            <button onClick={() => setShowFilters(f => !f)}
              style={(showFilters || hasActiveFilter) ? { background: MAROON, color: "#fff", borderColor: MAROON } : {}}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all shrink-0
                ${!(showFilters || hasActiveFilter) ? "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700" : ""}`}>
              <Filter className="w-3 h-3" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
            </button>
            <span className="text-[11px] text-gray-400 ml-auto">
              Showing all-time totals unless a date range is set.
            </span>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-2.5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Department / Course</span>
                <div className="relative">
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 outline-none appearance-none max-w-[260px]">
                    <option value="">All Departments / Courses</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Body System</span>
                <div className="relative">
                  <select
                    value={bodySystemFilter}
                    onChange={e => { setBodySystemFilter(e.target.value); setConditionFilter(""); }}
                    className="text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 outline-none appearance-none max-w-[260px]">
                    <option value="">All Body Systems</option>
                    {bodySystemOptions.map(bs => <option key={bs.id} value={bs.id}>{bs.name}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Medical Condition</span>
                <div className="relative">
                  <select
                    value={conditionFilter}
                    onChange={e => setConditionFilter(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 bg-white text-gray-700 outline-none appearance-none max-w-[260px]">
                    <option value="">All Conditions</option>
                    {conditionOptions.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{!bodySystemFilter ? ` (${c.systemName})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
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
                    { label: "Today",      fn: () => { const d = todayISO(); setDateFrom(d); setDateTo(d); } },
                    { label: "This Week",  fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); setDateFrom(mon.toISOString().split("T")[0]); setDateTo(todayISO()); } },
                    { label: "This Month", fn: () => { const now = new Date(); setDateFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`); setDateTo(todayISO()); } },
                    { label: "All Time",   fn: () => { setDateFrom(""); setDateTo(""); } },
                  ].map(p => (
                    <button key={p.label} onClick={p.fn}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilter && (
                <button onClick={() => { setDepartment(""); setDateFrom(""); setDateTo(""); setBodySystemFilter(""); setConditionFilter(""); }}
                  className="flex items-center gap-1 text-[11px] font-bold hover:underline"
                  style={{ color: MAROON }}>
                  <X size={11} /> Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 py-20">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-xs font-medium">Loading summary...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-xs font-medium text-red-500 py-20">{error}</div>
          ) : !summary || summary.bodySystems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                <Layers className="w-7 h-7" style={{ color: MAROON }} />
              </div>
              <p className="text-sm text-gray-400 font-medium">No body systems set up yet.</p>
              {canManage && (
                <button onClick={() => setShowManage(true)}
                  className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
                  + Set up body systems & conditions
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {/* Body System / Condition column */}
                    <th
                      className="text-left px-3 py-3 whitespace-nowrap"
                      style={{ border: "1px solid #d1d5db", minWidth: "260px" }}
                    >
                      <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-700">
                        Body System / Condition <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>

                    {/* One column per department */}
                    {departments.map(d => (
                      <th key={d} className="text-left px-3 py-3 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-700">
                          {d} <ArrowUpDown className="w-3 h-3" />
                        </span>
                      </th>
                    ))}

                    {/* Total column — renamed from "Grand Total" */}
                    <th
                      className="text-left px-3 py-3 whitespace-nowrap"
                      style={{ border: "1px solid #d1d5db", background: "#fef2f2" }}
                    >
                      <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide" style={{ color: MAROON }}>
                        Total <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBodySystems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={departments.length + 2}
                        className="px-3 py-8 text-center text-xs text-gray-400 italic"
                        style={{ border: "1px solid #d1d5db" }}
                      >
                        No results match the selected filters.
                      </td>
                    </tr>
                  ) : filteredBodySystems.map(bs => {
                    // ── collapsed by default; user expands on click ──
                    const isCollapsed = collapsed.has(bs.id);

                    return (
                      <Fragment key={bs.id}>
                        {/* ── Body system summary row ── */}
                        <tr
                          className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                          onClick={() => toggleCollapse(bs.id)}
                        >
                          <td className="px-3 py-3 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                              <ChevronDown
                                size={13}
                                className="text-gray-400 transition-transform shrink-0"
                                style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                              />
                              {bs.name}
                            </span>
                          </td>
                          {departments.map(d => (
                            <td key={d} className="px-3 py-3 text-xs font-bold text-gray-800 tabular-nums" style={{ border: "1px solid #d1d5db" }}>
                              {bs.countsByDept[d] ?? 0}
                            </td>
                          ))}
                          <td className="px-3 py-3 text-xs font-bold tabular-nums" style={{ border: "1px solid #d1d5db", background: "#fef2f2", color: MAROON }}>
                            {bs.total}
                          </td>
                        </tr>

                        {/* ── Condition rows — only rendered when NOT collapsed ── */}
                        {!isCollapsed && bs.conditions.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="px-3 py-3 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                              <span className="flex items-center gap-2 pl-5 text-xs text-gray-800">
                                <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                                {c.name}
                              </span>
                            </td>
                            {departments.map(d => (
                              <td key={d} className="px-3 py-3 text-xs text-gray-800 tabular-nums" style={{ border: "1px solid #d1d5db" }}>
                                {c.countsByDept[d] ?? 0}
                              </td>
                            ))}
                            <td className="px-3 py-3 text-xs font-bold text-gray-800 tabular-nums" style={{ border: "1px solid #d1d5db", background: "#fef9f9" }}>
                              {c.total}
                            </td>
                          </tr>
                        ))}

                        {/* Empty-conditions placeholder (only shown when expanded) */}
                        {!isCollapsed && bs.conditions.length === 0 && (
                          <tr>
                            <td
                              colSpan={departments.length + 2}
                              className="px-3 py-2 pl-8 text-[11px] text-gray-300 italic"
                              style={{ border: "1px solid #d1d5db" }}
                            >
                              No conditions added under this body system yet.
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>

                {/* ── Footer row — "Total" (was "Grand Total") ── */}
                <tfoot>
                  <tr style={{ background: "#fafafa" }}>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ border: "1px solid #d1d5db" }}>
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-800">Total</span>
                    </td>
                    {departments.map(d => (
                      <td key={d} className="px-3 py-3 text-xs font-bold text-gray-800 tabular-nums" style={{ border: "1px solid #d1d5db" }}>
                        {filteredGrandCountsByDept[d] ?? 0}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-xs font-bold tabular-nums" style={{ border: "1px solid #d1d5db", background: "#fce8e8", color: MAROON }}>
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
    </div>
  );
}