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
  Zap,
  CheckCircle,
  Circle,
  Pencil,
  Download,
  Upload,
  Users,
  ChevronDown,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import QuizzesPage from "@/components/layout/CourseQuizzesPage";
import { AnnouncementCreateView } from "@/components/admin/CourseAnnouncementsPage";

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
  onlineEntryOptions?: string[];
  allowedAttempts?: number | null;
  submissionAttempts?: string;
  assignees?: string[];
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

interface EnrolledUser {
  id: string;
  name: string;
  email?: string;
  courseRole?: string;
}

interface AssignRow {
  id: number;
  assignees: { id: string; label: string }[];
  dueDate: string;
  dueTime: string;
  availableFrom: string;
  availableFromTime: string;
  until: string;
  untilTime: string;
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
  | "Quizzes";

const TABS: Tab[] = [
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

function fmtDateAdmin(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  );
}

function fmtDue(iso: string | null) {
  if (!iso) return "No due date";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function fmtLocalCourse(date: string, time: string) {
  if (!date) return null;
  const t = time || "11:59 PM";
  const d = new Date(`${date} ${t}`);
  if (isNaN(d.getTime())) return null;
  return `Local: ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
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

function normalizeOpt(opt: string): string {
  const o = opt.toLowerCase().replace(/\s+/g, "_");
  if (o.includes("text")) return "online_text_entry";
  if (o.includes("file")) return "file_upload";
  if (o.includes("url") || o.includes("website")) return "online_url";
  if (o.includes("media")) return "media_recording";
  if (o.includes("annotation")) return "student_annotation";
  return o;
}

const OPT_LABELS: Record<string, string> = {
  online_text_entry: "Text Entry",
  file_upload: "File Upload",
  online_url: "Website URL",
  media_recording: "Media Recording",
  student_annotation: "Student Annotation",
};

function resolveAssigneesLabel(assignees: string[], users: EnrolledUser[]): string {
  if (!assignees || assignees.length === 0) return "Everyone";
  const names = assignees.map((id) => users.find((u) => u.id === id)?.name ?? id);
  if (names.length === 1) return names[0];
  return `${names.length} staff`;
}

function buildAssignTimes() {
  const list: string[] = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 30) {
      const hh = ((h + 11) % 12) + 1;
      list.push(`${hh}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`);
    }
  return list;
}
const ASSIGN_TIMES = buildAssignTimes();

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

// ── FindReplaceModal ──────────────────────────────────────────────────────────
function FindReplaceModal({ html, onUpdate, onClose }: { html: string; onUpdate: (html: string) => void; onClose: () => void }) {
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
function HTMLEditorModal({ html: initialHtml, onUpdate, onClose }: { html: string; onUpdate: (html: string) => void; onClose: () => void }) {
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
function ColorPickerModal({ type, onClose }: { type: "foreColor" | "backColor"; onClose: () => void }) {
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
function ToolbarButton({ label, onClick, title, cls = "" }: { label: React.ReactNode; onClick: () => void; title?: string; cls?: string }) {
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

  const openWordCount = useCallback(() => {
    const s = readEditorStats();
    setWcData({ text: s.text, chars: s.chars, charsNoSpace: s.charsNoSpace, paragraphs: s.paragraphs });
    setShowWC(true);
  }, [readEditorStats]);

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
            <option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="blockquote">Blockquote</option><option value="pre">Code</option>
          </select>
          <select className="h-7 border border-gray-300 rounded text-xs bg-white px-1 outline-none" defaultValue="" onChange={(e) => { if (e.target.value) exec("fontName", e.target.value); }}>
            <option value="">Font</option><option value="inherit">Default</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="monospace">Monospace</option>
          </select>
          <select className="h-7 border border-gray-300 rounded text-xs bg-white px-1 outline-none" defaultValue="3" onChange={(e) => exec("fontSize", e.target.value)}>
            <option value="1">8pt</option><option value="2">10pt</option><option value="3">12pt</option><option value="4">14pt</option><option value="5">18pt</option><option value="6">24pt</option><option value="7">36pt</option>
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
function AnnouncementThreeDot({ read, onMarkRead }: { read: boolean; onMarkRead: () => void }) {
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
function Avatar({ name, image, size = 36 }: { name: string | null; image: string | null; size?: number }) {
  const dim = `${size}px`;
  if (image) return <img src={image} alt={name ?? ""} className="rounded-full object-cover shrink-0" style={{ width: dim, height: dim }} />;
  return (
    <div className="rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-white text-sm font-semibold" style={{ width: dim, height: dim, background: MAROON }}>
      {name?.charAt(0)?.toUpperCase() ?? "A"}
    </div>
  );
}

// ── StudentAnnouncementDetail ─────────────────────────────────────────────────
function StudentAnnouncementDetail({ announcement, onBack, onMarkRead }: { announcement: Announcement; onBack: () => void; onMarkRead: (id: string) => void }) {
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
            <option value="All">All</option><option value="Unread">Unread</option>
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
                  <div>Posted on:</div><div>{fmtDateTime(a.createdAt)}</div>
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
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (<div key={d} className="py-1 text-[11px]" style={{ color: COLORS.textMuted }}>{d}</div>))}
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

function SideBtn({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="w-full flex items-center gap-2.5 px-3 py-2 border rounded text-left transition-colors"
      style={{ borderColor: COLORS.border, color: COLORS.textSecondary, fontSize: 13, fontFamily: FONT, background: "#fff" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.primarySoft; e.currentTarget.style.borderColor = COLORS.primarySoftBorder; e.currentTarget.style.color = COLORS.primary; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textSecondary; }}>
      <span style={{ fontSize: 14 }}>{icon}</span>{label}
    </button>
  );
}

function AssignmentIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

function AssignmentRow({ a, onHeadClick, canManage, router, courseId }: {
  a: Assignment; onHeadClick: (a: Assignment) => void; canManage: boolean; router: ReturnType<typeof useRouter>; courseId: string;
}) {
  const now = new Date();
  const sub = a.submissions?.[0];
  const isLocked = a.availableFrom && now < new Date(a.availableFrom);
  const isClosed = a.availableUntil && now > new Date(a.availableUntil);
  return (
    <div className="flex items-start px-5 py-4 border-b gap-3 cursor-pointer" style={{ borderColor: "#f3f4f6" }}
      onClick={() => canManage ? onHeadClick(a) : router.push(`/courses/${courseId}/assignments/${a.id}`)}>
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

function AssignmentSection({ title, items, canManage, onHeadClick, courseId, router }: {
  title: string; items: Assignment[]; canManage: boolean; onHeadClick: (a: Assignment) => void; courseId: string; router: ReturnType<typeof useRouter>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-2 px-5 py-2 cursor-pointer select-none transition-colors border-y" style={{ background: COLORS.primarySoft, borderColor: COLORS.primarySoftBorder }} onClick={() => setCollapsed((c) => !c)}>
        <span className="text-xs inline-block transition-transform" style={{ color: COLORS.textMuted, transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
        <span className="text-sm font-semibold" style={{ color: COLORS.textSecondary }}>{title}</span>
        <span className="text-xs ml-1" style={{ color: COLORS.textMuted }}>({items.length})</span>
      </div>
      {!collapsed && items.map((a) => <AssignmentRow key={a.id} a={a} canManage={canManage} onHeadClick={onHeadClick} courseId={courseId} router={router} />)}
    </div>
  );
}

// ── HeadAssignmentDetail ──────────────────────────────────────────────────────
// Mimics AdminCourseAssignmentDetailPage layout for Head role users
function HeadAssignmentDetail({
  assignment: initialAssignment,
  courseId,
  onBack,
  enrolledUsers,
  onAssignmentUpdated,
}: {
  assignment: Assignment;
  courseId: string;
  onBack: () => void;
  enrolledUsers: EnrolledUser[];
  onAssignmentUpdated: (a: Assignment) => void;
}) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment>(initialAssignment);
  const [publishing, setPublishing] = useState(false);
  const [submissions, setSubmissions] = useState<{ fileUrl: string | null; userName: string | null; userEmail: string; userId: string; submittedAt: string | null }[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [assignRows, setAssignRows] = useState<AssignRow[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [dropSearch, setDropSearch] = useState<Record<number, string>>({});
  const [openDrop, setOpenDrop] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/admin/courses/${courseId}/assignments/${assignment.id}/submissions`)
      .then((r) => r.json()).then((d) => setSubmissions(d.submissions ?? [])).catch(() => {});
  }, [courseId, assignment.id]);

  const togglePublish = async () => {
    setPublishing(true);
    const newStatus = assignment.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignment.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.assignment || res.ok) {
        const updated = { ...assignment, status: newStatus };
        setAssignment(updated);
        onAssignmentUpdated(updated);
      }
    } catch {}
    setPublishing(false);
  };

  const downloadSubmissions = async () => {
    setDownloading(true);
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const sub of submissions) {
      if (!sub.submittedAt || !sub.fileUrl) continue;
      const name = (sub.userName ?? sub.userEmail).replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const url = sub.fileUrl.startsWith("/") || sub.fileUrl.startsWith("http") ? sub.fileUrl : `/uploads/submissions/${sub.fileUrl}`;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = url.split(".").pop()?.split("?")[0] ?? "bin";
        zip.file(`${name}_${sub.userId.slice(-8)}.${ext}`, blob);
      } catch {}
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${assignment.title.replace(/[^a-z0-9]/gi, "_")}_submissions.zip`;
    a.click();
    setDownloading(false);
  };

  const openAssignPanel = () => {
    const hasAssignees = assignment.assignees && assignment.assignees.length > 0;
    setAssignRows([{
      id: 1,
      assignees: hasAssignees
        ? (assignment.assignees ?? []).map((id) => {
            const found = enrolledUsers.find((u) => u.id === id);
            return { id, label: found?.name ?? id };
          })
        : [{ id: "everyone", label: "Everyone" }],
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split("T")[0] : "",
      dueTime: assignment.dueDate ? new Date(assignment.dueDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s/, " ") : "11:59 PM",
      availableFrom: assignment.availableFrom ? new Date(assignment.availableFrom).toISOString().split("T")[0] : "",
      availableFromTime: assignment.availableFrom ? new Date(assignment.availableFrom).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s/, " ") : "12:00 AM",
      until: assignment.availableUntil ? new Date(assignment.availableUntil).toISOString().split("T")[0] : "",
      untilTime: assignment.availableUntil ? new Date(assignment.availableUntil).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s/, " ") : "11:59 PM",
    }]);
    setDropSearch({}); setOpenDrop(null); setShowAssignPanel(true);
  };

  const updateAssignRow = (id: number, field: keyof AssignRow, value: string) =>
    setAssignRows((p) => p.map((r) => r.id === id ? { ...r, [field]: value } : r));

  const toggleAssignee = (rowId: number, user: { id: string; label: string }) =>
    setAssignRows((p) => p.map((r) => {
      if (r.id !== rowId) return r;
      const has = r.assignees.find((a) => a.id === user.id);
      const next = has ? r.assignees.filter((a) => a.id !== user.id) : [...r.assignees.filter((a) => a.id !== "everyone"), user];
      return { ...r, assignees: next.length ? next : [{ id: "everyone", label: "Everyone" }] };
    }));

  const selectEveryone = (rowId: number) =>
    setAssignRows((p) => p.map((r) => r.id === rowId ? { ...r, assignees: [{ id: "everyone", label: "Everyone" }] } : r));

  const addAssignRow = () => setAssignRows((p) => [...p, { id: Date.now(), assignees: [], dueDate: "", dueTime: "11:59 PM", availableFrom: "", availableFromTime: "12:00 AM", until: "", untilTime: "11:59 PM" }]);
  const removeAssignRow = (id: number) => setAssignRows((p) => p.filter((r) => r.id !== id));

  const saveAssignTo = async () => {
    setSavingAssign(true);
    const allEveryone = assignRows.every((r) => r.assignees.length === 0 || r.assignees.some((a) => a.id === "everyone"));
    const resolvedIds = allEveryone ? [] : assignRows.flatMap((r) => r.assignees.filter((a) => a.id !== "everyone").map((a) => a.id));
    const row = assignRows[0];
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignment.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignees: resolvedIds,
          dueDate: row.dueDate || null, dueTime: row.dueTime || null,
          availableFrom: row.availableFrom || null, availableFromTime: row.availableFromTime || null,
          availableUntil: row.until || null, untilTime: row.untilTime || null,
        }),
      });
      const data = await res.json();
      if (data.assignment || res.ok) {
        const updated = { ...assignment, assignees: resolvedIds, dueDate: data.assignment?.dueDate ?? assignment.dueDate, availableFrom: data.assignment?.availableFrom ?? assignment.availableFrom, availableUntil: data.assignment?.availableUntil ?? assignment.availableUntil };
        setAssignment(updated);
        onAssignmentUpdated(updated);
      }
    } catch {}
    setSavingAssign(false);
    setShowAssignPanel(false);
  };

  const openSpeedGrader = (studentId?: string) => {
    const url = studentId
      ? `/admin/courses/${courseId}/assignments/${assignment.id}/speedgrader?student_id=${studentId}`
      : `/admin/courses/${courseId}/assignments/${assignment.id}/speedgrader`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isPublished = assignment.status === "PUBLISHED";
  const opts = (assignment.onlineEntryOptions ?? []).map(normalizeOpt);
  const submittingLabel = opts.length > 0 ? opts.map((o) => OPT_LABELS[o] ?? o).join(", ") : (assignment.submissionType?.toLowerCase() ?? "—");
  const forLabel = resolveAssigneesLabel(assignment.assignees ?? [], enrolledUsers);

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>
      {/* Back button bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: MAROON }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Assignments
        </button>
        <div className="flex items-center gap-2">
          {/* Publish toggle */}
          <button onClick={togglePublish} disabled={publishing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-60"
            style={isPublished
              ? { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }
              : { background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb" }}>
            {isPublished ? <CheckCircle size={13} style={{ color: "#15803d" }} /> : <Circle size={13} />}
            {isPublished ? "Published" : "Unpublished"}
          </button>
          {/* Assign To */}
          <button onClick={openAssignPanel}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-all">
            <Users size={12} /> Assign To
          </button>
          {/* Edit */}
          <button onClick={() => router.push(`/admin/courses/${courseId}/assignments/${assignment.id}/edit`)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-all">
            <Pencil size={12} /> Edit
          </button>
          {/* ⋮ */}
          <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <h1 className="text-2xl font-black text-gray-900 mb-5">{assignment.title}</h1>

          {/* Description */}
          <div className="mb-6">
            <style>{`
              .assignment-desc { font-size: 13px; color: #374151; line-height: 1.7; }
              .assignment-desc p { margin: 0 0 8px; }
              .assignment-desc strong, .assignment-desc b { font-weight: 700; color: #111827; }
              .assignment-desc ul, .assignment-desc ol { padding-left: 20px; margin: 0 0 8px; }
              .assignment-desc li { margin-bottom: 4px; }
              .assignment-desc a { color: #7b1113; text-decoration: underline; }
            `}</style>
            <div className="assignment-desc" dangerouslySetInnerHTML={{ __html: assignment.description ?? "<em style='color:#9ca3af'>No description provided.</em>" }} />
          </div>

          {/* Details */}
          <div className="bg-white border-b border-gray-100 mb-5 overflow-hidden">
            <div className="px-1 py-1 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
              <p className="text-[10px] font-black uppercase tracking-widest px-3 py-1" style={{ color: MAROON }}>Details</p>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Points</p>
                <p className="text-sm font-bold text-gray-800">{assignment.points}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Submission Type</p>
                <p className="text-sm font-bold text-gray-800">{submittingLabel}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Assignment Group</p>
                <p className="text-sm font-bold text-gray-800">{assignment.assignmentGroup || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Status</p>
                <p className="text-sm font-bold" style={{ color: isPublished ? "#15803d" : "#6b7280" }}>{isPublished ? "Published" : "Unpublished"}</p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white border-b border-gray-100 mb-5 overflow-hidden">
            <div className="px-1 py-1 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
              <p className="text-[10px] font-black uppercase tracking-widest px-3 py-1" style={{ color: MAROON }}>Schedule</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Due", "For", "Available From", "Until"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-700">{fmtDue(assignment.dueDate)}</td>
                    <td className="px-5 py-3">
                      {forLabel === "Everyone" ? (
                        <span className="text-sm font-semibold text-gray-700">Everyone</span>
                      ) : (
                        <span className="text-sm font-bold cursor-default hover:underline" style={{ color: MAROON }}
                          title={(assignment.assignees ?? []).map((id) => enrolledUsers.find((u) => u.id === id)?.name ?? id).join(", ")}>
                          {forLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{fmtDateAdmin(assignment.availableFrom)}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{fmtDateAdmin(assignment.availableUntil)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Submissions section */}
          {submissions.length > 0 && (
            <div className="bg-white border-b border-gray-100 mb-5 overflow-hidden">
              <div className="px-1 py-1 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
                <p className="text-[10px] font-black uppercase tracking-widest px-3 py-1" style={{ color: MAROON }}>Submissions ({submissions.length})</p>
              </div>
              <div className="divide-y divide-gray-50">
                {submissions.slice(0, 10).map((sub, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{sub.userName ?? sub.userEmail}</p>
                      {sub.submittedAt && <p className="text-xs text-gray-400 mt-0.5">Submitted {fmtDateTime(sub.submittedAt)}</p>}
                    </div>
                    <button onClick={() => openSpeedGrader(sub.userId)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                      style={{ color: MAROON, background: "#fdf2f2", border: `1px solid #f0c0c0` }}>
                      <Zap size={11} /> Grade
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-56 border-l border-gray-200 bg-white shrink-0 flex flex-col overflow-y-auto">
          <div className="px-4 py-4 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Related Items</p>
          </div>
          <div className="px-4 py-4 space-y-3">
            <button onClick={() => openSpeedGrader()}
              className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left transition-colors" style={{ color: MAROON }}>
              <Zap size={13} /> SpeedGrader™
            </button>
            <button onClick={downloadSubmissions} disabled={downloading || submissions.filter((s) => s.fileUrl).length === 0}
              className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left disabled:opacity-40 transition-colors" style={{ color: MAROON }}>
              <Download size={13} /> {downloading ? "Preparing..." : "Download Submissions"}
            </button>
            <button className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left transition-colors" style={{ color: MAROON }}>
              <Upload size={13} /> Re-Upload Submissions
            </button>
          </div>
        </div>
      </div>

      {/* Assign To Side Panel */}
      {showAssignPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowAssignPanel(false)} />
          <div className="fixed right-0 top-0 h-full w-[340px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col" style={{ fontFamily: FONT }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: MAROON }}>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Assign To</p>
                <p className="text-sm font-bold text-white truncate mt-0.5">{assignment.title}</p>
              </div>
              <button onClick={() => setShowAssignPanel(false)} className="text-white/60 hover:text-white transition-colors ml-2"><X size={16} /></button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-[10px] font-semibold text-gray-500">Assignment · {assignment.points} pts</p>
            </div>
            <div className="mx-4 mt-4 mb-1 flex gap-2.5 rounded-xl px-3 py-2.5 border" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
              <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
              <p className="text-xs text-blue-700 leading-relaxed font-medium">Select who should be assigned and set due dates.</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
              {assignRows.map((row, idx) => (
                <div key={row.id} className="space-y-4">
                  {idx > 0 && (
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-px flex-1 bg-gray-100" />
                      <button onClick={() => removeAssignRow(row.id)} className="mx-3 text-xs font-bold text-red-400 hover:text-red-600">Remove</button>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Assign To</label>
                    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenDrop(null); }}>
                      <div className="min-h-[36px] border-2 rounded-xl px-2 py-1.5 flex flex-wrap gap-1 items-center cursor-text bg-white"
                        style={{ borderColor: openDrop === row.id ? MAROON : "#e5e7eb" }}
                        onClick={() => setOpenDrop(row.id)}>
                        {row.assignees.map((a) => (
                          <span key={a.id} className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: MAROON }}>
                            {a.label}
                            <button type="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); if (a.id === "everyone") return; toggleAssignee(row.id, a); }} className="opacity-70 hover:opacity-100 leading-none font-black">×</button>
                          </span>
                        ))}
                        <input value={dropSearch[row.id] ?? ""} onChange={(e) => { setDropSearch((p) => ({ ...p, [row.id]: e.target.value })); setOpenDrop(row.id); }}
                          onFocus={() => setOpenDrop(row.id)} placeholder={row.assignees.length ? "" : "Search..."}
                          className="flex-1 min-w-[80px] text-xs outline-none bg-transparent py-0.5 text-gray-700 placeholder:text-gray-400" />
                        <ChevronDown size={13} className="text-gray-400 shrink-0" />
                      </div>
                      {openDrop === row.id && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded-xl z-[200] max-h-48 overflow-y-auto">
                          {("everyone".includes((dropSearch[row.id] ?? "").toLowerCase()) || !(dropSearch[row.id] ?? "")) && (
                            <button type="button" tabIndex={0} onMouseDown={(e) => { e.preventDefault(); selectEveryone(row.id); setDropSearch((p) => ({ ...p, [row.id]: "" })); }}
                              className="w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-red-50 transition-colors"
                              style={row.assignees.some((a) => a.id === "everyone") ? { color: MAROON } : { color: "#374151" }}>
                              Everyone {row.assignees.some((a) => a.id === "everyone") && <Check size={12} style={{ color: MAROON }} />}
                            </button>
                          )}
                          {enrolledUsers.filter((u) => u.name.toLowerCase().includes((dropSearch[row.id] ?? "").toLowerCase())).map((u) => (
                            <button type="button" key={u.id} tabIndex={0}
                              onMouseDown={(e) => { e.preventDefault(); toggleAssignee(row.id, { id: u.id, label: u.name }); setDropSearch((p) => ({ ...p, [row.id]: "" })); }}
                              className="w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-red-50 transition-colors"
                              style={row.assignees.some((a) => a.id === u.id) ? { color: MAROON } : { color: "#374151" }}>
                              <span>{u.name}{u.courseRole && <span className="ml-1 text-gray-400 font-normal">({u.courseRole})</span>}</span>
                              {row.assignees.some((a) => a.id === u.id) && <Check size={12} style={{ color: MAROON }} />}
                            </button>
                          ))}
                          {enrolledUsers.filter((u) => u.name.toLowerCase().includes((dropSearch[row.id] ?? "").toLowerCase())).length === 0 && !("everyone".includes((dropSearch[row.id] ?? "").toLowerCase())) && (
                            <div className="px-3 py-3 text-xs text-gray-400 text-center">No results</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {([["Due Date", "dueDate", "dueTime"], ["Available From", "availableFrom", "availableFromTime"], ["Until", "until", "untilTime"]] as const).map(([label, dateField, timeField]) => (
                    <div key={label}>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">{label}</label>
                      <div className="flex gap-2">
                        <input type="date" value={row[dateField]} onChange={(e) => updateAssignRow(row.id, dateField, e.target.value)}
                          className="flex-1 h-8 border border-gray-200 rounded-lg px-2 text-xs outline-none focus:border-gray-400 bg-white" />
                        <div className="flex items-center gap-1">
                          <select value={row[timeField]} onChange={(e) => updateAssignRow(row.id, timeField, e.target.value)}
                            className="h-8 border border-gray-200 rounded-lg px-1.5 text-xs bg-white outline-none focus:border-gray-400 w-28">
                            {ASSIGN_TIMES.map((t) => <option key={t}>{t}</option>)}
                          </select>
                          <button onClick={() => updateAssignRow(row.id, dateField, "")} className="text-[10px] font-bold hover:underline shrink-0 transition-colors" style={{ color: MAROON }}>Clear</button>
                        </div>
                      </div>
                      {row[dateField] && <p className="text-[10px] text-gray-400 mt-1">{fmtLocalCourse(row[dateField], row[timeField])}</p>}
                    </div>
                  ))}
                </div>
              ))}
              <button onClick={addAssignRow} className="flex items-center gap-1.5 text-xs font-bold hover:underline transition-colors" style={{ color: MAROON }}>
                <span className="text-base leading-none">+</span> Add Row
              </button>
            </div>
            <div className="flex gap-2 px-4 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowAssignPanel(false)} className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
              <button onClick={saveAssignTo} disabled={savingAssign} className="flex-1 h-9 rounded-xl text-sm font-black text-white disabled:opacity-60 transition-all" style={{ background: MAROON }}>
                {savingAssign ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── HeadCreateAssignmentModal ─────────────────────────────────────────────────
type HeadAssignmentTab = "details" | "submission" | "settings" | "assign";
type HeadAssignRow = {
  id: number; assignees: string[]; dueDate: string; dueTime: string;
  availableFrom: string; availableFromTime: string; until: string; untilTime: string;
};

function buildAssignmentTimes() {
  const list: string[] = [];
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30) { const hh = ((h + 11) % 12) + 1; list.push(`${hh}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`); }
  return list;
}

const ASSIGNMENT_TIME_OPTIONS = buildAssignmentTimes();
const HEAD_GRADE_OPTIONS = ["Points", "Percentage", "Complete/Incomplete", "Letter Grade", "GPA Scale", "Not Graded"];
const HEAD_SUBMISSION_TYPES = ["Online", "On Paper", "No Submission", "External Tool", "Lucid"];

function HeadCreateAssignmentModal({ open, onClose, courseId, onCreated }: { open: boolean; onClose: () => void; courseId: string; onCreated: (assignment: Assignment) => void }) {
  const [activeTab, setActiveTab] = useState<HeadAssignmentTab>("details");
  const [name, setName] = useState("");
  const [points, setPoints] = useState("0");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [, setDescriptionText] = useState("");
  const [group, setGroup] = useState("Assignments");
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([{ id: 1, name: "Assignments" }]);
  const [displayGradeAs, setDisplayGradeAs] = useState("Points");
  const [doNotCount, setDoNotCount] = useState(false);
  const [submissionType, setSubmissionType] = useState("Online");
  const [published, setPublished] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [entryTextEntry, setEntryTextEntry] = useState(false);
  const [entryWebsiteURL, setEntryWebsiteURL] = useState(false);
  const [entryMediaRecordings, setEntryMediaRecordings] = useState(false);
  const [entryStudentAnnotation, setEntryStudentAnnotation] = useState(false);
  const [entryFileUploads, setEntryFileUploads] = useState(false);
  const [submissionAttempts, setSubmissionAttempts] = useState("Unlimited");
  const [allowedAttempts, setAllowedAttempts] = useState(1);
  const [isGroupAssignment, setIsGroupAssignment] = useState(false);
  const [assignGradesIndividually, setAssignGradesIndividually] = useState(false);
  const [groupSet, setGroupSet] = useState("");
  const [groupSets, setGroupSets] = useState<{ id: string; name: string }[]>([]);
  const [showGroupSetModal, setShowGroupSetModal] = useState(false);
  const [groupSetName, setGroupSetName] = useState("");
  const [selfSignUp, setSelfSignUp] = useState(false);
  const [requireSameSection, setRequireSameSection] = useState(false);
  const [groupStructure] = useState("Create groups later");
  const [createGroupsNow] = useState(0);
  const [limitGroupMembers] = useState(0);
  const [autoAssignLeader] = useState(false);
  const [leaderType] = useState("first");
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [assignRows, setAssignRows] = useState<HeadAssignRow[]>([{ id: 1, assignees: ["Everyone"], dueDate: "", dueTime: "", availableFrom: "", availableFromTime: "", until: "", untilTime: "" }]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setActiveTab("details");
    fetch(`/api/courses/${courseId}/assignments`).then(r => r.json()).then(d => {
      const list = d.assignments ?? [];
      const names = [...new Set(list.map((a: { assignmentGroup?: string }) => a.assignmentGroup || "Assignments"))];
      if (!names.includes("Assignments")) names.unshift("Assignments");
      setGroups(names.map((n: string, i: number) => ({ id: i + 1, name: n })));
    }).catch(() => undefined);
    fetch(`/api/admin/courses/${courseId}/groupsets`).then(r => r.json()).then(d => setGroupSets(d.groupSets ?? [])).catch(() => undefined);
    fetch(`/api/admin/courses/${courseId}/sections`).then(r => r.json()).then(d => { setSections(d.sections ?? []); setStaff(d.staff ?? []); }).catch(() => undefined);
  }, [open, courseId]);

  useEffect(() => {
    if (!openDropdownId) return;
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-head-assignee-dropdown]")) setOpenDropdownId(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openDropdownId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const addAssignRow = () => setAssignRows((p) => [...p, { id: Date.now(), assignees: [], dueDate: "", dueTime: "", availableFrom: "", availableFromTime: "", until: "", untilTime: "" }]);
  const removeAssignRow = (id: number) => setAssignRows((p) => p.filter((r) => r.id !== id));
  const updateAssignRow = (id: number, field: keyof HeadAssignRow, value: string | string[]) => setAssignRows((p) => p.map((r) => r.id === id ? { ...r, [field]: value } : r));
  const handleDateChange = (id: number, dateField: "dueDate" | "availableFrom" | "until", timeField: "dueTime" | "availableFromTime" | "untilTime", value: string) => {
    const defaultTime = dateField === "availableFrom" ? "12:00 AM" : "11:59 PM";
    setAssignRows((p) => p.map((r) => r.id !== id ? r : { ...r, [dateField]: value, [timeField]: r[timeField] || (value ? defaultTime : "") }));
  };
  const getDateErrors = (row: HeadAssignRow) => {
    const errors: { until?: string; availableFrom?: string } = {};
    const toMs = (date: string, time: string) => { if (!date) return null; return new Date(`${date} ${time || "11:59 PM"}`).getTime(); };
    const due = toMs(row.dueDate, row.dueTime); const until = toMs(row.until, row.untilTime); const available = toMs(row.availableFrom, row.availableFromTime);
    if (due && until && until < due) errors.until = "Lock date cannot be before due date";
    if (due && available && available > due) errors.availableFrom = "Unlock date cannot be after due date";
    return errors;
  };
  const toggleAssignee = (rowId: number, nameValue: string) => {
    setAssignRows((p) => p.map((r) => {
      if (r.id !== rowId) return r;
      const has = r.assignees.includes(nameValue);
      return { ...r, assignees: has ? r.assignees.filter((a) => a !== nameValue) : [...r.assignees, nameValue] };
    }));
  };
  const saveGroup = () => {
    const n = newGroupName.trim();
    if (!n) return;
    if (!groups.find((g) => g.name === n)) setGroups((p) => [...p, { id: Date.now(), name: n }]);
    setGroup(n); setGroupModalOpen(false); setNewGroupName("");
  };
  const getOnlineEntryOptions = () => {
    const o: string[] = [];
    if (entryTextEntry) o.push("Text Entry"); if (entryWebsiteURL) o.push("Website URL");
    if (entryMediaRecordings) o.push("Media Recordings"); if (entryStudentAnnotation) o.push("Student Annotation");
    if (entryFileUploads) o.push("File Uploads");
    return o;
  };

  const handleSave = async (publish: boolean) => {
    setSaveError(null);
    if (!name.trim()) { setSaveError("Assignment Name is required."); return; }
    if (submissionType === "Online" && getOnlineEntryOptions().length === 0) { setSaveError("Please select at least one Online Entry Option."); return; }
    setSaving(true);
    try {
      const row = assignRows[0];
      const payload = {
        title: name.trim(), description: descriptionHtml, points: parseFloat(points) || 0, submissionType,
        assignmentGroup: group, displayGradeAs, status: publish ? "PUBLISHED" : "UNPUBLISHED",
        assignees: row?.assignees ?? [], dueDate: row?.dueDate || null, dueTime: row?.dueTime || null,
        availableFrom: row?.availableFrom || null, availableFromTime: row?.availableFromTime || null,
        availableUntil: row?.until || null, untilTime: row?.untilTime || null,
        onlineEntryOptions: getOnlineEntryOptions(), submissionAttempts,
        allowedAttempts: submissionAttempts === "Limited" ? allowedAttempts : null,
        doNotCount, isGroupAssignment, groupSetId: groupSet || null, notifyUsers,
      };
      const endpoints = [`/api/courses/${courseId}/assignments`, `/api/admin/courses/${courseId}/assignments`];
      let res: Response | null = null; let data: any = {};
      for (const endpoint of endpoints) {
        try {
          const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const d = await r.json().catch(() => ({}));
          if (r.ok) { res = r; data = d; break; }
          if (r.status !== 401 && r.status !== 403 && r.status !== 404) { res = r; data = d; break; }
        } catch {}
      }
      if (!res || !res.ok) { setSaveError(data?.error ?? "Failed to create assignment."); return; }
      const created: Assignment = data.assignment ?? { id: String(Date.now()), title: name.trim(), description: descriptionHtml, dueDate: row?.dueDate ? `${row.dueDate}T00:00:00` : null, availableFrom: row?.availableFrom ? `${row.availableFrom}T00:00:00` : null, availableUntil: row?.until ? `${row.until}T00:00:00` : null, points: parseFloat(points) || 0, status: publish ? "PUBLISHED" : "UNPUBLISHED", submissionType, assignmentGroup: group };
      setPublished(publish);
      onCreated(created);
      onClose();
    } catch { setSaveError("Network error. Please try again."); } finally { setSaving(false); }
  };

  const tabs: { key: HeadAssignmentTab; label: string }[] = [{ key: "details", label: "Details" }, { key: "submission", label: "Submission" }, { key: "settings", label: "Settings" }, { key: "assign", label: "Assign" }];

  return (
    <div className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-[1180px] max-w-[98vw] h-[92vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <div className="text-lg font-semibold text-gray-900">Create Assignment</div>
            <div className="text-xs text-gray-500 mt-0.5">Head assignment composer with admin-style flow</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-50">✕</button>
        </div>
        <div className="flex items-center justify-end px-6 py-2.5 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-full border" style={published ? { background: "#22c55e", borderColor: "#22c55e" } : { borderColor: "#9ca3af" }} />
            {published ? "Published" : "Not Published"}
          </div>
        </div>
        <div className="flex items-end border-b border-gray-200 px-6 bg-white shrink-0">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-5 py-2 text-xs border border-b-0 -mb-px mr-0.5 rounded-t transition-colors ${activeTab === t.key ? "bg-white border-gray-200 text-gray-900 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{t.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-10 py-6">
          {activeTab === "details" && (
            <div className="space-y-5">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Assignment Name <span className="text-red-500">*</span></label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Assignment Name" className="w-full h-9 border rounded-sm px-3 text-sm outline-none focus:ring-1 transition-all" style={{ borderColor: MAROON }} onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${MAROON}30`; }} onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Description</label>
                <RichTextEditor valueHtml={descriptionHtml} onChangeHtml={setDescriptionHtml} onChangeText={setDescriptionText} placeholder="Assignment description..." />
              </div>
              <div className="grid grid-cols-[200px_1fr] items-start gap-y-4 gap-x-4 max-w-3xl">
                <label className="text-xs text-gray-700 text-right pt-2">Points</label>
                <input type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-80 outline-none focus:border-[#7b1113]" />
                <label className="text-xs text-gray-700 text-right pt-2">Assignment Group</label>
                <select value={group} onChange={(e) => { if (e.target.value === "__create__") { setNewGroupName(""); setGroupModalOpen(true); } else setGroup(e.target.value); }} className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-80 bg-white outline-none focus:border-[#7b1113]">
                  {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                  <option value="__create__">[ Create Group ]</option>
                </select>
              </div>
            </div>
          )}
          {activeTab === "submission" && (
            <div className="grid grid-cols-[200px_1fr] items-start gap-y-5 gap-x-4 max-w-3xl">
              <label className="text-xs text-gray-700 text-right pt-2">Submission Type</label>
              <div className="space-y-2">
                <select value={submissionType} onChange={(e) => setSubmissionType(e.target.value)} className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-80 bg-white outline-none focus:border-[#7b1113]">
                  {HEAD_SUBMISSION_TYPES.map((o) => <option key={o}>{o}</option>)}
                </select>
                {submissionType === "Online" && (
                  <div className="border border-gray-200 rounded-sm p-3 w-80 space-y-2">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Online Entry Options <span className="text-red-500">*</span></p>
                    {([["Text Entry", entryTextEntry, setEntryTextEntry], ["Website URL", entryWebsiteURL, setEntryWebsiteURL], ["Media Recordings", entryMediaRecordings, setEntryMediaRecordings], ["Student Annotation", entryStudentAnnotation, setEntryStudentAnnotation], ["File Uploads", entryFileUploads, setEntryFileUploads]] as const).map(([label, val, setter]) => (
                      <label key={label} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer"><input type="checkbox" checked={val as boolean} onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)} style={{ accentColor: MAROON }} />{label}</label>
                    ))}
                  </div>
                )}
              </div>
              <label className="text-xs text-gray-700 text-right pt-2">Submission Attempts</label>
              <div className="border border-gray-200 rounded-sm p-3 w-80 space-y-2">
                <p className="text-xs font-medium text-gray-700">Allowed Attempts</p>
                <select value={submissionAttempts} onChange={(e) => setSubmissionAttempts(e.target.value)} className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-full bg-white outline-none focus:border-[#7b1113]"><option>Unlimited</option><option>Limited</option></select>
                {submissionAttempts === "Limited" && <div><p className="text-xs font-medium text-gray-700 mb-1">Number of Attempts</p><input type="number" min={1} value={allowedAttempts} onChange={(e) => setAllowedAttempts(parseInt(e.target.value) || 1)} className="h-8 w-24 border border-gray-300 rounded-sm px-2 text-xs outline-none focus:border-[#7b1113]" /></div>}
              </div>
            </div>
          )}
          {activeTab === "settings" && (
            <div className="grid grid-cols-[200px_1fr] items-start gap-y-5 gap-x-4 max-w-3xl">
              <label className="text-xs text-gray-700 text-right pt-2">Display Grade as</label>
              <select value={displayGradeAs} onChange={(e) => setDisplayGradeAs(e.target.value)} className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-80 bg-white outline-none focus:border-[#7b1113]">{HEAD_GRADE_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select>
              <div />
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer"><input type="checkbox" checked={doNotCount} onChange={(e) => setDoNotCount(e.target.checked)} style={{ accentColor: MAROON }} />Do not count this assignment towards the final grade</label>
              <label className="text-xs text-gray-700 text-right pt-2">Group Assignment</label>
              <div className="border border-gray-200 rounded-sm p-3 w-80 space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer"><input type="checkbox" checked={isGroupAssignment} onChange={(e) => setIsGroupAssignment(e.target.checked)} style={{ accentColor: MAROON }} />This is a Group Assignment</label>
                {isGroupAssignment && (
                  <div className="pl-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer"><input type="checkbox" checked={assignGradesIndividually} onChange={(e) => setAssignGradesIndividually(e.target.checked)} style={{ accentColor: MAROON }} />Assign Grades to Each Student Individually</label>
                    <div><p className="text-xs text-gray-700 mb-1">Group Set</p>
                      <select value={groupSet} onChange={(e) => { if (e.target.value === "__new__") { setGroupSetName(""); setSelfSignUp(false); setRequireSameSection(false); setShowGroupSetModal(true); } else setGroupSet(e.target.value); }} className="h-7 w-full border border-gray-300 rounded-sm px-2 text-xs bg-white outline-none focus:border-[#7b1113]">
                        <option value="">Select a group category</option>
                        {groupSets.map((gs) => <option key={gs.id} value={gs.id}>{gs.name}</option>)}
                        <option value="__new__">+ New Group Set</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "assign" && (
            <div className="grid grid-cols-[200px_1fr] items-start gap-y-5 gap-x-4 max-w-3xl">
              <label className="text-xs text-gray-700 text-right pt-2">Assign Access</label>
              <div className="space-y-3">
                {assignRows.map((row, idx) => (
                  <div key={row.id} className="border border-gray-200 rounded-sm p-3 space-y-3 max-w-xl relative">
                    {idx > 0 && <button type="button" onClick={() => removeAssignRow(row.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs">✕</button>}
                    <div className="relative" data-head-assignee-dropdown onMouseDown={(e) => e.stopPropagation()}>
                      <p className="text-xs font-medium text-gray-700 mb-1">Assign To</p>
                      <div onMouseDown={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === row.id ? null : row.id); setDropdownSearch(""); }} className="w-full min-h-[30px] border rounded-sm px-2 py-1 text-xs flex flex-wrap gap-1 items-center cursor-pointer bg-white select-none" style={{ borderColor: MAROON }}>
                        {row.assignees.length > 0 ? row.assignees.map((a) => (
                          <span key={a} className="px-2 py-0.5 rounded text-xs flex items-center gap-1 text-white font-medium" style={{ background: MAROON }}>{a}<button type="button" onMouseDown={(e) => { e.stopPropagation(); toggleAssignee(row.id, a); }} className="hover:opacity-70 font-bold ml-0.5">×</button></span>
                        )) : <span className="text-gray-400">Start typing to search...</span>}
                        <span className="ml-auto text-gray-400 text-[10px] pl-2 shrink-0">{openDropdownId === row.id ? "▲" : "▼"}</span>
                      </div>
                      {openDropdownId === row.id && (
                        <div data-head-assignee-dropdown className="absolute z-50 w-full bg-white border border-gray-200 shadow-lg rounded-sm mt-0.5 max-h-52 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="px-2 pt-2 pb-1 border-b border-gray-100 sticky top-0 bg-white"><input autoFocus value={dropdownSearch} onChange={(e) => setDropdownSearch(e.target.value)} placeholder="Search..." className="w-full h-6 px-2 text-xs border border-gray-200 rounded outline-none focus:border-[#7b1113]" /></div>
                          {["Everyone"].filter((o) => o.toLowerCase().includes(dropdownSearch.toLowerCase())).map((opt) => (
                            <button key={opt} type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, opt); }} className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50" style={{ color: row.assignees.includes(opt) ? MAROON : "#374151", fontWeight: row.assignees.includes(opt) ? 600 : 400 }}>
                              {opt}{row.assignees.includes(opt) && <span style={{ color: MAROON }}>✓</span>}
                            </button>
                          ))}
                          {sections.filter((s) => s.name.toLowerCase().includes(dropdownSearch.toLowerCase())).length > 0 && (
                            <><div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 bg-gray-50">Sections</div>
                              {sections.filter((s) => s.name.toLowerCase().includes(dropdownSearch.toLowerCase())).map((s) => (
                                <button key={s.id} type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }} className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50" style={{ color: row.assignees.includes(s.name) ? MAROON : "#374151", fontWeight: row.assignees.includes(s.name) ? 600 : 400 }}>
                                  {s.name}{row.assignees.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                                </button>
                              ))}</>
                          )}
                          {staff.filter((s) => s.name.toLowerCase().includes(dropdownSearch.toLowerCase())).length > 0 && (
                            <><div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-gray-100 bg-gray-50">Staff</div>
                              {staff.filter((s) => s.name.toLowerCase().includes(dropdownSearch.toLowerCase())).map((s) => (
                                <button key={s.id} type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleAssignee(row.id, s.name); }} className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50" style={{ color: row.assignees.includes(s.name) ? MAROON : "#374151", fontWeight: row.assignees.includes(s.name) ? 600 : 400 }}>
                                  {s.name}{row.assignees.includes(s.name) && <span style={{ color: MAROON }}>✓</span>}
                                </button>
                              ))}</>
                          )}
                        </div>
                      )}
                    </div>
                    {([["Due Date", "dueDate", "dueTime", undefined], ["Available from", "availableFrom", "availableFromTime", getDateErrors(row).availableFrom], ["Until", "until", "untilTime", getDateErrors(row).until]] as const).map(([label, dateField, timeField, errMsg]) => (
                      <div key={label}>
                        <p className="text-xs font-medium text-gray-700 mb-1">{label}</p>
                        <div className={`flex gap-0 border rounded-sm overflow-hidden ${errMsg ? "border-red-500" : "border-gray-300"}`}>
                          <input type="date" value={row[dateField]} onChange={(e) => handleDateChange(row.id, dateField as any, timeField as any, e.target.value)} className="flex-1 h-7 border-0 px-2 text-xs outline-none bg-white" />
                          <div className="w-px bg-gray-200 self-stretch" />
                          <select value={row[timeField]} onChange={(e) => updateAssignRow(row.id, timeField as any, e.target.value)} className="h-7 border-0 px-2 text-xs bg-white outline-none w-28">
                            <option value="">Time</option>{ASSIGNMENT_TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        {errMsg && <p className="text-xs text-red-500 mt-0.5">{errMsg}</p>}
                        <button type="button" onClick={() => { updateAssignRow(row.id, dateField as any, ""); updateAssignRow(row.id, timeField as any, ""); }} className="text-xs hover:underline mt-0.5" style={{ color: MAROON }}>Clear</button>
                      </div>
                    ))}
                  </div>
                ))}
                <button type="button" onClick={addAssignRow} className="w-full max-w-xl h-8 border border-gray-300 bg-gray-50 text-xs text-gray-600 rounded-sm hover:bg-gray-100 flex items-center justify-center gap-1">+ Assign To</button>
              </div>
              <div />
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer mt-1"><input type="checkbox" checked={notifyUsers} onChange={(e) => setNotifyUsers(e.target.checked)} style={{ accentColor: MAROON }} />Notify users that this content has changed</label>
            </div>
          )}
        </div>
        {groupModalOpen && (
          <div className="fixed inset-0 z-[270] flex items-center justify-center bg-black/20">
            <div className="w-[460px] bg-white shadow-xl border border-gray-200 rounded" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-800">Add Assignment Group</div>
                <button onClick={() => setGroupModalOpen(false)} className="w-6 h-6 flex items-center justify-center border text-gray-700 rounded text-sm" style={{ borderColor: MAROON, color: MAROON }}>×</button>
              </div>
              <div className="px-6 py-6">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-700">Group Name:</label>
                  <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveGroup()} placeholder="e.g., Essay Group 1" className="flex-1 h-8 border border-gray-300 px-2 text-xs outline-none focus:border-[#7b1113] rounded-sm" />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex justify-end gap-2">
                <button onClick={() => setGroupModalOpen(false)} className="h-8 px-4 border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50 rounded">Cancel</button>
                <button onClick={saveGroup} style={{ background: MAROON }} className="h-8 px-4 text-white text-xs rounded hover:opacity-90">Add Group</button>
              </div>
            </div>
          </div>
        )}
        {showGroupSetModal && (
          <div className="fixed inset-0 z-[270] flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-lg shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-800">Create Group Set</h2>
                <button onClick={() => setShowGroupSetModal(false)} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100 text-sm">✕</button>
              </div>
              <div className="px-6 py-5 space-y-0">
                <div className="flex items-center gap-4 pb-4">
                  <label className="text-sm text-gray-700 w-36 shrink-0">Group Set Name <span className="text-red-500">*</span></label>
                  <input value={groupSetName} onChange={(e) => setGroupSetName(e.target.value)} placeholder="Enter Group Set Name" className="flex-1 h-9 border border-gray-300 rounded px-3 text-sm outline-none focus:border-[#7b1113]" />
                </div>
                <div className="border-t border-gray-200 py-4">
                  <div className="flex items-start gap-4">
                    <label className="text-sm text-gray-700 w-36 shrink-0 pt-0.5">Self Sign-Up</label>
                    <div className="space-y-2 flex-1">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={selfSignUp} onChange={(e) => { setSelfSignUp(e.target.checked); if (!e.target.checked) setRequireSameSection(false); }} style={{ accentColor: MAROON }} />Allow self sign-up</label>
                      <label className={`flex items-center gap-2 text-sm cursor-pointer ${selfSignUp ? "text-gray-700" : "text-gray-400"}`}><input type="checkbox" checked={requireSameSection} onChange={(e) => setRequireSameSection(e.target.checked)} disabled={!selfSignUp} style={{ accentColor: MAROON }} />Require group members to be in the same section</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button onClick={() => setShowGroupSetModal(false)} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
                <button onClick={async () => {
                  if (!groupSetName.trim()) return;
                  try {
                    const res = await fetch(`/api/admin/courses/${courseId}/groupsets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: groupSetName.trim(), selfSignUp, requireSameSection, groupStructure, createGroupsNow, limitGroupMembers, autoAssignLeader, leaderType }) });
                    if (res.ok) { const data = await res.json(); const newGs = data.groupSet; setGroupSets((p) => [...p, { id: newGs.id, name: newGs.name }]); setGroupSet(newGs.id); setShowGroupSetModal(false); }
                  } catch {}
                }} style={{ background: MAROON }} className="px-4 py-2 text-white text-sm rounded hover:opacity-90">Save</button>
              </div>
            </div>
          </div>
        )}
        <div className="shrink-0 border-t border-gray-200 bg-white px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">{saveError && <span className="text-xs text-red-600 font-medium">⚠ {saveError}</span>}</div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={saving} className="h-8 px-5 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            {activeTab !== "details" && <button type="button" onClick={() => setActiveTab(activeTab === "submission" ? "details" : activeTab === "settings" ? "submission" : "settings")} className="h-8 px-5 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50">← Back</button>}
            {activeTab !== "assign" && <button type="button" onClick={() => setActiveTab(activeTab === "details" ? "submission" : activeTab === "submission" ? "settings" : "assign")} className="h-8 px-5 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100">Next →</button>}
            {activeTab === "assign" && (
              <><button onClick={() => handleSave(true)} disabled={saving} className="h-8 px-5 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50">{saving ? "Saving..." : "Save & Publish"}</button>
                <button onClick={() => handleSave(false)} disabled={saving} style={{ background: MAROON }} className="h-8 px-5 text-white text-xs rounded hover:opacity-90 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CourseViewInner ───────────────────────────────────────────────────────────
function CourseViewInner({ courseId }: { courseId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [course, setCourse] = useState<Course | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Home");
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);

  // Head assignment detail view
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);

  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [announcementFilter, setAnnouncementFilter] = useState("All");
  const [viewingAnnouncementId, setViewingAnnouncementId] = useState<string | null>(null);
  const [selectedAnnouncementIds, setSelectedAnnouncementIds] = useState<Set<string>>(new Set());

  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [createTopicTitle, setCreateTopicTitle] = useState("");
  const [createBodyHtml, setCreateBodyHtml] = useState("");
  const [createBodyText, setCreateBodyText] = useState("");
  const [createAttachments, setCreateAttachments] = useState<any[]>([]);
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
  const [peopleMenuOpenId, setPeopleMenuOpenId] = useState<string | null>(null);
  const [showAddPeopleModal, setShowAddPeopleModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonRole, setNewPersonRole] = useState<"Staff" | "Head">("Staff");
  const [newGroupName, setNewGroupName] = useState("");
  const [peopleActionLoading, setPeopleActionLoading] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as Tab | null;
    if (tabParam && TABS.includes(tabParam)) startTransition(() => setActiveTab(tabParam));
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch(`/api/courses/${courseId}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/courses/${courseId}/assignments`).then((r) => r.json()).catch(() => ({ assignments: [] })),
      fetch(`/api/courses/${courseId}/announcements`).then((r) => r.json()).catch(() => ({ announcements: [] })),
      fetch(`/api/courses/${courseId}/people`).then((r) => r.json()).catch(() => ({ people: [] })),
      fetch(`/api/courses/${courseId}/groups`).then((r) => r.json()).catch(() => ({ groups: [] })),
      fetch(`/api/admin/courses/${courseId}/sections`).then((r) => r.json()).catch(() => ({})),
    ]).then(([courseData, assignmentData, announcementData, peopleData, groupData, sectionData]) => {
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

      const peopleList = (peopleData.people ?? []).map((p: Person) => ({ ...p, role: normalizeCourseRole(p.role) }));
      setPeople(peopleList);
      setGroups(groupData.groups ?? []);

      // Build enrolledUsers for Assign To panel
      const rawStaff = sectionData.staff ?? sectionData.users ?? sectionData.members ?? [];
      const rawSections = sectionData.sections ?? [];
      const staffUsers: EnrolledUser[] = rawStaff.map((u: any) => ({ id: u.id, name: u.name ?? u.userName ?? u.email ?? u.id, courseRole: u.courseRole ?? "Staff" }));
      const sectionUsers: EnrolledUser[] = rawSections.map((s: any) => ({ id: `section:${s.id}`, name: s.name, courseRole: "Section" }));
      setEnrolledUsers([...staffUsers, ...sectionUsers]);

      setLoading(false);
    });
    return () => { isMounted = false; };
  }, [courseId]);

  const canManageAnnouncements = membership?.permissions.manageAnnouncements ?? false;
  const canManageAssignments = membership?.permissions.manageAssignments ?? false;
  const canManagePeople = membership?.permissions.managePeople ?? false;
  const canManageCourse = membership?.permissions.manageCourse ?? false;
  const canSubmitAssignments = membership?.permissions.submitAssignments ?? false;

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
    const upcoming: Assignment[] = []; const undated: Assignment[] = []; const past: Assignment[] = [];
    filtered.forEach((a) => {
      if (!a.dueDate) undated.push(a);
      else if (new Date(a.dueDate) >= now) upcoming.push(a);
      else past.push(a);
    });
    return { filteredAssignments: filtered, upcoming, undated, past };
  }, [assignments, assignmentSearch]);

  const viewingAnnouncementObj = announcements.find((a) => a.id === viewingAnnouncementId) ?? null;

  const handleAddCreateAttachments = (files: any[]) => setCreateAttachments((prev) => [...prev, ...files]);
  const handleRemoveCreateAttachment = (id: string) => setCreateAttachments((prev) => prev.filter((f) => f.id !== id));

  const handlePublishCourseAnnouncement = async () => {
    if (!createTopicTitle.trim()) return;
    setCreateIsPublishing(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/announcements`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: createTopicTitle.trim(), bodyText: createBodyText.trim(), bodyHtml: createBodyHtml, assignTo: createAssignTo.length ? createAssignTo : ["Everyone"], allowComments: createAllowComment, allowLiking: createAllowLiking, availableFrom: createAvailableFromDate ? `${createAvailableFromDate}T${createAvailableFromTime || "00:00"}` : null, availableUntil: createUntilDate ? `${createUntilDate}T${createUntilTime || "00:00"}` : null, attachments: createAttachments.map((f) => ({ name: f.name, url: f.url, size: f.size, mimeType: f.type })) }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      const d = await res.json();
      const raw = d.announcement ?? d;
      const newAnnouncement = normalizeAnnouncement(raw as any, Date.now());
      setAnnouncements((prev) => [newAnnouncement, ...prev]);
      setCreateTopicTitle(""); setCreateBodyHtml(""); setCreateBodyText(""); setCreateAttachments([]);
      setCreateAssignTo(["Everyone"]); setCreateAllowComment(true); setCreateDisallowThreaded(false);
      setCreateMustRespondFirst(false); setCreateEnablePodcast(false); setCreateAllowLiking(false);
      setCreateAvailableFromDate(""); setCreateAvailableFromTime(""); setCreateUntilDate(""); setCreateUntilTime("");
      setShowCreateAnnouncement(false);
    } catch (err) {
      console.error(err);
      alert("Hindi ma-publish ang announcement. Subukan ulit.");
    } finally { setCreateIsPublishing(false); }
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
    } catch (err) { console.error(err); alert("Hindi ma-add ang tao. Subukan ulit."); } finally { setPeopleActionLoading(false); }
  };

  const handleAddGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setPeopleActionLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/groups`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error("Failed to add group");
      const data = await res.json();
      const group = data.group ?? null;
      if (group) setGroups((prev) => [group, ...prev]);
      setNewGroupName(""); setShowAddGroupModal(false); setPeopleTab("Groups");
    } catch (err) { console.error(err); alert("Hindi ma-add ang group. Subukan ulit."); } finally { setPeopleActionLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: COLORS.textMuted, fontFamily: FONT }}>Loading...</div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3" style={{ fontFamily: FONT }}>
        <p className="text-sm" style={{ color: COLORS.textSecondary }}>Course not found.</p>
        <button onClick={() => router.back()} className="text-sm hover:underline" style={{ color: COLORS.primary }}>← Go back</button>
      </div>
    );
  }

  const filteredPeople = people.filter((p) => (p.name ?? p.email).toLowerCase().includes(peopleSearch.toLowerCase()) && (roleFilter === "All Roles" || normalizeCourseRole(p.role) === roleFilter));
  const filteredGroups = groups.filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase()) || g.members.some((m) => (m.name ?? "").toLowerCase().includes(groupSearch.toLowerCase())));
  const roleCounts = ["Staff", "Head"].reduce<Record<string, number>>((acc, r) => { acc[r] = people.filter((p) => normalizeCourseRole(p.role) === r).length; return acc; }, {});
  const toggleGroup = (id: string) => setExpandedGroups((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="flex h-full bg-white overflow-hidden" style={{ fontFamily: FONT, fontSize: 13 }}>
      {/* Sidebar nav */}
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
              <button key={tab} onClick={() => { setActiveTab(tab); if (tab !== "Announcements") setViewingAnnouncementId(null); if (tab !== "Assignments") setViewingAssignment(null); }}
                className="w-full text-left text-sm py-2 transition-colors"
                style={{ fontFamily: FONT, paddingLeft: isActive ? 13 : 16, paddingRight: 12, color: isActive ? COLORS.text : COLORS.primary, fontWeight: isActive ? 600 : 500, background: isActive ? COLORS.primarySoft : "transparent", borderLeft: isActive ? `3px solid ${COLORS.primary}` : "3px solid transparent" }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = COLORS.primarySoft; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                {tab}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto bg-white">
        {/* ── Home ── */}
        {activeTab === "Home" && (
          <div className="flex h-full">
            <div className="flex-1 px-8 py-6">
              <div className="flex items-center gap-3 mb-5">
                <h1 className="text-lg font-semibold" style={{ color: COLORS.text }}>{course.name}</h1>
                <MembershipBadge role={membership?.role ?? "Staff"} />
              </div>
              <div className="italic" style={{ color: COLORS.textSecondary, fontSize: 16 }}>No modules have been defined for this course.</div>
              {(canManageCourse || canManageAssignments || canManageAnnouncements || canManagePeople) && (
                <div className="mt-6 rounded-lg border px-4 py-4 bg-[#fdf8f8]" style={{ borderColor: "#f0e4e4" }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>Head Controls</p>
                  <div className="flex flex-wrap gap-2">
                    {canManageAnnouncements && <button type="button" onClick={() => setActiveTab("Announcements")} className="text-xs px-3 py-2 rounded border bg-white hover:bg-gray-50" style={{ borderColor: "#d1d5db", color: MAROON }}>Manage Announcements</button>}
                    {canManageAssignments && <button type="button" onClick={() => setActiveTab("Assignments")} className="text-xs px-3 py-2 rounded border bg-white hover:bg-gray-50" style={{ borderColor: "#d1d5db", color: MAROON }}>Manage Assignments</button>}
                    {canManagePeople && <button type="button" onClick={() => setActiveTab("People")} className="text-xs px-3 py-2 rounded border bg-white hover:bg-gray-50" style={{ borderColor: "#d1d5db", color: MAROON }}>Manage People</button>}
                  </div>
                </div>
              )}
            </div>
            <div className="w-64 border-l px-5 py-5 shrink-0 space-y-3" style={{ borderColor: COLORS.border }}>
              <SideBtn icon="📊" label="View Course Stream" />
              <SideBtn icon="📅" label="View Course Calendar" />
              <SideBtn icon="🔔" label="View Course Notifications" />
              <div className="pt-3 border-t" style={{ borderColor: "#f3f4f6" }}>
                <p className="text-xs font-bold mb-1.5" style={{ color: COLORS.text }}>To Do</p>
                <p className="text-xs" style={{ color: COLORS.textMuted }}>{canSubmitAssignments ? "You can submit work in this course." : "View only access."}</p>
              </div>
              <div className="pt-3 border-t" style={{ borderColor: "#f3f4f6" }}>
                <p className="text-xs font-bold mb-1.5" style={{ color: COLORS.text }}>Course Groups</p>
                {groups.filter((g) => g.isMember).length === 0 ? (
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>No groups</p>
                ) : (
                  groups.filter((g) => g.isMember).map((g) => (
                    <button key={g.id} onClick={() => router.push(`/courses/${courseId}/groups/${g.id}`)} className="block text-xs hover:underline mb-0.5" style={{ color: COLORS.primary, fontFamily: FONT }}>{g.name}</button>
                  ))
                )}
              </div>
              <div className="pt-3 border-t" style={{ borderColor: "#f3f4f6" }}>
                <p className="text-xs font-bold mb-1.5" style={{ color: COLORS.text }}>Access</p>
                <p className="text-xs" style={{ color: COLORS.textMuted }}>Role: {membership?.role ?? "Staff"}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Announcements ── */}
        {activeTab === "Announcements" && (
          viewingAnnouncementObj ? (
            <StudentAnnouncementDetail announcement={viewingAnnouncementObj} onBack={() => setViewingAnnouncementId(null)} onMarkRead={onMarkRead} />
          ) : showCreateAnnouncement ? (
            <AnnouncementCreateView
              isCoursePublished={course?.status?.toLowerCase?.() === "published"}
              topicTitle={createTopicTitle} setTopicTitle={setCreateTopicTitle}
              bodyHtml={createBodyHtml} setBodyHtml={setCreateBodyHtml} setBodyText={setCreateBodyText}
              attachments={createAttachments} onAddAttachments={handleAddCreateAttachments} onRemoveAttachment={handleRemoveCreateAttachment}
              assignTo={createAssignTo} setAssignTo={setCreateAssignTo}
              sections={[] as any} staff={people.map((p) => ({ id: p.id, name: p.name ?? p.email })) as any}
              allowComment={createAllowComment} setAllowComment={setCreateAllowComment}
              disallowThreaded={createDisallowThreaded} setDisallowThreaded={setCreateDisallowThreaded}
              mustRespondFirst={createMustRespondFirst} setMustRespondFirst={setCreateMustRespondFirst}
              enablePodcast={createEnablePodcast} setEnablePodcast={setCreateEnablePodcast}
              allowLiking={createAllowLiking} setAllowLiking={setCreateAllowLiking}
              availableFromDate={createAvailableFromDate} setAvailableFromDate={setCreateAvailableFromDate}
              availableFromTime={createAvailableFromTime} setAvailableFromTime={setCreateAvailableFromTime}
              untilDate={createUntilDate} setUntilDate={setCreateUntilDate}
              untilTime={createUntilTime} setUntilTime={setCreateUntilTime}
              onCancel={() => setShowCreateAnnouncement(false)} onPublish={handlePublishCourseAnnouncement}
              onResetUntil={() => { setCreateUntilDate(""); setCreateUntilTime(""); }} isPublishing={createIsPublishing}
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
          // If Head is viewing an assignment detail, show admin-style detail
          viewingAssignment && canManageAssignments ? (
            <HeadAssignmentDetail
              assignment={viewingAssignment}
              courseId={courseId}
              enrolledUsers={enrolledUsers}
              onBack={() => setViewingAssignment(null)}
              onAssignmentUpdated={(updated) => {
                setAssignments((prev) => prev.map((a) => a.id === updated.id ? updated : a));
                setViewingAssignment(updated);
              }}
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
                      <button type="button" onClick={() => setShowCreateAssignment(true)} className="text-sm text-white rounded px-4 py-2 hover:opacity-90" style={{ background: MAROON }}>Create Assignment</button>
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
                  {upcoming.length > 0 && <AssignmentSection title="Upcoming Assignments" items={upcoming} canManage={canManageAssignments} onHeadClick={setViewingAssignment} courseId={courseId} router={router} />}
                  {undated.length > 0 && <AssignmentSection title="Undated Assignments" items={undated} canManage={canManageAssignments} onHeadClick={setViewingAssignment} courseId={courseId} router={router} />}
                  {past.length > 0 && <AssignmentSection title="Past Assignments" items={past} canManage={canManageAssignments} onHeadClick={setViewingAssignment} courseId={courseId} router={router} />}
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
                  <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: COLORS.textSecondary }}><span className="text-xs" style={{ color: COLORS.textMuted }}>▼</span>{section.title}</div>
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
                <button className="flex items-center gap-2 px-3 py-1.5 border rounded text-sm hover:bg-gray-50" style={{ borderColor: "#d1d5db", color: COLORS.textSecondary, fontFamily: FONT }}><Printer className="w-4 h-4" />Print Grades</button>
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
                    {["Name", "Due", "Submitted", "Status", "Score"].map((h) => (<th key={h} className="text-left pb-2.5 font-semibold" style={{ color: COLORS.textSecondary }}>{h}</th>))}
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
                      {Object.entries(roleCounts).filter(([, c]) => c > 0).map(([r, c]) => (<option key={r} value={r}>{r} ({c})</option>))}
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

        {/* Add People Modal */}
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
                <button onClick={handleAddPerson} disabled={peopleActionLoading || !newPersonEmail.trim()} style={{ background: MAROON }} className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 hover:opacity-90 transition-all">{peopleActionLoading ? "Saving..." : "Add People"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Group Modal */}
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
                <button onClick={handleAddGroup} disabled={peopleActionLoading || !newGroupName.trim()} style={{ background: MAROON }} className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 hover:opacity-90 transition-all">{peopleActionLoading ? "Saving..." : "Save Group"}</button>
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
                    {["Date", "Details", "Due"].map((h, i) => (<th key={h} className={`pb-2.5 font-semibold ${i === 2 ? "text-right" : "text-left"} ${i === 0 ? "w-44" : ""}`} style={{ color: COLORS.textSecondary }}>{h}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr><td colSpan={3} className="py-10 text-center" style={{ color: COLORS.textMuted }}>No items in syllabus.</td></tr>
                  ) : (
                    assignments.map((a) => (
                      <tr key={a.id} className="border-b hover:bg-gray-50" style={{ borderColor: "#f3f4f6" }}>
                        <td className="py-3" style={{ color: COLORS.textSecondary }}>{fmtDateLong(a.dueDate)}</td>
                        <td className="py-3"><div className="flex items-center gap-2"><AssignmentIcon className="w-4 h-4 text-gray-400" /><button style={{ color: COLORS.primary, fontFamily: FONT }}>{a.title}</button></div></td>
                        <td className="py-3 text-right" style={{ color: COLORS.textMuted }}>{a.dueDate ? "due by " + new Date(a.dueDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase() : ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="w-56 border-l px-4 py-5 shrink-0 space-y-4" style={{ borderColor: COLORS.border }}>
              <MiniCalendar />
              <div className="pt-3 border-t text-xs" style={{ borderColor: "#f3f4f6", color: COLORS.textSecondary }}><p className="font-semibold">Course assignments are not weighted.</p></div>
            </div>
          </div>
        )}

        {activeTab === "Collaborations" && <div className="px-8 py-8 text-sm" style={{ color: COLORS.textMuted }}>No content available.</div>}
        {activeTab === "Quizzes" && <QuizzesPage courseId={courseId} />}
      </div>

      {/* Create Assignment Modal */}
      <HeadCreateAssignmentModal
        open={showCreateAssignment}
        onClose={() => setShowCreateAssignment(false)}
        courseId={courseId}
        onCreated={(assignment) => {
          setAssignments((prev) => [assignment, ...prev]);
          setShowCreateAssignment(false);
          setActiveTab("Assignments");
        }}
      />
    </div>
  );
}

// ── Default export ────────────────────────────────────────────────────────────
export default function CourseViewPage({ courseId }: { courseId: string }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-sm" style={{ color: COLORS.textMuted, fontFamily: FONT }}>Loading...</div>}>
      <CourseViewInner courseId={courseId} />
    </Suspense>
  );
}