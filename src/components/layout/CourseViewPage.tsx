"use client";

// src/components/layout/CourseViewPage.tsx

import {
  useState,
  useEffect,
  useTransition,
  Suspense,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  MoreVertical,
  Search,
  Plus,
  Settings,
  Lock,
} from "lucide-react";
import { AnnouncementCreateView } from "@/components/admin/CourseAnnouncementsPage";
import CourseFormsPage from "@/components/layout/CourseFormsPage";
import CreateAssignmentPage from "@/components/admin/CreateAssignmentPage";

// ── Theme ──────────────────────────────────────────────────────────────────────
const FONT = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";
const MAROON = "#7b1113";
const COLORS = {
  primary: "#7b1113",
  primaryHover: "#5a0d0f",
  primarySoft: "#fdf8f8",
  primarySoftBorder: "#f0e4e4",
  text: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  link: "#7b1113",
  border: "#e5e7eb",
  success: "#15803d",
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface Course {
  id: string;
  name: string;
  code: string;
  color: string;
  image: string | null;
  status: string;
  term: string | null;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  points: number;
  status: string;
  submissionType: string;
  assignmentGroup: string;
  submissions?: { status: string; grade: number | null; submittedAt: string | null }[];
}

interface RawAnnouncement {
  id?: string | number;
  title?: string;
  topicTitle?: string;
  bodyText?: string;
  bodyHtml?: string;
  message?: string;
  author?: string;
  authorName?: string;
  authorImage?: string | null;
  postTo?: string | string[];
  assignTo?: string | string[];
  createdAtIso?: string;
  createdAt?: string;
  created_at?: string;
  read?: boolean;
  locked?: boolean;
  allowComments?: boolean;
  allowLiking?: boolean;
  attachments?: {
    id: string;
    name: string;
    size: number;
    mimeType?: string;
    type?: string;
    url: string;
  }[];
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  bodyHtml: string;
  authorName: string;
  authorImage: string | null;
  recipientsLabel: string;
  createdAt: string | null;
  read: boolean;
  locked: boolean;
  allowComments: boolean;
  allowLiking: boolean;
  attachments: { id: string; name: string; size: number; type: string; url: string }[];
}

interface AnnouncementCreateAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface Person {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  pronouns: string | null;
  department: string | null;
  position: string | null;
  employmentStatus: string | null;
  bio: string | null;
  status: string;
}

interface GroupMember {
  id: string;
  name: string | null;
  image: string | null;
  isLeader: boolean;
}

interface Group {
  id: string;
  name: string;
  groupSetId: string;
  groupSetName: string;
  memberCount: number;
  isMember: boolean;
  members: GroupMember[];
}

interface MembershipPermissions {
  viewCourse: boolean;
  viewAnnouncements: boolean;
  submitAssignments: boolean;
  manageAnnouncements: boolean;
  manageAssignments: boolean;
  managePeople: boolean;
  manageCourse: boolean;
}

interface Membership {
  role: "Staff" | "Head";
  permissions: MembershipPermissions;
}

type Tab =
  | "Home"
  | "Announcements"
  | "Assignments"
  | "Discussions"
  | "Grades"
  | "People"
  | "Files"
  | "Syllabus"
  | "Collaborations"
  | "Quizzes"
  | "Settings";

// All possible tabs in order
const ALL_TABS: Tab[] = [
  "Home",
  "Announcements",
  "Assignments",
  "Discussions",
  "Grades",
  "People",
  "Files",
  "Syllabus",
  "Collaborations",
  "Quizzes",
];

// Tabs hidden for Head role
const HIDDEN_FOR_HEAD: Tab[] = ["Discussions", "Collaborations", "Syllabus", "Files"];

// Tabs hidden for Staff role (same + Settings is never shown for Staff)
const HIDDEN_FOR_STAFF: Tab[] = ["Discussions", "Collaborations", "Syllabus", "Files"];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " by " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  );
}

function fmtDateLong(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function fmtAvail(from: string | null, until: string | null) {
  const f = from
    ? new Date(from).toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " at " +
      new Date(from)
        .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        .toLowerCase()
    : null;

  const u = until
    ? new Date(until).toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " at " +
      new Date(until)
        .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        .toLowerCase()
    : null;

  return [f, u].filter(Boolean).join(" - ");
}

function stripHtml(html: string) {
  if (!html) return "";
  if (typeof window === "undefined") return html.replace(/<[^>]+>/g, " ");
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function normalizeRecipients(value: string | string[] | undefined) {
  if (!value) return "Everyone";
  if (Array.isArray(value)) return value.length === 0 ? "Everyone" : value.join(", ");
  return value;
}

function normalizeAnnouncement(a: RawAnnouncement, index: number): Announcement {
  return {
    id: String(a.id ?? index),
    title: a.title || a.topicTitle || "(Untitled announcement)",
    body: a.bodyText || a.message || stripHtml(a.bodyHtml || "") || "",
    bodyHtml: a.bodyHtml || "",
    authorName: a.authorName || a.author || "Admin",
    authorImage: a.authorImage ?? null,
    recipientsLabel: normalizeRecipients(a.assignTo || a.postTo),
    createdAt: a.createdAtIso || a.createdAt || a.created_at || null,
    read: Boolean(a.read),
    locked: Boolean(a.locked),
    allowComments: a.allowComments !== false,
    allowLiking: Boolean(a.allowLiking),
    attachments: (a.attachments ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      type: f.mimeType || f.type || "",
      url: f.url,
    })),
  };
}

function normalizeCourseRole(role: string | null | undefined): "Staff" | "Head" {
  return role?.trim().toLowerCase() === "head" ? "Head" : "Staff";
}

// ── useOnClickOutside ─────────────────────────────────────────────────────────
function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void
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

// ── WordCountModal ────────────────────────────────────────────────────────────
function WordCountModal({
  text, chars, charsNoSpace, paragraphs, onClose,
}: {
  text: string; chars: number; charsNoSpace: number; paragraphs: number; onClose: () => void;
}) {
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-72 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">Word Count</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4 space-y-2 text-xs text-gray-700">
          {([["Words", words], ["Characters (with spaces)", chars], ["Characters (no spaces)", charsNoSpace], ["Paragraphs", paragraphs]] as [string, number][]).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-gray-100 pb-1 last:border-0">
              <span>{k}</span>
              <span className="font-semibold">{v}</span>
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

// ── FindReplaceModal ──────────────────────────────────────────────────────────
function FindReplaceModal({ html, onUpdate, onClose }: { html: string; onUpdate: (html: string) => void; onClose: () => void; }) {
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-80 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">Find and Replace</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Find</label>
            <input autoFocus value={find} onChange={(e) => setFind(e.target.value)} className="w-full h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" placeholder="Search text..." />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Replace with</label>
            <input value={replace} onChange={(e) => setReplace(e.target.value)} className="w-full h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" placeholder="Replacement..." />
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

// ── HTMLEditorModal ───────────────────────────────────────────────────────────
function HTMLEditorModal({ html: initialHtml, onUpdate, onClose }: { html: string; onUpdate: (html: string) => void; onClose: () => void; }) {
  const [html, setHtml] = useState(initialHtml);
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded shadow-xl w-[42rem] max-w-[95vw] border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-800">HTML Editor</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4">
          <textarea value={html} onChange={(e) => setHtml(e.target.value)} className="w-full h-64 border border-gray-300 rounded px-3 py-2 text-xs font-mono outline-none focus:border-[#7b1113] resize-none" />
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="h-7 px-3 border border-gray-300 text-xs text-gray-700 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onUpdate(html); onClose(); }} style={{ background: MAROON }} className="h-7 px-3 text-white text-xs rounded hover:opacity-90">Apply</button>
        </div>
      </div>
    </div>
  );
}

// ── ColorPickerModal ──────────────────────────────────────────────────────────
function ColorPickerModal({ type, onClose }: { type: "foreColor" | "backColor"; onClose: () => void; }) {
  const colors = type === "foreColor"
    ? ["#000000", "#374151", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"]
    : ["transparent", "#fef9c3", "#fce7f3", "#e0f2fe", "#dcfce7", "#ede9fe", "#ffedd5", "#fee2e2", "#d1fae5", "#f1f5f9"];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40" onClick={onClose}>
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
              onClick={() => { document.execCommand(type, false, c === "transparent" ? undefined : c); onClose(); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Toolbar helpers ───────────────────────────────────────────────────────────
function ToolbarButton({ label, onClick, title, cls = "" }: { label: React.ReactNode; onClick: () => void; title?: string; cls?: string; }) {
  return (
    <button type="button" title={title} onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`h-7 min-w-7 px-2 border border-transparent rounded text-xs hover:bg-blue-50 hover:border-blue-200 ${cls}`}>
      {label}
    </button>
  );
}
function ToolbarSep() { return <div className="w-px h-5 bg-gray-300 mx-1" />; }

// ── RichTextEditor ────────────────────────────────────────────────────────────
function RichTextEditor({ valueHtml, onChangeHtml, onChangeText, placeholder = "Write a reply..." }: {
  valueHtml: string; onChangeHtml: (html: string) => void; onChangeText: (text: string) => void; placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [showWC, setShowWC] = useState(false);
  const [showFR, setShowFR] = useState(false);
  const [showHTML, setShowHTML] = useState(false);
  const [showColor, setShowColor] = useState<"foreColor" | "backColor" | null>(null);
  const [isFS, setIsFS] = useState(false);
  const [wcData, setWcData] = useState({ text: "", chars: 0, charsNoSpace: 0, paragraphs: 0 });
  const [editorHtml, setEditorHtml] = useState("");

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (valueHtml === "" && el.innerHTML !== "") el.innerHTML = "";
  }, [valueHtml]);

  const exec = useCallback((cmd: string, val?: string) => { editorRef.current?.focus(); document.execCommand(cmd, false, val ?? undefined); }, []);
  const fmt = useCallback((tag: string) => { editorRef.current?.focus(); document.execCommand("formatBlock", false, tag); }, []);
  const insertHTML = useCallback((html: string) => { editorRef.current?.focus(); document.execCommand("insertHTML", false, html); }, []);

  const insertTable = useCallback((rows: number, cols: number) => {
    const header = `<tr>${Array.from({ length: cols }).map(() => `<th style="border:1px solid #dee2e6;padding:6px 10px;background:#f7f9fb;font-weight:600;">&nbsp;</th>`).join("")}</tr>`;
    const body = Array.from({ length: Math.max(rows - 1, 1) }).map(() => `<tr>${Array.from({ length: cols }).map(() => `<td style="border:1px solid #dee2e6;padding:6px 10px;">&nbsp;</td>`).join("")}</tr>`).join("");
    insertHTML(`<table style="border-collapse:collapse;width:100%;margin:8px 0;"><thead>${header}</thead><tbody>${body}</tbody></table><p><br></p>`);
  }, [insertHTML]);

  const updateWC = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.innerText.trim();
    setWordCount(text ? text.split(/\s+/).filter(Boolean).length : 0);
    onChangeHtml(el.innerHTML);
    onChangeText(text);
  }, [onChangeHtml, onChangeText]);

  const readEditorStats = useCallback(() => {
    const el = editorRef.current;
    const text = el?.innerText.trim() ?? "";
    return { html: el?.innerHTML ?? "", text, chars: el?.innerText.length ?? 0, charsNoSpace: text.replace(/\s/g, "").length, paragraphs: el?.querySelectorAll("p").length ?? 0 };
  }, []);

  const openWordCount = useCallback(() => { const s = readEditorStats(); setWcData({ text: s.text, chars: s.chars, charsNoSpace: s.charsNoSpace, paragraphs: s.paragraphs }); setShowWC(true); }, [readEditorStats]);
  const openFindReplace = useCallback(() => { setEditorHtml(readEditorStats().html); setShowFR(true); }, [readEditorStats]);
  const openHtmlEditor = useCallback(() => { setEditorHtml(readEditorStats().html); setShowHTML(true); }, [readEditorStats]);

  const toggleFS = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { el.requestFullscreen?.(); setIsFS(true); }
    else { document.exitFullscreen?.(); setIsFS(false); }
  }, []);

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setIsFS(false); };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); openFindReplace(); } };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [openFindReplace]);

  return (
    <>
      {showWC && <WordCountModal text={wcData.text} chars={wcData.chars} charsNoSpace={wcData.charsNoSpace} paragraphs={wcData.paragraphs} onClose={() => setShowWC(false)} />}
      {showFR && <FindReplaceModal html={editorHtml} onUpdate={(h) => { if (editorRef.current) editorRef.current.innerHTML = h; updateWC(); }} onClose={() => setShowFR(false)} />}
      {showHTML && <HTMLEditorModal html={editorHtml} onUpdate={(h) => { if (editorRef.current) editorRef.current.innerHTML = h; updateWC(); }} onClose={() => setShowHTML(false)} />}
      {showColor && <ColorPickerModal type={showColor} onClose={() => setShowColor(null)} />}

      <div ref={wrapRef} className="border border-gray-300 rounded overflow-hidden flex flex-col" style={{ minHeight: 220 }}>
        <div className="flex items-center gap-1 px-2 py-1 bg-[#f7f9fb] border-b border-gray-200 select-none flex-wrap">
          <ToolbarButton label="Undo" onClick={() => exec("undo")} />
          <ToolbarButton label="Redo" onClick={() => exec("redo")} />
          <ToolbarSep />
          <select className="h-7 border border-gray-300 rounded text-xs bg-white px-1 outline-none" defaultValue="p" onChange={(e) => fmt(e.target.value)}>
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="blockquote">Blockquote</option>
            <option value="pre">Code</option>
          </select>
          <select className="h-7 border border-gray-300 rounded text-xs bg-white px-1 outline-none" defaultValue="" onChange={(e) => { if (e.target.value) exec("fontName", e.target.value); }}>
            <option value="">Font</option>
            <option value="inherit">Default</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="monospace">Monospace</option>
          </select>
          <select className="h-7 border border-gray-300 rounded text-xs bg-white px-1 outline-none" defaultValue="3" onChange={(e) => exec("fontSize", e.target.value)}>
            <option value="1">8pt</option>
            <option value="2">10pt</option>
            <option value="3">12pt</option>
            <option value="4">14pt</option>
            <option value="5">18pt</option>
            <option value="6">24pt</option>
            <option value="7">36pt</option>
          </select>
          <ToolbarSep />
          <ToolbarButton label={<strong>B</strong>} onClick={() => exec("bold")} cls="font-bold" />
          <ToolbarButton label={<em>I</em>} onClick={() => exec("italic")} />
          <ToolbarButton label={<u>U</u>} onClick={() => exec("underline")} />
          <ToolbarButton label={<s>S</s>} onClick={() => exec("strikeThrough")} />
          <ToolbarSep />
          <ToolbarButton label="1." onClick={() => exec("insertOrderedList")} />
          <ToolbarButton label="•" onClick={() => exec("insertUnorderedList")} />
          <ToolbarSep />
          <ToolbarButton label="≡L" onClick={() => exec("justifyLeft")} />
          <ToolbarButton label="≡C" onClick={() => exec("justifyCenter")} />
          <ToolbarButton label="≡R" onClick={() => exec("justifyRight")} />
          <ToolbarSep />
          <ToolbarButton label="Link" onClick={() => { const url = prompt("URL:"); if (!url) return; const txt = prompt("Link text:") || url; insertHTML(`<a href="${url}">${txt}</a>`); }} />
          <ToolbarButton label="Image" onClick={() => { const url = prompt("Image URL:"); if (url) insertHTML(`<img src="${url}" style="max-width:100%;" />`); }} />
          <ToolbarButton label="Table" onClick={() => insertTable(3, 3)} />
          <ToolbarSep />
          <ToolbarButton label="A↓" title="Text Color" onClick={() => setShowColor("foreColor")} />
          <ToolbarButton label="▥" title="Background Color" onClick={() => setShowColor("backColor")} />
          <ToolbarButton label="Clear" onClick={() => exec("removeFormat")} />
          <ToolbarSep />
          <ToolbarButton label="Find" onClick={openFindReplace} />
          <ToolbarButton label="Words" onClick={openWordCount} />
          <ToolbarButton label="HTML" onClick={openHtmlEditor} />
          <ToolbarButton label={isFS ? "Exit ⛶" : "⛶"} onClick={toggleFS} cls="ml-auto" />
        </div>
        <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={updateWC} onKeyUp={updateWC} onMouseUp={updateWC} data-placeholder={placeholder}
          className="flex-1 px-4 py-3 text-sm text-gray-800 outline-none overflow-y-auto" style={{ minHeight: 140, lineHeight: 1.7 }} />
        <div className="flex items-center gap-4 px-3 py-1 bg-[#f7f9fb] border-t border-gray-200 text-xs text-gray-400">
          <span>{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
          <span className="ml-auto cursor-pointer hover:text-gray-600" onClick={openHtmlEditor} title="HTML Editor">&lt;/&gt;</span>
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

// ── AnnouncementThreeDot ──────────────────────────────────────────────────────
function AnnouncementThreeDot({ read, onMarkRead }: { read: boolean; onMarkRead: () => void; }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));
  if (read) return null;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1">⋮</button>
      {open && (
        <div className="absolute right-0 top-full z-50 bg-white border border-gray-200 rounded shadow-lg min-w-[152px]" style={{ marginTop: 2 }}>
          <button type="button" onClick={() => { onMarkRead(); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Mark as Read
          </button>
        </div>
      )}
    </div>
  );
}

// ── Role Badge ────────────────────────────────────────────────────────────────
function MembershipBadge({ role }: { role: "Staff" | "Head" }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border" style={{ color: MAROON, borderColor: "#f0c0c0", background: "#fdf8f8" }}>
      {role}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, image, size = 36 }: { name: string | null; image: string | null; size?: number; }) {
  const dim = `${size}px`;
  if (image) return <img src={image} alt={name ?? ""} className="rounded-full object-cover shrink-0" style={{ width: dim, height: dim }} />;
  return (
    <div className="rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-white text-sm font-semibold" style={{ width: dim, height: dim, background: MAROON }}>
      {name?.charAt(0)?.toUpperCase() ?? "A"}
    </div>
  );
}

// ── StudentAnnouncementDetail ─────────────────────────────────────────────────
function StudentAnnouncementDetail({ announcement, onBack, onMarkRead }: { announcement: Announcement; onBack: () => void; onMarkRead: (id: string) => void; }) {
  const [replyHtml, setReplyHtml] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<{ id: number; html: string; text: string; date: string }[]>([]);
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const submitReply = () => {
    if (!replyText.trim()) return;
    setReplies((prev) => [...prev, { id: Date.now(), html: replyHtml, text: replyText.trim(), date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) }]);
    setReplyHtml(""); setReplyText(""); setShowReplyEditor(false);
  };

  return (
    <div className="px-6 py-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm mb-4 hover:underline" style={{ color: MAROON }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back to Announcements
      </button>
      <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
          <Avatar name={announcement.authorName} image={announcement.authorImage} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800">{announcement.authorName}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">AUTHOR</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Posted {fmtDateTime(announcement.createdAt)}</div>
            <div className="text-xs text-gray-400">To: {announcement.recipientsLabel}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {announcement.locked && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Locked
              </span>
            )}
            <AnnouncementThreeDot read={announcement.read} onMarkRead={() => onMarkRead(announcement.id)} />
          </div>
        </div>
        <div className="px-5 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-4">{announcement.title}</h1>
          {announcement.bodyHtml ? (
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: announcement.bodyHtml }} style={{ lineHeight: 1.8 }} />
          ) : announcement.body ? (
            <p className="text-sm text-gray-700 leading-relaxed">{announcement.body}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">No content.</p>
          )}
          {announcement.attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attachments</div>
              <div className="flex flex-wrap gap-2">
                {announcement.attachments.map((f) => (
                  <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors" style={{ color: MAROON }}>
                    📎 {f.name}
                  </a>
                ))}
              </div>
            </div>
          )}
          {announcement.allowLiking && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => { setLiked((v) => !v); setLikeCount((c) => (liked ? c - 1 : c + 1)); }}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border transition-colors"
                style={{ borderColor: liked ? MAROON : "#d1d5db", color: liked ? MAROON : "#6b7280", background: liked ? "#fef2f2" : "transparent" }}>
                👍 {liked ? "Liked" : "Like"} {likeCount > 0 && `(${likeCount})`}
              </button>
            </div>
          )}
        </div>
        {announcement.allowComments && !announcement.locked && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
            {replies.length > 0 && (
              <div className="space-y-3 mb-4">
                {replies.map((r) => (
                  <div key={r.id} className="flex gap-3">
                    <Avatar name="Me" image={null} size={32} />
                    <div className="flex-1 bg-white rounded border border-gray-200 px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">You</span>
                        <span className="text-xs text-gray-400">{r.date}</span>
                      </div>
                      {r.html ? <div className="text-sm text-gray-600 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: r.html }} /> : <p className="text-sm text-gray-600">{r.text}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!showReplyEditor ? (
              <button type="button" onClick={() => setShowReplyEditor(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded hover:opacity-90" style={{ background: MAROON }}>↩ Reply</button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">Write a reply</p>
                <RichTextEditor valueHtml={replyHtml} onChangeHtml={setReplyHtml} onChangeText={setReplyText} placeholder="Write a reply..." />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowReplyEditor(false); setReplyHtml(""); setReplyText(""); }} className="h-8 px-4 border border-gray-300 text-xs text-gray-700 rounded hover:bg-gray-50">Cancel</button>
                  <button type="button" onClick={submitReply} disabled={!replyText.trim()} style={{ background: MAROON }} className="h-8 px-4 text-white text-xs rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">Post Reply</button>
                </div>
              </div>
            )}
          </div>
        )}
        {announcement.locked && (
          <div className="px-5 py-3 border-t border-gray-100 bg-amber-50">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              This announcement is locked. Replies are disabled.
            </p>
          </div>
        )}
        {announcement.allowComments === false && !announcement.locked && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Comments are disabled for this announcement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── StudentAnnouncementList ───────────────────────────────────────────────────
function StudentAnnouncementList({ announcements, filter, setFilter, search, setSearch, onMarkAllRead, onView, onMarkRead, selectedIds, setSelectedIds }: {
  announcements: Announcement[]; filter: string; setFilter: (v: string) => void; search: string; setSearch: (v: string) => void;
  onMarkAllRead: () => void; onView: (id: string) => void; onMarkRead: (id: string) => void;
  selectedIds: Set<string>; setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const hasSelection = selectedIds.size > 0;
  const allChecked = announcements.length > 0 && announcements.every((a) => selectedIds.has(a.id));
  const toggleAll = () => { if (allChecked) setSelectedIds(new Set()); else setSelectedIds(new Set(announcements.map((a) => a.id))); };
  const toggleOne = (id: string) => { setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); };

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative w-40">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none appearance-none pr-8">
            <option value="All">All</option>
            <option value="Unread">Unread</option>
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#7b1113]" />
        </div>
        <button type="button" onClick={onMarkAllRead} className="inline-flex items-center gap-2 text-sm border border-gray-300 px-3 py-2 rounded hover:bg-gray-50 text-gray-700 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          Mark All as Read
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
          <div className="text-lg font-semibold text-gray-600">No Announcements</div>
          <div className="text-sm text-gray-400 mt-1">Nothing to show here yet.</div>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          <div className="flex items-center gap-3 py-2 px-1">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300" style={{ accentColor: MAROON }} title="Select all" />
            <span className="text-xs text-gray-400">Select all</span>
          </div>
          {announcements.map((a) => (
            <div key={a.id} className="flex items-start gap-3 py-4 hover:bg-gray-50 transition-colors" style={{ background: selectedIds.has(a.id) ? "#fef9f9" : undefined }}>
              <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleOne(a.id)} className="mt-1 h-4 w-4 rounded border-gray-300 shrink-0" style={{ accentColor: MAROON }} />
              <Avatar name={a.authorName} image={a.authorImage} size={36} />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(a.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  {!a.read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: MAROON }} />}
                  <h3 className="text-sm font-semibold hover:underline" style={{ color: MAROON }}>{a.title}</h3>
                  {a.locked && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      Locked
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{a.recipientsLabel}</div>
                {a.body && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.body}</p>}
                {a.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    {a.attachments.map((f) => (
                      <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs px-2 py-0.5 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100" style={{ color: MAROON }}>
                        📎 {f.name}
                      </a>
                    ))}
                  </div>
                )}
                <button type="button" onClick={(e) => { e.stopPropagation(); onView(a.id); }} className="mt-1.5 inline-flex items-center gap-1 text-xs hover:underline" style={{ color: MAROON }}>↩ Reply</button>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <AnnouncementThreeDot read={a.read} onMarkRead={() => onMarkRead(a.id)} />
                <div className="text-right text-xs text-gray-500 leading-snug">
                  <div>Posted on:</div>
                  <div>{fmtDateTime(a.createdAt)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar() {
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const isToday = (d: number | null) => d !== null && d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="text-xs select-none" style={{ fontFamily: FONT }}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="p-0.5" style={{ color: COLORS.textMuted }}><ChevronLeft className="w-3.5 h-3.5" /></button>
        <span className="font-semibold text-sm" style={{ color: COLORS.textSecondary }}>{current.toLocaleString("default", { month: "long" })} {year}</span>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="p-0.5" style={{ color: COLORS.textMuted }}><ChevronRight className="w-3.5 h-3.5" /></button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="py-1 text-[11px]" style={{ color: COLORS.textMuted }}>{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} className="w-7 h-7 mx-auto flex items-center justify-center rounded-full text-[12px] cursor-pointer"
            style={{ background: isToday(d) ? COLORS.primary : "transparent", color: isToday(d) ? "#fff" : d ? COLORS.textSecondary : "transparent", fontWeight: isToday(d) ? 700 : 500 }}>
            {d ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignmentIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

function AssignmentRow({ a, courseId, router }: { a: Assignment; courseId: string; router: ReturnType<typeof useRouter>; }) {
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
          {isLocked && (<><span className="font-medium text-gray-600">Available until</span><span>{fmtDate(a.availableFrom)}</span><span>·</span></>)}
          {isClosed && <span className="font-medium text-gray-600">Closed</span>}
          {!isLocked && !isClosed && a.availableFrom && a.availableUntil && (<><span className="font-medium text-gray-600">Available</span><span>{fmtAvail(a.availableFrom, a.availableUntil)}</span><span>·</span></>)}
          {a.dueDate && (<><span><span className="font-medium text-gray-700">Due</span> {fmtDate(a.dueDate)}</span><span>·</span></>)}
          <span>{sub?.grade != null ? `${sub.grade} / ${a.points} pts` : `- / ${a.points} pts`}</span>
        </div>
      </div>
    </div>
  );
}

function AssignmentSection({ title, items, courseId, router }: { title: string; items: Assignment[]; courseId: string; router: ReturnType<typeof useRouter>; }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-2 px-5 py-2 cursor-pointer select-none transition-colors border-y" style={{ background: COLORS.primarySoft, borderColor: COLORS.primarySoftBorder }} onClick={() => setCollapsed((c) => !c)}>
        <span className="text-xs inline-block transition-transform" style={{ color: COLORS.textMuted, transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
        <span className="text-sm font-semibold" style={{ color: COLORS.textSecondary }}>{title}</span>
        <span className="text-xs ml-1" style={{ color: COLORS.textMuted }}>({items.length})</span>
      </div>
      {!collapsed && items.map((a) => <AssignmentRow key={a.id} a={a} courseId={courseId} router={router} />)}
    </div>
  );
}

// ── HeadImageModal ─────────────────────────────────────────────────────────────
function HeadImageModal({ courseId, onClose, onUploaded }: { courseId: string; onClose: () => void; onUploaded: (url: string) => void; }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const acceptFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please select an image file."); return; }
    setError(null); setFile(f);
  };

  const uploadAndSave = async () => {
    if (!file) { setError("Please choose an image first."); return; }
    setSaving(true); setError(null);
    try {
      const form = new FormData(); form.append("file", file);
      const res = await fetch(`/api/courses/${courseId}/image`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      onUploaded(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-6" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6">
          <p className="text-sm font-semibold text-gray-800">Choose Course Image</p>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center justify-center text-lg transition-colors">×</button>
        </div>
        <div className="p-6">
          <div className="border-2 border-dashed rounded-md transition-colors" style={{ borderColor: dragOver ? MAROON : "#d1d5db", background: dragOver ? "#fdf2f2" : "#f9fafb", minHeight: 220 }}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); acceptFile(e.dataTransfer.files?.[0]); }}>
            <div className="flex flex-col items-center justify-center p-8 text-center">
              {!previewUrl ? (
                <>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "#fdf2f2" }}>
                    <svg width="24" height="24" fill="none" stroke={MAROON} strokeWidth={1.8} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" strokeLinecap="round" /></svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Drag & drop an image here</p>
                  <p className="text-xs text-gray-400 mb-4">Supports PNG, JPG, GIF, WebP</p>
                  <button type="button" onClick={() => inputRef.current?.click()} className="h-8 px-4 text-xs font-medium text-white rounded-sm hover:opacity-90 transition-opacity" style={{ background: MAROON }}>Browse files</button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 w-full">
                  <img src={previewUrl} alt="Preview" className="max-h-48 rounded border border-gray-200 object-contain shadow-sm" />
                  <p className="text-xs text-gray-500 font-medium">{file?.name}</p>
                  <button type="button" onClick={() => inputRef.current?.click()} className="text-xs hover:underline font-medium" style={{ color: MAROON }}>Choose a different image</button>
                </div>
              )}
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => acceptFile(e.target.files?.[0])} />
            </div>
          </div>
          {error && <p className="mt-3 text-xs font-medium" style={{ color: MAROON }}>⚠ {error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="h-8 px-4 text-xs rounded-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors">Cancel</button>
            <button type="button" onClick={uploadAndSave} disabled={saving || !file} className="h-8 px-5 text-xs font-semibold text-white rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity" style={{ background: MAROON }}>
              {saving ? "Uploading..." : "Save Image"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Course Settings Tab (Head only) ───────────────────────────────────────────
// Unified with admin CourseSettingsPage: includes publish/unpublish + router.refresh()
// so changes reflect on the dashboard, course header, and everywhere else.
function CourseSettingsTab({
  courseId,
  course,
  onCourseUpdate,
}: {
  courseId: string;
  course: Course;
  onCourseUpdate: (updated: Partial<Course>) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(course.name);
  const [code, setCode] = useState(course.code);
  const [published, setPublished] = useState(
    course.status?.toUpperCase() === "PUBLISHED"
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [courseImageUrl, setCourseImageUrl] = useState(course.image ?? "");
  const [showImageModal, setShowImageModal] = useState(false);

  // ── Save course name + code + status ──
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          status: published ? "PUBLISHED" : "UNPUBLISHED",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveError(d?.error ?? `Error ${res.status}`);
        return;
      }
      setSaveSuccess(true);
      onCourseUpdate({ name, code, status: published ? "PUBLISHED" : "UNPUBLISHED" });
      // ← mirrors admin: triggers server re-fetch so dashboard/header update
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Publish / Unpublish toggle (instant, mirrors admin) ──
  const handlePublishToggle = async () => {
    const newPublished = !published;
    setPublished(newPublished);
    try {
      await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newPublished ? "PUBLISHED" : "UNPUBLISHED" }),
      });
      onCourseUpdate({ status: newPublished ? "PUBLISHED" : "UNPUBLISHED" });
      router.refresh();
    } catch {
      // revert optimistic update on failure
      setPublished(!newPublished);
    }
  };

  return (
    <div className="px-8 py-6 max-w-2xl">
      <h2 className="text-base font-semibold text-gray-800 mb-6">Course Settings</h2>

      {/* ── Course Status ── */}
      <div className="mb-5 pb-5 border-b border-gray-200">
        <label className="block text-xs font-medium text-gray-600 mb-1">Course Status</label>
        <div className="flex items-center gap-3 mt-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: published ? "#16a34a" : "#9ca3af" }}
          />
          <span className="text-sm text-gray-700 font-medium">
            {published ? "Published" : "Unpublished"}
          </span>
          <button
            type="button"
            onClick={handlePublishToggle}
            className="ml-1 px-3 py-1 text-xs rounded-sm border transition-colors hover:bg-gray-50"
            style={{ borderColor: MAROON, color: MAROON }}
          >
            {published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {/* ── Course Image ── */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-600 mb-1">Course Image</label>
        <button
          type="button"
          onClick={() => setShowImageModal(true)}
          className="mt-1 w-40 h-24 border-2 border-dashed border-gray-300 rounded overflow-hidden flex items-center justify-center hover:border-[#7b1113] transition-colors group bg-gray-50"
        >
          {courseImageUrl ? (
            <img src={courseImageUrl} alt="Course" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className="text-gray-400 group-hover:text-[#7b1113]">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-[10px] text-gray-400 group-hover:text-[#7b1113]">Choose Image</span>
            </div>
          )}
        </button>
        {courseImageUrl && (
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="mt-1 text-xs hover:underline"
            style={{ color: MAROON }}
          >
            Change image
          </button>
        )}
      </div>

      {/* ── Name ── */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Name <span style={{ color: MAROON }}>*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Course name"
          className="w-full h-9 border border-gray-300 rounded-sm px-3 text-sm outline-none transition-colors focus:border-[#7b1113] focus:ring-1 focus:ring-[#7b1113]/20"
        />
      </div>

      {/* ── Code ── */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">Course Code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. CS101"
          className="w-full h-9 border border-gray-300 rounded-sm px-3 text-sm outline-none transition-colors focus:border-[#7b1113] focus:ring-1 focus:ring-[#7b1113]/20"
        />
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-200">
        {saveSuccess && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Saved successfully
          </span>
        )}
        {saveError && (
          <span className="text-xs font-medium" style={{ color: MAROON }}>⚠ {saveError}</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-8 px-5 text-white text-xs font-semibold rounded-sm transition-opacity disabled:opacity-50 hover:opacity-90"
          style={{ background: MAROON }}
        >
          {saving ? "Saving..." : "Update Course Details"}
        </button>
      </div>

      {showImageModal && (
        <HeadImageModal
          courseId={courseId}
          onClose={() => setShowImageModal(false)}
          onUploaded={(url) => {
            setCourseImageUrl(url);
            onCourseUpdate({ image: url });
            setShowImageModal(false);
            // ← mirrors admin: triggers server re-fetch so dashboard updates
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ── Inner component ───────────────────────────────────────────────────────────
function CourseViewInner({ courseId }: { courseId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [course, setCourse] = useState<Course | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Home");

  // ── Inline create assignment state ──
  const [showInlineCreateAssignment, setShowInlineCreateAssignment] = useState(false);

  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [announcementFilter, setAnnouncementFilter] = useState("All");
  const [viewingAnnouncementId, setViewingAnnouncementId] = useState<string | null>(null);
  const [selectedAnnouncementIds, setSelectedAnnouncementIds] = useState<Set<string>>(new Set());

  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [createTopicTitle, setCreateTopicTitle] = useState("");
  const [createBodyHtml, setCreateBodyHtml] = useState("");
  const [createBodyText, setCreateBodyText] = useState("");
  const [createAttachments, setCreateAttachments] = useState<AnnouncementCreateAttachment[]>([]);
  const [createAssignTo, setCreateAssignTo] = useState<string[]>(["Everyone"]);
  const [createAllowComment, setCreateAllowComment] = useState(true);
  const [createDisallowThreaded, setCreateDisallowThreaded] = useState(false);
  const [createMustRespondFirst, setCreateMustRespondFirst] = useState(false);
  const [createEnablePodcast, setCreateEnablePodcast] = useState(false);
  const [createAllowLiking, setCreateAllowLiking] = useState(false);
  const [createAvailableFromDate, setCreateAvailableFromDate] = useState("");
  const [createAvailableFromTime, setCreateAvailableFromTime] = useState("");
  const [createUntilDate, setCreateUntilDate] = useState("");
  const [createUntilTime, setCreateUntilTime] = useState("");
  const [createIsPublishing, setCreateIsPublishing] = useState(false);

  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [peopleTab, setPeopleTab] = useState<"Everyone" | "Groups">("Everyone");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [arrangeBy, setArrangeBy] = useState("Due Date");
  const [viewMode, setViewMode] = useState<"DATE" | "TYPE">("DATE");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const [showAddPeopleModal, setShowAddPeopleModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonRole, setNewPersonRole] = useState<"Staff" | "Head">("Staff");
  const [newGroupName, setNewGroupName] = useState("");
  const [peopleActionLoading, setPeopleActionLoading] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as Tab | null;
    const validTabs: Tab[] = [...ALL_TABS, "Settings"];
    if (tabParam && validTabs.includes(tabParam)) {
      startTransition(() => setActiveTab(tabParam));
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch(`/api/courses/${courseId}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/courses/${courseId}/assignments`).then((r) => r.json()).catch(() => ({ assignments: [] })),
      fetch(`/api/courses/${courseId}/announcements`).then((r) => r.json()).catch(() => ({ announcements: [] })),
      fetch(`/api/courses/${courseId}/people`).then((r) => r.json()).catch(() => ({ people: [] })),
      fetch(`/api/courses/${courseId}/groups`).then((r) => r.json()).catch(() => ({ groups: [] })),
    ]).then(([courseData, assignmentData, announcementData, peopleData, groupData]) => {
      if (!isMounted) return;
      setCourse(courseData.course ?? null);
      const role = normalizeCourseRole(courseData?.membership?.role);
      setMembership({
        role,
        permissions: {
          viewCourse: Boolean(courseData?.membership?.permissions?.viewCourse),
          viewAnnouncements: Boolean(courseData?.membership?.permissions?.viewAnnouncements),
          submitAssignments: Boolean(courseData?.membership?.permissions?.submitAssignments),
          manageAnnouncements: Boolean(courseData?.membership?.permissions?.manageAnnouncements),
          manageAssignments: Boolean(courseData?.membership?.permissions?.manageAssignments),
          managePeople: Boolean(courseData?.membership?.permissions?.managePeople),
          manageCourse: Boolean(courseData?.membership?.permissions?.manageCourse),
        },
      });
      setAssignments(assignmentData.assignments ?? []);
      const rawAnnouncements = announcementData.announcements ?? announcementData.items ?? announcementData.data ?? [];
      setAnnouncements(rawAnnouncements.map((item: RawAnnouncement, index: number) => normalizeAnnouncement(item, index)));
      setPeople((peopleData.people ?? []).map((p: Person) => ({ ...p, role: normalizeCourseRole(p.role) })));
      setGroups(groupData.groups ?? []);
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, [courseId]);

  const isHead = membership?.role === "Head";
  const canManageAnnouncements = membership?.permissions.manageAnnouncements ?? false;
  const canManageAssignments = membership?.permissions.manageAssignments ?? false;
  const canManagePeople = membership?.permissions.managePeople ?? false;
  const canManageCourse = membership?.permissions.manageCourse ?? false;

  // ── Build visible tabs based on role ──
  const TABS: Tab[] = isHead
    ? [...ALL_TABS.filter((t) => !HIDDEN_FOR_HEAD.includes(t)), "Settings"]
    : ALL_TABS.filter((t) => !HIDDEN_FOR_STAFF.includes(t));

  const onMarkAllRead = () => setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })));
  const onMarkRead = (id: string) => setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  const onViewAnnouncement = (id: string) => { setViewingAnnouncementId(id); onMarkRead(id); };

  const filteredAnnouncements = useMemo(() => {
    const q = announcementSearch.toLowerCase().trim();
    return announcements.filter((a) => {
      const matchesSearch = !q || a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q) || a.authorName.toLowerCase().includes(q);
      const matchesFilter = announcementFilter === "All" || (announcementFilter === "Unread" && !a.read);
      return matchesSearch && matchesFilter;
    });
  }, [announcements, announcementSearch, announcementFilter]);

  const { filteredAssignments, upcoming, undated, past } = useMemo(() => {
    const now = new Date();
    const filtered = assignments.filter((a) => a.title.toLowerCase().includes(assignmentSearch.toLowerCase()));
    const upcoming: Assignment[] = [], undated: Assignment[] = [], past: Assignment[] = [];
    filtered.forEach((a) => { if (!a.dueDate) undated.push(a); else if (new Date(a.dueDate) >= now) upcoming.push(a); else past.push(a); });
    return { filteredAssignments: filtered, upcoming, undated, past };
  }, [assignments, assignmentSearch]);

  const viewingAnnouncement = announcements.find((a) => a.id === viewingAnnouncementId) ?? null;

  const handleAddCreateAttachments = (files: AnnouncementCreateAttachment[]) =>
    setCreateAttachments((prev) => [...prev, ...files.map((file, index) => ({ id: file.id || `attachment-${Date.now()}-${index}`, name: file.name, size: file.size, type: file.type || "", url: file.url }))]);
  const handleRemoveCreateAttachment = (id: string) => setCreateAttachments((prev) => prev.filter((f) => f.id !== id));

  const handlePublishCourseAnnouncement = async () => {
    if (!createTopicTitle.trim()) return;
    setCreateIsPublishing(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/announcements`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTopicTitle.trim(), bodyText: createBodyText.trim(), bodyHtml: createBodyHtml,
          assignTo: createAssignTo.length ? createAssignTo : ["Everyone"],
          allowComments: createAllowComment, allowLiking: createAllowLiking,
          availableFrom: createAvailableFromDate ? `${createAvailableFromDate}T${createAvailableFromTime || "00:00"}` : null,
          availableUntil: createUntilDate ? `${createUntilDate}T${createUntilTime || "00:00"}` : null,
          attachments: createAttachments.map((f) => ({ name: f.name, url: f.url, size: f.size, mimeType: f.type })),
        }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      const d = await res.json();
      const raw = d.announcement ?? d;
      setAnnouncements((prev) => [normalizeAnnouncement(raw as RawAnnouncement, Date.now()), ...prev]);
      setCreateTopicTitle(""); setCreateBodyHtml(""); setCreateBodyText(""); setCreateAttachments([]);
      setCreateAssignTo(["Everyone"]); setCreateAllowComment(true); setCreateDisallowThreaded(false);
      setCreateMustRespondFirst(false); setCreateEnablePodcast(false); setCreateAllowLiking(false);
      setCreateAvailableFromDate(""); setCreateAvailableFromTime(""); setCreateUntilDate(""); setCreateUntilTime("");
      setShowCreateAnnouncement(false);
    } catch (err) { console.error(err); alert("Hindi ma-publish ang announcement. Subukan ulit."); }
    finally { setCreateIsPublishing(false); }
  };

  const handleAddPerson = async () => {
    const email = newPersonEmail.trim();
    if (!email) return;
    setPeopleActionLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/people`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role: newPersonRole }) });
      if (!res.ok) throw new Error("Failed to add person");
      const data = await res.json();
      const person = data.person ?? data.member ?? data.user ?? null;
      if (person) setPeople((prev) => [{ ...person, role: normalizeCourseRole(person.role ?? newPersonRole) }, ...prev]);
      setNewPersonEmail(""); setNewPersonRole("Staff"); setShowAddPeopleModal(false); setPeopleTab("Everyone");
    } catch (err) { console.error(err); alert("Hindi ma-add ang tao. Subukan ulit."); }
    finally { setPeopleActionLoading(false); }
  };

  const handleAddGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setPeopleActionLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/groups`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error("Failed to add group");
      const data = await res.json();
      if (data.group) setGroups((prev) => [data.group, ...prev]);
      setNewGroupName(""); setShowAddGroupModal(false); setPeopleTab("Groups");
    } catch (err) { console.error(err); alert("Hindi ma-add ang group. Subukan ulit."); }
    finally { setPeopleActionLoading(false); }
  };

  // Reload assignments after inline create
  const handleAssignmentCreated = () => {
    setShowInlineCreateAssignment(false);
    fetch(`/api/courses/${courseId}/assignments`)
      .then(r => r.json())
      .then(d => setAssignments(d.assignments ?? []))
      .catch(() => {});
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm" style={{ color: COLORS.textMuted, fontFamily: FONT }}>Loading...</div>;
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3" style={{ fontFamily: FONT }}>
        <p className="text-sm" style={{ color: COLORS.textSecondary }}>Course not found.</p>
        <button onClick={() => router.back()} className="text-sm hover:underline" style={{ color: COLORS.primary }}>← Go back</button>
      </div>
    );
  }

  const filteredPeople = people.filter((p) =>
    (p.name ?? p.email).toLowerCase().includes(peopleSearch.toLowerCase()) &&
    (roleFilter === "All Roles" || normalizeCourseRole(p.role) === roleFilter)
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
    g.members.some((m) => (m.name ?? "").toLowerCase().includes(groupSearch.toLowerCase()))
  );

  const roleCounts = ["Staff", "Head"].reduce<Record<string, number>>((acc, r) => {
    acc[r] = people.filter((p) => normalizeCourseRole(p.role) === r).length;
    return acc;
  }, {});

  const toggleGroup = (id: string) => setExpandedGroups((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="flex h-full bg-white overflow-hidden" style={{ fontFamily: FONT, fontSize: 13 }}>
      {/* ── Sidebar nav ── */}
      <nav className="w-52 border-r bg-white shrink-0 overflow-y-auto py-3" style={{ borderColor: COLORS.border }}>
        <div className="px-3 pb-3">
          <div className="rounded-lg border px-3 py-2 bg-[#fdf8f8]" style={{ borderColor: "#f0e4e4" }}>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Course Role</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800">{course.code}</span>
              <MembershipBadge role={membership?.role ?? "Staff"} />
            </div>
          </div>
        </div>

        <div className="space-y-0.5 px-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => {
                setActiveTab(tab);
                if (tab !== "Announcements") setViewingAnnouncementId(null);
                setShowInlineCreateAssignment(false);
              }}
                className="w-full text-left text-sm py-2 transition-colors flex items-center gap-2"
                style={{
                  fontFamily: FONT,
                  paddingLeft: isActive ? 13 : 16,
                  paddingRight: 12,
                  color: isActive ? COLORS.text : COLORS.primary,
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? COLORS.primarySoft : "transparent",
                  borderLeft: isActive ? `3px solid ${COLORS.primary}` : "3px solid transparent",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = COLORS.primarySoft; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                {/* ── Settings icon removed from sidebar button ── */}
                {tab}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto bg-white">

        {/* ── Home ── */}
        {activeTab === "Home" && (
          <div className="px-8 py-6">
            <div className="flex items-center gap-3 mb-5">
              <h1 className="text-lg font-semibold" style={{ color: COLORS.text }}>{course.name}</h1>
              <MembershipBadge role={membership?.role ?? "Staff"} />
            </div>

            {course.image && (
              <div className="mb-5 rounded-xl overflow-hidden border border-gray-100" style={{ maxWidth: 560, height: 180 }}>
                <img src={course.image} alt={course.name} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="italic" style={{ color: COLORS.textSecondary, fontSize: 16 }}>
              No modules have been defined for this course.
            </div>

            {(canManageCourse || canManageAssignments || canManageAnnouncements || canManagePeople) && (
              <div className="mt-6 rounded-lg border px-4 py-4 bg-[#fdf8f8]" style={{ borderColor: "#f0e4e4" }}>
                <p className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>Head Controls</p>
                <div className="flex flex-wrap gap-2">
                  {canManageAnnouncements && (
                    <button type="button" onClick={() => setActiveTab("Announcements")} className="text-xs px-3 py-2 rounded border bg-white hover:bg-gray-50" style={{ borderColor: "#d1d5db", color: MAROON }}>
                      Manage Announcements
                    </button>
                  )}
                  {canManageAssignments && (
                    <button type="button" onClick={() => setActiveTab("Assignments")} className="text-xs px-3 py-2 rounded border bg-white hover:bg-gray-50" style={{ borderColor: "#d1d5db", color: MAROON }}>
                      Manage Assignments
                    </button>
                  )}
                  {canManagePeople && (
                    <button type="button" onClick={() => setActiveTab("People")} className="text-xs px-3 py-2 rounded border bg-white hover:bg-gray-50" style={{ borderColor: "#d1d5db", color: MAROON }}>
                      Manage People
                    </button>
                  )}
                  {isHead && (
                    <button type="button" onClick={() => setActiveTab("Settings")} className="text-xs px-3 py-2 rounded border bg-white hover:bg-gray-50" style={{ borderColor: "#d1d5db", color: MAROON }}>
                      Course Settings
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Announcements ── */}
        {activeTab === "Announcements" && (
          viewingAnnouncement ? (
            <StudentAnnouncementDetail announcement={viewingAnnouncement} onBack={() => setViewingAnnouncementId(null)} onMarkRead={onMarkRead} />
          ) : showCreateAnnouncement ? (
            <AnnouncementCreateView
              isCoursePublished={course?.status?.toLowerCase?.() === "published"}
              topicTitle={createTopicTitle} setTopicTitle={setCreateTopicTitle}
              bodyHtml={createBodyHtml} setBodyHtml={setCreateBodyHtml} setBodyText={setCreateBodyText}
              attachments={createAttachments} onAddAttachments={handleAddCreateAttachments} onRemoveAttachment={handleRemoveCreateAttachment}
              assignTo={createAssignTo} setAssignTo={setCreateAssignTo}
              sections={[]} staff={people.map((p) => ({ id: p.id, name: p.name ?? p.email }))}
              allowComment={createAllowComment} setAllowComment={setCreateAllowComment}
              disallowThreaded={createDisallowThreaded} setDisallowThreaded={setCreateDisallowThreaded}
              mustRespondFirst={createMustRespondFirst} setMustRespondFirst={setCreateMustRespondFirst}
              enablePodcast={createEnablePodcast} setEnablePodcast={setCreateEnablePodcast}
              allowLiking={createAllowLiking} setAllowLiking={setCreateAllowLiking}
              availableFromDate={createAvailableFromDate} setAvailableFromDate={setCreateAvailableFromDate}
              availableFromTime={createAvailableFromTime} setAvailableFromTime={setCreateAvailableFromTime}
              untilDate={createUntilDate} setUntilDate={setCreateUntilDate}
              untilTime={createUntilTime} setUntilTime={setCreateUntilTime}
              onCancel={() => setShowCreateAnnouncement(false)}
              onPublish={handlePublishCourseAnnouncement}
              onResetUntil={() => { setCreateUntilDate(""); setCreateUntilTime(""); }}
              isPublishing={createIsPublishing}
            />
          ) : (
            <div>
              {canManageAnnouncements && (
                <div className="px-5 pt-4">
                  <div className="rounded-lg border px-4 py-3 bg-[#fdf8f8]" style={{ borderColor: "#f0e4e4" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: COLORS.text }}>Head Controls</p>
                        <p className="text-xs text-gray-500">You can manage announcements for this course.</p>
                      </div>
                      <button type="button" onClick={() => setShowCreateAnnouncement(true)} className="text-sm text-white rounded px-4 py-2 hover:opacity-90" style={{ background: MAROON }}>Create Announcement</button>
                    </div>
                  </div>
                </div>
              )}
              <StudentAnnouncementList
                announcements={filteredAnnouncements} filter={announcementFilter} setFilter={setAnnouncementFilter}
                search={announcementSearch} setSearch={setAnnouncementSearch} onMarkAllRead={onMarkAllRead}
                onView={onViewAnnouncement} onMarkRead={onMarkRead}
                selectedIds={selectedAnnouncementIds} setSelectedIds={setSelectedAnnouncementIds}
              />
            </div>
          )
        )}

        {/* ── Assignments ── */}
        {activeTab === "Assignments" && (
          showInlineCreateAssignment ? (
            <CreateAssignmentPage
              courseId={courseId}
              onCancel={() => setShowInlineCreateAssignment(false)}
              onCreated={handleAssignmentCreated}
            />
          ) : (
            <div>
              {canManageAssignments && (
                <div className="px-5 pt-4">
                  <div className="rounded-lg border px-4 py-3 bg-[#fdf8f8]" style={{ borderColor: "#f0e4e4" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: COLORS.text }}>Head Controls</p>
                        <p className="text-xs text-gray-500">You can manage assignments for this course.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowInlineCreateAssignment(true)}
                        className="text-sm text-white rounded px-4 py-2 hover:opacity-90"
                        style={{ background: MAROON }}>
                        Create Assignment
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#f3f4f6" }}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input placeholder="Search..." value={assignmentSearch} onChange={(e) => setAssignmentSearch(e.target.value)} className="pl-9 pr-4 py-1.5 border rounded text-sm w-52 focus:outline-none" style={{ borderColor: "#d1d5db", fontFamily: FONT }} />
                </div>
                <div className="flex items-center gap-1">
                  {["DATE", "TYPE"].map((m) => (
                    <button key={m} onClick={() => setViewMode(m as "DATE" | "TYPE")} className="px-3 py-1.5 text-xs font-bold rounded transition-colors"
                      style={{ background: viewMode === m ? COLORS.primary : "transparent", color: viewMode === m ? "#fff" : COLORS.textSecondary, fontFamily: FONT }}>
                      SHOW BY {m}
                    </button>
                  ))}
                </div>
              </div>
              {filteredAssignments.length === 0 ? (
                <p className="px-6 py-10 text-sm text-center" style={{ color: COLORS.textMuted, fontFamily: FONT }}>No assignments found.</p>
              ) : (
                <>
                  {upcoming.length > 0 && <AssignmentSection title="Upcoming Assignments" items={upcoming} courseId={courseId} router={router} />}
                  {undated.length > 0 && <AssignmentSection title="Undated Assignments" items={undated} courseId={courseId} router={router} />}
                  {past.length > 0 && <AssignmentSection title="Past Assignments" items={past} courseId={courseId} router={router} />}
                </>
              )}
            </div>
          )
        )}

        {/* ── Discussions ── */}
        {activeTab === "Discussions" && (
          <div>
            <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: "#f3f4f6" }}>
              <div className="relative w-36">
                <select className="w-full border rounded text-sm px-3 py-1.5 bg-white text-gray-600 focus:outline-none appearance-none pr-8" style={{ borderColor: "#d1d5db", fontFamily: FONT }}>
                  <option>All</option><option>Unread</option><option>Subscribed</option>
                </select>
                <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9l6 6 6-6" /></svg>
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input placeholder="Search by title or author..." className="pl-9 pr-4 py-1.5 border rounded text-sm w-full focus:outline-none" style={{ borderColor: "#d1d5db", fontFamily: FONT }} />
              </div>
              {canManageCourse && (
                <>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-white text-sm rounded font-medium" style={{ background: COLORS.primary, fontFamily: FONT }}><Plus className="w-3.5 h-3.5" />Add Discussion</button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border rounded text-sm hover:bg-gray-50" style={{ borderColor: "#d1d5db", color: COLORS.textSecondary, fontFamily: FONT }}><Settings className="w-3.5 h-3.5" />Settings</button>
                </>
              )}
            </div>
            {[
              { title: "Pinned Discussions", empty: "You currently have no pinned discussions", sub: canManageCourse ? "To pin a discussion, drag it here or select Pin from the settings menu." : "" },
              { title: "Discussions", empty: "There are no discussions to show in this section", sub: canManageCourse ? "Click here to add a discussion." : "", ordered: true },
              { title: "Closed for Comments", empty: "You currently have no discussions with closed comments", sub: "", ordered: true },
            ].map((section) => (
              <div key={section.title} className="mx-5 mt-4 border rounded overflow-hidden" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ background: COLORS.primarySoft, borderColor: COLORS.primarySoftBorder }}>
                  <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: COLORS.textSecondary }}>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>▼</span>{section.title}
                  </div>
                  {section.ordered && <span className="text-xs italic" style={{ color: COLORS.textMuted }}>Ordered by Recent Activity</span>}
                </div>
                <div className="py-10 flex flex-col items-center gap-2">
                  <p className="text-sm font-medium" style={{ color: COLORS.textSecondary }}>{section.empty}</p>
                  {section.sub && <p className="text-xs hover:underline cursor-pointer" style={{ color: COLORS.primary }}>{section.sub}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Grades ── */}
        {activeTab === "Grades" && (
          <div className="flex h-full">
            <div className="flex-1 px-8 py-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-light" style={{ color: COLORS.text }}>Grades for {course.code}</h2>
                <button className="flex items-center gap-2 px-3 py-1.5 border rounded text-sm hover:bg-gray-50" style={{ borderColor: "#d1d5db", color: COLORS.textSecondary, fontFamily: FONT }}>
                  <Printer className="w-4 h-4" />Print Grades
                </button>
              </div>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-sm" style={{ color: COLORS.textSecondary }}>Arrange By</span>
                <div className="relative">
                  <select value={arrangeBy} onChange={(e) => setArrangeBy(e.target.value)} className="border rounded text-sm px-3 py-1.5 bg-white focus:outline-none appearance-none pr-8 w-40" style={{ borderColor: "#d1d5db", fontFamily: FONT }}>
                    <option>Due Date</option><option>Title</option><option>Assignment Group</option>
                  </select>
                  <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9l6 6 6-6" /></svg>
                </div>
                <button className="px-4 py-1.5 text-sm rounded" style={{ background: COLORS.primarySoft, color: COLORS.primary, fontFamily: FONT }}>Apply</button>
              </div>
              <div className="flex border-b mb-4" style={{ borderColor: COLORS.border }}>
                <button className="px-4 py-2 text-sm border-b-2 font-semibold" style={{ borderColor: COLORS.primary, color: COLORS.text, fontFamily: FONT }}>Assignments</button>
                <button className="px-4 py-2 text-sm" style={{ color: COLORS.primary, fontFamily: FONT }}>Learning Mastery</button>
              </div>
              <table className="w-full text-sm" style={{ fontFamily: FONT }}>
                <thead>
                  <tr className="border-b" style={{ borderColor: COLORS.border }}>
                    {["Name", "Due", "Submitted", "Status", "Score"].map((h) => (
                      <th key={h} className="text-left pb-2.5 font-semibold" style={{ color: COLORS.textSecondary }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center" style={{ color: COLORS.textMuted }}>No assignments yet.</td></tr>
                  ) : (
                    assignments.map((a) => {
                      const sub = a.submissions?.[0];
                      return (
                        <tr key={a.id} className="border-b hover:bg-gray-50" style={{ borderColor: "#f3f4f6" }}>
                          <td className="py-3"><button style={{ color: COLORS.primary }}>{a.title}</button><p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{a.assignmentGroup}</p></td>
                          <td className="py-3" style={{ color: COLORS.textSecondary }}>{fmtDate(a.dueDate)}</td>
                          <td className="py-3" style={{ color: COLORS.textSecondary }}>{sub?.submittedAt ? fmtDateTime(sub.submittedAt) : "—"}</td>
                          <td className="py-3" style={{ color: COLORS.textSecondary }}>{sub?.status ?? "—"}</td>
                          <td className="py-3" style={{ color: COLORS.text }}>{sub?.grade != null ? `${sub.grade} / ${a.points}` : `— / ${a.points}`}</td>
                        </tr>
                      );
                    })
                  )}
                  <tr className="border-t-2" style={{ borderColor: COLORS.border, background: COLORS.primarySoft }}>
                    <td className="py-2.5 font-semibold" style={{ color: COLORS.textSecondary }}>Total</td>
                    <td colSpan={3} />
                    <td className="py-2.5" style={{ color: COLORS.textSecondary }}>N/A &nbsp; 0.00 / 0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="w-56 border-l px-4 py-5 shrink-0 space-y-4" style={{ borderColor: COLORS.border }}>
              <div>
                <p className="text-sm" style={{ color: COLORS.textSecondary }}>Total: <span className="font-semibold">N/A</span></p>
                <button className="mt-2 w-full px-3 py-1.5 border rounded text-xs hover:bg-gray-50" style={{ borderColor: "#d1d5db", color: COLORS.textSecondary, fontFamily: FONT }}>Show All Details</button>
              </div>
              <div className="pt-3 border-t text-xs space-y-2" style={{ borderColor: "#f3f4f6", color: COLORS.textSecondary }}>
                <p className="font-semibold">Course assignments are not weighted.</p>
                <label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" defaultChecked className="mt-0.5" /><span>Calculate based only on graded assignments</span></label>
              </div>
            </div>
          </div>
        )}

        {/* ── People ── */}
        {activeTab === "People" && (
          <div>
            {canManagePeople && (
              <div className="px-5 pt-4">
                <div className="rounded-lg border px-4 py-3 bg-[#fdf8f8]" style={{ borderColor: "#f0e4e4" }}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: COLORS.text }}>Head Controls</p>
                      <p className="text-xs text-gray-500">You can manage members in this course.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setShowAddPeopleModal(true)} className="text-sm text-white rounded px-4 py-2 hover:opacity-90" style={{ background: MAROON }}>Add People</button>
                      <button type="button" onClick={() => { setPeopleTab("Groups"); setShowAddGroupModal(true); }} className="text-sm rounded px-4 py-2 border hover:bg-white" style={{ borderColor: "#d1d5db", color: MAROON, background: "#fff" }}>+ Group</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-end justify-between border-b px-5 pt-3" style={{ borderColor: COLORS.border }}>
              <div className="flex">
                {(["Everyone", "Groups"] as const).map((t) => (
                  <button key={t} onClick={() => setPeopleTab(t)} className="px-4 py-2 text-sm transition-colors"
                    style={{ borderBottom: peopleTab === t ? `2px solid ${COLORS.primary}` : "2px solid transparent", fontWeight: peopleTab === t ? 600 : 500, color: peopleTab === t ? COLORS.text : COLORS.primary, fontFamily: FONT }}>
                    {t}
                  </button>
                ))}
              </div>
              {canManagePeople && <button style={{ color: COLORS.textMuted }} className="mb-1"><MoreVertical className="w-4 h-4" /></button>}
            </div>

            {peopleTab === "Everyone" && (
              <>
                <div className="flex items-center gap-3 px-5 py-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input placeholder="Search people" value={peopleSearch} onChange={(e) => setPeopleSearch(e.target.value)} className="pl-9 pr-4 py-1.5 border rounded text-sm w-52 focus:outline-none" style={{ borderColor: "#d1d5db", fontFamily: FONT }} />
                  </div>
                  <div className="relative">
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border rounded text-sm px-3 py-1.5 bg-white text-gray-600 focus:outline-none appearance-none pr-8" style={{ borderColor: "#d1d5db", fontFamily: FONT }}>
                      <option value="All Roles">All Roles</option>
                      {Object.entries(roleCounts).filter(([, c]) => c > 0).map(([r, c]) => <option key={r} value={r}>{r} ({c})</option>)}
                    </select>
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9l6 6 6-6" /></svg>
                  </div>
                </div>
                <table className="w-full text-sm" style={{ fontFamily: FONT }}>
                  <thead>
                    <tr className="border-b" style={{ borderColor: COLORS.border }}>
                      <th className="pb-2 px-5 w-14" />
                      {["Name", "Section", "Department", "Position", "Employment", "Role"].map((h) => (
                        <th key={h} className="text-left pb-2 font-semibold uppercase text-xs tracking-wide" style={{ color: COLORS.textSecondary }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPeople.length === 0 ? (
                      <tr><td colSpan={7} className="py-10 text-center" style={{ color: COLORS.textMuted }}>No people found.</td></tr>
                    ) : (
                      filteredPeople.map((p, i) => (
                        <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="py-2.5 px-5"><Avatar name={p.name} image={p.image} size={36} /></td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button onClick={() => router.push(`/courses/${courseId}/people/${p.id}`)} style={{ color: COLORS.primary, fontFamily: FONT }}>{p.name ?? p.email}</button>
                              {p.pronouns && <span className="text-xs italic" style={{ color: COLORS.textMuted }}>({p.pronouns})</span>}
                              {p.status === "PENDING" && <span className="text-[10px] bg-gray-700 text-white px-1.5 py-0.5 rounded">pending</span>}
                            </div>
                          </td>
                          <td className="py-2.5" style={{ color: COLORS.textSecondary }}>{course.name}</td>
                          <td className="py-2.5 text-xs" style={{ color: COLORS.textMuted }}>{p.department ?? "—"}</td>
                          <td className="py-2.5 text-xs" style={{ color: COLORS.textMuted }}>{p.position ?? "—"}</td>
                          <td className="py-2.5 text-xs capitalize" style={{ color: COLORS.textMuted }}>{p.employmentStatus ?? "—"}</td>
                          <td className="py-2.5 capitalize" style={{ color: COLORS.textSecondary }}>{normalizeCourseRole(p.role)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </>
            )}

            {peopleTab === "Groups" && (
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input placeholder="Search Groups or People" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} className="pl-9 pr-4 py-1.5 border rounded text-sm w-72 focus:outline-none" style={{ borderColor: "#d1d5db", fontFamily: FONT }} />
                  </div>
                  {canManagePeople && (
                    <button type="button" onClick={() => setShowAddGroupModal(true)} className="h-9 px-4 border bg-white text-[12px] font-bold rounded-lg hover:bg-gray-50 transition-all" style={{ borderColor: "#d1d5db", color: MAROON }}>+ Group</button>
                  )}
                </div>
                {filteredGroups.length === 0 ? (
                  <p className="text-sm py-6 text-center" style={{ color: COLORS.textMuted }}>No groups for this course.</p>
                ) : (
                  <div className="space-y-0">
                    {filteredGroups.map((g) => (
                      <div key={g.id} className="border rounded mb-2" style={{ borderColor: COLORS.border }}>
                        <div className="flex items-center justify-between px-4 py-3 bg-white cursor-pointer" onClick={() => toggleGroup(g.id)}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: COLORS.textMuted }}>{expandedGroups.has(g.id) ? "▼" : "▶"}</span>
                            <span className="text-sm font-bold" style={{ color: COLORS.text }}>{g.name}</span>
                            <span className="text-sm" style={{ color: COLORS.textSecondary }}>{g.groupSetName}</span>
                            {g.isMember && <button onClick={(e) => { e.stopPropagation(); router.push(`/courses/${courseId}/groups/${g.id}`); }} className="text-xs hover:underline ml-1" style={{ color: COLORS.primary, fontFamily: FONT }}>Visit</button>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm" style={{ color: COLORS.textSecondary }}>{g.memberCount} students</span>
                            {!g.isMember && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                          </div>
                        </div>
                        {expandedGroups.has(g.id) && (
                          <div className="border-t px-8 py-2 bg-gray-50" style={{ borderColor: "#f3f4f6" }}>
                            {g.members.length === 0 ? (
                              <p className="text-xs py-1" style={{ color: COLORS.textMuted }}>No members yet.</p>
                            ) : (
                              g.members.map((m) => (
                                <div key={m.id} className="flex items-center gap-2 py-1.5">
                                  <Avatar name={m.name} image={m.image} size={24} />
                                  <span className="text-xs" style={{ color: COLORS.textSecondary }}>{m.name ?? "Unknown"}</span>
                                  {m.isLeader && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Leader</span>}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Add People Modal ── */}
        {showAddPeopleModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAddPeopleModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-100" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Add People</h2>
                <button onClick={() => setShowAddPeopleModal(false)} className="w-7 h-7 flex items-center justify-center border border-gray-200 text-gray-400 rounded-lg text-base hover:border-gray-400 hover:text-gray-600 transition-all">×</button>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input value={newPersonEmail} onChange={(e) => setNewPersonEmail(e.target.value)} placeholder="name@example.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Role</label>
                  <select value={newPersonRole} onChange={(e) => setNewPersonRole(e.target.value as "Staff" | "Head")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all">
                    <option value="Staff">Staff</option><option value="Head">Head</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-100">
                <button onClick={() => setShowAddPeopleModal(false)} disabled={peopleActionLoading} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-all">Cancel</button>
                <button onClick={handleAddPerson} disabled={peopleActionLoading || !newPersonEmail.trim()} style={{ background: MAROON }} className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 hover:opacity-90 transition-all">
                  {peopleActionLoading ? "Saving..." : "Add People"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Add Group Modal ── */}
        {showAddGroupModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAddGroupModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-100" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Add Group</h2>
                <button onClick={() => setShowAddGroupModal(false)} className="w-7 h-7 flex items-center justify-center border border-gray-200 text-gray-400 rounded-lg text-base hover:border-gray-400 hover:text-gray-600 transition-all">×</button>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Group Name</label>
                  <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., Team Alpha" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#7b1113] focus:ring-2 focus:ring-[#7b1113]/10 transition-all" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-100">
                <button onClick={() => setShowAddGroupModal(false)} disabled={peopleActionLoading} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-all">Cancel</button>
                <button onClick={handleAddGroup} disabled={peopleActionLoading || !newGroupName.trim()} style={{ background: MAROON }} className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 hover:opacity-90 transition-all">
                  {peopleActionLoading ? "Saving..." : "Save Group"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Files ── */}
        {activeTab === "Files" && (
          <div className="px-8 py-8 flex flex-col items-center justify-center text-center" style={{ minHeight: 300 }}>
            <svg className="w-16 h-16 text-gray-200 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
            <p className="text-sm font-medium mb-1" style={{ color: COLORS.textSecondary }}>No files yet</p>
            <p className="text-xs" style={{ color: COLORS.textMuted }}>Files uploaded for this course will appear here.</p>
          </div>
        )}

        {/* ── Syllabus ── */}
        {activeTab === "Syllabus" && (
          <div className="flex h-full">
            <div className="flex-1 px-8 py-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-light" style={{ color: COLORS.text }}>Course Syllabus</h2>
                <button className="text-sm hover:underline" style={{ color: COLORS.primary }}>Jump to Today</button>
              </div>
              <h3 className="text-lg font-light mb-4" style={{ color: COLORS.textSecondary }}>Course Summary:</h3>
              <table className="w-full text-sm" style={{ fontFamily: FONT }}>
                <thead>
                  <tr className="border-b" style={{ borderColor: COLORS.border }}>
                    {["Date", "Details", "Due"].map((h, i) => (
                      <th key={h} className={`pb-2.5 font-semibold ${i === 2 ? "text-right" : "text-left"} ${i === 0 ? "w-44" : ""}`} style={{ color: COLORS.textSecondary }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr><td colSpan={3} className="py-10 text-center" style={{ color: COLORS.textMuted }}>No items in syllabus.</td></tr>
                  ) : (
                    assignments.map((a) => (
                      <tr key={a.id} className="border-b hover:bg-gray-50" style={{ borderColor: "#f3f4f6" }}>
                        <td className="py-3" style={{ color: COLORS.textSecondary }}>{fmtDateLong(a.dueDate)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <AssignmentIcon className="w-4 h-4 text-gray-400" />
                            <button style={{ color: COLORS.primary, fontFamily: FONT }}>{a.title}</button>
                          </div>
                        </td>
                        <td className="py-3 text-right" style={{ color: COLORS.textMuted }}>
                          {a.dueDate ? "due by " + new Date(a.dueDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase() : ""}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="w-56 border-l px-4 py-5 shrink-0 space-y-4" style={{ borderColor: COLORS.border }}>
              <MiniCalendar />
              <div className="pt-3 border-t text-xs" style={{ borderColor: "#f3f4f6", color: COLORS.textSecondary }}>
                <p className="font-semibold">Course assignments are not weighted.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Collaborations" && (
          <div className="px-8 py-8 text-sm" style={{ color: COLORS.textMuted }}>No content available.</div>
        )}

        {activeTab === "Quizzes" && <CourseFormsPage courseId={courseId} />}

        {/* ── Settings (Head only) ── */}
        {activeTab === "Settings" && isHead && course && (
          <CourseSettingsTab
            courseId={courseId}
            course={course}
            onCourseUpdate={(updated) => setCourse((prev) => prev ? { ...prev, ...updated } : prev)}
          />
        )}
      </div>
    </div>
  );
}

// ── Default export ─────────────────────────────────────────────────────────────
export default function CourseViewPage({ courseId }: { courseId: string }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-sm" style={{ color: COLORS.textMuted, fontFamily: FONT }}>Loading...</div>}>
      <CourseViewInner courseId={courseId} />
    </Suspense>
  );
}