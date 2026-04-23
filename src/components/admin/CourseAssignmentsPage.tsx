"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, MoreVertical, X, ChevronDown } from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

function buildTimes() {
  const list: string[] = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 30) {
      const hh = ((h + 11) % 12) + 1;
      list.push(`${hh}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`);
    }
  return list;
}
const TIME_OPTIONS = buildTimes();

interface Assignment {
  id: string;
  title: string;
  points: number;
  status: "PUBLISHED" | "UNPUBLISHED";
  dueDate: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  assignmentGroup: string;
}

interface Section { id: string; name: string; }
interface Staff   { id: string; name: string; }

interface Props {
  courseId: string;
}

function fmtDue(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  );
}

function isoToDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().split("T")[0];
}
function isoToTime(iso: string | null) {
  if (!iso) return "11:59 PM";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDateLabel(date: string, time: string) {
  if (!date) return "";
  try {
    const d = new Date(`${date}T00:00:00`);
    return (
      d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) +
      " " + (time || "11:59 PM")
    );
  } catch { return ""; }
}

function AssignmentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
      <rect x="4" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function groupsStorageKey(courseId: string) { return `assignment_groups_${courseId}`; }
function loadPersistedGroups(courseId: string): string[] {
  try { const raw = localStorage.getItem(groupsStorageKey(courseId)); if (!raw) return []; const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}
function persistGroups(courseId: string, groups: string[]) {
  try { localStorage.setItem(groupsStorageKey(courseId), JSON.stringify(groups)); } catch { }
}

// ── Quick Edit Modal ──────────────────────────────────────────────────────────
function QuickEditModal({
  assignment, courseId, onClose, onSave, onMoreOptions,
}: {
  assignment: Assignment;
  courseId: string;
  onClose: () => void;
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
      setError("Failed to save. Please try again.");
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
              className="w-full h-9 border border-gray-300 rounded px-3 text-sm outline-none transition-all"
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">Due at</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 block mb-0.5">Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-9 border border-gray-300 rounded px-3 text-xs outline-none transition-all"
                  onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">Time</label>
                <div className="relative">
                  <select value={dueTime} onChange={(e) => setDueTime(e.target.value)}
                    className="h-9 border border-gray-300 rounded px-3 text-xs bg-white outline-none appearance-none pr-7 transition-all"
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
              className="w-32 h-9 border border-gray-300 rounded px-3 text-sm outline-none transition-all"
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
          </div>
          {error && <p className="text-xs text-red-600">⚠ {error}</p>}
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onMoreOptions} className="h-8 px-4 border border-gray-300 text-xs text-gray-600 rounded hover:bg-white transition-all">More Options</button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={saving} className="h-8 px-4 border border-gray-300 text-xs text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving || !name.trim()} className="h-8 px-5 text-xs text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
      <style>{`input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.6;}input[type="date"]::-webkit-calendar-picker-indicator:hover{opacity:1;}`}</style>
    </div>
  );
}

// ── Assign To Right Panel ─────────────────────────────────────────────────────
interface AssignRow {
  id: number;
  assignees: string[];
  dueDate: string;
  dueTime: string;
  availableFrom: string;
  availableFromTime: string;
  until: string;
  untilTime: string;
}

function AssignToPanel({
  assignment, courseId, sections, staff, onClose, onSave,
}: {
  assignment: Assignment;
  courseId: string;
  sections: Section[];
  staff: Staff[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [rows, setRows] = useState<AssignRow[]>([{
    id: 1,
    assignees: ["Everyone"],
    dueDate: isoToDate(assignment.dueDate),
    dueTime: isoToTime(assignment.dueDate),
    availableFrom: isoToDate(assignment.availableFrom),
    availableFromTime: isoToTime(assignment.availableFrom),
    until: isoToDate(assignment.availableUntil),
    untilTime: isoToTime(assignment.availableUntil),
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
    setRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const toggleAssignee = (rowId: number, name: string) =>
    setRows(p => p.map(r => {
      if (r.id !== rowId) return r;
      const has = r.assignees.includes(name);
      return { ...r, assignees: has ? r.assignees.filter(a => a !== name) : [...r.assignees, name] };
    }));

  const addRow = () => setRows(p => [...p, {
    id: Date.now(), assignees: [],
    dueDate: "", dueTime: "11:59 PM",
    availableFrom: "", availableFromTime: "12:00 AM",
    until: "", untilTime: "11:59 PM",
  }]);

  const removeRow = (id: number) => setRows(p => p.filter(r => r.id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      const row = rows[0];
      await fetch(`/api/admin/courses/${courseId}/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignees: row.assignees,
          dueDate: row.dueDate || null,
          dueTime: row.dueTime,
          availableFrom: row.availableFrom || null,
          availableFromTime: row.availableFromTime,
          availableUntil: row.until || null,
          untilTime: row.untilTime,
        }),
      });
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const DateRow = ({ label, dateVal, timeVal, onDateChange, onTimeChange, onClear }: {
    label: string; dateVal: string; timeVal: string;
    onDateChange: (v: string) => void; onTimeChange: (v: string) => void; onClear: () => void;
  }) => {
    const localLabel = fmtDateLabel(dateVal, timeVal);
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Date</p>
            <div className="relative flex items-center border border-gray-300 rounded h-8 px-2 bg-white">
              <input type="date" value={dateVal} onChange={(e) => onDateChange(e.target.value)}
                className="flex-1 text-xs outline-none bg-transparent" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Time</p>
            <div className="relative">
              <select value={timeVal} onChange={(e) => onTimeChange(e.target.value)}
                className="w-full h-8 border border-gray-300 rounded px-2 text-xs bg-white outline-none appearance-none pr-6">
                {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        {localLabel && <p className="text-[10px] text-gray-500">Local: {localLabel}</p>}
        <button onClick={onClear} className="text-[11px] hover:underline" style={{ color: MAROON }}>Clear</button>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div
        className="fixed top-0 right-0 h-full z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col"
        style={{ width: 380, fontFamily: FONT }}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                <rect x="4" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-bold text-gray-800">{assignment.title}</span>
            </div>
            <p className="text-xs text-gray-500 ml-6">Assignment | {assignment.points} pts</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-400 hover:bg-gray-100 shrink-0 mt-0.5">
            <X size={14} />
          </button>
        </div>

        <div className="mx-4 mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded p-3 shrink-0">
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#1d6fa4" }}>
            <span className="text-white text-[10px] font-bold">i</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            Select who should be assigned and use the drop-down menus or manually enter your date and time.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {rows.map((row, idx) => (
            <div key={row.id} className="border border-gray-200 rounded-md p-3 space-y-4 relative">
              {idx > 0 && (
                <button onClick={() => removeRow(row.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                  <X size={13} />
                </button>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Assign To</p>
                <div className="relative" data-assigndrop>
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); setOpenDropId(openDropId === row.id ? null : row.id); setDropSearch(""); }}
                    className="w-full min-h-[34px] border border-gray-300 rounded px-2 py-1 flex flex-wrap gap-1 items-center cursor-pointer bg-white"
                  >
                    {row.assignees.map(a => (
                      <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white font-medium" style={{ background: MAROON }}>
                        {a}
                        <button onMouseDown={(e) => { e.stopPropagation(); toggleAssignee(row.id, a); }} className="hover:opacity-70 font-bold text-sm leading-none">×</button>
                      </span>
                    ))}
                    <input
                      readOnly
                      placeholder={row.assignees.length ? "" : "Start typing to search..."}
                      className="flex-1 min-w-20 text-xs outline-none bg-transparent text-gray-400 cursor-pointer"
                    />
                    <ChevronDown size={12} className="text-gray-400 shrink-0" style={{ transform: openDropId === row.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                  </div>

                  {openDropId === row.id && (
                    <div data-assigndrop className="absolute z-50 w-full bg-white border border-gray-200 shadow-xl rounded mt-0.5 max-h-60 overflow-y-auto"
                      onMouseDown={(e) => e.stopPropagation()}>
                      <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white">
                        <input autoFocus value={dropSearch} onChange={(e) => setDropSearch(e.target.value)}
                          placeholder="Start typing to search..."
                          className="w-full h-7 px-2 text-xs border border-gray-200 rounded outline-none focus:border-[#7b1113]" />
                      </div>

                      {!dropSearch && (
                        <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, "Mastery Paths"); }}
                          className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                          style={{ color: row.assignees.includes("Mastery Paths") ? MAROON : "#374151", fontWeight: row.assignees.includes("Mastery Paths") ? 600 : 400 }}>
                          Mastery Paths
                          {row.assignees.includes("Mastery Paths") && <span style={{ color: MAROON }}>✓</span>}
                        </button>
                      )}

                      {["Everyone"].filter(o => o.toLowerCase().includes(dropSearch.toLowerCase())).map(opt => (
                        <button key={opt} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, opt); }}
                          className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                          style={{ color: row.assignees.includes(opt) ? MAROON : "#374151", fontWeight: row.assignees.includes(opt) ? 600 : 400 }}>
                          {opt}{row.assignees.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
                        </button>
                      ))}

                      {sections.filter(s => s.name.toLowerCase().includes(dropSearch.toLowerCase())).length > 0 && (
                        <>
                          <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 border-t border-gray-100">Sections</div>
                          {sections.filter(s => s.name.toLowerCase().includes(dropSearch.toLowerCase())).map(s => (
                            <button key={s.id} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }}
                              className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                              style={{ color: row.assignees.includes(s.name) ? MAROON : "#374151", fontWeight: row.assignees.includes(s.name) ? 600 : 400 }}>
                              {s.name}{row.assignees.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                            </button>
                          ))}
                        </>
                      )}

                      {staff.filter(s => s.name.toLowerCase().includes(dropSearch.toLowerCase())).length > 0 && (
                        <>
                          <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 border-t border-gray-100">Staff</div>
                          {staff.filter(s => s.name.toLowerCase().includes(dropSearch.toLowerCase())).map(s => (
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

              <DateRow
                label="Due Date"
                dateVal={row.dueDate} timeVal={row.dueTime}
                onDateChange={(v) => updateRow(row.id, "dueDate", v)}
                onTimeChange={(v) => updateRow(row.id, "dueTime", v)}
                onClear={() => { updateRow(row.id, "dueDate", ""); updateRow(row.id, "dueTime", "11:59 PM"); }}
              />
              <DateRow
                label="Available from"
                dateVal={row.availableFrom} timeVal={row.availableFromTime}
                onDateChange={(v) => updateRow(row.id, "availableFrom", v)}
                onTimeChange={(v) => updateRow(row.id, "availableFromTime", v)}
                onClear={() => { updateRow(row.id, "availableFrom", ""); updateRow(row.id, "availableFromTime", "12:00 AM"); }}
              />
              <DateRow
                label="Until"
                dateVal={row.until} timeVal={row.untilTime}
                onDateChange={(v) => updateRow(row.id, "until", v)}
                onTimeChange={(v) => updateRow(row.id, "untilTime", v)}
                onClear={() => { updateRow(row.id, "until", ""); updateRow(row.id, "untilTime", "11:59 PM"); }}
              />
            </div>
          ))}

          <button onClick={addRow}
            className="flex items-center gap-1.5 text-xs font-medium hover:underline"
            style={{ color: MAROON }}>
            <Plus size={13} /> Add
          </button>
        </div>

        <div className="shrink-0 border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-2 bg-gray-50">
          <button onClick={onClose} className="h-8 px-4 border border-gray-300 text-xs text-gray-600 rounded hover:bg-white transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="h-8 px-5 text-xs text-white rounded hover:opacity-90 disabled:opacity-50 font-medium"
            style={{ background: MAROON }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Add Group Modal ───────────────────────────────────────────────────────────
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
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())}
              placeholder="e.g., Essay Group 1"
              className="flex-1 h-9 border border-gray-300 rounded px-3 text-sm outline-none transition-all"
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} disabled={saving} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={() => name.trim() && onSave(name.trim())} disabled={saving || !name.trim()}
            className="h-9 px-4 text-sm text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Group Name Modal ─────────────────────────────────────────────────────
function EditGroupModal({ groupName, onClose, onSave, saving }: {
  groupName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
  saving: boolean;
}) {
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
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())}
              className="flex-1 h-9 border border-gray-300 rounded px-3 text-sm outline-none transition-all"
              onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} disabled={saving} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={() => name.trim() && onSave(name.trim())} disabled={saving || !name.trim() || name.trim() === groupName}
            className="h-9 px-4 text-sm text-white rounded hover:opacity-90 disabled:opacity-50" style={{ background: MAROON }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Group Modal ────────────────────────────────────────────────────────
function DeleteGroupModal({ groupName, assignmentCount, otherGroups, onClose, onDelete }: {
  groupName: string;
  assignmentCount: number;
  otherGroups: string[];
  onClose: () => void;
  onDelete: (action: "delete" | "move", targetGroup?: string) => void;
}) {
  const [choice, setChoice] = useState<"delete" | "move">("delete");
  const [targetGroup, setTargetGroup] = useState(otherGroups[0] ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[460px] border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ fontFamily: FONT }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-800">Delete Assignment Group</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100"><X size={14} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-700">
            You are about to delete <strong>{groupName}</strong>, which has <strong>{assignmentCount}</strong> assignment{assignmentCount !== 1 ? "s" : ""} in it.
          </p>
          <p className="text-sm text-gray-700">Would you like to:</p>

          {/* Delete option */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={choice === "delete"}
              onChange={() => setChoice("delete")}
              className="accent-[#7b1113]"
            />
            <span className="text-sm text-gray-700">Delete its assignments</span>
          </label>

          {/* Move option */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={choice === "move"}
                onChange={() => setChoice("move")}
                disabled={otherGroups.length === 0}
                className="accent-[#7b1113]"
              />
              <span className={`text-sm ${otherGroups.length === 0 ? "text-gray-400" : "text-gray-700"}`}>Move its assignments to</span>
            </label>

            {choice === "move" && otherGroups.length > 0 && (
              <div className="ml-6 relative">
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-52 h-9 border border-gray-300 rounded px-3 text-sm bg-white outline-none appearance-none pr-8 focus:border-[#7b1113]"
                >
                  <option value="">[ Select a Group ]</option>
                  {otherGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} className="h-9 px-4 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-100">Cancel</button>
          <button
            onClick={() => onDelete(choice, choice === "move" ? targetGroup : undefined)}
            disabled={choice === "move" && !targetGroup}
            className="h-9 px-4 text-sm text-white rounded hover:opacity-90 disabled:opacity-50"
            style={{ background: MAROON }}
          >
            Delete Group
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 3-dot Dropdown for Assignment Row ────────────────────────────────────────
type DropdownAction = "edit" | "speedgrader" | "duplicate" | "assignTo";

const MENU_ITEMS: { label: string; action: DropdownAction; icon: React.ReactNode }[] = [
  {
    label: "Edit", action: "edit", icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    )
  },
  {
    label: "SpeedGrader", action: "speedgrader", icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    )
  },
  {
    label: "Duplicate", action: "duplicate", icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
      </svg>
    )
  },
  {
    label: "Assign To…", action: "assignTo", icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    )
  },
];

function AssignmentDropdown({ assignment, onAction, onClose }: {
  assignment: Assignment;
  onAction: (action: DropdownAction, a: Assignment) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={menuRef}
      className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 overflow-hidden py-1"
      style={{ minWidth: 180, fontFamily: FONT }}
      onClick={(e) => e.stopPropagation()}>
      {MENU_ITEMS.map((item) => (
        <button key={item.action}
          onMouseDown={(e) => { e.stopPropagation(); onAction(item.action, assignment); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-[#7b1113] hover:text-white transition-colors">
          <span className="shrink-0">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ── Group 3-dot Dropdown (Edit name + Delete only) ───────────────────────────
function GroupDropdown({ onEdit, onDelete, onClose }: {
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={menuRef}
      className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 overflow-hidden py-1"
      style={{ minWidth: 160, fontFamily: FONT }}
      onClick={(e) => e.stopPropagation()}>
      <button
        onMouseDown={(e) => { e.stopPropagation(); onEdit(); onClose(); }}
        className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-[#7b1113] hover:text-white transition-colors">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit
      </button>
      <button
        onMouseDown={(e) => { e.stopPropagation(); onDelete(); onClose(); }}
        className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-red-600 hover:text-white transition-colors">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
        Delete
      </button>
    </div>
  );
}

// ── Assignment Row ────────────────────────────────────────────────────────────
function AssignmentRow({ a, courseId, router, onEdit, onDuplicate, onAssignTo, onSpeedGrader }: {
  a: Assignment;
  courseId: string;
  router: ReturnType<typeof useRouter>;
  onEdit: (a: Assignment) => void;
  onDuplicate: (a: Assignment) => void;
  onAssignTo: (a: Assignment) => void;
  onSpeedGrader: (a: Assignment) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const now = new Date();
  const isClosed = a.availableUntil && now > new Date(a.availableUntil);
  const due = fmtDue(a.dueDate);

  const handleAction = (action: DropdownAction, assignment: Assignment) => {
    if (action === "edit") onEdit(assignment);
    else if (action === "speedgrader") onSpeedGrader(assignment);
    else if (action === "duplicate") onDuplicate(assignment);
    else if (action === "assignTo") onAssignTo(assignment);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b bg-white hover:bg-gray-50 cursor-pointer transition-colors relative"
      style={{ borderColor: "#e5e7eb" }}
      onClick={() => router.push(`/admin/courses/${courseId}/assignments/${a.id}`)}>
      <div className="flex flex-col gap-0.5 opacity-30 shrink-0">
        {[...Array(3)].map((_, i) => (<div key={i} className="flex gap-0.5"><div className="w-1 h-1 rounded-full bg-gray-400" /><div className="w-1 h-1 rounded-full bg-gray-400" /></div>))}
      </div>
      <div className="w-[3px] h-8 rounded-full shrink-0" style={{ background: MAROON }} />
      <div className="shrink-0"><AssignmentIcon /></div>
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#22c55e" className="shrink-0">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z" />
        </svg>
      ) : (
        <div className="w-5 h-5 shrink-0" />
      )}

      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onMouseDown={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
          className="p-1 rounded hover:bg-gray-200 transition-colors">
          <MoreVertical size={16} className="text-gray-500" />
        </button>
        {menuOpen && <AssignmentDropdown assignment={a} onAction={handleAction} onClose={() => setMenuOpen(false)} />}
      </div>
    </div>
  );
}

// ── Assignment Group Section ──────────────────────────────────────────────────
function AssignmentGroupSection({ title, items, courseId, router, onAddAssignment, onEdit, onDuplicate, onAssignTo, onSpeedGrader, onEditGroup, onDeleteGroup }: {
  title: string; items: Assignment[]; courseId: string;
  router: ReturnType<typeof useRouter>;
  onAddAssignment: (group: string) => void;
  onEdit: (a: Assignment) => void;
  onDuplicate: (a: Assignment) => void;
  onAssignTo: (a: Assignment) => void;
  onSpeedGrader: (a: Assignment) => void;
  onEditGroup: (group: string) => void;
  onDeleteGroup: (group: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-4 py-2.5 border select-none" style={{ background: "#f9fafb", borderColor: "#e5e7eb" }}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCollapsed(c => !c)}>
          <div className="flex flex-col gap-0.5 opacity-30 mr-1">
            {[...Array(3)].map((_, i) => (<div key={i} className="flex gap-0.5"><div className="w-1 h-1 rounded-full bg-gray-400" /><div className="w-1 h-1 rounded-full bg-gray-400" /></div>))}
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onAddAssignment(title)} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded transition-colors" title="Add assignment">
            <Plus size={15} />
          </button>
          {/* Group 3-dot menu */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onMouseDown={(e) => { e.stopPropagation(); setGroupMenuOpen(v => !v); }}
              className="p-1.5 text-gray-400 hover:bg-gray-200 rounded transition-colors">
              <MoreVertical size={15} />
            </button>
            {groupMenuOpen && (
              <GroupDropdown
                onEdit={() => onEditGroup(title)}
                onDelete={() => onDeleteGroup(title)}
                onClose={() => setGroupMenuOpen(false)}
              />
            )}
          </div>
        </div>
      </div>
      {!collapsed && (
        <div className="border border-t-0" style={{ borderColor: "#e5e7eb" }}>
          {items.length === 0
            ? <div className="px-6 py-4 text-sm text-gray-400 text-center">No assignments in this group.</div>
            : items.map(a => (
              <AssignmentRow key={a.id} a={a} courseId={courseId} router={router}
                onEdit={onEdit} onDuplicate={onDuplicate} onAssignTo={onAssignTo} onSpeedGrader={onSpeedGrader} />
            ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function CourseAssignmentsPage({ courseId }: Props) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [localGroups, setLocalGroups] = useState<string[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  // Modals / panels
  const [quickEditTarget, setQuickEditTarget] = useState<Assignment | null>(null);
  const [assignToTarget, setAssignToTarget] = useState<Assignment | null>(null);

  // Group modals
  const [editGroupTarget, setEditGroupTarget] = useState<string | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<string | null>(null);
  const [savingEditGroup, setSavingEditGroup] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadAssignments = () => {
    if (!courseId) return;
    fetch(`/api/admin/courses/${courseId}/assignments`)
      .then(r => r.json())
      .then(d => {
        const list: Assignment[] = d.assignments ?? [];
        setAssignments(list);
        const apiGroups = [...new Set(list.map(a => a.assignmentGroup || "Assignments"))];
        setLocalGroups(prev => {
          const merged = [...new Set([...prev, ...apiGroups])];
          persistGroups(courseId, merged);
          return merged;
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!courseId) return;
    const persisted = loadPersistedGroups(courseId);
    if (persisted.length > 0) setLocalGroups(persisted);
    loadAssignments();
    fetch(`/api/admin/courses/${courseId}/sections`)
      .then(r => r.json())
      .then(d => { setSections(d.sections ?? []); setStaff(d.staff ?? []); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // ── Add Group ─────────────────────────────────────────────────────────────
  const handleSaveGroup = async (name: string) => {
    setSavingGroup(true);
    try {
      setLocalGroups(prev => {
        if (prev.includes(name)) return prev;
        const next = [...prev, name];
        persistGroups(courseId, next);
        return next;
      });
      setShowGroupModal(false);
    } finally {
      setSavingGroup(false);
    }
  };

  // ── Edit Group Name ───────────────────────────────────────────────────────
  const handleEditGroupSave = async (newName: string) => {
    if (!editGroupTarget) return;
    setSavingEditGroup(true);
    try {
      const oldName = editGroupTarget;
      // Rename in localGroups
      setLocalGroups(prev => {
        const next = prev.map(g => g === oldName ? newName : g);
        persistGroups(courseId, next);
        return next;
      });
      // Rename in assignments (local state)
      setAssignments(prev =>
        prev.map(a => a.assignmentGroup === oldName ? { ...a, assignmentGroup: newName } : a)
      );
      // Optionally update server (fire & forget)
      assignments
        .filter(a => a.assignmentGroup === oldName)
        .forEach(a => {
          fetch(`/api/admin/courses/${courseId}/assignments/${a.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignmentGroup: newName }),
          }).catch(() => {});
        });
      setEditGroupTarget(null);
    } finally {
      setSavingEditGroup(false);
    }
  };

  // ── Delete Group ──────────────────────────────────────────────────────────
  const handleDeleteGroup = (action: "delete" | "move", targetGroup?: string) => {
    if (!deleteGroupTarget) return;
    const groupName = deleteGroupTarget;

    if (action === "delete") {
      // Delete assignments in the group
      const toDelete = assignments.filter(a => (a.assignmentGroup || "Assignments") === groupName);
      toDelete.forEach(a => {
        fetch(`/api/admin/courses/${courseId}/assignments/${a.id}`, { method: "DELETE" }).catch(() => {});
      });
      setAssignments(prev => prev.filter(a => (a.assignmentGroup || "Assignments") !== groupName));
    } else if (action === "move" && targetGroup) {
      // Move assignments to target group
      setAssignments(prev =>
        prev.map(a => (a.assignmentGroup || "Assignments") === groupName
          ? { ...a, assignmentGroup: targetGroup }
          : a
        )
      );
      // Fire & forget server updates
      assignments
        .filter(a => (a.assignmentGroup || "Assignments") === groupName)
        .forEach(a => {
          fetch(`/api/admin/courses/${courseId}/assignments/${a.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignmentGroup: targetGroup }),
          }).catch(() => {});
        });
    }

    // Remove the group
    setLocalGroups(prev => {
      const next = prev.filter(g => g !== groupName);
      persistGroups(courseId, next);
      return next;
    });
    setDeleteGroupTarget(null);
  };

  // ── Quick Edit ────────────────────────────────────────────────────────────
  const handleQuickEditSave = async (updated: Partial<Assignment> & { dueTime?: string }) => {
    if (!quickEditTarget) return;
    await fetch(`/api/admin/courses/${courseId}/assignments/${quickEditTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: updated.title, points: updated.points, dueDate: updated.dueDate || null, dueTime: updated.dueTime }),
    });
    setAssignments(prev => prev.map(a => a.id === quickEditTarget.id ? { ...a, ...updated } : a));
  };

  // ── Duplicate ─────────────────────────────────────────────────────────────
  const handleDuplicate = async (a: Assignment) => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${a.title} Copy`,
          points: a.points,
          status: "UNPUBLISHED",
          assignmentGroup: a.assignmentGroup,
          dueDate: a.dueDate,
          availableFrom: a.availableFrom,
          availableUntil: a.availableUntil,
        }),
      });
      if (res.ok) loadAssignments();
    } catch { /* ignore */ }
  };

  // ── SpeedGrader ───────────────────────────────────────────────────────────
  const handleSpeedGrader = (a: Assignment) => {
    window.open(`/admin/courses/${courseId}/assignments/${a.id}/speedgrader`, "_blank");
  };

  // ── Grouped data ──────────────────────────────────────────────────────────
  const filtered = assignments.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));
  const grouped: Record<string, Assignment[]> = {};
  for (const g of localGroups) grouped[g] = [];
  for (const a of filtered) {
    const g = a.assignmentGroup || "Assignments";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(a);
  }

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>

      {/* Top bar — removed the standalone 3-dot button */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 border rounded text-sm w-56 focus:outline-none" style={{ borderColor: "#d1d5db" }} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGroupModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
            style={{ borderColor: "#d1d5db", color: "#374151" }}>
            <Plus size={14} /> Group
          </button>
          <button onClick={() => router.push(`/admin/courses/${courseId}/assignments/new`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-colors"
            style={{ background: MAROON }}>
            <Plus size={14} /> Assignment
          </button>
          {/* ← 3-dot removed from here */}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading assignments...
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-gray-400">No assignments yet.</p>
            <button onClick={() => router.push(`/admin/courses/${courseId}/assignments/new`)}
              className="text-xs font-bold hover:underline" style={{ color: MAROON }}>
              + Create your first assignment
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([group, items]) => (
            <AssignmentGroupSection key={group} title={group} items={items} courseId={courseId} router={router}
              onAddAssignment={(g) => router.push(`/admin/courses/${courseId}/assignments/new?group=${encodeURIComponent(g)}`)}
              onEdit={(a) => setQuickEditTarget(a)}
              onDuplicate={handleDuplicate}
              onAssignTo={(a) => setAssignToTarget(a)}
              onSpeedGrader={handleSpeedGrader}
              onEditGroup={(g) => setEditGroupTarget(g)}
              onDeleteGroup={(g) => setDeleteGroupTarget(g)}
            />
          ))
        )}
      </div>

      {/* ── Modals ── */}
      {showGroupModal && (
        <AddGroupModal onClose={() => setShowGroupModal(false)} onSave={handleSaveGroup} saving={savingGroup} />
      )}

      {quickEditTarget && (
        <QuickEditModal
          assignment={quickEditTarget}
          courseId={courseId}
          onClose={() => setQuickEditTarget(null)}
          onSave={handleQuickEditSave}
          onMoreOptions={() => {
            router.push(`/admin/courses/${courseId}/assignments/${quickEditTarget.id}/edit`);
            setQuickEditTarget(null);
          }}
        />
      )}

      {assignToTarget && (
        <AssignToPanel
          assignment={assignToTarget}
          courseId={courseId}
          sections={sections}
          staff={staff}
          onClose={() => setAssignToTarget(null)}
          onSave={loadAssignments}
        />
      )}

      {/* Edit Group Name Modal */}
      {editGroupTarget && (
        <EditGroupModal
          groupName={editGroupTarget}
          onClose={() => setEditGroupTarget(null)}
          onSave={handleEditGroupSave}
          saving={savingEditGroup}
        />
      )}

      {/* Delete Group Modal */}
      {deleteGroupTarget && (
        <DeleteGroupModal
          groupName={deleteGroupTarget}
          assignmentCount={assignments.filter(a => (a.assignmentGroup || "Assignments") === deleteGroupTarget).length}
          otherGroups={localGroups.filter(g => g !== deleteGroupTarget)}
          onClose={() => setDeleteGroupTarget(null)}
          onDelete={handleDeleteGroup}
        />
      )}
    </div>
  );
}