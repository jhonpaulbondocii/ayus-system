"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

const MAROON = "#7b1113";

interface Announcement {
  id: string | number;
  title: string;
  bodyText: string;
  bodyHtml: string;
  author: string;
  createdAtIso: string;
  createdAtLabel: string;
  read: boolean;
  attachments?: AttachedFile[];
  assignTo?: string[];
  locked?: boolean;
  allowComments?: boolean;
  availableFrom?: string | null;
  availableUntil?: string | null;
}

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface Staff {
  id: string;
  name: string;
}

interface CurrentUser {
  id: string;
  name: string;
  courseRole?: string;
}

type FilterType = "All" | "Unread" | "Recent Activity";
type Mode = "list" | "create" | "detail";

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void
) {
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

// ─── DateTimeRow ──────────────────────────────────────────────────────────────
function DateTimeRow({
  label, date, time, onDateChange, onTimeChange, onClear, error,
}: {
  label: string; date: string; time: string;
  onDateChange: (v: string) => void; onTimeChange: (v: string) => void;
  onClear: () => void; error?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-700 mb-1">{label}</p>
      <div className={`flex border rounded-sm overflow-hidden ${error ? "border-red-500" : "border-gray-300"}`}>
        <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)}
          className="flex-1 h-8 border-0 px-2 text-xs outline-none bg-white min-w-0" />
        <div className="w-px bg-gray-200 self-stretch" />
        <select value={time} onChange={(e) => onTimeChange(e.target.value)}
          className="h-8 border-0 px-2 text-xs bg-white outline-none w-28 shrink-0">
          <option value="">Time</option>
          {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      <button type="button" onClick={onClear} className="text-xs hover:underline mt-0.5" style={{ color: MAROON }}>Clear</button>
    </div>
  );
}

// ─── Rich Text Modals ─────────────────────────────────────────────────────────
function WordCountModal({ text, chars, charsNoSpace, paragraphs, onClose }: {
  text: string; chars: number; charsNoSpace: number; paragraphs: number; onClose: () => void;
}) {
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-72 border border-gray-200" onClick={(e) => e.stopPropagation()}>
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

function FindReplaceModal({ html, onUpdate, onClose }: { html: string; onUpdate: (html: string) => void; onClose: () => void; }) {
  const [find, setFind] = useState(""); const [replace, setReplace] = useState(""); const [msg, setMsg] = useState("");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-80 max-w-full border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">Find and Replace</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div><label className="text-xs text-gray-500 block mb-1">Find</label>
            <input autoFocus value={find} onChange={(e) => setFind(e.target.value)} className="w-full h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" placeholder="Search text..." /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Replace with</label>
            <input value={replace} onChange={(e) => setReplace(e.target.value)} className="w-full h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" placeholder="Replacement..." /></div>
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

function HTMLEditorModal({ html: initialHtml, onUpdate, onClose }: { html: string; onUpdate: (html: string) => void; onClose: () => void; }) {
  const [html, setHtml] = useState(initialHtml);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-full max-w-xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">HTML Editor</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4">
          <textarea value={html} onChange={(e) => setHtml(e.target.value)} className="w-full h-56 border border-gray-300 rounded px-3 py-2 text-xs font-mono outline-none focus:border-[#7b1113] resize-none" />
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="h-7 px-3 border border-gray-300 text-xs text-gray-700 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onUpdate(html); onClose(); }} style={{ background: MAROON }} className="h-7 px-3 text-white text-xs rounded hover:opacity-90">Apply</button>
        </div>
      </div>
    </div>
  );
}

function ColorPickerModal({ type, onClose }: { type: "foreColor" | "backColor"; onClose: () => void; }) {
  const colors = type === "foreColor"
    ? ["#000000", "#374151", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"]
    : ["transparent", "#fef9c3", "#fce7f3", "#e0f2fe", "#dcfce7", "#ede9fe", "#ffedd5", "#fee2e2", "#d1fae5", "#f1f5f9"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded shadow-xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">{type === "foreColor" ? "Text Color" : "Background Color"}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="p-4 grid grid-cols-5 gap-2">
          {colors.map((c) => (
            <div key={c} title={c}
              style={{ background: c === "transparent" ? "linear-gradient(45deg,#ccc 25%,#fff 25%,#fff 75%,#ccc 75%)" : c }}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer hover:scale-110 transition-transform"
              onClick={() => { document.execCommand(type, false, c === "transparent" ? undefined : c); onClose(); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TablePicker({ onPick }: { onPick: (r: number, c: number) => void; }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const MAX = 8;
  return (
    <div className="p-2 min-w-40">
      <p className="text-[10px] text-gray-500 text-center mb-1.5 h-3">{hover.r > 0 ? `${hover.r} × ${hover.c} table` : "Select table size"}</p>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${MAX},18px)`, gap: 2 }}>
        {Array.from({ length: MAX * MAX }, (_, i) => {
          const r = Math.floor(i / MAX) + 1, c = (i % MAX) + 1;
          return <div key={i} onMouseEnter={() => setHover({ r, c })} onClick={() => onPick(r, c)}
            className={`w-4 h-4 border rounded-sm cursor-pointer transition-colors ${r <= hover.r && c <= hover.c ? "bg-blue-200 border-blue-400" : "bg-gray-50 border-gray-300"}`} />;
        })}
      </div>
    </div>
  );
}

const ChevronRight = () => (<svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>);

type MAction = { type: "action"; icon?: string; label: string; shortcut?: string; action: () => void; disabled?: boolean };
type MSep = { type: "sep" };
type MSub = { type: "sub"; icon?: string; label: string; children: (MAction | MSep | MSub)[]; picker?: boolean; onPick?: (r: number, c: number) => void };
type MItem = MAction | MSep | MSub;

function MenuItems({ items, onClose }: { items: MItem[]; onClose: () => void; }) {
  return (
    <>{items.map((item, i) => {
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
    })}</>
  );
}

function SubMenuItem({ item, onClose }: { item: MSub; onClose: () => void; }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="w-full text-left px-3 py-1 text-xs flex items-center gap-2 text-gray-700 hover:bg-blue-600 hover:text-white">
        <span className="w-4 text-center text-sm shrink-0">{item.icon ?? ""}</span>
        <span className="flex-1">{item.label}</span>
        <ChevronRight />
      </button>
      {open && (
        <div className="absolute left-full top-0 bg-white border border-gray-200 shadow-lg rounded-sm min-w-44 py-1 z-200">
          {item.picker ? <TablePicker onPick={(r, c) => { item.onPick?.(r, c); onClose(); }} /> : <MenuItems items={item.children} onClose={onClose} />}
        </div>
      )}
    </div>
  );
}

// ─── RichTextEditor ───────────────────────────────────────────────────────────
function RichTextEditor({ valueHtml, onChangeHtml, onChangeText, placeholder = "Announcement content..." }: {
  valueHtml: string; onChangeHtml: (html: string) => void; onChangeText: (text: string) => void; placeholder?: string;
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

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (valueHtml === "" && el.innerHTML !== "") el.innerHTML = "";
  }, [valueHtml]);

  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val ?? undefined);
  }, []);

  const fmt = useCallback((tag: string) => {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
  }, []);

  const insertHTML = useCallback((html: string) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
  }, []);

  const insertTable = useCallback((rows: number, cols: number) => {
    const hdr = `<tr>${Array(cols).fill(`<th style="border:1px solid #dee2e6;padding:6px 10px;background:#f7f9fb;font-weight:600;">&nbsp;</th>`).join("")}</tr>`;
    const bdy = Array(Math.max(rows - 1, 1)).fill(`<tr>${Array(cols).fill(`<td style="border:1px solid #dee2e6;padding:6px 10px;">&nbsp;</td>`).join("")}</tr>`).join("");
    insertHTML(`<table style="border-collapse:collapse;width:100%;margin:8px 0;"><thead>${hdr}</thead><tbody>${bdy}</tbody></table><p><br></p>`);
  }, [insertHTML]);

  const updateWC = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.innerText.trim() ?? "";
    setWordCount(text ? text.split(/\s+/).filter(Boolean).length : 0);
    onChangeHtml(el.innerHTML ?? "");
    onChangeText(text);
  }, [onChangeHtml, onChangeText]);

  const closeMenus = useCallback(() => setOpenMenu(null), []);

  const getEditorHtml = useCallback(() => editorRef.current?.innerHTML ?? "", []);

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
    const el = editorRef.current;
    if (!el) return;
    const t = el.innerText.trim() ?? "";
    setWcData({
      text: t,
      chars: el.innerText.length ?? 0,
      charsNoSpace: t.replace(/\s/g, "").length,
      paragraphs: el.querySelectorAll("p").length ?? 0,
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
    inp.type = "file";
    inp.accept = "image/*";
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
    const eq = prompt("Equation:");
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

  // ── menuDefinitions via useMemo so the linter knows these are
  // stable computed values and not ref accesses during render.
  const menuDefinitions = useMemo<{ label: string; items: MItem[] }[]>(() => [
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
      ],
    },
    {
      label: "View", items: [
        { type: "action", icon: "⛶", label: "Fullscreen", action: toggleFS },
        { type: "action", icon: "⊠", label: "Exit Fullscreen", action: toggleFS, disabled: !isFS },
        { type: "action", icon: "</>", label: "HTML Editor", action: openHtmlEditor },
      ],
    },
    {
      label: "Insert", items: [
        { type: "sub", icon: "🔗", label: "Link", children: [{ type: "action", label: "Insert/Edit Link", action: insertLink }, { type: "action", label: "Remove Link", action: () => exec("unlink") }] },
        { type: "sub", icon: "🖼", label: "Image", children: [{ type: "action", label: "Insert from URL", action: insertImageFromUrl }, { type: "action", label: "Upload image", action: uploadImage }] },
        { type: "sep" },
        { type: "action", icon: "∑", label: "Equation", action: insertEquation },
        { type: "sub", icon: "⊞", label: "Table", picker: true, children: [], onPick: (r: number, c: number) => insertTable(r, c) },
        { type: "action", icon: "—", label: "Horizontal line", action: insertHR },
      ],
    },
    {
      label: "Format", items: [
        { type: "action", icon: "B", label: "Bold", shortcut: "Ctrl+B", action: () => exec("bold") },
        { type: "action", icon: "I", label: "Italic", shortcut: "Ctrl+I", action: () => exec("italic") },
        { type: "action", icon: "U", label: "Underline", shortcut: "Ctrl+U", action: () => exec("underline") },
        { type: "action", icon: "S", label: "Strikethrough", action: () => exec("strikeThrough") },
        { type: "sep" },
        { type: "sub", icon: "¶", label: "Formats", children: [{ type: "action", label: "Heading 1", action: () => fmt("h1") }, { type: "action", label: "Heading 2", action: () => fmt("h2") }, { type: "action", label: "Heading 3", action: () => fmt("h3") }, { type: "action", label: "Paragraph", action: () => fmt("p") }] },
        { type: "sub", icon: "≡", label: "Align", children: [{ type: "action", label: "Left", action: () => exec("justifyLeft") }, { type: "action", label: "Center", action: () => exec("justifyCenter") }, { type: "action", label: "Right", action: () => exec("justifyRight") }, { type: "action", label: "Justify", action: () => exec("justifyFull") }] },
        { type: "sep" },
        { type: "action", icon: "A", label: "Text color", action: () => setShowColor("foreColor") },
        { type: "action", icon: "A", label: "Background color", action: () => setShowColor("backColor") },
        { type: "sep" },
        { type: "action", icon: "✕", label: "Clear formatting", action: () => exec("removeFormat") },
      ],
    },
    {
      label: "Tools", items: [
        { type: "action", icon: "≡", label: "Word Count", action: openWordCount },
        { type: "action", icon: "🔍", label: "Find and Replace", shortcut: "Ctrl+F", action: openFindReplace },
      ],
    },
    {
      label: "Table", items: [
        { type: "sub", icon: "⊞", label: "Table", picker: true, children: [], onPick: (r: number, c: number) => insertTable(r, c) },
        { type: "sep" },
        { type: "action", icon: "✕", label: "Delete table", action: deleteTable },
      ],
    },
  ], [exec, fmt, insertTable, insertHR, insertLink, insertImageFromUrl, uploadImage, insertEquation, deleteTable, toggleFS, isFS, openHtmlEditor, openWordCount, openFindReplace]);

  type ToolbarBtn =
    | { html: React.ReactNode; title: string }
    | { label: string; title: string; fn: () => void; style?: React.CSSProperties };

  // ── toolbarGroups via useMemo for the same reason
  const toolbarGroups = useMemo<ToolbarBtn[][]>(() => [
    [
      { html: (<select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => fmt(e.target.value)} defaultValue="p">{[["Paragraph", "p"], ["Heading 1", "h1"], ["Heading 2", "h2"], ["Heading 3", "h3"], ["Blockquote", "blockquote"], ["Code", "pre"]].map(([l, v]) => <option key={v} value={v}>{l}</option>)}</select>), title: "Block format" },
      { html: (<select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => e.target.value && exec("fontName", e.target.value)}>{[["Font", ""], ["Default", "inherit"], ["Arial", "Arial"], ["Georgia", "Georgia"], ["Monospace", "monospace"]].map(([l, v]) => <option key={l} value={v}>{l}</option>)}</select>), title: "Font" },
      { html: (<select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => exec("fontSize", e.target.value)} defaultValue="3">{[["8pt", "1"], ["10pt", "2"], ["12pt", "3"], ["14pt", "4"], ["18pt", "5"], ["24pt", "6"], ["36pt", "7"]].map(([l, v]) => <option key={v} value={v}>{l}</option>)}</select>), title: "Font size" },
    ],
    [
      { label: "B", title: "Bold", fn: () => exec("bold"), style: { fontWeight: 700 } },
      { label: "I", title: "Italic", fn: () => exec("italic"), style: { fontStyle: "italic" } },
      { label: "U", title: "Underline", fn: () => exec("underline"), style: { textDecoration: "underline" } },
      { label: "S\u0336", title: "Strikethrough", fn: () => exec("strikeThrough") },
    ],
    [
      { label: "A", title: "Text color", fn: () => setShowColor("foreColor"), style: { color: "#e74c3c", fontWeight: 700 } },
      { label: "A", title: "Bg color", fn: () => setShowColor("backColor"), style: { background: "linear-gradient(#fef9c3,#fef9c3) bottom/100% 4px no-repeat" } },
      { label: "x\u00b2", title: "Superscript", fn: () => exec("superscript") },
      { label: "x\u2082", title: "Subscript", fn: () => exec("subscript") },
    ],
    [
      { label: "🔗", title: "Link", fn: insertLink },
      { label: "🖼", title: "Image", fn: insertImageFromUrl },
    ],
    [
      { label: "≡", title: "Align left", fn: () => exec("justifyLeft") },
      { label: "≡", title: "Align center", fn: () => exec("justifyCenter") },
      { label: "≡", title: "Align right", fn: () => exec("justifyRight") },
    ],
    [
      { label: "1.", title: "Ordered list", fn: () => exec("insertOrderedList") },
      { label: "•", title: "Bullet list", fn: () => exec("insertUnorderedList") },
      { label: "⇥", title: "Indent", fn: () => exec("indent") },
      { label: "⇤", title: "Outdent", fn: () => exec("outdent") },
    ],
    [
      { label: "⊞", title: "Insert table", fn: () => insertTable(3, 3) },
      { label: "</>", title: "HTML editor", fn: openHtmlEditor },
      { label: "✕", title: "Clear formatting", fn: () => exec("removeFormat") },
    ],
  // After — add these lines between the useMemo and the return
  ], [exec, fmt, insertLink, insertImageFromUrl, insertTable, openHtmlEditor]);

  // Satisfy react-hooks/refs: copy memo values into state so JSX
  // reads from state (not a ref-closing variable) during render.
  const [menuDefs, setMenuDefs] = useState(() => menuDefinitions);
  useEffect(() => { setMenuDefs(menuDefinitions); }, [menuDefinitions]);

  const [toolbarDefs, setToolbarDefs] = useState(() => toolbarGroups);
  useEffect(() => { setToolbarDefs(toolbarGroups); }, [toolbarGroups]);

  return (
    <>
      {showWC && <WordCountModal text={wcData.text} chars={wcData.chars} charsNoSpace={wcData.charsNoSpace} paragraphs={wcData.paragraphs} onClose={() => setShowWC(false)} />}
      {showFR && <FindReplaceModal html={editorHtml} onUpdate={h => { if (editorRef.current) editorRef.current.innerHTML = h; updateWC(); }} onClose={() => setShowFR(false)} />}
      {showHTML && <HTMLEditorModal html={editorHtml} onUpdate={h => { if (editorRef.current) editorRef.current.innerHTML = h; updateWC(); }} onClose={() => setShowHTML(false)} />}
      {showColor && <ColorPickerModal type={showColor} onClose={() => setShowColor(null)} />}
      <div ref={wrapRef} className="border border-gray-300 rounded overflow-hidden flex flex-col" style={{ minHeight: 320 }}>
        {/* Menu bar */}
        <div data-menubar className="flex flex-wrap items-center gap-0.5 px-1 py-0.5 bg-[#f7f9fb] border-b border-gray-200 select-none">
          {menuDefs.map(m => (
            <div key={m.label} className="relative">
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  setOpenMenu(prev => prev === m.label ? null : m.label);
                }}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${openMenu === m.label ? "text-white" : "text-gray-700 hover:bg-gray-200"}`}
                style={openMenu === m.label ? { background: MAROON } : {}}
              >
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
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 bg-[#f7f9fb] border-b border-gray-200">
          {toolbarDefs.map((group, gi) => (
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
        {/* Editor area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={updateWC}
          onKeyUp={updateWC}
          onMouseUp={updateWC}
          data-placeholder={placeholder}
          className="flex-1 px-4 py-3 text-sm text-gray-800 outline-none overflow-y-auto"
          style={{ minHeight: 220, lineHeight: 1.7 }}
        />
        {/* Status bar */}
        <div className="flex items-center gap-4 px-3 py-1 bg-[#f7f9fb] border-t border-gray-200 text-xs text-gray-400">
          <span>{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
          <span
            className="ml-auto cursor-pointer hover:text-gray-600"
            onClick={() => { setEditorHtml(getEditorHtml()); setShowHTML(true); }}
            title="HTML Editor"
          >
            &lt;/&gt;
          </span>
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
        input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.7;}
        input[type="date"]::-webkit-datetime-edit-day-field:focus,
        input[type="date"]::-webkit-datetime-edit-month-field:focus,
        input[type="date"]::-webkit-datetime-edit-year-field:focus{background-color:#7b1113;color:#fff;border-radius:2px;}
      `}</style>
    </>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4"><p className="text-sm text-gray-600">{message}</p></div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onCancel} className="h-8 px-4 border border-gray-300 text-xs text-gray-700 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} style={{ background: danger ? "#dc2626" : MAROON }} className="h-8 px-4 text-white text-xs rounded hover:opacity-90">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── AttachButton ─────────────────────────────────────────────────────────────
function AttachButton({ attachments, onAdd, onRemove }: { attachments: AttachedFile[]; onAdd: (files: AttachedFile[]) => void; onRemove: (id: string) => void; }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true); setUploadError(null);
    const uploaded: AttachedFile[] = [];
    for (const f of Array.from(fileList)) {
      try {
        const formData = new FormData(); formData.append("file", f);
        const res = await fetch("/api/upload/announcement", { method: "POST", body: formData });
        if (!res.ok) throw new Error(`Failed to upload ${f.name}`);
        const { fileUrl } = await res.json();
        uploaded.push({ id: `${Date.now()}-${Math.random()}`, name: f.name, size: f.size, type: f.type, url: fileUrl });
      } catch { setUploadError(`Hindi na-upload ang "${f.name}". Subukan ulit.`); }
    }
    if (uploaded.length > 0) onAdd(uploaded);
    setUploading(false);
  };

  const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  const fileIcon = (type: string) => type.startsWith("image/") ? "🖼️" : type === "application/pdf" ? "📄" : type.includes("word") ? "📝" : type.includes("sheet") || type.includes("excel") ? "📊" : type.includes("zip") ? "🗜️" : "📎";

  return (
    <div>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} onClick={(e) => ((e.target as HTMLInputElement).value = "")} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        style={{ background: uploading ? "#a33a3c" : MAROON }}
        className="inline-flex items-center gap-2 text-sm text-white font-medium rounded px-4 py-1.5 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed">
        {uploading ? (<><svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Uploading...</>) : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>Attach</>)}
      </button>
      {uploadError && <p className="text-xs mt-1" style={{ color: MAROON }}>{uploadError}</p>}
      {attachments.length > 0 && (
        <div className="mt-2 space-y-1">
          {attachments.map((f) => (
            <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded bg-gray-50 text-xs text-gray-700">
              <span className="text-base leading-none">{fileIcon(f.type)}</span>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline" style={{ color: MAROON }} title={f.name}>{f.name}</a>
              <span className="text-gray-400 shrink-0">{formatSize(f.size)}</span>
              <button type="button" onClick={() => onRemove(f.id)} className="text-gray-300 hover:text-red-500 shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AssignToSelector ─────────────────────────────────────────────────────────
function AssignToSelector({ selected, setSelected, staff }: {
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  staff: Staff[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(boxRef, () => setOpen(false));

  const toggle = (name: string) => {
    setSelected((prev) => {
      if (name === "Everyone") return prev.includes("Everyone") ? [] : ["Everyone"];
      const without = prev.filter((x) => x !== "Everyone");
      return prev.includes(name) ? without.filter((x) => x !== name) : [...without, name];
    });
  };

  const filteredStaff = staff.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const showEveryone = "everyone".includes(search.toLowerCase());

  return (
    <div className="relative" ref={boxRef} onMouseDown={(e) => e.stopPropagation()}>
      <p className="text-xs text-gray-500 mb-1">Choose Everyone or specific staff members.</p>
      <div
        onMouseDown={(e) => { e.stopPropagation(); setOpen((v) => !v); setSearch(""); }}
        className="w-full min-h-10.5 border rounded-sm px-2 py-1.5 text-sm flex flex-wrap gap-1 items-center cursor-pointer bg-white select-none"
        style={{ borderColor: open ? MAROON : "#d1d5db" }}
      >
        {selected.length > 0
          ? selected.map((a) => (
            <span key={a} className="px-2 py-0.5 rounded text-xs flex items-center gap-1 text-white font-medium" style={{ background: MAROON }}>
              {a}
              <button type="button" onMouseDown={(e) => { e.stopPropagation(); toggle(a); }} className="hover:opacity-70 font-bold ml-0.5">×</button>
            </span>
          ))
          : <span className="text-gray-400 text-sm">Select audience...</span>}
        <span className="ml-auto text-gray-400 text-[10px] pl-2 shrink-0">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 shadow-lg rounded-sm mt-0.5 max-h-52 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
          <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white">
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
              className="w-full h-6 px-2 text-xs border border-gray-200 rounded outline-none focus:border-[#7b1113]" />
          </div>
          {showEveryone && (
            <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggle("Everyone"); }}
              className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
              style={{ color: selected.includes("Everyone") ? MAROON : "#374151", fontWeight: selected.includes("Everyone") ? 600 : 400 }}>
              <span>🌐 Everyone</span>
              {selected.includes("Everyone") && <span style={{ color: MAROON }}>✓</span>}
            </button>
          )}
          {filteredStaff.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 bg-gray-50">Staff</div>
              {filteredStaff.map((s) => (
                <button key={s.id} type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggle(s.name); }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                  style={{ color: selected.includes(s.name) ? MAROON : "#374151", fontWeight: selected.includes(s.name) ? 600 : 400 }}>
                  <span>{s.name}</span>
                  {selected.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                </button>
              ))}
            </>
          )}
          {!showEveryone && filteredStaff.length === 0 && (
            <p className="px-3 py-3 text-xs text-gray-400">No results</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ThreeDotMenu ─────────────────────────────────────────────────────────────
function ThreeDotMenu({ onDelete, onToggleLock, locked, allowComments, onToggleComments }: {
  onDelete: () => void; onToggleLock: () => void; locked?: boolean; allowComments?: boolean; onToggleComments: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1">⋮</button>
      {open && (
        <div className="absolute right-0 top-full z-50 bg-white border border-gray-200 rounded shadow-lg min-w-44" style={{ marginTop: 2 }}>
          <button type="button" onClick={() => { onDelete(); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>Delete
          </button>
          <button type="button" onClick={() => { onToggleLock(); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {locked ? <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></> : <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>}
            </svg>{locked ? "Unlock" : "Lock"}
          </button>
          <button type="button" onClick={() => { onToggleComments(); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            {allowComments ? "Disable Comments" : "Enable Comments"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;
  const n = role.toUpperCase();
  const styles: Record<string, React.CSSProperties> = {
    ADMIN: { background: "#fef2f2", color: MAROON, border: "1px solid #fecaca" },
    STAFF: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    TEACHER: { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" },
    STUDENT: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
  };
  return (
    <span style={{ ...(styles[n] ?? { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }), fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>{n}</span>
  );
}

function AuthorAvatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: MAROON, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {(name ?? "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

// ─── AnnouncementDetailView ───────────────────────────────────────────────────
function AnnouncementDetailView({ announcement, onBack, onDelete, onToggleLock, onToggleComments, courseId }: {
  announcement: Announcement; onBack: () => void;
  onDelete: (id: string | number) => void;
  onToggleLock: (id: string | number) => void;
  onToggleComments: (id: string | number) => void;
  courseId: string;
}) {
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<{ id: number; text: string; author: string; date: string }[]>([]);
  const [authorRole, setAuthorRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!courseId) return;
    fetch(`/api/admin/courses/${courseId}/people`)
      .then(r => r.json())
      .then(d => {
        const people: { name?: string; courseRole?: string }[] = d.people ?? d.enrollments ?? [];
        const found = people.find(p => p.name === announcement.author);
        if (found?.courseRole) setAuthorRole(found.courseRole);
      }).catch(() => {});
  }, [courseId, announcement.author]);

  const formatAudience = (assignTo?: string[]) => !assignTo || assignTo.length === 0 ? "Everyone" : assignTo.join(", ");

  const submitReply = () => {
    if (!replyText.trim()) return;
    setReplies(prev => [...prev, {
      id: Date.now(), text: replyText.trim(), author: "Admin",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
    }]);
    setReplyText("");
  };

  return (
    <div className="px-4 sm:px-8 py-4 sm:py-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm mb-4 hover:underline" style={{ color: MAROON }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back to Announcements
      </button>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="flex items-start gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
          <AuthorAvatar name={announcement.author} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800">{announcement.author}</span>
              {authorRole && <RoleBadge role={authorRole} />}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Posted {announcement.createdAtLabel}</div>
            <div className="text-xs text-gray-400 mt-0.5">To: {formatAudience(announcement.assignTo)}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {announcement.locked && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>Locked
              </span>
            )}
            <ThreeDotMenu
              onDelete={() => { onDelete(announcement.id); onBack(); }}
              onToggleLock={() => onToggleLock(announcement.id)}
              locked={announcement.locked}
              allowComments={announcement.allowComments}
              onToggleComments={() => onToggleComments(announcement.id)}
            />
          </div>
        </div>

        <div className="px-4 sm:px-6 py-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">{announcement.title}</h1>
          {announcement.bodyHtml
            ? <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: announcement.bodyHtml }} style={{ lineHeight: 1.8 }} />
            : announcement.bodyText
              ? <p className="text-sm text-gray-700 leading-relaxed">{announcement.bodyText}</p>
              : <p className="text-sm text-gray-400 italic">No content.</p>}
          {announcement.attachments && announcement.attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attachments</div>
              <div className="flex flex-wrap gap-2">
                {announcement.attachments.map((f) => (
                  <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors" style={{ color: MAROON }}>
                    📎 {f.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {announcement.locked ? (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-amber-50">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              This announcement is locked. Replies are disabled.
            </p>
          </div>
        ) : announcement.allowComments === false ? (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Comments are disabled for this announcement.
            </p>
          </div>
        ) : (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="text-sm font-semibold text-gray-700 mb-3">
              {replies.length > 0 ? `${replies.length} Repl${replies.length !== 1 ? "ies" : "y"}` : "Reply"}
            </div>
            {replies.length > 0 && (
              <div className="space-y-3 mb-4">
                {replies.map((r) => (
                  <div key={r.id} className="flex gap-3">
                    <AuthorAvatar name={r.author} size={32} />
                    <div className="flex-1 bg-white rounded border border-gray-200 px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">{r.author}</span>
                        <span className="text-xs text-gray-400">{r.date}</span>
                      </div>
                      <p className="text-sm text-gray-600">{r.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3 items-start">
              <AuthorAvatar name="Admin" size={32} />
              <div className="flex-1">
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..." rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none outline-none focus:border-[#7b1113] transition-colors"
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitReply(); }} />
                <div className="flex justify-end mt-2">
                  <button type="button" onClick={submitReply} disabled={!replyText.trim()} style={{ background: MAROON }}
                    className="h-8 px-4 text-white text-sm rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                    Post Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AnnouncementsListView ────────────────────────────────────────────────────
function AnnouncementsListView({ filter, setFilter, search, setSearch, onAdd, onMarkAllRead, announcements, onRemove, onToggleLock, onToggleComments, onView, selectedIds, setSelectedIds }: {
  filter: FilterType; setFilter: (v: FilterType) => void;
  search: string; setSearch: (v: string) => void;
  onAdd: () => void; onMarkAllRead: () => void;
  announcements: Announcement[];
  onRemove: (id: string | number) => void;
  onToggleLock: (id: string | number) => void;
  onToggleComments: (id: string | number) => void;
  onView: (id: string | number) => void;
  selectedIds: Set<string | number>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
}) {
  const [confirmDelete, setConfirmDelete] = useState<"single" | "bulk" | null>(null);
  const [confirmLock, setConfirmLock] = useState<"bulk" | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | number | null>(null);

  const hasSelection = selectedIds.size > 0;
  const allChecked = announcements.length > 0 && announcements.every((a) => selectedIds.has(a.id));
  const toggleAll = () => { if (allChecked) setSelectedIds(new Set()); else setSelectedIds(new Set(announcements.map((a) => a.id))); };
  const toggleOne = (id: string | number) => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const handleBulkDelete = () => { selectedIds.forEach((id) => onRemove(id)); setSelectedIds(new Set()); setConfirmDelete(null); };
  const handleSingleDelete = (id: string | number) => { onRemove(id); setPendingDeleteId(null); setConfirmDelete(null); };
  const handleBulkLock = () => { selectedIds.forEach((id) => onToggleLock(id)); setSelectedIds(new Set()); setConfirmLock(null); };
  const formatAudience = (assignTo?: string[]) => !assignTo || assignTo.length === 0 ? "Everyone" : assignTo.join(", ");

  return (
    <div className="px-3 sm:px-8 py-4 sm:py-6">
      {confirmDelete === "bulk" && <ConfirmModal title="Delete Announcements" message={`Delete ${selectedIds.size} announcement${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`} confirmLabel="Delete" danger onConfirm={handleBulkDelete} onCancel={() => setConfirmDelete(null)} />}
      {confirmDelete === "single" && pendingDeleteId !== null && <ConfirmModal title="Delete Announcement" message="Delete this announcement? This cannot be undone." confirmLabel="Delete" danger onConfirm={() => handleSingleDelete(pendingDeleteId)} onCancel={() => { setConfirmDelete(null); setPendingDeleteId(null); }} />}
      {confirmLock === "bulk" && <ConfirmModal title="Toggle Lock" message={`Toggle lock for ${selectedIds.size} announcement${selectedIds.size !== 1 ? "s" : ""}?`} confirmLabel="Confirm" onConfirm={handleBulkLock} onCancel={() => setConfirmLock(null)} />}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <select value={filter} onChange={(e) => setFilter(e.target.value as FilterType)}
            className="border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none appearance-none pr-8 h-9">
            {["All", "Unread", "Recent Activity"].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
        <div className="relative flex-1 min-w-36">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-3 h-9 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#7b1113]" />
        </div>
        <button type="button" onClick={onAdd} style={{ background: MAROON }} className="inline-flex items-center gap-1.5 px-3 h-9 rounded text-white text-sm font-medium hover:opacity-90 whitespace-nowrap">
          <span className="text-lg leading-none">＋</span><span className="hidden sm:inline">Add Announcement</span><span className="sm:hidden">Add</span>
        </button>
        <button type="button" onClick={onMarkAllRead} className="inline-flex items-center gap-1.5 text-sm border border-gray-300 px-3 h-9 rounded hover:bg-gray-50 text-gray-700 whitespace-nowrap">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          <span className="hidden sm:inline">Mark All Read</span>
        </button>
        <button type="button" disabled={!hasSelection} onClick={() => hasSelection && setConfirmDelete("bulk")}
          className="inline-flex items-center justify-center w-9 h-9 border rounded transition-colors"
          style={{ borderColor: hasSelection ? "#ef4444" : "#d1d5db", color: hasSelection ? "#ef4444" : "#d1d5db", background: "white", cursor: hasSelection ? "pointer" : "not-allowed", opacity: hasSelection ? 1 : 0.45 }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
        </button>
        <button type="button" disabled={!hasSelection} onClick={() => hasSelection && setConfirmLock("bulk")}
          className="inline-flex items-center justify-center w-9 h-9 border rounded transition-colors"
          style={{ borderColor: hasSelection ? MAROON : "#d1d5db", color: hasSelection ? MAROON : "#d1d5db", background: "white", cursor: hasSelection ? "pointer" : "not-allowed", opacity: hasSelection ? 1 : 0.45 }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </button>
      </div>

      {hasSelection && (
        <div className="mb-2 text-xs text-gray-500 flex items-center gap-2">
          <span className="font-medium" style={{ color: MAROON }}>{selectedIds.size}</span> selected
          <button type="button" onClick={() => setSelectedIds(new Set())} className="underline hover:no-underline text-gray-400">Clear</button>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-3">📢</div>
          <div className="text-lg font-semibold text-gray-700">No Announcements</div>
          <div className="text-sm text-gray-500 mt-1">Create an announcement above</div>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          <div className="flex items-center gap-3 py-2 px-1">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300" style={{ accentColor: MAROON }} title="Select all" />
            <span className="text-xs text-gray-400">Select all</span>
          </div>
          {announcements.map((a) => (
            <div key={a.id} className="flex items-start gap-3 py-4 hover:bg-gray-50 transition-colors px-1"
              style={{ background: selectedIds.has(a.id) ? "#fef9f9" : undefined }}>
              <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleOne(a.id)}
                className="mt-1 h-4 w-4 rounded border-gray-300 shrink-0" style={{ accentColor: MAROON }} />
              <AuthorAvatar name={a.author} size={34} />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(a.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  {!a.read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: MAROON }} />}
                  <h3 className="text-sm font-semibold hover:underline" style={{ color: MAROON }}>{a.title}</h3>
                  {a.locked && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>Locked
                    </span>
                  )}
                  {a.allowComments === false && <span className="text-xs text-gray-400 hidden sm:inline">Comments off</span>}
                </div>
                <div className="text-xs text-gray-700 mt-1 font-semibold">{a.author}</div>
                <div className="text-xs text-gray-400">To: {formatAudience(a.assignTo)}</div>
                {a.bodyText && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.bodyText}</p>}
                {a.attachments && a.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    {a.attachments.map((f) => (
                      <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100" style={{ color: MAROON }}>
                        📎 {f.name}
                      </a>
                    ))}
                  </div>
                )}
                <button type="button" onClick={(e) => { e.stopPropagation(); onView(a.id); }}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs hover:underline" style={{ color: MAROON }}>
                  ↩ Reply
                </button>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <ThreeDotMenu
                  onDelete={() => { setPendingDeleteId(a.id); setConfirmDelete("single"); }}
                  onToggleLock={() => onToggleLock(a.id)}
                  locked={a.locked}
                  allowComments={a.allowComments}
                  onToggleComments={() => onToggleComments(a.id)}
                />
                <div className="text-right text-xs text-gray-500 leading-snug hidden sm:block">
                  <div>Posted:</div><div>{a.createdAtLabel}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AnnouncementCreateView ───────────────────────────────────────────────────
export function AnnouncementCreateView(props: {
  isCoursePublished: boolean;
  topicTitle: string; setTopicTitle: (v: string) => void;
  bodyHtml: string; setBodyHtml: (v: string) => void; setBodyText: (v: string) => void;
  attachments: AttachedFile[];
  onAddAttachments: (files: AttachedFile[]) => void;
  onRemoveAttachment: (id: string) => void;
  assignTo: string[]; setAssignTo: React.Dispatch<React.SetStateAction<string[]>>;
  staff: Staff[];
  allowComment: boolean; setAllowComment: (v: boolean) => void;
  availableFromDate: string; setAvailableFromDate: (v: string) => void;
  availableFromTime: string; setAvailableFromTime: (v: string) => void;
  untilDate: string; setUntilDate: (v: string) => void;
  untilTime: string; setUntilTime: (v: string) => void;
  onCancel: () => void; onPublish: () => void; onResetUntil: () => void;
  isPublishing: boolean;
}) {
  const {
    isCoursePublished, topicTitle, setTopicTitle, bodyHtml, setBodyHtml, setBodyText,
    attachments, onAddAttachments, onRemoveAttachment, assignTo, setAssignTo, staff,
    allowComment, setAllowComment,
    availableFromDate, setAvailableFromDate, availableFromTime, setAvailableFromTime,
    untilDate, setUntilDate, untilTime, setUntilTime,
    onCancel, onPublish, onResetUntil, isPublishing,
  } = props;

  return (
    <div className="px-3 sm:px-8 py-4 sm:py-6">
      <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
        <div className="text-sm font-medium py-3 border-b-2 -mb-px" style={{ borderColor: MAROON, color: "#374151" }}>Details</div>
      </div>
      {!isCoursePublished && (
        <div className="mb-4 flex items-start gap-3 border border-orange-300 bg-orange-50 text-orange-900 rounded px-4 py-3">
          <div className="mt-0.5 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm shrink-0">!</div>
          <p className="text-sm leading-relaxed">Notifications will not be sent retroactively for announcements created before publishing your course or before the course start date.</p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-800 mb-2">Topic Title *</label>
        <input value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} placeholder="Topic Title"
          className="w-full h-9 border rounded-sm px-3 text-sm outline-none focus:ring-1 transition-all"
          style={{ borderColor: MAROON }} />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-800 mb-2">Topic Content</label>
        <RichTextEditor valueHtml={bodyHtml} onChangeHtml={setBodyHtml} onChangeText={setBodyText} />
      </div>

      <div className="mb-6">
        <AttachButton attachments={attachments} onAdd={onAddAttachments} onRemove={onRemoveAttachment} />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-800 mb-2">Assign To</label>
        <AssignToSelector selected={assignTo} setSelected={setAssignTo} staff={staff} />
      </div>

      <div className="mb-6">
        <div className="text-sm font-medium text-gray-800 mb-3">Options</div>
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
          <input type="checkbox" checked={allowComment} onChange={(e) => setAllowComment(e.target.checked)}
            className="h-4 w-4 rounded" style={{ accentColor: MAROON }} />
          Allow Participants to Comment
        </label>
      </div>

      <div className="mb-8 border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="text-sm font-medium text-gray-800 mb-4">Scheduling</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium text-gray-800 mb-2">Available From</div>
            <DateTimeRow label="Date & Time" date={availableFromDate} time={availableFromTime}
              onDateChange={setAvailableFromDate} onTimeChange={setAvailableFromTime}
              onClear={() => { setAvailableFromDate(""); setAvailableFromTime(""); }} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800 mb-2">Until</div>
            <DateTimeRow label="Date & Time" date={untilDate} time={untilTime}
              onDateChange={setUntilDate} onTimeChange={setUntilTime} onClear={onResetUntil} />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <button onClick={onCancel} disabled={isPublishing} type="button"
          className="text-sm border border-gray-300 rounded px-4 py-2 hover:bg-gray-50 disabled:opacity-60 order-2 sm:order-1">Cancel</button>
        <button onClick={onPublish} disabled={isPublishing || !topicTitle.trim()} type="button"
          style={{ background: MAROON }}
          className="text-sm text-white rounded px-5 py-2 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 order-1 sm:order-2">
          {isPublishing
            ? (<><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Publishing...</>)
            : "Publish"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CourseAnnouncementsPage({
  isCoursePublished = true,
  courseId = "",
}: {
  isCoursePublished?: boolean;
  courseId?: string;
}) {
  const [mode, setMode] = useState<Mode>("list");
  const [isPublishing, setIsPublishing] = useState(false);
  const [viewingId, setViewingId] = useState<string | number | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filter, setFilter] = useState<FilterType>("All");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Form state
  const [topicTitle, setTopicTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [assignTo, setAssignTo] = useState<string[]>(["Everyone"]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [allowComment, setAllowComment] = useState(true);
  const [availableFromDate, setAvailableFromDate] = useState("");
  const [availableFromTime, setAvailableFromTime] = useState("");
  const [untilDate, setUntilDate] = useState("");
  const [untilTime, setUntilTime] = useState("");

  useEffect(() => {
    if (!courseId) return;

    fetch("/api/profile").then(r => r.json()).then(d => {
      if (d.user) {
        setCurrentUser({ id: d.user.id, name: d.user.name });
        fetch(`/api/admin/courses/${courseId}/people`).then(r2 => r2.json()).then(d2 => {
          const people: { id?: string; userId?: string; courseRole?: string }[] = d2.people ?? d2.enrollments ?? [];
          const found = people.find(p => p.id === d.user.id || p.userId === d.user.id);
          if (found?.courseRole) setCurrentUser(prev => prev ? { ...prev, courseRole: found.courseRole } : prev);
        }).catch(() => {});
      }
    }).catch(() => {});

    fetch(`/api/admin/courses/${courseId}/announcements`)
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        setAnnouncements((d.announcements ?? []).map((a: {
          id: string; title: string; bodyText: string; bodyHtml: string; author: string;
          createdAt: string; assignTo: string[];
          attachments: { id: string; name: string; size: number; mimeType: string; url: string }[];
          locked?: boolean; allowComments?: boolean;
          availableFrom?: string | null; availableUntil?: string | null;
        }): Announcement => ({
          id: a.id, title: a.title, bodyText: a.bodyText, bodyHtml: a.bodyHtml, author: a.author,
          createdAtIso: a.createdAt,
          createdAtLabel: new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
          read: false,
          attachments: (a.attachments ?? []).map(f => ({ id: f.id, name: f.name, size: f.size, type: f.mimeType, url: f.url })),
          assignTo: a.assignTo ?? ["Everyone"],
          locked: a.locked ?? false,
          allowComments: a.allowComments ?? true,
          availableFrom: a.availableFrom ?? null,
          availableUntil: a.availableUntil ?? null,
        })));
      })
      .catch(() => setAnnouncements([]));

    fetch(`/api/admin/courses/${courseId}/people`)
      .then(r => r.json())
      .then(d => {
        const people: { id?: string; userId?: string; name?: string; courseRole?: string }[] = d.people ?? d.enrollments ?? [];
        const staffList = people
          .filter(p => p.courseRole && p.courseRole.toLowerCase() === "staff")
          .map(p => ({ id: p.userId ?? p.id ?? "", name: p.name ?? "" }))
          .filter(p => p.id && p.name);
        setStaff(staffList);
      })
      .catch(() => setStaff([]));
  }, [courseId]);

  const onMarkAllRead = () => setAnnouncements(prev => prev.map(a => ({ ...a, read: true })));

  const onRemove = async (id: string | number) => {
    setAnnouncements(prev => prev.filter(x => x.id !== id));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    if (!courseId) return;
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    } catch (err) { console.error(err); }
  };

  const onToggleLock = async (id: string | number) => {
  const current = announcements.find(a => a.id === id);
  const newValue = current ? !current.locked : true;
  setAnnouncements(prev =>
    prev.map(a => a.id === id ? { ...a, locked: newValue } : a)
  );
  if (!courseId) return;
  try {
    const res = await fetch(`/api/admin/courses/${courseId}/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: newValue }),
    });
    if (!res.ok) throw new Error("Failed");
  } catch {
    setAnnouncements(prev =>
      prev.map(a => a.id === id ? { ...a, locked: !newValue } : a)
    );
  }
};

  const onToggleComments = async (id: string | number) => {
  const current = announcements.find(a => a.id === id);
  const newValue = current ? !current.allowComments : false;
  setAnnouncements(prev =>
    prev.map(a => a.id === id ? { ...a, allowComments: newValue } : a)
  );
  if (!courseId) return;
  try {
    const res = await fetch(`/api/admin/courses/${courseId}/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowComments: newValue }),
    });
    if (!res.ok) throw new Error("Failed");
  } catch {
    setAnnouncements(prev =>
      prev.map(a => a.id === id ? { ...a, allowComments: !newValue } : a)
    );
  }
};

  const onAddAttachments = (files: AttachedFile[]) => setAttachments(prev => [...prev, ...files]);
  const onRemoveAttachment = (id: string) => setAttachments(prev => prev.filter(f => f.id !== id));

  const filteredAnnouncements = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const latest = announcements.reduce<number | null>((acc, a) => {
      const t = Date.parse(a.createdAtIso);
      return isNaN(t) ? acc : acc === null ? t : Math.max(acc, t);
    }, null);
    return announcements.filter(a => {
      const matchSearch = !q || a.title.toLowerCase().includes(q) || (a.bodyText ?? "").toLowerCase().includes(q);
      const matchFilter =
        filter === "All" ||
        (filter === "Unread" && !a.read) ||
        (filter === "Recent Activity" && latest !== null && latest - Date.parse(a.createdAtIso) <= sevenDaysMs);
      return matchFilter && matchSearch;
    });
  }, [announcements, filter, search]);

  const resetCreateForm = () => {
    setTopicTitle(""); setBodyHtml(""); setBodyText(""); setAttachments([]);
    setAssignTo(["Everyone"]); setAllowComment(true);
    setAvailableFromDate(""); setAvailableFromTime(""); setUntilDate(""); setUntilTime("");
  };

  const onPublish = async () => {
    if (!topicTitle.trim()) return;
    const authorName = currentUser?.name ?? "Admin";
    const availableFromIso = availableFromDate ? `${availableFromDate}T${availableFromTime || "00:00"}` : null;
    const availableUntilIso = untilDate ? `${untilDate}T${untilTime || "00:00"}` : null;

    if (!courseId) {
      const now = new Date();
      setAnnouncements(prev => [{
        id: Date.now(), title: topicTitle.trim(), bodyText: bodyText.trim(), bodyHtml, author: authorName,
        createdAtIso: now.toISOString(),
        createdAtLabel: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
        read: false, attachments: [...attachments],
        assignTo: assignTo.length ? assignTo : ["Everyone"],
        locked: false, allowComments: allowComment,
        availableFrom: availableFromIso, availableUntil: availableUntilIso,
      }, ...prev]);
      resetCreateForm(); setMode("list"); return;
    }

    setIsPublishing(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  title: topicTitle.trim(), bodyText: bodyText.trim(), bodyHtml, author: authorName,
  assignTo: assignTo.length ? assignTo : ["Everyone"],
  allowComments: allowComment,
  availableFrom: availableFromIso,
  availableUntil: availableUntilIso,
  attachments: attachments.map(f => ({ name: f.name, url: f.url, size: f.size, mimeType: f.type })),
}),
      });
      if (!res.ok) throw new Error("Failed to publish");
      const { announcement } = await res.json();
      setAnnouncements(prev => [{
        id: announcement.id, title: announcement.title, bodyText: announcement.bodyText, bodyHtml: announcement.bodyHtml,
        author: announcement.author, createdAtIso: announcement.createdAt,
        createdAtLabel: new Date(announcement.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
        read: false,
        attachments: (announcement.attachments ?? []).map((a: { id: string; name: string; size: number; mimeType: string; url: string }) => ({ id: a.id, name: a.name, size: a.size, type: a.mimeType, url: a.url })),
        assignTo: announcement.assignTo,
        locked: false, allowComments: allowComment,
        availableFrom: announcement.availableFrom ?? null,
        availableUntil: announcement.availableUntil ?? null,
      }, ...prev]);
      resetCreateForm(); setMode("list");
    } catch (err) {
      console.error(err);
      alert("Hindi ma-publish ang announcement. Subukan ulit.");
    } finally {
      setIsPublishing(false);
    }
  };

  const onCancel = () => { resetCreateForm(); setMode("list"); };
  const onResetUntil = () => { setUntilDate(""); setUntilTime(""); };
  const onView = (id: string | number) => {
    setViewingId(id); setMode("detail");
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const viewingAnnouncement = announcements.find(a => a.id === viewingId) ?? null;

  if (mode === "detail" && viewingAnnouncement) {
    return (
      <AnnouncementDetailView
        announcement={viewingAnnouncement}
        courseId={courseId}
        onBack={() => { setMode("list"); setViewingId(null); }}
        onDelete={onRemove}
        onToggleLock={onToggleLock}
        onToggleComments={onToggleComments}
      />
    );
  }

  if (mode === "create") {
    return (
      <AnnouncementCreateView
        isCoursePublished={isCoursePublished}
        topicTitle={topicTitle} setTopicTitle={setTopicTitle}
        bodyHtml={bodyHtml} setBodyHtml={setBodyHtml} setBodyText={setBodyText}
        attachments={attachments} onAddAttachments={onAddAttachments} onRemoveAttachment={onRemoveAttachment}
        assignTo={assignTo} setAssignTo={setAssignTo} staff={staff}
        allowComment={allowComment} setAllowComment={setAllowComment}
        availableFromDate={availableFromDate} setAvailableFromDate={setAvailableFromDate}
        availableFromTime={availableFromTime} setAvailableFromTime={setAvailableFromTime}
        untilDate={untilDate} setUntilDate={setUntilDate} untilTime={untilTime} setUntilTime={setUntilTime}
        onCancel={onCancel} onPublish={onPublish} onResetUntil={onResetUntil} isPublishing={isPublishing}
      />
    );
  }

  return (
    <AnnouncementsListView
      filter={filter} setFilter={setFilter} search={search} setSearch={setSearch}
      onAdd={() => setMode("create")} onMarkAllRead={onMarkAllRead}
      announcements={filteredAnnouncements}
      onRemove={onRemove} onToggleLock={onToggleLock} onToggleComments={onToggleComments}
      onView={onView} selectedIds={selectedIds} setSelectedIds={setSelectedIds}
    />
  );
}