"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

const MAROON = "#7b1113";
const GRADE_OPTIONS = ["Points", "Percentage", "Complete/Incomplete", "Not Graded"];
const SUBMISSION_TYPES = ["Online", "On Paper", "No Submission", "External Tool", "Lucid"];

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
type TabKey = "details" | "submission" | "settings" | "assign";

interface AssignTo {
  id: number; assignees: string[];
  dueDate: string; dueTime: string;
  availableFrom: string; availableFromTime: string;
  until: string; untilTime: string;
}

interface SubmissionEntry {
  id: number;
  label: string;
  required: boolean;
  type: string;
  allowedFileTypes?: string[];
  maxFiles?: number | null;
}

interface AssignmentGroup { id: number; name: string; }
interface GroupSetItem { id: string; name: string; }
interface Staff { id: string; name: string; }

const SUBMISSION_ENTRY_TYPES = [
  "File Upload",
  "Text Entry",
  "Website URL",
  "Media Recording",
];

const ALLOWED_FILE_TYPES = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
  { value: "doc", label: "DOC" },
  { value: "txt", label: "TXT" },
  { value: "xlsx", label: "XLSX" },
  { value: "csv", label: "CSV" },
  { value: "pptx", label: "PPTX" },
  { value: "jpg", label: "JPG" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
  { value: "zip", label: "ZIP" },
  { value: "mp4", label: "MP4" },
  { value: "webm", label: "WEBM" },
  { value: "mp3", label: "MP3" },
  { value: "wav", label: "WAV" },
  { value: "m4a", label: "M4A" },
];

function normalizeFileTypes(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set(ALLOWED_FILE_TYPES.map(t => t.value));
  return values
    .map(v => v.replace(/^\./, "").trim().toLowerCase())
    .filter(v => allowed.has(v));
}

function formatFileTypes(values: string[] | undefined): string {
  return normalizeFileTypes(values).map(v => v.toUpperCase()).join(", ");
}

// ─── Modals ───────────────────────────────────────────────────────────────────
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
          <textarea value={html} onChange={e => setHtml(e.target.value)} className="w-full h-64 border border-gray-300 rounded px-3 py-2 text-xs font-mono outline-none focus:border-[#7b1113] resize-none" />
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
            <div
              key={c}
              title={c}
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
            <div
              key={i}
              onMouseEnter={() => setHover({ r, c })}
              onClick={() => onPick(r, c)}
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
          <button
            key={i}
            type="button"
            disabled={item.disabled}
            onMouseDown={e => { e.preventDefault(); if (!item.disabled) { item.action(); onClose(); } }}
            className={`w-full text-left px-3 py-1 text-xs flex items-center gap-2 ${item.disabled ? "text-gray-300" : "text-gray-700 hover:bg-blue-600 hover:text-white"}`}
          >
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

// ─── Rich Text Editor ─────────────────────────────────────────────────────────
function RichTextEditor({ onChange, placeholder = "Start typing..." }: { onChange?: (html: string) => void; placeholder?: string }) {
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
            {
              type: "action", label: "Upload image", action: () => {
                const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
                inp.onchange = () => { const f = inp.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => insertHTML(`<img src="${ev.target?.result}" style="max-width:100%;" />`); r.readAsDataURL(f); };
                inp.click();
              }
            },
          ]
        },
        {
          type: "sub", icon: "▶", label: "Media", children: [
            {
              type: "action", label: "Insert/Edit Video", action: () => {
                let url = prompt("Video URL (YouTube/Vimeo):"); if (!url) return;
                if (url.includes("youtube.com/watch?v=")) url = url.replace("watch?v=", "embed/");
                else if (url.includes("youtu.be/")) url = url.replace("youtu.be/", "www.youtube.com/embed/");
                else if (url.includes("vimeo.com/")) url = url.replace("vimeo.com/", "player.vimeo.com/video/");
                insertHTML(`<iframe src="${url}" width="560" height="315" frameborder="0" allowfullscreen style="max-width:100%;border-radius:4px;"></iframe>`);
              }
            },
          ]
        },
        {
          type: "sub", icon: "📄", label: "Document", children: [
            { type: "action", label: "Link to Document", action: () => { const url = prompt("Document URL:"); if (!url) return; const txt = prompt("Link text:") || url; insertHTML(`<a href="${url}">${txt}</a>`); } },
          ]
        },
        { type: "sep" },
        { type: "action", icon: "∑", label: "Equation", action: () => { const eq = prompt("Equation (LaTeX or plain):"); if (!eq) return; insertHTML(`<code style="font-family:monospace;background:#f4f4f4;padding:2px 6px;border-radius:3px;">${eq}</code>`); } },
        { type: "sub", icon: "⊞", label: "Table", picker: true, children: [], onPick: (r: number, c: number) => insertTable(r, c) },
        { type: "action", icon: "{ }", label: "Embed", action: () => { const code = prompt("Embed code (iframe):"); if (!code) return; insertHTML(code); } },
        { type: "action", icon: "—", label: "Horizontal line", action: () => insertHTML('<hr style="border:none;border-top:2px solid #dee2e6;margin:12px 0;"/><p><br></p>') },
      ]
    },
    {
      label: "Format", items: [
        { type: "action", icon: "B", label: "Bold", shortcut: "Ctrl+B", action: () => exec("bold") },
        { type: "action", icon: "I", label: "Italic", shortcut: "Ctrl+I", action: () => exec("italic") },
        { type: "action", icon: "U", label: "Underline", shortcut: "Ctrl+U", action: () => exec("underline") },
        { type: "action", icon: "S", label: "Strikethrough", action: () => exec("strikeThrough") },
        { type: "action", icon: "x²", label: "Superscript", action: () => exec("superscript") },
        { type: "action", icon: "x₂", label: "Subscript", action: () => exec("subscript") },
        { type: "action", icon: "<>", label: "Inline Code", action: () => insertHTML(`<code style="font-family:monospace;background:#f4f4f4;padding:2px 6px;border-radius:3px;">[code]</code>`) },
        { type: "sep" },
        {
          type: "sub", icon: "¶", label: "Formats", children: [
            { type: "action", label: "Heading 1", action: () => fmt("h1") },
            { type: "action", label: "Heading 2", action: () => fmt("h2") },
            { type: "action", label: "Heading 3", action: () => fmt("h3") },
            { type: "action", label: "Heading 4", action: () => fmt("h4") },
            { type: "action", label: "Paragraph", action: () => fmt("p") },
            { type: "action", label: "Blockquote", action: () => insertHTML("<blockquote style='border-left:3px solid #6baef0;padding-left:12px;color:#555;margin:8px 0;'>[quote]</blockquote>") },
            { type: "action", label: "Code Block", action: () => insertHTML("<pre style='background:#f4f4f4;padding:10px;border-radius:4px;font-family:monospace;font-size:13px;'>[code block]</pre>") },
          ]
        },
        {
          type: "sub", icon: "▤", label: "Blocks", children: [
            { type: "action", label: "Blockquote", action: () => insertHTML("<blockquote style='border-left:3px solid #6baef0;padding-left:12px;color:#555;margin:8px 0;'>[quote]</blockquote>") },
            { type: "action", label: "Code Block", action: () => insertHTML("<pre style='background:#f4f4f4;padding:10px;border-radius:4px;font-family:monospace;font-size:13px;'>[code block]</pre>") },
            { type: "action", label: "Ordered List", action: () => exec("insertOrderedList") },
            { type: "action", label: "Bullet List", action: () => exec("insertUnorderedList") },
          ]
        },
        {
          type: "sub", icon: "F", label: "Fonts", children: [
            { type: "action", label: "Default", action: () => exec("fontName", "inherit") },
            { type: "action", label: "Sans-serif", action: () => exec("fontName", "Arial, sans-serif") },
            { type: "action", label: "Serif", action: () => exec("fontName", "Georgia, serif") },
            { type: "action", label: "Monospace", action: () => exec("fontName", "monospace") },
          ]
        },
        {
          type: "sub", icon: "A↕", label: "Font sizes", children: [
            { type: "action", label: "Small (8pt)", action: () => exec("fontSize", "1") },
            { type: "action", label: "Normal (12pt)", action: () => exec("fontSize", "3") },
            { type: "action", label: "Large (18pt)", action: () => exec("fontSize", "5") },
            { type: "action", label: "Huge (36pt)", action: () => exec("fontSize", "7") },
          ]
        },
        {
          type: "sub", icon: "≡", label: "Align", children: [
            { type: "action", label: "Left", action: () => exec("justifyLeft") },
            { type: "action", label: "Center", action: () => exec("justifyCenter") },
            { type: "action", label: "Right", action: () => exec("justifyRight") },
            { type: "action", label: "Justify", action: () => exec("justifyFull") },
          ]
        },
        {
          type: "sub", icon: "↔", label: "Directionality", children: [
            { type: "action", label: "Left to Right", action: () => { if (editorRef.current) editorRef.current.style.direction = "ltr"; } },
            { type: "action", label: "Right to Left", action: () => { if (editorRef.current) editorRef.current.style.direction = "rtl"; } },
          ]
        },
        { type: "sep" },
        { type: "action", icon: "A", label: "Text color", action: () => setShowColor("foreColor") },
        { type: "action", icon: "A", label: "Background color", action: () => setShowColor("backColor") },
        { type: "sep" },
        { type: "action", icon: "✕", label: "Clear formatting", action: () => exec("removeFormat") },
      ]
    },
    {
      label: "Tools", items: [
        {
          type: "action", icon: "≡", label: "Word Count", action: () => {
            const t = editorRef.current?.innerText.trim() ?? "";
            setWcData({ text: t, chars: editorRef.current?.innerText.length ?? 0, charsNoSpace: t.replace(/\s/g, "").length, paragraphs: editorRef.current?.querySelectorAll("p").length ?? 0 });
            setShowWC(true);
          }
        },
        { type: "action", icon: "🔍", label: "Find and Replace", shortcut: "Ctrl+F", action: () => { setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowFR(true); } },
      ]
    },
    {
      label: "Table", items: [
        { type: "sub", icon: "⊞", label: "Table", picker: true, children: [], onPick: (r: number, c: number) => insertTable(r, c) },
        { type: "sep" },
        { type: "action", icon: "✕", label: "Delete table", action: () => { const sel = window.getSelection(); if (!sel?.rangeCount) return; let n: Node | null = sel.getRangeAt(0).commonAncestorContainer; while (n && (n as Element).nodeName !== "TABLE") n = n.parentNode; if (n && (n as Element).nodeName === "TABLE") (n as Element).remove(); } },
      ]
    },
  ], [exec, fmt, insertHTML, insertTable, toggleFS, isFS]);

  const TBGroups = useMemo(() => [
    [
      {
        html: <select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => fmt(e.target.value)} defaultValue="p">
          {[["Paragraph", "p"], ["Heading 1", "h1"], ["Heading 2", "h2"], ["Heading 3", "h3"], ["Heading 4", "h4"], ["Blockquote", "blockquote"], ["Code", "pre"]].map(([l, v]) => <option key={v} value={v}>{l}</option>)}
        </select>, title: "Block format"
      },
      {
        html: <select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => e.target.value && exec("fontName", e.target.value)}>
          {[["Font", ""], ["Default", "inherit"], ["Arial", "Arial"], ["Georgia", "Georgia"], ["Monospace", "monospace"]].map(([l, v]) => <option key={l} value={v}>{l}</option>)}
        </select>, title: "Font"
      },
      {
        html: <select className="h-6 border border-gray-300 rounded text-xs bg-white px-1 outline-none" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => exec("fontSize", e.target.value)} defaultValue="3">
          {[["8pt", "1"], ["10pt", "2"], ["12pt", "3"], ["14pt", "4"], ["18pt", "5"], ["24pt", "6"], ["36pt", "7"]].map(([l, v]) => <option key={v} value={v}>{l}</option>)}
        </select>, title: "Font size"
      },
    ],
    [
      { label: "B", title: "Bold (Ctrl+B)", fn: () => exec("bold"), style: { fontWeight: 700 } },
      { label: "I", title: "Italic (Ctrl+I)", fn: () => exec("italic"), style: { fontStyle: "italic" } },
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
      { label: "≡≡", title: "Justify", fn: () => exec("justifyFull"), style: {} },
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

      <div ref={wrapRef} className="border border-gray-300 rounded overflow-hidden flex flex-col" style={{ minHeight: 320 }}>
        {/* Menubar */}
        <div data-menubar className="flex items-center gap-0.5 px-1 py-0.5 bg-[#f7f9fb] border-b border-gray-200 select-none flex-wrap">
          {menus.map(m => (
            <div key={m.label} className="relative">
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); setOpenMenu(openMenu === m.label ? null : m.label); }}
                className={`px-2 sm:px-2.5 py-0.5 text-xs rounded transition-colors ${openMenu === m.label ? "text-white" : "text-gray-700 hover:bg-gray-200"}`}
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
          {TBGroups.map((group, gi) => (
            <div key={gi} className="flex items-center gap-0.5">
              {gi > 0 && <div className="w-px h-5 bg-gray-300 mx-1" />}
              {group.map((btn, bi) => {
                if ("html" in btn) return <div key={bi} title={btn.title}>{btn.html}</div>;
                return (
                  <button
                    key={bi}
                    type="button"
                    title={btn.title}
                    style={btn.style as React.CSSProperties}
                    onMouseDown={e => { e.preventDefault(); btn.fn?.(); }}
                    className="h-6 min-w-6 px-1 border border-transparent rounded text-xs hover:bg-blue-50 hover:border-blue-200 text-gray-700 flex items-center justify-center"
                  >
                    {btn.label}
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
          style={{ minHeight: 260, lineHeight: 1.7 }}
        />

        {/* Status bar */}
        <div className="flex items-center gap-4 px-3 py-1 bg-[#f7f9fb] border-t border-gray-200 text-xs text-gray-400">
          <span>{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
          <span
            className="ml-auto cursor-pointer hover:text-gray-600"
            onClick={() => { setEditorHtml(editorRef.current?.innerHTML ?? ""); setShowHTML(true); }}
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
        [contenteditable] h1{font-size:2em;font-weight:700;margin:.67em 0;}
        [contenteditable] h2{font-size:1.5em;font-weight:700;margin:.75em 0;}
        [contenteditable] h3{font-size:1.17em;font-weight:700;margin:.83em 0;}
        [contenteditable] h4{font-size:1em;font-weight:700;margin:1.12em 0;}
        [contenteditable] ol{list-style:decimal;padding-left:1.5em;}
        [contenteditable] ul{list-style:disc;padding-left:1.5em;}
        input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;filter:invert(13%) sepia(85%) saturate(2000%) hue-rotate(340deg) brightness(70%);opacity:0.7;}
        input[type="date"]::-webkit-calendar-picker-indicator:hover{opacity:1;}
        input[type="date"]{color-scheme:light;accent-color:#7b1113;}
        input[type="date"]::-webkit-datetime-edit-day-field:focus,
        input[type="date"]::-webkit-datetime-edit-month-field:focus,
        input[type="date"]::-webkit-datetime-edit-year-field:focus{background-color:#7b1113;color:#fff;border-radius:2px;}
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

function SubmissionEntryCard({
  entry,
  index,
  canRemove,
  onRemove,
  onUpdate,
}: {
  entry: SubmissionEntry;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  onUpdate: (field: keyof SubmissionEntry, value: string | boolean | string[] | number | null) => void;
}) {
  const isFileUpload = entry.type === "File Upload";
  const isMediaRecording = entry.type === "Media Recording";
  const allowedTypes = normalizeFileTypes(entry.allowedFileTypes);
  const hasTypes = allowedTypes.length > 0;

  const toggleFileType = (value: string) => {
    const next = allowedTypes.includes(value)
      ? allowedTypes.filter(t => t !== value)
      : [...allowedTypes, value];
    onUpdate("allowedFileTypes", next);
  };

  const handleTypeChange = (nextType: string) => {
    onUpdate("type", nextType);
    if (nextType === "File Upload") {
      onUpdate("allowedFileTypes", []);
      onUpdate("maxFiles", 1);
    } else if (nextType === "Media Recording") {
      onUpdate("allowedFileTypes", ["mp4", "webm", "mp3", "wav", "m4a"]);
      onUpdate("maxFiles", 1);
    } else {
      onUpdate("allowedFileTypes", []);
      onUpdate("maxFiles", null);
    }
  };

  const fileTypeChoices = isMediaRecording
    ? ALLOWED_FILE_TYPES.filter(t => ["mp4", "webm", "mp3", "wav", "m4a"].includes(t.value))
    : ALLOWED_FILE_TYPES.filter(t => !["mp4", "webm", "mp3", "wav", "m4a"].includes(t.value));

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden bg-white relative">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100" style={{ background: "#fef9f9" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-white" style={{ background: MAROON }}>
            Entry {index}
          </span>
          <span className="text-[11px] font-semibold text-gray-600">{entry.type}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={entry.required ? { background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" } : { background: "#f3f4f6", color: "#6b7280" }}
          >
            {entry.required ? "Required" : "Optional"}
          </span>
          {(isFileUpload || isMediaRecording) && hasTypes && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ background: MAROON, color: "#fff" }}>
              {formatFileTypes(allowedTypes)}
            </span>
          )}
        </div>

        {canRemove && (
          <button type="button" onClick={onRemove} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove submission entry">
            ✕
          </button>
        )}
      </div>

      <div className="px-3 py-3 space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Submission Type</label>
          <select value={entry.type} onChange={e => handleTypeChange(e.target.value)} className="w-full h-8 border border-gray-300 rounded-sm px-2 text-xs bg-white outline-none focus:border-[#7b1113]">
            {SUBMISSION_ENTRY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
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
                    <label key={ft.value} className={
                      checked
                        ? "flex items-center gap-2 px-2.5 py-1.5 rounded border cursor-pointer transition-all text-xs font-medium select-none border-[#7b1113] bg-[#fef2f2] text-[#7b1113]"
                        : "flex items-center gap-2 px-2.5 py-1.5 rounded border cursor-pointer transition-all text-xs font-medium select-none border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-white"
                    }>
                      <input type="checkbox" checked={checked} onChange={() => toggleFileType(ft.value)} className="sr-only" />
                      <span className={
                        checked
                          ? "w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-all border-[#7b1113] bg-[#7b1113]"
                          : "w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-all border-gray-300 bg-white"
                      }>
                        {checked && (
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      .{ft.label}
                    </label>
                  );
                })}
              </div>

              {hasTypes ? (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-gray-500">Staff will see:</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ background: MAROON, color: "#fff" }}>
                    {formatFileTypes(allowedTypes)}
                  </span>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 mt-1.5 italic">{isFileUpload ? "No restriction — all file types accepted." : "Choose at least one media type."}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Max Files</label>
              <input
                type="number"
                min={1}
                max={20}
                value={entry.maxFiles ?? 1}
                onChange={e => onUpdate("maxFiles", Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 h-8 border border-gray-300 rounded-sm px-2 text-xs outline-none focus:border-[#7b1113]"
              />
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

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function CreateAssignmentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const courseId = params?.id ?? "";

  // ── Get current session user ──────────────────────────────────────────────
  const { data: session } = useSession();
  const sessionUserId = (session?.user as { id?: string })?.id ?? null;

  const initial = useMemo(() => ({
    name: searchParams.get("name") ?? "",
    points: searchParams.get("points") ?? "0",
    group: searchParams.get("group") ?? "",
  }), [searchParams]);

  const [activeTab, setActiveTab] = useState<TabKey>("details");

  const TABS: { key: TabKey; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "submission", label: "Submission" },
    { key: "settings", label: "Settings" },
    { key: "assign", label: "Assign" },
  ];

  // Form state
  const [name, setName] = useState(initial.name);
  const [points, setPoints] = useState(initial.points);
  const [description, setDescription] = useState("");
  const [group, setGroup] = useState(initial.group || "Assignments");
  const [groups, setGroups] = useState<AssignmentGroup[]>([{ id: 1, name: "Assignments" }]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [displayGradeAs, setDisplayGradeAs] = useState("Points");
  const [submissionType, setSubmissionType] = useState("Online");
  const [published, setPublished] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Submission entries
  const [submissionEntries, setSubmissionEntries] = useState<SubmissionEntry[]>([
    { id: 1, label: "", required: false, type: "File Upload", allowedFileTypes: [], maxFiles: 1 },
  ]);

  const addSubmissionEntry = () =>
    setSubmissionEntries(p => [...p, { id: Date.now(), label: "", required: false, type: "File Upload", allowedFileTypes: [], maxFiles: 1 }]);

  const removeSubmissionEntry = (id: number) =>
    setSubmissionEntries(p => p.filter(e => e.id !== id));

  const updateSubmissionEntry = (
    id: number,
    field: keyof SubmissionEntry,
    value: string | boolean | string[] | number | null
  ) =>
    setSubmissionEntries(p => p.map(e => e.id === id ? { ...e, [field]: value } : e));

  const [submissionAttempts, setSubmissionAttempts] = useState("Unlimited");
  const [allowedAttempts, setAllowedAttempts] = useState(1);

  const [isGroupAssignment, setIsGroupAssignment] = useState(false);
  const [assignGradesIndividually, setAssignGradesIndividually] = useState(false);
  const [groupSet, setGroupSet] = useState("");
  const [groupSets, setGroupSets] = useState<GroupSetItem[]>([]);
  const [showGroupSetModal, setShowGroupSetModal] = useState(false);
  const [groupSetName, setGroupSetName] = useState("");
  const [selfSignUp, setSelfSignUp] = useState(false);
  const [requireSameSection, setRequireSameSection] = useState(false);
  const [groupStructure, setGroupStructure] = useState("Create groups later");
  const [createGroupsNow, setCreateGroupsNow] = useState(0);
  const [limitGroupMembers, setLimitGroupMembers] = useState(0);
  const [autoAssignLeader, setAutoAssignLeader] = useState(false);
  const [leaderType, setLeaderType] = useState("first");
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [assignRows, setAssignRows] = useState<AssignTo[]>([{
    id: 1, assignees: ["Everyone"], dueDate: "", dueTime: "",
    availableFrom: "", availableFromTime: "", until: "", untilTime: ""
  }]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!courseId) return;
    fetch(`/api/admin/courses/${courseId}/groupsets`)
      .then(r => r.json())
      .then(d => setGroupSets(d.groupSets ?? []))
      .catch(() => { });
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    fetch(`/api/admin/courses/${courseId}/assignments`)
      .then(r => r.json())
      .then(d => {
        const list = d.assignments ?? [];
        const apiGroupNames: string[] = [...new Set<string>(
          list.map((a: { assignmentGroup: string }) => a.assignmentGroup || "Assignments")
        )];
        if (!apiGroupNames.includes("Assignments")) apiGroupNames.unshift("Assignments");
        const urlGroup = initial.group;
        if (urlGroup && !apiGroupNames.includes(urlGroup)) apiGroupNames.push(urlGroup);
        const builtGroups = apiGroupNames.map((n, i) => ({ id: i + 1, name: n }));
        setGroups(builtGroups);
        if (urlGroup && apiGroupNames.includes(urlGroup)) setGroup(urlGroup);
        else if (!urlGroup) setGroup("Assignments");
        setGroupsLoaded(true);
      })
      .catch(() => { setGroupsLoaded(true); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    fetch(`/api/admin/courses/${courseId}/sections`)
      .then(r => r.json())
      .then(d => {
        const rawStaff = d.staff ?? d.users ?? d.members ?? [];
        setStaff(rawStaff.map((u: { id: string; name?: string; userName?: string; email?: string }) => ({
          id: u.id,
          name: u.name ?? u.userName ?? u.email ?? u.id,
        })));
      })
      .catch(() => { });
  }, [courseId]);

  useEffect(() => {
    if (openDropdownId === null) return;
    const h = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-dropdown]")) setOpenDropdownId(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openDropdownId]);

  const addAssignRow = () => setAssignRows(p => [...p, {
    id: Date.now(), assignees: [], dueDate: "", dueTime: "",
    availableFrom: "", availableFromTime: "", until: "", untilTime: ""
  }]);
  const removeAssignRow = (id: number) => setAssignRows(p => p.filter(r => r.id !== id));
  const updateAssignRow = (id: number, field: keyof AssignTo, value: string | string[]) =>
    setAssignRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const handleDateChange = (id: number, dateField: "dueDate" | "availableFrom" | "until", timeField: "dueTime" | "availableFromTime" | "untilTime", value: string) => {
    setAssignRows(p => p.map(r => {
  if (r.id !== id) return r;
  const autoTime = dateField === "availableFrom" && value && !r[timeField] ? "12:00 AM" : r[timeField];
  return { ...r, [dateField]: value, [timeField]: value ? autoTime : "" };
}));
  };

  const getDateErrors = (row: AssignTo) => {
    const errors: { until?: string; availableFrom?: string } = {};
    const toMs = (date: string, time: string) => { if (!date) return null; const t = time || "11:59 PM"; return new Date(`${date} ${t}`).getTime(); };
    const due = toMs(row.dueDate, row.dueTime), until = toMs(row.until, row.untilTime), available = toMs(row.availableFrom, row.availableFromTime);
    if (due && until && until < due) errors.until = "Lock date cannot be before due date";
    if (due && available && available > due) errors.availableFrom = "Unlock date cannot be after due date";
    return errors;
  };

  const toggleAssignee = (rowId: number, personName: string) => setAssignRows(p => p.map(r => {
    if (r.id !== rowId) return r;
    if (personName === "Everyone") {
      return { ...r, assignees: ["Everyone"] };
    }
    const withoutEveryone = r.assignees.filter(a => a !== "Everyone");
    const has = withoutEveryone.includes(personName);
    const next = has ? withoutEveryone.filter(a => a !== personName) : [...withoutEveryone, personName];
    return { ...r, assignees: next.length ? next : ["Everyone"] };
  }));

  const saveGroup = () => {
    const n = newGroupName.trim();
    if (!n) return;
    if (!groups.find(g => g.name === n)) setGroups(p => [...p, { id: Date.now(), name: n }]);
    setGroup(n);
    setGroupModalOpen(false);
    setNewGroupName("");
  };

  const handleSave = async (publish: boolean) => {
    setSaveError(null);
    if (!name.trim()) { setSaveError("Assignment Name is required."); return; }
    if (!courseId) { setSaveError("Course ID missing."); return; }
    if (submissionType === "Online" && submissionEntries.length === 0) { setSaveError("Please add at least one submission entry."); return; }
    setSaving(true);
    try {
      const row = assignRows[0];
      const res = await fetch(`/api/admin/courses/${courseId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: name.trim(),
          description,
          points: parseFloat(points) || 0,
          submissionType,
          assignmentGroup: group,
          displayGradeAs,
          status: publish ? "PUBLISHED" : "UNPUBLISHED",
          assignees: row?.assignees ?? [],
          dueDate: row?.dueDate || null,
          dueTime: row?.dueTime || null,
          availableFrom: row?.availableFrom || null,
          availableFromTime: row?.availableFromTime || null,
          availableUntil: row?.until || null,
          untilTime: row?.untilTime || null,
          submissionEntries: submissionEntries.map(entry => ({
            id: entry.id,
            label: entry.label,
            required: entry.required,
            type: entry.type,
            allowedFileTypes:
              entry.type === "File Upload" || entry.type === "Media Recording"
                ? normalizeFileTypes(entry.allowedFileTypes)
                : [],
            maxFiles:
              entry.type === "File Upload" || entry.type === "Media Recording"
                ? entry.maxFiles ?? 1
                : null,
          })),
          submissionAttempts,
          allowedAttempts: submissionAttempts === "Limited" ? allowedAttempts : null,
          isGroupAssignment,
          groupSetId: groupSet || null,
          notifyUsers,
          createdById: sessionUserId,
        }),
      });
      if (res.ok) {
        setPublished(publish);
        router.push(`/admin/courses/${courseId}/assignments`);
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError((data as { error?: string })?.error ?? `Server error: ${res.status}`);
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // suppress assignGradesIndividually unused warning
  void assignGradesIndividually;

  if (!mounted) return null;

  const BottomBar = (
    <div className="shrink-0 border-t border-gray-200 bg-white px-4 sm:px-8 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        {saveError && <span className="text-xs text-red-600 font-medium">⚠ {saveError}</span>}
      </div>
      <div className="flex items-center gap-2 justify-end flex-wrap">
        <button
          onClick={() => router.push(`/admin/courses/${courseId}/assignments`)}
          disabled={saving}
          className="h-8 px-4 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        {activeTab !== "details" && (
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === "submission" ? "details" : activeTab === "settings" ? "submission" : "settings")}
            className="h-8 px-4 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50"
          >
            ← Back
          </button>
        )}
        {activeTab !== "assign" && (
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === "details" ? "submission" : activeTab === "submission" ? "settings" : "assign")}
            className="h-8 px-4 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100"
          >
            Next →
          </button>
        )}
        {activeTab === "assign" && (
          <>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="h-8 px-4 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save & Publish"}
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              style={{ background: MAROON }}
              className="h-8 px-4 text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-white flex flex-col" suppressHydrationWarning>

      {/* Top bar */}
      <div className="flex items-center justify-end px-4 sm:px-6 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded-full border" style={published ? { background: "#22c55e", borderColor: "#22c55e" } : { borderColor: "#9ca3af" }} />
          {published ? "Published" : "Not Published"}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-end border-b border-gray-200 px-2 sm:px-6 bg-white shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 sm:px-5 py-2 text-xs border border-b-0 -mb-px mr-0.5 rounded-t transition-colors whitespace-nowrap
              ${activeTab === t.key
                ? "bg-white border-gray-200 text-gray-900 font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-6">

        {/* ══ DETAILS ══ */}
        {activeTab === "details" && (
          <div className="space-y-5 max-w-3xl">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Assignment Name <span className="text-red-500">*</span></label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Assignment Name"
                className="w-full h-9 border rounded-sm px-3 text-sm outline-none focus:ring-1 transition-all"
                style={{ borderColor: MAROON }}
                onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 2px ${MAROON}30`; }}
                onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Description</label>
              <RichTextEditor onChange={setDescription} placeholder="Assignment description..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] items-start gap-y-4 gap-x-4">
              <label className="text-xs text-gray-700 sm:text-right pt-2">Points</label>
              <input
                type="number"
                min={0}
                value={points}
                onChange={e => setPoints(e.target.value)}
                className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-full sm:w-80 outline-none focus:border-[#7b1113]"
              />

              <label className="text-xs text-gray-700 sm:text-right pt-2">Assignment Group</label>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={group}
                  onChange={e => {
                    if (e.target.value === "__create__") {
                      setNewGroupName(""); setGroupModalOpen(true);
                    } else {
                      setGroup(e.target.value);
                    }
                  }}
                  className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-full sm:w-80 bg-white outline-none focus:border-[#7b1113]"
                  disabled={!groupsLoaded}
                >
                  {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                  <option value="__create__">[ Create Group ]</option>
                </select>
                {initial.group && group === initial.group && (
                  <span className="text-[10px] px-2 py-0.5 rounded text-white font-medium" style={{ background: MAROON }}>
                    From group
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ SUBMISSION ══ */}
        {activeTab === "submission" && (
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] items-start gap-y-5 gap-x-4 max-w-3xl">
            <label className="text-xs text-gray-700 sm:text-right pt-2">Submission Type</label>
            <select
              value={submissionType}
              onChange={e => setSubmissionType(e.target.value)}
              className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-full sm:w-80 bg-white outline-none focus:border-[#7b1113]"
            >
              {SUBMISSION_TYPES.map(o => <option key={o}>{o}</option>)}
            </select>

            {submissionType === "Online" && (
              <>
                <label className="text-xs text-gray-700 sm:text-right pt-2">
                  Submission Entries <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3 w-full sm:max-w-xl">
                  {submissionEntries.map((entry, idx) => (
                    <SubmissionEntryCard
                      key={entry.id}
                      entry={entry}
                      index={idx + 1}
                      canRemove={submissionEntries.length > 1}
                      onRemove={() => removeSubmissionEntry(entry.id)}
                      onUpdate={(field, value) => updateSubmissionEntry(entry.id, field, value)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addSubmissionEntry}
                    className="w-full h-9 border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-600 rounded-md hover:bg-gray-100 hover:border-gray-400 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    + Add Submission Entry
                  </button>

                  <div className="rounded-md p-3 border text-xs" style={{ background: "#fef2f2", borderColor: "#f0c0c0" }}>
                    <p className="font-bold mb-2" style={{ color: MAROON }}>Staff View Preview</p>
                    <div className="space-y-2">
                      {submissionEntries.map(entry => {
                        const allowed = normalizeFileTypes(entry.allowedFileTypes);
                        const showTypes = (entry.type === "File Upload" || entry.type === "Media Recording") && allowed.length > 0;
                        return (
                          <div key={entry.id} className="flex items-center gap-2 flex-wrap bg-white rounded border border-gray-100 px-2.5 py-2">
                            <span className="text-xs font-semibold text-gray-700">{entry.label || entry.type}</span>
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={entry.required ? { background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" } : { background: "#f3f4f6", color: "#6b7280" }}
                            >
                              {entry.required ? "Required" : "Optional"}
                            </span>
                            {showTypes && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ background: MAROON, color: "#fff" }}>
                                {formatFileTypes(allowed)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-gray-400 mt-2">Example: File Upload <strong>[Required]</strong> <strong>[PDF]</strong>.</p>
                  </div>
                </div>
              </>
            )}

            <label className="text-xs text-gray-700 sm:text-right pt-2">Submission Attempts</label>
            <div className="border border-gray-200 rounded-sm p-3 w-full sm:w-80 space-y-2">
              <p className="text-xs font-medium text-gray-700">Allowed Attempts</p>
              <select
                value={submissionAttempts}
                onChange={e => setSubmissionAttempts(e.target.value)}
                className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-full bg-white outline-none focus:border-[#7b1113]"
              >
                <option>Unlimited</option><option>Limited</option>
              </select>
              {submissionAttempts === "Limited" && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Number of Attempts</p>
                  <input
                    type="number"
                    min={1}
                    value={allowedAttempts}
                    onChange={e => setAllowedAttempts(parseInt(e.target.value) || 1)}
                    className="h-8 w-24 border border-gray-300 rounded-sm px-2 text-xs outline-none focus:border-[#7b1113]"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] items-start gap-y-5 gap-x-4 max-w-3xl">
            <label className="text-xs text-gray-700 sm:text-right pt-2">Display Grade as</label>
            <select
              value={displayGradeAs}
              onChange={e => setDisplayGradeAs(e.target.value)}
              className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-full sm:w-80 bg-white outline-none focus:border-[#7b1113]"
            >
              {GRADE_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>


            <label className="text-xs text-gray-700 sm:text-right pt-2">Group Assignment</label>
            <div className="border border-gray-200 rounded-sm p-3 w-full sm:w-80 space-y-2">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" checked={isGroupAssignment} onChange={e => setIsGroupAssignment(e.target.checked)} style={{ accentColor: MAROON }} />
                This is a Group Assignment
              </label>
              {isGroupAssignment && (
                <div className="pl-2 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={assignGradesIndividually} onChange={e => setAssignGradesIndividually(e.target.checked)} style={{ accentColor: MAROON }} />
                    Assign Grades to Each Student Individually
                  </label>
                  <div>
                    <p className="text-xs text-gray-700 mb-1">Group Set</p>
                    <select
                      value={groupSet}
                      onChange={e => {
                        if (e.target.value === "__new__") {
                          setGroupSetName(""); setSelfSignUp(false); setRequireSameSection(false);
                          setGroupStructure("Create groups later"); setShowGroupSetModal(true);
                        } else setGroupSet(e.target.value);
                      }}
                      className="h-7 w-full border border-gray-300 rounded-sm px-2 text-xs bg-white outline-none focus:border-[#7b1113]"
                    >
                      <option value="">Select a group category</option>
                      {groupSets.map(gs => <option key={gs.id} value={gs.id}>{gs.name}</option>)}
                      <option value="__new__">+ New Group Set</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ ASSIGN ══ */}
        {activeTab === "assign" && (
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] items-start gap-y-5 gap-x-4 max-w-3xl">
            <label className="text-xs text-gray-700 sm:text-right pt-2">Assign Access</label>
            <div className="space-y-3 w-full">
              {assignRows.map((row, idx) => (
                <div key={row.id} className="border border-gray-200 rounded-sm p-3 space-y-3 w-full sm:max-w-xl relative">
                  {idx > 0 && (
                    <button type="button" onClick={() => removeAssignRow(row.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs">✕</button>
                  )}

                  <div className="relative" data-dropdown onMouseDown={e => e.stopPropagation()}>
                    <p className="text-xs font-medium text-gray-700 mb-1">Assign To</p>
                    <div
                      onMouseDown={e => { e.stopPropagation(); setOpenDropdownId(openDropdownId === row.id ? null : row.id); setDropdownSearch(""); }}
                      className="w-full min-h-7.5 border rounded-sm px-2 py-1 text-xs flex flex-wrap gap-1 items-center cursor-pointer bg-white select-none"
                      style={{ borderColor: MAROON }}
                    >
                      {row.assignees.length > 0 ? row.assignees.map(a => (
                        <span key={a} className="px-2 py-0.5 rounded text-xs flex items-center gap-1 text-white font-medium" style={{ background: MAROON }}>
                          {a}
                          <button
                            type="button"
                            onMouseDown={e => {
                              e.stopPropagation();
                              if (a === "Everyone") return;
                              toggleAssignee(row.id, a);
                            }}
                            className="hover:opacity-70 font-bold ml-0.5"
                          >×</button>
                        </span>
                      )) : <span className="text-gray-400">Start typing to search...</span>}
                      <span className="ml-auto text-gray-400 text-[10px] pl-2 shrink-0">{openDropdownId === row.id ? "▲" : "▼"}</span>
                    </div>

                    {openDropdownId === row.id && (
                      <div
                        data-dropdown
                        className="absolute z-50 w-full bg-white border border-gray-200 shadow-lg rounded-sm mt-0.5 max-h-52 overflow-y-auto"
                        onMouseDown={e => e.stopPropagation()}
                      >
                        <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white">
                          <input
                            autoFocus
                            value={dropdownSearch}
                            onChange={e => setDropdownSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full h-6 px-2 text-xs border border-gray-200 rounded outline-none focus:border-[#7b1113]"
                          />
                        </div>

                        {["Everyone"].filter(o => o.toLowerCase().includes(dropdownSearch.toLowerCase())).map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, opt); }}
                            className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                            style={{ color: row.assignees.includes(opt) ? MAROON : "#374151", fontWeight: row.assignees.includes(opt) ? 600 : 400 }}
                          >
                            {opt}{row.assignees.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
                          </button>
                        ))}

                        {staff.filter(s => s.name.toLowerCase().includes(dropdownSearch.toLowerCase())).length > 0 && (
                          <>
                            <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 bg-gray-50">Staff</div>
                            {staff.filter(s => s.name.toLowerCase().includes(dropdownSearch.toLowerCase())).map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }}
                                className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50"
                                style={{ color: row.assignees.includes(s.name) ? MAROON : "#374151", fontWeight: row.assignees.includes(s.name) ? 600 : 400 }}
                              >
                                {s.name}{row.assignees.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {(() => {
                    const errs = getDateErrors(row);
                    return ([
                      ["Due Date", "dueDate", "dueTime", undefined] as const,
                      ["Available from", "availableFrom", "availableFromTime", errs.availableFrom] as const,
                      ["Until", "until", "untilTime", errs.until] as const,
                    ].map(([label, dateField, timeField, errMsg]) => (
                      <div key={label}>
                        <p className="text-xs font-medium text-gray-700 mb-1">{label}</p>
                        <div className={`flex gap-0 border rounded-sm overflow-hidden ${errMsg ? "border-red-500" : "border-gray-300"}`}>
                          <input
                            type="date"
                            value={row[dateField]}
                            onChange={e => handleDateChange(row.id, dateField as "dueDate" | "availableFrom" | "until", timeField as "dueTime" | "availableFromTime" | "untilTime", e.target.value)}
                            className="flex-1 h-7 border-0 px-2 text-xs outline-none bg-white min-w-0"
                          />
                          <div className="w-px bg-gray-200 self-stretch" />
                          <select
                            value={row[timeField]}
                            onChange={e => updateAssignRow(row.id, timeField, e.target.value)}
                            className="h-7 border-0 px-2 text-xs bg-white outline-none w-24 sm:w-28"
                          >
                            <option value="">Time</option>
                            {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        {errMsg && <p className="text-xs text-red-500 mt-0.5">{errMsg}</p>}
                        <button
                          type="button"
                          onClick={() => { updateAssignRow(row.id, dateField, ""); updateAssignRow(row.id, timeField, ""); }}
                          className="text-xs hover:underline mt-0.5"
                          style={{ color: MAROON }}
                        >
                          Clear
                        </button>
                      </div>
                    )));
                  })()}
                </div>
              ))}

              <button
                type="button"
                onClick={addAssignRow}
                className="w-full sm:max-w-xl h-8 border border-gray-300 bg-gray-50 text-xs text-gray-600 rounded-sm hover:bg-gray-100 flex items-center justify-center gap-1"
              >
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

      {/* ── Add Assignment Group Modal ── */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
          <div className="w-full max-w-115 bg-white shadow-xl border border-gray-200 rounded">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">Add Assignment Group</div>
              <button onClick={() => setGroupModalOpen(false)} className="w-6 h-6 flex items-center justify-center border text-gray-700 rounded text-sm" style={{ borderColor: MAROON, color: MAROON }}>×</button>
            </div>
            <div className="px-6 py-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <label className="text-xs text-gray-700">Group Name:</label>
                <input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveGroup()}
                  placeholder="e.g., Essay Group 1"
                  className="flex-1 w-full h-8 border border-gray-300 px-2 text-xs outline-none focus:border-[#7b1113] rounded-sm"
                />
              </div>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex justify-end gap-2">
              <button onClick={() => setGroupModalOpen(false)} className="h-8 px-4 border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50 rounded">Cancel</button>
              <button onClick={saveGroup} style={{ background: MAROON }} className="h-8 px-4 text-white text-xs rounded hover:opacity-90">Add Group</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Group Set Modal ── */}
      {showGroupSetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">Create Group Set</h2>
              <button onClick={() => setShowGroupSetModal(false)} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100 text-sm">✕</button>
            </div>
            <div className="px-6 py-5 space-y-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 pb-4">
                <label className="text-sm text-gray-700 sm:w-36 shrink-0">Group Set Name <span className="text-red-500">*</span></label>
                <input
                  value={groupSetName}
                  onChange={e => setGroupSetName(e.target.value)}
                  placeholder="Enter Group Set Name"
                  className="flex-1 w-full h-9 border border-gray-300 rounded px-3 text-sm outline-none focus:border-[#7b1113]"
                />
              </div>
              <div className="border-t border-gray-200 py-4">
                <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
                  <label className="text-sm text-gray-700 sm:w-36 shrink-0 pt-0.5">Self Sign-Up</label>
                  <div className="space-y-2 flex-1">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={selfSignUp} onChange={e => { setSelfSignUp(e.target.checked); if (!e.target.checked) setRequireSameSection(false); }} style={{ accentColor: MAROON }} />
                      Allow self sign-up
                    </label>
                    <label className={`flex items-center gap-2 text-sm cursor-pointer ${selfSignUp ? "text-gray-700" : "text-gray-400"}`}>
                      <input type="checkbox" checked={requireSameSection} onChange={e => setRequireSameSection(e.target.checked)} disabled={!selfSignUp} style={{ accentColor: MAROON }} />
                      Require group members to be in the same section
                    </label>
                    {selfSignUp && (
                      <div className="pt-2 space-y-3">
                        <div>
                          <p className="text-sm text-gray-700 mb-1">Create groups now</p>
                          <div className="flex items-center border border-gray-300 rounded w-32">
                            <input type="number" min={0} value={createGroupsNow} onChange={e => setCreateGroupsNow(parseInt(e.target.value) || 0)} className="flex-1 h-8 px-2 text-sm outline-none rounded-l" />
                            <div className="flex flex-col border-l border-gray-300">
                              <button onClick={() => setCreateGroupsNow(p => p + 1)} className="h-4 px-1.5 text-gray-500 hover:bg-gray-100 text-[10px] leading-none">▲</button>
                              <button onClick={() => setCreateGroupsNow(p => Math.max(0, p - 1))} className="h-4 px-1.5 text-gray-500 hover:bg-gray-100 border-t border-gray-300 text-[10px] leading-none">▼</button>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-700 mb-1">Limit group members to</p>
                          <div className="flex items-center border border-gray-300 rounded w-32">
                            <input type="number" min={0} value={limitGroupMembers} onChange={e => setLimitGroupMembers(parseInt(e.target.value) || 0)} className="flex-1 h-8 px-2 text-sm outline-none rounded-l" />
                            <div className="flex flex-col border-l border-gray-300">
                              <button onClick={() => setLimitGroupMembers(p => p + 1)} className="h-4 px-1.5 text-gray-500 hover:bg-gray-100 text-[10px] leading-none">▲</button>
                              <button onClick={() => setLimitGroupMembers(p => Math.max(0, p - 1))} className="h-4 px-1.5 text-gray-500 hover:bg-gray-100 border-t border-gray-300 text-[10px] leading-none">▼</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {!selfSignUp && (
                <div className="border-t border-gray-200 py-4">
                  <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
                    <label className="text-sm text-gray-700 sm:w-36 shrink-0 pt-2">Group Structure</label>
                    <select
                      value={groupStructure}
                      onChange={e => setGroupStructure(e.target.value)}
                      className="flex-1 w-full h-9 border border-gray-300 rounded px-3 text-sm bg-white outline-none focus:border-[#7b1113]"
                    >
                      <option>Create groups later</option>
                      <option>Split students by number of groups</option>
                      <option>Split number of students per group</option>
                    </select>
                  </div>
                </div>
              )}
              {groupStructure !== "Create groups later" && (
                <div className="border-t border-gray-200 py-4">
                  <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
                    <label className="text-sm text-gray-700 sm:w-36 shrink-0 pt-0.5">Leadership</label>
                    <div className="space-y-2 flex-1">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={autoAssignLeader} onChange={e => setAutoAssignLeader(e.target.checked)} style={{ accentColor: MAROON }} />
                        Automatically assign a student group leader
                      </label>
                      <div className="pl-2 space-y-1">
                        {([["first", "Set first student to join as group leader"], ["random", "Set a random student as group leader"]] as [string, string][]).map(([val, lbl]) => (
                          <label key={val} className={`flex items-center gap-2 text-sm cursor-pointer ${autoAssignLeader ? "text-gray-700" : "text-gray-400"}`}>
                            <input type="radio" name="leaderType" value={val} checked={leaderType === val} onChange={() => setLeaderType(val)} disabled={!autoAssignLeader} style={{ accentColor: MAROON }} />
                            {lbl}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button onClick={() => setShowGroupSetModal(false)} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
              <button
                onClick={async () => {
                  if (!groupSetName.trim()) return;
                  try {
                    const res = await fetch(`/api/admin/courses/${courseId}/groupsets`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: groupSetName.trim(), selfSignUp, requireSameSection, groupStructure, createGroupsNow, limitGroupMembers, autoAssignLeader, leaderType })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const newGs = data.groupSet;
                      setGroupSets(p => [...p, { id: newGs.id, name: newGs.name }]);
                      setGroupSet(newGs.id);
                      setShowGroupSetModal(false);
                    }
                  } catch { /* ignore */ }
                }}
                style={{ background: MAROON }}
                className="px-4 py-2 text-white text-sm rounded hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {BottomBar}
    </div>
  );
}