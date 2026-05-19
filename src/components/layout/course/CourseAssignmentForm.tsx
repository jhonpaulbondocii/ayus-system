"use client";

// src/components/layout/course/CourseAssignmentForm.tsx

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Plus, X, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS / HELPERS
───────────────────────────────────────────────────────────────────────────── */
const MAROON = "#7b1113";
const FONT = "system-ui, -apple-system, sans-serif";

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hh = h % 12 === 0 ? 12 : h % 12;
    const mm = m === 0 ? "00" : "30";
    const ampm = h < 12 ? "AM" : "PM";
    TIME_OPTIONS.push(`${hh}:${mm} ${ampm}`);
  }
}

const GRADE_OPTIONS = ["Points", "Percentage", "Complete/Incomplete", "Letter Grade", "GPA Scale", "Pass/Fail", "Not Graded"];
const SUBMISSION_TYPES = ["Online", "On Paper", "External Tool", "No Submission"];
const SUBMISSION_ENTRY_TYPES = ["File Upload", "Text Entry", "Website URL", "Media Recording", "Student Annotation"];

const ALLOWED_FILE_TYPES = [
  { value: "pdf", label: "PDF" }, { value: "docx", label: "DOCX" }, { value: "doc", label: "DOC" },
  { value: "txt", label: "TXT" }, { value: "xlsx", label: "XLSX" }, { value: "csv", label: "CSV" },
  { value: "pptx", label: "PPTX" }, { value: "jpg", label: "JPG" }, { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" }, { value: "zip", label: "ZIP" },
  { value: "mp4", label: "MP4" }, { value: "webm", label: "WEBM" },
  { value: "mp3", label: "MP3" }, { value: "wav", label: "WAV" }, { value: "m4a", label: "M4A" },
];

function isoToDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try { return iso.slice(0, 10); } catch { return ""; }
}
function isoToTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const h = d.getHours(), m = d.getMinutes();
    const hh = h % 12 === 0 ? 12 : h % 12;
    const mm = m < 10 ? "0" + m : String(m);
    return `${hh}:${mm} ${h < 12 ? "AM" : "PM"}`;
  } catch { return ""; }
}

function normalizeFileTypes(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set(ALLOWED_FILE_TYPES.map(t => t.value));
  return values.map(v => v.replace(/^\./, "").trim().toLowerCase()).filter(v => allowed.has(v));
}

function formatFileTypes(values: string[] | undefined): string {
  return normalizeFileTypes(values).map(v => v.toUpperCase()).join(", ");
}

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface Assignment {
  id?: string | number;
  title?: string;
  description?: string;
  points?: number;
  assignmentGroup?: string;
  submissionType?: string;
  status?: string;
  dueDate?: string | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
}
interface Section { id: string | number; name: string; }
interface Staff { id: string | number; name: string; }
interface AssignRow {
  id: number; assignees: string[];
  dueDate: string; dueTime: string;
  availableFrom: string; availableFromTime: string;
  until: string; untilTime: string;
}
interface SubmissionEntryItem {
  id: number;
  label: string;
  required: boolean;
  type: string;
  allowedFileTypes?: string[];
  maxFiles?: number | null;
}
interface AssignmentGroupItem { id: number; name: string; }

type AssignmentWithRole = Assignment & {
  _assignmentRole?: "manager" | "submitter";
  _publisherName?: string | null;
  submissionEntries?: SubmissionEntryItem[];
};

/* ─────────────────────────────────────────────────────────────────────────────
   COMPACT DATE PICKER
───────────────────────────────────────────────────────────────────────────── */
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function parseLocalDate(str: string): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDisplay(str: string): string {
  const d = parseLocalDate(str);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DatePicker({ value, onChange, placeholder = "Select date" }: { value: string; onChange: (val: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const selected = parseLocalDate(value);

  const getInitialView = (sel: Date | null) =>
    sel ? new Date(sel.getFullYear(), sel.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1);
  const [view, setView] = useState<Date>(() => getInitialView(selected));

  const handleOpen = () => {
    const sel = parseLocalDate(value);
    if (sel) setView(new Date(sel.getFullYear(), sel.getMonth(), 1));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const year = view.getFullYear(), month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  const isSelected = (d: number) => selected?.getFullYear() === year && selected?.getMonth() === month && selected?.getDate() === d;

  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={() => open ? setOpen(false) : handleOpen()}
        className="w-full h-8 flex items-center justify-between px-2.5 border border-gray-300 rounded-sm bg-white text-xs text-left focus:outline-none focus:border-[#7b1113] hover:border-gray-400 transition-colors">
        <span className={value ? "text-gray-800" : "text-gray-400"}>{value ? fmtDisplay(value) : placeholder}</span>
        <ChevronDown size={12} className="text-gray-400 shrink-0 ml-1" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-xl" style={{ width: 260, left: 0 }} onMouseDown={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <button type="button" onClick={() => setView(new Date(year, month - 1, 1))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"><ChevronLeft size={14} /></button>
            <span className="text-xs font-semibold text-gray-800">{MONTHS[month]} {year}</span>
            <button type="button" onClick={() => setView(new Date(year, month + 1, 1))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"><ChevronRight size={14} /></button>
          </div>
          <div className="grid grid-cols-7 px-2 pt-2">
            {DAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-0.5">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const sel = isSelected(d), tod = isToday(d);
              return (
                <button key={i} type="button"
                  onClick={() => { onChange(toLocalISO(new Date(year, month, d))); setOpen(false); }}
                  className={`h-7 w-full flex items-center justify-center rounded text-xs font-medium transition-colors ${sel ? "text-white" : tod ? "font-bold" : "text-gray-700 hover:bg-gray-100"}`}
                  style={sel ? { background: MAROON } : tod ? { color: MAROON } : {}}>
                  {d}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-xs hover:underline" style={{ color: MAROON }}>Clear</button>
            <button type="button" onClick={() => { onChange(toLocalISO(today)); setOpen(false); setView(new Date(today.getFullYear(), today.getMonth(), 1)); }} className="text-xs font-semibold" style={{ color: MAROON }}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative shrink-0">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-8 pl-2 pr-6 border border-gray-300 rounded-sm bg-white text-xs outline-none appearance-none focus:border-[#7b1113] hover:border-gray-400 transition-colors cursor-pointer"
        style={{ minWidth: 88, maxWidth: 104 }}>
        <option value="">Time</option>
        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function DateTimeRow({ label, dateValue, timeValue, onDateChange, onTimeChange, onClear, error }: {
  label: string; dateValue: string; timeValue: string;
  onDateChange: (v: string) => void; onTimeChange: (v: string) => void; onClear: () => void; error?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-700 mb-1">{label}</p>
      <div className="flex flex-col xs:flex-row gap-1.5 items-stretch xs:items-start">
        <div className="flex-1 min-w-0"><DatePicker value={dateValue} onChange={onDateChange} placeholder="mm/dd/yyyy" /></div>
        <TimePicker value={timeValue} onChange={onTimeChange} />
      </div>
      {error && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}
      {(dateValue || timeValue) && (
        <button type="button" onClick={onClear} className="text-[11px] mt-0.5 hover:underline" style={{ color: MAROON }}>Clear</button>
      )}
      {dateValue && <p className="text-[10px] text-gray-400 mt-0.5">{fmtDisplay(dateValue)} {timeValue}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RICH TEXT EDITOR MODALS
───────────────────────────────────────────────────────────────────────────── */
function WordCountModal({ text, chars, charsNoSpace, paragraphs, onClose }: { text: string; chars: number; charsNoSpace: number; paragraphs: number; onClose: () => void }) {
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-full max-w-[288px] border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">Word Count</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4 space-y-2 text-xs text-gray-700">
          {([["Words", words], ["Characters (with spaces)", chars], ["Characters (no spaces)", charsNoSpace], ["Paragraphs", paragraphs]] as [string, number][]).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-gray-100 pb-1 last:border-0"><span>{k}</span><span className="font-semibold">{v}</span></div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} style={{ background: MAROON }} className="h-7 px-4 text-white text-xs rounded hover:opacity-90">Close</button>
        </div>
      </div>
    </div>
  );
}

function FindReplaceModal({ html, onUpdate, onClose }: { html: string; onUpdate: (html: string) => void; onClose: () => void }) {
  const [find, setFind] = useState(""); const [replace, setReplace] = useState(""); const [msg, setMsg] = useState("");
  const doReplace = (all: boolean) => {
    if (!find) return;
    const esc = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flags = all ? "gi" : "i";
    const count = (html.match(new RegExp(esc, flags)) ?? []).length;
    if (!count) { setMsg("No matches found."); return; }
    onUpdate(html.replace(new RegExp(esc, flags), replace));
    setMsg(all ? `Replaced ${count} occurrence(s).` : "Replaced first occurrence.");
  };
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-full max-w-sm border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">Find and Replace</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div><label className="text-xs text-gray-500 block mb-1">Find</label><input autoFocus value={find} onChange={e => setFind(e.target.value)} className="w-full h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" placeholder="Search text..." /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Replace with</label><input value={replace} onChange={e => setReplace(e.target.value)} className="w-full h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" placeholder="Replacement..." /></div>
          {msg && <p className="text-xs" style={{ color: MAROON }}>{msg}</p>}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="h-7 px-3 border border-gray-300 text-xs text-gray-700 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={() => doReplace(false)} className="h-7 px-3 border border-gray-300 text-xs text-gray-700 rounded hover:bg-gray-50">Replace</button>
          <button onClick={() => doReplace(true)} style={{ background: MAROON }} className="h-7 px-3 text-white text-xs rounded hover:opacity-90">Replace All</button>
        </div>
      </div>
    </div>
  );
}

function HTMLEditorModal({ html: init, onUpdate, onClose }: { html: string; onUpdate: (h: string) => void; onClose: () => void }) {
  const [html, setHtml] = useState(init);
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-full max-w-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">HTML Editor</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4"><textarea value={html} onChange={e => setHtml(e.target.value)} className="w-full h-64 border border-gray-300 rounded px-3 py-2 text-xs font-mono outline-none focus:border-[#7b1113] resize-none" /></div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="h-7 px-3 border border-gray-300 text-xs text-gray-700 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onUpdate(html); onClose(); }} style={{ background: MAROON }} className="h-7 px-3 text-white text-xs rounded hover:opacity-90">Apply</button>
        </div>
      </div>
    </div>
  );
}

function ColorPickerModal({ type, onClose }: { type: "foreColor" | "backColor"; onClose: () => void }) {
  const colors = type === "foreColor"
    ? ["#000000", "#374151", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"]
    : ["transparent", "#fef9c3", "#fce7f3", "#e0f2fe", "#dcfce7", "#ede9fe", "#ffedd5", "#fee2e2", "#d1fae5", "#f1f5f9"];
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded shadow-xl border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">{type === "foreColor" ? "Text Color" : "Background Color"}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="p-4 grid grid-cols-5 gap-2">
          {colors.map(c => (
            <div key={c} title={c} style={{ background: c === "transparent" ? "linear-gradient(45deg,#ccc 25%,#fff 25%,#fff 75%,#ccc 75%)" : c }}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer hover:scale-110 transition-transform"
              onClick={() => { document.execCommand(type, false, c === "transparent" ? "" : c); onClose(); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TablePicker({ onPick }: { onPick: (r: number, c: number) => void }) {
  const [hover, setHover] = useState({ r: 0, c: 0 }); const MAX = 8;
  return (
    <div className="p-2 min-w-40">
      <p className="text-[10px] text-gray-500 text-center mb-1.5 h-3">{hover.r > 0 ? `${hover.r} × ${hover.c} table` : "Select table size"}</p>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${MAX},18px)`, gap: 2 }}>
        {Array.from({ length: MAX * MAX }, (_, i) => { const r = Math.floor(i / MAX) + 1, c = (i % MAX) + 1; return (
          <div key={i} onMouseEnter={() => setHover({ r, c })} onClick={() => onPick(r, c)}
            className={`w-4 h-4 border rounded-sm cursor-pointer transition-colors ${r <= hover.r && c <= hover.c ? "bg-blue-200 border-blue-400" : "bg-gray-50 border-gray-300"}`} />
        ); })}
      </div>
    </div>
  );
}

const RteChevron = () => <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>;
type MAction = { type: "action"; icon?: string; label: string; shortcut?: string; action: () => void; disabled?: boolean };
type MSep = { type: "sep" };
type MSub = { type: "sub"; icon?: string; label: string; children: (MAction | MSep | MSub)[]; picker?: boolean; onPick?: (r: number, c: number) => void };
type MItem = MAction | MSep | MSub;

function RteMenuItems({ items, onClose }: { items: MItem[]; onClose: () => void }) {
  return (<>{items.map((item, i) => {
    if (item.type === "sep") return <div key={i} className="my-1 border-t border-gray-100" />;
    if (item.type === "sub") return <RteSubMenuItem key={i} item={item} onClose={onClose} />;
    return (
      <button key={i} type="button" disabled={item.disabled}
        onMouseDown={e => { e.preventDefault(); if (!item.disabled) { item.action(); onClose(); } }}
        className={`w-full text-left px-3 py-1 text-xs flex items-center gap-2 ${item.disabled ? "text-gray-300" : "text-gray-700 hover:bg-blue-600 hover:text-white"}`}>
        <span className="w-4 text-center text-sm shrink-0">{item.icon ?? ""}</span>
        <span className="flex-1">{item.label}</span>
        {item.shortcut && <span className="font-mono text-[10px] opacity-60 shrink-0">{item.shortcut}</span>}
      </button>
    );
  })}</>);
}

function RteSubMenuItem({ item, onClose }: { item: MSub; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="w-full text-left px-3 py-1 text-xs flex items-center gap-2 text-gray-700 hover:bg-blue-600 hover:text-white">
        <span className="w-4 text-center text-sm shrink-0">{item.icon ?? ""}</span>
        <span className="flex-1">{item.label}</span><RteChevron />
      </button>
      {open && (
        <div className="absolute left-full top-0 bg-white border border-gray-200 shadow-lg rounded-sm min-w-44 py-1 z-[200]">
          {item.picker ? <TablePicker onPick={(r, c) => { item.onPick?.(r, c); onClose(); }} /> : <RteMenuItems items={item.children} onClose={onClose} />}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RICH TEXT EDITOR
───────────────────────────────────────────────────────────────────────────── */
function RichTextEditor({ value, onChange, placeholder = "Start typing..." }: { value?: string; onChange?: (html: string) => void; placeholder?: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showWC, setShowWC] = useState(false);
  const [showFR, setShowFR] = useState(false);
  const [showHTML, setShowHTML] = useState(false);
  const [showColor, setShowColor] = useState<"foreColor" | "backColor" | null>(null);
  const [wcData, setWcData] = useState({ text: "", chars: 0, charsNoSpace: 0, paragraphs: 0 });
  const [editorHtml, setEditorHtml] = useState("");
  const [isFS, setIsFS] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && editorRef.current && value) {
      editorRef.current.innerHTML = value;
      initializedRef.current = true;
    }
  }, [value]);

  const exec = useCallback((cmd: string, val?: string) => { const ed = editorRef.current; if (!ed) return; ed.focus(); try { document.execCommand(cmd, false, val); } catch (e) { console.warn(cmd, e); } }, []);
  const fmt = useCallback((tag: string) => { const ed = editorRef.current; if (!ed) return; ed.focus(); document.execCommand("formatBlock", false, `<${tag}>`); }, []);
  const insertHTML = useCallback((html: string) => {
    const ed = editorRef.current; if (!ed) return; ed.focus();
    const ok = document.execCommand("insertHTML", false, html);
    if (!ok) { const sel = window.getSelection(); if (sel && sel.rangeCount) { const range = sel.getRangeAt(0); range.deleteContents(); const frag = range.createContextualFragment(html); range.insertNode(frag); range.collapse(false); sel.removeAllRanges(); sel.addRange(range); } }
    updateWC();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const insertTable = useCallback((rows: number, cols: number) => {
    const hdr = `<tr>${Array(cols).fill(`<th style="border:1px solid #dee2e6;padding:6px 10px;background:#f7f9fb;font-weight:600;">&nbsp;</th>`).join("")}</tr>`;
    const bdy = Array(rows - 1).fill(`<tr>${Array(cols).fill(`<td style="border:1px solid #dee2e6;padding:6px 10px;">&nbsp;</td>`).join("")}</tr>`).join("");
    insertHTML(`<table style="border-collapse:collapse;width:100%;margin:8px 0;"><thead>${hdr}</thead><tbody>${bdy}</tbody></table><p><br></p>`);
  }, [insertHTML]);
  const updateWC = useCallback(() => { const text = editorRef.current?.innerText.trim() ?? ""; setWordCount(text ? text.split(/\s+/).filter(Boolean).length : 0); onChange?.(editorRef.current?.innerHTML ?? ""); }, [onChange]);
  const closeMenus = useCallback(() => setOpenMenu(null), []);
  const toggleFS = useCallback(() => { if (!isFS) { wrapRef.current?.requestFullscreen?.(); setIsFS(true); } else { document.exitFullscreen?.(); setIsFS(false); } }, [isFS]);

  useEffect(() => { const h = () => { if (!document.fullscreenElement) setIsFS(false); }; document.addEventListener("fullscreenchange", h); return () => document.removeEventListener("fullscreenchange", h); }, []);
  useEffect(() => { if (!openMenu) return; const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-rte-menubar]")) closeMenus(); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [openMenu, closeMenus]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowFR(true); } }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, []);

  const menus = useMemo((): { label: string; items: MItem[] }[] => [
    { label: "Edit", items: [{ type: "action", icon: "↩", label: "Undo", shortcut: "Ctrl+Z", action: () => exec("undo") }, { type: "action", icon: "↪", label: "Redo", shortcut: "Ctrl+Y", action: () => exec("redo") }, { type: "sep" }, { type: "action", icon: "✂", label: "Cut", shortcut: "Ctrl+X", action: () => exec("cut") }, { type: "action", icon: "⧉", label: "Copy", shortcut: "Ctrl+C", action: () => exec("copy") }, { type: "action", icon: "📋", label: "Paste", shortcut: "Ctrl+V", action: () => exec("paste") }, { type: "sep" }, { type: "action", icon: "⊞", label: "Select all", shortcut: "Ctrl+A", action: () => exec("selectAll") }] },
    { label: "View", items: [{ type: "action", icon: "⛶", label: "Fullscreen", action: toggleFS }, { type: "action", icon: "⊠", label: "Exit Fullscreen", action: toggleFS, disabled: !isFS }, { type: "action", icon: "</>", label: "HTML Editor", action: () => { setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowHTML(true); } }] },
    { label: "Insert", items: [{ type: "sub", icon: "🔗", label: "Link", children: [{ type: "action", label: "Insert/Edit Link", action: () => { const url = prompt("URL:"); if (!url) return; const txt = prompt("Link text:") || url; insertHTML(`<a href="${url}">${txt}</a>`); } }, { type: "action", label: "Remove Link", action: () => exec("unlink") }] }, { type: "sub", icon: "🖼", label: "Image", children: [{ type: "action", label: "Insert from URL", action: () => { const url = prompt("Image URL:"); if (!url) return; insertHTML(`<img src="${url}" alt="" style="max-width:100%;border-radius:4px;" />`); } }, { type: "action", label: "Upload image", action: () => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = () => { const f = inp.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => insertHTML(`<img src="${ev.target?.result}" style="max-width:100%;" />`); r.readAsDataURL(f); }; inp.click(); } }] }, { type: "sep" }, { type: "action", icon: "∑", label: "Equation", action: () => { const eq = prompt("Equation (LaTeX or plain):"); if (!eq) return; insertHTML(`<code style="font-family:monospace;background:#f4f4f4;padding:2px 6px;border-radius:3px;">${eq}</code>`); } }, { type: "sub", icon: "⊞", label: "Table", picker: true, children: [], onPick: (r: number, c: number) => insertTable(r, c) }, { type: "action", icon: "—", label: "Horizontal line", action: () => insertHTML('<hr style="border:none;border-top:2px solid #dee2e6;margin:12px 0;"/><p><br></p>') }] },
    { label: "Format", items: [{ type: "action", icon: "B", label: "Bold", shortcut: "Ctrl+B", action: () => exec("bold") }, { type: "action", icon: "I", label: "Italic", shortcut: "Ctrl+I", action: () => exec("italic") }, { type: "action", icon: "U", label: "Underline", shortcut: "Ctrl+U", action: () => exec("underline") }, { type: "action", icon: "S", label: "Strikethrough", action: () => exec("strikeThrough") }, { type: "action", icon: "x²", label: "Superscript", action: () => exec("superscript") }, { type: "action", icon: "x₂", label: "Subscript", action: () => exec("subscript") }, { type: "sep" }, { type: "sub", icon: "¶", label: "Formats", children: [{ type: "action", label: "Heading 1", action: () => fmt("h1") }, { type: "action", label: "Heading 2", action: () => fmt("h2") }, { type: "action", label: "Heading 3", action: () => fmt("h3") }, { type: "action", label: "Heading 4", action: () => fmt("h4") }, { type: "action", label: "Paragraph", action: () => fmt("p") }, { type: "action", label: "Blockquote", action: () => insertHTML("<blockquote style='border-left:3px solid #6baef0;padding-left:12px;color:#555;margin:8px 0;'>[quote]</blockquote>") }, { type: "action", label: "Code Block", action: () => insertHTML("<pre style='background:#f4f4f4;padding:10px;border-radius:4px;font-family:monospace;font-size:13px;'>[code block]</pre>") }] }, { type: "sub", icon: "≡", label: "Align", children: [{ type: "action", label: "Left", action: () => exec("justifyLeft") }, { type: "action", label: "Center", action: () => exec("justifyCenter") }, { type: "action", label: "Right", action: () => exec("justifyRight") }, { type: "action", label: "Justify", action: () => exec("justifyFull") }] }, { type: "sep" }, { type: "action", icon: "A", label: "Text color", action: () => setShowColor("foreColor") }, { type: "action", icon: "A", label: "Background color", action: () => setShowColor("backColor") }, { type: "sep" }, { type: "action", icon: "✕", label: "Clear formatting", action: () => exec("removeFormat") }] },
    { label: "Tools", items: [{ type: "action", icon: "≡", label: "Word Count", action: () => { const t = editorRef.current?.innerText.trim() ?? ""; setWcData({ text: t, chars: editorRef.current?.innerText.length ?? 0, charsNoSpace: t.replace(/\s/g, "").length, paragraphs: editorRef.current?.querySelectorAll("p").length ?? 0 }); setShowWC(true); } }, { type: "action", icon: "🔍", label: "Find and Replace", shortcut: "Ctrl+F", action: () => { setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowFR(true); } }] },
    { label: "Table", items: [{ type: "sub", icon: "⊞", label: "Table", picker: true, children: [], onPick: (r: number, c: number) => insertTable(r, c) }, { type: "sep" }, { type: "action", icon: "✕", label: "Delete table", action: () => { const sel = window.getSelection(); if (!sel?.rangeCount) return; let n: Node | null = sel.getRangeAt(0).commonAncestorContainer; while (n && (n as Element).nodeName !== "TABLE") n = n.parentNode; if (n) (n as Element).remove(); } }] },
  ], [exec, fmt, insertHTML, insertTable, toggleFS, isFS]);

  const TBGroups = useMemo(() => [
    [{ html: <select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => fmt(e.target.value)} defaultValue="p">{[["Paragraph","p"],["Heading 1","h1"],["Heading 2","h2"],["Heading 3","h3"],["Heading 4","h4"],["Blockquote","blockquote"],["Code","pre"]].map(([l,v]) => <option key={v} value={v}>{l}</option>)}</select>, title: "Block format" }, { html: <select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => e.target.value && exec("fontName", e.target.value)}>{[["Font",""],["Default","inherit"],["Arial","Arial"],["Georgia","Georgia"],["Monospace","monospace"]].map(([l,v]) => <option key={l} value={v}>{l}</option>)}</select>, title: "Font" }, { html: <select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => exec("fontSize", e.target.value)} defaultValue="3">{[["8pt","1"],["10pt","2"],["12pt","3"],["14pt","4"],["18pt","5"],["24pt","6"],["36pt","7"]].map(([l,v]) => <option key={v} value={v}>{l}</option>)}</select>, title: "Font size" }],
    [{ label: "B", title: "Bold (Ctrl+B)", fn: () => exec("bold"), style: { fontWeight: 700 } }, { label: "I", title: "Italic (Ctrl+I)", fn: () => exec("italic"), style: { fontStyle: "italic" } }, { label: "U", title: "Underline", fn: () => exec("underline"), style: { textDecoration: "underline" } }, { label: "S̶", title: "Strikethrough", fn: () => exec("strikeThrough"), style: {} }, { label: "x²", title: "Superscript", fn: () => exec("superscript"), style: {} }, { label: "x₂", title: "Subscript", fn: () => exec("subscript"), style: {} }],
    [{ label: "A", title: "Text color", fn: () => setShowColor("foreColor"), style: { color: "#e74c3c", fontWeight: 700 } }, { label: "A", title: "Background color", fn: () => setShowColor("backColor"), style: { background: "linear-gradient(#fef9c3,#fef9c3) bottom/100% 4px no-repeat" } }],
    [{ label: "🔗", title: "Link", fn: () => { const url = prompt("URL:"); if (!url) return; const txt = prompt("Link text:") || url; insertHTML(`<a href="${url}">${txt}</a>`); }, style: {} }, { label: "🖼", title: "Image", fn: () => { const url = prompt("Image URL:"); if (!url) return; insertHTML(`<img src="${url}" style="max-width:100%;" />`); }, style: {} }],
    [{ label: "◀≡", title: "Align left", fn: () => exec("justifyLeft"), style: {} }, { label: "≡", title: "Align center", fn: () => exec("justifyCenter"), style: {} }, { label: "≡▶", title: "Align right", fn: () => exec("justifyRight"), style: {} }, { label: "≡≡", title: "Justify", fn: () => exec("justifyFull"), style: {} }],
    [{ label: "1.", title: "Ordered list", fn: () => exec("insertOrderedList"), style: {} }, { label: "•", title: "Bullet list", fn: () => exec("insertUnorderedList"), style: {} }, { label: "⇥", title: "Indent", fn: () => exec("indent"), style: {} }, { label: "⇤", title: "Outdent", fn: () => exec("outdent"), style: {} }],
    [{ label: "⊞", title: "Insert table", fn: () => insertTable(3, 3), style: {} }, { label: "</>", title: "HTML editor", fn: () => { setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowHTML(true); }, style: {} }, { label: "✕", title: "Clear formatting", fn: () => exec("removeFormat"), style: {} }],
  ], [exec, fmt, insertHTML, insertTable]);

  return (
    <>
      {showWC && <WordCountModal text={wcData.text} chars={wcData.chars} charsNoSpace={wcData.charsNoSpace} paragraphs={wcData.paragraphs} onClose={() => setShowWC(false)} />}
      {showFR && <FindReplaceModal html={editorHtml} onUpdate={h => { if (editorRef.current) editorRef.current.innerHTML = h; }} onClose={() => setShowFR(false)} />}
      {showHTML && <HTMLEditorModal html={editorHtml} onUpdate={h => { if (editorRef.current) editorRef.current.innerHTML = h; }} onClose={() => setShowHTML(false)} />}
      {showColor && <ColorPickerModal type={showColor} onClose={() => setShowColor(null)} />}
      <div ref={wrapRef} className="border border-gray-300 rounded overflow-hidden flex flex-col" style={{ minHeight: 300 }}>
        <div data-rte-menubar className="flex items-center gap-0.5 px-1 py-0.5 bg-[#f7f9fb] border-b border-gray-200 select-none flex-wrap">
          {menus.map(m => (
            <div key={m.label} className="relative">
              <button type="button" onMouseDown={e => { e.preventDefault(); setOpenMenu(openMenu === m.label ? null : m.label); }}
                className={`px-2 sm:px-2.5 py-0.5 text-xs rounded transition-colors ${openMenu === m.label ? "text-white" : "text-gray-700 hover:bg-gray-200"}`}
                style={openMenu === m.label ? { background: MAROON } : {}}>{m.label}</button>
              {openMenu === m.label && (
                <div className="absolute left-0 top-full mt-0.5 bg-white border border-gray-200 shadow-lg rounded-sm min-w-52 py-1 z-[150]">
                  <RteMenuItems items={m.items} onClose={closeMenus} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 bg-[#f7f9fb] border-b border-gray-200">
          {TBGroups.map((group, gi) => (
            <div key={gi} className="flex items-center gap-0.5">
              {gi > 0 && <div className="w-px h-5 bg-gray-300 mx-1" />}
              {group.map((btn, bi) => {
                if ("html" in btn) return <div key={bi} title={btn.title}>{btn.html}</div>;
                return <button key={bi} type="button" title={btn.title} style={btn.style as React.CSSProperties} onMouseDown={e => { e.preventDefault(); btn.fn?.(); }} className="h-6 min-w-6 px-1 border border-transparent rounded text-xs hover:bg-blue-50 hover:border-blue-200 text-gray-700 flex items-center justify-center">{btn.label}</button>;
              })}
            </div>
          ))}
        </div>
        <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={updateWC} onKeyUp={updateWC} onMouseUp={updateWC} data-placeholder={placeholder} className="flex-1 px-4 py-3 text-sm text-gray-800 outline-none overflow-y-auto" style={{ minHeight: 220, lineHeight: 1.7 }} />
        <div className="flex items-center gap-4 px-3 py-1 bg-[#f7f9fb] border-t border-gray-200 text-xs text-gray-400">
          <span>{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
          <span className="ml-auto cursor-pointer hover:text-gray-600" onClick={() => { setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowHTML(true); }} title="HTML Editor">&lt;/&gt;</span>
        </div>
      </div>
      <style>{`[data-placeholder]:empty::before{content:attr(data-placeholder);color:#9ca3af;pointer-events:none;}[contenteditable] table{border-collapse:collapse;width:100%;margin:8px 0;}[contenteditable] td,[contenteditable] th{border:1px solid #dee2e6;padding:6px 10px;min-width:40px;}[contenteditable] th{background:#f7f9fb;font-weight:600;}[contenteditable] blockquote{border-left:3px solid #6baef0;padding-left:12px;color:#555;margin:8px 0;}[contenteditable] pre{background:#f4f4f4;padding:10px;border-radius:4px;font-family:monospace;font-size:13px;}[contenteditable] a{color:#1764ad;text-decoration:underline;}[contenteditable] img{max-width:100%;border-radius:4px;}[contenteditable] h1{font-size:2em;font-weight:700;margin:.67em 0;}[contenteditable] h2{font-size:1.5em;font-weight:700;margin:.75em 0;}[contenteditable] h3{font-size:1.17em;font-weight:700;margin:.83em 0;}[contenteditable] h4{font-size:1em;font-weight:700;margin:1.12em 0;}[contenteditable] ol{list-style:decimal;padding-left:1.5em;}[contenteditable] ul{list-style:disc;padding-left:1.5em;}`}</style>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUBMISSION ENTRY CARD
───────────────────────────────────────────────────────────────────────────── */
function SubmissionEntryCard({ entry, index, canRemove, onRemove, onUpdate }: {
  entry: SubmissionEntryItem; index: number; canRemove: boolean;
  onRemove: () => void;
  onUpdate: (field: keyof SubmissionEntryItem, value: string | boolean | string[] | number | null) => void;
}) {
  const isFileUpload = entry.type === "File Upload";
  const isMediaRecording = entry.type === "Media Recording";
  const allowedTypes = normalizeFileTypes(entry.allowedFileTypes);
  const hasTypes = allowedTypes.length > 0;

  const toggleFileType = (value: string) => {
    const next = allowedTypes.includes(value) ? allowedTypes.filter(t => t !== value) : [...allowedTypes, value];
    onUpdate("allowedFileTypes", next);
  };

  const handleTypeChange = (nextType: string) => {
    onUpdate("type", nextType);
    if (nextType === "File Upload") { onUpdate("allowedFileTypes", []); }
    else if (nextType === "Media Recording") { onUpdate("allowedFileTypes", ["mp4", "webm", "mp3", "wav", "m4a"]); }
    else { onUpdate("allowedFileTypes", []); }
  };

  const fileTypeChoices = isMediaRecording
    ? ALLOWED_FILE_TYPES.filter(t => ["mp4", "webm", "mp3", "wav", "m4a"].includes(t.value))
    : ALLOWED_FILE_TYPES.filter(t => !["mp4", "webm", "mp3", "wav", "m4a"].includes(t.value));

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden bg-white relative">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100" style={{ background: "#fef9f9" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-white" style={{ background: MAROON }}>Entry {index}</span>
          <span className="text-[11px] font-semibold text-gray-600">{entry.type}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={entry.required ? { background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" } : { background: "#f3f4f6", color: "#6b7280" }}>
            {entry.required ? "Required" : "Optional"}
          </span>
          {(isFileUpload || isMediaRecording) && hasTypes && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ background: MAROON, color: "#fff" }}>
              {formatFileTypes(allowedTypes)}
            </span>
          )}
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <X size={13} />
          </button>
        )}
      </div>
      <div className="px-3 py-3 space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Submission Type</label>
          <div className="relative">
            <select value={entry.type} onChange={e => handleTypeChange(e.target.value)} className="w-full h-8 border border-gray-300 rounded-sm px-2 pr-7 text-xs bg-white outline-none appearance-none focus:border-[#7b1113]">
              {SUBMISSION_ENTRY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        {(isFileUpload || isMediaRecording) && (
          <>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Allowed {isMediaRecording ? "Media" : "File"} Types
                <span className="ml-1 normal-case font-normal text-gray-400">{isFileUpload ? "(leave empty to allow all)" : ""}</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {fileTypeChoices.map(ft => {
                  const checked = allowedTypes.includes(ft.value);
                  return (
                    <label key={ft.value} className={`flex items-center gap-2 px-2.5 py-1.5 rounded border cursor-pointer text-xs font-medium select-none ${checked ? "border-[#7b1113] bg-[#fef2f2] text-[#7b1113]" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-white"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleFileType(ft.value)} className="sr-only" />
                      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${checked ? "border-[#7b1113] bg-[#7b1113]" : "border-gray-300 bg-white"}`}>
                        {checked && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </span>.{ft.label}
                    </label>
                  );
                })}
              </div>
              {hasTypes ? (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-gray-500">Staff will see:</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ background: MAROON, color: "#fff" }}>{formatFileTypes(allowedTypes)}</span>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 mt-1.5 italic">{isFileUpload ? "No restriction — all file types accepted." : "Choose at least one media type."}</p>
              )}
            </div>
          </>
        )}
        <div className="pt-1 border-t border-gray-100">
          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer pt-1">
            <input type="checkbox" checked={entry.required} onChange={e => onUpdate("required", e.target.checked)} style={{ accentColor: MAROON }} />
            Required
          </label>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */
interface Props {
  courseId: string;
  initialGroup?: string;
  existingAssignment?: AssignmentWithRole | null;
  sections?: Section[];
  staff?: Staff[];
  onCancel: () => void;
  onCreated: () => void;
  onEditFull?: (a: AssignmentWithRole) => void;
}

export default function CourseAssignmentForm({
  courseId, initialGroup = "", existingAssignment,
  sections: propSections = [], staff: propStaff = [],
  onCancel, onCreated,
}: Props) {
  const isEdit = !!existingAssignment;
  type LocalTabKey = "details" | "submission" | "settings" | "assign";
  const TABS: { key: LocalTabKey; label: string }[] = [
    { key: "details", label: "Details" }, { key: "submission", label: "Submission" },
    { key: "settings", label: "Settings" }, { key: "assign", label: "Assign" },
  ];
  const TAB_ORDER: LocalTabKey[] = ["details", "submission", "settings", "assign"];

  const [activeTab, setActiveTab] = useState<LocalTabKey>("details");
  const [name, setName] = useState(existingAssignment?.title ?? "");
  const [description, setDescription] = useState(existingAssignment?.description ?? "");
  const [points, setPoints] = useState(String(existingAssignment?.points ?? "0"));
  const [group, setGroup] = useState(existingAssignment?.assignmentGroup ?? initialGroup ?? "Assignments");
  const [groups, setGroups] = useState<AssignmentGroupItem[]>([{ id: 1, name: "Assignments" }]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [displayGradeAs, setDisplayGradeAs] = useState("Points");
  const [doNotCount, setDoNotCount] = useState(false);
  const [submissionType, setSubmissionType] = useState(existingAssignment?.submissionType ?? "Online");
  const [published, setPublished] = useState(existingAssignment?.status === "PUBLISHED");
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isGroupAssignment, setIsGroupAssignment] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [submissionEntries, setSubmissionEntries] = useState<SubmissionEntryItem[]>(() => {
    const existing = existingAssignment?.submissionEntries;
    if (existing && Array.isArray(existing) && existing.length > 0) return existing;
    return [{ id: 1, label: "", required: false, type: "File Upload", allowedFileTypes: [], maxFiles: 1 }];
  });
  const [submissionAttempts, setSubmissionAttempts] = useState("Unlimited");
  const [allowedAttempts, setAllowedAttempts] = useState(1);

  const [sections, setSections] = useState<Section[]>(propSections);
  const [staff, setStaff] = useState<Staff[]>(propStaff);
  const [assignRows, setAssignRows] = useState<AssignRow[]>([{
    id: 1, assignees: ["Everyone"],
    dueDate: isoToDate(existingAssignment?.dueDate ?? null),
    dueTime: isoToTime(existingAssignment?.dueDate ?? null) || "11:59 PM",
    availableFrom: isoToDate(existingAssignment?.availableFrom ?? null),
    availableFromTime: isoToTime(existingAssignment?.availableFrom ?? null) || "12:00 AM",
    until: isoToDate(existingAssignment?.availableUntil ?? null),
    untilTime: isoToTime(existingAssignment?.availableUntil ?? null) || "11:59 PM",
  }]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState("");

  // Load groups, sections, staff from API
  useEffect(() => {
    fetch(`/api/courses/${courseId}/assignments`).then(r => r.json()).then(d => {
      const list = d.assignments ?? [];
      const names: string[] = [...new Set<string>(list.map((a: { assignmentGroup: string }) => a.assignmentGroup || "Assignments"))];
      if (!names.includes("Assignments")) names.unshift("Assignments");
      const resolvedGroup = existingAssignment?.assignmentGroup ?? initialGroup;
      if (resolvedGroup && !names.includes(resolvedGroup)) names.push(resolvedGroup);
      setGroups(names.map((n, i) => ({ id: i + 1, name: n })));
      if (resolvedGroup && names.includes(resolvedGroup)) setGroup(resolvedGroup);
      setGroupsLoaded(true);
    }).catch(() => { setGroupsLoaded(true); });
    fetch(`/api/courses/${courseId}/sections`).then(r => r.json()).then(d => {
      setSections(d.sections ?? []);
      const rawStaff = d.staff ?? d.users ?? d.members ?? [];
      if (rawStaff.length > 0) {
        setStaff(rawStaff.map((u: { id: string; name?: string; userName?: string; email?: string }) => ({
          id: u.id, name: u.name ?? u.userName ?? u.email ?? u.id,
        })));
      }
    }).catch(() => { });
  }, [courseId, initialGroup, existingAssignment?.assignmentGroup]);

  useEffect(() => {
    if (openDropdownId === null) return;
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-dropdown]")) setOpenDropdownId(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openDropdownId]);

  const addEntry = () => setSubmissionEntries(p => [...p, { id: Date.now(), label: "", required: false, type: "File Upload", allowedFileTypes: [], maxFiles: 1 }]);
  const removeEntry = (id: number) => setSubmissionEntries(p => p.filter(e => e.id !== id));
  const updateEntry = (id: number, field: keyof SubmissionEntryItem, value: string | boolean | string[] | number | null) =>
    setSubmissionEntries(p => p.map(e => e.id === id ? { ...e, [field]: value } : e));

  const addAssignRow = () => setAssignRows(p => [...p, { id: Date.now(), assignees: [], dueDate: "", dueTime: "11:59 PM", availableFrom: "", availableFromTime: "12:00 AM", until: "", untilTime: "11:59 PM" }]);
  const removeAssignRow = (id: number) => setAssignRows(p => p.filter(r => r.id !== id));
  const updateAssignRow = (id: number, field: keyof AssignRow, value: string | string[]) =>
    setAssignRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const handleDateChange = (id: number, dateField: "dueDate" | "availableFrom" | "until", timeField: "dueTime" | "availableFromTime" | "untilTime", value: string) => {
    setAssignRows(p => p.map(r => {
      if (r.id !== id) return r;
      const autoTime = dateField === "availableFrom" && value && !r[timeField] ? "12:00 AM" : r[timeField];
      return { ...r, [dateField]: value, [timeField]: value ? autoTime : "" };
    }));
  };

  const getDateErrors = (row: AssignRow) => {
    const errors: { until?: string; availableFrom?: string } = {};
    const toMs = (date: string, time: string) => { if (!date) return null; return new Date(`${date} ${time || "11:59 PM"}`).getTime(); };
    const due = toMs(row.dueDate, row.dueTime), until = toMs(row.until, row.untilTime), available = toMs(row.availableFrom, row.availableFromTime);
    if (due && until && until < due) errors.until = "Lock date cannot be before due date";
    if (due && available && available > due) errors.availableFrom = "Unlock date cannot be after due date";
    return errors;
  };

  const toggleAssignee = (rowId: number, personName: string) => setAssignRows(p => p.map(r => {
    if (r.id !== rowId) return r;
    if (personName === "Everyone") return { ...r, assignees: ["Everyone"] };
    const withoutEveryone = r.assignees.filter(a => a !== "Everyone");
    const has = withoutEveryone.includes(personName);
    const next = has ? withoutEveryone.filter(a => a !== personName) : [...withoutEveryone, personName];
    return { ...r, assignees: next.length ? next : ["Everyone"] };
  }));

  const saveGroup = () => {
    const n = newGroupName.trim(); if (!n) return;
    if (!groups.find(g => g.name === n)) setGroups(p => [...p, { id: Date.now(), name: n }]);
    setGroup(n); setGroupModalOpen(false); setNewGroupName("");
  };

  const handleSave = async (publish: boolean) => {
    setSaveError(null);
    if (!name.trim()) { setSaveError("Assignment Name is required."); return; }
    if (submissionType === "Online" && submissionEntries.length === 0) { setSaveError("Please add at least one submission entry."); return; }
    setSaving(true);
    try {
      const row = assignRows[0];
      const payload = {
        title: name.trim(), description, points: parseFloat(points) || 0, submissionType,
        assignmentGroup: group, displayGradeAs, status: publish ? "PUBLISHED" : "UNPUBLISHED",
        assignees: row?.assignees ?? [],
        dueDate: row?.dueDate || null, dueTime: row?.dueTime || null,
        availableFrom: row?.availableFrom || null, availableFromTime: row?.availableFromTime || null,
        availableUntil: row?.until || null, untilTime: row?.untilTime || null,
        submissionEntries: submissionEntries.map(e => ({
          id: e.id, label: e.label, required: e.required, type: e.type,
          allowedFileTypes: (e.type === "File Upload" || e.type === "Media Recording") ? normalizeFileTypes(e.allowedFileTypes) : [],
          maxFiles: (e.type === "File Upload" || e.type === "Media Recording") ? (e.maxFiles ?? 1) : null,
        })),
        submissionAttempts, allowedAttempts: submissionAttempts === "Limited" ? allowedAttempts : null,
        doNotCount, isGroupAssignment, notifyUsers,
      };
      let res: Response;
      if (isEdit && existingAssignment) {
        res = await fetch(`/api/courses/${courseId}/assignments/${existingAssignment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        res = await fetch(`/api/courses/${courseId}/assignments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      if (res.ok) { setPublished(publish); onCreated(); }
      else { const data = await res.json().catch(() => ({})); setSaveError((data as { error?: string })?.error ?? `Server error: ${res.status}`); }
    } catch { setSaveError("Network error. Please try again."); } finally { setSaving(false); }
  };

  const currentTabIdx = TAB_ORDER.indexOf(activeTab);
  const prevTab = currentTabIdx > 0 ? TAB_ORDER[currentTabIdx - 1] : null;
  const nextTab = currentTabIdx < TAB_ORDER.length - 1 ? TAB_ORDER[currentTabIdx + 1] : null;

  const inp = "h-8 border border-gray-300 rounded-sm px-3 text-xs w-full outline-none focus:border-[#7b1113]";
  const sel = "h-8 border border-gray-300 rounded-sm px-3 text-xs w-full bg-white outline-none focus:border-[#7b1113] appearance-none";

  return (
    <div className="w-full h-full bg-white flex flex-col" style={{ fontFamily: FONT }}>

      {/* Top status bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <span className="text-sm font-bold text-gray-700">{isEdit ? "Edit Assignment" : "New Assignment"}</span>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded-full border shrink-0" style={published ? { background: "#22c55e", borderColor: "#22c55e" } : { borderColor: "#9ca3af" }} />
          <span>{published ? "Published" : "Not Published"}</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-end border-b border-gray-200 px-2 sm:px-4 bg-white shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-2.5 sm:px-4 py-2 text-xs border border-b-0 -mb-px mr-0.5 rounded-t transition-colors shrink-0 whitespace-nowrap ${activeTab === t.key ? "bg-white border-gray-200 text-gray-900 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-5">

        {/* ── DETAILS ── */}
        {activeTab === "details" && (
          <div className="space-y-5 max-w-3xl">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Assignment Name <span className="text-red-500">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Assignment Name"
                className="w-full h-9 border rounded-sm px-3 text-sm outline-none transition-all"
                style={{ borderColor: MAROON }}
                onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 2px ${MAROON}30`; }}
                onBlur={e => { e.currentTarget.style.boxShadow = "none"; }} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Description</label>
              <RichTextEditor value={description} onChange={setDescription} placeholder="Assignment description..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] items-start gap-y-4 gap-x-4">
              <label className="text-xs text-gray-700 sm:text-right pt-2">Points</label>
              <input type="number" min={0} value={points} onChange={e => setPoints(e.target.value)} className={inp} style={{ maxWidth: 200 }} />

              <label className="text-xs text-gray-700 sm:text-right pt-2">Assignment Group</label>
              <div className="flex items-center gap-2 flex-wrap" style={{ maxWidth: 320 }}>
                <div className="relative flex-1">
                  <select value={group} onChange={e => { if (e.target.value === "__create__") { setNewGroupName(""); setGroupModalOpen(true); } else setGroup(e.target.value); }}
                    className={sel} disabled={!groupsLoaded}>
                    {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                    <option value="__create__">[ Create Group ]</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SUBMISSION ── */}
        {activeTab === "submission" && (
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] items-start gap-y-5 gap-x-4 max-w-3xl">
            <label className="text-xs text-gray-700 sm:text-right pt-2">Submission Type</label>
            <div className="relative" style={{ maxWidth: 320 }}>
              <select value={submissionType} onChange={e => setSubmissionType(e.target.value)} className={sel}>
                {SUBMISSION_TYPES.map(o => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {submissionType === "Online" && (
              <>
                <label className="text-xs text-gray-700 sm:text-right pt-2">Submission Entries <span className="text-red-500">*</span></label>
                <div className="space-y-3 w-full sm:max-w-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400">{submissionEntries.length} entr{submissionEntries.length !== 1 ? "ies" : "y"}</span>
                  </div>
                  {submissionEntries.map((entry, idx) => (
                    <SubmissionEntryCard key={entry.id} entry={entry} index={idx + 1} canRemove={submissionEntries.length > 1}
                      onRemove={() => removeEntry(entry.id)} onUpdate={(field, value) => updateEntry(entry.id, field, value)} />
                  ))}
                  <button type="button" onClick={addEntry} className="w-full h-9 border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-600 rounded-md hover:bg-gray-100 hover:border-gray-400 flex items-center justify-center gap-1.5 transition-colors">
                    <Plus size={13} /> Add Submission Entry
                  </button>
                  {submissionEntries.length > 0 && (
                    <div className="rounded-md p-3 border text-xs" style={{ background: "#fef2f2", borderColor: "#f0c0c0" }}>
                      <p className="font-bold mb-2" style={{ color: MAROON }}>Staff View Preview</p>
                      <div className="space-y-2">
                        {submissionEntries.map(e => {
                          const allowed = normalizeFileTypes(e.allowedFileTypes);
                          const showTypes = (e.type === "File Upload" || e.type === "Media Recording") && allowed.length > 0;
                          return (
                            <div key={e.id} className="flex items-center gap-2 flex-wrap bg-white rounded border border-gray-100 px-2.5 py-2">
                              <span className="text-xs font-semibold text-gray-700">{e.label || e.type}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={e.required ? { background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" } : { background: "#f3f4f6", color: "#6b7280" }}>
                                {e.required ? "Required" : "Optional"}
                              </span>
                              {showTypes && <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ background: MAROON, color: "#fff" }}>{formatFileTypes(allowed)}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <label className="text-xs text-gray-700 sm:text-right pt-2">Submission Attempts</label>
            <div className="border border-gray-200 rounded-sm p-3 w-full sm:max-w-xs space-y-2">
              <p className="text-xs font-medium text-gray-700">Allowed Attempts</p>
              <div className="relative">
                <select value={submissionAttempts} onChange={e => setSubmissionAttempts(e.target.value)} className={sel}>
                  <option>Unlimited</option><option>Limited</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {submissionAttempts === "Limited" && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Number of Attempts</p>
                  <input type="number" min={1} value={allowedAttempts} onChange={e => setAllowedAttempts(parseInt(e.target.value) || 1)} className="h-8 w-24 border border-gray-300 rounded-sm px-2 text-xs outline-none focus:border-[#7b1113]" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] items-start gap-y-5 gap-x-4 max-w-3xl">
            <label className="text-xs text-gray-700 sm:text-right pt-2">Display Grade as</label>
            <div className="relative" style={{ maxWidth: 320 }}>
              <select value={displayGradeAs} onChange={e => setDisplayGradeAs(e.target.value)} className={sel}>
                {GRADE_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <label className="text-xs text-gray-700 sm:text-right pt-2">Grading Options</label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={doNotCount} onChange={e => setDoNotCount(e.target.checked)} style={{ accentColor: MAROON }} />
              Do not count towards final grade
            </label>

            <label className="text-xs text-gray-700 sm:text-right pt-2">Group Assignment</label>
            <div className="border border-gray-200 rounded-sm p-3 w-full sm:max-w-xs space-y-2">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" checked={isGroupAssignment} onChange={e => setIsGroupAssignment(e.target.checked)} style={{ accentColor: MAROON }} />
                This is a Group Assignment
              </label>
            </div>
          </div>
        )}

        {/* ── ASSIGN ── */}
        {activeTab === "assign" && (
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] items-start gap-y-5 gap-x-4 max-w-3xl">
            <label className="text-xs text-gray-700 sm:text-right pt-2">Assign Access</label>
            <div className="space-y-3 w-full">
              {assignRows.map((row, idx) => {
                const errs = getDateErrors(row);
                return (
                  <div key={row.id} className="border border-gray-200 rounded-sm p-3 space-y-3 w-full sm:max-w-xl relative">
                    {idx > 0 && (
                      <button type="button" onClick={() => removeAssignRow(row.id)} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <X size={13} />
                      </button>
                    )}

                    {/* Assignee dropdown */}
                    <div className="relative" data-dropdown onMouseDown={e => e.stopPropagation()}>
                      <p className="text-xs font-medium text-gray-700 mb-1">Assign To</p>
                      <div
                        onMouseDown={e => { e.stopPropagation(); setOpenDropdownId(openDropdownId === row.id ? null : row.id); setDropdownSearch(""); }}
                        className="w-full min-h-[30px] border rounded-sm px-2 py-1 text-xs flex flex-wrap gap-1 items-center cursor-pointer bg-white select-none"
                        style={{ borderColor: MAROON }}>
                        {row.assignees.length > 0 ? row.assignees.map(a => (
                          <span key={a} className="px-2 py-0.5 rounded text-xs flex items-center gap-1 text-white font-medium" style={{ background: MAROON }}>
                            {a}
                            <button type="button" onMouseDown={e => { e.stopPropagation(); if (a === "Everyone") return; toggleAssignee(row.id, a); }} className="hover:opacity-70 font-bold ml-0.5">×</button>
                          </span>
                        )) : <span className="text-gray-400">Start typing to search...</span>}
                        <span className="ml-auto text-gray-400 text-[10px] pl-2 shrink-0">{openDropdownId === row.id ? "▲" : "▼"}</span>
                      </div>
                      {openDropdownId === row.id && (
                        <div data-dropdown className="absolute z-50 w-full bg-white border border-gray-200 shadow-lg rounded-sm mt-0.5 max-h-52 overflow-y-auto" onMouseDown={e => e.stopPropagation()}>
                          <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white">
                            <input autoFocus value={dropdownSearch} onChange={e => setDropdownSearch(e.target.value)} placeholder="Search..." className="w-full h-6 px-2 text-xs border border-gray-200 rounded outline-none focus:border-[#7b1113]" />
                          </div>
                          {["Everyone"].filter(o => o.toLowerCase().includes(dropdownSearch.toLowerCase())).map(opt => (
                            <button key={opt} type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, opt); }}
                              className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                              style={{ color: row.assignees.includes(opt) ? MAROON : "#374151", fontWeight: row.assignees.includes(opt) ? 600 : 400 }}>
                              {opt}{row.assignees.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
                            </button>
                          ))}
                          {sections.filter(s => s.name.toLowerCase().includes(dropdownSearch.toLowerCase())).length > 0 && (
                            <>
                              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 bg-gray-50">Sections</div>
                              {sections.filter(s => s.name.toLowerCase().includes(dropdownSearch.toLowerCase())).map(s => (
                                <button key={s.id} type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }}
                                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                                  style={{ color: row.assignees.includes(s.name) ? MAROON : "#374151", fontWeight: row.assignees.includes(s.name) ? 600 : 400 }}>
                                  {s.name}{row.assignees.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                                </button>
                              ))}
                            </>
                          )}
                          {staff.filter(s => s.name.toLowerCase().includes(dropdownSearch.toLowerCase())).length > 0 && (
                            <>
                              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 bg-gray-50">Staff</div>
                              {staff.filter(s => s.name.toLowerCase().includes(dropdownSearch.toLowerCase())).map(s => (
                                <button key={s.id} type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }}
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

                    <DateTimeRow label="Due Date"
                      dateValue={row.dueDate} timeValue={row.dueTime}
                      onDateChange={v => handleDateChange(row.id, "dueDate", "dueTime", v)}
                      onTimeChange={v => updateAssignRow(row.id, "dueTime", v)}
                      onClear={() => { updateAssignRow(row.id, "dueDate", ""); updateAssignRow(row.id, "dueTime", ""); }} />
                    <DateTimeRow label="Available from"
                      dateValue={row.availableFrom} timeValue={row.availableFromTime}
                      onDateChange={v => handleDateChange(row.id, "availableFrom", "availableFromTime", v)}
                      onTimeChange={v => updateAssignRow(row.id, "availableFromTime", v)}
                      onClear={() => { updateAssignRow(row.id, "availableFrom", ""); updateAssignRow(row.id, "availableFromTime", ""); }}
                      error={errs.availableFrom} />
                    <DateTimeRow label="Until"
                      dateValue={row.until} timeValue={row.untilTime}
                      onDateChange={v => handleDateChange(row.id, "until", "untilTime", v)}
                      onTimeChange={v => updateAssignRow(row.id, "untilTime", v)}
                      onClear={() => { updateAssignRow(row.id, "until", ""); updateAssignRow(row.id, "untilTime", ""); }}
                      error={errs.until} />
                  </div>
                );
              })}

              <button type="button" onClick={addAssignRow} className="w-full sm:max-w-xl h-8 border border-gray-300 bg-gray-50 text-xs text-gray-600 rounded-sm hover:bg-gray-100 flex items-center justify-center gap-1">
                + Assign To
              </button>
            </div>

            <div />
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer mt-1">
              <input type="checkbox" checked={notifyUsers} onChange={e => setNotifyUsers(e.target.checked)} style={{ accentColor: MAROON }} />
              Notify users that this content has changed
            </label>
          </div>
        )}
      </div>

      {/* Add Group Modal */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20 px-0 sm:px-4">
          <div className="w-full sm:max-w-sm bg-white shadow-xl border border-gray-200 rounded-t-2xl sm:rounded">
            <div className="sm:hidden flex justify-center pt-2.5 pb-1"><div className="w-9 h-1 rounded-full bg-gray-200" /></div>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">Add Assignment Group</div>
              <button onClick={() => setGroupModalOpen(false)} className="w-6 h-6 flex items-center justify-center border text-gray-700 rounded text-sm" style={{ borderColor: MAROON, color: MAROON }}>×</button>
            </div>
            <div className="px-5 py-5">
              <label className="text-xs text-gray-700 block mb-1.5">Group Name</label>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveGroup()} placeholder="e.g., Essay Group 1" className="w-full h-8 border border-gray-300 px-2 text-xs outline-none focus:border-[#7b1113] rounded-sm" />
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex justify-end gap-2">
              <button onClick={() => setGroupModalOpen(false)} className="h-8 px-4 border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50 rounded">Cancel</button>
              <button onClick={saveGroup} style={{ background: MAROON }} className="h-8 px-4 text-white text-xs rounded hover:opacity-90">Add Group</button>
            </div>
            <div className="sm:hidden h-[env(safe-area-inset-bottom)]" />
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-3 sm:px-6 py-3 safe-area-pb">
        {saveError && <p className="text-xs text-red-600 font-medium mb-2">⚠ {saveError}</p>}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={onCancel} disabled={saving} className="h-9 px-4 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap">
            Cancel
          </button>
          {prevTab && (
            <button type="button" onClick={() => setActiveTab(prevTab)} className="h-9 px-4 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50 whitespace-nowrap">
              ← Back
            </button>
          )}
          {nextTab && (
            <button type="button" onClick={() => setActiveTab(nextTab)} className="h-9 px-4 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100 whitespace-nowrap">
              Next →
            </button>
          )}
          {activeTab === "assign" && (
            <>
              <button onClick={() => handleSave(true)} disabled={saving} className="h-9 px-4 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 whitespace-nowrap">
                {saving ? "Saving..." : "Save & Publish"}
              </button>
              <button onClick={() => handleSave(false)} disabled={saving} style={{ background: MAROON }} className="h-9 px-4 text-white text-xs rounded hover:opacity-90 disabled:opacity-50 whitespace-nowrap">
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .safe-area-pb { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
        @media (max-width: 400px) {
          .xs\\:flex-row { flex-direction: row; }
          .xs\\:items-start { align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}