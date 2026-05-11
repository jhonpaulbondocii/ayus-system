"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Pencil, Reply, ReplyAll, Download, Trash2,
  MoreVertical, Search, ChevronDown, X, Send,
  Inbox, MailOpen, Clock, ArrowUpRight, Bell, Archive, UserRound,
  ArrowLeft, RefreshCw, ChevronRight,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface CourseOption {
  id: string;
  name: string;
  type: "course" | "group";
}
interface UserResult {
  id: string;
  name: string | null;
  email: string;
  role?: string;
  pronouns?: string | null;
  image?: string | null;
}
interface ConvoParticipant {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
}
interface Conversation {
  id: string;
  subject: string;
  participants: ConvoParticipant[];
  preview: string;
  date: string;
  unread: boolean;
  courseId: string | null;
}
interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  size?: number | null;
  mimeType?: string | null;
}
interface Message {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string | null; image: string | null; role: string };
  attachments: MessageAttachment[];
}
interface FullConversation {
  id: string;
  subject: string;
  scope: string;
  participants: {
    id: string;
    isAuthor: boolean;
    user: { id: string; name: string | null; image: string | null; role: string; position?: string | null; department?: string | null };
  }[];
  messages: Message[];
}

// ── Constants ──────────────────────────────────────────────────────────────────
const FONT = "'DM Sans', 'Helvetica Neue', Arial, sans-serif";
const FONT_MONO = "'DM Mono', 'Courier New', monospace";

const C = {
  maroon: "#8B1A1A",
  maroonDark: "#6B1414",
  maroonDeep: "#4A0E0E",
  maroonLight: "#B23A3A",
  maroonBg: "#FEF8F8",
  maroonMid: "#F5E6E6",
  maroonBorder: "#E8CECE",
  bg: "#F9F7F7",
  surface: "#FFFFFF",
  surfaceAlt: "#FAFAFA",
  border: "#EBEBEB",
  borderStrong: "#D8D8D8",
  text: "#1A1A1A",
  textMid: "#4A4A4A",
  textLight: "#888888",
  textMuted: "#AAAAAA",
  unread: "#2563EB",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
};

const API_BASE = "/api/inbox/conversations";
const API_USERS = "/api/users";
const API_COURSES = "/api/courses";
const API_COURSE_PEOPLE = (id: string) => `/api/courses/${id}/people`;

const MAILBOX_FILTERS = [
  { key: "inbox",    label: "Inbox",           Icon: Inbox,       color: C.maroon },
  { key: "unread",   label: "Unread",          Icon: MailOpen,    color: C.unread },
  { key: "starred",  label: "Starred",         Icon: Bell,        color: C.warning },
  { key: "sent",     label: "Sent",            Icon: Send,        color: C.success },
  { key: "archived", label: "Archived",        Icon: Archive,     color: C.textLight },
  { key: "recent",   label: "Submission Cmts", Icon: Clock,       color: C.textMid },
  { key: "forward",  label: "Filter Redir.",   Icon: ArrowUpRight,color: C.textMid },
];

// ── Global Styles ──────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

@keyframes shimmer {
  0%   { background-position: 200% 0 }
  100% { background-position: -200% 0 }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes slideIn {
  from { opacity: 0; transform: translateX(12px) }
  to   { opacity: 1; transform: translateX(0) }
}
@keyframes pulse {
  0%, 100% { opacity: 1 }
  50%       { opacity: 0.5 }
}

* { box-sizing: border-box; }

.ibx-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: ${FONT};
  background: ${C.bg};
  color: ${C.text};
}

/* ── Sidebar ── */
.ibx-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: ${C.surface};
  border-right: 1px solid ${C.border};
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── List panel ── */
.ibx-list-panel {
  width: 340px;
  flex-shrink: 0;
  background: ${C.surface};
  border-right: 1px solid ${C.border};
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Thread panel ── */
.ibx-thread-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${C.surface};
  animation: slideIn 0.2s ease;
}

/* ── Scrollbars ── */
.ibx-scroll::-webkit-scrollbar { width: 4px; }
.ibx-scroll::-webkit-scrollbar-track { background: transparent; }
.ibx-scroll::-webkit-scrollbar-thumb { background: ${C.maroonMid}; border-radius: 2px; }

/* ── Convo row hover ── */
.ibx-convo-row { transition: background 0.12s; }
.ibx-convo-row:hover { background: ${C.maroonBg} !important; }

/* ── Shimmer skeleton ── */
.ibx-shimmer {
  background: linear-gradient(90deg, ${C.border} 25%, ${C.maroonMid} 50%, ${C.border} 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

/* ── Button base ── */
.ibx-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  cursor: pointer;
  font-family: ${FONT};
  transition: all 0.12s;
  white-space: nowrap;
}
.ibx-btn:disabled { cursor: default; opacity: 0.4; }

/* ── Icon button ── */
.ibx-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: none;
  border: 1px solid ${C.border};
  color: ${C.textLight};
}
.ibx-icon-btn:hover:not(:disabled) {
  border-color: ${C.maroon};
  color: ${C.maroon};
  background: ${C.maroonBg};
}

/* ── Dropdown ── */
.ibx-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
  z-index: 9999;
  overflow: hidden;
  animation: fadeIn 0.15s ease;
  min-width: 200px;
}

/* ── Tag chip ── */
.ibx-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${C.maroonMid};
  color: ${C.maroon};
}

/* ── Mobile responsive ── */
@media (max-width: 900px) {
  .ibx-sidebar { display: none !important; }
  .ibx-list-panel { width: 100% !important; border-right: none !important; }
  .ibx-thread-panel {
    position: fixed !important;
    inset: 0 !important;
    z-index: 200 !important;
  }
}
@media (max-width: 600px) {
  .ibx-compose-modal {
    max-width: 100% !important;
    width: 100% !important;
    height: 100% !important;
    max-height: 100% !important;
    border-radius: 0 !important;
  }
  .ibx-compose-overlay { padding: 0 !important; align-items: stretch !important; }
  .ibx-msg-bubble { max-width: 90% !important; }
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const d = new Date(dateStr);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function initials(name?: string | null, email?: string) {
  const src = name ?? email ?? "?";
  const parts = src.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, image, size = 34 }: { name?: string | null; image?: string | null; size?: number }) {
  const colors = [C.maroon, "#1D4ED8", "#059669", "#7C3AED", "#DB2777", "#D97706"];
  const colorIdx = (name ?? "?").charCodeAt(0) % colors.length;
  if (image) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={name ?? "avatar"}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${C.border}` }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: colors[colorIdx] + "22",
      border: `2px solid ${colors[colorIdx]}33`,
      color: colors[colorIdx],
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, fontFamily: FONT, flexShrink: 0,
      letterSpacing: "-0.02em",
    }}>
      {initials(name)}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 12, mb = 0 }: { w?: string | number; h?: number; mb?: number }) {
  return <div className="ibx-shimmer" style={{ width: w, height: h, marginBottom: mb }} />;
}

function ListSkeleton() {
  return (
    <div style={{ padding: "8px 0" }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} className="ibx-shimmer" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Skeleton w="45%" h={13} />
              <Skeleton w="50px" h={11} />
            </div>
            <Skeleton w="70%" h={12} />
            <Skeleton w="55%" h={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    teacher:  { bg: "#EFF6FF", color: "#1D4ED8" },
    staff:    { bg: "#F0FDF4", color: "#15803D" },
    dean:     { bg: "#FAF5FF", color: "#7C3AED" },
    student:  { bg: C.maroonBg, color: C.maroon },
    admin:    { bg: "#FFF7ED", color: "#C2410C" },
  };
  const s = map[role.toLowerCase()] ?? { bg: C.border, color: C.textMid };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: s.bg, color: s.color, fontFamily: FONT_MONO, letterSpacing: "0.04em", textTransform: "uppercase" }}>
      {role}
    </span>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ mailbox }: { mailbox: string }) {
  const map: Record<string, { title: string; sub: string; icon: string }> = {
    inbox:    { title: "Your inbox is empty",         sub: "New messages will appear here",         icon: "📭" },
    unread:   { title: "All caught up!",              sub: "No unread messages right now",          icon: "✅" },
    starred:  { title: "No starred messages",         sub: "Star important messages to find them",  icon: "⭐" },
    sent:     { title: "No sent messages",            sub: "Messages you send will appear here",    icon: "📤" },
    archived: { title: "Nothing archived",            sub: "Archived conversations live here",      icon: "📦" },
    recent:   { title: "No submission comments",      sub: "Submission comments will appear here",  icon: "💬" },
    forward:  { title: "No filter redirections",      sub: "Redirected messages appear here",       icon: "↗️" },
  };
  const { title, sub, icon } = map[mailbox] ?? map.inbox;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 24px", animation: "fadeIn 0.3s ease" }}>
      <div style={{ fontSize: 48, lineHeight: 1 }}>{icon}</div>
      <p style={{ fontSize: 14, fontWeight: 600, color: C.textMid, margin: 0, textAlign: "center" }}>{title}</p>
      <p style={{ fontSize: 12, color: C.textMuted, margin: 0, textAlign: "center" }}>{sub}</p>
    </div>
  );
}

// ── Sidebar Navigation ────────────────────────────────────────────────────────
function Sidebar({
  mailbox, onMailbox, unreadCount, courses, selectedCtx, onSelectCtx,
}: {
  mailbox: string; onMailbox: (v: string) => void; unreadCount: number;
  courses: CourseOption[]; selectedCtx: CourseOption | null; onSelectCtx: (o: CourseOption | null) => void;
}) {
  const [coursesOpen, setCoursesOpen] = useState(true);

  return (
    <div className="ibx-sidebar">
      {/* Brand */}
      <div style={{ padding: "20px 16px 14px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.maroon, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Inbox size={14} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: C.text }}>Admin Inbox</p>
            <p style={{ fontSize: 10, margin: 0, color: C.textMuted, fontFamily: FONT_MONO }}>Messaging Center</p>
          </div>
        </div>
      </div>

      {/* Mailbox filters */}
      <div style={{ padding: "12px 8px 8px", overflowY: "auto" }} className="ibx-scroll">
        <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 8px 6px", margin: 0 }}>Mailboxes</p>

        {MAILBOX_FILTERS.map(({ key, label, Icon: FIcon, color }) => {
          const active = mailbox === key;
          return (
            <button key={key} className="ibx-btn"
              onClick={() => onMailbox(key)}
              style={{
                width: "100%", justifyContent: "flex-start", padding: "8px 10px",
                borderRadius: 8, gap: 8, fontSize: 13, fontWeight: active ? 600 : 400,
                background: active ? C.maroonBg : "none",
                color: active ? C.maroon : C.textMid,
                border: "none", marginBottom: 1,
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.maroonBg; e.currentTarget.style.color = C.maroon; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; } }}
            >
              <div style={{ width: 26, height: 26, borderRadius: 6, background: active ? C.maroon + "18" : C.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FIcon size={13} color={active ? C.maroon : color} />
              </div>
              <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
              {key === "unread" && unreadCount > 0 && (
                <span style={{ background: C.unread, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px", fontFamily: FONT_MONO }}>
                  {unreadCount}
                </span>
              )}
              {key === "inbox" && unreadCount > 0 && (
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.maroon, flexShrink: 0 }} />
              )}
            </button>
          );
        })}

        {/* Courses section */}
        <div style={{ marginTop: 16 }}>
          <button className="ibx-btn"
            onClick={() => setCoursesOpen(v => !v)}
            style={{ width: "100%", justifyContent: "space-between", padding: "0 8px 6px", border: "none", background: "none", color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}
          >
            Courses
            <ChevronDown size={10} style={{ transform: coursesOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>

          {coursesOpen && (
            <div style={{ animation: "fadeIn 0.15s ease" }}>
              <button className="ibx-btn"
                onClick={() => onSelectCtx(null)}
                style={{ width: "100%", justifyContent: "flex-start", padding: "7px 10px", borderRadius: 8, fontSize: 12, border: "none", fontWeight: !selectedCtx ? 600 : 400, background: !selectedCtx ? C.maroonBg : "none", color: !selectedCtx ? C.maroon : C.textMid, marginBottom: 1 }}
                onMouseEnter={e => { if (selectedCtx) { e.currentTarget.style.background = C.maroonBg; e.currentTarget.style.color = C.maroon; } }}
                onMouseLeave={e => { if (selectedCtx) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; } }}
              >
                All Courses
              </button>
              {courses.filter(o => o.type === "course").map(o => (
                <button key={o.id} className="ibx-btn"
                  onClick={() => onSelectCtx(o)}
                  style={{ width: "100%", justifyContent: "flex-start", padding: "7px 10px", borderRadius: 8, fontSize: 12, border: "none", fontWeight: selectedCtx?.id === o.id ? 600 : 400, background: selectedCtx?.id === o.id ? C.maroonBg : "none", color: selectedCtx?.id === o.id ? C.maroon : C.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1 }}
                  onMouseEnter={e => { if (selectedCtx?.id !== o.id) { e.currentTarget.style.background = C.maroonBg; e.currentTarget.style.color = C.maroon; } }}
                  onMouseLeave={e => { if (selectedCtx?.id !== o.id) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; } }}
                >
                  {o.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Person Picker Dropdown ────────────────────────────────────────────────────
type PickView = "root" | "courses" | "course-roles" | "course-people" | "users";

function PersonPickerDropdown({
  courseOptions, onSelectUser, onClose,
}: {
  courseOptions: CourseOption[];
  onSelectUser: (u: UserResult) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<PickView>("root");
  const [query, setQuery] = useState("");
  const [activeCourse, setActiveCourse] = useState<CourseOption | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [people, setPeople] = useState<UserResult[]>([]);
  const [allPeople, setAllPeople] = useState<UserResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 40); }, [view]);

  const fetchUsers = useCallback((q: string) => {
    setLoading(true);
    const url = q.trim() ? `${API_USERS}?search=${encodeURIComponent(q)}` : API_USERS;
    fetch(url).then(r => r.json()).then(d => { setUsers(d.users ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (view !== "users") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchUsers(query), 300);
  }, [query, view, fetchUsers]);

  useEffect(() => {
    if (view !== "course-people" || !activeCourse) return;
    setLoading(true);
    fetch(API_COURSE_PEOPLE(activeCourse.id)).then(r => r.json()).then(d => {
      const list = d.people ?? [];
      const filtered = activeRole ? list.filter((u: UserResult & { role?: string }) => (u.role ?? "").toLowerCase() === activeRole.toLowerCase()) : list;
      setAllPeople(filtered); setPeople(filtered); setLoading(false);
    }).catch(() => setLoading(false));
  }, [view, activeCourse, activeRole]);

  useEffect(() => {
    if (view !== "course-people") return;
    setPeople(query.trim() ? allPeople.filter(u => (u.name ?? "").toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())) : allPeople);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, view]);

  const filteredCourses = courseOptions.filter(o => o.name.toLowerCase().includes(query.toLowerCase()));

  const goBack = () => {
    if (view === "course-people")    { setView("course-roles"); setQuery(""); setAllPeople([]); }
    else if (view === "course-roles") { setView("courses"); setQuery(""); setActiveCourse(null); }
    else                              { setView("root"); setQuery(""); }
  };

  const breadcrumb =
    view === "course-roles"  ? activeCourse?.name :
    view === "course-people" ? (activeRole ?? "All") : null;

  const PersonRow = ({ u }: { u: UserResult }) => (
    <button className="ibx-btn" onClick={() => { onSelectUser(u); onClose(); }}
      style={{ width: "100%", justifyContent: "flex-start", padding: "10px 14px", border: "none", background: "none", gap: 10, borderBottom: `1px solid ${C.border}` }}
      onMouseEnter={e => (e.currentTarget.style.background = C.maroonBg)}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
    >
      <Avatar name={u.name} image={u.image} size={32} />
      <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
        {u.name && <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>}
        <p style={{ fontSize: 11, color: C.textMuted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
      </div>
      {u.role && <RoleBadge role={u.role} />}
    </button>
  );

  const NavItem = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button className="ibx-btn" onClick={onClick}
      style={{ width: "100%", justifyContent: "space-between", padding: "11px 14px", border: "none", background: "none", fontSize: 13, fontWeight: 500, color: C.textMid, borderBottom: `1px solid ${C.border}` }}
      onMouseEnter={e => { e.currentTarget.style.background = C.maroonBg; e.currentTarget.style.color = C.maroon; }}
      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; }}
    >
      {label}<ChevronRight size={13} style={{ color: C.textMuted }} />
    </button>
  );

  const showSearch = view !== "root" && view !== "course-roles";

  return (
    <div style={{ display: "flex", flexDirection: "column", maxHeight: 380, overflow: "hidden" }}>
      {/* Breadcrumb / back */}
      {view !== "root" && (
        <button className="ibx-btn" onClick={goBack}
          style={{ padding: "10px 14px", background: C.maroon, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, gap: 6, justifyContent: "flex-start", borderBottom: `1px solid ${C.maroonDark}` }}
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
          {query && <button className="ibx-btn" onClick={() => setQuery("")} style={{ border: "none", background: "none", color: C.textMuted, width: 18, height: 18 }}><X size={12} /></button>}
        </div>
      )}
      <div style={{ overflowY: "auto", flex: 1 }} className="ibx-scroll">
        {view === "root" && (<>
          <NavItem label="Browse Courses" onClick={() => { setView("courses"); setQuery(""); }} />
          <NavItem label="All Users" onClick={() => { setView("users"); setQuery(""); fetchUsers(""); }} />
        </>)}
        {view === "courses" && (filteredCourses.length === 0
          ? <p style={{ fontSize: 12, color: C.textMuted, padding: 14, margin: 0 }}>No courses found.</p>
          : filteredCourses.filter(o => o.type === "course").map(o => (
              <NavItem key={o.id} label={o.name} onClick={() => { setActiveCourse(o); setView("course-roles"); setQuery(""); }} />
            ))
        )}
        {view === "course-roles" && ["Teachers", "Staff", "Dean"].map(role => (
          <NavItem key={role} label={role} onClick={() => { setActiveRole(role); setView("course-people"); setQuery(""); setAllPeople([]); }} />
        ))}
        {view === "course-people" && (loading ? <div style={{ padding: 16 }}><Skeleton w="60%" h={13} mb={8} /><Skeleton w="80%" h={12} /></div> : people.length === 0 ? <p style={{ fontSize: 12, color: C.textMuted, padding: 14, margin: 0 }}>No people found.</p> : people.map(u => <PersonRow key={u.id} u={u} />))}
        {view === "users" && (loading ? <div style={{ padding: 16 }}><Skeleton w="60%" h={13} mb={8} /><Skeleton w="80%" h={12} /></div> : users.length === 0 ? <p style={{ fontSize: 12, color: C.textMuted, padding: 14, margin: 0 }}>No users found.</p> : users.map(u => <PersonRow key={u.id} u={u} />))}
      </div>
    </div>
  );
}

// ── Conversation Row ──────────────────────────────────────────────────────────
function ConvoRow({ convo, selected, onSelect }: { convo: Conversation; selected: boolean; onSelect: () => void }) {
  const displayName = convo.participants.map(p => p.name ?? "Unknown").join(", ") || "No participants";
  return (
    <div className="ibx-convo-row" onClick={onSelect}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px",
        background: selected ? C.maroonBg : C.surface,
        borderBottom: `1px solid ${C.border}`,
        cursor: "pointer",
        borderLeft: selected ? `3px solid ${C.maroon}` : "3px solid transparent",
        position: "relative",
        transition: "background 0.1s",
      }}
    >
      {/* Unread dot */}
      <div style={{ position: "absolute", left: selected ? 14 : 10, top: 16, width: 6, height: 6, borderRadius: "50%", background: convo.unread ? C.unread : "transparent", flexShrink: 0, transition: "all 0.15s" }} />

      <div style={{ paddingLeft: 10, flexShrink: 0 }}>
        <Avatar name={convo.participants[0]?.name} image={convo.participants[0]?.image} size={38} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: convo.unread ? 700 : 500, color: convo.unread ? C.text : C.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </span>
          <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0, fontFamily: FONT_MONO }}>
            {timeAgo(convo.date)}
          </span>
        </div>
        <p style={{ fontSize: 13, fontWeight: convo.unread ? 600 : 400, color: convo.unread ? C.text : C.textMid, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {convo.subject}
        </p>
        <p style={{ fontSize: 12, color: C.textMuted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {convo.preview}
        </p>
      </div>
    </div>
  );
}

// ── Thread Viewer ─────────────────────────────────────────────────────────────
function ThreadViewer({ convoId, currentUserId, onBack, onArchive }: {
  convoId: string; currentUserId: string; onBack: () => void; onArchive: (id: string) => void;
}) {
  const [convo, setConvo] = useState<FullConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/${convoId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setConvo(data.conversation);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [convoId]);

  useEffect(() => { fetchThread(); }, [fetchThread]);
  useEffect(() => { if (!loading) bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [loading, convo?.messages.length]);

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/${convoId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setConvo(prev => prev ? { ...prev, messages: [...prev.messages, data.message] } : prev);
      setReply("");
    } catch (e) { setError((e as Error).message); }
    finally { setSending(false); }
  };

  if (loading) return (
    <div className="ibx-thread-panel" style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${C.maroonMid}`, borderTopColor: C.maroon, animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Loading conversation…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (error || !convo) return (
    <div className="ibx-thread-panel" style={{ alignItems: "center", justifyContent: "center", gap: 12 }}>
      <p style={{ color: C.danger, fontSize: 13 }}>{error ?? "Conversation not found."}</p>
      <button className="ibx-btn" onClick={onBack} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, background: "none", color: C.textMid, gap: 6 }}>
        <ArrowLeft size={13} /> Back
      </button>
    </div>
  );

  const others = convo.participants.filter(p => p.user.id !== currentUserId);

  return (
    <div className="ibx-thread-panel">
      {/* ── Thread header ── */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <button className="ibx-btn ibx-icon-btn" onClick={onBack} style={{ flexShrink: 0, marginTop: 2 }}>
            <ArrowLeft size={14} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {convo.subject}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {others.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 10px 3px 5px" }}>
                  <Avatar name={p.user.name} image={p.user.image} size={20} />
                  <span style={{ fontSize: 12, color: C.textMid, fontWeight: 500 }}>{p.user.name ?? "Unknown"}</span>
                  <RoleBadge role={p.user.role} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button className="ibx-btn ibx-icon-btn" title="Archive"
              onClick={async () => { await fetch(`${API_BASE}/${convoId}`, { method: "DELETE" }); onArchive(convoId); onBack(); }}
            >
              <Archive size={13} />
            </button>
            <button className="ibx-btn ibx-icon-btn" title="More options"><MoreVertical size={13} /></button>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="ibx-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16, background: C.bg }}>
        {convo.messages.map((msg) => {
          const isMine = msg.sender.id === currentUserId;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: 10, alignItems: "flex-end", animation: "fadeIn 0.2s ease" }}>
              <Avatar name={msg.sender.name} image={msg.sender.image} size={30} />
              <div className="ibx-msg-bubble" style={{ maxWidth: "68%", display: "flex", flexDirection: "column", gap: 4, alignItems: isMine ? "flex-end" : "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {!isMine && <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid }}>{msg.sender.name ?? "Unknown"}</span>}
                  {!isMine && <RoleBadge role={msg.sender.role} />}
                  <span style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_MONO }}>{timeAgo(msg.createdAt)}</span>
                </div>
                <div style={{
                  background: isMine ? C.maroon : C.surface,
                  color: isMine ? "#fff" : C.text,
                  borderRadius: isMine ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                  padding: "11px 15px",
                  fontSize: 13, lineHeight: 1.65,
                  border: isMine ? "none" : `1px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {msg.body}
                </div>
                {msg.attachments.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {msg.attachments.map(a => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", fontSize: 11, color: C.textMid, textDecoration: "none", fontFamily: FONT_MONO }}>
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

      {/* ── Reply area ── */}
      <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        {error && <p style={{ fontSize: 12, color: C.danger, margin: "0 0 8px" }}>{error}</p>}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.surfaceAlt, transition: "border-color 0.15s" }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = C.maroon)}
          onBlurCapture={e => (e.currentTarget.style.borderColor = C.border)}
        >
          <textarea value={reply} onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
            placeholder="Write a reply…  ⌘↵ to send"
            rows={3}
            style={{ width: "100%", border: "none", background: "transparent", padding: "12px 14px 8px", fontSize: 13, fontFamily: FONT, resize: "none", outline: "none", lineHeight: 1.6, color: C.text, display: "block" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 10px 10px" }}>
            <button className="ibx-btn" onClick={sendReply} disabled={sending || !reply.trim()}
              style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", background: sending || !reply.trim() ? C.borderStrong : C.maroon, border: "none", gap: 6 }}
              onMouseEnter={e => { if (!sending && reply.trim()) e.currentTarget.style.background = C.maroonDark; }}
              onMouseLeave={e => { if (!sending && reply.trim()) e.currentTarget.style.background = C.maroon; }}
            >
              <Send size={13} />{sending ? "Sending…" : "Send Reply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compose Modal ─────────────────────────────────────────────────────────────
function ComposeModal({ initialRecipient, courseOptions, onClose, onSent }: {
  initialRecipient?: UserResult; courseOptions: CourseOption[]; onClose: () => void; onSent: () => void;
}) {
  const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(null);
  const [individual, setIndividual] = useState(false);
  const [recipients, setRecipients] = useState<UserResult[]>(initialRecipient ? [initialRecipient] : []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const h = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [pickerOpen]);

  const addRecipient = (u: UserResult) => { if (!recipients.find(r => r.id === u.id)) setRecipients(p => [...p, u]); };
  const removeRecipient = (id: string) => setRecipients(p => p.filter(r => r.id !== id));

  const handleSend = async () => {
    if (recipients.length === 0 || !body.trim()) return;
    setSending(true); setError(null);
    try {
      const res = await fetch(API_BASE, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim() || "(no subject)", body: body.trim(), recipientIds: recipients.map(r => r.id), courseId: selectedCourse?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      onSent(); onClose();
    } catch (e) { setError((e as Error).message); setSending(false); }
  };

  const inputCls: React.CSSProperties = { width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 13px", fontSize: 13, fontFamily: FONT, outline: "none", color: C.text, background: C.surfaceAlt, boxSizing: "border-box", transition: "border-color .15s" };

  return (
    <div className="ibx-compose-overlay" style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", padding: 16 }}>
      <div className="ibx-compose-modal" style={{ background: C.surface, borderRadius: 14, width: "100%", maxWidth: 540, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.08)", overflow: "hidden", animation: "fadeIn 0.2s ease" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.maroon }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Pencil size={15} color="rgba(255,255,255,0.8)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>New Message</span>
          </div>
          <button className="ibx-btn" onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", width: 28, height: 28, borderRadius: 6, fontSize: 16 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }} className="ibx-scroll">

          {/* Recipients */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              To <span style={{ color: C.maroon }}>*</span>
            </label>
            <div ref={pickerRef} style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, border: `1px solid ${pickerOpen ? C.maroon : C.border}`, borderRadius: 8, padding: "7px 10px", minHeight: 40, background: C.surfaceAlt, cursor: "text" }}
                onClick={() => setPickerOpen(true)}
              >
                {recipients.map(r => (
                  <span key={r.id} className="ibx-chip">
                    {r.name ?? r.email}
                    <button className="ibx-btn" onClick={e => { e.stopPropagation(); removeRecipient(r.id); }} style={{ border: "none", background: "none", color: C.maroon, padding: 0, width: 14, height: 14, fontSize: 14, lineHeight: 1 }}>×</button>
                  </span>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 100 }}>
                  <Search size={12} style={{ color: C.textMuted }} />
                  <span style={{ fontSize: 13, color: C.textMuted }}>{recipients.length === 0 ? "Search or browse recipients…" : "Add more…"}</span>
                </div>
                <button className="ibx-btn" onClick={e => { e.stopPropagation(); setPickerOpen(v => !v); }}
                  style={{ border: `1px solid ${pickerOpen ? C.maroon : C.border}`, borderRadius: 6, background: pickerOpen ? C.maroonBg : "none", color: pickerOpen ? C.maroon : C.textLight, width: 28, height: 28 }}>
                  <UserRound size={13} />
                </button>
              </div>
              {pickerOpen && (
                <div className="ibx-dropdown" style={{ width: "100%", top: "calc(100% + 6px)" }}>
                  <PersonPickerDropdown courseOptions={courseOptions} onSelectUser={addRecipient} onClose={() => setPickerOpen(false)} />
                </div>
              )}
            </div>
          </div>

          {/* Course + Individual row */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Course (optional)</label>
              <select value={selectedCourse?.id ?? ""} onChange={e => {
                const opt = courseOptions.find(o => o.id === e.target.value) ?? null;
                setSelectedCourse(opt);
              }} style={{ ...inputCls, appearance: "none", cursor: "pointer" }}>
                <option value="">No course</option>
                {courseOptions.filter(o => o.type === "course").map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: C.textMid, fontFamily: FONT, padding: "9px 0" }}>
                <input type="checkbox" checked={individual} onChange={e => setIndividual(e.target.checked)} style={{ width: 15, height: 15, accentColor: C.maroon, cursor: "pointer" }} />
                Individual messages
              </label>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Message subject…"
              style={inputCls}
              onFocus={e => (e.currentTarget.style.borderColor = C.maroon)}
              onBlur={e => (e.currentTarget.style.borderColor = C.border)}
            />
          </div>

          {/* Body */}
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              Message <span style={{ color: C.maroon }}>*</span>
            </label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
              placeholder="Write your message here…"
              style={{ ...inputCls, resize: "vertical", lineHeight: 1.65 }}
              onFocus={e => (e.currentTarget.style.borderColor = C.maroon)}
              onBlur={e => (e.currentTarget.style.borderColor = C.border)}
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {attachments.map((f, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.border, borderRadius: 8, padding: "4px 10px", fontSize: 12, color: C.textMid, fontFamily: FONT_MONO }}>
                  📎 {f.name}
                  <button className="ibx-btn" onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} style={{ border: "none", background: "none", color: C.textMuted, padding: 0, fontSize: 14, width: 14, height: 14 }}>×</button>
                </span>
              ))}
            </div>
          )}

          {error && (
            <div style={{ background: "#FEF2F2", border: `1px solid #FECACA`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.danger }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderTop: `1px solid ${C.border}`, background: C.surfaceAlt, gap: 8 }}>
          <button className="ibx-btn ibx-icon-btn" title="Add attachment" onClick={() => fileRef.current?.click()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => { if (e.target.files) setAttachments(p => [...p, ...Array.from(e.target.files!)]); }} />

          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_MONO }}>
            {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
          </span>

          <button className="ibx-btn" onClick={onClose}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.textMid, border: `1px solid ${C.border}`, background: "none" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.maroon; e.currentTarget.style.color = C.maroon; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}
          >
            Cancel
          </button>
          <button className="ibx-btn" onClick={handleSend} disabled={sending || recipients.length === 0 || !body.trim()}
            style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: sending || recipients.length === 0 || !body.trim() ? C.borderStrong : C.maroon, border: "none", gap: 6 }}
            onMouseEnter={e => { if (!sending && recipients.length > 0 && body.trim()) e.currentTarget.style.background = C.maroonDark; }}
            onMouseLeave={e => { if (!sending && recipients.length > 0 && body.trim()) e.currentTarget.style.background = C.maroon; }}
          >
            <Send size={13} />{sending ? "Sending…" : "Send Message"}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity:0; transform: scale(0.97) } to { opacity:1; transform: scale(1) } }`}</style>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InboxPage({ currentUserId: propUserId }: { currentUserId?: string }) {
  const [currentUserId, setCurrentUserId] = useState(propUserId ?? "");
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCtx, setSelectedCtx] = useState<CourseOption | null>(null);
  const [mailbox, setMailbox] = useState("inbox");
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeFor, setComposeFor] = useState<UserResult | undefined>();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUserId) return;
    fetch("/api/auth/session").then(r => r.json()).then(d => { if (d?.user?.id) setCurrentUserId(d.user.id); }).catch(() => {});
  }, [currentUserId]);

  useEffect(() => {
    Promise.all([
      fetch(API_COURSES).then(r => r.json()).catch(() => ({ courses: [] })),
      fetch("/api/groups").then(r => r.json()).catch(() => ({ groups: [] })),
    ]).then(([cd, gd]) => {
      const c: CourseOption[] = (cd.courses ?? []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name, type: "course" as const }));
      const g: CourseOption[] = (gd.groups ?? []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name, type: "group" as const }));
      setCourses([...c, ...g]);
    });
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const h = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [pickerOpen]);

  const fetchConvos = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams({ mailbox });
      if (selectedCtx?.type === "course") params.set("courseId", selectedCtx.id);
      const res = await fetch(`${API_BASE}?${params}`);
      const data = await res.json();
      setConvos(data.conversations ?? []);
    } catch { setConvos([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [mailbox, selectedCtx]);

  useEffect(() => { fetchConvos(); }, [fetchConvos]);
  useEffect(() => { const id = setInterval(() => fetchConvos(true), 30_000); return () => clearInterval(id); }, [fetchConvos]);

  const handleArchive = (id: string) => {
    setConvos(prev => prev.filter(c => c.id !== id));
    if (activeConvoId === id) setActiveConvoId(null);
  };

  const filteredConvos = convos.filter(c =>
    !searchQuery.trim() ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.participants.some(p => (p.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = convos.filter(c => c.unread).length;
  const currentFilter = MAILBOX_FILTERS.find(f => f.key === mailbox)!;

  return (
    <div className="ibx-root">
      <style>{GLOBAL_CSS}</style>

      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0, zIndex: 10 }}>
        {/* Search */}
        <div style={{ flex: 1, maxWidth: 480, display: "flex", alignItems: "center", gap: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0 12px", height: 38, transition: "border-color 0.15s" }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = C.maroon)}
          onBlurCapture={e => (e.currentTarget.style.borderColor = C.border)}
        >
          <Search size={14} style={{ color: C.textMuted, flexShrink: 0 }} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: FONT, color: C.text, background: "transparent" }}
          />
          {searchQuery && <button className="ibx-btn" onClick={() => setSearchQuery("")} style={{ border: "none", background: "none", color: C.textMuted, width: 16, height: 16, padding: 0 }}><X size={13} /></button>}
        </div>

        {/* Recipient picker trigger */}
        <div ref={pickerRef} style={{ position: "relative" }}>
          <button className="ibx-btn ibx-icon-btn" title="Find recipient" onClick={() => setPickerOpen(v => !v)} style={{ width: 38, height: 38, borderRadius: 10 }}>
            <UserRound size={15} />
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

        <button className="ibx-btn ibx-icon-btn" title="Refresh" onClick={() => fetchConvos(true)} style={{ width: 38, height: 38, borderRadius: 10 }}>
          <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
        </button>

        {/* Action buttons (active convo) */}
        {activeConvoId && (
          <div style={{ display: "flex", gap: 6, paddingLeft: 4, borderLeft: `1px solid ${C.border}` }}>
            <button className="ibx-btn ibx-icon-btn" title="Reply" style={{ width: 38, height: 38, borderRadius: 10 }}><Reply size={14} /></button>
            <button className="ibx-btn ibx-icon-btn" title="Reply All" style={{ width: 38, height: 38, borderRadius: 10 }}><ReplyAll size={14} /></button>
            <button className="ibx-btn ibx-icon-btn" title="Archive" onClick={() => handleArchive(activeConvoId)} style={{ width: 38, height: 38, borderRadius: 10 }}><Download size={14} /></button>
            <button className="ibx-btn ibx-icon-btn" title="Delete" onClick={() => handleArchive(activeConvoId)} style={{ width: 38, height: 38, borderRadius: 10 }}><Trash2 size={14} /></button>
          </div>
        )}

        {/* Compose */}
        <button className="ibx-btn" onClick={() => { setComposeFor(undefined); setComposing(true); }}
          style={{ padding: "0 16px", height: 38, borderRadius: 10, background: C.maroon, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, gap: 7, flexShrink: 0, position: "relative" }}
          onMouseEnter={e => (e.currentTarget.style.background = C.maroonDark)}
          onMouseLeave={e => (e.currentTarget.style.background = C.maroon)}
        >
          <Pencil size={13} />Compose
          {unreadCount > 0 && (
            <span style={{ position: "absolute", top: -6, right: -6, background: C.danger, color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 10, padding: "1px 5px", fontFamily: FONT_MONO }}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Main body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Sidebar */}
        <Sidebar
          mailbox={mailbox}
          onMailbox={v => { setMailbox(v); setActiveConvoId(null); }}
          unreadCount={unreadCount}
          courses={courses}
          selectedCtx={selectedCtx}
          onSelectCtx={v => { setSelectedCtx(v); setActiveConvoId(null); }}
        />

        {/* Conversation list */}
        <div className="ibx-list-panel">
          {/* List header */}
          <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <currentFilter.Icon size={15} color={C.maroon} />
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{currentFilter.label}</span>
                {selectedCtx && (
                  <span style={{ fontSize: 11, background: C.maroonMid, color: C.maroon, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                    {selectedCtx.name}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_MONO }}>
                {filteredConvos.length} {filteredConvos.length === 1 ? "thread" : "threads"}
              </span>
            </div>
          </div>

          {/* List body */}
          <div className="ibx-scroll" style={{ flex: 1, overflowY: "auto" }}>
            {loading ? <ListSkeleton /> :
             filteredConvos.length === 0 ? <EmptyState mailbox={mailbox} /> :
             filteredConvos.map(c => (
               <ConvoRow key={c.id} convo={c} selected={activeConvoId === c.id}
                 onSelect={() => {
                   setActiveConvoId(prev => prev === c.id ? null : c.id);
                   setConvos(prev => prev.map(x => x.id === c.id ? { ...x, unread: false } : x));
                 }}
               />
             ))}
          </div>
        </div>

        {/* Thread viewer */}
        {activeConvoId && currentUserId ? (
          <ThreadViewer
            convoId={activeConvoId}
            currentUserId={currentUserId}
            onBack={() => setActiveConvoId(null)}
            onArchive={handleArchive}
          />
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: C.bg, color: C.textMuted }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: C.maroonMid, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MailOpen size={24} color={C.maroon} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.textMid, margin: 0 }}>Select a conversation</p>
            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Choose from the list to read messages</p>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {composing && (
        <ComposeModal
          initialRecipient={composeFor}
          courseOptions={courses}
          onClose={() => setComposing(false)}
          onSent={fetchConvos}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}