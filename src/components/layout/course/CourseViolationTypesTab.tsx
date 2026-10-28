"use client";
// src/components/layout/course/CourseViolationTypesTab.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Search, RefreshCw, ChevronDown, X, Plus, Pencil, Trash2, Check,
  AlertCircle, CheckCircle2, Inbox, ShieldAlert,
} from "lucide-react";
import { SANCTIONS } from "@/server/osa/violation-types-data";
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

/* ════════════════════════════════════════════════════════════════════════════
   2. TYPES & STATIC META
   ════════════════════════════════════════════════════════════════════════════ */

type Severity = "MINOR" | "SERIOUS" | "VERY_SERIOUS";

type VType = {
  id: string;
  code: string;
  name: string;
  severity: Severity;
  dismissalOnFirst: boolean;
  defaultSanction: string | null;
  isActive: boolean;
};

type Form = {
  code: string;
  name: string;
  severity: Severity;
  dismissalOnFirst: boolean;
  defaultSanction: string;
};

const EMPTY: Form = { code: "", name: "", severity: "MINOR", dismissalOnFirst: false, defaultSanction: "" };

const SEV_META: Record<Severity, { label: string; color: string; bg: string }> = {
  MINOR:        { label: "Minor",        color: "#92400e", bg: "#fef3c7" },
  SERIOUS:      { label: "Serious",      color: "#9a3412", bg: "#ffedd5" },
  VERY_SERIOUS: { label: "Very serious", color: "#991b1b", bg: "#fee2e2" },
};

const SEV_TABS: Array<Severity | "ALL"> = ["ALL", "MINOR", "SERIOUS", "VERY_SERIOUS"];

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all bg-white";
const selectCls =
  "w-full border border-gray-200 rounded-lg pl-3 pr-8 py-2.5 sm:py-2 text-sm outline-none appearance-none bg-white text-gray-700 focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

/* ════════════════════════════════════════════════════════════════════════════
   3. SMALL UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════ */

function SeverityBadge({ severity }: { severity: Severity }) {
  const m = SEV_META[severity];
  return (
    <span
      className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  );
}

function sanctionText(i: VType) {
  return i.dismissalOnFirst ? "Immediate dropping/exclusion" : i.defaultSanction || "Per Disciplinary Council";
}

function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: C.brandTint }}>
        <Inbox className="w-6 h-6" style={{ color: C.brand }} />
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

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ════════════════════════════════════════════════════════════════════════════
   4. MODAL SHELL (bottom-sheet on mobile, centered on desktop)
   ════════════════════════════════════════════════════════════════════════════ */

function SheetModal({
  onClose, tone = "brand", icon, title, subtitle, children, footer,
  maxWidth = "max-w-md", zClass = "z-50",
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
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const accent = tone === "danger" ? C.danger : C.brand;

  return (
    <div
      /* pb-[60px] on mobile keeps the sheet clear of the bottom nav */
      className={`fixed inset-0 ${zClass} flex items-end sm:items-center justify-center bg-black/40 pb-[60px] sm:pb-0`}
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

function ConfirmModal({
  title, message, confirmLabel, busy, onConfirm, onClose,
}: {
  title: string; message: ReactNode; confirmLabel: string;
  busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <SheetModal
      onClose={onClose}
      tone="danger"
      icon={<Trash2 size={16} />}
      title={title}
      maxWidth="max-w-sm"
      zClass="z-[60]"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={busy}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
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

/* ════════════════════════════════════════════════════════════════════════════
   5. ADD / EDIT MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function TypeFormModal({
  id, initial, saving, error, onSave, onClose,
}: {
  id: string | null;
  initial: Form;
  saving: boolean;
  error: string;
  onSave: (f: Form) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Form>(initial);
  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }));
  const canSave = !!form.code.trim() && !!form.name.trim();

  return (
    <SheetModal
      onClose={() => { if (!saving) onClose(); }}
      maxWidth="max-w-lg"
      icon={<ShieldAlert size={16} />}
      title={id ? "Edit violation type" : "Add violation type"}
      subtitle="Office of Student Affairs"
      footer={
        <div className="px-5 py-4 flex gap-2">
          <button onClick={onClose} disabled={saving}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => onSave(form)} disabled={saving || !canSave}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: C.brand }}>
            {saving
              ? <><RefreshCw size={13} className="animate-spin" /> Saving…</>
              : <><Check size={13} /> Save</>}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5 space-y-4">
        {error && (
          <div className="flex items-start gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5" role="alert">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
          <div>
            <label className={labelCls}>Code <span className="text-red-500">*</span></label>
            <input value={form.code} onChange={e => set({ code: e.target.value })}
              placeholder="e.g. 78.1-b.6" className={`${inputCls} font-mono`} autoFocus />
          </div>
          <div>
            <label className={labelCls}>Severity</label>
            <div className="relative">
              <select value={form.severity} onChange={e => set({ severity: e.target.value as Severity })} className={selectCls}>
                <option value="MINOR">Minor</option>
                <option value="SERIOUS">Serious</option>
                <option value="VERY_SERIOUS">Very serious</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>Offense <span className="text-red-500">*</span></label>
          <input value={form.name} onChange={e => set({ name: e.target.value })}
            placeholder="Describe the offense" className={inputCls} />
        </div>

        <label
          className="flex items-start gap-2.5 rounded-xl border px-3.5 py-3 cursor-pointer"
          style={{
            borderColor: form.dismissalOnFirst ? C.brand : C.line,
            background: form.dismissalOnFirst ? C.brandTint : "#fff",
          }}
        >
          <input type="checkbox" checked={form.dismissalOnFirst}
            onChange={e => set({ dismissalOnFirst: e.target.checked })}
            className="w-4 h-4 mt-0.5 shrink-0" style={{ accentColor: C.brand }} />
          <span className="text-[13px] leading-snug" style={{ color: C.body }}>
            Immediate dropping/exclusion even on first offense
          </span>
        </label>

        <div>
          <label className={labelCls}>Default sanction <span className="font-normal text-gray-400">(optional)</span></label>
          <div className="relative">
            <select value={form.defaultSanction} onChange={e => set({ defaultSanction: e.target.value })}
              className={selectCls} disabled={form.dismissalOnFirst}>
              <option value="">Per Disciplinary Council</option>
              {SANCTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {form.dismissalOnFirst && (
            <p className="text-[11px] mt-1" style={{ color: C.faint }}>
              Not used while immediate dropping/exclusion is on.
            </p>
          )}
        </div>
      </div>
    </SheetModal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   6. MAIN TAB (default export)
   ════════════════════════════════════════════════════════════════════════════ */

export default function CourseViolationTypesTab({ courseId, isHead }: { courseId: string; isHead: boolean }) {
  const base = `/api/courses/${courseId}/osa/violation-types`;

  const [items,        setItems]        = useState<VType[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [q,            setQ]            = useState("");
  const [sev,          setSev]          = useState<Severity | "ALL">("ALL");
  const [modal,        setModal]        = useState<{ id: string | null; form: Form } | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [modalError,   setModalError]   = useState("");
  const [deleteTarget, setDeleteTarget] = useState<VType | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [toast,        setToast]        = useState<ToastState>(null);

  const debouncedQ = useDebounced(q, 200);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string, tone: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(base);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load violation types.");
      setItems(json.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load violation types.");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { load(); }, [load]);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json;
  }

  async function save(f: Form) {
    if (!modal) return;
    setSaving(true);
    setModalError("");
    try {
      const payload = { ...f, defaultSanction: f.defaultSanction || null };
      if (modal.id) await call(`${base}/${modal.id}`, "PATCH", payload);
      else await call(base, "POST", payload);
      const wasEdit = !!modal.id;
      setModal(null);
      await load();
      notify(wasEdit ? "Violation type updated" : "Violation type added");
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await call(`${base}/${deleteTarget.id}`, "DELETE");
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
      notify("Violation type deleted");
      setDeleteTarget(null);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Couldn’t delete the violation type.", "error");
    } finally {
      setDeleting(false);
    }
  }

  const openAdd = () => { setModalError(""); setModal({ id: null, form: EMPTY }); };
  const openEdit = (i: VType) => {
    setModalError("");
    setModal({
      id: i.id,
      form: {
        code: i.code,
        name: i.name,
        severity: i.severity,
        dismissalOnFirst: i.dismissalOnFirst,
        defaultSanction: i.defaultSanction || "",
      },
    });
  };

  /* Rows matching the search (used for tab counts) */
  const searched = useMemo(() => {
    const s = debouncedQ.trim().toLowerCase();
    if (!s) return items;
    return items.filter(i => i.name.toLowerCase().includes(s) || i.code.toLowerCase().includes(s));
  }, [items, debouncedQ]);

  const counts = useMemo(() => {
    const c: Record<Severity | "ALL", number> = { ALL: searched.length, MINOR: 0, SERIOUS: 0, VERY_SERIOUS: 0 };
    searched.forEach(i => { c[i.severity] += 1; });
    return c;
  }, [searched]);

  const filtered = useMemo(
    () => (sev === "ALL" ? searched : searched.filter(i => i.severity === sev)),
    [searched, sev],
  );

  const hasAnyFilter = !!(q || sev !== "ALL");
  const resetAll = () => { setQ(""); setSev("ALL"); };

  const emptyState = items.length === 0 ? (
    <EmptyState
      title="No violation types yet"
      hint={isHead ? "Add the first offense so it can be used in violation records." : "Violation types will appear here once they’re added."}
      action={isHead ? (
        <button onClick={openAdd}
          className="mt-2 flex items-center gap-1.5 text-xs font-bold px-4 h-9 rounded-lg text-white" style={{ background: C.brand }}>
          <Plus size={13} /> Add type
        </button>
      ) : undefined}
    />
  ) : (
    <EmptyState
      title="No matching violation types"
      hint="Try a different search or severity."
      action={
        <button onClick={resetAll} className="mt-2 text-xs font-bold hover:underline" style={{ color: C.brand }}>
          Clear all filters
        </button>
      }
    />
  );

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: FONT, background: C.canvas }}>

      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between shrink-0 gap-3" style={{ borderColor: C.line }}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: C.ink }}>Violation types</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: C.faint }}>
            Based on the DHVSU Student Manual 2019, Sec. 78.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={load} aria-label="Refresh"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 w-9 h-9 sm:w-auto sm:px-3 rounded-lg transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {isHead && (
            <button onClick={openAdd}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-9 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ background: C.brand }}>
              <Plus className="w-3.5 h-3.5" />
              <span>Add<span className="hidden sm:inline"> type</span></span>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5 min-h-0">

        {/* Table card */}
        <div className="flex-1 bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[420px]" style={{ borderColor: C.line }}>

          {/* Severity tabs */}
          <div className="border-b overflow-x-auto" style={{ borderColor: C.line }}>
            <div role="tablist" className="flex px-2 sm:px-3 min-w-max">
              {SEV_TABS.map(t => {
                const active = sev === t;
                return (
                  <button
                    key={t} role="tab" aria-selected={active} onClick={() => setSev(t)}
                    className="relative flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors"
                    style={{ color: active ? C.brand : C.muted }}
                  >
                    {t === "ALL" ? "All" : SEV_META[t].label}
                    <span className="text-[11px] tabular-nums px-1.5 rounded-full"
                      style={{ background: active ? C.brandTint : C.lineSoft, color: active ? C.brand : C.muted }}>
                      {counts[t]}
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
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search code or offense"
                aria-label="Search violation types"
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
              />
              {q && (
                <button onClick={() => setQ("")} aria-label="Clear search" className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="animate-pulse divide-y divide-gray-100" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                  <div className="h-3 flex-1 bg-gray-100 rounded" />
                  <div className="h-5 w-16 bg-gray-100 rounded-full" />
                  <div className="h-3 w-32 bg-gray-100 rounded hidden sm:block" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={load}
                className="text-xs font-bold px-4 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1">{emptyState}</div>
          ) : (
            <div className="flex-1 overflow-y-auto">

              {/* Desktop table */}
              <table className="w-full border-collapse hidden sm:table">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: "#fafafa" }}>
                    {["Code", "Offense", "Severity", "Sanction", ...(isHead ? [""] : [])].map((h, i) => (
                      <th key={i} scope="col"
                        className="text-left px-4 py-2.5 whitespace-nowrap border-b"
                        style={{ fontSize: 11, fontWeight: 800, color: C.body, borderColor: C.line }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(i => (
                    <tr key={i.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 text-xs font-mono border-b whitespace-nowrap align-top" style={{ color: C.body, borderColor: C.lineSoft }}>
                        {i.code}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-medium border-b min-w-[260px] align-top" style={{ color: C.ink, borderColor: C.lineSoft }}>
                        {i.name}
                      </td>
                      <td className="px-4 py-3.5 border-b whitespace-nowrap align-top" style={{ borderColor: C.lineSoft }}>
                        <SeverityBadge severity={i.severity} />
                      </td>
                      <td className="px-4 py-3.5 text-xs border-b align-top" style={{ color: i.dismissalOnFirst ? C.danger : C.body, borderColor: C.lineSoft, fontWeight: i.dismissalOnFirst ? 600 : 400 }}>
                        {sanctionText(i)}
                      </td>
                      {isHead && (
                        <td className="px-3 py-2.5 border-b whitespace-nowrap align-top" style={{ borderColor: C.lineSoft }}>
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => openEdit(i)} aria-label={`Edit ${i.code}`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeleteTarget(i)} aria-label={`Delete ${i.code}`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filtered.map(i => (
                  <div key={i.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-mono" style={{ color: C.muted }}>{i.code}</p>
                        <p className="text-sm font-bold mt-0.5 leading-snug" style={{ color: C.ink }}>{i.name}</p>
                      </div>
                      <SeverityBadge severity={i.severity} />
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: i.dismissalOnFirst ? C.danger : C.muted, fontWeight: i.dismissalOnFirst ? 600 : 400 }}>
                      {sanctionText(i)}
                    </p>
                    {isHead && (
                      <div className="flex items-center gap-2 mt-2.5">
                        <button onClick={() => openEdit(i)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 active:bg-gray-50">
                          <Pencil size={12} /> Edit
                        </button>
                        <button onClick={() => setDeleteTarget(i)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-100 text-xs font-semibold text-red-600 active:bg-red-50">
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer count */}
          {!loading && !error && filtered.length > 0 && (
            <div className="px-4 sm:px-5 py-3 border-t bg-white shrink-0" style={{ borderColor: C.line }}>
              <span className="text-xs tabular-nums" style={{ color: C.muted }}>
                Showing {filtered.length} of {items.length} violation type{items.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <TypeFormModal
          id={modal.id}
          initial={modal.form}
          saving={saving}
          error={modalError}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete this violation type?"
          confirmLabel="Delete"
          busy={deleting}
          message={
            <>
              <strong className="font-mono">{deleteTarget.code}</strong> — {deleteTarget.name}
              <br />
              Existing violation records that used it will be kept.
            </>
          }
          onConfirm={remove}
          onClose={() => { if (!deleting) setDeleteTarget(null); }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}