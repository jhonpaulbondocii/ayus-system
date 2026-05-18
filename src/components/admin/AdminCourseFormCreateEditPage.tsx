"use client";

// AdminCourseFormCreateEditPage.tsx
// Route examples:
//   Create: /admin/courses/[id]/forms/new
//   Edit:   /admin/courses/[id]/forms/[formId]/edit

import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────
type FormType = "Survey / Feedback" | "Evaluation" | "Registration Form" | "Graded Assessment";
type QuestionType =
  | "multiple_choice" | "checkboxes" | "dropdown"
  | "short_answer" | "paragraph"
  | "linear_scale" | "mc_grid" | "checkbox_grid"
  | "date" | "time" | "file_upload" | "section";

interface FormQuestion {
  id: string;
  type: QuestionType;
  question: string;
  description?: string;
  points: number;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  rows?: string[];
  columns?: string[];
  sectionTitle?: string;
  sectionDescription?: string;
}

interface FormData {
  id?: string | number;
  title: string;
  description: string;
  formType: FormType;
  assignmentGroup: string;
  points: number;
  shuffleAnswers: boolean;
  allowMultipleResponses: boolean;
  anonymousResponses: boolean;
  showResultsToRespondents: boolean;
  showOneAtATime: boolean;
  lockQuestionsAfterAnswering: boolean;
  accessCode: string;
  confirmationMessage: string;
  assignTo: string[];
  dueDate: string;
  dueTime: string;
  availableFrom: string;
  availableFromTime: string;
  availableUntil: string;
  availableUntilTime: string;
  published: boolean;
  questions: FormQuestion[];
}

interface Staff { id: string; name: string; }
interface AssignmentGroup { id: number; name: string; }

const FORM_TYPE_DISPLAY: Record<string, FormType> = {
  SURVEY_FEEDBACK: "Survey / Feedback",
  EVALUATION: "Evaluation",
  REGISTRATION_FORM: "Registration Form",
  GRADED_ASSESSMENT: "Graded Assessment",
  "Survey / Feedback": "Survey / Feedback",
  Evaluation: "Evaluation",
  "Registration Form": "Registration Form",
  "Graded Assessment": "Graded Assessment",
};

// ── Time options ──────────────────────────────────────────────────────────────
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

// ── Question categories ───────────────────────────────────────────────────────
const QUESTION_CATEGORIES = [
  { label: "Choice", types: [
    { value: "multiple_choice" as QuestionType, label: "Multiple Choice", icon: "◉" },
    { value: "checkboxes" as QuestionType, label: "Checkboxes", icon: "☑" },
    { value: "dropdown" as QuestionType, label: "Dropdown", icon: "⌄" },
  ]},
  { label: "Text", types: [
    { value: "short_answer" as QuestionType, label: "Short Answer", icon: "─" },
    { value: "paragraph" as QuestionType, label: "Paragraph", icon: "≡" },
  ]},
  { label: "Scale & Grid", types: [
    { value: "linear_scale" as QuestionType, label: "Linear Scale", icon: "◁▷" },
    { value: "mc_grid" as QuestionType, label: "Multiple Choice Grid", icon: "⊞" },
    { value: "checkbox_grid" as QuestionType, label: "Checkbox Grid", icon: "⊟" },
  ]},
  { label: "Date & Time", types: [
    { value: "date" as QuestionType, label: "Date", icon: "📅" },
    { value: "time" as QuestionType, label: "Time", icon: "🕐" },
  ]},
  { label: "Upload", types: [
    { value: "file_upload" as QuestionType, label: "File Upload", icon: "⬆" },
  ]},
];
const ALL_Q_TYPES = QUESTION_CATEGORIES.flatMap(c => c.types);

function getTypeLabel(type: QuestionType) {
  return ALL_Q_TYPES.find(t => t.value === type)?.label ?? type;
}

// ── useOnClickOutside ─────────────────────────────────────────────────────────
function useOnClickOutside<T extends HTMLElement>(ref: React.RefObject<T | null>, handler: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current || ref.current.contains(e.target as Node)) return; handler(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, handler]);
}

// ── useIsMobile ───────────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

// ══════════════════════════════════════════════════════════════════════════════
// RICH TEXT EDITOR
// ══════════════════════════════════════════════════════════════════════════════

function WordCountModal({ text, chars, charsNoSpace, paragraphs, onClose }: {
  text: string; chars: number; charsNoSpace: number; paragraphs: number; onClose: () => void;
}) {
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-full max-w-[288px] border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">Word Count</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4 space-y-2 text-xs text-gray-700">
          {([["Words", words], ["Characters (with spaces)", chars], ["Characters (no spaces)", charsNoSpace], ["Paragraphs", paragraphs]] as [string, number][]).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-gray-100 pb-1 last:border-0">
              <span>{k}</span><span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} style={{ background: MAROON }} className="h-7 px-4 text-white text-xs rounded hover:opacity-90">Close</button>
        </div>
      </div>
    </div>
  );
}

function FindReplaceModal({ html, onUpdate, onClose }: {
  html: string; onUpdate: (html: string) => void; onClose: () => void;
}) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [msg, setMsg] = useState("");
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
    <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-full max-w-sm border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">Find and Replace</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Find</label>
            <input autoFocus value={find} onChange={e => setFind(e.target.value)} className="w-full h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" placeholder="Search text..." />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Replace with</label>
            <input value={replace} onChange={e => setReplace(e.target.value)} className="w-full h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" placeholder="Replacement..." />
          </div>
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
    <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-full max-w-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">HTML Editor</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4">
          <textarea value={html} onChange={e => setHtml(e.target.value)} className="w-full h-48 sm:h-64 border border-gray-300 rounded px-3 py-2 text-xs font-mono outline-none focus:border-[#7b1113] resize-none" />
        </div>
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
    <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded shadow-xl border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">{type === "foreColor" ? "Text Color" : "Background Color"}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="p-4 grid grid-cols-5 gap-2">
          {colors.map(c => (
            <div key={c} title={c}
              style={{ background: c === "transparent" ? "linear-gradient(45deg,#ccc 25%,#fff 25%,#fff 75%,#ccc 75%)" : c }}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer hover:scale-110 transition-transform"
              onClick={() => { document.execCommand(type, false, c === "transparent" ? "" : c); onClose(); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TablePicker({ onPick }: { onPick: (r: number, c: number) => void }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const MAX = 8;
  return (
    <div className="p-2 min-w-40">
      <p className="text-[10px] text-gray-500 text-center mb-1.5 h-3">{hover.r > 0 ? `${hover.r} × ${hover.c} table` : "Select table size"}</p>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${MAX},18px)`, gap: 2 }}>
        {Array.from({ length: MAX * MAX }, (_, i) => {
          const r = Math.floor(i / MAX) + 1, c = (i % MAX) + 1;
          return (
            <div key={i} onMouseEnter={() => setHover({ r, c })} onClick={() => onPick(r, c)}
              className={`w-4 h-4 border rounded-sm cursor-pointer transition-colors ${r <= hover.r && c <= hover.c ? "bg-blue-200 border-blue-400" : "bg-gray-50 border-gray-300"}`}
            />
          );
        })}
      </div>
    </div>
  );
}

const Chevron = () => <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>;

type MAction = { type: "action"; icon?: string; label: string; shortcut?: string; action: () => void; disabled?: boolean };
type MSep = { type: "sep" };
type MSub = { type: "sub"; icon?: string; label: string; children: (MAction | MSep | MSub)[]; picker?: boolean; onPick?: (r: number, c: number) => void };
type MItem = MAction | MSep | MSub;

function MenuItems({ items, onClose }: { items: MItem[]; onClose: () => void }) {
  return (
    <>
      {items.map((item, i) => {
        if (item.type === "sep") return <div key={i} className="my-1 border-t border-gray-100" />;
        if (item.type === "sub") return <SubMenuItem key={i} item={item} onClose={onClose} />;
        return (
          <button key={i} type="button" disabled={item.disabled}
            onMouseDown={e => { e.preventDefault(); if (!item.disabled) { item.action(); onClose(); } }}
            className={`w-full text-left px-3 py-1 text-xs flex items-center gap-2 ${item.disabled ? "text-gray-300" : "text-gray-700 hover:bg-blue-600 hover:text-white"}`}>
            <span className="w-4 text-center text-sm shrink-0">{item.icon ?? ""}</span>
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="font-mono text-[10px] opacity-60 shrink-0">{item.shortcut}</span>}
          </button>
        );
      })}
    </>
  );
}

function SubMenuItem({ item, onClose }: { item: MSub; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="w-full text-left px-3 py-1 text-xs flex items-center gap-2 text-gray-700 hover:bg-blue-600 hover:text-white">
        <span className="w-4 text-center text-sm shrink-0">{item.icon ?? ""}</span>
        <span className="flex-1">{item.label}</span><Chevron />
      </button>
      {open && (
        <div className="absolute left-full top-0 bg-white border border-gray-200 shadow-lg rounded-sm min-w-44 py-1 z-200">
          {item.picker ? <TablePicker onPick={(r, c) => { item.onPick?.(r, c); onClose(); }} /> : <MenuItems items={item.children} onClose={onClose} />}
        </div>
      )}
    </div>
  );
}

// Mobile-optimized simplified toolbar (replaces full menubar on small screens)
function MobileRichToolbar({ exec, fmt, insertHTML, setShowColor, onHtmlEditorClick }: {
  exec: (cmd: string, val?: string) => void;
  fmt: (tag: string) => void;
  insertHTML: (html: string) => void;
  setShowColor: (t: "foreColor" | "backColor") => void;
  onHtmlEditorClick: () => void;
}) {
  const tools = [
    { label: "B", title: "Bold", fn: () => exec("bold"), style: { fontWeight: 700 } },
    { label: "I", title: "Italic", fn: () => exec("italic"), style: { fontStyle: "italic" } },
    { label: "U", title: "Underline", fn: () => exec("underline"), style: { textDecoration: "underline" } },
    { label: "S̶", title: "Strikethrough", fn: () => exec("strikeThrough"), style: {} },
    { label: "•", title: "Bullet list", fn: () => exec("insertUnorderedList"), style: {} },
    { label: "1.", title: "Ordered list", fn: () => exec("insertOrderedList"), style: {} },
    { label: "◀≡", title: "Align left", fn: () => exec("justifyLeft"), style: {} },
    { label: "≡", title: "Center", fn: () => exec("justifyCenter"), style: {} },
    { label: "A", title: "Text color", fn: () => setShowColor("foreColor"), style: { color: "#e74c3c", fontWeight: 700 } },
    { label: "🔗", title: "Link", fn: () => { const url = prompt("URL:"); if (!url) return; const txt = prompt("Link text:") || url; insertHTML(`<a href="${url}">${txt}</a>`); }, style: {} },
    { label: "</>", title: "HTML editor", fn: () => onHtmlEditorClick(), style: {} },
    { label: "✕", title: "Clear formatting", fn: () => exec("removeFormat"), style: {} },
  ];
  return (
    <div className="flex items-center gap-0.5 px-2 py-1 bg-[#f7f9fb] border-b border-gray-200 overflow-x-auto">
      <style>{`.mobile-toolbar-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div className="flex items-center gap-0.5 min-w-max mobile-toolbar-scroll">
        <select className="h-7 border border-gray-300 rounded text-[11px] bg-white px-1 outline-none shrink-0 mr-1"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => fmt(e.target.value)} defaultValue="p">
          {[["Para","p"],["H1","h1"],["H2","h2"],["H3","h3"]].map(([l,v]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {tools.map((btn, i) => (
          <button key={i} type="button" title={btn.title}
            style={btn.style as React.CSSProperties}
            onMouseDown={e => { e.preventDefault(); btn.fn?.(); }}
            className="h-7 min-w-7 px-1 border border-transparent rounded text-xs hover:bg-blue-50 hover:border-blue-200 text-gray-700 flex items-center justify-center shrink-0">
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RichTextEditor({ onChange, placeholder = "Start typing...", initialHtml = "" }: {
  onChange?: (html: string) => void; placeholder?: string; initialHtml?: string;
}) {
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
  const initialized = useRef(false);
  const isMobile = useIsMobile(640);

  useEffect(() => {
    if (!initialized.current && editorRef.current && initialHtml) {
      editorRef.current.innerHTML = initialHtml;
      initialized.current = true;
    }
  }, [initialHtml]);

  const exec = useCallback((cmd: string, val?: string) => {
    const ed = editorRef.current; if (!ed) return;
    ed.focus();
    try { document.execCommand(cmd, false, val); } catch (e) { console.warn(cmd, e); }
  }, []);

  const fmt = useCallback((tag: string) => {
    const ed = editorRef.current; if (!ed) return; ed.focus();
    document.execCommand("formatBlock", false, `<${tag}>`);
  }, []);

  const insertHTML = useCallback((html: string) => {
    const ed = editorRef.current; if (!ed) return; ed.focus();
    const ok = document.execCommand("insertHTML", false, html);
    if (!ok) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0); range.deleteContents();
        const frag = range.createContextualFragment(html);
        range.insertNode(frag); range.collapse(false);
        sel.removeAllRanges(); sel.addRange(range);
      }
    }
    updateWC();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insertTable = useCallback((rows: number, cols: number) => {
    const hdr = `<tr>${Array(cols).fill(`<th style="border:1px solid #dee2e6;padding:6px 10px;background:#f7f9fb;font-weight:600;">&nbsp;</th>`).join("")}</tr>`;
    const bdy = Array(rows - 1).fill(`<tr>${Array(cols).fill(`<td style="border:1px solid #dee2e6;padding:6px 10px;">&nbsp;</td>`).join("")}</tr>`).join("");
    insertHTML(`<table style="border-collapse:collapse;width:100%;margin:8px 0;"><thead>${hdr}</thead><tbody>${bdy}</tbody></table><p><br></p>`);
  }, [insertHTML]);

  const updateWC = useCallback(() => {
    const text = editorRef.current?.innerText.trim() ?? "";
    setWordCount(text ? text.split(/\s+/).filter(Boolean).length : 0);
    onChange?.(editorRef.current?.innerHTML ?? "");
  }, [onChange]);

  const closeMenus = useCallback(() => setOpenMenu(null), []);

  const toggleFS = useCallback(() => {
    if (!isFS) { wrapRef.current?.requestFullscreen?.(); setIsFS(true); }
    else { document.exitFullscreen?.(); setIsFS(false); }
  }, [isFS]);

  useEffect(() => {
    const h = () => { if (!document.fullscreenElement) setIsFS(false); };
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-menubar]")) closeMenus(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openMenu, closeMenus]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setEditorHtml(editorRef.current?.innerHTML ?? "");
        setShowFR(true);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const menus = useMemo((): { label: string; items: MItem[] }[] => [
    {
      label: "Edit", items: [
        { type: "action", icon: "↩", label: "Undo", shortcut: "Ctrl+Z", action: () => exec("undo") },
        { type: "action", icon: "↪", label: "Redo", shortcut: "Ctrl+Y", action: () => exec("redo") },
        { type: "sep" },
        { type: "action", icon: "✂", label: "Cut", shortcut: "Ctrl+X", action: () => exec("cut") },
        { type: "action", icon: "⧉", label: "Copy", shortcut: "Ctrl+C", action: () => exec("copy") },
        { type: "action", icon: "📋", label: "Paste", shortcut: "Ctrl+V", action: () => exec("paste") },
        { type: "sep" },
        { type: "action", icon: "⊞", label: "Select all", shortcut: "Ctrl+A", action: () => exec("selectAll") },
      ]
    },
    {
      label: "View", items: [
        { type: "action", icon: "⛶", label: "Fullscreen", action: toggleFS },
        { type: "action", icon: "⊠", label: "Exit Fullscreen", action: toggleFS, disabled: !isFS },
        { type: "action", icon: "</>", label: "HTML Editor", action: () => { setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowHTML(true); } },
      ]
    },
    {
      label: "Insert", items: [
        {
          type: "sub", icon: "🔗", label: "Link", children: [
            { type: "action", label: "Insert/Edit Link", action: () => { const url = prompt("URL:"); if (!url) return; const txt = prompt("Link text:") || url; insertHTML(`<a href="${url}">${txt}</a>`); } },
            { type: "action", label: "Remove Link", action: () => exec("unlink") },
          ]
        },
        {
          type: "sub", icon: "🖼", label: "Image", children: [
            { type: "action", label: "Insert from URL", action: () => { const url = prompt("Image URL:"); if (!url) return; const alt = prompt("Alt text:") || ""; insertHTML(`<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:4px;" />`); } },
            { type: "action", label: "Upload image", action: () => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = () => { const f = inp.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => insertHTML(`<img src="${ev.target?.result}" style="max-width:100%;" />`); r.readAsDataURL(f); }; inp.click(); } },
          ]
        },
        { type: "sep" },
        { type: "action", icon: "∑", label: "Equation", action: () => { const eq = prompt("Equation (LaTeX or plain):"); if (!eq) return; insertHTML(`<code style="font-family:monospace;background:#f4f4f4;padding:2px 6px;border-radius:3px;">${eq}</code>`); } },
        { type: "sub", icon: "⊞", label: "Table", picker: true, children: [], onPick: (r: number, c: number) => insertTable(r, c) },
        { type: "action", icon: "—", label: "Horizontal line", action: () => insertHTML('<hr style="border:none;border-top:2px solid #dee2e6;margin:12px 0;"/><p><br></p>') },
      ]
    },
    {
      label: "Format", items: [
        { type: "action", icon: "B", label: "Bold", shortcut: "Ctrl+B", action: () => exec("bold") },
        { type: "action", icon: "I", label: "Italic", shortcut: "Ctrl+I", action: () => exec("italic") },
        { type: "action", icon: "U", label: "Underline", shortcut: "Ctrl+U", action: () => exec("underline") },
        { type: "action", icon: "S", label: "Strikethrough", action: () => exec("strikeThrough") },
        { type: "sep" },
        { type: "sub", icon: "¶", label: "Formats", children: [
          { type: "action", label: "Heading 1", action: () => fmt("h1") },
          { type: "action", label: "Heading 2", action: () => fmt("h2") },
          { type: "action", label: "Heading 3", action: () => fmt("h3") },
          { type: "action", label: "Paragraph", action: () => fmt("p") },
          { type: "action", label: "Blockquote", action: () => insertHTML("<blockquote style='border-left:3px solid #6baef0;padding-left:12px;color:#555;margin:8px 0;'>[quote]</blockquote>") },
          { type: "action", label: "Code Block", action: () => insertHTML("<pre style='background:#f4f4f4;padding:10px;border-radius:4px;font-family:monospace;font-size:13px;'>[code block]</pre>") },
        ]},
        { type: "sub", icon: "▤", label: "Blocks", children: [
          { type: "action", label: "Ordered List", action: () => exec("insertOrderedList") },
          { type: "action", label: "Bullet List", action: () => exec("insertUnorderedList") },
        ]},
        { type: "sep" },
        { type: "action", icon: "A", label: "Text color", action: () => setShowColor("foreColor") },
        { type: "action", icon: "A", label: "Background color", action: () => setShowColor("backColor") },
        { type: "sep" },
        { type: "action", icon: "✕", label: "Clear formatting", action: () => exec("removeFormat") },
      ]
    },
    {
      label: "Tools", items: [
        { type: "action", icon: "≡", label: "Word Count", action: () => { const t = editorRef.current?.innerText.trim() ?? ""; setWcData({ text: t, chars: editorRef.current?.innerText.length ?? 0, charsNoSpace: t.replace(/\s/g, "").length, paragraphs: editorRef.current?.querySelectorAll("p").length ?? 0 }); setShowWC(true); } },
        { type: "action", icon: "🔍", label: "Find and Replace", shortcut: "Ctrl+F", action: () => { setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowFR(true); } },
      ]
    },
  ], [exec, fmt, insertHTML, insertTable, toggleFS, isFS]);

  const TBGroups = useMemo(() => [
    [
      { html: <select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => fmt(e.target.value)} defaultValue="p">{[["Paragraph","p"],["Heading 1","h1"],["Heading 2","h2"],["Heading 3","h3"],["Heading 4","h4"],["Blockquote","blockquote"],["Code","pre"]].map(([l,v]) => <option key={v} value={v}>{l}</option>)}</select>, title: "Block format" },
      { html: <select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => e.target.value && exec("fontName", e.target.value)}>{[["Font",""],["Default","inherit"],["Arial","Arial"],["Georgia","Georgia"],["Monospace","monospace"]].map(([l,v]) => <option key={l} value={v}>{l}</option>)}</select>, title: "Font" },
      { html: <select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => exec("fontSize", e.target.value)} defaultValue="3">{[["8pt","1"],["10pt","2"],["12pt","3"],["14pt","4"],["18pt","5"],["24pt","6"],["36pt","7"]].map(([l,v]) => <option key={v} value={v}>{l}</option>)}</select>, title: "Font size" },
    ],
    [
      { label: "B", title: "Bold", fn: () => exec("bold"), style: { fontWeight: 700 } },
      { label: "I", title: "Italic", fn: () => exec("italic"), style: { fontStyle: "italic" } },
      { label: "U", title: "Underline", fn: () => exec("underline"), style: { textDecoration: "underline" } },
      { label: "S̶", title: "Strikethrough", fn: () => exec("strikeThrough"), style: {} },
    ],
    [
      { label: "A", title: "Text color", fn: () => setShowColor("foreColor"), style: { color: "#e74c3c", fontWeight: 700 } },
      { label: "A", title: "Background color", fn: () => setShowColor("backColor"), style: { background: "linear-gradient(#fef9c3,#fef9c3) bottom/100% 4px no-repeat" } },
      { label: "x²", title: "Superscript", fn: () => exec("superscript"), style: {} },
      { label: "x₂", title: "Subscript", fn: () => exec("subscript"), style: {} },
    ],
    [
      { label: "🔗", title: "Link", fn: () => { const url = prompt("URL:"); if (!url) return; const txt = prompt("Link text:") || url; insertHTML(`<a href="${url}">${txt}</a>`); }, style: {} },
      { label: "🖼", title: "Image", fn: () => { const url = prompt("Image URL:"); if (!url) return; insertHTML(`<img src="${url}" style="max-width:100%;" />`); }, style: {} },
    ],
    [
      { label: "◀≡", title: "Align left", fn: () => exec("justifyLeft"), style: {} },
      { label: "≡", title: "Align center", fn: () => exec("justifyCenter"), style: {} },
      { label: "≡▶", title: "Align right", fn: () => exec("justifyRight"), style: {} },
    ],
    [
      { label: "1.", title: "Ordered list", fn: () => exec("insertOrderedList"), style: {} },
      { label: "•", title: "Bullet list", fn: () => exec("insertUnorderedList"), style: {} },
      { label: "⇥", title: "Indent", fn: () => exec("indent"), style: {} },
      { label: "⇤", title: "Outdent", fn: () => exec("outdent"), style: {} },
    ],
    [
      { label: "⊞", title: "Insert table", fn: () => insertTable(3, 3), style: {} },
      { label: "</>", title: "HTML editor", fn: () => { setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowHTML(true); }, style: {} },
      { label: "✕", title: "Clear formatting", fn: () => exec("removeFormat"), style: {} },
    ],
  ], [exec, fmt, insertHTML, insertTable]);

  return (
    <>
      {showWC && <WordCountModal text={wcData.text} chars={wcData.chars} charsNoSpace={wcData.charsNoSpace} paragraphs={wcData.paragraphs} onClose={() => setShowWC(false)} />}
      {showFR && <FindReplaceModal html={editorHtml} onUpdate={h => { if (editorRef.current) editorRef.current.innerHTML = h; }} onClose={() => setShowFR(false)} />}
      {showHTML && <HTMLEditorModal html={editorHtml} onUpdate={h => { if (editorRef.current) editorRef.current.innerHTML = h; }} onClose={() => setShowHTML(false)} />}
      {showColor && <ColorPickerModal type={showColor} onClose={() => setShowColor(null)} />}

      <div ref={wrapRef} className="border border-gray-300 rounded overflow-hidden flex flex-col" style={{ minHeight: 220 }}>
        {isMobile ? (
          /* Mobile: streamlined single-row scrollable toolbar */
          <MobileRichToolbar
            exec={exec}
            fmt={fmt}
            insertHTML={insertHTML}
            setShowColor={setShowColor}
            onHtmlEditorClick={() => {
              setEditorHtml(editorRef.current?.innerHTML ?? "");
              setShowHTML(true);
            }}
          />
        ) : (
          <>
            {/* Desktop: Menubar */}
            <div data-menubar className="flex items-center gap-0.5 px-1 py-0.5 bg-[#f7f9fb] border-b border-gray-200 select-none flex-wrap">
              {menus.map(m => (
                <div key={m.label} className="relative">
                  <button type="button"
                    onMouseDown={e => { e.preventDefault(); setOpenMenu(openMenu === m.label ? null : m.label); }}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${openMenu === m.label ? "text-white" : "text-gray-700 hover:bg-gray-200"}`}
                    style={openMenu === m.label ? { background: MAROON } : {}}>
                    {m.label}
                  </button>
                  {openMenu === m.label && (
                    <div className="absolute left-0 top-full mt-0.5 bg-white border border-gray-200 shadow-lg rounded-sm min-w-52 py-1 z-150">
                      <MenuItems items={m.items} onClose={closeMenus} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Desktop: Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 bg-[#f7f9fb] border-b border-gray-200">
              {TBGroups.map((group, gi) => (
                <div key={gi} className="flex items-center gap-0.5">
                  {gi > 0 && <div className="w-px h-5 bg-gray-300 mx-1" />}
                  {group.map((btn, bi) => {
                    if ("html" in btn) return <div key={bi} title={btn.title}>{btn.html}</div>;
                    return (
                      <button key={bi} type="button" title={btn.title}
                        style={btn.style as React.CSSProperties}
                        onMouseDown={e => { e.preventDefault(); btn.fn?.(); }}
                        className="h-6 min-w-6 px-1 border border-transparent rounded text-xs hover:bg-blue-50 hover:border-blue-200 text-gray-700 flex items-center justify-center">
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Editor area */}
        <div ref={editorRef} contentEditable suppressContentEditableWarning
          onInput={updateWC} onKeyUp={updateWC} onMouseUp={updateWC}
          data-placeholder={placeholder}
          className="flex-1 px-3 sm:px-4 py-3 text-sm text-gray-800 outline-none overflow-y-auto"
          style={{ minHeight: 160, lineHeight: 1.7 }}
        />

        {/* Status bar */}
        <div className="flex items-center gap-4 px-3 py-1 bg-[#f7f9fb] border-t border-gray-200 text-xs text-gray-400">
          <span>{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
          <span className="ml-auto cursor-pointer hover:text-gray-600" onClick={() => { setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowHTML(true); }} title="HTML Editor">&lt;/&gt;</span>
        </div>
      </div>

      <style>{`
        [data-placeholder]:empty::before{content:attr(data-placeholder);color:#9ca3af;pointer-events:none;}
        [contenteditable] table{border-collapse:collapse;width:100%;margin:8px 0;}
        [contenteditable] td,[contenteditable] th{border:1px solid #dee2e6;padding:6px 10px;min-width:40px;}
        [contenteditable] th{background:#f7f9fb;font-weight:600;}
        [contenteditable] blockquote{border-left:3px solid #6baef0;padding-left:12px;color:#555;margin:8px 0;}
        [contenteditable] pre{background:#f4f4f4;padding:10px;border-radius:4px;font-family:monospace;font-size:13px;}
        [contenteditable] a{color:#1764ad;text-decoration:underline;}
        [contenteditable] img{max-width:100%;border-radius:4px;}
        [contenteditable] hr{border:none;border-top:2px solid #dee2e6;margin:12px 0;}
        [contenteditable] h1{font-size:2em;font-weight:700;margin:.67em 0;}
        [contenteditable] h2{font-size:1.5em;font-weight:700;margin:.75em 0;}
        [contenteditable] h3{font-size:1.17em;font-weight:700;margin:.83em 0;}
        [contenteditable] h4{font-size:1em;font-weight:700;margin:1.12em 0;}
        [contenteditable] ol{list-style:decimal;padding-left:1.5em;}
        [contenteditable] ul{list-style:disc;padding-left:1.5em;}
      `}</style>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORM-SPECIFIC COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// ── AssignToDropdown ──────────────────────────────────────────────────────────
function AssignToDropdown({ selected, setSelected, staff }: {
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  staff: Staff[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(boxRef, () => setOpen(false));

  const toggle = (name: string) => {
    setSelected(prev => {
      if (name === "Everyone") return prev.includes("Everyone") ? [] : ["Everyone"];
      const without = prev.filter(x => x !== "Everyone");
      return prev.includes(name) ? without.filter(x => x !== name) : [...without, name];
    });
  };

  const filtStaff = staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <div
        onMouseDown={e => { e.stopPropagation(); setOpen(v => !v); setSearch(""); }}
        className="w-full min-h-9 border rounded-sm px-2 py-1.5 text-xs flex flex-wrap gap-1 items-center cursor-pointer bg-white select-none"
        style={{ borderColor: open ? MAROON : "#d1d5db" }}
      >
        {selected.length > 0 ? selected.map(a => (
          <span key={a} className="px-2 py-0.5 rounded text-xs flex items-center gap-1 text-white font-medium" style={{ background: MAROON }}>
            {a}
            <button type="button" onMouseDown={e => { e.stopPropagation(); toggle(a); }} className="hover:opacity-70 font-bold ml-0.5 text-sm leading-none">×</button>
          </span>
        )) : <span className="text-gray-400">Start typing to search...</span>}
        <span className="ml-auto text-gray-400 text-[10px] pl-2 shrink-0">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 shadow-lg rounded-sm mt-0.5 max-h-52 overflow-y-auto">
          <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full h-7 px-2 text-xs border border-gray-200 rounded outline-none focus:border-[#7b1113]" />
          </div>
          {["Everyone"].filter(o => o.toLowerCase().includes(search.toLowerCase())).map(opt => (
            <button key={opt} type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggle(opt); }}
              className="w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-gray-50 min-h-10"
              style={{ color: selected.includes(opt) ? MAROON : "#374151", fontWeight: selected.includes(opt) ? 600 : 400 }}>
              {opt}{selected.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
            </button>
          ))}
          {filtStaff.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 bg-gray-50">Staff</div>
              {filtStaff.map(s => (
                <button key={s.id} type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggle(s.name); }}
                  className="w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-gray-50 min-h-10"
                  style={{ color: selected.includes(s.name) ? MAROON : "#374151", fontWeight: selected.includes(s.name) ? 600 : 400 }}>
                  {s.name}{selected.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Question Type Menu ────────────────────────────────────────────────────────
function QuestionTypeMenu({ current, onChange }: { current: QuestionType; onChange: (t: QuestionType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));
  const cur = ALL_Q_TYPES.find(t => t.value === current);

  // On mobile, render as a native select for better UX
  const isMobile = useIsMobile(640);
  if (isMobile) {
    return (
      <select
        value={current}
        onChange={e => {
          const t = e.target.value as QuestionType;
          const defaults: Partial<FormQuestion> = {};
          if (["multiple_choice", "checkboxes", "dropdown"].includes(t)) defaults.options = ["Option 1", "Option 2", "Option 3"];
          if (["mc_grid", "checkbox_grid"].includes(t)) { defaults.rows = ["Row 1", "Row 2"]; defaults.columns = ["Column 1", "Column 2"]; }
          if (t === "linear_scale") { defaults.scaleMin = 1; defaults.scaleMax = 5; }
          onChange(t);
        }}
        className="h-9 px-2 border border-gray-300 rounded text-xs bg-white outline-none min-w-35 max-w-full"
        style={{ color: MAROON }}
      >
        {QUESTION_CATEGORIES.map(cat => (
          <optgroup key={cat.label} label={cat.label}>
            {cat.types.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="h-8 px-2 sm:px-3 border border-gray-300 rounded text-xs bg-white flex items-center gap-1 sm:gap-2 hover:border-gray-400 min-w-35 sm:min-w-44">
        <span className="text-gray-500">{cur?.icon}</span>
        <span className="flex-1 text-left truncate">{cur?.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded z-50 w-52 sm:w-56 py-1 max-h-80 overflow-y-auto">
          {QUESTION_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cat.label}</div>
              {cat.types.map(t => (
                <button key={t.value} type="button" onClick={() => { onChange(t.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 min-h-9 ${current === t.value ? "font-medium" : ""}`}
                  style={{ color: current === t.value ? MAROON : "#374151" }}>
                  <span className="w-5 text-center text-sm">{t.icon}</span>
                  {t.label}
                  {current === t.value && <span className="ml-auto" style={{ color: MAROON }}>✓</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Question Action Bar ───────────────────────────────────────────────────────
function QuestionActionBar({ question, isGraded, isSection, onChange, onDuplicate, onDelete, onMoveUp, onMoveDown }: {
  question: FormQuestion; isGraded: boolean; isSection: boolean;
  onChange: (q: FormQuestion) => void; onDuplicate: () => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
}) {
  void isGraded;
  return (
    <div className="flex items-center justify-end gap-1 px-3 sm:px-6 py-2.5 sm:py-3 border-t border-gray-100 flex-wrap">
      <button type="button" onClick={onMoveUp} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 text-sm">↑</button>
      <button type="button" onClick={onMoveDown} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 text-sm">↓</button>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <button type="button" onClick={onDuplicate} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400">
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" />
        </svg>
      </button>
      {!isSection && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <span className="text-xs text-gray-500 mr-1">Required</span>
          <button type="button" onClick={() => onChange({ ...question, required: !question.required })}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0"
            style={{ background: question.required ? MAROON : "#d1d5db" }}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${question.required ? "translate-x-4" : "translate-x-1"}`} />
          </button>
        </>
      )}
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <button type="button" onClick={onDelete} className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6" strokeLinecap="round" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" />
          <path d="M10 11v6M14 11v6" strokeLinecap="round" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ── Question Card ─────────────────────────────────────────────────────────────
function QuestionCard({ question, isActive, isGraded, onActivate, onChange, onDuplicate, onDelete, onMoveUp, onMoveDown }: {
  question: FormQuestion; isActive: boolean; isGraded: boolean;
  onActivate: () => void; onChange: (q: FormQuestion) => void;
  onDuplicate: () => void; onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const isSection = question.type === "section";

  const updateOptions = (idx: number, val: string) => {
    const opts = [...(question.options ?? [])]; opts[idx] = val;
    onChange({ ...question, options: opts });
  };
  const addOption = () => onChange({ ...question, options: [...(question.options ?? []), `Option ${(question.options?.length ?? 0) + 1}`] });
  const removeOption = (idx: number) => onChange({ ...question, options: (question.options ?? []).filter((_, i) => i !== idx) });
  const updateRow = (idx: number, val: string) => { const rows = [...(question.rows ?? [])]; rows[idx] = val; onChange({ ...question, rows }); };
  const updateCol = (idx: number, val: string) => { const cols = [...(question.columns ?? [])]; cols[idx] = val; onChange({ ...question, columns: cols }); };
  const addRow = () => onChange({ ...question, rows: [...(question.rows ?? []), `Row ${(question.rows?.length ?? 0) + 1}`] });
  const addCol = () => onChange({ ...question, columns: [...(question.columns ?? []), `Column ${(question.columns?.length ?? 0) + 1}`] });

  const actionBarProps = { question, isGraded, isSection, onChange, onDuplicate, onDelete, onMoveUp, onMoveDown };

  if (isSection) {
    return (
      <div onClick={!isActive ? onActivate : undefined}
        className={`relative bg-white rounded-lg border-t-4 shadow-sm transition-all ${isActive ? "shadow-md" : "cursor-pointer hover:shadow-md"}`}
        style={{ borderTopColor: MAROON, borderLeft: isActive ? `3px solid ${MAROON}` : "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          {isActive ? (
            <div className="space-y-3">
              <input value={question.sectionTitle ?? ""} onChange={e => onChange({ ...question, sectionTitle: e.target.value })} placeholder="Section title"
                className="w-full text-base sm:text-xl font-medium border-0 border-b-2 border-gray-300 pb-1 outline-none bg-transparent" style={{ borderBottomColor: MAROON }} />
              <input value={question.sectionDescription ?? ""} onChange={e => onChange({ ...question, sectionDescription: e.target.value })} placeholder="Section description (optional)"
                className="w-full text-sm border-0 border-b border-gray-200 pb-1 outline-none bg-transparent text-gray-600" />
            </div>
          ) : (
            <div>
              <div className="text-base font-semibold text-gray-800">{question.sectionTitle || "Section"}</div>
              {question.sectionDescription && <div className="text-xs text-gray-500 mt-1">{question.sectionDescription}</div>}
              <div className="text-[10px] mt-1 font-medium uppercase tracking-widest" style={{ color: MAROON }}>Section divider</div>
            </div>
          )}
        </div>
        {isActive && <QuestionActionBar {...actionBarProps} />}
      </div>
    );
  }

  return (
    <div onClick={!isActive ? onActivate : undefined}
      className={`relative bg-white rounded-lg shadow-sm transition-all ${isActive ? "shadow-md" : "cursor-pointer hover:shadow-md"}`}
      style={{ border: "1px solid #e5e7eb", borderLeft: isActive ? `3px solid ${MAROON}` : "1px solid #e5e7eb" }}>
      <div className="px-3 sm:px-6 pt-4 sm:pt-5 pb-3">
        {/* Question header row */}
        <div className={`flex items-start gap-2 mb-3 sm:mb-4 ${isActive ? "flex-col sm:flex-row" : ""}`}>
          <div className="flex-1 min-w-0 w-full">
            {isActive ? (
              <input value={question.question} onChange={e => onChange({ ...question, question: e.target.value })} placeholder="Question"
                className="w-full text-sm bg-gray-50 border-0 border-b-2 px-3 py-2 outline-none rounded-t" style={{ borderBottomColor: MAROON }} />
            ) : (
              <div className="text-sm font-medium text-gray-800 pr-2">
                {question.question || <span className="text-gray-400 italic">Question</span>}
                {question.required && <span className="ml-1" style={{ color: MAROON }}>*</span>}
              </div>
            )}
          </div>
          {isActive ? (
            <div className="w-full sm:w-auto">
              <QuestionTypeMenu current={question.type} onChange={t => {
                const defaults: Partial<FormQuestion> = {};
                if (["multiple_choice", "checkboxes", "dropdown"].includes(t)) defaults.options = ["Option 1", "Option 2", "Option 3"];
                if (["mc_grid", "checkbox_grid"].includes(t)) { defaults.rows = ["Row 1", "Row 2"]; defaults.columns = ["Column 1", "Column 2"]; }
                if (t === "linear_scale") { defaults.scaleMin = 1; defaults.scaleMax = 5; }
                onChange({ ...question, type: t, ...defaults });
              }} />
            </div>
          ) : (
            <div className="text-[10px] text-gray-400 shrink-0 mt-0.5 whitespace-nowrap">{getTypeLabel(question.type)}</div>
          )}
        </div>

        {isActive && (
          <input value={question.description ?? ""} onChange={e => onChange({ ...question, description: e.target.value })} placeholder="Description (optional)"
            className="w-full text-xs text-gray-500 border-0 border-b border-gray-200 pb-1 mb-3 sm:mb-4 outline-none bg-transparent" />
        )}

        {["multiple_choice", "checkboxes", "dropdown"].includes(question.type) && (
          <div className="space-y-2">
            {(question.options ?? []).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="shrink-0 text-gray-400 text-sm">{question.type === "multiple_choice" ? "◉" : question.type === "checkboxes" ? "☑" : `${idx + 1}.`}</span>
                {isActive ? (
                  <>
                    <input value={opt} onChange={e => updateOptions(idx, e.target.value)}
                      className="flex-1 text-sm border-0 border-b border-gray-300 pb-0.5 outline-none bg-transparent min-w-0" />
                    <button type="button" onClick={() => removeOption(idx)} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-500 text-base shrink-0">×</button>
                  </>
                ) : <span className="text-sm text-gray-600">{opt}</span>}
              </div>
            ))}
            {isActive && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-300 shrink-0 text-sm">{question.type === "multiple_choice" ? "◉" : question.type === "checkboxes" ? "☑" : `${(question.options?.length ?? 0) + 1}.`}</span>
                <button type="button" onClick={addOption} className="text-sm text-gray-400 hover:text-gray-600 text-left">Add option</button>
              </div>
            )}
          </div>
        )}

        {question.type === "short_answer" && <div className="border-b border-dashed border-gray-300 py-1"><span className="text-sm text-gray-300">Short answer text</span></div>}
        {question.type === "paragraph" && <div className="border-b border-dashed border-gray-300 py-2"><span className="text-sm text-gray-300">Long answer text</span></div>}

        {question.type === "linear_scale" && (
          <div className="flex items-center gap-2 flex-wrap">
            {Array.from({ length: (question.scaleMax ?? 5) - (question.scaleMin ?? 1) + 1 }, (_, i) => i + (question.scaleMin ?? 1)).map(n => (
              <div key={n} className="flex flex-col items-center gap-1"><span className="text-xs text-gray-500">{n}</span><div className="w-5 h-5 rounded-full border-2 border-gray-300" /></div>
            ))}
          </div>
        )}

        {["mc_grid", "checkbox_grid"].includes(question.type) && (
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <table className="text-xs border-collapse min-w-full">
              <thead><tr>
                <th className="w-16 sm:w-24 p-1 sm:p-2" />
                {(question.columns ?? []).map((col, ci) => (
                  <th key={ci} className="p-1 sm:p-2 text-center min-w-15">
                    {isActive
                      ? <input value={col} onChange={e => updateCol(ci, e.target.value)} className="w-12 sm:w-16 text-center border-0 border-b border-gray-300 outline-none bg-transparent text-xs" />
                      : col}
                  </th>
                ))}
                {isActive && <th className="p-1 sm:p-2"><button type="button" onClick={addCol} className="text-xs text-blue-500 hover:underline whitespace-nowrap">+ Col</button></th>}
              </tr></thead>
              <tbody>
                {(question.rows ?? []).map((row, ri) => (
                  <tr key={ri} className="border-t border-gray-100">
                    <td className="p-1 sm:p-2">
                      {isActive
                        ? <input value={row} onChange={e => updateRow(ri, e.target.value)} className="w-14 sm:w-20 border-0 border-b border-gray-300 outline-none bg-transparent text-xs" />
                        : row}
                    </td>
                    {(question.columns ?? []).map((_, ci) => (
                      <td key={ci} className="p-1 sm:p-2 text-center"><div className={`w-4 h-4 mx-auto border-2 border-gray-300 ${question.type === "mc_grid" ? "rounded-full" : "rounded-sm"}`} /></td>
                    ))}
                  </tr>
                ))}
                {isActive && <tr><td className="p-1 sm:p-2"><button type="button" onClick={addRow} className="text-xs text-blue-500 hover:underline">+ Add row</button></td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {question.type === "date" && <div className="flex items-center gap-2 text-sm text-gray-400 border-b border-dashed border-gray-300 py-1 max-w-45"><span>📅</span> Month / Day / Year</div>}
        {question.type === "time" && <div className="flex items-center gap-2 text-sm text-gray-400 border-b border-dashed border-gray-300 py-1 max-w-35"><span>🕐</span> Time</div>}
        {question.type === "file_upload" && <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center"><span className="text-xs text-gray-400">Add File</span></div>}
      </div>
      {isActive && <QuestionActionBar {...actionBarProps} />}
    </div>
  );
}

// ── Floating Toolbar ──────────────────────────────────────────────────────────
function FloatingToolbar({ onAdd }: { onAdd: (type: QuestionType | "section") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));
  const groups = [
    { group: "Choice", options: [
      { label: "Multiple Choice", action: () => onAdd("multiple_choice") },
      { label: "Checkboxes", action: () => onAdd("checkboxes") },
      { label: "Dropdown", action: () => onAdd("dropdown") },
    ]},
    { group: "Text", options: [
      { label: "Short Answer", action: () => onAdd("short_answer") },
      { label: "Paragraph", action: () => onAdd("paragraph") },
    ]},
    { group: "Scale & Grid", options: [
      { label: "Linear Scale", action: () => onAdd("linear_scale") },
      { label: "Multiple Choice Grid", action: () => onAdd("mc_grid") },
      { label: "Checkbox Grid", action: () => onAdd("checkbox_grid") },
    ]},
    { group: "Date & Time", options: [
      { label: "Date", action: () => onAdd("date") },
      { label: "Time", action: () => onAdd("time") },
    ]},
    { group: "Other", options: [
      { label: "File Upload", action: () => onAdd("file_upload") },
      { label: "Section Divider", action: () => onAdd("section") },
    ]},
  ];
  return (
    <div ref={ref} className="fixed right-3 sm:right-8 bottom-18 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-48 sm:w-56 overflow-hidden mb-1" style={{ maxHeight: "55vh", overflowY: "auto" }}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
            <span className="text-xs font-semibold text-gray-700">Add Question</span>
            <button type="button" onClick={() => setOpen(false)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-sm">×</button>
          </div>
          {groups.map(g => (
            <div key={g.group}>
              <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{g.group}</div>
              {g.options.map(item => (
                <button key={item.label} type="button" onClick={() => { item.action(); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-xs text-gray-700 min-h-9">{item.label}</button>
              ))}
            </div>
          ))}
          <div className="h-2" />
        </div>
      )}
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 h-10 rounded-full text-white text-sm font-medium shadow-lg hover:opacity-90 active:scale-95 transition-transform"
        style={{ background: MAROON }}>
        {open ? "✕ Close" : "+ Add Question"}
      </button>
    </div>
  );
}

// ── Questions Tab ─────────────────────────────────────────────────────────────
function QuestionsTab({ questions, isGraded, onChange }: {
  questions: FormQuestion[]; isGraded: boolean; onChange: (qs: FormQuestion[]) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const idCounter = useRef(1000);

  const newQuestion = (type: QuestionType | "section"): FormQuestion => {
    const id = String(idCounter.current++);
    if (type === "section") return { id, type: "section", question: "", points: 0, required: false, sectionTitle: "New Section", sectionDescription: "" };
    const defaults: Partial<FormQuestion> = {};
    if (["multiple_choice", "checkboxes", "dropdown"].includes(type)) defaults.options = ["Option 1", "Option 2", "Option 3"];
    if (["mc_grid", "checkbox_grid"].includes(type)) { defaults.rows = ["Row 1", "Row 2"]; defaults.columns = ["Column 1", "Column 2"]; }
    if (type === "linear_scale") { defaults.scaleMin = 1; defaults.scaleMax = 5; }
    return { id, type: type as QuestionType, question: "", points: 0, required: false, ...defaults };
  };
  const addQuestion = (type: QuestionType | "section") => { const q = newQuestion(type); onChange([...questions, q]); setActiveId(q.id); };
  const duplicate = (idx: number) => { const q = { ...questions[idx], id: String(idCounter.current++) }; const u = [...questions]; u.splice(idx + 1, 0, q); onChange(u); setActiveId(q.id); };
  const deleteQ = (idx: number) => { onChange(questions.filter((_, i) => i !== idx)); setActiveId(null); };
  const update = (idx: number, q: FormQuestion) => { const u = [...questions]; u[idx] = q; onChange(u); };
  const moveUp = (idx: number) => { if (!idx) return; const u = [...questions]; [u[idx - 1], u[idx]] = [u[idx], u[idx - 1]]; onChange(u); };
  const moveDown = (idx: number) => { if (idx === questions.length - 1) return; const u = [...questions]; [u[idx], u[idx + 1]] = [u[idx + 1], u[idx]]; onChange(u); };

  return (
    <div className="relative">
      {questions.length > 0 && (
        <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
          <span>{questions.filter(q => q.type !== "section").length} question(s)</span>
        </div>
      )}
      <div className="space-y-3 pb-24">
        {questions.length === 0 && (
          <div className="text-center py-10 sm:py-16 bg-white rounded-lg border border-dashed border-gray-300">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-sm text-gray-400 mb-1">No questions yet</p>
            <p className="text-xs text-gray-300">Use the + button to add questions</p>
          </div>
        )}
        {questions.map((q, idx) => (
          <QuestionCard key={q.id} question={q} isActive={activeId === q.id} isGraded={isGraded}
            onActivate={() => setActiveId(q.id)} onChange={u => update(idx, u)}
            onDuplicate={() => duplicate(idx)} onDelete={() => deleteQ(idx)}
            onMoveUp={() => moveUp(idx)} onMoveDown={() => moveDown(idx)} />
        ))}
      </div>
      <FloatingToolbar onAdd={addQuestion} />
    </div>
  );
}

// ── Submission Preview ────────────────────────────────────────────────────────
function SubmitConfirmationPreview({ message, allowMultiple }: { message: string; allowMultiple: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sm:p-8 text-center max-w-md mx-auto mt-4 sm:mt-6">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f0fdf4" }}>
        <svg width="24" height="24" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">Your response has been recorded</h3>
      <p className="text-xs sm:text-sm text-gray-500 mb-4">{message || "Thank you for completing this form."}</p>
      {allowMultiple && <button type="button" className="text-xs sm:text-sm hover:underline font-medium" style={{ color: MAROON }}>Submit another response</button>}
    </div>
  );
}

// ── Availability Banner ───────────────────────────────────────────────────────
function AvailabilityBanner({ availableFrom, availableFromTime, availableUntil, availableUntilTime }: {
  availableFrom: string; availableFromTime: string; availableUntil: string; availableUntilTime: string;
}) {
  if (!availableFrom && !availableUntil) return null;
  const now = new Date();
  const parseDateTime = (date: string, time: string): Date | null => {
    if (!date) return null;
    let hours = 0, minutes = 0;
    if (time) {
      const m = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (m) {
        hours = parseInt(m[1]); minutes = parseInt(m[2]);
        if (m[3].toUpperCase() === "PM" && hours !== 12) hours += 12;
        if (m[3].toUpperCase() === "AM" && hours === 12) hours = 0;
      }
    }
    const [y, mo, d] = date.split("-").map(Number);
    return new Date(y, mo - 1, d, hours, minutes, 0, 0);
  };
  const fromDate = parseDateTime(availableFrom, availableFromTime);
  const untilDate = parseDateTime(availableUntil, availableUntilTime);
  let status: "upcoming" | "open" | "closed" | null = null;
  if (fromDate && now < fromDate) status = "upcoming";
  else if (untilDate && now > untilDate) status = "closed";
  else if (fromDate || untilDate) status = "open";
  if (!status) return null;
  const fmt2 = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) + ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const configs = {
    upcoming: { bg: "#fef9c3", border: "#fde047", text: "#854d0e", icon: "🕐", msg: `Opens ${fromDate ? fmt2(fromDate) : ""}` },
    open: { bg: "#f0fdf4", border: "#86efac", text: "#166534", icon: "✅", msg: `Open${untilDate ? ` · Closes ${fmt2(untilDate)}` : ""}` },
    closed: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", icon: "🔒", msg: `Closed${untilDate ? ` since ${fmt2(untilDate)}` : ""}` },
  };
  const cfg = configs[status];
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium mb-3"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}>
      <span>{cfg.icon}</span><span className="wrap-break-word">{cfg.msg}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminCourseFormCreateEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string; formId?: string }>();
  const searchParams = useSearchParams();
  const courseId = params?.id ?? "";
  const formId = params?.formId;
  const isEditing = !!formId && formId !== "new";

  const { data: session } = useSession();
  const sessionUserId = (session?.user as { id?: string })?.id ?? null;

  type TabKey = "details" | "questions" | "responses";
  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(searchParams?.get("name") ?? "");
  const [description, setDescription] = useState("");
  const [initialDescription, setInitialDescription] = useState("");
  const [formType, setFormType] = useState<FormType>("Survey / Feedback");
  const [assignmentGroup, setAssignmentGroup] = useState("Assignments");
  const [groups, setGroups] = useState<AssignmentGroup[]>([{ id: 1, name: "Assignments" }]);
  const [points, setPoints] = useState("0");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [allowMultipleResponses, setAllowMultipleResponses] = useState(false);
  const [assignTo, setAssignTo] = useState<string[]>(["Everyone"]);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableFromTime, setAvailableFromTime] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [availableUntilTime, setAvailableUntilTime] = useState("");
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const isGraded = formType === "Graded Assessment";

  useEffect(() => { setMounted(true); }, []);

  // Load existing form for editing
  useEffect(() => {
    if (!courseId || !isEditing) return;
    fetch(`/api/admin/courses/${courseId}/forms/${formId}`)
      .then(r => r.json())
      .then(d => {
        const f: FormData = d.form ?? d;
        setTitle(f.title ?? "");
        setDescription(f.description ?? "");
        setInitialDescription(f.description ?? "");
        setFormType(FORM_TYPE_DISPLAY[f.formType as string] ?? "Survey / Feedback");
        setAssignmentGroup(f.assignmentGroup ?? "Assignments");
        setPoints(String(f.points ?? 0));
        setConfirmationMessage(f.confirmationMessage ?? "");
        setAllowMultipleResponses(f.allowMultipleResponses ?? false);
        setAssignTo(f.assignTo ?? ["Everyone"]);
        setDueDate(f.dueDate ?? "");
        setDueTime(f.dueTime ?? "");
        setAvailableFrom(f.availableFrom ?? "");
        setAvailableFromTime(f.availableFromTime ?? "");
        setAvailableUntil(f.availableUntil ?? "");
        setAvailableUntilTime(f.availableUntilTime ?? "");
        setPublished(f.published ?? false);
        setQuestions(f.questions ?? []);
      })
      .catch(() => {});
  }, [courseId, formId, isEditing]);

  // Load groups & staff
  useEffect(() => {
    if (!courseId) return;
    fetch(`/api/admin/courses/${courseId}/assignments`)
      .then(r => r.json())
      .then(d => {
        const list = d.assignments ?? [];
        const names: string[] = [...new Set<string>(list.map((a: { assignmentGroup: string }) => a.assignmentGroup || "Assignments"))];
        if (!names.includes("Assignments")) names.unshift("Assignments");
        setGroups(names.map((n, i) => ({ id: i + 1, name: n })));
      })
      .catch(() => {});
    fetch(`/api/admin/courses/${courseId}/sections`)
      .then(r => r.json())
      .then(d => setStaff(d.staff ?? []))
      .catch(() => {});
  }, [courseId]);

  const handleSave = async (publish: boolean) => {
    setSaveError(null);
    if (!title.trim()) { setSaveError("Form Title is required."); return; }
    setSaving(true);
    try {
      const url = isEditing
        ? `/api/admin/courses/${courseId}/forms/${formId}`
        : `/api/admin/courses/${courseId}/forms`;
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), description, formType, assignmentGroup,
          points: parseFloat(points) || 0,
          shuffleAnswers: false, allowMultipleResponses, responseLimit: null,
          anonymousResponses: false, showResultsToRespondents: false,
          showOneAtATime: false, lockQuestionsAfterAnswering: false,
          accessCode: "", confirmationMessage,
          assignTo, dueDate, dueTime, availableFrom, availableFromTime,
          availableUntil, availableUntilTime,
          published: publish, questions,
          createdById: sessionUserId,
        }),
      });
      if (res.ok) {
        setPublished(publish);
        router.push(`/admin/courses/${courseId}/forms`);
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError((data as { error?: string })?.error ?? `Server error: ${res.status}`);
      }
    } catch { setSaveError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  const saveGroup = () => {
    const n = newGroupName.trim(); if (!n) return;
    if (!groups.find(g => g.name === n)) setGroups(p => [...p, { id: Date.now(), name: n }]);
    setAssignmentGroup(n); setGroupModalOpen(false); setNewGroupName("");
  };

  // ── Date/Time Row (responsive) ────────────────────────────────────────────
  const DateTimeRow = ({ label, date, onDateChange, time, onTimeChange, onClear }: {
    label: string; date: string; onDateChange: (v: string) => void;
    time: string; onTimeChange: (v: string) => void; onClear: () => void;
  }) => (
    <div>
      <p className="text-xs font-medium text-gray-700 mb-1">{label}</p>
      <div className="flex border border-gray-300 rounded-sm overflow-hidden">
        <input type="date" value={date} onChange={e => onDateChange(e.target.value)}
          className="flex-1 h-9 border-0 px-2 text-xs outline-none bg-white min-w-0" />
        <div className="w-px bg-gray-200 self-stretch shrink-0" />
        <select value={time} onChange={e => onTimeChange(e.target.value)}
          className="h-9 border-0 px-1 text-xs bg-white outline-none w-20 sm:w-24 shrink-0">
          <option value="">Time</option>
          {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <button type="button" onClick={onClear} className="text-xs hover:underline mt-0.5" style={{ color: MAROON }}>Clear</button>
    </div>
  );

  if (!mounted) return null;

  const TABS: { key: TabKey; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "questions", label: "Questions" },
    { key: "responses", label: "After Submission" },
  ];

  return (
    <div className="w-full h-full bg-white flex flex-col" style={{ fontFamily: FONT }} suppressHydrationWarning>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-2.5 border-b border-gray-200 bg-white shrink-0 gap-2">
        <h1 className="text-sm font-semibold text-gray-800 truncate min-w-0">
          {isEditing ? "Edit Form" : "New Form"}
        </h1>
        <div className="flex items-center gap-2 sm:gap-4 text-xs text-gray-600 shrink-0">
          {parseFloat(points) > 0 && (
            <span className="hidden sm:inline">Points <strong className="text-gray-800">{parseFloat(points)}</strong></span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border shrink-0" style={published ? { background: "#22c55e", borderColor: "#22c55e" } : { borderColor: "#9ca3af" }} />
            <span className="hidden xs:inline">{published ? "Published" : "Unpublished"}</span>
          </div>
        </div>
      </div>

      {/* ── Tab bar (scrollable on mobile) ── */}
      <div className="border-b border-gray-200 bg-white shrink-0 overflow-x-auto">
        <div className="flex items-end px-3 sm:px-6 min-w-max">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-3 sm:px-4 py-2.5 text-xs border border-b-0 -mb-px mr-0.5 transition-colors rounded-t whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-white border-gray-200 text-gray-900 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.key === "questions" ? (
                <span className="flex items-center gap-1">
                  Questions
                  {questions.length > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] text-white" style={{ background: MAROON }}>
                      {questions.filter(q => q.type !== "section").length}
                    </span>
                  )}
                </span>
              ) : tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-4">

        {/* ── DETAILS TAB ── */}
        {activeTab === "details" && (
          <div className="max-w-2xl w-full mx-auto sm:mx-0">
            {/* Title */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">Form Title <span className="text-red-500">*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Untitled Form"
                className="w-full h-9 border rounded-sm px-3 text-sm outline-none" style={{ borderColor: MAROON }} />
            </div>

            {/* Description */}
            <div className="mb-5">
              <label className="text-xs text-gray-500 block mb-1">Form Description / Instructions</label>
              <RichTextEditor onChange={setDescription} placeholder="Form description or instructions..." initialHtml={initialDescription} />
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              {/* Form Type */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <label className="text-xs text-gray-700 font-medium sm:w-36 sm:text-right shrink-0">Form Type</label>
                <select value={formType} onChange={e => setFormType(e.target.value as FormType)}
                  className="h-9 border border-gray-300 rounded-sm px-3 text-xs w-full sm:w-72 bg-white outline-none focus:border-[#7b1113]">
                  <option>Survey / Feedback</option>
                  <option>Evaluation</option>
                  <option>Registration Form</option>
                  <option>Graded Assessment</option>
                </select>
              </div>

              {/* Assignment Group */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <label className="text-xs text-gray-700 font-medium sm:w-36 sm:text-right shrink-0">Assignment Group</label>
                <select value={assignmentGroup}
                  onChange={e => { if (e.target.value === "__create__") { setNewGroupName(""); setGroupModalOpen(true); } else setAssignmentGroup(e.target.value); }}
                  className="h-9 border border-gray-300 rounded-sm px-3 text-xs w-full sm:w-72 bg-white outline-none focus:border-[#7b1113]">
                  {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                  <option value="__create__">[ Create Group ]</option>
                </select>
              </div>

              {/* Points */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <label className="text-xs text-gray-700 font-medium sm:w-36 sm:text-right shrink-0">Points</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} value={points} onChange={e => setPoints(e.target.value)}
                    placeholder="0" className="h-9 border border-gray-300 rounded-sm px-3 text-xs w-28 sm:w-32 outline-none focus:border-[#7b1113]" />
                  <span className="text-xs text-gray-500">pts total</span>
                </div>
              </div>

              {/* Assign section */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                <label className="text-xs text-gray-700 font-medium sm:w-36 sm:text-right sm:pt-2 shrink-0">Assign</label>
                <div className="border border-gray-200 rounded-sm p-3 w-full space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Assign To</p>
                    <AssignToDropdown selected={assignTo} setSelected={setAssignTo} staff={staff} />
                  </div>
                  <AvailabilityBanner availableFrom={availableFrom} availableFromTime={availableFromTime} availableUntil={availableUntil} availableUntilTime={availableUntilTime} />
                  <DateTimeRow label="Due Date" date={dueDate} onDateChange={setDueDate} time={dueTime} onTimeChange={setDueTime} onClear={() => { setDueDate(""); setDueTime(""); }} />
                  <DateTimeRow label="Available From" date={availableFrom} onDateChange={setAvailableFrom} time={availableFromTime} onTimeChange={setAvailableFromTime} onClear={() => { setAvailableFrom(""); setAvailableFromTime(""); }} />
                  <DateTimeRow label="Until" date={availableUntil} onDateChange={setAvailableUntil} time={availableUntilTime} onTimeChange={setAvailableUntilTime} onClear={() => { setAvailableUntil(""); setAvailableUntilTime(""); }} />
                  <div className="bg-blue-50 border border-blue-100 rounded p-2 text-[10px] text-blue-700 leading-relaxed">
                    <strong>Note:</strong> &ldquo;Available From&rdquo; controls when respondents can start answering. The form is always <em>visible</em> but responses are only accepted within the available window.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── QUESTIONS TAB ── */}
        {activeTab === "questions" && (
          <QuestionsTab questions={questions} isGraded={isGraded} onChange={setQuestions} />
        )}

        {/* ── AFTER SUBMISSION TAB ── */}
        {activeTab === "responses" && (
          <div className="max-w-lg w-full mx-auto sm:mx-0 space-y-5">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Confirmation Message</label>
              <textarea value={confirmationMessage} onChange={e => setConfirmationMessage(e.target.value)}
                placeholder="Thank you for completing this form." rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#7b1113] resize-none" />
            </div>
            <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer min-h-10">
              <input type="checkbox" checked={allowMultipleResponses} onChange={e => setAllowMultipleResponses(e.target.checked)}
                className="w-4 h-4 shrink-0" style={{ accentColor: MAROON }} />
              Show &ldquo;Submit another response&rdquo; button
            </label>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-700 mb-3">Preview</p>
              <SubmitConfirmationPreview message={confirmationMessage} allowMultiple={allowMultipleResponses} />
            </div>
          </div>
        )}
      </div>

      {/* ── Group modal ── */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-sm bg-white shadow-xl border border-gray-200 rounded">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">Add Assignment Group</div>
              <button onClick={() => setGroupModalOpen(false)} className="w-6 h-6 flex items-center justify-center border rounded text-sm" style={{ borderColor: MAROON, color: MAROON }}>×</button>
            </div>
            <div className="px-4 sm:px-6 py-5">
              <label className="text-xs text-gray-700 block mb-1.5">Group Name</label>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveGroup()}
                placeholder="e.g., Evaluation Group 1"
                className="w-full h-9 border border-gray-300 px-3 text-xs outline-none focus:border-[#7b1113] rounded-sm" />
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex justify-end gap-2">
              <button onClick={() => setGroupModalOpen(false)} className="h-8 px-4 border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50 rounded">Cancel</button>
              <button onClick={saveGroup} style={{ background: MAROON }} className="h-8 px-4 text-white text-xs rounded hover:opacity-90">Add Group</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom action bar ── */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-3 sm:px-8 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {saveError && (
            <span className="text-xs text-red-600 font-medium flex items-center gap-1">
              <span>⚠</span>
              <span className="truncate">{saveError}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => router.push(`/admin/courses/${courseId}/forms`)} disabled={saving}
            className="h-9 px-3 sm:px-5 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 min-w-15">
            Cancel
          </button>
          {/* Save & Publish: hidden on mobile to save space, shown on sm+ */}
          <button onClick={() => handleSave(true)} disabled={saving}
            className="h-9 px-3 sm:px-5 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 hidden sm:block">
            {saving ? "Saving…" : "Save & Publish"}
          </button>
          {/* On mobile: show a publish icon button */}
          <button onClick={() => handleSave(true)} disabled={saving}
            title="Save & Publish"
            className="h-9 w-9 border border-gray-300 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50 flex sm:hidden items-center justify-center"
            aria-label="Save & Publish">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={() => handleSave(false)} disabled={saving}
            style={{ background: MAROON }} className="h-9 px-3 sm:px-5 text-white text-xs rounded hover:opacity-90 disabled:opacity-50 min-w-15">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;filter:invert(13%) sepia(85%) saturate(2000%) hue-rotate(340deg) brightness(70%);opacity:.7;}
        input[type="date"]::-webkit-calendar-picker-indicator:hover{opacity:1;}
        input[type="date"]{color-scheme:light;accent-color:#7b1113;}
        @media (max-width:380px){
          .xs\\:inline { display: inline; }
        }
      `}</style>
    </div>
  );
}