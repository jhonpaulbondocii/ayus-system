"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

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
  pinned?: boolean;
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

function groupAnnouncementsByDate(announcements: Announcement[]): { label: string; items: Announcement[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, Announcement[]> = {
    Today: [],
    Yesterday: [],
    "This week": [],
    Older: [],
  };

  for (const a of announcements) {
    const d = new Date(a.createdAtIso);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups["Today"].push(a);
    else if (day >= yesterday) groups["Yesterday"].push(a);
    else if (day >= weekAgo) groups["This week"].push(a);
    else groups["Older"].push(a);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
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
    <div className="w-full">
      <p className="text-xs font-medium text-gray-700 mb-1">{label}</p>
      <div className={`flex flex-col gap-1.5 sm:flex-row sm:gap-0 border rounded-sm overflow-hidden ${error ? "border-red-500" : "border-gray-300"}`}>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full h-9 border-0 px-2 text-xs outline-none bg-white sm:border-r sm:border-gray-200"
          style={{ minWidth: 0 }}
        />
        <select
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-full h-9 border-0 border-t border-gray-200 sm:border-t-0 px-2 text-xs bg-white outline-none sm:w-auto sm:min-w-[110px]"
        >
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
      <div className="bg-white rounded shadow-xl w-72 max-w-full border border-gray-200" onClick={(e) => e.stopPropagation()}>
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
          <button onClick={onClose} style={{ background: MAROON }} className="h-8 px-4 text-white text-xs rounded hover:opacity-90">Close</button>
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
      <div className="bg-white rounded shadow-xl w-full max-w-sm border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">Find and Replace</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div><label className="text-xs text-gray-500 block mb-1">Find</label>
            <input autoFocus value={find} onChange={(e) => setFind(e.target.value)} className="w-full h-9 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" placeholder="Search text..." /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Replace with</label>
            <input value={replace} onChange={(e) => setReplace(e.target.value)} className="w-full h-9 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" placeholder="Replacement..." /></div>
          {msg && <p className="text-xs" style={{ color: MAROON }}>{msg}</p>}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="h-8 px-3 border border-gray-300 text-xs text-gray-700 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={() => doReplace(false)} className="h-8 px-3 border border-gray-300 text-xs text-gray-700 rounded hover:bg-gray-50">Replace</button>
          <button onClick={() => doReplace(true)} style={{ background: MAROON }} className="h-8 px-3 text-white text-xs rounded hover:opacity-90">Replace All</button>
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
          <button onClick={onClose} className="h-8 px-3 border border-gray-300 text-xs text-gray-700 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onUpdate(html); onClose(); }} style={{ background: MAROON }} className="h-8 px-3 text-white text-xs rounded hover:opacity-90">Apply</button>
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
      <div className="bg-white rounded shadow-xl border border-gray-200 max-w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">{type === "foreColor" ? "Text Color" : "Background Color"}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none ml-4">×</button>
        </div>
        <div className="p-4 grid grid-cols-5 gap-2">
          {colors.map((c) => (
            <div key={c} title={c}
              style={{ background: c === "transparent" ? "linear-gradient(45deg,#ccc 25%,#fff 25%,#fff 75%,#ccc 75%)" : c }}
              className="w-9 h-9 rounded border border-gray-200 cursor-pointer hover:scale-110 transition-transform"
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

const ChevronRightIcon = () => (<svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>);

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
          className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${item.disabled ? "text-gray-300" : "text-gray-700 hover:bg-blue-600 hover:text-white"}`}>
          <span className="w-4 text-center text-sm shrink-0">{item.icon ?? ""}</span>
          <span className="flex-1">{item.label}</span>
          {item.shortcut && <span className="font-mono text-[10px] opacity-60 shrink-0 hidden sm:inline">{item.shortcut}</span>}
        </button>
      );
    })}</>
  );
}

function SubMenuItem({ item, onClose }: { item: MSub; onClose: () => void; }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-gray-700 hover:bg-blue-600 hover:text-white">
        <span className="w-4 text-center text-sm shrink-0">{item.icon ?? ""}</span>
        <span className="flex-1">{item.label}</span>
        <ChevronRightIcon />
      </button>
      {open && (
        <div className="absolute left-full top-0 bg-white border border-gray-200 shadow-lg rounded-sm min-w-44 py-1 z-[200]">
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
    setWcData({ text: t, chars: el.innerText.length ?? 0, charsNoSpace: t.replace(/\s/g, "").length, paragraphs: el.querySelectorAll("p").length ?? 0 });
    setShowWC(true);
  }, []);

  const openFindReplace = useCallback(() => { setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowFR(true); }, []);
  const openHtmlEditor = useCallback(() => { setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowHTML(true); }, []);

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
      const f = inp.files?.[0]; if (!f) return;
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

  const toolbarGroups = useMemo<ToolbarBtn[][]>(() => [
    [
      { html: (<select className="h-7 border border-gray-300 rounded text-xs bg-white px-1 outline-none max-w-[100px]" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => fmt(e.target.value)} defaultValue="p">{[["Para", "p"], ["H1", "h1"], ["H2", "h2"], ["H3", "h3"], ["Quote", "blockquote"], ["Code", "pre"]].map(([l, v]) => <option key={v} value={v}>{l}</option>)}</select>), title: "Block format" },
      { html: (<select className="h-7 border border-gray-300 rounded text-xs bg-white px-1 outline-none max-w-[80px]" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => e.target.value && exec("fontName", e.target.value)}>{[["Font", ""], ["Default", "inherit"], ["Arial", "Arial"], ["Georgia", "Georgia"], ["Mono", "monospace"]].map(([l, v]) => <option key={l} value={v}>{l}</option>)}</select>), title: "Font" },
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
      { label: "x²", title: "Superscript", fn: () => exec("superscript") },
      { label: "x₂", title: "Subscript", fn: () => exec("subscript") },
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
  ], [exec, fmt, insertLink, insertImageFromUrl, insertTable, openHtmlEditor]);

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

      <div ref={wrapRef} className="border border-gray-300 rounded overflow-hidden flex flex-col" style={{ minHeight: 300 }}>
        <div data-menubar className="rte-menubar flex items-center gap-0.5 px-1 py-0.5 bg-[#f7f9fb] border-b border-gray-200 select-none overflow-x-auto">
          {menuDefs.map(m => (
            <div key={m.label} className="relative shrink-0">
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); setOpenMenu(prev => prev === m.label ? null : m.label); }}
                className={`px-2 py-0.5 text-xs rounded transition-colors whitespace-nowrap ${openMenu === m.label ? "text-white" : "text-gray-700 hover:bg-gray-200"}`}
                style={openMenu === m.label ? { background: MAROON } : {}}
              >
                {m.label}
              </button>
              {openMenu === m.label && (
                <div className="absolute left-0 top-full mt-0.5 bg-white border border-gray-200 shadow-lg rounded-sm min-w-48 py-1 z-[150]">
                  <MenuItems items={m.items} onClose={closeMenus} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 bg-[#f7f9fb] border-b border-gray-200">
          {toolbarDefs.map((group, gi) => (
            <div key={gi} className="flex items-center gap-0.5 flex-wrap">
              {gi > 0 && <div className="w-px h-5 bg-gray-300 mx-0.5 hidden sm:block" />}
              {group.map((btn, bi) => {
                if ("html" in btn) return <div key={bi} title={btn.title}>{btn.html}</div>;
                return (
                  <button key={bi} type="button" title={(btn as { title: string }).title}
                    style={(btn as { style?: React.CSSProperties }).style}
                    onMouseDown={e => { e.preventDefault(); (btn as { fn: () => void }).fn?.(); }}
                    className="h-7 min-w-[28px] px-1 border border-transparent rounded text-xs hover:bg-blue-50 hover:border-blue-200 text-gray-700 flex items-center justify-center">
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
          onInput={updateWC}
          onKeyUp={updateWC}
          onMouseUp={updateWC}
          data-placeholder={placeholder}
          className="flex-1 px-3 sm:px-4 py-3 text-sm text-gray-800 outline-none overflow-y-auto"
          style={{ minHeight: 200, lineHeight: 1.7 }}
        />

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
        .rte-menubar::-webkit-scrollbar{display:none}
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
        className="inline-flex items-center gap-2 text-sm text-white font-medium rounded px-4 py-1.5 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed min-h-[36px]">
        {uploading
          ? (<><svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Uploading...</>)
          : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>Attach</>)}
      </button>
      {uploadError && <p className="text-xs mt-1" style={{ color: MAROON }}>{uploadError}</p>}
      {attachments.length > 0 && (
        <div className="mt-2 space-y-1">
          {attachments.map((f) => (
            <div key={f.id} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded bg-gray-50 text-xs text-gray-700">
              <span className="text-base leading-none shrink-0">{fileIcon(f.type)}</span>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline min-w-0" style={{ color: MAROON }} title={f.name}>{f.name}</a>
              <span className="text-gray-400 shrink-0">{formatSize(f.size)}</span>
              <button type="button" onClick={() => onRemove(f.id)} className="text-gray-300 hover:text-red-500 shrink-0 ml-1">✕</button>
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
        className="w-full min-h-[42px] border rounded-sm px-2 py-1.5 text-sm flex flex-wrap gap-1 items-center cursor-pointer bg-white select-none"
        style={{ borderColor: open ? MAROON : "#d1d5db" }}
      >
        {selected.length > 0
          ? selected.map((a) => (
            <span key={a} className="px-2 py-0.5 rounded text-xs flex items-center gap-1 text-white font-medium" style={{ background: MAROON }}>
              {a}
              <button type="button" onMouseDown={(e) => { e.stopPropagation(); toggle(a); }} className="hover:opacity-70 font-bold ml-0.5">×</button>
            </span>
          ))
          : <span className="text-gray-400 text-sm">Select audience…</span>}
        <span className="ml-auto text-gray-400 text-[10px] pl-2 shrink-0">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 shadow-lg rounded-sm mt-0.5 max-h-52 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
          <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white">
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              className="w-full h-7 px-2 text-xs border border-gray-200 rounded outline-none focus:border-[#7b1113]" />
          </div>
          {showEveryone && (
            <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggle("Everyone"); }}
              className="w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-gray-50"
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
                  className="w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-gray-50"
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

// ─── Badges ───────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;
  const n = role.toUpperCase();
  const styles: Record<string, React.CSSProperties> = {
    ADMIN:   { background: "#fef2f2", color: MAROON,    border: "1px solid #fecaca" },
    STAFF:   { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    TEACHER: { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" },
    STUDENT: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
  };
  return (
    <span style={{
      ...(styles[n] ?? { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }),
      fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
      padding: "1px 6px", borderRadius: 4, textTransform: "uppercase",
    }}>{n}</span>
  );
}

function AuthorAvatar({ name, size = 36, color }: { name: string; size?: number; color?: string }) {
  const words = (name ?? "?").trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : words[0].charAt(0).toUpperCase();

  const colors = [MAROON, "#4f46e5", "#0e7490", "#15803d", "#b45309", "#7c3aed"];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
  const bg = color ?? colors[colorIndex];

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
      fontFamily: FONT, letterSpacing: "-0.02em",
    }}>
      {initials}
    </div>
  );
}

// ─── SwipeableCard ────────────────────────────────────────────────────────────
function SwipeableCard({
  children,
  onDelete,
  onMarkRead,
  isRead,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  onMarkRead: () => void;
  isRead: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const ACTION_WIDTH = 120;
  const THRESHOLD = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = Math.abs(e.touches[0].clientY - startY.current);
    if (!isDragging.current && dy > Math.abs(dx)) return;
    if (dx < 0) {
      isDragging.current = true;
      setSwiping(true);
      setOffset(Math.max(dx, -ACTION_WIDTH));
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(offset) > THRESHOLD) {
      setOffset(-ACTION_WIDTH);
    } else {
      setOffset(0);
    }
    setSwiping(false);
    isDragging.current = false;
  };

  const close = () => setOffset(0);

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Action buttons behind */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: ACTION_WIDTH, display: "flex",
      }}>
        <button
          type="button"
          onClick={() => { onMarkRead(); close(); }}
          style={{
            flex: 1, background: "#3b82f6", color: "#fff",
            border: "none", cursor: "pointer", display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 3, fontSize: 10, fontFamily: FONT, fontWeight: 600,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {isRead ? "Unread" : "Read"}
        </button>
        <button
          type="button"
          onClick={() => { onDelete(); close(); }}
          style={{
            flex: 1, background: "#ef4444", color: "#fff",
            border: "none", cursor: "pointer", display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 3, fontSize: 10, fontFamily: FONT, fontWeight: 600,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
          Delete
        </button>
      </div>

      {/* Card content — slides left */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.2s ease",
          position: "relative", background: "#fff",
        }}
      >
        {children}
        {offset < -10 && (
          <button
            type="button"
            onClick={close}
            style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              background: "transparent", border: "none", cursor: "default",
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── AnnouncementCard (list item) ─────────────────────────────────────────────
function AnnouncementCard({
  a,
  selected,
  onToggleSelect,
  onView,
  onDelete,
  onToggleRead,
}: {
  a: Announcement;
  selected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onDelete: () => void;
  onToggleRead: () => void;
}) {
  const fileIcon = (type: string) =>
    type.startsWith("image/") ? "🖼️" : type === "application/pdf" ? "📄" :
    type.includes("word") ? "📝" : type.includes("sheet") || type.includes("excel") ? "📊" : "📎";

  const formatAudience = (assignTo?: string[]) =>
    !assignTo || assignTo.length === 0 ? "Everyone" : assignTo.join(", ");

  return (
    <SwipeableCard onDelete={onDelete} onMarkRead={onToggleRead} isRead={a.read}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 14px",
          background: selected ? "#fef9f9" : a.read ? "#fff" : "#fffbfb",
          borderBottom: "1px solid #f3f4f6",
          cursor: "pointer",
          transition: "background 0.15s",
          fontFamily: FONT,
        }}
        onClick={onView}
      >
        {/* Checkbox — stop propagation */}
        <div
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          style={{ paddingTop: 2, flexShrink: 0 }}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => {}}
            style={{ width: 15, height: 15, accentColor: MAROON, cursor: "pointer" }}
          />
        </div>

        {/* Avatar */}
        <AuthorAvatar name={a.author} size={34} />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 2 }}>
            {!a.read && (
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: MAROON, flexShrink: 0, marginTop: 4,
              }} />
            )}
            {a.pinned && (
              <span style={{ fontSize: 11, flexShrink: 0 }} title="Pinned">📌</span>
            )}
            <span style={{
              fontSize: 13, fontWeight: a.read ? 500 : 700,
              color: MAROON, lineHeight: 1.35,
              wordBreak: "break-word",
            }}>
              {a.title}
            </span>
            {a.locked && (
              <svg style={{ width: 11, height: 11, flexShrink: 0, marginTop: 3, color: "#9ca3af" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </div>

          {/* Author + audience */}
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>
            <span style={{ fontWeight: 600, color: "#374151" }}>{a.author}</span>
            <span style={{ margin: "0 4px" }}>·</span>
            <span>To: {formatAudience(a.assignTo)}</span>
          </div>

          {/* Preview */}
          {a.bodyText && (
            <p style={{
              fontSize: 12, color: "#6b7280", lineHeight: 1.45,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
              margin: 0,
            }}>
              {a.bodyText}
            </p>
          )}

          {/* Attachment badge */}
          {a.attachments && a.attachments.length > 0 && (
            <div
              style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}
              onClick={(e) => e.stopPropagation()}
            >
              {a.attachments.slice(0, 2).map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    fontSize: 10, padding: "2px 7px",
                    border: "1px solid #e5e7eb", borderRadius: 20,
                    background: "#f9fafb", color: MAROON,
                    textDecoration: "none",
                  }}
                >
                  {fileIcon(f.type)} {f.name.length > 14 ? f.name.slice(0, 12) + "…" : f.name}
                </a>
              ))}
              {a.attachments.length > 2 && (
                <span style={{
                  fontSize: 10, padding: "2px 7px",
                  border: "1px solid #e5e7eb", borderRadius: 20,
                  background: "#f9fafb", color: "#6b7280",
                }}>
                  +{a.attachments.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: date */}
        <div style={{
          flexShrink: 0, display: "flex", flexDirection: "column",
          alignItems: "flex-end", gap: 4,
        }}>
          <span style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap" }}>
            {a.createdAtLabel.split(",")[0]}
          </span>
        </div>
      </div>
    </SwipeableCard>
  );
}

// ─── AnnouncementDetailView ───────────────────────────────────────────────────
function AnnouncementDetailView({ announcement, onBack, onDelete, courseId }: {
  announcement: Announcement; onBack: () => void;
  onDelete: (id: string | number) => void;
  courseId: string;
}) {
  const [authorRole, setAuthorRole] = useState<string | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const formatAudience = (assignTo?: string[]) =>
    !assignTo || assignTo.length === 0 ? "Everyone" : assignTo.join(", ");

  return (
    <div style={{ fontFamily: FONT }}>
      {confirmDelete && (
        <ConfirmModal
          title="Delete announcement"
          message="Delete this announcement? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => { onDelete(announcement.id); onBack(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Sticky top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#fff", borderBottom: "1px solid #f0e4e4",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px", height: 46, flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            color: MAROON, fontSize: 13, fontWeight: 600, fontFamily: FONT,
            padding: "6px 0",
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Announcements
        </button>

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 8, padding: "5px 10px",
            cursor: "pointer", color: "#dc2626", fontSize: 11, fontWeight: 600, fontFamily: FONT,
          }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
          Delete
        </button>
      </div>

      {/* Author card */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 16px", borderBottom: "1px solid #f3f4f6",
        background: "#fff",
      }}>
        <AuthorAvatar name={announcement.author} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{announcement.author}</span>
            {authorRole && <RoleBadge role={authorRole} />}
            {announcement.locked && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 10, color: "#6b7280", background: "#f3f4f6",
                padding: "1px 6px", borderRadius: 4, fontWeight: 500,
              }}>
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Locked
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
            {announcement.createdAtLabel}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>
            To: <span style={{ color: "#6b7280", fontWeight: 500 }}>{formatAudience(announcement.assignTo)}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 16px 24px", background: "#fff" }}>
        <h1 style={{
          fontSize: 17, fontWeight: 800, color: "#111827",
          lineHeight: 1.35, marginBottom: 12, fontFamily: FONT,
        }}>
          {announcement.title}
        </h1>

        {announcement.bodyHtml ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: announcement.bodyHtml }}
            style={{ fontSize: 14, color: "#374151", lineHeight: 1.75 }}
          />
        ) : announcement.bodyText ? (
          <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.75 }}>{announcement.bodyText}</p>
        ) : (
          <p style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>No content.</p>
        )}

        {/* Attachments */}
        {announcement.attachments && announcement.attachments.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "#9ca3af",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
            }}>
              Attachments
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {announcement.attachments.map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb", borderRadius: 10,
                    background: "#f9fafb", textDecoration: "none",
                    color: MAROON,
                  }}
                >
                  <span style={{ fontSize: 18 }}>
                    {f.type.startsWith("image/") ? "🖼️" : f.type === "application/pdf" ? "📄" : f.type.includes("word") ? "📝" : f.type.includes("sheet") ? "📊" : "📎"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: MAROON, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>
                      {f.size < 1048576 ? `${(f.size / 1024).toFixed(1)} KB` : `${(f.size / 1048576).toFixed(1)} MB`}
                    </div>
                  </div>
                  <svg width="14" height="14" fill="none" stroke={MAROON} strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AnnouncementsListView ────────────────────────────────────────────────────
function AnnouncementsListView({
  filter, setFilter, search, setSearch,
  onAdd, onMarkAllRead,
  announcements, onRemove, onToggleRead, onView,
  selectedIds, setSelectedIds,
}: {
  filter: FilterType; setFilter: (v: FilterType) => void;
  search: string; setSearch: (v: string) => void;
  onAdd: () => void; onMarkAllRead: () => void;
  announcements: Announcement[];
  onRemove: (id: string | number) => void;
  onToggleRead: (id: string | number) => void;
  onView: (id: string | number) => void;
  selectedIds: Set<string | number>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
}) {
  const [confirmDelete, setConfirmDelete] = useState<"single" | "bulk" | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | number | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const hasSelection = selectedIds.size > 0;
  const allChecked = announcements.length > 0 && announcements.every((a) => selectedIds.has(a.id));
  const unreadCount = announcements.filter(a => !a.read).length;

  const toggleAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(announcements.map((a) => a.id)));
  };
  const toggleOne = (id: string | number) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const handleBulkDelete = () => { selectedIds.forEach((id) => onRemove(id)); setSelectedIds(new Set()); setConfirmDelete(null); };
  const handleSingleDelete = (id: string | number) => { onRemove(id); setPendingDeleteId(null); setConfirmDelete(null); };

  const grouped = useMemo(() => groupAnnouncementsByDate(announcements), [announcements]);

  const FILTER_PILLS: { label: string; value: FilterType; count?: number }[] = [
    { label: "All", value: "All" },
    { label: "Unread", value: "Unread", count: unreadCount },
    { label: "Recent", value: "Recent Activity" },
  ];

  return (
    <div style={{ fontFamily: FONT, display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {confirmDelete === "bulk" && (
        <ConfirmModal title="Delete announcements" message={`Delete ${selectedIds.size} announcement${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`} confirmLabel="Delete" danger onConfirm={handleBulkDelete} onCancel={() => setConfirmDelete(null)} />
      )}
      {confirmDelete === "single" && pendingDeleteId !== null && (
        <ConfirmModal title="Delete announcement" message="Delete this announcement? This cannot be undone." confirmLabel="Delete" danger onConfirm={() => handleSingleDelete(pendingDeleteId)} onCancel={() => { setConfirmDelete(null); setPendingDeleteId(null); }} />
      )}

      {/* ── Sticky header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#fff", borderBottom: "1px solid #f0e4e4",
      }}>
        {/* Filter chips row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px 0",
          overflowX: "auto", scrollbarWidth: "none",
        }}>
          {FILTER_PILLS.map(pill => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setFilter(pill.value)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 20, flexShrink: 0,
                border: filter === pill.value ? `1.5px solid ${MAROON}` : "1.5px solid #e5e7eb",
                background: filter === pill.value ? "#fef2f2" : "#fff",
                color: filter === pill.value ? MAROON : "#6b7280",
                fontSize: 12, fontWeight: filter === pill.value ? 700 : 500,
                cursor: "pointer", fontFamily: FONT,
                transition: "all 0.15s",
              }}
            >
              {pill.label}
              {pill.count !== undefined && pill.count > 0 && (
                <span style={{
                  background: filter === pill.value ? MAROON : "#e5e7eb",
                  color: filter === pill.value ? "#fff" : "#374151",
                  fontSize: 10, fontWeight: 700,
                  padding: "0 5px", borderRadius: 10, minWidth: 16,
                  textAlign: "center",
                }}>
                  {pill.count}
                </span>
              )}
            </button>
          ))}
          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
            <button
              type="button"
              onClick={onMarkAllRead}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "5px 10px", borderRadius: 20,
                border: "1.5px solid #e5e7eb", background: "#fff",
                color: "#6b7280", fontSize: 11, fontWeight: 500,
                cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap",
              }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Mark all read
            </button>
          </div>
        </div>

        {/* Search + actions row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px 10px",
        }}>
          {/* Search */}
          <div style={{
            flex: 1, position: "relative",
            display: "flex", alignItems: "center",
          }}>
            <svg style={{ position: "absolute", left: 10, color: "#9ca3af", flexShrink: 0 }}
              width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search announcements…"
              style={{
                width: "100%", height: 36, paddingLeft: 32, paddingRight: 10,
                border: `1.5px solid ${searchFocused ? MAROON : "#e5e7eb"}`,
                borderRadius: 20, fontSize: 13, outline: "none",
                background: "#f9fafb", color: "#111827",
                fontFamily: FONT, transition: "border-color 0.15s",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute", right: 10, background: "none",
                  border: "none", cursor: "pointer", color: "#9ca3af",
                  fontSize: 14, lineHeight: 1, padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={onAdd}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              height: 36, padding: "0 14px", borderRadius: 20,
              background: MAROON, color: "#fff",
              border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, fontFamily: FONT,
              flexShrink: 0, whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span>
            <span>New</span>
          </button>

          {/* Bulk delete — only when selected */}
          {hasSelection && (
            <button
              type="button"
              onClick={() => setConfirmDelete("bulk")}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: "50%",
                background: "#fef2f2", border: "1px solid #fecaca",
                cursor: "pointer", color: "#dc2626", flexShrink: 0,
              }}
              title={`Delete ${selectedIds.size} selected`}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>
          )}
        </div>

        {/* Selection bar */}
        {hasSelection && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 14px 8px",
            background: "#fef9f9", borderTop: "1px solid #fde8e8",
          }}>
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              style={{ width: 15, height: 15, accentColor: MAROON }}
            />
            <span style={{ fontSize: 12, color: MAROON, fontWeight: 600 }}>
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 11, color: "#9ca3af", fontFamily: FONT,
                textDecoration: "underline",
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── List body ── */}
      {announcements.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "60px 20px", textAlign: "center",
          color: "#9ca3af", flex: 1,
        }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📢</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
            No announcements
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
            {search ? `No results for "${search}"` : filter !== "All" ? `No ${filter.toLowerCase()} announcements` : "Create the first announcement"}
          </div>
          {!search && filter === "All" && (
            <button
              type="button"
              onClick={onAdd}
              style={{
                padding: "9px 20px", borderRadius: 20,
                background: MAROON, color: "#fff",
                border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: FONT,
              }}
            >
              ＋ New Announcement
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Select all row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderBottom: "1px solid #f3f4f6",
            background: "#f9fafb",
          }}>
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              style={{ width: 15, height: 15, accentColor: MAROON }}
            />
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Select all</span>
          </div>

          {grouped.map(({ label, items }) => (
            <div key={label}>
              {/* Date group label */}
              <div style={{
                padding: "8px 14px 4px",
                fontSize: 10, fontWeight: 700, color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.07em",
                background: "#f9fafb", borderBottom: "1px solid #f3f4f6",
              }}>
                {label}
              </div>

              {items.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  a={a}
                  selected={selectedIds.has(a.id)}
                  onToggleSelect={() => toggleOne(a.id)}
                  onView={() => onView(a.id)}
                  onDelete={() => { setPendingDeleteId(a.id); setConfirmDelete("single"); }}
                  onToggleRead={() => onToggleRead(a.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}`}</style>
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
    availableFromDate, setAvailableFromDate, availableFromTime, setAvailableFromTime,
    untilDate, setUntilDate, untilTime, setUntilTime,
    onCancel, onPublish, onResetUntil, isPublishing,
  } = props;

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Sticky top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#fff", borderBottom: "1px solid #f0e4e4",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px", height: 46,
      }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPublishing}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            color: MAROON, fontSize: 13, fontWeight: 600, fontFamily: FONT,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Cancel
        </button>

        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>New Announcement</span>

        <button
          type="button"
          onClick={onPublish}
          disabled={isPublishing || !topicTitle.trim()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "6px 16px", borderRadius: 20,
            background: isPublishing || !topicTitle.trim() ? "#d1d5db" : MAROON,
            color: "#fff", border: "none",
            cursor: isPublishing || !topicTitle.trim() ? "not-allowed" : "pointer",
            fontSize: 12, fontWeight: 700, fontFamily: FONT,
          }}
        >
          {isPublishing ? (
            <>
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Publishing…
            </>
          ) : "Publish"}
        </button>
      </div>

      <div style={{ padding: "16px 14px 40px" }}>
        {!isCoursePublished && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            border: "1px solid #fed7aa", background: "#fff7ed",
            borderRadius: 10, padding: "10px 12px", marginBottom: 16,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "#f97316", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>!</div>
            <p style={{ fontSize: 12, color: "#9a3412", lineHeight: 1.5, margin: 0 }}>
              Notifications won&apos;t be sent for announcements created before the course is published.
            </p>
          </div>
        )}

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
            Title <span style={{ color: MAROON }}>*</span>
          </label>
          <input
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            placeholder="Announcement title"
            style={{
              width: "100%", height: 42, padding: "0 12px",
              border: `1.5px solid ${topicTitle ? MAROON : "#e5e7eb"}`,
              borderRadius: 10, fontSize: 14, outline: "none",
              background: "#fff", color: "#111827",
              fontFamily: FONT, boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.currentTarget.style.borderColor = MAROON}
            onBlur={e => e.currentTarget.style.borderColor = topicTitle ? MAROON : "#e5e7eb"}
          />
        </div>

        {/* Content */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
            Content
          </label>
          <RichTextEditor valueHtml={bodyHtml} onChangeHtml={setBodyHtml} onChangeText={setBodyText} />
        </div>

        {/* Attachments */}
        <div style={{ marginBottom: 16 }}>
          <AttachButton attachments={attachments} onAdd={onAddAttachments} onRemove={onRemoveAttachment} />
        </div>

        {/* Assign To */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
            Assign To
          </label>
          <AssignToSelector selected={assignTo} setSelected={setAssignTo} staff={staff} />
        </div>

        {/* Scheduling */}
        <div style={{
          border: "1px solid #e5e7eb", borderRadius: 12,
          padding: 14, background: "#f9fafb", marginBottom: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
            Scheduling
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Available From</div>
              <DateTimeRow
                label="Date & Time"
                date={availableFromDate} time={availableFromTime}
                onDateChange={setAvailableFromDate} onTimeChange={setAvailableFromTime}
                onClear={() => { setAvailableFromDate(""); setAvailableFromTime(""); }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Until</div>
              <DateTimeRow
                label="Date & Time"
                date={untilDate} time={untilTime}
                onDateChange={setUntilDate} onTimeChange={setUntilTime}
                onClear={onResetUntil}
              />
            </div>
          </div>
        </div>
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
        const savedRaw = localStorage.getItem(`read-announcements-${courseId}`);
        const savedIds: Set<string | number> = savedRaw ? new Set(JSON.parse(savedRaw)) : new Set();
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
          read: savedIds.has(a.id),
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
        setStaff(
          people
            .filter(p => p.courseRole && p.courseRole.toLowerCase() === "staff")
            .map(p => ({ id: p.userId ?? p.id ?? "", name: p.name ?? "" }))
            .filter(p => p.id && p.name)
        );
      })
      .catch(() => setStaff([]));
  }, [courseId]);

  const onMarkAllRead = () => {
    const allIds = announcements.map(a => a.id);
    const next = new Set([...allIds]);
    try { localStorage.setItem(`read-announcements-${courseId}`, JSON.stringify([...next])); } catch {}
    setAnnouncements(prev => prev.map(a => ({ ...a, read: true })));
  };

  const onToggleRead = (id: string | number) => {
    setAnnouncements(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, read: !a.read } : a);
      try {
        const readIds = updated.filter(a => a.read).map(a => a.id);
        localStorage.setItem(`read-announcements-${courseId}`, JSON.stringify(readIds));
      } catch {}
      return updated;
    });
  };

  const onRemove = async (id: string | number) => {
    setAnnouncements(prev => prev.filter(x => x.id !== id));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    if (!courseId) return;
    try {
      await fetch(`/api/admin/courses/${courseId}/announcements/${id}`, { method: "DELETE" });
    } catch (err) { console.error(err); }
  };

  const onToggleLock = async (id: string | number) => {
    const current = announcements.find(a => a.id === id);
    const newValue = current ? !current.locked : true;
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, locked: newValue } : a));
    if (!courseId) return;
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/announcements/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: newValue }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, locked: !newValue } : a));
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
    const now = new Date();
return announcements.filter(a => {
  const matchSearch = !q || a.title.toLowerCase().includes(q) || (a.bodyText ?? "").toLowerCase().includes(q);
  const matchFilter =
    filter === "All" ||
    (filter === "Unread" && !a.read) ||
    (filter === "Recent Activity" && latest !== null && latest - Date.parse(a.createdAtIso) <= sevenDaysMs);
  const matchAvailableFrom = !a.availableFrom || new Date(a.availableFrom) <= now;
  const matchUntil = !a.availableUntil || new Date(a.availableUntil) >= now;
  return matchFilter && matchSearch && matchAvailableFrom && matchUntil;
});
  }, [announcements, filter, search]);

  const resetCreateForm = () => {
    setTopicTitle(""); setBodyHtml(""); setBodyText(""); setAttachments([]);
    setAssignTo(["Everyone"]);
    setAvailableFromDate(""); setAvailableFromTime(""); setUntilDate(""); setUntilTime("");
  };

  const onPublish = async () => {
    if (!topicTitle.trim()) return;
    if (availableFromDate && untilDate) {
      const from = new Date(`${availableFromDate}T${availableFromTime || "00:00"}`);
      const until = new Date(`${untilDate}T${untilTime || "00:00"}`);
      if (until <= from) { alert("Ang 'Until' date ay dapat mas bago kaysa 'Available From'."); return; }
    }
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
        locked: false, availableFrom: availableFromIso, availableUntil: availableUntilIso,
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
          availableFrom: availableFromIso, availableUntil: availableUntilIso,
          attachments: attachments.map(f => ({ name: f.name, url: f.url, size: f.size, mimeType: f.type })),
        }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      const { announcement } = await res.json();
      setAnnouncements(prev => [{
        id: announcement.id, title: announcement.title,
        bodyText: announcement.bodyText, bodyHtml: announcement.bodyHtml,
        author: announcement.author, createdAtIso: announcement.createdAt,
        createdAtLabel: new Date(announcement.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
        read: false,
        attachments: (announcement.attachments ?? []).map((a: { id: string; name: string; size: number; mimeType: string; url: string }) => ({ id: a.id, name: a.name, size: a.size, type: a.mimeType, url: a.url })),
        assignTo: announcement.assignTo, locked: false,
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
    try {
      const allIds = announcements.filter(a => a.read || a.id === id).map(a => a.id);
      localStorage.setItem(`read-announcements-${courseId}`, JSON.stringify(allIds));
    } catch {}
  };

  const viewingAnnouncement = announcements.find(a => a.id === viewingId) ?? null;

  if (mode === "detail" && viewingAnnouncement) {
    return (
      <AnnouncementDetailView
        announcement={viewingAnnouncement}
        courseId={courseId}
        onBack={() => { setMode("list"); setViewingId(null); }}
        onDelete={onRemove}
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
        availableFromDate={availableFromDate} setAvailableFromDate={setAvailableFromDate}
        availableFromTime={availableFromTime} setAvailableFromTime={setAvailableFromTime}
        untilDate={untilDate} setUntilDate={setUntilDate} untilTime={untilTime} setUntilTime={setUntilTime}
        onCancel={onCancel} onPublish={onPublish} onResetUntil={onResetUntil} isPublishing={isPublishing}
      />
    );
  }

  return (
    <AnnouncementsListView
      filter={filter} setFilter={setFilter}
      search={search} setSearch={setSearch}
      onAdd={() => setMode("create")} onMarkAllRead={onMarkAllRead}
      announcements={filteredAnnouncements}
      onRemove={onRemove} onToggleRead={onToggleRead}
      onView={onView} selectedIds={selectedIds} setSelectedIds={setSelectedIds}
    />
  );
}