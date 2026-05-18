"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Pencil, Reply, ReplyAll, Download, Trash2,
  MoreVertical, Search, ChevronDown, X, Send,
  Inbox, MailOpen, Archive, UserRound,
  ClipboardList, Megaphone, GraduationCap, FileText,
  ArrowLeft, RefreshCw, ChevronRight, Bell, Circle,
  Menu, Filter, MessageSquare,
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

// Submission comment from a grader/teacher
interface SubmissionComment {
  id:          string;
  body:        string;
  createdAt:   string;
  author: {
    id:    string;
    name:  string | null;
    image: string | null;
    role:  string;
  };
  assignment: {
    id:    string;
    title: string;
    course: CourseRef | null;
  };
  grade?:       number | null;
  submissionId: string;
}

type InboxItemType = "message" | "assignment" | "announcement" | "quiz" | "form" | "enrollment" | "submission_comment";

interface UnifiedInboxItem {
  id:           string;
  type:         InboxItemType;
  subject:      string;
  preview:      string;
  date:         string;
  unread:       boolean;
  sender?:      string;
  senderImage?: string | null;
  courseColor?: string;
  courseName?:  string;
  status?:      string;
  data:         Conversation | NotifAssignment | NotifAnnouncement | NotifQuiz | NotifForm | NotifEnrollment | SubmissionComment;
}

type PickView       = "root" | "courses" | "course-roles" | "course-people" | "users";
type CategoryFilter = "all" | "messages" | "assignments" | "announcements" | "quizzes" | "enrollments";
type MailboxFilter  = "inbox" | "unread" | "sent" | "submission_comments";

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
  bg:           "#F9F7F7",
  surface:      "#FFFFFF",
  surfaceAlt:   "#FAFAFA",
  border:       "#EBEBEB",
  borderStrong: "#D8D8D8",
  text:         "#1A1A1A",
  textMid:      "#4A4A4A",
  textLight:    "#888888",
  textMuted:    "#AAAAAA",
  unread:       "#8B1A1A",
  danger:       "#DC2626",
};

const API_BASE          = "/api/inbox/conversations";
const API_USERS         = "/api/users";
const API_COURSES       = "/api/courses";
const API_COURSE_PEOPLE = (id: string) => `/api/courses/${id}/people`;
const API_SUBMISSION_COMMENTS = "/api/inbox/submission-comments";

const MAILBOX_FILTERS: { key: MailboxFilter; label: string; Icon: React.ElementType; color: string }[] = [
  { key: "inbox",               label: "Inbox",               Icon: Inbox,          color: C.maroon    },
  { key: "unread",              label: "Unread",               Icon: MailOpen,       color: C.maroon    },
  { key: "sent",                label: "Sent",                 Icon: Send,           color: C.textMid   },
  { key: "submission_comments", label: "Submission Comments",  Icon: MessageSquare,  color: C.textMid   },
];

const CATEGORY_FILTERS: { key: CategoryFilter; label: string; Icon: React.ElementType }[] = [
  { key: "all",           label: "All",           Icon: Inbox         },
  { key: "messages",      label: "Messages",      Icon: MailOpen      },
  { key: "assignments",   label: "Assignments",   Icon: ClipboardList },
  { key: "announcements", label: "Announcements", Icon: Megaphone     },
  { key: "quizzes",       label: "Quizzes/Forms", Icon: FileText      },
  { key: "enrollments",   label: "Enrollments",   Icon: GraduationCap },
];

// ── Global CSS ─────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

@keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
@keyframes fadeIn   { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
@keyframes slideIn  { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
@keyframes slideInLeft  { from{opacity:0;transform:translateX(-100%)} to{opacity:1;transform:translateX(0)} }
@keyframes slideUp  { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
@keyframes spin     { to{transform:rotate(360deg)} }
@keyframes scaleIn  { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
@keyframes overlayIn { from{opacity:0} to{opacity:1} }

.ibx-root *, .ibx-root *::before, .ibx-root *::after { box-sizing: border-box; }

html, body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; touch-action: manipulation; }

input, textarea, select { font-size: 16px !important; }
@media (min-width: 600px) {
  input, textarea, select { font-size: 13px !important; }
}

.ibx-root {
  display: flex; flex-direction: column;
  height: 100%; font-family: ${FONT};
  background: ${C.bg}; color: ${C.text};
  font-size: 14px; position: relative;
}

/* ── Body ── */
.ibx-body { flex: 1; display: flex; overflow: hidden; position: relative; min-height: 0; }

/* ── Sidebar ── */
.ibx-sidebar {
  width: 220px; flex-shrink: 0;
  background: ${C.surface};
  border-right: 1px solid ${C.border};
  display: flex; flex-direction: column;
  overflow: hidden;
  transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
  z-index: 100;
}

/* ── List panel ── */
.ibx-list-panel {
  width: 340px; flex-shrink: 0;
  background: ${C.surface};
  border-right: 1px solid ${C.border};
  display: flex; flex-direction: column;
  overflow: hidden;
  transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
}

/* ── Detail panel ── */
.ibx-thread-panel {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; background: ${C.surface};
  animation: slideIn 0.2s ease; min-width: 0;
}

/* ── Scrollbar ── */
.ibx-scroll::-webkit-scrollbar { width: 4px; }
.ibx-scroll::-webkit-scrollbar-track { background: transparent; }
.ibx-scroll::-webkit-scrollbar-thumb { background: ${C.maroonMid}; border-radius: 2px; }

/* ── List row ── */
.ibx-row { transition: background 0.12s; }
.ibx-row:hover { background: ${C.maroonBg} !important; }
.ibx-row:active { background: ${C.maroonMid} !important; }

/* ── Buttons ── */
.ibx-btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; border: none; cursor: pointer;
  font-family: ${FONT}; transition: all 0.12s; white-space: nowrap;
  background: none; border-radius: 4px; padding: 0;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
}
.ibx-btn:disabled { cursor: default; opacity: 0.4; }

.ibx-icon-btn {
  width: 38px; height: 38px; border-radius: 10px;
  background: none; border: 1px solid ${C.border};
  color: ${C.textLight};
}
.ibx-icon-btn:hover:not(:disabled) {
  border-color: ${C.maroon}; color: ${C.maroon}; background: ${C.maroonBg};
}
.ibx-icon-btn:active:not(:disabled) { background: ${C.maroonMid}; }

/* ── Shimmer ── */
.ibx-shimmer {
  background: linear-gradient(90deg,${C.border} 25%,${C.maroonMid} 50%,${C.border} 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px;
}

/* ── Chip ── */
.ibx-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px 2px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 600;
  background: ${C.maroonMid}; color: ${C.maroon};
}

/* ── Dropdown ── */
.ibx-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0;
  background: ${C.surface}; border: 1px solid ${C.border};
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
  z-index: 9999; overflow: hidden; animation: scaleIn 0.12s ease; min-width: 200px;
}

/* ── Overlay ── */
.ibx-overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,0.4); z-index: 150;
  animation: overlayIn 0.2s ease;
}
.ibx-overlay.visible { display: block; }

/* ── Bottom sheet for filter on mobile ── */
.ibx-bottom-sheet {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 600;
  background: ${C.surface}; border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 32px rgba(0,0,0,0.12);
  animation: slideUp 0.22s ease; max-height: 70vh; overflow-y: auto;
}

/* ── Compose modal ── */
.ibx-compose-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); padding: 16px;
}
.ibx-compose-modal {
  background: ${C.surface}; border-radius: 14px;
  width: 100%; max-width: 540px; max-height: 92vh;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.08);
  overflow: hidden; animation: scaleIn 0.18s ease;
}

/* ── Role badge ── */
.ibx-role-badge {
  font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px;
  font-family: ${FONT_MONO}; letter-spacing: 0.04em; text-transform: uppercase; flex-shrink: 0;
}

/* ── Mobile layout ── */
@media (max-width: 767px) {
  .ibx-sidebar {
    position: fixed; top: 0; left: 0; bottom: 0;
    transform: translateX(-100%); z-index: 200;
    box-shadow: 4px 0 24px rgba(0,0,0,0.15);
  }
  .ibx-sidebar.open {
    transform: translateX(0);
    animation: slideInLeft 0.25s cubic-bezier(0.4,0,0.2,1);
  }
  .ibx-list-panel {
    width: 100% !important; border-right: none;
    position: absolute; inset: 0; z-index: 10;
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
  }
  .ibx-list-panel.hidden-mobile { transform: translateX(-100%); pointer-events: none; }
  .ibx-thread-panel {
    position: absolute; inset: 0; z-index: 20;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    animation: none;
  }
  .ibx-thread-panel.visible-mobile { transform: translateX(0); animation: none; }
  .ibx-topbar-actions { display: none !important; }
  .ibx-compose-btn-text { display: none !important; }
  .ibx-compose-btn { width: 42px !important; padding: 0 !important; border-radius: 12px !important; }
  .ibx-search-wrap { flex: 1 !important; }
  .ibx-compose-modal {
    max-width: 100% !important; width: 100% !important;
    height: 100% !important; max-height: 100% !important; border-radius: 0 !important;
  }
  .ibx-compose-overlay { padding: 0 !important; align-items: stretch !important; }
  .ibx-msg-bubble { max-width: 88% !important; }
  .ibx-dropdown {
    position: fixed !important; top: auto !important; bottom: 0 !important;
    left: 0 !important; right: 0 !important; width: 100% !important;
    max-height: 70vh; border-radius: 16px 16px 0 0 !important;
    border-bottom: none !important; box-shadow: 0 -8px 40px rgba(0,0,0,0.15) !important;
    overflow: hidden;
  }
  .ibx-reply-area { padding: 10px 12px 16px !important; }
  .ibx-thread-header { padding: 12px 14px !important; }
  .ibx-thread-header h2 { font-size: 14px !important; }
  .ibx-messages-area { padding: 14px !important; gap: 12px !important; }
}

/* ── Tablet ── */
@media (min-width: 768px) and (max-width: 1023px) {
  .ibx-sidebar { width: 200px; }
  .ibx-list-panel { width: 280px !important; }
  .ibx-compose-btn-text { display: none !important; }
  .ibx-compose-btn { width: 42px !important; padding: 0 !important; }
}

/* ── Desktop ── */
@media (min-width: 1024px) {
  .ibx-hamburger { display: none !important; }
}

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .ibx-reply-area { padding-bottom: calc(14px + env(safe-area-inset-bottom)) !important; }
  .ibx-compose-footer { padding-bottom: calc(12px + env(safe-area-inset-bottom)) !important; }
}
`;

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
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
    case "assignment":        return <ClipboardList size={13} />;
    case "announcement":      return <Megaphone size={13} />;
    case "quiz":              return <FileText size={13} />;
    case "form":              return <ClipboardList size={13} />;
    case "enrollment":        return <GraduationCap size={13} />;
    case "submission_comment":return <MessageSquare size={13} />;
    default:                  return <MailOpen size={13} />;
  }
}

function typeLabel(type: InboxItemType) {
  switch (type) {
    case "assignment":        return "Assignment";
    case "announcement":      return "Announcement";
    case "quiz":              return "Quiz";
    case "form":              return "Form";
    case "enrollment":        return "Enrollment";
    case "submission_comment":return "Submission Comment";
    default:                  return "Message";
  }
}

function roleBadgeStyle(role: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    teacher: { bg: "#EFF6FF", color: "#1D4ED8" },
    staff:   { bg: "#F0FDF4", color: "#15803D" },
    dean:    { bg: "#FAF5FF", color: "#7C3AED" },
    student: { bg: C.maroonBg, color: C.maroon },
    admin:   { bg: "#FFF7ED", color: "#C2410C" },
  };
  return map[role.toLowerCase()] ?? { bg: C.border, color: C.textMid };
}

function useWindowSize() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return width;
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
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

// ── Role Badge ─────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const s = roleBadgeStyle(role);
  return (
    <span className="ibx-role-badge" style={{ background: s.bg, color: s.color }}>
      {role}
    </span>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 12, mb = 0 }: { w?: string | number; h?: number; mb?: number }) {
  return <div className="ibx-shimmer" style={{ width: w, height: h, marginBottom: mb }} />;
}

function ListSkeleton() {
  return (
    <div style={{ padding: "8px 0" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0 }} className="ibx-shimmer" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Skeleton w="45%" h={13} />
              <Skeleton w="42px" h={11} />
            </div>
            <Skeleton w="70%" h={12} />
            <Skeleton w="55%" h={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState({ mailbox }: { mailbox: string }) {
  const map: Record<string, { title: string; sub: string; icon: string }> = {
    inbox:               { title: "Your inbox is empty",        sub: "New messages will appear here",         icon: "📭" },
    unread:              { title: "All caught up!",             sub: "No unread messages right now",          icon: "✅" },
    sent:                { title: "No sent messages",           sub: "Messages you send will appear here",    icon: "📤" },
    submission_comments: { title: "No submission comments",     sub: "Grader feedback will appear here",      icon: "💬" },
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

// ── Nav Item ───────────────────────────────────────────────────────────────────
function NavItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="ibx-btn"
      onClick={onClick}
      style={{ width: "100%", justifyContent: "space-between", padding: "14px 14px", border: "none", background: "none", fontSize: 14, fontWeight: 500, color: C.textMid, borderBottom: `1px solid ${C.border}`, minHeight: 52, fontFamily: FONT }}
      onMouseEnter={e => { e.currentTarget.style.background = C.maroonBg; e.currentTarget.style.color = C.maroon; }}
      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; }}
    >
      {label}<ChevronRight size={14} style={{ color: C.textMuted }} />
    </button>
  );
}

// ── Person Row ────────────────────────────────────────────────────────────────
function PersonRow({ u, onSelect }: { u: UserResult; onSelect: (u: UserResult) => void }) {
  return (
    <button className="ibx-btn"
      onClick={() => onSelect(u)}
      style={{ width: "100%", justifyContent: "flex-start", padding: "12px 14px", border: "none", background: "none", gap: 10, borderBottom: `1px solid ${C.border}`, minHeight: 56, fontFamily: FONT }}
      onMouseEnter={e => (e.currentTarget.style.background = C.maroonBg)}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
    >
      <Avatar name={u.name} image={u.image} size={34} />
      <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
        {u.name && <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>}
        <p style={{ fontSize: 12, color: C.textMuted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
      </div>
      {u.role && <RoleBadge role={u.role} />}
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
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(API_COURSE_PEOPLE(activeCourse!.id));
        const d = await r.json();
        if (cancelled) return;
        const list = d.people ?? [];
        const filtered = activeRole
          ? list.filter((u: UserResult & { role?: string }) => (u.role ?? "").toLowerCase() === activeRole.toLowerCase())
          : list;
        setAllPeople(filtered);
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [view, activeCourse, activeRole]);

  const filteredPeople = view === "course-people"
    ? (query.trim() ? allPeople.filter(u => (u.name ?? "").toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())) : allPeople)
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
    <div style={{ display: "flex", flexDirection: "column", maxHeight: "70vh", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
      </div>
      {view !== "root" && (
        <button className="ibx-btn"
          onClick={goBack}
          style={{ padding: "12px 14px", background: C.maroon, border: "none", color: "#fff", fontSize: 14, fontWeight: 600, gap: 6, justifyContent: "flex-start", borderBottom: `1px solid ${C.maroonDark}` }}
        >
          <ArrowLeft size={14} />{breadcrumb ?? "Back"}
        </button>
      )}
      {showSearch && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt }}>
          <Search size={14} style={{ color: C.textMuted, flexShrink: 0 }} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            style={{ flex: 1, border: "none", outline: "none", fontFamily: FONT, color: C.text, background: "transparent" }}
          />
          {query && <button className="ibx-btn" onClick={() => setQuery("")} style={{ border: "none", background: "none", color: C.textMuted, width: 20, height: 20 }}><X size={13} /></button>}
        </div>
      )}
      <div style={{ overflowY: "auto", flex: 1 }} className="ibx-scroll">
        {view === "root" && (
          <>
            <NavItem label="Browse Courses" onClick={() => { setView("courses"); setQuery(""); }} />
            <NavItem label="All Users"      onClick={() => { setView("users"); setQuery(""); fetchUsers(""); }} />
          </>
        )}
        {view === "courses" && (
          filteredCourses.length === 0
            ? <p style={{ fontSize: 13, color: C.textMuted, padding: 16, margin: 0 }}>No courses found.</p>
            : filteredCourses.filter(o => o.type === "course").map(o => (
                <NavItem key={o.id} label={o.name} onClick={() => { setActiveCourse(o); setView("course-roles"); setQuery(""); }} />
              ))
        )}
        {view === "course-roles" && ["Teachers", "Staff", "Dean"].map(role => (
          <NavItem key={role} label={role} onClick={() => { setActiveRole(role); setView("course-people"); setQuery(""); setAllPeople([]); }} />
        ))}
        {view === "course-people" && (
          loading
            ? <div style={{ padding: 16 }}><Skeleton w="60%" h={14} mb={8} /><Skeleton w="80%" h={12} /></div>
            : filteredPeople.length === 0
              ? <p style={{ fontSize: 13, color: C.textMuted, padding: 16, margin: 0 }}>No people found.</p>
              : filteredPeople.map(u => <PersonRow key={u.id} u={u} onSelect={u2 => { onSelectUser(u2); onClose(); }} />)
        )}
        {view === "users" && (
          loading
            ? <div style={{ padding: 16 }}><Skeleton w="60%" h={14} mb={8} /><Skeleton w="80%" h={12} /></div>
            : users.length === 0
              ? <p style={{ fontSize: 13, color: C.textMuted, padding: 16, margin: 0 }}>No users found.</p>
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
  const isComment = item.type === "submission_comment";
  return (
    <div
      className="ibx-row"
      onClick={onSelect}
      style={{
        display: "flex", alignItems: "flex-start", gap: 0,
        padding: "0", borderBottom: `1px solid ${C.border}`,
        cursor: "pointer", position: "relative", minHeight: 72,
        background: selected ? C.maroonBg : C.surface,
        borderLeft: selected ? `3px solid ${C.maroon}` : "3px solid transparent",
      }}
    >
      {/* Unread dot */}
      <div style={{ width: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 20 }}>
        {item.unread && <Circle size={6} fill={C.maroon} stroke="none" />}
      </div>

      {/* Avatar / type icon */}
      <div style={{ padding: "14px 10px 14px 4px", flexShrink: 0 }}>
        {(isMsg || isComment)
          ? <Avatar name={item.sender} image={item.senderImage} size={40} />
          : (
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: item.courseColor ? item.courseColor + "22" : C.maroonMid, display: "flex", alignItems: "center", justifyContent: "center", color: item.courseColor ?? C.maroon }}>
              {typeIcon(item.type)}
            </div>
          )
        }
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, padding: "14px 14px 14px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
          <span style={{
            fontSize: 14, fontWeight: item.unread ? 700 : 500,
            color: item.unread ? C.text : C.textMid,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>
            {item.sender ?? typeLabel(item.type)}
          </span>
          <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0, fontFamily: FONT_MONO, fontWeight: item.unread ? 600 : 400 }}>
            {timeAgo(item.date)}
          </span>
        </div>

        <p style={{
          fontSize: 13, margin: "0 0 3px",
          fontWeight: item.unread ? 600 : 400,
          color: item.unread ? C.text : C.textMid,
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

// ── Submission Comment Detail ──────────────────────────────────────────────────
function SubmissionCommentDetail({ item, onBack }: { item: UnifiedInboxItem; onBack: () => void }) {
  const comment = item.data as SubmissionComment;
  return (
    <div className="ibx-thread-panel">
      {/* Header */}
      <div className="ibx-thread-header" style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <button className="ibx-btn ibx-icon-btn" onClick={onBack} style={{ flexShrink: 0, marginTop: 1 }}>
            <ArrowLeft size={15} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: C.maroonMid, color: C.maroon, fontFamily: FONT_MONO, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Submission Comment
              </span>
              {comment.assignment.course && (
                <span style={{ fontSize: 12, color: C.textMuted }}>{comment.assignment.course.name}</span>
              )}
            </div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>
              {comment.assignment.title}
            </h2>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="ibx-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px", background: C.bg }}>
        <div style={{ maxWidth: 680 }}>
          {/* Grade chip (if present) */}
          {comment.grade !== null && comment.grade !== undefined && (
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <DetailChip label="Grade" value={String(comment.grade)} accent />
            </div>
          )}

          {/* Comment bubble */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", animation: "fadeIn 0.2s ease" }}>
            <Avatar name={comment.author.name} image={comment.author.image} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{comment.author.name ?? "Unknown"}</span>
                <RoleBadge role={comment.author.role} />
                <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_MONO }}>{timeAgo(comment.createdAt)}</span>
              </div>
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: "0 14px 14px 14px",
                padding: "14px 16px", fontSize: 14, lineHeight: 1.7,
                color: C.text, whiteSpace: "pre-wrap", wordBreak: "break-word",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}>
                {comment.body}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Thread / Detail Viewer ─────────────────────────────────────────────────────
function ThreadViewer({
  item, currentUserId, onBack, onArchive,
}: {
  item:          UnifiedInboxItem;
  currentUserId: string;
  onBack:        () => void;
  onArchive:     (id: string) => void;
}) {
  // Submission comments get their own view
  if (item.type === "submission_comment") {
    return <SubmissionCommentDetail item={item} onBack={onBack} />;
  }

  // Non-message (assignment, announcement, quiz, form, enrollment)
  if (item.type !== "message") {
    const data = item.data;
    return (
      <div className="ibx-thread-panel">
        <div className="ibx-thread-header" style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <button className="ibx-btn ibx-icon-btn" onClick={onBack} style={{ flexShrink: 0, marginTop: 1 }}>
              <ArrowLeft size={15} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: C.maroonMid, color: C.maroon, fontFamily: FONT_MONO, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {typeLabel(item.type)}
                </span>
                {item.courseName && <span style={{ fontSize: 12, color: C.textMuted }}>{item.courseName}</span>}
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.3, margin: 0 }}>{item.subject}</h2>
            </div>
          </div>
        </div>

        <div className="ibx-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px", background: C.bg }}>
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
                  {a.description && <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{a.description}</div>}
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
              const quiz = isQuiz ? (q as NotifQuiz) : null;
              const form = !isQuiz ? (q as NotifForm) : null;
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
                  {q.description && <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{q.description}</div>}
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

  // ── Message thread ──
  return <MessageThread item={item} currentUserId={currentUserId} onBack={onBack} onArchive={onArchive} />;
}

// ── Message Thread ─────────────────────────────────────────────────────────────
function MessageThread({
  item, currentUserId, onBack, onArchive,
}: {
  item:          UnifiedInboxItem;
  currentUserId: string;
  onBack:        () => void;
  onArchive:     (id: string) => void;
}) {
  const [convo,   setConvo]   = useState<FullConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply,   setReply]   = useState("");
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API_BASE}/${item.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setConvo(data.conversation);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [item.id]);

  useEffect(() => { fetchThread(); }, [fetchThread]);
  useEffect(() => { if (!loading) bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [loading, convo?.messages.length]);

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
    } catch (e) { setError((e as Error).message); }
    finally { setSending(false); }
  };

  if (loading) return (
    <div className="ibx-thread-panel" style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${C.maroonMid}`, borderTopColor: C.maroon, animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Loading conversation…</p>
      </div>
    </div>
  );

  if (error || !convo) return (
    <div className="ibx-thread-panel" style={{ alignItems: "center", justifyContent: "center", gap: 12 }}>
      <p style={{ color: C.danger, fontSize: 13 }}>{error ?? "Conversation not found."}</p>
      <button className="ibx-btn" onClick={onBack} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 18px", fontSize: 13, background: "none", color: C.textMid, gap: 6 }}>
        <ArrowLeft size={13} /> Back
      </button>
    </div>
  );

  const others = convo.participants.filter(p => p.user.id !== currentUserId);

  return (
    <div className="ibx-thread-panel">
      {/* Header */}
      <div className="ibx-thread-header" style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <button className="ibx-btn ibx-icon-btn" onClick={onBack} style={{ flexShrink: 0, marginTop: 1 }}>
            <ArrowLeft size={15} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {convo.subject}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {others.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 5, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 10px 3px 5px" }}>
                  <Avatar name={p.user.name} image={p.user.image} size={20} />
                  <span style={{ fontSize: 12, color: C.textMid, fontWeight: 500 }}>{p.user.name ?? "Unknown"}</span>
                  <RoleBadge role={p.user.role} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
            <button className="ibx-btn ibx-icon-btn" title="Reply"><Reply size={14} /></button>
            <button className="ibx-btn ibx-icon-btn" title="Reply All"><ReplyAll size={14} /></button>
            <button className="ibx-btn ibx-icon-btn" title="Archive"
              onClick={async () => { await fetch(`${API_BASE}/${item.id}`, { method: "DELETE" }); onArchive(item.id); onBack(); }}>
              <Archive size={14} />
            </button>
            <button className="ibx-btn ibx-icon-btn" title="Delete"
              onClick={() => { onArchive(item.id); onBack(); }}>
              <Trash2 size={14} />
            </button>
            <button className="ibx-btn ibx-icon-btn"><MoreVertical size={14} /></button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="ibx-scroll ibx-messages-area" style={{ flex: 1, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: 16, background: C.bg }}>
        {convo.messages.map(msg => {
          const isMine = msg.sender.id === currentUserId;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: 8, alignItems: "flex-end", animation: "fadeIn 0.2s ease" }}>
              <Avatar name={msg.sender.name} image={msg.sender.image} size={28} />
              <div className="ibx-msg-bubble" style={{ maxWidth: "70%", display: "flex", flexDirection: "column", gap: 4, alignItems: isMine ? "flex-end" : "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {!isMine && <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid }}>{msg.sender.name ?? "Unknown"}</span>}
                  {!isMine && <RoleBadge role={msg.sender.role} />}
                  <span style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_MONO }}>{timeAgo(msg.createdAt)}</span>
                </div>
                <div style={{
                  background: isMine ? C.maroon : C.surface,
                  color: isMine ? "#fff" : C.text,
                  borderRadius: isMine ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                  padding: "11px 14px", fontSize: 14, lineHeight: 1.65,
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
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, color: C.textMid, textDecoration: "none", fontFamily: FONT_MONO }}>
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
      <div className="ibx-reply-area" style={{ padding: "12px 16px 14px", borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        {error && <p style={{ fontSize: 12, color: C.danger, margin: "0 0 8px" }}>{error}</p>}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.surfaceAlt, transition: "border-color 0.15s" }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = C.maroon)}
          onBlurCapture={e  => (e.currentTarget.style.borderColor = C.border)}
        >
          <textarea value={reply} onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
            placeholder="Write a reply…  ⌘↵ to send"
            rows={3}
            style={{ width: "100%", border: "none", background: "transparent", padding: "12px 14px 8px", fontFamily: FONT, resize: "none", outline: "none", lineHeight: 1.6, color: C.text, display: "block" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 10px 10px" }}>
            <button className="ibx-btn" onClick={sendReply} disabled={sending || !reply.trim()}
              style={{ padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#fff", background: sending || !reply.trim() ? C.borderStrong : C.maroon, border: "none", gap: 6 }}
              onMouseEnter={e => { if (!sending && reply.trim()) e.currentTarget.style.background = C.maroonDark; }}
              onMouseLeave={e => { if (!sending && reply.trim()) e.currentTarget.style.background = C.maroon; }}
            >
              <Send size={14} />{sending ? "Sending…" : "Send Reply"}
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
    setSending(true); setError(null);
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
      onSent(); onClose();
    } catch (e) { setError((e as Error).message); setSending(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "11px 13px", fontFamily: FONT, outline: "none",
    color: C.text, background: C.surfaceAlt, transition: "border-color .15s",
  };

  return (
    <div className="ibx-compose-overlay">
      <div className="ibx-compose-modal">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: C.maroon, borderBottom: `1px solid ${C.maroonDark}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Pencil size={15} color="rgba(255,255,255,0.8)" />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>New Message</span>
          </div>
          <button className="ibx-btn" onClick={onClose}
            style={{ border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", width: 32, height: 32, borderRadius: 8, fontSize: 18 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }} className="ibx-scroll">
          {/* To */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 7 }}>
              To <span style={{ color: C.maroon }}>*</span>
            </label>
            <div ref={pickerRef} style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, border: `1px solid ${pickerOpen ? C.maroon : C.border}`, borderRadius: 8, padding: "8px 10px", minHeight: 44, background: C.surfaceAlt, cursor: "text", transition: "border-color 0.15s" }}
                onClick={() => setPickerOpen(true)}
              >
                {recipients.map(r => (
                  <span key={r.id} className="ibx-chip">
                    {r.name ?? r.email}
                    <button className="ibx-btn" onClick={e => { e.stopPropagation(); removeRecipient(r.id); }} style={{ border: "none", background: "none", color: C.maroon, padding: 0, width: 16, height: 16, fontSize: 16, lineHeight: 1 }}>×</button>
                  </span>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 100 }}>
                  <Search size={13} style={{ color: C.textMuted }} />
                  <span style={{ fontSize: 14, color: C.textMuted }}>{recipients.length === 0 ? "Search or browse recipients…" : "Add more…"}</span>
                </div>
                <button className="ibx-btn" onClick={e => { e.stopPropagation(); setPickerOpen(v => !v); }}
                  style={{ border: `1px solid ${pickerOpen ? C.maroon : C.border}`, borderRadius: 6, background: pickerOpen ? C.maroonBg : "none", color: pickerOpen ? C.maroon : C.textLight, width: 30, height: 30 }}>
                  <UserRound size={14} />
                </button>
              </div>
              {pickerOpen && (
                <div className="ibx-dropdown" style={{ width: "100%", top: "calc(100% + 6px)" }}>
                  <PersonPickerDropdown courseOptions={courseOptions} onSelectUser={addRecipient} onClose={() => setPickerOpen(false)} />
                </div>
              )}
            </div>
          </div>

          {/* Course */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 7 }}>Course (optional)</label>
            <select value={selectedCourse?.id ?? ""} onChange={e => setSelectedCourse(courseOptions.find(o => o.id === e.target.value) ?? null)}
              style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
              <option value="">No course</option>
              {courseOptions.filter(o => o.type === "course").map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 7 }}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Message subject…"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = C.maroon)}
              onBlur={e  => (e.currentTarget.style.borderColor = C.border)} />
          </div>

          {/* Body */}
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 7 }}>
              Message <span style={{ color: C.maroon }}>*</span>
            </label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
              placeholder="Write your message here…"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
              onFocus={e => (e.currentTarget.style.borderColor = C.maroon)}
              onBlur={e  => (e.currentTarget.style.borderColor = C.border)} />
          </div>

          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {attachments.map((f, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.border, borderRadius: 8, padding: "5px 10px", fontSize: 12, color: C.textMid, fontFamily: FONT_MONO }}>
                  📎 {f.name}
                  <button className="ibx-btn" onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} style={{ border: "none", background: "none", color: C.textMuted, padding: 0, fontSize: 16, width: 16, height: 16 }}>×</button>
                </span>
              ))}
            </div>
          )}

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.danger }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ibx-compose-footer" style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderTop: `1px solid ${C.border}`, background: C.surfaceAlt, gap: 8, flexShrink: 0 }}>
          <button className="ibx-btn ibx-icon-btn" title="Attach" onClick={() => fileRef.current?.click()} style={{ width: 38, height: 38 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => { if (e.target.files) setAttachments(p => [...p, ...Array.from(e.target.files!)]); }} />
          <span style={{ flex: 1, fontSize: 11, color: C.textMuted, fontFamily: FONT_MONO }}>
            {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
          </span>
          <button className="ibx-btn" onClick={onClose}
            style={{ padding: "9px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500, color: C.textMid, border: `1px solid ${C.border}`, background: "none" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.maroon; e.currentTarget.style.color = C.maroon; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}
          >
            Cancel
          </button>
          <button className="ibx-btn" onClick={handleSend} disabled={sending || recipients.length === 0 || !body.trim()}
            style={{ padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#fff", background: sending || recipients.length === 0 || !body.trim() ? C.borderStrong : C.maroon, border: "none", gap: 6 }}
            onMouseEnter={e => { if (!sending && recipients.length > 0 && body.trim()) e.currentTarget.style.background = C.maroonDark; }}
            onMouseLeave={e => { if (!sending && recipients.length > 0 && body.trim()) e.currentTarget.style.background = C.maroon; }}
          >
            <Send size={14} />{sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar Content ────────────────────────────────────────────────────────────
function SidebarContent({
  mailbox, category, onMailbox, onCategory, unreadCount, courses, selectedCtx, onSelectCtx, onClose,
}: {
  mailbox:     MailboxFilter;
  category:    CategoryFilter;
  onMailbox:   (v: MailboxFilter) => void;
  onCategory:  (v: CategoryFilter) => void;
  unreadCount: number;
  courses:     CourseOption[];
  selectedCtx: CourseOption | null;
  onSelectCtx: (o: CourseOption | null) => void;
  onClose?:    () => void;
}) {
  const [coursesOpen, setCoursesOpen] = useState(true);

  const handleClick = (fn: () => void) => { fn(); onClose?.(); };

  return (
    <>
      {/* Brand */}
      <div style={{ padding: "16px 14px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.maroon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Inbox size={14} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: C.text }}>Inbox</p>
            <p style={{ fontSize: 10, margin: 0, color: C.textMuted, fontFamily: FONT_MONO }}>Messaging Center</p>
          </div>
        </div>
        {onClose && (
          <button className="ibx-btn" onClick={onClose} style={{ border: "none", background: "none", color: C.textLight, width: 28, height: 28, borderRadius: 6 }}>
            <X size={15} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px 8px" }} className="ibx-scroll">
        {/* Mailboxes */}
        <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 8px 6px", margin: 0 }}>Mailboxes</p>
        {MAILBOX_FILTERS.map(({ key, label, Icon: FIcon, color }) => {
          const active = mailbox === key;
          return (
            <button key={key} className="ibx-btn"
              onClick={() => handleClick(() => onMailbox(key))}
              style={{ width: "100%", justifyContent: "flex-start", padding: "9px 10px", borderRadius: 8, gap: 8, fontSize: 13, fontWeight: active ? 600 : 400, background: active ? C.maroonBg : "none", color: active ? C.maroon : C.textMid, border: "none", marginBottom: 1, fontFamily: FONT }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.maroonBg; e.currentTarget.style.color = C.maroon; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; } }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 6, background: active ? C.maroon + "18" : C.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FIcon size={14} color={active ? C.maroon : color} />
              </div>
              <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
              {key === "inbox" && unreadCount > 0 && (
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.maroon, flexShrink: 0 }} />
              )}
              {key === "unread" && unreadCount > 0 && (
                <span style={{ background: C.maroon, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px", fontFamily: FONT_MONO }}>
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Categories */}
        <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", padding: "14px 8px 6px", margin: 0 }}>Categories</p>
        {CATEGORY_FILTERS.map(({ key, label, Icon }) => {
          const active = category === key;
          return (
            <button key={key} className="ibx-btn"
              onClick={() => handleClick(() => onCategory(key))}
              style={{ width: "100%", justifyContent: "flex-start", padding: "9px 10px", borderRadius: 8, gap: 8, fontSize: 13, fontWeight: active ? 600 : 400, background: active ? C.maroonBg : "none", color: active ? C.maroon : C.textMid, border: "none", marginBottom: 1, fontFamily: FONT }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.maroonBg; e.currentTarget.style.color = C.maroon; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; } }}
            >
              <Icon size={13} style={{ flexShrink: 0 }} />
              <span>{label}</span>
            </button>
          );
        })}

        {/* Courses */}
        <div style={{ marginTop: 14 }}>
          <button className="ibx-btn"
            onClick={() => setCoursesOpen(v => !v)}
            style={{ width: "100%", justifyContent: "space-between", padding: "0 8px 6px", border: "none", background: "none", color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT }}
          >
            Courses
            <ChevronDown size={10} style={{ transform: coursesOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>
          {coursesOpen && (
            <div style={{ animation: "fadeIn 0.15s ease" }}>
              <button className="ibx-btn"
                onClick={() => handleClick(() => onSelectCtx(null))}
                style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px", borderRadius: 8, fontSize: 12, border: "none", fontWeight: !selectedCtx ? 600 : 400, background: !selectedCtx ? C.maroonBg : "none", color: !selectedCtx ? C.maroon : C.textMid, marginBottom: 1, fontFamily: FONT }}
                onMouseEnter={e => { if (selectedCtx) { e.currentTarget.style.background = C.maroonBg; e.currentTarget.style.color = C.maroon; } }}
                onMouseLeave={e => { if (selectedCtx) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; } }}
              >
                All Courses
              </button>
              {courses.filter(o => o.type === "course").map(o => (
                <button key={o.id} className="ibx-btn"
                  onClick={() => handleClick(() => onSelectCtx(o))}
                  style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px", borderRadius: 8, fontSize: 12, border: "none", fontWeight: selectedCtx?.id === o.id ? 600 : 400, background: selectedCtx?.id === o.id ? C.maroonBg : "none", color: selectedCtx?.id === o.id ? C.maroon : C.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1, fontFamily: FONT }}
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
    </>
  );
}

// ── Mobile Filter Bottom Sheet ─────────────────────────────────────────────────
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
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 599 }} onClick={onClose} />
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
                {key === "unread" && unreadCount > 0 && (
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
  const windowWidth = useWindowSize();
  const isMobile    = windowWidth < 768;

  const [currentUserId, setCurrentUserId] = useState(propUserId ?? "");
  const [courses,       setCourses]       = useState<CourseOption[]>([]);
  const [selectedCtx,   setSelectedCtx]   = useState<CourseOption | null>(null);
  const [mailbox,       setMailbox]       = useState<MailboxFilter>("inbox");
  const [category,      setCategory]      = useState<CategoryFilter>("all");
  const [allItems,      setAllItems]      = useState<UnifiedInboxItem[]>([]);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [composing,     setComposing]     = useState(false);
  const [composeFor,    setComposeFor]    = useState<UserResult | undefined>();
  const [loading,       setLoading]       = useState(true);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [refreshing,    setRefreshing]    = useState(false);
  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);

  // Resolve session
  useEffect(() => {
    if (currentUserId) return;
    fetch("/api/auth/session").then(r => r.json()).then(d => { if (d?.user?.id) setCurrentUserId(d.user.id); }).catch(() => {});
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

// For sent mailbox, only fetch sent conversations
if (mailbox === "sent") {
  const res = await fetch(`${API_BASE}?${params}`).catch(() => null);
  const data = res ? await res.json() : {};
  const convos: Conversation[] = data.conversations ?? [];
  const items: UnifiedInboxItem[] = convos.map(c => ({
    id: c.id, type: "message" as InboxItemType,
    subject: c.subject, preview: c.preview,
    date: c.date, unread: c.unread,
    sender: c.participants[0]?.name ?? "Unknown",
    senderImage: c.participants[0]?.image, data: c,
  }));
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  setAllItems(items);
  return;
}

// For submission_comments mailbox, only fetch submission comments
if (mailbox === "submission_comments") {
        const scRes = await fetch(API_SUBMISSION_COMMENTS).catch(() => null);
        const scData = scRes ? await scRes.json() : {};
        const comments: SubmissionComment[] = scData.comments ?? [];
        const items: UnifiedInboxItem[] = comments.map(sc => ({
          id:           sc.id,
          type:         "submission_comment" as InboxItemType,
          subject:      sc.assignment.title,
          preview:      sc.body,
          date:         sc.createdAt,
          unread:       true,
          sender:       sc.author.name ?? "Unknown",
          senderImage:  sc.author.image,
          courseColor:  sc.assignment.course?.color,
          courseName:   sc.assignment.course?.name,
          data:         sc,
        }));
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllItems(items);
        return;
      }

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

      if (mailbox === "inbox" || mailbox === "unread") {
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
    if (mailbox === "submission_comments") return true; // already filtered at fetch
    if (category !== "all") {
      if (category === "messages"      && item.type !== "message")                      return false;
      if (category === "assignments"   && item.type !== "assignment")                   return false;
      if (category === "announcements" && item.type !== "announcement")                 return false;
      if (category === "quizzes"       && item.type !== "quiz" && item.type !== "form") return false;
      if (category === "enrollments"   && item.type !== "enrollment")                   return false;
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
  const showThread   = !!selectedItem && !!currentUserId;
  const currentFilter = MAILBOX_FILTERS.find(f => f.key === mailbox)!;
  const hasActiveFilter = mailbox !== "inbox" || category !== "all";

  return (
    <div className="ibx-root">
      <style>{GLOBAL_CSS}</style>

      {/* Overlay for mobile sidebar */}
      <div className={`ibx-overlay${sidebarOpen ? " visible" : ""}`} onClick={() => setSidebarOpen(false)} style={{ zIndex: 150 }} />

      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0, zIndex: 10, minHeight: 56 }}>

        {/* Hamburger (mobile) */}
        <button className="ibx-btn ibx-icon-btn ibx-hamburger" onClick={() => setSidebarOpen(true)} style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }}>
          <Menu size={18} />
        </button>

        {/* Search bar */}
        {(!isMobile || searchOpen) && (
          <div className="ibx-search-wrap"
            style={{ flex: 1, maxWidth: isMobile ? "100%" : 480, display: "flex", alignItems: "center", gap: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0 12px", height: 40, transition: "border-color 0.15s" }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = C.maroon)}
            onBlurCapture={e  => (e.currentTarget.style.borderColor = C.border)}
          >
            <Search size={14} style={{ color: C.textMuted, flexShrink: 0 }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              autoFocus={isMobile && searchOpen}
              style={{ flex: 1, border: "none", outline: "none", fontFamily: FONT, color: C.text, background: "transparent" }}
            />
            {(searchQuery || (isMobile && searchOpen)) && (
              <button className="ibx-btn" onClick={() => { setSearchQuery(""); if (isMobile) setSearchOpen(false); }} style={{ border: "none", background: "none", color: C.textMuted, width: 18, height: 18, padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Mobile: search icon when bar is hidden */}
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

        {/* Desktop-only: recipient picker */}
        {!isMobile && (
          <>
            <div ref={pickerRef} style={{ position: "relative", flexShrink: 0 }}>
              <button className="ibx-btn ibx-icon-btn" title="Find recipient" onClick={() => setPickerOpen(v => !v)}>
                <UserRound size={16} />
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

            <button className="ibx-btn ibx-icon-btn" title="Refresh" onClick={() => fetchAll(true)} style={{ flexShrink: 0 }}>
              <RefreshCw size={15} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>

            {/* Action buttons when item selected */}
            {selectedItem && selectedItem.type === "message" && (
              <div className="ibx-topbar-actions" style={{ display: "flex", gap: 5, paddingLeft: 4, borderLeft: `1px solid ${C.border}` }}>
                <button className="ibx-btn ibx-icon-btn" title="Reply"><Reply size={15} /></button>
                <button className="ibx-btn ibx-icon-btn" title="Reply All"><ReplyAll size={15} /></button>
                <button className="ibx-btn ibx-icon-btn" title="Archive" onClick={() => handleArchive(selectedId!)}><Download size={15} /></button>
                <button className="ibx-btn ibx-icon-btn" title="Delete"  onClick={() => handleArchive(selectedId!)}><Trash2   size={15} /></button>
              </div>
            )}
          </>
        )}

        {/* Compose — always visible */}
        {(!isMobile || !searchOpen) && (
          <button className="ibx-btn ibx-compose-btn"
            onClick={() => { setComposeFor(undefined); setComposing(true); }}
            style={{ padding: "0 16px", height: 40, borderRadius: 10, background: C.maroon, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, gap: 7, flexShrink: 0, position: "relative" }}
            onMouseEnter={e => (e.currentTarget.style.background = C.maroonDark)}
            onMouseLeave={e => (e.currentTarget.style.background = C.maroon)}
          >
            <Pencil size={14} />
            <span className="ibx-compose-btn-text">Compose</span>
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: -6, right: -6, background: C.maroonDeep, color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 10, padding: "1px 5px", fontFamily: FONT_MONO }}>
                {unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="ibx-body">

        {/* Sidebar */}
        <div className={`ibx-sidebar${sidebarOpen ? " open" : ""}`}>
          <SidebarContent
            mailbox={mailbox} category={category}
            onMailbox={v => { setMailbox(v); setSelectedId(null); setSidebarOpen(false); }}
            onCategory={v => { setCategory(v); setSelectedId(null); setSidebarOpen(false); }}
            unreadCount={unreadCount}
            courses={courses}
            selectedCtx={selectedCtx}
            onSelectCtx={v => { setSelectedCtx(v); setSelectedId(null); setSidebarOpen(false); }}
            onClose={isMobile ? () => setSidebarOpen(false) : undefined}
          />
        </div>

        {/* List panel */}
        <div className={`ibx-list-panel${isMobile && showThread ? " hidden-mobile" : ""}`}>
          {/* List header */}
          <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexWrap: "wrap" }}>
                <currentFilter.Icon size={15} color={C.maroon} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>{currentFilter.label}</span>
                {selectedCtx && (
                  <span style={{ fontSize: 11, background: C.maroonMid, color: C.maroon, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                    {selectedCtx.name}
                  </span>
                )}
                {mailbox === "inbox" && category !== "all" && (
                  <span style={{ fontSize: 11, background: C.border, color: C.textMid, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                    {CATEGORY_FILTERS.find(f => f.key === category)?.label}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_MONO, flexShrink: 0 }}>
                  {filteredItems.length}
                </span>
                {isMobile && (
                  <button className="ibx-btn ibx-icon-btn" onClick={() => fetchAll(true)} style={{ width: 28, height: 28, border: "none" }}>
                    <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List items */}
          <div className="ibx-scroll" style={{ flex: 1, overflowY: "auto" }}>
            {loading
              ? <ListSkeleton />
              : filteredItems.length === 0
                ? <EmptyState mailbox={mailbox} />
                : filteredItems.map(item => (
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
            }
          </div>
        </div>

        {/* Thread / Detail panel */}
        {showThread ? (
          <div className={`ibx-thread-panel${isMobile ? " visible-mobile" : ""}`}>
            <ThreadViewer
              key={selectedItem.id}
              item={selectedItem}
              currentUserId={currentUserId}
              onBack={() => setSelectedId(null)}
              onArchive={handleArchive}
            />
          </div>
        ) : (
          !isMobile && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: C.bg }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: C.maroonMid, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MailOpen size={26} color={C.maroon} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.textMid, margin: 0 }}>Select an item</p>
              <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Choose from the list to view details</p>
            </div>
          )
        )}
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