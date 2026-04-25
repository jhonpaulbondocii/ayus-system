// src/components/layout/course/CourseAssignmentsTab.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, MoreVertical, X, ChevronDown,
  Zap, CheckCircle, Circle, Pencil, Download,
  Upload, Users, Trash2,
} from "lucide-react";
import {
  COLORS, MAROON, FONT, TIME_OPTIONS,
  fmtDue, fmtDate, fmtAvail, fmtDateLabel,
  isoToDate, isoToTime,
  loadPersistedGroups, persistGroups,
  normalizeOpt, OPT_LABELS,
  GRADE_OPTIONS, SUBMISSION_TYPES, SUBMISSION_ENTRY_TYPES,
} from "./helpers";
import type {
  Assignment, Section, Staff,
  AssignRow, SubmissionEntry, AssignmentGroupItem,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// DELETE CONFIRM MODAL
// ─────────────────────────────────────────────────────────────────────────────
function DeleteConfirmModal({
  title, onConfirm, onCancel, deleting,
}: {
  title: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-96 border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100" style={{ background: "#fef2f2" }}>
          <div className="flex items-center gap-2">
            <Trash2 size={15} style={{ color: MAROON }} />
            <span className="text-sm font-black" style={{ color: MAROON }}>Delete Assignment</span>
          </div>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-gray-700 leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-bold">&ldquo;{title}&rdquo;</span>?{" "}
            This action cannot be undone.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onCancel} disabled={deleting} className="h-9 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="h-9 px-4 rounded-xl text-sm font-black text-white disabled:opacity-60" style={{ background: MAROON }}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK EDIT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function QuickEditModal({
  assignment, onClose, onSave, onMoreOptions,
}: {
  assignment: Assignment; onClose: () => void;
  onSave: (updated: Partial<Assignment> & { dueTime?: string }) => Promise<void>;
  onMoreOptions: () => void;
}) {
  const [name, setName] = useState(assignment.title);
  const [dueDate, setDueDate] = useState(isoToDate(assignment.dueDate));
  const [dueTime, setDueTime] = useState(isoToTime(assignment.dueDate));
  const [points, setPoints] = useState(String(assignment.points));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateLabel = fmtDateLabel(dueDate, dueTime);

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    try {
      await onSave({ title: name.trim(), points: parseFloat(points) || 0, dueDate: dueDate || null, dueTime });
      onClose();
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[480px] border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-800">Edit Assignment</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100"><X size={14} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Name <span className="text-red-500">*</span></label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              className="w-full h-9 border border-gray-300 rounded px-3 text-sm outline-none"
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">Due at</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 block mb-0.5">Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-9 border border-gray-300 rounded px-3 text-xs outline-none"
                  onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">Time</label>
                <div className="relative">
                  <select value={dueTime} onChange={(e) => setDueTime(e.target.value)}
                    className="h-9 border border-gray-300 rounded px-3 text-xs bg-white outline-none appearance-none pr-7"
                    style={{ minWidth: 120 }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}>
                    {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            {dateLabel && <p className="text-xs mt-1.5 font-medium" style={{ color: MAROON }}>{dateLabel}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Points</label>
            <input type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)}
              className="w-32 h-9 border border-gray-300 rounded px-3 text-sm outline-none"
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
          </div>
          {error && <p className="text-xs text-red-600">⚠ {error}</p>}
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onMoreOptions} className="h-8 px-4 border border-gray-300 text-xs text-gray-600 rounded hover:bg-white">More Options</button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={saving} className="h-8 px-4 border border-gray-300 text-xs text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving || !name.trim()} className="h-8 px-5 text-xs text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN TO PANEL
// ─────────────────────────────────────────────────────────────────────────────
function AssignToPanel({
  assignment, courseId, sections, staff, onClose, onSave,
}: {
  assignment: Assignment; courseId: string; sections: Section[]; staff: Staff[];
  onClose: () => void; onSave: () => void;
}) {
  const [rows, setRows] = useState<AssignRow[]>([{
    id: 1, assignees: ["Everyone"],
    dueDate: isoToDate(assignment.dueDate), dueTime: isoToTime(assignment.dueDate),
    availableFrom: isoToDate(assignment.availableFrom), availableFromTime: isoToTime(assignment.availableFrom),
    until: isoToDate(assignment.availableUntil), untilTime: isoToTime(assignment.availableUntil),
  }]);
  const [saving, setSaving] = useState(false);
  const [openDropId, setOpenDropId] = useState<number | null>(null);
  const [dropSearch, setDropSearch] = useState("");

  useEffect(() => {
    if (openDropId === null) return;
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-assigndrop]")) setOpenDropId(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openDropId]);

  const updateRow = (id: number, field: keyof AssignRow, value: string | string[]) =>
    setRows((p) => p.map((r) => r.id === id ? { ...r, [field]: value } : r));

  const toggleAssignee = (rowId: number, name: string) =>
    setRows((p) => p.map((r) => {
      if (r.id !== rowId) return r;
      const has = r.assignees.includes(name);
      return { ...r, assignees: has ? r.assignees.filter((a) => a !== name) : [...r.assignees, name] };
    }));

  const addRow = () => setRows((p) => [...p, { id: Date.now(), assignees: [], dueDate: "", dueTime: "11:59 PM", availableFrom: "", availableFromTime: "12:00 AM", until: "", untilTime: "11:59 PM" }]);
  const removeRow = (id: number) => setRows((p) => p.filter((r) => r.id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      const row = rows[0];
      await fetch(`/api/courses/${courseId}/assignments/${assignment.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignees: row.assignees, dueDate: row.dueDate || null, dueTime: row.dueTime, availableFrom: row.availableFrom || null, availableFromTime: row.availableFromTime, availableUntil: row.until || null, untilTime: row.untilTime }),
      });
      onSave(); onClose();
    } finally { setSaving(false); }
  };

  function DateRow({ label, dateVal, timeVal, onDateChange, onTimeChange, onClear }: {
    label: string; dateVal: string; timeVal: string;
    onDateChange: (v: string) => void; onTimeChange: (v: string) => void; onClear: () => void;
  }) {
    const localLabel = fmtDateLabel(dateVal, timeVal);
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Date</p>
            <div className="relative flex items-center border border-gray-300 rounded h-8 px-2 bg-white">
              <input type="date" value={dateVal} onChange={(e) => onDateChange(e.target.value)} className="flex-1 text-xs outline-none bg-transparent" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Time</p>
            <div className="relative">
              <select value={timeVal} onChange={(e) => onTimeChange(e.target.value)} className="w-full h-8 border border-gray-300 rounded px-2 text-xs bg-white outline-none appearance-none pr-6">
                {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        {localLabel && <p className="text-[10px] text-gray-500">Local: {localLabel}</p>}
        <button onClick={onClear} className="text-[11px] hover:underline" style={{ color: MAROON }}>Clear</button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col" style={{ width: 380, fontFamily: FONT }}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5"><rect x="4" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" /></svg>
              <span className="text-sm font-bold text-gray-800">{assignment.title}</span>
            </div>
            <p className="text-xs text-gray-500 ml-6">Assignment | {assignment.points} pts</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-400 hover:bg-gray-100 shrink-0 mt-0.5"><X size={14} /></button>
        </div>
        <div className="mx-4 mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded p-3 shrink-0">
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#1d6fa4" }}>
            <span className="text-white text-[10px] font-bold">i</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">Select who should be assigned and use the drop-down menus or manually enter your date and time.</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {rows.map((row, idx) => (
            <div key={row.id} className="border border-gray-200 rounded-md p-3 space-y-4 relative">
              {idx > 0 && <button onClick={() => removeRow(row.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><X size={13} /></button>}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Assign To</p>
                <div className="relative" data-assigndrop>
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); setOpenDropId(openDropId === row.id ? null : row.id); setDropSearch(""); }}
                    className="w-full min-h-[34px] border border-gray-300 rounded px-2 py-1 flex flex-wrap gap-1 items-center cursor-pointer bg-white"
                  >
                    {row.assignees.map((a) => (
                      <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white font-medium" style={{ background: MAROON }}>
                        {a}
                        <button onMouseDown={(e) => { e.stopPropagation(); toggleAssignee(row.id, a); }} className="hover:opacity-70 font-bold text-sm leading-none">×</button>
                      </span>
                    ))}
                    <input readOnly placeholder={row.assignees.length ? "" : "Start typing to search..."} className="flex-1 min-w-20 text-xs outline-none bg-transparent text-gray-400 cursor-pointer" />
                    <ChevronDown size={12} className="text-gray-400 shrink-0" style={{ transform: openDropId === row.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                  </div>
                  {openDropId === row.id && (
                    <div data-assigndrop className="absolute z-50 w-full bg-white border border-gray-200 shadow-xl rounded mt-0.5 max-h-60 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
                      <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white">
                        <input autoFocus value={dropSearch} onChange={(e) => setDropSearch(e.target.value)} placeholder="Search..." className="w-full h-7 px-2 text-xs border border-gray-200 rounded outline-none focus:border-[#7b1113]" />
                      </div>
                      {["Everyone"].filter((o) => o.toLowerCase().includes(dropSearch.toLowerCase())).map((opt) => (
                        <button key={opt} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, opt); }}
                          className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                          style={{ color: row.assignees.includes(opt) ? MAROON : "#374151", fontWeight: row.assignees.includes(opt) ? 600 : 400 }}>
                          {opt}{row.assignees.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
                        </button>
                      ))}
                      {sections.filter((s) => s.name.toLowerCase().includes(dropSearch.toLowerCase())).length > 0 && (
                        <>
                          <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 border-t border-gray-100">Sections</div>
                          {sections.filter((s) => s.name.toLowerCase().includes(dropSearch.toLowerCase())).map((s) => (
                            <button key={s.id} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }}
                              className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                              style={{ color: row.assignees.includes(s.name) ? MAROON : "#374151", fontWeight: row.assignees.includes(s.name) ? 600 : 400 }}>
                              {s.name}{row.assignees.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                            </button>
                          ))}
                        </>
                      )}
                      {staff.filter((s) => s.name.toLowerCase().includes(dropSearch.toLowerCase())).length > 0 && (
                        <>
                          <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 border-t border-gray-100">Staff</div>
                          {staff.filter((s) => s.name.toLowerCase().includes(dropSearch.toLowerCase())).map((s) => (
                            <button key={s.id} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }}
                              className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                              style={{ color: row.assignees.includes(s.name) ? MAROON : "#374151", fontWeight: row.assignees.includes(s.name) ? 600 : 400 }}>
                              {s.name}{row.assignees.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <DateRow label="Due Date" dateVal={row.dueDate} timeVal={row.dueTime} onDateChange={(v) => updateRow(row.id, "dueDate", v)} onTimeChange={(v) => updateRow(row.id, "dueTime", v)} onClear={() => { updateRow(row.id, "dueDate", ""); updateRow(row.id, "dueTime", "11:59 PM"); }} />
              <DateRow label="Available from" dateVal={row.availableFrom} timeVal={row.availableFromTime} onDateChange={(v) => updateRow(row.id, "availableFrom", v)} onTimeChange={(v) => updateRow(row.id, "availableFromTime", v)} onClear={() => { updateRow(row.id, "availableFrom", ""); updateRow(row.id, "availableFromTime", "12:00 AM"); }} />
              <DateRow label="Until" dateVal={row.until} timeVal={row.untilTime} onDateChange={(v) => updateRow(row.id, "until", v)} onTimeChange={(v) => updateRow(row.id, "untilTime", v)} onClear={() => { updateRow(row.id, "until", ""); updateRow(row.id, "untilTime", "11:59 PM"); }} />
            </div>
          ))}
          <button onClick={addRow} className="flex items-center gap-1.5 text-xs font-medium hover:underline" style={{ color: MAROON }}><Plus size={13} /> Add</button>
        </div>
        <div className="shrink-0 border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-2 bg-gray-50">
          <button onClick={onClose} className="h-8 px-4 border border-gray-300 text-xs text-gray-600 rounded hover:bg-white">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="h-8 px-5 text-xs text-white rounded hover:opacity-90 disabled:opacity-50 font-medium" style={{ background: MAROON }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP MODALS
// ─────────────────────────────────────────────────────────────────────────────
function AddGroupModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (name: string) => void; saving: boolean }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[420px] border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-800">Add Assignment Group</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100" style={{ borderColor: MAROON, color: MAROON }}><X size={14} /></button>
        </div>
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 shrink-0">Group Name:</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())} placeholder="e.g., Essay Group 1"
              className="flex-1 h-9 border border-gray-300 rounded px-3 text-sm outline-none"
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)} onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} disabled={saving} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={() => name.trim() && onSave(name.trim())} disabled={saving || !name.trim()} className="h-9 px-4 text-sm text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditGroupModal({ groupName, onClose, onSave, saving }: { groupName: string; onClose: () => void; onSave: (newName: string) => void; saving: boolean }) {
  const [name, setName] = useState(groupName);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[420px] border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-800">Edit Assignment Group</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100" style={{ borderColor: MAROON, color: MAROON }}><X size={14} /></button>
        </div>
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 shrink-0">Group Name:</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())}
              className="flex-1 h-9 border border-gray-300 rounded px-3 text-sm outline-none"
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)} onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} disabled={saving} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={() => name.trim() && onSave(name.trim())} disabled={saving || !name.trim() || name.trim() === groupName} className="h-9 px-4 text-sm text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteGroupModal({ groupName, assignmentCount, otherGroups, onClose, onDelete }: {
  groupName: string; assignmentCount: number; otherGroups: string[];
  onClose: () => void; onDelete: (action: "delete" | "move", targetGroup?: string) => void;
}) {
  const [choice, setChoice] = useState<"delete" | "move">("delete");
  const [targetGroup, setTargetGroup] = useState(otherGroups[0] ?? "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[460px] border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ fontFamily: FONT }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-800">Delete Assignment Group</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100"><X size={14} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-700">You are about to delete <strong>{groupName}</strong>, which has <strong>{assignmentCount}</strong> assignment{assignmentCount !== 1 ? "s" : ""} in it.</p>
          <p className="text-sm text-gray-700">Would you like to:</p>
          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={choice === "delete"} onChange={() => setChoice("delete")} className="accent-[#7b1113]" /><span className="text-sm text-gray-700">Delete its assignments</span></label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={choice === "move"} onChange={() => setChoice("move")} disabled={otherGroups.length === 0} className="accent-[#7b1113]" /><span className={`text-sm ${otherGroups.length === 0 ? "text-gray-400" : "text-gray-700"}`}>Move its assignments to</span></label>
            {choice === "move" && otherGroups.length > 0 && (
              <div className="ml-6 relative">
                <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)} className="w-52 h-9 border border-gray-300 rounded px-3 text-sm bg-white outline-none appearance-none pr-8 focus:border-[#7b1113]">
                  <option value="">[ Select a Group ]</option>
                  {otherGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-100">Cancel</button>
          <button onClick={() => onDelete(choice, choice === "move" ? targetGroup : undefined)} disabled={choice === "move" && !targetGroup} className="h-9 px-4 text-sm text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>Delete Group</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENT ROW DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
type AssignmentDropdownAction = "edit" | "speedgrader" | "duplicate" | "assignTo";

function AssignmentRowDropdown({ assignment, onAction, onClose }: {
  assignment: Assignment;
  onAction: (action: AssignmentDropdownAction, a: Assignment) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const items: { label: string; action: AssignmentDropdownAction; icon: React.ReactNode }[] = [
    { label: "Edit", action: "edit", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> },
    { label: "SpeedGrader", action: "speedgrader", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> },
    { label: "Duplicate", action: "duplicate", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg> },
    { label: "Assign To…", action: "assignTo", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
  ];

  return (
    <div ref={menuRef} className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 overflow-hidden py-1" style={{ minWidth: 180, fontFamily: FONT }} onClick={(e) => e.stopPropagation()}>
      {items.map((item) => (
        <button key={item.action} onMouseDown={(e) => { e.stopPropagation(); onAction(item.action, assignment); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-[#7b1113] hover:text-white transition-colors">
          <span className="shrink-0">{item.icon}</span>{item.label}
        </button>
      ))}
    </div>
  );
}

function GroupDropdown({ onEdit, onDelete, onClose }: { onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={menuRef} className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 overflow-hidden py-1" style={{ minWidth: 160, fontFamily: FONT }} onClick={(e) => e.stopPropagation()}>
      <button onMouseDown={(e) => { e.stopPropagation(); onEdit(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-[#7b1113] hover:text-white transition-colors">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>Edit
      </button>
      <button onMouseDown={(e) => { e.stopPropagation(); onDelete(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-red-600 hover:text-white transition-colors">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>Delete
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENT ROW
// ─────────────────────────────────────────────────────────────────────────────
function AdminAssignmentRow({ a, onView, onEdit, onDuplicate, onAssignTo, onSpeedGrader }: {
  a: Assignment;
  onView: (a: Assignment) => void; onEdit: (a: Assignment) => void;
  onDuplicate: (a: Assignment) => void; onAssignTo: (a: Assignment) => void; onSpeedGrader: (a: Assignment) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const now = new Date();
  const isClosed = a.availableUntil && now > new Date(a.availableUntil);
  const due = fmtDue(a.dueDate);

  const handleAction = (action: AssignmentDropdownAction, assignment: Assignment) => {
    if (action === "edit") onEdit(assignment);
    else if (action === "speedgrader") onSpeedGrader(assignment);
    else if (action === "duplicate") onDuplicate(assignment);
    else if (action === "assignTo") onAssignTo(assignment);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b bg-white hover:bg-gray-50 cursor-pointer transition-colors relative" style={{ borderColor: "#e5e7eb" }} onClick={() => onView(a)}>
      <div className="flex flex-col gap-0.5 opacity-30 shrink-0">{[...Array(3)].map((_, i) => (<div key={i} className="flex gap-0.5"><div className="w-1 h-1 rounded-full bg-gray-400" /><div className="w-1 h-1 rounded-full bg-gray-400" /></div>))}</div>
      <div className="w-[3px] h-8 rounded-full shrink-0" style={{ background: MAROON }} />
      <div className="shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5"><rect x="4" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" /></svg></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{a.title}</p>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5 flex-wrap">
          {isClosed && <span className="font-medium text-gray-600">Closed</span>}
          {isClosed && due && <span>|</span>}
          {due && <span><span className="font-medium">Due</span> {due}</span>}
          {due && <span>|</span>}
          <span>{a.points} pts</span>
        </div>
      </div>
      {a.status === "PUBLISHED" ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#22c55e" className="shrink-0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z" /></svg>
      ) : (
        <div className="w-5 h-5 shrink-0" />
      )}
      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onMouseDown={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }} className="p-1 rounded hover:bg-gray-200 transition-colors"><MoreVertical size={16} className="text-gray-500" /></button>
        {menuOpen && <AssignmentRowDropdown assignment={a} onAction={handleAction} onClose={() => setMenuOpen(false)} />}
      </div>
    </div>
  );
}

function AdminAssignmentGroupSection({ title, items, onAddAssignment, onView, onEdit, onDuplicate, onAssignTo, onSpeedGrader, onEditGroup, onDeleteGroup }: {
  title: string; items: Assignment[];
  onAddAssignment: (group: string) => void; onView: (a: Assignment) => void; onEdit: (a: Assignment) => void;
  onDuplicate: (a: Assignment) => void; onAssignTo: (a: Assignment) => void; onSpeedGrader: (a: Assignment) => void;
  onEditGroup: (group: string) => void; onDeleteGroup: (group: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-4 py-2.5 border select-none" style={{ background: "#f9fafb", borderColor: "#e5e7eb" }}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCollapsed((c) => !c)}>
          <div className="flex flex-col gap-0.5 opacity-30 mr-1">{[...Array(3)].map((_, i) => (<div key={i} className="flex gap-0.5"><div className="w-1 h-1 rounded-full bg-gray-400" /><div className="w-1 h-1 rounded-full bg-gray-400" /></div>))}</div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}><path d="M6 9l6 6 6-6" /></svg>
          <span className="text-sm font-semibold text-gray-700">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onAddAssignment(title)} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded transition-colors" title="Add assignment"><Plus size={15} /></button>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onMouseDown={(e) => { e.stopPropagation(); setGroupMenuOpen((v) => !v); }} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded transition-colors"><MoreVertical size={15} /></button>
            {groupMenuOpen && <GroupDropdown onEdit={() => onEditGroup(title)} onDelete={() => onDeleteGroup(title)} onClose={() => setGroupMenuOpen(false)} />}
          </div>
        </div>
      </div>
      {!collapsed && (
        <div className="border border-t-0" style={{ borderColor: "#e5e7eb" }}>
          {items.length === 0
            ? <div className="px-6 py-4 text-sm text-gray-400 text-center">No assignments in this group.</div>
            : items.map((a) => (
              <AdminAssignmentRow key={a.id} a={a} onView={onView} onEdit={onEdit} onDuplicate={onDuplicate} onAssignTo={onAssignTo} onSpeedGrader={onSpeedGrader} />
            ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HEAD ASSIGNMENT DETAIL
// ─────────────────────────────────────────────────────────────────────────────
function HeadAssignmentDetail({ assignment, courseId, sections, staff, onBack, onEditFull, setAssignments }: {
  assignment: Assignment; courseId: string; sections: Section[]; staff: Staff[];
  onBack: () => void; onEditFull: (a: Assignment) => void;
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
}) {
  const [current, setCurrent] = useState(assignment);
  const [publishing, setPublishing] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [submissions, setSubmissions] = useState<{ fileUrl: string | null; fileName?: string | null; userName: string | null; userEmail: string; userId: string; submittedAt: string | null }[]>([]);
  const [downloading, setDownloading] = useState(false);
  const dotMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDotMenu) return;
    const h = (e: MouseEvent) => { if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node)) setShowDotMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDotMenu]);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/assignments/${assignment.id}/submissions`)
      .then((r) => r.json()).then((d) => setSubmissions(d.submissions ?? [])).catch(() => {});
  }, [courseId, assignment.id]);

  const togglePublish = async () => {
    setPublishing(true);
    const newStatus = current.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    const res = await fetch(`/api/courses/${courseId}/assignments/${current.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    const data = await res.json();
    if (data.assignment) { setCurrent((p) => ({ ...p, status: newStatus })); setAssignments((prev) => prev.map((a) => a.id === current.id ? { ...a, status: newStatus } : a)); }
    setPublishing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments/${current.id}`, { method: "DELETE" });
      if (res.ok) { setAssignments((prev) => prev.filter((a) => a.id !== current.id)); onBack(); }
      else { alert("Failed to delete assignment."); setDeleting(false); setShowDeleteModal(false); }
    } catch { alert("Network error."); setDeleting(false); setShowDeleteModal(false); }
  };

  const downloadSubmissions = async () => {
    setDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const byStudent: Record<string, typeof submissions> = {};
      for (const sub of submissions) { if (!sub.submittedAt || !sub.fileUrl) continue; if (!byStudent[sub.userId]) byStudent[sub.userId] = []; byStudent[sub.userId].push(sub); }
      for (const [userId, subs] of Object.entries(byStudent)) {
        const studentName = (subs[0].userName ?? subs[0].userEmail).replace(/[^a-z0-9\s]/gi, "").trim().replace(/\s+/g, "_");
        const folder = zip.folder(`${studentName}_${userId.slice(-6)}`);
        if (!folder) continue;
        for (let i = 0; i < subs.length; i++) {
          const sub = subs[i]; if (!sub.fileUrl) continue;
          const url = sub.fileUrl.startsWith("/") || sub.fileUrl.startsWith("http") ? sub.fileUrl : `/uploads/submissions/${sub.fileUrl}`;
          try { const res = await fetch(url); const blob = await res.blob(); let fileName = sub.fileName?.trim() || ""; if (!fileName) { const urlPart = url.split("/").pop()?.split("?")[0] ?? ""; const ext = urlPart.includes(".") ? urlPart.split(".").pop() : "bin"; fileName = `submission_${i + 1}.${ext}`; } folder.file(fileName, blob); } catch {}
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${current.title.replace(/[^a-z0-9]/gi, "_")}_submissions.zip`; a.click(); URL.revokeObjectURL(a.href);
    } catch { alert("Failed to generate zip."); } finally { setDownloading(false); }
  };

  const isPublished = current.status === "PUBLISHED";
  const opts = (current.onlineEntryOptions ?? []).map(normalizeOpt);
  const submittingLabel = opts.length > 0 ? opts.map((o) => OPT_LABELS[o] ?? o).join(", ") : current.submissionType?.toLowerCase?.() ?? "-";
  const hasDownloadable = submissions.filter((s) => s.fileUrl && s.submittedAt).length > 0;

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>
      {showDeleteModal && <DeleteConfirmModal title={current.title} onConfirm={handleDelete} onCancel={() => { setShowDeleteModal(false); setShowDotMenu(false); }} deleting={deleting} />}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-sm hover:underline" style={{ color: MAROON }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Assignments
        </button>
        <div className="flex items-center gap-2">
          <button onClick={togglePublish} disabled={publishing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-60"
            style={isPublished ? { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" } : { background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb" }}>
            {isPublished ? <CheckCircle size={13} style={{ color: "#15803d" }} /> : <Circle size={13} />}
            {isPublished ? "Published" : "Unpublished"}
          </button>
          <button onClick={() => setShowAssignPanel(true)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 transition-all">
            <Users size={12} /> Assign To
          </button>
          <button onClick={() => onEditFull(current)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 transition-all">
            <Pencil size={12} /> Edit
          </button>
          <div className="relative" ref={dotMenuRef}>
            <button onClick={() => setShowDotMenu((p) => !p)} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-all"><MoreVertical size={15} /></button>
            {showDotMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 shadow-xl rounded-xl z-[100] overflow-hidden py-1">
                <button onClick={() => { setShowDotMenu(false); setShowDeleteModal(true); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left">
                  <Trash2 size={13} /> Delete Assignment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <h1 className="text-2xl font-black text-gray-900 mb-5">{current.title}</h1>
          <div className="mb-6">
            <style>{`.assignment-desc{font-size:13px;color:#374151;line-height:1.7;}.assignment-desc p{margin:0 0 8px;}.assignment-desc strong,.assignment-desc b{font-weight:700;color:#111827;}.assignment-desc ul,.assignment-desc ol{padding-left:20px;margin:0 0 8px;}.assignment-desc li{margin-bottom:4px;}.assignment-desc a{color:#7b1113;text-decoration:underline;}`}</style>
            <div className="assignment-desc" dangerouslySetInnerHTML={{ __html: current.description ?? '<em style="color:#9ca3af">No description provided.</em>' }} />
          </div>
          <div className="bg-white border-b border-gray-100 mb-5">
            <div className="px-1 py-1 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
              <p className="text-[10px] font-black uppercase tracking-widest px-3 py-1" style={{ color: MAROON }}>Details</p>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Points</p><p className="text-sm font-bold text-gray-800">{current.points}</p></div>
              <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Submission Type</p><p className="text-sm font-bold text-gray-800">{submittingLabel}</p></div>
            </div>
          </div>
          <div className="bg-white border-b border-gray-100 mb-5">
            <div className="px-1 py-1 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
              <p className="text-[10px] font-black uppercase tracking-widest px-3 py-1" style={{ color: MAROON }}>Schedule</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">{["Due", "Available From", "Until"].map((h) => <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>)}</tr></thead>
                <tbody><tr>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-700">{fmtDue(current.dueDate) || "No due date"}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{current.availableFrom ? fmtDue(current.availableFrom) : "—"}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{current.availableUntil ? fmtDue(current.availableUntil) : "—"}</td>
                </tr></tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="w-56 border-l border-gray-200 bg-white shrink-0 flex flex-col overflow-y-auto">
          <div className="px-4 py-4 border-b border-gray-100" style={{ background: "#fdf2f2" }}><p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Related Items</p></div>
          <div className="px-4 py-4 space-y-3">
            <button onClick={() => window.open(`/courses/${courseId}/assignments/${current.id}/speedgrader`, "_blank")} className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left" style={{ color: MAROON }}><Zap size={13} /> SpeedGrader™</button>
            <button onClick={downloadSubmissions} disabled={downloading || !hasDownloadable} className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left disabled:opacity-40" style={{ color: MAROON }}><Download size={13} />{downloading ? "Preparing..." : "Download Submissions"}</button>
            <button className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left" style={{ color: MAROON }}><Upload size={13} /> Re-Upload Submissions</button>
          </div>
          {submissions.length > 0 && (
            <div className="px-4 pb-4"><p className="text-[10px] text-gray-400 leading-relaxed">{submissions.filter((s) => s.fileUrl && s.submittedAt).length} file{submissions.filter((s) => s.fileUrl && s.submittedAt).length !== 1 ? "s" : ""} ready to download.</p></div>
          )}
        </div>
      </div>
      {showAssignPanel && <AssignToPanel assignment={current} courseId={courseId} sections={sections} staff={staff} onClose={() => setShowAssignPanel(false)} onSave={() => { fetch(`/api/courses/${courseId}/assignments/${current.id}`).then((r) => r.json()).then((d) => { if (d.assignment) setCurrent((p) => ({ ...p, ...d.assignment })); }).catch(() => {}); }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HEAD CREATE ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────
function HeadCreateAssignment({ courseId, initialGroup = "", onCancel, onCreated }: {
  courseId: string; initialGroup?: string; onCancel: () => void; onCreated: () => void;
}) {
  type LocalTabKey = "details" | "submission" | "settings" | "assign";
  const TABS: { key: LocalTabKey; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "submission", label: "Submission" },
    { key: "settings", label: "Settings" },
    { key: "assign", label: "Assign" },
  ];
  const [activeTab, setActiveTab] = useState<LocalTabKey>("details");
  const [name, setName] = useState("");
  const [points, setPoints] = useState("0");
  const [group, setGroup] = useState(initialGroup || "Assignments");
  const [groups, setGroups] = useState<AssignmentGroupItem[]>([{ id: 1, name: "Assignments" }]);
  const [displayGradeAs, setDisplayGradeAs] = useState("Points");
  const [doNotCount, setDoNotCount] = useState(false);
  const [submissionType, setSubmissionType] = useState("Online");
  const [published, setPublished] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submissionEntries, setSubmissionEntries] = useState<SubmissionEntry[]>([{ id: 1, label: "", required: false, type: "File Upload" }]);
  const [submissionAttempts, setSubmissionAttempts] = useState("Unlimited");
  const [allowedAttempts, setAllowedAttempts] = useState(1);
  const [isGroupAssignment, setIsGroupAssignment] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [assignRows, setAssignRows] = useState<AssignRow[]>([{ id: 1, assignees: ["Everyone"], dueDate: "", dueTime: "", availableFrom: "", availableFromTime: "", until: "", untilTime: "" }]);
  const [sections, setSections] = useState<Section[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState("");

  useEffect(() => {
    fetch(`/api/courses/${courseId}/assignments`).then((r) => r.json()).then((d) => {
      const list = d.assignments ?? [];
      const names: string[] = [...new Set<string>(list.map((a: { assignmentGroup: string }) => a.assignmentGroup || "Assignments"))];
      if (!names.includes("Assignments")) names.unshift("Assignments");
      if (initialGroup && !names.includes(initialGroup)) names.push(initialGroup);
      setGroups(names.map((n, i) => ({ id: i + 1, name: n })));
      if (initialGroup && names.includes(initialGroup)) setGroup(initialGroup);
    }).catch(() => {});
    fetch(`/api/courses/${courseId}/sections`).then((r) => r.json()).then((d) => { setSections(d.sections ?? []); }).catch(() => {});
  }, [courseId, initialGroup]);

  useEffect(() => {
    if (openDropdownId === null) return;
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-dropdown]")) setOpenDropdownId(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openDropdownId]);

  const addSubmissionEntry = () => setSubmissionEntries((p) => [...p, { id: Date.now(), label: "", required: false, type: "File Upload" }]);
  const removeSubmissionEntry = (id: number) => setSubmissionEntries((p) => p.filter((e) => e.id !== id));
  const updateSubmissionEntry = (id: number, field: keyof SubmissionEntry, value: string | boolean) => setSubmissionEntries((p) => p.map((e) => e.id === id ? { ...e, [field]: value } : e));
  const addAssignRow = () => setAssignRows((p) => [...p, { id: Date.now(), assignees: [], dueDate: "", dueTime: "", availableFrom: "", availableFromTime: "", until: "", untilTime: "" }]);
  const removeAssignRow = (id: number) => setAssignRows((p) => p.filter((r) => r.id !== id));
  const updateAssignRow = (id: number, field: keyof AssignRow, value: string | string[]) => setAssignRows((p) => p.map((r) => r.id === id ? { ...r, [field]: value } : r));

  const handleDateChange = (id: number, dateField: "dueDate" | "availableFrom" | "until", timeField: "dueTime" | "availableFromTime" | "untilTime", value: string) => {
    const defaultTime = dateField === "availableFrom" ? "12:00 AM" : "11:59 PM";
    setAssignRows((p) => p.map((r) => { if (r.id !== id) return r; return { ...r, [dateField]: value, [timeField]: r[timeField] || (value ? defaultTime : "") }; }));
  };

  const getDateErrors = (row: AssignRow) => {
    const errors: { until?: string; availableFrom?: string } = {};
    const toMs = (date: string, time: string) => { if (!date) return null; return new Date(`${date} ${time || "11:59 PM"}`).getTime(); };
    const due = toMs(row.dueDate, row.dueTime), until = toMs(row.until, row.untilTime), available = toMs(row.availableFrom, row.availableFromTime);
    if (due && until && until < due) errors.until = "Lock date cannot be before due date";
    if (due && available && available > due) errors.availableFrom = "Unlock date cannot be after due date";
    return errors;
  };

  const toggleAssignee = (rowId: number, name: string) => setAssignRows((p) => p.map((r) => { if (r.id !== rowId) return r; const has = r.assignees.includes(name); return { ...r, assignees: has ? r.assignees.filter((a) => a !== name) : [...r.assignees, name] }; }));
  const saveGroup = () => { const n = newGroupName.trim(); if (!n) return; if (!groups.find((g) => g.name === n)) setGroups((p) => [...p, { id: Date.now(), name: n }]); setGroup(n); setGroupModalOpen(false); setNewGroupName(""); };

  const handleSave = async (publish: boolean) => {
    setSaveError(null);
    if (!name.trim()) { setSaveError("Assignment Name is required."); return; }
    if (submissionType === "Online" && submissionEntries.length === 0) { setSaveError("Please add at least one submission entry."); return; }
    setSaving(true);
    try {
      const row = assignRows[0];
      const res = await fetch(`/api/courses/${courseId}/assignments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: name.trim(), points: parseFloat(points) || 0, submissionType, assignmentGroup: group, displayGradeAs, status: publish ? "PUBLISHED" : "UNPUBLISHED", assignees: row?.assignees ?? [], dueDate: row?.dueDate || null, dueTime: row?.dueTime || null, availableFrom: row?.availableFrom || null, availableFromTime: row?.availableFromTime || null, availableUntil: row?.until || null, untilTime: row?.untilTime || null, submissionEntries, submissionAttempts, allowedAttempts: submissionAttempts === "Limited" ? allowedAttempts : null, doNotCount, isGroupAssignment, notifyUsers }) });
      if (res.ok) { setPublished(publish); onCreated(); }
      else { const data = await res.json().catch(() => ({})); setSaveError(data?.error ?? `Server error: ${res.status}`); }
    } catch { setSaveError("Network error. Please try again."); } finally { setSaving(false); }
  };

  const inp = "h-8 border border-gray-300 rounded-sm px-3 text-xs w-80 outline-none focus:border-[#7b1113]";
  const sel = "h-8 border border-gray-300 rounded-sm px-3 text-xs w-80 bg-white outline-none focus:border-[#7b1113]";

  return (
    <div className="w-full h-full bg-white flex flex-col" style={{ fontFamily: FONT }}>
      <div className="flex items-center justify-end px-6 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded-full border" style={published ? { background: "#22c55e", borderColor: "#22c55e" } : { borderColor: "#9ca3af" }} />
          {published ? "Published" : "Not Published"}
        </div>
      </div>
      <div className="flex items-end border-b border-gray-200 px-6 bg-white shrink-0">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2 text-xs border border-b-0 -mb-px mr-0.5 rounded-t transition-colors ${activeTab === t.key ? "bg-white border-gray-200 text-gray-900 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-10 py-6">
        {activeTab === "details" && (
          <div className="space-y-5">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Assignment Name <span className="text-red-500">*</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Assignment Name"
                className="w-full h-9 border rounded-sm px-3 text-sm outline-none" style={{ borderColor: MAROON }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${MAROON}30`; }} onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }} />
            </div>
            <div className="grid grid-cols-[200px_1fr] items-start gap-y-4 gap-x-4 max-w-3xl">
              <label className="text-xs text-gray-700 text-right pt-2">Points</label>
              <input type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} className={inp} />
              <label className="text-xs text-gray-700 text-right pt-2">Assignment Group</label>
              <select value={group} onChange={(e) => { if (e.target.value === "__create__") { setNewGroupName(""); setGroupModalOpen(true); } else setGroup(e.target.value); }} className={sel}>
                {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                <option value="__create__">[ Create Group ]</option>
              </select>
            </div>
          </div>
        )}
        {activeTab === "submission" && (
          <div className="grid grid-cols-[200px_1fr] items-start gap-y-5 gap-x-4 max-w-3xl">
            <label className="text-xs text-gray-700 text-right pt-2">Submission Type</label>
            <select value={submissionType} onChange={(e) => setSubmissionType(e.target.value)} className={sel}>
              {SUBMISSION_TYPES.map((o) => <option key={o}>{o}</option>)}
            </select>
            {submissionType === "Online" && (
              <>
                <label className="text-xs text-gray-700 text-right pt-2">Submission Entries <span className="text-red-500">*</span></label>
                <div className="space-y-2 max-w-xl">
                  {submissionEntries.map((entry, idx) => (
                    <div key={entry.id} className="border border-gray-200 rounded-sm p-3 space-y-2 relative bg-white">
                      {submissionEntries.length > 1 && <button type="button" onClick={() => removeSubmissionEntry(entry.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs leading-none">✕</button>}
                      <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-semibold px-2 py-0.5 rounded text-white" style={{ background: MAROON }}>Entry {idx + 1}</span></div>
                      <div><label className="text-xs text-gray-500 block mb-1">Label</label><input type="text" value={entry.label} onChange={(e) => updateSubmissionEntry(entry.id, "label", e.target.value)} placeholder="e.g. Excel File, PDF Report..." className="w-full h-8 border border-gray-300 rounded-sm px-2 text-xs outline-none focus:border-[#7b1113]" /></div>
                      <div><label className="text-xs text-gray-500 block mb-1">Submission Type</label><select value={entry.type} onChange={(e) => updateSubmissionEntry(entry.id, "type", e.target.value)} className="w-full h-8 border border-gray-300 rounded-sm px-2 text-xs bg-white outline-none focus:border-[#7b1113]">{SUBMISSION_ENTRY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer pt-1"><input type="checkbox" checked={entry.required} onChange={(e) => updateSubmissionEntry(entry.id, "required", e.target.checked)} style={{ accentColor: MAROON }} />Required</label>
                    </div>
                  ))}
                  <button type="button" onClick={addSubmissionEntry} className="w-full h-8 border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-600 rounded-sm hover:bg-gray-100 flex items-center justify-center gap-1">+ Add Submission</button>
                </div>
              </>
            )}
            <label className="text-xs text-gray-700 text-right pt-2">Submission Attempts</label>
            <div className="border border-gray-200 rounded-sm p-3 w-80 space-y-2">
              <p className="text-xs font-medium text-gray-700">Allowed Attempts</p>
              <select value={submissionAttempts} onChange={(e) => setSubmissionAttempts(e.target.value)} className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-full bg-white outline-none focus:border-[#7b1113]"><option>Unlimited</option><option>Limited</option></select>
              {submissionAttempts === "Limited" && (<div><p className="text-xs font-medium text-gray-700 mb-1">Number of Attempts</p><input type="number" min={1} value={allowedAttempts} onChange={(e) => setAllowedAttempts(parseInt(e.target.value) || 1)} className="h-8 w-24 border border-gray-300 rounded-sm px-2 text-xs outline-none focus:border-[#7b1113]" /></div>)}
            </div>
          </div>
        )}
        {activeTab === "settings" && (
          <div className="grid grid-cols-[200px_1fr] items-start gap-y-5 gap-x-4 max-w-3xl">
            <label className="text-xs text-gray-700 text-right pt-2">Display Grade as</label>
            <select value={displayGradeAs} onChange={(e) => setDisplayGradeAs(e.target.value)} className={sel}>{GRADE_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select>
            <div />
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer"><input type="checkbox" checked={doNotCount} onChange={(e) => setDoNotCount(e.target.checked)} style={{ accentColor: MAROON }} />Do not count this assignment towards the final grade</label>
            <label className="text-xs text-gray-700 text-right pt-2">Group Assignment</label>
            <div className="border border-gray-200 rounded-sm p-3 w-80"><label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer"><input type="checkbox" checked={isGroupAssignment} onChange={(e) => setIsGroupAssignment(e.target.checked)} style={{ accentColor: MAROON }} />This is a Group Assignment</label></div>
          </div>
        )}
        {activeTab === "assign" && (
          <div className="grid grid-cols-[200px_1fr] items-start gap-y-5 gap-x-4 max-w-3xl">
            <label className="text-xs text-gray-700 text-right pt-2">Assign Access</label>
            <div className="space-y-3">
              {assignRows.map((row, idx) => {
                const errs = getDateErrors(row);
                const configs = [
                  { label: "Due Date", dateField: "dueDate" as const, timeField: "dueTime" as const, err: undefined as string | undefined },
                  { label: "Available from", dateField: "availableFrom" as const, timeField: "availableFromTime" as const, err: errs.availableFrom },
                  { label: "Until", dateField: "until" as const, timeField: "untilTime" as const, err: errs.until },
                ];
                return (
                  <div key={row.id} className="border border-gray-200 rounded-sm p-3 space-y-3 max-w-xl relative">
                    {idx > 0 && <button type="button" onClick={() => removeAssignRow(row.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs">✕</button>}
                    <div className="relative" data-dropdown onMouseDown={(e) => e.stopPropagation()}>
                      <p className="text-xs font-medium text-gray-700 mb-1">Assign To</p>
                      <div onMouseDown={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === row.id ? null : row.id); setDropdownSearch(""); }}
                        className="w-full min-h-[30px] border rounded-sm px-2 py-1 text-xs flex flex-wrap gap-1 items-center cursor-pointer bg-white select-none" style={{ borderColor: MAROON }}>
                        {row.assignees.length > 0 ? row.assignees.map((a) => (
                          <span key={a} className="px-2 py-0.5 rounded text-xs flex items-center gap-1 text-white font-medium" style={{ background: MAROON }}>
                            {a}<button type="button" onMouseDown={(e) => { e.stopPropagation(); toggleAssignee(row.id, a); }} className="hover:opacity-70 font-bold ml-0.5">×</button>
                          </span>
                        )) : <span className="text-gray-400">Start typing to search...</span>}
                        <span className="ml-auto text-gray-400 text-[10px] pl-2 shrink-0">{openDropdownId === row.id ? "▲" : "▼"}</span>
                      </div>
                      {openDropdownId === row.id && (
                        <div data-dropdown className="absolute z-50 w-full bg-white border border-gray-200 shadow-lg rounded-sm mt-0.5 max-h-52 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white"><input autoFocus value={dropdownSearch} onChange={(e) => setDropdownSearch(e.target.value)} placeholder="Search..." className="w-full h-6 px-2 text-xs border border-gray-200 rounded outline-none focus:border-[#7b1113]" /></div>
                          {["Everyone"].filter((o) => o.toLowerCase().includes(dropdownSearch.toLowerCase())).map((opt) => (
                            <button key={opt} type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, opt); }}
                              className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                              style={{ color: row.assignees.includes(opt) ? MAROON : "#374151", fontWeight: row.assignees.includes(opt) ? 600 : 400 }}>
                              {opt}{row.assignees.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
                            </button>
                          ))}
                          {sections.filter((s) => s.name.toLowerCase().includes(dropdownSearch.toLowerCase())).length > 0 && (
                            <><div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 bg-gray-50">Sections</div>
                              {sections.filter((s) => s.name.toLowerCase().includes(dropdownSearch.toLowerCase())).map((s) => (
                                <button key={s.id} type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }}
                                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                                  style={{ color: row.assignees.includes(s.name) ? MAROON : "#374151", fontWeight: row.assignees.includes(s.name) ? 600 : 400 }}>
                                  {s.name}{row.assignees.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                                </button>
                              ))}</>
                          )}
                        </div>
                      )}
                    </div>
                    {configs.map((c) => (
                      <div key={c.label}>
                        <p className="text-xs font-medium text-gray-700 mb-1">{c.label}</p>
                        <div className={`flex gap-0 border rounded-sm overflow-hidden ${c.err ? "border-red-500" : "border-gray-300"}`}>
                          <input type="date" value={row[c.dateField]} onChange={(e) => handleDateChange(row.id, c.dateField, c.timeField, e.target.value)} className="flex-1 h-7 border-0 px-2 text-xs outline-none bg-white" />
                          <div className="w-px bg-gray-200 self-stretch" />
                          <select value={row[c.timeField]} onChange={(e) => updateAssignRow(row.id, c.timeField, e.target.value)} className="h-7 border-0 px-2 text-xs bg-white outline-none w-28">
                            <option value="">Time</option>{TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        {c.err && <p className="text-xs text-red-500 mt-0.5">{c.err}</p>}
                        <button type="button" onClick={() => { updateAssignRow(row.id, c.dateField, ""); updateAssignRow(row.id, c.timeField, ""); }} className="text-xs hover:underline mt-0.5" style={{ color: MAROON }}>Clear</button>
                      </div>
                    ))}
                  </div>
                );
              })}
              <button type="button" onClick={addAssignRow} className="w-full max-w-xl h-8 border border-gray-300 bg-gray-50 text-xs text-gray-600 rounded-sm hover:bg-gray-100 flex items-center justify-center gap-1">+ Assign To</button>
            </div>
            <div />
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer mt-1"><input type="checkbox" checked={notifyUsers} onChange={(e) => setNotifyUsers(e.target.checked)} style={{ accentColor: MAROON }} />Notify users that this content has changed</label>
          </div>
        )}
      </div>
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="w-[460px] bg-white shadow-xl border border-gray-200 rounded">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">Add Assignment Group</div>
              <button onClick={() => setGroupModalOpen(false)} className="w-6 h-6 flex items-center justify-center border text-gray-700 rounded text-sm" style={{ borderColor: MAROON, color: MAROON }}>×</button>
            </div>
            <div className="px-6 py-6"><div className="flex items-center gap-3"><label className="text-xs text-gray-700">Group Name:</label><input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveGroup()} placeholder="e.g., Essay Group 1" className="flex-1 h-8 border border-gray-300 px-2 text-xs outline-none focus:border-[#7b1113] rounded-sm" /></div></div>
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex justify-end gap-2">
              <button onClick={() => setGroupModalOpen(false)} className="h-8 px-4 border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50 rounded">Cancel</button>
              <button onClick={saveGroup} style={{ background: MAROON }} className="h-8 px-4 text-white text-xs rounded hover:opacity-90">Add Group</button>
            </div>
          </div>
        </div>
      )}
      <div className="shrink-0 border-t border-gray-200 bg-white px-8 py-3 flex items-center justify-between">
        <div>{saveError && <span className="text-xs text-red-600 font-medium">⚠ {saveError}</span>}</div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} disabled={saving} className="h-8 px-5 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          {activeTab !== "details" && <button type="button" onClick={() => setActiveTab(activeTab === "submission" ? "details" : activeTab === "settings" ? "submission" : "settings")} className="h-8 px-5 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50">← Back</button>}
          {activeTab !== "assign" && <button type="button" onClick={() => setActiveTab(activeTab === "details" ? "submission" : activeTab === "submission" ? "settings" : "assign")} className="h-8 px-5 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100">Next →</button>}
          {activeTab === "assign" && (
            <>
              <button onClick={() => handleSave(true)} disabled={saving} className="h-8 px-5 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50">{saving ? "Saving..." : "Save & Publish"}</button>
              <button onClick={() => handleSave(false)} disabled={saving} style={{ background: MAROON }} className="h-8 px-5 text-white text-xs rounded hover:opacity-90 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HEAD ASSIGNMENT LIST
// ─────────────────────────────────────────────────────────────────────────────
function HeadAssignmentList({ courseId, assignments, setAssignments, sections, staff, onViewDetail, onCreateNew, onEditFull }: {
  courseId: string; assignments: Assignment[]; setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  sections: Section[]; staff: Staff[];
  onViewDetail: (a: Assignment) => void; onCreateNew: (group?: string) => void; onEditFull: (a: Assignment) => void;
}) {
  const [search, setSearch] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [localGroups, setLocalGroups] = useState<string[]>([]);
  const [quickEditTarget, setQuickEditTarget] = useState<Assignment | null>(null);
  const [assignToTarget, setAssignToTarget] = useState<Assignment | null>(null);
  const [editGroupTarget, setEditGroupTarget] = useState<string | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<string | null>(null);
  const [savingEditGroup, setSavingEditGroup] = useState(false);

  useEffect(() => {
    const persisted = loadPersistedGroups(courseId);
    const apiGroups = [...new Set(assignments.map((a) => a.assignmentGroup || "Assignments"))];
    setLocalGroups((prev) => {
      const merged = [...new Set([...persisted, ...prev, ...apiGroups])];
      persistGroups(courseId, merged);
      return merged;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, assignments.length]);

  const loadAssignments = useCallback(() => {
    fetch(`/api/courses/${courseId}/assignments`).then((r) => r.json()).then((d) => {
      const list: Assignment[] = d.assignments ?? [];
      setAssignments(list);
      const apiGroups = [...new Set(list.map((a) => a.assignmentGroup || "Assignments"))];
      setLocalGroups((prev) => { const merged = [...new Set([...prev, ...apiGroups])]; persistGroups(courseId, merged); return merged; });
    }).catch(() => {});
  }, [courseId, setAssignments]);

  const handleSaveGroup = async (name: string) => {
    setSavingGroup(true);
    try { setLocalGroups((prev) => { if (prev.includes(name)) return prev; const next = [...prev, name]; persistGroups(courseId, next); return next; }); setShowGroupModal(false); }
    finally { setSavingGroup(false); }
  };

  const handleEditGroupSave = async (newName: string) => {
    if (!editGroupTarget) return;
    setSavingEditGroup(true);
    try {
      const oldName = editGroupTarget;
      setLocalGroups((prev) => { const next = prev.map((g) => g === oldName ? newName : g); persistGroups(courseId, next); return next; });
      setAssignments((prev) => prev.map((a) => a.assignmentGroup === oldName ? { ...a, assignmentGroup: newName } : a));
      assignments.filter((a) => a.assignmentGroup === oldName).forEach((a) => {
        fetch(`/api/courses/${courseId}/assignments/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentGroup: newName }) }).catch(() => {});
      });
      setEditGroupTarget(null);
    } finally { setSavingEditGroup(false); }
  };

  const handleDeleteGroup = (action: "delete" | "move", targetGroup?: string) => {
    if (!deleteGroupTarget) return;
    const groupName = deleteGroupTarget;
    if (action === "delete") {
      const toDelete = assignments.filter((a) => (a.assignmentGroup || "Assignments") === groupName);
      toDelete.forEach((a) => { fetch(`/api/courses/${courseId}/assignments/${a.id}`, { method: "DELETE" }).catch(() => {}); });
      setAssignments((prev) => prev.filter((a) => (a.assignmentGroup || "Assignments") !== groupName));
    } else if (action === "move" && targetGroup) {
      setAssignments((prev) => prev.map((a) => (a.assignmentGroup || "Assignments") === groupName ? { ...a, assignmentGroup: targetGroup } : a));
      assignments.filter((a) => (a.assignmentGroup || "Assignments") === groupName).forEach((a) => {
        fetch(`/api/courses/${courseId}/assignments/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentGroup: targetGroup }) }).catch(() => {});
      });
    }
    setLocalGroups((prev) => { const next = prev.filter((g) => g !== groupName); persistGroups(courseId, next); return next; });
    setDeleteGroupTarget(null);
  };

  const handleQuickEditSave = async (updated: Partial<Assignment> & { dueTime?: string }) => {
    if (!quickEditTarget) return;
    await fetch(`/api/courses/${courseId}/assignments/${quickEditTarget.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: updated.title, points: updated.points, dueDate: updated.dueDate || null, dueTime: updated.dueTime }) });
    setAssignments((prev) => prev.map((a) => a.id === quickEditTarget.id ? { ...a, ...updated } : a));
  };

  const handleDuplicate = async (a: Assignment) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `${a.title} Copy`, points: a.points, status: "UNPUBLISHED", assignmentGroup: a.assignmentGroup, dueDate: a.dueDate, availableFrom: a.availableFrom, availableUntil: a.availableUntil }) });
      if (res.ok) loadAssignments();
    } catch {}
  };

  const handleSpeedGrader = (a: Assignment) => { window.open(`/courses/${courseId}/assignments/${a.id}/speedgrader`, "_blank"); };

  const filtered = assignments.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));
  const grouped: Record<string, Assignment[]> = {};
  for (const g of localGroups) grouped[g] = [];
  for (const a of filtered) { const g = a.assignmentGroup || "Assignments"; if (!grouped[g]) grouped[g] = []; grouped[g].push(a); }

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT }}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-1.5 border rounded text-sm w-56 focus:outline-none" style={{ borderColor: "#d1d5db" }} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGroupModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-gray-50" style={{ borderColor: "#d1d5db", color: "#374151" }}>
            <Plus size={14} /> Group
          </button>
          <button onClick={() => onCreateNew()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg hover:opacity-90" style={{ background: MAROON }}>
            <Plus size={14} /> Assignment
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-gray-400">No assignments yet.</p>
            <button onClick={() => onCreateNew()} className="text-xs font-bold hover:underline" style={{ color: MAROON }}>+ Create your first assignment</button>
          </div>
        ) : (
          Object.entries(grouped).map(([group, items]) => (
            <AdminAssignmentGroupSection key={group} title={group} items={items}
              onAddAssignment={(g) => onCreateNew(g)}
              onView={onViewDetail} onEdit={(a) => setQuickEditTarget(a)}
              onDuplicate={handleDuplicate} onAssignTo={(a) => setAssignToTarget(a)} onSpeedGrader={handleSpeedGrader}
              onEditGroup={(g) => setEditGroupTarget(g)} onDeleteGroup={(g) => setDeleteGroupTarget(g)}
            />
          ))
        )}
      </div>
      {showGroupModal && <AddGroupModal onClose={() => setShowGroupModal(false)} onSave={handleSaveGroup} saving={savingGroup} />}
      {quickEditTarget && <QuickEditModal assignment={quickEditTarget} onClose={() => setQuickEditTarget(null)} onSave={handleQuickEditSave} onMoreOptions={() => { onEditFull(quickEditTarget); setQuickEditTarget(null); }} />}
      {assignToTarget && <AssignToPanel assignment={assignToTarget} courseId={courseId} sections={sections} staff={staff} onClose={() => setAssignToTarget(null)} onSave={loadAssignments} />}
      {editGroupTarget && <EditGroupModal groupName={editGroupTarget} onClose={() => setEditGroupTarget(null)} onSave={handleEditGroupSave} saving={savingEditGroup} />}
      {deleteGroupTarget && <DeleteGroupModal groupName={deleteGroupTarget} assignmentCount={assignments.filter((a) => (a.assignmentGroup || "Assignments") === deleteGroupTarget).length} otherGroups={localGroups.filter((g) => g !== deleteGroupTarget)} onClose={() => setDeleteGroupTarget(null)} onDelete={handleDeleteGroup} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT VIEW COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function AssignmentIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" /></svg>;
}

function StudentAssignmentRow({ a, courseId }: { a: Assignment; courseId: string }) {
  const router = useRouter();
  const now = new Date();
  const sub = a.submissions?.[0];
  const isLocked = a.availableFrom && now < new Date(a.availableFrom);
  const isClosed = a.availableUntil && now > new Date(a.availableUntil);
  return (
    <div className="flex items-start px-5 py-4 border-b gap-3 cursor-pointer" style={{ borderColor: "#f3f4f6" }} onClick={() => router.push(`/courses/${courseId}/assignments/${a.id}`)}>
      <div className="w-[3px] self-stretch rounded-full shrink-0" style={{ background: COLORS.primary }} />
      <AssignmentIcon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <button className="text-sm font-semibold text-left" style={{ color: COLORS.primary, fontFamily: FONT }}>{a.title}</button>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-gray-500">
          {isLocked && <><span className="font-medium text-gray-600">Available until</span><span>{fmtDate(a.availableFrom)}</span><span>·</span></>}
          {isClosed && <span className="font-medium text-gray-600">Closed</span>}
          {!isLocked && !isClosed && a.availableFrom && a.availableUntil && <><span className="font-medium text-gray-600">Available</span><span>{fmtAvail(a.availableFrom, a.availableUntil)}</span><span>·</span></>}
          {a.dueDate && <><span><span className="font-medium text-gray-700">Due</span> {fmtDate(a.dueDate)}</span><span>·</span></>}
          <span>{sub?.grade != null ? `${sub.grade} / ${a.points} pts` : `- / ${a.points} pts`}</span>
        </div>
      </div>
    </div>
  );
}

function StudentAssignmentSection({ title, items, courseId }: { title: string; items: Assignment[]; courseId: string }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-2 px-5 py-2 cursor-pointer select-none transition-colors border-y" style={{ background: COLORS.primarySoft, borderColor: COLORS.primarySoftBorder }} onClick={() => setCollapsed((c) => !c)}>
        <span className="text-xs inline-block transition-transform" style={{ color: COLORS.textMuted, transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
        <span className="text-sm font-semibold" style={{ color: COLORS.textSecondary }}>{title}</span>
        <span className="text-xs ml-1" style={{ color: COLORS.textMuted }}>({items.length})</span>
      </div>
      {!collapsed && items.map((a) => <StudentAssignmentRow key={a.id} a={a} courseId={courseId} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
type AssignView = "list" | "create" | "detail" | "edit";

interface Props {
  courseId: string;
  assignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  sections: Section[];
  staff: Staff[];
  isHead: boolean;
  canManageAssignments: boolean;
}

export default function CourseAssignmentsTab({
  courseId, assignments, setAssignments,
  sections, staff, isHead, canManageAssignments,
}: Props) {
  const [assignView, setAssignView] = useState<AssignView>("list");
  const [assignViewTarget, setAssignViewTarget] = useState<Assignment | null>(null);
  const [createGroup, setCreateGroup] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"DATE" | "TYPE">("DATE");

  const reloadAssignments = useCallback(() => {
    fetch(`/api/courses/${courseId}/assignments`).then((r) => r.json()).then((d) => setAssignments(d.assignments ?? [])).catch(() => {});
  }, [courseId, setAssignments]);

  const now = new Date();
  const filtered = assignments.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));
  const upcoming: Assignment[] = [], undated: Assignment[] = [], past: Assignment[] = [];
  filtered.forEach((a) => { if (!a.dueDate) undated.push(a); else if (new Date(a.dueDate) >= now) upcoming.push(a); else past.push(a); });

  // HEAD VIEW
  if (isHead && canManageAssignments) {
    if (assignView === "create") {
      return (
        <HeadCreateAssignment
          courseId={courseId}
          initialGroup={createGroup}
          onCancel={() => { setAssignView("list"); setCreateGroup(undefined); }}
          onCreated={() => { setAssignView("list"); setCreateGroup(undefined); reloadAssignments(); }}
        />
      );
    }
    if (assignView === "detail" && assignViewTarget) {
      return (
        <HeadAssignmentDetail
          assignment={assignViewTarget} courseId={courseId}
          sections={sections} staff={staff}
          onBack={() => { setAssignView("list"); setAssignViewTarget(null); }}
          onEditFull={(a) => { setAssignViewTarget(a); setAssignView("edit"); }}
          setAssignments={setAssignments}
        />
      );
    }
    if (assignView === "edit" && assignViewTarget) {
      return (
        <HeadCreateAssignment
          courseId={courseId}
          initialGroup={assignViewTarget.assignmentGroup}
          onCancel={() => setAssignView("list")}
          onCreated={() => { setAssignView("list"); reloadAssignments(); }}
        />
      );
    }
    return (
      <HeadAssignmentList
        courseId={courseId} assignments={assignments} setAssignments={setAssignments}
        sections={sections} staff={staff}
        onViewDetail={(a) => { setAssignViewTarget(a); setAssignView("detail"); }}
        onCreateNew={(group) => { setCreateGroup(group); setAssignView("create"); }}
        onEditFull={(a) => { setAssignViewTarget(a); setAssignView("edit"); }}
      />
    );
  }

  // STUDENT / STAFF VIEW
  return (
    <div>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#f3f4f6" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-1.5 border rounded text-sm w-52 focus:outline-none" style={{ borderColor: "#d1d5db", fontFamily: FONT }} />
        </div>
        <div className="flex items-center gap-1">
          {(["DATE", "TYPE"] as const).map((m) => (
            <button key={m} onClick={() => setViewMode(m)} className="px-3 py-1.5 text-xs font-bold rounded transition-colors" style={{ background: viewMode === m ? COLORS.primary : "transparent", color: viewMode === m ? "#fff" : COLORS.textSecondary, fontFamily: FONT }}>
              SHOW BY {m}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0
        ? <p className="px-6 py-10 text-sm text-center" style={{ color: COLORS.textMuted, fontFamily: FONT }}>No assignments found.</p>
        : (
          <>
            {upcoming.length > 0 && <StudentAssignmentSection title="Upcoming Assignments" items={upcoming} courseId={courseId} />}
            {undated.length > 0 && <StudentAssignmentSection title="Undated Assignments" items={undated} courseId={courseId} />}
            {past.length > 0 && <StudentAssignmentSection title="Past Assignments" items={past} courseId={courseId} />}
          </>
        )}
    </div>
  );
}