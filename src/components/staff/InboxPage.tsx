"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Pencil, Reply, ReplyAll, Download, Trash2,
  MoreVertical, Search, ChevronDown, X, Send,
  Inbox, MailOpen, Archive, UserRound,
  ClipboardList, Megaphone, GraduationCap, FileText,
  ArrowLeft, RefreshCw, ChevronRight, Bell, Circle,
  Menu, Filter,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface CourseOption {
  id:   string;
  name: string;
  type: "course" | "group";
}

interface UserResult {
  id:        string;
  name:      string | null;
  email:     string;
  role?:     string;
  pronouns?: string | null;
  image?:    string | null;
}

interface ConvoParticipant {
  id:    string;
  name:  string | null;
  image: string | null;
  role:  string;
}

interface Conversation {
  id:           string;
  subject:      string;
  participants: ConvoParticipant[];
  preview:      string;
  date:         string;
  unread:       boolean;
  courseId:     string | null;
}

interface MessageAttachment {
  id:        string;
  name:      string;
  url:       string;
  size?:     number | null;
  mimeType?: string | null;
}

interface Message {
  id:        string;
  body:      string;
  createdAt: string;
  sender: {
    id:    string;
    name:  string | null;
    image: string | null;
    role:  string;
  };
  attachments: MessageAttachment[];
}

interface FullConversation {
  id:      string;
  subject: string;
  scope:   string;
  participants: {
    id:       string;
    isAuthor: boolean;
    user: {
      id:          string;
      name:        string | null;
      image:       string | null;
      role:        string;
      position?:   string | null;
      department?: string | null;
    };
  }[];
  messages: Message[];
}

interface CourseRef {
  id:    string;
  name:  string;
  code:  string;
  color: string;
}

interface NotifAssignment {
  id:          string;
  title:       string;
  description: string | null;
  dueDate:     string | null;
  course:      CourseRef | null;
  group:       { id: string; name: string } | null;
  status:      string;
  grade:       number | null;
  submittedAt: string | null;
}

interface NotifAnnouncement {
  id:          string;
  title:       string;
  bodyText:    string;
  author:      string;
  createdAt:   string;
  course:      CourseRef;
  attachments: { id: string; name: string; url: string }[];
}

interface NotifQuiz {
  id:          string;
  title:       string;
  description: string | null;
  quizType:    string;
  points:      number;
  dueDate:     string | null;
  course:      CourseRef;
  attempted:   boolean;
  score:       number | null;
  submittedAt: string | null;
}

interface NotifForm {
  id:          string;
  title:       string;
  description: string | null;
  formType:    string;
  points:      number;
  dueDate:     string | null;
  course:      CourseRef;
  submitted:   boolean;
  score:       number | null;
  submittedAt: string | null;
}

interface NotifEnrollment {
  id:         string;
  courseRole: string;
  section:    string | null;
  createdAt:  string;
  course:     CourseRef & { image: string | null; status: string };
}

type InboxItemType = "message" | "assignment" | "announcement" | "quiz" | "form" | "enrollment";

interface UnifiedInboxItem {
  id:       string;
  type:     InboxItemType;
  subject:  string;
  preview:  string;
  date:     string;
  unread:   boolean;
  sender?:  string;
  senderImage?: string | null;
  courseColor?: string;
  courseName?:  string;
  status?:  string;
  data:     Conversation | NotifAssignment | NotifAnnouncement | NotifQuiz | NotifForm | NotifEnrollment;
}

type PickView = "root" | "courses" | "course-roles" | "course-people" | "users";
type CategoryFilter = "all" | "messages" | "assignments" | "announcements" | "quizzes" | "enrollments";
type MailboxFilter  = "inbox" | "unread" | "sent" | "archived";

// ── Constants ──────────────────────────────────────────────────────────────────
const FONT      = "'DM Sans', 'Helvetica Neue', Arial, sans-serif";
const FONT_MONO = "'DM Mono', 'Courier New', monospace";

const C = {
  maroon:       "#8B1A1A",
  maroonDark:   "#6B1414",
  maroonDeep:   "#4A0E0E",
  maroonLight:  "#B23A3A",
  maroonBg:     "#FEF8F8",
  maroonMid:    "#F5E6E6",
  maroonBorder: "#E8CECE",
  bg:           "#F7F5F5",
  surface:      "#FFFFFF",
  surfaceAlt:   "#FAFAFA",
  border:       "#EBEBEB",
  borderStrong: "#D8D8D8",
  text:         "#1A1A1A",
  textMid:      "#4A4A4A",
  textLight:    "#888888",
  textMuted:    "#AAAAAA",
  unread:       "#8B1A1A",
};

const API_BASE          = "/api/inbox/conversations";
const API_USERS         = "/api/users";
const API_COURSES       = "/api/courses";
const API_COURSE_PEOPLE = (id: string) => `/api/courses/${id}/people`;

const MAILBOX_FILTERS: { key: MailboxFilter; label: string }[] = [
  { key: "inbox",    label: "All Mail"    },
  { key: "unread",   label: "Unread"      },
  { key: "sent",     label: "Sent"        },
  { key: "archived", label: "Archived"    },
];

const CATEGORY_FILTERS: { key: CategoryFilter; label: string; Icon: React.ElementType }[] = [
  { key: "all",           label: "All",           Icon: Inbox        },
  { key: "messages",      label: "Messages",       Icon: MailOpen     },
  { key: "assignments",   label: "Assignments",    Icon: ClipboardList},
  { key: "announcements", label: "Announcements",  Icon: Megaphone    },
  { key: "quizzes",       label: "Quizzes/Forms",  Icon: FileText     },
  { key: "enrollments",   label: "Enrollments",    Icon: GraduationCap},
];

// ── Global CSS ─────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

@keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
@keyframes fadeIn   { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
@keyframes slideIn  { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
@keyframes slideUp  { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
@keyframes spin     { to{transform:rotate(360deg)} }
@keyframes scaleIn  { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
@keyframes overlayIn { from{opacity:0} to{opacity:1} }

.ibx-root *, .ibx-root *::before, .ibx-root *::after { box-sizing: border-box; }

.ibx-root {
  display: flex; flex-direction: column;
  height: 100%; font-family: ${FONT};
  background: ${C.bg}; color: ${C.text};
  font-size: 14px;
}

/* ── Sidebar ── */
.ibx-sidebar {
  width: 200px; flex-shrink: 0;
  background: ${C.surface};
  border-right: 1px solid ${C.border};
  display: flex; flex-direction: column;
  overflow: hidden;
  transition: transform 0.25s ease, opacity 0.25s ease;
}

/* ── List panel ── */
.ibx-list-panel {
  width: 360px; flex-shrink: 0;
  background: ${C.surface};
  border-right: 1px solid ${C.border};
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* ── Detail panel ── */
.ibx-detail-panel {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; background: ${C.surface};
  animation: slideIn 0.18s ease;
}

/* ── Scrollbar ── */
.ibx-scroll::-webkit-scrollbar { width: 3px; }
.ibx-scroll::-webkit-scrollbar-track { background: transparent; }
.ibx-scroll::-webkit-scrollbar-thumb { background: ${C.maroonBorder}; border-radius: 2px; }

/* ── List row ── */
.ibx-row {
  display: flex; align-items: flex-start; gap: 0;
  padding: 0; border-bottom: 1px solid ${C.border};
  cursor: pointer; transition: background 0.1s;
  position: relative;
}
.ibx-row:hover { background: ${C.maroonBg}; }
.ibx-row.selected { background: ${C.maroonBg}; }
.ibx-row.unread .ibx-row-subject { font-weight: 700; color: ${C.text}; }
.ibx-row.read .ibx-row-subject { font-weight: 400; color: ${C.textMid}; }

/* ── Buttons ── */
.ibx-btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; border: none; cursor: pointer;
  font-family: ${FONT}; transition: all 0.1s; white-space: nowrap;
  background: none; border-radius: 4px; padding: 0;
}
.ibx-btn:disabled { cursor: default; opacity: 0.4; }

.ibx-icon-btn {
  width: 32px; height: 32px; border-radius: 6px;
  color: ${C.textLight}; border: none; background: none;
}
.ibx-icon-btn:hover:not(:disabled) {
  background: ${C.maroonMid}; color: ${C.maroon};
}

/* ── Touch-friendly icon buttons on mobile ── */
@media (max-width: 768px) {
  .ibx-icon-btn { width: 40px; height: 40px; border-radius: 8px; }
}

/* ── Shimmer ── */
.ibx-shimmer {
  background: linear-gradient(90deg,${C.border} 25%,${C.maroonMid} 50%,${C.border} 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 3px;
}

/* ── Chip ── */
.ibx-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px 2px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600;
  background: ${C.maroonMid}; color: ${C.maroon};
}

/* ── Sidebar items ── */
.ibx-sidebar-item {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 12px; border-radius: 0 20px 20px 0;
  font-size: 13px; font-weight: 400; color: ${C.textMid};
  cursor: pointer; border: none; background: none;
  width: calc(100% - 8px); margin-left: 0; text-align: left;
  transition: background 0.1s, color 0.1s; font-family: ${FONT};
  margin-bottom: 1px;
}
.ibx-sidebar-item:hover { background: ${C.maroonMid}; color: ${C.maroon}; }
.ibx-sidebar-item.active { background: ${C.maroonMid}; color: ${C.maroon}; font-weight: 600; }

/* ── Dropdown ── */
.ibx-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0;
  background: ${C.surface}; border: 1px solid ${C.border};
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
  z-index: 9999; overflow: hidden; animation: scaleIn 0.12s ease; min-width: 200px;
}

/* ── Mobile drawer overlay ── */
.ibx-drawer-overlay {
  display: none;
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,0.45);
  animation: overlayIn 0.2s ease;
}

/* ── Mobile sidebar drawer ── */
.ibx-sidebar-drawer {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: 280px; z-index: 501;
  background: ${C.surface};
  border-right: 1px solid ${C.border};
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: slideIn 0.22s ease;
  box-shadow: 4px 0 24px rgba(0,0,0,0.12);
}

/* ── Bottom sheet for filter on mobile ── */
.ibx-bottom-sheet {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 600;
  background: ${C.surface};
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 32px rgba(0,0,0,0.12);
  animation: slideUp 0.22s ease;
  max-height: 70vh;
  overflow-y: auto;
}

/* ── Compose modal ── */
.ibx-compose-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.35); backdrop-filter: blur(3px);
  padding: 16px;
}
.ibx-compose-modal {
  background: ${C.surface}; border-radius: 12px;
  width: 100%; max-width: 540px; max-height: 88vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  overflow: hidden; animation: scaleIn 0.18s ease;
}

/* ── Mobile layout overrides ── */
@media (max-width: 768px) {
  .ibx-sidebar { display: none !important; }

  .ibx-list-panel {
    width: 100% !important;
    border-right: none !important;
  }

  /* When detail is open on mobile, hide list */
  .ibx-list-panel.detail-open {
    display: none !important;
  }

  .ibx-detail-panel {
    position: fixed !important;
    inset: 0 !important;
    z-index: 200 !important;
    animation: slideIn 0.22s ease;
  }

  .ibx-compose-modal {
    max-width: 100% !important;
    width: 100% !important;
    height: 100% !important;
    max-height: 100% !important;
    border-radius: 0 !important;
  }
  .ibx-compose-overlay {
    padding: 0 !important;
    align-items: stretch !important;
  }

  .ibx-drawer-overlay { display: block; }
}

/* ── Tablet layout (768–1024) ── */
@media (min-width: 769px) and (max-width: 1024px) {
  .ibx-sidebar { width: 56px !important; }
  .ibx-sidebar .ibx-sidebar-label { display: none; }
  .ibx-sidebar .ibx-sidebar-header { padding: 12px 10px !important; }
  .ibx-sidebar .ibx-sidebar-header-text { display: none; }
  .ibx-sidebar-item {
    padding: 9px 0 !important;
    justify-content: center !important;
    width: 100% !important;
    border-radius: 0 !important;
    margin-left: 0 !important;
  }
  .ibx-sidebar-item .ibx-sidebar-label { display: none; }
  .ibx-sidebar-section-label { display: none !important; }
  .ibx-sidebar-badge { display: none !important; }
  .ibx-list-panel { width: 300px !important; }
}
`;

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(dateStr), now = new Date();
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function fmtDue(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  );
}

function initials(name?: string | null, email?: string) {
  const src = name ?? email ?? "?";
  const parts = src.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function typeIcon(type: InboxItemType) {
  switch (type) {
    case "assignment":   return <ClipboardList size={13} />;
    case "announcement": return <Megaphone size={13} />;
    case "quiz":         return <FileText size={13} />;
    case "form":         return <ClipboardList size={13} />;
    case "enrollment":   return <GraduationCap size={13} />;
    default:             return <MailOpen size={13} />;
  }
}

function typeLabel(type: InboxItemType) {
  switch (type) {
    case "assignment":   return "Assignment";
    case "announcement": return "Announcement";
    case "quiz":         return "Quiz";
    case "form":         return "Form";
    case "enrollment":   return "Enrollment";
    default:             return "Message";
  }
}

// ── Media query hooks ──────────────────────────────────────────────────────────
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

function useIsMobile() { return useMediaQuery("(max-width: 768px)"); }
function useIsTablet()  { return useMediaQuery("(min-width: 769px) and (max-width: 1024px)"); }

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, image, size = 34 }: { name?: string | null; image?: string | null; size?: number }) {
  if (image) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={name ?? "avatar"}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  );
  const bg = `hsl(${((name ?? "?").charCodeAt(0) * 37) % 360},45%,88%)`;
  const fg = `hsl(${((name ?? "?").charCodeAt(0) * 37) % 360},45%,32%)`;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: fg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, fontFamily: FONT, flexShrink: 0,
      letterSpacing: "-0.02em",
    }}>
      {initials(name)}
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 12, mb = 0 }: { w?: string | number; h?: number; mb?: number }) {
  return <div className="ibx-shimmer" style={{ width: w, height: h, marginBottom: mb }} />;
}

function ListSkeleton() {
  return (
    <div style={{ padding: "0" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} className="ibx-shimmer" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Skeleton w="40%" h={12} />
              <Skeleton w="48px" h={11} />
            </div>
            <Skeleton w="65%" h={12} />
            <Skeleton w="80%" h={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Nav Item ───────────────────────────────────────────────────────────────────
function NavItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="ibx-btn"
      onClick={onClick}
      style={{
        width: "100%", justifyContent: "space-between",
        padding: "10px 14px", fontSize: 13, fontWeight: 500,
        color: C.textMid, borderBottom: `1px solid ${C.border}`,
        fontFamily: FONT,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = C.maroonBg; e.currentTarget.style.color = C.maroon; }}
      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; }}
    >
      {label}<ChevronRight size={13} style={{ color: C.textMuted }} />
    </button>
  );
}

// ── Person Row ────────────────────────────────────────────────────────────────
function PersonRow({ u, onSelect }: { u: UserResult; onSelect: (u: UserResult) => void }) {
  return (
    <button className="ibx-btn"
      onClick={() => onSelect(u)}
      style={{
        width: "100%", justifyContent: "flex-start",
        padding: "10px 14px", gap: 10,
        borderBottom: `1px solid ${C.border}`, fontFamily: FONT,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = C.maroonBg)}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
    >
      <Avatar name={u.name} image={u.image} size={32} />
      <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
        {u.name && <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>}
        <p style={{ fontSize: 11, color: C.textMuted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
      </div>
      {u.role && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: C.maroonMid, color: C.maroon, fontFamily: FONT_MONO, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {u.role}
        </span>
      )}
    </button>
  );
}

// ── Person Picker Dropdown ─────────────────────────────────────────────────────
function PersonPickerDropdown({
  courseOptions, onSelectUser, onClose,
}: {
  courseOptions: CourseOption[];
  onSelectUser:  (u: UserResult) => void;
  onClose:       () => void;
}) {
  const [view,         setView]         = useState<PickView>("root");
  const [query,        setQuery]        = useState("");
  const [activeCourse, setActiveCourse] = useState<CourseOption | null>(null);
  const [activeRole,   setActiveRole]   = useState<string | null>(null);
  const [allPeople,    setAllPeople]    = useState<UserResult[]>([]);
  const [users,        setUsers]        = useState<UserResult[]>([]);
  const [loading,      setLoading]      = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 40); }, [view]);

  const fetchUsers = useCallback((q: string) => {
    const url = q.trim() ? `${API_USERS}?search=${encodeURIComponent(q)}` : API_USERS;
    fetch(url)
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (view !== "users") return;
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { fetchUsers(query); }, 300);
  }, [query, view, fetchUsers]);

  useEffect(() => {
    if (view !== "course-people" || !activeCourse) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(API_COURSE_PEOPLE(activeCourse!.id));
        const d = await r.json();
        if (cancelled) return;
        const list     = d.people ?? [];
        const filtered = activeRole
          ? list.filter((u: UserResult & { role?: string }) => (u.role ?? "").toLowerCase() === activeRole.toLowerCase())
          : list;
        setAllPeople(filtered);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [view, activeCourse, activeRole]);

  const filteredPeople = view === "course-people"
    ? (query.trim()
        ? allPeople.filter(u =>
            (u.name ?? "").toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase())
          )
        : allPeople)
    : [];

  const filteredCourses = courseOptions.filter(o => o.name.toLowerCase().includes(query.toLowerCase()));

  const goBack = () => {
    if (view === "course-people")     { setView("course-roles"); setQuery(""); setAllPeople([]); }
    else if (view === "course-roles") { setView("courses"); setQuery(""); setActiveCourse(null); }
    else                              { setView("root"); setQuery(""); }
  };

  const breadcrumb =
    view === "course-roles"  ? activeCourse?.name :
    view === "course-people" ? (activeRole ?? "All") : null;

  const showSearch = view !== "root" && view !== "course-roles";

  return (
    <div style={{ display: "flex", flexDirection: "column", maxHeight: 380, overflow: "hidden" }}>
      {view !== "root" && (
        <button className="ibx-btn"
          onClick={goBack}
          style={{ padding: "9px 14px", background: C.maroon, color: "#fff", fontSize: 13, fontWeight: 600, gap: 6, justifyContent: "flex-start", borderBottom: `1px solid ${C.maroonDark}`, width: "100%" }}
        >
          <ArrowLeft size={13} />{breadcrumb ?? "Back"}
        </button>
      )}
      {showSearch && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt }}>
          <Search size={13} style={{ color: C.textMuted, flexShrink: 0 }} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: FONT, color: C.text, background: "transparent" }}
          />
          {query && <button className="ibx-btn" onClick={() => setQuery("")} style={{ color: C.textMuted, width: 18, height: 18 }}><X size={12} /></button>}
        </div>
      )}
      <div style={{ overflowY: "auto", flex: 1 }} className="ibx-scroll">
        {view === "root" && (
          <>
            <NavItem label="Browse Courses" onClick={() => { setView("courses"); setQuery(""); }} />
            <NavItem label="All Users"      onClick={() => { setView("users");   setQuery(""); setLoading(true); fetchUsers(""); }} />
          </>
        )}
        {view === "courses" && (
          filteredCourses.length === 0
            ? <p style={{ fontSize: 12, color: C.textMuted, padding: 14, fontFamily: FONT }}>No courses found.</p>
            : filteredCourses.filter(o => o.type === "course").map(o => (
                <NavItem key={o.id} label={o.name} onClick={() => { setActiveCourse(o); setView("course-roles"); setQuery(""); }} />
              ))
        )}
        {view === "course-roles" && ["Teachers", "Staff", "Dean"].map(role => (
          <NavItem key={role} label={role} onClick={() => { setActiveRole(role); setView("course-people"); setQuery(""); setAllPeople([]); }} />
        ))}
        {view === "course-people" && (
          loading
            ? <div style={{ padding: 16 }}><Skeleton w="60%" h={13} mb={8} /><Skeleton w="80%" h={12} /></div>
            : filteredPeople.length === 0
              ? <p style={{ fontSize: 12, color: C.textMuted, padding: 14, fontFamily: FONT }}>No people found.</p>
              : filteredPeople.map(u => <PersonRow key={u.id} u={u} onSelect={u2 => { onSelectUser(u2); onClose(); }} />)
        )}
        {view === "users" && (
          loading
            ? <div style={{ padding: 16 }}><Skeleton w="60%" h={13} mb={8} /><Skeleton w="80%" h={12} /></div>
            : users.length === 0
              ? <p style={{ fontSize: 12, color: C.textMuted, padding: 14, fontFamily: FONT }}>No users found.</p>
              : users.map(u => <PersonRow key={u.id} u={u} onSelect={u2 => { onSelectUser(u2); onClose(); }} />)
        )}
      </div>
    </div>
  );
}

// ── Inbox Row ──────────────────────────────────────────────────────────────────
function InboxRow({
  item, selected, onSelect,
}: {
  item: UnifiedInboxItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const isMsg = item.type === "message";
  return (
    <div
      className={`ibx-row ${selected ? "selected" : ""} ${item.unread ? "unread" : "read"}`}
      onClick={onSelect}
      style={{ paddingLeft: 8 }}
    >
      {/* Unread dot */}
      <div style={{ width: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 18 }}>
        {item.unread && <Circle size={6} fill={C.maroon} stroke="none" />}
      </div>

      {/* Avatar / type icon */}
      <div style={{ padding: "13px 10px 13px 4px", flexShrink: 0 }}>
        {isMsg
          ? <Avatar name={item.sender} image={item.senderImage} size={36} />
          : (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: item.courseColor ? item.courseColor + "22" : C.maroonMid, display: "flex", alignItems: "center", justifyContent: "center", color: item.courseColor ?? C.maroon }}>
              {typeIcon(item.type)}
            </div>
          )
        }
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, padding: "13px 12px 13px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
          <span style={{
            fontSize: 13, fontWeight: item.unread ? 700 : 500,
            color: item.unread ? C.text : C.textMid,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1,
          }}>
            {item.sender ?? typeLabel(item.type)}
          </span>
          <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0, fontFamily: FONT_MONO, fontWeight: item.unread ? 600 : 400 }}>
            {timeAgo(item.date)}
          </span>
        </div>

        <p className="ibx-row-subject" style={{
          fontSize: 13, margin: "0 0 2px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.subject}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!isMsg && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3, background: C.maroonMid, color: C.maroon, fontFamily: FONT_MONO, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
              {typeLabel(item.type)}
            </span>
          )}
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {item.preview}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Detail Chip ────────────────────────────────────────────────────────────────
function DetailChip({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 14px", borderRadius: 8, background: accent ? C.maroonMid : C.surfaceAlt, border: `1px solid ${accent ? C.maroonBorder : C.border}` }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: accent ? C.maroon : C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT_MONO }}>{label}</span>
      {value && <span style={{ fontSize: 13, fontWeight: 600, color: accent ? C.maroon : C.text }}>{value}</span>}
    </div>
  );
}

// ── Thread/Detail Viewer ───────────────────────────────────────────────────────
function ThreadViewer({
  item, currentUserId, onBack, onArchive,
}: {
  item: UnifiedInboxItem;
  currentUserId: string;
  onBack: () => void;
  onArchive: (id: string) => void;
}) {
  const [convo,   setConvo]   = useState<FullConversation | null>(null);
  const [loading, setLoading] = useState(item.type === "message");
  const [reply,   setReply]   = useState("");
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async () => {
    if (item.type !== "message") return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE}/${item.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setConvo(data.conversation);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [item.id, item.type]);

  useEffect(() => { fetchThread(); }, [fetchThread]);
  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [loading, convo?.messages.length]);

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const res  = await fetch(`${API_BASE}/${item.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setConvo(prev => prev ? { ...prev, messages: [...prev.messages, data.message] } : prev);
      setReply("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  // Non-message detail view
  if (item.type !== "message") {
    const data = item.data;
    return (
      <div className="ibx-detail-panel">
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="ibx-btn ibx-icon-btn" onClick={onBack}><ArrowLeft size={15} /></button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: C.maroonMid, color: C.maroon, fontFamily: FONT_MONO, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {typeLabel(item.type)}
                </span>
                {item.courseName && (
                  <span style={{ fontSize: 12, color: C.textMuted }}>{item.courseName}</span>
                )}
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.3, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subject}</h2>
            </div>
          </div>
        </div>

        <div className="ibx-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          <div style={{ maxWidth: 680 }}>
            {item.type === "assignment" && (() => {
              const a = data as NotifAssignment;
              return (
                <div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    {a.dueDate && <DetailChip label="Due" value={fmtDue(a.dueDate) ?? ""} />}
                    <DetailChip label="Status" value={a.status} />
                    {a.grade !== null && <DetailChip label="Grade" value={String(a.grade)} accent />}
                    {a.submittedAt && <DetailChip label="Submitted" value={fmtDue(a.submittedAt) ?? ""} />}
                  </div>
                  {a.description && (
                    <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{a.description}</div>
                  )}
                </div>
              );
            })()}

            {item.type === "announcement" && (() => {
              const a = data as NotifAnnouncement;
              return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "12px 16px", background: C.maroonBg, borderRadius: 8, border: `1px solid ${C.maroonBorder}` }}>
                    <Avatar name={a.author} size={32} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{a.author}</p>
                      <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{timeAgo(a.createdAt)}</p>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{a.bodyText}</div>
                  {a.attachments.length > 0 && (
                    <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {a.attachments.map(att => (
                        <a key={att.id} href={att.url} target="_blank" rel="noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, color: C.textMid, textDecoration: "none" }}>
                          📎 {att.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {(item.type === "quiz" || item.type === "form") && (() => {
              const q = data as NotifQuiz | NotifForm;
              const isQuiz = item.type === "quiz";
              const quiz   = isQuiz ? (q as NotifQuiz) : null;
              const form   = !isQuiz ? (q as NotifForm) : null;
              return (
                <div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    {(q as NotifQuiz).dueDate && <DetailChip label="Due" value={fmtDue((q as NotifQuiz).dueDate) ?? ""} />}
                    {isQuiz && <DetailChip label="Points" value={String((q as NotifQuiz).points)} />}
                    {quiz && <DetailChip label={quiz.attempted ? "Attempted" : "Not Yet Taken"} value="" accent={quiz.attempted} />}
                    {quiz?.score !== null && quiz?.score !== undefined && <DetailChip label="Score" value={String(quiz.score)} accent />}
                    {form && <DetailChip label={form.submitted ? "Submitted" : "Pending"} value="" accent={form.submitted} />}
                    {form?.score !== null && form?.score !== undefined && <DetailChip label="Score" value={String(form.score)} accent />}
                  </div>
                  {q.description && (
                    <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{q.description}</div>
                  )}
                </div>
              );
            })()}

            {item.type === "enrollment" && (() => {
              const e = data as NotifEnrollment;
              return (
                <div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    <DetailChip label="Role"    value={e.courseRole} />
                    <DetailChip label="Status"  value={e.course.status === "PUBLISHED" ? "Published" : "Unpublished"} accent={e.course.status === "PUBLISHED"} />
                    <DetailChip label="Code"    value={e.course.code} />
                    {e.section && <DetailChip label="Section" value={e.section} />}
                    <DetailChip label="Enrolled" value={timeAgo(e.createdAt)} />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  // Message thread
  if (loading) return (
    <div className="ibx-detail-panel" style={{ alignItems: "center", justifyContent: "center", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${C.maroonMid}`, borderTopColor: C.maroon, animation: "spin 0.8s linear infinite" }} />
      <p style={{ fontSize: 13, color: C.textMuted }}>Loading…</p>
    </div>
  );

  if (error || !convo) return (
    <div className="ibx-detail-panel" style={{ alignItems: "center", justifyContent: "center", gap: 12 }}>
      <p style={{ color: "#dc2626", fontSize: 13 }}>{error ?? "Not found."}</p>
      <button className="ibx-btn ibx-icon-btn" onClick={onBack} style={{ width: "auto", padding: "8px 16px", border: `1px solid ${C.border}`, gap: 6, fontSize: 13, color: C.textMid }}>
        <ArrowLeft size={13} /> Back
      </button>
    </div>
  );

  const others = convo.participants.filter(p => p.user.id !== currentUserId);

  return (
    <div className="ibx-detail-panel">
      {/* Header */}
      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button className="ibx-btn ibx-icon-btn" onClick={onBack}><ArrowLeft size={15} /></button>
          <h2 style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {convo.subject}
          </h2>
          <div style={{ display: "flex", gap: 2 }}>
            <button className="ibx-btn ibx-icon-btn" title="Reply"><Reply size={14} /></button>
            <button className="ibx-btn ibx-icon-btn" title="Reply All"><ReplyAll size={14} /></button>
            <button className="ibx-btn ibx-icon-btn" title="Archive"
              onClick={async () => {
                await fetch(`${API_BASE}/${item.id}`, { method: "DELETE" });
                onArchive(item.id);
                onBack();
              }}>
              <Archive size={14} />
            </button>
            <button className="ibx-btn ibx-icon-btn" title="Delete"
              onClick={() => { onArchive(item.id); onBack(); }}>
              <Trash2 size={14} />
            </button>
            <button className="ibx-btn ibx-icon-btn"><MoreVertical size={14} /></button>
          </div>
        </div>
        {others.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingLeft: 40 }}>
            {others.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 5, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 10px 3px 4px" }}>
                <Avatar name={p.user.name} image={p.user.image} size={18} />
                <span style={{ fontSize: 12, color: C.textMid }}>{p.user.name ?? "Unknown"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="ibx-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 16, background: C.bg }}>
        {convo.messages.map(msg => {
          const isMine = msg.sender.id === currentUserId;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: 8, alignItems: "flex-end", animation: "fadeIn 0.2s ease" }}>
              <Avatar name={msg.sender.name} image={msg.sender.image} size={26} />
              <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: 3, alignItems: isMine ? "flex-end" : "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {!isMine && <span style={{ fontSize: 11, fontWeight: 600, color: C.textMid }}>{msg.sender.name ?? "Unknown"}</span>}
                  <span style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_MONO }}>{timeAgo(msg.createdAt)}</span>
                </div>
                <div style={{
                  background: isMine ? C.maroon : C.surface,
                  color: isMine ? "#fff" : C.text,
                  borderRadius: isMine ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                  padding: "9px 13px", fontSize: 13, lineHeight: 1.65,
                  border: isMine ? "none" : `1px solid ${C.border}`,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {msg.body}
                </div>
                {msg.attachments.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {msg.attachments.map(a => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: C.textMid, textDecoration: "none" }}>
                        📎 {a.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        {error && <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 8 }}>{error}</p>}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", background: C.surfaceAlt, transition: "border-color 0.15s" }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = C.maroon)}
          onBlurCapture={e  => (e.currentTarget.style.borderColor = C.border)}
        >
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
            placeholder="Reply…  ⌘↵ to send"
            rows={3}
            style={{ width: "100%", border: "none", background: "transparent", padding: "10px 12px 6px", fontSize: 13, fontFamily: FONT, resize: "none", outline: "none", lineHeight: 1.6, color: C.text, display: "block" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 8px 8px" }}>
            <button className="ibx-btn" onClick={sendReply} disabled={sending || !reply.trim()}
              style={{ padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600, color: "#fff", background: sending || !reply.trim() ? C.borderStrong : C.maroon, border: "none", gap: 6 }}
              onMouseEnter={e => { if (!sending && reply.trim()) e.currentTarget.style.background = C.maroonDark; }}
              onMouseLeave={e => { if (!sending && reply.trim()) e.currentTarget.style.background = C.maroon; }}
            >
              <Send size={13} />{sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compose Modal ──────────────────────────────────────────────────────────────
function ComposeModal({ initialRecipient, courseOptions, onClose, onSent }: {
  initialRecipient?: UserResult; courseOptions: CourseOption[]; onClose: () => void; onSent: () => void;
}) {
  const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(null);
  const [recipients,     setRecipients]     = useState<UserResult[]>(initialRecipient ? [initialRecipient] : []);
  const [pickerOpen,     setPickerOpen]     = useState(false);
  const [subject,        setSubject]        = useState("");
  const [body,           setBody]           = useState("");
  const [sending,        setSending]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [attachments,    setAttachments]    = useState<File[]>([]);
  const fileRef   = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [pickerOpen]);

  const addRecipient    = (u: UserResult) => { if (!recipients.find(r => r.id === u.id)) setRecipients(p => [...p, u]); };
  const removeRecipient = (id: string)    => setRecipients(p => p.filter(r => r.id !== id));

  const handleSend = async () => {
    if (recipients.length === 0 || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res  = await fetch(API_BASE, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject:      subject.trim() || "(no subject)",
          body:         body.trim(),
          recipientIds: recipients.map(r => r.id),
          courseId:     selectedCourse?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      onSent();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSending(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 7,
    padding: "9px 12px", fontSize: 13, fontFamily: FONT, outline: "none",
    color: C.text, background: C.surfaceAlt, transition: "border-color .15s",
  };

  return (
    <div className="ibx-compose-overlay">
      <div className="ibx-compose-modal">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: C.maroon, borderBottom: `1px solid ${C.maroonDark}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Pencil size={14} color="rgba(255,255,255,0.8)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>New Message</span>
          </div>
          <button className="ibx-btn" onClick={onClose}
            style={{ width: 26, height: 26, borderRadius: 5, background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 16 }}>
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }} className="ibx-scroll">
          {/* To */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>
              To <span style={{ color: C.maroon }}>*</span>
            </label>
            <div ref={pickerRef} style={{ position: "relative" }}>
              <div
                style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 5, border: `1px solid ${pickerOpen ? C.maroon : C.border}`, borderRadius: 7, padding: "6px 8px", minHeight: 38, background: C.surfaceAlt, cursor: "text", transition: "border-color 0.15s" }}
                onClick={() => setPickerOpen(true)}
              >
                {recipients.map(r => (
                  <span key={r.id} className="ibx-chip">
                    {r.name ?? r.email}
                    <button className="ibx-btn" onClick={e => { e.stopPropagation(); removeRecipient(r.id); }} style={{ color: C.maroon, padding: 0, width: 14, height: 14, fontSize: 14, lineHeight: 1 }}>×</button>
                  </span>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, minWidth: 80 }}>
                  <Search size={11} style={{ color: C.textMuted }} />
                  <span style={{ fontSize: 12, color: C.textMuted }}>{recipients.length === 0 ? "Search recipients…" : "Add more…"}</span>
                </div>
                <button className="ibx-btn ibx-icon-btn" onClick={e => { e.stopPropagation(); setPickerOpen(v => !v); }} style={{ width: 26, height: 26 }}>
                  <UserRound size={12} />
                </button>
              </div>
              {pickerOpen && (
                <div className="ibx-dropdown" style={{ width: "100%", top: "calc(100% + 4px)" }}>
                  <PersonPickerDropdown courseOptions={courseOptions} onSelectUser={addRecipient} onClose={() => setPickerOpen(false)} />
                </div>
              )}
            </div>
          </div>

          {/* Course */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>Course (optional)</label>
            <select value={selectedCourse?.id ?? ""} onChange={e => setSelectedCourse(courseOptions.find(o => o.id === e.target.value) ?? null)}
              style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
              <option value="">No course</option>
              {courseOptions.filter(o => o.type === "course").map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject…" style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = C.maroon)}
              onBlur={e  => (e.currentTarget.style.borderColor = C.border)} />
          </div>

          {/* Body */}
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>
              Message <span style={{ color: C.maroon }}>*</span>
            </label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
              placeholder="Write your message…"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65, display: "block" }}
              onFocus={e => (e.currentTarget.style.borderColor = C.maroon)}
              onBlur={e  => (e.currentTarget.style.borderColor = C.border)} />
          </div>

          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {attachments.map((f, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.border, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: C.textMid, fontFamily: FONT_MONO }}>
                  📎 {f.name}
                  <button className="ibx-btn" onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} style={{ color: C.textMuted, padding: 0, fontSize: 14, width: 14, height: 14 }}>×</button>
                </span>
              ))}
            </div>
          )}

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#dc2626" }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", padding: "10px 18px", borderTop: `1px solid ${C.border}`, background: C.surfaceAlt, gap: 8, flexShrink: 0 }}>
          <button className="ibx-btn ibx-icon-btn" title="Attach" onClick={() => fileRef.current?.click()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => { if (e.target.files) setAttachments(p => [...p, ...Array.from(e.target.files!)]); }} />
          <span style={{ flex: 1, fontSize: 11, color: C.textMuted, fontFamily: FONT_MONO }}>{recipients.length} recipient{recipients.length !== 1 ? "s" : ""}</span>
          <button className="ibx-btn" onClick={onClose}
            style={{ padding: "7px 14px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: C.textMid, border: `1px solid ${C.border}` }}>
            Cancel
          </button>
          <button className="ibx-btn" onClick={handleSend} disabled={sending || recipients.length === 0 || !body.trim()}
            style={{ padding: "7px 18px", borderRadius: 7, fontSize: 13, fontWeight: 700, color: "#fff", background: sending || recipients.length === 0 || !body.trim() ? C.borderStrong : C.maroon, border: "none", gap: 6 }}
          >
            <Send size={13} />{sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar Inner Content (reused in both desktop and drawer) ──────────────────
function SidebarContent({
  mailbox, category, onMailbox, onCategory, unreadCount, courses, selectedCtx, onSelectCtx, onClose,
}: {
  mailbox:      MailboxFilter;
  category:     CategoryFilter;
  onMailbox:    (v: MailboxFilter) => void;
  onCategory:   (v: CategoryFilter) => void;
  unreadCount:  number;
  courses:      CourseOption[];
  selectedCtx:  CourseOption | null;
  onSelectCtx:  (o: CourseOption | null) => void;
  onClose?:     () => void;
}) {
  const [coursesOpen, setCoursesOpen] = useState(true);
  const isTablet = useIsTablet();

  const handleClick = (fn: () => void) => {
    fn();
    onClose?.();
  };

  return (
    <>
      {/* Logo */}
      <div className="ibx-sidebar-header" style={{ padding: "16px 14px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: C.maroon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Inbox size={13} color="#fff" />
          </div>
          <div className="ibx-sidebar-header-text">
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FONT, margin: 0 }}>Inbox</p>
            <p style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_MONO, margin: 0 }}>Messaging Center</p>
          </div>
        </div>
        {onClose && (
          <button className="ibx-btn ibx-icon-btn" onClick={onClose} style={{ flexShrink: 0 }}>
            <X size={14} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }} className="ibx-scroll">
        {/* Mailbox */}
        <p className="ibx-sidebar-section-label" style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 14px 6px" }}>Mailbox</p>
        {MAILBOX_FILTERS.map(({ key, label }) => (
          <button key={key} className={`ibx-sidebar-item ${mailbox === key ? "active" : ""}`}
            onClick={() => handleClick(() => onMailbox(key))}>
            {!isTablet && <span className="ibx-sidebar-label">{label}</span>}
            {isTablet && <MailOpen size={13} style={{ flexShrink: 0 }} />}
            {!isTablet && key === "inbox" && unreadCount > 0 && (
              <span className="ibx-sidebar-badge" style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, background: C.maroon, color: "#fff", borderRadius: 10, padding: "1px 6px", fontFamily: FONT_MONO }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}

        {/* Categories */}
        <p className="ibx-sidebar-section-label" style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", padding: "14px 14px 6px" }}>Categories</p>
        {CATEGORY_FILTERS.map(({ key, label, Icon }) => (
          <button key={key} className={`ibx-sidebar-item ${category === key ? "active" : ""}`}
            onClick={() => handleClick(() => onCategory(key))}>
            <Icon size={13} style={{ flexShrink: 0 }} />
            <span className="ibx-sidebar-label">{label}</span>
          </button>
        ))}

        {/* Courses */}
        <div style={{ marginTop: 14 }}>
          <button
            onClick={() => setCoursesOpen(v => !v)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "0 14px 6px", border: "none", background: "none", cursor: "pointer", fontFamily: FONT, fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}
          >
            <span className="ibx-sidebar-section-label">Courses</span>
            <ChevronDown size={10} style={{ transform: coursesOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>
          {coursesOpen && (
            <div style={{ animation: "fadeIn 0.15s ease" }}>
              <button className={`ibx-sidebar-item ${!selectedCtx ? "active" : ""}`} onClick={() => handleClick(() => onSelectCtx(null))}>
                <span className="ibx-sidebar-label">All Courses</span>
              </button>
              {courses.filter(o => o.type === "course").map(o => (
                <button key={o.id} className={`ibx-sidebar-item ${selectedCtx?.id === o.id ? "active" : ""}`}
                  onClick={() => handleClick(() => onSelectCtx(o))}
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span className="ibx-sidebar-label">{o.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Mobile Bottom Sheet Filter ─────────────────────────────────────────────────
function MobileFilterSheet({
  category, mailbox, onCategory, onMailbox, onClose, unreadCount,
}: {
  category:    CategoryFilter;
  mailbox:     MailboxFilter;
  onCategory:  (v: CategoryFilter) => void;
  onMailbox:   (v: MailboxFilter) => void;
  onClose:     () => void;
  unreadCount: number;
}) {
  return (
    <>
      <div className="ibx-drawer-overlay" onClick={onClose} />
      <div className="ibx-bottom-sheet">
        <div style={{ padding: "12px 18px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Filter</span>
          <button className="ibx-btn ibx-icon-btn" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: "12px 18px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Mailbox</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {MAILBOX_FILTERS.map(({ key, label }) => (
              <button key={key} className="ibx-btn"
                onClick={() => { onMailbox(key); onClose(); }}
                style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1.5px solid ${mailbox === key ? C.maroon : C.border}`, background: mailbox === key ? C.maroonMid : C.surface, color: mailbox === key ? C.maroon : C.textMid }}>
                {label}
                {key === "inbox" && unreadCount > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: C.maroon, color: "#fff", borderRadius: 10, padding: "1px 6px" }}>{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Categories</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 20 }}>
            {CATEGORY_FILTERS.map(({ key, label, Icon }) => (
              <button key={key} className="ibx-btn"
                onClick={() => { onCategory(key); onClose(); }}
                style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, gap: 6, border: `1.5px solid ${category === key ? C.maroon : C.border}`, background: category === key ? C.maroonMid : C.surface, color: category === key ? C.maroon : C.textMid }}>
                <Icon size={12} />{label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function InboxPage({ currentUserId: propUserId }: { currentUserId: string }) {
  const [currentUserId,  setCurrentUserId]  = useState(propUserId ?? "");
  const [courses,        setCourses]        = useState<CourseOption[]>([]);
  const [selectedCtx,    setSelectedCtx]    = useState<CourseOption | null>(null);
  const [mailbox,        setMailbox]        = useState<MailboxFilter>("inbox");
  const [category,       setCategory]       = useState<CategoryFilter>("all");
  const [allItems,       setAllItems]       = useState<UnifiedInboxItem[]>([]);
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [composing,      setComposing]      = useState(false);
  const [composeFor,     setComposeFor]     = useState<UserResult | undefined>();
  const [loading,        setLoading]        = useState(true);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [refreshing,     setRefreshing]     = useState(false);
  const [pickerOpen,     setPickerOpen]     = useState(false);
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [searchOpen,     setSearchOpen]     = useState(false);

  const isMobile = useIsMobile();
  const pickerRef = useRef<HTMLDivElement>(null);

  // Resolve session
  useEffect(() => {
    if (currentUserId) return;
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(d => { if (d?.user?.id) setCurrentUserId(d.user.id); })
      .catch(() => {});
  }, [currentUserId]);

  // Load courses
  useEffect(() => {
    Promise.all([
      fetch(API_COURSES).then(r => r.json()).catch(() => ({ courses: [] })),
      fetch("/api/groups").then(r => r.json()).catch(() => ({ groups: [] })),
    ]).then(([cd, gd]) => {
      const c: CourseOption[] = (cd.courses ?? []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name, type: "course" as const }));
      const g: CourseOption[] = (gd.groups  ?? []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name, type: "group"  as const }));
      setCourses([...c, ...g]);
    });
  }, []);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [pickerOpen]);

  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const params = new URLSearchParams({ mailbox });
      if (selectedCtx?.type === "course") params.set("courseId", selectedCtx.id);

      const [convRes, asgnRes, annRes, qzRes, enrRes] = await Promise.allSettled([
        fetch(`${API_BASE}?${params}`).then(r => r.json()),
        fetch("/api/assignments").then(r => r.json()),
        fetch("/api/announcements").then(r => r.json()),
        fetch("/api/quizzes").then(r => r.json()),
        fetch("/api/inbox/enrollments").then(r => r.json()),
      ]);

      const items: UnifiedInboxItem[] = [];

      if (convRes.status === "fulfilled") {
        const convos: Conversation[] = convRes.value.conversations ?? [];
        for (const c of convos) {
          items.push({
            id: c.id, type: "message", subject: c.subject, preview: c.preview,
            date: c.date, unread: c.unread,
            sender: c.participants[0]?.name ?? "Unknown",
            senderImage: c.participants[0]?.image, data: c,
          });
        }
      }

      if (asgnRes.status === "fulfilled") {
        const asgns: NotifAssignment[] = asgnRes.value.assignments ?? [];
        for (const a of asgns) {
          items.push({
            id: a.id, type: "assignment", subject: a.title,
            preview: a.dueDate ? `Due ${fmtDue(a.dueDate)}` : (a.description ?? ""),
            date: a.dueDate ?? a.submittedAt ?? new Date().toISOString(),
            unread: a.status === "PENDING",
            sender: a.course?.name ?? a.group?.name ?? "Assignment",
            courseColor: a.course?.color, courseName: a.course?.name,
            status: a.status, data: a,
          });
        }
      }

      if (annRes.status === "fulfilled") {
        const anns: NotifAnnouncement[] = annRes.value.announcements ?? [];
        for (const a of anns) {
          items.push({
            id: a.id, type: "announcement", subject: a.title, preview: a.bodyText,
            date: a.createdAt, unread: true, sender: a.author,
            courseColor: a.course?.color, courseName: a.course?.name, data: a,
          });
        }
      }

      if (qzRes.status === "fulfilled") {
        const quizzes: NotifQuiz[] = qzRes.value.quizzes ?? [];
        const forms:   NotifForm[] = qzRes.value.forms   ?? [];
        for (const q of quizzes) {
          items.push({
            id: q.id, type: "quiz", subject: q.title,
            preview: q.dueDate ? `Due ${fmtDue(q.dueDate)}` : (q.description ?? ""),
            date: q.dueDate ?? new Date().toISOString(), unread: !q.attempted,
            sender: q.course?.name ?? "Quiz", courseColor: q.course?.color,
            courseName: q.course?.name, data: q,
          });
        }
        for (const f of forms) {
          items.push({
            id: f.id, type: "form", subject: f.title,
            preview: f.dueDate ? `Due ${fmtDue(f.dueDate)}` : (f.description ?? ""),
            date: f.dueDate ?? new Date().toISOString(), unread: !f.submitted,
            sender: f.course?.name ?? "Form", courseColor: f.course?.color,
            courseName: f.course?.name, data: f,
          });
        }
      }

      if (enrRes.status === "fulfilled") {
        const enrs: NotifEnrollment[] = enrRes.value.enrollments ?? [];
        for (const e of enrs) {
          items.push({
            id: e.id, type: "enrollment", subject: e.course.name,
            preview: `${e.courseRole} · ${e.course.code}${e.section ? ` · Section ${e.section}` : ""}`,
            date: e.createdAt, unread: false, sender: e.course.name,
            courseColor: e.course.color, courseName: e.course.name, data: e,
          });
        }
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllItems(items);
    } catch {
      setAllItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mailbox, selectedCtx]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const id = setInterval(() => fetchAll(true), 30_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const handleArchive = (id: string) => {
    setAllItems(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const filteredItems = allItems.filter(item => {
    if (category !== "all") {
      if (category === "messages"      && item.type !== "message")                          return false;
      if (category === "assignments"   && item.type !== "assignment")                       return false;
      if (category === "announcements" && item.type !== "announcement")                     return false;
      if (category === "quizzes"       && item.type !== "quiz" && item.type !== "form")     return false;
      if (category === "enrollments"   && item.type !== "enrollment")                       return false;
    }
    if (mailbox === "unread" && !item.unread) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.subject.toLowerCase().includes(q) ||
      (item.sender ?? "").toLowerCase().includes(q) ||
      item.preview.toLowerCase().includes(q)
    );
  });

  const unreadCount  = allItems.filter(i => i.unread && i.type === "message").length;
  const selectedItem = selectedId ? allItems.find(i => i.id === selectedId) ?? null : null;

  const currentCategoryLabel = CATEGORY_FILTERS.find(f => f.key === category)?.label ?? "All";
  const hasActiveFilter = mailbox !== "inbox" || category !== "all";

  return (
    <div className="ibx-root">
      <style>{GLOBAL_CSS}</style>

      {/* ── Mobile Drawer ── */}
      {drawerOpen && (
        <>
          <div className="ibx-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="ibx-sidebar-drawer">
            <SidebarContent
              mailbox={mailbox} category={category}
              onMailbox={v => { setMailbox(v); setSelectedId(null); }}
              onCategory={v => { setCategory(v); setSelectedId(null); }}
              unreadCount={unreadCount}
              courses={courses}
              selectedCtx={selectedCtx}
              onSelectCtx={v => { setSelectedCtx(v); setSelectedId(null); }}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </>
      )}

      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0, zIndex: 10, minHeight: 52 }}>
        {/* Hamburger (mobile only) */}
        {isMobile && (
          <button className="ibx-btn ibx-icon-btn" onClick={() => setDrawerOpen(true)} style={{ width: 40, height: 40, flexShrink: 0 }}>
            <Menu size={16} />
          </button>
        )}

        {/* Search bar (collapsible on mobile) */}
        {(!isMobile || searchOpen) && (
          <div
            style={{ flex: 1, maxWidth: isMobile ? "100%" : 520, display: "flex", alignItems: "center", gap: 8, background: C.maroonBg, border: `1px solid ${C.maroonBorder}`, borderRadius: 8, padding: "0 12px", height: 36, transition: "border-color 0.15s" }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = C.maroon)}
            onBlurCapture={e  => (e.currentTarget.style.borderColor = C.maroonBorder)}
          >
            <Search size={13} style={{ color: C.maroon, flexShrink: 0 }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search mail…"
              autoFocus={isMobile && searchOpen}
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: FONT, color: C.text, background: "transparent" }}
            />
            {(searchQuery || (isMobile && searchOpen)) && (
              <button className="ibx-btn" onClick={() => { setSearchQuery(""); if (isMobile) setSearchOpen(false); }} style={{ color: C.textMuted, width: 14, height: 14 }}>
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Mobile: show search icon when bar is hidden */}
        {isMobile && !searchOpen && (
          <button className="ibx-btn ibx-icon-btn" onClick={() => setSearchOpen(true)} style={{ width: 40, height: 40, flexShrink: 0 }}>
            <Search size={16} />
          </button>
        )}

        {/* Mobile: filter button */}
        {isMobile && !searchOpen && (
          <button className="ibx-btn ibx-icon-btn"
            onClick={() => setFilterOpen(true)}
            style={{ width: 40, height: 40, flexShrink: 0, position: "relative", color: hasActiveFilter ? C.maroon : C.textLight, background: hasActiveFilter ? C.maroonMid : "none" }}>
            <Filter size={15} />
            {hasActiveFilter && (
              <span style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: "50%", background: C.maroon }} />
            )}
          </button>
        )}

        {/* Desktop-only extras */}
        {!isMobile && (
          <>
            {/* Recipient picker */}
            <div ref={pickerRef} style={{ position: "relative" }}>
              <button className="ibx-btn ibx-icon-btn" title="Find recipient" onClick={() => setPickerOpen(v => !v)} style={{ width: 36, height: 36 }}>
                <UserRound size={14} />
              </button>
              {pickerOpen && (
                <div className="ibx-dropdown" style={{ right: 0, left: "auto", width: 300 }}>
                  <PersonPickerDropdown
                    courseOptions={courses}
                    onSelectUser={u => { setComposeFor(u); setComposing(true); setPickerOpen(false); }}
                    onClose={() => setPickerOpen(false)}
                  />
                </div>
              )}
            </div>

            <button className="ibx-btn ibx-icon-btn" title="Refresh" onClick={() => fetchAll(true)} style={{ width: 36, height: 36 }}>
              <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>

            {/* Action bar when item selected */}
            {selectedItem && (
              <div style={{ display: "flex", gap: 2, paddingLeft: 4, borderLeft: `1px solid ${C.border}` }}>
                {selectedItem.type === "message" && (
                  <>
                    <button className="ibx-btn ibx-icon-btn" title="Reply"     style={{ width: 36, height: 36 }}><Reply    size={14} /></button>
                    <button className="ibx-btn ibx-icon-btn" title="Reply All" style={{ width: 36, height: 36 }}><ReplyAll size={14} /></button>
                  </>
                )}
                <button className="ibx-btn ibx-icon-btn" title="Archive" style={{ width: 36, height: 36 }} onClick={() => handleArchive(selectedId!)}><Download size={14} /></button>
                <button className="ibx-btn ibx-icon-btn" title="Delete"  style={{ width: 36, height: 36 }} onClick={() => handleArchive(selectedId!)}><Trash2   size={14} /></button>
              </div>
            )}
          </>
        )}

        {/* Compose — always visible, adapts size */}
        {(!isMobile || !searchOpen) && (
          <button className="ibx-btn"
            onClick={() => { setComposeFor(undefined); setComposing(true); }}
            style={{ padding: isMobile ? "0 10px" : "0 16px", height: 36, borderRadius: 8, background: C.maroon, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, gap: isMobile ? 0 : 7, flexShrink: 0, position: "relative" }}
            onMouseEnter={e => (e.currentTarget.style.background = C.maroonDark)}
            onMouseLeave={e => (e.currentTarget.style.background = C.maroon)}
          >
            <Pencil size={isMobile ? 16 : 13} />
            {!isMobile && "Compose"}
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: -5, right: -5, background: C.maroonDeep, color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 10, padding: "1px 5px", fontFamily: FONT_MONO }}>
                {unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Desktop Sidebar */}
        <div className="ibx-sidebar">
          <SidebarContent
            mailbox={mailbox} category={category}
            onMailbox={v => { setMailbox(v); setSelectedId(null); }}
            onCategory={v => { setCategory(v); setSelectedId(null); }}
            unreadCount={unreadCount}
            courses={courses}
            selectedCtx={selectedCtx}
            onSelectCtx={v => { setSelectedCtx(v); setSelectedId(null); }}
          />
        </div>

        {/* List panel */}
        <div className={`ibx-list-panel ${isMobile && selectedItem ? "detail-open" : ""}`}>
          {/* List header */}
          <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {currentCategoryLabel}
                </span>
                {selectedCtx && (
                  <span style={{ fontSize: 11, background: C.maroonMid, color: C.maroon, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                    {selectedCtx.name}
                  </span>
                )}
                {mailbox !== "inbox" && (
                  <span style={{ fontSize: 11, background: C.border, color: C.textMid, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                    {MAILBOX_FILTERS.find(f => f.key === mailbox)?.label}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_MONO }}>
                  {filteredItems.length}
                </span>
                {isMobile && (
                  <button className="ibx-btn ibx-icon-btn" onClick={() => fetchAll(true)} style={{ width: 28, height: 28 }}>
                    <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="ibx-scroll" style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <ListSkeleton />
            ) : filteredItems.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", gap: 10, padding: 24, animation: "fadeIn 0.3s ease" }}>
                <Bell size={28} style={{ color: C.maroonBorder }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: C.textMid, textAlign: "center" }}>Nothing here</p>
                <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center" }}>No items match the current filter</p>
              </div>
            ) : (
              filteredItems.map(item => (
                <InboxRow
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => {
                    setSelectedId(prev => prev === item.id ? null : item.id);
                    setAllItems(prev => prev.map(x => x.id === item.id ? { ...x, unread: false } : x));
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedItem ? (
          <ThreadViewer
            key={selectedItem.id}
            item={selectedItem}
            currentUserId={currentUserId}
            onBack={() => setSelectedId(null)}
            onArchive={handleArchive}
          />
        ) : !isMobile ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: C.bg }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: C.maroonMid, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MailOpen size={22} color={C.maroon} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.textMid }}>Select an item</p>
            <p style={{ fontSize: 12, color: C.textMuted }}>Choose from the list to view details</p>
          </div>
        ) : null}
      </div>

      {/* Mobile filter bottom sheet */}
      {filterOpen && (
        <MobileFilterSheet
          category={category}
          mailbox={mailbox}
          onCategory={v => { setCategory(v); setSelectedId(null); }}
          onMailbox={v => { setMailbox(v); setSelectedId(null); }}
          onClose={() => setFilterOpen(false)}
          unreadCount={unreadCount}
        />
      )}

      {/* Compose modal */}
      {composing && (
        <ComposeModal
          initialRecipient={composeFor}
          courseOptions={courses}
          onClose={() => setComposing(false)}
          onSent={() => fetchAll()}
        />
      )}
    </div>
  );
}