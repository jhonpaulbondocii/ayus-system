"use client";

// src/components/layout/CourseFormsPage.tsx
// Head/user view — full admin UI (RichTextEditor, QuestionsTab, FloatingToolbar,
// SubmitConfirmationPreview, assignment-group modal, etc.) + AuthorBadge from original.

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

const MAROON = "#7b1113";

// ── Author Role Badge ──────────────────────────────────────────────────────────
function AuthorBadge({ name, role }: { name: string; role: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    Admin: { bg: "#fdf8f8", text: MAROON,    border: "#f0c0c0" },
    Head:  { bg: "#fdf8f8", text: MAROON,    border: "#f0c0c0" },
    Staff: { bg: "#f0f9ff", text: "#0369a1", border: "#bae6fd" },
  };
  const c = colors[role] ?? colors.Admin;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.text }} />
      {name} · {role}
    </span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Form {
  id: string | number;
  title: string;
  description: string;
  formType: "Survey / Feedback" | "Evaluation" | "Registration Form" | "Graded Assessment";
  assignmentGroup: string;
  shuffleAnswers: boolean;
  allowMultipleResponses: boolean;
  responseLimit: number | null;
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
  points: number;
  published: boolean;
  questions: FormQuestion[];
  createdAt: string;
  createdAtLabel: string;
  // Author info
  authorId?: string | null;
  authorName?: string;
  authorRole?: string;
  authorImage?: string | null;
}

type QuestionType =
  | "multiple_choice" | "checkboxes" | "dropdown"
  | "short_answer" | "paragraph" | "linear_scale"
  | "mc_grid" | "checkbox_grid" | "date" | "time"
  | "file_upload" | "section";

interface FormQuestion {
  id: string;
  type: QuestionType;
  question: string;
  description?: string;
  points: number;
  required: boolean;
  image?: string;
  options?: string[];
  correctAnswer?: string | string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  rows?: string[];
  columns?: string[];
  sectionTitle?: string;
  sectionDescription?: string;
}

interface Section { id: string; name: string; }
interface Staff   { id: string; name: string; }
interface AssignmentGroup { id: number; name: string; }

// ── Question type definitions ─────────────────────────────────────────────────
const QUESTION_CATEGORIES = [
  {
    label: "Choice",
    types: [
      { value: "multiple_choice" as QuestionType, label: "Multiple Choice", icon: "◉" },
      { value: "checkboxes"      as QuestionType, label: "Checkboxes",      icon: "☑" },
      { value: "dropdown"        as QuestionType, label: "Dropdown",        icon: "⌄" },
    ],
  },
  {
    label: "Text",
    types: [
      { value: "short_answer" as QuestionType, label: "Short Answer", icon: "─" },
      { value: "paragraph"    as QuestionType, label: "Paragraph",    icon: "≡" },
    ],
  },
  {
    label: "Scale & Grid",
    types: [
      { value: "linear_scale"   as QuestionType, label: "Linear Scale",           icon: "◁▷" },
      { value: "mc_grid"        as QuestionType, label: "Multiple Choice Grid",    icon: "⊞"  },
      { value: "checkbox_grid"  as QuestionType, label: "Checkbox Grid",           icon: "⊟"  },
    ],
  },
  {
    label: "Date & Time",
    types: [
      { value: "date" as QuestionType, label: "Date", icon: "📅" },
      { value: "time" as QuestionType, label: "Time", icon: "🕐" },
    ],
  },
  {
    label: "Upload",
    types: [
      { value: "file_upload" as QuestionType, label: "File Upload", icon: "⬆" },
    ],
  },
];

const ALL_QUESTION_TYPES = QUESTION_CATEGORIES.flatMap(c => c.types);
function getTypeLabel(type: QuestionType) {
  return ALL_QUESTION_TYPES.find(t => t.value === type)?.label ?? type;
}

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

// ── useOnClickOutside ─────────────────────────────────────────────────────────
function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void,
) {
  useEffect(() => {
    function listener(e: MouseEvent) {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      handler();
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

// ── Rich Text Editor Modals ───────────────────────────────────────────────────
function WordCountModal({ text, chars, charsNoSpace, paragraphs, onClose }: {
  text: string; chars: number; charsNoSpace: number; paragraphs: number; onClose: () => void;
}) {
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-72 border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">Word Count</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4 space-y-2 text-xs text-gray-700">
          {([
            ["Words", words],
            ["Characters (with spaces)", chars],
            ["Characters (no spaces)", charsNoSpace],
            ["Paragraphs", paragraphs],
          ] as [string, number][]).map(([k, v]) => (
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
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flags = all ? "gi" : "i";
    const count = (html.match(new RegExp(escaped, flags)) ?? []).length;
    if (!count) { setMsg("No matches found."); return; }
    onUpdate(html.replace(new RegExp(escaped, flags), replace));
    setMsg(all ? `Replaced ${count} occurrence(s).` : "Replaced first occurrence.");
  };
  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-80 border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">Find and Replace</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Find</label>
            <input autoFocus value={find} onChange={e => setFind(e.target.value)}
              className="w-full h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" placeholder="Search text..." />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Replace with</label>
            <input value={replace} onChange={e => setReplace(e.target.value)}
              className="w-full h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" placeholder="Replacement..." />
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

function HTMLEditorModal({ html: initialHtml, onUpdate, onClose }: {
  html: string; onUpdate: (html: string) => void; onClose: () => void;
}) {
  const [html, setHtml] = useState(initialHtml);
  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-160 border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">HTML Editor</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4">
          <textarea value={html} onChange={e => setHtml(e.target.value)}
            className="w-full h-64 border border-gray-300 rounded px-3 py-2 text-xs font-mono outline-none focus:border-[#7b1113] resize-none" />
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
    <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/40" onClick={onClose}>
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
              onClick={() => { document.execCommand(type, false, c === "transparent" ? undefined : c); onClose(); }}
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
      <p className="text-[10px] text-gray-500 text-center mb-1.5 h-3">
        {hover.r > 0 ? `${hover.r} × ${hover.c} table` : "Select table size"}
      </p>
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

const Chevron = () => (
  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

type MAction = { type: "action"; icon?: string; label: string; shortcut?: string; action: () => void; disabled?: boolean };
type MSep    = { type: "sep" };
type MSub    = { type: "sub"; icon?: string; label: string; children: (MAction | MSep | MSub)[]; picker?: boolean; onPick?: (r: number, c: number) => void };
type MItem   = MAction | MSep | MSub;

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
        <span className="flex-1">{item.label}</span>
        <Chevron />
      </button>
      {open && (
        <div className="absolute left-full top-0 bg-white border border-gray-200 shadow-lg rounded-sm min-w-44 py-1 z-200">
          {item.picker
            ? <TablePicker onPick={(r, c) => { item.onPick?.(r, c); onClose(); }} />
            : <MenuItems items={item.children} onClose={onClose} />
          }
        </div>
      )}
    </div>
  );
}

// ── Rich Text Editor ──────────────────────────────────────────────────────────
function RichTextEditor({ value = "", onChange, placeholder = "Enter text..." }: {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [openMenu, setOpenMenu]   = useState<string | null>(null);
  const [showWC,   setShowWC]     = useState(false);
  const [showFR,   setShowFR]     = useState(false);
  const [showHTML, setShowHTML]   = useState(false);
  const [showColor, setShowColor] = useState<"foreColor" | "backColor" | null>(null);
  const [wcData, setWcData]       = useState({ text: "", chars: 0, charsNoSpace: 0, paragraphs: 0 });
  const [editorHtml, setEditorHtml] = useState("");
  const [isFS, setIsFS]           = useState(false);

  useEffect(() => {
    if (editorRef.current && value && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const exec        = useCallback((cmd: string, val?: string) => { editorRef.current?.focus(); document.execCommand(cmd, false, val); }, []);
  const fmt         = useCallback((tag: string) => { editorRef.current?.focus(); document.execCommand("formatBlock", false, tag); }, []);
  const insertHTML  = useCallback((html: string) => { editorRef.current?.focus(); document.execCommand("insertHTML", false, html); }, []);

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

  const closeMenus       = useCallback(() => setOpenMenu(null), []);
  const getEditorHtml    = useCallback(() => editorRef.current?.innerHTML ?? "", []);

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

  const openWordCount = useCallback(() => {
    const t = editorRef.current?.innerText.trim() ?? "";
    setWcData({
      text: t,
      chars: editorRef.current?.innerText.length ?? 0,
      charsNoSpace: t.replace(/\s/g, "").length,
      paragraphs: editorRef.current?.querySelectorAll("p").length ?? 0,
    });
    setShowWC(true);
  }, []);

  const openFindReplace = useCallback(() => {
    setEditorHtml(editorRef.current?.innerHTML ?? "");
    setShowFR(true);
  }, []);

  const openHtmlEditor = useCallback(() => {
    setEditorHtml(editorRef.current?.innerHTML ?? "");
    setShowHTML(true);
  }, []);

  const insertLink = useCallback(() => {
    const url = prompt("URL:");
    if (!url) return;
    const txt = prompt("Link text:") || url;
    insertHTML(`<a href="${url}">${txt}</a>`);
  }, [insertHTML]);

  const insertImageFromUrl = useCallback(() => {
    const url = prompt("Image URL:");
    if (!url) return;
    const alt = prompt("Alt text:") || "";
    insertHTML(`<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:4px;" />`);
  }, [insertHTML]);

  const uploadImage = useCallback(() => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = () => {
      const f = inp.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = e => insertHTML(`<img src="${e.target?.result}" style="max-width:100%;" />`);
      r.readAsDataURL(f);
    };
    inp.click();
  }, [insertHTML]);

  const insertEquation = useCallback(() => {
    const eq = prompt("Equation (LaTeX or plain):");
    if (!eq) return;
    insertHTML(`<code style="font-family:monospace;background:#f4f4f4;padding:2px 6px;border-radius:3px;">${eq}</code>`);
  }, [insertHTML]);

  const insertHR = useCallback(() => {
    insertHTML('<hr style="border:none;border-top:2px solid #dee2e6;margin:12px 0;"/><p><br></p>');
  }, [insertHTML]);

  const deleteTable = useCallback(() => {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    let n: Node | null = sel.getRangeAt(0).commonAncestorContainer;
    while (n && (n as Element).nodeName !== "TABLE") n = n.parentNode;
    if (n && (n as Element).nodeName === "TABLE") (n as Element).remove();
  }, []);

  const menus = useMemo((): { label: string; items: MItem[] }[] => [
    {
      label: "Edit", items: [
        { type: "action", icon: "↩", label: "Undo",       shortcut: "Ctrl+Z", action: () => exec("undo") },
        { type: "action", icon: "↪", label: "Redo",       shortcut: "Ctrl+Y", action: () => exec("redo") },
        { type: "sep" },
        { type: "action", icon: "✂", label: "Cut",        shortcut: "Ctrl+X", action: () => exec("cut") },
        { type: "action", icon: "⧉", label: "Copy",       shortcut: "Ctrl+C", action: () => exec("copy") },
        { type: "action", icon: "📋", label: "Paste",     shortcut: "Ctrl+V", action: () => exec("paste") },
        { type: "sep" },
        { type: "action", icon: "⊞", label: "Select all", shortcut: "Ctrl+A", action: () => exec("selectAll") },
      ],
    },
    {
      label: "View", items: [
        { type: "action", icon: "⛶",  label: "Fullscreen",      action: toggleFS },
        { type: "action", icon: "⊠",  label: "Exit Fullscreen",  action: toggleFS, disabled: !isFS },
        { type: "action", icon: "</>", label: "HTML Editor",      action: openHtmlEditor },
      ],
    },
    {
      label: "Insert", items: [
        { type: "sub", icon: "🔗", label: "Link", children: [
          { type: "action", label: "Insert/Edit Link", action: insertLink },
          { type: "action", label: "Remove Link",      action: () => exec("unlink") },
        ]},
        { type: "sub", icon: "🖼", label: "Image", children: [
          { type: "action", label: "Insert from URL", action: insertImageFromUrl },
          { type: "action", label: "Upload image",    action: uploadImage },
        ]},
        { type: "sep" },
        { type: "action", icon: "∑",  label: "Equation",        action: insertEquation },
        { type: "sub",    icon: "⊞",  label: "Table", picker: true, children: [], onPick: (r, c) => insertTable(r, c) },
        { type: "action", icon: "—",  label: "Horizontal line", action: insertHR },
      ],
    },
    {
      label: "Format", items: [
        { type: "action", icon: "B", label: "Bold",          shortcut: "Ctrl+B", action: () => exec("bold") },
        { type: "action", icon: "I", label: "Italic",        shortcut: "Ctrl+I", action: () => exec("italic") },
        { type: "action", icon: "U", label: "Underline",     shortcut: "Ctrl+U", action: () => exec("underline") },
        { type: "action", icon: "S", label: "Strikethrough",                     action: () => exec("strikeThrough") },
        { type: "sep" },
        { type: "sub", icon: "¶", label: "Formats", children: [
          { type: "action", label: "Heading 1",  action: () => fmt("h1") },
          { type: "action", label: "Heading 2",  action: () => fmt("h2") },
          { type: "action", label: "Heading 3",  action: () => fmt("h3") },
          { type: "action", label: "Paragraph",  action: () => fmt("p")  },
        ]},
        { type: "sub", icon: "≡", label: "Align", children: [
          { type: "action", label: "Left",    action: () => exec("justifyLeft")   },
          { type: "action", label: "Center",  action: () => exec("justifyCenter") },
          { type: "action", label: "Right",   action: () => exec("justifyRight")  },
          { type: "action", label: "Justify", action: () => exec("justifyFull")   },
        ]},
        { type: "sep" },
        { type: "action", icon: "A", label: "Text color",       action: () => setShowColor("foreColor") },
        { type: "action", icon: "A", label: "Background color", action: () => setShowColor("backColor")  },
        { type: "sep" },
        { type: "action", icon: "✕", label: "Clear formatting", action: () => exec("removeFormat") },
      ],
    },
    {
      label: "Tools", items: [
        { type: "action", icon: "≡",  label: "Word Count",       action: openWordCount   },
        { type: "action", icon: "🔍", label: "Find and Replace", shortcut: "Ctrl+F", action: openFindReplace },
      ],
    },
    {
      label: "Table", items: [
        { type: "sub", icon: "⊞", label: "Table", picker: true, children: [], onPick: (r, c) => insertTable(r, c) },
        { type: "sep" },
        { type: "action", icon: "✕", label: "Delete table", action: deleteTable },
      ],
    },
  ], [exec, fmt, insertTable, toggleFS, isFS, openHtmlEditor, insertLink, insertImageFromUrl, uploadImage, insertEquation, insertHR, deleteTable, openWordCount, openFindReplace]);

  const TBGroups = useMemo(() => [
    [
      { html: (
        <select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => fmt(e.target.value)} defaultValue="p">
          {[["Paragraph","p"],["Heading 1","h1"],["Heading 2","h2"],["Heading 3","h3"],["Blockquote","blockquote"],["Code","pre"]].map(([l,v]) =>
            <option key={v} value={v}>{l}</option>
          )}
        </select>
      ), title: "Block format" },
      { html: (
        <select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => e.target.value && exec("fontName", e.target.value)}>
          {[["Font",""],["Default","inherit"],["Arial","Arial"],["Georgia","Georgia"],["Monospace","monospace"]].map(([l,v]) =>
            <option key={l} value={v}>{l}</option>
          )}
        </select>
      ), title: "Font" },
      { html: (
        <select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => exec("fontSize", e.target.value)} defaultValue="3">
          {[["8pt","1"],["10pt","2"],["12pt","3"],["14pt","4"],["18pt","5"],["24pt","6"],["36pt","7"]].map(([l,v]) =>
            <option key={v} value={v}>{l}</option>
          )}
        </select>
      ), title: "Font size" },
    ],
    [
      { label: "B",       title: "Bold (Ctrl+B)",  fn: () => exec("bold"),         style: { fontWeight: 700 } },
      { label: "I",       title: "Italic (Ctrl+I)", fn: () => exec("italic"),      style: { fontStyle: "italic" } },
      { label: "U",       title: "Underline",       fn: () => exec("underline"),   style: { textDecoration: "underline" } },
      { label: "S\u0336", title: "Strikethrough",   fn: () => exec("strikeThrough") },
    ],
    [
      { label: "A",       title: "Text color",       fn: () => setShowColor("foreColor"), style: { color: "#e74c3c", fontWeight: 700 } },
      { label: "A",       title: "Background color", fn: () => setShowColor("backColor"), style: { background: "linear-gradient(#fef9c3,#fef9c3) bottom/100% 4px no-repeat" } },
      { label: "x\u00b2", title: "Superscript",      fn: () => exec("superscript") },
      { label: "x\u2082", title: "Subscript",        fn: () => exec("subscript")   },
    ],
    [
      { label: "🔗", title: "Link",  fn: insertLink         },
      { label: "🖼", title: "Image", fn: insertImageFromUrl },
    ],
    [
      { label: "≡", title: "Align left",   fn: () => exec("justifyLeft")   },
      { label: "≡", title: "Align center", fn: () => exec("justifyCenter") },
      { label: "≡", title: "Align right",  fn: () => exec("justifyRight")  },
      { label: "≡", title: "Justify",      fn: () => exec("justifyFull")   },
    ],
    [
      { label: "1.", title: "Ordered list",  fn: () => exec("insertOrderedList")   },
      { label: "•",  title: "Bullet list",   fn: () => exec("insertUnorderedList") },
      { label: "⇥",  title: "Indent",        fn: () => exec("indent")  },
      { label: "⇤",  title: "Outdent",       fn: () => exec("outdent") },
    ],
    [
      { label: "⊞",  title: "Insert table",   fn: () => insertTable(3, 3) },
      { label: "</>", title: "HTML editor",   fn: openHtmlEditor          },
      { label: "✕",  title: "Clear formatting", fn: () => exec("removeFormat") },
    ],
  ], [exec, fmt, insertTable, insertLink, insertImageFromUrl, openHtmlEditor]);

  return (
    <>
      {showWC    && <WordCountModal text={wcData.text} chars={wcData.chars} charsNoSpace={wcData.charsNoSpace} paragraphs={wcData.paragraphs} onClose={() => setShowWC(false)} />}
      {showFR    && <FindReplaceModal html={editorHtml} onUpdate={h => { if (editorRef.current) editorRef.current.innerHTML = h; }} onClose={() => setShowFR(false)} />}
      {showHTML  && <HTMLEditorModal  html={editorHtml} onUpdate={h => { if (editorRef.current) editorRef.current.innerHTML = h; }} onClose={() => setShowHTML(false)} />}
      {showColor && <ColorPickerModal type={showColor} onClose={() => setShowColor(null)} />}

      <div ref={wrapRef} className="border border-gray-300 rounded overflow-hidden flex flex-col" style={{ minHeight: 200 }}>
        <div data-menubar className="flex items-center gap-0.5 px-1 py-0.5 bg-[#f7f9fb] border-b border-gray-200 select-none">
          {menus.map(m => (
            <div key={m.label} className="relative">
              <button type="button"
                onMouseDown={e => { e.preventDefault(); setOpenMenu(openMenu === m.label ? null : m.label); }}
                className={`px-2.5 py-0.5 text-xs rounded transition-colors ${openMenu === m.label ? "text-white" : "text-gray-700 hover:bg-gray-200"}`}
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

        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 bg-[#f7f9fb] border-b border-gray-200">
          {TBGroups.map((group, gi) => (
            <div key={gi} className="flex items-center gap-0.5">
              {gi > 0 && <div className="w-px h-5 bg-gray-300 mx-1" />}
              {group.map((btn, bi) => {
                if ("html" in btn) return <div key={bi} title={btn.title}>{btn.html}</div>;
                return (
                  <button key={bi} type="button" title={(btn as { title: string }).title}
                    style={(btn as { style?: React.CSSProperties }).style}
                    onMouseDown={e => { e.preventDefault(); (btn as { fn: () => void }).fn?.(); }}
                    className="h-6 min-w-6 px-1 border border-transparent rounded text-xs hover:bg-blue-50 hover:border-blue-200 text-gray-700 flex items-center justify-center">
                    {(btn as { label: string }).label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={updateWC} onKeyUp={updateWC} onMouseUp={updateWC}
          data-placeholder={placeholder}
          className="flex-1 px-4 py-3 text-sm text-gray-800 outline-none overflow-y-auto"
          style={{ minHeight: 120, lineHeight: 1.7 }}
        />

        <div className="flex items-center gap-4 px-3 py-1 bg-[#f7f9fb] border-t border-gray-200 text-xs text-gray-400">
          <span>{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
          <span className="ml-auto cursor-pointer hover:text-gray-600"
            onClick={() => { setEditorHtml(getEditorHtml()); setShowHTML(true); }} title="HTML Editor">
            &lt;/&gt;
          </span>
        </div>
      </div>

      <style>{`
        [data-placeholder]:empty::before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; }
        [contenteditable] table { border-collapse: collapse; width: 100%; margin: 8px 0; }
        [contenteditable] td, [contenteditable] th { border: 1px solid #dee2e6; padding: 6px 10px; min-width: 40px; }
        [contenteditable] th { background: #f7f9fb; font-weight: 600; }
        [contenteditable] blockquote { border-left: 3px solid #6baef0; padding-left: 12px; color: #555; margin: 8px 0; }
        [contenteditable] pre { background: #f4f4f4; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 13px; }
        [contenteditable] a { color: #1764ad; text-decoration: underline; }
        [contenteditable] img { max-width: 100%; border-radius: 4px; }
      `}</style>
    </>
  );
}

// ── AssignToDropdown ──────────────────────────────────────────────────────────
function AssignToDropdown({ selected, setSelected, sections, staff }: {
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  sections: Section[];
  staff: Staff[];
}) {
  const [open, setOpen]   = useState(false);
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

  const filtSections = sections.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const filtStaff    = staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={boxRef} data-dropdown onMouseDown={e => e.stopPropagation()} style={{ position: "relative" }}>
      <div
        onMouseDown={e => { e.stopPropagation(); setOpen(v => !v); setSearch(""); }}
        className="w-full min-h-8 border rounded-sm px-2 py-1 text-xs flex flex-wrap gap-1 items-center cursor-pointer bg-white select-none"
        style={{ borderColor: open ? MAROON : "#d1d5db" }}>
        {selected.length > 0 ? selected.map(a => (
          <span key={a} className="px-2 py-0.5 rounded text-xs flex items-center gap-1 text-white font-medium" style={{ background: MAROON }}>
            {a}
            <button type="button" onMouseDown={e => { e.stopPropagation(); toggle(a); }} className="hover:opacity-70 font-bold ml-0.5">×</button>
          </span>
        )) : <span className="text-gray-400 text-xs">Start typing to search...</span>}
        <span className="ml-auto text-gray-400 text-[10px] pl-2 shrink-0">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div data-dropdown className="absolute z-50 w-full bg-white border border-gray-200 shadow-lg rounded-sm mt-0.5 max-h-52 overflow-y-auto"
          onMouseDown={e => e.stopPropagation()}>
          <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full h-6 px-2 text-xs border border-gray-200 rounded outline-none focus:border-[#7b1113]" />
          </div>
          {["Everyone"].filter(o => o.toLowerCase().includes(search.toLowerCase())).map(opt => (
            <button key={opt} type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggle(opt); }}
              className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
              style={{ color: selected.includes(opt) ? MAROON : "#374151", fontWeight: selected.includes(opt) ? 600 : 400 }}>
              {opt}{selected.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
            </button>
          ))}
          {filtSections.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 bg-gray-50">Sections</div>
              {filtSections.map(s => (
                <button key={s.id} type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggle(s.name); }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                  style={{ color: selected.includes(s.name) ? MAROON : "#374151", fontWeight: selected.includes(s.name) ? 600 : 400 }}>
                  {s.name}{selected.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                </button>
              ))}
            </>
          )}
          {filtStaff.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 bg-gray-50">Staff</div>
              {filtStaff.map(s => (
                <button key={s.id} type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggle(s.name); }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
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

// ── PublishToggle ─────────────────────────────────────────────────────────────
function PublishToggle({ published, onToggle }: { published: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      title={published ? "Published — click to unpublish" : "Unpublished — click to publish"}
      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 2, borderRadius: "50%" }}>
      {published ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" fill="#16a34a" />
          <path d="M5.5 10.5l3 3 6-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#9ca3af" strokeWidth="1.5" fill="none" />
          <line x1="6" y1="14" x2="14" y2="6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

// ── FormRowMenu ───────────────────────────────────────────────────────────────
function FormRowMenu({ formId, onEdit, onDelete }: {
  formId: string | number;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
        style={{ fontSize: 18 }}>⋮</button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 200, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 160, overflow: "hidden" }}>
          <button type="button" onClick={() => { setOpen(false); onEdit(formId); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit
          </button>
          <div style={{ borderTop: "1px solid #f3f4f6", margin: "2px 0" }} />
          <button type="button" onClick={() => { setOpen(false); onDelete(formId); }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete
          </button>
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
  const currentDef = ALL_QUESTION_TYPES.find(t => t.value === current);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="h-8 px-3 border border-gray-300 rounded text-xs bg-white flex items-center gap-2 hover:border-gray-400 min-w-44">
        <span className="text-gray-500">{currentDef?.icon}</span>
        <span className="flex-1 text-left">{currentDef?.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded z-50 w-56 py-1 max-h-80 overflow-y-auto">
          {QUESTION_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cat.label}</div>
              {cat.types.map(t => (
                <button key={t.value} type="button"
                  onClick={() => { onChange(t.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50 ${current === t.value ? "font-medium" : ""}`}
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

// ── Question Card ─────────────────────────────────────────────────────────────
function QuestionCard({
  question, index, isActive, isGraded,
  onActivate, onChange, onDuplicate, onDelete, onMoveUp, onMoveDown,
}: {
  question: FormQuestion; index: number; isActive: boolean; isGraded: boolean;
  onActivate: () => void; onChange: (q: FormQuestion) => void;
  onDuplicate: () => void; onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const isSection = question.type === "section";

  const updateOptions = (idx: number, val: string) => {
    const opts = [...(question.options ?? [])]; opts[idx] = val;
    onChange({ ...question, options: opts });
  };
  const addOption    = () => onChange({ ...question, options: [...(question.options ?? []), `Option ${(question.options?.length ?? 0) + 1}`] });
  const removeOption = (idx: number) => onChange({ ...question, options: (question.options ?? []).filter((_, i) => i !== idx) });

  const addRow    = () => onChange({ ...question, rows:    [...(question.rows    ?? []), `Row ${(question.rows?.length    ?? 0) + 1}`] });
  const addCol    = () => onChange({ ...question, columns: [...(question.columns ?? []), `Column ${(question.columns?.length ?? 0) + 1}`] });
  const updateRow = (idx: number, val: string) => { const rows = [...(question.rows ?? [])];    rows[idx] = val;    onChange({ ...question, rows });    };
  const updateCol = (idx: number, val: string) => { const cols = [...(question.columns ?? [])]; cols[idx] = val; onChange({ ...question, columns: cols }); };

  const ActionBar = () => (
    <div className="flex items-center justify-end gap-1 px-6 py-3 border-t border-gray-100">
      {isGraded && !isSection && (
        <div className="flex items-center gap-1.5 mr-auto">
          <input type="number" min={0} value={question.points}
            onChange={e => onChange({ ...question, points: parseFloat(e.target.value) || 0 })}
            className="w-14 h-7 border border-gray-300 rounded px-2 text-xs text-center outline-none focus:border-[#7b1113]" />
          <span className="text-xs text-gray-500">pts</span>
        </div>
      )}
      <button type="button" onClick={onMoveUp}    title="Move up"   className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 text-xs">↑</button>
      <button type="button" onClick={onMoveDown}  title="Move down" className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 text-xs">↓</button>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <button type="button" onClick={onDuplicate} title="Duplicate" className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" />
        </svg>
      </button>
      {!isSection && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <span className="text-xs text-gray-500 mr-1">Required</span>
          <button type="button" onClick={() => onChange({ ...question, required: !question.required })}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
            style={{ background: question.required ? MAROON : "#d1d5db" }}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${question.required ? "translate-x-4" : "translate-x-1"}`} />
          </button>
        </>
      )}
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <button type="button" onClick={onDelete} title="Delete" className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6" strokeLinecap="round" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" /><path d="M10 11v6M14 11v6" strokeLinecap="round" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );

  // Section card
  if (isSection) {
    return (
      <div onClick={!isActive ? onActivate : undefined}
        className={`relative bg-white rounded-lg border-t-4 shadow-sm transition-all ${isActive ? "shadow-md" : "cursor-pointer hover:shadow-md"}`}
        style={{ borderTopColor: MAROON, borderLeft: isActive ? `3px solid ${MAROON}` : "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
        <div className="px-6 py-5">
          {isActive ? (
            <div className="space-y-3">
              <input value={question.sectionTitle ?? ""} onChange={e => onChange({ ...question, sectionTitle: e.target.value })}
                placeholder="Section title"
                className="w-full text-xl font-medium border-0 border-b-2 border-gray-300 focus:border-b-2 pb-1 outline-none bg-transparent"
                style={{ borderBottomColor: MAROON }} />
              <input value={question.sectionDescription ?? ""} onChange={e => onChange({ ...question, sectionDescription: e.target.value })}
                placeholder="Section description (optional)"
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
        {isActive && <ActionBar />}
      </div>
    );
  }

  // Regular question card
  return (
    <div onClick={!isActive ? onActivate : undefined}
      className={`relative bg-white rounded-lg shadow-sm transition-all ${isActive ? "shadow-md" : "cursor-pointer hover:shadow-md"}`}
      style={{ border: "1px solid #e5e7eb", borderLeft: isActive ? `3px solid ${MAROON}` : "1px solid #e5e7eb" }}>
      {isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-gray-300 cursor-grab text-sm select-none">⠿⠿</div>
      )}

      <div className="px-6 pt-5 pb-3">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            {isActive ? (
              <input value={question.question} onChange={e => onChange({ ...question, question: e.target.value })}
                placeholder="Question"
                className="w-full text-sm bg-gray-50 border-0 border-b-2 px-3 py-2 outline-none rounded-t"
                style={{ borderBottomColor: MAROON }} />
            ) : (
              <div className="text-sm font-medium text-gray-800">
                {question.question || <span className="text-gray-400 italic">Question</span>}
                {question.required && <span className="ml-1" style={{ color: MAROON }}>*</span>}
              </div>
            )}
          </div>
          {isActive && (
            <div className="flex items-center gap-2 shrink-0">
              {question.image && (
                <img src={question.image} alt="" className="w-10 h-10 object-cover rounded border border-gray-200" />
              )}
              <button type="button" title="Add image" onClick={() => {
                const inp = document.createElement("input");
                inp.type = "file"; inp.accept = "image/*";
                inp.onchange = () => {
                  const file = inp.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => { if (ev.target?.result) onChange({ ...question, image: ev.target.result as string }); };
                  reader.readAsDataURL(file);
                };
                inp.click();
              }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
              </button>
              <QuestionTypeMenu current={question.type} onChange={t => {
                const defaults: Partial<FormQuestion> = {};
                if (["multiple_choice","checkboxes","dropdown"].includes(t)) defaults.options = ["Option 1","Option 2","Option 3"];
                if (["mc_grid","checkbox_grid"].includes(t)) { defaults.rows = ["Row 1","Row 2"]; defaults.columns = ["Column 1","Column 2"]; }
                if (t === "linear_scale") { defaults.scaleMin = 1; defaults.scaleMax = 5; defaults.scaleMinLabel = ""; defaults.scaleMaxLabel = ""; }
                onChange({ ...question, type: t, ...defaults });
              }} />
            </div>
          )}
          {!isActive && <div className="text-[10px] text-gray-400 shrink-0 mt-0.5">{getTypeLabel(question.type)}</div>}
        </div>

        {/* Description */}
        {isActive && (
          <input value={question.description ?? ""} onChange={e => onChange({ ...question, description: e.target.value })}
            placeholder="Description (optional)"
            className="w-full text-xs text-gray-500 border-0 border-b border-gray-200 pb-1 mb-4 outline-none bg-transparent" />
        )}
        {!isActive && question.description && <div className="text-xs text-gray-500 mb-2">{question.description}</div>}

        {/* Multiple Choice / Checkboxes / Dropdown */}
        {["multiple_choice","checkboxes","dropdown"].includes(question.type) && (
          <div className="space-y-2">
            {(question.options ?? []).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="shrink-0 text-gray-400">
                  {question.type === "multiple_choice" ? "◉" : question.type === "checkboxes" ? "☑" : `${idx + 1}.`}
                </span>
                {isActive ? (
                  <>
                    <input value={opt} onChange={e => updateOptions(idx, e.target.value)}
                      className="flex-1 text-sm border-0 border-b border-gray-300 pb-0.5 outline-none bg-transparent focus:border-b-2"
                      style={{ borderBottomColor: "transparent" }}
                      onFocus={e => (e.target.style.borderBottomColor = MAROON)}
                      onBlur={e => (e.target.style.borderBottomColor = "transparent")} />
                    <button type="button" onClick={() => removeOption(idx)} className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-500 text-sm">×</button>
                  </>
                ) : (
                  <span className="text-sm text-gray-600">{opt}</span>
                )}
              </div>
            ))}
            {isActive && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-300 shrink-0">
                  {question.type === "multiple_choice" ? "◉" : question.type === "checkboxes" ? "☑" : `${(question.options?.length ?? 0) + 1}.`}
                </span>
                <button type="button" onClick={addOption} className="text-sm text-gray-400 hover:text-gray-600 border-0 border-b border-gray-200 pb-0.5 outline-none text-left">
                  Add option
                </button>
              </div>
            )}
          </div>
        )}

        {question.type === "short_answer" && (
          <div className="border-b border-dashed border-gray-300 py-1">
            <span className="text-sm text-gray-300">Short answer text</span>
          </div>
        )}
        {question.type === "paragraph" && (
          <div className="border-b border-dashed border-gray-300 py-2">
            <span className="text-sm text-gray-300">Long answer text</span>
          </div>
        )}

        {question.type === "linear_scale" && (
          <div className="space-y-3">
            {isActive && (
              <div className="flex items-center gap-2">
                <select value={question.scaleMin ?? 1} onChange={e => onChange({ ...question, scaleMin: Number(e.target.value) })}
                  className="h-7 border border-gray-300 rounded px-2 text-xs bg-white outline-none">
                  {[0,1].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <span className="text-xs text-gray-500">to</span>
                <select value={question.scaleMax ?? 5} onChange={e => onChange({ ...question, scaleMax: Number(e.target.value) })}
                  className="h-7 border border-gray-300 rounded px-2 text-xs bg-white outline-none">
                  {[2,3,4,5,6,7,8,9,10].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              {isActive && (
                <input value={question.scaleMinLabel ?? ""} onChange={e => onChange({ ...question, scaleMinLabel: e.target.value })}
                  placeholder="Label (optional)"
                  className="w-28 text-xs border-0 border-b border-gray-300 pb-0.5 outline-none bg-transparent" />
              )}
              <div className="flex gap-2 mx-2">
                {Array.from({ length: (question.scaleMax ?? 5) - (question.scaleMin ?? 1) + 1 }, (_, i) => i + (question.scaleMin ?? 1)).map(n => (
                  <div key={n} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">{n}</span>
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  </div>
                ))}
              </div>
              {isActive && (
                <input value={question.scaleMaxLabel ?? ""} onChange={e => onChange({ ...question, scaleMaxLabel: e.target.value })}
                  placeholder="Label (optional)"
                  className="w-28 text-xs border-0 border-b border-gray-300 pb-0.5 outline-none bg-transparent" />
              )}
            </div>
          </div>
        )}

        {["mc_grid","checkbox_grid"].includes(question.type) && (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="w-24 p-2"></th>
                  {(question.columns ?? []).map((col, ci) => (
                    <th key={ci} className="p-2 text-center min-w-16">
                      {isActive ? (
                        <input value={col} onChange={e => updateCol(ci, e.target.value)}
                          className="w-16 text-center border-0 border-b border-gray-300 pb-0.5 outline-none bg-transparent text-xs" />
                      ) : col}
                    </th>
                  ))}
                  {isActive && <th className="p-2"><button type="button" onClick={addCol} className="text-xs text-blue-500 hover:underline whitespace-nowrap">+ Col</button></th>}
                </tr>
              </thead>
              <tbody>
                {(question.rows ?? []).map((row, ri) => (
                  <tr key={ri} className="border-t border-gray-100">
                    <td className="p-2">
                      {isActive ? (
                        <input value={row} onChange={e => updateRow(ri, e.target.value)}
                          className="w-20 border-0 border-b border-gray-300 pb-0.5 outline-none bg-transparent text-xs" />
                      ) : row}
                    </td>
                    {(question.columns ?? []).map((_, ci) => (
                      <td key={ci} className="p-2 text-center">
                        <div className={`w-4 h-4 mx-auto border-2 border-gray-300 ${question.type === "mc_grid" ? "rounded-full" : "rounded-sm"}`} />
                      </td>
                    ))}
                  </tr>
                ))}
                {isActive && (
                  <tr>
                    <td className="p-2">
                      <button type="button" onClick={addRow} className="text-xs text-blue-500 hover:underline">+ Add row</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {question.type === "date" && (
          <div className="flex items-center gap-2 text-sm text-gray-400 border-b border-dashed border-gray-300 py-1 w-48">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" /><line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Month / Day / Year
          </div>
        )}
        {question.type === "time" && (
          <div className="flex items-center gap-2 text-sm text-gray-400 border-b border-dashed border-gray-300 py-1 w-36">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" strokeLinecap="round" />
            </svg>
            Time
          </div>
        )}
        {question.type === "file_upload" && (
          <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className="mx-auto mb-1 text-gray-300">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" /><polyline points="17 8 12 3 7 8" strokeLinecap="round" /><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-gray-400">Add File</span>
          </div>
        )}
      </div>

      {isActive && <ActionBar />}
    </div>
  );
}

// ── Floating Toolbar ──────────────────────────────────────────────────────────
function FloatingToolbar({ onAdd }: { onAdd: (type: QuestionType | "section") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));

  const items = [
    { group: "Choice", options: [
      { label: "Multiple Choice",  sub: "Pick one answer",         action: () => onAdd("multiple_choice") },
      { label: "Checkboxes",       sub: "Pick multiple answers",   action: () => onAdd("checkboxes") },
      { label: "Dropdown",         sub: "Select from a list",      action: () => onAdd("dropdown") },
    ]},
    { group: "Text", options: [
      { label: "Short Answer", sub: "One-line text response", action: () => onAdd("short_answer") },
      { label: "Paragraph",    sub: "Long text response",     action: () => onAdd("paragraph") },
    ]},
    { group: "Scale & Grid", options: [
      { label: "Linear Scale",          sub: "Rate from 1–5 or 1–10",   action: () => onAdd("linear_scale") },
      { label: "Multiple Choice Grid",  sub: "Grid of radio buttons",   action: () => onAdd("mc_grid") },
      { label: "Checkbox Grid",         sub: "Grid of checkboxes",      action: () => onAdd("checkbox_grid") },
    ]},
    { group: "Date & Time", options: [
      { label: "Date", sub: "Pick a calendar date", action: () => onAdd("date") },
      { label: "Time", sub: "Enter a time",         action: () => onAdd("time") },
    ]},
    { group: "Other", options: [
      { label: "File Upload",     sub: "Attach a file",             action: () => onAdd("file_upload") },
      { label: "Section Divider", sub: "Separate question groups",  action: () => onAdd("section") },
    ]},
  ];

  return (
    <div ref={ref} className="fixed right-8 bottom-20 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-56 overflow-hidden mb-1"
          style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Add Question</span>
            <button type="button" onClick={() => setOpen(false)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-sm">×</button>
          </div>
          {items.map(group => (
            <div key={group.group}>
              <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{group.group}</div>
              {group.options.map(item => (
                <button key={item.label} type="button" onClick={() => { item.action(); setOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors group">
                  <div className="text-xs font-medium text-gray-700 group-hover:text-gray-900">{item.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{item.sub}</div>
                </button>
              ))}
            </div>
          ))}
          <div className="h-2" />
        </div>
      )}
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 h-10 rounded-full text-white text-sm font-medium shadow-lg hover:opacity-90 transition-all"
        style={{ background: MAROON }}>
        {open ? (
          <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" /><line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" /></svg>Close</>
        ) : (
          <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" /><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" /></svg>Add Question</>
        )}
      </button>
    </div>
  );
}

// ── QuestionsTab ──────────────────────────────────────────────────────────────
function QuestionsTab({ questions, isGraded, onChange }: {
  questions: FormQuestion[]; isGraded: boolean; onChange: (questions: FormQuestion[]) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const idCounter = useRef(1000);

  const newQuestion = (type: QuestionType | "section"): FormQuestion => {
    const id = String(idCounter.current++);
    if (type === "section") return { id, type: "section", question: "", points: 0, required: false, sectionTitle: "New Section", sectionDescription: "" };
    const defaults: Partial<FormQuestion> = {};
    if (["multiple_choice","checkboxes","dropdown"].includes(type)) defaults.options = ["Option 1","Option 2","Option 3"];
    if (["mc_grid","checkbox_grid"].includes(type)) { defaults.rows = ["Row 1","Row 2"]; defaults.columns = ["Column 1","Column 2"]; }
    if (type === "linear_scale") { defaults.scaleMin = 1; defaults.scaleMax = 5; defaults.scaleMinLabel = ""; defaults.scaleMaxLabel = ""; }
    return { id, type: type as QuestionType, question: "", points: 1, required: false, ...defaults };
  };

  const addQuestion = (type: QuestionType | "section") => {
    const q = newQuestion(type);
    onChange([...questions, q]);
    setActiveId(q.id);
  };
  const duplicate = (idx: number) => {
    const q = { ...questions[idx], id: String(idCounter.current++) };
    const updated = [...questions]; updated.splice(idx + 1, 0, q);
    onChange(updated); setActiveId(q.id);
  };
  const deleteQ   = (idx: number) => { onChange(questions.filter((_, i) => i !== idx)); setActiveId(null); };
  const update    = (idx: number, q: FormQuestion) => { const updated = [...questions]; updated[idx] = q; onChange(updated); };
  const moveUp    = (idx: number) => { if (idx === 0) return; const u = [...questions]; [u[idx-1],u[idx]] = [u[idx],u[idx-1]]; onChange(u); };
  const moveDown  = (idx: number) => { if (idx === questions.length - 1) return; const u = [...questions]; [u[idx],u[idx+1]] = [u[idx+1],u[idx]]; onChange(u); };

  const totalPts = questions.reduce((s, q) => s + (q.points || 0), 0);

  return (
    <div className="relative">
      {questions.length > 0 && (
        <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
          <span>{questions.filter(q => q.type !== "section").length} question{questions.filter(q => q.type !== "section").length !== 1 ? "s" : ""}</span>
          {isGraded && <span>{totalPts} pt{totalPts !== 1 ? "s" : ""} total</span>}
        </div>
      )}
      <div className="space-y-3 pb-20">
        {questions.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-sm text-gray-400 mb-1">No questions yet</p>
            <p className="text-xs text-gray-300">Use the + button on the right to add questions</p>
          </div>
        )}
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id} question={q} index={idx}
            isActive={activeId === q.id} isGraded={isGraded}
            onActivate={() => setActiveId(q.id)}
            onChange={updated => update(idx, updated)}
            onDuplicate={() => duplicate(idx)}
            onDelete={() => deleteQ(idx)}
            onMoveUp={() => moveUp(idx)}
            onMoveDown={() => moveDown(idx)}
          />
        ))}
      </div>
      <FloatingToolbar onAdd={addQuestion} />
    </div>
  );
}

// ── Submit Confirmation Preview ───────────────────────────────────────────────
function SubmitConfirmationPreview({ message, allowMultiple }: { message: string; allowMultiple: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center max-w-md mx-auto mt-8">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f0fdf4" }}>
        <svg width="28" height="28" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-2">Your response has been recorded</h3>
      <p className="text-sm text-gray-500 mb-4">{message || "Thank you for completing this form."}</p>
      {allowMultiple && (
        <button type="button" className="text-sm hover:underline font-medium" style={{ color: MAROON }}>
          Submit another response
        </button>
      )}
    </div>
  );
}

// ── FormsListView ─────────────────────────────────────────────────────────────
function FormsListView({ search, setSearch, onCreate, forms, onDelete, onEdit, onTogglePublish }: {
  search: string; setSearch: (v: string) => void; onCreate: () => void;
  forms: Form[]; onDelete: (id: string | number) => void;
  onEdit: (id: string | number) => void; onTogglePublish: (id: string | number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const filtered = forms.filter(f => f.title.toLowerCase().includes(search.toLowerCase()));

  const typeColors: Record<string, string> = {
    "Survey / Feedback": "#3b82f6",
    "Evaluation": "#8b5cf6",
    "Registration Form": "#16a34a",
    "Graded Assessment": MAROON,
  };

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search for Form"
            className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded w-64 focus:outline-none focus:ring-1" />
        </div>
        <button onClick={onCreate} style={{ background: MAROON }}
          className="px-4 py-2 text-sm text-white rounded font-medium hover:opacity-90 inline-flex items-center gap-1">
          <span className="text-lg leading-none">＋</span> Form
        </button>
      </div>

      <div className="border border-gray-200 rounded overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-100"
          onClick={() => setExpanded(v => !v)}>
          <span className="text-xs text-gray-500">{expanded ? "▾" : "▸"}</span>
          <span className="text-sm font-medium text-gray-700">Course Forms</span>
          {forms.length > 0 && <span className="text-xs text-gray-400 ml-1">({forms.length})</span>}
        </div>

        {expanded && (
          <div>
            {filtered.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="text-2xl mb-3">📋</div>
                <p className="text-sm text-gray-400">No forms found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filtered.map(form => (
                  <div key={form.id} className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
                    <PublishToggle published={form.published} onToggle={() => onTogglePublish(form.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold cursor-pointer hover:underline truncate" style={{ color: MAROON }}
                          onClick={() => onEdit(form.id)}>
                          {form.title}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium shrink-0"
                          style={{ background: typeColors[form.formType] ?? MAROON }}>
                          {form.formType}
                        </span>
                        {!form.published && (
                          <span className="text-[10px] text-amber-600 font-medium">Not Published</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {/* Author badge */}
                        {form.authorName && (
                          <AuthorBadge name={form.authorName} role={form.authorRole ?? "Admin"} />
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {form.formType === "Graded Assessment" && <span>{form.points} pts</span>}
                          {form.questions?.length > 0 && (
                            <><span>•</span><span>{form.questions.length} question{form.questions.length !== 1 ? "s" : ""}</span></>
                          )}
                          {form.dueDate && (
                            <><span>•</span><span>Due: {new Date(form.dueDate).toLocaleDateString()}</span></>
                          )}
                        </div>
                      </div>
                    </div>
                    <FormRowMenu formId={form.id} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── FormCreateEditView ────────────────────────────────────────────────────────
function FormCreateEditView({ form, courseId, sections, staff, onCancel, onSave }: {
  form?: Form; courseId: string; sections: Section[]; staff: Staff[];
  onCancel: () => void;
  onSave: (data: Partial<Form>, publish: boolean) => Promise<void>;
}) {
  const isDemo = !courseId;
  const [activeTab, setActiveTab] = useState<"details" | "questions" | "responses">("details");
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [published, setPublished] = useState(form?.published ?? false);

  const [title,                     setTitle]                     = useState(form?.title ?? "");
  const [description,               setDescription]               = useState(form?.description ?? "");
  const [formType,                  setFormType]                  = useState<Form["formType"]>(form?.formType ?? "Survey / Feedback");
  const [assignmentGroup,           setAssignmentGroup]           = useState(form?.assignmentGroup ?? "Assignments");
  const [groups,                    setGroups]                    = useState<AssignmentGroup[]>([{ id: 1, name: "Assignments" }]);
  const [points,                    setPoints]                    = useState(String(form?.points ?? 0));
  const [shuffleAnswers,            setShuffleAnswers]            = useState(form?.shuffleAnswers ?? false);
  const [allowMultipleResponses,    setAllowMultipleResponses]    = useState(form?.allowMultipleResponses ?? false);
  const [responseLimit,             setResponseLimit]             = useState(String(form?.responseLimit ?? ""));
  const [anonymousResponses,        setAnonymousResponses]        = useState(form?.anonymousResponses ?? false);
  const [showResultsToRespondents,  setShowResultsToRespondents]  = useState(form?.showResultsToRespondents ?? false);
  const [showOneAtATime,            setShowOneAtATime]            = useState(form?.showOneAtATime ?? false);
  const [lockQuestionsAfterAnswering, setLockQuestionsAfterAnswering] = useState(form?.lockQuestionsAfterAnswering ?? false);
  const [accessCodeEnabled,         setAccessCodeEnabled]         = useState(!!(form?.accessCode));
  const [accessCode,                setAccessCode]                = useState(form?.accessCode ?? "");
  const [confirmationMessage,       setConfirmationMessage]       = useState(form?.confirmationMessage ?? "");
  const [assignTo,                  setAssignTo]                  = useState<string[]>(form?.assignTo ?? ["Everyone"]);
  const [dueDate,                   setDueDate]                   = useState(form?.dueDate ?? "");
  const [dueTime,                   setDueTime]                   = useState(form?.dueTime ?? "");
  const [availableFrom,             setAvailableFrom]             = useState(form?.availableFrom ?? "");
  const [availableFromTime,         setAvailableFromTime]         = useState(form?.availableFromTime ?? "");
  const [availableUntil,            setAvailableUntil]            = useState(form?.availableUntil ?? "");
  const [availableUntilTime,        setAvailableUntilTime]        = useState(form?.availableUntilTime ?? "");
  const [notifyUsers,               setNotifyUsers]               = useState(false);
  const [groupModalOpen,            setGroupModalOpen]            = useState(false);
  const [newGroupName,              setNewGroupName]              = useState("");
  const [questions,                 setQuestions]                 = useState<FormQuestion[]>(form?.questions ?? []);

  const isGraded = formType === "Graded Assessment";
  const computedPoints = questions.filter(q => q.type !== "section").reduce((sum, q) => sum + (q.points || 0), 0);
  const displayPoints  = isGraded ? (questions.length > 0 ? computedPoints : (parseFloat(points) || 0)) : 0;

  useEffect(() => {
    if (isDemo) return;
    fetch(`/api/admin/courses/${courseId}/assignments`)
      .then(r => r.json())
      .then(d => {
        const list = d.assignments ?? [];
        const names: string[] = [...new Set<string>(list.map((a: { assignmentGroup: string }) => a.assignmentGroup || "Assignments"))];
        if (!names.includes("Assignments")) names.unshift("Assignments");
        setGroups(names.map((n, i) => ({ id: i + 1, name: n })));
      })
      .catch(() => {});
  }, [courseId, isDemo]);

  const handleSave = async (publish: boolean) => {
    setSaveError(null);
    if (!title.trim()) { setSaveError("Form Title is required."); return; }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(), description, formType, assignmentGroup,
        points: isGraded ? (questions.length > 0 ? computedPoints : (parseFloat(points) || 0)) : 0,
        shuffleAnswers, allowMultipleResponses,
        responseLimit: responseLimit ? parseInt(responseLimit) : null,
        anonymousResponses, showResultsToRespondents, showOneAtATime,
        lockQuestionsAfterAnswering, accessCode: accessCodeEnabled ? accessCode : "",
        confirmationMessage, assignTo, dueDate, dueTime, availableFrom,
        availableFromTime, availableUntil, availableUntilTime, published: publish, questions,
      }, publish);
      setPublished(publish);
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveGroup = () => {
    const n = newGroupName.trim();
    if (!n) return;
    if (!groups.find(g => g.name === n)) setGroups(p => [...p, { id: Date.now(), name: n }]);
    setAssignmentGroup(n);
    setGroupModalOpen(false);
    setNewGroupName("");
  };

  return (
    <div className="w-full h-full bg-white flex flex-col" suppressHydrationWarning>
      {/* Top bar */}
      <div className="flex items-center justify-end px-6 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          {isGraded && <span>Points <strong className="text-gray-800">{displayPoints}</strong></span>}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border"
              style={published ? { background: "#22c55e", borderColor: "#22c55e" } : { borderColor: "#9ca3af" }} />
            {published ? "Published" : "Not Published"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-end border-b border-gray-200 px-6 bg-white shrink-0">
        {(["details","questions","responses"] as const).map(key => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-xs border border-b-0 -mb-px mr-0.5 transition-colors rounded-t capitalize ${activeTab === key ? "bg-white border-gray-200 text-gray-900 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {key === "questions" ? (
              <span className="flex items-center gap-1">
                Questions
                {questions.length > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] text-white" style={{ background: MAROON }}>
                    {questions.filter(q => q.type !== "section").length}
                  </span>
                )}
              </span>
            ) : key === "responses" ? "After Submission" : "Details"}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-5">

        {/* ── Details Tab ── */}
        {activeTab === "details" && (
          <>
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">Form Title <span className="text-red-500">*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Untitled Form"
                className="w-full h-9 border rounded-sm px-3 text-sm outline-none"
                style={{ borderColor: MAROON }} />
            </div>

            <div className="mb-6">
              <label className="text-xs text-gray-500 block mb-1">Form Description / Instructions</label>
              <RichTextEditor value={description} onChange={setDescription} placeholder="Form description or instructions..." />
            </div>

            <div className="max-w-2xl">
              <div className="grid grid-cols-[180px_1fr] items-start gap-y-5 gap-x-4">

                <label className="text-xs text-gray-700 text-right pt-2">Form Type</label>
                <select value={formType} onChange={e => setFormType(e.target.value as Form["formType"])}
                  className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-72 bg-white outline-none focus:border-[#7b1113]">
                  <option>Survey / Feedback</option>
                  <option>Evaluation</option>
                  <option>Registration Form</option>
                  <option>Graded Assessment</option>
                </select>

                <label className="text-xs text-gray-700 text-right pt-2">Assignment Group</label>
                <select value={assignmentGroup}
                  onChange={e => {
                    if (e.target.value === "__create__") { setNewGroupName(""); setGroupModalOpen(true); }
                    else setAssignmentGroup(e.target.value);
                  }}
                  className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-72 bg-white outline-none focus:border-[#7b1113]">
                  {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                  <option value="__create__">[ Create Group ]</option>
                </select>

                {isGraded && (
                  <>
                    <label className="text-xs text-gray-700 text-right pt-2">Points</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0}
                        value={questions.length > 0 ? computedPoints : points}
                        onChange={e => setPoints(e.target.value)}
                        readOnly={questions.length > 0}
                        className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-72 outline-none focus:border-[#7b1113]"
                        style={questions.length > 0 ? { background: "#f9fafb", color: "#6b7280" } : {}} />
                      {questions.length > 0 && <span className="text-xs text-gray-400">(calculated from questions)</span>}
                    </div>
                  </>
                )}

                <label className="text-xs text-gray-700 text-right pt-2">Options</label>
                <div className="border border-gray-200 rounded-sm p-3 w-72 space-y-2.5">
                  {isGraded && (
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={shuffleAnswers} onChange={e => setShuffleAnswers(e.target.checked)} style={{ accentColor: MAROON }} />
                      Shuffle Answers
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={anonymousResponses} onChange={e => setAnonymousResponses(e.target.checked)} style={{ accentColor: MAROON }} />
                    Anonymous Responses
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={allowMultipleResponses} onChange={e => setAllowMultipleResponses(e.target.checked)} style={{ accentColor: MAROON }} />
                    Allow Multiple Responses
                  </label>
                  {allowMultipleResponses && (
                    <div className="pl-4 space-y-2 border-l-2" style={{ borderColor: "#e5e7eb" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 shrink-0">Response Limit</span>
                        <input type="number" value={responseLimit} onChange={e => setResponseLimit(e.target.value)} min="1" placeholder="No limit"
                          className="w-20 h-6 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" />
                      </div>
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={showResultsToRespondents} onChange={e => setShowResultsToRespondents(e.target.checked)} style={{ accentColor: MAROON }} />
                    Show Results to Respondents
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={showOneAtATime} onChange={e => setShowOneAtATime(e.target.checked)} style={{ accentColor: MAROON }} />
                    Show One Question at a Time
                  </label>
                  {showOneAtATime && (
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer pl-5">
                      <input type="checkbox" checked={lockQuestionsAfterAnswering} onChange={e => setLockQuestionsAfterAnswering(e.target.checked)} style={{ accentColor: MAROON }} />
                      Lock Questions After Answering
                    </label>
                  )}
                </div>

                <label className="text-xs text-gray-700 text-right pt-2">Restrictions</label>
                <div className="border border-gray-200 rounded-sm p-3 w-72 space-y-2.5">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={accessCodeEnabled} onChange={e => setAccessCodeEnabled(e.target.checked)} style={{ accentColor: MAROON }} />
                    Require an Access Code
                  </label>
                  {accessCodeEnabled && (
                    <input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value)}
                      placeholder="Enter access code"
                      className="w-full h-7 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" />
                  )}
                </div>

                <label className="text-xs text-gray-700 text-right pt-2">Assign</label>
                <div className="border border-gray-200 rounded-sm p-3 max-w-lg space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Assign To</p>
                    <AssignToDropdown selected={assignTo} setSelected={setAssignTo} sections={sections} staff={staff} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Due Date</p>
                    <div className="flex border border-gray-300 rounded-sm overflow-hidden">
                      <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                        className="flex-1 h-7 border-0 px-2 text-xs outline-none bg-white" />
                      <div className="w-px bg-gray-200 self-stretch" />
                      <select value={dueTime} onChange={e => setDueTime(e.target.value)}
                        className="h-7 border-0 px-2 text-xs bg-white outline-none w-28">
                        <option value="">Time</option>
                        {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => { setDueDate(""); setDueTime(""); }}
                      className="text-xs hover:underline mt-0.5" style={{ color: MAROON }}>Clear</button>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Available from</p>
                    <div className="flex border border-gray-300 rounded-sm overflow-hidden">
                      <input type="date" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)}
                        className="flex-1 h-7 border-0 px-2 text-xs outline-none bg-white" />
                      <div className="w-px bg-gray-200 self-stretch" />
                      <select value={availableFromTime} onChange={e => setAvailableFromTime(e.target.value)}
                        className="h-7 border-0 px-2 text-xs bg-white outline-none w-28">
                        <option value="">Time</option>
                        {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => { setAvailableFrom(""); setAvailableFromTime(""); }}
                      className="text-xs hover:underline mt-0.5" style={{ color: MAROON }}>Clear</button>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Until</p>
                    <div className="flex border border-gray-300 rounded-sm overflow-hidden">
                      <input type="date" value={availableUntil} onChange={e => setAvailableUntil(e.target.value)}
                        className="flex-1 h-7 border-0 px-2 text-xs outline-none bg-white" />
                      <div className="w-px bg-gray-200 self-stretch" />
                      <select value={availableUntilTime} onChange={e => setAvailableUntilTime(e.target.value)}
                        className="h-7 border-0 px-2 text-xs bg-white outline-none w-28">
                        <option value="">Time</option>
                        {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => { setAvailableUntil(""); setAvailableUntilTime(""); }}
                      className="text-xs hover:underline mt-0.5" style={{ color: MAROON }}>Clear</button>
                  </div>
                  <button type="button" className="w-full h-8 border border-gray-300 bg-gray-50 text-xs text-gray-600 rounded-sm hover:bg-gray-100 flex items-center justify-center gap-1">
                    + Assign To
                  </button>
                </div>

              </div>
            </div>

            <div className="mt-6 mb-4">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" checked={notifyUsers} onChange={e => setNotifyUsers(e.target.checked)} style={{ accentColor: MAROON }} />
                Notify users that this content has changed
              </label>
            </div>
          </>
        )}

        {/* ── Questions Tab ── */}
        {activeTab === "questions" && (
          <QuestionsTab questions={questions} isGraded={isGraded} onChange={setQuestions} />
        )}

        {/* ── After Submission Tab ── */}
        {activeTab === "responses" && (
          <div className="max-w-lg space-y-5">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Confirmation Message</label>
              <p className="text-xs text-gray-500 mb-2">This message is shown to respondents after they submit the form.</p>
              <textarea value={confirmationMessage} onChange={e => setConfirmationMessage(e.target.value)}
                placeholder="Thank you for completing this form." rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#7b1113] resize-none" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" checked={allowMultipleResponses} onChange={e => setAllowMultipleResponses(e.target.checked)} style={{ accentColor: MAROON }} />
                Show &quot;Submit another response&quot; button
              </label>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-700 mb-3">Preview</p>
              <SubmitConfirmationPreview message={confirmationMessage} allowMultiple={allowMultipleResponses} />
            </div>
          </div>
        )}
      </div>

      {/* Add Group Modal */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="w-96 bg-white shadow-xl border border-gray-200 rounded">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">Add Assignment Group</div>
              <button onClick={() => setGroupModalOpen(false)} className="w-6 h-6 flex items-center justify-center border rounded text-sm" style={{ borderColor: MAROON, color: MAROON }}>×</button>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-700">Group Name:</label>
                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveGroup()}
                  placeholder="e.g., Evaluation Group 1"
                  className="flex-1 h-8 border border-gray-300 px-2 text-xs outline-none focus:border-[#7b1113] rounded-sm" />
              </div>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex justify-end gap-2">
              <button onClick={() => setGroupModalOpen(false)} className="h-8 px-4 border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50 rounded">Cancel</button>
              <button onClick={saveGroup} style={{ background: MAROON }} className="h-8 px-4 text-white text-xs rounded hover:opacity-90">Add Group</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-8 py-3 flex items-center justify-between">
        <div>{saveError && <span className="text-xs text-red-600 font-medium">⚠ {saveError}</span>}</div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} disabled={saving}
            className="h-8 px-5 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="h-8 px-5 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50">
            {saving ? "Saving..." : "Save & Publish"}
          </button>
          <button onClick={() => handleSave(false)} disabled={saving}
            style={{ background: MAROON }} className="h-8 px-5 text-white text-xs rounded hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { cursor:pointer; filter:invert(13%) sepia(85%) saturate(2000%) hue-rotate(340deg) brightness(70%); opacity:0.7; }
        input[type="date"]::-webkit-calendar-picker-indicator:hover { opacity:1; }
        input[type="date"] { color-scheme:light; accent-color:#7b1113; }
        input[type="date"]::-webkit-datetime-edit-day-field:focus,
        input[type="date"]::-webkit-datetime-edit-month-field:focus,
        input[type="date"]::-webkit-datetime-edit-year-field:focus { background-color:#7b1113; color:#fff; border-radius:2px; }
      `}</style>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function CourseFormsPage({ courseId }: { courseId: string }) {
  const isDemo = !courseId;
  const [mode,         setMode]         = useState<"list" | "create" | "edit">("list");
  const [search,       setSearch]       = useState("");
  const [forms,        setForms]        = useState<Form[]>([]);
  const [editingForm,  setEditingForm]  = useState<Form | undefined>(undefined);
  const [sections,     setSections]     = useState<Section[]>([]);
  const [staff,        setStaff]        = useState<Staff[]>([]);

  useEffect(() => {
    if (isDemo) return;
    fetch(`/api/admin/courses/${courseId}/forms`)
      .then(r => r.json()).then(d => setForms(d.forms ?? [])).catch(() => {});
    fetch(`/api/admin/courses/${courseId}/sections`)
      .then(r => r.json()).then(d => { setSections(d.sections ?? []); setStaff(d.staff ?? []); }).catch(() => {});
  }, [courseId, isDemo]);

  const onSave = async (data: Partial<Form>, publish: boolean) => {
    if (isDemo) {
      if (editingForm) {
        setForms(prev => prev.map(f => f.id === editingForm.id ? { ...f, ...data, published: publish } : f));
      } else {
        const now = new Date();
        setForms(prev => [{
          id: Date.now(), questions: [],
          createdAt: now.toISOString(), createdAtLabel: now.toLocaleDateString(),
          ...data, published: publish,
        } as Form, ...prev]);
      }
      setMode("list"); setEditingForm(undefined); return;
    }

    const url = editingForm
      ? `/api/admin/courses/${courseId}/forms/${editingForm.id}`
      : `/api/admin/courses/${courseId}/forms`;
    const res = await fetch(url, {
      method: editingForm ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, published: publish }),
    });
    if (!res.ok) throw new Error("Save failed");
    const { form } = await res.json();
    if (editingForm) setForms(prev => prev.map(f => f.id === editingForm.id ? form : f));
    else setForms(prev => [form, ...prev]);
    setMode("list"); setEditingForm(undefined);
  };

  const onDelete = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this form?")) return;
    setForms(prev => prev.filter(f => f.id !== id));
    if (isDemo) return;
    await fetch(`/api/admin/courses/${courseId}/forms/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const onEdit = (id: string | number) => {
    const form = forms.find(f => f.id === id);
    if (!form) return;
    setEditingForm(form); setMode("edit");
  };

  const onTogglePublish = async (id: string | number) => {
    const form = forms.find(f => f.id === id);
    if (!form) return;
    setForms(prev => prev.map(f => f.id === id ? { ...f, published: !f.published } : f));
    if (isDemo) return;
    await fetch(`/api/admin/courses/${courseId}/forms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !form.published }),
    }).catch(() => {});
  };

  if (mode === "create" || mode === "edit") {
    return (
      <FormCreateEditView
        form={editingForm}
        courseId={courseId}
        sections={sections}
        staff={staff}
        onCancel={() => { setMode("list"); setEditingForm(undefined); }}
        onSave={onSave}
      />
    );
  }

  return (
    <FormsListView
      search={search} setSearch={setSearch}
      onCreate={() => { setEditingForm(undefined); setMode("create"); }}
      forms={forms} onDelete={onDelete} onEdit={onEdit} onTogglePublish={onTogglePublish}
    />
  );
}